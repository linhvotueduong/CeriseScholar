import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail, isApprovedBetaStatus, isBetaWaitlistRequired } from "@/lib/beta/config";
import type { BetaSignupMethod, BetaWaitlistApplication, BetaWaitlistStatus } from "@/types/beta";
import type { WaitlistConsentPayload } from "@/lib/beta/consent";

export type BetaAccessResult = {
  status: BetaWaitlistStatus | "admin_approved" | "not_required" | "not_requested" | "unknown";
  application: BetaWaitlistApplication | null;
  error: string | null;
};

export function sanitizeBetaRedirect(raw: string | string[] | undefined | null) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const path = typeof value === "string" ? value.trim() : "";

  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return "/dashboard";
  }

  if (path.startsWith("/login") || path.startsWith("/signup") || path.startsWith("/auth/")) {
    return "/dashboard";
  }

  return path;
}

function normalizeSignupMethod(method?: string | null): BetaSignupMethod {
  if (method === "email" || method === "google") return method;
  return "unknown";
}

export function getSignupMethodFromUser(user: User): BetaSignupMethod {
  const provider = user.app_metadata?.provider;
  return normalizeSignupMethod(typeof provider === "string" ? provider : null);
}

export async function ensureBetaWaitlistForCurrentUser(
  supabase: SupabaseClient,
  user: User,
  signupMethod?: BetaSignupMethod,
  consent?: WaitlistConsentPayload | null,
) {
  const method = signupMethod ?? getSignupMethodFromUser(user);
  const { error } = await supabase.rpc("ensure_beta_waitlist_application", {
    p_signup_method: method,
    p_consent: consent ?? {},
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

export async function getBetaAccessForUser(supabase: SupabaseClient, user: User): Promise<BetaAccessResult> {
  if (!isBetaWaitlistRequired()) {
    return { status: "not_required", application: null, error: null };
  }

  if (isAdminEmail(user.email)) {
    return { status: "admin_approved", application: null, error: null };
  }

  const { data, error } = await supabase
    .from("beta_waitlist_applications")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { status: "unknown", application: null, error: error.message };
  }

  if (!data) {
    return { status: "not_requested", application: null, error: null };
  }

  return {
    status: data.status as BetaWaitlistStatus,
    application: data as BetaWaitlistApplication,
    error: null,
  };
}

export async function requireBetaAccessForCurrentUser(nextPath = "/dashboard") {
  if (!isBetaWaitlistRequired()) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(sanitizeBetaRedirect(nextPath))}`);
  }

  const access = await getBetaAccessForUser(supabase, user);
  if (access.error) {
    redirect(`/waitlist/status?next=${encodeURIComponent(sanitizeBetaRedirect(nextPath))}`);
  }

  if (access.status === "admin_approved" || isApprovedBetaStatus(access.status)) {
    return;
  }

  redirect(`/waitlist/status?next=${encodeURIComponent(sanitizeBetaRedirect(nextPath))}`);
}
