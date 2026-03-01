import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Prehlad",
    description: "Rychly stav pipeline",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    key: "quotes",
    label: "Ponuky",
    description: "Vsetky cenove ponuky",
    href: "/quotes",
    icon: FileText,
  },
  {
    key: "clients",
    label: "Klienti",
    description: "Kontaktne a fakturacne data",
    href: "/clients",
    icon: Users,
  },
  {
    key: "catalog",
    label: "Katalog",
    description: "Cennik sluzieb",
    href: "/catalog",
    icon: Package,
  },
  {
    key: "settings",
    label: "Nastavenia",
    description: "Firma, mena a DPH",
    href: "/settings",
    icon: Settings,
  },
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

type NavigationItem = (typeof NAV_ITEMS)[number];

type NavigationLinkProps = {
  item: NavigationItem;
  isActive: boolean;
};

function NavigationLink({ item, isActive }: NavigationLinkProps) {
  const Icon = item.icon as LucideIcon;

  return (
    <Link
      href={item.href}
      className={`group mx-3 flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
        isActive
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        className={`h-[18px] w-[18px] shrink-0 transition-colors ${
          isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-none">{item.label}</span>
        <span className="mt-1 block truncate text-[11px] text-slate-400">{item.description}</span>
      </span>
    </Link>
  );
}

function Navigation({ active }: NavigationProps) {
  return (
    <nav aria-label="Hlavna navigacia" className="flex h-full flex-col">
      <div className="px-4 pb-2 pt-4">
        <Link href="/" className="px-3">
          <span className="text-lg font-bold tracking-tight text-slate-900">Cenovka</span>
        </Link>
      </div>

      <div className="px-5 pb-6 pt-3">
        <Link
          href="/quotes/new"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-blue-600 hover:shadow-blue-600/20"
        >
          <Plus className="h-4 w-4 text-slate-300" />
          Nova ponuka
        </Link>
      </div>

      <div className="px-5 pb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
        Menu
      </div>

      <ul className="space-y-1 pb-6">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;

          return (
            <li key={item.key} className="list-none">
              <NavigationLink item={item} isActive={isActive} />
            </li>
          );
        })}
      </ul>

      <div className="mt-auto border-t border-slate-100 bg-slate-50/30 p-4">
        <div className="flex items-center gap-3 rounded-xl border border-transparent p-2 transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-bold text-slate-600">
            N
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-700">Norbert</p>
            <p className="truncate text-xs text-slate-400">norbert@fokus.sk</p>
          </div>
        </div>
      </div>
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <input
        id={drawerId}
        type="checkbox"
        className="peer sr-only lg:hidden"
        aria-hidden="true"
      />

      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <label
          htmlFor={drawerId}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700"
        >
          <Menu className="h-4 w-4" />
          Menu
        </label>
        <Link href="/" className="text-sm font-semibold tracking-tight text-slate-900">
          Cenovka
        </Link>
        <Link
          href="/settings"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700"
        >
          Nastavenia
        </Link>
      </div>

      <label
        htmlFor={drawerId}
        className="pointer-events-none fixed inset-0 z-40 bg-slate-950/35 opacity-0 transition-opacity peer-checked:pointer-events-auto peer-checked:opacity-100 lg:hidden"
        aria-hidden="true"
      />

      <aside className="fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[85vw] -translate-x-full flex-col border-r border-slate-200 bg-white shadow-[4px_0_24px_-12px_rgba(0,0,0,0.15)] transition-transform duration-200 peer-checked:translate-x-0 lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-end border-b border-slate-100 px-4 py-3 lg:hidden">
          <label
            htmlFor={drawerId}
            className="inline-flex h-8 items-center rounded-md border border-slate-200 px-3 text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            Zavriet
          </label>
        </div>
        <Navigation active={active} />
      </aside>

      <main className="lg:ml-64">
        <div className="mx-auto w-full max-w-[1660px] px-4 pb-10 pt-5 sm:px-6 sm:pt-6 lg:px-10 lg:pt-10 xl:px-12">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-[240px] flex-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
              {description ? (
                <p className="mt-1.5 text-sm font-medium text-slate-500">{description}</p>
              ) : null}
            </div>
            {headerActions ? (
              <div className="w-full sm:w-auto">{headerActions}</div>
            ) : null}
          </header>

          <div className="animate-fade-in-up">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
