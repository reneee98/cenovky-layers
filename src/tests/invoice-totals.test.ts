import assert from "node:assert/strict";
import test from "node:test";

import { calculateInvoiceLineTotals, calculateInvoiceTotals } from "../lib/invoices/totals";

test("invoice totals: per-line totals include VAT when enabled", () => {
  const line = calculateInvoiceLineTotals(
    { qty: 2, unitPrice: 100, discountPct: 10, vatRate: 20 },
    true,
  );

  assert.deepEqual(line, {
    lineSubtotal: 200,
    lineDiscount: 20,
    lineTaxBase: 180,
    lineVat: 36,
    lineTotal: 216,
  });
});

test("invoice totals: line totals clamp invalid numeric inputs", () => {
  const line = calculateInvoiceLineTotals(
    { qty: -1, unitPrice: Number.NaN, discountPct: Number.POSITIVE_INFINITY, vatRate: -20 },
    true,
  );

  assert.deepEqual(line, {
    lineSubtotal: 0,
    lineDiscount: 0,
    lineTaxBase: 0,
    lineVat: 0,
    lineTotal: 0,
  });
});

test("invoice totals: aggregate totals across multiple lines", () => {
  const totals = calculateInvoiceTotals({
    vatEnabled: true,
    items: [
      { qty: 2, unitPrice: 100, discountPct: 10, vatRate: 20 },
      { qty: 1, unitPrice: 50, discountPct: 0, vatRate: 10 },
    ],
  });

  assert.deepEqual(totals, {
    subtotal: 250,
    discountTotal: 20,
    taxBaseTotal: 230,
    vatTotal: 41,
    total: 271,
  });
});
