import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cx } from "@/components/ui/cx";
import { EmptyStateIcon } from "@/components/ui/icons";
import { Tooltip } from "@/components/ui/tooltip";

type IconActionTone = "default" | "danger";

type IconActionBaseProps = {
  label: string;
  tone?: IconActionTone;
  className?: string;
  children: ReactNode;
};

type IconActionLinkProps = IconActionBaseProps & {
  href: string;
};

export function IconActionLink({
  href,
  label,
  tone = "default",
  className,
  children,
}: IconActionLinkProps) {
  return (
    <Tooltip content={label}>
      <Link
        href={href}
        aria-label={label}
        className={cx("ui-icon-action", tone === "danger" && "ui-icon-action--danger", className)}
      >
        {children}
        <span className="sr-only">{label}</span>
      </Link>
    </Tooltip>
  );
}

type IconActionButtonProps = IconActionBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement>;

export function IconActionButton({
  label,
  tone = "default",
  className,
  type,
  children,
  ...props
}: IconActionButtonProps) {
  return (
    <Tooltip content={label}>
      <button
        type={type ?? "button"}
        aria-label={label}
        className={cx("ui-icon-action", tone === "danger" && "ui-icon-action--danger", className)}
        {...props}
      >
        {children}
        <span className="sr-only">{label}</span>
      </button>
    </Tooltip>
  );
}

type ListEmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function ListEmptyState({ title, description, action }: ListEmptyStateProps) {
  return (
    <div className="ui-empty-state">
      <span className="ui-empty-state__icon" aria-hidden="true">
        <EmptyStateIcon className="h-5 w-5" />
      </span>
      <div className="ui-empty-state__content">
        <p className="ui-empty-state__title">{title}</p>
        {description ? <p className="ui-empty-state__desc">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
