import type { Prisma } from "@/types/prisma";

import { prisma } from "@/lib/prisma";

export async function listQuoteVersions(userId: string, quoteId: string) {
  return prisma.quoteVersion.findMany({
    where: {
      userId,
      quoteId,
    },
    orderBy: [{ versionNumber: "desc" }],
  });
}

export async function getQuoteVersionById(
  userId: string,
  id: string,
) {
  return prisma.quoteVersion.findUnique({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
  });
}

export async function createQuoteVersion(
  userId: string,
  data: Prisma.QuoteVersionUncheckedCreateInput,
) {
  return prisma.quoteVersion.create({
    data: {
      ...data,
      userId,
    },
  });
}

export async function createNextQuoteVersion(
  userId: string,
  quoteId: string,
  snapshotJson: Prisma.InputJsonValue,
  pdfFileUrl: string,
) {
  return prisma.$transaction(async (tx) => {
    const latestVersion = await tx.quoteVersion.findFirst({
      where: {
        userId,
        quoteId,
      },
      orderBy: [{ versionNumber: "desc" }],
      select: { versionNumber: true },
    });

    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    return tx.quoteVersion.create({
      data: {
        userId,
        quoteId,
        versionNumber: nextVersionNumber,
        snapshotJson,
        pdfFileUrl,
      },
    });
  });
}

export async function createOrReplaceSingleQuoteVersion(
  userId: string,
  quoteId: string,
  snapshotJson: Prisma.InputJsonValue,
  pdfFileUrl: string,
) {
  return prisma.$transaction(async (tx) => {
    const existingVersion = await tx.quoteVersion.findFirst({
      where: {
        userId,
        quoteId,
      },
      orderBy: [{ exportedAt: "desc" }],
      select: { id: true },
    });

    if (!existingVersion) {
      return tx.quoteVersion.create({
        data: {
          userId,
          quoteId,
          versionNumber: 1,
          snapshotJson,
          pdfFileUrl,
        },
      });
    }

    await tx.quoteVersion.deleteMany({
      where: {
        userId,
        quoteId,
        id: { not: existingVersion.id },
      },
    });

    return tx.quoteVersion.update({
      where: {
        id_userId: {
          id: existingVersion.id,
          userId,
        },
      },
      data: {
        versionNumber: 1,
        snapshotJson,
        pdfFileUrl,
        exportedAt: new Date(),
      },
    });
  });
}

export async function updateQuoteVersionPdfFileUrl(
  userId: string,
  id: string,
  pdfFileUrl: string,
) {
  return prisma.quoteVersion.update({
    where: {
      id_userId: {
        id,
        userId,
      },
    },
    data: { pdfFileUrl },
  });
}
