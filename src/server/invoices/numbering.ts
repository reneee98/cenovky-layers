import { dbQuery } from "@/lib/db";

function startOfYearUtc(year: number): Date {
  return new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
}

function endOfYearUtc(year: number): Date {
  return new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));
}

export function formatInvoiceNumber(year: number, counter: number): string {
  return `${year}-${String(counter).padStart(3, "0")}`;
}

function parseYearCounter(number: string): { year: number; counter: number } | null {
  const normalized = number.trim();
  const match = normalized.match(/(?:^|[^0-9])(\d{4})-(\d{1,})$/);

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

export async function reserveNextInvoiceNumber(
  userId: string,
  issueDate: Date = new Date(),
): Promise<string> {
  const targetYear = issueDate.getUTCFullYear();

  const rows = await dbQuery<{ invoiceNumber: string }>(
    `SELECT invoice_number AS "invoiceNumber"
     FROM invoices
     WHERE user_id = $1
       AND issue_date >= $2
       AND issue_date < $3`,
    [userId, startOfYearUtc(targetYear), endOfYearUtc(targetYear)],
  );

  let maxCounter = 0;
  for (const row of rows) {
    const parsed = parseYearCounter(row.invoiceNumber);
    if (!parsed || parsed.year !== targetYear) {
      continue;
    }

    maxCounter = Math.max(maxCounter, parsed.counter);
  }

  return formatInvoiceNumber(targetYear, maxCounter + 1);
}

export function buildDefaultVariableSymbol(invoiceNumber: string): string {
  const digitsOnly = invoiceNumber.replace(/\D+/g, "");
  if (digitsOnly.length >= 4) {
    return digitsOnly;
  }

  return `${new Date().getUTCFullYear()}001`;
}
