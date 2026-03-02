"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

import type { Language as SettingsLanguage } from "@/types/domain";
import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { getSettings, updateSettings } from "@/server/repositories";

type Language = SettingsLanguage;

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
    | "logo_file"
    | "signature_file",
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
const SIGNATURE_UPLOAD_DIRECTORY = join(process.cwd(), "public", "uploads", "signatures");
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_SIGNATURE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TO_EXTENSION: Record<string, ".png" | ".jpg" | ".webp" | ".svg"> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};
const ALLOWED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

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

function getImageFileExtension(file: File): ".png" | ".jpg" | ".webp" | ".svg" | null {
  const extension = extname(file.name).toLowerCase();

  if (extension && ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    if (extension === ".jpeg") {
      return ".jpg";
    }

    return extension as ".png" | ".jpg" | ".webp" | ".svg";
  }

  const mimeType = file.type.toLowerCase();
  return ALLOWED_IMAGE_MIME_TO_EXTENSION[mimeType] ?? null;
}

async function storeImageFile(
  file: File,
  extension: ".png" | ".jpg" | ".webp" | ".svg",
  uploadDirectory: string,
  publicPrefix: string,
): Promise<string> {
  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const fullPath = join(uploadDirectory, filename);

  await mkdir(uploadDirectory, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, bytes);

  return `${publicPrefix}/${filename}`;
}

export async function saveSettingsAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const userId = await requireUserId();
  const errors: SettingsFormFieldErrors = {};

  const companyName = readRequiredString(formData, "company_name", errors);
  const companyAddress = readRequiredString(formData, "company_address", errors);
  const companyEmail = readRequiredString(formData, "company_email", errors);
  const companyPhone = readRequiredString(formData, "company_phone", errors);

  const companyIco = readOptionalString(formData, "company_ico");
  const companyDic = readOptionalString(formData, "company_dic");
  const companyIcdph = readOptionalString(formData, "company_icdph");
  const companyWebsite = readOptionalString(formData, "company_website");
  const companyIban = readOptionalString(formData, "company_iban");
  const companySwiftBic = readOptionalString(formData, "company_swift_bic");
  const companyRegistrationNote = readOptionalString(formData, "company_registration_note");

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
  const signatureFileEntry = formData.get("signature_file");
  const currentSignatureUrl = readOptionalString(formData, "current_signature_url");

  let logoUrl = currentLogoUrl;
  let companySignatureUrl = currentSignatureUrl;

  if (logoFileEntry instanceof File && logoFileEntry.size > 0) {
    if (logoFileEntry.size > MAX_LOGO_SIZE_BYTES) {
      errors.logo_file = "Logo musi mat najviac 5 MB.";
    }

    const logoExtension = getImageFileExtension(logoFileEntry);
    if (!logoExtension) {
      errors.logo_file = "Podporovane formaty loga: PNG, JPG, WEBP, SVG.";
    }

    if (!errors.logo_file && logoExtension) {
      logoUrl = await storeImageFile(
        logoFileEntry,
        logoExtension,
        LOGO_UPLOAD_DIRECTORY,
        "/uploads/logos",
      );
    }
  }

  if (signatureFileEntry instanceof File && signatureFileEntry.size > 0) {
    if (signatureFileEntry.size > MAX_SIGNATURE_SIZE_BYTES) {
      errors.signature_file = "Podpis musi mat najviac 5 MB.";
    }

    const signatureExtension = getImageFileExtension(signatureFileEntry);
    if (!signatureExtension) {
      errors.signature_file = "Podporovane formaty podpisu: PNG, JPG, WEBP, SVG.";
    }

    if (!errors.signature_file && signatureExtension) {
      companySignatureUrl = await storeImageFile(
        signatureFileEntry,
        signatureExtension,
        SIGNATURE_UPLOAD_DIRECTORY,
        "/uploads/signatures",
      );
    }
  }

  if (Object.keys(errors).length > 0 || !defaultLanguage) {
    return {
      status: "error",
      message: "Opravte vyznacene polia.",
      fieldErrors: errors,
    };
  }

  await updateSettings(userId, {
    companyName,
    companyAddress,
    companyIco,
    companyDic,
    companyIcdph,
    companyEmail,
    companyPhone,
    companyWebsite,
    companyIban,
    companySwiftBic,
    companyRegistrationNote,
    logoUrl,
    companySignatureUrl,
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

  const userId = await requireUserId();
  const settings = await getSettings(userId);
  const currentYear = new Date().getFullYear();

  if (settings.numberingYear === currentYear) {
    return {
      status: "error",
      message: "Cislovanie uz pouziva aktualny rok.",
    };
  }

  await updateSettings(userId, {
    numberingYear: currentYear,
    numberingCounter: 0,
  });

  revalidatePath("/settings");

  return {
    status: "success",
    message: `Cislovanie resetovane na ${currentYear}-001 (pocitadlo 0).`,
  };
}
