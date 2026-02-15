import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageGrid } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatQuoteStatus } from "@/lib/quotes/status";
import {
  listCatalogItems,
  listClients,
  listQuotesWithDetails,
} from "@/server/repositories";
import { calculateQuoteTotals } from "@/server/quotes/totals";

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <section className="ui-page-section col-span-4 md:col-span-4 lg:col-span-3">
      <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-gray-500)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold leading-none text-[var(--color-ink)]">{value}</p>
      {note ? <p className="mt-2 text-sm text-[var(--color-gray-500)]">{note}</p> : null}
    </section>
  );
}

export default async function Home() {
  const [quotes, clients, catalogItems] = await Promise.all([
    listQuotesWithDetails(),
    listClients(),
    listCatalogItems(),
  ]);

  const draftQuotes = quotes.filter((quote) => quote.status === "draft").length;
  const sentQuotes = quotes.filter((quote) => quote.status === "sent").length;
  const acceptedQuotes = quotes.filter((quote) => quote.status === "accepted").length;
  const recentQuotes = quotes.slice(0, 8);

  return (
    <AppShell
      active="dashboard"
      title="Prehlad"
      description="Rychly stav pipeline ponuk a hlavnych katalogov."
      headerActions={
        <Link href="/quotes/new" className="btn-primary w-full sm:w-auto">
          Nova ponuka
        </Link>
      }
    >
      <PageGrid>
        <MetricCard
          label="Ponuky celkom"
          value={String(quotes.length)}
          note={`${draftQuotes} draft / ${sentQuotes} sent`}
        />
        <MetricCard
          label="Akceptovane"
          value={String(acceptedQuotes)}
          note="Manualne nastavene stavy"
        />
        <MetricCard
          label="Klienti"
          value={String(clients.length)}
          note="Aktivne zaznamy v adresari"
        />
        <MetricCard
          label="Katalog poloziek"
          value={String(catalogItems.length)}
          note="Predvolene ceny a jednotky"
        />
      </PageGrid>

      <section className="ui-page-section">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Posledne ponuky</h2>
          <Link href="/quotes" className="text-sm font-medium text-slate-700 underline underline-offset-2">
            Otvorit zoznam
          </Link>
        </div>

        {recentQuotes.length === 0 ? (
          <p className="text-sm text-[var(--color-gray-500)]">Zatial nemas ziadne ponuky.</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {recentQuotes.map((quote) => {
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
                    <p className="mt-1 text-sm text-slate-700">{quote.title}</p>
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
                        <dt>Spolu</dt>
                        <dd className="text-right text-slate-900">
                          {formatCurrency(totals.grandTotal, quote.currency)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>

            <div className="hidden md:block">
              <div className="ui-table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th className="ui-table-cell--text">Cislo</th>
                      <th className="ui-table-cell--text">Nazov</th>
                      <th className="ui-table-cell--text">Klient</th>
                      <th className="ui-table-cell--text">Stav</th>
                      <th className="ui-table-cell--text">Vytvorena</th>
                      <th className="ui-table-cell--number">Spolu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentQuotes.map((quote) => {
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
                          <td className="ui-table-cell--text">{formatQuoteStatus(quote.status)}</td>
                          <td className="ui-table-cell--text">{formatDate(quote.createdAt)}</td>
                          <td className="ui-table-cell--number ui-table-cell--strong">
                            {formatCurrency(totals.grandTotal, quote.currency)}
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
