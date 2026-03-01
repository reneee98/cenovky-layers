import Link from "next/link";

import { deleteClientAction } from "@/app/clients/actions";
import { DeleteClientButton } from "@/app/clients/delete-client-button";
import { AppShell } from "@/components/app-shell";
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
  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const icoFilter = params.ico?.trim() ?? "";

  const baseClients = await listClients({ search });
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

        {params.notice ? <p className="mb-4 text-sm text-emerald-700">{params.notice}</p> : null}
        {params.error ? <p className="mb-4 text-sm text-red-700">{params.error}</p> : null}

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
                <article key={client.id} className="rounded-md border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">{client.name}</p>
                  <dl className="mt-2 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <dt>Kontakt</dt>
                      <dd className="text-right text-slate-800">{client.contactName}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Email</dt>
                      <dd className="break-all text-right text-slate-800">{client.contactEmail}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>ICO</dt>
                      <dd className="text-right text-slate-800">{client.ico ?? "-"}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/clients/${client.id}`}
                      className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Otvorit
                    </Link>
                    <form action={deleteClientAction} className="flex-1">
                      <input type="hidden" name="client_id" value={client.id} />
                      <DeleteClientButton clientName={client.name} />
                    </form>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden md:block">
              <div className="ui-table-wrap">
                <table className="ui-table min-w-[900px]">
                  <thead>
                    <tr>
                      <th className="ui-table-cell--text">Nazov</th>
                      <th className="ui-table-cell--text">Kontaktna osoba</th>
                      <th className="ui-table-cell--text">Kontaktny email</th>
                      <th className="ui-table-cell--text">ICO</th>
                      <th className="ui-table-cell--number">Akcie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id} className="ui-table-row">
                        <td className="ui-table-cell--text ui-table-cell--strong">{client.name}</td>
                        <td className="ui-table-cell--text">{client.contactName}</td>
                        <td className="ui-table-cell--text">{client.contactEmail}</td>
                        <td className="ui-table-cell--text">{client.ico ?? "-"}</td>
                        <td className="ui-table-cell--number">
                          <div className="ui-table-actions">
                            <IconActionLink href={`/clients/${client.id}`} label="Otvorit klienta">
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
