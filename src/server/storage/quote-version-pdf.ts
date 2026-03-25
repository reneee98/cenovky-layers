import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

function getStorageRoot(): string {
  const configuredRoot = process.env.QUOTE_PDF_STORAGE_ROOT?.trim();
  if (configuredRoot) {
    return resolve(configuredRoot);
  }

  const cwd = process.cwd();
  const serverlessRoot =
    process.env.VERCEL === "1" ||
    process.env.VERCEL === "true" ||
    cwd.startsWith("/var/task");

  if (serverlessRoot) {
    return resolve(process.env.TMPDIR ?? "/tmp", "cenovka-storage");
  }

  return resolve(cwd, "storage");
}

const STORAGE_ROOT = getStorageRoot();

function resolveStoragePath(reference: string): string | null {
  const normalizedReference = reference.trim().replace(/^\/+/, "");

  if (!normalizedReference) {
    return null;
  }

  const absolutePath = resolve(STORAGE_ROOT, normalizedReference);

  if (absolutePath !== STORAGE_ROOT && !absolutePath.startsWith(`${STORAGE_ROOT}${sep}`)) {
    return null;
  }

  return absolutePath;
}

function normalizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function buildQuoteVersionPdfReference(
  quoteId: string,
  versionNumber: number,
  versionId: string,
): string {
  const safeQuoteId = normalizePathSegment(quoteId) || "quote";
  const safeVersionId = normalizePathSegment(versionId) || "version";

  return `quote-versions/${safeQuoteId}/v${versionNumber}-${safeVersionId}.pdf`;
}

export async function readQuoteVersionPdf(reference: string): Promise<Buffer | null> {
  const storagePath = resolveStoragePath(reference);

  if (!storagePath) {
    return null;
  }

  try {
    return await readFile(storagePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function saveQuoteVersionPdf(
  reference: string,
  pdfBytes: Uint8Array,
): Promise<void> {
  const storagePath = resolveStoragePath(reference);

  if (!storagePath) {
    throw new Error("Invalid PDF storage path reference.");
  }

  await mkdir(dirname(storagePath), { recursive: true });
  await writeFile(storagePath, Buffer.from(pdfBytes));
}
