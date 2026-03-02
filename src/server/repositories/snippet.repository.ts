import type { Language, SnippetType } from "@/types/domain";

import { createEntityId, createNotFoundError, dbQuery, dbQueryOne, toDate } from "@/lib/db";

export type ListSnippetFilters = {
  type?: SnippetType;
  language?: Language;
};

type SnippetRow = {
  id: string;
  userId: string;
  type: SnippetType;
  language: Language;
  title: string;
  contentMarkdown: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function mapSnippetRow(row: SnippetRow) {
  return {
    ...row,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

export async function listSnippets(
  userId: string,
  filters: ListSnippetFilters = {},
) {
  const params: unknown[] = [userId];
  const where: string[] = ["user_id = $1"];

  if (filters.type) {
    params.push(filters.type);
    where.push(`type = $${params.length}`);
  }

  if (filters.language) {
    params.push(filters.language);
    where.push(`language = $${params.length}`);
  }

  const rows = await dbQuery<SnippetRow>(
    `SELECT
      id,
      user_id AS "userId",
      type,
      language,
      title,
      content_markdown AS "contentMarkdown",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM snippets
    WHERE ${where.join(" AND ")}
    ORDER BY type ASC, language ASC, title ASC`,
    params,
  );

  return rows.map(mapSnippetRow);
}

export async function getSnippetById(userId: string, id: string) {
  const row = await dbQueryOne<SnippetRow>(
    `SELECT
      id,
      user_id AS "userId",
      type,
      language,
      title,
      content_markdown AS "contentMarkdown",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM snippets
    WHERE id = $1 AND user_id = $2
    LIMIT 1`,
    [id, userId],
  );

  return row ? mapSnippetRow(row) : null;
}

export async function createSnippet(
  userId: string,
  data: Record<string, unknown>,
) {
  const row = await dbQueryOne<SnippetRow>(
    `INSERT INTO snippets (
      id,
      user_id,
      type,
      language,
      title,
      content_markdown
    ) VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING
      id,
      user_id AS "userId",
      type,
      language,
      title,
      content_markdown AS "contentMarkdown",
      created_at AS "createdAt",
      updated_at AS "updatedAt"`,
    [
      createEntityId("snp"),
      userId,
      data.type,
      data.language,
      data.title,
      data.contentMarkdown,
    ],
  );

  if (!row) {
    throw new Error("SNIPPET_CREATE_FAILED");
  }

  return mapSnippetRow(row);
}

export async function updateSnippet(
  userId: string,
  id: string,
  data: Record<string, unknown>,
) {
  const row = await dbQueryOne<SnippetRow>(
    `UPDATE snippets
      SET
        type = $1,
        language = $2,
        title = $3,
        content_markdown = $4,
        updated_at = NOW()
      WHERE id = $5 AND user_id = $6
      RETURNING
        id,
        user_id AS "userId",
        type,
        language,
        title,
        content_markdown AS "contentMarkdown",
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
    [data.type, data.language, data.title, data.contentMarkdown, id, userId],
  );

  if (!row) {
    throw createNotFoundError("SNIPPET_NOT_FOUND");
  }

  return mapSnippetRow(row);
}

export async function deleteSnippet(userId: string, id: string) {
  const row = await dbQueryOne<{ id: string }>(
    `DELETE FROM snippets WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId],
  );

  if (!row) {
    throw createNotFoundError("SNIPPET_NOT_FOUND");
  }

  return row;
}
