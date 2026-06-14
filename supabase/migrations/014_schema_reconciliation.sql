-- ============================================
-- Cerise Scholar — Schema Reconciliation (012)
-- Brings the migration files in line with the live database (snapshot 2026-06-14).
--
-- 1. Documents 5 columns that already exist in production but were never in the
--    migration files, so a fresh rebuild matches live.
-- 2. Re-asserts the performance indexes from migration 005, which were not
--    applied to all environments (live had only primary-key indexes on
--    highlights / annotations / literature_review_entries).
-- 3. Adds user_id indexes that support row-level-security filtering.
--
-- Fully idempotent and additive: ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
-- Touches no existing data.
-- ============================================

-- 1. Columns present in live but missing from migration history
ALTER TABLE public.pdfs ADD COLUMN IF NOT EXISTS pdf_author TEXT;
ALTER TABLE public.pdfs ADD COLUMN IF NOT EXISTS pdf_title TEXT;
ALTER TABLE public.pdfs ADD COLUMN IF NOT EXISTS pdf_subject TEXT;
ALTER TABLE public.literature_review_entries ADD COLUMN IF NOT EXISTS apa_reference TEXT;
ALTER TABLE public.literature_review_entries ADD COLUMN IF NOT EXISTS synthesis_paragraph TEXT;

-- 2. Performance indexes from migration 005 (re-asserted for environments that missed them)
CREATE INDEX IF NOT EXISTS idx_pdfs_project_id ON public.pdfs(project_id);
CREATE INDEX IF NOT EXISTS idx_pdfs_user_id ON public.pdfs(user_id);
CREATE INDEX IF NOT EXISTS idx_highlights_pdf_id ON public.highlights(pdf_id);
CREATE INDEX IF NOT EXISTS idx_annotations_pdf_id ON public.annotations(pdf_id);
CREATE INDEX IF NOT EXISTS idx_annotations_highlight_id ON public.annotations(highlight_id);
CREATE INDEX IF NOT EXISTS idx_lit_review_project_id ON public.literature_review_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_lit_review_pdf_id ON public.literature_review_entries(pdf_id);
CREATE INDEX IF NOT EXISTS idx_lit_review_highlight_id ON public.literature_review_entries(highlight_id);
CREATE INDEX IF NOT EXISTS idx_codes_project_id ON public.codes(project_id);
CREATE INDEX IF NOT EXISTS idx_paper_sections_project_id ON public.paper_sections(project_id);

-- 3. user_id indexes supporting RLS filtering (previously missing)
CREATE INDEX IF NOT EXISTS idx_highlights_user_id ON public.highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON public.annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_lit_review_user_id ON public.literature_review_entries(user_id);
