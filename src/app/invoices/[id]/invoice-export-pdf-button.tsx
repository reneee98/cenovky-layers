"use client";

import { useState } from "react";

type InvoiceExportPdfButtonProps = {
  invoiceId: string;
  invoiceNumber: string;
  className?: string;
};

export function InvoiceExportPdfButton({
  invoiceId,
  invoiceNumber,
  className = "",
}: InvoiceExportPdfButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/download`, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/pdf" },
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const data = (await res.json()) as { error?: string; detail?: string };
          const msg = [data.error, data.detail].filter(Boolean).join(" — ");
          throw new Error(msg || "Export zlyhal.");
        }
        throw new Error(`Export zlyhal (${res.status}).`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition");
      let filename = `${invoiceNumber.replace(/[^a-zA-Z0-9._-]+/g, "-")}.pdf`;
      if (disposition) {
        const match = /filename="?([^";\n]+)"?/.exec(disposition);
        if (match?.[1]) filename = match[1].trim();
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nepodarilo sa stiahnut PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className={className}
        aria-label="Stiahnuť faktúru ako PDF"
      >
        {loading ? "Pripravujem…" : "Export PDF"}
      </button>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
