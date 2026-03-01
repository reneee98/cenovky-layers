const DEFAULT_LOCALE = "sk-SK";

function toValidDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

type DateFormatOptions = {
  timeZone?: string;
};

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function getCurrencyDisplayToken(currency: string): string {
  const normalized = currency.trim().toUpperCase() || "EUR";
  return normalized === "EUR" ? "€" : normalized;
}

export function formatCurrency(
  value: number,
  currency: string,
  locale = DEFAULT_LOCALE,
): string {
  const normalizedValue = Number.isFinite(value) ? roundToTwo(value) : 0;
  const currencyToken = getCurrencyDisplayToken(currency);

  try {
    const formattedNumber = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(normalizedValue);

    return `${formattedNumber} ${currencyToken}`;
  } catch {
    return `${normalizedValue.toFixed(2)} ${currencyToken}`;
  }
}

export function formatNumber(value: number, locale = DEFAULT_LOCALE): string {
  const normalizedValue = Number.isFinite(value) ? value : 0;

  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(normalizedValue);
  } catch {
    return normalizedValue.toFixed(2);
  }
}

export function formatDate(
  value: Date | string,
  locale = DEFAULT_LOCALE,
  options?: DateFormatOptions,
): string {
  const date = toValidDate(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: options?.timeZone,
  }).format(date);
}

export function formatDateTime(
  value: Date | string,
  locale = DEFAULT_LOCALE,
  options?: DateFormatOptions,
): string {
  const date = toValidDate(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: options?.timeZone,
  }).format(date);
}

export function formatTime(
  value: Date | string,
  locale = DEFAULT_LOCALE,
  options?: DateFormatOptions,
): string {
  const date = toValidDate(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: options?.timeZone,
  }).format(date);
}
