"use client";

import type { TotalDiscountType, Unit } from "@prisma/client";
import type {
  DragEvent as ReactDragEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Fragment, useMemo, useRef, useState } from "react";
import { FileText, GripVertical, Plus, Rows2, Trash2 } from "lucide-react";

import type { CatalogPickerItem, CatalogPickerSelection } from "@/components/quote/catalog-picker-dialog";
import { CatalogPickerDialog } from "@/components/quote/catalog-picker-dialog";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@/components/ui/shadcn";
import { formatCurrency } from "@/lib/format";
import { calculateLineTotal, type QuoteTotals } from "@/lib/quotes/totals";

type EditableColumn = "name" | "unit" | "qty" | "unitPrice" | "discountPct";

const EDITABLE_COLUMNS: EditableColumn[] = ["name", "unit", "qty", "unitPrice", "discountPct"];
const UNIT_OPTIONS: Unit[] = ["h", "day", "pcs", "pkg"];

export type QuoteItemRow = {
  id: string;
  name: string;
  unit: Unit;
  qty: string;
  unitPrice: string;
  discountPct: string;
  description: string;
  isSection: boolean;
};

type ItemsTableProps = {
  currency: string;
  locale: string;
  items: QuoteItemRow[];
  catalogItems: CatalogPickerItem[];
  totalDiscountType: TotalDiscountType;
  totalDiscountValue: string;
  totals: QuoteTotals;
  labels: {
    heading: string;
    addItem: string;
    addSection: string;
    addFromCatalog: string;
    addAndAnother: string;
    noItemsTitle: string;
    noItemsDescription: string;
    totalDiscountPct: string;
    totalDiscountAmount: string;
    discount: string;
    name: string;
    unit: string;
    qty: string;
    unitPrice: string;
    lineTotal: string;
    section: string;
    item: string;
    sectionTitle: string;
    itemName: string;
    sectionHint: string;
    noTotalDiscount: string;
    subtotal: string;
    vat: string;
    grandTotal: string;
    searchCatalogPlaceholder: string;
    catalogDescription: string;
    allCategories: string;
    noCatalogItems: string;
    category: string;
    deleteRow: string;
    dragRow: string;
    editDescription: string;
    hideDescription: string;
    descriptionPlaceholder: string;
    descriptionHint: string;
  };
  onItemsChange: (items: QuoteItemRow[]) => void;
  onTotalDiscountTypeChange: (value: TotalDiscountType) => void;
  onTotalDiscountValueChange: (value: string) => void;
};

function createLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyItemRow(): QuoteItemRow {
  return {
    id: createLocalId(),
    name: "",
    unit: "h",
    qty: "1",
    unitPrice: "0",
    discountPct: "0",
    description: "",
    isSection: false,
  };
}

function createEmptySectionRow(): QuoteItemRow {
  return {
    id: createLocalId(),
    name: "",
    unit: "h",
    qty: "0",
    unitPrice: "0",
    discountPct: "0",
    description: "",
    isSection: true,
  };
}

function toNumber(value: string, fallback = 0): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toCellKey(rowId: string, column: EditableColumn): string {
  return `${rowId}:${column}`;
}

export function ItemsTable({
  currency,
  locale,
  items,
  catalogItems,
  totalDiscountType,
  totalDiscountValue,
  totals,
  labels,
  onItemsChange,
  onTotalDiscountTypeChange,
  onTotalDiscountValueChange,
}: ItemsTableProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [expandedDescriptionById, setExpandedDescriptionById] = useState<Record<string, boolean>>(
    {},
  );
  const cellRefs = useRef(new Map<string, HTMLInputElement>());

  const lineTotalsById = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      if (item.isSection) {
        map.set(item.id, 0);
        continue;
      }

      map.set(
        item.id,
        calculateLineTotal({
          qty: Math.max(0, toNumber(item.qty, 0)),
          unitPrice: Math.max(0, toNumber(item.unitPrice, 0)),
          discountPct: Math.max(0, toNumber(item.discountPct, 0)),
        }),
      );
    }

    return map;
  }, [items]);

  const setCellRef = (rowId: string, column: EditableColumn, node: HTMLInputElement | null) => {
    const key = toCellKey(rowId, column);
    if (!node) {
      cellRefs.current.delete(key);
      return;
    }
    cellRefs.current.set(key, node);
  };

  const focusCell = (rowId: string, column: EditableColumn) => {
    requestAnimationFrame(() => {
      const node = cellRefs.current.get(toCellKey(rowId, column));
      if (!node) {
        return;
      }

      node.focus();
      node.select();
    });
  };

  const addRow = (type: "item" | "section", focusColumn: EditableColumn = "name") => {
    const next = type === "section" ? createEmptySectionRow() : createEmptyItemRow();
    onItemsChange([...items, next]);
    focusCell(next.id, focusColumn);
  };

  const updateRow = (rowId: string, patch: Partial<QuoteItemRow>) => {
    onItemsChange(items.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };

  const removeRow = (rowId: string) => {
    const next = items.filter((row) => row.id !== rowId);
    onItemsChange(next.length > 0 ? next : [createEmptyItemRow()]);
    setExpandedDescriptionById((current) => {
      const nextExpanded = { ...current };
      delete nextExpanded[rowId];
      return nextExpanded;
    });
  };

  const isDescriptionExpanded = (item: QuoteItemRow): boolean =>
    expandedDescriptionById[item.id] ?? item.description.trim().length > 0;

  const toggleDescription = (item: QuoteItemRow) => {
    const current = isDescriptionExpanded(item);
    setExpandedDescriptionById((previous) => ({
      ...previous,
      [item.id]: !current,
    }));
  };

  const moveRow = (sourceRowId: string, targetRowId: string) => {
    if (sourceRowId === targetRowId) {
      return;
    }

    const sourceIndex = items.findIndex((item) => item.id === sourceRowId);
    const targetIndex = items.findIndex((item) => item.id === targetRowId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const next = [...items];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    onItemsChange(next);
  };

  const handleDragStart = (event: ReactDragEvent<HTMLElement>, rowId: string) => {
    setDraggedRowId(rowId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", rowId);
  };

  const handleDragOver = (event: ReactDragEvent<HTMLElement>, targetRowId: string) => {
    event.preventDefault();
    const sourceRowId = draggedRowId ?? event.dataTransfer.getData("text/plain");
    if (!sourceRowId || sourceRowId === targetRowId) {
      return;
    }

    moveRow(sourceRowId, targetRowId);
  };

  const handleDragEnd = () => {
    setDraggedRowId(null);
  };

  const focusByCoordinates = (rowIndex: number, column: EditableColumn) => {
    if (rowIndex < 0) {
      return;
    }
    if (rowIndex >= items.length) {
      addRow("item", column);
      return;
    }
    const row = items[rowIndex];
    if (!row || row.isSection) {
      return;
    }
    focusCell(row.id, column);
  };

  const handleCellKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    column: EditableColumn,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      focusByCoordinates(rowIndex + 1, column);
      return;
    }

    if (event.key === "Tab" && event.shiftKey) {
      const currentColumnIndex = EDITABLE_COLUMNS.indexOf(column);
      if (currentColumnIndex === 0) {
        event.preventDefault();
        focusByCoordinates(rowIndex - 1, EDITABLE_COLUMNS[EDITABLE_COLUMNS.length - 1]);
      }
      return;
    }

    if (event.key === "Tab" && !event.shiftKey) {
      const currentColumnIndex = EDITABLE_COLUMNS.indexOf(column);
      if (currentColumnIndex === EDITABLE_COLUMNS.length - 1) {
        event.preventDefault();
        focusByCoordinates(rowIndex + 1, EDITABLE_COLUMNS[0]);
      }
    }
  };

  const handleCatalogSelect = (selection: CatalogPickerSelection) => {
    const row: QuoteItemRow = {
      id: createLocalId(),
      name: selection.name,
      description: selection.description ?? "",
      unit: selection.unit,
      qty: selection.qty.toString(),
      unitPrice: selection.unitPrice.toString(),
      discountPct: selection.discountPct.toString(),
      isSection: false,
    };

    onItemsChange([...items, row]);
  };

  const hasFilledItems = items.some((item) => item.name.trim().length > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{labels.heading}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCatalogOpen(true)}>
              <Plus className="h-4 w-4" />
              {labels.addFromCatalog}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => addRow("item")}>
              <Plus className="h-4 w-4" />
              {labels.addItem}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => addRow("section")}>
              <Rows2 className="h-4 w-4" />
              {labels.addSection}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasFilledItems ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-700">{labels.noItemsTitle}</p>
            <p className="mt-1 text-sm text-slate-500">{labels.noItemsDescription}</p>
          </div>
        ) : null}

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>{labels.name}</TableHead>
                <TableHead className="w-28">{labels.unit}</TableHead>
                <TableHead className="w-28 text-right">{labels.qty}</TableHead>
                <TableHead className="w-32 text-right">{labels.unitPrice}</TableHead>
                <TableHead className="w-28 text-right">{labels.discount}</TableHead>
                <TableHead className="w-32 text-right">{labels.lineTotal}</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, rowIndex) => {
                if (item.isSection) {
                  return (
                    <TableRow
                      key={item.id}
                      className={item.id === draggedRowId ? "bg-slate-100" : "bg-slate-50"}
                      onDragOver={(event) => handleDragOver(event, item.id)}
                    >
                      <TableCell>
                        <button
                          type="button"
                          draggable
                          onDragStart={(event) => handleDragStart(event, item.id)}
                          onDragEnd={handleDragEnd}
                          className="cursor-grab active:cursor-grabbing"
                          aria-label={labels.dragRow}
                        >
                          <GripVertical className="h-4 w-4 text-slate-300" />
                        </button>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.name}
                          onChange={(event) => updateRow(item.id, { name: event.target.value })}
                          placeholder={labels.sectionTitle}
                          className="h-9 font-medium"
                        />
                      </TableCell>
                      <TableCell colSpan={5} className="text-xs text-slate-500">
                        {labels.sectionHint}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(item.id)}
                          aria-label={labels.deleteRow}
                        >
                          <Trash2 className="h-4 w-4 text-slate-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                }

                const descriptionExpanded = isDescriptionExpanded(item);

                return (
                  <Fragment key={item.id}>
                    <TableRow
                      className={item.id === draggedRowId ? "bg-slate-50" : undefined}
                      onDragOver={(event) => handleDragOver(event, item.id)}
                    >
                      <TableCell>
                        <button
                          type="button"
                          draggable
                          onDragStart={(event) => handleDragStart(event, item.id)}
                          onDragEnd={handleDragEnd}
                          className="cursor-grab active:cursor-grabbing"
                          aria-label={labels.dragRow}
                        >
                          <GripVertical className="h-4 w-4 text-slate-300" />
                        </button>
                      </TableCell>
                      <TableCell>
                        <Input
                          ref={(node) => setCellRef(item.id, "name", node)}
                          value={item.name}
                          onChange={(event) => updateRow(item.id, { name: event.target.value })}
                          onKeyDown={(event) => handleCellKeyDown(event, rowIndex, "name")}
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.unit}
                          onValueChange={(value) => updateRow(item.id, { unit: value as Unit })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OPTIONS.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          ref={(node) => setCellRef(item.id, "qty", node)}
                          value={item.qty}
                          onChange={(event) => updateRow(item.id, { qty: event.target.value })}
                          onKeyDown={(event) => handleCellKeyDown(event, rowIndex, "qty")}
                          className="h-9 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          ref={(node) => setCellRef(item.id, "unitPrice", node)}
                          value={item.unitPrice}
                          onChange={(event) => updateRow(item.id, { unitPrice: event.target.value })}
                          onKeyDown={(event) => handleCellKeyDown(event, rowIndex, "unitPrice")}
                          className="h-9 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          ref={(node) => setCellRef(item.id, "discountPct", node)}
                          value={item.discountPct}
                          onChange={(event) => updateRow(item.id, { discountPct: event.target.value })}
                          onKeyDown={(event) => handleCellKeyDown(event, rowIndex, "discountPct")}
                          className="h-9 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-900">
                        {formatCurrency(lineTotalsById.get(item.id) ?? 0, currency, locale)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleDescription(item)}
                            aria-label={
                              descriptionExpanded
                                ? labels.hideDescription
                                : labels.editDescription
                            }
                          >
                            <FileText
                              className={`h-4 w-4 ${
                                descriptionExpanded || item.description.trim().length > 0
                                  ? "text-slate-700"
                                  : "text-slate-500"
                              }`}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRow(item.id)}
                            aria-label={labels.deleteRow}
                          >
                            <Trash2 className="h-4 w-4 text-slate-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {descriptionExpanded ? (
                      <TableRow className="bg-slate-50/70">
                        <TableCell />
                        <TableCell colSpan={6} className="py-2">
                          <Textarea
                            value={item.description}
                            onChange={(event) =>
                              updateRow(item.id, { description: event.target.value })
                            }
                            rows={4}
                            placeholder={labels.descriptionPlaceholder}
                            className="min-h-[96px] bg-white"
                          />
                          <p className="mt-1 text-xs text-slate-500">{labels.descriptionHint}</p>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 md:hidden">
          {items.map((item) => {
            const descriptionExpanded = isDescriptionExpanded(item);

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-3 ${
                  item.id === draggedRowId ? "border-slate-300 bg-slate-50" : "border-slate-200"
                }`}
                onDragOver={(event) => handleDragOver(event, item.id)}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => handleDragStart(event, item.id)}
                      onDragEnd={handleDragEnd}
                      className="cursor-grab active:cursor-grabbing"
                      aria-label={labels.dragRow}
                    >
                      <GripVertical className="h-4 w-4 text-slate-300" />
                    </button>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.isSection ? labels.section : labels.item}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!item.isSection ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleDescription(item)}
                        aria-label={
                          descriptionExpanded ? labels.hideDescription : labels.editDescription
                        }
                      >
                        <FileText
                          className={`h-4 w-4 ${
                            descriptionExpanded || item.description.trim().length > 0
                              ? "text-slate-700"
                              : "text-slate-500"
                          }`}
                        />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeRow(item.id)}
                      aria-label={labels.deleteRow}
                    >
                      <Trash2 className="h-4 w-4 text-slate-500" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Input
                    value={item.name}
                    onChange={(event) => updateRow(item.id, { name: event.target.value })}
                    placeholder={item.isSection ? labels.sectionTitle : labels.itemName}
                  />
                  {!item.isSection ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={item.unit}
                          onValueChange={(value) => updateRow(item.id, { unit: value as Unit })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OPTIONS.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={item.qty}
                          onChange={(event) => updateRow(item.id, { qty: event.target.value })}
                          className="text-right"
                        />
                        <Input
                          value={item.unitPrice}
                          onChange={(event) => updateRow(item.id, { unitPrice: event.target.value })}
                          className="text-right"
                        />
                        <Input
                          value={item.discountPct}
                          onChange={(event) =>
                            updateRow(item.id, { discountPct: event.target.value })
                          }
                          className="text-right"
                        />
                      </div>
                      {descriptionExpanded ? (
                        <div className="space-y-1">
                          <Textarea
                            value={item.description}
                            onChange={(event) =>
                              updateRow(item.id, { description: event.target.value })
                            }
                            rows={4}
                            placeholder={labels.descriptionPlaceholder}
                            className="bg-white"
                          />
                          <p className="text-xs text-slate-500">{labels.descriptionHint}</p>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">{labels.lineTotal}</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(lineTotalsById.get(item.id) ?? 0, currency, locale)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[220px_1fr]">
          <Select value={totalDiscountType} onValueChange={(value) => onTotalDiscountTypeChange(value as TotalDiscountType)}>
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{labels.noTotalDiscount}</SelectItem>
              <SelectItem value="pct">{labels.totalDiscountPct}</SelectItem>
              <SelectItem value="amount">{labels.totalDiscountAmount}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={totalDiscountValue}
            onChange={(event) => onTotalDiscountValueChange(event.target.value)}
            disabled={totalDiscountType === "none"}
            className="bg-white text-right"
          />
        </div>

        <dl className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">{labels.subtotal}</dt>
            <dd className="font-medium text-slate-900">
              {formatCurrency(totals.subtotal, currency, locale)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">{labels.discount}</dt>
            <dd className="font-medium text-slate-900">
              -{formatCurrency(totals.totalDiscount, currency, locale)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">{labels.vat}</dt>
            <dd className="font-medium text-slate-900">
              {formatCurrency(totals.vatAmount, currency, locale)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <dt className="font-semibold text-slate-900">{labels.grandTotal}</dt>
            <dd className="text-base font-semibold text-slate-900">
              {formatCurrency(totals.grandTotal, currency, locale)}
            </dd>
          </div>
        </dl>
      </CardContent>

      <CatalogPickerDialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        items={catalogItems}
        onSelect={handleCatalogSelect}
        labels={{
          title: labels.addFromCatalog,
          description: labels.catalogDescription,
          category: labels.category,
          addAndAnother: labels.addAndAnother,
          allCategories: labels.allCategories,
          empty: labels.noCatalogItems,
          searchPlaceholder: labels.searchCatalogPlaceholder,
        }}
      />
    </Card>
  );
}
