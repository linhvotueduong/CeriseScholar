-- ============================================
-- Cerise Scholar - legal documents and consent records
-- Additive, append-only foundation for limited public beta consent.
-- This migration does not alter existing user content, auth settings,
-- Cloudflare, DNS, tunnel, storage, course, PDF, project, or AI tables.
-- ============================================

CREATE TABLE public.legal_documents (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug           TEXT NOT NULL,
  title          TEXT NOT NULL,
  version        TEXT NOT NULL,
  content_hash   TEXT NOT NULL,
  effective_date DATE NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, version)
);

CREATE TABLE public.user_consents (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_slug    TEXT NOT NULL,
  document_version TEXT NOT NULL,
  document_hash    TEXT NOT NULL,
  accepted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address       TEXT,
  user_agent       TEXT,
  UNIQUE (user_id, document_slug, document_version, document_hash)
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view legal documents"
  ON public.legal_documents FOR SELECT
  USING (true);

CREATE POLICY "Users can view own consents"
  ON public.user_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents"
  ON public.user_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_legal_documents_slug_version
  ON public.legal_documents(slug, version);

CREATE INDEX idx_user_consents_user_document
  ON public.user_consents(user_id, document_slug, document_version, document_hash);

CREATE INDEX idx_user_consents_user_accepted
  ON public.user_consents(user_id, accepted_at DESC);

INSERT INTO public.legal_documents (slug, title, version, content_hash, effective_date)
VALUES
  (
    'terms',
    'Terms of Service',
    '2026-05-04',
    'sha256:e3a6ee6d284eee5b2cfa3d350e27a615b3f6b7ca16bec671ba059cd9c91e392a',
    DATE '2026-05-04'
  ),
  (
    'privacy',
    'Privacy Policy',
    '2026-05-03',
    'sha256:42701a58741015941dd69745a47ae5c3a9ea1b69d776163ff1461195c8517a26',
    DATE '2026-05-03'
  ),
  (
    'ai-data-use',
    'AI Data Use Notice',
    '2026-05-03',
    'sha256:fc1ac3eb379cc663067d167c786adc102e4b5b8afbc7b65f680f0fc09aa4ee64',
    DATE '2026-05-03'
  ),
  (
    'beta-terms',
    'Beta Participation Terms',
    '2026-05-03',
    'sha256:7515474d25eacb361992779d06266d480c5208bcce6a2b6590f19bc83f8190ba',
    DATE '2026-05-03'
  )
ON CONFLICT (slug, version) DO UPDATE
SET
  title = EXCLUDED.title,
  content_hash = EXCLUDED.content_hash,
  effective_date = EXCLUDED.effective_date;
