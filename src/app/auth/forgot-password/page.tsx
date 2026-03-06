import Link from "next/link";

import { forgotPasswordAction } from "@/app/auth/actions";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Zabudnuté heslo</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Pošleme ti link na obnovenie hesla.
        </p>
      </div>

      {params.notice ? (
        <div className="ui-notice">{params.notice}</div>
      ) : null}
      {params.error ? (
        <div className="ui-notice ui-notice--error">{params.error}</div>
      ) : null}

      <form action={forgotPasswordAction} className="space-y-4">
        <div>
          <label className="ui-field-label" htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            className="ui-control"
            placeholder="jan@example.sk"
          />
        </div>

        <button
          type="submit"
          className="ui-btn ui-btn--primary ui-btn--md w-full"
        >
          Poslať reset link
        </button>
      </form>

      <div className="border-t border-slate-100 pt-4 text-center text-sm">
        <Link
          href="/auth/login"
          className="text-indigo-600 transition-colors hover:text-indigo-700"
        >
          ← Späť na prihlásenie
        </Link>
      </div>
    </div>
  );
}
