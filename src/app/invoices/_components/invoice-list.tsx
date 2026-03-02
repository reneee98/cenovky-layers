import Link from "next/link";

import { changeInvoiceStatusAction, deleteInvoiceAction } from "@/app/invoices/actions";
import { DeleteInvoiceButton } from "@/app/invoices/delete-invoice-button";
import { Badge, IconActionLink, ListEmptyState, OpenIcon, Select } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InvoiceStatus } from "@/types/domain";
import { formatInvoiceStatus } from "@/lib/invoices/status";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: InvoiceStatus;
  client: {
    name: string;
    companyName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  quote: { id: string; number: string } | null;
};

type StatusTone = "neutral" | "accent" | "success" | "warning" | "danger";

export function InvoiceListDesktop({
  invoices,
  getStatusTone,
}: {
  invoices: InvoiceRow[];
  getStatusTone: (status: InvoiceRow["status"]) => StatusTone;
}) {
  function clientDisplay(row: InvoiceRow): string {
    const c = row.client;
    if (c.companyName?.trim()) return c.companyName.trim();
    const full = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
    return full || c.name;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="ui-table-wrap">
        <table className="ui-table min-w-[1100px]">
          <thead>
            <tr>
              <th className="ui-table-cell--text">Číslo</th>
              <th className="ui-table-cell--text">Klient</th>
              <th className="ui-table-cell--text">Ponuka</th>
              <th className="ui-table-cell--text">Vystavená</th>
              <th className="ui-table-cell--text">Splatnosť</th>
              <th className="ui-table-cell--number">Spolu</th>
              <th className="ui-table-cell--number">Uhradené</th>
              <th className="ui-table-cell--number">Na úhradu</th>
              <th className="ui-table-cell--text">Stav</th>
              <th className="ui-table-cell--number">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="ui-table-row">
                <td className="ui-table-cell--text ui-table-cell--strong">{invoice.invoiceNumber}</td>
                <td className="ui-table-cell--text">{clientDisplay(invoice)}</td>
                <td className="ui-table-cell--text">
                  {invoice.quote ? (
                    <Link href={`/quotes/${invoice.quote.id}`} className="underline">
                      {invoice.quote.number}
                    </Link>
                  ) : (
                    "–"
                  )}
                </td>
                <td className="ui-table-cell--text">{formatDate(invoice.issueDate)}</td>
                <td className="ui-table-cell--text">{formatDate(invoice.dueDate)}</td>
                <td className="ui-table-cell--number ui-table-cell--strong">
                  {formatCurrency(invoice.total, invoice.currency)}
                </td>
                <td className="ui-table-cell--number">
                  {formatCurrency(invoice.amountPaid, invoice.currency)}
                </td>
                <td className="ui-table-cell--number">
                  {formatCurrency(invoice.amountDue, invoice.currency)}
                </td>
                <td className="ui-table-cell--text">
                  <Badge tone={getStatusTone(invoice.status)}>
                    {formatInvoiceStatus(invoice.status)}
                  </Badge>
                </td>
                <td className="ui-table-cell--number">
                  <div className="ui-table-actions">
                    <IconActionLink href={`/invoices/${invoice.id}`} label="Otvoriť faktúru">
                      <OpenIcon />
                    </IconActionLink>
                    <form action={changeInvoiceStatusAction} className="ui-table-status">
                      <input type="hidden" name="invoice_id" value={invoice.id} />
                      <Select
                        name="status"
                        defaultValue={
                          invoice.status === "cancelled"
                            ? "cancelled"
                            : invoice.status === "draft"
                              ? "draft"
                              : "sent"
                        }
                        aria-label="Zmeniť stav faktúry"
                      >
                        <option value="draft">Koncept</option>
                        <option value="sent">Odoslaná</option>
                        <option value="cancelled">Stornovaná</option>
                      </Select>
                      <button type="submit" className="ui-btn ui-btn--secondary ui-btn--sm">
                        Uložiť
                      </button>
                    </form>
                    <form action={deleteInvoiceAction}>
                      <input type="hidden" name="invoice_id" value={invoice.id} />
                      <DeleteInvoiceButton invoiceNumber={invoice.invoiceNumber} iconOnly />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InvoiceListMobile({
  invoices,
  getStatusTone,
}: {
  invoices: InvoiceRow[];
  getStatusTone: (status: InvoiceRow["status"]) => StatusTone;
}) {
  function clientDisplay(row: InvoiceRow): string {
    const c = row.client;
    if (c.companyName?.trim()) return c.companyName.trim();
    const full = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
    return full || c.name;
  }

  return (
    <div className="mt-4 space-y-3 md:hidden">
      {invoices.map((invoice) => (
        <article
          key={invoice.id}
          className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_16px_rgba(15,23,42,0.04)]"
        >
          <p className="text-sm font-semibold text-slate-900">{invoice.invoiceNumber}</p>
          <p className="mt-1 text-sm text-slate-700">{clientDisplay(invoice)}</p>
          <dl className="mt-3 space-y-1 text-xs text-slate-600">
            <div className="flex items-center justify-between gap-3">
              <dt>Vystavená</dt>
              <dd className="text-right text-slate-900">{formatDate(invoice.issueDate)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Splatnosť</dt>
              <dd className="text-right text-slate-900">{formatDate(invoice.dueDate)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Spolu</dt>
              <dd className="text-right font-medium text-slate-900">
                {formatCurrency(invoice.total, invoice.currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Na úhradu</dt>
              <dd className="text-right font-medium text-slate-900">
                {formatCurrency(invoice.amountDue, invoice.currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Stav</dt>
              <dd>
                <Badge tone={getStatusTone(invoice.status)}>
                  {formatInvoiceStatus(invoice.status)}
                </Badge>
              </dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/invoices/${invoice.id}`}
              className="inline-flex min-w-[96px] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Otvoriť
            </Link>
            <form action={changeInvoiceStatusAction} className="flex-1">
              <input type="hidden" name="invoice_id" value={invoice.id} />
              <select
                name="status"
                defaultValue={
                  invoice.status === "cancelled"
                    ? "cancelled"
                    : invoice.status === "draft"
                      ? "draft"
                      : "sent"
                }
                className="w-full rounded-xl border border-slate-200 px-2 py-2 text-xs"
              >
                <option value="draft">Koncept</option>
                <option value="sent">Odoslaná</option>
                <option value="cancelled">Stornovaná</option>
              </select>
              <button
                type="submit"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Uložiť stav
              </button>
            </form>
            <form action={deleteInvoiceAction} className="flex-1">
              <input type="hidden" name="invoice_id" value={invoice.id} />
              <DeleteInvoiceButton invoiceNumber={invoice.invoiceNumber} />
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}

export function InvoiceListEmpty({
  hasActiveFilters,
  emptyAction,
}: {
  hasActiveFilters: boolean;
  emptyAction: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <ListEmptyState
        title={
          hasActiveFilters
            ? "Pre zvolené filtre sa nenašli žiadne faktúry."
            : "Zatiaľ nemáte žiadne faktúry."
        }
        description="Všetky nové faktúry sa zobrazia v tejto tabuľke."
        action={!hasActiveFilters ? emptyAction : null}
      />
    </div>
  );
}
