const sections = [
  "Dashboard",
  "Quotes",
  "Clients",
  "Catalog",
  "Templates",
  "Settings",
];

const phaseOneTasks = [
  "Project setup with Next.js + TypeScript",
  "Database and migrations aligned with codex/DATA_MODEL.md",
  "Settings screen (next step)",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-8 text-[var(--foreground)] md:px-10">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Quote Builder
          </h2>
          <nav aria-label="Primary">
            <ul className="space-y-2 text-sm">
              {sections.map((section) => (
                <li key={section}>
                  <button
                    className="w-full rounded-md px-3 py-2 text-left text-slate-700 transition hover:bg-slate-100"
                    type="button"
                  >
                    {section}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <section className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">MVP Foundation</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            This workspace is now set up for the Quote Builder implementation from
            codex/TASKS.md. Phase 1 starts with foundation and database modeling.
          </p>

          <div className="mt-6 rounded-lg bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-800">Phase 1 status</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {phaseOneTasks.map((task) => (
                <li key={task} className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 text-emerald-600">[x]</span>
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
