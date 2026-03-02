/**
 * EPC QR code (SEPA Credit Transfer) payload for payment QR codes.
 * Format: EPC069-12 v2 – used by EU banking apps to pre-fill payments.
 * @see https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation
 */

export type PaymentQrParams = {
  /** Beneficiary IBAN (spaces are stripped) */
  iban: string;
  /** Beneficiary name (max 70 chars; avoid non-ASCII for best compatibility) */
  beneficiaryName: string;
  /** Amount to pay; if 0 or omitted, field is empty (customer enters amount) */
  amount?: number;
  /** Currency code, e.g. EUR */
  currency?: string;
  /** BIC/SWIFT of beneficiary bank (optional in EEA for version 002) */
  bic?: string | null;
  /** Unstructured remittance (e.g. variable symbol); max 140 chars */
  remittance?: string | null;
};

const MAX_BENEFICIARY = 70;
const MAX_REMITTANCE = 140;

function trimToMax(value: string, max: number): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return t.slice(0, max);
}

/**
 * Builds the EPC QR payload string (newline-separated lines 1–12).
 * Only includes IBAN and beneficiary name as required; amount/remittance optional.
 */
export function buildEpcQrPayload(params: PaymentQrParams): string {
  const iban = params.iban.replace(/\s+/g, "").toUpperCase();
  const name = trimToMax(params.beneficiaryName || "Beneficiary", MAX_BENEFICIARY);
  const bic = params.bic?.replace(/\s+/g, "").toUpperCase().trim() || "";
  const currency = (params.currency || "EUR").toUpperCase();
  const amount = params.amount != null && Number.isFinite(params.amount) && params.amount > 0
    ? params.amount
    : undefined;
  const amountStr = amount != null ? `${currency}${amount.toFixed(2)}` : "";
  const remittance = params.remittance
    ? trimToMax(params.remittance, MAX_REMITTANCE)
    : "";

  const lines: string[] = [
    "BCD",                    // 1 Service Tag
    "002",                    // 2 Version
    "1",                      // 3 Character set 1 = UTF-8
    "SCT",                    // 4 Identification (SEPA Credit Transfer)
    bic,                      // 5 BIC (optional for 002 in EEA)
    name,                     // 6 Beneficiary name
    iban,                     // 7 Beneficiary account
    amountStr,                // 8 Amount (optional)
    "",                       // 9 Purpose (optional)
    "",                       // 10 Structured remittance (e.g. RF18)
    remittance,               // 11 Unstructured remittance (e.g. variable symbol)
    "",                       // 12 Beneficiary to originator info
  ];

  return lines.join("\n");
}
