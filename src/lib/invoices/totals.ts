export type InvoiceTotalsLineInput = {
  qty: number;
  unitPrice: number;
  discountPct: number;
  vatRate: number;
};

export type InvoiceLineTotals = {
  lineSubtotal: number;
  lineDiscount: number;
  lineTaxBase: number;
  lineVat: number;
  lineTotal: number;
};

export type InvoiceTotalsInput = {
  items: InvoiceTotalsLineInput[];
  vatEnabled: boolean;
};

export type InvoiceTotals = {
  subtotal: number;
  discountTotal: number;
  taxBaseTotal: number;
  vatTotal: number;
  total: number;
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function calculateInvoiceLineTotals(
  line: InvoiceTotalsLineInput,
  vatEnabled: boolean,
): InvoiceLineTotals {
  const qty = Math.max(0, normalizeNumber(line.qty));
  const unitPrice = Math.max(0, normalizeNumber(line.unitPrice));
  const discountPct = Math.max(0, normalizeNumber(line.discountPct));
  const vatRate = Math.max(0, normalizeNumber(line.vatRate));

  const lineSubtotal = roundMoney(qty * unitPrice);
  const lineDiscount = roundMoney(lineSubtotal * (discountPct / 100));
  const lineTaxBase = roundMoney(Math.max(lineSubtotal - lineDiscount, 0));
  const lineVat = vatEnabled ? roundMoney(lineTaxBase * (vatRate / 100)) : 0;
  const lineTotal = roundMoney(lineTaxBase + lineVat);

  return {
    lineSubtotal,
    lineDiscount,
    lineTaxBase,
    lineVat,
    lineTotal,
  };
}

export function calculateInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let taxBaseTotal = 0;
  let vatTotal = 0;

  for (const item of input.items) {
    const lineTotals = calculateInvoiceLineTotals(item, input.vatEnabled);
    subtotal += lineTotals.lineSubtotal;
    discountTotal += lineTotals.lineDiscount;
    taxBaseTotal += lineTotals.lineTaxBase;
    vatTotal += lineTotals.lineVat;
  }

  subtotal = roundMoney(subtotal);
  discountTotal = roundMoney(discountTotal);
  taxBaseTotal = roundMoney(taxBaseTotal);
  vatTotal = roundMoney(vatTotal);

  return {
    subtotal,
    discountTotal,
    taxBaseTotal,
    vatTotal,
    total: roundMoney(taxBaseTotal + vatTotal),
  };
}
