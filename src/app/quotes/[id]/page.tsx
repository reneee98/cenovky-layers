import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { duplicateQuoteToBuilderAction } from "@/app/quotes/actions";
import { QuoteBuilderEditor } from "@/app/quotes/[id]/quote-builder-editor";
import { AppShell } from "@/components/app-shell";
import { isQuoteItemSectionDescription } from "@/lib/quotes/items";
import {
  getQuoteWithRelations,
  listCatalogItems,
  listClients,
  listSnippets,
} from "@/server/repositories";

type QuoteBuilderPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    notice?: string;
  }>;
};

function toStringTags(tags: Prisma.JsonValue): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.filter((entry): entry is string => typeof entry === "string");
}

export default async function QuoteBuilderPage({ params, searchParams }: QuoteBuilderPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const [quote, clients, catalogItems, snippets] = await Promise.all([
    getQuoteWithRelations(id),
    listClients(),
    listCatalogItems(),
    listSnippets(),
  ]);

  if (!quote) {
    notFound();
  }

  return (
    <AppShell
      active="quotes"
      title={`Ponuka ${quote.number}`}
      description="Premium editor s automatickym ukladanim"
      headerActions={
        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
          <Link
            href="/quotes"
            className="ui-btn ui-btn--secondary ui-btn--md w-full sm:w-auto"
          >
            Spat na zoznam
          </Link>
        </div>
      }
    >
      {query.notice ? <p className="text-sm text-emerald-700">{query.notice}</p> : null}

      <QuoteBuilderEditor
        quoteId={quote.id}
        quoteNumber={quote.number}
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
        }))}
        snippets={snippets.map((snippet) => ({
          id: snippet.id,
          type: snippet.type,
          language: snippet.language,
          title: snippet.title,
          contentMarkdown: snippet.contentMarkdown,
        }))}
        catalogItems={catalogItems.map((item) => ({
          id: item.id,
          category: item.category,
          tags: toStringTags(item.tags),
          name: item.name,
          description: item.description,
          defaultUnit: item.defaultUnit,
          defaultUnitPrice: item.defaultUnitPrice.toString(),
        }))}
        duplicateQuoteAction={duplicateQuoteToBuilderAction}
        initialState={{
          title: quote.title,
          clientId: quote.clientId,
          language: quote.language,
          currency: quote.currency,
          validUntil: quote.validUntil.toISOString(),
          vatEnabled: quote.vatEnabled,
          showClientDetailsInPdf: quote.showClientDetailsInPdf ?? true,
          showCompanyDetailsInPdf: quote.showCompanyDetailsInPdf ?? true,
          status: quote.status,
          introContentMarkdown: quote.introContentMarkdown,
          termsContentMarkdown: quote.termsContentMarkdown,
          revisionsIncluded: quote.revisionsIncluded,
          totalDiscountType: quote.totalDiscountType,
          totalDiscountValue: quote.totalDiscountValue.toString(),
          vatRate: quote.vatRate.toString(),
        }}
        initialItems={quote.items.map((item) => {
          const isSection = isQuoteItemSectionDescription(item.description);

          return {
            id: item.id,
            name: item.name,
            description: isSection ? "" : item.description ?? "",
            unit: item.unit,
            qty: item.qty.toString(),
            unitPrice: item.unitPrice.toString(),
            discountPct: item.discountPct.toString(),
            isSection,
          };
        })}
      />
    </AppShell>
  );
}
