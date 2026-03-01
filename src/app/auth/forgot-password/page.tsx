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
    <div className="space-y-4">
      {params.notice ? <p className="text-sm text-emerald-700">{params.notice}</p> : null}
      {params.error ? <p className="text-sm text-red-700">{params.error}</p> : null}

      <form action={forgotPasswordAction} className="space-y-3">
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

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Poslat link na reset hesla
        </button>
      </form>

      <p className="text-sm text-slate-600">
        <Link href="/auth/login" className="underline underline-offset-4">
          Spat na prihlasenie
        </Link>
      </p>
    </div>
  );
}
