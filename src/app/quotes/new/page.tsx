import Link from "next/link";

import { createDraftQuoteAction } from "@/app/quotes/actions";
import { AppShell } from "@/components/app-shell";
import { requireUserId } from "@/lib/auth";
import { listClients } from "@/server/repositories";

type NewQuotePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewQuotePage({ searchParams }: NewQuotePageProps) {
  const userId = await requireUserId();
  const params = await searchParams;
  const clients = await listClients(userId);

  return (
    <AppShell
      active="quotes"
      title="Vytvoriť ponuku"
      description="Začni novú konceptovú ponuku s predvolenými hodnotami."
      headerActions={
        <Link
          href="/quotes"
          className="ui-btn ui-btn--secondary ui-btn--md w-full sm:w-auto"
        >
          Späť na zoznam
        </Link>
      }
    >
      <section className="ui-page-section">
        {clients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            <p className="font-medium text-slate-700">Pred vytvorením ponuky musíš mať aspoň jedného klienta.</p>
            <Link
              href="/clients/new"
              className="mt-3 inline-flex text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
            >
              Vytvoriť prvého klienta →
            </Link>
          </div>
        ) : (
          <form action={createDraftQuoteAction} className="space-y-4">
            {params.error ? (
              <div className="ui-notice ui-notice--error">{params.error}</div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="ui-field-label" htmlFor="new-quote-client">
                  Klient
                </label>
                <select
                  id="new-quote-client"
                  name="client_id"
                  required
                  className="ui-control ui-select"
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ui-field-label" htmlFor="new-quote-title">
                  Názov <span className="font-normal text-slate-400">(voliteľné)</span>
                </label>
                <input
                  id="new-quote-title"
                  name="title"
                  type="text"
                  placeholder="Ponuka na redizajn webu"
                  className="ui-control"
                />
              </div>
            </div>

            <button type="submit" className="ui-btn ui-btn--primary ui-btn--md">
              Vytvoriť koncept ponuky
            </button>
          </form>
        )}
      </section>
    </AppShell>
  );
}
