import type { ButtonHTMLAttributes } from "react";

import { cx } from "@/components/ui/cx";

type ToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function Toggle({
  checked,
  onCheckedChange,
  className,
  onClick,
  disabled,
  type,
  ...props
}: ToggleProps) {
  return (
    <button
      type={type ?? "button"}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      data-state={checked ? "checked" : "unchecked"}
      className={cx("ui-toggle", className)}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented && !disabled) {
          onCheckedChange?.(!checked);
        }
      }}
      {...props}
    >
      <span aria-hidden className="ui-toggle__thumb" />
    </button>
  );
}
