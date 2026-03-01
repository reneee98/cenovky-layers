import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function normalizeConnectionString(rawConnectionString) {
  try {
    const url = new URL(rawConnectionString);
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return rawConnectionString;
  }
}

function isSupabaseHost(connectionString) {
  try {
    const hostname = new URL(connectionString).hostname;
    return hostname.includes("supabase.co") || hostname.includes("supabase.com");
  } catch {
    return false;
  }
}

function inferSupabaseDirectUrl() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseDbPassword = process.env.SUPABASE_DB_PASSWORD ?? process.env.SUPABASE_DB_PASS;

  if (!supabaseUrl || !supabaseDbPassword) {
    return undefined;
  }

  let projectRef;
  try {
    const hostname = new URL(supabaseUrl).hostname;
    projectRef = hostname.split(".")[0] ?? "";
  } catch {
    return undefined;
  }

  if (!projectRef) {
    return undefined;
  }

  return `postgresql://postgres:${encodeURIComponent(supabaseDbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
}

const rawConnectionString =
  process.env.SUPABASE_DB_URL ??
  process.env.SUPABASE_DATABASE_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  inferSupabaseDirectUrl();

if (!rawConnectionString) {
  throw new Error(
    "Supabase/Postgres connection is not set. Provide SUPABASE_DB_URL (or DATABASE_URL / POSTGRES_URL / POSTGRES_PRISMA_URL).",
  );
}

const seedUserId = process.env.SEED_USER_ID;
if (!seedUserId) {
  throw new Error("Missing SEED_USER_ID. Provide Supabase auth user ID to initialize settings.");
}

const connectionString = normalizeConnectionString(rawConnectionString);
const adapter = new PrismaPg({
  connectionString,
  ssl: isSupabaseHost(connectionString) ? { rejectUnauthorized: false } : undefined,
});

const prisma = new PrismaClient({ adapter });

const defaults = {
  userId: seedUserId,
  companyName: "Your Company",
  companyAddress: "Street 1, City",
  companyEmail: "hello@example.com",
  companyPhone: "+421900000000",
  defaultLanguage: "sk",
  defaultCurrency: "EUR",
  vatRate: 20,
  numberingYear: new Date().getFullYear(),
  numberingCounter: 0,
};

async function main() {
  const settings = await prisma.settings.upsert({
    where: { userId: seedUserId },
    update: {},
    create: defaults,
  });

  console.log("Settings initialized", {
    userId: settings.userId,
    defaultLanguage: settings.defaultLanguage,
    defaultCurrency: settings.defaultCurrency,
    vatRate: settings.vatRate.toString(),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
