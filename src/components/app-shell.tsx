import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  ReceiptText,
  Settings,
  Users,
  X,
  LogOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/auth/actions";
import { getOptionalUser } from "@/lib/auth";

const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Prehľad",
    description: "Rýchly stav pipeline",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    key: "quotes",
    label: "Ponuky",
    description: "Všetky cenové ponuky",
    href: "/quotes",
    icon: FileText,
  },
  {
    key: "clients",
    label: "Klienti",
    description: "Kontaktné a fakturačné dáta",
    href: "/clients",
    icon: Users,
  },
  {
    key: "invoices",
    label: "Faktúry",
    description: "Evidencia vystavených faktúr",
    href: "/invoices",
    icon: ReceiptText,
  },
  {
    key: "catalog",
    label: "Katalóg",
    description: "Cenník služieb",
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
  userEmail: string;
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
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
        isActive
          ? "bg-indigo-500/[0.14] text-white"
          : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        className={`h-[17px] w-[17px] shrink-0 transition-colors ${
          isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className="block font-medium leading-none tracking-[-0.01em]">{item.label}</span>
        <span className="mt-0.5 block truncate text-[11px] leading-none text-slate-500 group-hover:text-slate-400">
          {item.description}
        </span>
      </span>
      {isActive && (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
      )}
    </Link>
  );
}

function Navigation({ active, userEmail }: NavigationProps) {
  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <nav aria-label="Hlavná navigácia" className="flex h-full flex-col overflow-y-auto">
      {/* Brand */}
      <div className="px-5 pb-4 pt-5">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-500/30">
            C
          </span>
          <span className="text-[15px] font-bold tracking-tight text-white">Cenovka</span>
        </Link>
      </div>

      {/* CTA */}
      <div className="px-4 pb-5">
        <Link
          href="/quotes/new"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-150 hover:bg-indigo-400 hover:shadow-indigo-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          <Plus className="h-4 w-4" />
          Nová ponuka
        </Link>
      </div>

      {/* Nav items */}
      <ul className="flex-1 space-y-0.5 px-3 pb-4">
        {NAV_ITEMS.map((item) => (
          <li key={item.key}>
            <NavigationLink item={item} isActive={item.key === active} />
          </li>
        ))}
      </ul>

      {/* User section */}
      <div className="border-t border-slate-800 px-4 pb-4 pt-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-xs font-bold text-white shadow-md shadow-indigo-900/50">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-300">{userEmail}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <LogOut className="h-3.5 w-3.5" />
            Odhlásiť sa
          </button>
        </form>
      </div>
    </nav>
  );
}

export async function AppShell({
  active,
  title,
  description,
  headerActions,
  children,
}: AppShellProps) {
  const drawerId = "app-nav-drawer";
  const user = await getOptionalUser();
  const userEmail = user?.email?.trim() || "no-email";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <input
        id={drawerId}
        type="checkbox"
        className="peer sr-only"
        aria-hidden="true"
      />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md lg:hidden">
        <label
          htmlFor={drawerId}
          className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
        >
          <Menu className="h-4 w-4" />
          <span>Menu</span>
        </label>

        <Link href="/" className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500 text-[10px] font-bold text-white">C</span>
          <span className="text-sm font-bold tracking-tight text-slate-900">Cenovka</span>
        </Link>

        <Link
          href="/settings"
          className="flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      {/* Backdrop */}
      <label
        htmlFor={drawerId}
        className="pointer-events-none fixed inset-0 z-40 bg-slate-950/50 opacity-0 backdrop-blur-sm transition-opacity duration-200 peer-checked:pointer-events-auto peer-checked:opacity-100 lg:hidden"
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[85vw] -translate-x-full flex-col border-r border-slate-800 bg-slate-900 shadow-2xl transition-transform duration-200 ease-out peer-checked:translate-x-0 lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none">
        {/* Mobile close button */}
        <div className="flex items-center justify-end border-b border-slate-800 px-4 py-3 lg:hidden">
          <label
            htmlFor={drawerId}
            className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
            Zavrieť
          </label>
        </div>

        <Navigation active={active} userEmail={userEmail} />
      </aside>

      {/* Main content */}
      <main className="lg:ml-64">
        <div className="mx-auto w-full max-w-[1660px] px-4 pb-12 pt-6 sm:px-6 sm:pt-7 lg:px-10 lg:pt-10 xl:px-12">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-[240px] flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
              {description ? (
                <p className="mt-1.5 text-sm text-slate-500">{description}</p>
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
