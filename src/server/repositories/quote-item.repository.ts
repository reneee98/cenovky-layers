import { Prisma, QuoteItem } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ReplaceQuoteItemInput = Omit<
  Prisma.QuoteItemUncheckedCreateInput,
  "quoteId"
>;

export async function listQuoteItems(quoteId: string): Promise<QuoteItem[]> {
  return prisma.quoteItem.findMany({
    where: { quoteId },
    orderBy: [{ sortOrder: "asc" }],
  });
}

export async function createQuoteItem(
  data: Prisma.QuoteItemUncheckedCreateInput,
): Promise<QuoteItem> {
  return prisma.quoteItem.create({ data });
}

export async function updateQuoteItem(
  id: string,
  data: Prisma.QuoteItemUpdateInput,
): Promise<QuoteItem> {
  return prisma.quoteItem.update({
    where: { id },
    data,
  });
}

export async function deleteQuoteItem(id: string): Promise<QuoteItem> {
  return prisma.quoteItem.delete({ where: { id } });
}

export async function replaceQuoteItems(
  quoteId: string,
  items: ReplaceQuoteItemInput[],
): Promise<QuoteItem[]> {
  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId } });

    if (items.length > 0) {
      await tx.quoteItem.createMany({
        data: items.map((item) => ({
          ...item,
          quoteId,
        })),
      });
    }
  });

  return listQuoteItems(quoteId);
}
