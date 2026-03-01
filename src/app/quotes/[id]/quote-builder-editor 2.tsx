"use client";

import type { Language, QuoteStatus, TotalDiscountType } from "@prisma/client";
import { useEffect, useMemo, useRef, useState } from "react";

import { type CatalogPickerItem } from "@/components/catalog-picker";
import { type ItemsTableRow, ItemsTable } from "@/components/items-table";
import {
  type SnippetPickerItem,
  SnippetPicker,
} from "@/components/snippet-picker";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { formatCurrency, formatTime } from "@/lib/format";
import { QUOTE_ITEM_SECTION_MARKER } from "@/lib/quotes/items";
import { calculateQuoteTotals } from "@/lib/quotes/totals";
import {
  formatQuoteStatus,
  isQuoteStatus,
  QUOTE_STATUS_OPTIONS,
} from "@/lib/quotes/status";
import { Select } from "@/components/ui/fields";

type ClientOption = {
  id: string;
  name: string;
};

type QuoteBuilderState = {
  title: string;
  clientId: string;
  language: Language;
  currency: string;
  validUntil: string;
  vatEnabled: boolean;
  status: QuoteStatus;
  introContentMarkdown: string;
  termsContentMarkdown: string;
  revisionsIncluded: number;
  totalDiscountType: TotalDiscountType;
  totalDiscountValue: string;
  vatRate: string;
};

type QuoteBuilderEditorProps = {
  quoteId: string;
  quoteNumber: string;
  initialState: QuoteBuilderState;
  initialItems: ItemsTableRow[];
  clients: ClientOption[];
  catalogItems: CatalogPickerItem[];
  snippets: SnippetPickerItem[];
  duplicateQuoteAction: (formData: FormData) => void | Promise<void>;
};

function createLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value: string, fallback = 0): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDateInputValue(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function isFiniteNumericInput(value: string): boolean {
  if (value.trim().length === 0) {
    return false;
  }

  return Number.isFinite(Number(value.replace(",", ".")));
}

function buildPayload(
  state: QuoteBuilderState,
  items: ItemsTableRow[],
) {
  return {
    title: state.title,
    clientId: state.clientId,
    language: state.language,
    currency: state.currency.toUpperCase(),
    validUntil: state.validUntil,
    vatEnabled: state.vatEnabled,
    status: state.status,
    introContentMarkdown: state.introContentMarkdown,
    termsContentMarkdown: state.termsContentMarkdown,
    revisionsIncluded: state.revisionsIncluded,
    totalDiscountType: state.totalDiscountType,
    totalDiscountValue: Math.max(0, toNumber(state.totalDiscountValue, 0)),
    vatRate: Math.max(0, toNumber(state.vatRate, 0)),
    items: items
      .map((item) => ({
        name: item.name.trim(),
        isSection: item.isSection,
        description: item.isSection
          ? QUOTE_ITEM_SECTION_MARKER
          : item.description.trim() || null,
        unit: item.unit,
        qty: item.isSection ? 0 : Math.max(0, toNumber(item.qty, 0)),
        unitPrice: item.isSection ? 0 : Math.max(0, toNumber(item.unitPrice, 0)),
        discountPct: item.isSection ? 0 : Math.max(0, toNumber(item.discountPct, 0)),
      }))
      .filter((item) => item.name.length > 0),
  };
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

function getStatusTone(status: QuoteStatus): "neutral" | "accent" | "success" | "warning" | "danger" {
  if (status === "accepted") {
    return "success";
  }

  if (status === "rejected") {
    return "danger";
  }

  if (status === "invoiced") {
    return "warning";
  }

  if (status === "sent") {
    return "accent";
  }

  return "neutral";
}

export function QuoteBuilderEditor({
  quoteId,
  quoteNumber,
  initialState,
  initialItems,
  clients,
  catalogItems,
  snippets,
  duplicateQuoteAction,
}: QuoteBuilderEditorProps) {
  const [state, setState] = useState<QuoteBuilderState>(initialState);
  const [items, setItems] = useState<ItemsTableRow[]>(
    initialItems.length > 0 ? initialItems : [createEmptyItemRow()],
  );
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [autosaveMessage, setAutosaveMessage] = useState("Ukladanie je aktivne.");
  const [showIntroSnippetPicker, setShowIntroSnippetPicker] = useState(false);
  const [showTermsSnippetPicker, setShowTermsSnippetPicker] = useState(false);
  const [openSections, setOpenSections] = useState({
    intro: true,
    items: true,
    revisions: false,
    terms: false,
  });

  const hasMountedRef = useRef(false);
  const latestRequestIdRef = useRef(0);

  const totals = useMemo(
    () =>
      calculateQuoteTotals({
        items: items.map((item) => ({
          qty: item.isSection ? 0 : Math.max(0, toNumber(item.qty, 0)),
          unitPrice: item.isSection ? 0 : Math.max(0, toNumber(item.unitPrice, 0)),
          discountPct: item.isSection ? 0 : Math.max(0, toNumber(item.discountPct, 0)),
        })),
        totalDiscountType: state.totalDiscountType,
        totalDiscountValue: Math.max(0, toNumber(state.totalDiscountValue, 0)),
        vatEnabled: state.vatEnabled,
        vatRate: Math.max(0, toNumber(state.vatRate, 0)),
      }),
    [items, state.totalDiscountType, state.totalDiscountValue, state.vatEnabled, state.vatRate],
  );

  const statusTone = useMemo(() => getStatusTone(state.status), [state.status]);

  const validationMessages = useMemo(() => {
    const messages: string[] = [];

    if (!state.title.trim()) {
      messages.push("Nazov je povinny.");
    }

    if (!state.currency.trim()) {
      messages.push("Mena je povinna.");
    }

    if (state.vatEnabled && !isFiniteNumericInput(state.vatRate)) {
      messages.push("Sadzba DPH musi byt cislo.");
    }

    if (
      state.totalDiscountType !== "none" &&
      !isFiniteNumericInput(state.totalDiscountValue)
    ) {
      messages.push("Hodnota celkovej zlavy musi byt cislo.");
    }

    if (!items.some((item) => item.name.trim().length > 0)) {
      messages.push("Pridaj aspon jednu polozku s nazvom.");
    }

    if (
      items.some(
        (item) =>
          !item.isSection &&
          (
            !isFiniteNumericInput(item.qty) ||
            !isFiniteNumericInput(item.unitPrice) ||
            !isFiniteNumericInput(item.discountPct)
          ),
      )
    ) {
      messages.push("Mnozstvo, jednotkova cena a zlava musia byt cisla.");
    }

    return messages;
  }, [items, state.currency, state.title, state.totalDiscountType, state.totalDiscountValue, state.vatEnabled, state.vatRate]);

  const payload = useMemo(() => buildPayload(state, items), [items, state]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    const controller = new AbortController();

    const timeoutId = window.setTimeout(async () => {
      setAutosaveStatus("saving");
      setAutosaveMessage("Uklada sa...");

      try {
        const response = await fetch(`/api/quotes/${quoteId}/autosave`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Automaticke ulozenie zlyhalo.");
        }

        const result = (await response.json()) as { updatedAt?: string };

        if (latestRequestIdRef.current === requestId) {
          setAutosaveStatus("saved");
          setAutosaveMessage(
            result.updatedAt
              ? `Ulozene • ${formatTime(result.updatedAt)}`
              : "Ulozene • prave teraz",
          );
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        if (latestRequestIdRef.current === requestId) {
          setAutosaveStatus("error");
          setAutosaveMessage("Automaticke ulozenie zlyhalo.");
        }
      }
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [payload, quoteId]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  };

  return (
    <div className="quote-editor-layout">
      <div className="quote-editor-main">
        <section className="ui-page-section quote-editor-hero">
          <div className="quote-editor-hero__top">
            <div className="flex items-center gap-2">
              <span className="quote-editor-quote-number">{quoteNumber}</span>
              <Badge tone={statusTone}>{formatQuoteStatus(state.status)}</Badge>
            </div>
            <span
              className={`quote-editor-autosave ${
                autosaveStatus === "error"
                  ? "text-red-700"
                  : autosaveStatus === "saved"
                    ? "text-emerald-700"
                    : "text-[var(--color-gray-500)]"
              }`}
            >
              {autosaveMessage}
            </span>
          </div>

          <label className="block text-sm text-[var(--color-gray-600)]">
            Nazov ponuky
            <input
              value={state.title}
              onChange={(event) => {
                setState((current) => ({ ...current, title: event.target.value }));
              }}
              placeholder="Nazov ponuky"
              className="quote-editor-title-input"
            />
          </label>

          <div className="quote-editor-meta-grid">
            <label className="text-sm text-[var(--color-gray-700)]">
              Klient
              <Select
                value={state.clientId}
                onChange={(event) => {
                  setState((current) => ({ ...current, clientId: event.target.value }));
                }}
                className="mt-1 text-sm"
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="text-sm text-[var(--color-gray-700)]">
              Jazyk
              <Select
                value={state.language}
                onChange={(event) => {
                  const value = event.target.value;

                  if (value === "sk" || value === "en") {
                    setState((current) => ({ ...current, language: value }));
                  }
                }}
                className="mt-1 text-sm"
              >
                <option value="sk">SK</option>
                <option value="en">EN</option>
              </Select>
            </label>

            <label className="text-sm text-[var(--color-gray-700)]">
              Mena
              <input
                value={state.currency}
                onChange={(event) => {
                  setState((current) => ({ ...current, currency: event.target.value.toUpperCase() }));
                }}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
              />
            </label>

            <label className="text-sm text-[var(--color-gray-700)]">
              Platna do
              <input
                type="date"
                value={toDateInputValue(state.validUntil)}
                onChange={(event) => {
                  const nextValue = event.target.value;

                  setState((current) => ({
                    ...current,
                    validUntil: nextValue ? `${nextValue}T00:00:00.000Z` : current.validUntil,
                  }));
                }}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-4 inline-flex items-center gap-3 text-sm text-[var(--color-gray-700)]">
            <Toggle
              checked={state.vatEnabled}
              aria-label="DPH zapnuta"
              onCheckedChange={(checked) => {
                setState((current) => ({ ...current, vatEnabled: checked }));
              }}
            />
            <span>DPH zapnuta</span>
          </div>

          {validationMessages.length > 0 ? (
            <div className="quote-editor-validation">
              <p className="font-medium">Validacia</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {validationMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="ui-page-section quote-editor-section">
          <div className="quote-editor-section-head">
            <h2 className="text-sm font-semibold text-slate-900">Intro</h2>
            <div className="quote-editor-section-actions">
              <button
                type="button"
                className="quote-editor-ghost-action"
                onClick={() => setShowIntroSnippetPicker((current) => !current)}
              >
                {showIntroSnippetPicker ? "Skryt sablony" : "Insert snippet"}
              </button>
              <button
                type="button"
                className="builder-section-toggle lg:hidden"
                onClick={() => toggleSection("intro")}
                aria-expanded={openSections.intro}
              >
                {openSections.intro ? "Skryt" : "Otvorit"}
              </button>
            </div>
          </div>

          <div className={openSections.intro ? "mt-4" : "mt-4 hidden lg:block"}>
            <textarea
              rows={6}
              value={state.introContentMarkdown}
              onChange={(event) => {
                setState((current) => ({ ...current, introContentMarkdown: event.target.value }));
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Text uvodu"
            />

            {showIntroSnippetPicker ? (
              <SnippetPicker
                title="Vyber sablony uvodu"
                snippets={snippets}
                fixedType="intro"
                fixedLanguage={state.language}
                onSelect={(snippet) => {
                  setState((current) => ({
                    ...current,
                    introContentMarkdown: snippet.contentMarkdown,
                  }));
                  setShowIntroSnippetPicker(false);
                }}
                className="mt-3"
              />
            ) : null}
          </div>
        </section>

        <section className="ui-page-section quote-editor-section">
          <div className="quote-editor-section-head">
            <h2 className="text-sm font-semibold text-slate-900">Items</h2>
            <div className="quote-editor-section-actions">
              <button
                type="button"
                className="builder-section-toggle lg:hidden"
                onClick={() => toggleSection("items")}
                aria-expanded={openSections.items}
              >
                {openSections.items ? "Skryt" : "Otvorit"}
              </button>
            </div>
          </div>

          <div className={openSections.items ? "mt-4" : "mt-4 hidden lg:block"}>
            <p className="mb-2 text-xs text-[var(--color-gray-500)]">
              Klikni na bunku pre upravu. Enter posunie kurzor o riadok nizsie, Tab na dalsiu bunku. Riadky mozes presuvat tahanim za ikonku.
            </p>

            <ItemsTable
              currency={state.currency}
              items={items}
              catalogItems={catalogItems}
              totalDiscountType={state.totalDiscountType}
              totalDiscountValue={state.totalDiscountValue}
              totals={totals}
              onItemsChange={(nextItems) => {
                setItems(nextItems);
              }}
              onTotalDiscountTypeChange={(value) => {
                setState((current) => ({ ...current, totalDiscountType: value }));
              }}
              onTotalDiscountValueChange={(value) => {
                setState((current) => ({ ...current, totalDiscountValue: value }));
              }}
            />
          </div>
        </section>

        <section className="ui-page-section quote-editor-section">
          <div className="quote-editor-section-head">
            <h2 className="text-sm font-semibold text-slate-900">Revisions</h2>
            <button
              type="button"
              className="builder-section-toggle lg:hidden"
              onClick={() => toggleSection("revisions")}
              aria-expanded={openSections.revisions}
            >
              {openSections.revisions ? "Skryt" : "Otvorit"}
            </button>
          </div>

          <div className={openSections.revisions ? "mt-4" : "mt-4 hidden lg:block"}>
            <label className="block text-sm text-slate-700">
              Pocet kol revizii v cene
              <Select
                value={String(state.revisionsIncluded)}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setState((current) => ({
                    ...current,
                    revisionsIncluded: Math.max(1, Math.min(3, nextValue)),
                  }));
                }}
                className="mt-1 w-full max-w-xs text-sm"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </Select>
            </label>
          </div>
        </section>

        <section className="ui-page-section quote-editor-section">
          <div className="quote-editor-section-head">
            <h2 className="text-sm font-semibold text-slate-900">Terms</h2>
            <div className="quote-editor-section-actions">
              <button
                type="button"
                className="quote-editor-ghost-action"
                onClick={() => setShowTermsSnippetPicker((current) => !current)}
              >
                {showTermsSnippetPicker ? "Skryt sablony" : "Insert snippet"}
              </button>
              <button
                type="button"
                className="builder-section-toggle lg:hidden"
                onClick={() => toggleSection("terms")}
                aria-expanded={openSections.terms}
              >
                {openSections.terms ? "Skryt" : "Otvorit"}
              </button>
            </div>
          </div>

          <div className={openSections.terms ? "mt-4" : "mt-4 hidden lg:block"}>
            <textarea
              rows={6}
              value={state.termsContentMarkdown}
              onChange={(event) => {
                setState((current) => ({ ...current, termsContentMarkdown: event.target.value }));
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Podmienky"
            />

            {showTermsSnippetPicker ? (
              <SnippetPicker
                title="Vyber sablony podmienok"
                snippets={snippets}
                fixedType="terms"
                fixedLanguage={state.language}
                onSelect={(snippet) => {
                  setState((current) => ({
                    ...current,
                    termsContentMarkdown: snippet.contentMarkdown,
                  }));
                  setShowTermsSnippetPicker(false);
                }}
                className="mt-3"
              />
            ) : null}
          </div>
        </section>
      </div>

      <aside className="quote-editor-sidebar">
        <section className="ui-page-section quote-summary-panel">
          <h2 className="text-sm font-semibold text-slate-900">Summary & Export</h2>
          <p className="mt-2 text-sm text-slate-600">
            Minimalny ovladaci panel pre stav, sumy a export PDF.
          </p>

          <label className="mt-4 block text-sm text-slate-700">
            Stav ponuky
            <Select
              value={state.status}
              onChange={(event) => {
                const value = event.target.value;

                if (isQuoteStatus(value)) {
                  setState((current) => ({ ...current, status: value as QuoteStatus }));
                }
              }}
              className="mt-1 text-sm"
            >
              {QUOTE_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {formatQuoteStatus(status)}
                </option>
              ))}
            </Select>
          </label>

          <dl className="quote-summary-totals mt-4">
            <div>
              <dt>Medzisucet</dt>
              <dd>{formatCurrency(totals.subtotal, state.currency)}</dd>
            </div>
            <div>
              <dt>Zlava</dt>
              <dd>-{formatCurrency(totals.totalDiscount, state.currency)}</dd>
            </div>
            <div>
              <dt>DPH</dt>
              <dd>{formatCurrency(totals.vatAmount, state.currency)}</dd>
            </div>
            <div className="quote-summary-totals__grand">
              <dt>Spolu</dt>
              <dd>{formatCurrency(totals.grandTotal, state.currency)}</dd>
            </div>
          </dl>

          <a
            href={`/api/quotes/${quoteId}/download`}
            className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Export PDF
          </a>

          <details className="quote-editor-more mt-4">
            <summary>More</summary>
            <form action={duplicateQuoteAction} className="mt-3">
              <input type="hidden" name="quote_id" value={quoteId} />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Duplikovat ponuku
              </button>
            </form>
          </details>
        </section>
      </aside>
    </div>
  );
}
