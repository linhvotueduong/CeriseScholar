-- ============================================
-- Cerise Scholar — AI Behavior Insights (migration 028)
-- Table: ai_behavior_insights — one row per (user, project, day), written by
-- the daily AI guidance job (Stage 2 of "personalized AI data analysis",
-- a later agent) once it runs. This migration only creates the storage the
-- Stage 1 deterministic behavior profile (src/lib/dashboard/behaviorProfile.ts)
-- and Stage 2's guidance note will share — no job writes to it yet.
--
-- `profile` caches the SAME BehaviorProfile JSON the dashboard computed that
-- day, alongside whatever short natural-language `guidance`/`focus_section`
-- Stage 2 derived from it — so a user (or support) can always see exactly
-- which real signals produced a given note (transparency), and so consumers
-- can fail open (a missing/errored row just means "no insight today yet",
-- never a blocking error).
--
-- project_id is nullable: some guidance may be account-level rather than
-- tied to one project. It IS a foreign key here (unlike ai_usage_events,
-- which is an immutable historical log) because this table is a per-day
-- CACHE of current insight, not a log — if a project is deleted, its
-- project-scoped insight rows should go with it.
--
-- Hardened style matching migrations 022/023: explicit `TO authenticated` on
-- every policy, explicit GRANTs, owner-only SELECT/INSERT/UPDATE (no DELETE
-- policy/grant — rows are superseded by the next day's UPSERT, not removed
-- by app code).
--
-- Idempotent and additive: safe to run more than once. Touches no other table.
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_behavior_insights (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  day            DATE NOT NULL,
  profile        JSONB NOT NULL,
  guidance       TEXT,
  focus_section  TEXT,
  model          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id, day)
);

CREATE INDEX IF NOT EXISTS idx_ai_behavior_insights_user_project_day
  ON public.ai_behavior_insights (user_id, project_id, day DESC);

ALTER TABLE public.ai_behavior_insights ENABLE ROW LEVEL SECURITY;

REVOKE DELETE ON public.ai_behavior_insights FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_behavior_insights TO authenticated;

-- Owner-only SELECT/INSERT/UPDATE. No DELETE policy — combined with no DELETE
-- grant above, rows are only ever superseded (UPSERT on the unique key), never
-- removed by app code.
DROP POLICY IF EXISTS "Users view own behavior insights" ON public.ai_behavior_insights;
CREATE POLICY "Users view own behavior insights"
  ON public.ai_behavior_insights FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own behavior insights" ON public.ai_behavior_insights;
CREATE POLICY "Users insert own behavior insights"
  ON public.ai_behavior_insights FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own behavior insights" ON public.ai_behavior_insights;
CREATE POLICY "Users update own behavior insights"
  ON public.ai_behavior_insights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
