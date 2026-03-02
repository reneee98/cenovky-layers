import Link from "next/link";
import { notFound } from "next/navigation";

import {
  changeInvoiceStatusAction,
  deleteInvoiceAction,
  deletePaymentAction,
} from "@/app/invoices/actions";
import { AddPaymentTrigger } from "@/app/invoices/[id]/add-payment-dialog";
import { DeleteInvoiceButton } from "@/app/invoices/delete-invoice-button";
import { InvoiceExportPdfButton } from "@/app/invoices/[id]/invoice-export-pdf-button";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Select } from "@/components/ui/fields";
import { requireUserId } from "@/lib/auth";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { formatInvoiceStatus } from "@/lib/invoices/status";
import { refreshOverdueInvoices } from "@/server/invoices/service";
import { getInvoiceWithRelations } from "@/server/repositories";

type InvoiceDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
};

function readString(snapshot: Record<string, unknown>, key: string): string {
  const value = snapshot[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "–";
}

function readOptionalString(snapshot: Record<string, unknown>, key: string): string | null {
  const value = snapshot[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function formatPersonName(snapshot: Record<string, unknown>): string {
  const displayName = readOptionalString(snapshot, "displayName");
  if (displayName) return displayName;
  const companyName = readOptionalString(snapshot, "companyName");
  if (companyName) return companyName;
  const firstName = readOptionalString(snapshot, "firstName");
  const lastName = readOptionalString(snapshot, "lastName");
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName.length > 0 ? fullName : "–";
}

export default async function InvoiceDetailPage({ params, searchParams }: InvoiceDetailPageProps) {
  const userId = await requireUserId();
  const [{ id }, query] = await Promise.all([params, searchParams]);

  try {
    await refreshOverdueInvoices(userId);
  } catch (e) {
    console.warn("refreshOverdueInvoices failed (non-blocking):", e);
  }

  const invoice = await getInvoiceWithRelations(userId, id);
  if (!invoice) notFound();

  const supplier =
    invoice.supplierSnapshotJson && typeof invoice.supplierSnapshotJson === "object"
      ? (invoice.supplierSnapshotJson as Record<string, unknown>)
      : {};
  const client =
    invoice.clientSnapshotJson && typeof invoice.clientSnapshotJson === "object"
      ? (invoice.clientSnapshotJson as Record<string, unknown>)
      : {};

  type InvoiceItem = (typeof invoice)["items"][number];
  type InvoicePayment = (typeof invoice)["payments"][number];

  const cardClass =
    "border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_16px_rgba(15,23,42,0.04)]";

  return (
    <AppShell
      active="invoices"
      title={`Faktúra ${invoice.invoiceNumber}`}
      description="Detail faktúry, platby a export PDF."
      headerActions={
        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
          <Link href="/invoices" className="ui-btn ui-btn--secondary ui-btn--md w-full sm:w-auto">
            Späť na zoznam
          </Link>
          <Link
            href={`/invoices/${invoice.id}/edit`}
            className="ui-btn ui-btn--secondary ui-btn--md w-full sm:w-auto"
          >
            Upraviť faktúru
          </Link>
          <InvoiceExportPdfButton
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
            className="ui-btn ui-btn--primary ui-btn--md w-full sm:w-auto"
          />
        </div>
      }
    >
      {query.notice ? <p className="mb-3 text-sm text-emerald-700">{query.notice}</p> : null}
      {query.error ? <p className="mb-3 text-sm text-red-700">{query.error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <p><span className="font-medium text-slate-900">Číslo:</span> {invoice.invoiceNumber}</p>
                <p><span className="font-medium text-slate-900">Variabilný symbol:</span> {invoice.variableSymbol ?? "–"}</p>
                <p><span className="font-medium text-slate-900">Dátum vystavenia:</span> {formatDate(invoice.issueDate)}</p>
                <p><span className="font-medium text-slate-900">Dátum dodania:</span> {formatDate(invoice.taxableSupplyDate)}</p>
                <p><span className="font-medium text-slate-900">Splatnosť:</span> {formatDate(invoice.dueDate)}</p>
                <p><span className="font-medium text-slate-900">Spôsob platby:</span> {invoice.paymentMethod}</p>
                <p><span className="font-medium text-slate-900">Mena:</span> {invoice.currency}</p>
                <p><span className="font-medium text-slate-900">Stav:</span> {formatInvoiceStatus(invoice.status)}</p>
                <p><span className="font-medium text-slate-900">Typ:</span> {invoice.invoiceKind}</p>
                <p><span className="font-medium text-slate-900">Daňový režim:</span> {invoice.taxRegime ?? "–"}</p>
                <p><span className="font-medium text-slate-900">DPH:</span> {invoice.vatEnabled ? `Áno (${invoice.vatRate}%)` : "Nie"}</p>
                <p>
                  <span className="font-medium text-slate-900">Prepojená ponuka:</span>{" "}
                  {invoice.quote ? (
                    <Link href={`/quotes/${invoice.quote.id}`} className="underline">
                      {invoice.quote.number}
                    </Link>
                  ) : "–"}
                </p>
              </div>
              {invoice.legalNote ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <span className="font-medium text-slate-900">Právna poznámka:</span> {invoice.legalNote}
                </p>
              ) : null}
              {invoice.note ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <span className="font-medium text-slate-900">Poznámka:</span> {invoice.note}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className={cardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Dodávateľ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-slate-700">
                <p>{readString(supplier, "companyName")}</p>
                <p>{readString(supplier, "companyAddress")}</p>
                {readOptionalString(supplier, "companyIco") ? <p>IČO: {readString(supplier, "companyIco")}</p> : null}
                {readOptionalString(supplier, "companyDic") ? <p>DIČ: {readString(supplier, "companyDic")}</p> : null}
                {readOptionalString(supplier, "companyIcdph") ? <p>IČ DPH: {readString(supplier, "companyIcdph")}</p> : null}
                {readOptionalString(supplier, "companyIban") ? <p>IBAN: {readString(supplier, "companyIban")}</p> : null}
                {readOptionalString(supplier, "companySwiftBic") ? <p>SWIFT/BIC: {readString(supplier, "companySwiftBic")}</p> : null}
                <p>{readString(supplier, "companyEmail")}</p>
                <p>{readString(supplier, "companyPhone")}</p>
                {readOptionalString(supplier, "companyWebsite") ? <p>{readString(supplier, "companyWebsite")}</p> : null}
                {readOptionalString(supplier, "companyRegistrationNote") ? <p>{readString(supplier, "companyRegistrationNote")}</p> : null}
              </CardContent>
            </Card>
            <Card className={cardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Odberateľ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-slate-700">
                <p>{formatPersonName(client)}</p>
                <p>{readString(client, "billingStreet")}</p>
                <p>{`${readString(client, "billingZip")} ${readString(client, "billingCity")}`}</p>
                <p>{readString(client, "billingCountry")}</p>
                {readOptionalString(client, "ico") ? <p>IČO: {readString(client, "ico")}</p> : null}
                {readOptionalString(client, "dic") ? <p>DIČ: {readString(client, "dic")}</p> : null}
                {readOptionalString(client, "icDph") ? <p>IČ DPH: {readString(client, "icDph")}</p> : null}
                <p>{readString(client, "contactName")}</p>
                <p>{readString(client, "contactEmail")}</p>
                {readOptionalString(client, "contactPhone") ? <p>{readString(client, "contactPhone")}</p> : null}
              </CardContent>
            </Card>
          </div>

          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Položky</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="ui-table min-w-[960px]">
                  <thead>
                    <tr>
                      <th className="ui-table-cell--text">Názov</th>
                      <th className="ui-table-cell--text">Popis</th>
                      <th className="ui-table-cell--text">Jednotka</th>
                      <th className="ui-table-cell--number">Množstvo</th>
                      <th className="ui-table-cell--number">Cena/j.</th>
                      <th className="ui-table-cell--number">Zľava %</th>
                      <th className="ui-table-cell--number">DPH %</th>
                      <th className="ui-table-cell--number">Spolu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item: InvoiceItem) => (
                      <tr key={item.id} className="ui-table-row">
                        <td className="ui-table-cell--text ui-table-cell--strong">{item.name}</td>
                        <td className="ui-table-cell--text">{item.description ?? "–"}</td>
                        <td className="ui-table-cell--text">{item.unit}</td>
                        <td className="ui-table-cell--number">{item.qty.toString()}</td>
                        <td className="ui-table-cell--number">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                        <td className="ui-table-cell--number">{item.discountPct.toString()}</td>
                        <td className="ui-table-cell--number">{item.vatRate.toString()}</td>
                        <td className="ui-table-cell--number ui-table-cell--strong">
                          {formatCurrency(item.lineTotal, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 grid gap-2 text-sm sm:max-w-sm sm:ml-auto" role="group" aria-label="Súhrn súm">
                <div className="flex items-center justify-between gap-2">
                  <span>Medzisúčet</span>
                  <strong className="tabular-nums">{formatCurrency(invoice.subtotal, invoice.currency)}</strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Zľava</span>
                  <strong className="tabular-nums">{formatCurrency(invoice.discountTotal, invoice.currency)}</strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Základ dane</span>
                  <strong className="tabular-nums">{formatCurrency(invoice.taxBaseTotal, invoice.currency)}</strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>DPH</span>
                  <strong className="tabular-nums">{formatCurrency(invoice.vatTotal, invoice.currency)}</strong>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2 text-base">
                  <span>Spolu</span>
                  <strong className="tabular-nums">{formatCurrency(invoice.total, invoice.currency)}</strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Uhradené</span>
                  <strong className="tabular-nums">{formatCurrency(invoice.amountPaid, invoice.currency)}</strong>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2 text-base">
                  <span>Na úhradu</span>
                  <strong className="tabular-nums text-slate-900">{formatCurrency(invoice.amountDue, invoice.currency)}</strong>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className={cardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Platby</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  Na úhradu: <strong className="text-slate-900">{formatCurrency(invoice.amountDue, invoice.currency)}</strong>
                </p>
                <div className="mt-3">
                  <AddPaymentTrigger
                    invoiceId={invoice.id}
                    currency={invoice.currency}
                    defaultPaymentMethod={invoice.paymentMethod}
                    amountDue={invoice.amountDue}
                  />
                </div>
              </CardContent>
            </Card>
            <Card className={cardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">História platieb</CardTitle>
              </CardHeader>
              <CardContent>
                {invoice.payments.length === 0 ? (
                  <p className="text-sm text-slate-600">Zatiaľ nebola pridaná žiadna platba.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="ui-table min-w-[520px]">
                      <thead>
                        <tr>
                          <th className="ui-table-cell--text">Dátum</th>
                          <th className="ui-table-cell--text">Metóda</th>
                          <th className="ui-table-cell--number">Suma</th>
                          <th className="ui-table-cell--text">Poznámka</th>
                          <th className="ui-table-cell--number">Akcia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.payments.map((payment: InvoicePayment) => (
                          <tr key={payment.id} className="ui-table-row">
                            <td className="ui-table-cell--text">{formatDate(payment.paymentDate)}</td>
                            <td className="ui-table-cell--text">{payment.method}</td>
                            <td className="ui-table-cell--number ui-table-cell--strong">
                              {formatCurrency(payment.amount, invoice.currency)}
                            </td>
                            <td className="ui-table-cell--text">{payment.note ?? "–"}</td>
                            <td className="ui-table-cell--number">
                              <form action={deletePaymentAction}>
                                <input type="hidden" name="invoice_id" value={invoice.id} />
                                <input type="hidden" name="payment_id" value={payment.id} />
                                <button
                                  type="submit"
                                  className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
                                  aria-label="Odstrániť platbu"
                                >
                                  Odstrániť
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="mt-4 text-xs text-slate-500">
                  Vytvorené: {formatDateTime(invoice.createdAt)} · Aktualizované: {formatDateTime(invoice.updatedAt)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <aside className="xl:col-span-1">
          <Card className={`sticky top-4 ${cardClass}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Akcie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={changeInvoiceStatusAction} className="space-y-2">
                <input type="hidden" name="invoice_id" value={invoice.id} />
                <label className="block text-sm font-medium text-slate-700">
                  Zmena stavu
                  <Select
                    name="status"
                    defaultValue={invoice.status === "cancelled" ? "cancelled" : invoice.status === "draft" ? "draft" : "sent"}
                    className="mt-1 w-full"
                    aria-label="Stav faktúry"
                  >
                    <option value="draft">Koncept</option>
                    <option value="sent">Odoslaná</option>
                    <option value="cancelled">Stornovaná</option>
                  </Select>
                </label>
                <button type="submit" className="ui-btn ui-btn--secondary ui-btn--sm w-full">
                  Uložiť stav
                </button>
              </form>
              <form action={deleteInvoiceAction}>
                <input type="hidden" name="invoice_id" value={invoice.id} />
                <DeleteInvoiceButton invoiceNumber={invoice.invoiceNumber} className="w-full" />
              </form>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
