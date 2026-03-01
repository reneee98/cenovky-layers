import type { Language as SettingsLanguage } from "@prisma/client";
import type { Prisma } from "@/types/prisma";

type Language = SettingsLanguage;

export const SETTINGS_SINGLETON_ID = 1;

export const DEFAULT_SETTINGS_LANGUAGE: Language = "sk";
export const DEFAULT_SETTINGS_CURRENCY = "EUR";
export const DEFAULT_SETTINGS_VAT_RATE = 20;

export function buildDefaultSettingsCreateInput(
  currentYear = new Date().getFullYear(),
): Prisma.SettingsUncheckedCreateInput {
  return {
    id: SETTINGS_SINGLETON_ID,
    companyName: "Your Company",
    companyAddress: "Street 1, City",
    companyEmail: "hello@example.com",
    companyPhone: "+421900000000",
    defaultLanguage: DEFAULT_SETTINGS_LANGUAGE,
    defaultCurrency: DEFAULT_SETTINGS_CURRENCY,
    vatRate: DEFAULT_SETTINGS_VAT_RATE,
    numberingYear: currentYear,
    numberingCounter: 0,
  };
}
