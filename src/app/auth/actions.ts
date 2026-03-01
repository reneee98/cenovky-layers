"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserBootstrapData } from "@/server/db/user-bootstrap";

function buildPath(pathname: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (!value || value.trim().length === 0) {
      continue;
    }

    params.set(key, value);
  }

  const qs = params.toString();
  return qs.length > 0 ? `${pathname}?${qs}` : pathname;
}

async function getRequestOrigin(): Promise<string> {
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");

  if (host) {
    const protocol = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return "http://localhost:3000";
}

function normalizeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "/";
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/")) {
    return "/";
  }

  return trimmed;
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")).trim() : "";
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const next = normalizeNextPath(formData.get("next"));

  if (!email || !password) {
    redirect(
      buildPath("/auth/login", {
        next,
        error: "Zadaj email a heslo.",
      }),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      buildPath("/auth/login", {
        next,
        error: "Prihlasenie zlyhalo. Skontroluj email a heslo.",
      }),
    );
  }

  redirect(next);
}

export async function signupAction(formData: FormData): Promise<void> {
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")).trim() : "";
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const confirmPassword =
    typeof formData.get("confirm_password") === "string" ? String(formData.get("confirm_password")) : "";

  if (!email || !password) {
    redirect(buildPath("/auth/signup", { error: "Zadaj email a heslo." }));
  }

  if (password.length < 8) {
    redirect(buildPath("/auth/signup", { error: "Heslo musi mat aspon 8 znakov." }));
  }

  if (password !== confirmPassword) {
    redirect(buildPath("/auth/signup", { error: "Hesla sa nezhoduju." }));
  }

  const supabase = await createSupabaseServerClient();
  const origin = await getRequestOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect(buildPath("/auth/signup", { error: "Registracia zlyhala. Skus to znova." }));
  }

  if (data.user) {
    await ensureUserBootstrapData(data.user.id);
  }

  if (data.session) {
    redirect("/");
  }

  redirect(
    buildPath("/auth/login", {
      notice: "Ucet bol vytvoreny. Dokonci overenie cez email a prihlas sa.",
    }),
  );
}

export async function forgotPasswordAction(formData: FormData): Promise<void> {
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")).trim() : "";

  if (!email) {
    redirect(buildPath("/auth/forgot-password", { error: "Zadaj email." }));
  }

  const supabase = await createSupabaseServerClient();
  const origin = await getRequestOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
  });

  if (error) {
    redirect(
      buildPath("/auth/forgot-password", {
        error: "Nepodarilo sa odoslat email na reset hesla.",
      }),
    );
  }

  redirect(
    buildPath("/auth/forgot-password", {
      notice: "Ak ucet existuje, poslali sme instrukcie na reset hesla.",
    }),
  );
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const confirmPassword =
    typeof formData.get("confirm_password") === "string" ? String(formData.get("confirm_password")) : "";

  if (password.length < 8) {
    redirect(buildPath("/auth/reset-password", { error: "Heslo musi mat aspon 8 znakov." }));
  }

  if (password !== confirmPassword) {
    redirect(buildPath("/auth/reset-password", { error: "Hesla sa nezhoduju." }));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      buildPath("/auth/login", {
        error: "Link na reset hesla uz nie je platny. Poziadaj o novy.",
      }),
    );
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirect(
      buildPath("/auth/reset-password", {
        error: "Nepodarilo sa aktualizovat heslo.",
      }),
    );
  }

  redirect(
    buildPath("/auth/login", {
      notice: "Heslo bolo uspesne zmenene. Prihlas sa novym heslom.",
    }),
  );
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
