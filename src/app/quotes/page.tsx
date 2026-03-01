import Link from "next/link";
import { QuoteStatus } from "@prisma/client";

import {
  changeQuoteStatusAction,
  deleteQuoteAction,
  duplicateQuoteAction,
} from "@/app/quotes/actions";
import { DeleteQuoteButton } from "@/app/quotes/delete-quote-button";
import { AppShell } from "@/components/app-shell";
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
  StatusIcon,
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

function parseDateStart(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseDateEnd(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T23:59:59.999`);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getStatusTone(status: QuoteStatus): "neutral" | "warning" | "success" | "danger" | "accent" {
  if (status === "sent") {
    return "warning";
  }

  if (status === "accepted") {
    return "success";
  }

  if (status === "rejected") {
    return "danger";
  }

  if (status === "invoiced") {
    return "accent";
  }

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
  const params = await searchParams;

  const status = isQuoteStatus(params.status) ? (params.status as QuoteStatus) : undefined;
  const clientId = params.client_id?.trim() || undefined;
  const currency = params.currency?.trim() || undefined;
  const dateFrom = parseDateStart(params.date_from);
  const dateTo = parseDateEnd(params.date_to);
  const search = params.search?.trim() || undefined;
  const hasActiveFilters = Boolean(
    status || clientId || currency || dateFrom || dateTo || search,
  );

  const [quotes, clients, currencies] = await Promise.all([
    listQuotesWithDetails({
      status,
      clientId,
      currency,
      dateFrom,
      dateTo,
      search,
    }),
    listClients(),
    listQuoteCurrencies(),
  ]);

  return (
    <AppShell
      active="quotes"
      title="Ponuky"
      description="Sleduj stav ponuk a exportuj aktualne PDF."
      headerActions={
        <Link href="/quotes/new" className="btn-primary w-full sm:w-auto">
          Nova ponuka
        </Link>
      }
    >
      <section className="ui-page-section">
        <form method="get" className="ui-table-toolbar">
          <label className="ui-table-toolbar__search">
            <SearchIcon className="ui-table-toolbar__search-icon" />
            <Input
              name="search"
              type="search"
              defaultValue={params.search ?? ""}
              placeholder="Hladat cislo / nazov / klienta"
              aria-label="Hladat ponuky"
            />
          </label>

          <div className="ui-table-toolbar__filters">
            <Select name="status" defaultValue={params.status ?? ""} aria-label="Filter stavu">
              <option value="">Vsetky stavy</option>
              {QUOTE_STATUS_OPTIONS.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {formatQuoteStatus(statusOption)}
                </option>
              ))}
            </Select>

            <Select name="client_id" defaultValue={params.client_id ?? ""} aria-label="Filter klienta">
              <option value="">Vsetci klienti</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>

            <Select name="currency" defaultValue={params.currency ?? ""} aria-label="Filter meny">
              <option value="">Vsetky meny</option>
              {currencies.map((currencyOption) => (
                <option key={currencyOption} value={currencyOption}>
                  {currencyOption}
                </option>
              ))}
            </Select>

            <div className="grid min-w-[220px] grid-cols-2 gap-[var(--space-8)]">
              <DateInput name="date_from" defaultValue={params.date_from ?? ""} aria-label="Datum od" />
              <DateInput name="date_to" defaultValue={params.date_to ?? ""} aria-label="Datum do" />
            </div>

            <Button type="submit" variant="secondary" size="sm">
              Pouzit
            </Button>
          </div>
        </form>

        {params.notice ? <p className="mt-4 text-sm text-emerald-700">{params.notice}</p> : null}
        {params.error ? <p className="mt-4 text-sm text-red-700">{params.error}</p> : null}

        {quotes.length === 0 ? (
          <div className="mt-4">
            <ListEmptyState
              title={
                hasActiveFilters
                  ? "Pre zvolene filtre sa nenasli ziadne ponuky."
                  : "Zatial nemas ziadne ponuky."
              }
              description="Vsetky nove ponuky sa zobrazia v tejto tabulke."
              action={
                !hasActiveFilters ? (
                  <Link href="/quotes/new" className="btn-primary">
                    Vytvorit prvu ponuku
                  </Link>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-3 md:hidden">
              {quotes.map((quote) => {
                const totals = calculateQuoteTotals({
                  items: quote.items,
                  totalDiscountType: quote.totalDiscountType,
                  totalDiscountValue: quote.totalDiscountValue,
                  vatEnabled: quote.vatEnabled,
                  vatRate: quote.vatRate,
                });

                return (
                  <article key={quote.id} className="rounded-md border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{quote.number}</p>
                    <p className="mt-1 text-sm text-slate-800">{quote.title}</p>
                    <dl className="mt-2 space-y-1 text-xs text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <dt>Klient</dt>
                        <dd className="text-right text-slate-900">{quote.client.name}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt>Stav</dt>
                        <dd className="text-right text-slate-900">{formatQuoteStatus(quote.status)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt>Vytvorena</dt>
                        <dd className="text-right text-slate-900">{formatDate(quote.createdAt)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt>Platna do</dt>
                        <dd className="text-right text-slate-900">{formatDate(quote.validUntil)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt>Spolu bez DPH</dt>
                        <dd className="text-right font-medium text-slate-900">
                          {formatCurrency(totals.taxableBase, quote.currency)}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/quotes/${quote.id}`}
                        className="inline-flex min-w-[96px] flex-1 items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Otvorit
                      </Link>
                      <form action={duplicateQuoteAction} className="flex-1">
                        <input type="hidden" name="quote_id" value={quote.id} />
                        <button
                          type="submit"
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Duplikovat
                        </button>
                      </form>
                      <a
                        href={`/api/quotes/${quote.id}/download`}
                        className="inline-flex w-full flex-1 items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Export PDF
                      </a>
                    </div>
                    <form action={changeQuoteStatusAction} className="mt-2 flex gap-2">
                      <input type="hidden" name="quote_id" value={quote.id} />
                      <select
                        name="status"
                        defaultValue={quote.status}
                        className="w-full rounded-md border border-slate-300 px-2 py-2 text-xs"
                      >
                        {QUOTE_STATUS_OPTIONS.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {formatQuoteStatus(statusOption)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Nastavit
                      </button>
                    </form>
                    <form action={deleteQuoteAction} className="mt-2">
                      <input type="hidden" name="quote_id" value={quote.id} />
                      <DeleteQuoteButton quoteNumber={quote.number} />
                    </form>
                  </article>
                );
              })}
            </div>

            <div className="mt-4 hidden md:block">
              <div className="ui-table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th className="ui-table-cell--text">Cislo</th>
                      <th className="ui-table-cell--text">Nazov</th>
                      <th className="ui-table-cell--text">Klient</th>
                      <th className="ui-table-cell--text">Stav</th>
                      <th className="ui-table-cell--text">Vytvorena</th>
                      <th className="ui-table-cell--text">Platna do</th>
                      <th className="ui-table-cell--number">Spolu bez DPH</th>
                      <th className="ui-table-cell--number">Mena</th>
                      <th className="ui-table-cell--number">Akcie</th>
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

                      return (
                        <tr key={quote.id} className="ui-table-row">
                          <td className="ui-table-cell--text ui-table-cell--strong">{quote.number}</td>
                          <td className="ui-table-cell--text ui-table-cell--strong">{quote.title}</td>
                          <td className="ui-table-cell--text">{quote.client.name}</td>
                          <td className="ui-table-cell--text">
                            <Badge tone={getStatusTone(quote.status)}>{formatQuoteStatus(quote.status)}</Badge>
                          </td>
                          <td className="ui-table-cell--text">{formatDate(quote.createdAt)}</td>
                          <td className="ui-table-cell--text">{formatDate(quote.validUntil)}</td>
                          <td className="ui-table-cell--number ui-table-cell--strong">
                            {formatCurrency(totals.taxableBase, quote.currency)}
                          </td>
                          <td className="ui-table-cell--number">{quote.currency}</td>
                          <td className="ui-table-cell--number">
                            <div className="ui-table-actions">
                              <IconActionLink href={`/quotes/${quote.id}`} label="Otvorit ponuku">
                                <OpenIcon />
                              </IconActionLink>

                              <form action={duplicateQuoteAction}>
                                <input type="hidden" name="quote_id" value={quote.id} />
                                <IconActionButton type="submit" label="Duplikovat ponuku">
                                  <DuplicateIcon />
                                </IconActionButton>
                              </form>

                              <IconActionLink
                                href={`/api/quotes/${quote.id}/download`}
                                label="Exportovat PDF"
                              >
                                <ExportIcon />
                              </IconActionLink>

                              <form action={changeQuoteStatusAction} className="ui-table-status">
                                <input type="hidden" name="quote_id" value={quote.id} />
                                <Select name="status" defaultValue={quote.status} aria-label="Zmenit stav ponuky">
                                  {QUOTE_STATUS_OPTIONS.map((statusOption) => (
                                    <option key={statusOption} value={statusOption}>
                                      {formatQuoteStatus(statusOption)}
                                    </option>
                                  ))}
                                </Select>
                                <IconActionButton type="submit" label="Ulozit stav">
                                  <StatusIcon />
                                </IconActionButton>
                              </form>

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
