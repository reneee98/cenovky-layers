import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateRemainingToInvoice,
  formatQuoteInvoicingState,
  normalizeInvoicedAmount,
  resolveQuoteInvoicingState,
} from "../lib/quotes/invoicing";

test("quote invoicing: normalizes and rounds invoiced amount", () => {
  assert.equal(normalizeInvoicedAmount(-100), 0);
  assert.equal(normalizeInvoicedAmount(12.345), 12.35);
  assert.equal(normalizeInvoicedAmount(Number.NaN), 0);
});

test("quote invoicing: remaining amount never goes below 0", () => {
  assert.equal(calculateRemainingToInvoice(100, 20), 80);
  assert.equal(calculateRemainingToInvoice(100, 120), 0);
  assert.equal(calculateRemainingToInvoice(Number.NaN, 20), 0);
});

test("quote invoicing: state resolution and labels", () => {
  assert.equal(resolveQuoteInvoicingState(100, 0), "not_invoiced");
  assert.equal(resolveQuoteInvoicingState(100, 10), "partially_invoiced");
  assert.equal(resolveQuoteInvoicingState(100, 100), "fully_invoiced");
  assert.equal(formatQuoteInvoicingState("fully_invoiced"), "Plne fakturovana");
});
