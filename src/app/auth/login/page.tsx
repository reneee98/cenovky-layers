import Link from "next/link";

import { loginAction } from "@/app/auth/actions";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
    notice?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/";

  return (
    <div className="space-y-4">
      {params.notice ? <p className="text-sm text-emerald-700">{params.notice}</p> : null}
      {params.error ? <p className="text-sm text-red-700">{params.error}</p> : null}

      <form action={loginAction} className="space-y-3">
        <input type="hidden" name="next" value={next} />

        <label className="block text-sm text-slate-700">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Heslo
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Prihlasit sa
        </button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <Link href="/auth/forgot-password" className="text-slate-600 underline underline-offset-4">
          Zabudnute heslo
        </Link>
        <Link href="/auth/signup" className="text-slate-600 underline underline-offset-4">
          Vytvorit ucet
        </Link>
      </div>
    </div>
  );
}
