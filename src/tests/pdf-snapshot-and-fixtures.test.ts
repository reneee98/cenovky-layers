import assert from "node:assert/strict";
import test from "node:test";

import { getPdfPreviewFixture, listPdfPreviewFixtureIds } from "../server/quotes/pdf-preview-fixtures";
import { parseQuoteVersionSnapshot } from "../server/quotes/pdf-snapshot";

function buildValidSnapshot() {
  return {
    schemaVersion: 1,
    generatedAt: "2026-01-01T00:00:00.000Z",
    company: {
      companyName: "Acme",
      companyAddress: "Street 1",
      companyEmail: "hello@example.com",
      companyPhone: "+421900000000",
      companyWebsite: null,
      logoUrl: null,
      logoImage: null,
    },
    quote: {
      id: "q_1",
      number: "2026-001",
      title: "Website",
      status: "draft",
      language: "sk",
      currency: "EUR",
      validUntil: "2026-01-10",
      vatEnabled: true,
      vatRate: 20,
      introContentMarkdown: "intro",
      termsContentMarkdown: "terms",
      revisionsIncluded: 2,
      totalDiscountType: "none",
      totalDiscountValue: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    client: {
      id: "c_1",
      type: "company",
      name: "Client",
      billingAddressLine1: "Address 1",
      billingAddressLine2: null,
      city: "BA",
      zip: "81101",
      country: "SK",
      ico: null,
      dic: null,
      icdph: null,
      contactName: "John",
      contactEmail: "john@example.com",
      contactPhone: null,
    },
    items: [],
    totals: {
      subtotal: 100,
      totalDiscount: 0,
      taxableBase: 100,
      vatAmount: 20,
      grandTotal: 120,
    },
  };
}

test("quote snapshot parser: accepts valid snapshot and applies defaults", () => {
  const snapshot = buildValidSnapshot();
  const parsed = parseQuoteVersionSnapshot(snapshot);

  assert.ok(parsed);
  assert.equal(parsed?.quote.showClientDetailsInPdf, true);
  assert.equal(parsed?.quote.showCompanyDetailsInPdf, true);
});

test("quote snapshot parser: rejects invalid shape", () => {
  assert.equal(parseQuoteVersionSnapshot({}), null);
  assert.equal(parseQuoteVersionSnapshot({ ...buildValidSnapshot(), schemaVersion: 2 }), null);
  assert.equal(
    parseQuoteVersionSnapshot({ ...buildValidSnapshot(), totals: { subtotal: "x" } }),
    null,
  );
  assert.equal(parseQuoteVersionSnapshot({ ...buildValidSnapshot(), rendered: "x" }), null);
});

test("pdf preview fixtures: list and load known fixtures", () => {
  const ids = listPdfPreviewFixtureIds();

  assert.deepEqual(ids, ["short-offer", "long-table", "overflow-long-text"]);
  assert.equal(getPdfPreviewFixture("unknown"), null);

  for (const id of ids) {
    const fixture = getPdfPreviewFixture(id);
    assert.ok(fixture);
    assert.ok(parseQuoteVersionSnapshot(fixture));
  }
});
