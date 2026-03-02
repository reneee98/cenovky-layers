import type { InvoiceStatus } from "@/types/domain";

export const INVOICE_STATUS_OPTIONS = [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
] as const;

export type InvoiceStatusValue = (typeof INVOICE_STATUS_OPTIONS)[number];

const INVOICE_STATUS_LABELS: Record<InvoiceStatusValue, string> = {
  draft: "Koncept",
  sent: "Odoslana",
  partially_paid: "Ciastocne uhradena",
  paid: "Uhradena",
  overdue: "Po splatnosti",
  cancelled: "Stornovana",
};

export function isInvoiceStatus(value: unknown): value is InvoiceStatusValue {
  return (
    value === "draft" ||
    value === "sent" ||
    value === "partially_paid" ||
    value === "paid" ||
    value === "overdue" ||
    value === "cancelled"
  );
}

export function formatInvoiceStatus(status: InvoiceStatusValue): string {
  return INVOICE_STATUS_LABELS[status];
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

type ResolveInvoiceStatusInput = {
  currentStatus: InvoiceStatus;
  total: number;
  amountPaid: number;
  dueDate: Date;
  now?: Date;
};

export function resolveInvoiceStatus({
  currentStatus,
  total,
  amountPaid,
  dueDate,
  now = new Date(),
}: ResolveInvoiceStatusInput): InvoiceStatus {
  if (currentStatus === "cancelled") {
    return "cancelled";
  }

  const safeTotal = Math.max(0, Number.isFinite(total) ? total : 0);
  const safeAmountPaid = Math.max(0, Number.isFinite(amountPaid) ? amountPaid : 0);

  if (safeTotal > 0 && safeAmountPaid >= safeTotal) {
    return "paid";
  }

  if (safeAmountPaid > 0) {
    return "partially_paid";
  }

  if (currentStatus === "draft") {
    return "draft";
  }

  if (startOfDay(dueDate).getTime() < startOfDay(now).getTime()) {
    return "overdue";
  }

  return "sent";
}
