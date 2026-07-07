// BYOK key intake — validate, encrypt, store, and manage a user's own
// OpenRouter API key. See docs/byok-intake-design.md §2a and §4.
//
// Security invariants (do not weaken):
// - The pasted key travels browser→server exactly once (POST body over HTTPS).
// - It is NEVER echoed back, stored in plaintext, or written to any log —
//   responses and the database carry last4 + ciphertext only.
// - Validation probes use a :free model so checking a key costs the user $0.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { callOpenRouterChat, OpenRouterError } from "@/lib/server/openrouter";
import { decryptSecret, encryptSecret } from "@/lib/server/keyVault";
import { DEFAULT_FREE_PRIMARY_MODEL } from "@/lib/server/aiCredentials";
import { isAllowedPreferredModel } from "@/lib/ai/preferredModels";

export const runtime = "nodejs";

const OPENROUTER_KEY_INFO_URL = "https://openrouter.ai/api/v1/key";
const KEY_INFO_TIMEOUT_MS = 10000;

const REJECTED_MESSAGE =
  "That key was rejected by OpenRouter — check it was copied fully, or create a fresh one at openrouter.ai.";
const NO_CREDIT_MESSAGE =
  "This key has no credit remaining on OpenRouter. Add credit there or raise the key limit before using it for fuller Cerise usage.";
const SHAPE_MESSAGE =
  "That doesn't look like an OpenRouter key. It should start with sk-or- — copy the whole key from openrouter.ai.";
const UNREACHABLE_MESSAGE =
  "Couldn't reach OpenRouter to check the key just now. Please try again in a moment.";

type KeyInfoResponse = {
  data?: {
    limit?: number | null;
    limit_remaining?: number | null;
    usage?: number;
    is_free_tier?: boolean;
  };
};

type ValidationResult =
  | { ok: true }
  | { ok: false; status: 400; reason: string }
  | { ok: false; status: 502; reason: string };

/**
 * Validate a pasted key live against OpenRouter. Primary check: GET /api/v1/key
 * (returns key metadata when valid, 401 when not). If that endpoint fails in an
 * unexpected way, fall back to a 1-token completion on a :free model — costs $0.
 */
async function validateKeyWithOpenRouter(key: string): Promise<ValidationResult> {
  try {
    const res = await fetch(OPENROUTER_KEY_INFO_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(KEY_INFO_TIMEOUT_MS),
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, status: 400, reason: REJECTED_MESSAGE };
    }

    if (res.ok) {
      const info = (await res.json().catch(() => null)) as KeyInfoResponse | null;
      const remaining = info?.data?.limit_remaining;
      // limit_remaining is null when OpenRouter reports no explicit cap; a number <= 0 means
      // the key's credit is used up — distinguishable, so say so clearly.
      if (typeof remaining === "number" && remaining <= 0) {
        return { ok: false, status: 400, reason: NO_CREDIT_MESSAGE };
      }
      return { ok: true };
    }
    // Unexpected status (5xx, rate limit, ...) — fall through to the chat probe.
  } catch {
    // Network error/timeout — fall through to the chat probe.
  }

  // Fallback probe: 1-token completion on a :free model (user pays $0).
  try {
    await callOpenRouterChat({
      route: "byok_key_validation",
      messages: [{ role: "user", content: "Hi" }],
      models: [DEFAULT_FREE_PRIMARY_MODEL],
      apiKey: key,
      timeoutMs: 20000,
      maxTokens: 1,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof OpenRouterError && err.status === 401) {
      return { ok: false, status: 400, reason: REJECTED_MESSAGE };
    }
    if (err instanceof OpenRouterError && err.status === 402) {
      return { ok: false, status: 400, reason: NO_CREDIT_MESSAGE };
    }
    return { ok: false, status: 502, reason: UNREACHABLE_MESSAGE };
  }
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Abuse brake: 10 key-connect attempts per day per user.
    if (!checkRateLimit(user.id, "ai-key", 10, 24 * 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many key attempts today. Please try again tomorrow." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const key = typeof body?.key === "string" ? body.key.trim() : "";

    // Basic shape check before spending a network call (sk-or- prefix, sane length).
    if (!key.startsWith("sk-or-") || key.length < 20 || key.length > 300) {
      return NextResponse.json({ error: SHAPE_MESSAGE }, { status: 400 });
    }

    const validation = await validateKeyWithOpenRouter(key);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.reason }, { status: validation.status });
    }

    const last4 = key.slice(-4);
    const { error: upsertError } = await supabase.from("user_ai_settings").upsert(
      {
        user_id: user.id,
        provider: "openrouter",
        encrypted_key: encryptSecret(key),
        key_last4: last4,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      // Never include key material here — upsertError only describes the DB failure.
      console.error("BYOK key save failed", { userId: user.id, message: upsertError.message });
      return NextResponse.json(
        { error: "The key checked out, but saving it failed. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ connected: true, last4 });
  } catch (err) {
    console.error("BYOK key connect error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data } = await supabase
      .from("user_ai_settings")
      .select("provider, key_last4, preferred_model")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      provider: data.provider ?? "openrouter",
      last4: data.key_last4,
      preferredModel: data.preferred_model ?? null,
    });
  } catch (err) {
    console.error("BYOK key status error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Hard delete — no soft-delete of secrets (design §4). Default lane resumes.
    const { error } = await supabase.from("user_ai_settings").delete().eq("user_id", user.id);
    if (error) {
      console.error("BYOK key disconnect failed", { userId: user.id, message: error.message });
      return NextResponse.json({ error: "Disconnect failed. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ connected: false });
  } catch (err) {
    console.error("BYOK key disconnect error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function PUT() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!checkRateLimit(user.id, "ai-key-test", 20, 24 * 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many key checks today. Please try again tomorrow." },
        { status: 429 }
      );
    }

    const { data, error } = await supabase
      .from("user_ai_settings")
      .select("provider, encrypted_key, key_last4")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("BYOK key lookup failed", { userId: user.id, message: error.message });
      return NextResponse.json({ error: "Checking the key failed. Please try again." }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Connect an OpenRouter key before testing it." }, { status: 400 });
    }

    if ((data.provider ?? "openrouter") !== "openrouter") {
      return NextResponse.json({ error: "Only OpenRouter keys can be tested in this build." }, { status: 400 });
    }

    let key = "";
    try {
      key = decryptSecret(data.encrypted_key);
    } catch (err) {
      console.error("Stored BYOK key decrypt failed", {
        userId: user.id,
        message: err instanceof Error ? err.message : "unknown",
      });
      return NextResponse.json({ error: "The stored key could not be read. Reconnect it in Settings." }, { status: 500 });
    }

    const validation = await validateKeyWithOpenRouter(key);
    if (!validation.ok) {
      return NextResponse.json({ connected: true, ok: false, error: validation.reason }, { status: validation.status });
    }

    return NextResponse.json({ connected: true, ok: true, provider: "openrouter", last4: data.key_last4 });
  } catch (err) {
    console.error("BYOK key test error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const preferredModel = body?.preferredModel ?? null;

    // null = "use the default chain"; otherwise the model must be on the allowlist.
    if (preferredModel !== null && !isAllowedPreferredModel(preferredModel)) {
      return NextResponse.json({ error: "That model is not available to pick." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_ai_settings")
      .update({ preferred_model: preferredModel, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select("user_id");

    if (error) {
      console.error("BYOK model preference save failed", { userId: user.id, message: error.message });
      return NextResponse.json({ error: "Saving the preference failed. Please try again." }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Connect a key before choosing a model." }, { status: 400 });
    }

    return NextResponse.json({ connected: true, preferredModel });
  } catch (err) {
    console.error("BYOK model preference error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
