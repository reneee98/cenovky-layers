"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getSettings, updateSettings } from "@/server/repositories";

type Language = Prisma.$Enums.Language;

type SettingsFormFieldErrors = Partial<
  Record<
    | "company_name"
    | "company_address"
    | "company_email"
    | "company_phone"
    | "default_language"
    | "default_currency"
    | "vat_rate"
    | "numbering_year"
    | "numbering_counter"
    | "logo_file",
    string
  >
>;

type SettingsActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: SettingsFormFieldErrors;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGO_UPLOAD_DIRECTORY = join(process.cwd(), "public", "uploads", "logos");
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_MIME_TO_EXTENSION: Record<string, ".png" | ".jpg" | ".webp" | ".svg"> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};
const ALLOWED_LOGO_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

function readRequiredString(
  formData: FormData,
  field: string,
  errors: SettingsFormFieldErrors,
): string {
  const rawValue = formData.get(field);
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!value) {
    errors[field as keyof SettingsFormFieldErrors] = "Toto pole je povinne.";
  }

  return value;
}

function readOptionalString(formData: FormData, field: string): string | null {
  const rawValue = formData.get(field);
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  return value.length > 0 ? value : null;
}

function getLogoFileExtension(file: File): ".png" | ".jpg" | ".webp" | ".svg" | null {
  const extension = extname(file.name).toLowerCase();

  if (extension && ALLOWED_LOGO_EXTENSIONS.has(extension)) {
    if (extension === ".jpeg") {
      return ".jpg";
    }

    return extension as ".png" | ".jpg" | ".webp" | ".svg";
  }

  const mimeType = file.type.toLowerCase();
  return ALLOWED_LOGO_MIME_TO_EXTENSION[mimeType] ?? null;
}

async function storeLogoFile(file: File, extension: ".png" | ".jpg" | ".webp" | ".svg"): Promise<string> {
  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const fullPath = join(LOGO_UPLOAD_DIRECTORY, filename);

  await mkdir(LOGO_UPLOAD_DIRECTORY, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, bytes);

  return `/uploads/logos/${filename}`;
}

export async function saveSettingsAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const errors: SettingsFormFieldErrors = {};

  const companyName = readRequiredString(formData, "company_name", errors);
  const companyAddress = readRequiredString(formData, "company_address", errors);
  const companyEmail = readRequiredString(formData, "company_email", errors);
  const companyPhone = readRequiredString(formData, "company_phone", errors);

  const companyIco = readOptionalString(formData, "company_ico");
  const companyDic = readOptionalString(formData, "company_dic");
  const companyIcdph = readOptionalString(formData, "company_icdph");
  const companyWebsite = readOptionalString(formData, "company_website");

  const defaultLanguageInput = readRequiredString(
    formData,
    "default_language",
    errors,
  );
  const defaultCurrency = readRequiredString(formData, "default_currency", errors).toUpperCase();

  const vatRateRaw = readRequiredString(formData, "vat_rate", errors);
  const numberingYearRaw = readRequiredString(formData, "numbering_year", errors);
  const numberingCounterRaw = readRequiredString(formData, "numbering_counter", errors);

  if (companyEmail && !EMAIL_REGEX.test(companyEmail)) {
    errors.company_email = "Zadajte platnu emailovu adresu.";
  }

  const defaultLanguage =
    defaultLanguageInput === "sk" || defaultLanguageInput === "en"
      ? (defaultLanguageInput as Language)
      : null;

  if (!defaultLanguage) {
    errors.default_language = "Vyberte SK alebo EN.";
  }

  const vatRate = Number(vatRateRaw.replace(",", "."));

  if (!Number.isFinite(vatRate)) {
    errors.vat_rate = "Sadzba DPH musi byt cislo.";
  }

  const numberingYear = Number.parseInt(numberingYearRaw, 10);

  if (!Number.isInteger(numberingYear) || numberingYear < 2000 || numberingYear > 9999) {
    errors.numbering_year = "Pouzite platny rok (YYYY).";
  }

  const numberingCounter = Number.parseInt(numberingCounterRaw, 10);

  if (!Number.isInteger(numberingCounter) || numberingCounter < 0) {
    errors.numbering_counter = "Pocitadlo musi byt nezaporne cele cislo.";
  }

  const logoFileEntry = formData.get("logo_file");
  const currentLogoUrl = readOptionalString(formData, "current_logo_url");

  let logoUrl = currentLogoUrl;

  if (logoFileEntry instanceof File && logoFileEntry.size > 0) {
    if (logoFileEntry.size > MAX_LOGO_SIZE_BYTES) {
      errors.logo_file = "Logo musi mat najviac 5 MB.";
    }

    const logoExtension = getLogoFileExtension(logoFileEntry);
    if (!logoExtension) {
      errors.logo_file = "Podporovane formaty loga: PNG, JPG, WEBP, SVG.";
    }

    if (!errors.logo_file && logoExtension) {
      logoUrl = await storeLogoFile(logoFileEntry, logoExtension);
    }
  }

  if (Object.keys(errors).length > 0 || !defaultLanguage) {
    return {
      status: "error",
      message: "Opravte vyznacene polia.",
      fieldErrors: errors,
    };
  }

  await updateSettings({
    companyName,
    companyAddress,
    companyIco,
    companyDic,
    companyIcdph,
    companyEmail,
    companyPhone,
    companyWebsite,
    logoUrl,
    defaultLanguage,
    defaultCurrency,
    vatRate,
    numberingYear,
    numberingCounter,
  });

  revalidatePath("/settings");

  return {
    status: "success",
    message: "Nastavenia boli ulozene.",
  };
}

export async function resetNumberingForNewYearAction(
  previousState: SettingsActionState,
): Promise<SettingsActionState> {
  void previousState;

  const settings = await getSettings();
  const currentYear = new Date().getFullYear();

  if (settings.numberingYear === currentYear) {
    return {
      status: "error",
      message: "Cislovanie uz pouziva aktualny rok.",
    };
  }

  await updateSettings({
    numberingYear: currentYear,
    numberingCounter: 0,
  });

  revalidatePath("/settings");

  return {
    status: "success",
    message: `Cislovanie resetovane na ${currentYear}-001 (pocitadlo 0).`,
  };
}
