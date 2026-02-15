"use server";

import { Prisma, QuoteStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createQuote,
  deleteQuote,
  duplicateQuote,
  getSettings,
  setQuoteStatus,
} from "@/server/repositories";
import { isQuoteStatus } from "@/lib/quotes/status";
import { reserveNextQuoteNumber } from "@/server/quotes/numbering";

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

async function duplicateQuoteWithNewNumber(quoteId: string) {
  await getSettings();
  const nextNumber = await reserveNextQuoteNumber();
  return duplicateQuote(quoteId, nextNumber);
}

export async function createDraftQuoteAction(formData: FormData): Promise<void> {
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

  const settings = await getSettings();
  const number = await reserveNextQuoteNumber();

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 14);

  const quoteLanguage = settings.defaultLanguage;
  const quoteCurrency = settings.defaultCurrency;
  const quoteVatEnabled = true;
  const introContentMarkdown = "";
  const termsContentMarkdown = "";

  try {
    const quote = await createQuote({
      number,
      title: title || `Ponuka ${number}`,
      status: "draft",
      clientId,
      language: quoteLanguage,
      currency: quoteCurrency,
      validUntil,
      vatEnabled: quoteVatEnabled,
      vatRate: settings.vatRate,
      introContentMarkdown,
      termsContentMarkdown,
      revisionsIncluded: 1,
      totalDiscountType: "none",
      totalDiscountValue: 0,
    });

    revalidatePath("/quotes");
    redirect(buildQuoteBuilderUrl(quote.id, { notice: "Ponuka bola vytvorena." }));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2025")
    ) {
      redirect("/quotes/new?error=Vybrany klient nebol najdeny.");
    }

    throw error;
  }
}

export async function changeQuoteStatusAction(formData: FormData): Promise<void> {
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
    await setQuoteStatus(quoteId, status);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirect(buildQuotesUrl({ error: "Ponuka nebola najdena." }));
    }

    throw error;
  }

  revalidatePath("/quotes");
  revalidatePath(buildQuoteBuilderUrl(quoteId));

  redirect(buildQuotesUrl({ notice: "Stav bol aktualizovany." }));
}

export async function duplicateQuoteAction(formData: FormData): Promise<void> {
  const quoteIdEntry = formData.get("quote_id");
  const quoteId =
    typeof quoteIdEntry === "string" && quoteIdEntry.trim().length > 0
      ? quoteIdEntry.trim()
      : null;

  if (!quoteId) {
    redirect(buildQuotesUrl({ error: "Chyba ID ponuky." }));
  }

  try {
    await duplicateQuoteWithNewNumber(quoteId);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirect(buildQuotesUrl({ error: "Ponuka nebola najdena." }));
    }

    throw error;
  }

  revalidatePath("/quotes");
  redirect(buildQuotesUrl({ notice: "Ponuka bola duplikovana." }));
}

export async function duplicateQuoteToBuilderAction(formData: FormData): Promise<void> {
  const quoteIdEntry = formData.get("quote_id");
  const quoteId =
    typeof quoteIdEntry === "string" && quoteIdEntry.trim().length > 0
      ? quoteIdEntry.trim()
      : null;

  if (!quoteId) {
    redirect(buildQuotesUrl({ error: "Chyba ID ponuky." }));
  }

  try {
    const duplicated = await duplicateQuoteWithNewNumber(quoteId);

    revalidatePath("/quotes");
    revalidatePath(buildQuoteBuilderUrl(duplicated.id));

    redirect(buildQuoteBuilderUrl(duplicated.id, { notice: "Ponuka bola duplikovana." }));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirect(buildQuotesUrl({ error: "Ponuka nebola najdena." }));
    }

    throw error;
  }
}

export async function deleteQuoteAction(formData: FormData): Promise<void> {
  const quoteIdEntry = formData.get("quote_id");
  const quoteId =
    typeof quoteIdEntry === "string" && quoteIdEntry.trim().length > 0
      ? quoteIdEntry.trim()
      : null;

  if (!quoteId) {
    redirect(buildQuotesUrl({ error: "Chyba ID ponuky." }));
  }

  try {
    await deleteQuote(quoteId);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirect(buildQuotesUrl({ error: "Ponuka nebola najdena." }));
    }

    throw error;
  }

  revalidatePath("/quotes");
  redirect(buildQuotesUrl({ notice: "Ponuka bola vymazana." }));
}
