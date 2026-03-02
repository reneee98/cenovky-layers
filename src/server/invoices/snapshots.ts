type ClientLike = {
  type: "company" | "sole_trader" | "person";
  name: string;
  billingAddressLine1: string;
  city: string;
  zip: string;
  country: string;
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  billingStreet?: string | null;
  billingCity?: string | null;
  billingZip?: string | null;
  billingCountry?: string | null;
  ico?: string | null;
  dic?: string | null;
  icDph?: string | null;
  icdph?: string | null;
  vatPayer?: boolean;
  taxRegimeDefault?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  defaultCurrency?: string | null;
  defaultDueDays?: number | null;
  defaultPaymentMethod?: string | null;
  notes?: string | null;
};

type SettingsLike = {
  companyName: string;
  companyAddress: string;
  companyIco?: string | null;
  companyDic?: string | null;
  companyIcdph?: string | null;
  companyEmail: string;
  companyPhone: string;
  companyWebsite?: string | null;
  companyIban?: string | null;
  companySwiftBic?: string | null;
  companyRegistrationNote?: string | null;
  companySignatureUrl?: string | null;
};

export type SupplierSnapshot = {
  companyName: string;
  companyAddress: string;
  companyIco: string | null;
  companyDic: string | null;
  companyIcdph: string | null;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string | null;
  companyIban: string | null;
  companySwiftBic: string | null;
  companyRegistrationNote: string | null;
  companySignatureUrl: string | null;
};

export type ClientSnapshot = {
  type: "company" | "sole_trader" | "person";
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  billingStreet: string;
  billingCity: string;
  billingZip: string;
  billingCountry: string;
  ico: string | null;
  dic: string | null;
  icDph: string | null;
  vatPayer: boolean;
  taxRegimeDefault: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  defaultCurrency: string | null;
  defaultDueDays: number | null;
  defaultPaymentMethod: string | null;
  notes: string | null;
  displayName: string;
};

function clean(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function requireFallback(value: string | null, fallback: string): string {
  return value ?? fallback;
}

export function buildSupplierSnapshot(settings: SettingsLike): SupplierSnapshot {
  return {
    companyName: settings.companyName,
    companyAddress: settings.companyAddress,
    companyIco: clean(settings.companyIco),
    companyDic: clean(settings.companyDic),
    companyIcdph: clean(settings.companyIcdph),
    companyEmail: settings.companyEmail,
    companyPhone: settings.companyPhone,
    companyWebsite: clean(settings.companyWebsite),
    companyIban: clean(settings.companyIban),
    companySwiftBic: clean(settings.companySwiftBic),
    companyRegistrationNote: clean(settings.companyRegistrationNote),
    companySignatureUrl: clean(settings.companySignatureUrl),
  };
}

export function buildClientSnapshot(client: ClientLike): ClientSnapshot {
  const companyName = clean(client.companyName) ?? (client.type === "company" ? clean(client.name) : null);
  const firstName = clean(client.firstName) ?? (client.type === "person" ? clean(client.name) : null);
  const lastName = clean(client.lastName);
  const billingStreet = requireFallback(clean(client.billingStreet), client.billingAddressLine1);
  const billingCity = requireFallback(clean(client.billingCity), client.city);
  const billingZip = requireFallback(clean(client.billingZip), client.zip);
  const billingCountry = requireFallback(clean(client.billingCountry), client.country);

  const displayName =
    companyName ??
    ([firstName, lastName].filter(Boolean).join(" ").trim() ||
      client.name);

  return {
    type: client.type,
    companyName,
    firstName,
    lastName,
    billingStreet,
    billingCity,
    billingZip,
    billingCountry,
    ico: clean(client.ico),
    dic: clean(client.dic),
    icDph: clean(client.icDph) ?? clean(client.icdph),
    vatPayer: Boolean(client.vatPayer),
    taxRegimeDefault: clean(client.taxRegimeDefault),
    contactName: client.contactName,
    contactEmail: client.contactEmail,
    contactPhone: clean(client.contactPhone),
    defaultCurrency: clean(client.defaultCurrency),
    defaultDueDays: client.defaultDueDays ?? null,
    defaultPaymentMethod: clean(client.defaultPaymentMethod),
    notes: clean(client.notes),
    displayName,
  };
}

export function hasClientBillingIdentity(clientSnapshot: ClientSnapshot): boolean {
  return Boolean(clientSnapshot.companyName || clientSnapshot.firstName || clientSnapshot.lastName);
}

/** True if client has enough billing identity to create a valid invoice (name + address). */
export function canCreateInvoiceForClient(client: ClientLike): boolean {
  return hasClientBillingIdentity(buildClientSnapshot(client));
}
