// GET /api/ai/usage — read-only usage-meter endpoint (Phase 2,
// docs/architecture-pivot-roadmap.md Phase 2). Lets Settings → AI (and any
// other client surface) show "N of 150 included requests used this month"
// without duplicating the allowance/lane logic that already lives server-side.
//
// Extended for the dashboard "usage speed health" card (docs/ai-usage-card-states.md):
// the response now ALSO carries everything `deriveAiUsagePace` (src/lib/ai/usagePace.ts)
// needs — today's usage, the prior daily average, the cycle bounds, and whether
// spike alerts are enabled — while keeping every original field for back-compat.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAiCredentials } from "@/lib/server/aiCredentials";
import {
  getDailyUsage,
  getMonthlyDefaultLaneUsage,
  getMonthlyTotalUsage,
  getPriorDailyAverage,
} from "@/lib/server/aiUsage";
import { getAiUsageGuardrails } from "@/lib/server/aiGuardrails";
import { INCLUDED_MONTHLY_ALLOWANCE, monthStartUtcIso } from "@/lib/ai/allowance";

/** Default free-tier daily request quota for the BYOK lane; override via env. */
const DEFAULT_BYOK_DAILY_FREE_LIMIT = 1000;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function dayStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function nextDayStartUtc(now: Date): Date {
  return new Date(dayStartUtc(now).getTime() + 24 * 60 * 60 * 1000);
}

function nextMonthStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** Fraction elapsed (0..1) and ms remaining for a [cycleStart, cycleEnd) window. */
function cycleProgress(now: Date, cycleStart: Date, cycleEnd: Date): { elapsedFraction: number; remainingMs: number } {
  const totalMs = cycleEnd.getTime() - cycleStart.getTime();
  const remainingMs = Math.max(0, cycleEnd.getTime() - now.getTime());
  const elapsedFraction = totalMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs)) : 0;
  return { elapsedFraction, remainingMs };
}

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const credentials = await resolveAiCredentials(user.id, supabase);
    const now = new Date();
    const [used, usedThisMonthTotal, usedToday, priorDailyAverage] = await Promise.all([
      getMonthlyDefaultLaneUsage(supabase, user.id, now),
      getMonthlyTotalUsage(supabase, user.id, now),
      getDailyUsage(supabase, user.id, now),
      getPriorDailyAverage(supabase, user.id, now),
    ]);

    let spikeAlertEnabled = true;
    try {
      spikeAlertEnabled = (await getAiUsageGuardrails(supabase, user.id)).unusualSpikeAlert;
    } catch (err) {
      console.warn("AI usage route: failed to read guardrails, defaulting spikeAlertEnabled=true", err);
    }

    const isByok = credentials.lane === "byok";
    const cycle: "month" | "day" = isByok ? "day" : "month";
    const quota = isByok
      ? Number(process.env.NEXT_PUBLIC_BYOK_DAILY_FREE_LIMIT ?? DEFAULT_BYOK_DAILY_FREE_LIMIT)
      : INCLUDED_MONTHLY_ALLOWANCE;
    const cycleBounds = isByok
      ? { start: dayStartUtc(now), end: nextDayStartUtc(now) }
      : { start: new Date(monthStartUtcIso(now)), end: nextMonthStartUtc(now) };
    const { elapsedFraction: cycleElapsedFraction, remainingMs: cycleRemainingMs } = cycleProgress(
      now,
      cycleBounds.start,
      cycleBounds.end
    );

    return NextResponse.json({
      lane: credentials.lane,
      // Unchanged from the original contract: always the default-lane monthly
      // count, regardless of the caller's current lane (back-compat).
      used,
      usedThisMonthTotal,
      allowance: isByok ? null : INCLUDED_MONTHLY_ALLOWANCE,
      usedToday,
      priorDailyAverage,
      quota,
      cycle,
      cycleElapsedFraction,
      cycleRemainingMs,
      spikeAlertEnabled,
    });
  } catch (err) {
    console.error("AI usage route error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
