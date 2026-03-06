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
import type { QuoteStatus } from "@/types/domain";

type MetricCardProps = {
  label: string;
  value: string;
  note?: string;
  accent?: "indigo" | "emerald" | "amber" | "slate";
};

const ACCENT_STYLES: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  indigo: "border-l-indigo-500 group-hover:text-indigo-700",
  emerald: "border-l-emerald-500 group-hover:text-emerald-700",
  amber: "border-l-amber-500 group-hover:text-amber-700",
  slate: "border-l-slate-400 group-hover:text-slate-700",
};

function MetricCard({ label, value, note, accent = "slate" }: MetricCardProps) {
  return (
    <section
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 border-l-4 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300 ${ACCENT_STYLES[accent].split(" ")[0]}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-3 text-4xl font-bold leading-none tracking-tight text-slate-900 transition-colors duration-200 ${ACCENT_STYLES[accent].split(" ")[1]}`}>
        {value}
      </p>
      {note ? <p className="mt-2 text-xs font-medium text-slate-400">{note}</p> : null}
    </section>
  );
}

function getStatusBadge(status: QuoteStatus) {
  const styles: Record<QuoteStatus, string> = {
    draft: "bg-slate-100 text-slate-600 ring-slate-500/10",
    sent: "bg-amber-50 text-amber-700 ring-amber-500/15",
    accepted: "bg-emerald-50 text-emerald-700 ring-emerald-500/15",
    rejected: "bg-red-50 text-red-700 ring-red-500/15",
    invoiced: "bg-indigo-50 text-indigo-700 ring-indigo-500/15",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {formatQuoteStatus(status)}
    </span>
  );
}

type HomePageProps = {
  searchParams: Promise<{
    notice?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const userId = await requireUserId();
  const params = await searchParams;

  const [quotes, clients, catalogItems] = await Promise.all([
    listQuotesWithDetails(userId),
    listClients(userId),
    listCatalogItems(userId),
  ]);

  const draftQuotes = quotes.filter((quote) => quote.status === "draft").length;
  const sentQuotes = quotes.filter((quote) => quote.status === "sent").length;
  const acceptedQuotes = quotes.filter((quote) => quote.status === "accepted").length;
  const recentQuotes = quotes.slice(0, 8);
  const notice = typeof params.notice === "string" ? params.notice : "";

  return (
    <AppShell
      active="dashboard"
      title="Prehľad"
      description="Rýchly stav pipeline ponúk a hlavných katalógov."
      headerActions={
        <Link
          href="/quotes/new"
          className="ui-btn ui-btn--primary ui-btn--md w-full sm:w-auto"
        >
          Nová ponuka
        </Link>
      }
    >
      {notice ? <div className="ui-notice mb-6">{notice}</div> : null}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ponuky celkom"
          value={String(quotes.length)}
          note={`${draftQuotes} draft · ${sentQuotes} odoslané`}
          accent="indigo"
        />
        <MetricCard
          label="Akceptované"
          value={String(acceptedQuotes)}
          note="Manuálne nastavené stavy"
          accent="emerald"
        />
        <MetricCard
          label="Klienti"
          value={String(clients.length)}
          note="Aktívne záznamy v adresári"
          accent="amber"
        />
        <MetricCard
          label="Katalóg položiek"
          value={String(catalogItems.length)}
          note="Predvolené ceny a jednotky"
          accent="slate"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900">Posledné ponuky</h2>
            <p className="mt-0.5 text-sm text-slate-500">Zoznam najnovších cenových ponúk.</p>
          </div>
          <Link
            href="/quotes"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            Otvoriť zoznam →
          </Link>
        </div>

        {recentQuotes.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Zatiaľ nemáš žiadne ponuky.</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {recentQuotes.map((quote) => {
                const totals = calculateQuoteTotals({
                  items: quote.items,
                  totalDiscountType: quote.totalDiscountType,
                  totalDiscountValue: quote.totalDiscountValue,
                  vatEnabled: quote.vatEnabled,
                  vatRate: quote.vatRate,
                });

                return (
                  <Link
                    key={quote.id}
                    href={`/quotes/${quote.id}`}
                    className="block px-4 py-3.5 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-slate-400">#{quote.number}</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">{quote.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{quote.client.name}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        {getStatusBadge(quote.status)}
                        <p className="mt-1.5 text-sm font-bold tabular-nums text-slate-900">
                          {formatCurrency(totals.taxableBase, quote.currency)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="w-32 px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Číslo
                    </th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Názov
                    </th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Klient
                    </th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Stav
                    </th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Vytvorená
                    </th>
                    <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Spolu bez DPH
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
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
                        className="group cursor-pointer transition-colors hover:bg-slate-50/80"
                        onClick={undefined}
                      >
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-400 group-hover:text-indigo-600">
                          #{quote.number}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/quotes/${quote.id}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                          >
                            {quote.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{quote.client.name}</td>
                        <td className="px-6 py-4">{getStatusBadge(quote.status)}</td>
                        <td className="px-6 py-4 tabular-nums text-slate-400">
                          {formatDate(quote.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold tabular-nums tracking-tight text-slate-900">
                          {formatCurrency(totals.taxableBase, quote.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
