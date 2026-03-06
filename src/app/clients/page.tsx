import Link from "next/link";

import { deleteClientAction } from "@/app/clients/actions";
import { DeleteClientButton } from "@/app/clients/delete-client-button";
import { AppShell } from "@/components/app-shell";
import { requireUserId } from "@/lib/auth";
import {
  Button,
  IconActionLink,
  Input,
  ListEmptyState,
  OpenIcon,
  SearchIcon,
  Select,
} from "@/components/ui";
import { listClients } from "@/server/repositories";

type ClientsPageProps = {
  searchParams: Promise<{
    search?: string;
    ico?: string;
    notice?: string;
    error?: string;
  }>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const userId = await requireUserId();
  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const icoFilter = params.ico?.trim() ?? "";

  const baseClients = await listClients(userId, { search });
  const clients = baseClients.filter((client) => {
    if (icoFilter === "with") {
      return Boolean(client.ico?.trim());
    }

    if (icoFilter === "without") {
      return !client.ico?.trim();
    }

    return true;
  });

  const hasFilters = Boolean(search || icoFilter);

  return (
    <AppShell
      active="clients"
      title="Klienti"
      description="Sprava fakturacnych a kontaktnych udajov pre ponuky."
      headerActions={
        <Link href="/clients/new" className="btn-primary w-full sm:w-auto">
          Novy klient
        </Link>
      }
    >
      <section className="ui-page-section">
        <form className="ui-table-toolbar" method="get">
          <label className="ui-table-toolbar__search">
            <SearchIcon className="ui-table-toolbar__search-icon" />
            <Input
              name="search"
              type="search"
              defaultValue={search}
              placeholder="Hladat podla nazvu klienta"
              aria-label="Hladat klientov"
            />
          </label>

          <div className="ui-table-toolbar__filters">
            <Select name="ico" defaultValue={icoFilter} aria-label="Filter ICO">
              <option value="">Vsetky ICO</option>
              <option value="with">Len s ICO</option>
              <option value="without">Bez ICO</option>
            </Select>
            <Button type="submit" variant="secondary" size="sm">
              Hladat
            </Button>
          </div>
        </form>

        {params.notice ? <div className="ui-notice mb-4">{params.notice}</div> : null}
        {params.error ? <div className="ui-notice ui-notice--error mb-4">{params.error}</div> : null}

        {clients.length === 0 ? (
          <ListEmptyState
            title={
              hasFilters
                ? "Nenasli sa ziadni klienti pre zadane filtre."
                : "Zatial nemas ziadnych klientov."
            }
            description="Po vytvoreni klienta sa automaticky zobrazi v zozname."
            action={
              !hasFilters ? (
                <Link href="/clients/new" className="btn-primary">
                  Vytvorit prveho klienta
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {clients.map((client) => (
                <article key={client.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {/* Clickable header */}
                  <Link
                    href={`/clients/${client.id}`}
                    className="block border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50/70"
                  >
                    <p className="text-sm font-semibold text-slate-900">{client.name}</p>
                    {client.contactName && (
                      <p className="mt-0.5 text-xs text-slate-500">{client.contactName}</p>
                    )}
                  </Link>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-xs">
                    <div className="col-span-2">
                      <dt className="text-slate-400">Email</dt>
                      <dd className="mt-0.5 break-all font-medium text-slate-700">{client.contactEmail ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">IČO</dt>
                      <dd className="mt-0.5 font-medium text-slate-700">{client.ico ?? "—"}</dd>
                    </div>
                  </dl>
                  <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
                    <Link
                      href={`/clients/${client.id}`}
                      className="ui-btn ui-btn--secondary ui-btn--sm flex-1"
                    >
                      Otvoriť
                    </Link>
                    <form action={deleteClientAction}>
                      <input type="hidden" name="client_id" value={client.id} />
                      <DeleteClientButton clientName={client.name} iconOnly />
                    </form>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden md:block">
              <div className="ui-table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th className="ui-table-cell--text">Názov</th>
                      <th className="ui-table-cell--text">Kontaktná osoba</th>
                      <th className="ui-table-cell--text">Kontaktný email</th>
                      <th className="ui-table-cell--text">IČO</th>
                      <th className="ui-table-cell--number w-24">Akcie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id} className="ui-table-row">
                        <td className="ui-table-cell--text">
                          <Link
                            href={`/clients/${client.id}`}
                            className="font-semibold text-slate-900 transition-colors hover:text-indigo-600"
                          >
                            {client.name}
                          </Link>
                        </td>
                        <td className="ui-table-cell--text">{client.contactName ?? "—"}</td>
                        <td className="ui-table-cell--text">{client.contactEmail ?? "—"}</td>
                        <td className="ui-table-cell--text">{client.ico ?? "—"}</td>
                        <td className="ui-table-cell--number">
                          <div className="ui-table-actions">
                            <IconActionLink href={`/clients/${client.id}`} label="Otvoriť klienta">
                              <OpenIcon />
                            </IconActionLink>
                            <form action={deleteClientAction}>
                              <input type="hidden" name="client_id" value={client.id} />
                              <DeleteClientButton clientName={client.name} iconOnly />
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
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
