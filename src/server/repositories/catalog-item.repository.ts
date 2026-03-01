import { CatalogItem, Prisma } from "@prisma/client";

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
  filters: ListCatalogItemFilters = {},
): Promise<CatalogItem[]> {
  const where: Prisma.CatalogItemWhereInput = {};

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

export async function getCatalogItemById(id: string): Promise<CatalogItem | null> {
  return prisma.catalogItem.findUnique({ where: { id } });
}

export async function createCatalogItem(
  data: Prisma.CatalogItemUncheckedCreateInput,
): Promise<CatalogItem> {
  return prisma.catalogItem.create({ data });
}

export async function updateCatalogItem(
  id: string,
  data: Prisma.CatalogItemUpdateInput,
): Promise<CatalogItem> {
  return prisma.catalogItem.update({
    where: { id },
    data,
  });
}

export async function deleteCatalogItem(id: string): Promise<CatalogItem> {
  return prisma.catalogItem.delete({ where: { id } });
}

export async function listCatalogFacets(): Promise<{
  categories: string[];
  tags: string[];
}> {
  const items = await prisma.catalogItem.findMany({
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
