import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";

type CompanyAssetKind = "logo" | "signature";
type SupportedImageMimeType = "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";

const DEFAULT_COMPANY_ASSETS_BUCKET = "company-assets";
const MIME_BY_EXTENSION: Record<string, SupportedImageMimeType> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};
const EXTENSION_BY_MIME: Record<SupportedImageMimeType, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};
const SUPABASE_REF_PREFIX = "supabase://";

function getCompanyAssetsBucket(): string {
  const configured = process.env.SUPABASE_COMPANY_ASSETS_BUCKET;
  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }

  return DEFAULT_COMPANY_ASSETS_BUCKET;
}

function normalizeSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function detectImageMimeType(file: File): SupportedImageMimeType | null {
  const mimeType = file.type?.toLowerCase();
  if (mimeType && mimeType in EXTENSION_BY_MIME) {
    return mimeType as SupportedImageMimeType;
  }

  const extension = extname(file.name).toLowerCase();
  return MIME_BY_EXTENSION[extension] ?? null;
}

function buildSupabaseStorageReference(bucket: string, objectPath: string): string {
  return `${SUPABASE_REF_PREFIX}${bucket}/${objectPath}`;
}

function normalizeObjectPathForUrl(objectPath: string): string {
  return objectPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function isSupabaseStorageReference(value: string | null | undefined): boolean {
  if (typeof value !== "string") {
    return false;
  }
  return value.startsWith(SUPABASE_REF_PREFIX);
}

export function parseSupabaseStorageReference(
  value: string | null | undefined,
): { bucket: string; objectPath: string } | null {
  if (typeof value !== "string" || !value.startsWith(SUPABASE_REF_PREFIX)) {
    return null;
  }

  const normalized = value.slice(SUPABASE_REF_PREFIX.length).trim();
  const slashIndex = normalized.indexOf("/");
  if (slashIndex <= 0) {
    return null;
  }

  const bucket = normalized.slice(0, slashIndex).trim();
  const objectPath = normalized.slice(slashIndex + 1).trim();
  if (!bucket || !objectPath) {
    return null;
  }

  return { bucket, objectPath };
}

function buildPublicAssetUrl(bucket: string, objectPath: string): string {
  const supabaseBaseUrl = getSupabaseUrl().replace(/\/+$/g, "");
  const encodedPath = normalizeObjectPathForUrl(objectPath);
  return `${supabaseBaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

export type UploadCompanyAssetResult =
  | {
      ok: true;
      reference: string;
    }
  | {
      ok: false;
      reason: "missing_admin_client" | "unsupported_type" | "upload_failed";
      message: string;
    };

async function uploadCompanyImageAssetInternal(
  client: SupabaseClient,
  {
    userId,
    file,
    kind,
  }: {
    userId: string;
    file: File;
    kind: CompanyAssetKind;
  },
): Promise<UploadCompanyAssetResult> {
  const mimeType = detectImageMimeType(file);
  if (!mimeType) {
    return {
      ok: false,
      reason: "unsupported_type",
      message: "Podporovane formaty: PNG, JPG, WEBP, SVG.",
    };
  }

  const extension = EXTENSION_BY_MIME[mimeType];
  const safeUserId = normalizeSegment(userId) || "user";
  const objectPath = `settings/${safeUserId}/${kind}/${Date.now()}-${randomUUID()}${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await client.storage.from(getCompanyAssetsBucket()).upload(objectPath, bytes, {
    contentType: mimeType,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    return {
      ok: false,
      reason: "upload_failed",
      message: error.message,
    };
  }

  return {
    ok: true,
    reference: buildSupabaseStorageReference(getCompanyAssetsBucket(), objectPath),
  };
}

export async function uploadCompanyImageAssetWithClient(
  client: SupabaseClient,
  payload: {
    userId: string;
    file: File;
    kind: CompanyAssetKind;
  },
): Promise<UploadCompanyAssetResult> {
  return uploadCompanyImageAssetInternal(client, payload);
}

export async function uploadCompanyImageAsset(payload: {
  userId: string;
  file: File;
  kind: CompanyAssetKind;
}): Promise<UploadCompanyAssetResult> {
  const adminClient = createSupabaseAdminClient();
  if (!adminClient) {
    return {
      ok: false,
      reason: "missing_admin_client",
      message: "Supabase service role key nie je nastavena.",
    };
  }

  return uploadCompanyImageAssetInternal(adminClient, payload);
}

export async function resolveCompanyAssetPreviewUrl(
  value: string | null | undefined,
  expiresInSeconds = 60 * 60 * 24,
): Promise<string | null> {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = parseSupabaseStorageReference(normalized);
  if (!parsed) {
    return normalized;
  }

  const adminClient = createSupabaseAdminClient();
  if (adminClient) {
    const { data, error } = await adminClient.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.objectPath, expiresInSeconds);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  return buildPublicAssetUrl(parsed.bucket, parsed.objectPath);
}

export async function readCompanyAssetByReference(
  value: string,
): Promise<{ bytes: Buffer; mimeType: string | null } | null> {
  const parsed = parseSupabaseStorageReference(value);
  if (!parsed) {
    return null;
  }

  const adminClient = createSupabaseAdminClient();
  if (adminClient) {
    const { data, error } = await adminClient.storage
      .from(parsed.bucket)
      .download(parsed.objectPath);

    if (!error && data) {
      const mimeType =
        data.type?.trim().toLowerCase() ||
        MIME_BY_EXTENSION[extname(parsed.objectPath).toLowerCase()] ||
        null;
      return {
        bytes: Buffer.from(await data.arrayBuffer()),
        mimeType,
      };
    }
  }

  try {
    const response = await fetch(buildPublicAssetUrl(parsed.bucket, parsed.objectPath));
    if (!response.ok) {
      return null;
    }

    const mimeType =
      response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ||
      MIME_BY_EXTENSION[extname(parsed.objectPath).toLowerCase()] ||
      null;
    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      mimeType,
    };
  } catch {
    return null;
  }
}

export async function deleteCompanyAssetByReference(value: string | null | undefined): Promise<void> {
  const parsed = parseSupabaseStorageReference(value);
  if (!parsed) {
    return;
  }

  const adminClient = createSupabaseAdminClient();
  if (!adminClient) {
    return;
  }

  await adminClient.storage.from(parsed.bucket).remove([parsed.objectPath]);
}
