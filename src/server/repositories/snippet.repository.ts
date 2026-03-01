import { Prisma, Snippet } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type Language = Prisma.$Enums.Language;
type SnippetType = Prisma.$Enums.SnippetType;

export type ListSnippetFilters = {
  type?: SnippetType;
  language?: Language;
};

export async function listSnippets(
  filters: ListSnippetFilters = {},
): Promise<Snippet[]> {
  const where: Prisma.SnippetWhereInput = {};

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.language) {
    where.language = filters.language;
  }

  return prisma.snippet.findMany({
    where,
    orderBy: [{ type: "asc" }, { language: "asc" }, { title: "asc" }],
  });
}

export async function getSnippetById(id: string): Promise<Snippet | null> {
  return prisma.snippet.findUnique({ where: { id } });
}

export async function createSnippet(
  data: Prisma.SnippetUncheckedCreateInput,
): Promise<Snippet> {
  return prisma.snippet.create({ data });
}

export async function updateSnippet(
  id: string,
  data: Prisma.SnippetUpdateInput,
): Promise<Snippet> {
  return prisma.snippet.update({
    where: { id },
    data,
  });
}

export async function deleteSnippet(id: string): Promise<Snippet> {
  return prisma.snippet.delete({ where: { id } });
}
