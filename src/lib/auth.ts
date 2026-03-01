import { cache } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserBootstrapData } from "@/server/db/user-bootstrap";

const getSessionUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export async function getOptionalUser() {
  return getSessionUser();
}

export async function requireUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login");
  }

  await ensureUserBootstrapData(user.id);

  return user;
}

export async function requireUserId() {
  const user = await requireUser();
  return user.id;
}
