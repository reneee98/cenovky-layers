import shortOfferFixture from "../../../pdf/fixtures/01-short-offer.json";
import longTableFixture from "../../../pdf/fixtures/02-long-table.json";
import overflowFixture from "../../../pdf/fixtures/03-overflow-long-text.json";

import type { QuoteVersionSnapshot } from "@/server/quotes/pdf-snapshot";

const FIXTURES = {
  "short-offer": shortOfferFixture as QuoteVersionSnapshot,
  "long-table": longTableFixture as QuoteVersionSnapshot,
  "overflow-long-text": overflowFixture as QuoteVersionSnapshot,
} as const;

type FixtureKey = keyof typeof FIXTURES;

export type PdfPreviewFixtureId = FixtureKey;

export function listPdfPreviewFixtureIds(): PdfPreviewFixtureId[] {
  return Object.keys(FIXTURES) as PdfPreviewFixtureId[];
}

export function getPdfPreviewFixture(id: string): QuoteVersionSnapshot | null {
  if (!(id in FIXTURES)) {
    return null;
  }

  return FIXTURES[id as FixtureKey];
}
