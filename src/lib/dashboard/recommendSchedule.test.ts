import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeScheduleInputHash,
  recommendSchedule,
  RECOMMENDED_TASK_COUNT,
  type RecommendScheduleInput,
  type SectionProgressInput,
} from "./recommendSchedule";
import type { BehaviorProfile } from "./behaviorProfile";

const BASE_SECTIONS: SectionProgressInput[] = [
  { sectionId: "meta-analysis", percent: 60 },
  { sectionId: "literature-review", percent: 40 },
  { sectionId: "workspace", percent: 20 },
  { sectionId: "draft", percent: 80 },
  { sectionId: "citations", percent: 90 },
];

function baseInput(overrides: Partial<RecommendScheduleInput> = {}): RecommendScheduleInput {
  return {
    projectId: "p1",
    taskDate: "2026-07-07",
    paceMode: "moderate",
    sections: BASE_SECTIONS,
    ...overrides,
  };
}

function confidentProfile(overrides: Partial<BehaviorProfile> = {}): BehaviorProfile {
  return {
    sampleDays: 14,
    taskCompletionRate: 0.8,
    completionRateByDifficulty: {},
    activeSections: [],
    avoidedSection: null,
    workRhythm: { activeDaysPerWeek: 5, longestGapDays: 1 },
    jumperScore: 0.1,
    tasksPerActiveDay: 1,
    lowConfidence: false,
    ...overrides,
  };
}

// --- Backward compatibility: no profile at all -----------------------------------

test("with no profile, always returns exactly RECOMMENDED_TASK_COUNT tasks, weakest section first", () => {
  const result = recommendSchedule(baseInput());
  assert.equal(result.tasks.length, RECOMMENDED_TASK_COUNT);
  assert.equal(result.tasks[0].section_id, "workspace"); // lowest percent (20)
  const weightSum = result.tasks.reduce((sum, task) => sum + task.task_weight, 0);
  assert.ok(Math.abs(weightSum - 1) < 1e-9);
});

test("a lowConfidence profile behaves identically to no profile at all (same hash, same tasks)", () => {
  const withoutProfile = recommendSchedule(baseInput());
  const withLowConfidenceProfile = recommendSchedule(
    baseInput({ profile: confidentProfile({ lowConfidence: true, taskCompletionRate: 0.1, jumperScore: 0.9 }) })
  );
  assert.equal(withLowConfidenceProfile.inputHash, withoutProfile.inputHash);
  assert.deepEqual(
    withLowConfidenceProfile.tasks.map((t) => t.section_id),
    withoutProfile.tasks.map((t) => t.section_id)
  );
});

// --- Personalization case 1: low completion rate ----------------------------------

test("low taskCompletionRate reduces the task count by 1 (never below 2) and prefers easier sections among tied-weakness ties", () => {
  const tiedSections: SectionProgressInput[] = [
    { sectionId: "meta-analysis", percent: 20 }, // hard
    { sectionId: "literature-review", percent: 20 }, // medium
    { sectionId: "workspace", percent: 20 }, // easy
    { sectionId: "draft", percent: 90 },
    { sectionId: "citations", percent: 90 },
  ];
  const result = recommendSchedule(
    baseInput({ sections: tiedSections, profile: confidentProfile({ taskCompletionRate: 0.3 }) })
  );
  assert.equal(result.tasks.length, RECOMMENDED_TASK_COUNT - 1);
  assert.deepEqual(
    result.tasks.map((t) => t.section_id),
    ["workspace", "literature-review", "meta-analysis"]
  );
});

test("without the low-completion flag, the same tied sections break ties by fallback order instead of difficulty", () => {
  const tiedSections: SectionProgressInput[] = [
    { sectionId: "meta-analysis", percent: 20 },
    { sectionId: "literature-review", percent: 20 },
    { sectionId: "workspace", percent: 20 },
    { sectionId: "draft", percent: 90 },
    { sectionId: "citations", percent: 90 },
  ];
  const result = recommendSchedule(baseInput({ sections: tiedSections }));
  assert.equal(result.tasks.length, RECOMMENDED_TASK_COUNT);
  assert.deepEqual(
    result.tasks.slice(0, 3).map((t) => t.section_id),
    ["literature-review", "workspace", "meta-analysis"]
  );
});

// --- Personalization case 2: jumper score -----------------------------------------

test("a high jumperScore keeps the plan spanning at least 3 distinct sections and does not reduce the count", () => {
  const result = recommendSchedule(baseInput({ profile: confidentProfile({ jumperScore: 0.9 }) }));
  assert.equal(result.tasks.length, RECOMMENDED_TASK_COUNT);
  assert.ok(new Set(result.tasks.map((t) => t.section_id)).size >= 3);
});

// --- Personalization case 3: avoided section --------------------------------------

test("a real avoidedSection matching the weakest pick is kept but moved to slot 2 (index 1) and softened", () => {
  const baseline = recommendSchedule(baseInput());
  assert.equal(baseline.tasks[0].section_id, "workspace"); // weakest, unpersonalized

  const result = recommendSchedule(baseInput({ profile: confidentProfile({ avoidedSection: "workspace" }) }));
  assert.equal(result.tasks[0].section_id, "literature-review");
  assert.equal(result.tasks[1].section_id, "workspace");

  const softened = result.tasks.find((t) => t.section_id === "workspace")!;
  const unsoftened = baseline.tasks.find((t) => t.section_id === "workspace")!;
  assert.ok(softened.estimated_minutes < unsoftened.estimated_minutes);
});

test("avoidedSection that is NOT the weakest pick is left in place (no reorder, no softening)", () => {
  const baseline = recommendSchedule(baseInput());
  const result = recommendSchedule(baseInput({ profile: confidentProfile({ avoidedSection: "draft" }) }));
  assert.deepEqual(
    result.tasks.map((t) => t.section_id),
    baseline.tasks.map((t) => t.section_id)
  );
  const draftTask = result.tasks.find((t) => t.section_id === "draft")!;
  const baselineDraftTask = baseline.tasks.find((t) => t.section_id === "draft")!;
  assert.equal(draftTask.estimated_minutes, baselineDraftTask.estimated_minutes);
});

// --- Personalization case 4: re-entry after a long gap ----------------------------

test("longestGapDays >= 4 leads with the lightest (lowest estimated-minutes) selected task", () => {
  const gapSections: SectionProgressInput[] = [
    { sectionId: "meta-analysis", percent: 10 }, // weakest -> would lead normally
    { sectionId: "literature-review", percent: 20 },
    { sectionId: "workspace", percent: 30 }, // lightest template (20 base minutes)
    { sectionId: "draft", percent: 40 },
  ];
  const result = recommendSchedule(
    baseInput({
      sections: gapSections,
      paceMode: "low", // intensity 1, so template baseMinutes order is preserved
      profile: confidentProfile({ workRhythm: { activeDaysPerWeek: 1, longestGapDays: 6 } }),
    })
  );
  assert.equal(result.tasks[0].section_id, "workspace");
  assert.deepEqual(
    result.tasks.slice(1).map((t) => t.section_id),
    ["meta-analysis", "literature-review", "draft"]
  );
});

test("a gap below the re-entry threshold does not reorder", () => {
  const gapSections: SectionProgressInput[] = [
    { sectionId: "meta-analysis", percent: 10 },
    { sectionId: "literature-review", percent: 20 },
    { sectionId: "workspace", percent: 30 },
    { sectionId: "draft", percent: 40 },
  ];
  const result = recommendSchedule(
    baseInput({
      sections: gapSections,
      paceMode: "low",
      profile: confidentProfile({ workRhythm: { activeDaysPerWeek: 5, longestGapDays: 3 } }),
    })
  );
  assert.equal(result.tasks[0].section_id, "meta-analysis");
});

// --- inputHash sensitivity ----------------------------------------------------------

test("inputHash changes when a personalization trigger flips, but not when only the underlying number moves within the same bucket", () => {
  const withoutProfile = recommendSchedule(baseInput());
  const withTrigger = recommendSchedule(baseInput({ profile: confidentProfile({ taskCompletionRate: 0.3 }) }));
  assert.notEqual(withTrigger.inputHash, withoutProfile.inputHash);

  const sameTriggerDifferentRate = recommendSchedule(baseInput({ profile: confidentProfile({ taskCompletionRate: 0.05 }) }));
  assert.equal(sameTriggerDifferentRate.inputHash, withTrigger.inputHash);
});

test("computeScheduleInputHash matches the hash recommendSchedule reports", () => {
  const input = baseInput({ profile: confidentProfile({ jumperScore: 0.9 }) });
  assert.equal(computeScheduleInputHash(input), recommendSchedule(input).inputHash);
});
