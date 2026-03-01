"use server";

import type { Prisma } from "@/types/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createClient,
  deleteClient,
  updateClient,
} from "@/server/repositories";
import { isPrismaKnownRequestError } from "@/lib/prisma-errors";

type ClientFormFieldErrors = Partial<
  Record<
    | "type"
    | "name"
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
  const errors: ClientFormFieldErrors = {};

  const clientIdEntry = formData.get("client_id");
  const clientId =
    typeof clientIdEntry === "string" && clientIdEntry.trim().length > 0
      ? clientIdEntry.trim()
      : null;

  const typeEntry = formData.get("type");
  const type =
    typeEntry === "company" || typeEntry === "person"
      ? typeEntry
      : null;

  if (!type) {
    errors.type = "Vyberte firmu alebo fyzicku osobu.";
  }

  const name = readRequiredString(formData, "name", errors);
  const billingAddressLine1 = readRequiredString(formData, "billing_address_line1", errors);
  const city = readRequiredString(formData, "city", errors);
  const zip = readRequiredString(formData, "zip", errors);
  const country = readRequiredString(formData, "country", errors);
  const contactName = readRequiredString(formData, "contact_name", errors);
  const contactEmail = readRequiredString(formData, "contact_email", errors);

  const billingAddressLine2 = readOptionalString(formData, "billing_address_line2");
  const ico = readOptionalString(formData, "ico");
  const dic = readOptionalString(formData, "dic");
  const icdph = readOptionalString(formData, "icdph");
  const contactPhone = readOptionalString(formData, "contact_phone");

  if (contactEmail && !EMAIL_REGEX.test(contactEmail)) {
    errors.contact_email = "Zadajte platnu emailovu adresu.";
  }

  if (Object.keys(errors).length > 0 || !type) {
    return {
      status: "error",
      message: "Opravte vyznacene polia.",
      fieldErrors: errors,
    };
  }

  try {
    if (clientId) {
      await updateClient(clientId, {
        type,
        name,
        billingAddressLine1,
        billingAddressLine2,
        city,
        zip,
        country,
        ico,
        dic,
        icdph,
        contactName,
        contactEmail,
        contactPhone,
      });
    } else {
      await createClient({
        type,
        name,
        billingAddressLine1,
        billingAddressLine2,
        city,
        zip,
        country,
        ico,
        dic,
        icdph,
        contactName,
        contactEmail,
        contactPhone,
      });
    }
  } catch (error) {
    if (isPrismaKnownRequestError(error, "P2025")) {
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
  const clientIdEntry = formData.get("client_id");
  const clientId =
    typeof clientIdEntry === "string" && clientIdEntry.trim().length > 0
      ? clientIdEntry.trim()
      : null;

  if (!clientId) {
    redirect(buildClientsUrl({ error: "Chyba ID klienta." }));
  }

  try {
    await deleteClient(clientId);
  } catch (error) {
    if (isPrismaKnownRequestError(error, "P2003")) {
      redirect(
        buildClientsUrl({
          error: "Klient je pouzity v existujucich ponukach a neda sa vymazat.",
        }),
      );
    }

    if (isPrismaKnownRequestError(error, "P2025")) {
      redirect(buildClientsUrl({ error: "Klient nebol najdeny." }));
    }

    throw error;
  }

  revalidatePath("/clients");
  redirect(buildClientsUrl({ notice: "Klient bol vymazany." }));
}
