"use server";

import type { InvoiceKind, InvoiceStatus, Unit } from "@/types/domain";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { requireUserId } from "@/lib/auth";
import { isInvoiceStatus } from "@/lib/invoices/status";
import { isDbKnownRequestError } from "@/lib/db-errors";
import {
  addPaymentToInvoice,
  createInvoiceWithItems,
  deleteInvoiceWithSync,
  deletePaymentFromInvoice,
  refreshOverdueInvoices,
  setInvoiceManualStatus,
  updateInvoiceWithItems,
} from "@/server/invoices/service";

const VALID_UNITS: Unit[] = ["h", "day", "pcs", "pkg"];
const VALID_INVOICE_KINDS: InvoiceKind[] = ["full", "partial", "advance"];

type InvoiceFormFieldErrors = Partial<
  Record<
    | "client_id"
    | "invoice_number"
    | "issue_date"
    | "taxable_supply_date"
    | "due_date"
    | "payment_method"
    | "currency"
    | "vat_rate"
    | "items",
    string
  >
>;

export type InvoiceFormActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: InvoiceFormFieldErrors;
};

type RawInvoiceItemPayload = {
  name?: string;
  description?: string | null;
  unit?: string;
  qty?: number | string;
  unitPrice?: number | string;
  discountPct?: number | string;
  vatRate?: number | string;
};

function parseNumber(value: string | null, fallback = 0): number {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readRequiredString(
  formData: FormData,
  field: keyof InvoiceFormFieldErrors,
  errors: InvoiceFormFieldErrors,
): string {
  const raw = formData.get(field);
  const value = typeof raw === "string" ? raw.trim() : "";

  if (!value) {
    errors[field] = "Toto pole je povinne.";
  }

  return value;
}

function readOptionalString(formData: FormData, field: string): string | null {
  const raw = formData.get(field);
  const value = typeof raw === "string" ? raw.trim() : "";
  return value.length > 0 ? value : null;
}

function parseRequiredDate(
  formData: FormData,
  field: "issue_date" | "taxable_supply_date" | "due_date",
  errors: InvoiceFormFieldErrors,
): Date | null {
  const raw = formData.get(field);
  const value = typeof raw === "string" ? raw : "";
  const date = new Date(`${value}T00:00:00.000Z`);

  if (!value || Number.isNaN(date.getTime())) {
    errors[field] = "Zadajte platny datum.";
    return null;
  }

  return date;
}

function parseItems(formData: FormData, errors: InvoiceFormFieldErrors) {
  const raw = formData.get("items_json");
  const serialized = typeof raw === "string" ? raw : "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    errors.items = "Polozky maju neplatny format.";
    return [];
  }

  if (!Array.isArray(parsed)) {
    errors.items = "Polozky maju neplatny format.";
    return [];
  }

  const items = parsed
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const item = entry as RawInvoiceItemPayload;
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const unit = typeof item.unit === "string" ? item.unit : "pcs";
      if (!name || !VALID_UNITS.includes(unit as Unit)) {
        return null;
      }

      const qty = Math.max(0, Number(item.qty));
      const unitPrice = Math.max(0, Number(item.unitPrice));
      const discountPct = Math.max(0, Number(item.discountPct));
      const vatRate = Math.max(0, Number(item.vatRate));

      if (!Number.isFinite(qty) || !Number.isFinite(unitPrice) || qty <= 0) {
        return null;
      }

      return {
        name,
        description: typeof item.description === "string" ? item.description.trim() || null : null,
        unit: unit as Unit,
        qty,
        unitPrice,
        discountPct: Number.isFinite(discountPct) ? discountPct : 0,
        vatRate: Number.isFinite(vatRate) ? vatRate : 0,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (items.length === 0) {
    errors.items = "Faktura musi obsahovat aspon jednu polozku.";
  }

  return items;
}

function mapInvoiceErrorToMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  switch (message) {
    case "CLIENT_NOT_FOUND":
      return "Vybrany klient nebol najdeny.";
    case "QUOTE_NOT_FOUND":
      return "Vybrana ponuka nebola najdena.";
    case "CLIENT_BILLING_IDENTITY_REQUIRED":
      return "Klient nema vyplnenu fakturacnu identitu (firma alebo meno).";
    case "DUE_DATE_BEFORE_ISSUE_DATE":
      return "Datum splatnosti nemoze byt skor ako datum vystavenia.";
    case "INVOICE_ITEMS_REQUIRED":
      return "Faktura musi obsahovat aspon jednu polozku.";
    case "INVOICE_NUMBER_REQUIRED":
      return "Cislo faktury je povinne.";
    case "QUOTE_REMAINING_EXCEEDED":
      return "Ciastka faktury presahuje zostavajucu sumu na fakturaciu ponuky.";
    case "PAYMENT_EXCEEDS_TOTAL":
      return "Suma uhrad nemoze presiahnut celkovu sumu faktury.";
    case "QUOTE_CURRENCY_MISMATCH":
      return "Mena faktury musi byt rovnaka ako mena prepojenej ponuky.";
    case "PAYMENT_AMOUNT_REQUIRED":
      return "Suma platby musi byt vacsia ako 0.";
    case "PAYMENT_METHOD_REQUIRED":
      return "Metoda platby je povinna.";
    case "INVOICE_NOT_FOUND":
      return "Faktura nebola najdena.";
    case "PAYMENT_NOT_FOUND":
      return "Platba nebola najdena.";
    case "SETTINGS_NOT_FOUND":
    case "SETTINGS_INIT_FAILED":
      return "Chybaju firemne nastavenia. Otvorte Nastavenia a ulozte profil firmy.";
    case "CURRENCY_REQUIRED":
      return "Mena faktury je povinna.";
    case "INVALID_DATE":
      return "Niektory z datumov je neplatny.";
    case "INVALID_INVOICE_KIND":
      return "Typ faktury je neplatny.";
    default:
      return "Operaciu sa nepodarilo vykonat.";
  }
}

function buildInvoicesUrl(query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  return `/invoices?${params.toString()}`;
}

function buildInvoiceDetailUrl(invoiceId: string, query?: Record<string, string>): string {
  if (!query) {
    return `/invoices/${invoiceId}`;
  }

  const params = new URLSearchParams(query);
  return `/invoices/${invoiceId}?${params.toString()}`;
}

export async function saveInvoiceAction(
  _previousState: InvoiceFormActionState,
  formData: FormData,
): Promise<InvoiceFormActionState> {
  const userId = await requireUserId();
  const errors: InvoiceFormFieldErrors = {};

  const invoiceIdRaw = formData.get("invoice_id");
  const invoiceId = typeof invoiceIdRaw === "string" && invoiceIdRaw.trim().length > 0
    ? invoiceIdRaw.trim()
    : null;

  const quoteIdRaw = readOptionalString(formData, "quote_id");
  const clientId = readRequiredString(formData, "client_id", errors);
  const invoiceNumber = readRequiredString(formData, "invoice_number", errors);
  const variableSymbol = readOptionalString(formData, "variable_symbol");

  const issueDate = parseRequiredDate(formData, "issue_date", errors);
  const taxableSupplyDate = parseRequiredDate(formData, "taxable_supply_date", errors);
  const dueDate = parseRequiredDate(formData, "due_date", errors);

  const paymentMethod = readRequiredString(formData, "payment_method", errors);
  const currency = readRequiredString(formData, "currency", errors).toUpperCase();
  const vatEnabled = formData.get("vat_enabled") === "on";
  const vatRateRaw = readRequiredString(formData, "vat_rate", errors);
  const vatRate = Number(vatRateRaw.replace(",", "."));
  if (!Number.isFinite(vatRate) || vatRate < 0) {
    errors.vat_rate = "Sadzba DPH musi byt nezaporne cislo.";
  }
  const taxRegime = readOptionalString(formData, "tax_regime");
  const legalNote = readOptionalString(formData, "legal_note");
  const note = readOptionalString(formData, "note");

  const invoiceKindRaw = formData.get("invoice_kind");
  const invoiceKind =
    typeof invoiceKindRaw === "string" && VALID_INVOICE_KINDS.includes(invoiceKindRaw as InvoiceKind)
      ? (invoiceKindRaw as InvoiceKind)
      : "full";

  const requestedStatusRaw = formData.get("status");
  const requestedStatus =
    typeof requestedStatusRaw === "string" && isInvoiceStatus(requestedStatusRaw)
      ? (requestedStatusRaw as InvoiceStatus)
      : "draft";

  const items = parseItems(formData, errors);

  if (!issueDate || !taxableSupplyDate || !dueDate || Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Opravte vyznacene polia.",
      fieldErrors: errors,
    };
  }

  try {
    const payload = {
      quoteId: quoteIdRaw,
      clientId,
      invoiceNumber,
      variableSymbol,
      issueDate,
      taxableSupplyDate,
      dueDate,
      paymentMethod,
      currency,
      vatEnabled,
      vatRate,
      taxRegime,
      invoiceKind,
      legalNote,
      note,
      items,
      requestedStatus,
    };

    const invoice = invoiceId
      ? await updateInvoiceWithItems(userId, invoiceId, payload)
      : await createInvoiceWithItems(userId, payload);

    await refreshOverdueInvoices(userId);

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoice.id}`);
    if (payload.quoteId) {
      revalidatePath(`/quotes/${payload.quoteId}`);
    }

    redirect(
      buildInvoiceDetailUrl(invoice.id, {
        notice: invoiceId ? "Faktura bola upravena." : "Faktura bola vytvorena.",
      }),
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (isDbKnownRequestError(error, "P2002")) {
      return {
        status: "error",
        message: "Cislo faktury uz existuje pre tento ucet.",
        fieldErrors: {
          invoice_number: "Cislo faktury musi byt unikatne.",
        },
      };
    }

    if (isDbKnownRequestError(error, "P2025")) {
      return {
        status: "error",
        message: "Faktura alebo naviazane zaznamy neboli najdene.",
      };
    }

    if (isDbKnownRequestError(error, "P2003")) {
      return {
        status: "error",
        message: "Nie je mozne ulozit fakturu kvôli neplatnemu prepojeniu na klienta alebo ponuku.",
      };
    }

    return {
      status: "error",
      message: mapInvoiceErrorToMessage(error),
    };
  }
}

export async function deleteInvoiceAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();

  const invoiceIdRaw = formData.get("invoice_id");
  const invoiceId = typeof invoiceIdRaw === "string" ? invoiceIdRaw.trim() : "";
  if (!invoiceId) {
    redirect(buildInvoicesUrl({ error: "Chyba ID faktury." }));
  }

  try {
    const invoice = await deleteInvoiceWithSync(userId, invoiceId);

    revalidatePath("/invoices");
    if (invoice.quoteId) {
      revalidatePath(`/quotes/${invoice.quoteId}`);
    }
  } catch (error) {
    if (isDbKnownRequestError(error, "P2025")) {
      redirect(buildInvoicesUrl({ error: "Faktura nebola najdena." }));
    }

    throw error;
  }

  redirect(buildInvoicesUrl({ notice: "Faktura bola vymazana." }));
}

export async function changeInvoiceStatusAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();

  const invoiceIdRaw = formData.get("invoice_id");
  const statusRaw = formData.get("status");

  const invoiceId = typeof invoiceIdRaw === "string" ? invoiceIdRaw.trim() : "";
  const status = typeof statusRaw === "string" && isInvoiceStatus(statusRaw)
    ? (statusRaw as InvoiceStatus)
    : null;

  if (!invoiceId || !status) {
    redirect(buildInvoicesUrl({ error: "Neplatne udaje pre zmenu stavu faktury." }));
  }

  try {
    const updated = await setInvoiceManualStatus(userId, {
      invoiceId,
      status,
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);
    if (updated.quoteId) {
      revalidatePath(`/quotes/${updated.quoteId}`);
    }
  } catch (error) {
    redirect(buildInvoiceDetailUrl(invoiceId, { error: mapInvoiceErrorToMessage(error) }));
  }

  redirect(buildInvoiceDetailUrl(invoiceId, { notice: "Stav faktury bol aktualizovany." }));
}

export async function addPaymentAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();

  const invoiceIdRaw = formData.get("invoice_id");
  const invoiceId = typeof invoiceIdRaw === "string" ? invoiceIdRaw.trim() : "";

  if (!invoiceId) {
    redirect(buildInvoicesUrl({ error: "Chyba ID faktury." }));
  }

  const paymentDateRaw = formData.get("payment_date");
  const paymentDateValue = typeof paymentDateRaw === "string" ? paymentDateRaw : "";
  const paymentDate = new Date(`${paymentDateValue}T00:00:00.000Z`);

  const amountRaw = formData.get("amount");
  const amount = parseNumber(typeof amountRaw === "string" ? amountRaw : null, NaN);
  const methodRaw = formData.get("method");
  const method = typeof methodRaw === "string" ? methodRaw.trim() : "";
  const note = readOptionalString(formData, "note");

  if (Number.isNaN(paymentDate.getTime())) {
    redirect(buildInvoiceDetailUrl(invoiceId, { error: "Zadajte platny datum platby." }));
  }

  try {
    await addPaymentToInvoice(userId, {
      invoiceId,
      paymentDate,
      amount,
      method,
      note,
    });

    await refreshOverdueInvoices(userId);

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);
  } catch (error) {
    redirect(buildInvoiceDetailUrl(invoiceId, { error: mapInvoiceErrorToMessage(error) }));
  }

  redirect(buildInvoiceDetailUrl(invoiceId, { notice: "Platba bola pridana." }));
}

export async function deletePaymentAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();

  const paymentIdRaw = formData.get("payment_id");
  const invoiceIdRaw = formData.get("invoice_id");
  const paymentId = typeof paymentIdRaw === "string" ? paymentIdRaw.trim() : "";
  const invoiceId = typeof invoiceIdRaw === "string" ? invoiceIdRaw.trim() : "";

  if (!paymentId || !invoiceId) {
    redirect(buildInvoicesUrl({ error: "Neplatne udaje pre zmazanie platby." }));
  }

  try {
    await deletePaymentFromInvoice(userId, paymentId);

    await refreshOverdueInvoices(userId);

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);
  } catch (error) {
    redirect(buildInvoiceDetailUrl(invoiceId, { error: mapInvoiceErrorToMessage(error) }));
  }

  redirect(buildInvoiceDetailUrl(invoiceId, { notice: "Platba bola odstranena." }));
}
