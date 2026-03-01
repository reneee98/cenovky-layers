"use client";

import type { Language, SnippetType } from "@prisma/client";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { cx } from "@/components/ui/cx";

export type SnippetPickerItem = {
  id: string;
  type: SnippetType;
  language: Language;
  title: string;
  contentMarkdown: string;
};

type SnippetPickerProps = {
  snippets: SnippetPickerItem[];
  onSelect: (snippet: SnippetPickerItem) => void;
  title?: string;
  fixedType?: SnippetType;
  fixedLanguage?: Language;
  className?: string;
};

export function SnippetPicker({
  snippets,
  onSelect,
  title = "Vyber sablony textu",
  fixedType,
  fixedLanguage,
  className,
}: SnippetPickerProps) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<SnippetType | "">(fixedType ?? "");
  const [language, setLanguage] = useState<Language | "">(fixedLanguage ?? "");

  const filteredSnippets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return snippets.filter((snippet) => {
      const effectiveType = fixedType ?? type;
      const effectiveLanguage = fixedLanguage ?? language;

      if (effectiveType && snippet.type !== effectiveType) {
        return false;
      }

      if (effectiveLanguage && snippet.language !== effectiveLanguage) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        snippet.title.toLowerCase().includes(normalizedSearch) ||
        snippet.contentMarkdown.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [snippets, search, type, language, fixedType, fixedLanguage]);

  return (
    <section
      className={cx("ui-page-section ui-modal-surface", className)}
    >
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_140px_140px]">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Hladat sablony"
          className="text-sm"
        />

        <Select
          value={fixedType ?? type}
          disabled={Boolean(fixedType)}
          onChange={(event) => {
            const value = event.target.value;
            setType(value === "intro" || value === "terms" ? value : "");
          }}
          className="text-sm disabled:bg-slate-100"
        >
          <option value="">Vsetky typy</option>
          <option value="intro">Uvod</option>
          <option value="terms">Podmienky</option>
        </Select>

        <Select
          value={fixedLanguage ?? language}
          disabled={Boolean(fixedLanguage)}
          onChange={(event) => {
            const value = event.target.value;
            setLanguage(value === "sk" || value === "en" ? value : "");
          }}
          className="text-sm disabled:bg-slate-100"
        >
          <option value="">Vsetky jazyky</option>
          <option value="sk">SK</option>
          <option value="en">EN</option>
        </Select>
      </div>

      {filteredSnippets.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
          Ziadna sablona nevyhovuje filtrom.
        </p>
      ) : (
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
          {filteredSnippets.map((snippet) => (
            <li key={snippet.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{snippet.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {snippet.type === "intro" ? "Uvod" : "Podmienky"} ·{" "}
                    {snippet.language.toUpperCase()}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                    {snippet.contentMarkdown}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="sm:self-start"
                  onClick={() => onSelect(snippet)}
                >
                  Vlozit
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
