import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright-core";

import { isQuoteItemSectionDescription } from "@/lib/quotes/items";
import { calculateLineTotal } from "@/lib/quotes/totals";
import type { QuoteVersionSnapshot } from "@/server/quotes/pdf-snapshot";

const PDF_TEMPLATE_HTML_PATH = resolve(process.cwd(), "pdf/template.html");
const PDF_TEMPLATE_CSS_PATH = resolve(process.cwd(), "pdf/template.css");
const FONT_INTER_LATIN_EXT_PATH = resolve(
  process.cwd(),
  "pdf/assets/fonts/inter-latin-ext.woff2",
);
const FONT_INTER_LATIN_PATH = resolve(
  process.cwd(),
  "pdf/assets/fonts/inter-latin.woff2",
);
const FONT_TINOS_LATIN_EXT_PATH = resolve(
  process.cwd(),
  "pdf/assets/fonts/tinos-bold-latin-ext.woff2",
);
const FONT_TINOS_LATIN_PATH = resolve(
  process.cwd(),
  "pdf/assets/fonts/tinos-bold-latin.woff2",
);

const CHROME_EXECUTABLE_CANDIDATES = [
  process.env.PDF_CHROME_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter((value): value is string => Boolean(value && value.trim().length > 0));

const LOCALE_BY_LANGUAGE: Record<QuoteVersionSnapshot["quote"]["language"], string> = {
  sk: "sk-SK",
  en: "en-US",
};

type CachedTemplate = {
  html: string;
  css: string;
};

let cachedTemplate: CachedTemplate | null = null;
let cachedChromeExecutable: string | null | undefined;

type LocaleLabels = {
  titleLabel: string;
  dateLabel: string;
  clientCardTitle: string;
  supplierCardTitle: string;
  tableColItem: string;
  tableColQty: string;
  tableColPrice: (currencySymbol: string) => string;
  tableColTotal: (currencySymbol: string) => string;
  totalLabelVatOn: string;
  totalLabelVatOff: string;
  totalDiscountLabel: (discountPct: string) => string;
  vatTotalLabel: (vatRate: string) => string;
  vatTotalLabelDisabled: string;
  netTotalLabel: string;
  notesTitle: string;
  noteLine1: string;
  noteLine2: (revisions: number) => string;
  noteLine3: string;
  noteLine4: string;
};

const LABELS: Record<QuoteVersionSnapshot["quote"]["language"], LocaleLabels> = {
  sk: {
    titleLabel: "Cenová ponuka",
    dateLabel: "Dátum",
    clientCardTitle: "Fakturačné údaje klienta:",
    supplierCardTitle: "Fakturačné údaje dodávateľa:",
    tableColItem: "Názov položky",
    tableColQty: "Počet",
    tableColPrice: (currencySymbol) => `Cena (${currencySymbol})`,
    tableColTotal: (currencySymbol) => `Spolu (${currencySymbol})`,
    totalLabelVatOn: "Celková cena s DPH",
    totalLabelVatOff: "Celková cena",
    totalDiscountLabel: (discountPct) => `Zľava spolu (${discountPct}%)`,
    vatTotalLabel: (vatRate) => `DPH ${vatRate}%`,
    vatTotalLabelDisabled: "DPH (vypnuté)",
    netTotalLabel: "Cena bez DPH",
    notesTitle: "Doplňujúce informácie:",
    noteLine1: "Ceny sú uvedené bez DPH.",
    noteLine2: (revisions) =>
      `V cene sú zahrnuté ${revisions} kolá revízií na každý návrh. Každá ďalšia úprava nad rámec bude účtovaná podľa hodinovej sadzby 30 € / h.`,
    noteLine3: "Ak máte akékoľvek otázky alebo špecifické požiadavky, radi ich doladíme.",
    noteLine4: "Tešíme sa na spoluprácu!",
  },
  en: {
    titleLabel: "Quote",
    dateLabel: "Date",
    clientCardTitle: "Client billing details:",
    supplierCardTitle: "Supplier billing details:",
    tableColItem: "Item name",
    tableColQty: "Qty",
    tableColPrice: (currencySymbol) => `Price (${currencySymbol})`,
    tableColTotal: (currencySymbol) => `Total (${currencySymbol})`,
    totalLabelVatOn: "Grand total incl. VAT",
    totalLabelVatOff: "Grand total",
    totalDiscountLabel: (discountPct) => `Total discount (${discountPct}%)`,
    vatTotalLabel: (vatRate) => `VAT ${vatRate}%`,
    vatTotalLabelDisabled: "VAT (disabled)",
    netTotalLabel: "Net amount",
    notesTitle: "Additional information:",
    noteLine1: "Prices are shown excluding VAT.",
    noteLine2: (revisions) => `${revisions} revision rounds are included.`,
    noteLine3: "If you have any questions or specific requests, we can fine-tune everything.",
    noteLine4: "Looking forward to collaborating with you!",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function plainTextFromMarkdown(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .trim();
}

function ensureNonEmpty(value: string, fallback = "-"): string {
  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : fallback;
}

function getLocale(snapshot: QuoteVersionSnapshot): string {
  return LOCALE_BY_LANGUAGE[snapshot.quote.language];
}

function formatDateValue(value: string, locale: string): string {
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

function formatCurrencyValue(value: number, currency: string, locale: string): string {
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

function normalizeCurrencyToken(value: string, currency: string): string {
  const normalizedCurrency = currency.trim().toUpperCase() || "EUR";

  if (normalizedCurrency !== "EUR") {
    return value;
  }

  return value.replace(/\bEUR\b/g, "€");
}

function formatQuantityValue(value: number, locale: string): string {
  const normalized = Number.isFinite(value) ? value : 0;
  const decimals =
    Number.isInteger(normalized) ? 0 : Number.isInteger(normalized * 10) ? 1 : 2;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(normalized);
}

function formatPercentValue(value: number, locale: string): string {
  const normalized = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(normalized);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function getCurrencySymbol(currency: string, locale: string): string {
  const normalizedCurrency = currency.trim().toUpperCase() || "EUR";

  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(1);

    const symbol = parts.find((part) => part.type === "currency")?.value;
    return symbol ? normalizeWhitespace(symbol) : normalizedCurrency;
  } catch {
    return normalizedCurrency;
  }
}

function buildCompanyFooterLine(snapshot: QuoteVersionSnapshot): string {
  const parts = [
    snapshot.company.companyName,
    snapshot.company.companyIco ? `IČO: ${snapshot.company.companyIco}` : "",
    snapshot.company.companyDic ? `DIČ: ${snapshot.company.companyDic}` : "",
    snapshot.company.companyIcdph ? `IČ DPH: ${snapshot.company.companyIcdph}` : "",
  ]
    .map((part) => normalizeWhitespace(part))
    .filter((part) => part.length > 0);

  return parts.join(" | ");
}

function buildClientLines(snapshot: QuoteVersionSnapshot): string[] {
  const lines = [
    snapshot.client.name,
    snapshot.client.billingAddressLine1,
    snapshot.client.billingAddressLine2 ?? "",
    `${snapshot.client.zip} ${snapshot.client.city}`.trim(),
  ];

  if (snapshot.client.ico) {
    lines.push(`IČO: ${snapshot.client.ico}`);
  }
  if (snapshot.client.dic) {
    lines.push(`DIČ: ${snapshot.client.dic}`);
  }
  if (snapshot.client.icdph) {
    lines.push(`IČ DPH: ${snapshot.client.icdph}`);
  }

  return lines
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length > 0);
}

function buildSupplierLines(snapshot: QuoteVersionSnapshot): string[] {
  const addressParts = snapshot.company.companyAddress
    .split(/\n|,/)
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length > 0);

  const lines = [snapshot.company.companyName, ...addressParts];

  if (snapshot.company.companyIco) {
    lines.push(`IČO: ${snapshot.company.companyIco}`);
  }
  if (snapshot.company.companyDic) {
    lines.push(`DIČ: ${snapshot.company.companyDic}`);
  }
  if (snapshot.company.companyIcdph) {
    lines.push(`IČ DPH: ${snapshot.company.companyIcdph}`);
  }

  return lines
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length > 0);
}

function buildBillingLinesHtml(lines: string[]): string {
  return lines
    .map((line, index) => {
      const className =
        index === 0
          ? "billing-line billing-line-strong"
          : "billing-line billing-line-regular";
      return `<p class="${className}">${escapeHtml(ensureNonEmpty(line))}</p>`;
    })
    .join("\n");
}

const ITEM_DESCRIPTION_BULLET_PATTERN = /^(?:[-*•]\s+|\d+[.)]\s+)/;

function getItemDescriptionLines(description: string | null): string[] {
  if (!description) {
    return [];
  }

  return description
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function stripItemDescriptionBulletPrefix(line: string): string {
  return line.replace(ITEM_DESCRIPTION_BULLET_PATTERN, "").trim();
}

function buildItemDescriptionHtml(description: string | null): string {
  const lines = getItemDescriptionLines(description);

  if (lines.length === 0) {
    return "";
  }

  const allBulletLines = lines.every((line) =>
    ITEM_DESCRIPTION_BULLET_PATTERN.test(line),
  );

  if (allBulletLines) {
    const listItemsHtml = lines
      .map((line) => `<li>${escapeHtml(ensureNonEmpty(stripItemDescriptionBulletPrefix(line)))}</li>`)
      .join("\n");

    return `<ul class="item-description-list">${listItemsHtml}</ul>`;
  }

  const paragraphLinesHtml = lines
    .map((line) => `<p class="item-description">${escapeHtml(ensureNonEmpty(line))}</p>`)
    .join("\n");

  return `<div class="item-description-block">${paragraphLinesHtml}</div>`;
}

type ItemRowRender = {
  html: string;
  weight: number;
};

const ITEMS_SPLIT_MIN_ROWS = 16;
const FIRST_PAGE_TABLE_WEIGHT_LIMIT = 15.75;

function buildItemsRowRenders(
  snapshot: QuoteVersionSnapshot,
  locale: string,
): ItemRowRender[] {
  const renderedRows = new Map(
    (snapshot.rendered?.itemRows ?? []).map((row) => [row.id, row]),
  );

  return [...snapshot.items]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item) => {
      const rendered = renderedRows.get(item.id);
      const itemName = escapeHtml(ensureNonEmpty(item.name));
      const isSection = isQuoteItemSectionDescription(item.description);

      if (isSection) {
        return {
          weight: 0.85,
          html: `
          <tr class="group-row">
            <td colspan="4">${itemName}</td>
          </tr>
        `.trim(),
        };
      }

      const itemDescriptionHtml = buildItemDescriptionHtml(item.description);
      const descriptionLineCount = getItemDescriptionLines(item.description).length;
      const quantity = escapeHtml(
        rendered?.qty
          ? ensureNonEmpty(rendered.qty)
          : formatQuantityValue(item.qty, locale),
      );
      const unitPrice = escapeHtml(
        normalizeCurrencyToken(
          rendered?.unitPrice
            ? ensureNonEmpty(rendered.unitPrice)
            : formatCurrencyValue(item.unitPrice, snapshot.quote.currency, locale),
          snapshot.quote.currency,
        ),
      );
      const lineTotal = escapeHtml(
        normalizeCurrencyToken(
          rendered?.lineTotal
            ? ensureNonEmpty(rendered.lineTotal)
            : formatCurrencyValue(
                calculateLineTotal(item),
                snapshot.quote.currency,
                locale,
              ),
          snapshot.quote.currency,
        ),
      );

      return {
        weight:
          descriptionLineCount > 0
            ? 1 + Math.min(descriptionLineCount, 6) * 0.32
            : 1,
        html: `
        <tr class="item-row">
          <td>
            <p class="item-main">${itemName}</p>
            ${itemDescriptionHtml}
          </td>
          <td class="num"><p class="cell-value">${quantity}</p></td>
          <td class="num"><p class="cell-value">${unitPrice}</p></td>
          <td class="num"><p class="cell-value cell-total">${lineTotal}</p></td>
        </tr>
      `.trim(),
      };
    })
    .filter((row): row is ItemRowRender => Boolean(row));
}

function splitItemRowsForSummary(rows: ItemRowRender[]): ItemRowRender[][] {
  if (rows.length < ITEMS_SPLIT_MIN_ROWS) {
    return [rows];
  }

  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);

  if (totalWeight <= FIRST_PAGE_TABLE_WEIGHT_LIMIT) {
    return [rows];
  }

  let runningWeight = 0;
  let splitIndex = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const nextWeight = runningWeight + rows[index].weight;

    if (nextWeight > FIRST_PAGE_TABLE_WEIGHT_LIMIT && index > 0) {
      break;
    }

    runningWeight = nextWeight;
    splitIndex = index + 1;
  }

  if (splitIndex <= 0 || splitIndex >= rows.length) {
    return [rows];
  }

  return [rows.slice(0, splitIndex), rows.slice(splitIndex)];
}

function buildItemsTableHtml(
  rowHtml: string,
  labels: LocaleLabels,
  currencySymbol: string,
): string {
  return `
    <div class="items-table-shell">
      <table class="items-table">
        <colgroup>
          <col class="col-item" />
          <col class="col-qty" />
          <col class="col-price" />
          <col class="col-total" />
        </colgroup>
        <thead>
          <tr>
            <th>${escapeHtml(labels.tableColItem)}</th>
            <th class="num">${escapeHtml(labels.tableColQty)}</th>
            <th class="num">${escapeHtml(labels.tableColPrice(currencySymbol))}</th>
            <th class="num">${escapeHtml(labels.tableColTotal(currencySymbol))}</th>
          </tr>
        </thead>
        <tbody>
          ${rowHtml}
        </tbody>
      </table>
    </div>
  `.trim();
}

function buildItemsTablesHtml(
  snapshot: QuoteVersionSnapshot,
  locale: string,
  labels: LocaleLabels,
  currencySymbol: string,
): string {
  const rowRenders = buildItemsRowRenders(snapshot, locale);

  if (rowRenders.length === 0) {
    const emptyRowsHtml = `
      <tr class="item-row">
        <td colspan="4"><p class="item-main">-</p></td>
      </tr>
    `.trim();

    return `<div class="items-table-block">${buildItemsTableHtml(emptyRowsHtml, labels, currencySymbol)}</div>`;
  }

  const tableChunks = splitItemRowsForSummary(rowRenders)
    .filter((chunk) => chunk.length > 0)
    .map((chunk, index) => {
      const chunkRowsHtml = chunk.map((row) => row.html).join("\n");
      const blockClassName =
        index === 0 ? "items-table-block" : "items-table-block items-table-block-break";

      return `
        <div class="${blockClassName}">
          ${buildItemsTableHtml(chunkRowsHtml, labels, currencySymbol)}
        </div>
      `.trim();
    });

  return tableChunks.join("\n");
}

function buildLogoHtml(snapshot: QuoteVersionSnapshot): string {
  if (snapshot.company.logoImage) {
    const imageUrl = `data:${snapshot.company.logoImage.mimeType};base64,${snapshot.company.logoImage.base64}`;
    return `<img class="brand-logo-image" src="${imageUrl}" alt="Logo" />`;
  }

  return `<p class="brand-logo-fallback">layers<sup>™</sup></p>`;
}

function getNotesLines(snapshot: QuoteVersionSnapshot, labels: LocaleLabels): {
  line1: string;
  line2: string;
} {
  const line2 =
    snapshot.rendered?.revisionLine && snapshot.rendered.revisionLine.trim().length > 0
      ? snapshot.rendered.revisionLine
      : labels.noteLine2(snapshot.quote.revisionsIncluded);

  return {
    line1: labels.noteLine1,
    line2,
  };
}

const TERMS_LIST_LINE_PATTERN = /^(?:[-*•]\s+|\d+[.)]\s+)/;

function stripTermsListPrefix(line: string): string {
  return line.replace(TERMS_LIST_LINE_PATTERN, "").trim();
}

function buildTermsHtml(snapshot: QuoteVersionSnapshot, labels: LocaleLabels): string {
  const lines = plainTextFromMarkdown(snapshot.quote.termsContentMarkdown)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [
      `<p class="note-paragraph">${escapeHtml(ensureNonEmpty(labels.noteLine3))}</p>`,
      `<p class="note-paragraph">${escapeHtml(ensureNonEmpty(labels.noteLine4))}</p>`,
    ].join("\n");
  }

  const htmlParts: string[] = [];
  let listItems: string[] = [];

  const flushListItems = () => {
    if (listItems.length === 0) {
      return;
    }

    const listHtml = listItems.map((item) => `<li>${item}</li>`).join("\n");
    htmlParts.push(`<ul class="note-list">${listHtml}</ul>`);
    listItems = [];
  };

  for (const line of lines) {
    if (TERMS_LIST_LINE_PATTERN.test(line)) {
      listItems.push(escapeHtml(ensureNonEmpty(stripTermsListPrefix(line))));
      continue;
    }

    flushListItems();
    htmlParts.push(`<p class="note-paragraph">${escapeHtml(ensureNonEmpty(line))}</p>`);
  }

  flushListItems();

  return htmlParts.join("\n");
}

function applyReplacements(template: string, map: Record<string, string>): string {
  let output = template;
  Object.entries(map).forEach(([key, value]) => {
    output = output.split(`{{${key}}}`).join(value);
  });
  return output;
}

async function ensureReadable(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveChromeExecutablePath(): Promise<string | null> {
  if (cachedChromeExecutable !== undefined) {
    return cachedChromeExecutable;
  }

  for (const candidate of CHROME_EXECUTABLE_CANDIDATES) {
    if (await ensureReadable(candidate)) {
      cachedChromeExecutable = candidate;
      return cachedChromeExecutable;
    }
  }

  cachedChromeExecutable = null;
  return null;
}

async function loadTemplate(): Promise<CachedTemplate> {
  const shouldCacheTemplate = process.env.NODE_ENV === "production";

  if (shouldCacheTemplate && cachedTemplate) {
    return cachedTemplate;
  }

  const [templateHtml, templateCss, interLatinExt, interLatin, tinosLatinExt, tinosLatin] =
    await Promise.all([
      readFile(PDF_TEMPLATE_HTML_PATH, "utf8"),
      readFile(PDF_TEMPLATE_CSS_PATH, "utf8"),
      readFile(FONT_INTER_LATIN_EXT_PATH),
      readFile(FONT_INTER_LATIN_PATH),
      readFile(FONT_TINOS_LATIN_EXT_PATH),
      readFile(FONT_TINOS_LATIN_PATH),
    ]);

  const cssWithFonts = templateCss
    .replace(/__FONT_INTER_LATIN_EXT__/g, interLatinExt.toString("base64"))
    .replace(/__FONT_INTER_LATIN__/g, interLatin.toString("base64"))
    .replace(/__FONT_TINOS_LATIN_EXT__/g, tinosLatinExt.toString("base64"))
    .replace(/__FONT_TINOS_LATIN__/g, tinosLatin.toString("base64"));

  const loadedTemplate = {
    html: templateHtml,
    css: cssWithFonts,
  };

  if (shouldCacheTemplate) {
    cachedTemplate = loadedTemplate;
  }

  return loadedTemplate;
}

function buildTemplateHtml(snapshot: QuoteVersionSnapshot, template: CachedTemplate): string {
  const locale = getLocale(snapshot);
  const labels = LABELS[snapshot.quote.language];
  const currencySymbol = getCurrencySymbol(snapshot.quote.currency, locale);
  const createdAt =
    snapshot.rendered?.metaChips.createdAt ??
    formatDateValue(snapshot.quote.createdAt, locale);
  const { preDiscountSubtotal, lineDiscountTotal } = snapshot.items.reduce(
    (acc, item) => {
      if (isQuoteItemSectionDescription(item.description)) {
        return acc;
      }

      const qty = Number.isFinite(item.qty) ? Math.max(0, item.qty) : 0;
      const unitPrice = Number.isFinite(item.unitPrice) ? Math.max(0, item.unitPrice) : 0;
      const lineBase = qty * unitPrice;
      const lineTotal = calculateLineTotal(item);
      const lineDiscount = Math.max(lineBase - lineTotal, 0);

      return {
        preDiscountSubtotal: acc.preDiscountSubtotal + lineBase,
        lineDiscountTotal: acc.lineDiscountTotal + lineDiscount,
      };
    },
    { preDiscountSubtotal: 0, lineDiscountTotal: 0 },
  );
  const normalizedPreDiscountSubtotal = roundMoney(preDiscountSubtotal);
  const aggregateDiscountTotal = roundMoney(
    Math.min(
      roundMoney(lineDiscountTotal + snapshot.totals.totalDiscount),
      normalizedPreDiscountSubtotal,
    ),
  );
  const netBeforeDiscountValue = roundMoney(
    snapshot.totals.taxableBase + aggregateDiscountTotal,
  );
  const aggregateDiscountPct = roundMoney(
    netBeforeDiscountValue > 0
      ? (aggregateDiscountTotal / netBeforeDiscountValue) * 100
      : 0,
  );

  const grandTotal = normalizeCurrencyToken(
    formatCurrencyValue(snapshot.totals.grandTotal, snapshot.quote.currency, locale),
    snapshot.quote.currency,
  );
  const totalDiscount =
    normalizeCurrencyToken(
      formatCurrencyValue(aggregateDiscountTotal, snapshot.quote.currency, locale),
      snapshot.quote.currency,
    );
  const showTotalDiscount = aggregateDiscountTotal > 0;
  const totalDiscountLabel = labels.totalDiscountLabel(
    formatPercentValue(aggregateDiscountPct, locale),
  );
  const vatTotal = normalizeCurrencyToken(
    formatCurrencyValue(snapshot.totals.vatAmount, snapshot.quote.currency, locale),
    snapshot.quote.currency,
  );
  const vatTotalLabel = snapshot.quote.vatEnabled
    ? labels.vatTotalLabel(formatPercentValue(snapshot.quote.vatRate, locale))
    : labels.vatTotalLabelDisabled;
  const netTotal = normalizeCurrencyToken(
    formatCurrencyValue(netBeforeDiscountValue, snapshot.quote.currency, locale),
    snapshot.quote.currency,
  );
  const notes = getNotesLines(snapshot, labels);
  const termsHtml = buildTermsHtml(snapshot, labels);
  const pdfClassNames = [
    snapshot.quote.showClientDetailsInPdf ? "" : "hide-client-details",
    snapshot.quote.showCompanyDetailsInPdf ? "" : "hide-company-details",
    !snapshot.quote.showClientDetailsInPdf && !snapshot.quote.showCompanyDetailsInPdf
      ? "hide-billing-row"
      : "",
  ]
    .filter((className) => className.length > 0)
    .join(" ");

  const replacementMap: Record<string, string> = {
    INLINE_CSS: template.css,
    PDF_CLASS_NAMES: pdfClassNames,
    LANG_CODE: snapshot.quote.language,
    DOCUMENT_TITLE: escapeHtml(`${labels.titleLabel} ${snapshot.quote.number}`),
    LOGO_HTML: buildLogoHtml(snapshot),
    COMPANY_EMAIL: escapeHtml(ensureNonEmpty(snapshot.company.companyEmail)),
    COMPANY_PHONE: escapeHtml(ensureNonEmpty(snapshot.company.companyPhone)),
    DATE_LABEL: escapeHtml(labels.dateLabel),
    CREATED_AT: escapeHtml(ensureNonEmpty(createdAt)),
    TITLE_LABEL: escapeHtml(labels.titleLabel),
    QUOTE_SUBTITLE: escapeHtml(
      ensureNonEmpty(snapshot.quote.title, snapshot.quote.number),
    ),
    CLIENT_CARD_TITLE: escapeHtml(labels.clientCardTitle),
    SUPPLIER_CARD_TITLE: escapeHtml(labels.supplierCardTitle),
    CLIENT_LINES_HTML: buildBillingLinesHtml(buildClientLines(snapshot)),
    SUPPLIER_LINES_HTML: buildBillingLinesHtml(buildSupplierLines(snapshot)),
    ITEMS_TABLES_HTML: buildItemsTablesHtml(snapshot, locale, labels, currencySymbol),
    TOTAL_LABEL: escapeHtml(
      snapshot.quote.vatEnabled ? labels.totalLabelVatOn : labels.totalLabelVatOff,
    ),
    GRAND_TOTAL: escapeHtml(grandTotal),
    TOTAL_DISCOUNT_LABEL: escapeHtml(totalDiscountLabel),
    TOTAL_DISCOUNT: escapeHtml(totalDiscount),
    TOTAL_DISCOUNT_ROW_CLASS: showTotalDiscount ? "" : "is-hidden",
    VAT_TOTAL_LABEL: escapeHtml(vatTotalLabel),
    VAT_TOTAL: escapeHtml(vatTotal),
    NET_TOTAL_LABEL: escapeHtml(labels.netTotalLabel),
    NET_TOTAL: escapeHtml(netTotal),
    NOTES_TITLE: escapeHtml(labels.notesTitle),
    NOTE_LINE_1: escapeHtml(ensureNonEmpty(notes.line1)),
    NOTE_LINE_2: escapeHtml(ensureNonEmpty(notes.line2)),
    TERMS_HTML: termsHtml,
    FOOTER_COMPANY_LINE: escapeHtml(buildCompanyFooterLine(snapshot)),
  };

  return applyReplacements(template.html, replacementMap);
}

async function normalizePdfMetadata(
  pdfBytes: Uint8Array,
  snapshot: QuoteVersionSnapshot,
): Promise<Uint8Array> {
  const document = await PDFDocument.load(pdfBytes);
  const timestamp = new Date(snapshot.generatedAt);
  const safeTimestamp = Number.isNaN(timestamp.getTime())
    ? new Date("2026-01-01T00:00:00.000Z")
    : timestamp;

  document.setTitle(`Quote ${snapshot.quote.number}`);
  document.setAuthor(snapshot.company.companyName);
  document.setSubject(snapshot.quote.title);
  document.setCreator("Quote Builder");
  document.setProducer("Quote Builder");
  document.setCreationDate(safeTimestamp);
  document.setModificationDate(safeTimestamp);

  return document.save({ useObjectStreams: false });
}

export async function renderQuotePdfFromTemplate(
  snapshot: QuoteVersionSnapshot,
): Promise<Uint8Array> {
  const template = await loadTemplate();
  const html = buildTemplateHtml(snapshot, template);
  const executablePath = await resolveChromeExecutablePath();

  if (!executablePath) {
    throw new Error(
      "No Chrome executable found. Set PDF_CHROME_EXECUTABLE_PATH or CHROME_PATH.",
    );
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 900, height: 1280 },
      deviceScaleFactor: 1,
    });

    await page.setContent(html, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });

    const pdfBytes = await page.pdf({
      format: "A4",
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      printBackground: true,
      preferCSSPageSize: true,
    });

    return normalizePdfMetadata(pdfBytes, snapshot);
  } finally {
    await browser.close();
  }
}
