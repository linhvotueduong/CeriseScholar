import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTodayTargetModel,
  computeCompletedWorkUnits,
  computeScopeMultiplier,
  countActiveWorkdays,
  PROJECT_TYPE_DEFAULTS,
  type TodayTargetModelInput,
} from "./todayTargetModel";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

function baseInput(over: Partial<TodayTargetModelInput> = {}): TodayTargetModelInput {
  return {
    projectType: "literature-review", // default 100 work units, 30 days
    completedWorkUnits: 0,
    projectStartDate: d(2026, 6, 17),
    today: d(2026, 6, 17),
    userDeadline: null,
    paceMode: "low",
    workWeekdays: ALL_DAYS,
    skippedDates: [],
    completedTaskWeightToday: 0,
    ...over,
  };
}

test("scope multiplier and completed work units", () => {
  assert.equal(computeScopeMultiplier({}), 1);
  assert.equal(computeScopeMultiplier({ sources: 2, quality: 1.5 }), 3);
  assert.equal(computeCompletedWorkUnits({ uploadedSources: 2, syntheses: 1 }), 2 * 4 + 5);
  assert.equal(computeCompletedWorkUnits({}), 0);
});

test("adjustedWorkUnits = projectType default x scope", () => {
  const m = computeTodayTargetModel(baseInput({ scope: { complexity: 2 } }));
  assert.equal(m.adjustedWorkUnits, PROJECT_TYPE_DEFAULTS["literature-review"].defaultWorkUnits * 2);
});

test("worked example: 100 units, 60 remaining, 20 workdays -> 3 units/day, 3%", () => {
  // start=today, deadline=today+19, all days are workdays, low pace -> 20 active days inclusive.
  const m = computeTodayTargetModel(
    baseInput({ completedWorkUnits: 40, userDeadline: d(2026, 7, 6) }) // 2026-06-17 + 19 = 2026-07-06
  );
  assert.equal(m.adjustedWorkUnits, 100);
  assert.equal(m.remainingWorkUnits, 60);
  assert.equal(m.activeDaysLeft, 20);
  assert.equal(m.dailyWorkUnitsNeeded, 3);
  assert.equal(m.dailyTargetPercent, 3);
});

test("today's tasks drive done/remaining/ring; ring closes exactly on full completion", () => {
  // daily target 8%: remaining 80 over 10 active days -> 8 units/day -> 8%.
  const setup = baseInput({ completedWorkUnits: 20, userDeadline: d(2026, 6, 26) }); // +9 days -> 10 active
  const half = computeTodayTargetModel({ ...setup, completedTaskWeightToday: 0.5 });
  assert.equal(half.dailyTargetPercent, 8);
  assert.equal(half.doneTodayPercent, 4);
  assert.equal(half.remainingTodayPercent, 4);
  assert.equal(half.ringProgress, 0.5);

  const full = computeTodayTargetModel({ ...setup, completedTaskWeightToday: 1 });
  assert.equal(full.doneTodayPercent, full.dailyTargetPercent);
  assert.equal(full.ringProgress, 1); // closes exactly
  assert.equal(full.status, "on_track");
});

test("project complete -> daily target 0, ring 100%, status complete", () => {
  const m = computeTodayTargetModel(baseInput({ completedWorkUnits: 100 }));
  assert.equal(m.projectProgressPercent, 100);
  assert.equal(m.dailyTargetPercent, 0);
  assert.equal(m.ringProgress, 1);
  assert.equal(m.status, "complete");
});

test("impossible deadline (expected finish in the past) -> deadline_at_risk, no NaN/Infinity", () => {
  const m = computeTodayTargetModel(
    baseInput({
      completedWorkUnits: 40,
      projectStartDate: d(2026, 5, 28),
      userDeadline: d(2026, 6, 12), // paceTargetDate ~ start+15 = 2026-06-12, before today 06-17
    })
  );
  assert.equal(m.activeDaysLeft, 0);
  assert.equal(m.status, "deadline_at_risk");
  assert.equal(m.deadlineAchievable, false);
  for (const value of [
    m.dailyWorkUnitsNeeded,
    m.dailyTargetPercent,
    m.doneTodayPercent,
    m.remainingTodayPercent,
    m.ringProgress,
  ]) {
    assert.ok(Number.isFinite(value), `expected finite, got ${value}`);
  }
});

test("tight but future deadline beyond pace capacity -> at_risk (honest high target, not capped calm)", () => {
  // remaining 90 over 2 active days = 45 units/day, far above low max (8).
  const m = computeTodayTargetModel(
    baseInput({ completedWorkUnits: 10, userDeadline: d(2026, 6, 18) }) // +1 day -> 2 active days
  );
  assert.equal(m.activeDaysLeft, 2);
  assert.equal(m.deadlineAchievable, false);
  assert.equal(m.status, "at_risk");
  assert.ok(m.dailyTargetPercent > 18, "displayed target should not be capped to look calm");
});

test("manual override sets the daily target percent for the day", () => {
  const m = computeTodayTargetModel(
    baseInput({ completedWorkUnits: 40, userDeadline: d(2026, 7, 6), manualTargetPercent: 5, completedTaskWeightToday: 0.4 })
  );
  assert.equal(m.dailyTargetPercent, 5);
  assert.equal(m.doneTodayPercent, 2); // 5 * 0.4
});

test("pace changes finish pressure: higher pace -> earlier expected finish", () => {
  const low = computeTodayTargetModel(baseInput({ paceMode: "low" }));
  const high = computeTodayTargetModel(baseInput({ paceMode: "high" }));
  assert.equal(low.paceTargetDays, 30); // 30 default x 1.0
  assert.equal(high.paceTargetDays, 24); // 30 default x 0.8
  assert.ok(high.paceTargetDays < low.paceTargetDays);
});

test("countActiveWorkdays honors work weekdays and skipped dates", () => {
  // Mon 2026-06-15 .. Sun 2026-06-21, Mon-Fri only -> 5 workdays.
  const mon = d(2026, 6, 15);
  const sun = d(2026, 6, 21);
  assert.equal(countActiveWorkdays(mon, sun, [1, 2, 3, 4, 5], []), 5);
  assert.equal(countActiveWorkdays(mon, sun, [1, 2, 3, 4, 5], ["2026-06-17"]), 4);
  assert.equal(countActiveWorkdays(sun, mon, [1, 2, 3, 4, 5], []), 0); // end before start
});
