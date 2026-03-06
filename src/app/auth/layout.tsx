import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-xl font-bold text-white shadow-xl shadow-indigo-500/25">
            C
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cenovka</h1>
          <p className="mt-1.5 text-sm text-slate-500">Cenové ponuky a faktúry pre freelancerov</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/[0.03]">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Cenovka. Všetky práva vyhradené.
        </p>
      </div>
    </div>
  );
}
