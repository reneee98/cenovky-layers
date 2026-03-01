import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { CatalogForm } from "@/app/catalog/catalog-form";
import { AppShell } from "@/components/app-shell";
import { getCatalogItemById } from "@/server/repositories";

function extractTags(tagsValue: Prisma.JsonValue): string[] {
  if (!Array.isArray(tagsValue)) {
    return [];
  }

  return tagsValue.filter((entry): entry is string => typeof entry === "string");
}

type EditCatalogItemPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCatalogItemPage({ params }: EditCatalogItemPageProps) {
  const { id } = await params;
  const item = await getCatalogItemById(id);

  if (!item) {
    notFound();
  }

  return (
    <AppShell
      active="catalog"
      title="Upravit katalogovu polozku"
      description="Uprava opakovane pouzitelnych cenovych predvolieb."
    >
      <CatalogForm
        mode="edit"
        initialValues={{
          id: item.id,
          category: item.category,
          tags: extractTags(item.tags),
          name: item.name,
          description: item.description,
          defaultUnit: item.defaultUnit,
          defaultUnitPrice: item.defaultUnitPrice.toString(),
        }}
      />
    </AppShell>
  );
}
