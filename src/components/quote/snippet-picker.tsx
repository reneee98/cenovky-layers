"use client";

import type { Language, SnippetType } from "@/types/domain";
import { useMemo, useState } from "react";
import { BookText } from "lucide-react";

import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/shadcn";

export type SnippetPickerItem = {
  id: string;
  type: SnippetType;
  language: Language;
  title: string;
  contentMarkdown: string;
};

type SnippetPickerProps = {
  snippets: SnippetPickerItem[];
  language: Language;
  type: SnippetType;
  triggerLabel: string;
  emptyLabel: string;
  searchPlaceholder: string;
  onSelect: (snippet: SnippetPickerItem) => void;
};

export function SnippetPicker({
  snippets,
  language,
  type,
  triggerLabel,
  emptyLabel,
  searchPlaceholder,
  onSelect,
}: SnippetPickerProps) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    return snippets.filter((snippet) => snippet.language === language && snippet.type === type);
  }, [language, snippets, type]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2">
          <BookText className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(360px,calc(100vw-2rem))] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {filtered.map((snippet) => (
                <CommandItem
                  key={snippet.id}
                  value={`${snippet.title} ${snippet.contentMarkdown}`}
                  onSelect={() => {
                    onSelect(snippet);
                    setOpen(false);
                  }}
                  className="block cursor-pointer p-3"
                >
                  <p className="text-sm font-medium text-slate-900">{snippet.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {snippet.contentMarkdown}
                  </p>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
