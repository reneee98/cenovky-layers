import type { Prisma } from "@/types/prisma";

import { prisma } from "@/lib/prisma";

export type ListClientsFilters = {
  search?: string;
};

export async function listClients(
  userId: string,
  filters: ListClientsFilters = {},
) {
  const where: Prisma.ClientWhereInput = { userId };

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    where.name = { contains: search };
  }

  return prisma.client.findMany({
    where,
    orderBy: [{ name: "asc" }],
  });
}

export async function getClientById(userId: string, id: string) {
  return prisma.client.findUnique({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
  });
}

export async function createClient(
  userId: string,
  data: Prisma.ClientUncheckedCreateInput,
) {
  return prisma.client.create({
    data: {
      ...data,
      userId,
    },
  });
}

export async function updateClient(
  userId: string,
  id: string,
  data: Prisma.ClientUpdateInput,
) {
  return prisma.client.update({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
    data,
  });
}

export async function deleteClient(userId: string, id: string) {
  return prisma.client.delete({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
  });
}
