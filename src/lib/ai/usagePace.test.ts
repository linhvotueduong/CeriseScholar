import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveAiUsagePace, type AiUsagePaceInput } from "./usagePace";

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Sane baseline input — every test overrides only what it needs. */
function baseInput(overrides: Partial<AiUsagePaceInput> = {}): AiUsagePaceInput {
  return {
    used: 10,
    quota: 150,
    cycleElapsedFraction: 0.5,
    cycleRemainingMs: 15 * MS_PER_DAY,
    usedToday: 0,
    priorDailyAverage: 0,
    spikeAlertEnabled: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Every state reachable + priority order
// ---------------------------------------------------------------------------

test("paused: used >= quota, regardless of anything else", () => {
  const status = deriveAiUsagePace(baseInput({ used: 150, quota: 150 }));
  assert.equal(status.state, "paused");
  assert.equal(status.chipLabel, "Paused");
  assert.equal(status.tone, "neutral");
  assert.equal(status.percent, 100);
  assert.equal(status.left, 0);
  assert.equal(status.noticeTitle, "Quota reached");
});

test("paused beats alert: over-quota AND spike conditions both true -> still paused", () => {
  const status = deriveAiUsagePace(
    baseInput({
      used: 200,
      quota: 150,
      usedToday: 100,
      priorDailyAverage: 5,
      spikeAlertEnabled: true,
    })
  );
  assert.equal(status.state, "paused");
});

test("ready: used === 0 regardless of quota", () => {
  const status = deriveAiUsagePace(baseInput({ used: 0, quota: 150 }));
  assert.equal(status.state, "ready");
  assert.equal(status.chipLabel, "Ready");
  assert.equal(status.tone, "neutral");
  assert.equal(status.percent, 0);
  assert.equal(status.left, 150);
});

test("almost_full: percent >= 90 but on-pace (won't run out before reset)", () => {
  // elapsed=0.9, used=135/150 (90%) -> paceRatio = 135/(150*0.9) = 1 (exactly on pace),
  // which makes projected run-out land exactly at the reset instant (not before it).
  const status = deriveAiUsagePace(
    baseInput({
      used: 135,
      quota: 150,
      cycleElapsedFraction: 0.9,
      cycleRemainingMs: 3 * MS_PER_DAY,
    })
  );
  assert.equal(status.state, "almost_full");
  assert.equal(status.chipLabel, "Almost full");
  assert.equal(status.tone, "amber");
  assert.equal(status.percent, 90);
});

test("refill_soon: percent >= 90 AND projected to run out before reset", () => {
  // elapsed=0.5, used=140/150 (93%) -> burning much faster than on-pace, so the
  // projected exhaustion time falls well before the remaining cycle time.
  const status = deriveAiUsagePace(
    baseInput({
      used: 140,
      quota: 150,
      cycleElapsedFraction: 0.5,
      cycleRemainingMs: 15 * MS_PER_DAY,
    })
  );
  assert.equal(status.state, "refill_soon");
  assert.equal(status.chipLabel, "Refill soon");
  assert.equal(status.tone, "red");
  assert.ok(status.percent >= 90);
});

test("alert: unusual spike, well under 90% used", () => {
  const status = deriveAiUsagePace(
    baseInput({
      used: 50,
      quota: 1000,
      cycleElapsedFraction: 0.1,
      usedToday: 60,
      priorDailyAverage: 10,
      spikeAlertEnabled: true,
    })
  );
  assert.equal(status.state, "alert");
  assert.equal(status.chipLabel, "Alert");
  assert.equal(status.tone, "red");
  assert.equal(status.noticeTitle, "Unusual activity");
});

test("alert is suppressed when spikeAlertEnabled is false", () => {
  const status = deriveAiUsagePace(
    baseInput({
      used: 50,
      quota: 1000,
      cycleElapsedFraction: 0.5,
      usedToday: 60,
      priorDailyAverage: 10,
      spikeAlertEnabled: false,
    })
  );
  assert.notEqual(status.state, "alert");
});

test("high_pace: paceRatio >= 1.5, under 90% used", () => {
  const status = deriveAiUsagePace(
    baseInput({
      used: 200,
      quota: 1000,
      cycleElapsedFraction: 0.1,
      cycleRemainingMs: 20 * MS_PER_DAY,
      priorDailyAverage: 0,
    })
  );
  assert.equal(status.state, "high_pace");
  assert.equal(status.chipLabel, "High pace");
  assert.equal(status.tone, "amber");
  assert.match(status.noticeBody, /run out in about/);
});

test("light: paceRatio <= 0.5", () => {
  const status = deriveAiUsagePace(
    baseInput({
      used: 100,
      quota: 1000,
      cycleElapsedFraction: 0.5,
    })
  );
  assert.equal(status.state, "light");
  assert.equal(status.chipLabel, "Active");
  assert.equal(status.tone, "green");
  assert.equal(status.noticeTitle, "Usage is light");
});

test("active: paceRatio between 0.5 and 1.5 (normal)", () => {
  const status = deriveAiUsagePace(
    baseInput({
      used: 500,
      quota: 1000,
      cycleElapsedFraction: 0.5,
    })
  );
  assert.equal(status.state, "active");
  assert.equal(status.chipLabel, "Active");
  assert.equal(status.tone, "green");
  assert.equal(status.noticeTitle, "Usage speed is normal");
});

// ---------------------------------------------------------------------------
// Min-sample guard
// ---------------------------------------------------------------------------

test("min-sample guard: used=3 (below MIN_SAMPLE) with a huge theoretical pace ratio -> active, not high_pace", () => {
  // If the sample gate didn't apply, paceRatio = 3/(1000*0.1) = 0.03 (would read
  // as "light"); construct instead a case where elapsed is tiny so an ungated
  // ratio would be huge, and confirm the small-sample gate keeps it "active".
  const status = deriveAiUsagePace(
    baseInput({
      used: 3,
      quota: 10,
      cycleElapsedFraction: 0.1, // >= MIN_ELAPSED_FRACTION, but used < MIN_SAMPLE_REQUESTS
    })
  );
  assert.equal(status.state, "active");
});

test("min-sample guard: elapsed fraction below MIN_ELAPSED_FRACTION also forces active", () => {
  const status = deriveAiUsagePace(
    baseInput({
      used: 50,
      quota: 100,
      cycleElapsedFraction: 0.01, // below MIN_ELAPSED_FRACTION even though used is high
    })
  );
  assert.equal(status.state, "active");
});

// ---------------------------------------------------------------------------
// Zero / negative / NaN-ish input clamping
// ---------------------------------------------------------------------------

test("negative used clamps to 0 -> ready", () => {
  const status = deriveAiUsagePace(baseInput({ used: -5, quota: 150 }));
  assert.equal(status.state, "ready");
  assert.equal(status.percent, 0);
  assert.equal(status.left, 150);
});

test("zero/negative quota is treated as 1", () => {
  const status = deriveAiUsagePace(baseInput({ used: 5, quota: -20 }));
  assert.equal(status.state, "paused"); // 5 >= 1
  assert.equal(status.percent, 100);
  assert.equal(status.left, 0);
});

test("NaN used and quota clamp to safe defaults (0 and 1) -> ready", () => {
  const status = deriveAiUsagePace(baseInput({ used: NaN, quota: NaN }));
  assert.equal(status.state, "ready");
  assert.equal(status.percent, 0);
  assert.equal(status.left, 1);
});

test("NaN cycleElapsedFraction clamps to 0 without throwing", () => {
  assert.doesNotThrow(() => deriveAiUsagePace(baseInput({ cycleElapsedFraction: NaN })));
});

test("negative cycleRemainingMs clamps to 0 -> resetsLabel reads <1h, never negative", () => {
  const status = deriveAiUsagePace(baseInput({ cycleRemainingMs: -1000 }));
  assert.equal(status.resetsLabel, "Resets in <1h");
});

// ---------------------------------------------------------------------------
// resetsLabel formats
// ---------------------------------------------------------------------------

test("resetsLabel: under 1 hour reads '<1h'", () => {
  const status = deriveAiUsagePace(baseInput({ cycleRemainingMs: 30 * 60 * 1000 }));
  assert.equal(status.resetsLabel, "Resets in <1h");
});

test("resetsLabel: 18 hours reads 'Resets in 18h'", () => {
  const status = deriveAiUsagePace(baseInput({ cycleRemainingMs: 18 * MS_PER_HOUR }));
  assert.equal(status.resetsLabel, "Resets in 18h");
});

test("resetsLabel: just under the 36h cutoff still reads in hours", () => {
  const status = deriveAiUsagePace(baseInput({ cycleRemainingMs: 36 * MS_PER_HOUR - 1 }));
  assert.equal(status.resetsLabel, "Resets in 36h");
});

test("resetsLabel: at/above the 36h cutoff reads in days", () => {
  const status = deriveAiUsagePace(baseInput({ cycleRemainingMs: 36 * MS_PER_HOUR }));
  assert.equal(status.resetsLabel, "Resets in 2 days");
});

test("resetsLabel: 12 days reads 'Resets in 12 days'", () => {
  const status = deriveAiUsagePace(baseInput({ cycleRemainingMs: 12 * MS_PER_DAY }));
  assert.equal(status.resetsLabel, "Resets in 12 days");
});

// ---------------------------------------------------------------------------
// Run-out humanization boundaries (via the high_pace noticeBody)
// ---------------------------------------------------------------------------

// All four cases below share: quota=1000, used=200, elapsed=0.1 (paceRatio=2.0,
// solidly >= HIGH_PACE_RATIO), which reduces msToExhaust to
// left * remainingMs * elapsed / ((1-elapsed) * used) = 4 * remainingMs / 9.
// Picking remainingMs = 2.25 * targetMsToExhaust lands msToExhaust exactly on
// the target duration for each humanization tier.
function highPaceInputForTargetRunOut(targetMs: number): AiUsagePaceInput {
  return baseInput({
    used: 200,
    quota: 1000,
    cycleElapsedFraction: 0.1,
    cycleRemainingMs: 2.25 * targetMs,
    usedToday: 0,
    priorDailyAverage: 0,
  });
}

test("run-out humanization: hours tier (<36h)", () => {
  const status = deriveAiUsagePace(highPaceInputForTargetRunOut(10 * MS_PER_HOUR));
  assert.equal(status.state, "high_pace");
  assert.match(status.noticeBody, /about 10 hours/);
});

test("run-out humanization: days tier (<14d)", () => {
  const status = deriveAiUsagePace(highPaceInputForTargetRunOut(5 * MS_PER_DAY));
  assert.equal(status.state, "high_pace");
  assert.match(status.noticeBody, /about 5 days/);
});

test("run-out humanization: weeks tier (<8w)", () => {
  const status = deriveAiUsagePace(highPaceInputForTargetRunOut(21 * MS_PER_DAY));
  assert.equal(status.state, "high_pace");
  assert.match(status.noticeBody, /about 3 weeks/);
});

test("run-out humanization: months tier (>=8w)", () => {
  const status = deriveAiUsagePace(highPaceInputForTargetRunOut(270 * MS_PER_DAY));
  assert.equal(status.state, "high_pace");
  assert.match(status.noticeBody, /about 9 months/);
});

// ---------------------------------------------------------------------------
// percent/left are always clamped
// ---------------------------------------------------------------------------

test("percent is clamped to 100 and never negative", () => {
  const over = deriveAiUsagePace(baseInput({ used: 999, quota: 150 }));
  assert.equal(over.percent, 100);
  const empty = deriveAiUsagePace(baseInput({ used: 0, quota: 150 }));
  assert.equal(empty.percent, 0);
});
