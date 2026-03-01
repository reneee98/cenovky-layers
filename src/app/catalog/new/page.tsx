import { CatalogForm } from "@/app/catalog/catalog-form";
import { AppShell } from "@/components/app-shell";

export default function NewCatalogItemPage() {
  return (
    <AppShell
      active="catalog"
      title="Nova katalogova polozka"
      description="Pridaj opakovane pouzitelne cenove predvolby."
    >
      <CatalogForm
        mode="create"
        initialValues={{
          category: "",
          tags: [],
          name: "",
          description: "",
          defaultUnit: "h",
          defaultUnitPrice: "0",
        }}
      />
    </AppShell>
  );
}
