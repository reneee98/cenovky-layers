import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { listPdfPreviewFixtureIds } from "@/server/quotes/pdf-preview-fixtures";

type PdfPreviewPageProps = {
  searchParams: Promise<{
    fixture?: string;
  }>;
};

export default async function PdfPreviewPage({ searchParams }: PdfPreviewPageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { fixture } = await searchParams;
  const fixtures = listPdfPreviewFixtureIds();
  const activeFixture = fixture && fixtures.includes(fixture as (typeof fixtures)[number])
    ? fixture
    : fixtures[0];

  return (
    <AppShell
      active="quotes"
      title="PDF Preview"
      description="Internal visual QA for PDF layout fixtures"
    >
      <section className="ui-page-section">
        <div className="flex flex-wrap gap-2">
          {fixtures.map((fixtureId) => (
            <Link
              key={fixtureId}
              href={`/dev/pdf-preview?fixture=${fixtureId}`}
              className={`ui-btn ui-btn--sm ${fixtureId === activeFixture ? "ui-btn--primary" : "ui-btn--secondary"}`}
            >
              {fixtureId}
            </Link>
          ))}
          <a
            href={`/api/dev/pdf-preview/${activeFixture}`}
            target="_blank"
            rel="noreferrer"
            className="ui-btn ui-btn--ghost ui-btn--sm"
          >
            Open PDF in new tab
          </a>
        </div>

        <div className="mt-4 rounded-[16px] border border-[var(--color-border)] bg-white p-2">
          <iframe
            key={activeFixture}
            title="PDF preview"
            src={`/api/dev/pdf-preview/${activeFixture}`}
            className="h-[80vh] w-full rounded-[12px]"
          />
        </div>
      </section>
    </AppShell>
  );
}
