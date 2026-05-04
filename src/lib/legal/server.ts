import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  hasRequiredLegalConsent,
  isLegalConsentRequired,
  sanitizeLegalRedirect,
} from "@/lib/legal/consent";

export async function requireLegalConsentForCurrentUser(nextPath = "/dashboard") {
  if (!isLegalConsentRequired()) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(sanitizeLegalRedirect(nextPath))}`);
  }

  const consent = await hasRequiredLegalConsent(supabase, user.id);
  if (!consent.hasConsent) {
    redirect(`/legal/consent?next=${encodeURIComponent(sanitizeLegalRedirect(nextPath))}`);
  }
}
