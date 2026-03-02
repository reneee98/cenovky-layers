import { createEntityId, createNotFoundError, dbQuery, dbQueryOne, toDate } from "@/lib/db";

export type ListClientsFilters = {
  search?: string;
};

type ClientRow = {
  id: string;
  userId: string;
  type: "company" | "sole_trader" | "person";
  name: string;
  billingAddressLine1: string;
  billingAddressLine2: string | null;
  city: string;
  zip: string;
  country: string;
  ico: string | null;
  dic: string | null;
  icdph: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  billingStreet: string | null;
  billingCity: string | null;
  billingZip: string | null;
  billingCountry: string | null;
  icDph: string | null;
  vatPayer: boolean;
  taxRegimeDefault: string | null;
  defaultCurrency: string | null;
  defaultDueDays: number | null;
  defaultPaymentMethod: string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function mapClientRow(row: ClientRow) {
  return {
    ...row,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

export async function listClients(
  userId: string,
  filters: ListClientsFilters = {},
) {
  const params: unknown[] = [userId];
  const where: string[] = ["user_id = $1"];

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;
    params.push(search);
    const index = params.length;
    where.push(`(name ILIKE $${index} OR company_name ILIKE $${index} OR first_name ILIKE $${index} OR last_name ILIKE $${index})`);
  }

  const rows = await dbQuery<ClientRow>(
    `SELECT
      id,
      user_id AS "userId",
      type,
      name,
      billing_address_line1 AS "billingAddressLine1",
      billing_address_line2 AS "billingAddressLine2",
      city,
      zip,
      country,
      ico,
      dic,
      icdph,
      contact_name AS "contactName",
      contact_email AS "contactEmail",
      contact_phone AS "contactPhone",
      company_name AS "companyName",
      first_name AS "firstName",
      last_name AS "lastName",
      billing_street AS "billingStreet",
      billing_city AS "billingCity",
      billing_zip AS "billingZip",
      billing_country AS "billingCountry",
      ic_dph AS "icDph",
      vat_payer AS "vatPayer",
      tax_regime_default AS "taxRegimeDefault",
      default_currency AS "defaultCurrency",
      default_due_days AS "defaultDueDays",
      default_payment_method AS "defaultPaymentMethod",
      notes,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM clients
    WHERE ${where.join(" AND ")}
    ORDER BY name ASC`,
    params,
  );

  return rows.map(mapClientRow);
}

export async function getClientById(userId: string, id: string) {
  const row = await dbQueryOne<ClientRow>(
    `SELECT
      id,
      user_id AS "userId",
      type,
      name,
      billing_address_line1 AS "billingAddressLine1",
      billing_address_line2 AS "billingAddressLine2",
      city,
      zip,
      country,
      ico,
      dic,
      icdph,
      contact_name AS "contactName",
      contact_email AS "contactEmail",
      contact_phone AS "contactPhone",
      company_name AS "companyName",
      first_name AS "firstName",
      last_name AS "lastName",
      billing_street AS "billingStreet",
      billing_city AS "billingCity",
      billing_zip AS "billingZip",
      billing_country AS "billingCountry",
      ic_dph AS "icDph",
      vat_payer AS "vatPayer",
      tax_regime_default AS "taxRegimeDefault",
      default_currency AS "defaultCurrency",
      default_due_days AS "defaultDueDays",
      default_payment_method AS "defaultPaymentMethod",
      notes,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM clients
    WHERE id = $1 AND user_id = $2
    LIMIT 1`,
    [id, userId],
  );

  return row ? mapClientRow(row) : null;
}

function buildClientParams(data: Record<string, unknown>) {
  return {
    type: data.type,
    name: data.name,
    billingAddressLine1: data.billingAddressLine1,
    billingAddressLine2: data.billingAddressLine2 ?? null,
    city: data.city,
    zip: data.zip,
    country: data.country,
    ico: data.ico ?? null,
    dic: data.dic ?? null,
    icdph: data.icdph ?? null,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone ?? null,
    companyName: data.companyName ?? null,
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
    billingStreet: data.billingStreet ?? null,
    billingCity: data.billingCity ?? null,
    billingZip: data.billingZip ?? null,
    billingCountry: data.billingCountry ?? null,
    icDph: data.icDph ?? null,
    vatPayer: Boolean(data.vatPayer),
    taxRegimeDefault: data.taxRegimeDefault ?? null,
    defaultCurrency: data.defaultCurrency ?? null,
    defaultDueDays: data.defaultDueDays ?? null,
    defaultPaymentMethod: data.defaultPaymentMethod ?? null,
    notes: data.notes ?? null,
  };
}

export async function createClient(
  userId: string,
  data: Record<string, unknown>,
) {
  const input = buildClientParams(data);

  const row = await dbQueryOne<ClientRow>(
    `INSERT INTO clients (
      id,
      user_id,
      type,
      name,
      billing_address_line1,
      billing_address_line2,
      city,
      zip,
      country,
      ico,
      dic,
      icdph,
      contact_name,
      contact_email,
      contact_phone,
      company_name,
      first_name,
      last_name,
      billing_street,
      billing_city,
      billing_zip,
      billing_country,
      ic_dph,
      vat_payer,
      tax_regime_default,
      default_currency,
      default_due_days,
      default_payment_method,
      notes
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29
    )
    RETURNING
      id,
      user_id AS "userId",
      type,
      name,
      billing_address_line1 AS "billingAddressLine1",
      billing_address_line2 AS "billingAddressLine2",
      city,
      zip,
      country,
      ico,
      dic,
      icdph,
      contact_name AS "contactName",
      contact_email AS "contactEmail",
      contact_phone AS "contactPhone",
      company_name AS "companyName",
      first_name AS "firstName",
      last_name AS "lastName",
      billing_street AS "billingStreet",
      billing_city AS "billingCity",
      billing_zip AS "billingZip",
      billing_country AS "billingCountry",
      ic_dph AS "icDph",
      vat_payer AS "vatPayer",
      tax_regime_default AS "taxRegimeDefault",
      default_currency AS "defaultCurrency",
      default_due_days AS "defaultDueDays",
      default_payment_method AS "defaultPaymentMethod",
      notes,
      created_at AS "createdAt",
      updated_at AS "updatedAt"`,
    [
      createEntityId("cli"),
      userId,
      input.type,
      input.name,
      input.billingAddressLine1,
      input.billingAddressLine2,
      input.city,
      input.zip,
      input.country,
      input.ico,
      input.dic,
      input.icdph,
      input.contactName,
      input.contactEmail,
      input.contactPhone,
      input.companyName,
      input.firstName,
      input.lastName,
      input.billingStreet,
      input.billingCity,
      input.billingZip,
      input.billingCountry,
      input.icDph,
      input.vatPayer,
      input.taxRegimeDefault,
      input.defaultCurrency,
      input.defaultDueDays,
      input.defaultPaymentMethod,
      input.notes,
    ],
  );

  if (!row) {
    throw new Error("CLIENT_CREATE_FAILED");
  }

  return mapClientRow(row);
}

export async function updateClient(
  userId: string,
  id: string,
  data: Record<string, unknown>,
) {
  const input = buildClientParams(data);

  const row = await dbQueryOne<ClientRow>(
    `UPDATE clients
      SET
        type = $1,
        name = $2,
        billing_address_line1 = $3,
        billing_address_line2 = $4,
        city = $5,
        zip = $6,
        country = $7,
        ico = $8,
        dic = $9,
        icdph = $10,
        contact_name = $11,
        contact_email = $12,
        contact_phone = $13,
        company_name = $14,
        first_name = $15,
        last_name = $16,
        billing_street = $17,
        billing_city = $18,
        billing_zip = $19,
        billing_country = $20,
        ic_dph = $21,
        vat_payer = $22,
        tax_regime_default = $23,
        default_currency = $24,
        default_due_days = $25,
        default_payment_method = $26,
        notes = $27,
        updated_at = NOW()
      WHERE id = $28 AND user_id = $29
      RETURNING
        id,
        user_id AS "userId",
        type,
        name,
        billing_address_line1 AS "billingAddressLine1",
        billing_address_line2 AS "billingAddressLine2",
        city,
        zip,
        country,
        ico,
        dic,
        icdph,
        contact_name AS "contactName",
        contact_email AS "contactEmail",
        contact_phone AS "contactPhone",
        company_name AS "companyName",
        first_name AS "firstName",
        last_name AS "lastName",
        billing_street AS "billingStreet",
        billing_city AS "billingCity",
        billing_zip AS "billingZip",
        billing_country AS "billingCountry",
        ic_dph AS "icDph",
        vat_payer AS "vatPayer",
        tax_regime_default AS "taxRegimeDefault",
        default_currency AS "defaultCurrency",
        default_due_days AS "defaultDueDays",
        default_payment_method AS "defaultPaymentMethod",
        notes,
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
    [
      input.type,
      input.name,
      input.billingAddressLine1,
      input.billingAddressLine2,
      input.city,
      input.zip,
      input.country,
      input.ico,
      input.dic,
      input.icdph,
      input.contactName,
      input.contactEmail,
      input.contactPhone,
      input.companyName,
      input.firstName,
      input.lastName,
      input.billingStreet,
      input.billingCity,
      input.billingZip,
      input.billingCountry,
      input.icDph,
      input.vatPayer,
      input.taxRegimeDefault,
      input.defaultCurrency,
      input.defaultDueDays,
      input.defaultPaymentMethod,
      input.notes,
      id,
      userId,
    ],
  );

  if (!row) {
    throw createNotFoundError("CLIENT_NOT_FOUND");
  }

  return mapClientRow(row);
}

export async function deleteClient(userId: string, id: string) {
  const row = await dbQueryOne<{ id: string }>(
    `DELETE FROM clients WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId],
  );

  if (!row) {
    throw createNotFoundError("CLIENT_NOT_FOUND");
  }

  return row;
}
