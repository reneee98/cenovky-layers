"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6">
      <h1 className="text-2xl font-semibold">Aplikacia narazila na chybu servera</h1>
      <p className="mt-3 text-center text-sm text-slate-600">
        Skontrolujte dostupnost databazy a premenne prostredia vo Verceli.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-slate-500">Digest: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Skusit znovu
      </button>
    </main>
  );
}
