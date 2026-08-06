// AI usage metering — records every AI call into `ai_usage_events` and
// answers "how much has this user used this month" for allowance enforcement
// (docs/architecture-pivot-roadmap.md Phase 2, supabase/migrations/023_ai_usage_events.sql).

import type { SupabaseClient } from "@supabase/supabase-js";
import { monthStartUtcIso } from "@/lib/ai/allowance";
import type { AiLane } from "./aiCredentials";
import type { OpenRouterUsage } from "./openrouter";

export type RecordAiUsageInput = {
  userId: string;
  projectId?: string | null;
  feature: string;
  lane: AiLane;
  servedModel: string;
  usage: OpenRouterUsage;
};

/**
 * Insert one row into the append-only usage log. Never throws — a logging
 * failure must never break the AI response the user is waiting on, so any
 * error (including an unexpected exception) is console.warn'd and swallowed.
 * Call sites should invoke this fire-and-forget style: `void recordAiUsage(...)`.
 */
export async function recordAiUsage(
  supabase: SupabaseClient,
  { userId, projectId = null, feature, lane, servedModel, usage }: RecordAiUsageInput
): Promise<void> {
  try {
    const { error } = await supabase.from("ai_usage_events").insert({
      user_id: userId,
      project_id: projectId,
      feature,
      lane,
      model: servedModel,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
    });
    if (error) {
      console.warn("Failed to record AI usage event", {
        userId,
        feature,
        lane,
        message: error.message,
      });
    }
  } catch (err) {
    console.warn("Failed to record AI usage event", {
      userId,
      feature,
      lane,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// Shared count-only query (head request — no rows fetched) for both helpers below.
async function countUsageEventsSince(
  supabase: SupabaseClient,
  userId: string,
  sinceIso: string,
  lane?: AiLane
): Promise<number> {
  let query = supabase
    .from("ai_usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", sinceIso);
  if (lane) {
    query = query.eq("lane", lane);
  }

  const { count, error } = await query;
  if (error) {
    console.warn("Failed to read AI usage count", { userId, lane: lane ?? "all", message: error.message });
    return 0;
  }
  return count ?? 0;
}

/** Count of this user's default-lane (Included, allowance-metered) calls since the start of the given month. */
export async function getMonthlyDefaultLaneUsage(
  supabase: SupabaseClient,
  userId: string,
  now: Date
): Promise<number> {
  return countUsageEventsSince(supabase, userId, monthStartUtcIso(now), "default");
}

/** Count of ALL this user's calls (any lane) since the start of the given month. */
export async function getMonthlyTotalUsage(supabase: SupabaseClient, userId: string, now: Date): Promise<number> {
  return countUsageEventsSince(supabase, userId, monthStartUtcIso(now));
}

/** Start of the UTC calendar day containing `now`, as an ISO string. */
function dayStartUtcIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

/**
 * Count of ALL this user's calls (any lane) since the start of today (UTC) —
 * drives the usage-speed-health engine's `usedToday` input. Fail-open like
 * every other helper here: an error warns and returns 0 rather than throwing.
 */
export async function getDailyUsage(supabase: SupabaseClient, userId: string, now: Date): Promise<number> {
  return countUsageEventsSince(supabase, userId, dayStartUtcIso(now));
}

/**
 * Average daily usage (any lane) over the `days` UTC days immediately BEFORE
 * today (today itself is excluded — see `getDailyUsage` for that) — drives
 * the usage-speed-health engine's `priorDailyAverage` spike baseline. Fail-open:
 * any error returns 0 (never throws, never blocks the card).
 */
export async function getPriorDailyAverage(
  supabase: SupabaseClient,
  userId: string,
  now: Date,
  days = 7
): Promise<number> {
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const periodStart = new Date(todayStart.getTime() - days * 24 * 60 * 60 * 1000);

  const { count, error } = await supabase
    .from("ai_usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", periodStart.toISOString())
    .lt("created_at", todayStart.toISOString());

  if (error) {
    console.warn("Failed to read prior daily AI usage average", { userId, message: error.message });
    return 0;
  }
  return (count ?? 0) / days;
}
