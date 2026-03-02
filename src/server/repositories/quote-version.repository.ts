import {
  createEntityId,
  createNotFoundError,
  dbQuery,
  dbQueryOne,
  dbTransaction,
  toDate,
} from "@/lib/db";

type QuoteVersionRow = {
  id: string;
  userId: string;
  quoteId: string;
  versionNumber: number;
  exportedAt: Date | string;
  snapshotJson: unknown;
  pdfFileUrl: string;
};

function mapQuoteVersionRow(row: QuoteVersionRow) {
  return {
    ...row,
    exportedAt: toDate(row.exportedAt),
  };
}

export async function listQuoteVersions(userId: string, quoteId: string) {
  const rows = await dbQuery<QuoteVersionRow>(
    `SELECT
      id,
      user_id AS "userId",
      quote_id AS "quoteId",
      version_number AS "versionNumber",
      exported_at AS "exportedAt",
      snapshot_json AS "snapshotJson",
      pdf_file_url AS "pdfFileUrl"
    FROM quote_versions
    WHERE user_id = $1 AND quote_id = $2
    ORDER BY version_number DESC`,
    [userId, quoteId],
  );

  return rows.map(mapQuoteVersionRow);
}

export async function getQuoteVersionById(
  userId: string,
  id: string,
) {
  const row = await dbQueryOne<QuoteVersionRow>(
    `SELECT
      id,
      user_id AS "userId",
      quote_id AS "quoteId",
      version_number AS "versionNumber",
      exported_at AS "exportedAt",
      snapshot_json AS "snapshotJson",
      pdf_file_url AS "pdfFileUrl"
    FROM quote_versions
    WHERE id = $1 AND user_id = $2
    LIMIT 1`,
    [id, userId],
  );

  return row ? mapQuoteVersionRow(row) : null;
}

export async function createQuoteVersion(
  userId: string,
  data: {
    quoteId: string;
    versionNumber: number;
    snapshotJson: unknown;
    pdfFileUrl: string;
  },
) {
  const row = await dbQueryOne<QuoteVersionRow>(
    `INSERT INTO quote_versions (
      id,
      user_id,
      quote_id,
      version_number,
      snapshot_json,
      pdf_file_url
    ) VALUES ($1,$2,$3,$4,$5::jsonb,$6)
    RETURNING
      id,
      user_id AS "userId",
      quote_id AS "quoteId",
      version_number AS "versionNumber",
      exported_at AS "exportedAt",
      snapshot_json AS "snapshotJson",
      pdf_file_url AS "pdfFileUrl"`,
    [
      createEntityId("qv"),
      userId,
      data.quoteId,
      data.versionNumber,
      JSON.stringify(data.snapshotJson),
      data.pdfFileUrl,
    ],
  );

  if (!row) {
    throw new Error("QUOTE_VERSION_CREATE_FAILED");
  }

  return mapQuoteVersionRow(row);
}

export async function createNextQuoteVersion(
  userId: string,
  quoteId: string,
  snapshotJson: unknown,
  pdfFileUrl: string,
) {
  return dbTransaction(async (tx) => {
    const latest = await dbQueryOne<{ versionNumber: number }>(
      `SELECT version_number AS "versionNumber"
       FROM quote_versions
       WHERE user_id = $1 AND quote_id = $2
       ORDER BY version_number DESC
       LIMIT 1`,
      [userId, quoteId],
      tx,
    );

    const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;

    const created = await dbQueryOne<QuoteVersionRow>(
      `INSERT INTO quote_versions (
        id,
        user_id,
        quote_id,
        version_number,
        snapshot_json,
        pdf_file_url
      ) VALUES ($1,$2,$3,$4,$5::jsonb,$6)
      RETURNING
        id,
        user_id AS "userId",
        quote_id AS "quoteId",
        version_number AS "versionNumber",
        exported_at AS "exportedAt",
        snapshot_json AS "snapshotJson",
        pdf_file_url AS "pdfFileUrl"`,
      [
        createEntityId("qv"),
        userId,
        quoteId,
        nextVersionNumber,
        JSON.stringify(snapshotJson),
        pdfFileUrl,
      ],
      tx,
    );

    if (!created) {
      throw new Error("QUOTE_VERSION_CREATE_FAILED");
    }

    return mapQuoteVersionRow(created);
  });
}

export async function createOrReplaceSingleQuoteVersion(
  userId: string,
  quoteId: string,
  snapshotJson: unknown,
  pdfFileUrl: string,
) {
  return dbTransaction(async (tx) => {
    const existing = await dbQueryOne<{ id: string }>(
      `SELECT id
       FROM quote_versions
       WHERE user_id = $1 AND quote_id = $2
       ORDER BY exported_at DESC
       LIMIT 1`,
      [userId, quoteId],
      tx,
    );

    if (!existing) {
      const created = await dbQueryOne<QuoteVersionRow>(
        `INSERT INTO quote_versions (
          id,
          user_id,
          quote_id,
          version_number,
          snapshot_json,
          pdf_file_url
        ) VALUES ($1,$2,$3,1,$4::jsonb,$5)
        RETURNING
          id,
          user_id AS "userId",
          quote_id AS "quoteId",
          version_number AS "versionNumber",
          exported_at AS "exportedAt",
          snapshot_json AS "snapshotJson",
          pdf_file_url AS "pdfFileUrl"`,
        [createEntityId("qv"), userId, quoteId, JSON.stringify(snapshotJson), pdfFileUrl],
        tx,
      );

      if (!created) {
        throw new Error("QUOTE_VERSION_CREATE_FAILED");
      }

      return mapQuoteVersionRow(created);
    }

    await dbQuery(
      `DELETE FROM quote_versions
       WHERE user_id = $1 AND quote_id = $2 AND id <> $3`,
      [userId, quoteId, existing.id],
      tx,
    );

    const updated = await dbQueryOne<QuoteVersionRow>(
      `UPDATE quote_versions
       SET
         version_number = 1,
         snapshot_json = $1::jsonb,
         pdf_file_url = $2,
         exported_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING
         id,
         user_id AS "userId",
         quote_id AS "quoteId",
         version_number AS "versionNumber",
         exported_at AS "exportedAt",
         snapshot_json AS "snapshotJson",
         pdf_file_url AS "pdfFileUrl"`,
      [JSON.stringify(snapshotJson), pdfFileUrl, existing.id, userId],
      tx,
    );

    if (!updated) {
      throw createNotFoundError("QUOTE_VERSION_NOT_FOUND");
    }

    return mapQuoteVersionRow(updated);
  });
}

export async function updateQuoteVersionPdfFileUrl(
  userId: string,
  id: string,
  pdfFileUrl: string,
) {
  const row = await dbQueryOne<QuoteVersionRow>(
    `UPDATE quote_versions
     SET pdf_file_url = $1
     WHERE id = $2 AND user_id = $3
     RETURNING
       id,
       user_id AS "userId",
       quote_id AS "quoteId",
       version_number AS "versionNumber",
       exported_at AS "exportedAt",
       snapshot_json AS "snapshotJson",
       pdf_file_url AS "pdfFileUrl"`,
    [pdfFileUrl, id, userId],
  );

  if (!row) {
    throw createNotFoundError("QUOTE_VERSION_NOT_FOUND");
  }

  return mapQuoteVersionRow(row);
}
