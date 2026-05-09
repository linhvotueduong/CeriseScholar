import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/auth/complete-profile", siteOrigin));
    }
  }

  // If something went wrong, redirect to login with an error
  return NextResponse.redirect(new URL("/login?error=auth-callback-failed", siteOrigin));
}
