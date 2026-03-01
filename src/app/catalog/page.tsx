import Link from "next/link";
import type { Prisma } from "@/types/prisma";

import { deleteCatalogItemAction } from "@/app/catalog/actions";
import { DeleteCatalogItemButton } from "@/app/catalog/delete-catalog-item-button";
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
import { formatNumber } from "@/lib/format";
import { listCatalogFacets, listCatalogItems } from "@/server/repositories";

function extractTags(tagsValue: Prisma.JsonValue): string[] {
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
  const params = await searchParams;

  const search = params.search?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const tag = params.tag?.trim() ?? "";
  const hasFilters = Boolean(search || category || tag);

  const [items, facets] = await Promise.all([
    listCatalogItems({ search, category, tag }),
    listCatalogFacets(),
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

        {params.notice ? <p className="mb-4 text-sm text-emerald-700">{params.notice}</p> : null}
        {params.error ? <p className="mb-4 text-sm text-red-700">{params.error}</p> : null}

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
                  <article key={item.id} className="rounded-md border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.category}</p>
                    {item.description ? (
                      <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                    ) : null}
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>
                        <dt>Jednotka</dt>
                        <dd className="mt-0.5 text-slate-900">{item.defaultUnit}</dd>
                      </div>
                      <div>
                        <dt>Cena</dt>
                        <dd className="mt-0.5 text-slate-900">
                          {formatNumber(item.defaultUnitPrice.toNumber())}
                        </dd>
                      </div>
                    </dl>
                    {tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.map((itemTag) => (
                          <span key={itemTag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                            {itemTag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/catalog/${item.id}`}
                        className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Otvorit
                      </Link>
                      <form action={deleteCatalogItemAction} className="flex-1">
                        <input type="hidden" name="catalog_item_id" value={item.id} />
                        <DeleteCatalogItemButton itemName={item.name} />
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden md:block">
              <div className="ui-table-wrap">
                <table className="ui-table min-w-[980px]">
                  <thead>
                    <tr>
                      <th className="ui-table-cell--text">Nazov</th>
                      <th className="ui-table-cell--text">Kategoria</th>
                      <th className="ui-table-cell--text">Tagy</th>
                      <th className="ui-table-cell--text">Jednotka</th>
                      <th className="ui-table-cell--number">Cena</th>
                      <th className="ui-table-cell--number">Akcie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const tags = extractTags(item.tags);

                      return (
                        <tr key={item.id} className="ui-table-row">
                          <td className="ui-table-cell--text">
                            <p className="ui-table-cell--strong">{item.name}</p>
                            {item.description ? (
                              <p className="mt-1 text-xs text-[var(--color-gray-500)]">{item.description}</p>
                            ) : null}
                          </td>
                          <td className="ui-table-cell--text">{item.category}</td>
                          <td className="ui-table-cell--text">
                            {tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {tags.map((itemTag) => (
                                  <span
                                    key={itemTag}
                                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-2 py-0.5 text-xs"
                                  >
                                    {itemTag}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                          <td className="ui-table-cell--text">{item.defaultUnit}</td>
                          <td className="ui-table-cell--number ui-table-cell--strong">
                            {formatNumber(item.defaultUnitPrice.toNumber())}
                          </td>
                          <td className="ui-table-cell--number">
                            <div className="ui-table-actions">
                              <IconActionLink href={`/catalog/${item.id}`} label="Otvorit polozku">
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
