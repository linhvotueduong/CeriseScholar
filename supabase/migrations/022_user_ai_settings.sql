-- ============================================
-- Cerise Scholar — BYOK Key Storage (migration 022)
-- Table: user_ai_settings — one row per user, holding their own OpenRouter
-- key so the app can bill their account instead of the founder's (Phase 3,
-- docs/byok-intake-design.md §2b / docs/architecture-pivot-roadmap.md Phase 3).
--
-- Ciphertext only: encrypted_key is AES-256-GCM output (iv+tag+data, base64),
-- produced/consumed only by src/lib/server/keyVault.ts using the server-only
-- BYOK_ENCRYPTION_KEY env secret. Even a user who SELECTs their own row via
-- RLS below cannot decrypt it without that secret, and plaintext never
-- reaches the browser.
--
-- Idempotent and additive: safe to run more than once. Touches no other table.
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_ai_settings (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL DEFAULT 'openrouter',
  encrypted_key     TEXT NOT NULL,
  key_last4         TEXT NOT NULL,
  preferred_model   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ai_settings TO authenticated;

-- Owner-only on every operation — same pattern as every other table.
DROP POLICY IF EXISTS "Users view own ai settings" ON public.user_ai_settings;
CREATE POLICY "Users view own ai settings"
  ON public.user_ai_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own ai settings" ON public.user_ai_settings;
CREATE POLICY "Users insert own ai settings"
  ON public.user_ai_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own ai settings" ON public.user_ai_settings;
CREATE POLICY "Users update own ai settings"
  ON public.user_ai_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own ai settings" ON public.user_ai_settings;
CREATE POLICY "Users delete own ai settings"
  ON public.user_ai_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
