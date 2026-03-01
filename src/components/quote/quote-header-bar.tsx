"use client";

import type { Language } from "@prisma/client";

import { AutosaveIndicator, type AutosaveState } from "@/components/quote/autosave-indicator";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@/components/ui/shadcn";

type ClientOption = {
  id: string;
  name: string;
};

type QuoteHeaderBarProps = {
  quoteNumber: string;
  title: string;
  clientId: string;
  clients: ClientOption[];
  language: Language;
  currency: string;
  validUntil: string;
  vatEnabled: boolean;
  vatRate: string;
  showClientDetailsInPdf: boolean;
  showCompanyDetailsInPdf: boolean;
  labels: {
    title: string;
    client: string;
    language: string;
    currency: string;
    validUntil: string;
    showClientInPdf: string;
    showCompanyInPdf: string;
    vatOn: string;
    vatOff: string;
    vatRate: string;
  };
  autosave: {
    state: AutosaveState;
    message: string;
  };
  onTitleChange: (value: string) => void;
  onClientChange: (value: string) => void;
  onLanguageChange: (value: Language) => void;
  onCurrencyChange: (value: string) => void;
  onValidUntilChange: (value: string) => void;
  onVatEnabledChange: (value: boolean) => void;
  onVatRateChange: (value: string) => void;
  onShowClientDetailsInPdfChange: (value: boolean) => void;
  onShowCompanyDetailsInPdfChange: (value: boolean) => void;
  onDuplicate: () => void;
  duplicateLabel: string;
  duplicatePending?: boolean;
};

export function QuoteHeaderBar({
  quoteNumber,
  title,
  clientId,
  clients,
  language,
  currency,
  validUntil,
  vatEnabled,
  vatRate,
  showClientDetailsInPdf,
  showCompanyDetailsInPdf,
  labels,
  autosave,
  onTitleChange,
  onClientChange,
  onLanguageChange,
  onCurrencyChange,
  onValidUntilChange,
  onVatEnabledChange,
  onVatRateChange,
  onShowClientDetailsInPdfChange,
  onShowCompanyDetailsInPdfChange,
  onDuplicate,
  duplicateLabel,
  duplicatePending,
}: QuoteHeaderBarProps) {
  return (
    <header className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {quoteNumber}
            </p>
            <AutosaveIndicator state={autosave.state} message={autosave.message} />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onDuplicate}
            disabled={duplicatePending}
            aria-busy={duplicatePending}
          >
            {duplicateLabel}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7 xl:items-end">
          <div className="xl:col-span-2">
            <Label htmlFor="quote-title">{labels.title}</Label>
            <Input
              id="quote-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={labels.title}
              className="mt-1"
            />
          </div>

          <div className="xl:col-span-2">
            <Label htmlFor="quote-client">{labels.client}</Label>
            <Select value={clientId} onValueChange={onClientChange}>
              <SelectTrigger id="quote-client" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quote-language">{labels.language}</Label>
            <Select value={language} onValueChange={(value) => onLanguageChange(value as Language)}>
              <SelectTrigger id="quote-language" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sk">SK</SelectItem>
                <SelectItem value="en">EN</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quote-currency">{labels.currency}</Label>
            <Input
              id="quote-currency"
              value={currency}
              onChange={(event) => onCurrencyChange(event.target.value.toUpperCase())}
              className="mt-1 uppercase"
              maxLength={3}
            />
          </div>

          <div>
            <Label htmlFor="quote-valid-until">{labels.validUntil}</Label>
            <Input
              id="quote-valid-until"
              type="date"
              value={validUntil}
              onChange={(event) => onValidUntilChange(event.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
          <div className="inline-flex items-center gap-2">
            <Switch checked={vatEnabled} onCheckedChange={onVatEnabledChange} />
            <span className="text-sm font-medium text-slate-700">
              {vatEnabled ? labels.vatOn : labels.vatOff}
            </span>
          </div>
          <div className="w-[120px]">
            <Input
              value={vatRate}
              onChange={(event) => onVatRateChange(event.target.value)}
              disabled={!vatEnabled}
              className="h-9 text-right"
              aria-label={labels.vatRate}
            />
          </div>
          <div className="h-px w-full bg-slate-200" />
          <div className="flex flex-wrap gap-5">
            <label className="inline-flex items-center gap-2">
              <Switch
                checked={showClientDetailsInPdf}
                onCheckedChange={onShowClientDetailsInPdfChange}
              />
              <span className="text-sm font-medium text-slate-700">{labels.showClientInPdf}</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <Switch
                checked={showCompanyDetailsInPdf}
                onCheckedChange={onShowCompanyDetailsInPdfChange}
              />
              <span className="text-sm font-medium text-slate-700">{labels.showCompanyInPdf}</span>
            </label>
          </div>
        </div>
      </div>
    </header>
  );
}
