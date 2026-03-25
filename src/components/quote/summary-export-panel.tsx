"use client";

import type { QuoteStatus } from "@/types/domain";
import { Download, Save } from "lucide-react";

import { QuoteExportPdfButton } from "@/components/quote/export-pdf-button";
import { StatusDropdown } from "@/components/quote/status-dropdown";
import { StatusPill } from "@/components/quote/status-pill";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@/components/ui/shadcn";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/shadcn/button";

type SummaryExportPanelProps = {
  quoteId: string;
  quoteNumber: string;
  language: "sk" | "en";
  currency: string;
  total: {
    subtotal: number;
    discount: number;
    vat: number;
    grandTotal: number;
    vatEnabled: boolean;
    vatRate: string;
  };
  labels: {
    heading: string;
    status: string;
    exportPdf: string;
    save: string;
    vatOn: string;
    vatOff: string;
    subtotal: string;
    discount: string;
    vat: string;
    grandTotal: string;
  };
  status: QuoteStatus;
  statusLabel: string;
  statuses: Array<{ value: QuoteStatus; label: string }>;
  onStatusChange: (status: QuoteStatus) => void;
  onSaveNow: () => void;
  onBeforeExport?: () => Promise<boolean>;
  exportErrorMessage?: string;
};

function localeForLanguage(language: "sk" | "en"): string {
  return language === "sk" ? "sk-SK" : "en-GB";
}

export function SummaryExportPanel({
  quoteId,
  quoteNumber,
  language,
  currency,
  total,
  labels,
  status,
  statusLabel,
  statuses,
  onStatusChange,
  onSaveNow,
  onBeforeExport,
  exportErrorMessage,
}: SummaryExportPanelProps) {
  const locale = localeForLanguage(language);

  return (
    <Card className="w-full">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{labels.heading}</CardTitle>
          <StatusPill status={status} label={statusLabel} />
        </div>
        <CardDescription className="flex items-center justify-between gap-2">
          <span>{labels.status}</span>
          <StatusDropdown
            status={status}
            statusLabel={statusLabel}
            options={statuses}
            onChange={onStatusChange}
          />
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">{labels.subtotal}</dt>
            <dd className="font-medium text-slate-900">{formatCurrency(total.subtotal, currency, locale)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">{labels.discount}</dt>
            <dd className="font-medium text-slate-900">-{formatCurrency(total.discount, currency, locale)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">
              {labels.vat}
              <span className="ml-1 text-xs">
                ({total.vatEnabled ? `${total.vatRate}%` : labels.vatOff})
              </span>
            </dt>
            <dd className="font-medium text-slate-900">{formatCurrency(total.vat, currency, locale)}</dd>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <dt className="font-semibold text-slate-900">{labels.grandTotal}</dt>
            <dd className="text-lg font-semibold text-slate-950">
              {formatCurrency(total.grandTotal, currency, locale)}
            </dd>
          </div>
        </dl>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" className="w-full" onClick={onSaveNow}>
            <Save className="mr-1.5 h-4 w-4" />
            {labels.save}
          </Button>
          <QuoteExportPdfButton
            quoteId={quoteId}
            label={labels.exportPdf}
            fallbackFileName={quoteNumber}
            beforeDownload={onBeforeExport}
            beforeDownloadErrorMessage={exportErrorMessage}
            className={cn(buttonVariants({ variant: "accent" }), "w-full")}
          >
            <Download className="mr-1.5 h-4 w-4" />
            {labels.exportPdf}
          </QuoteExportPdfButton>
        </div>
      </CardContent>
    </Card>
  );
}
