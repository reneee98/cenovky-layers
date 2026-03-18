import { dbQuery } from "@/lib/db";

const COMPACT_SEQUENCE_REGEX = /^(\d{4})(\d{4})$/;
const LEGACY_SEQUENCE_REGEX = /(?:^|[^0-9])(\d{4})-(\d{1,4})$/;

export function isCompactInvoiceSequence(value: string): boolean {
  return COMPACT_SEQUENCE_REGEX.test(value.trim());
}

export function formatInvoiceNumber(year: number, counter: number): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error("INVOICE_YEAR_OUT_OF_RANGE");
  }

  if (!Number.isInteger(counter) || counter < 1 || counter > 9999) {
    throw new Error("INVOICE_COUNTER_OUT_OF_RANGE");
  }

  return `${year}${String(counter).padStart(4, "0")}`;
}

function parseYearCounter(number: string): { year: number; counter: number } | null {
  const normalized = number.trim();
  const compactMatch = normalized.match(COMPACT_SEQUENCE_REGEX);
  const legacyMatch = normalized.match(LEGACY_SEQUENCE_REGEX);
  const match = compactMatch ?? legacyMatch;

  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const counter = Number.parseInt(match[2], 10);

  if (!Number.isInteger(year) || !Number.isInteger(counter)) {
    return null;
  }

  return { year, counter };
}

function isMissingInvoiceSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("does not exist") || message.includes("column") || message.includes("relation");
}

export async function reserveNextInvoiceNumber(
  userId: string,
  issueDate: Date = new Date(),
): Promise<string> {
  const targetYear = issueDate.getUTCFullYear();

  let rows: Array<{ invoiceNumber: string }> = [];
  try {
    rows = await dbQuery<{ invoiceNumber: string }>(
      `SELECT invoice_number AS "invoiceNumber"
       FROM invoices
       WHERE user_id = $1`,
      [userId],
    );
  } catch (error) {
    if (!isMissingInvoiceSchema(error)) {
      throw error;
    }
  }

  let maxCounter = 0;
  for (const row of rows) {
    const parsed = parseYearCounter(row.invoiceNumber);
    if (!parsed || parsed.year !== targetYear) {
      continue;
    }

    maxCounter = Math.max(maxCounter, parsed.counter);
  }

  const nextCounter = maxCounter + 1;
  if (nextCounter > 9999) {
    throw new Error("INVOICE_COUNTER_OVERFLOW");
  }

  return formatInvoiceNumber(targetYear, nextCounter);
}

export function buildDefaultVariableSymbol(invoiceNumber: string): string {
  const parsed = parseYearCounter(invoiceNumber);
  if (parsed) {
    return formatInvoiceNumber(parsed.year, parsed.counter);
  }

  return `${new Date().getUTCFullYear()}0001`;
}
