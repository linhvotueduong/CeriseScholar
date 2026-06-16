-- ============================================
-- Cerise Scholar — Dashboard Task Recommendations (remote migration 017)
-- Adds recommendation-engine metadata to the existing dashboard_tasks table
-- (created in 013). Phase C of the dashboard backend roadmap: the Today's
-- Schedule recommendation engine.
--
-- Idempotent / re-run safe:
--   - every column guarded by ADD COLUMN IF NOT EXISTS
--   - additive only: never alters existing columns or drops data
--
-- Field notes:
--   - origin: 'default' | 'recommended' | 'manual' (how the task was created)
--   - counts_toward_daily_target: manual tasks default false unless opted in;
--     recommended/default tasks count
--   - input_hash: lets the engine REUSE today's recommendation when the inputs
--     (pace + per-section progress + date) are unchanged, instead of regenerating
--   - recommendation_run_id: groups the 4 tasks produced by one engine run
--
-- Apply via the Supabase dashboard SQL Editor (NOT `supabase db push`), per
-- docs/backend-foundation-roadmap.md. NOTE: paste ONLY the SQL below — no
-- surrounding numbered steps or prose, or Postgres will report a syntax error.
-- ============================================

ALTER TABLE public.dashboard_tasks
  ADD COLUMN IF NOT EXISTS task_weight                NUMERIC,
  ADD COLUMN IF NOT EXISTS counts_toward_daily_target BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS origin                     TEXT NOT NULL DEFAULT 'default'
    CHECK (origin IN ('default', 'recommended', 'manual')),
  ADD COLUMN IF NOT EXISTS recommendation_run_id      UUID,
  ADD COLUMN IF NOT EXISTS input_hash                 TEXT,
  ADD COLUMN IF NOT EXISTS estimated_minutes          INT,
  ADD COLUMN IF NOT EXISTS difficulty                 TEXT
    CHECK (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard'));
