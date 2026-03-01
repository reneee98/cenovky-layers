"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  type CatalogFormActionState,
  saveCatalogItemAction,
} from "@/app/catalog/actions";

type CatalogFormValues = {
  id?: string;
  category: string;
  tags: string[];
  name: string;
  description: string | null;
  defaultUnit: "h" | "day" | "pcs" | "pkg";
  defaultUnitPrice: string;
};

type CatalogFormProps = {
  mode: "create" | "edit";
  initialValues: CatalogFormValues;
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
      {pending ? "Ukladam..." : mode === "create" ? "Vytvorit polozku" : "Ulozit zmeny"}
    </button>
  );
}

export function CatalogForm({ mode, initialValues }: CatalogFormProps) {
  const initialFormState: CatalogFormActionState = { status: "idle" };

  const [state, action] = useActionState(saveCatalogItemAction, initialFormState);

  return (
    <form
      action={action}
      className="ui-page-section space-y-6"
    >
      {initialValues.id ? (
        <input type="hidden" name="catalog_item_id" value={initialValues.id} />
      ) : null}

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Katalogova polozka</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            Kategoria
            <input
              name="category"
              type="text"
              required
              defaultValue={initialValues.category}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.category} />
          </label>

          <label className="text-sm text-slate-700">
            Tagy (oddelene ciarkou)
            <input
              name="tags"
              type="text"
              defaultValue={initialValues.tags.join(", ")}
              placeholder="branding, web, copy"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            Nazov
            <input
              name="name"
              type="text"
              required
              defaultValue={initialValues.name}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.name} />
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            Popis (volitelne)
            <textarea
              name="description"
              rows={4}
              defaultValue={initialValues.description ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            Predvolena jednotka
            <select
              name="default_unit"
              required
              defaultValue={initialValues.defaultUnit}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="h">hodina (h)</option>
              <option value="day">den</option>
              <option value="pcs">kus (pcs)</option>
              <option value="pkg">balik (pkg)</option>
            </select>
            <FieldError message={state.fieldErrors?.default_unit} />
          </label>

          <label className="text-sm text-slate-700">
            Predvolena jednotkova cena
            <input
              name="default_unit_price"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={initialValues.defaultUnitPrice}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.default_unit_price} />
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
            href="/catalog"
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
