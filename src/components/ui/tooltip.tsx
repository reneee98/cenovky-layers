import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/components/ui/cx";

type TooltipProps = HTMLAttributes<HTMLSpanElement> & {
  content: ReactNode;
  side?: "top" | "bottom";
  children: ReactNode;
};

export function Tooltip({
  content,
  side = "top",
  children,
  className,
  ...props
}: TooltipProps) {
  return (
    <span className={cx("ui-tooltip", className)} data-side={side} {...props}>
      <span className="ui-tooltip__trigger">{children}</span>
      <span role="tooltip" className="ui-tooltip__content">
        {content}
      </span>
    </span>
  );
}
