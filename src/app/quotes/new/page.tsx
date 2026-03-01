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
      title="Vytvorit ponuku"
      description="Zacni novu konceptovu ponuku s predvolenymi hodnotami."
      headerActions={
        <Link
          href="/quotes"
          className="ui-btn ui-btn--secondary ui-btn--md w-full sm:w-auto"
        >
          Spat na zoznam
        </Link>
      }
    >
      <section className="ui-page-section">
        {clients.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            <p>Pred vytvorenim ponuky musis mat aspon jedneho klienta.</p>
            <Link
              href="/clients/new"
              className="mt-3 inline-flex text-sm font-medium text-slate-900 underline underline-offset-4"
            >
              Vytvorit prveho klienta
            </Link>
          </div>
        ) : (
          <form action={createDraftQuoteAction} className="space-y-4">
            {params.error ? <p className="text-sm text-red-700">{params.error}</p> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-700">
                Klient
                <select
                  name="client_id"
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-700">
                Nazov (volitelne)
                <input
                  name="title"
                  type="text"
                  placeholder="Ponuka na redizajn webu"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Vytvorit koncept ponuky
            </button>
          </form>
        )}
      </section>
    </AppShell>
  );
}
