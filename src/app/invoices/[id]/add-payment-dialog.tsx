"use client";

import { useMemo, useState } from "react";

import { addPaymentAction } from "@/app/invoices/actions";
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
} from "@/components/ui/shadcn";
import { formatCurrency } from "@/lib/format";

type AddPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  currency: string;
  defaultPaymentMethod: string;
  amountDue: number;
};

function toDateInputValue(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function AddPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  currency,
  defaultPaymentMethod,
  amountDue,
}: AddPaymentDialogProps) {
  const today = useMemo(
    () => toDateInputValue(new Date()),
    [],
  );

  const [paymentDate, setPaymentDate] = useState(today);
  const [amountRaw, setAmountRaw] = useState("");
  const [method, setMethod] = useState(defaultPaymentMethod);

  const amount = useMemo(() => {
    const parsed = Number(amountRaw.replace(",", "."));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }, [amountRaw]);

  const exceedsTotal = amount > amountDue + 0.01;
  const canSubmit = amount > 0 && !exceedsTotal;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPaymentDate(today);
      setAmountRaw("");
      setMethod(defaultPaymentMethod);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pridať platbu</DialogTitle>
          <DialogDescription>
            Zaznamenajte úhradu. Suma nesmie presiahnúť zostávajúcu sumu na úhradu ({formatCurrency(amountDue, currency)}).
          </DialogDescription>
        </DialogHeader>

        <form action={addPaymentAction} className="flex flex-col gap-4" onSubmit={() => handleOpenChange(false)}>
          <input type="hidden" name="invoice_id" value={invoiceId} />

          <div className="space-y-2">
            <Label htmlFor="payment_date">Dátum platby</Label>
            <Input
              id="payment_date"
              name="payment_date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">
              Suma ({currency}) {amountDue > 0 ? `– max ${formatCurrency(amountDue, currency)}` : null}
            </Label>
            <Input
              id="amount"
              name="amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value)}
              required
              aria-invalid={exceedsTotal}
              aria-describedby={exceedsTotal ? "amount_error" : undefined}
            />
            {exceedsTotal ? (
              <p id="amount_error" className="text-xs text-red-600">
                Suma nesmie presiahnúť zostávajúcu sumu na úhradu.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Spôsob platby</Label>
            <Input
              id="method"
              name="method"
              type="text"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder="Prevodom, hotovosť, kartou…"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Poznámka (voliteľné)</Label>
            <Input id="note" name="note" type="text" placeholder="Poznámka k platbe" />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
              className="ui-btn ui-btn--secondary ui-btn--md"
            >
              Zrušiť
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="ui-btn ui-btn--primary ui-btn--md"
            >
              Pridať platbu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type AddPaymentTriggerProps = Omit<AddPaymentDialogProps, "open" | "onOpenChange"> & {
  disabled?: boolean;
  className?: string;
};

export function AddPaymentTrigger({ disabled, className, ...dialogProps }: AddPaymentTriggerProps) {
  const [open, setOpen] = useState(false);
  const canAdd = dialogProps.amountDue > 0;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled || !canAdd}
        className={className ?? "ui-btn ui-btn--primary ui-btn--sm"}
        aria-label="Pridať platbu"
      >
        Pridať platbu
      </Button>
      <AddPaymentDialog {...dialogProps} open={open} onOpenChange={setOpen} />
    </>
  );
}
