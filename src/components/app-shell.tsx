import Link from "next/link";
import type { ReactNode } from "react";

import {
  ContentArea,
  ContentContainer,
  PageHeader,
} from "@/components/ui/primitives";

const NAV_ITEMS = [
  { key: "dashboard", label: "Prehlad", href: "/", enabled: true },
  { key: "quotes", label: "Ponuky", href: "/quotes", enabled: true },
  { key: "clients", label: "Klienti", href: "/clients", enabled: true },
  { key: "catalog", label: "Katalog", href: "/catalog", enabled: true },
  { key: "settings", label: "Nastavenia", href: "/settings", enabled: true },
] as const;

export type NavigationKey = (typeof NAV_ITEMS)[number]["key"];

type AppShellProps = {
  active: NavigationKey;
  title: string;
  description?: string;
  headerActions?: ReactNode;
  children: ReactNode;
};

type NavigationProps = {
  active: NavigationKey;
};

function Navigation({ active }: NavigationProps) {
  return (
    <nav className="app-nav" aria-label="Hlavna navigacia">
      <h2 className="app-nav__brand">Cenovka</h2>
      <ul className="space-y-[var(--space-8)]">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;

          return (
            <li key={item.key}>
              {!item.enabled ? (
                <span className="app-nav__link pointer-events-none opacity-55">{item.label}</span>
              ) : (
                <Link href={item.href} className="app-nav__link" data-active={isActive}>
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppShell({
  active,
  title,
  description,
  headerActions,
  children,
}: AppShellProps) {
  const drawerId = "app-nav-drawer";

  return (
    <main className="app-shell">
      <div className="app-shell__layout">
        <aside className="app-sidebar">
          <div className="app-sidebar__inner">
            <Navigation active={active} />
          </div>
        </aside>

        <ContentArea>
          <header className="app-topbar">
            <div className="app-drawer">
              <input
                id={drawerId}
                type="checkbox"
                className="app-drawer__toggle"
                aria-hidden="true"
              />
              <label htmlFor={drawerId} className="app-drawer__button">
                Menu
              </label>
              <label htmlFor={drawerId} className="app-drawer__backdrop" aria-hidden="true" />
              <div className="app-drawer__panel">
                <div className="mb-[var(--space-16)] flex justify-end">
                  <label htmlFor={drawerId} className="app-drawer__button app-drawer__close">
                    Zavriet
                  </label>
                </div>
                <Navigation active={active} />
              </div>
            </div>
            <Link href="/" className="app-topbar__title">
              Cenovka
            </Link>
            <Link href="/settings" className="app-topbar__settings">
              Nastavenia
            </Link>
          </header>

          <ContentContainer>
            <PageHeader
              title={title}
              description={description}
              actions={headerActions ? <div className="w-full sm:w-auto">{headerActions}</div> : null}
            />
            <div className="app-page-content">{children}</div>
          </ContentContainer>
        </ContentArea>
      </div>
    </main>
  );
}
