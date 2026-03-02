"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { createInvoiceFromQuoteAction } from "@/app/quotes/actions";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn";
import { formatCurrency } from "@/lib/format";
import { roundMoney } from "@/lib/quotes/invoicing";

type InvoiceKindOption = "full" | "partial" | "advance";

export type CreateInvoiceFromQuoteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteNumber: string;
  currency: string;
  quoteTotal: number;
  invoicedAmount: number;
  remainingToInvoice: number;
  suggestedInvoiceNumber: string;
  suggestedVariableSymbol: string;
  defaultPaymentMethod: string;
  defaultDueDays: number;
};

function toDateInputValue(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDefaultDueDate(issueDate: Date, dueDays: number): Date {
  const due = new Date(issueDate);
  due.setUTCDate(due.getUTCDate() + Math.max(0, dueDays));
  return due;
}

function SubmitButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="ui-btn ui-btn--primary ui-btn--md"
    >
      {pending ? "Vytvaram..." : "Vytvorit fakturu"}
    </Button>
  );
}

export function CreateInvoiceFromQuoteDialog({
  open,
  onOpenChange,
  quoteId,
  quoteNumber,
  currency,
  quoteTotal,
  invoicedAmount,
  remainingToInvoice,
  suggestedInvoiceNumber,
  suggestedVariableSymbol,
  defaultPaymentMethod,
  defaultDueDays,
}: CreateInvoiceFromQuoteDialogProps) {
  const today = useMemo(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }, []);

  const [invoiceKind, setInvoiceKind] = useState<InvoiceKindOption>("full");
  const [issueDate, setIssueDate] = useState(toDateInputValue(today));
  const [partialAmountRaw, setPartialAmountRaw] = useState("");
  const [dueDate, setDueDate] = useState(
    toDateInputValue(getDefaultDueDate(today, defaultDueDays)),
  );

  const taxableSupplyDate = issueDate;
  const dueDateMin = issueDate;

  const partialAmount = useMemo(() => {
    if (invoiceKind === "full") return remainingToInvoice;
    const parsed = Number(partialAmountRaw.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return roundMoney(Math.min(parsed, remainingToInvoice));
  }, [invoiceKind, partialAmountRaw, remainingToInvoice]);

  const canSubmit =
    remainingToInvoice > 0 &&
    (invoiceKind === "full" || (partialAmount > 0 && partialAmount <= remainingToInvoice));

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setInvoiceKind("full");
      setPartialAmountRaw("");
      setIssueDate(toDateInputValue(today));
      setDueDate(toDateInputValue(getDefaultDueDate(today, defaultDueDays)));
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vytvorit fakturu z ponuky {quoteNumber}</DialogTitle>
          <DialogDescription>
            Vsetky polozky a sumy sa predvyplnia z ponuky. Upravte datumy a voliteľne typ faktury.
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Suma ponuky</span>
            <span className="font-medium text-slate-900">
              {formatCurrency(quoteTotal, currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Uz fakturovane</span>
            <span className="font-medium text-slate-900">
              {formatCurrency(invoicedAmount, currency)}
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2">
            <span className="text-slate-600">Zostava na fakturaciu</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(remainingToInvoice, currency)}
            </span>
          </div>
        </section>

        <form
          action={createInvoiceFromQuoteAction}
          className="flex flex-col gap-4"
          onSubmit={() => {
            handleOpenChange(false);
          }}
        >
          <input type="hidden" name="quote_id" value={quoteId} />
          <input type="hidden" name="invoice_kind" value={invoiceKind} />

          <div className="space-y-2">
            <Label htmlFor="invoice_kind">Typ faktury</Label>
            <Select
              value={invoiceKind}
              onValueChange={(v) => setInvoiceKind(v as InvoiceKindOption)}
            >
              <SelectTrigger id="invoice_kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Plná faktúra (zostávajúca suma)</SelectItem>
                <SelectItem value="partial">Čiastková faktúra</SelectItem>
                <SelectItem value="advance">Zálohová faktúra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(invoiceKind === "partial" || invoiceKind === "advance") && (
            <div className="space-y-2">
              <Label htmlFor="partial_amount">
                Suma ({currency}) – max {formatCurrency(remainingToInvoice, currency)}
              </Label>
              <Input
                id="partial_amount"
                name="partial_amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={partialAmountRaw}
                onChange={(e) => setPartialAmountRaw(e.target.value)}
                aria-describedby="partial_amount_hint"
              />
              <p id="partial_amount_hint" className="text-xs text-slate-500">
                Nesmie presiahnuť zostávajúcu sumu na fakturaciu.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="issue_date">Dátum vystavenia</Label>
              <Input
                id="issue_date"
                name="issue_date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxable_supply_date">Dátum zdaniteľného plnenia</Label>
              <Input
                id="taxable_supply_date"
                name="taxable_supply_date"
                type="date"
                value={taxableSupplyDate}
                readOnly
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Dátum splatnosti</Label>
              <Input
                id="due_date"
                name="due_date"
                type="date"
                value={dueDate}
                min={dueDateMin}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice_number">Číslo faktúry</Label>
            <Input
              id="invoice_number"
              name="invoice_number_display"
              type="text"
              value={suggestedInvoiceNumber}
              readOnly
              disabled
              className="bg-slate-100"
              aria-describedby="invoice_number_hint"
            />
            <p id="invoice_number_hint" className="text-xs text-slate-500">
              Pridelí sa automaticky podľa dátumu vystavenia.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="variable_symbol">Variabilný symbol</Label>
            <Input
              id="variable_symbol"
              name="variable_symbol"
              type="text"
              defaultValue={suggestedVariableSymbol}
              placeholder={suggestedVariableSymbol}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Spôsob platby</Label>
            <Select name="payment_method" defaultValue={defaultPaymentMethod}>
              <SelectTrigger id="payment_method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Prevodom</SelectItem>
                <SelectItem value="cash">Hotovosť</SelectItem>
                <SelectItem value="card">Kartou</SelectItem>
                <SelectItem value="other">Iné</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Poznámka (voliteľné)</Label>
            <Input id="note" name="note" type="text" placeholder="Poznámka k faktúre" />
          </div>

          <section
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm"
            aria-live="polite"
          >
            <p className="font-medium text-emerald-900">
              Táto faktúra bude v sume: {formatCurrency(partialAmount, currency)}
            </p>
          </section>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
              className="ui-btn ui-btn--secondary ui-btn--md"
            >
              Zrušiť
            </Button>
            <SubmitButton disabled={!canSubmit} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type CreateInvoiceFromQuoteTriggerProps = Omit<
  CreateInvoiceFromQuoteDialogProps,
  "open" | "onOpenChange"
> & {
  className?: string;
};

export function CreateInvoiceFromQuoteTrigger(props: CreateInvoiceFromQuoteTriggerProps) {
  const [open, setOpen] = useState(false);
  const { className, ...dialogProps } = props;
  const canCreate = props.remainingToInvoice > 0;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!canCreate}
        className={className ?? "ui-btn ui-btn--primary ui-btn--md w-full sm:w-auto"}
        aria-label="Vytvorit fakturu z ponuky"
      >
        Vytvorit fakturu
      </Button>
      <CreateInvoiceFromQuoteDialog
        {...dialogProps}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
