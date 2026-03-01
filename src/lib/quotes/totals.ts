export type QuoteTotalDiscountType = "none" | "pct" | "amount";

export type QuoteTotalsLineInput = {
  qty: number;
  unitPrice: number;
  discountPct: number;
};

export type QuoteTotalsInput = {
  items: QuoteTotalsLineInput[];
  totalDiscountType: QuoteTotalDiscountType;
  totalDiscountValue: number;
  vatEnabled: boolean;
  vatRate: number;
};

export type QuoteTotals = {
  subtotal: number;
  totalDiscount: number;
  taxableBase: number;
  vatAmount: number;
  grandTotal: number;
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateLineTotal(item: QuoteTotalsLineInput): number {
  const qty = Number.isFinite(item.qty) ? Math.max(0, item.qty) : 0;
  const unitPrice = Number.isFinite(item.unitPrice) ? Math.max(0, item.unitPrice) : 0;
  const discountPct = Number.isFinite(item.discountPct) ? Math.max(0, item.discountPct) : 0;

  const lineBase = qty * unitPrice;
  const lineDiscount = lineBase * (discountPct / 100);

  return Math.max(lineBase - lineDiscount, 0);
}

export function calculateQuoteTotals(input: QuoteTotalsInput): QuoteTotals {
  const subtotal = roundMoney(
    input.items.reduce((sum, item) => sum + calculateLineTotal(item), 0),
  );

  const discountValue = Number.isFinite(input.totalDiscountValue)
    ? Math.max(0, input.totalDiscountValue)
    : 0;

  let totalDiscount = 0;

  if (input.totalDiscountType === "pct") {
    totalDiscount = subtotal * (discountValue / 100);
  }

  if (input.totalDiscountType === "amount") {
    totalDiscount = discountValue;
  }

  totalDiscount = roundMoney(Math.min(Math.max(totalDiscount, 0), subtotal));

  const taxableBase = roundMoney(Math.max(subtotal - totalDiscount, 0));
  const vatRate = Number.isFinite(input.vatRate) ? Math.max(0, input.vatRate) : 0;
  const vatAmount = input.vatEnabled ? roundMoney(taxableBase * (vatRate / 100)) : 0;
  const grandTotal = roundMoney(taxableBase + vatAmount);

  return {
    subtotal,
    totalDiscount,
    taxableBase,
    vatAmount,
    grandTotal,
  };
}
