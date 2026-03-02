import { randomUUID } from "node:crypto";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

type Queryable = Pool | PoolClient;

const globalForDb = globalThis as unknown as {
  dbPool: Pool | undefined;
};

function normalizeConnectionString(rawConnectionString: string): string {
  try {
    const url = new URL(rawConnectionString);
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return rawConnectionString;
  }
}

function isSupabaseHost(connectionString: string): boolean {
  try {
    const hostname = new URL(connectionString).hostname;
    return hostname.includes("supabase.co") || hostname.includes("supabase.com");
  } catch {
    return false;
  }
}

function inferSupabaseDirectUrl(): string | undefined {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseDbPassword =
    process.env.SUPABASE_DB_PASSWORD ??
    process.env.SUPABASE_DB_PASS ??
    process.env.SUPABASE_PASSWORD ??
    process.env.DB_PASSWORD;

  if (!supabaseUrl || !supabaseDbPassword) {
    return undefined;
  }

  let projectRef: string;
  try {
    const hostname = new URL(supabaseUrl).hostname;
    projectRef = hostname.split(".")[0] ?? "";
  } catch {
    return undefined;
  }

  if (!projectRef) {
    return undefined;
  }

  const encodedPassword = encodeURIComponent(supabaseDbPassword);
  return `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`;
}

function inferSupabasePoolerUrl(): string | undefined {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseDbPassword =
    process.env.SUPABASE_DB_PASSWORD ??
    process.env.SUPABASE_DB_PASS ??
    process.env.SUPABASE_PASSWORD ??
    process.env.DB_PASSWORD;

  if (!supabaseUrl || !supabaseDbPassword) {
    return undefined;
  }

  let projectRef: string;
  try {
    const hostname = new URL(supabaseUrl).hostname;
    projectRef = hostname.split(".")[0] ?? "";
  } catch {
    return undefined;
  }

  if (!projectRef) {
    return undefined;
  }

  const region = process.env.SUPABASE_POOLER_REGION ?? "eu-west-1";
  const encodedPassword = encodeURIComponent(supabaseDbPassword);
  return `postgresql://postgres.${projectRef}:${encodedPassword}@aws-1-${region}.pooler.supabase.com:6543/postgres`;
}

function resolveConnectionString(): string | undefined {
  const explicit =
    process.env.SUPABASE_DB_URL ??
    process.env.SUPABASE_POOLER_URL ??
    process.env.SUPABASE_DB_POOLER_URL ??
    process.env.SUPABASE_DATABASE_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING;

  if (explicit) {
    return explicit;
  }

  return inferSupabaseDirectUrl() ?? inferSupabasePoolerUrl();
}

function createPool(): Pool {
  const rawConnectionString = resolveConnectionString();

  if (!rawConnectionString) {
    throw new Error(
      "Supabase/Postgres connection is not set. Provide SUPABASE_DB_URL (or DATABASE_URL / POSTGRES_URL).",
    );
  }

  const connectionString = normalizeConnectionString(rawConnectionString);

  return new Pool({
    connectionString,
    ssl: isSupabaseHost(connectionString) ? { rejectUnauthorized: false } : undefined,
  });
}

function getPool(): Pool {
  if (!globalForDb.dbPool) {
    globalForDb.dbPool = createPool();
  }

  return globalForDb.dbPool;
}

function mapDbError(error: unknown): unknown {
  if (!error || typeof error !== "object") {
    return error;
  }

  const pgCode = (error as { code?: string }).code;
  if (pgCode === "23505") {
    (error as { code: string }).code = "P2002";
    return error;
  }

  if (pgCode === "23503") {
    (error as { code: string }).code = "P2003";
    return error;
  }

  return error;
}

export function createNotFoundError(message = "NOT_FOUND"): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = "P2025";
  return error;
}

export async function dbQuery<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: Queryable,
): Promise<T[]> {
  const db = client ?? getPool();

  try {
    const result = await db.query<T>(text, params);
    return result.rows;
  } catch (error) {
    throw mapDbError(error);
  }
}

export async function dbQueryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: Queryable,
): Promise<T | null> {
  const rows = await dbQuery<T>(text, params, client);
  return rows[0] ?? null;
}

export async function dbTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw mapDbError(error);
  } finally {
    client.release();
  }
}

/**
 * Runs a callback with Supabase RLS context set so auth.uid() returns the given userId.
 * If setting the session fails (e.g. role "authenticated" missing), the callback still runs
 * on the same connection (RLS may be bypassed by postgres role).
 */
export async function runWithSupabaseAuth<T>(
  userId: string,
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    try {
      await client.query(`SET LOCAL request.jwt.claims = $1`, [
        JSON.stringify({ sub: userId }),
      ]);
      await client.query("SET LOCAL ROLE authenticated");
    } catch {
      // Ignore: session vars may not be supported; continue with same connection
    }
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw mapDbError(error);
  } finally {
    client.release();
  }
}

export async function dbDisconnect(): Promise<void> {
  if (!globalForDb.dbPool) {
    return;
  }

  await globalForDb.dbPool.end();
  globalForDb.dbPool = undefined;
}

export function numericToNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === "object" && "toString" in value) {
    const parsed = Number(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }

  return new Date(String(value));
}

export function createEntityId(prefix: string): string {
  const random = randomUUID().replace(/-/g, "");
  return `${prefix}_${random}`;
}
