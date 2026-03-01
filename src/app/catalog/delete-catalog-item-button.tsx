"use client";

import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";

import { cx } from "@/components/ui/cx";
import { DeleteIcon } from "@/components/ui/icons";
import { Tooltip } from "@/components/ui/tooltip";

type DeleteCatalogItemButtonProps = {
  itemName: string;
  iconOnly?: boolean;
  className?: string;
};

export function DeleteCatalogItemButton({
  itemName,
  iconOnly = false,
  className,
}: DeleteCatalogItemButtonProps) {
  const { pending } = useFormStatus();

  const confirmDelete = (event: MouseEvent<HTMLButtonElement>) => {
    if (!window.confirm(`Vymazat katalogovu polozku \"${itemName}\"?`)) {
      event.preventDefault();
    }
  };

  if (iconOnly) {
    const label = pending ? "Mazem..." : "Vymazat polozku";

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
        "w-full rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      disabled={pending}
      onClick={confirmDelete}
    >
      {pending ? "Mazem..." : "Vymazat"}
    </button>
  );
}
