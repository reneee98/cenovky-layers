import type { Language as QuoteLanguage, QuoteStatus as QuoteStatusEnum, TotalDiscountType as QuoteDiscountType, Unit as QuoteUnit } from "@/types/domain";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { createEntityId, createNotFoundError, dbQuery, dbQueryOne, dbTransaction, toDate } from "@/lib/db";
import { isDbKnownRequestError } from "@/lib/db-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { QUOTE_ITEM_SECTION_MARKER } from "@/lib/quotes/items";
import { isQuoteStatus } from "@/lib/quotes/status";

type Language = QuoteLanguage;
type QuoteStatus = QuoteStatusEnum;
type TotalDiscountType = QuoteDiscountType;
type Unit = QuoteUnit;

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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Neautorizovane." }, { status: 401 });
  }

  const userId = user.id;
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
    const updatedQuote = await dbTransaction(async (tx) => {
      const ownedClient = await dbQueryOne<{ id: string }>(
        `SELECT id
         FROM clients
         WHERE id = $1 AND user_id = $2
         LIMIT 1`,
        [payload.clientId, userId],
        tx,
      );

      if (!ownedClient) {
        throw new Error("CLIENT_NOT_FOUND");
      }

      const updated = await dbQueryOne<{ id: string; updatedAt: Date | string }>(
        `UPDATE quotes
         SET
           title = $1,
           client_id = $2,
           language = $3,
           currency = $4,
           valid_until = $5,
           vat_enabled = $6,
           vat_rate = $7,
           status = $8,
           show_client_details_in_pdf = $9,
           show_company_details_in_pdf = $10,
           intro_content_markdown = $11,
           terms_content_markdown = $12,
           revisions_included = $13,
           total_discount_type = $14,
           total_discount_value = $15,
           updated_at = NOW()
         WHERE id = $16 AND user_id = $17
         RETURNING id, updated_at AS "updatedAt"`,
        [
          payload.title.trim(),
          payload.clientId,
          payload.language,
          payload.currency.trim().toUpperCase(),
          validUntilDate,
          payload.vatEnabled,
          vatRate,
          payload.status,
          payload.showClientDetailsInPdf,
          payload.showCompanyDetailsInPdf,
          payload.introContentMarkdown,
          payload.termsContentMarkdown,
          revisionsIncluded,
          payload.totalDiscountType,
          totalDiscountValue,
          id,
          userId,
        ],
        tx,
      );

      if (!updated) {
        throw createNotFoundError("QUOTE_NOT_FOUND");
      }

      await dbQuery(
        `DELETE FROM quote_items
         WHERE user_id = $1 AND quote_id = $2`,
        [userId, id],
        tx,
      );
      await dbQuery(
        `DELETE FROM scope_items
         WHERE user_id = $1 AND quote_id = $2`,
        [userId, id],
        tx,
      );

      if (items.length > 0) {
        for (const [index, item] of items.entries()) {
          await dbQuery(
            `INSERT INTO quote_items (
              id,
              user_id,
              quote_id,
              name,
              description,
              unit,
              qty,
              unit_price,
              discount_pct,
              sort_order
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
              createEntityId("qit"),
              userId,
              id,
              item.name,
              item.description,
              item.unit,
              item.qty,
              item.unitPrice,
              item.discountPct,
              index,
            ],
            tx,
          );
        }
      }

      if (payload.scopeItems.length > 0) {
        for (const [index, scopeItem] of payload.scopeItems.entries()) {
          await dbQuery(
            `INSERT INTO scope_items (
              id,
              user_id,
              quote_id,
              category,
              item_key,
              label,
              description,
              sort_order
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              createEntityId("scp"),
              userId,
              id,
              scopeItem.category,
              scopeItem.itemKey,
              scopeItem.label,
              scopeItem.description,
              index,
            ],
            tx,
          );
        }
      }

      return updated;
    });

    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);

    return NextResponse.json({
      ok: true,
      updatedAt: toDate(updatedQuote.updatedAt).toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CLIENT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Vybrany klient nepatri prihlasenemu pouzivatelovi." },
        { status: 400 },
      );
    }

    if (isDbKnownRequestError(error, "P2025")) {
      return NextResponse.json({ error: "Ponuka nebola najdena." }, { status: 404 });
    }

    console.error("Quote autosave failed", { quoteId: id, userId, error });
    return NextResponse.json(
      {
        error: "Nepodarilo sa automaticky ulozit ponuku.",
        detail: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 },
    );
  }
}
