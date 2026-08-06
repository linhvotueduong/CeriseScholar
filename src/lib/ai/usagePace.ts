// Pure "usage speed health" engine for the dashboard AI usage card
// (Phase: usage-speed-health). Given a snapshot of the current billing cycle,
// this derives one of 8 states (paused/ready/refill_soon/almost_full/alert/
// high_pace/light/active) plus the copy + colors the card renders.
//
// Deliberately has ZERO imports from server code (Supabase, Next.js, etc.) so
// it can be unit tested in isolation and reused anywhere (API route, card UI,
// future notifications) without dragging in server-only dependencies.

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type AiPaceState =
  | "ready"
  | "active"
  | "light"
  | "high_pace"
  | "almost_full"
  | "refill_soon"
  | "alert"
  | "paused";

export type AiPaceTone = "green" | "amber" | "red" | "neutral";

export type AiUsagePaceInput = {
  used: number; // requests used in current cycle
  quota: number; // cycle quota (>0)
  cycleElapsedFraction: number; // 0..1, how far through the cycle we are
  cycleRemainingMs: number; // ms until reset
  usedToday: number; // requests today (UTC)
  priorDailyAverage: number; // avg requests/day over prior 7 days (excluding today)
  spikeAlertEnabled: boolean; // from guardrails.unusualSpikeAlert
};

export type AiUsagePaceStatus = {
  state: AiPaceState;
  chipLabel: string; // "Ready" | "Active" | "High pace" | "Almost full" | "Refill soon" | "Alert" | "Paused"
  tone: AiPaceTone; // drives chip + bar + notice colors
  percent: number; // 0..100 integer, clamped
  left: number; // max(0, quota - used)
  resetsLabel: string; // "Resets in 18h" | "Resets in 12 days" | "Resets in <1h"
  noticeTitle: string;
  noticeBody: string; // ≤ ~90 chars, must fit 2 lines at 10px in a 182px-wide box
};

// ---------------------------------------------------------------------------
// Named thresholds (documented here so the priority-order logic below reads
// as plain english against them)
// ---------------------------------------------------------------------------

/** Below this many requests used, the pace ratio is too noisy to trust (state 6/7 gate). */
const MIN_SAMPLE_REQUESTS = 5;
/** Below this fraction of the cycle elapsed, the pace ratio is too noisy to trust. */
const MIN_ELAPSED_FRACTION = 0.05;
/** percent >= this crosses into "almost full" / "refill soon" territory. */
const ALMOST_FULL_PERCENT = 90;
/** used / expected-used-by-now >= this reads as "moving too fast". */
const HIGH_PACE_RATIO = 1.5;
/** used / expected-used-by-now <= this reads as "comfortably light". */
const LIGHT_PACE_RATIO = 0.5;
/** A spike must be at least this many requests today to ever qualify, regardless of history. */
const SPIKE_MIN_USED_TODAY = 20;
/** ...or at least this multiple of the user's own prior daily average. */
const SPIKE_MULTIPLIER = 3;

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const MS_PER_MONTH = 30 * MS_PER_DAY; // approximate — used only for humanized copy

/** resetsLabel: below this, show "<1h" rather than "0h". */
const RESET_LABEL_HOUR_FLOOR_MS = MS_PER_HOUR;
/** resetsLabel: below this, show hours; at/above, show days. */
const RESET_LABEL_DAY_CUTOFF_MS = 36 * MS_PER_HOUR;

/** run-out humanization: below this, show hours. */
const RUNOUT_HOUR_CUTOFF_MS = 36 * MS_PER_HOUR;
/** run-out humanization: below this, show days. */
const RUNOUT_DAY_CUTOFF_MS = 14 * MS_PER_DAY;
/** run-out humanization: below this, show weeks; at/above, show months. */
const RUNOUT_WEEK_CUTOFF_MS = 8 * MS_PER_WEEK;

// ---------------------------------------------------------------------------
// Sanitizers — guard every division and clamp every input to a sane range so
// NaN/negative/garbage inputs can never crash the card or produce nonsense.
// ---------------------------------------------------------------------------

function sanitizeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function sanitizeNonNegative(value: number): number {
  const num = sanitizeNumber(value);
  return num < 0 ? 0 : num;
}

function clamp01(value: number): number {
  const num = sanitizeNumber(value);
  if (num < 0) return 0;
  if (num > 1) return 1;
  return num;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

// ---------------------------------------------------------------------------
// Humanizers
// ---------------------------------------------------------------------------

/** "Resets in <1h" | "Resets in Nh" | "Resets in N days" */
function formatResetsLabel(remainingMs: number): string {
  if (remainingMs < RESET_LABEL_HOUR_FLOOR_MS) return "Resets in <1h";
  if (remainingMs < RESET_LABEL_DAY_CUTOFF_MS) {
    const hours = Math.max(1, Math.round(remainingMs / MS_PER_HOUR));
    return `Resets in ${hours}h`;
  }
  const days = Math.max(1, Math.round(remainingMs / MS_PER_DAY));
  return `Resets in ${days} ${days === 1 ? "day" : "days"}`;
}

/** "N hours" | "N days" | "N weeks" | "about N months" (caller adds the leading "about"). */
function humanizeRunOutDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "a short while";
  if (ms < RUNOUT_HOUR_CUTOFF_MS) {
    const hours = Math.max(1, Math.round(ms / MS_PER_HOUR));
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  if (ms < RUNOUT_DAY_CUTOFF_MS) {
    const days = Math.max(1, Math.round(ms / MS_PER_DAY));
    return `${days} ${days === 1 ? "day" : "days"}`;
  }
  if (ms < RUNOUT_WEEK_CUTOFF_MS) {
    const weeks = Math.max(1, Math.round(ms / MS_PER_WEEK));
    return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  }
  const months = Math.max(1, Math.round(ms / MS_PER_MONTH));
  return `${months} ${months === 1 ? "month" : "months"}`;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

function buildStatus(
  state: AiPaceState,
  chipLabel: string,
  tone: AiPaceTone,
  percent: number,
  left: number,
  resetsLabel: string,
  noticeTitle: string,
  noticeBody: string
): AiUsagePaceStatus {
  return { state, chipLabel, tone, percent, left, resetsLabel, noticeTitle, noticeBody };
}

export function deriveAiUsagePace(input: AiUsagePaceInput): AiUsagePaceStatus {
  const used = sanitizeNonNegative(input.used);
  const quotaRaw = sanitizeNonNegative(input.quota);
  const quota = quotaRaw > 0 ? quotaRaw : 1;
  const cycleElapsedFraction = clamp01(input.cycleElapsedFraction);
  const cycleRemainingMs = sanitizeNonNegative(input.cycleRemainingMs);
  const usedToday = sanitizeNonNegative(input.usedToday);
  const priorDailyAverage = sanitizeNonNegative(input.priorDailyAverage);
  const spikeAlertEnabled = input.spikeAlertEnabled === true;

  const percent = clampPercent(Math.round((used / quota) * 100));
  const left = Math.max(0, quota - used);
  const resetsLabel = formatResetsLabel(cycleRemainingMs);

  // Pace ratio: used vs. what we'd expect to have used by now if usage were
  // spread evenly across the cycle. Only trusted once there's enough signal
  // (MIN_SAMPLE_REQUESTS used AND MIN_ELAPSED_FRACTION of the cycle elapsed) —
  // otherwise treated as exactly "on pace" (1) so a handful of early requests
  // never reads as a dramatic spike.
  const hasSample = used >= MIN_SAMPLE_REQUESTS && cycleElapsedFraction >= MIN_ELAPSED_FRACTION;
  const paceRatio = hasSample ? used / (quota * cycleElapsedFraction) : 1;

  // Projected run-out: derive the cycle's total length from elapsed fraction +
  // remaining time, then project the current burn rate forward. Only computed
  // under the same sample gate as paceRatio, and only when there is quota left
  // and time left to run out before.
  let willRunOutBeforeReset = false;
  let msToExhaust = Infinity;
  if (hasSample && cycleRemainingMs > 0 && left > 0) {
    const elapsedFractionForTotal = Math.min(cycleElapsedFraction, 0.999999);
    const totalMs =
      elapsedFractionForTotal < 1 ? cycleRemainingMs / (1 - elapsedFractionForTotal) : cycleRemainingMs;
    const elapsedMs = Math.max(1, totalMs - cycleRemainingMs);
    const rate = used / elapsedMs; // requests per ms
    msToExhaust = rate > 0 ? left / rate : Infinity;
    willRunOutBeforeReset = Number.isFinite(msToExhaust) && msToExhaust < cycleRemainingMs;
  }

  const spikeDetected =
    spikeAlertEnabled &&
    priorDailyAverage > 0 &&
    usedToday >= Math.max(SPIKE_MIN_USED_TODAY, SPIKE_MULTIPLIER * priorDailyAverage);

  // Priority order (first match wins) — see docs/ai-usage-card-states.md for
  // the plain-language version of every rule below.
  if (used >= quota) {
    return buildStatus(
      "paused",
      "Paused",
      "neutral",
      percent,
      left,
      resetsLabel,
      "Quota reached",
      "Usage is paused until the reset."
    );
  }
  if (used === 0) {
    return buildStatus(
      "ready",
      "Ready",
      "neutral",
      percent,
      left,
      resetsLabel,
      "No usage yet",
      "Once you start using Cerise, pace shows here."
    );
  }
  if (percent >= ALMOST_FULL_PERCENT && willRunOutBeforeReset) {
    return buildStatus(
      "refill_soon",
      "Refill soon",
      "red",
      percent,
      left,
      resetsLabel,
      "Almost exhausted",
      "At this speed you may hit the limit before reset."
    );
  }
  if (percent >= ALMOST_FULL_PERCENT) {
    return buildStatus(
      "almost_full",
      "Almost full",
      "amber",
      percent,
      left,
      resetsLabel,
      "Quota is almost full",
      "Pace is healthy, but little balance remains before reset."
    );
  }
  if (spikeDetected) {
    return buildStatus(
      "alert",
      "Alert",
      "red",
      percent,
      left,
      resetsLabel,
      "Unusual activity",
      "Usage is far above your normal pattern. Review in Settings."
    );
  }
  if (paceRatio >= HIGH_PACE_RATIO) {
    return buildStatus(
      "high_pace",
      "High pace",
      "amber",
      percent,
      left,
      resetsLabel,
      "Usage speed is high",
      `At this pace you may run out in about ${humanizeRunOutDuration(msToExhaust)}.`
    );
  }
  if (paceRatio <= LIGHT_PACE_RATIO) {
    return buildStatus(
      "light",
      "Active",
      "green",
      percent,
      left,
      resetsLabel,
      "Usage is light",
      "At this pace your quota lasts well past the reset."
    );
  }
  return buildStatus(
    "active",
    "Active",
    "green",
    percent,
    left,
    resetsLabel,
    "Usage speed is normal",
    "At this pace you'll stay comfortably within the quota."
  );
}
