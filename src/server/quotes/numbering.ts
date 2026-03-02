import { dbQueryOne, dbTransaction } from "@/lib/db";

function formatQuoteNumber(year: number, counter: number): string {
  return `${year}-${String(counter).padStart(3, "0")}`;
}

export async function reserveNextQuoteNumber(userId: string): Promise<string> {
  return dbTransaction(async (tx) => {
    const settings = await dbQueryOne<{
      numberingYear: number;
      numberingCounter: number;
    }>(
      `SELECT numbering_year AS "numberingYear", numbering_counter AS "numberingCounter"
       FROM settings
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
      tx,
    );

    if (!settings) {
      throw new Error("Settings are not initialized for the current user.");
    }

    let nextCounter = settings.numberingCounter + 1;
    let quoteNumber = formatQuoteNumber(settings.numberingYear, nextCounter);

    for (;;) {
      const existing = await dbQueryOne<{ id: string }>(
        `SELECT id
         FROM quotes
         WHERE user_id = $1 AND number = $2
         LIMIT 1`,
        [userId, quoteNumber],
        tx,
      );

      if (!existing) {
        break;
      }

      nextCounter += 1;
      quoteNumber = formatQuoteNumber(settings.numberingYear, nextCounter);
    }

    await tx.query(
      `UPDATE settings
       SET numbering_counter = $1
       WHERE user_id = $2`,
      [nextCounter, userId],
    );

    return quoteNumber;
  });
}
