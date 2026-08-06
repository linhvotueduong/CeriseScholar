-- ============================================
-- Cerise Scholar — AI Usage Metering (migration 023)
-- Table: ai_usage_events — append-only log of every AI call, one row per
-- call, recording which lane served it (default founder-key lane vs BYOK)
-- and how many tokens it used. Powers Phase 2 allowance enforcement
-- (docs/architecture-pivot-roadmap.md Phase 2) and future cost statistics.
--
-- project_id is intentionally NOT a foreign key: this is a historical usage
-- log, not project-owned data, so a later project deletion must never cascade
-- into (or block) a usage row. Deleting the USER does cascade — the log has
-- no purpose once the account it belongs to is gone.
--
-- Hardened style matching migration 022: explicit `TO authenticated` on every
-- policy, an explicit GRANT line, no UPDATE/DELETE policies (append-only —
-- rows are written once and never changed or removed by app code).
--
-- Idempotent and additive: safe to run more than once. Touches no other table.
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id     UUID,
  feature        TEXT NOT NULL, -- 'research' | 'paper_analysis' | 'pdf_chat' | 'learning_coach' | 'generate_apa' | 'generic' | ...
  lane           TEXT NOT NULL CHECK (lane IN ('default', 'byok')),
  model          TEXT NOT NULL, -- the model that actually served the request (OpenRouter's reported `model`)
  input_tokens   INTEGER NOT NULL DEFAULT 0,
  output_tokens  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_created
  ON public.ai_usage_events (user_id, created_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

REVOKE UPDATE, DELETE ON public.ai_usage_events FROM authenticated;
GRANT SELECT, INSERT ON public.ai_usage_events TO authenticated;

-- Owner-only, append-only: SELECT + INSERT only. No UPDATE/DELETE policies —
-- combined with no UPDATE/DELETE grants above, the log cannot be altered or
-- erased by app code, only ever appended to.
DROP POLICY IF EXISTS "Users view own ai usage events" ON public.ai_usage_events;
CREATE POLICY "Users view own ai usage events"
  ON public.ai_usage_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own ai usage events" ON public.ai_usage_events;
CREATE POLICY "Users insert own ai usage events"
  ON public.ai_usage_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
