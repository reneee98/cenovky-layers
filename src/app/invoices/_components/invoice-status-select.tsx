"use client";

import { useRef } from "react";

import { changeInvoiceStatusAction } from "@/app/invoices/actions";
import { formatInvoiceStatus } from "@/lib/invoices/status";
import type { InvoiceStatus } from "@/types/domain";

const BADGE_STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-600 ring-slate-500/10",
  sent: "bg-amber-50 text-amber-700 ring-amber-500/15",
  partially_paid: "bg-blue-50 text-blue-700 ring-blue-500/15",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-500/15",
  overdue: "bg-red-50 text-red-700 ring-red-500/15",
  cancelled: "bg-slate-100 text-slate-400 ring-slate-500/10",
};

function manualValue(status: InvoiceStatus): "draft" | "sent" | "cancelled" {
  if (status === "draft") return "draft";
  if (status === "cancelled") return "cancelled";
  return "sent";
}

export function InvoiceStatusSelect({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={changeInvoiceStatusAction}>
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <div className="relative inline-flex" title="Klikni pre zmenu stavu">
        <span
          className={`pointer-events-none inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${BADGE_STYLES[status]}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
          {formatInvoiceStatus(status)}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 12 12"
            className="h-2.5 w-2.5 opacity-40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <select
          name="status"
          defaultValue={manualValue(status)}
          onChange={() => formRef.current?.requestSubmit()}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Zmeniť stav faktúry"
        >
          <option value="draft">Koncept</option>
          <option value="sent">Odoslaná</option>
          <option value="cancelled">Stornovaná</option>
        </select>
      </div>
    </form>
  );
}
