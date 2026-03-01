"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { type SnippetFormActionState, saveSnippetAction } from "@/app/snippets/actions";

type SnippetFormValues = {
  id?: string;
  type: "intro" | "terms";
  language: "sk" | "en";
  title: string;
  contentMarkdown: string;
};

type SnippetFormProps = {
  mode: "create" | "edit";
  initialValues: SnippetFormValues;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function SaveButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
    >
      {pending ? "Ukladam..." : mode === "create" ? "Vytvorit sablonu" : "Ulozit zmeny"}
    </button>
  );
}

export function SnippetForm({ mode, initialValues }: SnippetFormProps) {
  const initialState: SnippetFormActionState = { status: "idle" };
  const [state, action] = useActionState(saveSnippetAction, initialState);

  return (
    <form
      action={action}
      className="ui-page-section space-y-6"
    >
      {initialValues.id ? <input type="hidden" name="snippet_id" value={initialValues.id} /> : null}

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Udaje sablony</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            Typ
            <select
              name="type"
              required
              defaultValue={initialValues.type}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="intro">Uvod</option>
              <option value="terms">Podmienky</option>
            </select>
            <FieldError message={state.fieldErrors?.type} />
          </label>

          <label className="text-sm text-slate-700">
            Jazyk
            <select
              name="language"
              required
              defaultValue={initialValues.language}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="sk">SK</option>
              <option value="en">EN</option>
            </select>
            <FieldError message={state.fieldErrors?.language} />
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            Nazov
            <input
              name="title"
              type="text"
              required
              defaultValue={initialValues.title}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.title} />
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            Obsah v Markdowne
            <textarea
              name="content_markdown"
              required
              rows={12}
              defaultValue={initialValues.contentMarkdown}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
            />
            <FieldError message={state.fieldErrors?.content_markdown} />
          </label>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {state.status === "error" && state.message ? (
            <p className="text-sm text-red-700">{state.message}</p>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/snippets"
            className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:w-auto"
          >
            Zrusit
          </Link>
          <SaveButton mode={mode} />
        </div>
      </div>
    </form>
  );
}
