import { createEntityId, createNotFoundError, dbQuery, dbQueryOne, numericToNumber, toDate } from "@/lib/db";

export type ListCatalogItemFilters = {
  category?: string;
  tag?: string;
  search?: string;
};

type CatalogItemRow = {
  id: string;
  userId: string;
  category: string;
  tags: unknown;
  name: string;
  description: string | null;
  defaultUnit: "h" | "day" | "pcs" | "pkg";
  defaultUnitPrice: number | string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function mapCatalogItemRow(row: CatalogItemRow) {
  return {
    ...row,
    defaultUnitPrice: numericToNumber(row.defaultUnitPrice),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

export async function listCatalogItems(
  userId: string,
  filters: ListCatalogItemFilters = {},
) {
  const params: unknown[] = [userId];
  const where: string[] = ["user_id = $1"];

  if (filters.category?.trim()) {
    params.push(filters.category.trim());
    where.push(`category = $${params.length}`);
  }

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;
    params.push(search);
    const index = params.length;
    where.push(`(name ILIKE $${index} OR description ILIKE $${index})`);
  }

  if (filters.tag?.trim()) {
    params.push(filters.tag.trim().toLowerCase());
    where.push(`EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(tags::jsonb) AS tag
      WHERE LOWER(tag) = $${params.length}
    )`);
  }

  const rows = await dbQuery<CatalogItemRow>(
    `SELECT
      id,
      user_id AS "userId",
      category,
      tags,
      name,
      description,
      default_unit AS "defaultUnit",
      default_unit_price AS "defaultUnitPrice",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM catalog_items
    WHERE ${where.join(" AND ")}
    ORDER BY category ASC, name ASC`,
    params,
  );

  return rows.map(mapCatalogItemRow);
}

export async function getCatalogItemById(userId: string, id: string) {
  const row = await dbQueryOne<CatalogItemRow>(
    `SELECT
      id,
      user_id AS "userId",
      category,
      tags,
      name,
      description,
      default_unit AS "defaultUnit",
      default_unit_price AS "defaultUnitPrice",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM catalog_items
    WHERE id = $1 AND user_id = $2
    LIMIT 1`,
    [id, userId],
  );

  return row ? mapCatalogItemRow(row) : null;
}

function normalizeCatalogItemData(data: Record<string, unknown>) {
  return {
    category: data.category,
    tags: Array.isArray(data.tags) ? data.tags : [],
    name: data.name,
    description: data.description ?? null,
    defaultUnit: data.defaultUnit,
    defaultUnitPrice: data.defaultUnitPrice,
  };
}

export async function createCatalogItem(
  userId: string,
  data: Record<string, unknown>,
) {
  const input = normalizeCatalogItemData(data);

  const row = await dbQueryOne<CatalogItemRow>(
    `INSERT INTO catalog_items (
      id,
      user_id,
      category,
      tags,
      name,
      description,
      default_unit,
      default_unit_price
    ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8)
    RETURNING
      id,
      user_id AS "userId",
      category,
      tags,
      name,
      description,
      default_unit AS "defaultUnit",
      default_unit_price AS "defaultUnitPrice",
      created_at AS "createdAt",
      updated_at AS "updatedAt"`,
    [
      createEntityId("cat"),
      userId,
      input.category,
      JSON.stringify(input.tags),
      input.name,
      input.description,
      input.defaultUnit,
      input.defaultUnitPrice,
    ],
  );

  if (!row) {
    throw new Error("CATALOG_ITEM_CREATE_FAILED");
  }

  return mapCatalogItemRow(row);
}

export async function updateCatalogItem(
  userId: string,
  id: string,
  data: Record<string, unknown>,
) {
  const input = normalizeCatalogItemData(data);

  const row = await dbQueryOne<CatalogItemRow>(
    `UPDATE catalog_items
      SET
        category = $1,
        tags = $2::jsonb,
        name = $3,
        description = $4,
        default_unit = $5,
        default_unit_price = $6,
        updated_at = NOW()
      WHERE id = $7 AND user_id = $8
      RETURNING
        id,
        user_id AS "userId",
        category,
        tags,
        name,
        description,
        default_unit AS "defaultUnit",
        default_unit_price AS "defaultUnitPrice",
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
    [
      input.category,
      JSON.stringify(input.tags),
      input.name,
      input.description,
      input.defaultUnit,
      input.defaultUnitPrice,
      id,
      userId,
    ],
  );

  if (!row) {
    throw createNotFoundError("CATALOG_ITEM_NOT_FOUND");
  }

  return mapCatalogItemRow(row);
}

export async function deleteCatalogItem(userId: string, id: string) {
  const row = await dbQueryOne<{ id: string }>(
    `DELETE FROM catalog_items WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId],
  );

  if (!row) {
    throw createNotFoundError("CATALOG_ITEM_NOT_FOUND");
  }

  return row;
}

export async function listCatalogFacets(userId: string): Promise<{
  categories: string[];
  tags: string[];
}> {
  const rows = await dbQuery<{ category: string; tags: unknown }>(
    `SELECT category, tags
     FROM catalog_items
     WHERE user_id = $1`,
    [userId],
  );

  const categories = Array.from(
    new Set(
      rows
        .map((item) => item.category.trim())
        .filter((category) => category.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const tags = Array.from(
    new Set(
      rows.flatMap((item) => {
        if (!Array.isArray(item.tags)) {
          return [];
        }

        return item.tags
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      }),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return { categories, tags };
}
