import { Prisma } from "@prisma/client";

import {
  calculateQuoteTotals as calculateQuoteTotalsFromNumbers,
  type QuoteTotalDiscountType,
  type QuoteTotals,
} from "@/lib/quotes/totals";

type QuoteLineLike = {
  qty: Prisma.Decimal | number;
  unitPrice: Prisma.Decimal | number;
  discountPct: Prisma.Decimal | number;
};

type QuoteTotalsInput = {
  items: QuoteLineLike[];
  totalDiscountType: QuoteTotalDiscountType;
  totalDiscountValue: Prisma.Decimal | number;
  vatEnabled: boolean;
  vatRate: Prisma.Decimal | number;
};

function toNumber(value: Prisma.Decimal | number): number {
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
