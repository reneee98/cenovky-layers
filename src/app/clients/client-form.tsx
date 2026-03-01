"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  type ClientFormActionState,
  saveClientAction,
} from "@/app/clients/actions";

type ClientFormValues = {
  id?: string;
  type: "company" | "person";
  name: string;
  billingAddressLine1: string;
  billingAddressLine2: string | null;
  city: string;
  zip: string;
  country: string;
  ico: string | null;
  dic: string | null;
  icdph: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
};

type ClientFormProps = {
  mode: "create" | "edit";
  initialValues: ClientFormValues;
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
      {pending ? "Ukladam..." : mode === "create" ? "Vytvorit klienta" : "Ulozit zmeny"}
    </button>
  );
}

export function ClientForm({ mode, initialValues }: ClientFormProps) {
  const initialFormState: ClientFormActionState = { status: "idle" };

  const [state, action] = useActionState(
    saveClientAction,
    initialFormState,
  );

  return (
    <form
      action={action}
      className="ui-page-section space-y-6"
    >
      {initialValues.id ? <input type="hidden" name="client_id" value={initialValues.id} /> : null}

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Udaje klienta</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            Typ
            <select
              name="type"
              required
              defaultValue={initialValues.type}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="company">Firma</option>
              <option value="person">Fyzicka osoba</option>
            </select>
            <FieldError message={state.fieldErrors?.type} />
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
            Fakturacna adresa - riadok 1
            <input
              name="billing_address_line1"
              type="text"
              required
              defaultValue={initialValues.billingAddressLine1}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.billing_address_line1} />
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            Fakturacna adresa - riadok 2 (volitelne)
            <input
              name="billing_address_line2"
              type="text"
              defaultValue={initialValues.billingAddressLine2 ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            Mesto
            <input
              name="city"
              type="text"
              required
              defaultValue={initialValues.city}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.city} />
          </label>

          <label className="text-sm text-slate-700">
            ZIP
            <input
              name="zip"
              type="text"
              required
              defaultValue={initialValues.zip}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.zip} />
          </label>

          <label className="text-sm text-slate-700">
            Krajina
            <input
              name="country"
              type="text"
              required
              defaultValue={initialValues.country}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.country} />
          </label>

          <label className="text-sm text-slate-700">
            ICO (volitelne)
            <input
              name="ico"
              type="text"
              defaultValue={initialValues.ico ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            DIC (volitelne)
            <input
              name="dic"
              type="text"
              defaultValue={initialValues.dic ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            ICDPH (volitelne)
            <input
              name="icdph"
              type="text"
              defaultValue={initialValues.icdph ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Kontaktna osoba</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            Meno kontaktu
            <input
              name="contact_name"
              type="text"
              required
              defaultValue={initialValues.contactName}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.contact_name} />
          </label>

          <label className="text-sm text-slate-700">
            Kontaktna emailova adresa
            <input
              name="contact_email"
              type="email"
              required
              defaultValue={initialValues.contactEmail}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.contact_email} />
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            Kontaktne telefonne cislo (volitelne)
            <input
              name="contact_phone"
              type="text"
              defaultValue={initialValues.contactPhone ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
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
            href="/clients"
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
