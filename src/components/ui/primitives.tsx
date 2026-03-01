import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import { cx } from "@/components/ui/cx";

type SpaceToken = 4 | 8 | 12 | 16 | 24 | 32 | 48;
type RadiusToken = 12 | 16 | 20;

const SPACE_VAR: Record<SpaceToken, string> = {
  4: "var(--space-4)",
  8: "var(--space-8)",
  12: "var(--space-12)",
  16: "var(--space-16)",
  24: "var(--space-24)",
  32: "var(--space-32)",
  48: "var(--space-48)",
};

const RADIUS_VAR: Record<RadiusToken, string> = {
  12: "var(--radius-12)",
  16: "var(--radius-16)",
  20: "var(--radius-20)",
};

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: "md" | "lg" | "xl";
};

export function Container({
  size = "lg",
  className,
  children,
  ...props
}: ContainerProps) {
  return (
    <div data-size={size} className={cx("ui-container", className)} {...props}>
      {children}
    </div>
  );
}

type ContentAreaProps = HTMLAttributes<HTMLDivElement>;

export function ContentArea({ className, ...props }: ContentAreaProps) {
  return <section className={cx("app-content-area", className)} {...props} />;
}

type ContentContainerProps = HTMLAttributes<HTMLDivElement>;

export function ContentContainer({ className, ...props }: ContentContainerProps) {
  return <div className={cx("app-content-container", className)} {...props} />;
}

type StackProps = HTMLAttributes<HTMLDivElement> & {
  gap?: SpaceToken;
};

export function Stack({ gap = 16, className, style, children, ...props }: StackProps) {
  const stackStyle = {
    ...style,
    "--stack-gap": SPACE_VAR[gap],
  } as CSSProperties;

  return (
    <div className={cx("ui-stack", className)} style={stackStyle} {...props}>
      {children}
    </div>
  );
}

type GridProps = HTMLAttributes<HTMLDivElement> & {
  gap?: SpaceToken;
  columns?: 1 | 2 | 3 | 4;
  minItemWidth?: number;
};

export function Grid({
  gap = 16,
  columns = 1,
  minItemWidth,
  className,
  style,
  children,
  ...props
}: GridProps) {
  const gridColumns = minItemWidth
    ? `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))`
    : `repeat(${columns}, minmax(0, 1fr))`;

  const gridStyle = {
    ...style,
    "--grid-gap": SPACE_VAR[gap],
    "--grid-columns": gridColumns,
  } as CSSProperties;

  return (
    <div className={cx("ui-grid", className)} style={gridStyle} {...props}>
      {children}
    </div>
  );
}

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: SpaceToken;
  radius?: RadiusToken;
};

export function Card({
  padding = 16,
  radius = 16,
  className,
  style,
  children,
  ...props
}: CardProps) {
  const cardStyle = {
    ...style,
    "--card-padding": SPACE_VAR[padding],
    "--card-radius": RADIUS_VAR[radius],
  } as CSSProperties;

  return (
    <section className={cx("ui-card", className)} style={cardStyle} {...props}>
      {children}
    </section>
  );
}

type SectionHeaderProps = HTMLAttributes<HTMLDivElement> & {
  heading: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export function SectionHeader({
  heading,
  description,
  action,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <header className={cx("ui-section-header", className)} {...props}>
      <Stack gap={4}>
        {typeof heading === "string" ? <h2 className="type-h3">{heading}</h2> : heading}
        {description ? <p className="type-body text-muted">{description}</p> : null}
      </Stack>
      {action ? <div>{action}</div> : null}
    </header>
  );
}

type PageHeaderProps = HTMLAttributes<HTMLElement> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  filters?: ReactNode;
};

export function PageHeader({
  title,
  description,
  actions,
  filters,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header className={cx("app-page-header", className)} {...props}>
      <div className="app-page-header__lead">
        {typeof title === "string" ? (
          <h1 className="type-h1 app-page-header__title">{title}</h1>
        ) : (
          title
        )}
        {description ? <p className="app-page-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="app-page-header__actions">{actions}</div> : null}
      {filters ? <div className="w-full">{filters}</div> : null}
    </header>
  );
}

type PageGridProps = HTMLAttributes<HTMLDivElement>;

export function PageGrid({ className, ...props }: PageGridProps) {
  return <div className={cx("ui-page-grid", className)} {...props} />;
}

type PageSectionProps = HTMLAttributes<HTMLElement>;

export function PageSection({ className, ...props }: PageSectionProps) {
  return <section className={cx("ui-page-section", className)} {...props} />;
}

type DividerProps = HTMLAttributes<HTMLHRElement>;

export function Divider({ className, ...props }: DividerProps) {
  return <hr className={cx("ui-divider", className)} {...props} />;
}
