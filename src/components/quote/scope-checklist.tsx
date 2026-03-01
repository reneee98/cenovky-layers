"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { type ScopePresetCategory, scopeSelectionId } from "@/lib/quotes/scope-preset";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui/shadcn";

type ScopeChecklistProps = {
  categories: ScopePresetCategory[];
  selectedIds: string[];
  empty: {
    title: string;
    description: string;
  };
  heading: string;
  searchLabel: string;
  onToggle: (id: string) => void;
};

export function ScopeChecklist({
  categories,
  selectedIds,
  empty,
  heading,
  searchLabel,
  onToggle,
}: ScopeChecklistProps) {
  const [search, setSearch] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedSearch) {
      return categories;
    }

    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          return (
            item.label.toLowerCase().includes(normalizedSearch) ||
            (item.description ?? "").toLowerCase().includes(normalizedSearch)
          );
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, normalizedSearch]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{heading}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchLabel}
            className="pl-9"
          />
        </div>

        {selectedIds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-700">{empty.title}</p>
            <p className="mt-1 text-sm text-slate-500">{empty.description}</p>
          </div>
        ) : null}

        <Accordion type="multiple" defaultValue={filtered.map((category) => category.key)}>
          {filtered.map((category) => {
            const selectedCount = category.items.reduce((count, item) => {
              const id = scopeSelectionId(category.key, item.key);
              return selectedSet.has(id) ? count + 1 : count;
            }, 0);

            return (
              <AccordionItem key={category.key} value={category.key}>
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <span>{category.label}</span>
                    <Badge variant="neutral">
                      {selectedCount}/{category.items.length}
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2">
                    {category.items.map((item) => {
                      const id = scopeSelectionId(category.key, item.key);
                      const checked = selectedSet.has(id);

                      return (
                        <li key={id}>
                          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3 py-2 transition-colors duration-150 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              checked={checked}
                              onChange={() => onToggle(id)}
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-slate-800">
                                {item.label}
                              </span>
                              {item.description ? (
                                <span className="mt-0.5 block text-xs text-slate-500">
                                  {item.description}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
