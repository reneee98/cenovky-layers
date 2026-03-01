"use client";

import type { Unit } from "@/types/domain";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { cx } from "@/components/ui/cx";

export type CatalogPickerItem = {
  id: string;
  category: string;
  tags: string[];
  name: string;
  description?: string | null;
  defaultUnit: Unit;
  defaultUnitPrice: number | string;
};

export type CatalogPickerSelection = {
  catalogItemId: string;
  name: string;
  description: string | null;
  unit: Unit;
  qty: number;
  unitPrice: number;
  discountPct: number;
};

type CatalogPickerProps = {
  items: CatalogPickerItem[];
  onSelect: (selection: CatalogPickerSelection) => void;
  title?: string;
  className?: string;
};

function normalizePrice(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function CatalogPicker({
  items,
  onSelect,
  title = "Vyber z katalogu",
  className,
}: CatalogPickerProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        items
          .map((item) => item.category.trim())
          .filter((itemCategory) => itemCategory.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      if (category && item.category !== category) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const inName = item.name.toLowerCase().includes(normalizedSearch);
      const inDescription = (item.description ?? "")
        .toLowerCase()
        .includes(normalizedSearch);

      return inName || inDescription;
    });
  }, [items, search, category]);

  return (
    <section
      className={cx("ui-page-section ui-modal-surface", className)}
    >
      <header>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </header>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px]">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Hladat podla nazvu alebo popisu"
          className="text-sm"
        />

        <Select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="text-sm"
        >
          <option value="">Vsetky kategorie</option>
          {categories.map((itemCategory) => (
            <option key={itemCategory} value={itemCategory}>
              {itemCategory}
            </option>
          ))}
        </Select>
      </div>

      {filteredItems.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          Ziadna katalogova polozka nevyhovuje filtrom.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {filteredItems.map((item) => (
            <li
              key={item.id}
              className="rounded-md border border-slate-200 p-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.category}</p>
                  {item.description ? (
                    <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                  ) : null}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="sm:self-start"
                  onClick={() => {
                    onSelect({
                      catalogItemId: item.id,
                      name: item.name,
                      description: item.description ?? null,
                      unit: item.defaultUnit,
                      qty: 1,
                      unitPrice: normalizePrice(item.defaultUnitPrice),
                      discountPct: 0,
                    });
                  }}
                >
                  Vybrat
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
