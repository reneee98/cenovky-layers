"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { Fragment, useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveInvoiceAction, type InvoiceFormActionState } from "@/app/invoices/actions";

type ClientOption = {
  id: string;
  name: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  defaultCurrency: string | null;
  defaultDueDays: number | null;
  defaultPaymentMethod: string | null;
  taxRegimeDefault: string | null;
  vatPayer: boolean;
  invoiceReady?: boolean;
};

type QuoteOption = {
  id: string;
  number: string;
  title: string;
};

type InvoiceItemRow = {
  id: string;
  name: string;
  description: string;
  unit: "h" | "day" | "pcs" | "pkg";
  qty: string;
  unitPrice: string;
  discountPct: string;
  vatRate: string;
};

type QuotePreset = {
  quoteId: string;
  quoteNumber: string;
  remainingToInvoice: number;
  currency: string;
  vatRate: number;
  fullItems: InvoiceItemRow[];
};

type InvoiceFormInitialValues = {
  id?: string;
  quoteId: string | null;
  clientId: string;
  invoiceNumber: string;
  variableSymbol: string;
  issueDate: string;
  taxableSupplyDate: string;
  dueDate: string;
  paymentMethod: string;
  currency: string;
  vatEnabled: boolean;
  vatRate: string;
  taxRegime: string;
  invoiceKind: "full" | "partial" | "advance";
  status: "draft" | "sent" | "cancelled";
  legalNote: string;
  note: string;
  items: InvoiceItemRow[];
};

type InvoiceFormProps = {
  mode: "create" | "edit";
  initialValues: InvoiceFormInitialValues;
  clients: ClientOption[];
  quotes: QuoteOption[];
  quotePreset?: QuotePreset | null;
};

function createItemId(): string {
  return Math.random().toString(36).slice(2, 12);
}

function createEmptyItem(vatRate = "20"): InvoiceItemRow {
  return {
    id: createItemId(),
    name: "",
    description: "",
    unit: "pcs",
    qty: "1",
    unitPrice: "0",
    discountPct: "0",
    vatRate,
  };
}

function SaveButton({ mode, disabled }: { mode: "create" | "edit"; disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending || disabled}
    >
      {pending ? "Ukladam..." : mode === "create" ? "Vytvorit fakturu" : "Ulozit fakturu"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function formatMoneyInput(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function buildPartialRows(
  kind: "partial" | "advance",
  quotePreset: QuotePreset,
  amount: number,
): InvoiceItemRow[] {
  const title =
    kind === "advance"
      ? `Zalohova faktura k ponuke ${quotePreset.quoteNumber}`
      : `Ciastocna faktura k ponuke ${quotePreset.quoteNumber}`;

  return [
    {
      id: createItemId(),
      name: title,
      description: "",
      unit: "pcs",
      qty: "1",
      unitPrice: formatMoneyInput(amount),
      discountPct: "0",
      vatRate: String(quotePreset.vatRate),
    },
  ];
}

export function InvoiceForm({
  mode,
  initialValues,
  clients,
  quotes,
  quotePreset,
}: InvoiceFormProps) {
  const initialActionState: InvoiceFormActionState = { status: "idle" };
  const [state, action] = useActionState(saveInvoiceAction, initialActionState);

  const [items, setItems] = useState<InvoiceItemRow[]>(
    initialValues.items.length > 0 ? initialValues.items : [createEmptyItem(initialValues.vatRate)],
  );
  const [invoiceKind, setInvoiceKind] = useState(initialValues.invoiceKind);
  const [partialAmount, setPartialAmount] = useState(
    quotePreset ? String(quotePreset.remainingToInvoice.toFixed(2)) : "0",
  );
  const [currency, setCurrency] = useState(initialValues.currency);
  const [dueDate, setDueDate] = useState(initialValues.dueDate);
  const [selectedClientId, setSelectedClientId] = useState(initialValues.clientId);
  const [expandedDescriptionById, setExpandedDescriptionById] = useState<Record<string, boolean>>(
    {},
  );

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );
  const selectedClientNotReady = selectedClient && selectedClient.invoiceReady === false;

  const itemsJson = useMemo(() => JSON.stringify(items), [items]);

  const applyKind = (nextKind: "full" | "partial" | "advance") => {
    setInvoiceKind(nextKind);

    if (!quotePreset) {
      return;
    }

    if (nextKind === "full") {
      setItems(quotePreset.fullItems.map((item) => ({ ...item, id: createItemId() })));
      setCurrency(quotePreset.currency);
      return;
    }

    const amount = Number(partialAmount.replace(",", "."));
    const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : quotePreset.remainingToInvoice;
    setItems(buildPartialRows(nextKind, quotePreset, safeAmount));
    setCurrency(quotePreset.currency);
  };

  const updateItem = (id: string, key: keyof InvoiceItemRow, value: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  };

  const isDescriptionExpanded = (item: InvoiceItemRow): boolean =>
    expandedDescriptionById[item.id] ?? item.description.trim().length > 0;

  const toggleDescription = (item: InvoiceItemRow) => {
    const current = isDescriptionExpanded(item);
    setExpandedDescriptionById((previous) => ({
      ...previous,
      [item.id]: !current,
    }));
  };

  const removeItem = (id: string) => {
    setItems((current) =>
      current.length > 1 ? current.filter((row) => row.id !== id) : current,
    );
    setExpandedDescriptionById((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  };

  return (
    <form action={action} className="ui-page-section space-y-6">
      {initialValues.id ? <input type="hidden" name="invoice_id" value={initialValues.id} /> : null}
      <input type="hidden" name="items_json" value={itemsJson} />
      <input type="hidden" name="invoice_kind" value={invoiceKind} />

      {selectedClientNotReady && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="alert">
          Vybrany klient nema kompletne fakturacne udaje. Doplnte nazov firmy alebo meno a priezvisko a fakturacnu adresu v{" "}
          <Link href={`/clients/${selectedClientId}/edit`} className="font-medium underline">
            karte klienta
          </Link>
          , aby bolo mozne vytvorit fakturu.
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Zaklad faktury</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <label className="text-sm text-slate-700">
            Prepojena ponuka (volitelne)
            <select
              name="quote_id"
              defaultValue={initialValues.quoteId ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Bez prepojenia</option>
              {quotes.map((quote) => (
                <option key={quote.id} value={quote.id}>{`${quote.number} - ${quote.title}`}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Klient
            <select
              name="client_id"
              required
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName ??
                    (`${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || client.name)}
                  {client.invoiceReady === false ? " (nekompletne udaje)" : ""}
                </option>
              ))}
            </select>
            <FieldError message={state.fieldErrors?.client_id} />
            <p className="mt-1 text-xs text-slate-500">
              Chyba klient? <Link href="/clients/new" className="underline">Vytvorit noveho klienta</Link>
            </p>
          </label>

          <label className="text-sm text-slate-700">
            Typ faktury
            <select
              value={invoiceKind}
              onChange={(event) => applyKind(event.target.value as "full" | "partial" | "advance")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="full">Plna</option>
              <option value="partial">Ciastocna</option>
              <option value="advance">Zalohova</option>
            </select>
          </label>

          {quotePreset && invoiceKind !== "full" ? (
            <label className="text-sm text-slate-700 md:col-span-3">
              Ciastka pre {invoiceKind === "advance" ? "zalohovu" : "ciastocnu"} fakturu
              <input
                type="number"
                min={0}
                max={quotePreset.remainingToInvoice}
                step="0.01"
                value={partialAmount}
                onChange={(event) => {
                  const value = event.target.value;
                  setPartialAmount(value);
                  const amount = Number(value.replace(",", "."));
                  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
                  setItems(buildPartialRows(invoiceKind as "partial" | "advance", quotePreset, safeAmount));
                }}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                Zostava na fakturaciu: {quotePreset.remainingToInvoice.toFixed(2)} {quotePreset.currency}
              </p>
            </label>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Meta udaje</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <label className="text-sm text-slate-700">
            Cislo faktury
            <input
              name="invoice_number"
              required
              defaultValue={initialValues.invoiceNumber}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.invoice_number} />
          </label>

          <label className="text-sm text-slate-700">
            Variabilny symbol
            <input
              name="variable_symbol"
              defaultValue={initialValues.variableSymbol}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            Stav
            <select
              name="status"
              defaultValue={initialValues.status}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="draft">Koncept</option>
              <option value="sent">Odoslana</option>
              <option value="cancelled">Stornovana</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Datum vystavenia
            <input
              name="issue_date"
              type="date"
              required
              defaultValue={initialValues.issueDate}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.issue_date} />
          </label>

          <label className="text-sm text-slate-700">
            Datum dodania
            <input
              name="taxable_supply_date"
              type="date"
              required
              defaultValue={initialValues.taxableSupplyDate}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.taxable_supply_date} />
          </label>

          <label className="text-sm text-slate-700">
            Datum splatnosti
            <input
              name="due_date"
              type="date"
              required
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.due_date} />
          </label>

          <label className="text-sm text-slate-700">
            Metoda platby
            <input
              name="payment_method"
              required
              defaultValue={selectedClient?.defaultPaymentMethod ?? initialValues.paymentMethod}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.payment_method} />
          </label>

          <label className="text-sm text-slate-700">
            Mena
            <input
              name="currency"
              required
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
            />
            <FieldError message={state.fieldErrors?.currency} />
          </label>

          <label className="text-sm text-slate-700">
            Sadzba DPH (%)
            <input
              name="vat_rate"
              required
              defaultValue={initialValues.vatRate}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.vat_rate} />
          </label>

          <label className="text-sm text-slate-700 md:col-span-3">
            Danovy rezim (volitelne)
            <input
              name="tax_regime"
              defaultValue={selectedClient?.taxRegimeDefault ?? initialValues.taxRegime}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700 md:col-span-3">
            <input
              type="checkbox"
              name="vat_enabled"
              defaultChecked={initialValues.vatEnabled}
              className="h-4 w-4 rounded border-slate-300"
            />
            DPH zapnuta
          </label>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Polozky faktury</h2>
          <button
            type="button"
            onClick={() => setItems((current) => [...current, createEmptyItem(initialValues.vatRate)])}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Pridat polozku
          </button>
        </div>

        <FieldError message={state.fieldErrors?.items} />

        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-[920px] w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Nazov</th>
                <th className="px-3 py-2 text-left">Jedn.</th>
                <th className="px-3 py-2 text-left">Mnozstvo</th>
                <th className="px-3 py-2 text-left">Cena/j.</th>
                <th className="px-3 py-2 text-left">Zlava %</th>
                <th className="px-3 py-2 text-left">DPH %</th>
                <th className="px-3 py-2 text-left">Akcia</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const descriptionExpanded = isDescriptionExpanded(item);

                return (
                  <Fragment key={item.id}>
                    <tr className="border-t border-slate-200">
                      <td className="px-2 py-2">
                        <input
                          value={item.name}
                          onChange={(event) => updateItem(item.id, "name", event.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={item.unit}
                          onChange={(event) => updateItem(item.id, "unit", event.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        >
                          <option value="h">h</option>
                          <option value="day">day</option>
                          <option value="pcs">pcs</option>
                          <option value="pkg">pkg</option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.qty}
                          onChange={(event) => updateItem(item.id, "qty", event.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(event) => updateItem(item.id, "unitPrice", event.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.discountPct}
                          onChange={(event) => updateItem(item.id, "discountPct", event.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.vatRate}
                          onChange={(event) => updateItem(item.id, "vatRate", event.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                            onClick={() => toggleDescription(item)}
                            aria-label={descriptionExpanded ? "Skryt popis" : "Upravit popis"}
                            title={descriptionExpanded ? "Skryt popis" : "Upravit popis"}
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                            onClick={() => removeItem(item.id)}
                          >
                            Odstranit
                          </button>
                        </div>
                      </td>
                    </tr>
                    {descriptionExpanded ? (
                      <tr className="border-t border-slate-100 bg-slate-50/70">
                        <td colSpan={7} className="px-3 py-2">
                          <textarea
                            value={item.description}
                            onChange={(event) => updateItem(item.id, "description", event.target.value)}
                            rows={4}
                            placeholder="Popis polozky. Riadky zacinajuce '-' sa v PDF vykreslia ako odrazky."
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            Tip: pouzi format napr. <span className="font-mono">- O nas</span>, <span className="font-mono">- Kontakt</span>.
                          </p>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Poznamky</h2>
        <div className="mt-3 grid gap-4">
          <label className="text-sm text-slate-700">
            Pravna poznamka (volitelne)
            <textarea
              name="legal_note"
              rows={3}
              defaultValue={initialValues.legalNote}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-slate-700">
            Interna poznamka (volitelne)
            <textarea
              name="note"
              rows={3}
              defaultValue={initialValues.note}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {state.status === "error" && state.message ? (
            <p className="text-sm text-red-700">{state.message}</p>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            href={mode === "create" ? "/invoices" : `/invoices/${initialValues.id}`}
            className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:w-auto"
          >
            Zrusit
          </Link>
          <SaveButton mode={mode} disabled={selectedClientNotReady === true} />
        </div>
      </div>
    </form>
  );
}
