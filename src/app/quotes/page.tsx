import type { QuoteStatus as QuoteStatusEnum } from "@/types/domain";
import Link from "next/link";

import {
  deleteQuoteAction,
  duplicateQuoteAction,
} from "@/app/quotes/actions";
import { DeleteQuoteButton } from "@/app/quotes/delete-quote-button";
import { QuoteExportPdfButton } from "@/components/quote/export-pdf-button";
import { QuoteStatusSelect } from "@/app/quotes/quote-status-select";
import { AppShell } from "@/components/app-shell";
import { requireUserId } from "@/lib/auth";
import {
  Badge,
  Button,
  DateInput,
  DuplicateIcon,
  ExportIcon,
  IconActionButton,
  IconActionLink,
  Input,
  ListEmptyState,
  OpenIcon,
  SearchIcon,
  Select,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  formatQuoteStatus,
  isQuoteStatus,
  QUOTE_STATUS_OPTIONS,
} from "@/lib/quotes/status";
import {
  listClients,
  listQuoteCurrencies,
  listQuotesWithDetails,
} from "@/server/repositories";
import { calculateQuoteTotals } from "@/server/quotes/totals";
import { listQuotesWithInvoicingMetrics } from "@/server/invoices/quote-metrics";

type QuoteStatus = QuoteStatusEnum;

function parseDateStart(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseDateEnd(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getStatusTone(
  status: QuoteStatus,
): "neutral" | "warning" | "success" | "danger" | "accent" {
  if (status === "sent") return "warning";
  if (status === "accepted") return "success";
  if (status === "rejected") return "danger";
  if (status === "invoiced") return "accent";
  return "neutral";
}

type QuotesPageProps = {
  searchParams: Promise<{
    status?: string;
    client_id?: string;
    currency?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    notice?: string;
    error?: string;
  }>;
};

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const userId = await requireUserId();
  const params = await searchParams;

  const status = isQuoteStatus(params.status) ? (params.status as QuoteStatus) : undefined;
  const clientId = params.client_id?.trim() || undefined;
  const currency = params.currency?.trim() || undefined;
  const dateFrom = parseDateStart(params.date_from);
  const dateTo = parseDateEnd(params.date_to);
  const search = params.search?.trim() || undefined;
  const hasActiveFilters = Boolean(status || clientId || currency || dateFrom || dateTo || search);

  const [quotes, clients, currencies, invoicingMetrics] = await Promise.all([
    listQuotesWithDetails(userId, { status, clientId, currency, dateFrom, dateTo, search }),
    listClients(userId),
    listQuoteCurrencies(userId),
    listQuotesWithInvoicingMetrics(userId),
  ]);

  const metricsByQuoteId = new Map(invoicingMetrics.map((m) => [m.quoteId, m]));

  return (
    <AppShell
      active="quotes"
      title="Ponuky"
      description="Sleduj stav ponúk a exportuj aktuálne PDF."
      headerActions={
        <Link href="/quotes/new" className="btn-primary w-full sm:w-auto">
          Nová ponuka
        </Link>
      }
    >
      <section className="ui-page-section">
        {/* Toolbar */}
        <form method="get" className="ui-table-toolbar">
          <label className="ui-table-toolbar__search">
            <SearchIcon className="ui-table-toolbar__search-icon" />
            <Input
              name="search"
              type="search"
              defaultValue={params.search ?? ""}
              placeholder="Hľadať číslo / názov / klienta"
              aria-label="Hľadať ponuky"
            />
          </label>
          <div className="ui-table-toolbar__filters">
            <Select name="status" defaultValue={params.status ?? ""} aria-label="Filter stavu">
              <option value="">Všetky stavy</option>
              {QUOTE_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {formatQuoteStatus(s)}
                </option>
              ))}
            </Select>
            <Select
              name="client_id"
              defaultValue={params.client_id ?? ""}
              aria-label="Filter klienta"
            >
              <option value="">Všetci klienti</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              name="currency"
              defaultValue={params.currency ?? ""}
              aria-label="Filter meny"
            >
              <option value="">Všetky meny</option>
              {currencies.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </Select>
            <div className="grid min-w-[220px] grid-cols-2 gap-[var(--space-8)]">
              <DateInput
                name="date_from"
                defaultValue={params.date_from ?? ""}
                aria-label="Dátum od"
              />
              <DateInput
                name="date_to"
                defaultValue={params.date_to ?? ""}
                aria-label="Dátum do"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Použiť
            </Button>
          </div>
        </form>

        {params.notice ? <div className="ui-notice mt-4">{params.notice}</div> : null}
        {params.error ? (
          <div className="ui-notice ui-notice--error mt-4">{params.error}</div>
        ) : null}

        {quotes.length === 0 ? (
          <div className="mt-4">
            <ListEmptyState
              title={
                hasActiveFilters
                  ? "Pre zvolené filtre sa nenašli žiadne ponuky."
                  : "Zatiaľ nemáš žiadne ponuky."
              }
              description="Všetky nové ponuky sa zobrazia v tejto tabuľke."
              action={
                !hasActiveFilters ? (
                  <Link href="/quotes/new" className="btn-primary">
                    Vytvoriť prvú ponuku
                  </Link>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            {/* ── Mobile cards ── */}
            <div className="mt-4 space-y-3 md:hidden">
              {quotes.map((quote) => {
                const totals = calculateQuoteTotals({
                  items: quote.items,
                  totalDiscountType: quote.totalDiscountType,
                  totalDiscountValue: quote.totalDiscountValue,
                  vatEnabled: quote.vatEnabled,
                  vatRate: quote.vatRate,
                });
                const remaining =
                  metricsByQuoteId.get(quote.id)?.remainingToInvoice ?? totals.grandTotal;

                return (
                  <article
                    key={quote.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    {/* Clickable header */}
                    <Link
                      href={`/quotes/${quote.id}`}
                      className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50/70"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-slate-400">
                          #{quote.number}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                          {quote.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{quote.client.name}</p>
                      </div>
                      <Badge tone={getStatusTone(quote.status)}>
                        {formatQuoteStatus(quote.status)}
                      </Badge>
                    </Link>

                    {/* Key metrics */}
                    <dl className="grid grid-cols-3 gap-x-3 gap-y-2 px-4 py-3 text-xs">
                      <div>
                        <dt className="text-slate-400">Platná do</dt>
                        <dd className="mt-0.5 font-medium text-slate-700">
                          {formatDate(quote.validUntil)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Suma</dt>
                        <dd className="mt-0.5 font-semibold text-slate-900">
                          {formatCurrency(totals.taxableBase, quote.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Zostatok</dt>
                        <dd className="mt-0.5 font-semibold text-slate-900">
                          {formatCurrency(remaining, quote.currency)}
                        </dd>
                      </div>
                    </dl>

                    {/* Actions */}
                    <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
                      <Link
                        href={`/quotes/${quote.id}`}
                        className="ui-btn ui-btn--secondary ui-btn--sm flex-1"
                      >
                        Otvoriť
                      </Link>
                      <form action={duplicateQuoteAction}>
                        <input type="hidden" name="quote_id" value={quote.id} />
                        <button type="submit" className="ui-btn ui-btn--secondary ui-btn--sm">
                          Duplikovať
                        </button>
                      </form>
                      <QuoteExportPdfButton
                        quoteId={quote.id}
                        label="Exportovať PDF"
                        fallbackFileName={quote.number}
                        className="ui-btn ui-btn--secondary ui-btn--sm"
                      >
                        PDF
                      </QuoteExportPdfButton>
                      <form action={deleteQuoteAction}>
                        <input type="hidden" name="quote_id" value={quote.id} />
                        <DeleteQuoteButton quoteNumber={quote.number} iconOnly />
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* ── Desktop table ── */}
            <div className="mt-4 hidden md:block">
              <div className="ui-table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th className="ui-table-cell--text w-28">Číslo</th>
                      <th className="ui-table-cell--text">Ponuka</th>
                      <th className="ui-table-cell--text">Stav</th>
                      <th className="ui-table-cell--text">Platná do</th>
                      <th className="ui-table-cell--number">Suma bez DPH</th>
                      <th className="ui-table-cell--number">Zostatok</th>
                      <th className="ui-table-cell--number w-36">Akcie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((quote) => {
                      const totals = calculateQuoteTotals({
                        items: quote.items,
                        totalDiscountType: quote.totalDiscountType,
                        totalDiscountValue: quote.totalDiscountValue,
                        vatEnabled: quote.vatEnabled,
                        vatRate: quote.vatRate,
                      });
                      const remaining =
                        metricsByQuoteId.get(quote.id)?.remainingToInvoice ?? totals.grandTotal;

                      return (
                        <tr key={quote.id} className="ui-table-row">
                          {/* Číslo */}
                          <td className="ui-table-cell--text">
                            <Link
                              href={`/quotes/${quote.id}`}
                              className="font-mono text-xs font-semibold text-slate-400 transition-colors hover:text-indigo-600"
                            >
                              #{quote.number}
                            </Link>
                          </td>

                          {/* Ponuka + Klient */}
                          <td className="ui-table-cell--text max-w-xs">
                            <Link href={`/quotes/${quote.id}`} className="block">
                              <span className="font-semibold text-slate-900 transition-colors hover:text-indigo-600">
                                {quote.title}
                              </span>
                              <span className="mt-0.5 block text-xs text-slate-400">
                                {quote.client.name}
                              </span>
                            </Link>
                          </td>

                          {/* Stav — klikateľný badge */}
                          <td className="ui-table-cell--text">
                            <QuoteStatusSelect quoteId={quote.id} status={quote.status} />
                          </td>

                          {/* Platná do */}
                          <td className="ui-table-cell--text tabular-nums text-slate-500">
                            {formatDate(quote.validUntil)}
                          </td>

                          {/* Suma bez DPH */}
                          <td className="ui-table-cell--number">
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(totals.taxableBase, quote.currency)}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-400">
                              {quote.currency}
                            </span>
                          </td>

                          {/* Zostatok */}
                          <td className="ui-table-cell--number font-medium text-slate-700">
                            {formatCurrency(remaining, quote.currency)}
                          </td>

                          {/* Akcie */}
                          <td className="ui-table-cell--number">
                            <div className="ui-table-actions">
                              <IconActionLink
                                href={`/quotes/${quote.id}`}
                                label="Otvoriť ponuku"
                              >
                                <OpenIcon />
                              </IconActionLink>

                              <form action={duplicateQuoteAction}>
                                <input type="hidden" name="quote_id" value={quote.id} />
                                <IconActionButton type="submit" label="Duplikovať ponuku">
                                  <DuplicateIcon />
                                </IconActionButton>
                              </form>

                              <QuoteExportPdfButton
                                quoteId={quote.id}
                                label="Exportovať PDF"
                                fallbackFileName={quote.number}
                                className="ui-icon-action"
                              >
                                <ExportIcon />
                              </QuoteExportPdfButton>

                              <form action={deleteQuoteAction}>
                                <input type="hidden" name="quote_id" value={quote.id} />
                                <DeleteQuoteButton quoteNumber={quote.number} iconOnly />
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
