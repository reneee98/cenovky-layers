import { notFound } from "next/navigation";

import { ClientForm } from "@/app/clients/client-form";
import { AppShell } from "@/components/app-shell";
import { getClientById } from "@/server/repositories";

type EditClientPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params;
  const client = await getClientById(id);

  if (!client) {
    notFound();
  }

  return (
    <AppShell
      active="clients"
      title="Upravit klienta"
      description="Uprava fakturacnych a kontaktnych udajov."
    >
      <ClientForm
        mode="edit"
        initialValues={{
          id: client.id,
          type: client.type,
          name: client.name,
          billingAddressLine1: client.billingAddressLine1,
          billingAddressLine2: client.billingAddressLine2,
          city: client.city,
          zip: client.zip,
          country: client.country,
          ico: client.ico,
          dic: client.dic,
          icdph: client.icdph,
          contactName: client.contactName,
          contactEmail: client.contactEmail,
          contactPhone: client.contactPhone,
        }}
      />
    </AppShell>
  );
}
