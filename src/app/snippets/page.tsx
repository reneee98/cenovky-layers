import Link from "next/link";

import { deleteSnippetAction } from "@/app/snippets/actions";
import { DeleteSnippetButton } from "@/app/snippets/delete-snippet-button";
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
import { formatDate } from "@/lib/format";
import { listSnippets } from "@/server/repositories";

type SnippetsPageProps = {
  searchParams: Promise<{
    type?: string;
    language?: string;
    search?: string;
    notice?: string;
    error?: string;
  }>;
};

export default async function SnippetsPage({ searchParams }: SnippetsPageProps) {
  const params = await searchParams;

  const type = params.type === "intro" || params.type === "terms" ? params.type : "";
  const language = params.language === "sk" || params.language === "en" ? params.language : "";
  const search = params.search?.trim() ?? "";
  const hasFilters = Boolean(type || language || search);

  const snippets = await listSnippets({
    type: type || undefined,
    language: language || undefined,
  });

  const filteredSnippets = snippets.filter((snippet) => {
    if (!search) {
      return true;
    }

    return snippet.title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <AppShell
      active="quotes"
      title="Sablony textu"
      description="Opakovane pouzitelne uvody a podmienky v SK/EN."
      headerActions={
        <Link href="/snippets/new" className="btn-primary w-full sm:w-auto">
          Nova sablona textu
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
              placeholder="Hladat podla nazvu sablony"
              aria-label="Hladat sablony textu"
            />
          </label>

          <div className="ui-table-toolbar__filters">
            <Select name="type" defaultValue={type} aria-label="Filter typu">
              <option value="">Vsetky typy</option>
              <option value="intro">Uvod</option>
              <option value="terms">Podmienky</option>
            </Select>

            <Select name="language" defaultValue={language} aria-label="Filter jazyka">
              <option value="">Vsetky jazyky</option>
              <option value="sk">SK</option>
              <option value="en">EN</option>
            </Select>

            <Button type="submit" variant="secondary" size="sm">
              Pouzit
            </Button>
          </div>
        </form>

        {params.notice ? <p className="mb-4 text-sm text-emerald-700">{params.notice}</p> : null}
        {params.error ? <p className="mb-4 text-sm text-red-700">{params.error}</p> : null}

        {filteredSnippets.length === 0 ? (
          <ListEmptyState
            title={
              hasFilters
                ? "Pre vybrane filtre sa nenasli ziadne sablony."
                : "Zatial nemas ziadne sablony textu."
            }
            description="Sablony textu skracuju cas pri tvorbe ponuk."
            action={
              !hasFilters ? (
                <Link href="/snippets/new" className="btn-primary">
                  Vytvorit prvu sablonu
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filteredSnippets.map((snippet) => (
                <article key={snippet.id} className="rounded-md border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">{snippet.title}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <dt>Typ</dt>
                      <dd className="mt-0.5 text-slate-900">
                        {snippet.type === "intro" ? "Uvod" : "Podmienky"}
                      </dd>
                    </div>
                    <div>
                      <dt>Jazyk</dt>
                      <dd className="mt-0.5 text-slate-900">{snippet.language.toUpperCase()}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt>Aktualizovane</dt>
                      <dd className="mt-0.5 text-slate-900">{formatDate(snippet.updatedAt)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/snippets/${snippet.id}`}
                      className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Otvorit
                    </Link>
                    <form action={deleteSnippetAction} className="flex-1">
                      <input type="hidden" name="snippet_id" value={snippet.id} />
                      <DeleteSnippetButton snippetTitle={snippet.title} />
                    </form>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden md:block">
              <div className="ui-table-wrap">
                <table className="ui-table min-w-[840px]">
                  <thead>
                    <tr>
                      <th className="ui-table-cell--text">Nazov</th>
                      <th className="ui-table-cell--text">Typ</th>
                      <th className="ui-table-cell--text">Jazyk</th>
                      <th className="ui-table-cell--text">Aktualizovane</th>
                      <th className="ui-table-cell--number">Akcie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSnippets.map((snippet) => (
                      <tr key={snippet.id} className="ui-table-row">
                        <td className="ui-table-cell--text ui-table-cell--strong">{snippet.title}</td>
                        <td className="ui-table-cell--text">
                          {snippet.type === "intro" ? "Uvod" : "Podmienky"}
                        </td>
                        <td className="ui-table-cell--text">{snippet.language.toUpperCase()}</td>
                        <td className="ui-table-cell--text">{formatDate(snippet.updatedAt)}</td>
                        <td className="ui-table-cell--number">
                          <div className="ui-table-actions">
                            <IconActionLink href={`/snippets/${snippet.id}`} label="Otvorit sablonu">
                              <OpenIcon />
                            </IconActionLink>
                            <form action={deleteSnippetAction}>
                              <input type="hidden" name="snippet_id" value={snippet.id} />
                              <DeleteSnippetButton snippetTitle={snippet.title} iconOnly />
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
