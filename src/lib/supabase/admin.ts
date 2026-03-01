import { createClient } from "@supabase/supabase-js";

import { getSupabaseUrl } from "@/lib/supabase/env";

function getServiceRoleKey(): string | undefined {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.trim().length === 0) {
    return undefined;
  }

  return key;
}

export function hasSupabaseAdminClient(): boolean {
  return Boolean(getServiceRoleKey());
}

export function createSupabaseAdminClient() {
  const serviceRoleKey = getServiceRoleKey();

  if (!serviceRoleKey) {
    return null;
  }

  return createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

