import { prisma } from "@/lib/prisma";
import { SETTINGS_SINGLETON_ID } from "@/server/db/settings-defaults";

function formatQuoteNumber(year: number, counter: number): string {
  return `${year}-${String(counter).padStart(3, "0")}`;
}

export async function reserveNextQuoteNumber(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const settings = await tx.settings.findUnique({
      where: { id: SETTINGS_SINGLETON_ID },
    });

    if (!settings) {
      throw new Error("Settings are not initialized.");
    }

    let nextCounter = settings.numberingCounter + 1;
    let quoteNumber = formatQuoteNumber(settings.numberingYear, nextCounter);

    for (;;) {
      const existing = await tx.quote.findUnique({
        where: { number: quoteNumber },
        select: { id: true },
      });

      if (!existing) {
        break;
      }

      nextCounter += 1;
      quoteNumber = formatQuoteNumber(settings.numberingYear, nextCounter);
    }

    await tx.settings.update({
      where: { id: SETTINGS_SINGLETON_ID },
      data: {
        numberingCounter: nextCounter,
      },
    });

    return quoteNumber;
  });
}
