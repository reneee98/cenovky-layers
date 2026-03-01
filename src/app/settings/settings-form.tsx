"use client";

import Image from "next/image";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  resetNumberingForNewYearAction,
  saveSettingsAction,
} from "@/app/settings/actions";

const INITIAL_SETTINGS_ACTION_STATE: Awaited<ReturnType<typeof saveSettingsAction>> = {
  status: "idle",
};

type SettingsFormValues = {
  companyName: string;
  companyAddress: string;
  companyIco: string | null;
  companyDic: string | null;
  companyIcdph: string | null;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string | null;
  logoUrl: string | null;
  defaultLanguage: "sk" | "en";
  defaultCurrency: string;
  vatRate: string;
  numberingYear: number;
  numberingCounter: number;
};

type SettingsFormProps = {
  settings: SettingsFormValues;
  currentYear: number;
  canResetNumberingYear: boolean;
};

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
    >
      {pending ? "Ukladam..." : "Ulozit nastavenia"}
    </button>
  );
}

function ResetNumberingButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex w-full items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
    >
      {pending ? "Resetujem..." : "Reset pre novy rok"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

export function SettingsForm({
  settings,
  currentYear,
  canResetNumberingYear,
}: SettingsFormProps) {
  const [saveState, saveAction] = useActionState(
    saveSettingsAction,
    INITIAL_SETTINGS_ACTION_STATE,
  );
  const [resetState, resetAction] = useActionState(
    resetNumberingForNewYearAction,
    INITIAL_SETTINGS_ACTION_STATE,
  );

  return (
    <div className="space-y-6">
      <form
        action={saveAction}
        encType="multipart/form-data"
        className="ui-page-section space-y-6"
      >
        <input
          type="hidden"
          name="current_logo_url"
          defaultValue={settings.logoUrl ?? ""}
        />

        <section>
          <h2 className="text-sm font-semibold text-slate-900">Firma a logo</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700 md:col-span-2">
              Nazov firmy
              <input
                required
                name="company_name"
                type="text"
                defaultValue={settings.companyName}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <FieldError message={saveState.fieldErrors?.company_name} />
            </label>

            <label className="text-sm text-slate-700 md:col-span-2">
              Adresa
              <input
                required
                name="company_address"
                type="text"
                defaultValue={settings.companyAddress}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <FieldError message={saveState.fieldErrors?.company_address} />
            </label>

            <label className="text-sm text-slate-700">
              ICO (volitelne)
              <input
                name="company_ico"
                type="text"
                defaultValue={settings.companyIco ?? ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              DIC (volitelne)
              <input
                name="company_dic"
                type="text"
                defaultValue={settings.companyDic ?? ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              ICDPH (volitelne)
              <input
                name="company_icdph"
                type="text"
                defaultValue={settings.companyIcdph ?? ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              Email
              <input
                required
                name="company_email"
                type="email"
                defaultValue={settings.companyEmail}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <FieldError message={saveState.fieldErrors?.company_email} />
            </label>

            <label className="text-sm text-slate-700">
              Telefon
              <input
                required
                name="company_phone"
                type="text"
                defaultValue={settings.companyPhone}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <FieldError message={saveState.fieldErrors?.company_phone} />
            </label>

            <label className="text-sm text-slate-700 md:col-span-2">
              Web (volitelne)
              <input
                name="company_website"
                type="text"
                defaultValue={settings.companyWebsite ?? ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="text-sm text-slate-700 md:col-span-2">
              <span className="block">Logo firmy (volitelne)</span>
              <p className="mt-1 text-xs text-slate-500">
                Toto logo sa zobrazi v lavom hornom rohu exportovaneho PDF.
              </p>
              {settings.logoUrl ? (
                <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                  <Image
                    src={settings.logoUrl}
                    alt="Logo firmy"
                    width={180}
                    height={80}
                    className="h-auto max-h-20 w-auto"
                    unoptimized
                  />
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">Logo este nie je nahrate.</p>
              )}
              <input
                name="logo_file"
                type="file"
                accept="image/*"
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <FieldError message={saveState.fieldErrors?.logo_file} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-900">Predvolby</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <label className="text-sm text-slate-700">
              Predvoleny jazyk
              <select
                required
                name="default_language"
                defaultValue={settings.defaultLanguage}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="sk">SK</option>
                <option value="en">EN</option>
              </select>
              <FieldError message={saveState.fieldErrors?.default_language} />
            </label>

            <label className="text-sm text-slate-700">
              Predvolena mena
              <input
                required
                name="default_currency"
                type="text"
                defaultValue={settings.defaultCurrency}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
              />
              <FieldError message={saveState.fieldErrors?.default_currency} />
            </label>

            <label className="text-sm text-slate-700">
              Sadzba DPH (%)
              <input
                required
                name="vat_rate"
                type="text"
                defaultValue={settings.vatRate}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <FieldError message={saveState.fieldErrors?.vat_rate} />
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-900">Cislovanie ponuk</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Rok cislovania
              <input
                required
                name="numbering_year"
                type="number"
                min={2000}
                max={9999}
                defaultValue={settings.numberingYear}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <FieldError message={saveState.fieldErrors?.numbering_year} />
            </label>

            <label className="text-sm text-slate-700">
              Pocitadlo cislovania
              <input
                required
                name="numbering_counter"
                type="number"
                min={0}
                step={1}
                defaultValue={settings.numberingCounter}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <FieldError message={saveState.fieldErrors?.numbering_counter} />
            </label>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {saveState.status === "success" ? (
              <p className="text-sm text-emerald-700">{saveState.message}</p>
            ) : null}
            {saveState.status === "error" ? (
              <p className="text-sm text-red-700">{saveState.message}</p>
            ) : null}
          </div>
          <SaveButton />
        </div>
      </form>

      <section className="ui-page-section">
        <h2 className="text-sm font-semibold text-slate-900">Prechod na novy rok</h2>
        <p className="mt-2 text-sm text-slate-600">
          Aktualny rok je {currentYear}. Ulozeny rok cislovania je {settings.numberingYear}.
        </p>

        {canResetNumberingYear ? (
          <form action={resetAction} className="mt-4">
            <ResetNumberingButton />
          </form>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            Rok cislovania uz zodpoveda aktualnemu roku.
          </p>
        )}

        {resetState.status === "success" ? (
          <p className="mt-3 text-sm text-emerald-700">{resetState.message}</p>
        ) : null}
        {resetState.status === "error" ? (
          <p className="mt-3 text-sm text-red-700">{resetState.message}</p>
        ) : null}
      </section>
    </div>
  );
}
