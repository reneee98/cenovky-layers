import "dotenv/config";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";

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

function inferSupabaseDirectUrl() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseDbPassword =
    process.env.SUPABASE_DB_PASSWORD ??
    process.env.SUPABASE_DB_PASS ??
    process.env.SUPABASE_PASSWORD ??
    process.env.DB_PASSWORD;

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

const rawConnectionString =
  process.env.SUPABASE_DB_URL ??
  process.env.SUPABASE_DATABASE_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  inferSupabaseDirectUrl();

if (!rawConnectionString) {
  throw new Error(
    "Supabase/Postgres connection is not set. Provide SUPABASE_DB_URL (or DATABASE_URL / POSTGRES_URL).",
  );
}

const connectionString = normalizeConnectionString(rawConnectionString);
const pool = new Pool({
  connectionString,
  ssl: isSupabaseHost(connectionString) ? { rejectUnauthorized: false } : undefined,
});

const migrationFiles = [
  "supabase_auth_owner_migration.sql",
  "supabase_invoices_module_migration.sql",
  "supabase_settings_supplier_fields.sql",
  "supabase_storage_company_assets.sql",
  "supabase_rls_policies.sql",
];

async function main() {
  for (const file of migrationFiles) {
    const absolutePath = join(process.cwd(), "sql", file);
    const sql = await readFile(absolutePath, "utf8");

    if (sql.trim().length === 0) {
      continue;
    }

    console.log(`Applying ${file}`);
    await pool.query(sql);
  }

  console.log("Supabase SQL migrations applied.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
