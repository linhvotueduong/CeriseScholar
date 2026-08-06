-- ============================================
-- Cerise Scholar — AI Usage Guardrails
-- Table: ai_usage_guardrails — user-owned preferences for API usage alerts,
-- request-count limits, unusual activity warnings, and optional premium
-- auto-pause. Stores preferences only; no API secrets and no provider billing
-- data. Actual usage events remain append-only in ai_usage_events.
--
-- Idempotent and additive: safe to run more than once. Touches no other table.
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_usage_guardrails (
  user_id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  api_source                 TEXT NOT NULL DEFAULT 'openrouter'
                                CHECK (api_source IN ('openrouter', 'provider')),
  monthly_credit_alert_cents INTEGER NOT NULL DEFAULT 1000
                                CHECK (monthly_credit_alert_cents >= 0 AND monthly_credit_alert_cents <= 100000),
  daily_request_alert        INTEGER NOT NULL DEFAULT 100
                                CHECK (daily_request_alert >= 1 AND daily_request_alert <= 100000),
  premium_request_alert      INTEGER NOT NULL DEFAULT 50
                                CHECK (premium_request_alert >= 1 AND premium_request_alert <= 100000),
  unusual_spike_alert        BOOLEAN NOT NULL DEFAULT TRUE,
  alert_email                BOOLEAN NOT NULL DEFAULT TRUE,
  alert_portal               BOOLEAN NOT NULL DEFAULT TRUE,
  auto_pause_premium         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_guardrails ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_usage_guardrails TO authenticated;

DROP POLICY IF EXISTS "Users view own ai guardrails" ON public.ai_usage_guardrails;
CREATE POLICY "Users view own ai guardrails"
  ON public.ai_usage_guardrails FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users insert own ai guardrails" ON public.ai_usage_guardrails;
CREATE POLICY "Users insert own ai guardrails"
  ON public.ai_usage_guardrails FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users update own ai guardrails" ON public.ai_usage_guardrails;
CREATE POLICY "Users update own ai guardrails"
  ON public.ai_usage_guardrails FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users delete own ai guardrails" ON public.ai_usage_guardrails;
CREATE POLICY "Users delete own ai guardrails"
  ON public.ai_usage_guardrails FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
