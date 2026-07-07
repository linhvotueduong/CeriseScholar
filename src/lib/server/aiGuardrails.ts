import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiLane } from "./aiCredentials";

export type ApiSource = "openrouter" | "provider";

export type AiUsageGuardrails = {
  apiSource: ApiSource;
  monthlyCreditAlertCents: number;
  dailyRequestAlert: number;
  premiumRequestAlert: number;
  unusualSpikeAlert: boolean;
  alertEmail: boolean;
  alertPortal: boolean;
  autoPausePremium: boolean;
};

export type GuardrailUsageSnapshot = {
  dailyRequests: number;
  monthlyPremiumRequests: number;
};

export const DEFAULT_AI_GUARDRAILS: AiUsageGuardrails = {
  apiSource: "openrouter",
  monthlyCreditAlertCents: 1000,
  dailyRequestAlert: 100,
  premiumRequestAlert: 50,
  unusualSpikeAlert: true,
  alertEmail: true,
  alertPortal: true,
  autoPausePremium: false,
};

type GuardrailRow = {
  api_source?: string | null;
  monthly_credit_alert_cents?: number | null;
  daily_request_alert?: number | null;
  premium_request_alert?: number | null;
  unusual_spike_alert?: boolean | null;
  alert_email?: boolean | null;
  alert_portal?: boolean | null;
  auto_pause_premium?: boolean | null;
};

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeSource(value: unknown): ApiSource {
  return value === "provider" ? "provider" : "openrouter";
}

export function normalizeAiGuardrails(input: Partial<AiUsageGuardrails> | GuardrailRow): AiUsageGuardrails {
  const record = input as Record<string, unknown>;
  return {
    apiSource: normalizeSource(record.apiSource ?? record.api_source),
    monthlyCreditAlertCents: clampInteger(
      record.monthlyCreditAlertCents ?? record.monthly_credit_alert_cents,
      DEFAULT_AI_GUARDRAILS.monthlyCreditAlertCents,
      0,
      100000
    ),
    dailyRequestAlert: clampInteger(
      record.dailyRequestAlert ?? record.daily_request_alert,
      DEFAULT_AI_GUARDRAILS.dailyRequestAlert,
      1,
      100000
    ),
    premiumRequestAlert: clampInteger(
      record.premiumRequestAlert ?? record.premium_request_alert,
      DEFAULT_AI_GUARDRAILS.premiumRequestAlert,
      1,
      100000
    ),
    unusualSpikeAlert:
      typeof (record.unusualSpikeAlert ?? record.unusual_spike_alert) === "boolean"
        ? Boolean(record.unusualSpikeAlert ?? record.unusual_spike_alert)
        : DEFAULT_AI_GUARDRAILS.unusualSpikeAlert,
    alertEmail:
      typeof (record.alertEmail ?? record.alert_email) === "boolean"
        ? Boolean(record.alertEmail ?? record.alert_email)
        : DEFAULT_AI_GUARDRAILS.alertEmail,
    alertPortal:
      typeof (record.alertPortal ?? record.alert_portal) === "boolean"
        ? Boolean(record.alertPortal ?? record.alert_portal)
        : DEFAULT_AI_GUARDRAILS.alertPortal,
    autoPausePremium:
      typeof (record.autoPausePremium ?? record.auto_pause_premium) === "boolean"
        ? Boolean(record.autoPausePremium ?? record.auto_pause_premium)
        : DEFAULT_AI_GUARDRAILS.autoPausePremium,
  };
}

export async function getAiUsageGuardrails(
  supabase: SupabaseClient,
  userId: string
): Promise<AiUsageGuardrails> {
  const { data, error } = await supabase
    .from("ai_usage_guardrails")
    .select(
      "api_source, monthly_credit_alert_cents, daily_request_alert, premium_request_alert, unusual_spike_alert, alert_email, alert_portal, auto_pause_premium"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Failed to read AI usage guardrails", { userId, message: error.message });
    return DEFAULT_AI_GUARDRAILS;
  }

  return data ? normalizeAiGuardrails(data) : DEFAULT_AI_GUARDRAILS;
}

export async function saveAiUsageGuardrails(
  supabase: SupabaseClient,
  userId: string,
  input: Partial<AiUsageGuardrails>
): Promise<AiUsageGuardrails> {
  const guardrails = normalizeAiGuardrails(input);
  const { error } = await supabase.from("ai_usage_guardrails").upsert(
    {
      user_id: userId,
      api_source: guardrails.apiSource,
      monthly_credit_alert_cents: guardrails.monthlyCreditAlertCents,
      daily_request_alert: guardrails.dailyRequestAlert,
      premium_request_alert: guardrails.premiumRequestAlert,
      unusual_spike_alert: guardrails.unusualSpikeAlert,
      alert_email: guardrails.alertEmail,
      alert_portal: guardrails.alertPortal,
      auto_pause_premium: guardrails.autoPausePremium,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return guardrails;
}

function dayStartUtcIso(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function monthStartUtcIso(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function getGuardrailUsageSnapshot(
  supabase: SupabaseClient,
  userId: string,
  now: Date
): Promise<GuardrailUsageSnapshot> {
  const [daily, premium] = await Promise.all([
    supabase
      .from("ai_usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", dayStartUtcIso(now)),
    supabase
      .from("ai_usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStartUtcIso(now))
      .not("model", "like", "%:free"),
  ]);

  if (daily.error) {
    console.warn("Failed to read daily AI usage for guardrails", { userId, message: daily.error.message });
  }
  if (premium.error) {
    console.warn("Failed to read premium AI usage for guardrails", { userId, message: premium.error.message });
  }

  return {
    dailyRequests: daily.count ?? 0,
    monthlyPremiumRequests: premium.count ?? 0,
  };
}

export async function checkAiGuardrailsBeforeRequest(
  supabase: SupabaseClient,
  userId: string,
  lane: AiLane,
  models: string[],
  now = new Date()
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  if (lane !== "byok") return { allowed: true };

  const guardrails = await getAiUsageGuardrails(supabase, userId);
  if (!guardrails.autoPausePremium) return { allowed: true };

  const willUsePremiumOnly = models.length > 0 && models.every((model) => !model.endsWith(":free"));
  if (!willUsePremiumOnly) return { allowed: true };

  const usage = await getGuardrailUsageSnapshot(supabase, userId, now);
  if (usage.dailyRequests >= guardrails.dailyRequestAlert) {
    return {
      allowed: false,
      reason: `Premium AI requests are paused because today's request guardrail is set to ${guardrails.dailyRequestAlert}. You can raise or turn off this guardrail in Settings -> AI.`,
    };
  }
  if (usage.monthlyPremiumRequests >= guardrails.premiumRequestAlert) {
    return {
      allowed: false,
      reason: `Premium AI requests are paused because this month's premium-model guardrail is set to ${guardrails.premiumRequestAlert}. You can raise or turn off this guardrail in Settings -> AI.`,
    };
  }

  return { allowed: true };
}
