"use server";

import type { InvoiceKind } from "@/types/domain";
import type { QuoteStatus as QuoteStatusEnum } from "@/types/domain";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth";
import { isDbKnownRequestError } from "@/lib/db-errors";
import { isQuoteStatus } from "@/lib/quotes/status";
import {
  createQuote,
  deleteQuote,
  duplicateQuote,
  getQuoteWithRelations,
  getSettings,
  setQuoteStatus,
} from "@/server/repositories";
import { reserveNextQuoteNumber } from "@/server/quotes/numbering";
import { createInvoiceWithItems } from "@/server/invoices/service";
import type { InvoiceItemInput } from "@/server/invoices/service";
import { getQuoteInvoicingMetrics } from "@/server/invoices/quote-metrics";
import { reserveNextInvoiceNumber, buildDefaultVariableSymbol } from "@/server/invoices/numbering";
import { roundMoney } from "@/lib/quotes/invoicing";

type QuoteStatus = QuoteStatusEnum;

function buildQuotesUrl(query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  return `/quotes?${params.toString()}`;
}

function buildQuoteBuilderUrl(quoteId: string, query?: Record<string, string>): string {
  if (!query) {
    return `/quotes/${quoteId}`;
  }

  const params = new URLSearchParams(query);

  return `/quotes/${quoteId}?${params.toString()}`;
}

async function duplicateQuoteWithNewNumber(userId: string, quoteId: string) {
  await getSettings(userId);
  const nextNumber = await reserveNextQuoteNumber(userId);
  return duplicateQuote(userId, quoteId, nextNumber);
}

export async function createDraftQuoteAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();

  const clientIdEntry = formData.get("client_id");
  const clientId =
    typeof clientIdEntry === "string" && clientIdEntry.trim().length > 0
      ? clientIdEntry.trim()
      : null;

  if (!clientId) {
    redirect("/quotes/new?error=Klient je povinny.");
  }

  const titleEntry = formData.get("title");
  const title = typeof titleEntry === "string" ? titleEntry.trim() : "";

  const settings = await getSettings(userId);
  const number = await reserveNextQuoteNumber(userId);

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 14);

  const quoteLanguage = settings.defaultLanguage;
  const quoteCurrency = settings.defaultCurrency;
  const quoteVatEnabled = true;
  const introContentMarkdown = "";
  const termsContentMarkdown = "";

  try {
    const quote = await createQuote(userId, {
      number,
      title: title || `Ponuka ${number}`,
      status: "draft",
      clientId,
      language: quoteLanguage,
      currency: quoteCurrency,
      validUntil,
      vatEnabled: quoteVatEnabled,
      vatRate: settings.vatRate,
      showClientDetailsInPdf: true,
      showCompanyDetailsInPdf: true,
      introContentMarkdown,
      termsContentMarkdown,
      revisionsIncluded: 1,
      totalDiscountType: "none",
      totalDiscountValue: 0,
    });

    revalidatePath("/quotes");
    redirect(buildQuoteBuilderUrl(quote.id, { notice: "Ponuka bola vytvorena." }));
  } catch (error) {
    if (isDbKnownRequestError(error, "P2003", "P2025")) {
      redirect("/quotes/new?error=Vybrany klient nebol najdeny.");
    }

    throw error;
  }
}

export async function changeQuoteStatusAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();

  const quoteIdEntry = formData.get("quote_id");
  const quoteId =
    typeof quoteIdEntry === "string" && quoteIdEntry.trim().length > 0
      ? quoteIdEntry.trim()
      : null;

  const statusEntry = formData.get("status");
  const status =
    typeof statusEntry === "string" && isQuoteStatus(statusEntry)
      ? (statusEntry as QuoteStatus)
      : null;

  if (!quoteId || !status) {
    redirect(buildQuotesUrl({ error: "Neplatne data pre zmenu stavu." }));
  }

  try {
    await setQuoteStatus(userId, quoteId, status);
  } catch (error) {
    if (isDbKnownRequestError(error, "P2025")) {
      redirect(buildQuotesUrl({ error: "Ponuka nebola najdena." }));
    }

    throw error;
  }

  revalidatePath("/quotes");
  revalidatePath(buildQuoteBuilderUrl(quoteId));

  redirect(buildQuotesUrl({ notice: "Stav bol aktualizovany." }));
}

export async function duplicateQuoteAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();

  const quoteIdEntry = formData.get("quote_id");
  const quoteId =
    typeof quoteIdEntry === "string" && quoteIdEntry.trim().length > 0
      ? quoteIdEntry.trim()
      : null;

  if (!quoteId) {
    redirect(buildQuotesUrl({ error: "Chyba ID ponuky." }));
  }

  try {
    await duplicateQuoteWithNewNumber(userId, quoteId);
  } catch (error) {
    if (isDbKnownRequestError(error, "P2025")) {
      redirect(buildQuotesUrl({ error: "Ponuka nebola najdena." }));
    }

    throw error;
  }

  revalidatePath("/quotes");
  redirect(buildQuotesUrl({ notice: "Ponuka bola duplikovana." }));
}

export async function duplicateQuoteToBuilderAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();

  const quoteIdEntry = formData.get("quote_id");
  const quoteId =
    typeof quoteIdEntry === "string" && quoteIdEntry.trim().length > 0
      ? quoteIdEntry.trim()
      : null;

  if (!quoteId) {
    redirect(buildQuotesUrl({ error: "Chyba ID ponuky." }));
  }

  try {
    const duplicated = await duplicateQuoteWithNewNumber(userId, quoteId);

    revalidatePath("/quotes");
    revalidatePath(buildQuoteBuilderUrl(duplicated.id));

    redirect(buildQuoteBuilderUrl(duplicated.id, { notice: "Ponuka bola duplikovana." }));
  } catch (error) {
    if (isDbKnownRequestError(error, "P2025")) {
      redirect(buildQuotesUrl({ error: "Ponuka nebola najdena." }));
    }

    throw error;
  }
}

export async function deleteQuoteAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();

  const quoteIdEntry = formData.get("quote_id");
  const quoteId =
    typeof quoteIdEntry === "string" && quoteIdEntry.trim().length > 0
      ? quoteIdEntry.trim()
      : null;

  if (!quoteId) {
    redirect(buildQuotesUrl({ error: "Chyba ID ponuky." }));
  }

  try {
    await deleteQuote(userId, quoteId);
  } catch (error) {
    if (isDbKnownRequestError(error, "P2025")) {
      redirect(buildQuotesUrl({ error: "Ponuka nebola najdena." }));
    }

    throw error;
  }

  revalidatePath("/quotes");
  redirect(buildQuotesUrl({ notice: "Ponuka bola vymazana." }));
}

const VALID_INVOICE_KINDS: InvoiceKind[] = ["full", "partial", "advance"];

function parseDateFormField(formData: FormData, field: string): Date | null {
  const raw = formData.get(field);
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function readOptionalFormString(formData: FormData, field: string): string | null {
  const raw = formData.get(field);
  const value = typeof raw === "string" ? raw.trim() : "";
  return value.length > 0 ? value : null;
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function mapInvoiceCreateErrorToMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const code = getErrorCode(error);

  switch (code) {
    case "P2025":
      return "Ponuka alebo klient neboli najdeni.";
    case "P2002":
      return "Cislo faktury uz existuje. Skuste vytvorit fakturu znovu.";
    case "P2003":
      return "Nie je mozne ulozit fakturu kvôli neplatnemu prepojeniu na klienta alebo ponuku.";
    case "42703":
    case "42P01":
      return "Databazova schema pre faktury nie je aktualna. Spustite SQL migracie a skuste to znova.";
    default:
      break;
  }

  switch (message) {
    case "CLIENT_BILLING_IDENTITY_REQUIRED":
      return "Doplnte fakturacne udaje klienta pred vytvorenim faktury.";
    case "QUOTE_REMAINING_EXCEEDED":
      return "Suma faktury presahuje zostavajucu sumu na fakturaciu.";
    case "SETTINGS_NOT_FOUND":
    case "SETTINGS_INIT_FAILED":
      return "Chybaju firemne nastavenia. Otvorte Nastavenia a ulozte profil firmy.";
    case "QUOTE_CURRENCY_MISMATCH":
      return "Mena faktury musi byt rovnaka ako mena ponuky.";
    case "INVALID_DATE":
      return "Niektory z datumov je neplatny.";
    case "PAYMENT_METHOD_REQUIRED":
      return "Sposob uhrady je povinny.";
    default:
      return "Operaciu sa nepodarilo vykonat.";
  }
}

export async function createInvoiceFromQuoteAction(formData: FormData): Promise<never> {
  const userId = await requireUserId();

  const quoteId = readOptionalFormString(formData, "quote_id");
  if (!quoteId) {
    redirect(buildQuotesUrl({ error: "Chyba ID ponuky." }));
  }

  const quote = await getQuoteWithRelations(userId, quoteId);
  if (!quote) {
    redirect(buildQuoteBuilderUrl(quoteId, { error: "Ponuka nebola najdena." }));
  }

  const metrics = await getQuoteInvoicingMetrics(userId, quoteId);
  if (!metrics || metrics.remainingToInvoice <= 0) {
    redirect(buildQuoteBuilderUrl(quoteId, { error: "Na ponuku uz nie je co fakturovat." }));
  }

  const kindRaw = formData.get("invoice_kind");
  const invoiceKind: InvoiceKind =
    typeof kindRaw === "string" && VALID_INVOICE_KINDS.includes(kindRaw as InvoiceKind)
      ? (kindRaw as InvoiceKind)
      : "full";

  const issueDate = parseDateFormField(formData, "issue_date");
  const taxableSupplyDate = parseDateFormField(formData, "taxable_supply_date");
  const dueDate = parseDateFormField(formData, "due_date");
  if (!issueDate || !taxableSupplyDate || !dueDate) {
    redirect(buildQuoteBuilderUrl(quoteId, { error: "Vyplnte datumy vystavenia, zdanitelneho plnenia a splatnosti." }));
  }
  if (dueDate.getTime() < issueDate.getTime()) {
    redirect(buildQuoteBuilderUrl(quoteId, { error: "Datum splatnosti nemoze byt skor ako datum vystavenia." }));
  }

  const paymentMethod = readOptionalFormString(formData, "payment_method") ?? "bank_transfer";
  const note = readOptionalFormString(formData, "note");
  const variableSymbol = readOptionalFormString(formData, "variable_symbol");

  let items: InvoiceItemInput[];

  if (invoiceKind === "full") {
    items = quote.items.map((item) => ({
      name: item.name,
      description: item.description ?? null,
      unit: item.unit,
      qty: typeof item.qty === "number" ? item.qty : Number(item.qty),
      unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : Number(item.unitPrice),
      discountPct: typeof item.discountPct === "number" ? item.discountPct : Number(item.discountPct),
      vatRate: typeof quote.vatRate === "number" ? quote.vatRate : Number(quote.vatRate),
    }));
    if (items.length === 0) {
      redirect(buildQuoteBuilderUrl(quoteId, { error: "Ponuka nema ziadne polozky na fakturaciu." }));
    }
  } else {
    const partialRaw = formData.get("partial_amount");
    const partialAmount =
      typeof partialRaw === "string" && partialRaw.trim().length > 0
        ? Number(partialRaw.replace(",", "."))
        : NaN;
    if (!Number.isFinite(partialAmount) || partialAmount <= 0) {
      redirect(buildQuoteBuilderUrl(quoteId, { error: "Zadajte kladnu sumu pre ciastocnu/zalohovu fakturu." }));
    }
    const amount = roundMoney(Math.min(partialAmount, metrics.remainingToInvoice));
    if (amount <= 0) {
      redirect(buildQuoteBuilderUrl(quoteId, { error: "Suma nesmie presiahnut zostavajucu sumu na fakturaciu." }));
    }
    const lineLabel =
      invoiceKind === "advance"
        ? `Zalohova faktura k ponuke ${quote.number}`
        : `Ciastocna faktura k ponuke ${quote.number}`;
    const vatRate = typeof quote.vatRate === "number" ? quote.vatRate : Number(quote.vatRate);
    items = [
      {
        name: lineLabel,
        description: null,
        unit: "pcs",
        qty: 1,
        unitPrice: amount,
        discountPct: 0,
        vatRate,
      },
    ];
  }

  const invoiceNumber = await reserveNextInvoiceNumber(userId, issueDate);
  const variableSymbolFinal = variableSymbol ?? buildDefaultVariableSymbol(invoiceNumber);

  try {
    const invoice = await createInvoiceWithItems(userId, {
      quoteId,
      clientId: quote.clientId,
      invoiceNumber,
      variableSymbol: variableSymbolFinal,
      issueDate,
      taxableSupplyDate,
      dueDate,
      paymentMethod,
      currency: quote.currency,
      vatEnabled: quote.vatEnabled,
      vatRate: typeof quote.vatRate === "number" ? quote.vatRate : Number(quote.vatRate),
      taxRegime: null,
      invoiceKind,
      legalNote: null,
      note,
      items,
      requestedStatus: "draft",
    });

    revalidatePath("/quotes");
    revalidatePath(buildQuoteBuilderUrl(quoteId));
    redirect(`/invoices/${invoice.id}?notice=Faktura bola vytvorena z ponuky.`);
  } catch (error) {
    console.error("createInvoiceFromQuoteAction failed", {
      userId,
      quoteId,
      invoiceKind,
      errorCode: getErrorCode(error),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    redirect(buildQuoteBuilderUrl(quoteId, { error: mapInvoiceCreateErrorToMessage(error) }));
  }
}
