"use client";

import type { TotalDiscountType, Unit } from "@prisma/client";
import type { DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  type CatalogPickerItem,
  CatalogPicker,
} from "@/components/catalog-picker";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import {
  calculateLineTotal,
  type QuoteTotals,
} from "@/lib/quotes/totals";

type EditableColumn = "name" | "unit" | "qty" | "unitPrice" | "discountPct";

const EDITABLE_COLUMNS: EditableColumn[] = [
  "name",
  "unit",
  "qty",
  "unitPrice",
  "discountPct",
];

export type ItemsTableRow = {
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
  items: ItemsTableRow[];
  catalogItems: CatalogPickerItem[];
  totalDiscountType: TotalDiscountType;
  totalDiscountValue: string;
  totals: QuoteTotals;
  onItemsChange: (items: ItemsTableRow[]) => void;
  onTotalDiscountTypeChange: (value: TotalDiscountType) => void;
  onTotalDiscountValueChange: (value: string) => void;
};

function createLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyItemRow(): ItemsTableRow {
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

function createEmptySectionRow(): ItemsTableRow {
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
  items,
  catalogItems,
  totalDiscountType,
  totalDiscountValue,
  totals,
  onItemsChange,
  onTotalDiscountTypeChange,
  onTotalDiscountValueChange,
}: ItemsTableProps) {
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<{
    rowId: string;
    column: EditableColumn;
  } | null>(null);
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);

  const cellRefs = useRef(new Map<string, HTMLInputElement | HTMLSelectElement>());
  const pendingFocusRef = useRef<{
    rowId: string;
    column: EditableColumn;
  } | null>(null);

  const lineTotalsByRowId = useMemo(() => {
    const byId = new Map<string, number>();

    items.forEach((item) => {
      if (item.isSection) {
        byId.set(item.id, 0);
        return;
      }

      const lineTotal = calculateLineTotal({
        qty: Math.max(0, toNumber(item.qty, 0)),
        unitPrice: Math.max(0, toNumber(item.unitPrice, 0)),
        discountPct: Math.max(0, toNumber(item.discountPct, 0)),
      });

      byId.set(item.id, lineTotal);
    });

    return byId;
  }, [items]);

  const setCellRef = (
    rowId: string,
    column: EditableColumn,
    node: HTMLInputElement | HTMLSelectElement | null,
  ) => {
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

      if (node instanceof HTMLInputElement) {
        node.select();
      }
    });
  };

  useEffect(() => {
    const pending = pendingFocusRef.current;

    if (!pending) {
      return;
    }

    pendingFocusRef.current = null;
    setActiveCell(pending);
    focusCell(pending.rowId, pending.column);
  }, [items]);

  useEffect(() => {
    if (!isCatalogOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCatalogOpen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = previousOverflow;
    };
  }, [isCatalogOpen]);

  const updateItemRow = (rowId: string, update: Partial<ItemsTableRow>) => {
    onItemsChange(items.map((row) => (row.id === rowId ? { ...row, ...update } : row)));
  };

  const removeItemRow = (rowId: string) => {
    if (items.length <= 1) {
      onItemsChange([createEmptyItemRow()]);
      return;
    }

    onItemsChange(items.filter((row) => row.id !== rowId));
  };

  const addEmptyRow = (focusColumn: EditableColumn = "name") => {
    const nextRow = createEmptyItemRow();
    onItemsChange([...items, nextRow]);
    pendingFocusRef.current = {
      rowId: nextRow.id,
      column: focusColumn,
    };
  };

  const reorderRows = (sourceRowId: string, targetRowId: string) => {
    if (sourceRowId === targetRowId) {
      return;
    }

    const sourceIndex = items.findIndex((row) => row.id === sourceRowId);
    const targetIndex = items.findIndex((row) => row.id === targetRowId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextRows = [...items];
    const [movedRow] = nextRows.splice(sourceIndex, 1);
    nextRows.splice(targetIndex, 0, movedRow);
    onItemsChange(nextRows);
  };

  const focusTarget = (rowIndex: number, columnIndex: number) => {
    const safeColumnIndex = Math.max(0, Math.min(columnIndex, EDITABLE_COLUMNS.length - 1));
    const targetColumn = EDITABLE_COLUMNS[safeColumnIndex];

    if (rowIndex < 0 || !targetColumn) {
      return;
    }

    if (rowIndex >= items.length) {
      addEmptyRow(targetColumn);
      return;
    }

    const targetRow = items[rowIndex];

    if (!targetRow) {
      return;
    }

    setActiveCell({
      rowId: targetRow.id,
      column: targetColumn,
    });
    focusCell(targetRow.id, targetColumn);
  };

  const handleCellKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    rowIndex: number,
    column: EditableColumn,
  ) => {
    const row = items[rowIndex];
    const rowIsSection = row?.isSection && column === "name";

    if (rowIsSection) {
      if (event.key === "Enter") {
        event.preventDefault();
        focusTarget(rowIndex + 1, 0);
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();

        if (event.shiftKey) {
          focusTarget(rowIndex - 1, 0);
        } else {
          focusTarget(rowIndex + 1, 0);
        }
      }

      return;
    }

    const columnIndex = EDITABLE_COLUMNS.indexOf(column);

    if (columnIndex < 0) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      focusTarget(rowIndex + 1, columnIndex);
      return;
    }

    if (event.key === "Tab") {
      if (event.shiftKey && rowIndex === 0 && columnIndex === 0) {
        return;
      }

      event.preventDefault();

      if (event.shiftKey) {
        if (columnIndex === 0) {
          focusTarget(rowIndex - 1, EDITABLE_COLUMNS.length - 1);
        } else {
          focusTarget(rowIndex, columnIndex - 1);
        }
      } else if (columnIndex === EDITABLE_COLUMNS.length - 1) {
        focusTarget(rowIndex + 1, 0);
      } else {
        focusTarget(rowIndex, columnIndex + 1);
      }
    }
  };

  const activateCell = (rowId: string, column: EditableColumn) => {
    setActiveCell({ rowId, column });
    focusCell(rowId, column);
  };

  const handleCatalogSelect = (selection: {
    name: string;
    description: string | null;
    unit: Unit;
    qty: number;
    unitPrice: number;
    discountPct: number;
  }) => {
    const nextRow: ItemsTableRow = {
      id: createLocalId(),
      name: selection.name,
      description: selection.description ?? "",
      unit: selection.unit,
      qty: selection.qty.toString(),
      unitPrice: selection.unitPrice.toString(),
      discountPct: selection.discountPct.toString(),
      isSection: false,
    };

    onItemsChange([...items, nextRow]);
    setIsCatalogOpen(false);
  };

  const handleDragStart = (
    event: ReactDragEvent<HTMLButtonElement>,
    rowId: string,
  ) => {
    setDraggedRowId(rowId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", rowId);
  };

  const handleDragOver = (
    event: ReactDragEvent<HTMLTableRowElement>,
    rowId: string,
  ) => {
    if (!draggedRowId || draggedRowId === rowId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverRowId(rowId);
  };

  const handleDrop = (rowId: string) => {
    if (!draggedRowId || draggedRowId === rowId) {
      setDragOverRowId(null);
      return;
    }

    reorderRows(draggedRowId, rowId);
    setDraggedRowId(null);
    setDragOverRowId(null);
  };

  const clearDragState = () => {
    setDraggedRowId(null);
    setDragOverRowId(null);
  };

  return (
    <div className="items-table-shell">
      <div className="items-table-toolbar">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="items-table-add-empty-btn"
            onClick={() => addEmptyRow("name")}
          >
            Pridat prazdnu polozku
          </Button>
          <Button
            type="button"
            size="sm"
            className="items-table-add-btn"
            onClick={() => setIsCatalogOpen(true)}
          >
            Pridat z katalogu
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="items-table-add-section-btn"
            onClick={() => {
              const nextRow = createEmptySectionRow();
              onItemsChange([...items, nextRow]);
              pendingFocusRef.current = {
                rowId: nextRow.id,
                column: "name",
              };
            }}
          >
            Pridat sekciu
          </Button>
        </div>
      </div>

      <div className="ui-table-wrap">
        <table className="ui-table items-grid-table min-w-[980px]">
          <thead>
            <tr>
              <th className="ui-table-cell--text">Item name</th>
              <th className="ui-table-cell--text">Unit</th>
              <th className="ui-table-cell--number">Qty</th>
              <th className="ui-table-cell--number">Unit price</th>
              <th className="ui-table-cell--number">Line discount %</th>
              <th className="ui-table-cell--number">Line total</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, rowIndex) => {
              const isSectionRow = item.isSection;
              const lineTotal = lineTotalsByRowId.get(item.id) ?? 0;
              const nameActive = activeCell?.rowId === item.id && activeCell.column === "name";
              const unitActive = activeCell?.rowId === item.id && activeCell.column === "unit";
              const qtyActive = activeCell?.rowId === item.id && activeCell.column === "qty";
              const priceActive = activeCell?.rowId === item.id && activeCell.column === "unitPrice";
              const discountActive =
                activeCell?.rowId === item.id && activeCell.column === "discountPct";
              const rowSelected = activeCell?.rowId === item.id;

              return (
                <tr
                  key={item.id}
                  className={`ui-table-row ${isSectionRow ? "items-row-section" : ""}`}
                  data-drag-over={dragOverRowId === item.id ? "true" : undefined}
                  data-selected={rowSelected ? "true" : undefined}
                  onDragOver={(event) => handleDragOver(event, item.id)}
                  onDrop={() => handleDrop(item.id)}
                  onDragEnd={clearDragState}
                >
                  <td className="ui-table-cell--text">
                    <div className="items-name-cell">
                      <button
                        type="button"
                        className="items-row-handle"
                        draggable
                        onDragStart={(event) => handleDragStart(event, item.id)}
                        onDragEnd={clearDragState}
                        aria-label="Presunut riadok"
                        title="Presunut riadok"
                      >
                        ⋮⋮
                      </button>

                      {nameActive ? (
                        <input
                          ref={(node) => setCellRef(item.id, "name", node)}
                          value={item.name}
                          onChange={(event) => updateItemRow(item.id, { name: event.target.value })}
                          onKeyDown={(event) => handleCellKeyDown(event, rowIndex, "name")}
                          className={`items-cell-input items-cell-input--name ${isSectionRow ? "items-cell-input--section" : ""}`}
                          placeholder={isSectionRow ? "Nazov sekcie" : "Nazov polozky"}
                        />
                      ) : (
                        <button
                          type="button"
                          className={`items-cell-display items-cell-display--name ${isSectionRow ? "items-cell-display--section" : ""}`}
                          onClick={() => activateCell(item.id, "name")}
                        >
                          <span>{item.name || (isSectionRow ? "Klikni pre upravu nazvu sekcie" : "Klikni pre upravu nazvu")}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="items-row-remove"
                        onClick={() => removeItemRow(item.id)}
                        aria-label="Odstranit riadok"
                      >
                        ×
                      </button>
                    </div>
                  </td>

                  <td className="ui-table-cell--text">
                    {isSectionRow ? (
                      <span className="items-cell-placeholder">-</span>
                    ) : unitActive ? (
                      <select
                        ref={(node) => setCellRef(item.id, "unit", node)}
                        value={item.unit}
                        onChange={(event) => updateItemRow(item.id, { unit: event.target.value as Unit })}
                        onKeyDown={(event) => handleCellKeyDown(event, rowIndex, "unit")}
                        className="items-cell-input"
                      >
                        <option value="h">h</option>
                        <option value="day">day</option>
                        <option value="pcs">pcs</option>
                        <option value="pkg">pkg</option>
                      </select>
                    ) : (
                      <button
                        type="button"
                        className="items-cell-display"
                        onClick={() => activateCell(item.id, "unit")}
                      >
                        {item.unit}
                      </button>
                    )}
                  </td>

                  <td className="ui-table-cell--number">
                    {isSectionRow ? (
                      <span className="items-cell-placeholder">-</span>
                    ) : qtyActive ? (
                      <input
                        ref={(node) => setCellRef(item.id, "qty", node)}
                        value={item.qty}
                        onChange={(event) => updateItemRow(item.id, { qty: event.target.value })}
                        onKeyDown={(event) => handleCellKeyDown(event, rowIndex, "qty")}
                        className="items-cell-input items-cell-input--number"
                      />
                    ) : (
                      <button
                        type="button"
                        className="items-cell-display items-cell-display--number"
                        onClick={() => activateCell(item.id, "qty")}
                      >
                        {item.qty || "0"}
                      </button>
                    )}
                  </td>

                  <td className="ui-table-cell--number">
                    {isSectionRow ? (
                      <span className="items-cell-placeholder">-</span>
                    ) : priceActive ? (
                      <input
                        ref={(node) => setCellRef(item.id, "unitPrice", node)}
                        value={item.unitPrice}
                        onChange={(event) => updateItemRow(item.id, { unitPrice: event.target.value })}
                        onKeyDown={(event) => handleCellKeyDown(event, rowIndex, "unitPrice")}
                        className="items-cell-input items-cell-input--number"
                      />
                    ) : (
                      <button
                        type="button"
                        className="items-cell-display items-cell-display--number"
                        onClick={() => activateCell(item.id, "unitPrice")}
                      >
                        {item.unitPrice || "0"}
                      </button>
                    )}
                  </td>

                  <td className="ui-table-cell--number">
                    {isSectionRow ? (
                      <span className="items-cell-placeholder">-</span>
                    ) : discountActive ? (
                      <input
                        ref={(node) => setCellRef(item.id, "discountPct", node)}
                        value={item.discountPct}
                        onChange={(event) => updateItemRow(item.id, { discountPct: event.target.value })}
                        onKeyDown={(event) => handleCellKeyDown(event, rowIndex, "discountPct")}
                        className="items-cell-input items-cell-input--number"
                      />
                    ) : (
                      <button
                        type="button"
                        className="items-cell-display items-cell-display--number"
                        onClick={() => activateCell(item.id, "discountPct")}
                      >
                        {item.discountPct || "0"}
                      </button>
                    )}
                  </td>

                  <td className="ui-table-cell--number ui-table-cell--strong">
                    {isSectionRow ? "" : formatCurrency(lineTotal, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="items-table-foot-row">
              <td colSpan={5} className="items-table-foot-label">
                Subtotal
              </td>
              <td className="items-table-foot-value">
                {formatCurrency(totals.subtotal, currency)}
              </td>
            </tr>
            <tr className="items-table-foot-row">
              <td colSpan={5} className="items-table-foot-label">
                <div className="items-table-discount-control">
                  <span>Total discount</span>
                  <select
                    value={totalDiscountType}
                    onChange={(event) => {
                      const value = event.target.value as TotalDiscountType;

                      if (value === "none" || value === "pct" || value === "amount") {
                        onTotalDiscountTypeChange(value);
                      }
                    }}
                    className="items-table-discount-select"
                  >
                    <option value="none">none</option>
                    <option value="pct">%</option>
                    <option value="amount">amount</option>
                  </select>
                  <input
                    value={totalDiscountValue}
                    disabled={totalDiscountType === "none"}
                    onChange={(event) => onTotalDiscountValueChange(event.target.value)}
                    className="items-table-discount-input"
                  />
                </div>
              </td>
              <td className="items-table-foot-value">
                -{formatCurrency(totals.totalDiscount, currency)}
              </td>
            </tr>
            <tr className="items-table-foot-row">
              <td colSpan={5} className="items-table-foot-label">
                VAT
              </td>
              <td className="items-table-foot-value">
                {formatCurrency(totals.vatAmount, currency)}
              </td>
            </tr>
            <tr className="items-table-foot-row items-table-foot-row--grand">
              <td colSpan={5} className="items-table-foot-label">
                Grand total
              </td>
              <td className="items-table-foot-value">
                {formatCurrency(totals.grandTotal, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {isCatalogOpen ? (
        <div className="items-table-modal-backdrop" onClick={() => setIsCatalogOpen(false)}>
          <div
            className="items-table-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Catalog picker"
          >
            <div className="items-table-modal-head">
              <h3 className="text-sm font-semibold text-slate-900">Add item from catalog</h3>
              <button
                type="button"
                className="items-table-modal-close"
                onClick={() => setIsCatalogOpen(false)}
              >
                Zavriet
              </button>
            </div>
            <CatalogPicker
              title="Catalog"
              items={catalogItems}
              onSelect={handleCatalogSelect}
              className="mt-3"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
