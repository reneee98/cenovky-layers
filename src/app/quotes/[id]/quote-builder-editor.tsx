"use client";

import type { Language, QuoteStatus, TotalDiscountType } from "@/types/domain";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronUp, FileDown } from "lucide-react";
import { toast } from "sonner";

import { AutosaveIndicator, type AutosaveState } from "@/components/quote/autosave-indicator";
import type { CatalogPickerItem } from "@/components/quote/catalog-picker-dialog";
import { QuoteExportPdfButton } from "@/components/quote/export-pdf-button";
import { ItemsTable, type QuoteItemRow, createEmptyItemRow } from "@/components/quote/items-table";
import { MICROCOPY } from "@/components/quote/microcopy";
import { QuoteHeaderBar } from "@/components/quote/quote-header-bar";
import type { SnippetPickerItem } from "@/components/quote/snippet-picker";
import { SnippetPicker } from "@/components/quote/snippet-picker";
import { StatusDropdown } from "@/components/quote/status-dropdown";
import { SummaryExportPanel } from "@/components/quote/summary-export-panel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui/shadcn";
import { formatCurrency, formatTime } from "@/lib/format";
import { QUOTE_ITEM_SECTION_MARKER } from "@/lib/quotes/items";
import { calculateQuoteTotals } from "@/lib/quotes/totals";
import { QUOTE_STATUS_OPTIONS } from "@/lib/quotes/status";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/shadcn/button";

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
  showClientDetailsInPdf: boolean;
  showCompanyDetailsInPdf: boolean;
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
  initialItems: QuoteItemRow[];
  clients: ClientOption[];
  catalogItems: CatalogPickerItem[];
  snippets: SnippetPickerItem[];
  duplicateQuoteAction: (formData: FormData) => void | Promise<void>;
};

function toDateInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function toNumber(value: string, fallback = 0): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildPayload(state: QuoteBuilderState, items: QuoteItemRow[]) {
  const validUntilIso = new Date(`${state.validUntil}T00:00:00.000Z`).toISOString();

  return {
    title: state.title,
    clientId: state.clientId,
    language: state.language,
    currency: state.currency.trim().toUpperCase(),
    validUntil: validUntilIso,
    vatEnabled: state.vatEnabled,
    showClientDetailsInPdf: Boolean(state.showClientDetailsInPdf),
    showCompanyDetailsInPdf: Boolean(state.showCompanyDetailsInPdf),
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
  const [isPendingDuplicate, startDuplicateTransition] = useTransition();
  const [state, setState] = useState<QuoteBuilderState>({
    ...initialState,
    validUntil: toDateInputValue(initialState.validUntil),
  });
  const [items, setItems] = useState<QuoteItemRow[]>(
    initialItems.length > 0 ? initialItems : [createEmptyItemRow()],
  );
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const [autosaveMessage, setAutosaveMessage] = useState(
    MICROCOPY[initialState.language].autosave.savedNow,
  );
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  const hasMountedRef = useRef(false);
  const latestRequestIdRef = useRef(0);

  const copy = MICROCOPY[state.language];
  const locale = state.language === "sk" ? "sk-SK" : "en-GB";

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

  const payload = useMemo(() => buildPayload(state, items), [items, state]);

  const statusOptions = useMemo(
    () =>
      QUOTE_STATUS_OPTIONS.map((status) => ({
        value: status,
        label: copy.statuses[status],
      })),
    [copy.statuses],
  );

  const persist = useCallback(
    async (source: "auto" | "manual"): Promise<boolean> => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;
      setAutosaveState("saving");
      setAutosaveMessage(copy.autosave.saving);

      try {
        const response = await fetch(`/api/quotes/${quoteId}/autosave`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Autosave failed.");
        }

        const result = (await response.json()) as { updatedAt?: string };
        if (latestRequestIdRef.current !== requestId) {
          return false;
        }

        setAutosaveState("saved");
        setAutosaveMessage(
          result.updatedAt
            ? `${copy.autosave.savedNow.split("•")[0].trim()} • ${formatTime(result.updatedAt, locale)}`
            : copy.autosave.savedNow,
        );

        if (source === "manual") {
          toast.success(copy.autosave.savedNow);
        }

        return true;
      } catch {
        if (latestRequestIdRef.current !== requestId) {
          return false;
        }
        setAutosaveState("error");
        setAutosaveMessage(copy.autosave.error);
        if (source === "manual") {
          toast.error(copy.autosave.error);
        }

        return false;
      }
    },
    [copy.autosave.error, copy.autosave.savedNow, copy.autosave.saving, locale, payload, quoteId],
  );

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persist("auto");
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [payload, persist]);

  const triggerDuplicate = () => {
    if (!window.confirm(copy.confirmations.duplicate)) {
      return;
    }

    const formData = new FormData();
    formData.set("quote_id", quoteId);
    startDuplicateTransition(() => {
      void duplicateQuoteAction(formData);
    });
  };

  const introSection = (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{copy.labels.intro}</CardTitle>
          <SnippetPicker
            snippets={snippets}
            type="intro"
            language={state.language}
            triggerLabel={copy.actions.insertSnippet}
            emptyLabel={copy.labels.noSnippets}
            searchPlaceholder={copy.labels.searchSnippetsPlaceholder}
            onSelect={(snippet) =>
              setState((current) => ({ ...current, introContentMarkdown: snippet.contentMarkdown }))
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          rows={6}
          value={state.introContentMarkdown}
          onChange={(event) =>
            setState((current) => ({ ...current, introContentMarkdown: event.target.value }))
          }
          placeholder={copy.labels.intro}
        />
      </CardContent>
    </Card>
  );

  const itemsSection = (
    <ItemsTable
      currency={state.currency}
      locale={locale}
      items={items}
      catalogItems={catalogItems}
      totalDiscountType={state.totalDiscountType}
      totalDiscountValue={state.totalDiscountValue}
      totals={totals}
      labels={{
        heading: copy.labels.items,
        addItem: copy.actions.addItem,
        addSection: copy.actions.addSection,
        addFromCatalog: copy.actions.addFromCatalog,
        addAndAnother: copy.actions.addAndAnother,
        noItemsTitle: copy.empty.noItemsTitle,
        noItemsDescription: copy.empty.noItemsDescription,
        totalDiscountPct: copy.labels.totalDiscountPct,
        totalDiscountAmount: copy.labels.totalDiscountAmount,
        discount: copy.labels.discount,
        name: copy.labels.name,
        unit: copy.labels.unit,
        qty: copy.labels.qty,
        unitPrice: copy.labels.unitPrice,
        lineTotal: copy.labels.lineTotal,
        section: copy.labels.section,
        item: copy.labels.item,
        sectionTitle: copy.labels.sectionTitle,
        itemName: copy.labels.itemName,
        sectionHint: copy.labels.sectionHint,
        noTotalDiscount: copy.labels.noTotalDiscount,
        subtotal: copy.labels.subtotal,
        vat: copy.labels.vat,
        grandTotal: copy.labels.grandTotal,
        searchCatalogPlaceholder: copy.labels.searchCatalogPlaceholder,
        catalogDescription: copy.labels.catalogDescription,
        allCategories: copy.labels.allCategories,
        noCatalogItems: copy.labels.noCatalogItems,
        category: copy.labels.category,
        deleteRow: copy.labels.deleteRow,
        dragRow: copy.labels.dragRow,
        editDescription: copy.labels.editDescription,
        hideDescription: copy.labels.hideDescription,
        descriptionPlaceholder: copy.labels.descriptionPlaceholder,
        descriptionHint: copy.labels.descriptionHint,
      }}
      onItemsChange={setItems}
      onTotalDiscountTypeChange={(value) =>
        setState((current) => ({ ...current, totalDiscountType: value }))
      }
      onTotalDiscountValueChange={(value) =>
        setState((current) => ({ ...current, totalDiscountValue: value }))
      }
    />
  );

  const revisionsSection = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{copy.labels.revisions}</CardTitle>
      </CardHeader>
      <CardContent>
        <Select
          value={String(state.revisionsIncluded)}
          onValueChange={(value) =>
            setState((current) => ({
              ...current,
              revisionsIncluded: Math.max(1, Math.min(3, Number(value))),
            }))
          }
        >
          <SelectTrigger className="max-w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );

  const termsSection = (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{copy.labels.terms}</CardTitle>
          <SnippetPicker
            snippets={snippets}
            type="terms"
            language={state.language}
            triggerLabel={copy.actions.insertSnippet}
            emptyLabel={copy.labels.noSnippets}
            searchPlaceholder={copy.labels.searchSnippetsPlaceholder}
            onSelect={(snippet) =>
              setState((current) => ({ ...current, termsContentMarkdown: snippet.contentMarkdown }))
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          rows={6}
          value={state.termsContentMarkdown}
          onChange={(event) =>
            setState((current) => ({ ...current, termsContentMarkdown: event.target.value }))
          }
          placeholder={copy.labels.terms}
        />
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen pb-28 lg:pb-10">
      <QuoteHeaderBar
        quoteNumber={quoteNumber}
        title={state.title}
        clientId={state.clientId}
        clients={clients}
        language={state.language}
        currency={state.currency}
        validUntil={state.validUntil}
        vatEnabled={state.vatEnabled}
        vatRate={state.vatRate}
        showClientDetailsInPdf={state.showClientDetailsInPdf}
        showCompanyDetailsInPdf={state.showCompanyDetailsInPdf}
        labels={{
          title: copy.labels.title,
          client: copy.labels.client,
          language: copy.labels.language,
          currency: copy.labels.currency,
          validUntil: copy.labels.validUntil,
          showClientInPdf: copy.labels.showClientInPdf,
          showCompanyInPdf: copy.labels.showCompanyInPdf,
          vatOn: copy.labels.vatOn,
          vatOff: copy.labels.vatOff,
          vatRate: copy.labels.vatRate,
        }}
        autosave={{
          state: autosaveState,
          message: autosaveMessage,
        }}
        onTitleChange={(value) => setState((current) => ({ ...current, title: value }))}
        onClientChange={(value) => setState((current) => ({ ...current, clientId: value }))}
        onLanguageChange={(value) => setState((current) => ({ ...current, language: value }))}
        onCurrencyChange={(value) => setState((current) => ({ ...current, currency: value }))}
        onValidUntilChange={(value) => setState((current) => ({ ...current, validUntil: value }))}
        onVatEnabledChange={(value) => setState((current) => ({ ...current, vatEnabled: value }))}
        onVatRateChange={(value) => setState((current) => ({ ...current, vatRate: value }))}
        onShowClientDetailsInPdfChange={(value) =>
          setState((current) => ({ ...current, showClientDetailsInPdf: value }))
        }
        onShowCompanyDetailsInPdfChange={(value) =>
          setState((current) => ({ ...current, showCompanyDetailsInPdf: value }))
        }
        onDuplicate={triggerDuplicate}
        duplicateLabel={copy.actions.duplicate}
        duplicatePending={isPendingDuplicate}
      />

      <div className="w-full py-4 md:py-6">
        <div className="mb-4 hidden md:block lg:hidden">
          <SummaryExportPanel
            quoteId={quoteId}
            quoteNumber={quoteNumber}
            language={state.language}
            currency={state.currency}
            total={{
              subtotal: totals.subtotal,
              discount: totals.totalDiscount,
              vat: totals.vatAmount,
              grandTotal: totals.grandTotal,
              vatEnabled: state.vatEnabled,
              vatRate: state.vatRate,
            }}
            labels={{
              heading: copy.labels.summary,
              status: copy.labels.status,
              exportPdf: copy.actions.exportPdf,
              save: copy.actions.save,
              vatOn: copy.labels.vatOn,
              vatOff: copy.labels.vatOff,
              subtotal: copy.labels.subtotal,
              discount: copy.labels.discount,
              vat: copy.labels.vat,
              grandTotal: copy.labels.grandTotal,
            }}
            status={state.status}
            statusLabel={copy.statuses[state.status]}
            statuses={statusOptions}
            onStatusChange={(value) =>
              setState((current) => ({ ...current, status: value as QuoteStatus }))
            }
            onSaveNow={() => {
              void persist("manual");
            }}
            onBeforeExport={() => persist("auto")}
            exportErrorMessage={copy.autosave.error}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <div className="hidden gap-5 md:grid">
              {introSection}
              {itemsSection}
              {revisionsSection}
              {termsSection}
            </div>

            <Accordion
              type="multiple"
              defaultValue={["intro", "items", "revisions", "terms"]}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white md:hidden"
            >
              <AccordionItem value="intro">
                <AccordionTrigger className="px-4">{copy.labels.intro}</AccordionTrigger>
                <AccordionContent className="px-4 pb-4">{introSection}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="items">
                <AccordionTrigger className="px-4">{copy.labels.items}</AccordionTrigger>
                <AccordionContent className="px-4 pb-4">{itemsSection}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="revisions">
                <AccordionTrigger className="px-4">{copy.labels.revisions}</AccordionTrigger>
                <AccordionContent className="px-4 pb-4">{revisionsSection}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="terms">
                <AccordionTrigger className="px-4">{copy.labels.terms}</AccordionTrigger>
                <AccordionContent className="px-4 pb-4">{termsSection}</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <aside className="hidden lg:block lg:pl-1">
            <div className="sticky top-[170px]">
              <SummaryExportPanel
                quoteId={quoteId}
                quoteNumber={quoteNumber}
                language={state.language}
                currency={state.currency}
                total={{
                  subtotal: totals.subtotal,
                  discount: totals.totalDiscount,
                  vat: totals.vatAmount,
                  grandTotal: totals.grandTotal,
                  vatEnabled: state.vatEnabled,
                  vatRate: state.vatRate,
                }}
                labels={{
                  heading: copy.labels.summary,
                  status: copy.labels.status,
                  exportPdf: copy.actions.exportPdf,
                  save: copy.actions.save,
                  vatOn: copy.labels.vatOn,
                  vatOff: copy.labels.vatOff,
                  subtotal: copy.labels.subtotal,
                  discount: copy.labels.discount,
                  vat: copy.labels.vat,
                  grandTotal: copy.labels.grandTotal,
                }}
                status={state.status}
                statusLabel={copy.statuses[state.status]}
                statuses={statusOptions}
                onStatusChange={(value) =>
                  setState((current) => ({ ...current, status: value as QuoteStatus }))
                }
                onSaveNow={() => {
                  void persist("manual");
                }}
                onBeforeExport={() => persist("auto")}
                exportErrorMessage={copy.autosave.error}
              />
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="flex w-full items-center gap-2">
          <Collapsible open={mobileSummaryOpen} onOpenChange={setMobileSummaryOpen} className="w-full">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{copy.labels.summary}</p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {formatCurrency(totals.grandTotal, state.currency, locale)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void persist("manual");
                  }}
                >
                  {copy.actions.save}
                </Button>
                <QuoteExportPdfButton
                  quoteId={quoteId}
                  label={copy.actions.exportPdf}
                  fallbackFileName={quoteNumber}
                  beforeDownload={() => persist("auto")}
                  beforeDownloadErrorMessage={copy.autosave.error}
                  className={cn(buttonVariants({ variant: "accent", size: "sm" }))}
                >
                  <FileDown className="mr-1.5 h-4 w-4" />
                  {copy.actions.exportPdf}
                </QuoteExportPdfButton>
                <CollapsibleTrigger asChild>
                  <Button size="icon" variant="secondary" className="h-9 w-9">
                    <ChevronUp
                      className={`h-4 w-4 transition-transform duration-200 ${
                        mobileSummaryOpen ? "" : "rotate-180"
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent className="mt-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <AutosaveIndicator state={autosaveState} message={autosaveMessage} />
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{copy.labels.subtotal}</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(totals.subtotal, state.currency, locale)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{copy.labels.discount}</span>
                    <span className="font-medium text-slate-900">
                      -{formatCurrency(totals.totalDiscount, state.currency, locale)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{copy.labels.vat}</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(totals.vatAmount, state.currency, locale)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="font-semibold text-slate-900">{copy.labels.grandTotal}</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(totals.grandTotal, state.currency, locale)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500">{copy.labels.status}</span>
                    <StatusDropdown
                      status={state.status}
                      statusLabel={copy.statuses[state.status]}
                      options={statusOptions}
                      onChange={(value) =>
                        setState((current) => ({ ...current, status: value as QuoteStatus }))
                      }
                    />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
