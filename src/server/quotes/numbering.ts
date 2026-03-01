import { prisma } from "@/lib/prisma";

function formatQuoteNumber(year: number, counter: number): string {
  return `${year}-${String(counter).padStart(3, "0")}`;
}

export async function reserveNextQuoteNumber(userId: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const settings = await tx.settings.findUnique({
      where: { userId },
    });

    if (!settings) {
      throw new Error("Settings are not initialized for the current user.");
    }

    let nextCounter = settings.numberingCounter + 1;
    let quoteNumber = formatQuoteNumber(settings.numberingYear, nextCounter);

    for (;;) {
      const existing = await tx.quote.findFirst({
        where: {
          userId,
          number: quoteNumber,
        },
        select: { id: true },
      });

      if (!existing) {
        break;
      }

      nextCounter += 1;
      quoteNumber = formatQuoteNumber(settings.numberingYear, nextCounter);
    }

    await tx.settings.update({
      where: { userId },
      data: {
        numberingCounter: nextCounter,
      },
    });

    return quoteNumber;
  });
}
