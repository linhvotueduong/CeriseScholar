import { NextResponse } from "next/server";
import {
  BETA_WAITLIST_OAUTH_COOKIE,
  createWaitlistConsentPayload,
  encodeWaitlistConsentCookie,
} from "@/lib/beta/consent";

export async function POST() {
  const payload = createWaitlistConsentPayload("google");
  const response = NextResponse.json({ ok: true });

  response.cookies.set(BETA_WAITLIST_OAUTH_COOKIE, encodeWaitlistConsentCookie(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });

  return response;
}
