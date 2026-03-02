"use client";

import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";

import { cx } from "@/components/ui/cx";
import { DeleteIcon } from "@/components/ui/icons";
import { Tooltip } from "@/components/ui/tooltip";

type DeleteInvoiceButtonProps = {
  invoiceNumber: string;
  iconOnly?: boolean;
  className?: string;
};

export function DeleteInvoiceButton({
  invoiceNumber,
  iconOnly = false,
  className,
}: DeleteInvoiceButtonProps) {
  const { pending } = useFormStatus();

  const confirmDelete = (event: MouseEvent<HTMLButtonElement>) => {
    if (!window.confirm(`Vymazat fakturu \"${invoiceNumber}\"?`)) {
      event.preventDefault();
    }
  };

  if (iconOnly) {
    const label = pending ? "Mazem..." : "Vymazat fakturu";

    return (
      <Tooltip content={label}>
        <button
          type="submit"
          className={cx("ui-icon-action ui-icon-action--danger", className)}
          disabled={pending}
          onClick={confirmDelete}
          aria-label={label}
        >
          <DeleteIcon />
          <span className="sr-only">{label}</span>
        </button>
      </Tooltip>
    );
  }

  return (
    <button
      type="submit"
      className={cx(
        "inline-flex items-center justify-center rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      disabled={pending}
      onClick={confirmDelete}
    >
      {pending ? "Mazem..." : "Vymazat fakturu"}
    </button>
  );
}
