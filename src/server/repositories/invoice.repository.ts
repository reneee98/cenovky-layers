import type { InvoiceStatus } from "@/types/domain";
import type { PoolClient } from "pg";

import {
  createEntityId,
  createNotFoundError,
  dbQuery,
  dbQueryOne,
  dbTransaction,
  numericToNumber,
  toDate,
} from "@/lib/db";

export type ListInvoicesFilters = {
  status?: InvoiceStatus;
  search?: string;
  clientId?: string;
  quoteId?: string;
  year?: number;
  currency?: string;
  /** When true only invoices with a linked quote; when false only without quote; when undefined no filter */
  linkedToQuote?: boolean;
};

function startOfYearUtc(year: number): Date {
  return new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
}

function endOfYearUtc(year: number): Date {
  return new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));
}

type InvoiceRow = {
  id: string;
  userId: string;
  quoteId: string | null;
  clientId: string;
  invoiceNumber: string;
  variableSymbol: string | null;
  issueDate: Date | string;
  taxableSupplyDate: Date | string;
  dueDate: Date | string;
  paymentMethod: string;
  currency: string;
  vatEnabled: boolean;
  vatRate: number | string;
  taxRegime: string | null;
  invoiceKind: "full" | "partial" | "advance";
  supplierSnapshotJson: unknown;
  clientSnapshotJson: unknown;
  subtotal: number | string;
  discountTotal: number | string;
  taxBaseTotal: number | string;
  vatTotal: number | string;
  total: number | string;
  amountPaid: number | string;
  amountDue: number | string;
  status: InvoiceStatus;
  legalNote: string | null;
  note: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type InvoiceItemRow = {
  id: string;
  userId: string;
  invoiceId: string;
  name: string;
  description: string | null;
  unit: "h" | "day" | "pcs" | "pkg";
  qty: number | string;
  unitPrice: number | string;
  discountPct: number | string;
  vatRate: number | string;
  lineSubtotal: number | string;
  lineVat: number | string;
  lineTotal: number | string;
  sortOrder: number;
};

type PaymentRow = {
  id: string;
  userId: string;
  invoiceId: string;
  paymentDate: Date | string;
  amount: number | string;
  method: string;
  note: string | null;
  createdAt: Date | string;
};

function mapInvoiceRow(row: InvoiceRow) {
  return {
    ...row,
    issueDate: toDate(row.issueDate),
    taxableSupplyDate: toDate(row.taxableSupplyDate),
    dueDate: toDate(row.dueDate),
    vatRate: numericToNumber(row.vatRate),
    subtotal: numericToNumber(row.subtotal),
    discountTotal: numericToNumber(row.discountTotal),
    taxBaseTotal: numericToNumber(row.taxBaseTotal),
    vatTotal: numericToNumber(row.vatTotal),
    total: numericToNumber(row.total),
    amountPaid: numericToNumber(row.amountPaid),
    amountDue: numericToNumber(row.amountDue),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

function mapInvoiceItemRow(row: InvoiceItemRow) {
  return {
    ...row,
    qty: numericToNumber(row.qty),
    unitPrice: numericToNumber(row.unitPrice),
    discountPct: numericToNumber(row.discountPct),
    vatRate: numericToNumber(row.vatRate),
    lineSubtotal: numericToNumber(row.lineSubtotal),
    lineVat: numericToNumber(row.lineVat),
    lineTotal: numericToNumber(row.lineTotal),
  };
}

function mapPaymentRow(row: PaymentRow) {
  return {
    ...row,
    paymentDate: toDate(row.paymentDate),
    amount: numericToNumber(row.amount),
    createdAt: toDate(row.createdAt),
  };
}

function buildInvoiceWhere(userId: string, filters: ListInvoicesFilters) {
  const params: unknown[] = [userId];
  const where: string[] = ["i.user_id = $1"];

  if (filters.status) {
    params.push(filters.status);
    where.push(`i.status = $${params.length}`);
  }

  if (filters.clientId) {
    params.push(filters.clientId);
    where.push(`i.client_id = $${params.length}`);
  }

  if (filters.quoteId) {
    params.push(filters.quoteId);
    where.push(`i.quote_id = $${params.length}`);
  }

  if (Number.isInteger(filters.year)) {
    params.push(startOfYearUtc(filters.year as number), endOfYearUtc(filters.year as number));
    where.push(`i.issue_date >= $${params.length - 1} AND i.issue_date < $${params.length}`);
  }

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;
    params.push(search);
    const idx = params.length;
    where.push(`(
      i.invoice_number ILIKE $${idx}
      OR i.variable_symbol ILIKE $${idx}
      OR i.note ILIKE $${idx}
      OR c.name ILIKE $${idx}
    )`);
  }

  if (filters.currency?.trim()) {
    params.push(filters.currency.trim());
    where.push(`i.currency = $${params.length}`);
  }

  if (filters.linkedToQuote === true) {
    where.push("i.quote_id IS NOT NULL");
  } else if (filters.linkedToQuote === false) {
    where.push("i.quote_id IS NULL");
  }

  return { where, params };
}

export async function listInvoices(userId: string, filters: ListInvoicesFilters = {}) {
  const { where, params } = buildInvoiceWhere(userId, filters);

  const rows = await dbQuery<InvoiceRow & {
    clientName: string;
    clientCompanyName: string | null;
    clientFirstName: string | null;
    clientLastName: string | null;
    quoteNumber: string | null;
    quoteTitle: string | null;
  }>(
    `SELECT
      i.id,
      i.user_id AS "userId",
      i.quote_id AS "quoteId",
      i.client_id AS "clientId",
      i.invoice_number AS "invoiceNumber",
      i.variable_symbol AS "variableSymbol",
      i.issue_date AS "issueDate",
      i.taxable_supply_date AS "taxableSupplyDate",
      i.due_date AS "dueDate",
      i.payment_method AS "paymentMethod",
      i.currency,
      i.vat_enabled AS "vatEnabled",
      i.vat_rate AS "vatRate",
      i.tax_regime AS "taxRegime",
      i.invoice_kind AS "invoiceKind",
      i.supplier_snapshot_json AS "supplierSnapshotJson",
      i.client_snapshot_json AS "clientSnapshotJson",
      i.subtotal,
      i.discount_total AS "discountTotal",
      i.tax_base_total AS "taxBaseTotal",
      i.vat_total AS "vatTotal",
      i.total,
      i.amount_paid AS "amountPaid",
      i.amount_due AS "amountDue",
      i.status,
      i.legal_note AS "legalNote",
      i.note,
      i.created_at AS "createdAt",
      i.updated_at AS "updatedAt",
      c.name AS "clientName",
      c.company_name AS "clientCompanyName",
      c.first_name AS "clientFirstName",
      c.last_name AS "clientLastName",
      q.number AS "quoteNumber",
      q.title AS "quoteTitle"
    FROM invoices i
    JOIN clients c ON c.id = i.client_id AND c.user_id = i.user_id
    LEFT JOIN quotes q ON q.id = i.quote_id AND q.user_id = i.user_id
    WHERE ${where.join(" AND ")}
    ORDER BY i.issue_date DESC, i.created_at DESC`,
    params,
  );

  return rows.map((row) => {
    const mapped = mapInvoiceRow(row);

    return {
      ...mapped,
      client: {
        id: mapped.clientId,
        name: row.clientName,
        companyName: row.clientCompanyName,
        firstName: row.clientFirstName,
        lastName: row.clientLastName,
      },
      quote: mapped.quoteId
        ? {
            id: mapped.quoteId,
            number: row.quoteNumber ?? "",
            title: row.quoteTitle ?? "",
          }
        : null,
    };
  });
}

export async function getInvoiceById(
  userId: string,
  id: string,
  client?: PoolClient,
) {
  const row = await dbQueryOne<InvoiceRow>(
    `SELECT
      id,
      user_id AS "userId",
      quote_id AS "quoteId",
      client_id AS "clientId",
      invoice_number AS "invoiceNumber",
      variable_symbol AS "variableSymbol",
      issue_date AS "issueDate",
      taxable_supply_date AS "taxableSupplyDate",
      due_date AS "dueDate",
      payment_method AS "paymentMethod",
      currency,
      vat_enabled AS "vatEnabled",
      vat_rate AS "vatRate",
      tax_regime AS "taxRegime",
      invoice_kind AS "invoiceKind",
      supplier_snapshot_json AS "supplierSnapshotJson",
      client_snapshot_json AS "clientSnapshotJson",
      subtotal,
      discount_total AS "discountTotal",
      tax_base_total AS "taxBaseTotal",
      vat_total AS "vatTotal",
      total,
      amount_paid AS "amountPaid",
      amount_due AS "amountDue",
      status,
      legal_note AS "legalNote",
      note,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM invoices
    WHERE id = $1 AND user_id = $2
    LIMIT 1`,
    [id, userId],
    client,
  );

  return row ? mapInvoiceRow(row) : null;
}

export async function getInvoiceWithRelations(
  userId: string,
  id: string,
  txClient?: PoolClient,
) {
  const invoice = await getInvoiceById(userId, id, txClient);
  if (!invoice) {
    return null;
  }

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

  const clientRow = await dbQueryOne<ClientRow>(
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
    [invoice.clientId, userId],
    txClient,
  ).catch(async () => {
    const minimal = await dbQueryOne<{
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
      createdAt: Date | string;
      updatedAt: Date | string;
    }>(
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
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM clients
      WHERE id = $1 AND user_id = $2
      LIMIT 1`,
      [invoice.clientId, userId],
      txClient,
    );
    if (!minimal) return null;
    return {
      ...minimal,
      companyName: null,
      firstName: null,
      lastName: null,
      billingStreet: minimal.billingAddressLine1,
      billingCity: minimal.city,
      billingZip: minimal.zip,
      billingCountry: minimal.country,
      icDph: minimal.icdph,
      vatPayer: false,
      taxRegimeDefault: null,
      defaultCurrency: null,
      defaultDueDays: null,
      defaultPaymentMethod: null,
      notes: null,
    } as ClientRow;
  });

  const client = clientRow ?? null;

  type QuoteRow = {
    id: string;
    number: string;
    title: string;
    currency: string;
    vatEnabled: boolean;
    vatRate: number | string;
    totalDiscountType: "none" | "pct" | "amount";
    totalDiscountValue: number | string;
  };

  const quoteRow = invoice.quoteId
    ? await dbQueryOne<QuoteRow>(
        `SELECT
          q.id,
          q.number,
          q.title,
          q.currency,
          q.vat_enabled AS "vatEnabled",
          q.vat_rate AS "vatRate",
          q.total_discount_type AS "totalDiscountType",
          q.total_discount_value AS "totalDiscountValue"
        FROM quotes q
        WHERE q.id = $1 AND q.user_id = $2
        LIMIT 1`,
        [invoice.quoteId, userId],
        txClient,
      ).catch(async () => {
        const minimalQuote = await dbQueryOne<{ id: string; number: string; title: string }>(
          `SELECT id, number, title FROM quotes WHERE id = $1 AND user_id = $2 LIMIT 1`,
          [invoice.quoteId, userId],
          txClient,
        );
        if (!minimalQuote) return null;
        return {
          ...minimalQuote,
          currency: "EUR",
          vatEnabled: true,
          vatRate: 21,
          totalDiscountType: "none" as const,
          totalDiscountValue: 0,
        } as QuoteRow;
      })
    : null;

  const quote = quoteRow ?? (invoice.quoteId ? null : null);

  const [items, payments] = await Promise.all([
    dbQuery<InvoiceItemRow>(
      `SELECT
        id,
        user_id AS "userId",
        invoice_id AS "invoiceId",
        name,
        description,
        unit,
        qty,
        unit_price AS "unitPrice",
        discount_pct AS "discountPct",
        vat_rate AS "vatRate",
        line_subtotal AS "lineSubtotal",
        line_vat AS "lineVat",
        line_total AS "lineTotal",
        sort_order AS "sortOrder"
      FROM invoice_items
      WHERE invoice_id = $1 AND user_id = $2
      ORDER BY sort_order ASC`,
      [invoice.id, userId],
      txClient,
    ),
    dbQuery<PaymentRow>(
      `SELECT
        id,
        user_id AS "userId",
        invoice_id AS "invoiceId",
        payment_date AS "paymentDate",
        amount,
        method,
        note,
        created_at AS "createdAt"
      FROM payments
      WHERE invoice_id = $1 AND user_id = $2
      ORDER BY payment_date DESC, created_at DESC`,
      [invoice.id, userId],
      txClient,
    ),
  ]);

  const quoteItems = quote
    ? await dbQuery<{ qty: number | string; unitPrice: number | string; discountPct: number | string }>(
        `SELECT qty, unit_price AS "unitPrice", discount_pct AS "discountPct"
         FROM quote_items
         WHERE quote_id = $1 AND user_id = $2`,
        [quote.id, userId],
        txClient,
      )
    : [];

  return {
    ...invoice,
    client,
    quote: quote
      ? {
          ...quote,
          vatRate: numericToNumber((quote as { vatRate: unknown }).vatRate),
          totalDiscountValue: numericToNumber((quote as { totalDiscountValue: unknown }).totalDiscountValue),
          items: quoteItems.map((item) => ({
            qty: numericToNumber(item.qty),
            unitPrice: numericToNumber(item.unitPrice),
            discountPct: numericToNumber(item.discountPct),
          })),
        }
      : null,
    items: items.map(mapInvoiceItemRow),
    payments: payments.map(mapPaymentRow),
  };
}

export async function createInvoice(
  userId: string,
  data: Record<string, unknown>,
) {
  const row = await dbQueryOne<InvoiceRow>(
    `INSERT INTO invoices (
      id,
      user_id,
      quote_id,
      client_id,
      invoice_number,
      variable_symbol,
      issue_date,
      taxable_supply_date,
      due_date,
      payment_method,
      currency,
      vat_enabled,
      vat_rate,
      tax_regime,
      invoice_kind,
      supplier_snapshot_json,
      client_snapshot_json,
      subtotal,
      discount_total,
      tax_base_total,
      vat_total,
      total,
      amount_paid,
      amount_due,
      status,
      legal_note,
      note
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
    )
    RETURNING
      id,
      user_id AS "userId",
      quote_id AS "quoteId",
      client_id AS "clientId",
      invoice_number AS "invoiceNumber",
      variable_symbol AS "variableSymbol",
      issue_date AS "issueDate",
      taxable_supply_date AS "taxableSupplyDate",
      due_date AS "dueDate",
      payment_method AS "paymentMethod",
      currency,
      vat_enabled AS "vatEnabled",
      vat_rate AS "vatRate",
      tax_regime AS "taxRegime",
      invoice_kind AS "invoiceKind",
      supplier_snapshot_json AS "supplierSnapshotJson",
      client_snapshot_json AS "clientSnapshotJson",
      subtotal,
      discount_total AS "discountTotal",
      tax_base_total AS "taxBaseTotal",
      vat_total AS "vatTotal",
      total,
      amount_paid AS "amountPaid",
      amount_due AS "amountDue",
      status,
      legal_note AS "legalNote",
      note,
      created_at AS "createdAt",
      updated_at AS "updatedAt"`,
    [
      createEntityId("inv"),
      userId,
      data.quoteId ?? null,
      data.clientId,
      data.invoiceNumber,
      data.variableSymbol ?? null,
      data.issueDate,
      data.taxableSupplyDate,
      data.dueDate,
      data.paymentMethod,
      data.currency,
      data.vatEnabled,
      data.vatRate,
      data.taxRegime ?? null,
      data.invoiceKind,
      JSON.stringify(data.supplierSnapshotJson),
      JSON.stringify(data.clientSnapshotJson),
      data.subtotal,
      data.discountTotal,
      data.taxBaseTotal,
      data.vatTotal,
      data.total,
      data.amountPaid,
      data.amountDue,
      data.status,
      data.legalNote ?? null,
      data.note ?? null,
    ],
  );

  if (!row) {
    throw new Error("INVOICE_CREATE_FAILED");
  }

  return mapInvoiceRow(row);
}

export async function updateInvoice(
  userId: string,
  id: string,
  data: Record<string, unknown>,
) {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown, cast?: string) => {
    values.push(value);
    const marker = `$${values.length}${cast ? `::${cast}` : ""}`;
    assignments.push(`${column} = ${marker}`);
  };

  if ("quoteId" in data) assign("quote_id", data.quoteId ?? null);
  if ("clientId" in data) assign("client_id", data.clientId);
  if ("invoiceNumber" in data) assign("invoice_number", data.invoiceNumber);
  if ("variableSymbol" in data) assign("variable_symbol", data.variableSymbol ?? null);
  if ("issueDate" in data) assign("issue_date", data.issueDate);
  if ("taxableSupplyDate" in data) assign("taxable_supply_date", data.taxableSupplyDate);
  if ("dueDate" in data) assign("due_date", data.dueDate);
  if ("paymentMethod" in data) assign("payment_method", data.paymentMethod);
  if ("currency" in data) assign("currency", data.currency);
  if ("vatEnabled" in data) assign("vat_enabled", data.vatEnabled);
  if ("vatRate" in data) assign("vat_rate", data.vatRate);
  if ("taxRegime" in data) assign("tax_regime", data.taxRegime ?? null);
  if ("invoiceKind" in data) assign("invoice_kind", data.invoiceKind);
  if ("supplierSnapshotJson" in data) assign("supplier_snapshot_json", JSON.stringify(data.supplierSnapshotJson), "jsonb");
  if ("clientSnapshotJson" in data) assign("client_snapshot_json", JSON.stringify(data.clientSnapshotJson), "jsonb");
  if ("subtotal" in data) assign("subtotal", data.subtotal);
  if ("discountTotal" in data) assign("discount_total", data.discountTotal);
  if ("taxBaseTotal" in data) assign("tax_base_total", data.taxBaseTotal);
  if ("vatTotal" in data) assign("vat_total", data.vatTotal);
  if ("total" in data) assign("total", data.total);
  if ("amountPaid" in data) assign("amount_paid", data.amountPaid);
  if ("amountDue" in data) assign("amount_due", data.amountDue);
  if ("status" in data) assign("status", data.status);
  if ("legalNote" in data) assign("legal_note", data.legalNote ?? null);
  if ("note" in data) assign("note", data.note ?? null);

  if (assignments.length === 0) {
    const existing = await getInvoiceById(userId, id);
    if (!existing) {
      throw createNotFoundError("INVOICE_NOT_FOUND");
    }
    return existing;
  }

  assignments.push("updated_at = NOW()");
  values.push(id, userId);

  const row = await dbQueryOne<InvoiceRow>(
    `UPDATE invoices
      SET ${assignments.join(", ")}
      WHERE id = $${values.length - 1} AND user_id = $${values.length}
      RETURNING
        id,
        user_id AS "userId",
        quote_id AS "quoteId",
        client_id AS "clientId",
        invoice_number AS "invoiceNumber",
        variable_symbol AS "variableSymbol",
        issue_date AS "issueDate",
        taxable_supply_date AS "taxableSupplyDate",
        due_date AS "dueDate",
        payment_method AS "paymentMethod",
        currency,
        vat_enabled AS "vatEnabled",
        vat_rate AS "vatRate",
        tax_regime AS "taxRegime",
        invoice_kind AS "invoiceKind",
        supplier_snapshot_json AS "supplierSnapshotJson",
        client_snapshot_json AS "clientSnapshotJson",
        subtotal,
        discount_total AS "discountTotal",
        tax_base_total AS "taxBaseTotal",
        vat_total AS "vatTotal",
        total,
        amount_paid AS "amountPaid",
        amount_due AS "amountDue",
        status,
        legal_note AS "legalNote",
        note,
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
    values,
  );

  if (!row) {
    throw createNotFoundError("INVOICE_NOT_FOUND");
  }

  return mapInvoiceRow(row);
}

export async function deleteInvoice(userId: string, id: string) {
  const row = await dbQueryOne<{ id: string; quoteId: string | null }>(
    `DELETE FROM invoices
     WHERE id = $1 AND user_id = $2
     RETURNING id, quote_id AS "quoteId"`,
    [id, userId],
  );

  if (!row) {
    throw createNotFoundError("INVOICE_NOT_FOUND");
  }

  return row;
}

export async function replaceInvoiceItems(
  userId: string,
  invoiceId: string,
  items: Array<{
    name: string;
    description?: string | null;
    unit: "h" | "day" | "pcs" | "pkg";
    qty: number;
    unitPrice: number;
    discountPct: number;
    vatRate: number;
    lineSubtotal: number;
    lineVat: number;
    lineTotal: number;
    sortOrder: number;
  }>,
) {
  return dbTransaction(async (tx) => {
    await dbQuery(`DELETE FROM invoice_items WHERE user_id = $1 AND invoice_id = $2`, [userId, invoiceId], tx);

    for (const [index, item] of items.entries()) {
      await dbQuery(
        `INSERT INTO invoice_items (
          id,
          user_id,
          invoice_id,
          name,
          description,
          unit,
          qty,
          unit_price,
          discount_pct,
          vat_rate,
          line_subtotal,
          line_vat,
          line_total,
          sort_order
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          createEntityId("iit"),
          userId,
          invoiceId,
          item.name,
          item.description ?? null,
          item.unit,
          item.qty,
          item.unitPrice,
          item.discountPct,
          item.vatRate,
          item.lineSubtotal,
          item.lineVat,
          item.lineTotal,
          item.sortOrder ?? index,
        ],
        tx,
      );
    }

    const rows = await dbQuery<InvoiceItemRow>(
      `SELECT
        id,
        user_id AS "userId",
        invoice_id AS "invoiceId",
        name,
        description,
        unit,
        qty,
        unit_price AS "unitPrice",
        discount_pct AS "discountPct",
        vat_rate AS "vatRate",
        line_subtotal AS "lineSubtotal",
        line_vat AS "lineVat",
        line_total AS "lineTotal",
        sort_order AS "sortOrder"
      FROM invoice_items
      WHERE user_id = $1 AND invoice_id = $2
      ORDER BY sort_order ASC`,
      [userId, invoiceId],
      tx,
    );

    return rows.map(mapInvoiceItemRow);
  });
}

export async function listInvoiceYears(userId: string): Promise<number[]> {
  const rows = await dbQuery<{ issueDate: Date | string }>(
    `SELECT issue_date AS "issueDate"
     FROM invoices
     WHERE user_id = $1
     ORDER BY issue_date DESC`,
    [userId],
  );

  const years = new Set<number>();
  for (const row of rows) {
    years.add(toDate(row.issueDate).getUTCFullYear());
  }

  if (years.size === 0) {
    years.add(new Date().getUTCFullYear());
  }

  return Array.from(years).sort((left, right) => right - left);
}

export async function listInvoiceCurrencies(userId: string): Promise<string[]> {
  const rows = await dbQuery<{ currency: string }>(
    `SELECT DISTINCT currency
     FROM invoices
     WHERE user_id = $1
     ORDER BY currency ASC`,
    [userId],
  );
  return rows.map((row) => row.currency);
}

export type InvoiceYearSummary = {
  invoicedThisYear: number;
  paidThisYear: number;
  unpaidThisYear: number;
  overdueAmount: number;
  overdueCount: number;
};

export async function getInvoiceYearSummary(
  userId: string,
  year: number,
): Promise<InvoiceYearSummary> {
  const [invoiceAgg, paymentAgg, overdue] = await Promise.all([
    dbQueryOne<{ total: number | string | null; amountDue: number | string | null }>(
      `SELECT
        COALESCE(SUM(total), 0) AS total,
        COALESCE(SUM(amount_due), 0) AS "amountDue"
       FROM invoices
       WHERE user_id = $1
         AND issue_date >= $2
         AND issue_date < $3
         AND status <> 'cancelled'`,
      [userId, startOfYearUtc(year), endOfYearUtc(year)],
    ),
    dbQueryOne<{ amount: number | string | null }>(
      `SELECT COALESCE(SUM(amount), 0) AS amount
       FROM payments
       WHERE user_id = $1
         AND payment_date >= $2
         AND payment_date < $3`,
      [userId, startOfYearUtc(year), endOfYearUtc(year)],
    ),
    dbQueryOne<{ amountDue: number | string | null; count: string }>(
      `SELECT
        COALESCE(SUM(amount_due), 0) AS "amountDue",
        COUNT(id)::text AS count
       FROM invoices
       WHERE user_id = $1
         AND issue_date >= $2
         AND issue_date < $3
         AND status = 'overdue'`,
      [userId, startOfYearUtc(year), endOfYearUtc(year)],
    ),
  ]);

  return {
    invoicedThisYear: numericToNumber(invoiceAgg?.total ?? 0),
    paidThisYear: numericToNumber(paymentAgg?.amount ?? 0),
    unpaidThisYear: numericToNumber(invoiceAgg?.amountDue ?? 0),
    overdueAmount: numericToNumber(overdue?.amountDue ?? 0),
    overdueCount: Number(overdue?.count ?? "0"),
  };
}
