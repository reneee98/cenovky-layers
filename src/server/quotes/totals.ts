import {
  calculateQuoteTotals as calculateQuoteTotalsFromNumbers,
  type QuoteTotalDiscountType,
  type QuoteTotals,
} from "@/lib/quotes/totals";

type QuoteLineLike = {
  qty: number | { toNumber: () => number };
  unitPrice: number | { toNumber: () => number };
  discountPct: number | { toNumber: () => number };
};

type QuoteTotalsInput = {
  items: QuoteLineLike[];
  totalDiscountType: QuoteTotalDiscountType;
  totalDiscountValue: number | { toNumber: () => number };
  vatEnabled: boolean;
  vatRate: number | { toNumber: () => number };
};

function toNumber(value: number | { toNumber: () => number }): number {
  if (typeof value === "number") {
    return value;
  }

  return value.toNumber();
}

export function calculateQuoteTotals(input: QuoteTotalsInput): QuoteTotals {
  return calculateQuoteTotalsFromNumbers({
    items: input.items.map((item) => ({
      qty: toNumber(item.qty),
      unitPrice: toNumber(item.unitPrice),
      discountPct: toNumber(item.discountPct),
    })),
    totalDiscountType: input.totalDiscountType,
    totalDiscountValue: toNumber(input.totalDiscountValue),
    vatEnabled: input.vatEnabled,
    vatRate: toNumber(input.vatRate),
  });
}
