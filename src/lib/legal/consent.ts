import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequiredLegalDocument } from "@/types/legal";

export const REQUIRED_LEGAL_DOCUMENTS: RequiredLegalDocument[] = [
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
  {
    slug: "ai-data-use",
    title: "AI Data Use Notice",
    version: "2026-05-03",
    content_hash: "sha256:fc1ac3eb379cc663067d167c786adc102e4b5b8afbc7b65f680f0fc09aa4ee64",
  },
  {
    slug: "beta-terms",
    title: "Beta Participation Terms",
    version: "2026-05-03",
    content_hash: "sha256:7515474d25eacb361992779d06266d480c5208bcce6a2b6590f19bc83f8190ba",
  },
];

export function isLegalConsentRequired() {
  return process.env.LEGAL_CONSENT_REQUIRED === "true";
}

export function getRequiredLegalDocuments() {
  return REQUIRED_LEGAL_DOCUMENTS;
}

export function sanitizeLegalRedirect(raw: FormDataEntryValue | string | string[] | undefined | null) {
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

export async function hasRequiredLegalConsent(supabase: SupabaseClient, userId: string) {
  if (!isLegalConsentRequired()) {
    return { hasConsent: true, error: null as string | null };
  }

  const requiredDocuments = getRequiredLegalDocuments();
  const requiredSlugs = requiredDocuments.map((document) => document.slug);
  const { data, error } = await supabase
    .from("user_consents")
    .select("document_slug, document_version, document_hash")
    .eq("user_id", userId)
    .in("document_slug", requiredSlugs);

  if (error) {
    return { hasConsent: false, error: error.message };
  }

  const accepted = new Set(
    (data || []).map((record) => `${record.document_slug}:${record.document_version}:${record.document_hash}`),
  );

  const hasConsent = requiredDocuments.every((document) =>
    accepted.has(`${document.slug}:${document.version}:${document.content_hash}`),
  );

  return { hasConsent, error: null as string | null };
}
