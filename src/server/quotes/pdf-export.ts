import { formatCurrency, formatDate } from "@/lib/format";
import { isQuoteItemSectionDescription } from "@/lib/quotes/items";
import { calculateLineTotal } from "@/lib/quotes/totals";
import { resolveImageDataUrl } from "@/server/pdf/image-data-url";
import {
  createOrReplaceSingleQuoteVersion,
  getQuoteVersionById,
  getQuoteWithRelations,
  getSettings,
  updateQuoteVersionPdfFileUrl,
} from "@/server/repositories";
import type { QuoteVersionSnapshot } from "@/server/quotes/pdf-snapshot";
import { parseQuoteVersionSnapshot } from "@/server/quotes/pdf-snapshot";
import { renderQuotePdf } from "@/server/quotes/pdf-render";
import { calculateQuoteTotals } from "@/server/quotes/totals";
import {
  buildQuoteVersionPdfReference,
  readQuoteVersionPdf,
  saveQuoteVersionPdf,
} from "@/server/storage/quote-version-pdf";

type SnapshotLogoImage = QuoteVersionSnapshot["company"]["logoImage"];
const PDF_TIME_ZONE = "UTC";
const LOCALE_BY_LANGUAGE: Record<QuoteVersionSnapshot["quote"]["language"], string> = {
  sk: "sk-SK",
  en: "en-GB",
};
const SUPPORTED_LOGO_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

function getPdfLocale(language: QuoteVersionSnapshot["quote"]["language"]): string {
  return LOCALE_BY_LANGUAGE[language];
}

export type ExportQuotePdfVersionResult = {
  quoteId: string;
  versionId: string;
  versionNumber: number;
  downloadUrl: string;
};

export type QuoteCurrentDownloadPayload = {
  bytes: Uint8Array;
  filename: string;
  quoteId: string;
};

export type QuoteVersionDownloadPayload = {
  bytes: Uint8Array;
  filename: string;
  quoteId: string;
  versionNumber: number;
};

function decimalToNumber(value: number): number {
  return value;
}

function normalizeFileName(value: string): string {
  const normalized = value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "quote";
}

function buildDownloadFileName(snapshot: QuoteVersionSnapshot, versionNumber: number): string {
  const base = normalizeFileName(`${snapshot.quote.number}-v${versionNumber}`);
  return `${base}.pdf`;
}

function buildCurrentDownloadFileName(snapshot: QuoteVersionSnapshot): string {
  return `${normalizeFileName(snapshot.quote.number)}.pdf`;
}

function toSnapshot(
  quote: NonNullable<Awaited<ReturnType<typeof getQuoteWithRelations>>>,
  settings: Awaited<ReturnType<typeof getSettings>>,
  generatedAtIso: string,
  logoImage: SnapshotLogoImage,
): QuoteVersionSnapshot {
  const locale = getPdfLocale(quote.language);
  const totals = calculateQuoteTotals({
    items: quote.items,
    totalDiscountType: quote.totalDiscountType,
    totalDiscountValue: quote.totalDiscountValue,
    vatEnabled: quote.vatEnabled,
    vatRate: quote.vatRate,
  });

  return {
    schemaVersion: 1,
    generatedAt: generatedAtIso,
    company: {
      companyName: settings.companyName,
      companyAddress: settings.companyAddress,
      companyIco: settings.companyIco,
      companyDic: settings.companyDic,
      companyIcdph: settings.companyIcdph,
      companyEmail: settings.companyEmail,
      companyPhone: settings.companyPhone,
      companyWebsite: settings.companyWebsite,
      logoUrl: settings.logoUrl,
      logoImage,
    },
    quote: {
      id: quote.id,
      number: quote.number,
      title: quote.title,
      status: quote.status,
      language: quote.language,
      currency: quote.currency,
      validUntil: quote.validUntil.toISOString(),
      vatEnabled: quote.vatEnabled,
      vatRate: decimalToNumber(quote.vatRate),
      showClientDetailsInPdf: quote.showClientDetailsInPdf,
      showCompanyDetailsInPdf: quote.showCompanyDetailsInPdf,
      introContentMarkdown: quote.introContentMarkdown,
      termsContentMarkdown: quote.termsContentMarkdown,
      revisionsIncluded: quote.revisionsIncluded,
      totalDiscountType: quote.totalDiscountType,
      totalDiscountValue: decimalToNumber(quote.totalDiscountValue),
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
    },
    client: {
      id: quote.client.id,
      type: quote.client.type,
      name: quote.client.name,
      billingAddressLine1: quote.client.billingAddressLine1,
      billingAddressLine2: quote.client.billingAddressLine2,
      city: quote.client.city,
      zip: quote.client.zip,
      country: quote.client.country,
      ico: quote.client.ico,
      dic: quote.client.dic,
      icdph: quote.client.icdph,
      contactName: quote.client.contactName,
      contactEmail: quote.client.contactEmail,
      contactPhone: quote.client.contactPhone,
    },
    items: quote.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      unit: item.unit,
      qty: decimalToNumber(item.qty),
      unitPrice: decimalToNumber(item.unitPrice),
      discountPct: decimalToNumber(item.discountPct),
      sortOrder: item.sortOrder,
    })),
    totals,
    rendered: {
      metaChips: {
        createdAt: formatDate(quote.createdAt.toISOString(), locale, { timeZone: PDF_TIME_ZONE }),
        validUntil: formatDate(quote.validUntil.toISOString(), locale, { timeZone: PDF_TIME_ZONE }),
        currency: quote.currency,
        vatStatus:
          quote.vatEnabled
            ? `${quote.language === "sk" ? "DPH" : "VAT"} ${decimalToNumber(quote.vatRate).toFixed(2)}%`
            : quote.language === "sk"
              ? "DPH OFF"
              : "VAT OFF",
      },
      itemRows: quote.items.map((item) => ({
        id: item.id,
        ...(isQuoteItemSectionDescription(item.description)
          ? {
              qty: "",
              unitPrice: "",
              discount: "",
              lineTotal: "",
            }
          : {
              qty: decimalToNumber(item.qty).toFixed(2),
              unitPrice: formatCurrency(decimalToNumber(item.unitPrice), quote.currency, locale),
              discount:
                decimalToNumber(item.discountPct) > 0 ? `-${decimalToNumber(item.discountPct).toFixed(2)}%` : "",
              lineTotal: formatCurrency(
                calculateLineTotal({
                  qty: decimalToNumber(item.qty),
                  unitPrice: decimalToNumber(item.unitPrice),
                  discountPct: decimalToNumber(item.discountPct),
                }),
                quote.currency,
                locale,
              ),
            }),
      })),
      totals: {
        subtotal: formatCurrency(totals.subtotal, quote.currency, locale),
        totalDiscount: formatCurrency(totals.totalDiscount, quote.currency, locale),
        vat: formatCurrency(totals.vatAmount, quote.currency, locale),
        grandTotal: formatCurrency(totals.grandTotal, quote.currency, locale),
      },
      revisionLine:
        quote.language === "sk"
          ? `V cene su zahrnute ${quote.revisionsIncluded} kola revizii.`
          : `${quote.revisionsIncluded} revision rounds are included.`,
    },
  };
}

async function loadLogoImageFromSettings(logoUrl: string | null): Promise<SnapshotLogoImage> {
  const dataUrl = await resolveImageDataUrl(logoUrl);
  if (!dataUrl) {
    return null;
  }

  const matched = dataUrl.match(/^data:([^;,]+);base64,(.+)$/i);
  if (!matched) {
    return null;
  }
  const mimeType = matched[1].toLowerCase();
  if (!SUPPORTED_LOGO_MIME_TYPES.has(mimeType)) {
    return null;
  }

  return {
    mimeType: mimeType as NonNullable<SnapshotLogoImage>["mimeType"],
    base64: matched[2],
  };
}

export async function exportQuoteToPdfVersion(
  userId: string,
  quoteId: string,
): Promise<ExportQuotePdfVersionResult | null> {
  const [quote, settings] = await Promise.all([
    getQuoteWithRelations(userId, quoteId),
    getSettings(userId),
  ]);

  if (!quote) {
    return null;
  }

  const generatedAtIso = new Date().toISOString();
  const logoImage = await loadLogoImageFromSettings(settings.logoUrl);
  const snapshot = toSnapshot(quote, settings, generatedAtIso, logoImage);
  const pdfBytes = await renderQuotePdf(snapshot);

  const createdVersion = await createOrReplaceSingleQuoteVersion(
    userId,
    quote.id,
    snapshot,
    "__pending__",
  );
  const pdfFileReference = buildQuoteVersionPdfReference(
    quote.id,
    createdVersion.versionNumber,
    createdVersion.id,
  );

  await updateQuoteVersionPdfFileUrl(userId, createdVersion.id, pdfFileReference);
  await saveQuoteVersionPdf(pdfFileReference, pdfBytes);

  return {
    quoteId: createdVersion.quoteId,
    versionId: createdVersion.id,
    versionNumber: createdVersion.versionNumber,
    downloadUrl: `/api/quote-versions/${createdVersion.id}/download`,
  };
}

export async function getCurrentQuotePdfDownloadPayload(
  userId: string,
  quoteId: string,
): Promise<QuoteCurrentDownloadPayload | null> {
  const [quote, settings] = await Promise.all([
    getQuoteWithRelations(userId, quoteId),
    getSettings(userId),
  ]);

  if (!quote) {
    return null;
  }

  const generatedAtIso = new Date().toISOString();
  const logoImage = await loadLogoImageFromSettings(settings.logoUrl);
  const snapshot = toSnapshot(quote, settings, generatedAtIso, logoImage);
  const pdfBytes = await renderQuotePdf(snapshot);

  return {
    bytes: pdfBytes,
    filename: buildCurrentDownloadFileName(snapshot),
    quoteId: quote.id,
  };
}

export async function getQuoteVersionDownloadPayload(
  userId: string,
  versionId: string,
): Promise<QuoteVersionDownloadPayload | null> {
  const version = await getQuoteVersionById(userId, versionId);

  if (!version) {
    return null;
  }

  const snapshot = parseQuoteVersionSnapshot(version.snapshotJson);
  let pdfReference = version.pdfFileUrl.trim();

  if (!pdfReference) {
    pdfReference = buildQuoteVersionPdfReference(version.quoteId, version.versionNumber, version.id);
    await updateQuoteVersionPdfFileUrl(userId, version.id, pdfReference);
  }

  const storedPdfBytes = await readQuoteVersionPdf(pdfReference);

  if (storedPdfBytes) {
    return {
      bytes: storedPdfBytes,
      filename:
        snapshot?.quote.number && snapshot.quote.number.trim().length > 0
          ? buildDownloadFileName(snapshot, version.versionNumber)
          : `quote-v${version.versionNumber}.pdf`,
      quoteId: version.quoteId,
      versionNumber: version.versionNumber,
    };
  }

  if (!snapshot) {
    return null;
  }

  const regeneratedPdfBytes = await renderQuotePdf(snapshot);
  await saveQuoteVersionPdf(pdfReference, regeneratedPdfBytes);

  return {
    bytes: regeneratedPdfBytes,
    filename: buildDownloadFileName(snapshot, version.versionNumber),
    quoteId: version.quoteId,
    versionNumber: version.versionNumber,
  };
}
