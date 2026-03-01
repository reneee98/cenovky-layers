import { notFound } from "next/navigation";

import { SnippetForm } from "@/app/snippets/snippet-form";
import { AppShell } from "@/components/app-shell";
import { getSnippetById } from "@/server/repositories";

type EditSnippetPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSnippetPage({ params }: EditSnippetPageProps) {
  const { id } = await params;
  const snippet = await getSnippetById(id);

  if (!snippet) {
    notFound();
  }

  return (
    <AppShell
      active="quotes"
      title="Upravit sablonu textu"
      description="Uprava opakovane pouzitelneho markdown obsahu."
    >
      <SnippetForm
        mode="edit"
        initialValues={{
          id: snippet.id,
          type: snippet.type,
          language: snippet.language,
          title: snippet.title,
          contentMarkdown: snippet.contentMarkdown,
        }}
      />
    </AppShell>
  );
}
