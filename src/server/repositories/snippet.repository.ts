import type { Language, SnippetType } from "@/types/domain";
import type { Prisma } from "@/types/prisma";

import { prisma } from "@/lib/prisma";

export type ListSnippetFilters = {
  type?: SnippetType;
  language?: Language;
};

export async function listSnippets(
  userId: string,
  filters: ListSnippetFilters = {},
) {
  const where: Prisma.SnippetWhereInput = { userId };

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

export async function getSnippetById(userId: string, id: string) {
  return prisma.snippet.findUnique({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
  });
}

export async function createSnippet(
  userId: string,
  data: Omit<Prisma.SnippetUncheckedCreateInput, "userId">,
) {
  return prisma.snippet.create({
    data: {
      ...data,
      userId,
    },
  });
}

export async function updateSnippet(
  userId: string,
  id: string,
  data: Prisma.SnippetUpdateInput,
) {
  return prisma.snippet.update({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
    data,
  });
}

export async function deleteSnippet(userId: string, id: string) {
  return prisma.snippet.delete({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
  });
}
