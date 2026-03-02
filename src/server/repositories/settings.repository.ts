import { dbQueryOne, numericToNumber } from "@/lib/db";
import type { PoolClient } from "pg";
import { ensureSettingsForUser } from "@/server/db/init";

export async function getSettings(userId: string, txClient?: PoolClient) {
  return ensureSettingsForUser(userId, txClient);
}

export async function updateSettings(
  userId: string,
  data: Record<string, unknown>,
) {
  await ensureSettingsForUser(userId);

  const assignments: string[] = [];
  const values: unknown[] = [];

  const push = (column: string, value: unknown) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  if ("companyName" in data) push("company_name", data.companyName ?? null);
  if ("companyAddress" in data) push("company_address", data.companyAddress ?? null);
  if ("companyIco" in data) push("company_ico", data.companyIco ?? null);
  if ("companyDic" in data) push("company_dic", data.companyDic ?? null);
  if ("companyIcdph" in data) push("company_icdph", data.companyIcdph ?? null);
  if ("companyEmail" in data) push("company_email", data.companyEmail ?? null);
  if ("companyPhone" in data) push("company_phone", data.companyPhone ?? null);
  if ("companyWebsite" in data) push("company_website", data.companyWebsite ?? null);
  if ("companyIban" in data) push("company_iban", data.companyIban ?? null);
  if ("companySwiftBic" in data) push("company_swift_bic", data.companySwiftBic ?? null);
  if ("companyRegistrationNote" in data) push("company_registration_note", data.companyRegistrationNote ?? null);
  if ("logoUrl" in data) push("logo_url", data.logoUrl ?? null);
  if ("companySignatureUrl" in data) push("company_signature_url", data.companySignatureUrl ?? null);
  if ("defaultLanguage" in data) push("default_language", data.defaultLanguage ?? null);
  if ("defaultCurrency" in data) push("default_currency", data.defaultCurrency ?? null);
  if ("vatRate" in data) push("vat_rate", data.vatRate ?? null);
  if ("numberingYear" in data) push("numbering_year", data.numberingYear ?? null);
  if ("numberingCounter" in data) push("numbering_counter", data.numberingCounter ?? null);

  if (assignments.length === 0) {
    return getSettings(userId);
  }

  values.push(userId);

  const updateQuery = `UPDATE settings
    SET ${assignments.join(", ")}
    WHERE user_id = $${values.length}
    RETURNING
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
      numbering_counter AS "numberingCounter"`;

  type SettingsReturnRow = {
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

  let updated: SettingsReturnRow | null = null;

  try {
    updated = await dbQueryOne<SettingsReturnRow>(updateQuery, values);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const missingIban = msg.includes("company_iban");
    const missingSwift = msg.includes("company_swift_bic");
    const missingRegistration = msg.includes("company_registration_note");
    const missingSignature = msg.includes("company_signature_url");

    if (missingSignature && !missingIban && !missingSwift && !missingRegistration) {
      const compatibleAssignments: string[] = [];
      const compatibleValues: unknown[] = [];
      const push = (column: string, value: unknown) => {
        compatibleValues.push(value);
        compatibleAssignments.push(`${column} = $${compatibleValues.length}`);
      };
      if ("companyName" in data) push("company_name", data.companyName ?? null);
      if ("companyAddress" in data) push("company_address", data.companyAddress ?? null);
      if ("companyIco" in data) push("company_ico", data.companyIco ?? null);
      if ("companyDic" in data) push("company_dic", data.companyDic ?? null);
      if ("companyIcdph" in data) push("company_icdph", data.companyIcdph ?? null);
      if ("companyEmail" in data) push("company_email", data.companyEmail ?? null);
      if ("companyPhone" in data) push("company_phone", data.companyPhone ?? null);
      if ("companyWebsite" in data) push("company_website", data.companyWebsite ?? null);
      if ("companyIban" in data) push("company_iban", data.companyIban ?? null);
      if ("companySwiftBic" in data) push("company_swift_bic", data.companySwiftBic ?? null);
      if ("companyRegistrationNote" in data) push("company_registration_note", data.companyRegistrationNote ?? null);
      if ("logoUrl" in data) push("logo_url", data.logoUrl ?? null);
      if ("defaultLanguage" in data) push("default_language", data.defaultLanguage ?? null);
      if ("defaultCurrency" in data) push("default_currency", data.defaultCurrency ?? null);
      if ("vatRate" in data) push("vat_rate", data.vatRate ?? null);
      if ("numberingYear" in data) push("numbering_year", data.numberingYear ?? null);
      if ("numberingCounter" in data) push("numbering_counter", data.numberingCounter ?? null);

      if (compatibleAssignments.length === 0) {
        return getSettings(userId);
      }

      compatibleValues.push(userId);
      updated = await dbQueryOne<Omit<SettingsReturnRow, "companySignatureUrl">>(
        `UPDATE settings
          SET ${compatibleAssignments.join(", ")}
          WHERE user_id = $${compatibleValues.length}
          RETURNING
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
            numbering_counter AS "numberingCounter"`,
        compatibleValues,
      ).then((row) =>
        row
          ? {
              ...row,
              companySignatureUrl: null,
            }
          : null,
      );
    } else if (missingIban || missingSwift || missingRegistration || missingSignature) {
      const baseAssignments: string[] = [];
      const baseValues: unknown[] = [];
      const push = (column: string, value: unknown) => {
        baseValues.push(value);
        baseAssignments.push(`${column} = $${baseValues.length}`);
      };
      if ("companyName" in data) push("company_name", data.companyName ?? null);
      if ("companyAddress" in data) push("company_address", data.companyAddress ?? null);
      if ("companyIco" in data) push("company_ico", data.companyIco ?? null);
      if ("companyDic" in data) push("company_dic", data.companyDic ?? null);
      if ("companyIcdph" in data) push("company_icdph", data.companyIcdph ?? null);
      if ("companyEmail" in data) push("company_email", data.companyEmail ?? null);
      if ("companyPhone" in data) push("company_phone", data.companyPhone ?? null);
      if ("companyWebsite" in data) push("company_website", data.companyWebsite ?? null);
      if ("logoUrl" in data) push("logo_url", data.logoUrl ?? null);
      if ("defaultLanguage" in data) push("default_language", data.defaultLanguage ?? null);
      if ("defaultCurrency" in data) push("default_currency", data.defaultCurrency ?? null);
      if ("vatRate" in data) push("vat_rate", data.vatRate ?? null);
      if ("numberingYear" in data) push("numbering_year", data.numberingYear ?? null);
      if ("numberingCounter" in data) push("numbering_counter", data.numberingCounter ?? null);
      if (baseAssignments.length === 0) {
        return getSettings(userId);
      }
      baseValues.push(userId);
      updated = await dbQueryOne<SettingsReturnRow>(
        `UPDATE settings
          SET ${baseAssignments.join(", ")}
          WHERE user_id = $${baseValues.length}
          RETURNING
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
            logo_url AS "logoUrl",
            default_language AS "defaultLanguage",
            default_currency AS "defaultCurrency",
            vat_rate AS "vatRate",
            numbering_year AS "numberingYear",
            numbering_counter AS "numberingCounter"`,
        baseValues,
      ).then((row) =>
        row
          ? {
              ...row,
              companyIban: null,
              companySwiftBic: null,
              companyRegistrationNote: null,
              companySignatureUrl: null,
            }
          : null,
      );
    } else {
      throw err;
    }
  }

  if (!updated) {
    throw new Error("SETTINGS_NOT_FOUND");
  }

  return {
    ...updated,
    vatRate: numericToNumber(updated.vatRate),
  };
}
