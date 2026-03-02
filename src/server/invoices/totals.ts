import {
  calculateInvoiceLineTotals as calculateInvoiceLineTotalsFromNumbers,
  calculateInvoiceTotals as calculateInvoiceTotalsFromNumbers,
  type InvoiceLineTotals,
  type InvoiceTotals,
} from "@/lib/invoices/totals";

type DecimalLike = number | { toNumber: () => number };

type InvoiceLineLike = {
  qty: DecimalLike;
  unitPrice: DecimalLike;
  discountPct: DecimalLike;
  vatRate: DecimalLike;
};

function toNumber(value: DecimalLike): number {
  if (typeof value === "number") {
    return value;
  }

  return value.toNumber();
}

export function calculateInvoiceLineTotals(
  line: InvoiceLineLike,
  vatEnabled: boolean,
): InvoiceLineTotals {
  return calculateInvoiceLineTotalsFromNumbers(
    {
      qty: toNumber(line.qty),
      unitPrice: toNumber(line.unitPrice),
      discountPct: toNumber(line.discountPct),
      vatRate: toNumber(line.vatRate),
    },
    vatEnabled,
  );
}

export function calculateInvoiceTotals(input: {
  items: InvoiceLineLike[];
  vatEnabled: boolean;
}): InvoiceTotals {
  return calculateInvoiceTotalsFromNumbers({
    items: input.items.map((item) => ({
      qty: toNumber(item.qty),
      unitPrice: toNumber(item.unitPrice),
      discountPct: toNumber(item.discountPct),
      vatRate: toNumber(item.vatRate),
    })),
    vatEnabled: input.vatEnabled,
  });
}
