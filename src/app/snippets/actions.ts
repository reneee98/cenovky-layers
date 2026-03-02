"use server";

import type { Language as SnippetLanguage, SnippetType as SnippetKind } from "@/types/domain";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth";
import { isDbKnownRequestError } from "@/lib/db-errors";
import { createSnippet, deleteSnippet, updateSnippet } from "@/server/repositories";

type Language = SnippetLanguage;
type SnippetType = SnippetKind;

type SnippetFormFieldErrors = Partial<
  Record<"type" | "language" | "title" | "content_markdown", string>
>;

export type SnippetFormActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: SnippetFormFieldErrors;
};

function readRequiredString(
  formData: FormData,
  field: keyof SnippetFormFieldErrors,
  errors: SnippetFormFieldErrors,
): string {
  const rawValue = formData.get(field);
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!value) {
    errors[field] = "Toto pole je povinne.";
  }

  return value;
}

function buildSnippetsUrl(query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  return `/snippets?${params.toString()}`;
}

export async function saveSnippetAction(
  _previousState: SnippetFormActionState,
  formData: FormData,
): Promise<SnippetFormActionState> {
  const userId = await requireUserId();
  const errors: SnippetFormFieldErrors = {};

  const snippetIdEntry = formData.get("snippet_id");
  const snippetId =
    typeof snippetIdEntry === "string" && snippetIdEntry.trim().length > 0
      ? snippetIdEntry.trim()
      : null;

  const typeEntry = formData.get("type");
  const type =
    typeEntry === "intro" || typeEntry === "terms"
      ? (typeEntry as SnippetType)
      : null;

  if (!type) {
    errors.type = "Vyberte uvod alebo podmienky.";
  }

  const languageEntry = formData.get("language");
  const language =
    languageEntry === "sk" || languageEntry === "en"
      ? (languageEntry as Language)
      : null;

  if (!language) {
    errors.language = "Vyberte SK alebo EN.";
  }

  const title = readRequiredString(formData, "title", errors);
  const contentMarkdown = readRequiredString(formData, "content_markdown", errors);

  if (Object.keys(errors).length > 0 || !type || !language) {
    return {
      status: "error",
      message: "Opravte vyznacene polia.",
      fieldErrors: errors,
    };
  }

  try {
    if (snippetId) {
      await updateSnippet(userId, snippetId, {
        type,
        language,
        title,
        contentMarkdown,
      });
    } else {
      await createSnippet(userId, {
        type,
        language,
        title,
        contentMarkdown,
      });
    }
  } catch (error) {
    if (isDbKnownRequestError(error, "P2025")) {
      return {
        status: "error",
        message: "Sablona nebola najdena.",
      };
    }

    throw error;
  }

  revalidatePath("/snippets");
  revalidatePath("/quotes/new");

  redirect(
    buildSnippetsUrl({
      notice: snippetId ? "Sablona bola upravena." : "Sablona bola vytvorena.",
    }),
  );
}

export async function deleteSnippetAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const snippetIdEntry = formData.get("snippet_id");
  const snippetId =
    typeof snippetIdEntry === "string" && snippetIdEntry.trim().length > 0
      ? snippetIdEntry.trim()
      : null;

  if (!snippetId) {
    redirect(buildSnippetsUrl({ error: "Chyba ID sablony." }));
  }

  try {
    await deleteSnippet(userId, snippetId);
  } catch (error) {
    if (isDbKnownRequestError(error, "P2025")) {
      redirect(buildSnippetsUrl({ error: "Sablona nebola najdena." }));
    }

    throw error;
  }

  revalidatePath("/snippets");
  revalidatePath("/quotes/new");

  redirect(buildSnippetsUrl({ notice: "Sablona bola vymazana." }));
}
