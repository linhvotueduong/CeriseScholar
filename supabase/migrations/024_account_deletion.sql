-- ============================================
-- Cerise Scholar — Account Deletion (migration 024)
-- Adds public.delete_my_account(): a SECURITY DEFINER RPC that lets a
-- signed-in user permanently delete their own auth.users row. Deleting the
-- auth.users row cascades through every user-owned table below (all
-- reference auth.users(id) ON DELETE CASCADE), so this single delete removes
-- the account plus all owned projects, notes, highlights, annotations,
-- codes, PDFs, paper sections, meta-analysis data, scholar space data,
-- course progress/notes, legal consent records, dashboard data, AI
-- evaluations/feedback, the stored AI key (user_ai_settings), and AI usage
-- logs.
--
-- Tables verified to CASCADE from auth.users(id) (grep across
-- supabase/migrations/*.sql, checked 2026-07-07):
--   001_initial_schema (pdfs, highlights, annotations, paper_sections)
--   002_code_system (codes)
--   003_projects (projects)
--   004_paper_sections (paper_sections)
--   006_meta_analysis (meta_analysis_*)
--   008_scholar_space (scholar_space_* x3)
--   009_courses (course progress table)
--   010_course_notes (course_notes)
--   011_legal_consent (legal_consent)
--   012_beta_waitlist (beta_waitlist.user_id — see exception below)
--   013_dashboard_functionality (dashboard_* x3)
--   015_profiles (profiles.id)
--   019_dashboard_ai_feedback (ai_evaluations, ai_feedback tables)
--   022_user_ai_settings (user_ai_settings — the stored, encrypted AI key)
--   023_ai_usage_events (ai_usage_events)
--   20260707023054_ai_usage_guardrails (guardrails table)
-- (016, 017, 018, 020, 021 only ALTER these already-covered tables; they add
-- no new auth.users references.)
--
-- Tables that do NOT cascade (by design, not an oversight):
--   beta_waitlist.reviewed_by   -> ON DELETE SET NULL (012). References
--     whichever admin reviewed a waitlist entry, not the deleted user's own
--     data — nulling it out preserves the waitlist record without blocking
--     deletion of an admin's account.
--   beta_waitlist.actor_user_id -> ON DELETE SET NULL (012). Same reasoning:
--     an audit-log actor reference, not data owned by the deleted user.
--
-- Security:
--   - SECURITY DEFINER with `SET search_path = ''` and fully-qualified
--     names, per Supabase's security-definer hardening guidance, so the
--     function cannot be hijacked via a caller-controlled search_path.
--   - Verifies auth.uid() is not null before doing anything.
--   - Deletes ONLY the caller's own row (id = auth.uid()) — no parameter
--     accepts a target id, so it can never be used to delete another
--     account.
--   - REVOKEd from PUBLIC; EXECUTE GRANTed only to `authenticated`.
--
-- Idempotent / re-run safe: CREATE OR REPLACE + explicit REVOKE/GRANT.
-- ============================================

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
