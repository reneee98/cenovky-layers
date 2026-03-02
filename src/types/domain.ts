export type Language = "sk" | "en";
export type ClientType = "company" | "sole_trader" | "person";
export type Unit = "h" | "day" | "pcs" | "pkg";
export type SnippetType = "intro" | "terms";
export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "invoiced";
export type TotalDiscountType = "none" | "pct" | "amount";
export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";
export type InvoiceKind = "full" | "partial" | "advance";
export type QuoteInvoicingState = "not_invoiced" | "partially_invoiced" | "fully_invoiced";
