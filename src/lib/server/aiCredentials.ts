// Lane resolver "socket" — see docs/byok-intake-design.md §2c and
// docs/architecture-pivot-roadmap.md Phase 1/3. Every AI route calls this once
// per request instead of reading env vars or a bypass list directly, so the
// BYOK lane (Phase 3) can slot in later with zero rework at the call sites.

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "./keyVault";

export type AiLane = "default" | "byok";

export type AiCredentials = {
  lane: AiLane;
  apiKey: string;
  models: string[];
  enforceAllowance: boolean;
};

// Model chains (all IDs confirmed live against https://openrouter.ai/api/v1/models):
// - Default lane (founder key): free primary, then a cheap PAID fallback — the
//   founder's account carries credit, so overflow costs pennies instead of failing.
// - BYOK without a chosen model: free models ONLY — a key-user may hold a $0
//   account, and a paid fallback would surface a confusing "no credit" error
//   when the real story is just "free pool busy". Three free models in a row
//   keeps them running at $0.
export const DEFAULT_FREE_PRIMARY_MODEL = "openai/gpt-oss-120b:free";
const DEFAULT_PAID_FALLBACK_MODEL = "qwen/qwen3-32b";
const DEFAULT_MODEL_CHAIN = [DEFAULT_FREE_PRIMARY_MODEL, DEFAULT_PAID_FALLBACK_MODEL];
const BYOK_FREE_MODEL_CHAIN = [
  DEFAULT_FREE_PRIMARY_MODEL,
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
];

function getDefaultModelChain(): string[] {
  const raw = process.env.OPENROUTER_MODEL_CHAIN;
  if (raw && raw.trim()) {
    const models = raw
      .split(",")
      .map((model) => model.trim())
      .filter(Boolean);
    if (models.length) return models;
  }
  return DEFAULT_MODEL_CHAIN;
}

/**
 * Resolve which OpenRouter credentials + model chain a given user's AI request
 * should use.
 *
 * BYOK first: if the user has a row in `user_ai_settings` (Phase 3,
 * docs/byok-intake-design.md §2b/§2c), decrypt their stored key
 * (src/lib/server/keyVault.ts) and return lane: "byok" — their own key, their
 * preferred model (or the same default free-first chain, just billed to their
 * key), and enforceAllowance: false. No silent fallback to the founder key
 * happens here; request-time BYOK failures are handled by the calling route
 * per docs/byok-intake-design.md §2d.
 *
 * Default lane: the founder's OpenRouter key, shared free-first model chain,
 * allowance enforcement on (Phase 2 wires the actual enforcement; this just
 * carries the flag). Used whenever the user has no BYOK row, or their stored
 * key fails to decrypt (e.g. BYOK_ENCRYPTION_KEY was rotated) — that failure
 * is logged (never with key material) and treated the same as "no row".
 */
export async function resolveAiCredentials(
  userId: string,
  supabase: SupabaseClient
): Promise<AiCredentials> {
  const { data } = await supabase
    .from("user_ai_settings")
    .select("encrypted_key, preferred_model")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.encrypted_key) {
    try {
      const apiKey = decryptSecret(data.encrypted_key);
      return {
        lane: "byok",
        apiKey,
        models: data.preferred_model ? [data.preferred_model] : BYOK_FREE_MODEL_CHAIN,
        enforceAllowance: false,
      };
    } catch (err) {
      // Never log the ciphertext, the decrypted key, or BYOK_ENCRYPTION_KEY —
      // only that a decrypt attempt failed, so an ops alert can catch a
      // rotated/misconfigured env secret without exposing any key material.
      console.warn("BYOK key decrypt failed; falling back to default lane", {
        userId,
        reason: err instanceof Error ? err.message : "unknown error",
      });
    }
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("AI is not configured on the server. Set OPENROUTER_API_KEY.");
  }

  return {
    lane: "default",
    apiKey,
    models: getDefaultModelChain(),
    enforceAllowance: true,
  };
}
