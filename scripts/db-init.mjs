import "dotenv/config";

import { randomUUID } from "node:crypto";
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

const seedUserId = process.env.SEED_USER_ID;
if (!seedUserId) {
  throw new Error("Missing SEED_USER_ID. Provide Supabase auth user ID to initialize settings.");
}

const connectionString = normalizeConnectionString(rawConnectionString);
const pool = new Pool({
  connectionString,
  ssl: isSupabaseHost(connectionString) ? { rejectUnauthorized: false } : undefined,
});

const defaults = {
  userId: seedUserId,
  companyName: "Your Company",
  companyAddress: "Street 1, City",
  companyEmail: "hello@example.com",
  companyPhone: "+421900000000",
  defaultLanguage: "sk",
  defaultCurrency: "EUR",
  vatRate: 20,
  numberingYear: new Date().getFullYear(),
  numberingCounter: 0,
};

async function ensureSettings() {
  await pool.query(
    `INSERT INTO settings (
      user_id,
      company_name,
      company_address,
      company_email,
      company_phone,
      default_language,
      default_currency,
      vat_rate,
      numbering_year,
      numbering_counter
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (user_id) DO NOTHING`,
    [
      defaults.userId,
      defaults.companyName,
      defaults.companyAddress,
      defaults.companyEmail,
      defaults.companyPhone,
      defaults.defaultLanguage,
      defaults.defaultCurrency,
      defaults.vatRate,
      defaults.numberingYear,
      defaults.numberingCounter,
    ],
  );

  const { rows } = await pool.query(
    `SELECT
      user_id AS "userId",
      default_language AS "defaultLanguage",
      default_currency AS "defaultCurrency",
      vat_rate AS "vatRate"
    FROM settings
    WHERE user_id = $1
    LIMIT 1`,
    [seedUserId],
  );

  const settings = rows[0];

  if (!settings) {
    throw new Error("SETTINGS_INIT_FAILED");
  }

  console.log("Settings initialized", {
    userId: settings.userId,
    defaultLanguage: settings.defaultLanguage,
    defaultCurrency: settings.defaultCurrency,
    vatRate: String(settings.vatRate),
  });
}

async function ensureSeedTables() {
  const snippetCountRes = await pool.query(
    `SELECT COUNT(*)::int AS count FROM snippets WHERE user_id = $1`,
    [seedUserId],
  );

  if ((snippetCountRes.rows[0]?.count ?? 0) === 0) {
    await pool.query(
      `INSERT INTO snippets (id, user_id, type, language, title, content_markdown)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        `snp_${randomUUID().replace(/-/g, "")}`,
        seedUserId,
        "intro",
        "sk",
        "Uvod - standard",
        "Dakujeme za zaujem o spolupracu.",
      ],
    );
  }
}

async function main() {
  await ensureSettings();
  await ensureSeedTables();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
