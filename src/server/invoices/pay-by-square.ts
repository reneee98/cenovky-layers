/**
 * PAY by square – slovenský štandard platobného QR (SBA).
 * Používa knižnicu bysquare na zakódovanie údajov; bankové aplikácie predvyplnia
 * sumu, VS, účet a poznámku.
 */

import { CurrencyCode, encode, PaymentOptions } from "bysquare";

export type PayBySquareParams = {
  amount: number;
  currency: string;
  variableSymbol?: string | null;
  paymentNote: string;
  beneficiaryName: string;
  iban: string;
  bic?: string | null;
};

const MAX_VARIABLE_SYMBOL = 10;
const MAX_PAYMENT_NOTE = 140;

function toDigitsOnly(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value).replace(/\D/g, "").slice(0, MAX_VARIABLE_SYMBOL);
}

function trimNote(note: string): string {
  const t = note.trim();
  return t.length <= MAX_PAYMENT_NOTE ? t : t.slice(0, MAX_PAYMENT_NOTE);
}

/**
 * Vráti kód meny kompatibilný s bysquare (ISO 4217, 3 znaky).
 * Ak nie je v zozname CurrencyCode, vráti EUR.
 */
function toCurrencyCode(currency: string): keyof typeof CurrencyCode | string {
  const code = currency.trim().toUpperCase();
  if (code.length !== 3) return "EUR";
  if (code in CurrencyCode) return code as keyof typeof CurrencyCode;
  return "EUR";
}

/**
 * Vygeneruje PAY by square QR reťazec pre jednu platobnú príkaz.
 * Vracia Base32hex reťazec, ktorý sa nakreslí do QR kódu.
 * Pri chybe validácie alebo kódovania vyhodí výnimku.
 */
export function buildPayBySquarePayload(params: PayBySquareParams): string {
  const iban = params.iban.replace(/\s+/g, "").toUpperCase().trim();
  if (iban.length < 15) {
    throw new Error("Invalid IBAN for Pay by square");
  }

  const variableSymbol = toDigitsOnly(params.variableSymbol);
  const paymentNote = trimNote(params.paymentNote);
  const currencyCode = toCurrencyCode(params.currency);
  const beneficiaryName = params.beneficiaryName.trim().slice(0, 70) || "Beneficiary";

  const bankAccounts: { iban: string; bic?: string }[] = [
    { iban, ...(params.bic ? { bic: params.bic.replace(/\s+/g, "").toUpperCase().trim() } : {}) },
  ];

  try {
    return encode(
      {
        payments: [
          {
            type: PaymentOptions.PaymentOrder,
            amount: params.amount > 0 ? params.amount : undefined,
            currencyCode: currencyCode as keyof typeof CurrencyCode,
            ...(variableSymbol ? { variableSymbol } : {}),
            ...(paymentNote ? { paymentNote } : {}),
            beneficiary: { name: beneficiaryName },
            bankAccounts,
          },
        ],
      },
      { validate: false, deburr: true },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Pay by square encode failed: ${msg}`);
  }
}
