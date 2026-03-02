import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { requireUserId } from "@/lib/auth";
import { getQuoteInvoicingMetrics } from "@/server/invoices/quote-metrics";
import { buildDefaultVariableSymbol, reserveNextInvoiceNumber } from "@/server/invoices/numbering";
import { canCreateInvoiceForClient } from "@/server/invoices/snapshots";
import { InvoiceForm } from "@/app/invoices/invoice-form";
import {
  getQuoteWithRelations,
  getSettings,
  listClients,
  listQuotes,
} from "@/server/repositories";

type NewInvoicePageProps = {
  searchParams: Promise<{
    quote_id?: string;
    client_id?: string;
  }>;
};

function toDateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export default async function NewInvoicePage({ searchParams }: NewInvoicePageProps) {
  const userId = await requireUserId();
  const params = await searchParams;

  const quoteId = params.quote_id?.trim() || null;
  const clientIdFromQuery = params.client_id?.trim() || null;

  const [clients, quotes, settings, quote] = await Promise.all([
    listClients(userId),
    listQuotes(userId),
    getSettings(userId),
    quoteId ? getQuoteWithRelations(userId, quoteId) : null,
  ]);

  if (clients.length === 0) {
    redirect("/clients/new");
  }

  const now = new Date();
  const issueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const firstInvoiceReadyClient = clients.find((client) => canCreateInvoiceForClient(client)) ?? clients[0];

  const selectedClient =
    quote
      ? clients.find((client) => client.id === quote.clientId) ?? firstInvoiceReadyClient
      : clientIdFromQuery
        ? clients.find((client) => client.id === clientIdFromQuery) ?? firstInvoiceReadyClient
        : firstInvoiceReadyClient;

  const dueDays = selectedClient.defaultDueDays ?? 14;
  const dueDate = new Date(issueDate);
  dueDate.setUTCDate(dueDate.getUTCDate() + Math.max(0, dueDays));

  const invoiceNumber = await reserveNextInvoiceNumber(userId, issueDate);
  const variableSymbol = buildDefaultVariableSymbol(invoiceNumber);

  const quoteMetrics = quote ? await getQuoteInvoicingMetrics(userId, quote.id) : null;

  type QuoteItem = NonNullable<typeof quote>["items"][number];
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

  const initialItems = fullItems.length > 0
    ? fullItems
    : [
        {
          id: "new-item-1",
          name: "",
          description: "",
          unit: "pcs" as const,
          qty: "1",
          unitPrice: "0",
          discountPct: "0",
          vatRate: settings.vatRate.toString(),
        },
      ];

  return (
    <AppShell
      active="invoices"
      title={quote ? `Nová faktúra z ponuky ${quote.number}` : "Nová faktúra"}
      description="Ručná tvorba faktúry alebo prepojenie s existujúcou ponukou."
      headerActions={
        <Link href="/invoices" className="ui-btn ui-btn--secondary ui-btn--md w-full sm:w-auto">
          Späť na faktúry
        </Link>
      }
    >
      <InvoiceForm
        mode="create"
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
          invoiceReady: canCreateInvoiceForClient(client),
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
                remainingToInvoice: quoteMetrics.remainingToInvoice,
                currency: quote.currency,
                vatRate: quote.vatRate,
                fullItems,
              }
            : null
        }
        initialValues={{
          quoteId: quote?.id ?? null,
          clientId: quote?.clientId ?? selectedClient.id,
          invoiceNumber,
          variableSymbol,
          issueDate: toDateInputValue(issueDate),
          taxableSupplyDate: toDateInputValue(issueDate),
          dueDate: toDateInputValue(dueDate),
          paymentMethod: selectedClient.defaultPaymentMethod ?? "bank_transfer",
          currency: quote?.currency ?? selectedClient.defaultCurrency ?? settings.defaultCurrency,
          vatEnabled: quote?.vatEnabled ?? true,
          vatRate: quote?.vatRate.toString() ?? settings.vatRate.toString(),
          taxRegime: selectedClient.taxRegimeDefault ?? "",
          invoiceKind: "full",
          status: "draft",
          legalNote: "",
          note: "",
          items: initialItems,
        }}
      />
    </AppShell>
  );
}
