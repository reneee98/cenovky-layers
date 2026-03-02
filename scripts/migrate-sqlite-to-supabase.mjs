import { execFileSync } from "node:child_process";
import process from "node:process";

import { Client } from "pg";

function inferSupabaseDirectUrl() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseDbPassword = process.env.SUPABASE_DB_PASSWORD ?? process.env.SUPABASE_DB_PASS;

  if (!supabaseUrl || !supabaseDbPassword) {
    return undefined;
  }

  let projectRef;
  try {
    const hostname = new URL(supabaseUrl).hostname;
    projectRef = hostname.split(".")[0] ?? "";
  } catch {
    return undefined;
  }

  if (!projectRef) {
    return undefined;
  }

  return `postgresql://postgres:${encodeURIComponent(supabaseDbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
}

function normalizeConnectionString(rawConnectionString) {
  try {
    const url = new URL(rawConnectionString);
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return rawConnectionString;
  }
}

function isSupabaseHost(connectionString) {
  try {
    const hostname = new URL(connectionString).hostname;
    return hostname.includes("supabase.co") || hostname.includes("supabase.com");
  } catch {
    return false;
  }
}

function resolveConnectionString() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.SUPABASE_DATABASE_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    inferSupabaseDirectUrl()
  );
}

function sqliteJson(dbPath, sql) {
  const output = execFileSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8",
  }).trim();

  if (!output) {
    return [];
  }

  return JSON.parse(output);
}

function parseJsonColumn(value, fallback) {
  let parsed = fallback;

  if (value === null || value === undefined || value === "") {
    return JSON.stringify(parsed);
  }

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = fallback;
    }
  } else {
    parsed = value;
  }

  return JSON.stringify(parsed);
}

function toBool(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === 1 || value === "1") {
    return true;
  }

  if (value === 0 || value === "0") {
    return false;
  }

  return Boolean(value);
}

async function insertSettings(client, rows) {
  for (const row of rows) {
    await client.query(
      `
      insert into settings (
        id, company_name, company_address, company_ico, company_dic, company_icdph,
        company_email, company_phone, company_website, logo_url,
        default_language, default_currency, vat_rate, numbering_year, numbering_counter
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      )
      `,
      [
        row.id,
        row.company_name,
        row.company_address,
        row.company_ico,
        row.company_dic,
        row.company_icdph,
        row.company_email,
        row.company_phone,
        row.company_website,
        row.logo_url,
        row.default_language,
        row.default_currency,
        row.vat_rate,
        row.numbering_year,
        row.numbering_counter,
      ],
    );
  }
}

async function insertClients(client, rows) {
  for (const row of rows) {
    await client.query(
      `
      insert into clients (
        id, type, name, billing_address_line1, billing_address_line2,
        city, zip, country, ico, dic, icdph,
        contact_name, contact_email, contact_phone,
        created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      )
      `,
      [
        row.id,
        row.type,
        row.name,
        row.billing_address_line1,
        row.billing_address_line2,
        row.city,
        row.zip,
        row.country,
        row.ico,
        row.dic,
        row.icdph,
        row.contact_name,
        row.contact_email,
        row.contact_phone,
        row.created_at,
        row.updated_at,
      ],
    );
  }
}

async function insertCatalogItems(client, rows) {
  for (const row of rows) {
    await client.query(
      `
      insert into catalog_items (
        id, category, tags, name, description, default_unit,
        default_unit_price, created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9
      )
      `,
      [
        row.id,
        row.category,
        parseJsonColumn(row.tags, []),
        row.name,
        row.description,
        row.default_unit,
        row.default_unit_price,
        row.created_at,
        row.updated_at,
      ],
    );
  }
}

async function insertSnippets(client, rows) {
  for (const row of rows) {
    await client.query(
      `
      insert into snippets (
        id, type, language, title, content_markdown, created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7
      )
      `,
      [
        row.id,
        row.type,
        row.language,
        row.title,
        row.content_markdown,
        row.created_at,
        row.updated_at,
      ],
    );
  }
}

async function insertQuotes(client, rows) {
  for (const row of rows) {
    await client.query(
      `
      insert into quotes (
        id, number, title, status, client_id,
        language, currency, valid_until,
        vat_enabled, vat_rate,
        show_client_details_in_pdf, show_company_details_in_pdf,
        intro_content_markdown, terms_content_markdown,
        revisions_included, total_discount_type, total_discount_value,
        created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
      )
      `,
      [
        row.id,
        row.number,
        row.title,
        row.status,
        row.client_id,
        row.language,
        row.currency,
        row.valid_until,
        toBool(row.vat_enabled),
        row.vat_rate,
        toBool(row.show_client_details_in_pdf),
        toBool(row.show_company_details_in_pdf),
        row.intro_content_markdown,
        row.terms_content_markdown,
        row.revisions_included,
        row.total_discount_type,
        row.total_discount_value,
        row.created_at,
        row.updated_at,
      ],
    );
  }
}

async function insertQuoteItems(client, rows) {
  for (const row of rows) {
    await client.query(
      `
      insert into quote_items (
        id, quote_id, name, description, unit, qty,
        unit_price, discount_pct, sort_order
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9
      )
      `,
      [
        row.id,
        row.quote_id,
        row.name,
        row.description,
        row.unit,
        row.qty,
        row.unit_price,
        row.discount_pct,
        row.sort_order,
      ],
    );
  }
}

async function insertScopeItems(client, rows) {
  for (const row of rows) {
    await client.query(
      `
      insert into scope_items (
        id, quote_id, category, item_key, label, description, sort_order
      ) values (
        $1,$2,$3,$4,$5,$6,$7
      )
      `,
      [
        row.id,
        row.quote_id,
        row.category,
        row.item_key,
        row.label,
        row.description,
        row.sort_order,
      ],
    );
  }
}

async function insertQuoteVersions(client, rows) {
  for (const row of rows) {
    await client.query(
      `
      insert into quote_versions (
        id, quote_id, version_number, exported_at, snapshot_json, pdf_file_url
      ) values (
        $1,$2,$3,$4,$5,$6
      )
      `,
      [
        row.id,
        row.quote_id,
        row.version_number,
        row.exported_at,
        parseJsonColumn(row.snapshot_json, {}),
        row.pdf_file_url,
      ],
    );
  }
}

async function countTarget(client) {
  const tables = [
    "settings",
    "clients",
    "catalog_items",
    "snippets",
    "quotes",
    "quote_items",
    "scope_items",
    "quote_versions",
  ];

  for (const table of tables) {
    const r = await client.query(`select count(*)::int as cnt from ${table}`);
    console.log(`${table}\t${r.rows[0].cnt}`);
  }
}

async function main() {
  const sourceDb = process.argv[2] ?? "dev.db";
  const resolvedConnection = resolveConnectionString();

  if (!resolvedConnection) {
    throw new Error("Missing Supabase/Postgres connection string in environment.");
  }

  const connectionString = normalizeConnectionString(resolvedConnection);
  const client = new Client({
    connectionString,
    ssl: isSupabaseHost(connectionString) ? { rejectUnauthorized: false } : undefined,
  });

  const settings = sqliteJson(sourceDb, "select * from settings");
  const clients = sqliteJson(sourceDb, "select * from clients");
  const catalogItems = sqliteJson(sourceDb, "select * from catalog_items");
  const snippets = sqliteJson(sourceDb, "select * from snippets");
  const quotes = sqliteJson(sourceDb, "select * from quotes");
  const quoteItems = sqliteJson(sourceDb, "select * from quote_items");
  const scopeItems = sqliteJson(sourceDb, "select * from scope_items");
  const quoteVersions = sqliteJson(sourceDb, "select * from quote_versions");

  console.log("Source counts:");
  console.log(`settings\t${settings.length}`);
  console.log(`clients\t${clients.length}`);
  console.log(`catalog_items\t${catalogItems.length}`);
  console.log(`snippets\t${snippets.length}`);
  console.log(`quotes\t${quotes.length}`);
  console.log(`quote_items\t${quoteItems.length}`);
  console.log(`scope_items\t${scopeItems.length}`);
  console.log(`quote_versions\t${quoteVersions.length}`);

  await client.connect();
  await client.query("begin");

  try {
    await client.query("delete from quote_versions");
    await client.query("delete from scope_items");
    await client.query("delete from quote_items");
    await client.query("delete from quotes");
    await client.query("delete from snippets");
    await client.query("delete from catalog_items");
    await client.query("delete from clients");
    await client.query("delete from settings");

    await insertSettings(client, settings);
    await insertClients(client, clients);
    await insertCatalogItems(client, catalogItems);
    await insertSnippets(client, snippets);
    await insertQuotes(client, quotes);
    await insertQuoteItems(client, quoteItems);
    await insertScopeItems(client, scopeItems);
    await insertQuoteVersions(client, quoteVersions);

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }

  console.log("Target counts:");
  await countTarget(client);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
