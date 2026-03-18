import type { QuoteStatus } from "@/types/domain";

import {
  createEntityId,
  createNotFoundError,
  dbQuery,
  dbQueryOne,
  dbTransaction,
  numericToNumber,
  toDate,
} from "@/lib/db";

export type ListQuotesFilters = {
  status?: QuoteStatus;
  clientId?: string;
  currency?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
};

type QuoteRow = {
  id: string;
  userId: string;
  number: string;
  title: string;
  status: QuoteStatus;
  clientId: string;
  language: "sk" | "en";
  currency: string;
  validUntil: Date | string;
  vatEnabled: boolean;
  vatRate: number | string;
  showClientDetailsInPdf: boolean;
  showCompanyDetailsInPdf: boolean;
  introContentMarkdown: string;
  termsContentMarkdown: string;
  revisionsIncluded: number;
  totalDiscountType: "none" | "pct" | "amount";
  totalDiscountValue: number | string;
  invoicingState: "not_invoiced" | "partially_invoiced" | "fully_invoiced";
  createdAt: Date | string;
  updatedAt: Date | string;
};

type LegacyQuoteRow = Omit<
  QuoteRow,
  "showClientDetailsInPdf" | "showCompanyDetailsInPdf" | "invoicingState"
>;

type QuoteItemRow = {
  id: string;
  userId: string;
  quoteId: string;
  name: string;
  description: string | null;
  unit: "h" | "day" | "pcs" | "pkg";
  qty: number | string;
  unitPrice: number | string;
  discountPct: number | string;
  sortOrder: number;
};

type ScopeItemRow = {
  id: string;
  userId: string;
  quoteId: string;
  category: string;
  itemKey: string;
  label: string;
  description: string | null;
  sortOrder: number;
};

type ClientBriefRow = {
  id: string;
  name: string;
};

function mapQuoteRow(row: QuoteRow) {
  return {
    ...row,
    validUntil: toDate(row.validUntil),
    vatRate: numericToNumber(row.vatRate),
    totalDiscountValue: numericToNumber(row.totalDiscountValue),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

function withLegacyQuoteDefaults(row: LegacyQuoteRow): QuoteRow {
  return {
    ...row,
    showClientDetailsInPdf: true,
    showCompanyDetailsInPdf: true,
    invoicingState: "not_invoiced",
  };
}

function mapQuoteItemRow(row: QuoteItemRow) {
  return {
    ...row,
    qty: numericToNumber(row.qty),
    unitPrice: numericToNumber(row.unitPrice),
    discountPct: numericToNumber(row.discountPct),
  };
}

function mapScopeItemRow(row: ScopeItemRow) {
  return row;
}

function buildQuoteWhere(userId: string, filters: ListQuotesFilters) {
  const params: unknown[] = [userId];
  const where: string[] = ["q.user_id = $1"];

  if (filters.status) {
    params.push(filters.status);
    where.push(`q.status = $${params.length}`);
  }

  if (filters.clientId) {
    params.push(filters.clientId);
    where.push(`q.client_id = $${params.length}`);
  }

  if (filters.currency?.trim()) {
    params.push(filters.currency.trim());
    where.push(`q.currency = $${params.length}`);
  }

  if (filters.dateFrom) {
    params.push(filters.dateFrom);
    where.push(`q.created_at >= $${params.length}`);
  }

  if (filters.dateTo) {
    params.push(filters.dateTo);
    where.push(`q.created_at <= $${params.length}`);
  }

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;
    params.push(search);
    const idx = params.length;
    where.push(`(q.number ILIKE $${idx} OR q.title ILIKE $${idx} OR c.name ILIKE $${idx})`);
  }

  return { where, params };
}

async function listQuotesBase(userId: string, filters: ListQuotesFilters = {}) {
  const { where, params } = buildQuoteWhere(userId, filters);

  const fullSelect = `SELECT
      q.id,
      q.user_id AS "userId",
      q.number,
      q.title,
      q.status,
      q.client_id AS "clientId",
      q.language,
      q.currency,
      q.valid_until AS "validUntil",
      q.vat_enabled AS "vatEnabled",
      q.vat_rate AS "vatRate",
      q.show_client_details_in_pdf AS "showClientDetailsInPdf",
      q.show_company_details_in_pdf AS "showCompanyDetailsInPdf",
      q.intro_content_markdown AS "introContentMarkdown",
      q.terms_content_markdown AS "termsContentMarkdown",
      q.revisions_included AS "revisionsIncluded",
      q.total_discount_type AS "totalDiscountType",
      q.total_discount_value AS "totalDiscountValue",
      q.invoicing_state AS "invoicingState",
      q.created_at AS "createdAt",
      q.updated_at AS "updatedAt"
    FROM quotes q
    LEFT JOIN clients c ON c.id = q.client_id AND c.user_id = q.user_id
    WHERE ${where.join(" AND ")}
    ORDER BY q.created_at DESC`;

  const fallbackSelect = `SELECT
      q.id,
      q.user_id AS "userId",
      q.number,
      q.title,
      q.status,
      q.client_id AS "clientId",
      q.language,
      q.currency,
      q.valid_until AS "validUntil",
      q.vat_enabled AS "vatEnabled",
      q.vat_rate AS "vatRate",
      q.show_client_details_in_pdf AS "showClientDetailsInPdf",
      q.show_company_details_in_pdf AS "showCompanyDetailsInPdf",
      q.intro_content_markdown AS "introContentMarkdown",
      q.terms_content_markdown AS "termsContentMarkdown",
      q.revisions_included AS "revisionsIncluded",
      q.total_discount_type AS "totalDiscountType",
      q.total_discount_value AS "totalDiscountValue",
      q.created_at AS "createdAt",
      q.updated_at AS "updatedAt"
    FROM quotes q
    LEFT JOIN clients c ON c.id = q.client_id AND c.user_id = q.user_id
    WHERE ${where.join(" AND ")}
    ORDER BY q.created_at DESC`;

  let rows: QuoteRow[];

  try {
    rows = await dbQuery<QuoteRow>(fullSelect, params);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("invoicing_state") || msg.includes("does not exist")) {
      const fallbackRows = await dbQuery<Omit<QuoteRow, "invoicingState"> & { createdAt: Date | string; updatedAt: Date | string }>(
        fallbackSelect,
        params,
      );
      rows = fallbackRows.map((r) => ({ ...r, invoicingState: "not_invoiced" as const }));
    } else {
      throw err;
    }
  }

  return rows.map(mapQuoteRow);
}

export async function listQuotes(
  userId: string,
  filters: ListQuotesFilters = {},
) {
  return listQuotesBase(userId, filters);
}

export async function listQuotesWithDetails(
  userId: string,
  filters: ListQuotesFilters = {},
) {
  const quotes = await listQuotesBase(userId, filters);

  if (quotes.length === 0) {
    return [];
  }

  const quoteIds = quotes.map((quote) => quote.id);
  const clientIds = Array.from(new Set(quotes.map((quote) => quote.clientId)));

  const [clients, items] = await Promise.all([
    dbQuery<ClientBriefRow>(
      `SELECT id, name
       FROM clients
       WHERE user_id = $1 AND id = ANY($2::text[])`,
      [userId, clientIds],
    ),
    dbQuery<Pick<QuoteItemRow, "quoteId" | "qty" | "unitPrice" | "discountPct">>(
      `SELECT
         quote_id AS "quoteId",
         qty,
         unit_price AS "unitPrice",
         discount_pct AS "discountPct"
       FROM quote_items
       WHERE user_id = $1 AND quote_id = ANY($2::text[])`,
      [userId, quoteIds],
    ),
  ]);

  const clientById = new Map(clients.map((client) => [client.id, client]));
  const itemsByQuoteId = new Map<string, Array<{ qty: number; unitPrice: number; discountPct: number }>>();

  for (const item of items) {
    const bucket = itemsByQuoteId.get(item.quoteId) ?? [];
    bucket.push({
      qty: numericToNumber(item.qty),
      unitPrice: numericToNumber(item.unitPrice),
      discountPct: numericToNumber(item.discountPct),
    });
    itemsByQuoteId.set(item.quoteId, bucket);
  }

  return quotes.map((quote) => ({
    ...quote,
    client: clientById.get(quote.clientId) ?? { id: quote.clientId, name: "-" },
    items: itemsByQuoteId.get(quote.id) ?? [],
  }));
}

export async function listQuoteCurrencies(userId: string): Promise<string[]> {
  const rows = await dbQuery<{ currency: string }>(
    `SELECT DISTINCT currency
     FROM quotes
     WHERE user_id = $1
     ORDER BY currency ASC`,
    [userId],
  );

  return rows.map((row) => row.currency);
}

export async function getQuoteById(userId: string, id: string) {
  try {
    const row = await dbQueryOne<QuoteRow>(
      `SELECT
        id,
        user_id AS "userId",
        number,
        title,
        status,
        client_id AS "clientId",
        language,
        currency,
        valid_until AS "validUntil",
        vat_enabled AS "vatEnabled",
        vat_rate AS "vatRate",
        show_client_details_in_pdf AS "showClientDetailsInPdf",
        show_company_details_in_pdf AS "showCompanyDetailsInPdf",
        intro_content_markdown AS "introContentMarkdown",
        terms_content_markdown AS "termsContentMarkdown",
        revisions_included AS "revisionsIncluded",
        total_discount_type AS "totalDiscountType",
        total_discount_value AS "totalDiscountValue",
        invoicing_state AS "invoicingState",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM quotes
      WHERE id = $1 AND user_id = $2
      LIMIT 1`,
      [id, userId],
    );

    return row ? mapQuoteRow(row) : null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes("column") && !msg.includes("does not exist")) {
      throw error;
    }

    const legacyRow = await dbQueryOne<LegacyQuoteRow>(
      `SELECT
        id,
        user_id AS "userId",
        number,
        title,
        status,
        client_id AS "clientId",
        language,
        currency,
        valid_until AS "validUntil",
        vat_enabled AS "vatEnabled",
        vat_rate AS "vatRate",
        intro_content_markdown AS "introContentMarkdown",
        terms_content_markdown AS "termsContentMarkdown",
        revisions_included AS "revisionsIncluded",
        total_discount_type AS "totalDiscountType",
        total_discount_value AS "totalDiscountValue",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM quotes
      WHERE id = $1 AND user_id = $2
      LIMIT 1`,
      [id, userId],
    );

    return legacyRow ? mapQuoteRow(withLegacyQuoteDefaults(legacyRow)) : null;
  }
}

export async function getQuoteWithRelations(userId: string, id: string) {
  const [quote, client, items] = await Promise.all([
    getQuoteById(userId, id),
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
      WHERE id = (SELECT client_id FROM quotes WHERE id = $1 AND user_id = $2)
        AND user_id = $2
      LIMIT 1`,
      [id, userId],
    ),
    dbQuery<QuoteItemRow>(
      `SELECT
        id,
        user_id AS "userId",
        quote_id AS "quoteId",
        name,
        description,
        unit,
        qty,
        unit_price AS "unitPrice",
        discount_pct AS "discountPct",
        sort_order AS "sortOrder"
      FROM quote_items
      WHERE quote_id = $1 AND user_id = $2
      ORDER BY sort_order ASC`,
      [id, userId],
    ),
  ]);

  if (!quote || !client) {
    return null;
  }

  let scopeItems: ScopeItemRow[] = [];
  try {
    scopeItems = await dbQuery<ScopeItemRow>(
      `SELECT
        id,
        user_id AS "userId",
        quote_id AS "quoteId",
        category,
        item_key AS "itemKey",
        label,
        description,
        sort_order AS "sortOrder"
      FROM scope_items
      WHERE quote_id = $1 AND user_id = $2
      ORDER BY sort_order ASC`,
      [id, userId],
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes("relation") && !msg.includes("column") && !msg.includes("does not exist")) {
      throw error;
    }
  }

  return {
    ...quote,
    client: {
      ...client,
      createdAt: toDate((client as { createdAt: unknown }).createdAt),
      updatedAt: toDate((client as { updatedAt: unknown }).updatedAt),
    },
    items: items.map(mapQuoteItemRow),
    scopeItems: scopeItems.map(mapScopeItemRow),
  };
}

export async function createQuote(
  userId: string,
  data: Record<string, unknown>,
) {
  const quoteId = createEntityId("quo");

  try {
    const row = await dbQueryOne<QuoteRow>(
      `INSERT INTO quotes (
        id,
        user_id,
        number,
        title,
        status,
        client_id,
        language,
        currency,
        valid_until,
        vat_enabled,
        vat_rate,
        show_client_details_in_pdf,
        show_company_details_in_pdf,
        intro_content_markdown,
        terms_content_markdown,
        revisions_included,
        total_discount_type,
        total_discount_value,
        invoicing_state
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,COALESCE($19,'not_invoiced')
      )
      RETURNING
        id,
        user_id AS "userId",
        number,
        title,
        status,
        client_id AS "clientId",
        language,
        currency,
        valid_until AS "validUntil",
        vat_enabled AS "vatEnabled",
        vat_rate AS "vatRate",
        show_client_details_in_pdf AS "showClientDetailsInPdf",
        show_company_details_in_pdf AS "showCompanyDetailsInPdf",
        intro_content_markdown AS "introContentMarkdown",
        terms_content_markdown AS "termsContentMarkdown",
        revisions_included AS "revisionsIncluded",
        total_discount_type AS "totalDiscountType",
        total_discount_value AS "totalDiscountValue",
        invoicing_state AS "invoicingState",
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
      [
        quoteId,
        userId,
        data.number,
        data.title,
        data.status,
        data.clientId,
        data.language,
        data.currency,
        data.validUntil,
        data.vatEnabled,
        data.vatRate,
        data.showClientDetailsInPdf,
        data.showCompanyDetailsInPdf,
        data.introContentMarkdown,
        data.termsContentMarkdown,
        data.revisionsIncluded,
        data.totalDiscountType,
        data.totalDiscountValue,
        data.invoicingState ?? "not_invoiced",
      ],
    );

    if (!row) {
      throw new Error("QUOTE_CREATE_FAILED");
    }

    return mapQuoteRow(row);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes("column") && !msg.includes("does not exist")) {
      throw error;
    }

    const legacyRow = await dbQueryOne<LegacyQuoteRow>(
      `INSERT INTO quotes (
        id,
        user_id,
        number,
        title,
        status,
        client_id,
        language,
        currency,
        valid_until,
        vat_enabled,
        vat_rate,
        intro_content_markdown,
        terms_content_markdown,
        revisions_included,
        total_discount_type,
        total_discount_value
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      )
      RETURNING
        id,
        user_id AS "userId",
        number,
        title,
        status,
        client_id AS "clientId",
        language,
        currency,
        valid_until AS "validUntil",
        vat_enabled AS "vatEnabled",
        vat_rate AS "vatRate",
        intro_content_markdown AS "introContentMarkdown",
        terms_content_markdown AS "termsContentMarkdown",
        revisions_included AS "revisionsIncluded",
        total_discount_type AS "totalDiscountType",
        total_discount_value AS "totalDiscountValue",
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
      [
        quoteId,
        userId,
        data.number,
        data.title,
        data.status,
        data.clientId,
        data.language,
        data.currency,
        data.validUntil,
        data.vatEnabled,
        data.vatRate,
        data.introContentMarkdown,
        data.termsContentMarkdown,
        data.revisionsIncluded,
        data.totalDiscountType,
        data.totalDiscountValue,
      ],
    );

    if (!legacyRow) {
      throw new Error("QUOTE_CREATE_FAILED");
    }

    return mapQuoteRow(withLegacyQuoteDefaults(legacyRow));
  }
}

export async function updateQuote(
  userId: string,
  id: string,
  data: Record<string, unknown>,
) {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  if ("number" in data) assign("number", data.number);
  if ("title" in data) assign("title", data.title);
  if ("status" in data) assign("status", data.status);
  if ("clientId" in data) assign("client_id", data.clientId);
  if ("language" in data) assign("language", data.language);
  if ("currency" in data) assign("currency", data.currency);
  if ("validUntil" in data) assign("valid_until", data.validUntil);
  if ("vatEnabled" in data) assign("vat_enabled", data.vatEnabled);
  if ("vatRate" in data) assign("vat_rate", data.vatRate);
  if ("showClientDetailsInPdf" in data) assign("show_client_details_in_pdf", data.showClientDetailsInPdf);
  if ("showCompanyDetailsInPdf" in data) assign("show_company_details_in_pdf", data.showCompanyDetailsInPdf);
  if ("introContentMarkdown" in data) assign("intro_content_markdown", data.introContentMarkdown);
  if ("termsContentMarkdown" in data) assign("terms_content_markdown", data.termsContentMarkdown);
  if ("revisionsIncluded" in data) assign("revisions_included", data.revisionsIncluded);
  if ("totalDiscountType" in data) assign("total_discount_type", data.totalDiscountType);
  if ("totalDiscountValue" in data) assign("total_discount_value", data.totalDiscountValue);
  if ("invoicingState" in data) assign("invoicing_state", data.invoicingState);

  if (assignments.length === 0) {
    const current = await getQuoteById(userId, id);
    if (!current) {
      throw createNotFoundError("QUOTE_NOT_FOUND");
    }
    return current;
  }

  assignments.push("updated_at = NOW()");
  values.push(id, userId);

  const row = await dbQueryOne<QuoteRow>(
    `UPDATE quotes
      SET ${assignments.join(", ")}
      WHERE id = $${values.length - 1} AND user_id = $${values.length}
      RETURNING
        id,
        user_id AS "userId",
        number,
        title,
        status,
        client_id AS "clientId",
        language,
        currency,
        valid_until AS "validUntil",
        vat_enabled AS "vatEnabled",
        vat_rate AS "vatRate",
        show_client_details_in_pdf AS "showClientDetailsInPdf",
        show_company_details_in_pdf AS "showCompanyDetailsInPdf",
        intro_content_markdown AS "introContentMarkdown",
        terms_content_markdown AS "termsContentMarkdown",
        revisions_included AS "revisionsIncluded",
        total_discount_type AS "totalDiscountType",
        total_discount_value AS "totalDiscountValue",
        invoicing_state AS "invoicingState",
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
    values,
  );

  if (!row) {
    throw createNotFoundError("QUOTE_NOT_FOUND");
  }

  return mapQuoteRow(row);
}

export async function deleteQuote(userId: string, id: string) {
  const row = await dbQueryOne<{ id: string }>(
    `DELETE FROM quotes WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId],
  );

  if (!row) {
    throw createNotFoundError("QUOTE_NOT_FOUND");
  }

  return row;
}

export async function setQuoteStatus(
  userId: string,
  id: string,
  status: QuoteStatus,
) {
  return updateQuote(userId, id, { status });
}

export async function duplicateQuote(
  userId: string,
  quoteId: string,
  newNumber: string,
) {
  return dbTransaction(async (tx) => {
    const source = await dbQueryOne<QuoteRow>(
      `SELECT
        id,
        user_id AS "userId",
        number,
        title,
        status,
        client_id AS "clientId",
        language,
        currency,
        valid_until AS "validUntil",
        vat_enabled AS "vatEnabled",
        vat_rate AS "vatRate",
        show_client_details_in_pdf AS "showClientDetailsInPdf",
        show_company_details_in_pdf AS "showCompanyDetailsInPdf",
        intro_content_markdown AS "introContentMarkdown",
        terms_content_markdown AS "termsContentMarkdown",
        revisions_included AS "revisionsIncluded",
        total_discount_type AS "totalDiscountType",
        total_discount_value AS "totalDiscountValue",
        invoicing_state AS "invoicingState",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM quotes
      WHERE id = $1 AND user_id = $2
      LIMIT 1`,
      [quoteId, userId],
      tx,
    );

    if (!source) {
      throw createNotFoundError("QUOTE_NOT_FOUND");
    }

    const sourceItems = await dbQuery<QuoteItemRow>(
      `SELECT
        id,
        user_id AS "userId",
        quote_id AS "quoteId",
        name,
        description,
        unit,
        qty,
        unit_price AS "unitPrice",
        discount_pct AS "discountPct",
        sort_order AS "sortOrder"
      FROM quote_items
      WHERE quote_id = $1 AND user_id = $2
      ORDER BY sort_order ASC`,
      [quoteId, userId],
      tx,
    );

    const sourceScopeItems = await dbQuery<ScopeItemRow>(
      `SELECT
        id,
        user_id AS "userId",
        quote_id AS "quoteId",
        category,
        item_key AS "itemKey",
        label,
        description,
        sort_order AS "sortOrder"
      FROM scope_items
      WHERE quote_id = $1 AND user_id = $2
      ORDER BY sort_order ASC`,
      [quoteId, userId],
      tx,
    );

    const duplicatedId = createEntityId("quo");
    const duplicatedQuote = await dbQueryOne<QuoteRow>(
      `INSERT INTO quotes (
        id,
        user_id,
        number,
        title,
        status,
        client_id,
        language,
        currency,
        valid_until,
        vat_enabled,
        vat_rate,
        show_client_details_in_pdf,
        show_company_details_in_pdf,
        intro_content_markdown,
        terms_content_markdown,
        revisions_included,
        total_discount_type,
        total_discount_value,
        invoicing_state
      ) VALUES (
        $1,$2,$3,$4,'draft',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'not_invoiced'
      )
      RETURNING
        id,
        user_id AS "userId",
        number,
        title,
        status,
        client_id AS "clientId",
        language,
        currency,
        valid_until AS "validUntil",
        vat_enabled AS "vatEnabled",
        vat_rate AS "vatRate",
        show_client_details_in_pdf AS "showClientDetailsInPdf",
        show_company_details_in_pdf AS "showCompanyDetailsInPdf",
        intro_content_markdown AS "introContentMarkdown",
        terms_content_markdown AS "termsContentMarkdown",
        revisions_included AS "revisionsIncluded",
        total_discount_type AS "totalDiscountType",
        total_discount_value AS "totalDiscountValue",
        invoicing_state AS "invoicingState",
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
      [
        duplicatedId,
        userId,
        newNumber,
        `${source.title} (Copy)`,
        source.clientId,
        source.language,
        source.currency,
        source.validUntil,
        source.vatEnabled,
        source.vatRate,
        source.showClientDetailsInPdf,
        source.showCompanyDetailsInPdf,
        source.introContentMarkdown,
        source.termsContentMarkdown,
        source.revisionsIncluded,
        source.totalDiscountType,
        source.totalDiscountValue,
      ],
      tx,
    );

    if (!duplicatedQuote) {
      throw new Error("QUOTE_DUPLICATE_FAILED");
    }

    for (const item of sourceItems) {
      await dbQuery(
        `INSERT INTO quote_items (
          id,
          user_id,
          quote_id,
          name,
          description,
          unit,
          qty,
          unit_price,
          discount_pct,
          sort_order
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          createEntityId("qit"),
          userId,
          duplicatedId,
          item.name,
          item.description,
          item.unit,
          item.qty,
          item.unitPrice,
          item.discountPct,
          item.sortOrder,
        ],
        tx,
      );
    }

    for (const item of sourceScopeItems) {
      await dbQuery(
        `INSERT INTO scope_items (
          id,
          user_id,
          quote_id,
          category,
          item_key,
          label,
          description,
          sort_order
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          createEntityId("scp"),
          userId,
          duplicatedId,
          item.category,
          item.itemKey,
          item.label,
          item.description,
          item.sortOrder,
        ],
        tx,
      );
    }

    return mapQuoteRow(duplicatedQuote);
  });
}
