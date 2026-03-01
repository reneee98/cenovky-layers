import type { Prisma } from "@/types/prisma";

import { prisma } from "@/lib/prisma";
import { buildDefaultSettingsCreateInput } from "@/server/db/settings-defaults";

const STARTER_SNIPPETS: Array<Pick<Prisma.SnippetUncheckedCreateInput, "type" | "language" | "title" | "contentMarkdown">> = [
  {
    type: "intro",
    language: "sk",
    title: "Uvod - standard",
    contentMarkdown:
      "Dakujeme za zaujem o spolupracu. Pripravili sme pre vas prehlad navrhovanych aktivit, rozsahu a ceny.",
  },
  {
    type: "intro",
    language: "en",
    title: "Intro - standard",
    contentMarkdown:
      "Thank you for your interest in working with us. Below is a clear overview of the proposed scope, timeline, and pricing.",
  },
  {
    type: "terms",
    language: "sk",
    title: "Podmienky - standard",
    contentMarkdown:
      "Splatnost faktury je 14 dni. Prace mimo dohodnuteho rozsahu budu nacenene samostatne po odsuhlaseni.",
  },
  {
    type: "terms",
    language: "en",
    title: "Terms - standard",
    contentMarkdown:
      "Invoice due date is 14 days. Work outside the agreed scope is quoted separately after approval.",
  },
  {
    type: "intro",
    language: "sk",
    title: "Uvod - web projekt",
    contentMarkdown:
      "Tato ponuka pokryva analyzu, navrh rozhrania a implementaciu weboveho riesenia v dohodnutom rozsahu.",
  },
  {
    type: "terms",
    language: "sk",
    title: "Podmienky - projekt",
    contentMarkdown:
      "Cena obsahuje 2 kola revizii. Dodanie prebieha etapovo po odsuhlaseni medzivystupov.",
  },
];

const STARTER_CATALOG_ITEMS: Array<Pick<Prisma.CatalogItemUncheckedCreateInput, "category" | "tags" | "name" | "description" | "defaultUnit" | "defaultUnitPrice">> = [
  {
    category: "Strategy",
    tags: ["workshop", "analysis"],
    name: "Discovery workshop",
    description: "Kick-off workshop and requirements alignment.",
    defaultUnit: "h",
    defaultUnitPrice: 65,
  },
  {
    category: "Design",
    tags: ["ui", "ux"],
    name: "UI design",
    description: "Design of pages/components based on approved direction.",
    defaultUnit: "h",
    defaultUnitPrice: 58,
  },
  {
    category: "Development",
    tags: ["frontend", "implementation"],
    name: "Frontend implementation",
    description: "Implementation of approved designs into production code.",
    defaultUnit: "h",
    defaultUnitPrice: 72,
  },
];

export async function ensureUserBootstrapData(userId: string): Promise<void> {
  await prisma.settings.upsert({
    where: { userId },
    create: buildDefaultSettingsCreateInput(userId),
    update: {},
  });

  const [snippetCount, catalogCount] = await Promise.all([
    prisma.snippet.count({ where: { userId } }),
    prisma.catalogItem.count({ where: { userId } }),
  ]);

  if (snippetCount === 0) {
    await prisma.snippet.createMany({
      data: STARTER_SNIPPETS.map((snippet) => ({
        userId,
        ...snippet,
      })),
    });
  }

  if (catalogCount === 0) {
    await prisma.catalogItem.createMany({
      data: STARTER_CATALOG_ITEMS.map((item) => ({
        userId,
        ...item,
      })),
    });
  }
}
