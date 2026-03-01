import type { Prisma } from "@/types/prisma";

import { prisma } from "@/lib/prisma";

export type ReplaceQuoteItemInput = Omit<
  Prisma.QuoteItemUncheckedCreateInput,
  "quoteId" | "userId"
>;

export async function listQuoteItems(userId: string, quoteId: string) {
  return prisma.quoteItem.findMany({
    where: {
      userId,
      quoteId,
    },
    orderBy: [{ sortOrder: "asc" }],
  });
}

export async function createQuoteItem(
  userId: string,
  data: Omit<Prisma.QuoteItemUncheckedCreateInput, "userId">,
) {
  return prisma.quoteItem.create({
    data: {
      ...data,
      userId,
    },
  });
}

export async function updateQuoteItem(
  userId: string,
  id: string,
  data: Prisma.QuoteItemUpdateInput,
) {
  return prisma.quoteItem.update({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
    data,
  });
}

export async function deleteQuoteItem(userId: string, id: string) {
  return prisma.quoteItem.delete({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
  });
}

export async function replaceQuoteItems(
  userId: string,
  quoteId: string,
  items: ReplaceQuoteItemInput[],
) {
  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({
      where: {
        userId,
        quoteId,
      },
    });

    if (items.length > 0) {
      await tx.quoteItem.createMany({
        data: items.map((item) => ({
          ...item,
          userId,
          quoteId,
        })),
      });
    }
  });

  return listQuoteItems(userId, quoteId);
}
