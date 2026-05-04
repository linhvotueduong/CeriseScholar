export type LegalDocumentKey = "terms" | "privacy" | "ai-data-use" | "beta-terms";

export interface RequiredLegalDocument {
  slug: LegalDocumentKey;
  title: string;
  version: string;
  content_hash: string;
}

export interface LegalDocumentRecord {
  id: string;
  slug: LegalDocumentKey;
  title: string;
  version: string;
  content_hash: string;
  effective_date: string;
  created_at: string;
}

export interface UserConsentRecord {
  id: string;
  user_id: string;
  document_slug: LegalDocumentKey;
  document_version: string;
  document_hash: string;
  ip_address: string | null;
  user_agent: string;
  accepted_at: string;
}
