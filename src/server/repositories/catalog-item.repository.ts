import type { Prisma } from "@/types/prisma";

import { prisma } from "@/lib/prisma";

export type ListCatalogItemFilters = {
  category?: string;
  tag?: string;
  search?: string;
};

function jsonArrayContainsTag(tags: Prisma.JsonValue, tag: string): boolean {
  if (!Array.isArray(tags)) {
    return false;
  }

  return tags.some((entry) => {
    return typeof entry === "string" && entry.toLowerCase() === tag.toLowerCase();
  });
}

export async function listCatalogItems(
  userId: string,
  filters: ListCatalogItemFilters = {},
) {
  const where: Prisma.CatalogItemWhereInput = { userId };

  if (filters.category?.trim()) {
    where.category = filters.category.trim();
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const items = await prisma.catalogItem.findMany({
    where,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  if (!filters.tag?.trim()) {
    return items;
  }

  const tag = filters.tag.trim();

  return items.filter((item) => jsonArrayContainsTag(item.tags, tag));
}

export async function getCatalogItemById(userId: string, id: string) {
  return prisma.catalogItem.findUnique({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
  });
}

export async function createCatalogItem(
  userId: string,
  data: Prisma.CatalogItemUncheckedCreateInput,
) {
  return prisma.catalogItem.create({
    data: {
      ...data,
      userId,
    },
  });
}

export async function updateCatalogItem(
  userId: string,
  id: string,
  data: Prisma.CatalogItemUpdateInput,
) {
  return prisma.catalogItem.update({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
    data,
  });
}

export async function deleteCatalogItem(userId: string, id: string) {
  return prisma.catalogItem.delete({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
  });
}

export async function listCatalogFacets(userId: string): Promise<{
  categories: string[];
  tags: string[];
}> {
  const items = await prisma.catalogItem.findMany({
    where: { userId },
    select: {
      category: true,
      tags: true,
    },
  });

  const categories = Array.from(
    new Set(
      items
        .map((item) => item.category.trim())
        .filter((category) => category.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const tags = Array.from(
    new Set(
      items.flatMap((item) => {
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
