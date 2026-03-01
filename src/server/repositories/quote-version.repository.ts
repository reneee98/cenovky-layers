import { Prisma, QuoteVersion } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function listQuoteVersions(quoteId: string): Promise<QuoteVersion[]> {
  return prisma.quoteVersion.findMany({
    where: { quoteId },
    orderBy: [{ versionNumber: "desc" }],
  });
}

export async function getQuoteVersionById(
  id: string,
): Promise<QuoteVersion | null> {
  return prisma.quoteVersion.findUnique({ where: { id } });
}

export async function createQuoteVersion(
  data: Prisma.QuoteVersionUncheckedCreateInput,
): Promise<QuoteVersion> {
  return prisma.quoteVersion.create({ data });
}

export async function createNextQuoteVersion(
  quoteId: string,
  snapshotJson: Prisma.InputJsonValue,
  pdfFileUrl: string,
): Promise<QuoteVersion> {
  return prisma.$transaction(async (tx) => {
    const latestVersion = await tx.quoteVersion.findFirst({
      where: { quoteId },
      orderBy: [{ versionNumber: "desc" }],
      select: { versionNumber: true },
    });

    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    return tx.quoteVersion.create({
      data: {
        quoteId,
        versionNumber: nextVersionNumber,
        snapshotJson,
        pdfFileUrl,
      },
    });
  });
}

export async function createOrReplaceSingleQuoteVersion(
  quoteId: string,
  snapshotJson: Prisma.InputJsonValue,
  pdfFileUrl: string,
): Promise<QuoteVersion> {
  return prisma.$transaction(async (tx) => {
    const existingVersion = await tx.quoteVersion.findFirst({
      where: { quoteId },
      orderBy: [{ exportedAt: "desc" }],
      select: { id: true },
    });

    if (!existingVersion) {
      return tx.quoteVersion.create({
        data: {
          quoteId,
          versionNumber: 1,
          snapshotJson,
          pdfFileUrl,
        },
      });
    }

    await tx.quoteVersion.deleteMany({
      where: {
        quoteId,
        id: { not: existingVersion.id },
      },
    });

    return tx.quoteVersion.update({
      where: { id: existingVersion.id },
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
  id: string,
  pdfFileUrl: string,
): Promise<QuoteVersion> {
  return prisma.quoteVersion.update({
    where: { id },
    data: { pdfFileUrl },
  });
}
