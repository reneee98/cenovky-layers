import assert from "node:assert/strict";
import test from "node:test";

import { calculateLineTotal, calculateQuoteTotals, roundMoney } from "../lib/quotes/totals";

test("quote totals: line total clamps invalid and negative values", () => {
  assert.equal(calculateLineTotal({ qty: 2, unitPrice: 100, discountPct: 10 }), 180);
  assert.equal(calculateLineTotal({ qty: -2, unitPrice: 100, discountPct: 10 }), 0);
  assert.equal(calculateLineTotal({ qty: Number.NaN, unitPrice: Number.POSITIVE_INFINITY, discountPct: -5 }), 0);
});

test("quote totals: calculates subtotal, global discount, VAT and grand total", () => {
  const totals = calculateQuoteTotals({
    items: [
      { qty: 2, unitPrice: 100, discountPct: 10 },
      { qty: 1, unitPrice: 50, discountPct: 0 },
    ],
    totalDiscountType: "pct",
    totalDiscountValue: 10,
    vatEnabled: true,
    vatRate: 20,
  });

  assert.deepEqual(totals, {
    subtotal: 230,
    totalDiscount: 23,
    taxableBase: 207,
    vatAmount: 41.4,
    grandTotal: 248.4,
  });
});

test("quote totals: amount discount is capped to subtotal and VAT can be disabled", () => {
  const totals = calculateQuoteTotals({
    items: [{ qty: 1, unitPrice: 99.99, discountPct: 0 }],
    totalDiscountType: "amount",
    totalDiscountValue: 200,
    vatEnabled: false,
    vatRate: 20,
  });

  assert.deepEqual(totals, {
    subtotal: 99.99,
    totalDiscount: 99.99,
    taxableBase: 0,
    vatAmount: 0,
    grandTotal: 0,
  });
});

test("quote totals: roundMoney rounds to 2 decimals", () => {
  assert.equal(roundMoney(10.005), 10.01);
  assert.equal(roundMoney(10.004), 10);
});
