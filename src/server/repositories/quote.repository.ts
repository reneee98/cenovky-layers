import type { QuoteStatus } from "@/types/domain";
import type { Prisma } from "@/types/prisma";

import { prisma } from "@/lib/prisma";

export type ListQuotesFilters = {
  status?: QuoteStatus;
  clientId?: string;
  currency?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
};

function buildQuoteListWhere(
  userId: string,
  filters: ListQuotesFilters,
): Prisma.QuoteWhereInput {
  const where: Prisma.QuoteWhereInput = { userId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters.currency?.trim()) {
    where.currency = filters.currency.trim();
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      gte: filters.dateFrom,
      lte: filters.dateTo,
    };
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    where.OR = [
      { number: { contains: search } },
      { title: { contains: search } },
      { client: { name: { contains: search } } },
    ];
  }

  return where;
}

export async function listQuotes(
  userId: string,
  filters: ListQuotesFilters = {},
) {
  return prisma.quote.findMany({
    where: buildQuoteListWhere(userId, filters),
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function listQuotesWithDetails(
  userId: string,
  filters: ListQuotesFilters = {},
) {
  return prisma.quote.findMany({
    where: buildQuoteListWhere(userId, filters),
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      items: {
        select: {
          qty: true,
          unitPrice: true,
          discountPct: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function listQuoteCurrencies(userId: string): Promise<string[]> {
  const rows = await prisma.quote.findMany({
    where: { userId },
    select: { currency: true },
    distinct: ["currency"],
    orderBy: [{ currency: "asc" }],
  });

  return rows.map((row) => row.currency);
}

export async function getQuoteById(userId: string, id: string) {
  return prisma.quote.findUnique({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
  });
}

export async function getQuoteWithRelations(userId: string, id: string) {
  return prisma.quote.findUnique({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
    include: {
      client: true,
      items: {
        orderBy: [{ sortOrder: "asc" }],
      },
      scopeItems: {
        orderBy: [{ sortOrder: "asc" }],
      },
    },
  });
}

export async function createQuote(
  userId: string,
  data: Omit<Prisma.QuoteUncheckedCreateInput, "userId">,
) {
  return prisma.quote.create({
    data: {
      ...data,
      userId,
    },
  });
}

export async function updateQuote(
  userId: string,
  id: string,
  data: Prisma.QuoteUpdateInput,
) {
  return prisma.quote.update({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
    data,
  });
}

export async function deleteQuote(userId: string, id: string) {
  return prisma.quote.delete({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
  });
}

export async function setQuoteStatus(
  userId: string,
  id: string,
  status: QuoteStatus,
) {
  return prisma.quote.update({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
    data: { status },
  });
}

export async function duplicateQuote(
  userId: string,
  quoteId: string,
  newNumber: string,
) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.quote.findUnique({
      where: {
        id_userId: {
          id: quoteId,
          userId,
        },
      },
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }],
        },
        scopeItems: {
          orderBy: [{ sortOrder: "asc" }],
        },
      },
    });

    if (!source) {
      throw new Error(`Quote not found: ${quoteId}`);
    }

    const duplicatedQuote = await tx.quote.create({
      data: {
        userId,
        number: newNumber,
        title: `${source.title} (Copy)`,
        status: "draft",
        clientId: source.clientId,
        language: source.language,
        currency: source.currency,
        validUntil: source.validUntil,
        vatEnabled: source.vatEnabled,
        vatRate: source.vatRate,
        showClientDetailsInPdf: source.showClientDetailsInPdf,
        showCompanyDetailsInPdf: source.showCompanyDetailsInPdf,
        introContentMarkdown: source.introContentMarkdown,
        termsContentMarkdown: source.termsContentMarkdown,
        revisionsIncluded: source.revisionsIncluded,
        totalDiscountType: source.totalDiscountType,
        totalDiscountValue: source.totalDiscountValue,
      },
    });

    if (source.items.length > 0) {
      await tx.quoteItem.createMany({
        data: source.items.map((item) => ({
          userId,
          quoteId: duplicatedQuote.id,
          name: item.name,
          description: item.description,
          unit: item.unit,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discountPct: item.discountPct,
          sortOrder: item.sortOrder,
        })),
      });
    }

    if (source.scopeItems.length > 0) {
      await tx.scopeItem.createMany({
        data: source.scopeItems.map((item) => ({
          userId,
          quoteId: duplicatedQuote.id,
          category: item.category,
          itemKey: item.itemKey,
          label: item.label,
          description: item.description,
          sortOrder: item.sortOrder,
        })),
      });
    }

    return duplicatedQuote;
  });
}
