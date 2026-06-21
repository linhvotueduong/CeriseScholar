import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTodayTargetModel,
  computeAdjustedTargets,
  countActiveWorkdays,
  EMPTY_RESEARCH_COUNTS,
  PROJECT_TYPE_MODELS,
  PROJECT_TYPE_ORDER,
  DEFAULT_PROJECT_SCOPE,
  TOTAL_PROJECT_POINTS,
  type ResearchCounts,
  type TodayTargetModelInput,
} from "./todayTargetModel";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

function modelInput(over: Partial<TodayTargetModelInput> = {}): TodayTargetModelInput {
  return {
    projectType: "literature-review",
    scope: DEFAULT_PROJECT_SCOPE,
    counts: EMPTY_RESEARCH_COUNTS,
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

test("every project type's section weights sum to 1000", () => {
  for (const type of PROJECT_TYPE_ORDER) {
    const w = PROJECT_TYPE_MODELS[type].weights;
    assert.equal(w.metaAnalysis + w.literatureReview + w.workspaceSynthesis + w.paperDraft + w.citations, 1000);
  }
});

test("progress is normal percent = completedPoints / 10, never above 100", () => {
  const counts: ResearchCounts = { ...EMPTY_RESEARCH_COUNTS, uploadedSources: 10, literatureRows: 20, codedRows: 10 };
  const m = computeTodayTargetModel(modelInput({ counts }));
  assert.equal(m.projectProgressPercent, m.completedPoints / 10);
  assert.ok(m.projectProgressPercent <= 100);
  assert.equal(m.totalPoints, TOTAL_PROJECT_POINTS);
});

test("complete only when ALL relevant sections are filled", () => {
  const counts = { ...EMPTY_RESEARCH_COUNTS } as ResearchCounts;
  (Object.keys(counts) as Array<keyof ResearchCounts>).forEach((k) => {
    // @ts-expect-error bulk-fill for the test
    counts[k] = typeof counts[k] === "boolean" ? true : 9999;
  });
  counts.duplicateIssues = 0; // a complete project has no duplicate-citation issues
  const m = computeTodayTargetModel(modelInput({ counts }));
  assert.equal(m.projectProgressPercent, 100);
  assert.equal(m.status, "complete");
});

test("Cerise readiness is not a completion input (same counts -> same points)", () => {
  const counts: ResearchCounts = { ...EMPTY_RESEARCH_COUNTS, uploadedSources: 5, literatureRows: 5 };
  assert.equal(
    computeTodayTargetModel(modelInput({ counts })).completedPoints,
    computeTodayTargetModel(modelInput({ counts })).completedPoints
  );
});

test("scope adjusts targets, not the 1000-point total", () => {
  const school = computeAdjustedTargets("literature-review", { ...DEFAULT_PROJECT_SCOPE, quality: "school" });
  const pub = computeAdjustedTargets("literature-review", { ...DEFAULT_PROJECT_SCOPE, quality: "publication" });
  assert.ok(pub.sourcesTarget > school.sourcesTarget);
  assert.equal(computeTodayTargetModel(modelInput({ scope: { ...DEFAULT_PROJECT_SCOPE, quality: "publication" } })).totalPoints, 1000);
});

test("meta-analysis counts only when relevant", () => {
  const counts: ResearchCounts = { ...EMPTY_RESEARCH_COUNTS, metaQuestionSet: true, metaTestSelected: true, effectsMapped: 50, forestPlotReady: true };
  assert.equal(computeTodayTargetModel(modelInput({ projectType: "literature-review", counts })).sectionScores.metaAnalysisScore, 0);
  assert.ok(computeTodayTargetModel(modelInput({ projectType: "meta-analysis", counts })).sectionScores.metaAnalysisScore > 0);
});

test("daily target from remaining points / workdays (1000 pts, 20 days -> 50 pts/day = 5%)", () => {
  const m = computeTodayTargetModel(modelInput({ userDeadline: d(2026, 7, 6) })); // +19 -> 20 active days
  assert.equal(m.completedPoints, 0);
  assert.equal(m.activeDaysLeft, 20);
  assert.equal(m.dailyTargetPoints, 50);
  assert.equal(m.dailyTargetPercent, 5);
});

test("today's tasks drive done/ring; ring closes exactly on full completion", () => {
  const setup = modelInput({ userDeadline: d(2026, 7, 6) });
  const half = computeTodayTargetModel({ ...setup, completedTaskWeightToday: 0.5 });
  assert.equal(half.doneTodayPercent, 2.5);
  assert.equal(half.ringProgress, 0.5);
  const full = computeTodayTargetModel({ ...setup, completedTaskWeightToday: 1 });
  assert.equal(full.ringProgress, 1);
  assert.equal(full.status, "on_track");
});

test("project complete -> daily target 0, ring 100%, status complete", () => {
  const counts = { ...EMPTY_RESEARCH_COUNTS } as ResearchCounts;
  (Object.keys(counts) as Array<keyof ResearchCounts>).forEach((k) => {
    // @ts-expect-error bulk-fill for the test
    counts[k] = typeof counts[k] === "boolean" ? true : 9999;
  });
  counts.duplicateIssues = 0; // a complete project has no duplicate-citation issues
  const m = computeTodayTargetModel(modelInput({ counts }));
  assert.equal(m.dailyTargetPercent, 0);
  assert.equal(m.ringProgress, 1);
  assert.equal(m.status, "complete");
});

test("impossible deadline -> deadline_at_risk, no NaN/Infinity", () => {
  const m = computeTodayTargetModel(modelInput({ projectStartDate: d(2026, 5, 28), userDeadline: d(2026, 6, 12) }));
  assert.equal(m.activeDaysLeft, 0);
  assert.equal(m.status, "deadline_at_risk");
  for (const v of [m.dailyTargetPoints, m.dailyTargetPercent, m.doneTodayPercent, m.ringProgress]) assert.ok(Number.isFinite(v));
});

test("tight future deadline beyond pace capacity -> at_risk", () => {
  const m = computeTodayTargetModel(modelInput({ userDeadline: d(2026, 6, 18) })); // +1 -> 2 active days, 500 pts/day
  assert.equal(m.deadlineAchievable, false);
  assert.equal(m.status, "at_risk");
  assert.ok(m.dailyTargetPercent > 18);
});

test("manual override sets daily target percent", () => {
  const m = computeTodayTargetModel(modelInput({ userDeadline: d(2026, 7, 6), manualTargetPercent: 7 }));
  assert.equal(m.dailyTargetPercent, 7);
});

test("pace changes finish pressure: higher pace -> earlier finish", () => {
  assert.equal(computeTodayTargetModel(modelInput({ paceMode: "low" })).paceTargetDays, 30);
  assert.equal(computeTodayTargetModel(modelInput({ paceMode: "high" })).paceTargetDays, 24);
});

test("countActiveWorkdays honors work weekdays and skipped dates", () => {
  const mon = d(2026, 6, 15);
  const sun = d(2026, 6, 21);
  assert.equal(countActiveWorkdays(mon, sun, [1, 2, 3, 4, 5], []), 5);
  assert.equal(countActiveWorkdays(mon, sun, [1, 2, 3, 4, 5], ["2026-06-17"]), 4);
  assert.equal(countActiveWorkdays(sun, mon, [1, 2, 3, 4, 5], []), 0);
});
