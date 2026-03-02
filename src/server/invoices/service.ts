import type { PoolClient } from "pg";

import type { InvoiceKind, InvoiceStatus, Unit } from "@/types/domain";

import {
  createEntityId,
  createNotFoundError,
  dbQuery,
  dbQueryOne,
  dbTransaction,
  numericToNumber,
  toDate,
} from "@/lib/db";
import { resolveInvoiceStatus } from "@/lib/invoices/status";
import { calculateInvoiceLineTotals, calculateInvoiceTotals } from "@/server/invoices/totals";
import {
  buildClientSnapshot,
  buildSupplierSnapshot,
  hasClientBillingIdentity,
} from "@/server/invoices/snapshots";
import { syncQuoteInvoicingState } from "@/server/invoices/quote-metrics";

const VALID_UNITS: Unit[] = ["h", "day", "pcs", "pkg"];
const VALID_KINDS: InvoiceKind[] = ["full", "partial", "advance"];

export type InvoiceItemInput = {
  name: string;
  description?: string | null;
  unit: Unit;
  qty: number;
  unitPrice: number;
  discountPct: number;
  vatRate: number;
};

export type UpsertInvoiceInput = {
  quoteId: string | null;
  clientId: string;
  invoiceNumber: string;
  variableSymbol?: string | null;
  issueDate: Date;
  taxableSupplyDate: Date;
  dueDate: Date;
  paymentMethod: string;
  currency: string;
  vatEnabled: boolean;
  vatRate: number;
  taxRegime?: string | null;
  invoiceKind: InvoiceKind;
  legalNote?: string | null;
  note?: string | null;
  items: InvoiceItemInput[];
  requestedStatus?: InvoiceStatus;
};

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeDate(value: Date): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error("INVALID_DATE");
  }

  return value;
}

function normalizeItem(item: InvoiceItemInput): InvoiceItemInput | null {
  const name = normalizeString(item.name);
  if (!name || !VALID_UNITS.includes(item.unit)) {
    return null;
  }

  const qty = Number.isFinite(item.qty) ? Math.max(0, item.qty) : 0;
  const unitPrice = Number.isFinite(item.unitPrice) ? Math.max(0, item.unitPrice) : 0;
  const discountPct = Number.isFinite(item.discountPct) ? Math.max(0, item.discountPct) : 0;
  const vatRate = Number.isFinite(item.vatRate) ? Math.max(0, item.vatRate) : 0;

  if (qty <= 0) {
    return null;
  }

  return {
    name,
    description: normalizeString(item.description),
    unit: item.unit,
    qty,
    unitPrice,
    discountPct,
    vatRate,
  };
}

type PreparedInvoicePayload = {
  quoteId: string | null;
  clientId: string;
  invoiceNumber: string;
  variableSymbol: string | null;
  issueDate: Date;
  taxableSupplyDate: Date;
  dueDate: Date;
  paymentMethod: string;
  currency: string;
  vatEnabled: boolean;
  vatRate: number;
  taxRegime: string | null;
  invoiceKind: InvoiceKind;
  legalNote: string | null;
  note: string | null;
  items: InvoiceItemInput[];
  requestedStatus: InvoiceStatus;
};

function prepareInvoicePayload(input: UpsertInvoiceInput): PreparedInvoicePayload {
  const invoiceNumber = normalizeString(input.invoiceNumber);
  if (!invoiceNumber) {
    throw new Error("INVOICE_NUMBER_REQUIRED");
  }

  const paymentMethod = normalizeString(input.paymentMethod);
  if (!paymentMethod) {
    throw new Error("PAYMENT_METHOD_REQUIRED");
  }

  const currency = normalizeString(input.currency)?.toUpperCase();
  if (!currency) {
    throw new Error("CURRENCY_REQUIRED");
  }

  const issueDate = normalizeDate(input.issueDate);
  const taxableSupplyDate = normalizeDate(input.taxableSupplyDate);
  const dueDate = normalizeDate(input.dueDate);

  if (dueDate.getTime() < issueDate.getTime()) {
    throw new Error("DUE_DATE_BEFORE_ISSUE_DATE");
  }

  if (!VALID_KINDS.includes(input.invoiceKind)) {
    throw new Error("INVALID_INVOICE_KIND");
  }

  const normalizedItems = input.items
    .map((item) => normalizeItem(item))
    .filter((item): item is InvoiceItemInput => Boolean(item));

  if (normalizedItems.length === 0) {
    throw new Error("INVOICE_ITEMS_REQUIRED");
  }

  const requestedStatus = input.requestedStatus ?? "draft";

  return {
    quoteId: input.quoteId,
    clientId: input.clientId,
    invoiceNumber,
    variableSymbol: normalizeString(input.variableSymbol),
    issueDate,
    taxableSupplyDate,
    dueDate,
    paymentMethod,
    currency,
    vatEnabled: Boolean(input.vatEnabled),
    vatRate: Number.isFinite(input.vatRate) ? Math.max(0, input.vatRate) : 0,
    taxRegime: normalizeString(input.taxRegime),
    invoiceKind: input.invoiceKind,
    legalNote: normalizeString(input.legalNote),
    note: normalizeString(input.note),
    items: normalizedItems,
    requestedStatus,
  };
}

async function resolveLinkedEntities(
  tx: PoolClient,
  userId: string,
  payload: PreparedInvoicePayload,
) {
  const [client, quote, settings] = await Promise.all([
    dbQueryOne<{
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
      [payload.clientId, userId],
      tx,
    ),
    payload.quoteId
      ? dbQueryOne<{
          id: string;
          userId: string;
          currency: string;
          vatEnabled: boolean;
          vatRate: number | string;
          totalDiscountType: "none" | "pct" | "amount";
          totalDiscountValue: number | string;
        }>(
          `SELECT
            id,
            user_id AS "userId",
            currency,
            vat_enabled AS "vatEnabled",
            vat_rate AS "vatRate",
            total_discount_type AS "totalDiscountType",
            total_discount_value AS "totalDiscountValue"
          FROM quotes
          WHERE id = $1 AND user_id = $2
          LIMIT 1`,
          [payload.quoteId, userId],
          tx,
        )
      : Promise.resolve(null),
    dbQueryOne<{
      id: number;
      userId: string;
      companyName: string;
      companyAddress: string;
      companyIco: string | null;
      companyDic: string | null;
      companyIcdph: string | null;
      companyEmail: string;
      companyPhone: string;
      companyWebsite: string | null;
      logoUrl: string | null;
      defaultLanguage: "sk" | "en";
      defaultCurrency: string;
      vatRate: number | string;
      numberingYear: number;
      numberingCounter: number;
    }>(
      `SELECT
        id,
        user_id AS "userId",
        company_name AS "companyName",
        company_address AS "companyAddress",
        company_ico AS "companyIco",
        company_dic AS "companyDic",
        company_icdph AS "companyIcdph",
        company_email AS "companyEmail",
        company_phone AS "companyPhone",
        company_website AS "companyWebsite",
        logo_url AS "logoUrl",
        default_language AS "defaultLanguage",
        default_currency AS "defaultCurrency",
        vat_rate AS "vatRate",
        numbering_year AS "numberingYear",
        numbering_counter AS "numberingCounter"
      FROM settings
      WHERE user_id = $1
      LIMIT 1`,
      [userId],
      tx,
    ),
  ]);

  if (!client) {
    throw new Error("CLIENT_NOT_FOUND");
  }

  if (payload.quoteId && !quote) {
    throw new Error("QUOTE_NOT_FOUND");
  }

  if (!settings) {
    throw new Error("SETTINGS_NOT_FOUND");
  }

  return {
    client,
    quote: quote
      ? {
          ...quote,
          vatRate: numericToNumber((quote as { vatRate: unknown }).vatRate),
          totalDiscountValue: numericToNumber((quote as { totalDiscountValue: unknown }).totalDiscountValue),
        }
      : null,
    settings: {
      ...settings,
      vatRate: numericToNumber((settings as { vatRate: unknown }).vatRate),
    },
  };
}

async function assertQuoteAmountLimit(
  tx: PoolClient,
  userId: string,
  quoteId: string,
  invoiceTotal: number,
  excludeInvoiceId?: string,
) {
  const quote = await dbQueryOne<{
    id: string;
    vatEnabled: boolean;
    vatRate: number | string;
  }>(
    `SELECT
      id,
      vat_enabled AS "vatEnabled",
      vat_rate AS "vatRate"
    FROM quotes
    WHERE id = $1 AND user_id = $2
    LIMIT 1`,
    [quoteId, userId],
    tx,
  );

  if (!quote) {
    throw new Error("QUOTE_NOT_FOUND");
  }

  const [items, aggregate] = await Promise.all([
    dbQuery<{ qty: number | string; unitPrice: number | string; discountPct: number | string }>(
      `SELECT
        qty,
        unit_price AS "unitPrice",
        discount_pct AS "discountPct"
      FROM quote_items
      WHERE quote_id = $1 AND user_id = $2`,
      [quoteId, userId],
      tx,
    ),
    dbQueryOne<{ total: number | string | null }>(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM invoices
       WHERE user_id = $1
         AND quote_id = $2
         AND status <> 'cancelled'
         ${excludeInvoiceId ? "AND id <> $3" : ""}`,
      excludeInvoiceId ? [userId, quoteId, excludeInvoiceId] : [userId, quoteId],
      tx,
    ),
  ]);

  const quoteTotals = calculateInvoiceTotals({
    items: items.map((item) => ({
      qty: numericToNumber(item.qty),
      unitPrice: numericToNumber(item.unitPrice),
      discountPct: numericToNumber(item.discountPct),
      vatRate: numericToNumber(quote.vatRate),
    })),
    vatEnabled: quote.vatEnabled,
  });

  const alreadyInvoiced = numericToNumber(aggregate?.total ?? 0);
  const remaining = Math.max(0, quoteTotals.total - alreadyInvoiced);

  if (invoiceTotal > remaining + 0.0001) {
    throw new Error("QUOTE_REMAINING_EXCEEDED");
  }
}

function resolveStoredStatus(
  requestedStatus: InvoiceStatus,
  total: number,
  amountPaid: number,
  dueDate: Date,
): InvoiceStatus {
  if (requestedStatus === "cancelled") {
    return "cancelled";
  }

  if (requestedStatus === "draft" && amountPaid <= 0) {
    return "draft";
  }

  return resolveInvoiceStatus({
    currentStatus: "sent",
    total,
    amountPaid,
    dueDate,
  });
}

async function updateInvoicePaymentSummary(
  tx: PoolClient,
  userId: string,
  invoiceId: string,
): Promise<void> {
  const [invoice, paymentAgg] = await Promise.all([
    dbQueryOne<{
      id: string;
      status: InvoiceStatus;
      total: number | string;
      dueDate: Date | string;
    }>(
      `SELECT
        id,
        status,
        total,
        due_date AS "dueDate"
      FROM invoices
      WHERE id = $1 AND user_id = $2
      LIMIT 1`,
      [invoiceId, userId],
      tx,
    ),
    dbQueryOne<{ amount: number | string | null }>(
      `SELECT COALESCE(SUM(amount), 0) AS amount
       FROM payments
       WHERE user_id = $1 AND invoice_id = $2`,
      [userId, invoiceId],
      tx,
    ),
  ]);

  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND");
  }

  const total = numericToNumber(invoice.total);
  const amountPaid = Math.max(0, numericToNumber(paymentAgg?.amount ?? 0));
  if (amountPaid > total + 0.0001) {
    throw new Error("PAYMENT_EXCEEDS_TOTAL");
  }

  const amountDue = Math.max(0, total - amountPaid);
  const status = resolveStoredStatus(
    invoice.status,
    total,
    amountPaid,
    toDate(invoice.dueDate),
  );

  await dbQuery(
    `UPDATE invoices
     SET amount_paid = $1, amount_due = $2, status = $3, updated_at = NOW()
     WHERE id = $4 AND user_id = $5`,
    [amountPaid, amountDue, status, invoice.id, userId],
    tx,
  );
}

export async function createInvoiceWithItems(userId: string, input: UpsertInvoiceInput) {
  const payload = prepareInvoicePayload(input);

  return dbTransaction(async (tx) => {
    const { client, quote, settings } = await resolveLinkedEntities(tx, userId, payload);
    const supplierSnapshot = buildSupplierSnapshot(settings);
    const clientSnapshot = buildClientSnapshot(client);

    if (!hasClientBillingIdentity(clientSnapshot)) {
      throw new Error("CLIENT_BILLING_IDENTITY_REQUIRED");
    }

    if (payload.quoteId && quote && quote.currency !== payload.currency) {
      throw new Error("QUOTE_CURRENCY_MISMATCH");
    }

    const totals = calculateInvoiceTotals({
      items: payload.items,
      vatEnabled: payload.vatEnabled,
    });

    if (payload.quoteId) {
      await assertQuoteAmountLimit(tx, userId, payload.quoteId, totals.total);
    }

    const amountPaid = 0;
    const amountDue = totals.total;
    const status = resolveStoredStatus(payload.requestedStatus, totals.total, amountPaid, payload.dueDate);

    const created = await dbQueryOne<{
      id: string;
      quoteId: string | null;
    }>(
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
      RETURNING id, quote_id AS "quoteId"`,
      [
        createEntityId("inv"),
        userId,
        payload.quoteId,
        payload.clientId,
        payload.invoiceNumber,
        payload.variableSymbol,
        payload.issueDate,
        payload.taxableSupplyDate,
        payload.dueDate,
        payload.paymentMethod,
        payload.currency,
        payload.vatEnabled,
        payload.vatRate,
        payload.taxRegime,
        payload.invoiceKind,
        JSON.stringify(supplierSnapshot),
        JSON.stringify(clientSnapshot),
        totals.subtotal,
        totals.discountTotal,
        totals.taxBaseTotal,
        totals.vatTotal,
        totals.total,
        amountPaid,
        amountDue,
        status,
        payload.legalNote,
        payload.note,
      ],
      tx,
    );

    if (!created) {
      throw new Error("INVOICE_CREATE_FAILED");
    }

    for (const [index, item] of payload.items.entries()) {
      const line = calculateInvoiceLineTotals(item, payload.vatEnabled);

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
          created.id,
          item.name,
          item.description,
          item.unit,
          item.qty,
          item.unitPrice,
          item.discountPct,
          item.vatRate,
          line.lineSubtotal,
          line.lineVat,
          line.lineTotal,
          index,
        ],
        tx,
      );
    }

    if (created.quoteId) {
      await syncQuoteInvoicingState(userId, created.quoteId, tx);
    }

    const fullInvoice = await dbQueryOne<{ id: string }>(
      `SELECT id FROM invoices WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [created.id, userId],
      tx,
    );

    if (!fullInvoice) {
      throw createNotFoundError("INVOICE_NOT_FOUND");
    }

    return { id: fullInvoice.id, quoteId: created.quoteId };
  });
}

export async function updateInvoiceWithItems(
  userId: string,
  invoiceId: string,
  input: UpsertInvoiceInput,
) {
  const payload = prepareInvoicePayload(input);

  return dbTransaction(async (tx) => {
    const existing = await dbQueryOne<{
      id: string;
      quoteId: string | null;
      amountPaid: number | string;
    }>(
      `SELECT
        id,
        quote_id AS "quoteId",
        amount_paid AS "amountPaid"
      FROM invoices
      WHERE id = $1 AND user_id = $2
      LIMIT 1`,
      [invoiceId, userId],
      tx,
    );

    if (!existing) {
      throw new Error("INVOICE_NOT_FOUND");
    }

    const { client, quote, settings } = await resolveLinkedEntities(tx, userId, payload);
    const supplierSnapshot = buildSupplierSnapshot(settings);
    const clientSnapshot = buildClientSnapshot(client);

    if (!hasClientBillingIdentity(clientSnapshot)) {
      throw new Error("CLIENT_BILLING_IDENTITY_REQUIRED");
    }

    if (payload.quoteId && quote && quote.currency !== payload.currency) {
      throw new Error("QUOTE_CURRENCY_MISMATCH");
    }

    const totals = calculateInvoiceTotals({
      items: payload.items,
      vatEnabled: payload.vatEnabled,
    });

    if (payload.quoteId) {
      await assertQuoteAmountLimit(tx, userId, payload.quoteId, totals.total, invoiceId);
    }

    const amountPaid = numericToNumber(existing.amountPaid);
    if (amountPaid > totals.total + 0.0001) {
      throw new Error("PAYMENT_EXCEEDS_TOTAL");
    }

    const amountDue = Math.max(0, totals.total - amountPaid);
    const status = resolveStoredStatus(payload.requestedStatus, totals.total, amountPaid, payload.dueDate);

    const updated = await dbQueryOne<{ id: string; quoteId: string | null }>(
      `UPDATE invoices
       SET
         quote_id = $1,
         client_id = $2,
         invoice_number = $3,
         variable_symbol = $4,
         issue_date = $5,
         taxable_supply_date = $6,
         due_date = $7,
         payment_method = $8,
         currency = $9,
         vat_enabled = $10,
         vat_rate = $11,
         tax_regime = $12,
         invoice_kind = $13,
         supplier_snapshot_json = $14::jsonb,
         client_snapshot_json = $15::jsonb,
         subtotal = $16,
         discount_total = $17,
         tax_base_total = $18,
         vat_total = $19,
         total = $20,
         amount_due = $21,
         status = $22,
         legal_note = $23,
         note = $24,
         updated_at = NOW()
       WHERE id = $25 AND user_id = $26
       RETURNING id, quote_id AS "quoteId"`,
      [
        payload.quoteId,
        payload.clientId,
        payload.invoiceNumber,
        payload.variableSymbol,
        payload.issueDate,
        payload.taxableSupplyDate,
        payload.dueDate,
        payload.paymentMethod,
        payload.currency,
        payload.vatEnabled,
        payload.vatRate,
        payload.taxRegime,
        payload.invoiceKind,
        JSON.stringify(supplierSnapshot),
        JSON.stringify(clientSnapshot),
        totals.subtotal,
        totals.discountTotal,
        totals.taxBaseTotal,
        totals.vatTotal,
        totals.total,
        amountDue,
        status,
        payload.legalNote,
        payload.note,
        invoiceId,
        userId,
      ],
      tx,
    );

    if (!updated) {
      throw new Error("INVOICE_NOT_FOUND");
    }

    await dbQuery(`DELETE FROM invoice_items WHERE user_id = $1 AND invoice_id = $2`, [userId, invoiceId], tx);

    for (const [index, item] of payload.items.entries()) {
      const line = calculateInvoiceLineTotals(item, payload.vatEnabled);

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
          item.description,
          item.unit,
          item.qty,
          item.unitPrice,
          item.discountPct,
          item.vatRate,
          line.lineSubtotal,
          line.lineVat,
          line.lineTotal,
          index,
        ],
        tx,
      );
    }

    if (existing.quoteId && existing.quoteId !== payload.quoteId) {
      await syncQuoteInvoicingState(userId, existing.quoteId, tx);
    }

    if (payload.quoteId) {
      await syncQuoteInvoicingState(userId, payload.quoteId, tx);
    }

    return { id: updated.id, quoteId: updated.quoteId };
  });
}

export async function addPaymentToInvoice(
  userId: string,
  input: {
    invoiceId: string;
    paymentDate: Date;
    amount: number;
    method: string;
    note?: string | null;
  },
) {
  const paymentDate = normalizeDate(input.paymentDate);
  const amount = Number.isFinite(input.amount) ? Math.max(0, input.amount) : 0;
  const method = normalizeString(input.method);

  if (amount <= 0) {
    throw new Error("PAYMENT_AMOUNT_REQUIRED");
  }

  if (!method) {
    throw new Error("PAYMENT_METHOD_REQUIRED");
  }

  return dbTransaction(async (tx) => {
    const invoice = await dbQueryOne<{
      id: string;
      total: number | string;
      amountPaid: number | string;
      quoteId: string | null;
    }>(
      `SELECT
        id,
        total,
        amount_paid AS "amountPaid",
        quote_id AS "quoteId"
      FROM invoices
      WHERE id = $1 AND user_id = $2
      LIMIT 1`,
      [input.invoiceId, userId],
      tx,
    );

    if (!invoice) {
      throw new Error("INVOICE_NOT_FOUND");
    }

    const remainingBefore = Math.max(
      0,
      numericToNumber(invoice.total) - numericToNumber(invoice.amountPaid),
    );
    if (amount > remainingBefore + 0.0001) {
      throw new Error("PAYMENT_EXCEEDS_TOTAL");
    }

    const payment = await dbQueryOne<{ id: string }>(
      `INSERT INTO payments (
        id,
        user_id,
        invoice_id,
        payment_date,
        amount,
        method,
        note
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id`,
      [
        createEntityId("pay"),
        userId,
        invoice.id,
        paymentDate,
        amount,
        method,
        normalizeString(input.note),
      ],
      tx,
    );

    if (!payment) {
      throw new Error("PAYMENT_CREATE_FAILED");
    }

    await updateInvoicePaymentSummary(tx, userId, invoice.id);

    if (invoice.quoteId) {
      await syncQuoteInvoicingState(userId, invoice.quoteId, tx);
    }

    return payment;
  });
}

export async function deletePaymentFromInvoice(userId: string, paymentId: string) {
  return dbTransaction(async (tx) => {
    const payment = await dbQueryOne<{
      id: string;
      invoiceId: string;
    }>(
      `SELECT
        id,
        invoice_id AS "invoiceId"
      FROM payments
      WHERE id = $1 AND user_id = $2
      LIMIT 1`,
      [paymentId, userId],
      tx,
    );

    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    await dbQuery(`DELETE FROM payments WHERE id = $1 AND user_id = $2`, [payment.id, userId], tx);

    await updateInvoicePaymentSummary(tx, userId, payment.invoiceId);

    const invoice = await dbQueryOne<{ quoteId: string | null }>(
      `SELECT quote_id AS "quoteId"
       FROM invoices
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [payment.invoiceId, userId],
      tx,
    );

    if (invoice?.quoteId) {
      await syncQuoteInvoicingState(userId, invoice.quoteId, tx);
    }
  });
}

export async function setInvoiceManualStatus(
  userId: string,
  input: {
    invoiceId: string;
    status: InvoiceStatus;
  },
) {
  return dbTransaction(async (tx) => {
    const invoice = await dbQueryOne<{
      id: string;
      total: number | string;
      amountPaid: number | string;
      dueDate: Date | string;
      quoteId: string | null;
    }>(
      `SELECT
        id,
        total,
        amount_paid AS "amountPaid",
        due_date AS "dueDate",
        quote_id AS "quoteId"
      FROM invoices
      WHERE id = $1 AND user_id = $2
      LIMIT 1`,
      [input.invoiceId, userId],
      tx,
    );

    if (!invoice) {
      throw new Error("INVOICE_NOT_FOUND");
    }

    const amountPaid = numericToNumber(invoice.amountPaid);
    const total = numericToNumber(invoice.total);

    const status = resolveStoredStatus(input.status, total, amountPaid, toDate(invoice.dueDate));

    const updated = await dbQueryOne<{ id: string; quoteId: string | null }>(
      `UPDATE invoices
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, quote_id AS "quoteId"`,
      [status, input.invoiceId, userId],
      tx,
    );

    if (!updated) {
      throw createNotFoundError("INVOICE_NOT_FOUND");
    }

    if (invoice.quoteId) {
      await syncQuoteInvoicingState(userId, invoice.quoteId, tx);
    }

    return updated;
  });
}

export async function deleteInvoiceWithSync(userId: string, invoiceId: string) {
  return dbTransaction(async (tx) => {
    const invoice = await dbQueryOne<{
      id: string;
      quoteId: string | null;
    }>(
      `SELECT id, quote_id AS "quoteId"
       FROM invoices
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [invoiceId, userId],
      tx,
    );

    if (!invoice) {
      throw new Error("INVOICE_NOT_FOUND");
    }

    await dbQuery(`DELETE FROM invoices WHERE id = $1 AND user_id = $2`, [invoiceId, userId], tx);

    if (invoice.quoteId) {
      await syncQuoteInvoicingState(userId, invoice.quoteId, tx);
    }

    return invoice;
  });
}

export async function refreshOverdueInvoices(userId: string): Promise<void> {
  const now = new Date();

  await dbTransaction(async (tx) => {
    await dbQuery(
      `UPDATE invoices
       SET status = 'overdue', updated_at = NOW()
       WHERE user_id = $1
         AND status IN ('sent', 'partially_paid')
         AND amount_due > 0
         AND due_date < $2`,
      [userId, now],
      tx,
    );

    const paidOrCleared = await dbQuery<{
      id: string;
      status: InvoiceStatus;
      total: number | string;
      amountPaid: number | string;
      dueDate: Date | string;
    }>(
      `SELECT
        id,
        status,
        total,
        amount_paid AS "amountPaid",
        due_date AS "dueDate"
      FROM invoices
      WHERE user_id = $1
        AND status IN ('overdue', 'partially_paid', 'paid')`,
      [userId],
      tx,
    );

    for (const invoice of paidOrCleared) {
      const nextStatus = resolveStoredStatus(
        invoice.status,
        numericToNumber(invoice.total),
        numericToNumber(invoice.amountPaid),
        toDate(invoice.dueDate),
      );

      if (nextStatus !== invoice.status) {
        await dbQuery(
          `UPDATE invoices
           SET status = $1, updated_at = NOW()
           WHERE id = $2 AND user_id = $3`,
          [nextStatus, invoice.id, userId],
          tx,
        );
      }
    }
  });
}
