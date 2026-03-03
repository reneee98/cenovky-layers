import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import {
  renderInvoicePdfFromTemplate,
  type InvoiceTemplateSnapshot,
} from "../../../pdf/invoice-render";

import { numericToNumber } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";
import { buildPayBySquarePayload } from "@/server/invoices/pay-by-square";
import { buildSupplierSnapshot } from "@/server/invoices/snapshots";
import { resolveImageDataUrl } from "@/server/pdf/image-data-url";
import { getInvoiceWithRelations, getSettings } from "@/server/repositories";
import type { PoolClient } from "pg";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 42;
const CONTENT_WIDTH = A4_WIDTH - PAGE_MARGIN * 2;
const FOOTER_HEIGHT = 36;
const TABLE_HEADER_HEIGHT = 24;
const ROW_MIN_HEIGHT = 18;
const META_LABEL_WIDTH = 140;
const TWO_COL_GAP = 20;
const CARD_RADIUS = 10;
const TABLE_RADIUS = 10;
const TOTAL_BAR_HEIGHT = 52;
const TOTAL_BAR_RADIUS = 12;

const FONT = {
  sizeTitle: 26,
  sizeSubtitle: 14,
  sizeSection: 12,
  sizeLabel: 9,
  sizeBody: 10,
  sizeSmall: 9,
  lineBody: 14,
  lineCompact: 12,
};

/** Aligned with pdf/template.css (cenová ponuka): ink, text, line, card, black header/total bar */
const COLOR = {
  ink: rgb(0.063, 0.094, 0.157),
  text: rgb(0.29, 0.33, 0.4),
  muted: rgb(0.42, 0.45, 0.51),
  line: rgb(0.898, 0.906, 0.922),
  lineSoft: rgb(0.953, 0.957, 0.965),
  card: rgb(0.976, 0.98, 0.984),
  black: rgb(0, 0, 0),
  white: rgb(1, 1, 1),
};

type ClientSnapshot = {
  displayName?: string;
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  billingStreet?: string;
  billingCity?: string;
  billingZip?: string;
  billingCountry?: string;
  ico?: string | null;
  dic?: string | null;
  icDph?: string | null;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string | null;
};

function normalizeText(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const t = value.trim();
  return t.length > 0 ? t : fallback;
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

type AddressLines = {
  streetLine: string;
  zipCityLine: string;
  countryLine: string;
};

function parseSupplierAddressLines(companyAddress: string): AddressLines {
  const normalized = normalizeText(companyAddress, "");
  if (!normalized) {
    return {
      streetLine: "–",
      zipCityLine: "–",
      countryLine: "Slovensko",
    };
  }

  const newlineParts = normalized
    .split(/\r?\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const commaParts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const parts = newlineParts.length > 1 ? newlineParts : commaParts;

  let streetLine = parts[0] ?? "";
  let zipCityLine = parts[1] ?? "";
  let countryLine = parts.slice(2).join(", ").trim();

  if (!zipCityLine) {
    const zipMatch = streetLine.match(/^(.*?)[,\s]+(\d{3}\s?\d{2}\s+.+)$/);
    if (zipMatch) {
      streetLine = zipMatch[1].trim();
      zipCityLine = zipMatch[2].trim();
    }
  }

  if (!streetLine) {
    streetLine = normalized;
  }

  if (!zipCityLine) {
    zipCityLine = normalized;
  }

  if (!countryLine) {
    if (/\bslovensk(o|á)\b/i.test(normalized)) {
      countryLine = "Slovensko";
    } else if (/\bslovakia\b/i.test(normalized)) {
      countryLine = "Slovakia";
    } else {
      countryLine = "Slovensko";
    }
  }

  return {
    streetLine,
    zipCityLine,
    countryLine,
  };
}

/** Replaces Slovak/Czech diacritics with ASCII and strips any other non‑WinAnsi characters so Helvetica can draw the text. */
function toAsciiForPdf(text: string): string {
  if (text == null || typeof text !== "string") return "";
  const map: Record<string, string> = {
    á: "a", ä: "a", č: "c", ď: "d", é: "e", í: "i", ĺ: "l", ľ: "l", ň: "n",
    ó: "o", ô: "o", ŕ: "r", š: "s", ť: "t", ú: "u", ý: "y", ž: "z",
    Á: "A", Ä: "A", Č: "C", Ď: "D", É: "E", Í: "I", Ĺ: "L", Ľ: "L", Ň: "N",
    Ó: "O", Ô: "O", Ŕ: "R", Š: "S", Ť: "T", Ú: "U", Ý: "Y", Ž: "Z",
    "€": "EUR",
  };
  return text.replace(/[^\x00-\x7F]/g, (ch) => map[ch] ?? "");
}

function toClientSnapshot(value: unknown): ClientSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as ClientSnapshot;
}

function wrapText(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
  useUnicode = false,
): string[] {
  const safe = useUnicode ? text : toAsciiForPdf(text);
  const words = safe.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const next = `${current} ${words[i]}`;
    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function drawWrapped(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
  lineHeight: number,
  color: ReturnType<typeof rgb>,
  useUnicode = false,
): number {
  const lines = wrapText(text, maxWidth, font, fontSize, useUnicode);
  let cy = y;
  for (const line of lines) {
    page.drawText(line, { x, y: cy, size: fontSize, font, color });
    cy -= lineHeight;
  }
  return cy;
}

function drawTextSafe(
  page: PDFPage,
  text: string | null | undefined,
  opts: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb> },
  useUnicode = false,
): void {
  const str = text != null ? String(text) : "";
  const toDraw = useUnicode ? str : toAsciiForPdf(str);
  page.drawText(toDraw, opts);
}

function drawLine(
  page: PDFPage,
  y: number,
  xStart: number,
  xEnd: number,
  thickness = 0.5,
): void {
  page.drawLine({
    start: { x: xStart, y },
    end: { x: xEnd, y },
    thickness,
    color: COLOR.line,
  });
}

function buildFileName(invoiceNumber: string): string {
  const safe = invoiceNumber.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return `${safe || "invoice"}.pdf`;
}

function getClientDisplayName(client: ClientSnapshot, fallback: string): string {
  return (
    normalizeText(client.displayName) ||
    normalizeText(client.companyName) ||
    [normalizeText(client.firstName), normalizeText(client.lastName)].filter(Boolean).join(" ") ||
    fallback
  );
}

function toSlovakPaymentMethodLabel(value: string | null | undefined): string {
  const normalized = normalizeText(value, "").toLowerCase();

  if (normalized === "bank_transfer" || normalized === "bank transfer") {
    return "bankovým prevodom";
  }

  if (normalized === "cash") {
    return "v hotovosti";
  }

  if (normalized === "card" || normalized === "card_payment") {
    return "kartou";
  }

  return normalizeText(value, "–");
}

function formatAmountWithCurrencyCode(amount: number, currency: string): string {
  const normalizedCurrency = normalizeText(currency, "EUR").toUpperCase();
  const numberPart = amount.toLocaleString("sk-SK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${numberPart} ${normalizedCurrency}`;
}

export type InvoiceDownloadPayload = {
  bytes: Uint8Array;
  filename: string;
  invoiceId: string;
};

export async function getInvoicePdfDownloadPayload(
  userId: string,
  invoiceId: string,
  txClient?: PoolClient,
): Promise<InvoiceDownloadPayload | null> {
  let invoice;
  try {
    invoice = await getInvoiceWithRelations(userId, invoiceId, txClient);
  } catch (e) {
    console.error("Invoice PDF: getInvoiceWithRelations failed", {
      invoiceId,
      userId,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    throw new Error(
      "Načítanie faktúry zlyhalo. " + (e instanceof Error ? e.message : String(e)),
    );
  }

  if (!invoice) return null;

  const currentSettings = await getSettings(userId, txClient);
  const supplier = buildSupplierSnapshot(currentSettings);
  const logoDataUrl = await resolveImageDataUrl(currentSettings.logoUrl);
  const signatureDataUrl = await resolveImageDataUrl(
    currentSettings.companySignatureUrl ?? null,
  );

  const currency = typeof invoice.currency === "string" && invoice.currency.trim() ? invoice.currency.trim() : "EUR";
  const paymentMethod = toSlovakPaymentMethodLabel(
    typeof invoice.paymentMethod === "string" ? invoice.paymentMethod : null,
  );
  const subtotal = numericToNumber(invoice.subtotal);
  const discountTotal = numericToNumber(invoice.discountTotal);
  const taxBaseTotal = numericToNumber(invoice.taxBaseTotal);
  const vatTotal = numericToNumber(invoice.vatTotal);
  const total = numericToNumber(invoice.total);
  const amountPaid = numericToNumber(invoice.amountPaid);
  const amountDue = numericToNumber(invoice.amountDue);
  const supplierAddressLines = parseSupplierAddressLines(
    normalizeText(supplier.companyAddress, ""),
  );

  const client = toClientSnapshot(invoice.clientSnapshotJson);
  const clientName = getClientDisplayName(client, invoice.client?.name ?? "–");
  const supplierLineCandidates: string[] = [
    normalizeText(supplier.companyName, "–"),
    normalizeText(supplierAddressLines.streetLine, normalizeText(supplier.companyAddress, "–")),
    normalizeText(supplierAddressLines.zipCityLine, normalizeText(supplier.companyAddress, "–")),
    normalizeText(supplierAddressLines.countryLine, "Slovensko"),
    supplier.companyIco ? `IČO: ${supplier.companyIco}` : "",
    supplier.companyDic ? `DIČ: ${supplier.companyDic}` : "",
    supplier.companyIcdph ? `IČ DPH: ${supplier.companyIcdph}` : "",
  ];
  const supplierLines: string[] = supplierLineCandidates.filter(
    (line, index, source) =>
      line.length > 0 && (index === 0 || line !== source[index - 1]),
  );

  const clientLines: string[] = [
    clientName,
    normalizeText(client.billingStreet, "–"),
    `${normalizeText(client.billingZip)} ${normalizeText(client.billingCity)}`.trim() || "–",
    normalizeText(client.billingCountry, "–"),
    client.ico ? `IČO: ${client.ico}` : "",
    client.dic ? `DIČ: ${client.dic}` : "",
    client.icDph ? `IČ DPH: ${client.icDph}` : "",
  ].filter((s) => s.length > 0);

  const meta: Array<[string, string]> = [
    ["Cislo faktury", invoice.invoiceNumber],
    ["Variabilny symbol", invoice.variableSymbol ?? "–"],
    ["Datum vystavenia", formatDate(invoice.issueDate)],
    ["Datum zdanitelneho plnenia", formatDate(invoice.taxableSupplyDate)],
    ["Datum splatnosti", formatDate(invoice.dueDate)],
    ["Mena", currency],
  ];

  let payBySquareQrDataUrl: string | null = null;
  if (amountDue > 0 && supplier.companyIban) {
    const ibanForQr = supplier.companyIban.replace(/\s+/g, "").trim();
    const beneficiaryForQr = normalizeText(supplier.companyName, "Beneficiary").trim().slice(0, 70);

    if (ibanForQr.length >= 15) {
      try {
        const dueDateRaw = invoice.dueDate != null ? new Date(invoice.dueDate as Date | string) : new Date();
        const dueDateIso =
          Number.isNaN(dueDateRaw.getTime()) ? new Date().toISOString().slice(0, 10) : dueDateRaw.toISOString().slice(0, 10);
        const payBySquareString = buildPayBySquarePayload({
          amount: amountDue,
          currency: currency.trim().toUpperCase() || "EUR",
          dueDate: dueDateIso,
          variableSymbol: invoice.variableSymbol ?? undefined,
          paymentNote: "Uhrada faktury c. " + (invoice.invoiceNumber ?? "").trim().slice(0, 130),
          beneficiaryName: beneficiaryForQr,
          iban: ibanForQr,
          bic: supplier.companySwiftBic ?? undefined,
        });

        payBySquareQrDataUrl = await QRCode.toDataURL(payBySquareString, {
          type: "image/png",
          margin: 1,
          width: 280,
          errorCorrectionLevel: "M",
        });
      } catch (qrErr) {
        console.warn("Invoice PDF: Pay by square QR data URL generation failed", {
          error: qrErr instanceof Error ? qrErr.message : String(qrErr),
        });
      }
    }
  }

  const templateSnapshot: InvoiceTemplateSnapshot = {
    generatedAt: new Date().toISOString(),
    invoiceNumber: invoice.invoiceNumber,
    brandName: normalizeText(supplier.companyName, "Cenovka"),
    logoDataUrl,
    vatEnabled: invoice.vatEnabled,
    signatureDataUrl,
    supplierLines,
    clientLines,
    metaRows: [
      {
        label: "Dátum vystavenia:",
        value: formatDate(invoice.issueDate),
      },
      {
        label: "Dátum dodania:",
        value: formatDate(invoice.taxableSupplyDate),
      },
      {
        label: "Splatnosť:",
        value: formatDate(invoice.dueDate),
      },
    ],
    items: (Array.isArray(invoice.items) ? invoice.items : []).map((item, index) => {
      const qty = numericToNumber(item.qty);
      const unitPrice = numericToNumber(item.unitPrice);
      const vatRate = numericToNumber(item.vatRate);
      const lineTotal = numericToNumber(item.lineTotal);

      return {
        rowNo: `${index + 1}.`,
        name: normalizeText(item.name, "–"),
        description: normalizeText(item.description, ""),
        qty: Number.isFinite(qty) ? qty.toFixed(2).replace(".", ",") : "0,00",
        unitPrice: formatCurrency(unitPrice, currency).replace("€", "").trim(),
        vat: invoice.vatEnabled ? `${(Number.isFinite(vatRate) ? vatRate : 0).toFixed(0)}` : "0",
        total: formatCurrency(lineTotal, currency).replace("€", "").trim(),
      };
    }),
    vatSummaryRows: (() => {
      const grouped = new Map<number, { base: number; vat: number; total: number }>();
      for (const item of Array.isArray(invoice.items) ? invoice.items : []) {
        const rate = Number.isFinite(numericToNumber(item.vatRate))
          ? numericToNumber(item.vatRate)
          : 0;
        const base = numericToNumber(item.lineSubtotal);
        const vat = numericToNumber(item.lineVat);
        const totalValue = numericToNumber(item.lineTotal);
        const current = grouped.get(rate) ?? { base: 0, vat: 0, total: 0 };
        current.base += base;
        current.vat += vat;
        current.total += totalValue;
        grouped.set(rate, current);
      }

      return [...grouped.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([rate, sums]) => ({
          rate: `${rate.toFixed(0)} %`,
          base: formatCurrency(sums.base, currency).replace("€", "").trim(),
          vat: formatCurrency(sums.vat, currency).replace("€", "").trim(),
          total: formatCurrency(sums.total, currency).replace("€", "").trim(),
        }));
    })(),
    totals: {
      taxBase: formatCurrency(taxBaseTotal, currency).replace("€", "").trim(),
      vat: formatCurrency(vatTotal, currency).replace("€", "").trim(),
      grandTotal: formatCurrency(total, currency).replace("€", "").trim(),
      grandTotalWithCurrency: formatCurrency(total, currency),
    },
    payment: {
      variableSymbol: normalizeOptionalText(invoice.variableSymbol),
      amountDue: formatAmountWithCurrencyCode(amountDue, currency),
      paymentMethod: paymentMethod,
      iban: normalizeOptionalText(supplier.companyIban),
      swiftBic: normalizeOptionalText(supplier.companySwiftBic),
      qrDataUrl: payBySquareQrDataUrl,
    },
    legalNote: normalizeOptionalText(invoice.legalNote),
    note: normalizeOptionalText(invoice.note),
    footerRegistrationLine: normalizeText(
      supplier.companyRegistrationNote,
      "Spoločnosť je zapísaná v registri.",
    ),
    footerNoteLine: "",
    footerDocNo: `OF ${invoice.invoiceNumber}`,
    footerWebsite: normalizeText(supplier.companyWebsite, "www.layers.sk"),
    footerPage: "Strana 1/1",
  };

  // Keep invoice export functional even when Chrome/Chromium is unavailable (common on some hosted runtimes).
  // Set INVOICE_PDF_ALLOW_FALLBACK=0 to force strict HTML renderer mode.
  const allowLegacyFallback = process.env.INVOICE_PDF_ALLOW_FALLBACK !== "0";

  try {
    const bytes = await renderInvoicePdfFromTemplate(templateSnapshot);
    return {
      bytes,
      filename: buildFileName(invoice.invoiceNumber != null ? String(invoice.invoiceNumber) : "faktura"),
      invoiceId: invoice.id,
    };
  } catch (error) {
    if (!allowLegacyFallback) {
      throw new Error(
        `Invoice HTML PDF renderer failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    console.warn("Invoice PDF template renderer failed. Using legacy pdf-lib fallback.", {
      invoiceId: invoice.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const useUnicodeFont = false;

  const pages: PDFPage[] = [];
  let page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
  pages.push(page);

  let y = A4_HEIGHT - PAGE_MARGIN;

  // —— Title (same style as quote: large bold ink, subtitle muted) ——
  drawTextSafe(page, "FAKTURA", {
    x: PAGE_MARGIN,
    y,
    size: FONT.sizeTitle,
    font: fontBold,
    color: COLOR.ink,
  }, useUnicodeFont);
  y -= FONT.sizeTitle + 6;
  drawTextSafe(page, invoice.invoiceNumber, {
    x: PAGE_MARGIN,
    y,
    size: FONT.sizeSubtitle,
    font: font,
    color: COLOR.muted,
  }, useUnicodeFont);
  y -= FONT.lineBody + 20;

  // —— Two columns: Supplier | Client (card style like quote billing-row) ——
  const colWidth = (CONTENT_WIDTH - TWO_COL_GAP) / 2;
  const leftX = PAGE_MARGIN;
  const rightX = PAGE_MARGIN + colWidth + TWO_COL_GAP;
  const cardTitleH = FONT.sizeSection + 8;
  const supplierContentH = Math.max(1, supplierLines.length) * FONT.lineCompact + 8;
  const clientContentH = Math.max(1, clientLines.length) * FONT.lineCompact + 8;
  const cardH = cardTitleH + Math.max(supplierContentH, clientContentH);

  page.drawRectangle({
    x: leftX,
    y: y - cardH,
    width: colWidth,
    height: cardH,
    color: COLOR.card,
    borderColor: COLOR.line,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: rightX,
    y: y - cardH,
    width: colWidth,
    height: cardH,
    color: COLOR.card,
    borderColor: COLOR.line,
    borderWidth: 1,
  });

  drawTextSafe(page, "DODAVATEL", {
    x: leftX + 12,
    y: y - 14,
    size: FONT.sizeSection,
    font: fontBold,
    color: COLOR.ink,
  }, useUnicodeFont);
  drawTextSafe(page, "ODBERATEL", {
    x: rightX + 12,
    y: y - 14,
    size: FONT.sizeSection,
    font: fontBold,
    color: COLOR.ink,
  }, useUnicodeFont);
  y -= cardTitleH + 4;

  let leftY = y;
  for (const line of supplierLines) {
    leftY = drawWrapped(page, line, leftX + 12, leftY, colWidth - 20, font, FONT.sizeBody, FONT.lineCompact, COLOR.text, useUnicodeFont);
  }
  let rightY = y;
  for (const line of clientLines) {
    rightY = drawWrapped(page, line, rightX + 12, rightY, colWidth - 20, font, FONT.sizeBody, FONT.lineCompact, COLOR.text, useUnicodeFont);
  }
  y = Math.min(leftY, rightY) - 20;

  // —— Invoice meta block ——
  drawLine(page, y, PAGE_MARGIN, A4_WIDTH - PAGE_MARGIN);
  y -= 14;

  for (const [label, value] of meta) {
    drawTextSafe(page, label, {
      x: PAGE_MARGIN,
      y,
      size: FONT.sizeLabel,
      font: font,
      color: COLOR.text,
    }, useUnicodeFont);
    drawTextSafe(page, normalizeText(value, "–"), {
      x: PAGE_MARGIN + META_LABEL_WIDTH,
      y,
      size: FONT.sizeBody,
      font: fontBold,
      color: COLOR.ink,
    }, useUnicodeFont);
    y -= FONT.lineCompact;
  }
  y -= 18;

  // —— Items table (with header repeat on new page) ——
  const nameWidth = 200;
  const colQty = 210;
  const colUnit = 255;
  const colPrice = 295;
  const colDisc = 355;
  const colVat = 405;
  const colTotalX = CONTENT_WIDTH - 2;

  const drawTableHeader = (p: PDFPage, yPos: number) => {
    p.drawRectangle({
      x: PAGE_MARGIN,
      y: yPos - TABLE_HEADER_HEIGHT + 4,
      width: CONTENT_WIDTH,
      height: TABLE_HEADER_HEIGHT,
      color: COLOR.black,
    });
    drawTextSafe(p, "Polozka", { x: PAGE_MARGIN + 4, y: yPos - 16, size: FONT.sizeLabel, font: fontBold, color: COLOR.white }, useUnicodeFont);
    drawTextSafe(p, "Mnoz.", { x: PAGE_MARGIN + colQty, y: yPos - 16, size: FONT.sizeLabel, font: fontBold, color: COLOR.white }, useUnicodeFont);
    drawTextSafe(p, "j.", { x: PAGE_MARGIN + colUnit, y: yPos - 16, size: FONT.sizeLabel, font: fontBold, color: COLOR.white }, useUnicodeFont);
    drawTextSafe(p, "Cena/j.", { x: PAGE_MARGIN + colPrice, y: yPos - 16, size: FONT.sizeLabel, font: fontBold, color: COLOR.white }, useUnicodeFont);
    drawTextSafe(p, "Zlava %", { x: PAGE_MARGIN + colDisc, y: yPos - 16, size: FONT.sizeLabel, font: fontBold, color: COLOR.white }, useUnicodeFont);
    drawTextSafe(p, "DPH %", { x: PAGE_MARGIN + colVat, y: yPos - 16, size: FONT.sizeLabel, font: fontBold, color: COLOR.white }, useUnicodeFont);
    const spoluLabel = "Spolu";
    drawTextSafe(p, spoluLabel, {
      x: PAGE_MARGIN + CONTENT_WIDTH - 4 - font.widthOfTextAtSize(toAsciiForPdf(spoluLabel), FONT.sizeLabel),
      y: yPos - 16,
      size: FONT.sizeLabel,
      font: fontBold,
      color: COLOR.white,
    }, useUnicodeFont);
  };

  drawTableHeader(page, y);
  y -= TABLE_HEADER_HEIGHT + 4;

  const nameMaxWidth = nameWidth - 8;

  const items = Array.isArray(invoice.items) ? invoice.items : [];

  for (const item of items) {
    if (y < PAGE_MARGIN + FOOTER_HEIGHT + ROW_MIN_HEIGHT * 3) {
      page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
      pages.push(page);
      y = A4_HEIGHT - PAGE_MARGIN;
      drawTableHeader(page, y);
      y -= TABLE_HEADER_HEIGHT + 4;
    }

    const qty = numericToNumber(item.qty);
    const unitPrice = numericToNumber(item.unitPrice);
    const discountPct = numericToNumber(item.discountPct);
    const vatRate = numericToNumber(item.vatRate);
    const lineTotal = numericToNumber(item.lineTotal);

    const nameText = normalizeText(item.name, "–");
    const descText = item.description ? normalizeText(item.description, "") : "";
    const qtyStr = Number.isFinite(qty) ? qty.toFixed(2) : "0.00";
    const unitStr = String(item.unit ?? "pcs");
    const priceStr = formatCurrency(unitPrice, currency);
    const discStr = (Number.isFinite(discountPct) ? discountPct : 0).toFixed(0) + " %";
    const vatStr = invoice.vatEnabled ? (Number.isFinite(vatRate) ? vatRate : 0).toFixed(0) + " %" : "0 %";
    const totalStr = formatCurrency(lineTotal, currency);

    const rowStartY = y;
    y = drawWrapped(page, nameText, PAGE_MARGIN + 4, y, nameMaxWidth, font, FONT.sizeBody, FONT.lineCompact, COLOR.ink, useUnicodeFont);
    if (descText) {
      y = drawWrapped(page, descText, PAGE_MARGIN + 8, y, nameMaxWidth - 4, font, FONT.sizeSmall, FONT.lineCompact - 1, COLOR.muted, useUnicodeFont);
    }
    const rowEndY = y;
    const rowH = Math.max(ROW_MIN_HEIGHT, rowStartY - rowEndY + 4);

    page.drawText(qtyStr, { x: PAGE_MARGIN + colQty, y: rowStartY - 12, size: FONT.sizeBody, font: font, color: COLOR.ink });
    drawTextSafe(page, unitStr, { x: PAGE_MARGIN + colUnit, y: rowStartY - 12, size: FONT.sizeBody, font: font, color: COLOR.ink }, useUnicodeFont);
    drawTextSafe(page, priceStr, { x: PAGE_MARGIN + colPrice, y: rowStartY - 12, size: FONT.sizeBody, font: font, color: COLOR.ink }, useUnicodeFont);
    drawTextSafe(page, discStr, { x: PAGE_MARGIN + colDisc, y: rowStartY - 12, size: FONT.sizeBody, font: font, color: COLOR.ink }, useUnicodeFont);
    drawTextSafe(page, vatStr, { x: PAGE_MARGIN + colVat, y: rowStartY - 12, size: FONT.sizeBody, font: font, color: COLOR.ink }, useUnicodeFont);
    drawTextSafe(page, totalStr, {
      x: PAGE_MARGIN + colTotalX - font.widthOfTextAtSize(toAsciiForPdf(totalStr), FONT.sizeBody),
      y: rowStartY - 12,
      size: FONT.sizeBody,
      font: fontBold,
      color: COLOR.ink,
    }, useUnicodeFont);

    y = rowStartY - rowH;
  }

  y -= 16;

  // —— Totals: optional rows in muted, then black total bar (quote style) ——
  const totalsLabelX = PAGE_MARGIN + CONTENT_WIDTH - 180;
  const totalsValueX = PAGE_MARGIN + CONTENT_WIDTH - 8;

  const optionalTotals: Array<[string, string]> = [
    ["Medzisucet", formatCurrency(subtotal, currency)],
    ["Zlava", formatCurrency(discountTotal, currency)],
    ["Zaklad dane", formatCurrency(taxBaseTotal, currency)],
    ["DPH", formatCurrency(vatTotal, currency)],
    ["Uhradene", formatCurrency(amountPaid, currency)],
  ];
  for (const [label, value] of optionalTotals) {
    drawTextSafe(page, label, { x: totalsLabelX, y, size: FONT.sizeSmall, font: font, color: COLOR.muted }, useUnicodeFont);
    drawTextSafe(page, value, {
      x: totalsValueX - font.widthOfTextAtSize(toAsciiForPdf(value), FONT.sizeSmall),
      y,
      size: FONT.sizeSmall,
      font: font,
      color: COLOR.muted,
    }, useUnicodeFont);
    y -= FONT.lineCompact;
  }
  y -= 8;

  const totalBarY = y;
  page.drawRectangle({
    x: PAGE_MARGIN,
    y: totalBarY - TOTAL_BAR_HEIGHT,
    width: CONTENT_WIDTH,
    height: TOTAL_BAR_HEIGHT,
    color: COLOR.black,
  });
  const spoluLabel = "Spolu";
  const spoluVal = formatCurrency(total, currency);
  const dueLabel = "Zostava na uhradu";
  const dueVal = formatCurrency(amountDue, currency);
  drawTextSafe(page, spoluLabel, {
    x: PAGE_MARGIN + 16,
    y: totalBarY - 20,
    size: FONT.sizeBody,
    font: fontBold,
    color: COLOR.white,
  }, useUnicodeFont);
  drawTextSafe(page, spoluVal, {
    x: PAGE_MARGIN + CONTENT_WIDTH - 16 - font.widthOfTextAtSize(toAsciiForPdf(spoluVal), FONT.sizeBody),
    y: totalBarY - 20,
    size: FONT.sizeBody,
    font: fontBold,
    color: COLOR.white,
  }, useUnicodeFont);
  drawTextSafe(page, dueLabel, {
    x: PAGE_MARGIN + 16,
    y: totalBarY - 38,
    size: FONT.sizeSmall,
    font: font,
    color: COLOR.white,
  }, useUnicodeFont);
  drawTextSafe(page, dueVal, {
    x: PAGE_MARGIN + CONTENT_WIDTH - 16 - font.widthOfTextAtSize(toAsciiForPdf(dueVal), FONT.sizeSmall),
    y: totalBarY - 38,
    size: FONT.sizeSmall,
    font: fontBold,
    color: COLOR.white,
  }, useUnicodeFont);
  y = totalBarY - TOTAL_BAR_HEIGHT - 20;

  // —— Payment instructions (from snapshot) ——
  const hasPaymentInfo =
    supplier.companyIban ||
    supplier.companySwiftBic ||
    (invoice.variableSymbol && amountDue > 0);
  if (hasPaymentInfo) {
    drawLine(page, y, PAGE_MARGIN, A4_WIDTH - PAGE_MARGIN);
    y -= 12;
    drawTextSafe(page, "Platobne instrukcie", {
      x: PAGE_MARGIN,
      y,
      size: FONT.sizeSection,
      font: fontBold,
      color: COLOR.ink,
    }, useUnicodeFont);
    y -= FONT.lineBody;

    const qrSize = 140;
    const qrPadding = 12;
    const labelHeight = 10;
    const gapAfterLabel = 8;
    const qrBoxHeight = qrPadding + qrSize + gapAfterLabel + labelHeight + qrPadding;
    const qrBoxWidth = qrSize + qrPadding * 2;
    const qrX = PAGE_MARGIN + CONTENT_WIDTH - qrBoxWidth;
    const qrY = y - qrBoxHeight;
    let drewQr = false;

    if (amountDue > 0) {
      const ibanForQr = (supplier.companyIban ?? "").replace(/\s+/g, "").trim();
      const beneficiaryForQr = normalizeText(supplier.companyName, "Beneficiary").trim().slice(0, 70);
      if (ibanForQr.length >= 15) {
        try {
          const dueDateRaw = invoice.dueDate != null ? new Date(invoice.dueDate as Date | string) : new Date();
          const dueDateIso =
            Number.isNaN(dueDateRaw.getTime()) ? new Date().toISOString().slice(0, 10) : dueDateRaw.toISOString().slice(0, 10);
          const payBySquareString = buildPayBySquarePayload({
            amount: amountDue,
            currency: currency.trim().toUpperCase() || "EUR",
            dueDate: dueDateIso,
            variableSymbol: invoice.variableSymbol ?? undefined,
            paymentNote: "Uhrada faktury c. " + (invoice.invoiceNumber ?? "").trim().slice(0, 130),
            beneficiaryName: beneficiaryForQr,
            iban: ibanForQr,
            bic: supplier.companySwiftBic ?? undefined,
          });
          const qrPngBytes = await QRCode.toBuffer(payBySquareString, {
            type: "png",
            margin: 2,
            width: 320,
            errorCorrectionLevel: "M",
          });
          const qrImage = await doc.embedPng(qrPngBytes);

          page.drawRectangle({
            x: qrX,
            y: qrY,
            width: qrBoxWidth,
            height: qrBoxHeight,
            color: COLOR.card,
            borderColor: COLOR.line,
            borderWidth: 1,
          });
          page.drawImage(qrImage, {
            x: qrX + qrPadding,
            y: qrY + qrPadding + labelHeight + gapAfterLabel,
            width: qrSize,
            height: qrSize,
          });
          drawTextSafe(page, "PAY by square", {
            x: qrX + qrBoxWidth / 2 - font.widthOfTextAtSize(toAsciiForPdf("PAY by square"), FONT.sizeSmall) / 2,
            y: qrY + qrPadding + 4,
            size: FONT.sizeSmall,
            font: font,
            color: COLOR.muted,
          }, useUnicodeFont);
          drewQr = true;
        } catch (qrErr) {
          console.warn("Invoice PDF: Pay by square QR generation failed", {
            error: qrErr instanceof Error ? qrErr.message : String(qrErr),
          });
        }
      }
    }

    if (invoice.variableSymbol && amountDue > 0) {
      drawTextSafe(page, "Variabilny symbol: " + (invoice.variableSymbol || "–"), {
        x: PAGE_MARGIN,
        y,
        size: FONT.sizeBody,
        font: font,
        color: COLOR.text,
      }, useUnicodeFont);
      y -= FONT.lineCompact;
      drawTextSafe(page, "Suma k uhrade: " + formatCurrency(amountDue, currency), {
        x: PAGE_MARGIN,
        y,
        size: FONT.sizeBody,
        font: fontBold,
        color: COLOR.ink,
      }, useUnicodeFont);
      y -= FONT.lineCompact + 4;
    }
    if (supplier.companyIban) {
      drawTextSafe(page, "IBAN: " + supplier.companyIban, {
        x: PAGE_MARGIN,
        y,
        size: FONT.sizeBody,
        font: font,
        color: COLOR.text,
      }, useUnicodeFont);
      y -= FONT.lineCompact;
    }
    if (supplier.companySwiftBic) {
      drawTextSafe(page, "SWIFT/BIC: " + supplier.companySwiftBic, {
        x: PAGE_MARGIN,
        y,
        size: FONT.sizeBody,
        font: font,
        color: COLOR.text,
      }, useUnicodeFont);
      y -= FONT.lineCompact;
    }
    y = drewQr ? Math.min(y, qrY + qrBoxHeight) - 12 : y - 12;
  }

  // —— Legal note ——
  if (invoice.legalNote) {
    if (y < PAGE_MARGIN + 60) {
      page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
      pages.push(page);
      y = A4_HEIGHT - PAGE_MARGIN;
    }
    drawTextSafe(page, "Pravna poznamka", {
      x: PAGE_MARGIN,
      y,
      size: FONT.sizeSection,
      font: fontBold,
      color: COLOR.ink,
    }, useUnicodeFont);
    y -= FONT.lineBody;
    y = drawWrapped(page, invoice.legalNote, PAGE_MARGIN, y, CONTENT_WIDTH, font, FONT.sizeBody, FONT.lineBody, COLOR.text, useUnicodeFont);
    y -= 14;
  }

  // —— Internal note (optional) ——
  if (invoice.note) {
    if (y < PAGE_MARGIN + 40) {
      page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
      pages.push(page);
      y = A4_HEIGHT - PAGE_MARGIN;
    }
    drawTextSafe(page, "Poznamka", {
      x: PAGE_MARGIN,
      y,
      size: FONT.sizeSection,
      font: fontBold,
      color: COLOR.ink,
    }, useUnicodeFont);
    y -= FONT.lineBody;
    y = drawWrapped(page, invoice.note, PAGE_MARGIN, y, CONTENT_WIDTH, font, FONT.sizeBody, FONT.lineBody, COLOR.text, useUnicodeFont);
    y -= 14;
  }

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const footerY = PAGE_MARGIN + 10;
    const footerBarH = 24;
    p.drawRectangle({
      x: PAGE_MARGIN,
      y: footerY - 4,
      width: CONTENT_WIDTH,
      height: footerBarH,
      color: COLOR.lineSoft,
      borderColor: COLOR.line,
      borderWidth: 0.5,
    });
    drawTextSafe(p, "Cenovka", {
      x: PAGE_MARGIN + 12,
      y: footerY + 4,
      size: FONT.sizeSmall,
      font: font,
      color: COLOR.muted,
    }, useUnicodeFont);
    const pageNum = `Strana ${i + 1} / ${pages.length}`;
    drawTextSafe(p, pageNum, {
      x: A4_WIDTH - PAGE_MARGIN - 12 - font.widthOfTextAtSize(toAsciiForPdf(pageNum), FONT.sizeSmall),
      y: footerY + 4,
      size: FONT.sizeSmall,
      font: font,
      color: COLOR.muted,
    }, useUnicodeFont);
  }

  const bytes = await doc.save();
  const filename = buildFileName(invoice.invoiceNumber != null ? String(invoice.invoiceNumber) : "faktura");
  return {
    bytes,
    filename,
    invoiceId: invoice.id,
  };
}
