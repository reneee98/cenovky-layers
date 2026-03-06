"use client";

import { useRef } from "react";

import { changeQuoteStatusAction } from "@/app/quotes/actions";
import { formatQuoteStatus, QUOTE_STATUS_OPTIONS } from "@/lib/quotes/status";
import type { QuoteStatus } from "@/types/domain";

const BADGE_STYLES: Record<QuoteStatus, string> = {
  draft: "bg-slate-100 text-slate-600 ring-slate-500/10",
  sent: "bg-amber-50 text-amber-700 ring-amber-500/15",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-500/15",
  rejected: "bg-red-50 text-red-700 ring-red-500/15",
  invoiced: "bg-indigo-50 text-indigo-700 ring-indigo-500/15",
};

export function QuoteStatusSelect({
  quoteId,
  status,
}: {
  quoteId: string;
  status: QuoteStatus;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={changeQuoteStatusAction}>
      <input type="hidden" name="quote_id" value={quoteId} />
      {/* Badge visual + invisible select overlay */}
      <div className="relative inline-flex" title="Klikni pre zmenu stavu">
        <span
          className={`pointer-events-none inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${BADGE_STYLES[status]}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
          {formatQuoteStatus(status)}
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
          defaultValue={status}
          onChange={() => formRef.current?.requestSubmit()}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Zmeniť stav ponuky"
        >
          {QUOTE_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {formatQuoteStatus(s)}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
