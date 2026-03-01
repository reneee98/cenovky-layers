import type {
  Language as QuoteLanguage,
  QuoteStatus as QuoteStatusEnum,
  TotalDiscountType as QuoteDiscountType,
  Unit as QuoteUnit,
} from "@prisma/client";
import type { Prisma } from "@/types/prisma";

type Language = QuoteLanguage;
type QuoteStatus = QuoteStatusEnum;
type TotalDiscountType = QuoteDiscountType;
type Unit = QuoteUnit;

export type QuoteVersionSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  company: {
    companyName: string;
    companyAddress: string;
    companyIco?: string | null;
    companyDic?: string | null;
    companyIcdph?: string | null;
    companyEmail: string;
    companyPhone: string;
    companyWebsite: string | null;
    logoUrl: string | null;
    logoImage:
      | {
          mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";
          base64: string;
        }
      | null;
  };
  quote: {
    id: string;
    number: string;
    title: string;
    status: QuoteStatus;
    language: Language;
    currency: string;
    validUntil: string;
    vatEnabled: boolean;
    vatRate: number;
    showClientDetailsInPdf: boolean;
    showCompanyDetailsInPdf: boolean;
    introContentMarkdown: string;
    termsContentMarkdown: string;
    revisionsIncluded: number;
    totalDiscountType: TotalDiscountType;
    totalDiscountValue: number;
    createdAt: string;
    updatedAt: string;
  };
  client: {
    id: string;
    type: "company" | "person";
    name: string;
    billingAddressLine1: string;
    billingAddressLine2: string | null;
    city: string;
    zip: string;
    country: string;
    ico: string | null;
    dic: string | null;
    icdph: string | null;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
  };
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    unit: Unit;
    qty: number;
    unitPrice: number;
    discountPct: number;
    sortOrder: number;
  }>;
  totals: {
    subtotal: number;
    totalDiscount: number;
    taxableBase: number;
    vatAmount: number;
    grandTotal: number;
  };
  rendered?: {
    metaChips: {
      createdAt: string;
      validUntil: string;
      currency: string;
      vatStatus: string;
    };
    itemRows: Array<{
      id: string;
      qty: string;
      unitPrice: string;
      discount: string;
      lineTotal: string;
    }>;
    totals: {
      subtotal: string;
      totalDiscount: string;
      vat: string;
      grandTotal: string;
    };
    revisionLine: string;
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function parseQuoteVersionSnapshot(value: unknown): QuoteVersionSnapshot | null {
  if (!isObject(value)) {
    return null;
  }

  if (value.schemaVersion !== 1) {
    return null;
  }

  const company = value.company;
  const quote = value.quote;
  const client = value.client;
  const items = value.items;
  const totals = value.totals;
  const rendered = value.rendered;

  if (!isObject(company) || !isObject(quote) || !isObject(client) || !isObject(totals)) {
    return null;
  }

  if (!Array.isArray(items)) {
    return null;
  }

  if (
    !isString(company.companyName) ||
    !isString(company.companyAddress) ||
    !isString(company.companyEmail) ||
    !isString(company.companyPhone)
  ) {
    return null;
  }

  if (
    company.companyIco !== undefined &&
    !isNullableString(company.companyIco)
  ) {
    return null;
  }

  if (
    company.companyDic !== undefined &&
    !isNullableString(company.companyDic)
  ) {
    return null;
  }

  if (
    company.companyIcdph !== undefined &&
    !isNullableString(company.companyIcdph)
  ) {
    return null;
  }

  const showClientDetailsInPdf =
    typeof quote.showClientDetailsInPdf === "boolean" ? quote.showClientDetailsInPdf : true;
  const showCompanyDetailsInPdf =
    typeof quote.showCompanyDetailsInPdf === "boolean" ? quote.showCompanyDetailsInPdf : true;

  if (
    !isString(quote.id) ||
    !isString(quote.number) ||
    !isString(quote.title) ||
    !isString(quote.language) ||
    !isString(quote.currency) ||
    !isString(quote.validUntil) ||
    typeof quote.vatEnabled !== "boolean" ||
    !isNumber(quote.vatRate)
  ) {
    return null;
  }

  if (!isString(client.id) || !isString(client.name)) {
    return null;
  }

  if (
    !isNumber(totals.subtotal) ||
    !isNumber(totals.totalDiscount) ||
    !isNumber(totals.taxableBase) ||
    !isNumber(totals.vatAmount) ||
    !isNumber(totals.grandTotal)
  ) {
    return null;
  }

  if (rendered !== undefined && !isObject(rendered)) {
    return null;
  }

  const normalized = {
    ...value,
    quote: {
      ...quote,
      showClientDetailsInPdf,
      showCompanyDetailsInPdf,
    },
  };

  return normalized as QuoteVersionSnapshot;
}
