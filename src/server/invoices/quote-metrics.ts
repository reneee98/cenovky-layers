import type { PoolClient } from "pg";

import { dbQuery, dbQueryOne, numericToNumber, toDate } from "@/lib/db";
import {
  calculateRemainingToInvoice,
  normalizeInvoicedAmount,
  resolveQuoteInvoicingState,
} from "@/lib/quotes/invoicing";
import { calculateQuoteTotals } from "@/server/quotes/totals";

export type QuoteInvoicingMetrics = {
  quoteId: string;
  currency: string;
  createdAt?: Date;
  quoteTotal: number;
  invoicedAmount: number;
  remainingToInvoice: number;
  invoicingState: "not_invoiced" | "partially_invoiced" | "fully_invoiced";
};

async function readQuoteTotals(client: PoolClient | undefined, userId: string, quoteId: string) {
  const quote = await dbQueryOne<{
    id: string;
    currency: string;
    createdAt: Date | string;
    vatEnabled: boolean;
    vatRate: number | string;
    totalDiscountType: "none" | "pct" | "amount";
    totalDiscountValue: number | string;
  }>(
    `SELECT
      id,
      currency,
      created_at AS "createdAt",
      vat_enabled AS "vatEnabled",
      vat_rate AS "vatRate",
      total_discount_type AS "totalDiscountType",
      total_discount_value AS "totalDiscountValue"
    FROM quotes
    WHERE id = $1 AND user_id = $2
    LIMIT 1`,
    [quoteId, userId],
    client,
  );

  if (!quote) {
    return null;
  }

  const items = await dbQuery<{
    qty: number | string;
    unitPrice: number | string;
    discountPct: number | string;
  }>(
    `SELECT
      qty,
      unit_price AS "unitPrice",
      discount_pct AS "discountPct"
    FROM quote_items
    WHERE quote_id = $1 AND user_id = $2`,
    [quoteId, userId],
    client,
  );

  const totals = calculateQuoteTotals({
    items: items.map((item) => ({
      qty: numericToNumber(item.qty),
      unitPrice: numericToNumber(item.unitPrice),
      discountPct: numericToNumber(item.discountPct),
    })),
    totalDiscountType: quote.totalDiscountType,
    totalDiscountValue: numericToNumber(quote.totalDiscountValue),
    vatEnabled: quote.vatEnabled,
    vatRate: numericToNumber(quote.vatRate),
  });

  return {
    id: quote.id,
    currency: quote.currency,
    quoteTotal: totals.grandTotal,
    createdAt: toDate(quote.createdAt),
  };
}

export async function getQuoteInvoicingMetrics(
  userId: string,
  quoteId: string,
  dbClient?: PoolClient,
): Promise<QuoteInvoicingMetrics | null> {
  const quoteTotals = await readQuoteTotals(dbClient, userId, quoteId);
  if (!quoteTotals) {
    return null;
  }

  const aggregate = await dbQueryOne<{ total: number | string | null }>(
    `SELECT COALESCE(SUM(total), 0) AS total
     FROM invoices
     WHERE user_id = $1
       AND quote_id = $2
       AND status <> 'cancelled'`,
    [userId, quoteId],
    dbClient,
  );

  const invoicedAmount = normalizeInvoicedAmount(numericToNumber(aggregate?.total ?? 0));
  const remainingToInvoice = calculateRemainingToInvoice(quoteTotals.quoteTotal, invoicedAmount);
  const invoicingState = resolveQuoteInvoicingState(quoteTotals.quoteTotal, invoicedAmount);

  return {
    quoteId,
    currency: quoteTotals.currency,
    createdAt: quoteTotals.createdAt,
    quoteTotal: quoteTotals.quoteTotal,
    invoicedAmount,
    remainingToInvoice,
    invoicingState,
  };
}

export async function syncQuoteInvoicingState(
  userId: string,
  quoteId: string,
  dbClient?: PoolClient,
): Promise<QuoteInvoicingMetrics | null> {
  const metrics = await getQuoteInvoicingMetrics(userId, quoteId, dbClient);
  if (!metrics) {
    return null;
  }

  await dbQuery(
    `UPDATE quotes
     SET invoicing_state = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3`,
    [metrics.invoicingState, quoteId, userId],
    dbClient,
  );

  return metrics;
}

export async function listQuotesWithInvoicingMetrics(
  userId: string,
  options?: { quoteStatuses?: Array<"draft" | "sent" | "accepted" | "rejected" | "invoiced"> },
): Promise<QuoteInvoicingMetrics[]> {
  const statusFilter =
    options?.quoteStatuses && options.quoteStatuses.length > 0
      ? `AND status::text = ANY($2::text[])`
      : "";
  const params: unknown[] = [userId];
  if (options?.quoteStatuses && options.quoteStatuses.length > 0) {
    params.push(options.quoteStatuses);
  }

  const quotes = await dbQuery<{
    id: string;
    status: string;
    currency: string;
    createdAt: Date | string;
    vatEnabled: boolean;
    vatRate: number | string;
    totalDiscountType: "none" | "pct" | "amount";
    totalDiscountValue: number | string;
  }>(
    `SELECT
      id,
      status,
      currency,
      created_at AS "createdAt",
      vat_enabled AS "vatEnabled",
      vat_rate AS "vatRate",
      total_discount_type AS "totalDiscountType",
      total_discount_value AS "totalDiscountValue"
    FROM quotes
    WHERE user_id = $1 ${statusFilter}`,
    params,
  );

  if (quotes.length === 0) {
    return [];
  }

  const quoteIds = quotes.map((quote) => quote.id);

  const [items, aggregates] = await Promise.all([
    dbQuery<{
      quoteId: string;
      qty: number | string;
      unitPrice: number | string;
      discountPct: number | string;
    }>(
      `SELECT
        quote_id AS "quoteId",
        qty,
        unit_price AS "unitPrice",
        discount_pct AS "discountPct"
      FROM quote_items
      WHERE user_id = $1
        AND quote_id = ANY($2::text[])`,
      [userId, quoteIds],
    ),
    dbQuery<{ quoteId: string; total: number | string | null }>(
      `SELECT
        quote_id AS "quoteId",
        COALESCE(SUM(total), 0) AS total
      FROM invoices
      WHERE user_id = $1
        AND quote_id IS NOT NULL
        AND status <> 'cancelled'
      GROUP BY quote_id`,
      [userId],
    ),
  ]);

  const itemsByQuoteId = new Map<string, Array<{ qty: number; unitPrice: number; discountPct: number }>>();
  for (const item of items) {
    const bucket = itemsByQuoteId.get(item.quoteId) ?? [];
    bucket.push({
      qty: numericToNumber(item.qty),
      unitPrice: numericToNumber(item.unitPrice),
      discountPct: numericToNumber(item.discountPct),
    });
    itemsByQuoteId.set(item.quoteId, bucket);
  }

  const invoicedByQuoteId = new Map<string, number>();
  for (const aggregate of aggregates) {
    invoicedByQuoteId.set(aggregate.quoteId, numericToNumber(aggregate.total));
  }

  return quotes.map((quote) => {
    const quoteTotal = calculateQuoteTotals({
      items: itemsByQuoteId.get(quote.id) ?? [],
      totalDiscountType: quote.totalDiscountType,
      totalDiscountValue: numericToNumber(quote.totalDiscountValue),
      vatEnabled: quote.vatEnabled,
      vatRate: numericToNumber(quote.vatRate),
    }).grandTotal;

    const invoicedAmount = normalizeInvoicedAmount(invoicedByQuoteId.get(quote.id) ?? 0);
    const remainingToInvoice = calculateRemainingToInvoice(quoteTotal, invoicedAmount);

    return {
      quoteId: quote.id,
      currency: quote.currency,
      createdAt: toDate(quote.createdAt),
      quoteTotal,
      invoicedAmount,
      remainingToInvoice,
      invoicingState: resolveQuoteInvoicingState(quoteTotal, invoicedAmount),
    };
  });
}
