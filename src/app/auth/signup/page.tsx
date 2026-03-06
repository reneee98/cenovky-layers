import Link from "next/link";

import { signupAction } from "@/app/auth/actions";

type SignupPageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Vytvorenie účtu</h2>
        <p className="mt-0.5 text-sm text-slate-500">Registrácia je bezplatná.</p>
      </div>

      {params.notice ? (
        <div className="ui-notice">{params.notice}</div>
      ) : null}
      {params.error ? (
        <div className="ui-notice ui-notice--error">{params.error}</div>
      ) : null}

      <form action={signupAction} className="space-y-4">
        <div>
          <label className="ui-field-label" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            className="ui-control"
            placeholder="jan@example.sk"
          />
        </div>

        <div>
          <label className="ui-field-label" htmlFor="signup-password">
            Heslo
          </label>
          <input
            id="signup-password"
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
          <label className="ui-field-label" htmlFor="signup-confirm">
            Potvrdiť heslo
          </label>
          <input
            id="signup-confirm"
            type="password"
            name="confirm_password"
            required
            minLength={8}
            autoComplete="new-password"
            className="ui-control"
            placeholder="Zopakuj heslo"
          />
        </div>

        <button
          type="submit"
          className="ui-btn ui-btn--primary ui-btn--md w-full"
        >
          Vytvoriť účet
        </button>
      </form>

      <div className="border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
        Už máš účet?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-indigo-600 transition-colors hover:text-indigo-700"
        >
          Prihlásiť sa
        </Link>
      </div>
    </div>
  );
}
