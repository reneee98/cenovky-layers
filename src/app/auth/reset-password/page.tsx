import Link from "next/link";

import { resetPasswordAction } from "@/app/auth/actions";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Nové heslo</h2>
        <p className="mt-0.5 text-sm text-slate-500">Zadaj nové heslo pre svoj účet.</p>
      </div>

      {params.error ? (
        <div className="ui-notice ui-notice--error">{params.error}</div>
      ) : null}

      <form action={resetPasswordAction} className="space-y-4">
        <div>
          <label className="ui-field-label" htmlFor="reset-password">
            Nové heslo
          </label>
          <input
            id="reset-password"
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="ui-control"
            placeholder="Min. 8 znakov"
          />
        </div>

        <div>
          <label className="ui-field-label" htmlFor="reset-confirm">
            Potvrdiť nové heslo
          </label>
          <input
            id="reset-confirm"
            type="password"
            name="confirm_password"
            required
            minLength={8}
            autoComplete="new-password"
            className="ui-control"
            placeholder="Zopakuj heslo"
          />
        </div>

        <button type="submit" className="ui-btn ui-btn--primary ui-btn--md w-full">
          Uložiť nové heslo
        </button>
      </form>

      <div className="border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
        <Link
          href="/auth/login"
          className="font-medium text-indigo-600 transition-colors hover:text-indigo-700"
        >
          Späť na prihlásenie
        </Link>
      </div>
    </div>
  );
}
