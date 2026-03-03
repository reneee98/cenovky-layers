import assert from "node:assert/strict";
import test from "node:test";

import { isQuoteItemSectionDescription } from "../lib/quotes/items";
import { formatQuoteStatus, isQuoteStatus } from "../lib/quotes/status";

test("quote status: type guard and formatting", () => {
  assert.equal(isQuoteStatus("accepted"), true);
  assert.equal(isQuoteStatus("x"), false);
  assert.equal(formatQuoteStatus("invoiced"), "Fakturovana");
});

test("quote item section marker detection", () => {
  assert.equal(isQuoteItemSectionDescription("__section__"), true);
  assert.equal(isQuoteItemSectionDescription("  __SECTION__  "), true);
  assert.equal(isQuoteItemSectionDescription("other"), false);
  assert.equal(isQuoteItemSectionDescription(null), false);
});
