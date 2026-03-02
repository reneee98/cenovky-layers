import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright-core";

const INVOICE_TEMPLATE_HTML_PATH = resolve(process.cwd(), "pdf/invoice-template.html");
const BASE_TEMPLATE_CSS_PATH = resolve(process.cwd(), "pdf/template.css");
const INVOICE_TEMPLATE_CSS_PATH = resolve(process.cwd(), "pdf/invoice-template.css");
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

type CachedTemplate = {
  html: string;
  css: string;
};

type ChromeLaunchOptions = {
  executablePath: string;
  args: string[];
  headless: boolean;
};

export type InvoiceTemplateRow = {
  rowNo: string;
  name: string;
  description?: string | null;
  qty: string;
  unitPrice: string;
  vat: string;
  total: string;
};

export type InvoiceTemplateMetaRow = {
  label: string;
  value: string;
};

export type InvoiceTemplateTotals = {
  taxBase: string;
  vat: string;
  grandTotal: string;
  grandTotalWithCurrency: string;
};

export type InvoiceTemplatePayment = {
  variableSymbol: string | null;
  amountDue: string;
  paymentMethod: string | null;
  iban: string | null;
  swiftBic: string | null;
  qrDataUrl: string | null;
};

export type InvoiceTemplateSnapshot = {
  generatedAt: string;
  invoiceNumber: string;
  brandName: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  supplierLines: string[];
  clientLines: string[];
  metaRows: InvoiceTemplateMetaRow[];
  items: InvoiceTemplateRow[];
  vatSummaryRows: Array<{ rate: string; base: string; vat: string; total: string }>;
  totals: InvoiceTemplateTotals;
  payment: InvoiceTemplatePayment;
  legalNote: string | null;
  note: string | null;
  footerRegistrationLine: string;
  footerNoteLine: string;
  footerDocNo: string;
  footerWebsite: string;
  footerPage: string;
};

let cachedTemplate: CachedTemplate | null = null;
let cachedChromeLaunchOptions: ChromeLaunchOptions | null | undefined;

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

function ensureNonEmpty(value: string | null | undefined, fallback = "-"): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : fallback;
}

function applyReplacements(template: string, map: Record<string, string>): string {
  let output = template;
  for (const [key, value] of Object.entries(map)) {
    output = output.split(`{{${key}}}`).join(value);
  }
  return output;
}

function buildBillingLinesHtml(lines: string[]): string {
  return lines
    .map((line, index) => {
      const className = index === 0 ? "line-strong" : "";
      return `<p class="${className}">${escapeHtml(ensureNonEmpty(line))}</p>`;
    })
    .join("\n");
}

function buildLogoHtml(logoDataUrl: string | null, fallbackBrandName: string): string {
  if (logoDataUrl && normalizeWhitespace(logoDataUrl).length > 0) {
    return `<img class="brand-logo-image invoice-brand-logo-image" src="${escapeHtml(logoDataUrl)}" alt="Logo" />`;
  }

  return `<p class="brand-logo-fallback invoice-brand-logo-fallback">${escapeHtml(
    ensureNonEmpty(fallbackBrandName, "Cenovka"),
  )}</p>`;
}

function buildSignatureHtml(signatureDataUrl: string | null): string {
  if (signatureDataUrl && normalizeWhitespace(signatureDataUrl).length > 0) {
    return `<div class="signature-image-wrap"><img class="signature-image" src="${escapeHtml(signatureDataUrl)}" alt="Podpis" /><div class="signature-underline"></div></div>`;
  }

  return `<div class="signature-line">______________________</div>`;
}

function buildMetaRowsHtml(rows: InvoiceTemplateMetaRow[]): string {
  return rows
    .map(
      (row) => `
        <p class="meta-row">
          <span class="meta-label">${escapeHtml(ensureNonEmpty(row.label))}</span>
          <span class="meta-value">${escapeHtml(ensureNonEmpty(row.value))}</span>
        </p>
      `.trim(),
    )
    .join("\n");
}

function buildItemDescriptionHtml(description: string | null | undefined): string {
  const raw = typeof description === "string" ? description.trim() : "";
  if (!raw) {
    return "";
  }

  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const bulletFromLine = (line: string): string | null => {
    if (/^-\s+/.test(line)) return line.replace(/^-\s+/, "").trim();
    if (/^•\s+/.test(line)) return line.replace(/^•\s+/, "").trim();
    return null;
  };

  const lineBullets = lines
    .map((line) => bulletFromLine(line))
    .filter((line): line is string => Boolean(line && line.length > 0));

  if (lineBullets.length > 0) {
    const introLines = lines.filter((line) => bulletFromLine(line) === null);
    const introHtml =
      introLines.length > 0
        ? `<p class="item-desc-intro">${escapeHtml(introLines.join(" "))}</p>`
        : "";
    const listHtml = `<ul class="item-desc-list">${lineBullets
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("")}</ul>`;
    return `<div class="item-desc">${introHtml}${listHtml}</div>`;
  }

  // Supports inline format like: "Štruktúra: - O nás - Kontakt - ..."
  if (/\s-\s+/.test(raw)) {
    const inlineParts = raw
      .split(/\s-\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (inlineParts.length >= 2) {
      const intro = inlineParts[0];
      const listItems = inlineParts.slice(1);
      return `<div class="item-desc"><p class="item-desc-intro">${escapeHtml(
        intro,
      )}</p><ul class="item-desc-list">${listItems
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("")}</ul></div>`;
    }
  }

  return `<div class="item-desc">${escapeHtml(raw)}</div>`;
}

function buildItemRowsHtml(rows: InvoiceTemplateRow[]): string {
  if (rows.length === 0) {
    return `
      <tr class="item-row">
        <td colspan="6">-</td>
      </tr>
    `.trim();
  }

  return rows
    .map((row) => {
      const descriptionHtml = buildItemDescriptionHtml(row.description);

      return `
        <tr class="item-row">
          <td class="col-no">${escapeHtml(ensureNonEmpty(row.rowNo))}</td>
          <td class="col-name">
            ${escapeHtml(ensureNonEmpty(row.name))}
            ${descriptionHtml}
          </td>
          <td class="num col-qty">${escapeHtml(ensureNonEmpty(row.qty, "0"))}</td>
          <td class="num col-price">${escapeHtml(ensureNonEmpty(row.unitPrice, "0"))}</td>
          <td class="num col-vat">${escapeHtml(ensureNonEmpty(row.vat, "0%"))}</td>
          <td class="num col-total">${escapeHtml(ensureNonEmpty(row.total, "0"))}</td>
        </tr>
      `.trim();
    })
    .join("\n");
}

function buildVatSummaryRowsHtml(
  rows: Array<{ rate: string; base: string; vat: string; total: string }>,
): string {
  if (rows.length === 0) {
    return `
      <tr>
        <td>0 %</td>
        <td class="num">0,00</td>
        <td class="num">0,00</td>
        <td class="num">0,00</td>
      </tr>
    `.trim();
  }

  return rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(ensureNonEmpty(row.rate))}</td>
          <td class="num">${escapeHtml(ensureNonEmpty(row.base))}</td>
          <td class="num">${escapeHtml(ensureNonEmpty(row.vat))}</td>
          <td class="num">${escapeHtml(ensureNonEmpty(row.total))}</td>
        </tr>
      `.trim(),
    )
    .join("\n");
}

function buildPaymentLinesHtml(payment: InvoiceTemplatePayment): string {
  const lines = [
    `<p class="payment-line payment-method"><span class="payment-label">Spôsob úhrady:</span></p>`,
    `<p class="payment-line payment-amount"><span class="payment-label">Suma:</span> <span class="payment-value">${escapeHtml(ensureNonEmpty(payment.amountDue))}</span></p>`,
    payment.variableSymbol
      ? `<p class="payment-line"><span class="payment-label">Variabilný symbol:</span> <span class="payment-value">${escapeHtml(payment.variableSymbol)}</span></p>`
      : "",
    payment.iban
      ? `<p class="payment-line payment-line-iban"><span class="payment-label">IBAN:</span> <span class="payment-value">${escapeHtml(payment.iban)}</span></p>`
      : "",
    payment.swiftBic
      ? `<p class="payment-line"><span class="payment-label">SWIFT:</span> <span class="payment-value-soft">${escapeHtml(payment.swiftBic)}</span></p>`
      : "",
  ].filter((line) => line.length > 0);

  return lines.join("\n");
}

function buildNoteHtml(value: string | null): string {
  if (!value || normalizeWhitespace(value).length === 0) {
    return "";
  }

  return `<p class="invoice-note-body">${escapeHtml(value)}</p>`;
}

function buildTemplateHtml(snapshot: InvoiceTemplateSnapshot, template: CachedTemplate): string {
  const hasPaymentSection =
    Boolean(snapshot.payment.paymentMethod) ||
    Boolean(snapshot.payment.iban) ||
    Boolean(snapshot.payment.swiftBic) ||
    Boolean(snapshot.payment.variableSymbol) ||
    Boolean(snapshot.payment.qrDataUrl);

  const replacementMap: Record<string, string> = {
    INLINE_CSS: template.css,
    DOCUMENT_TITLE: escapeHtml(`Faktúra ${ensureNonEmpty(snapshot.invoiceNumber)}`),
    LOGO_HTML: buildLogoHtml(snapshot.logoDataUrl, snapshot.brandName),
    BRAND_NAME: escapeHtml(ensureNonEmpty(snapshot.brandName)),
    INVOICE_TITLE: escapeHtml(`FAKTÚRA ${ensureNonEmpty(snapshot.invoiceNumber)}`),
    SUPPLIER_HEADING: "DODÁVATEĽ",
    CLIENT_HEADING: "ODBERATEĽ",
    SUPPLIER_LINES_HTML: buildBillingLinesHtml(snapshot.supplierLines),
    CLIENT_LINES_HTML: buildBillingLinesHtml(snapshot.clientLines),
    META_ROWS_HTML: buildMetaRowsHtml(snapshot.metaRows),
    ITEM_COL_NO: "Č.",
    ITEM_COL_NAME: "Názov",
    ITEM_COL_QTY: "Množstvo",
    ITEM_COL_PRICE: "Cena bez DPH",
    ITEM_COL_VAT: "DPH %",
    ITEM_COL_TOTAL: "Spolu s DPH",
    ITEM_ROWS_HTML: buildItemRowsHtml(snapshot.items),
    VAT_SUMMARY_RATE: "Sadzba DPH",
    VAT_SUMMARY_BASE: "Základ",
    VAT_SUMMARY_VAT: "DPH",
    VAT_SUMMARY_TOTAL: "Spolu",
    VAT_SUMMARY_SUM: "Súčet",
    VAT_SUMMARY_ROWS_HTML: buildVatSummaryRowsHtml(snapshot.vatSummaryRows),
    TOTAL_TAX_BASE: escapeHtml(ensureNonEmpty(snapshot.totals.taxBase)),
    TOTAL_VAT: escapeHtml(ensureNonEmpty(snapshot.totals.vat)),
    TOTAL_GRAND: escapeHtml(ensureNonEmpty(snapshot.totals.grandTotal)),
    TOTAL_LABEL: "Spolu",
    TOTAL_GRAND_WITH_CURRENCY: escapeHtml(ensureNonEmpty(snapshot.totals.grandTotalWithCurrency)),
    PAYMENT_SECTION_CLASS: hasPaymentSection ? "" : "is-hidden",
    PAYMENT_LINES_HTML: buildPaymentLinesHtml(snapshot.payment),
    PAYMENT_QR_CLASS: snapshot.payment.qrDataUrl ? "" : "is-hidden",
    PAYMENT_QR_DATA_URL:
      snapshot.payment.qrDataUrl ??
      "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=",
    LEGAL_NOTE_SECTION_CLASS: snapshot.legalNote ? "" : "is-hidden",
    LEGAL_NOTE_TITLE: "Právna poznámka",
    LEGAL_NOTE_HTML: buildNoteHtml(snapshot.legalNote),
    NOTE_SECTION_CLASS: snapshot.note ? "" : "is-hidden",
    NOTE_TITLE: "Poznámka",
    NOTE_HTML: buildNoteHtml(snapshot.note),
    NOTES_SECTION_CLASS: snapshot.legalNote ? "" : "is-hidden",
    SIGNATURE_HTML: buildSignatureHtml(snapshot.signatureDataUrl),
    FOOTER_REGISTRATION_LINE: escapeHtml(ensureNonEmpty(snapshot.footerRegistrationLine)),
    FOOTER_NOTE_LINE: escapeHtml(ensureNonEmpty(snapshot.footerNoteLine)),
    FOOTER_DOC_NO: escapeHtml(ensureNonEmpty(snapshot.footerDocNo)),
    FOOTER_WEBSITE: escapeHtml(ensureNonEmpty(snapshot.footerWebsite)),
    FOOTER_PAGE: escapeHtml(ensureNonEmpty(snapshot.footerPage)),
  };

  return applyReplacements(template.html, replacementMap);
}

async function ensureReadable(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function getPlaywrightCacheRoots(): string[] {
  const roots: string[] = [];
  const home = process.env.HOME;

  if (home) {
    roots.push(resolve(home, "Library/Caches/ms-playwright"));
    roots.push(resolve(home, ".cache/ms-playwright"));
  }

  if (process.env.PLAYWRIGHT_BROWSERS_PATH) {
    roots.push(process.env.PLAYWRIGHT_BROWSERS_PATH);
  }

  return roots;
}

async function findPlaywrightChromiumExecutableFromCache(): Promise<string | null> {
  const platformCandidates =
    process.platform === "darwin"
      ? [
          "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
          "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium",
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
          "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ]
      : process.platform === "win32"
        ? ["chrome-win/chrome.exe"]
        : ["chrome-linux/chrome"];

  for (const root of getPlaywrightCacheRoots()) {
    let entries: string[] = [];
    try {
      entries = await readdir(root);
    } catch {
      continue;
    }

    const chromiumDirs = entries
      .filter((entry) => entry.startsWith("chromium-"))
      .sort()
      .reverse();

    for (const dir of chromiumDirs) {
      for (const relExecPath of platformCandidates) {
        const candidate = resolve(root, dir, relExecPath);
        if (await ensureReadable(candidate)) {
          return candidate;
        }
      }
    }
  }

  return null;
}

async function resolveChromeExecutablePath(): Promise<string | null> {
  if (cachedChromeLaunchOptions !== undefined) {
    return cachedChromeLaunchOptions?.executablePath ?? null;
  }

  const playwrightExecutable = chromium.executablePath();
  if (playwrightExecutable && (await ensureReadable(playwrightExecutable))) {
    cachedChromeLaunchOptions = {
      executablePath: playwrightExecutable,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    };
    return cachedChromeLaunchOptions.executablePath;
  }

  for (const candidate of CHROME_EXECUTABLE_CANDIDATES) {
    if (await ensureReadable(candidate)) {
      cachedChromeLaunchOptions = {
        executablePath: candidate,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: true,
      };
      return cachedChromeLaunchOptions.executablePath;
    }
  }

  const playwrightCacheExecutable = await findPlaywrightChromiumExecutableFromCache();
  if (playwrightCacheExecutable) {
    cachedChromeLaunchOptions = {
      executablePath: playwrightCacheExecutable,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    };
    return cachedChromeLaunchOptions.executablePath;
  }

  // Vercel/AWS Lambda fallback: bundled Chromium binary from @sparticuz/chromium.
  try {
    const chromiumModule = await import("@sparticuz/chromium");
    const serverlessChromium = chromiumModule.default ?? chromiumModule;
    const executablePath = await serverlessChromium.executablePath();
    if (typeof executablePath === "string" && executablePath.length > 0 && (await ensureReadable(executablePath))) {
      const extraArgs = Array.isArray(serverlessChromium.args) ? serverlessChromium.args : [];
      cachedChromeLaunchOptions = {
        executablePath,
        args: [...new Set([...extraArgs, "--no-sandbox", "--disable-setuid-sandbox"])],
        headless: true,
      };
      return cachedChromeLaunchOptions.executablePath;
    }
  } catch {
    // Optional dependency in non-serverless environments.
  }

  cachedChromeLaunchOptions = null;
  return null;
}

async function loadTemplate(): Promise<CachedTemplate> {
  const shouldCacheTemplate = process.env.NODE_ENV === "production";

  if (shouldCacheTemplate && cachedTemplate) {
    return cachedTemplate;
  }

  const [templateHtml, baseTemplateCss, invoiceTemplateCss, interLatinExt, interLatin, tinosLatinExt, tinosLatin] =
    await Promise.all([
      readFile(INVOICE_TEMPLATE_HTML_PATH, "utf8"),
      readFile(BASE_TEMPLATE_CSS_PATH, "utf8"),
      readFile(INVOICE_TEMPLATE_CSS_PATH, "utf8"),
      readFile(FONT_INTER_LATIN_EXT_PATH),
      readFile(FONT_INTER_LATIN_PATH),
      readFile(FONT_TINOS_LATIN_EXT_PATH),
      readFile(FONT_TINOS_LATIN_PATH),
    ]);

  const cssWithFonts = baseTemplateCss
    .replace(/__FONT_INTER_LATIN_EXT__/g, interLatinExt.toString("base64"))
    .replace(/__FONT_INTER_LATIN__/g, interLatin.toString("base64"))
    .replace(/__FONT_TINOS_LATIN_EXT__/g, tinosLatinExt.toString("base64"))
    .replace(/__FONT_TINOS_LATIN__/g, tinosLatin.toString("base64"));

  const loadedTemplate = {
    html: templateHtml,
    css: `${cssWithFonts}\n\n${invoiceTemplateCss}`,
  };

  if (shouldCacheTemplate) {
    cachedTemplate = loadedTemplate;
  }

  return loadedTemplate;
}

async function normalizePdfMetadata(
  pdfBytes: Uint8Array,
  snapshot: InvoiceTemplateSnapshot,
): Promise<Uint8Array> {
  const document = await PDFDocument.load(pdfBytes);
  const timestamp = new Date(snapshot.generatedAt);
  const safeTimestamp = Number.isNaN(timestamp.getTime())
    ? new Date("2026-01-01T00:00:00.000Z")
    : timestamp;

  document.setTitle(`Invoice ${snapshot.invoiceNumber}`);
  document.setAuthor(snapshot.brandName);
  document.setSubject(`Invoice ${snapshot.invoiceNumber}`);
  document.setCreator("Quote Builder");
  document.setProducer("Quote Builder");
  document.setCreationDate(safeTimestamp);
  document.setModificationDate(safeTimestamp);

  return document.save({ useObjectStreams: false });
}

export async function renderInvoicePdfFromTemplate(
  snapshot: InvoiceTemplateSnapshot,
): Promise<Uint8Array> {
  const template = await loadTemplate();
  const html = buildTemplateHtml(snapshot, template);
  const executablePath = await resolveChromeExecutablePath();

  if (!executablePath) {
    throw new Error(
      "No Chrome executable found. Set PDF_CHROME_EXECUTABLE_PATH or CHROME_PATH, or install Chromium with: npx playwright install chromium",
    );
  }

  const launchOptions = cachedChromeLaunchOptions ?? {
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  };

  const browser = await chromium.launch({
    headless: launchOptions.headless,
    executablePath: launchOptions.executablePath,
    args: launchOptions.args,
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
