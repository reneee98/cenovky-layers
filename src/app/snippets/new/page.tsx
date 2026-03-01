import { SnippetForm } from "@/app/snippets/snippet-form";
import { AppShell } from "@/components/app-shell";

export default function NewSnippetPage() {
  return (
    <AppShell
      active="quotes"
      title="Nova sablona textu"
      description="Vytvor opakovane pouzitelny uvod alebo podmienky v Markdowne."
    >
      <SnippetForm
        mode="create"
        initialValues={{
          type: "intro",
          language: "sk",
          title: "",
          contentMarkdown: "",
        }}
      />
    </AppShell>
  );
}
