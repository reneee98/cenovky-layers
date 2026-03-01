import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-[var(--page-padding-inline)] py-[var(--space-32)]">
      <section className="ui-page-section w-full max-w-xl text-center">
        <h1 className="text-xl font-semibold text-slate-900">Stranka nebola najdena</h1>
        <p className="mt-2 text-sm text-slate-600">
          Pozadovana stranka neexistuje alebo bola odstranena.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Spat na prehlad
        </Link>
      </section>
    </main>
  );
}
