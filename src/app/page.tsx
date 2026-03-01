import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { requireUserId } from "@/lib/auth";
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
    <section className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/50">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-3 text-4xl font-bold leading-none tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-blue-900">
        {value}
      </p>
      {note ? <p className="mt-2 text-sm font-medium text-slate-500">{note}</p> : null}
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-blue-50/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </section>
  );
}

export default async function Home() {
  const userId = await requireUserId();

  const [quotes, clients, catalogItems] = await Promise.all([
    listQuotesWithDetails(userId),
    listClients(userId),
    listCatalogItems(userId),
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
        <Link
          href="/quotes/new"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-blue-600/30 sm:w-auto"
        >
          Nova ponuka
        </Link>
      }
    >
      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
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
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_20px_-8px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-50 p-6 pb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Posledne ponuky</h2>
            <p className="mt-0.5 text-sm text-slate-500">Zoznam najnovsich cenovych ponuk.</p>
          </div>
          <Link
            href="/quotes"
            className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-600 transition-all hover:bg-blue-100 hover:text-blue-700"
          >
            Otvorit zoznam
          </Link>
        </div>

        {recentQuotes.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Zatial nemas ziadne ponuky.</p>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {recentQuotes.map((quote) => {
                const totals = calculateQuoteTotals({
                  items: quote.items,
                  totalDiscountType: quote.totalDiscountType,
                  totalDiscountValue: quote.totalDiscountValue,
                  vatEnabled: quote.vatEnabled,
                  vatRate: quote.vatRate,
                });

                return (
                  <article
                    key={quote.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-slate-900">#{quote.number}</p>
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
                        <dt>Spolu bez DPH</dt>
                        <dd className="text-right text-slate-900">
                          {formatCurrency(totals.taxableBase, quote.currency)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="w-32 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Cislo
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Nazov
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Klient
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Stav
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Vytvorena
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Spolu bez DPH
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentQuotes.map((quote) => {
                    const totals = calculateQuoteTotals({
                      items: quote.items,
                      totalDiscountType: quote.totalDiscountType,
                      totalDiscountValue: quote.totalDiscountValue,
                      vatEnabled: quote.vatEnabled,
                      vatRate: quote.vatRate,
                    });

                    return (
                      <tr
                        key={quote.id}
                        className="group transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-6 py-4 font-mono font-medium text-slate-500 transition-colors group-hover:text-blue-600">
                          #{quote.number}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{quote.title}</td>
                        <td className="px-6 py-4 text-slate-600">{quote.client.name}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10">
                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                            {formatQuoteStatus(quote.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 tabular-nums text-slate-500">
                          {formatDate(quote.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold tracking-tight text-slate-900 tabular-nums">
                          {formatCurrency(totals.taxableBase, quote.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="h-12 bg-gradient-to-b from-transparent to-slate-50/30" />
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
