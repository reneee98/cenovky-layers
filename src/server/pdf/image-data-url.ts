import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

import {
  isSupabaseStorageReference,
  readCompanyAssetByReference,
} from "@/server/storage/company-assets";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function getMimeTypeFromPath(value: string): string | null {
  const normalizedPath = value.split(/[?#]/, 1)[0] ?? "";
  const extension = extname(normalizedPath).toLowerCase();
  return MIME_BY_EXTENSION[extension] ?? null;
}

function normalizeBaseUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\/+$/g, "");
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return `https://${normalized}`;
}

function getRuntimeBaseUrl(): string | null {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeBaseUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

async function fetchImageAsDataUrl(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return null;
    }

    const contentTypeHeader = response.headers.get("content-type");
    const contentMimeType = contentTypeHeader?.split(";")[0]?.trim().toLowerCase();
    const mimeType =
      contentMimeType && contentMimeType.startsWith("image/")
        ? contentMimeType
        : getMimeTypeFromPath(imageUrl);

    if (!mimeType) {
      return null;
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    return `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function resolveImageDataUrl(imageUrl: string | null | undefined): Promise<string | null> {
  if (typeof imageUrl !== "string") {
    return null;
  }

  const normalizedUrl = imageUrl.trim();
  if (!normalizedUrl) {
    return null;
  }

  if (/^data:image\//i.test(normalizedUrl)) {
    return normalizedUrl;
  }

  if (isSupabaseStorageReference(normalizedUrl)) {
    const asset = await readCompanyAssetByReference(normalizedUrl);
    if (!asset || !asset.mimeType || !asset.mimeType.startsWith("image/")) {
      return null;
    }

    return `data:${asset.mimeType};base64,${asset.bytes.toString("base64")}`;
  }

  if (/^https?:\/\//i.test(normalizedUrl)) {
    return fetchImageAsDataUrl(normalizedUrl);
  }

  if (!normalizedUrl.startsWith("/")) {
    return null;
  }

  const pathWithoutQuery = normalizedUrl.split(/[?#]/, 1)[0] ?? normalizedUrl;
  const mimeType = getMimeTypeFromPath(pathWithoutQuery);
  if (!mimeType) {
    return null;
  }

  const publicRoot = resolve(process.cwd(), "public");
  const absoluteImagePath = resolve(publicRoot, pathWithoutQuery.replace(/^\/+/, ""));

  const isInPublicRoot =
    absoluteImagePath === publicRoot ||
    absoluteImagePath.startsWith(`${publicRoot}${sep}`);

  if (isInPublicRoot) {
    try {
      const imageBuffer = await readFile(absoluteImagePath);
      return `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
    } catch {
      // Continue to runtime HTTP fallback.
    }
  }

  const runtimeBaseUrl = getRuntimeBaseUrl();
  if (!runtimeBaseUrl) {
    return null;
  }

  return fetchImageAsDataUrl(`${runtimeBaseUrl}${pathWithoutQuery}`);
}
