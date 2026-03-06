import Link from "next/link";

import { deleteCatalogItemAction } from "@/app/catalog/actions";
import { DeleteCatalogItemButton } from "@/app/catalog/delete-catalog-item-button";
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
import { formatNumber } from "@/lib/format";
import { listCatalogFacets, listCatalogItems } from "@/server/repositories";

function extractTags(tagsValue: unknown): string[] {
  if (!Array.isArray(tagsValue)) {
    return [];
  }

  return tagsValue.filter((entry): entry is string => typeof entry === "string");
}

type CatalogPageProps = {
  searchParams: Promise<{
    search?: string;
    category?: string;
    tag?: string;
    notice?: string;
    error?: string;
  }>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const userId = await requireUserId();
  const params = await searchParams;

  const search = params.search?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const tag = params.tag?.trim() ?? "";
  const hasFilters = Boolean(search || category || tag);

  const [items, facets] = await Promise.all([
    listCatalogItems(userId, { search, category, tag }),
    listCatalogFacets(userId),
  ]);

  return (
    <AppShell
      active="catalog"
      title="Katalog"
      description="Opakovane pouzitelne sluzby a cenove predvolby pre polozky ponuky."
      headerActions={
        <Link href="/catalog/new" className="btn-primary w-full sm:w-auto">
          Nova polozka
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
              placeholder="Hladat podla nazvu alebo popisu"
              aria-label="Hladat v katalogu"
            />
          </label>

          <div className="ui-table-toolbar__filters">
            <Select
              name="category"
              defaultValue={category}
              aria-label="Filter kategorie"
            >
              <option value="">Vsetky kategorie</option>
              {facets.categories.map((facetCategory) => (
                <option key={facetCategory} value={facetCategory}>
                  {facetCategory}
                </option>
              ))}
            </Select>

            <Select name="tag" defaultValue={tag} aria-label="Filter tagu">
              <option value="">Vsetky tagy</option>
              {facets.tags.map((facetTag) => (
                <option key={facetTag} value={facetTag}>
                  {facetTag}
                </option>
              ))}
            </Select>

            <Button type="submit" variant="secondary" size="sm">
              Pouzit
            </Button>
          </div>
        </form>

        {params.notice ? <div className="ui-notice mb-4">{params.notice}</div> : null}
        {params.error ? <div className="ui-notice ui-notice--error mb-4">{params.error}</div> : null}

        {items.length === 0 ? (
          <ListEmptyState
            title={
              hasFilters
                ? "Pre zvolene filtre sa nenasli ziadne polozky."
                : "Zatial nemas ziadne katalogove polozky."
            }
            description="Po vytvoreni polozky ju hned vies pouzit v ponuke."
            action={
              !hasFilters ? (
                <Link href="/catalog/new" className="btn-primary">
                  Vytvorit prvu polozku
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {items.map((item) => {
                const tags = extractTags(item.tags);

                return (
                  <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {/* Clickable header */}
                    <Link
                      href={`/catalog/${item.id}`}
                      className="block border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50/70"
                    >
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      {item.category && (
                        <p className="mt-0.5 text-xs text-slate-400">{item.category}</p>
                      )}
                      {item.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.description}</p>
                      )}
                    </Link>

                    {/* Key metrics */}
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-xs">
                      <div>
                        <dt className="text-slate-400">Jednotka</dt>
                        <dd className="mt-0.5 font-medium text-slate-700">{item.defaultUnit}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Cena</dt>
                        <dd className="mt-0.5 font-semibold text-slate-900">
                          {formatNumber(item.defaultUnitPrice)}
                        </dd>
                      </div>
                    </dl>

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 px-4 pb-3">
                        {tags.map((itemTag) => (
                          <span key={itemTag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {itemTag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
                      <Link
                        href={`/catalog/${item.id}`}
                        className="ui-btn ui-btn--secondary ui-btn--sm flex-1"
                      >
                        Otvoriť
                      </Link>
                      <form action={deleteCatalogItemAction}>
                        <input type="hidden" name="catalog_item_id" value={item.id} />
                        <DeleteCatalogItemButton itemName={item.name} iconOnly />
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden md:block">
              <div className="ui-table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th className="ui-table-cell--text">Názov</th>
                      <th className="ui-table-cell--text">Kategória</th>
                      <th className="ui-table-cell--text">Tagy</th>
                      <th className="ui-table-cell--text">Jednotka</th>
                      <th className="ui-table-cell--number">Cena</th>
                      <th className="ui-table-cell--number w-24">Akcie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const tags = extractTags(item.tags);

                      return (
                        <tr key={item.id} className="ui-table-row">
                          <td className="ui-table-cell--text max-w-xs">
                            <Link
                              href={`/catalog/${item.id}`}
                              className="font-semibold text-slate-900 transition-colors hover:text-indigo-600"
                            >
                              {item.name}
                            </Link>
                            {item.description ? (
                              <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{item.description}</p>
                            ) : null}
                          </td>
                          <td className="ui-table-cell--text">{item.category ?? "—"}</td>
                          <td className="ui-table-cell--text">
                            {tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {tags.map((itemTag) => (
                                  <span
                                    key={itemTag}
                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                                  >
                                    {itemTag}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="ui-table-cell--text">{item.defaultUnit}</td>
                          <td className="ui-table-cell--number font-semibold text-slate-900">
                            {formatNumber(item.defaultUnitPrice)}
                          </td>
                          <td className="ui-table-cell--number">
                            <div className="ui-table-actions">
                              <IconActionLink href={`/catalog/${item.id}`} label="Otvoriť položku">
                                <OpenIcon />
                              </IconActionLink>
                              <form action={deleteCatalogItemAction}>
                                <input type="hidden" name="catalog_item_id" value={item.id} />
                                <DeleteCatalogItemButton itemName={item.name} iconOnly />
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
