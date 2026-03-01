import { Language, QuoteStatus, TotalDiscountType, Unit } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { QUOTE_ITEM_SECTION_MARKER } from "@/lib/quotes/items";
import { isQuoteStatus } from "@/lib/quotes/status";
import { prisma } from "@/lib/prisma";

type AutosaveQuoteItemPayload = {
  name: string;
  description: string | null;
  isSection: boolean;
  unit: Unit;
  qty: number;
  unitPrice: number;
  discountPct: number;
};

type AutosavePayload = {
  title: string;
  clientId: string;
  language: Language;
  currency: string;
  validUntil: string;
  vatEnabled: boolean;
  status: QuoteStatus;
  showClientDetailsInPdf: boolean;
  showCompanyDetailsInPdf: boolean;
  introContentMarkdown: string;
  termsContentMarkdown: string;
  revisionsIncluded: number;
  totalDiscountType: TotalDiscountType;
  totalDiscountValue: number;
  vatRate: number;
  scopeItems: Array<{
    category: string;
    itemKey: string;
    label: string;
    description: string | null;
    sortOrder: number;
  }>;
  items: AutosaveQuoteItemPayload[];
};

function isLanguage(value: unknown): value is Language {
  return value === "sk" || value === "en";
}

function isDiscountType(value: unknown): value is TotalDiscountType {
  return value === "none" || value === "pct" || value === "amount";
}

function isUnit(value: unknown): value is Unit {
  return value === "h" || value === "day" || value === "pcs" || value === "pkg";
}

function normalizeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseAutosavePayload(payload: unknown): AutosavePayload | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const candidate = payload as Partial<AutosavePayload>;

  if (
    typeof candidate.title !== "string" ||
    typeof candidate.clientId !== "string" ||
    !isLanguage(candidate.language) ||
    typeof candidate.currency !== "string" ||
    typeof candidate.validUntil !== "string" ||
    typeof candidate.vatEnabled !== "boolean" ||
    !isQuoteStatus(candidate.status) ||
    typeof candidate.introContentMarkdown !== "string" ||
    typeof candidate.termsContentMarkdown !== "string" ||
    typeof candidate.revisionsIncluded !== "number" ||
    !isDiscountType(candidate.totalDiscountType) ||
    typeof candidate.totalDiscountValue !== "number" ||
    typeof candidate.vatRate !== "number" ||
    !Array.isArray(candidate.items)
  ) {
    return null;
  }

  const showClientDetailsInPdf =
    typeof candidate.showClientDetailsInPdf === "boolean"
      ? candidate.showClientDetailsInPdf
      : true;
  const showCompanyDetailsInPdf =
    typeof candidate.showCompanyDetailsInPdf === "boolean"
      ? candidate.showCompanyDetailsInPdf
      : true;

  const parsedScopeItems = Array.isArray(candidate.scopeItems)
    ? candidate.scopeItems
        .map((scopeItem) => {
          if (!scopeItem || typeof scopeItem !== "object" || Array.isArray(scopeItem)) {
            return null;
          }

          const candidateScopeItem = scopeItem as Partial<AutosavePayload["scopeItems"][number]>;
          if (
            typeof candidateScopeItem.category !== "string" ||
            typeof candidateScopeItem.itemKey !== "string" ||
            typeof candidateScopeItem.label !== "string"
          ) {
            return null;
          }

          return {
            category: candidateScopeItem.category.trim(),
            itemKey: candidateScopeItem.itemKey.trim(),
            label: candidateScopeItem.label.trim(),
            description:
              typeof candidateScopeItem.description === "string" &&
              candidateScopeItem.description.trim().length > 0
                ? candidateScopeItem.description.trim()
                : null,
            sortOrder: Math.max(0, normalizeNumber(candidateScopeItem.sortOrder, 0)),
          };
        })
        .filter((scopeItem): scopeItem is AutosavePayload["scopeItems"][number] => Boolean(scopeItem))
    : [];

  const items = candidate.items
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const candidateItem = item as Partial<AutosaveQuoteItemPayload>;

      if (
        typeof candidateItem.name !== "string" ||
        !isUnit(candidateItem.unit) ||
        typeof candidateItem.qty !== "number" ||
        typeof candidateItem.unitPrice !== "number" ||
        typeof candidateItem.discountPct !== "number"
      ) {
        return null;
      }

      const description =
        typeof candidateItem.description === "string" && candidateItem.description.trim().length > 0
          ? candidateItem.description.trim()
          : null;

      return {
        name: candidateItem.name,
        description,
        isSection: candidateItem.isSection === true,
        unit: candidateItem.unit,
        qty: candidateItem.qty,
        unitPrice: candidateItem.unitPrice,
        discountPct: candidateItem.discountPct,
      };
    })
    .filter((item): item is AutosaveQuoteItemPayload => Boolean(item));

  return {
    title: candidate.title,
    clientId: candidate.clientId,
    language: candidate.language,
    currency: candidate.currency,
    validUntil: candidate.validUntil,
    vatEnabled: candidate.vatEnabled,
    status: candidate.status,
    showClientDetailsInPdf,
    showCompanyDetailsInPdf,
    introContentMarkdown: candidate.introContentMarkdown,
    termsContentMarkdown: candidate.termsContentMarkdown,
    revisionsIncluded: candidate.revisionsIncluded,
    totalDiscountType: candidate.totalDiscountType,
    totalDiscountValue: candidate.totalDiscountValue,
    vatRate: candidate.vatRate,
    scopeItems: parsedScopeItems,
    items,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const payloadJson = await request.json();
  const payload = parseAutosavePayload(payloadJson);

  if (!payload) {
    return NextResponse.json({ error: "Neplatny payload." }, { status: 400 });
  }

  const validUntilDate = new Date(payload.validUntil);

  if (Number.isNaN(validUntilDate.getTime())) {
    return NextResponse.json({ error: "Neplatny datum valid_until." }, { status: 400 });
  }

  const revisionsIncluded = Math.max(1, Math.min(3, Math.round(payload.revisionsIncluded)));
  const totalDiscountValue = Math.max(0, normalizeNumber(payload.totalDiscountValue, 0));
  const vatRate = Math.max(0, normalizeNumber(payload.vatRate, 0));

  const items = payload.items
    .map((item) => ({
      name: item.name.trim(),
      description: item.isSection
        ? QUOTE_ITEM_SECTION_MARKER
        : item.description?.trim() || null,
      isSection: item.isSection,
      unit: item.unit,
      qty: item.isSection ? 0 : Math.max(0, normalizeNumber(item.qty, 0)),
      unitPrice: item.isSection ? 0 : Math.max(0, normalizeNumber(item.unitPrice, 0)),
      discountPct: item.isSection ? 0 : Math.max(0, normalizeNumber(item.discountPct, 0)),
    }))
    .filter((item) => item.name.length > 0);

  try {
    const updatedQuote = await prisma.$transaction(async (tx) => {
      const updated = await tx.quote.update({
        where: { id },
        data: {
          title: payload.title.trim(),
          clientId: payload.clientId,
          language: payload.language,
          currency: payload.currency.trim().toUpperCase(),
          validUntil: validUntilDate,
          vatEnabled: payload.vatEnabled,
          vatRate,
          status: payload.status,
          showClientDetailsInPdf: payload.showClientDetailsInPdf,
          showCompanyDetailsInPdf: payload.showCompanyDetailsInPdf,
          introContentMarkdown: payload.introContentMarkdown,
          termsContentMarkdown: payload.termsContentMarkdown,
          revisionsIncluded,
          totalDiscountType: payload.totalDiscountType,
          totalDiscountValue,
        },
      });

      await tx.quoteItem.deleteMany({ where: { quoteId: id } });
      await tx.scopeItem.deleteMany({ where: { quoteId: id } });

      if (items.length > 0) {
        await tx.quoteItem.createMany({
          data: items.map((item, index) => ({
            quoteId: id,
            name: item.name,
            description: item.description,
            unit: item.unit,
            qty: item.qty,
            unitPrice: item.unitPrice,
            discountPct: item.discountPct,
            sortOrder: index,
          })),
        });
      }

      if (payload.scopeItems.length > 0) {
        await tx.scopeItem.createMany({
          data: payload.scopeItems.map((scopeItem, index) => ({
            quoteId: id,
            category: scopeItem.category,
            itemKey: scopeItem.itemKey,
            label: scopeItem.label,
            description: scopeItem.description,
            sortOrder: index,
          })),
        });
      }

      return updated;
    });

    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);

    return NextResponse.json({
      ok: true,
      updatedAt: updatedQuote.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Quote autosave failed", { quoteId: id, error });
    return NextResponse.json(
      {
        error: "Nepodarilo sa automaticky ulozit ponuku.",
        detail: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 },
    );
  }
}
