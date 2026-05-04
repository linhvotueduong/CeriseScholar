import type { RequiredLegalDocument } from "@/types/legal";

export const BETA_WAITLIST_OAUTH_COOKIE = "cerise_beta_waitlist_consent";

export const REQUIRED_WAITLIST_LEGAL_DOCUMENTS: RequiredLegalDocument[] = [
  {
    slug: "terms",
    title: "Terms of Service",
    version: "2026-05-04",
    content_hash: "sha256:e3a6ee6d284eee5b2cfa3d350e27a615b3f6b7ca16bec671ba059cd9c91e392a",
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    version: "2026-05-03",
    content_hash: "sha256:42701a58741015941dd69745a47ae5c3a9ea1b69d776163ff1461195c8517a26",
  },
];

export type WaitlistConsentPayload = {
  accepted: true;
  accepted_at: string;
  context: "beta_waitlist_signup";
  signup_method: "email" | "google" | "unknown";
  documents: RequiredLegalDocument[];
};

export function createWaitlistConsentPayload(
  signupMethod: WaitlistConsentPayload["signup_method"],
): WaitlistConsentPayload {
  return {
    accepted: true,
    accepted_at: new Date().toISOString(),
    context: "beta_waitlist_signup",
    signup_method: signupMethod,
    documents: REQUIRED_WAITLIST_LEGAL_DOCUMENTS,
  };
}

export function encodeWaitlistConsentCookie(payload: WaitlistConsentPayload) {
  return encodeURIComponent(JSON.stringify(payload));
}

export function parseWaitlistConsentCookie(value?: string | null): WaitlistConsentPayload | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<WaitlistConsentPayload>;
    if (parsed.accepted !== true || parsed.context !== "beta_waitlist_signup") return null;
    if (!Array.isArray(parsed.documents)) return null;

    return {
      accepted: true,
      accepted_at: typeof parsed.accepted_at === "string" ? parsed.accepted_at : new Date().toISOString(),
      context: "beta_waitlist_signup",
      signup_method:
        parsed.signup_method === "email" || parsed.signup_method === "google" ? parsed.signup_method : "unknown",
      documents: parsed.documents as RequiredLegalDocument[],
    };
  } catch {
    return null;
  }
}
