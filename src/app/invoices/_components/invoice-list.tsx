import Link from "next/link";

import { deleteInvoiceAction } from "@/app/invoices/actions";
import { DeleteInvoiceButton } from "@/app/invoices/delete-invoice-button";
import { InvoiceStatusSelect } from "@/app/invoices/_components/invoice-status-select";
import {
  ExportIcon,
  IconActionLink,
  ListEmptyState,
  OpenIcon,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatInvoiceStatus } from "@/lib/invoices/status";
import type { InvoiceStatus } from "@/types/domain";

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

function clientDisplay(row: InvoiceRow): string {
  const c = row.client;
  if (c.companyName?.trim()) return c.companyName.trim();
  const full = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  return full || c.name;
}

const STATUS_BADGE_STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-600 ring-slate-500/10",
  sent: "bg-amber-50 text-amber-700 ring-amber-500/15",
  partially_paid: "bg-blue-50 text-blue-700 ring-blue-500/15",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-500/15",
  overdue: "bg-red-50 text-red-700 ring-red-500/15",
  cancelled: "bg-slate-100 text-slate-400 ring-slate-500/10",
};

export function InvoiceListDesktop({
  invoices,
  getStatusTone: _getStatusTone,
}: {
  invoices: InvoiceRow[];
  getStatusTone: (status: InvoiceRow["status"]) => StatusTone;
}) {
  return (
    <div className="mt-4 hidden md:block">
      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th className="ui-table-cell--text w-36">Číslo</th>
              <th className="ui-table-cell--text">Klient</th>
              <th className="ui-table-cell--text">Stav</th>
              <th className="ui-table-cell--text">Vystavená</th>
              <th className="ui-table-cell--text">Splatnosť</th>
              <th className="ui-table-cell--number">Na úhradu</th>
              <th className="ui-table-cell--number w-28">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="ui-table-row">
                {/* Číslo */}
                <td className="ui-table-cell--text">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="font-mono text-xs font-semibold text-slate-400 transition-colors hover:text-indigo-600"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                </td>

                {/* Klient + Ponuka */}
                <td className="ui-table-cell--text max-w-xs">
                  <Link href={`/invoices/${invoice.id}`} className="block">
                    <span className="font-semibold text-slate-900 transition-colors hover:text-indigo-600">
                      {clientDisplay(invoice)}
                    </span>
                    {invoice.quote && (
                      <span className="mt-0.5 block text-xs text-slate-400">
                        Ponuka #{invoice.quote.number}
                      </span>
                    )}
                  </Link>
                </td>

                {/* Stav */}
                <td className="ui-table-cell--text">
                  <InvoiceStatusSelect invoiceId={invoice.id} status={invoice.status} />
                </td>

                {/* Vystavená */}
                <td className="ui-table-cell--text tabular-nums text-slate-500">
                  {formatDate(invoice.issueDate)}
                </td>

                {/* Splatnosť */}
                <td className="ui-table-cell--text tabular-nums text-slate-500">
                  {formatDate(invoice.dueDate)}
                </td>

                {/* Na úhradu */}
                <td className="ui-table-cell--number">
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(invoice.amountDue, invoice.currency)}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {invoice.currency}
                  </span>
                </td>

                {/* Akcie */}
                <td className="ui-table-cell--number">
                  <div className="ui-table-actions">
                    <IconActionLink href={`/invoices/${invoice.id}`} label="Otvoriť faktúru">
                      <OpenIcon />
                    </IconActionLink>
                    <IconActionLink
                      href={`/api/invoices/${invoice.id}/download`}
                      label="Exportovať PDF"
                    >
                      <ExportIcon />
                    </IconActionLink>
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
  getStatusTone: _getStatusTone,
}: {
  invoices: InvoiceRow[];
  getStatusTone: (status: InvoiceRow["status"]) => StatusTone;
}) {
  return (
    <div className="mt-4 space-y-3 md:hidden">
      {invoices.map((invoice) => (
        <article
          key={invoice.id}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          {/* Clickable header */}
          <Link
            href={`/invoices/${invoice.id}`}
            className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50/70"
          >
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold text-slate-400">
                {invoice.invoiceNumber}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                {clientDisplay(invoice)}
              </p>
              {invoice.quote && (
                <p className="mt-0.5 text-xs text-slate-400">
                  Ponuka #{invoice.quote.number}
                </p>
              )}
            </div>
            <span
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE_STYLES[invoice.status]}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              {formatInvoiceStatus(invoice.status)}
            </span>
          </Link>

          {/* Key metrics */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-xs">
            <div>
              <dt className="text-slate-400">Vystavená</dt>
              <dd className="mt-0.5 font-medium text-slate-700">
                {formatDate(invoice.issueDate)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Splatnosť</dt>
              <dd className="mt-0.5 font-medium text-slate-700">
                {formatDate(invoice.dueDate)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Spolu</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {formatCurrency(invoice.total, invoice.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Na úhradu</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {formatCurrency(invoice.amountDue, invoice.currency)}
              </dd>
            </div>
          </dl>

          {/* Actions */}
          <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
            <Link
              href={`/invoices/${invoice.id}`}
              className="ui-btn ui-btn--secondary ui-btn--sm flex-1"
            >
              Otvoriť
            </Link>
            <a
              href={`/api/invoices/${invoice.id}/download`}
              className="ui-btn ui-btn--secondary ui-btn--sm"
            >
              PDF
            </a>
            <form action={deleteInvoiceAction}>
              <input type="hidden" name="invoice_id" value={invoice.id} />
              <DeleteInvoiceButton invoiceNumber={invoice.invoiceNumber} iconOnly />
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
