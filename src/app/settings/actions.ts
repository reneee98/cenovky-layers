"use server";

import type { Language as SettingsLanguage } from "@/types/domain";
import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSettings, updateSettings } from "@/server/repositories";
import {
  deleteCompanyAssetByReference,
  uploadCompanyImageAsset,
  uploadCompanyImageAssetWithClient,
} from "@/server/storage/company-assets";

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
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_SIGNATURE_SIZE_BYTES = 5 * 1024 * 1024;

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

export async function saveSettingsAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const userId = await requireUserId();
  const currentSettings = await getSettings(userId);
  let supabaseServerClient: Awaited<ReturnType<typeof createSupabaseServerClient>> | null = null;
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
  const signatureFileEntry = formData.get("signature_file");

  let logoUrl = currentSettings.logoUrl;
  let companySignatureUrl = currentSettings.companySignatureUrl ?? null;
  let previousLogoForCleanup: string | null = null;
  let previousSignatureForCleanup: string | null = null;

  if (logoFileEntry instanceof File && logoFileEntry.size > 0) {
    if (logoFileEntry.size > MAX_LOGO_SIZE_BYTES) {
      errors.logo_file = "Logo musi mat najviac 5 MB.";
    }

    if (!errors.logo_file) {
      let uploadResult = await uploadCompanyImageAsset({
        userId,
        file: logoFileEntry,
        kind: "logo",
      });

      if (!uploadResult.ok && uploadResult.reason === "missing_admin_client") {
        if (!supabaseServerClient) {
          supabaseServerClient = await createSupabaseServerClient();
        }
        uploadResult = await uploadCompanyImageAssetWithClient(supabaseServerClient, {
          userId,
          file: logoFileEntry,
          kind: "logo",
        });
      }

      if (!uploadResult.ok) {
        errors.logo_file =
          uploadResult.reason === "unsupported_type"
            ? "Podporovane formaty loga: PNG, JPG, WEBP, SVG."
            : "Nepodarilo sa nahrat logo do Supabase Storage.";
      } else {
        previousLogoForCleanup = logoUrl;
        logoUrl = uploadResult.reference;
      }
    }
  }

  if (signatureFileEntry instanceof File && signatureFileEntry.size > 0) {
    if (signatureFileEntry.size > MAX_SIGNATURE_SIZE_BYTES) {
      errors.signature_file = "Podpis musi mat najviac 5 MB.";
    }

    if (!errors.signature_file) {
      let uploadResult = await uploadCompanyImageAsset({
        userId,
        file: signatureFileEntry,
        kind: "signature",
      });

      if (!uploadResult.ok && uploadResult.reason === "missing_admin_client") {
        if (!supabaseServerClient) {
          supabaseServerClient = await createSupabaseServerClient();
        }
        uploadResult = await uploadCompanyImageAssetWithClient(supabaseServerClient, {
          userId,
          file: signatureFileEntry,
          kind: "signature",
        });
      }

      if (!uploadResult.ok) {
        errors.signature_file =
          uploadResult.reason === "unsupported_type"
            ? "Podporovane formaty podpisu: PNG, JPG, WEBP, SVG."
            : "Nepodarilo sa nahrat podpis do Supabase Storage.";
      } else {
        previousSignatureForCleanup = companySignatureUrl;
        companySignatureUrl = uploadResult.reference;
      }
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

  // Best-effort cleanup starych assetov po uspesnom ulozeni.
  await Promise.all([
    deleteCompanyAssetByReference(previousLogoForCleanup),
    deleteCompanyAssetByReference(previousSignatureForCleanup),
  ]);

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
