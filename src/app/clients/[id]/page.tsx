import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { requireUserId } from "@/lib/auth";
import { getClientById } from "@/server/repositories";
import { getClientDisplayName } from "@/lib/clients/display";
import { canCreateInvoiceForClient } from "@/server/invoices/snapshots";

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
};

function DetailSection({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  const display = value?.trim() || "—";
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{display}</dd>
    </div>
  );
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const userId = await requireUserId();
  const { id } = await params;
  const client = await getClientById(userId, id);

  if (!client) {
    notFound();
  }

  const displayName = getClientDisplayName(client);
  const invoiceReady = canCreateInvoiceForClient(client);

  return (
    <AppShell
      active="clients"
      title={displayName || client.name}
      description="Fakturacne a kontaktne udaje klienta."
      headerActions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            href={`/clients/${id}/edit`}
            className="inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            Upravit
          </Link>
          <Link
            href={invoiceReady ? `/invoices/new?client_id=${id}` : `/clients/${id}/edit`}
            className={`inline-flex w-full justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition sm:w-auto ${invoiceReady ? "bg-slate-900 hover:bg-slate-700" : "bg-slate-400 cursor-not-allowed"}`}
          >
            {invoiceReady ? "Nova faktura" : "Doplnte udaje pre fakturu"}
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {!invoiceReady && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Pre vytvorenie faktury doplnte v sekcii Upravit aspon nazov firmy alebo meno a priezvisko a fakturacnu adresu.
          </div>
        )}

        <DetailSection title="1. Zakladne udaje">
          <DetailRow label="Typ" value={client.type === "company" ? "Firma" : client.type === "sole_trader" ? "Zivnostnik" : "Fyzicka osoba"} />
          {(client.type === "company" || client.type === "sole_trader") && (
            <DetailRow label="Nazov firmy" value={client.companyName ?? client.name} />
          )}
          {client.type === "person" && (
            <>
              <DetailRow label="Krstne meno" value={client.firstName} />
              <DetailRow label="Priezvisko" value={client.lastName} />
            </>
          )}
          <DetailRow label="Kontaktna osoba" value={client.contactName} />
          <DetailRow label="Email" value={client.contactEmail} />
          <DetailRow label="Telefon" value={client.contactPhone} />
        </DetailSection>

        <DetailSection title="2. Fakturacna adresa">
          <DetailRow label="Ulica a cislo" value={client.billingStreet ?? client.billingAddressLine1} />
          <DetailRow label="Mesto" value={client.billingCity ?? client.city} />
          <DetailRow label="PSC" value={client.billingZip ?? client.zip} />
          <DetailRow label="Krajina" value={client.billingCountry ?? client.country} />
        </DetailSection>

        <DetailSection title="3. Firma a dane">
          <DetailRow label="ICO" value={client.ico} />
          <DetailRow label="DIC" value={client.dic} />
          <DetailRow label="IC DPH" value={client.icDph ?? client.icdph} />
          <DetailRow label="Platca DPH" value={client.vatPayer ? "Ano" : "Nie"} />
          <DetailRow label="Danovy rezim" value={client.taxRegimeDefault} />
        </DetailSection>

        <DetailSection title="4. Predvolenky pre faktury">
          <DetailRow label="Predvolena mena" value={client.defaultCurrency} />
          <DetailRow label="Splatnost (dni)" value={client.defaultDueDays != null ? String(client.defaultDueDays) : null} />
          <DetailRow label="Metoda platby" value={client.defaultPaymentMethod} />
          <DetailRow label="Poznamky" value={client.notes} />
        </DetailSection>
      </div>
    </AppShell>
  );
}
