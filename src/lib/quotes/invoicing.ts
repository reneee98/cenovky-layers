import type { QuoteInvoicingState } from "@/types/domain";

export const QUOTE_INVOICING_STATE_OPTIONS = [
  "not_invoiced",
  "partially_invoiced",
  "fully_invoiced",
] as const;

const QUOTE_INVOICING_STATE_LABELS: Record<QuoteInvoicingState, string> = {
  not_invoiced: "Nefakturovana",
  partially_invoiced: "Ciastocne fakturovana",
  fully_invoiced: "Plne fakturovana",
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeInvoicedAmount(value: number): number {
  const safeValue = Number.isFinite(value) ? value : 0;
  return Math.max(0, roundMoney(safeValue));
}

export function calculateRemainingToInvoice(quoteTotal: number, invoicedAmount: number): number {
  const safeQuoteTotal = Math.max(0, roundMoney(Number.isFinite(quoteTotal) ? quoteTotal : 0));
  const safeInvoicedAmount = normalizeInvoicedAmount(invoicedAmount);
  return Math.max(0, roundMoney(safeQuoteTotal - safeInvoicedAmount));
}

export function resolveQuoteInvoicingState(
  quoteTotal: number,
  invoicedAmount: number,
): QuoteInvoicingState {
  const safeQuoteTotal = Math.max(0, roundMoney(Number.isFinite(quoteTotal) ? quoteTotal : 0));
  const safeInvoicedAmount = normalizeInvoicedAmount(invoicedAmount);

  if (safeInvoicedAmount <= 0 || safeQuoteTotal <= 0) {
    return "not_invoiced";
  }

  if (safeInvoicedAmount >= safeQuoteTotal) {
    return "fully_invoiced";
  }

  return "partially_invoiced";
}

export function formatQuoteInvoicingState(state: QuoteInvoicingState): string {
  return QUOTE_INVOICING_STATE_LABELS[state];
}
