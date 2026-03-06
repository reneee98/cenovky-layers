import Link from "next/link";

import { changeInvoiceStatusAction, deleteInvoiceAction } from "@/app/invoices/actions";
import {
  InvoiceListDesktop,
  InvoiceListEmpty,
  InvoiceListMobile,
  InvoiceListToolbar,
  InvoiceStatsCards,
} from "@/app/invoices/_components";
import { DeleteInvoiceButton } from "@/app/invoices/delete-invoice-button";
import { AppShell } from "@/components/app-shell";
import { requireUserId } from "@/lib/auth";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { formatInvoiceStatus, INVOICE_STATUS_OPTIONS, isInvoiceStatus } from "@/lib/invoices/status";
import {
  getInvoiceYearSummary,
  listClients,
  listInvoiceCurrencies,
  listInvoiceYears,
  listInvoices,
} from "@/server/repositories";
import { listQuotesWithInvoicingMetrics } from "@/server/invoices/quote-metrics";
import { refreshOverdueInvoices } from "@/server/invoices/service";

type InvoicesPageProps = {
  searchParams: Promise<{
    year?: string;
    status?: string;
    client_id?: string;
    currency?: string;
    linked?: string;
    search?: string;
    notice?: string;
    error?: string;
  }>;
};

function getStatusTone(status: (typeof INVOICE_STATUS_OPTIONS)[number]) {
  if (status === "paid") return "success" as const;
  if (status === "partially_paid") return "warning" as const;
  if (status === "overdue") return "danger" as const;
  if (status === "sent") return "accent" as const;
  return "neutral" as const;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const userId = await requireUserId();
  const params = await searchParams;

  await refreshOverdueInvoices(userId);

  const [years, clients, currencies] = await Promise.all([
    listInvoiceYears(userId),
    listClients(userId),
    listInvoiceCurrencies(userId),
  ]);

  const selectedYear = Number.parseInt(params.year ?? String(new Date().getUTCFullYear()), 10);
  const year = Number.isInteger(selectedYear) ? selectedYear : new Date().getUTCFullYear();
  const status = isInvoiceStatus(params.status) ? params.status : undefined;
  const clientId = params.client_id?.trim() || undefined;
  const currency = params.currency?.trim() || undefined;
  const linkedParam = params.linked;
  const linkedToQuote =
    linkedParam === "yes" ? true : linkedParam === "no" ? false : undefined;
  const search = params.search?.trim() || undefined;

  const [summary, invoices, quoteMetrics] = await Promise.all([
    getInvoiceYearSummary(userId, year),
    listInvoices(userId, {
      year,
      status,
      clientId,
      currency,
      linkedToQuote,
      search,
    }),
    listQuotesWithInvoicingMetrics(userId, {
      quoteStatuses: ["draft", "sent", "accepted", "invoiced"],
    }),
  ]);

  const remainingFromQuotes = quoteMetrics.reduce((sum, m) => sum + m.remainingToInvoice, 0);

  const stats = [
    {
      label: "Fakturované tento rok",
      value: formatNumber(summary.invoicedThisYear),
      note: "Súčet naprieč menami",
    },
    {
      label: "Uhradené tento rok",
      value: formatNumber(summary.paidThisYear),
      note: "Súčet naprieč menami",
    },
    {
      label: "Neuhradené tento rok",
      value: formatNumber(summary.unpaidThisYear),
      note: "Súčet naprieč menami",
    },
    {
      label: "Po splatnosti",
      value: formatNumber(summary.overdueAmount),
      note: `${summary.overdueCount} faktúr`,
    },
    {
      label: "Zostáva fakturovať z ponúk",
      value: formatNumber(remainingFromQuotes),
      note: "Podľa prepojených faktúr",
    },
  ];

  const hasActiveFilters = Boolean(status || clientId || currency || linkedToQuote || search);

  return (
    <AppShell
      active="invoices"
      title="Faktúry"
      description="Prehľad fakturácie, platieb a zostatkov z ponúk."
      headerActions={
        <Link href="/invoices/new" className="btn-primary w-full sm:w-auto">
          Nová faktúra
        </Link>
      }
    >
      <InvoiceStatsCards stats={stats} />

      <section className="mt-6">
        <InvoiceListToolbar
          searchDefaultValue={params.search ?? ""}
          yearDefaultValue={String(year)}
          years={years}
          statusDefaultValue={params.status ?? ""}
          statusOptions={INVOICE_STATUS_OPTIONS.map((value) => ({
            value,
            label: formatInvoiceStatus(value),
          }))}
          clientIdDefaultValue={params.client_id ?? ""}
          clients={clients.map((c) => ({
            id: c.id,
            name: c.name,
            companyName: c.companyName ?? null,
          }))}
          currencyDefaultValue={params.currency ?? ""}
          currencies={currencies}
          linkedDefaultValue={params.linked ?? ""}
        />

        {params.notice ? (
          <div className="ui-notice mt-3">{params.notice}</div>
        ) : null}
        {params.error ? (
          <div className="ui-notice ui-notice--error mt-3">{params.error}</div>
        ) : null}

        {invoices.length === 0 ? (
          <InvoiceListEmpty
            hasActiveFilters={hasActiveFilters}
            emptyAction={
              <Link href="/invoices/new" className="btn-primary">
                Vytvoriť prvú faktúru
              </Link>
            }
          />
        ) : (
          <>
            <InvoiceListDesktop invoices={invoices} getStatusTone={getStatusTone} />
            <InvoiceListMobile invoices={invoices} getStatusTone={getStatusTone} />
          </>
        )}
      </section>
    </AppShell>
  );
}
