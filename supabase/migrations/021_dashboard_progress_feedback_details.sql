-- ============================================
-- Cerise Scholar — Progress Feedback Detail Fields (migration 021)
-- Adds optional calibration fields to append-only dashboard progress feedback.
-- Additive only: no data is dropped or rewritten.
-- ============================================

ALTER TABLE public.dashboard_progress_feedback
  ADD COLUMN IF NOT EXISTS suggested_percent NUMERIC CHECK (
    suggested_percent IS NULL OR (suggested_percent >= 0 AND suggested_percent <= 100)
  ),
  ADD COLUMN IF NOT EXISTS explanation TEXT;

