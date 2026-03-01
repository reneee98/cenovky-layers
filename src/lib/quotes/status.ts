export const QUOTE_STATUS_OPTIONS = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "invoiced",
] as const;

export type QuoteStatusValue = (typeof QUOTE_STATUS_OPTIONS)[number];

const QUOTE_STATUS_LABELS: Record<QuoteStatusValue, string> = {
  draft: "Koncept",
  sent: "Odoslana",
  accepted: "Akceptovana",
  rejected: "Zamietnuta",
  invoiced: "Fakturovana",
};

export function isQuoteStatus(value: unknown): value is QuoteStatusValue {
  return (
    value === "draft" ||
    value === "sent" ||
    value === "accepted" ||
    value === "rejected" ||
    value === "invoiced"
  );
}

export function formatQuoteStatus(status: QuoteStatusValue): string {
  return QUOTE_STATUS_LABELS[status];
}
