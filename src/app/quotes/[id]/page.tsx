import Link from "next/link";
import { notFound } from "next/navigation";

import { duplicateQuoteToBuilderAction } from "@/app/quotes/actions";
import { CreateInvoiceFromQuoteTrigger } from "@/app/quotes/[id]/create-invoice-dialog";
import { QuoteBuilderEditor } from "@/app/quotes/[id]/quote-builder-editor";
import { AppShell } from "@/components/app-shell";
import { requireUserId } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { isQuoteItemSectionDescription } from "@/lib/quotes/items";
import { formatQuoteInvoicingState } from "@/lib/quotes/invoicing";
import { getQuoteInvoicingMetrics } from "@/server/invoices/quote-metrics";
import { buildDefaultVariableSymbol, reserveNextInvoiceNumber } from "@/server/invoices/numbering";
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

function toStringTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.filter((entry): entry is string => typeof entry === "string");
}

export default async function QuoteBuilderPage({ params, searchParams }: QuoteBuilderPageProps) {
  const userId = await requireUserId();
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const [quote, clients, catalogItems, snippets] = await Promise.all([
    getQuoteWithRelations(userId, id),
    listClients(userId),
    listCatalogItems(userId),
    listSnippets(userId),
  ]);

  if (!quote) {
    notFound();
  }

  const [invoicingMetrics, suggestedInvoiceNumber] = await Promise.all([
    getQuoteInvoicingMetrics(userId, quote.id),
    reserveNextInvoiceNumber(userId, new Date()),
  ]);
  const suggestedVariableSymbol = buildDefaultVariableSymbol(suggestedInvoiceNumber);

  const client = quote.client as {
    defaultPaymentMethod: string | null;
    defaultDueDays: number | null;
  } | undefined;
  const defaultPaymentMethod = client?.defaultPaymentMethod ?? "bank_transfer";
  const defaultDueDays = client?.defaultDueDays ?? 14;

  type QuoteItem = (typeof quote)["items"][number];

  return (
    <AppShell
      active="quotes"
      title={`Ponuka ${quote.number}`}
      description="Premium editor s automatickym ukladanim"
      headerActions={
        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
          {invoicingMetrics ? (
            <CreateInvoiceFromQuoteTrigger
              quoteId={quote.id}
              quoteNumber={quote.number}
              currency={quote.currency}
              quoteTotal={invoicingMetrics.quoteTotal}
              invoicedAmount={invoicingMetrics.invoicedAmount}
              remainingToInvoice={invoicingMetrics.remainingToInvoice}
              suggestedInvoiceNumber={suggestedInvoiceNumber}
              suggestedVariableSymbol={suggestedVariableSymbol}
              defaultPaymentMethod={defaultPaymentMethod}
              defaultDueDays={defaultDueDays}
            />
          ) : null}
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

      {invoicingMetrics ? (
        <section className="mb-4 grid gap-3 sm:grid-cols-4">
          <article className="rounded-md border border-slate-200 bg-white p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Quote Value</p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatCurrency(invoicingMetrics.quoteTotal, quote.currency)}
            </p>
          </article>
          <article className="rounded-md border border-slate-200 bg-white p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Invoiced Amount</p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatCurrency(invoicingMetrics.invoicedAmount, quote.currency)}
            </p>
          </article>
          <article className="rounded-md border border-slate-200 bg-white p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Remaining to Invoice</p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatCurrency(invoicingMetrics.remainingToInvoice, quote.currency)}
            </p>
          </article>
          <article className="rounded-md border border-slate-200 bg-white p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Invoicing State</p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatQuoteInvoicingState(invoicingMetrics.invoicingState)}
            </p>
          </article>
        </section>
      ) : null}

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
        initialItems={quote.items.map((item: QuoteItem) => {
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
