-- ============================================
-- Cerise Scholar — Dashboard AI Evaluation Storage + Progress Feedback (migration 019)
-- Stores the deterministic AI quality evaluator's output, and the user's "is this
-- accurate?" feedback as SEPARATE calibration data. Feedback never overwrites progress;
-- it is collected for later tuning. The evaluator remains the source of truth.
--
-- Idempotent / re-run safe (CREATE TABLE/POLICY/INDEX IF NOT EXISTS, drop-then-create
-- policies). Additive only. Apply via the Supabase dashboard SQL Editor — paste ONLY
-- the SQL below.
-- ============================================

-- Latest evaluator snapshot per user+project (upserted).
CREATE TABLE IF NOT EXISTS public.dashboard_ai_evaluations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  signals        JSONB NOT NULL DEFAULT '{}'::jsonb,   -- AiQualitySignals
  section_scores JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { sectionId: percent }
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id)
);

ALTER TABLE public.dashboard_ai_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own ai evaluations" ON public.dashboard_ai_evaluations;
CREATE POLICY "Users view own ai evaluations" ON public.dashboard_ai_evaluations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own ai evaluations" ON public.dashboard_ai_evaluations;
CREATE POLICY "Users insert own ai evaluations" ON public.dashboard_ai_evaluations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own ai evaluations" ON public.dashboard_ai_evaluations;
CREATE POLICY "Users update own ai evaluations" ON public.dashboard_ai_evaluations FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own ai evaluations" ON public.dashboard_ai_evaluations;
CREATE POLICY "Users delete own ai evaluations" ON public.dashboard_ai_evaluations FOR DELETE USING (auth.uid() = user_id);

-- Append-only user feedback on section progress (calibration data).
CREATE TABLE IF NOT EXISTS public.dashboard_progress_feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  section_id        TEXT NOT NULL,
  verdict           TEXT NOT NULL CHECK (verdict IN ('too_high', 'about_right', 'too_low')),
  evaluated_percent NUMERIC,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_progress_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own progress feedback" ON public.dashboard_progress_feedback;
CREATE POLICY "Users view own progress feedback" ON public.dashboard_progress_feedback FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own progress feedback" ON public.dashboard_progress_feedback;
CREATE POLICY "Users insert own progress feedback" ON public.dashboard_progress_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own progress feedback" ON public.dashboard_progress_feedback;
CREATE POLICY "Users delete own progress feedback" ON public.dashboard_progress_feedback FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_progress_feedback_user_project_section
  ON public.dashboard_progress_feedback (user_id, project_id, section_id, created_at DESC);
