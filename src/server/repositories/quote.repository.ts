import { Prisma, Quote } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type QuoteStatus = Prisma.$Enums.QuoteStatus;

export type ListQuotesFilters = {
  status?: QuoteStatus;
  clientId?: string;
  currency?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
};

function buildQuoteListWhere(filters: ListQuotesFilters): Prisma.QuoteWhereInput {
  const where: Prisma.QuoteWhereInput = {};

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
  filters: ListQuotesFilters = {},
): Promise<Quote[]> {
  return prisma.quote.findMany({
    where: buildQuoteListWhere(filters),
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function listQuotesWithDetails(
  filters: ListQuotesFilters = {},
) {
  return prisma.quote.findMany({
    where: buildQuoteListWhere(filters),
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

export async function listQuoteCurrencies(): Promise<string[]> {
  const rows = await prisma.quote.findMany({
    select: { currency: true },
    distinct: ["currency"],
    orderBy: [{ currency: "asc" }],
  });

  return rows.map((row) => row.currency);
}

export async function getQuoteById(id: string): Promise<Quote | null> {
  return prisma.quote.findUnique({
    where: { id },
  });
}

export async function getQuoteWithRelations(id: string) {
  return prisma.quote.findUnique({
    where: { id },
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
  data: Prisma.QuoteUncheckedCreateInput,
): Promise<Quote> {
  return prisma.quote.create({ data });
}

export async function updateQuote(
  id: string,
  data: Prisma.QuoteUpdateInput,
): Promise<Quote> {
  return prisma.quote.update({
    where: { id },
    data,
  });
}

export async function deleteQuote(id: string): Promise<Quote> {
  return prisma.quote.delete({ where: { id } });
}

export async function setQuoteStatus(
  id: string,
  status: QuoteStatus,
): Promise<Quote> {
  return prisma.quote.update({
    where: { id },
    data: { status },
  });
}

export async function duplicateQuote(
  quoteId: string,
  newNumber: string,
): Promise<Quote> {
  return prisma.$transaction(async (tx) => {
    const source = await tx.quote.findUnique({
      where: { id: quoteId },
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
