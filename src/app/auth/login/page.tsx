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
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Prihlásenie</h2>
        <p className="mt-0.5 text-sm text-slate-500">Zadaj svoje prihlasovacie údaje.</p>
      </div>

      {params.notice ? (
        <div className="ui-notice">{params.notice}</div>
      ) : null}
      {params.error ? (
        <div className="ui-notice ui-notice--error">{params.error}</div>
      ) : null}

      <form action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <div>
          <label className="ui-field-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            className="ui-control"
            placeholder="jan@example.sk"
          />
        </div>

        <div>
          <label className="ui-field-label" htmlFor="login-password">
            Heslo
          </label>
          <input
            id="login-password"
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="ui-control"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="ui-btn ui-btn--primary ui-btn--md w-full"
        >
          Prihlásiť sa
        </button>
      </form>

      <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
        <Link
          href="/auth/forgot-password"
          className="text-indigo-600 transition-colors hover:text-indigo-700"
        >
          Zabudnuté heslo?
        </Link>
        <Link
          href="/auth/signup"
          className="font-medium text-indigo-600 transition-colors hover:text-indigo-700"
        >
          Vytvoriť účet
        </Link>
      </div>
    </div>
  );
}
