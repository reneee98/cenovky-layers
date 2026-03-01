import Link from "next/link";

import { signupAction } from "@/app/auth/actions";

type SignupPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-4">
      {params.error ? <p className="text-sm text-red-700">{params.error}</p> : null}

      <form action={signupAction} className="space-y-3">
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
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Potvrdit heslo
          <input
            type="password"
            name="confirm_password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Vytvorit ucet
        </button>
      </form>

      <p className="text-sm text-slate-600">
        Uz mas ucet?{" "}
        <Link href="/auth/login" className="underline underline-offset-4">
          Prihlasit sa
        </Link>
      </p>
    </div>
  );
}
