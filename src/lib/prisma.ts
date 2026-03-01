import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
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
  const supabaseDbPassword = process.env.SUPABASE_DB_PASSWORD ?? process.env.SUPABASE_DB_PASS;

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

function resolveConnectionString(): string | undefined {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.SUPABASE_DATABASE_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    inferSupabaseDirectUrl()
  );
}

function createPrismaClient(): PrismaClient {
  const rawConnectionString = resolveConnectionString();

  if (!rawConnectionString) {
    throw new Error(
      "Supabase/Postgres connection is not set. Provide SUPABASE_DB_URL (or DATABASE_URL / POSTGRES_URL / POSTGRES_PRISMA_URL).",
    );
  }

  const connectionString = normalizeConnectionString(rawConnectionString);
  const adapter = new PrismaPg({
    connectionString,
    ssl: isSupabaseHost(connectionString) ? { rejectUnauthorized: false } : undefined,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient() as unknown as Record<PropertyKey, unknown>;
    const value = client[prop];

    if (typeof value === "function") {
      return value.bind(client);
    }

    return value;
  },
}) as PrismaClient;
