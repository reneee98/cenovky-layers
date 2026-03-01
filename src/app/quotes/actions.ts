"use server";

import type { QuoteStatus as QuoteStatusEnum } from "@/types/domain";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth";
import { isPrismaKnownRequestError } from "@/lib/prisma-errors";
import { isQuoteStatus } from "@/lib/quotes/status";
import {
  createQuote,
  deleteQuote,
  duplicateQuote,
  getSettings,
  setQuoteStatus,
} from "@/server/repositories";
import { reserveNextQuoteNumber } from "@/server/quotes/numbering";

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
    if (isPrismaKnownRequestError(error, "P2003", "P2025")) {
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
    if (isPrismaKnownRequestError(error, "P2025")) {
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
    if (isPrismaKnownRequestError(error, "P2025")) {
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
    if (isPrismaKnownRequestError(error, "P2025")) {
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
    if (isPrismaKnownRequestError(error, "P2025")) {
      redirect(buildQuotesUrl({ error: "Ponuka nebola najdena." }));
    }

    throw error;
  }

  revalidatePath("/quotes");
  redirect(buildQuotesUrl({ notice: "Ponuka bola vymazana." }));
}
