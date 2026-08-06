import type { SupabaseClient, User } from "@supabase/supabase-js";
import { AGREEMENT_VERSIONS, type AgreementKey } from "./agreements";

const CONSENT_KEYS: AgreementKey[] = ["terms", "privacy"];

/** Persist the exact server-known legal document rows accepted during signup. */
export async function persistSignupConsents(
  supabase: SupabaseClient,
  user: User
): Promise<{ error: string | null }> {
  const metadata = user.user_metadata as Record<string, unknown>;
  if (typeof metadata.terms_accepted_at !== "string") return { error: null };

  const accepted = new Date(metadata.terms_accepted_at);
  if (Number.isNaN(accepted.getTime())) return { error: "Invalid acceptance timestamp" };

  const { data: documents, error: documentError } = await supabase
    .from("legal_documents")
    .select("slug, version, content_hash")
    .in("slug", CONSENT_KEYS)
    .in("version", Object.values(AGREEMENT_VERSIONS));

  if (documentError) return { error: documentError.message };

  const rows = CONSENT_KEYS.map((slug) => {
    const document = documents?.find(
      (candidate) => candidate.slug === slug && candidate.version === AGREEMENT_VERSIONS[slug]
    );
    return document
      ? {
          user_id: user.id,
          document_slug: slug,
          document_version: document.version,
          document_hash: document.content_hash,
          accepted_at: accepted.toISOString(),
        }
      : null;
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length !== CONSENT_KEYS.length) return { error: "Legal document version not found" };

  const { error } = await supabase.from("user_consents").upsert(rows, {
    onConflict: "user_id,document_slug,document_version,document_hash",
    ignoreDuplicates: true,
  });
  return { error: error?.message ?? null };
}
