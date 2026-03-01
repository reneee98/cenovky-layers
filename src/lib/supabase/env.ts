const MISSING_ENV_MESSAGE =
  "Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";

function readFirstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

export function getSupabaseUrl(): string {
  const value = readFirstNonEmpty(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
  );

  if (!value) {
    throw new Error(MISSING_ENV_MESSAGE);
  }

  return value;
}

export function getSupabasePublishableKey(): string {
  const value = readFirstNonEmpty(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
  );

  if (!value) {
    throw new Error(MISSING_ENV_MESSAGE);
  }

  return value;
}
