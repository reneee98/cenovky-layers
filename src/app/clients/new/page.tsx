import { AppShell } from "@/components/app-shell";
import { ClientForm } from "@/app/clients/client-form";

export default function NewClientPage() {
  return (
    <AppShell
      active="clients"
      title="Novy klient"
      description="Pridaj fakturacne a kontaktne udaje."
    >
      <ClientForm
        mode="create"
        initialValues={{
          type: "company",
          name: "",
          billingAddressLine1: "",
          billingAddressLine2: "",
          city: "",
          zip: "",
          country: "",
          ico: "",
          dic: "",
          icdph: "",
          contactName: "",
          contactEmail: "",
          contactPhone: "",
          companyName: "",
          firstName: "",
          lastName: "",
          billingStreet: "",
          billingCity: "",
          billingZip: "",
          billingCountry: "",
          icDph: "",
          vatPayer: false,
          taxRegimeDefault: "",
          defaultCurrency: "",
          defaultDueDays: 14,
          defaultPaymentMethod: "bank_transfer",
          notes: "",
        }}
      />
    </AppShell>
  );
}
