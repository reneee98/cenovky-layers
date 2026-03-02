import Link from "next/link";
import { notFound } from "next/navigation";

import { InvoiceForm } from "@/app/invoices/invoice-form";
import { AppShell } from "@/components/app-shell";
import { requireUserId } from "@/lib/auth";
import { getQuoteInvoicingMetrics } from "@/server/invoices/quote-metrics";
import {
  getInvoiceWithRelations,
  getQuoteWithRelations,
  listClients,
  listQuotes,
} from "@/server/repositories";

type EditInvoicePageProps = {
  params: Promise<{
    id: string;
  }>;
};

function toDateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const userId = await requireUserId();
  const { id } = await params;

  const [invoice, clients, quotes] = await Promise.all([
    getInvoiceWithRelations(userId, id),
    listClients(userId),
    listQuotes(userId),
  ]);

  if (!invoice) {
    notFound();
  }

  const quote = invoice.quoteId ? await getQuoteWithRelations(userId, invoice.quoteId) : null;
  const quoteMetrics = quote ? await getQuoteInvoicingMetrics(userId, quote.id) : null;

  type QuoteItem = NonNullable<typeof quote>["items"][number];
  type InvoiceItem = (typeof invoice)["items"][number];
  const fullItems = quote
    ? quote.items.map((item: QuoteItem) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        unit: item.unit,
        qty: item.qty.toString(),
        unitPrice: item.unitPrice.toString(),
        discountPct: item.discountPct.toString(),
        vatRate: quote.vatRate.toString(),
      }))
    : [];

  return (
    <AppShell
      active="invoices"
      title={`Upraviť faktúru ${invoice.invoiceNumber}`}
      description="Úprava metadát, položiek a prepojení faktúry."
      headerActions={
        <Link
          href={`/invoices/${invoice.id}`}
          className="ui-btn ui-btn--secondary ui-btn--md w-full sm:w-auto"
        >
          Späť na detail
        </Link>
      }
    >
      <InvoiceForm
        mode="edit"
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
          companyName: client.companyName,
          firstName: client.firstName,
          lastName: client.lastName,
          defaultCurrency: client.defaultCurrency,
          defaultDueDays: client.defaultDueDays,
          defaultPaymentMethod: client.defaultPaymentMethod,
          taxRegimeDefault: client.taxRegimeDefault,
          vatPayer: client.vatPayer,
        }))}
        quotes={quotes.map((entry) => ({
          id: entry.id,
          number: entry.number,
          title: entry.title,
        }))}
        quotePreset={
          quote && quoteMetrics
            ? {
                quoteId: quote.id,
                quoteNumber: quote.number,
                remainingToInvoice: quoteMetrics.remainingToInvoice + invoice.total,
                currency: quote.currency,
                vatRate: quote.vatRate,
                fullItems,
              }
            : null
        }
        initialValues={{
          id: invoice.id,
          quoteId: invoice.quoteId,
          clientId: invoice.clientId,
          invoiceNumber: invoice.invoiceNumber,
          variableSymbol: invoice.variableSymbol ?? "",
          issueDate: toDateInputValue(invoice.issueDate),
          taxableSupplyDate: toDateInputValue(invoice.taxableSupplyDate),
          dueDate: toDateInputValue(invoice.dueDate),
          paymentMethod: invoice.paymentMethod,
          currency: invoice.currency,
          vatEnabled: invoice.vatEnabled,
          vatRate: invoice.vatRate.toString(),
          taxRegime: invoice.taxRegime ?? "",
          invoiceKind: invoice.invoiceKind,
          status: invoice.status === "cancelled" ? "cancelled" : invoice.status === "draft" ? "draft" : "sent",
          legalNote: invoice.legalNote ?? "",
          note: invoice.note ?? "",
          items: invoice.items.map((item: InvoiceItem) => ({
            id: item.id,
            name: item.name,
            description: item.description ?? "",
            unit: item.unit,
            qty: item.qty.toString(),
            unitPrice: item.unitPrice.toString(),
            discountPct: item.discountPct.toString(),
            vatRate: item.vatRate.toString(),
          })),
        }}
      />
    </AppShell>
  );
}
