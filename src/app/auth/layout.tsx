import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cenovka</h1>
        <p className="mt-1 text-sm text-slate-500">Prihlasenie a sprava uctu</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
