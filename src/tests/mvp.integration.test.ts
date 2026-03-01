import assert from "node:assert/strict";
import { readdir, readFile, rm, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import Database from "better-sqlite3";

type PrismaType = typeof import("../lib/prisma.ts").prisma;
type ReserveNextQuoteNumberType = typeof import("../server/quotes/numbering.ts").reserveNextQuoteNumber;
type EnsureSettingsSingletonType = typeof import("../server/db/init.ts").ensureSettingsSingleton;
type ExportQuoteToPdfVersionType = typeof import("../server/quotes/pdf-export.ts").exportQuoteToPdfVersion;
type GetQuoteVersionDownloadPayloadType = typeof import("../server/quotes/pdf-export.ts").getQuoteVersionDownloadPayload;

const TEST_DB_FILENAME = "test-integration.db";
let prisma: PrismaType;
let reserveNextQuoteNumber: ReserveNextQuoteNumberType;
let ensureSettingsSingleton: EnsureSettingsSingletonType;
let exportQuoteToPdfVersion: ExportQuoteToPdfVersionType;
let getQuoteVersionDownloadPayload: GetQuoteVersionDownloadPayloadType;

async function createClient(name: string) {
  return prisma.client.create({
    data: {
      type: "company",
      name,
      billingAddressLine1: "Street 1",
      city: "Bratislava",
      zip: "81101",
      country: "Slovakia",
      contactName: "Test Contact",
      contactEmail: `${name.toLowerCase().replace(/\s+/g, "-")}@example.com`,
    },
  });
}

async function createQuote(params: { clientId: string; number: string }) {
  return prisma.quote.create({
    data: {
      number: params.number,
      title: "Integration Quote",
      status: "draft",
      clientId: params.clientId,
      language: "sk",
      currency: "EUR",
      validUntil: new Date("2026-12-31T00:00:00.000Z"),
      vatEnabled: true,
      vatRate: 20,
      introContentMarkdown: "Intro text",
      termsContentMarkdown: "Terms text",
      revisionsIncluded: 2,
      totalDiscountType: "pct",
      totalDiscountValue: 10,
      items: {
        create: [
          {
            name: "Design",
            description: "UI work",
            unit: "h",
            qty: 10,
            unitPrice: 45,
            discountPct: 0,
            sortOrder: 0,
          },
          {
            name: "Consulting",
            description: null,
            unit: "h",
            qty: 4,
            unitPrice: 60,
            discountPct: 5,
            sortOrder: 1,
          },
        ],
      },
    },
    include: {
      items: true,
    },
  });
}

before(async () => {
  const dbAbsolutePath = resolve(process.cwd(), TEST_DB_FILENAME);
  await rm(dbAbsolutePath, { force: true });
  await rm(`${dbAbsolutePath}-journal`, { force: true });

  process.env.DATABASE_URL = `file:./${TEST_DB_FILENAME}`;

  const db = new Database(dbAbsolutePath);
  const migrationsRoot = join(process.cwd(), "prisma/migrations");
  const migrationDirs = (await readdir(migrationsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  for (const migrationDir of migrationDirs) {
    const migrationPath = join(migrationsRoot, migrationDir, "migration.sql");
    const migrationSql = await readFile(migrationPath, "utf8");
    db.exec(migrationSql);
  }
  db.close();

  ({ prisma } = await import("../lib/prisma.ts"));
  ({ reserveNextQuoteNumber } = await import("../server/quotes/numbering.ts"));
  ({ ensureSettingsSingleton } = await import("../server/db/init.ts"));
  ({ exportQuoteToPdfVersion, getQuoteVersionDownloadPayload } = await import(
    "../server/quotes/pdf-export.ts"
  ));

  await ensureSettingsSingleton();
});

after(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }

  const dbAbsolutePath = resolve(process.cwd(), TEST_DB_FILENAME);
  await rm(dbAbsolutePath, { force: true });
  await rm(`${dbAbsolutePath}-journal`, { force: true });
});

beforeEach(async () => {
  await prisma.quoteVersion.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.client.deleteMany();

  await prisma.settings.update({
    where: { id: 1 },
    data: {
      numberingYear: 2026,
      numberingCounter: 0,
      defaultLanguage: "sk",
      defaultCurrency: "EUR",
      vatRate: 20,
    },
  });
});

describe("MVP integration checks", () => {
  it("generates YYYY-### numbers and skips already used numbers", async () => {
    const numberOne = await reserveNextQuoteNumber();
    const numberTwo = await reserveNextQuoteNumber();

    assert.equal(numberOne, "2026-001");
    assert.equal(numberTwo, "2026-002");

    const client = await createClient("Numbering Client");
    await createQuote({ clientId: client.id, number: "2026-003" });

    const numberThree = await reserveNextQuoteNumber();
    assert.equal(numberThree, "2026-004");
  });

  it("respects year reset via Settings values", async () => {
    await prisma.settings.update({
      where: { id: 1 },
      data: {
        numberingYear: 2030,
        numberingCounter: 0,
      },
    });

    const next = await reserveNextQuoteNumber();
    assert.equal(next, "2030-001");
  });

  it("keeps a single QuoteVersion snapshot and regenerates identical PDF from snapshot", async () => {
    const client = await createClient("Export Client");
    const quoteNumber = await reserveNextQuoteNumber();
    const quote = await createQuote({ clientId: client.id, number: quoteNumber });

    const exportOne = await exportQuoteToPdfVersion(quote.id);
    const exportTwo = await exportQuoteToPdfVersion(quote.id);

    assert.ok(exportOne, "First export should return a version result.");
    assert.ok(exportTwo, "Second export should return a version result.");
    assert.equal(exportOne?.versionNumber, 1);
    assert.equal(exportTwo?.versionNumber, 1);

    const versions = await prisma.quoteVersion.findMany({
      where: { quoteId: quote.id },
      orderBy: { versionNumber: "asc" },
    });

    assert.equal(versions.length, 1);
    assert.equal(versions[0].versionNumber, 1);

    const versionOneSnapshot = versions[0].snapshotJson as { totals?: { grandTotal?: unknown } };
    assert.equal(typeof versionOneSnapshot?.totals?.grandTotal, "number");

    const downloadedFirst = await getQuoteVersionDownloadPayload(versions[0].id);
    assert.ok(downloadedFirst);
    assert.ok(downloadedFirst!.bytes.length > 0);

    const storedPdfAbsolutePath = resolve(process.cwd(), "storage", versions[0].pdfFileUrl);
    await unlink(storedPdfAbsolutePath);

    const downloadedAfterRegeneration = await getQuoteVersionDownloadPayload(versions[0].id);
    assert.ok(downloadedAfterRegeneration);
    assert.ok(downloadedAfterRegeneration!.bytes.length > 0);
    assert.equal(
      Buffer.compare(
        Buffer.from(downloadedFirst!.bytes),
        Buffer.from(downloadedAfterRegeneration!.bytes),
      ),
      0,
      "PDF regenerated from snapshot should be byte-identical.",
    );
  });
});
