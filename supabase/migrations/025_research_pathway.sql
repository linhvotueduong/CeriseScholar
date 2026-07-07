-- ============================================
-- Cerise Scholar — Research Pathway home (migration 025)
-- Spec: docs/research-readiness-checklist-model.md §6.3 "The Research Pathway
-- home" (founder-approved 2026-07-02/07). Gives every project ONE storage
-- home for the research pathway (question + angle + hypothesis) so the
-- readiness engine can recognize progress it previously had nowhere to see
-- (`docs/research-readiness-checklist-model.md` §6.1/§6.4: "a HOME beats a
-- HATCH beats a NAG").
--
-- Columns (per §6.3 "Fields: research question (main), approach/angle
-- (optional), working hypothesis (optional)"):
--   research_question   — the main field; typed directly (entry route 1) or
--                          saved from a ScholarAsk Research Journey answer
--                          ("Save as my pathway", entry route 2).
--   research_approach    — optional angle/strategy note.
--   research_hypothesis  — optional working hypothesis, distinct from the
--                          structured meta-analysis hypothesis
--                          (`meta_analyses.hypothesis`, migration 006) —
--                          this one is a free-text narrative note, not part
--                          of the quantitative wizard.
--
-- RLS: none added here. `projects` already has owner-scoped RLS from
-- migration 003 (`003_projects.sql`) covering SELECT/INSERT/UPDATE/DELETE via
-- `auth.uid() = user_id`; these are plain columns on that same row, so the
-- existing "Users can update their own projects" policy already governs
-- writes to the new columns — no new policy needed.
--
-- Idempotent / re-run safe: ADD COLUMN IF NOT EXISTS. Touches no other table.
-- ============================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS research_question TEXT,
  ADD COLUMN IF NOT EXISTS research_approach TEXT,
  ADD COLUMN IF NOT EXISTS research_hypothesis TEXT;
