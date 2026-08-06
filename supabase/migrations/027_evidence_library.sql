-- ============================================
-- Cerise Scholar — Evidence Library v2 (migration 027)
-- Founder-approved design: a durable, cross-project library of "what did this
-- source contribute" — a NEW system, separate from literature_review_entries
-- (that table remains its own surface for the literature review workflow).
-- One row per saved/analyzed source, populated two ways:
--   - source = 'scholarask': the user clicked Save on a paper in ScholarAsk's
--     paper panel (src/app/dashboard/project/[projectId]/scholar-ask/page.tsx).
--   - source = 'upload'    : a PDF the user uploaded, auto-analyzed right
--     after OCR/text-extraction completes (src/lib/server/evidenceAnalysis.ts,
--     hooked from src/app/api/ocr/route.ts).
--
-- project_id and pdf_id are intentionally PLAIN UUID columns — NOT foreign
-- keys, and with NO cascade from either `projects` or `pdfs` — in the same
-- spirit as ai_usage_events.project_id (migration 023): this is a historical
-- library of "what a source once told the user". A project or PDF being
-- deleted later must never silently delete evidence the user already
-- saved/reviewed — the library outlives the project/PDF it came from.
-- project_id is kept purely so the UI can filter "this project's evidence"
-- while the source project still exists; a dangling project_id after a
-- deletion just means that filter no longer matches — the row and its
-- content persist untouched.
--
-- status: 'pending' (an upload row was created, AI analysis hasn't finished
-- yet), 'ready' (evidence/caveat/doc_type populated, or intentionally left
-- blank for a v1 ScholarAsk save), 'failed' (AI analysis errored — the
-- Retry button in the UI re-runs analyzePdfForEvidence for that row).
--
-- Unique index on (user_id, pdf_id): one evidence_library row per uploaded
-- PDF per user, so re-running analysis (Retry, or a re-upload of the same
-- pdf_id) upserts in place instead of duplicating rows. This is a PLAIN
-- (non-partial) unique index rather than the originally-sketched
-- `WHERE pdf_id IS NOT NULL` partial index: standard SQL unique-index
-- semantics already treat NULL as distinct from NULL, so ScholarAsk rows
-- (pdf_id always NULL) never collide with each other under this constraint —
-- the partial predicate would add friction with PostgREST's upsert
-- (`ON CONFLICT` target inference on a partial index requires repeating its
-- WHERE clause, which the supabase-js upsert() call cannot express) without
-- changing the actual behavior. Same practical effect, cleaner upsert.
--
-- Hardened style matching migration 023: explicit `TO authenticated` on every
-- policy, explicit GRANT lines. Unlike the append-only usage log, this table
-- IS user-editable (the card/subpage lets users remove a row with the small
-- "x" delete affordance), so UPDATE and DELETE are both granted and policied,
-- owner-only, alongside SELECT/INSERT.
--
-- Idempotent and additive: safe to run more than once. Touches no other table.
-- ============================================

CREATE TABLE IF NOT EXISTS public.evidence_library (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  UUID,
  pdf_id      UUID,
  source      TEXT NOT NULL CHECK (source IN ('scholarask', 'upload')),
  title       TEXT NOT NULL,
  doc_type    TEXT,
  evidence    TEXT,
  caveat      TEXT,
  status      TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('pending', 'ready', 'failed')),
  citation    TEXT,
  url         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_library_user_created
  ON public.evidence_library (user_id, created_at DESC);

-- Backs the upsert in src/lib/server/evidenceAnalysis.ts — one row per
-- (user, pdf). See the note above on why this is a plain (not partial) index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_library_user_pdf_unique
  ON public.evidence_library (user_id, pdf_id);

ALTER TABLE public.evidence_library ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_library TO authenticated;

DROP POLICY IF EXISTS "Users view own evidence library rows" ON public.evidence_library;
CREATE POLICY "Users view own evidence library rows"
  ON public.evidence_library FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own evidence library rows" ON public.evidence_library;
CREATE POLICY "Users insert own evidence library rows"
  ON public.evidence_library FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own evidence library rows" ON public.evidence_library;
CREATE POLICY "Users update own evidence library rows"
  ON public.evidence_library FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own evidence library rows" ON public.evidence_library;
CREATE POLICY "Users delete own evidence library rows"
  ON public.evidence_library FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
