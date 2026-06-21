-- ============================================
-- Cerise Scholar — Dashboard Project Model (remote migration 018)
-- Adds project type + scope to dashboard_project_settings so the unified 1000-point
-- Today's Target model can be sized per user/project. Step 2.5 of the dashboard work.
--
-- Idempotent / re-run safe: every column guarded by ADD COLUMN IF NOT EXISTS.
-- Additive only: never alters existing columns or drops data.
--
-- project_type  : one of the 10 project types (text; app validates the value).
-- project_scope : JSONB { expectedSources, expectedPagesOrSections, quality,
--                 complexity, metaAnalysisRequired } — adjusts section targets and
--                 deadline pressure only; it never changes the 1000-point total.
--
-- Apply via the Supabase dashboard SQL Editor (NOT `supabase db push`). Paste ONLY
-- the SQL below — no surrounding numbered steps or prose, or Postgres errors.
-- ============================================

ALTER TABLE public.dashboard_project_settings
  ADD COLUMN IF NOT EXISTS project_type  TEXT NOT NULL DEFAULT 'personal-research-project',
  ADD COLUMN IF NOT EXISTS project_scope JSONB NOT NULL DEFAULT '{}'::jsonb;
