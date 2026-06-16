-- ============================================
-- Cerise Scholar — Dashboard Target Pacing (remote migration 016)
-- Adds per-user/per-project "Today's Target" pacing fields to the existing
-- dashboard_project_settings table (created in 013). Phase B of the dashboard
-- backend roadmap: persist the Today's Target settings popup.
--
-- Idempotent / re-run safe:
--   - every column guarded by ADD COLUMN IF NOT EXISTS
--   - additive only: never alters existing columns or drops data
--
-- Settled decisions (2026-06-16):
--   - pace default = 'moderate' (the demo/preview seed may still use 'high';
--     demo never persists, so the two never conflict)
--   - work days stored as a WEEKDAY ARRAY, not a count: 0=Sun .. 6=Sat,
--     default {1,2,3,4,5} (Mon–Fri). The UI may display "5 days" but formulas
--     read the array.
--
-- Apply via the Supabase dashboard SQL Editor (NOT `supabase db push`), per
-- docs/backend-foundation-roadmap.md — live migration history is reconciled but
-- the SQL Editor is the safe path until migration tracking is fully linked.
-- ============================================

ALTER TABLE public.dashboard_project_settings
  ADD COLUMN IF NOT EXISTS pace                  TEXT NOT NULL DEFAULT 'moderate'
    CHECK (pace IN ('low', 'moderate', 'high')),
  ADD COLUMN IF NOT EXISTS work_weekdays         SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}',
  ADD COLUMN IF NOT EXISTS skipped_dates         DATE[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS manual_target_date    DATE,
  ADD COLUMN IF NOT EXISTS manual_target_percent NUMERIC;
