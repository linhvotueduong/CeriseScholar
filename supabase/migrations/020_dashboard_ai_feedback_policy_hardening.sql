-- ============================================
-- Cerise Scholar — AI Feedback Policy Hardening (migration 020)
-- Hardens the RLS policies created in 019 to Supabase best practice. POLICY-ONLY:
-- it drops and recreates policy DEFINITIONS; it never drops, alters, or moves data.
--
-- Changes:
--   1. auth.uid() wrapped in (select auth.uid()) -> evaluated once per query (initPlan).
--   2. Policies scoped TO authenticated (anon requests skip evaluation entirely).
--   3. UPDATE on ai_evaluations gets an explicit WITH CHECK (no user_id reassignment).
--   4. dashboard_progress_feedback becomes truly append-only: SELECT + INSERT only
--      (no DELETE/UPDATE). Account/project deletion still cascades via the FKs.
--
-- Idempotent (drop-then-create). Apply via the Supabase dashboard SQL Editor.
-- ============================================

ALTER TABLE public.dashboard_ai_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_progress_feedback ENABLE ROW LEVEL SECURITY;

-- ---- dashboard_ai_evaluations: full owner CRUD (upserted snapshot) -----------
DROP POLICY IF EXISTS "Users view own ai evaluations" ON public.dashboard_ai_evaluations;
CREATE POLICY "Users view own ai evaluations" ON public.dashboard_ai_evaluations
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users insert own ai evaluations" ON public.dashboard_ai_evaluations;
CREATE POLICY "Users insert own ai evaluations" ON public.dashboard_ai_evaluations
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users update own ai evaluations" ON public.dashboard_ai_evaluations;
CREATE POLICY "Users update own ai evaluations" ON public.dashboard_ai_evaluations
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users delete own ai evaluations" ON public.dashboard_ai_evaluations;
CREATE POLICY "Users delete own ai evaluations" ON public.dashboard_ai_evaluations
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ---- dashboard_progress_feedback: append-only (SELECT + INSERT only) ----------
DROP POLICY IF EXISTS "Users view own progress feedback" ON public.dashboard_progress_feedback;
CREATE POLICY "Users view own progress feedback" ON public.dashboard_progress_feedback
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users insert own progress feedback" ON public.dashboard_progress_feedback;
CREATE POLICY "Users insert own progress feedback" ON public.dashboard_progress_feedback
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- Remove the per-row DELETE policy from 019 so the feedback log is append-only.
DROP POLICY IF EXISTS "Users delete own progress feedback" ON public.dashboard_progress_feedback;
