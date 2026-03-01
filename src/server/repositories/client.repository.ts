import { Client } from "@prisma/client";
import type { Prisma } from "@/types/prisma";

import { prisma } from "@/lib/prisma";

export type ListClientsFilters = {
  search?: string;
};

export async function listClients(
  filters: ListClientsFilters = {},
): Promise<Client[]> {
  const where: Prisma.ClientWhereInput = {};

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    where.name = { contains: search };
  }

  return prisma.client.findMany({
    where,
    orderBy: [{ name: "asc" }],
  });
}

export async function getClientById(id: string): Promise<Client | null> {
  return prisma.client.findUnique({ where: { id } });
}

export async function createClient(
  data: Prisma.ClientUncheckedCreateInput,
): Promise<Client> {
  return prisma.client.create({ data });
}

export async function updateClient(
  id: string,
  data: Prisma.ClientUpdateInput,
): Promise<Client> {
  return prisma.client.update({
    where: { id },
    data,
  });
}

export async function deleteClient(id: string): Promise<Client> {
  return prisma.client.delete({ where: { id } });
}
