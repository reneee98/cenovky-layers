"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth";
import {
  createClient,
  deleteClient,
  updateClient,
} from "@/server/repositories";
import { isDbKnownRequestError } from "@/lib/db-errors";

type ClientFormFieldErrors = Partial<
  Record<
    | "type"
    | "name"
    | "company_name"
    | "first_name"
    | "last_name"
    | "default_due_days"
    | "billing_street"
    | "billing_city"
    | "billing_zip"
    | "billing_country"
    | "billing_address_line1"
    | "city"
    | "zip"
    | "country"
    | "contact_name"
    | "contact_email",
    string
  >
>;

export type ClientFormActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: ClientFormFieldErrors;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readRequiredString(
  formData: FormData,
  field: keyof ClientFormFieldErrors,
  errors: ClientFormFieldErrors,
): string {
  const rawValue = formData.get(field);
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!value) {
    errors[field] = "Toto pole je povinne.";
  }

  return value;
}

function readOptionalString(formData: FormData, field: string): string | null {
  const rawValue = formData.get(field);
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  return value.length > 0 ? value : null;
}

function buildClientsUrl(query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  return `/clients?${params.toString()}`;
}

export async function saveClientAction(
  _previousState: ClientFormActionState,
  formData: FormData,
): Promise<ClientFormActionState> {
  const userId = await requireUserId();
  const errors: ClientFormFieldErrors = {};

  const clientIdEntry = formData.get("client_id");
  const clientId =
    typeof clientIdEntry === "string" && clientIdEntry.trim().length > 0
      ? clientIdEntry.trim()
      : null;

  const typeEntry = formData.get("type");
  const type =
    typeEntry === "company" || typeEntry === "sole_trader" || typeEntry === "person"
      ? typeEntry
      : null;

  if (!type) {
    errors.type = "Vyberte firmu, zivnostnika alebo fyzicku osobu.";
  }

  const companyName = readOptionalString(formData, "company_name");
  const firstName = readOptionalString(formData, "first_name");
  const lastName = readOptionalString(formData, "last_name");

  if (type === "company" || type === "sole_trader") {
    if (!companyName || companyName.trim().length === 0) {
      errors.company_name = "Nazov firmy je povinny.";
    }
  }

  if (type === "person") {
    if (!firstName || firstName.trim().length === 0) {
      errors.first_name = "Krstne meno je povinne.";
    }
    if (!lastName || lastName.trim().length === 0) {
      errors.last_name = "Priezvisko je povinne.";
    }
  }

  const contactName = readRequiredString(formData, "contact_name", errors);
  const contactEmail = readRequiredString(formData, "contact_email", errors);

  const billingStreet = readOptionalString(formData, "billing_street");
  const billingCity = readOptionalString(formData, "billing_city");
  const billingZip = readOptionalString(formData, "billing_zip");
  const billingCountry = readOptionalString(formData, "billing_country");

  const name =
    type === "person"
      ? [firstName ?? "", lastName ?? ""].map((s) => s.trim()).filter(Boolean).join(" ") || null
      : (companyName?.trim() ?? null);

  if (!name && (type === "company" || type === "sole_trader")) {
    errors.company_name = errors.company_name ?? "Nazov firmy je povinny.";
  }
  if (!name && type === "person") {
    if (!errors.first_name) errors.first_name = "Krstne meno je povinne.";
    if (!errors.last_name) errors.last_name = "Priezvisko je povinne.";
  }

  const billingAddressLine1 = billingStreet ?? "";
  const city = billingCity ?? "";
  const zip = billingZip ?? "";
  const country = billingCountry ?? "";

  const billingAddressLine2 = readOptionalString(formData, "billing_address_line2");
  const ico = readOptionalString(formData, "ico");
  const dic = readOptionalString(formData, "dic");
  const icdph = readOptionalString(formData, "icdph");
  const icDph = readOptionalString(formData, "ic_dph");
  const contactPhone = readOptionalString(formData, "contact_phone");
  const vatPayer = formData.get("vat_payer") === "on";
  const taxRegimeDefault = readOptionalString(formData, "tax_regime_default");
  const defaultCurrency = readOptionalString(formData, "default_currency")?.toUpperCase() ?? null;
  const defaultPaymentMethod = readOptionalString(formData, "default_payment_method");
  const notes = readOptionalString(formData, "notes");

  const defaultDueDaysRaw = readOptionalString(formData, "default_due_days");
  const defaultDueDays =
    defaultDueDaysRaw && defaultDueDaysRaw.length > 0
      ? Number.parseInt(defaultDueDaysRaw, 10)
      : null;

  if (
    defaultDueDaysRaw &&
    (!Number.isInteger(defaultDueDays) || (defaultDueDays ?? 0) < 0 || (defaultDueDays ?? 0) > 365)
  ) {
    errors.default_due_days = "Splatnost musi byt cele cislo 0-365.";
  }

  if (contactEmail && !EMAIL_REGEX.test(contactEmail)) {
    errors.contact_email = "Zadajte platnu emailovu adresu.";
  }

  if (Object.keys(errors).length > 0 || !type || !name) {
    return {
      status: "error",
      message: "Opravte vyznacene polia.",
      fieldErrors: errors,
    };
  }

  try {
    if (clientId) {
      await updateClient(userId, clientId, {
        type,
        name,
        billingAddressLine1: billingAddressLine1 || "—",
        billingAddressLine2,
        city: city || "—",
        zip: zip || "—",
        country: country || "—",
        ico,
        dic,
        icdph,
        icDph: icDph ?? icdph,
        contactName,
        contactEmail,
        contactPhone,
        companyName: type === "person" ? null : companyName,
        firstName: type === "person" ? firstName : null,
        lastName: type === "person" ? lastName : null,
        billingStreet: billingStreet || null,
        billingCity: billingCity || null,
        billingZip: billingZip || null,
        billingCountry: billingCountry || null,
        vatPayer,
        taxRegimeDefault,
        defaultCurrency,
        defaultDueDays,
        defaultPaymentMethod,
        notes,
      });
    } else {
      await createClient(userId, {
        type,
        name,
        billingAddressLine1: billingAddressLine1 || "—",
        billingAddressLine2,
        city: city || "—",
        zip: zip || "—",
        country: country || "—",
        ico,
        dic,
        icdph,
        icDph: icDph ?? icdph,
        contactName,
        contactEmail,
        contactPhone,
        companyName: type === "person" ? null : companyName,
        firstName: type === "person" ? firstName : null,
        lastName: type === "person" ? lastName : null,
        billingStreet: billingStreet || null,
        billingCity: billingCity || null,
        billingZip: billingZip || null,
        billingCountry: billingCountry || null,
        vatPayer,
        taxRegimeDefault,
        defaultCurrency,
        defaultDueDays,
        defaultPaymentMethod,
        notes,
      });
    }
  } catch (error) {
    if (isDbKnownRequestError(error, "P2025")) {
      return {
        status: "error",
        message: "Klient nebol najdeny.",
      };
    }

    throw error;
  }

  revalidatePath("/clients");

  redirect(
    buildClientsUrl({
      notice: clientId ? "Klient bol upraveny." : "Klient bol vytvoreny.",
    }),
  );
}

export async function deleteClientAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const clientIdEntry = formData.get("client_id");
  const clientId =
    typeof clientIdEntry === "string" && clientIdEntry.trim().length > 0
      ? clientIdEntry.trim()
      : null;

  if (!clientId) {
    redirect(buildClientsUrl({ error: "Chyba ID klienta." }));
  }

  try {
    await deleteClient(userId, clientId);
  } catch (error) {
    if (isDbKnownRequestError(error, "P2003")) {
      redirect(
        buildClientsUrl({
          error: "Klient je pouzity v existujucich ponukach a neda sa vymazat.",
        }),
      );
    }

    if (isDbKnownRequestError(error, "P2025")) {
      redirect(buildClientsUrl({ error: "Klient nebol najdeny." }));
    }

    throw error;
  }

  revalidatePath("/clients");
  redirect(buildClientsUrl({ notice: "Klient bol vymazany." }));
}
