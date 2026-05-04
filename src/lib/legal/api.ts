import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasRequiredLegalConsent, isLegalConsentRequired } from "@/lib/legal/consent";

export async function rejectIfLegalConsentMissing(supabase: SupabaseClient, userId: string) {
  if (!isLegalConsentRequired()) return null;

  const consent = await hasRequiredLegalConsent(supabase, userId);
  if (consent.hasConsent) return null;

  return NextResponse.json(
    {
      error: "Legal consent is required before using this feature.",
      consentRequired: true,
      redirectTo: "/legal/consent",
    },
    { status: 403 }
  );
}
