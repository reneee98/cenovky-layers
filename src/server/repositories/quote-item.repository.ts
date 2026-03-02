import {
  createEntityId,
  createNotFoundError,
  dbQuery,
  dbQueryOne,
  dbTransaction,
  numericToNumber,
} from "@/lib/db";

export type ReplaceQuoteItemInput = {
  name: string;
  description?: string | null;
  unit: "h" | "day" | "pcs" | "pkg";
  qty: number;
  unitPrice: number;
  discountPct: number;
  sortOrder: number;
};

type QuoteItemRow = {
  id: string;
  userId: string;
  quoteId: string;
  name: string;
  description: string | null;
  unit: "h" | "day" | "pcs" | "pkg";
  qty: number | string;
  unitPrice: number | string;
  discountPct: number | string;
  sortOrder: number;
};

function mapQuoteItemRow(row: QuoteItemRow) {
  return {
    ...row,
    qty: numericToNumber(row.qty),
    unitPrice: numericToNumber(row.unitPrice),
    discountPct: numericToNumber(row.discountPct),
  };
}

export async function listQuoteItems(userId: string, quoteId: string) {
  const rows = await dbQuery<QuoteItemRow>(
    `SELECT
      id,
      user_id AS "userId",
      quote_id AS "quoteId",
      name,
      description,
      unit,
      qty,
      unit_price AS "unitPrice",
      discount_pct AS "discountPct",
      sort_order AS "sortOrder"
    FROM quote_items
    WHERE user_id = $1 AND quote_id = $2
    ORDER BY sort_order ASC`,
    [userId, quoteId],
  );

  return rows.map(mapQuoteItemRow);
}

export async function createQuoteItem(
  userId: string,
  data: Record<string, unknown>,
) {
  const row = await dbQueryOne<QuoteItemRow>(
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
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING
      id,
      user_id AS "userId",
      quote_id AS "quoteId",
      name,
      description,
      unit,
      qty,
      unit_price AS "unitPrice",
      discount_pct AS "discountPct",
      sort_order AS "sortOrder"`,
    [
      createEntityId("qit"),
      userId,
      data.quoteId,
      data.name,
      data.description ?? null,
      data.unit,
      data.qty,
      data.unitPrice,
      data.discountPct ?? 0,
      data.sortOrder ?? 0,
    ],
  );

  if (!row) {
    throw new Error("QUOTE_ITEM_CREATE_FAILED");
  }

  return mapQuoteItemRow(row);
}

export async function updateQuoteItem(
  userId: string,
  id: string,
  data: Record<string, unknown>,
) {
  const row = await dbQueryOne<QuoteItemRow>(
    `UPDATE quote_items
      SET
        name = $1,
        description = $2,
        unit = $3,
        qty = $4,
        unit_price = $5,
        discount_pct = $6,
        sort_order = $7
      WHERE id = $8 AND user_id = $9
      RETURNING
        id,
        user_id AS "userId",
        quote_id AS "quoteId",
        name,
        description,
        unit,
        qty,
        unit_price AS "unitPrice",
        discount_pct AS "discountPct",
        sort_order AS "sortOrder"`,
    [
      data.name,
      data.description ?? null,
      data.unit,
      data.qty,
      data.unitPrice,
      data.discountPct ?? 0,
      data.sortOrder ?? 0,
      id,
      userId,
    ],
  );

  if (!row) {
    throw createNotFoundError("QUOTE_ITEM_NOT_FOUND");
  }

  return mapQuoteItemRow(row);
}

export async function deleteQuoteItem(userId: string, id: string) {
  const row = await dbQueryOne<{ id: string }>(
    `DELETE FROM quote_items WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId],
  );

  if (!row) {
    throw createNotFoundError("QUOTE_ITEM_NOT_FOUND");
  }

  return row;
}

export async function replaceQuoteItems(
  userId: string,
  quoteId: string,
  items: ReplaceQuoteItemInput[],
) {
  await dbTransaction(async (tx) => {
    await dbQuery(`DELETE FROM quote_items WHERE user_id = $1 AND quote_id = $2`, [userId, quoteId], tx);

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
          quoteId,
          item.name,
          item.description ?? null,
          item.unit,
          item.qty,
          item.unitPrice,
          item.discountPct,
          item.sortOrder ?? index,
        ],
        tx,
      );
    }
  });

  return listQuoteItems(userId, quoteId);
}
