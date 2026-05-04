import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasRequiredLegalConsent } from "@/lib/legal/consent";
import { BETA_WAITLIST_OAUTH_COOKIE, parseWaitlistConsentCookie } from "@/lib/beta/consent";
import {
  ensureBetaWaitlistForCurrentUser,
  getBetaAccessForUser,
  getSignupMethodFromUser,
} from "@/lib/beta/server";
import { isApprovedBetaStatus, isBetaWaitlistRequired } from "@/lib/beta/config";

function getSiteOrigin(request: Request) {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

/**
 * Handles the auth callback after a user clicks the confirmation link in their email.
 * Supabase sends them here with a "code" in the URL, which we exchange for a session.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteOrigin = getSiteOrigin(request);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = data.user;
      if (user) {
        let waitlistRedirect: NextResponse | null = null;

        if (isBetaWaitlistRequired()) {
          const consentCookie = request.headers
            .get("cookie")
            ?.split(";")
            .map((part) => part.trim())
            .find((part) => part.startsWith(`${BETA_WAITLIST_OAUTH_COOKIE}=`))
            ?.slice(BETA_WAITLIST_OAUTH_COOKIE.length + 1);
          const waitlistConsent = parseWaitlistConsentCookie(consentCookie);
          await ensureBetaWaitlistForCurrentUser(
            supabase,
            user,
            waitlistConsent?.signup_method ?? getSignupMethodFromUser(user),
            waitlistConsent,
          );

          const betaAccess = await getBetaAccessForUser(supabase, user);
          if (
            betaAccess.error ||
            (betaAccess.status !== "admin_approved" && !isApprovedBetaStatus(betaAccess.status))
          ) {
            waitlistRedirect = NextResponse.redirect(new URL("/waitlist/status", siteOrigin));
          }
        }

        if (waitlistRedirect) {
          waitlistRedirect.cookies.set(BETA_WAITLIST_OAUTH_COOKIE, "", {
            path: "/",
            maxAge: 0,
          });
          return waitlistRedirect;
        }

        const consent = await hasRequiredLegalConsent(supabase, user.id);
        if (!consent.hasConsent) {
          const legalRedirect = NextResponse.redirect(new URL("/legal/consent?next=/dashboard", siteOrigin));
          legalRedirect.cookies.set(BETA_WAITLIST_OAUTH_COOKIE, "", {
            path: "/",
            maxAge: 0,
          });
          return legalRedirect;
        }
      }

      const dashboardRedirect = NextResponse.redirect(new URL("/dashboard", siteOrigin));
      dashboardRedirect.cookies.set(BETA_WAITLIST_OAUTH_COOKIE, "", {
        path: "/",
        maxAge: 0,
      });
      return dashboardRedirect;
    }
  }

  // If something went wrong, redirect to login with an error
  return NextResponse.redirect(new URL("/login?error=auth-callback-failed", siteOrigin));
}
