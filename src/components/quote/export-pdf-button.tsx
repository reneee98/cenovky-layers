"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

type QuoteExportPdfButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick"> & {
  quoteId: string;
  label: string;
  fallbackFileName?: string;
  beforeDownload?: () => Promise<boolean | void> | boolean | void;
  beforeDownloadErrorMessage?: string;
  children: ReactNode;
};

function normalizeFileName(value: string) {
  const normalized = value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "quote";
}

function resolveFileName(
  disposition: string | null,
  fallbackFileName: string | undefined,
) {
  if (disposition) {
    const match = /filename="?([^";\n]+)"?/.exec(disposition);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  if (fallbackFileName?.trim()) {
    return `${normalizeFileName(fallbackFileName)}.pdf`;
  }

  return "quote.pdf";
}

export function QuoteExportPdfButton({
  quoteId,
  label,
  fallbackFileName,
  beforeDownload,
  beforeDownloadErrorMessage,
  children,
  className,
  disabled,
  title,
  type,
  ...props
}: QuoteExportPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (loading || disabled) {
      return;
    }

    setLoading(true);

    try {
      if (beforeDownload) {
        const shouldContinue = await beforeDownload();
        if (shouldContinue === false) {
          if (beforeDownloadErrorMessage) {
            toast.error(beforeDownloadErrorMessage);
          }
          return;
        }
      }

      const response = await fetch(`/api/quotes/${quoteId}/download`, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/pdf",
        },
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const data = (await response.json()) as { error?: string; detail?: string };
          const message = [data.error, data.detail].filter(Boolean).join(" — ");
          throw new Error(message || "Export PDF zlyhal.");
        }

        throw new Error(`Export PDF zlyhal (${response.status}).`);
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = resolveFileName(response.headers.get("content-disposition"), fallbackFileName);
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nepodarilo sa stiahnut PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type={type ?? "button"}
      className={className}
      onClick={() => {
        void handleExport();
      }}
      disabled={disabled || loading}
      aria-label={label}
      aria-busy={loading}
      title={title ?? label}
      {...props}
    >
      {children}
    </button>
  );
}
