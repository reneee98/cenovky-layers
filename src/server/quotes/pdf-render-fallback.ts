import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

import { isQuoteItemSectionDescription } from "@/lib/quotes/items";
import { calculateLineTotal } from "@/lib/quotes/totals";
import { parseItemDescription } from "@/server/quotes/item-description-format";
import type { QuoteVersionSnapshot } from "@/server/quotes/pdf-snapshot";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 42;
const BASE_FONT_SIZE = 10;
const BASE_LINE_HEIGHT = 14;

function getLocale(snapshot: QuoteVersionSnapshot): string {
  return snapshot.quote.language === "sk" ? "sk-SK" : "en-GB";
}

function cleanText(value: string | null | undefined, fallback = "-"): string {
  if (!value) {
    return fallback;
  }

  const normalized = value.replace(/\r\n/g, "\n").trim();
  return normalized.length > 0 ? normalized : fallback;
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatCurrency(value: number, currency: string, locale: string): string {
  const normalizedCurrency = currency.trim().toUpperCase() || "EUR";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${normalizedCurrency}`;
  }
}

function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter((word) => word.length > 0);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let currentLine = words[0];
    for (let index = 1; index < words.length; index += 1) {
      const nextLine = `${currentLine} ${words[index]}`;
      if (font.widthOfTextAtSize(nextLine, fontSize) <= maxWidth) {
        currentLine = nextLine;
      } else {
        lines.push(currentLine);
        currentLine = words[index];
      }
    }

    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

function drawWrappedText(params: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: PDFFont;
  fontSize: number;
  lineHeight: number;
}): number {
  const lines = wrapText(params.text, params.maxWidth, params.font, params.fontSize);
  let cursorY = params.y;

  for (const line of lines) {
    params.page.drawText(line, {
      x: params.x,
      y: cursorY,
      size: params.fontSize,
      font: params.font,
    });
    cursorY -= params.lineHeight;
  }

  return cursorY;
}

function tokenizeRichSegments(
  segments: Array<{ text: string; bold: boolean }>,
): Array<{ text: string; bold: boolean }> {
  return segments.flatMap((segment) =>
    segment.text
      .split(/(\s+)/)
      .filter((part) => part.length > 0)
      .map((part) => ({
        text: part,
        bold: segment.bold,
      })),
  );
}

function wrapRichTextLines(params: {
  segments: Array<{ text: string; bold: boolean }>;
  maxWidth: number;
  regularFont: PDFFont;
  boldFont: PDFFont;
  fontSize: number;
  prefix?: string;
}): Array<Array<{ text: string; bold: boolean }>> {
  const tokens = tokenizeRichSegments(params.segments);
  const lines: Array<Array<{ text: string; bold: boolean }>> = [];
  let currentLine: Array<{ text: string; bold: boolean }> = [];
  let currentWidth = 0;
  const prefixWidth = params.prefix
    ? params.regularFont.widthOfTextAtSize(params.prefix, params.fontSize)
    : 0;

  for (const token of tokens) {
    const font = token.bold ? params.boldFont : params.regularFont;
    const tokenWidth = font.widthOfTextAtSize(token.text, params.fontSize);
    const effectiveLineWidth = lines.length === 0 ? currentWidth + prefixWidth : currentWidth;

    if (
      currentLine.length > 0 &&
      effectiveLineWidth + tokenWidth > params.maxWidth &&
      token.text.trim().length > 0
    ) {
      lines.push(currentLine);
      currentLine = token.text.trim().length === 0 ? [] : [token];
      currentWidth = token.text.trim().length === 0 ? 0 : tokenWidth;
      continue;
    }

    if (currentLine.length === 0 && token.text.trim().length === 0) {
      continue;
    }

    currentLine.push(token);
    currentWidth += tokenWidth;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [[{ text: "", bold: false }]];
}

function drawWrappedRichText(params: {
  page: PDFPage;
  segments: Array<{ text: string; bold: boolean }>;
  x: number;
  y: number;
  maxWidth: number;
  regularFont: PDFFont;
  boldFont: PDFFont;
  fontSize: number;
  lineHeight: number;
  prefix?: string;
}): number {
  const lines = wrapRichTextLines({
    segments: params.segments,
    maxWidth: params.maxWidth,
    regularFont: params.regularFont,
    boldFont: params.boldFont,
    fontSize: params.fontSize,
    prefix: params.prefix,
  });
  let cursorY = params.y;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    let cursorX = params.x;

    if (lineIndex === 0 && params.prefix) {
      params.page.drawText(params.prefix, {
        x: cursorX,
        y: cursorY,
        size: params.fontSize,
        font: params.regularFont,
      });
      cursorX += params.regularFont.widthOfTextAtSize(params.prefix, params.fontSize);
    }

    for (const segment of lines[lineIndex]) {
      const font = segment.bold ? params.boldFont : params.regularFont;
      params.page.drawText(segment.text, {
        x: cursorX,
        y: cursorY,
        size: params.fontSize,
        font,
      });
      cursorX += font.widthOfTextAtSize(segment.text, params.fontSize);
    }

    cursorY -= params.lineHeight;
  }

  return cursorY;
}

function drawLabel(
  page: PDFPage,
  label: string,
  value: string,
  y: number,
  boldFont: PDFFont,
  regularFont: PDFFont,
): number {
  page.drawText(label, {
    x: PAGE_MARGIN,
    y,
    size: BASE_FONT_SIZE,
    font: boldFont,
  });

  page.drawText(value, {
    x: PAGE_MARGIN + 140,
    y,
    size: BASE_FONT_SIZE,
    font: regularFont,
  });

  return y - BASE_LINE_HEIGHT;
}

function buildClientLines(snapshot: QuoteVersionSnapshot): string[] {
  const lines = [
    snapshot.client.name,
    snapshot.client.billingAddressLine1,
    snapshot.client.billingAddressLine2,
    `${snapshot.client.zip} ${snapshot.client.city}`.trim(),
    snapshot.client.country,
    snapshot.client.ico ? `IČO: ${snapshot.client.ico}` : null,
    snapshot.client.dic ? `DIČ: ${snapshot.client.dic}` : null,
    snapshot.client.icdph ? `IČ DPH: ${snapshot.client.icdph}` : null,
    `Kontakt: ${snapshot.client.contactName}`,
    snapshot.client.contactEmail,
    snapshot.client.contactPhone,
  ];

  return lines.map((line) => cleanText(line, "")).filter((line) => line.length > 0);
}

function buildCompanyLines(snapshot: QuoteVersionSnapshot): string[] {
  const lines = [
    snapshot.company.companyName,
    snapshot.company.companyAddress,
    snapshot.company.companyIco ? `IČO: ${snapshot.company.companyIco}` : null,
    snapshot.company.companyDic ? `DIČ: ${snapshot.company.companyDic}` : null,
    snapshot.company.companyIcdph ? `IČ DPH: ${snapshot.company.companyIcdph}` : null,
    snapshot.company.companyEmail,
    snapshot.company.companyPhone,
    snapshot.company.companyWebsite,
  ];

  return lines.map((line) => cleanText(line, "")).filter((line) => line.length > 0);
}

export async function renderQuotePdfFallback(
  snapshot: QuoteVersionSnapshot,
): Promise<Uint8Array> {
  const locale = getLocale(snapshot);
  const title = snapshot.quote.language === "sk" ? "Cenová ponuka" : "Quote";
  const introHeading = snapshot.quote.language === "sk" ? "Úvod" : "Intro";
  const clientHeading = snapshot.quote.language === "sk" ? "Klient" : "Client";
  const companyHeading = snapshot.quote.language === "sk" ? "Dodávateľ" : "Supplier";
  const itemsHeading = snapshot.quote.language === "sk" ? "Položky" : "Items";
  const totalsHeading = snapshot.quote.language === "sk" ? "Súhrn" : "Summary";
  const termsHeading = snapshot.quote.language === "sk" ? "Podmienky" : "Terms";
  const revisionsLine =
    snapshot.quote.language === "sk"
      ? `V cene sú zahrnuté ${snapshot.quote.revisionsIncluded} kolá revízií.`
      : `${snapshot.quote.revisionsIncluded} revision rounds are included.`;

  const doc = await PDFDocument.create();
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const page1 = doc.addPage([A4_WIDTH, A4_HEIGHT]);
  let y = A4_HEIGHT - PAGE_MARGIN;

  page1.drawText(title, {
    x: PAGE_MARGIN,
    y,
    size: 24,
    font: boldFont,
  });
  y -= 30;

  y = drawLabel(
    page1,
    snapshot.quote.language === "sk" ? "Číslo ponuky" : "Quote number",
    cleanText(snapshot.quote.number),
    y,
    boldFont,
    regularFont,
  );
  y = drawLabel(
    page1,
    snapshot.quote.language === "sk" ? "Vytvorené" : "Created",
    formatDate(snapshot.quote.createdAt, locale),
    y,
    boldFont,
    regularFont,
  );
  y = drawLabel(
    page1,
    snapshot.quote.language === "sk" ? "Platné do" : "Valid until",
    formatDate(snapshot.quote.validUntil, locale),
    y,
    boldFont,
    regularFont,
  );
  y -= 10;

  page1.drawText(clientHeading, { x: PAGE_MARGIN, y, size: 12, font: boldFont });
  page1.drawText(companyHeading, { x: A4_WIDTH / 2, y, size: 12, font: boldFont });
  y -= BASE_LINE_HEIGHT;

  const leftLines = buildClientLines(snapshot);
  const rightLines = buildCompanyLines(snapshot);
  const blockHeight = Math.max(leftLines.length, rightLines.length) * BASE_LINE_HEIGHT;

  let leftY = y;
  for (const line of leftLines) {
    leftY = drawWrappedText({
      page: page1,
      text: line,
      x: PAGE_MARGIN,
      y: leftY,
      maxWidth: A4_WIDTH / 2 - PAGE_MARGIN - 8,
      font: regularFont,
      fontSize: BASE_FONT_SIZE,
      lineHeight: BASE_LINE_HEIGHT,
    });
  }

  let rightY = y;
  for (const line of rightLines) {
    rightY = drawWrappedText({
      page: page1,
      text: line,
      x: A4_WIDTH / 2,
      y: rightY,
      maxWidth: A4_WIDTH / 2 - PAGE_MARGIN,
      font: regularFont,
      fontSize: BASE_FONT_SIZE,
      lineHeight: BASE_LINE_HEIGHT,
    });
  }

  y -= blockHeight + 8;
  page1.drawText(introHeading, { x: PAGE_MARGIN, y, size: 12, font: boldFont });
  y -= BASE_LINE_HEIGHT;
  drawWrappedText({
    page: page1,
    text: cleanText(snapshot.quote.introContentMarkdown, "-"),
    x: PAGE_MARGIN,
    y,
    maxWidth: A4_WIDTH - PAGE_MARGIN * 2,
    font: regularFont,
    fontSize: BASE_FONT_SIZE,
    lineHeight: BASE_LINE_HEIGHT,
  });

  let itemsPage = doc.addPage([A4_WIDTH, A4_HEIGHT]);
  let itemsY = A4_HEIGHT - PAGE_MARGIN;
  itemsPage.drawText(itemsHeading, { x: PAGE_MARGIN, y: itemsY, size: 16, font: boldFont });
  itemsY -= 22;

  const headerLine = snapshot.quote.language === "sk"
    ? "Názov položky | Množstvo | Cena | Spolu"
    : "Item name | Qty | Price | Total";
  itemsPage.drawText(headerLine, {
    x: PAGE_MARGIN,
    y: itemsY,
    size: BASE_FONT_SIZE,
    font: boldFont,
  });
  itemsY -= BASE_LINE_HEIGHT;

  const sortedItems = [...snapshot.items].sort((left, right) => left.sortOrder - right.sortOrder);
  for (const item of sortedItems) {
    if (itemsY < PAGE_MARGIN + 20) {
      itemsPage = doc.addPage([A4_WIDTH, A4_HEIGHT]);
      itemsY = A4_HEIGHT - PAGE_MARGIN;
    }

    if (isQuoteItemSectionDescription(item.description)) {
      itemsPage.drawText(cleanText(item.name), {
        x: PAGE_MARGIN,
        y: itemsY,
        size: BASE_FONT_SIZE + 1,
        font: boldFont,
      });
      itemsY -= BASE_LINE_HEIGHT;
      continue;
    }

    const lineTotal = calculateLineTotal({
      qty: item.qty,
      unitPrice: item.unitPrice,
      discountPct: item.discountPct,
    });
    const row = [
      cleanText(item.name),
      `${item.qty.toFixed(2)} ${item.unit}`,
      formatCurrency(item.unitPrice, snapshot.quote.currency, locale),
      formatCurrency(lineTotal, snapshot.quote.currency, locale),
    ].join(" | ");

    itemsY = drawWrappedText({
      page: itemsPage,
      text: row,
      x: PAGE_MARGIN,
      y: itemsY,
      maxWidth: A4_WIDTH - PAGE_MARGIN * 2,
      font: regularFont,
      fontSize: BASE_FONT_SIZE,
      lineHeight: BASE_LINE_HEIGHT,
    }) - 2;

    const descriptionLines = parseItemDescription(item.description);
    for (const descriptionLine of descriptionLines) {
      if (descriptionLine.kind === "spacer") {
        itemsY -= BASE_LINE_HEIGHT - 4;
        continue;
      }

      itemsY = drawWrappedRichText({
        page: itemsPage,
        segments: descriptionLine.segments,
        x: PAGE_MARGIN + 10,
        y: itemsY,
        maxWidth: A4_WIDTH - PAGE_MARGIN * 2 - 10,
        regularFont,
        boldFont,
        fontSize: BASE_FONT_SIZE - 1,
        lineHeight: BASE_LINE_HEIGHT - 2,
        prefix: descriptionLine.kind === "bullet" ? "• " : undefined,
      });
    }

    if (descriptionLines.length > 0) {
      itemsY -= 2;
    }
  }

  const page3 = doc.addPage([A4_WIDTH, A4_HEIGHT]);
  let totalsY = A4_HEIGHT - PAGE_MARGIN;
  page3.drawText(totalsHeading, { x: PAGE_MARGIN, y: totalsY, size: 16, font: boldFont });
  totalsY -= 24;

  totalsY = drawLabel(
    page3,
    snapshot.quote.language === "sk" ? "Medzisúčet" : "Subtotal",
    formatCurrency(snapshot.totals.subtotal, snapshot.quote.currency, locale),
    totalsY,
    boldFont,
    regularFont,
  );
  totalsY = drawLabel(
    page3,
    snapshot.quote.language === "sk" ? "Zľava spolu" : "Total discount",
    `-${formatCurrency(snapshot.totals.totalDiscount, snapshot.quote.currency, locale)}`,
    totalsY,
    boldFont,
    regularFont,
  );
  totalsY = drawLabel(
    page3,
    snapshot.quote.vatEnabled
      ? snapshot.quote.language === "sk"
        ? `DPH ${snapshot.quote.vatRate.toFixed(2)}%`
        : `VAT ${snapshot.quote.vatRate.toFixed(2)}%`
      : snapshot.quote.language === "sk"
        ? "DPH vypnuté"
        : "VAT disabled",
    formatCurrency(snapshot.totals.vatAmount, snapshot.quote.currency, locale),
    totalsY,
    boldFont,
    regularFont,
  );
  totalsY = drawLabel(
    page3,
    snapshot.quote.language === "sk" ? "Celkom" : "Grand total",
    formatCurrency(snapshot.totals.grandTotal, snapshot.quote.currency, locale),
    totalsY - 4,
    boldFont,
    regularFont,
  );

  totalsY -= 14;
  page3.drawText(revisionsLine, {
    x: PAGE_MARGIN,
    y: totalsY,
    size: BASE_FONT_SIZE,
    font: regularFont,
  });
  totalsY -= 24;

  page3.drawText(termsHeading, { x: PAGE_MARGIN, y: totalsY, size: 12, font: boldFont });
  totalsY -= BASE_LINE_HEIGHT;
  drawWrappedText({
    page: page3,
    text: cleanText(snapshot.quote.termsContentMarkdown, "-"),
    x: PAGE_MARGIN,
    y: totalsY,
    maxWidth: A4_WIDTH - PAGE_MARGIN * 2,
    font: regularFont,
    fontSize: BASE_FONT_SIZE,
    lineHeight: BASE_LINE_HEIGHT,
  });

  const generatedAt = new Date(snapshot.generatedAt);
  if (!Number.isNaN(generatedAt.getTime())) {
    doc.setCreationDate(generatedAt);
    doc.setModificationDate(generatedAt);
  }
  doc.setTitle(`${title} ${snapshot.quote.number}`);
  doc.setAuthor(snapshot.company.companyName);
  doc.setCreator("Quote Builder");
  doc.setProducer("Quote Builder");

  return doc.save({ useObjectStreams: false });
}
