"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  type ClientFormActionState,
  saveClientAction,
} from "@/app/clients/actions";

type ClientFormValues = {
  id?: string;
  type: "company" | "sole_trader" | "person";
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
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  billingStreet: string | null;
  billingCity: string | null;
  billingZip: string | null;
  billingCountry: string | null;
  icDph: string | null;
  vatPayer: boolean;
  taxRegimeDefault: string | null;
  defaultCurrency: string | null;
  defaultDueDays: number | null;
  defaultPaymentMethod: string | null;
  notes: string | null;
};

type ClientFormProps = {
  mode: "create" | "edit";
  initialValues: ClientFormValues;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function SaveButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="inline-flex w-full justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
    >
      {pending ? "Ukladam..." : mode === "create" ? "Vytvorit klienta" : "Ulozit zmeny"}
    </button>
  );
}

function FormSection({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function ClientForm({ mode, initialValues }: ClientFormProps) {
  const [state, action] = useActionState(saveClientAction, { status: "idle" } as ClientFormActionState);
  const [clientType, setClientType] = useState<"company" | "sole_trader" | "person">(initialValues.type);

  return (
    <form action={action} className="space-y-6">
      {initialValues.id ? (
        <input type="hidden" name="client_id" value={initialValues.id} />
      ) : null}

      {/* 1. Basic information */}
      <FormSection title="1. Zakladne udaje">
        <label className="text-sm text-slate-700 md:col-span-2">
          Typ klienta
          <select
            name="type"
            required
            value={clientType}
            onChange={(e) => setClientType(e.target.value as "company" | "sole_trader" | "person")}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="company">Firma</option>
            <option value="sole_trader">Zivnostnik</option>
            <option value="person">Fyzicka osoba</option>
          </select>
          <FieldError message={state.fieldErrors?.type} />
        </label>

        {(clientType === "company" || clientType === "sole_trader") && (
          <label className="text-sm text-slate-700 md:col-span-2">
            Nazov firmy
            <input
              name="company_name"
              type="text"
              defaultValue={initialValues.companyName ?? initialValues.name ?? ""}
              placeholder="napr. Acme s.r.o."
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <FieldError message={state.fieldErrors?.company_name} />
          </label>
        )}

        {clientType === "person" && (
          <>
            <label className="text-sm text-slate-700">
              Krstne meno
              <input
                name="first_name"
                type="text"
                defaultValue={initialValues.firstName ?? ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <FieldError message={state.fieldErrors?.first_name} />
            </label>
            <label className="text-sm text-slate-700">
              Priezvisko
              <input
                name="last_name"
                type="text"
                defaultValue={initialValues.lastName ?? ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <FieldError message={state.fieldErrors?.last_name} />
            </label>
          </>
        )}

        <label className="text-sm text-slate-700">
          Kontaktna osoba
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
          Email
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
          Telefon (volitelne)
          <input
            name="contact_phone"
            type="text"
            defaultValue={initialValues.contactPhone ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </FormSection>

      {/* 2. Billing address */}
      <FormSection title="2. Fakturacna adresa">
        <label className="text-sm text-slate-700 md:col-span-2">
          Ulica a cislo
          <input
            name="billing_street"
            type="text"
            defaultValue={
              initialValues.billingStreet ??
              initialValues.billingAddressLine1 ??
              ""
            }
            placeholder="napr. Hlavna 1"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <FieldError message={state.fieldErrors?.billing_street} />
        </label>
        <label className="text-sm text-slate-700">
          Mesto
          <input
            name="billing_city"
            type="text"
            defaultValue={initialValues.billingCity ?? initialValues.city ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <FieldError message={state.fieldErrors?.billing_city} />
        </label>
        <label className="text-sm text-slate-700">
          PSC
          <input
            name="billing_zip"
            type="text"
            defaultValue={initialValues.billingZip ?? initialValues.zip ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <FieldError message={state.fieldErrors?.billing_zip} />
        </label>
        <label className="text-sm text-slate-700 md:col-span-2">
          Krajina
          <input
            name="billing_country"
            type="text"
            defaultValue={initialValues.billingCountry ?? initialValues.country ?? ""}
            placeholder="napr. Slovensko"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <FieldError message={state.fieldErrors?.billing_country} />
        </label>
      </FormSection>

      {/* 3. Company / tax details */}
      <FormSection title="3. Firma a dane">
        <label className="text-sm text-slate-700">
          ICO
          <input
            name="ico"
            type="text"
            defaultValue={initialValues.ico ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-slate-700">
          DIC
          <input
            name="dic"
            type="text"
            defaultValue={initialValues.dic ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-slate-700">
          IC DPH
          <input
            name="ic_dph"
            type="text"
            defaultValue={initialValues.icDph ?? initialValues.icdph ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            name="vat_payer"
            type="checkbox"
            defaultChecked={initialValues.vatPayer}
            className="h-4 w-4 rounded border-slate-300"
          />
          Platca DPH
        </label>
        <label className="text-sm text-slate-700 md:col-span-2">
          Predvoleny danovy rezim (volitelne)
          <input
            name="tax_regime_default"
            type="text"
            defaultValue={initialValues.taxRegimeDefault ?? ""}
            placeholder="napr. standard"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </FormSection>

      {/* 4. Billing defaults */}
      <FormSection title="4. Predvolenky pre faktury">
        <label className="text-sm text-slate-700">
          Predvolena mena
          <input
            name="default_currency"
            type="text"
            defaultValue={initialValues.defaultCurrency ?? ""}
            placeholder="EUR"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
          />
        </label>
        <label className="text-sm text-slate-700">
          Splatnost (pocet dni)
          <input
            name="default_due_days"
            type="number"
            min={0}
            max={365}
            defaultValue={initialValues.defaultDueDays ?? 14}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <FieldError message={state.fieldErrors?.default_due_days} />
        </label>
        <label className="text-sm text-slate-700 md:col-span-2">
          Predvolena metoda platby
          <input
            name="default_payment_method"
            type="text"
            defaultValue={initialValues.defaultPaymentMethod ?? "bank_transfer"}
            placeholder="napr. bankovy prevod"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-slate-700 md:col-span-2">
          Poznamky (pre faktury)
          <textarea
            name="notes"
            rows={3}
            defaultValue={initialValues.notes ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </FormSection>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {state.status === "error" && state.message ? (
            <p className="text-sm text-red-700">{state.message}</p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/clients"
            className="inline-flex w-full justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:w-auto"
          >
            Zrusit
          </Link>
          <SaveButton mode={mode} />
        </div>
      </div>
    </form>
  );
}
