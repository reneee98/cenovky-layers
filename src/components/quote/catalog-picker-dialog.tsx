"use client";

import type { Unit } from "@prisma/client";
import { useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";

import {
  Badge,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@/components/ui/shadcn";

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

type CatalogPickerDialogProps = {
  open: boolean;
  items: CatalogPickerItem[];
  labels: {
    title: string;
    description: string;
    category: string;
    addAndAnother: string;
    allCategories: string;
    empty: string;
    searchPlaceholder: string;
  };
  onOpenChange: (open: boolean) => void;
  onSelect: (selection: CatalogPickerSelection) => void;
};

function normalizePrice(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function CatalogPickerDialog({
  open,
  items,
  labels,
  onOpenChange,
  onSelect,
}: CatalogPickerDialogProps) {
  const [category, setCategory] = useState<string>("__all__");
  const [addAnother, setAddAnother] = useState(true);

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.category))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [items]);

  const filtered = useMemo(() => {
    if (category === "__all__") {
      return items;
    }

    return items.filter((item) => item.category === category);
  }, [category, items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-3xl p-0">
        <DialogHeader className="px-6 pb-0 pt-6">
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-6">
          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {labels.category}
              </p>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{labels.allCategories}</SelectItem>
                  {categories.map((itemCategory) => (
                    <SelectItem key={itemCategory} value={itemCategory}>
                      {itemCategory}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="inline-flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-sm text-slate-700">{labels.addAndAnother}</span>
              <Switch checked={addAnother} onCheckedChange={setAddAnother} />
            </label>
          </div>
        </div>

        <div className="px-6 pb-6">
          <Command>
            <CommandInput placeholder={labels.searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{labels.empty}</CommandEmpty>
              <ScrollArea className="h-[52vh] pr-2">
                <CommandGroup>
                  {filtered.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.name} ${item.category} ${(item.description ?? "").trim()}`}
                      onSelect={() => {
                        onSelect({
                          catalogItemId: item.id,
                          name: item.name,
                          description: item.description ?? null,
                          unit: item.defaultUnit,
                          qty: 1,
                          unitPrice: normalizePrice(item.defaultUnitPrice),
                          discountPct: 0,
                        });

                        if (!addAnother) {
                          onOpenChange(false);
                        }
                      }}
                      className="group block cursor-pointer rounded-xl border border-slate-200 p-3 aria-selected:border-blue-200 aria-selected:bg-blue-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{item.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.category}</p>
                          {item.description ? (
                            <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {item.tags.map((tag) => (
                              <Badge key={`${item.id}-${tag}`} variant="neutral">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                          <Plus className="h-4 w-4 group-aria-selected:hidden" />
                          <Check className="hidden h-4 w-4 group-aria-selected:block" />
                        </Button>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            </CommandList>
          </Command>
        </div>
      </DialogContent>
    </Dialog>
  );
}
