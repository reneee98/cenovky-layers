import { dbQuery, dbQueryOne, numericToNumber } from "@/lib/db";
import type { PoolClient } from "pg";
import { buildDefaultSettingsCreateInput } from "@/server/db/settings-defaults";

type SettingsRow = {
  id: number;
  userId: string;
  companyName: string;
  companyAddress: string;
  companyIco: string | null;
  companyDic: string | null;
  companyIcdph: string | null;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string | null;
  companyIban: string | null;
  companySwiftBic: string | null;
  companyRegistrationNote: string | null;
  logoUrl: string | null;
  companySignatureUrl: string | null;
  defaultLanguage: "sk" | "en";
  defaultCurrency: string;
  vatRate: number | string;
  numberingYear: number;
  numberingCounter: number;
};

const SETTINGS_SELECT_FULL = `
  SELECT
    id,
    user_id AS "userId",
    company_name AS "companyName",
    company_address AS "companyAddress",
    company_ico AS "companyIco",
    company_dic AS "companyDic",
    company_icdph AS "companyIcdph",
    company_email AS "companyEmail",
    company_phone AS "companyPhone",
    company_website AS "companyWebsite",
    company_iban AS "companyIban",
    company_swift_bic AS "companySwiftBic",
    company_registration_note AS "companyRegistrationNote",
    logo_url AS "logoUrl",
    company_signature_url AS "companySignatureUrl",
    default_language AS "defaultLanguage",
    default_currency AS "defaultCurrency",
    vat_rate AS "vatRate",
    numbering_year AS "numberingYear",
    numbering_counter AS "numberingCounter"
  FROM settings
  WHERE user_id = $1
  LIMIT 1`;

const SETTINGS_SELECT_WITHOUT_SIGNATURE = `
  SELECT
    id,
    user_id AS "userId",
    company_name AS "companyName",
    company_address AS "companyAddress",
    company_ico AS "companyIco",
    company_dic AS "companyDic",
    company_icdph AS "companyIcdph",
    company_email AS "companyEmail",
    company_phone AS "companyPhone",
    company_website AS "companyWebsite",
    company_iban AS "companyIban",
    company_swift_bic AS "companySwiftBic",
    company_registration_note AS "companyRegistrationNote",
    logo_url AS "logoUrl",
    default_language AS "defaultLanguage",
    default_currency AS "defaultCurrency",
    vat_rate AS "vatRate",
    numbering_year AS "numberingYear",
    numbering_counter AS "numberingCounter"
  FROM settings
  WHERE user_id = $1
  LIMIT 1`;

const SETTINGS_SELECT_MINIMAL = `
  SELECT
    id,
    user_id AS "userId",
    company_name AS "companyName",
    company_address AS "companyAddress",
    company_email AS "companyEmail",
    company_phone AS "companyPhone",
    default_language AS "defaultLanguage",
    default_currency AS "defaultCurrency",
    vat_rate AS "vatRate",
    numbering_year AS "numberingYear",
    numbering_counter AS "numberingCounter"
  FROM settings
  WHERE user_id = $1
  LIMIT 1`;

export async function ensureSettingsForUser(userId: string, txClient?: PoolClient) {
  let existing: SettingsRow | null = null;

  try {
    existing = await dbQueryOne<SettingsRow>(SETTINGS_SELECT_FULL, [userId], txClient);
  } catch (selectErr) {
    const msg = selectErr instanceof Error ? selectErr.message : String(selectErr);
    if (msg.includes("column") || msg.includes("does not exist")) {
      try {
        const withoutSignature = await dbQueryOne<
          Omit<SettingsRow, "companySignatureUrl">
        >(SETTINGS_SELECT_WITHOUT_SIGNATURE, [userId], txClient);

        if (withoutSignature) {
          existing = {
            ...withoutSignature,
            companySignatureUrl: null,
          };
        } else {
          const minimal = await dbQueryOne<{
            id: number;
            userId: string;
            companyName: string;
            companyAddress: string;
            companyEmail: string;
            companyPhone: string;
            defaultLanguage: "sk" | "en";
            defaultCurrency: string;
            vatRate: number | string;
            numberingYear: number;
            numberingCounter: number;
          }>(
            SETTINGS_SELECT_MINIMAL,
            [userId],
            txClient,
          );
          if (minimal) {
            existing = {
              ...minimal,
              companyIco: null,
              companyDic: null,
              companyIcdph: null,
              companyWebsite: null,
              companyIban: null,
              companySwiftBic: null,
              companyRegistrationNote: null,
              logoUrl: null,
              companySignatureUrl: null,
            };
          }
        }
      } catch {
        try {
          const minimal = await dbQueryOne<{
            id: number;
            userId: string;
            companyName: string;
            companyAddress: string;
            companyEmail: string;
            companyPhone: string;
            defaultLanguage: "sk" | "en";
            defaultCurrency: string;
            vatRate: number | string;
            numberingYear: number;
            numberingCounter: number;
          }>(
            SETTINGS_SELECT_MINIMAL,
            [userId],
            txClient,
          );
          if (minimal) {
            existing = {
              ...minimal,
              companyIco: null,
              companyDic: null,
              companyIcdph: null,
              companyWebsite: null,
              companyIban: null,
              companySwiftBic: null,
              companyRegistrationNote: null,
              logoUrl: null,
              companySignatureUrl: null,
            };
          }
        } catch {
          throw selectErr;
        }
      }
    } else {
      throw selectErr;
    }
  }

  if (existing) {
    return {
      ...existing,
      vatRate: numericToNumber(existing.vatRate),
    };
  }

  const defaults = buildDefaultSettingsCreateInput(userId);

  await dbQuery(
    `INSERT INTO settings (
      user_id,
      company_name,
      company_address,
      company_email,
      company_phone,
      default_language,
      default_currency,
      vat_rate,
      numbering_year,
      numbering_counter
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (user_id) DO NOTHING`,
    [
      defaults.userId,
      defaults.companyName,
      defaults.companyAddress,
      defaults.companyEmail,
      defaults.companyPhone,
      defaults.defaultLanguage,
      defaults.defaultCurrency,
      defaults.vatRate,
      defaults.numberingYear,
      defaults.numberingCounter,
    ],
    txClient,
  );

  let created: SettingsRow | null = null;
  try {
    created = await dbQueryOne<SettingsRow>(SETTINGS_SELECT_FULL, [userId], txClient);
  } catch {
    try {
      created = await dbQueryOne<Omit<SettingsRow, "companySignatureUrl">>(
        SETTINGS_SELECT_WITHOUT_SIGNATURE,
        [userId],
        txClient,
      ).then((row) =>
        row
          ? {
              ...row,
              companySignatureUrl: null,
            }
          : null,
      );
    } catch {
      created = await dbQueryOne<{
        id: number;
        userId: string;
        companyName: string;
        companyAddress: string;
        companyEmail: string;
        companyPhone: string;
        defaultLanguage: "sk" | "en";
        defaultCurrency: string;
        vatRate: number | string;
        numberingYear: number;
        numberingCounter: number;
      }>(
        SETTINGS_SELECT_MINIMAL,
        [userId],
        txClient,
      ).then((row) =>
        row
          ? {
              ...row,
              companyIco: null,
              companyDic: null,
              companyIcdph: null,
              companyWebsite: null,
              companyIban: null,
              companySwiftBic: null,
              companyRegistrationNote: null,
              logoUrl: null,
              companySignatureUrl: null,
            }
          : null,
      );
    }
  }

  if (!created) {
    throw new Error("SETTINGS_INIT_FAILED");
  }

  return {
    ...created,
    vatRate: numericToNumber(created.vatRate),
  };
}
