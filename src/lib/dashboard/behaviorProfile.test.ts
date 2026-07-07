import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBehaviorProfile } from "./behaviorProfile";
import type { DashboardActivityEvent, DashboardTask } from "./deriveDashboardState";

const NOW = new Date("2026-07-07T12:00:00.000Z");

function ev(eventType: string, iso: string, sectionId = ""): DashboardActivityEvent {
  return {
    id: `e-${iso}-${eventType}-${Math.random()}`,
    user_id: "u1",
    project_id: "p1",
    event_type: eventType,
    section_id: sectionId,
    label: "",
    created_at: iso,
  };
}

function task(overrides: Partial<DashboardTask> & { task_date: string }): DashboardTask {
  return {
    id: `t-${Math.random()}`,
    user_id: "u1",
    project_id: "p1",
    scheduled_time: "09:00",
    title: "Task",
    subtitle: "",
    section_id: "literature-review",
    status: "pending",
    sort_order: 0,
    generation_key: `recommended:p1:${overrides.task_date}:hash:0`,
    deleted_at: null,
    completed_at: null,
    created_at: `${overrides.task_date}T09:00:00.000Z`,
    updated_at: `${overrides.task_date}T09:00:00.000Z`,
    origin: "recommended",
    difficulty: "medium",
    ...overrides,
  };
}

test("cold start: no history at all yields a null/empty, lowConfidence profile", () => {
  const profile = computeBehaviorProfile({ activityEvents: [], taskHistory: [], now: NOW });
  assert.equal(profile.sampleDays, 0);
  assert.equal(profile.taskCompletionRate, null);
  assert.deepEqual(profile.completionRateByDifficulty, {});
  assert.deepEqual(profile.activeSections, []);
  assert.equal(profile.avoidedSection, null);
  assert.equal(profile.workRhythm.activeDaysPerWeek, 0);
  assert.equal(profile.workRhythm.longestGapDays, 0);
  assert.equal(profile.jumperScore, 0);
  assert.equal(profile.tasksPerActiveDay, null);
  assert.equal(profile.lowConfidence, true);
});

test("cold start: a little activity but fewer than 5 issued tasks stays lowConfidence with a null completion rate", () => {
  const events = [ev("source_uploaded", "2026-07-06T10:00:00.000Z")];
  const tasks = [
    task({ task_date: "2026-07-06", status: "completed" }),
    task({ task_date: "2026-07-07", status: "pending" }),
  ];
  const profile = computeBehaviorProfile({ activityEvents: events, taskHistory: tasks, now: NOW });
  assert.equal(profile.taskCompletionRate, null);
  assert.equal(profile.lowConfidence, true);
});

test("completion-rate math: computes completed/issued once there are enough issued recommended tasks and enough days", () => {
  const days = ["2026-06-28", "2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04"];
  const tasks: DashboardTask[] = [];
  days.forEach((day, index) => {
    tasks.push(task({ task_date: day, status: index < 3 ? "completed" : "pending" }));
  });
  const events = days.map((day) => ev("literature_row_saved", `${day}T09:00:00.000Z`));
  const profile = computeBehaviorProfile({ activityEvents: events, taskHistory: tasks, now: NOW });
  assert.equal(profile.lowConfidence, false);
  assert.equal(profile.taskCompletionRate, 3 / 7);
});

test("completion-rate by difficulty: only reports a difficulty bucket once it has enough issued samples", () => {
  const days = ["2026-06-28", "2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04"];
  const tasks: DashboardTask[] = [
    task({ task_date: days[0], difficulty: "easy", status: "completed" }),
    task({ task_date: days[1], difficulty: "easy", status: "completed" }),
    task({ task_date: days[2], difficulty: "hard", status: "pending" }),
    task({ task_date: days[3], difficulty: "medium", status: "completed" }),
    task({ task_date: days[4], difficulty: "medium", status: "pending" }),
    task({ task_date: days[5], difficulty: "medium", status: "pending" }),
    task({ task_date: days[6], difficulty: "medium", status: "completed" }),
  ];
  const events = days.map((day) => ev("literature_row_saved", `${day}T09:00:00.000Z`));
  const profile = computeBehaviorProfile({ activityEvents: events, taskHistory: tasks, now: NOW });
  assert.equal(profile.completionRateByDifficulty.easy, 1);
  assert.equal(profile.completionRateByDifficulty.medium, 2 / 4);
  // "hard" only had 1 issued sample — below MIN_ISSUED_TASKS_PER_DIFFICULTY, so omitted.
  assert.equal(profile.completionRateByDifficulty.hard, undefined);
});

test("jumper vs linear: a user who works the same section every active day scores near 0", () => {
  const days = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05", "2026-07-06"];
  const events = days.map((day) => ev("literature_row_saved", `${day}T09:00:00.000Z`));
  const profile = computeBehaviorProfile({ activityEvents: events, taskHistory: [], now: NOW });
  assert.equal(profile.jumperScore, 0);
});

test("jumper vs linear: a user who hops sections every active day scores near 1", () => {
  const days = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05", "2026-07-06"];
  const eventTypes = [
    "literature_row_saved",
    "meta_analysis_updated",
    "paper_draft_saved",
    "literature_row_saved",
    "meta_analysis_updated",
    "paper_draft_saved",
  ];
  const events = days.map((day, index) => ev(eventTypes[index], `${day}T09:00:00.000Z`));
  const profile = computeBehaviorProfile({ activityEvents: events, taskHistory: [], now: NOW });
  assert.equal(profile.jumperScore, 1);
});

test("avoided section: a section the recommender keeps issuing but the user barely touches is flagged", () => {
  const days = ["2026-06-28", "2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04"];
  const tasks: DashboardTask[] = days.map((day) => task({ task_date: day, section_id: "citations", status: "pending" }));
  // Real activity happens elsewhere (workspace), never in citations.
  const events = days.map((day) => ev("source_uploaded", `${day}T09:00:00.000Z`));
  const profile = computeBehaviorProfile({ activityEvents: events, taskHistory: tasks, now: NOW });
  assert.equal(profile.avoidedSection, "citations");
});

test("avoided section: null when real activity keeps pace with what's issued", () => {
  const days = ["2026-06-28", "2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04"];
  const tasks: DashboardTask[] = days.map((day) => task({ task_date: day, section_id: "citations", status: "completed" }));
  const events = days.map((day) => ev("literature_row_saved", `${day}T09:00:00.000Z`, "citations"));
  const profile = computeBehaviorProfile({ activityEvents: events, taskHistory: tasks, now: NOW });
  assert.equal(profile.avoidedSection, null);
});

test("gap detection: a long-idle user shows the gap since their last active day, even with no historical gaps", () => {
  const events = [ev("literature_row_saved", "2026-07-01T09:00:00.000Z")];
  const profile = computeBehaviorProfile({ activityEvents: events, taskHistory: [], now: NOW });
  // last active day 2026-07-01, now 2026-07-07 -> 6 days.
  assert.equal(profile.workRhythm.longestGapDays, 6);
});

test("gap detection: picks up the largest historical gap between active days", () => {
  const events = [
    ev("literature_row_saved", "2026-06-20T09:00:00.000Z"),
    ev("literature_row_saved", "2026-06-21T09:00:00.000Z"),
    ev("literature_row_saved", "2026-07-06T09:00:00.000Z"),
  ];
  const profile = computeBehaviorProfile({ activityEvents: events, taskHistory: [], now: NOW });
  // 2026-06-21 -> 2026-07-06 is a 15-day gap, bigger than the 1-day gap to now (2026-07-07).
  assert.equal(profile.workRhythm.longestGapDays, 15);
});

test("active sections are ranked by real activity, most active first", () => {
  const events = [
    ev("literature_row_saved", "2026-07-01T09:00:00.000Z"),
    ev("literature_row_saved", "2026-07-02T09:00:00.000Z"),
    ev("literature_row_saved", "2026-07-03T09:00:00.000Z"),
    ev("meta_analysis_updated", "2026-07-04T09:00:00.000Z"),
  ];
  const profile = computeBehaviorProfile({ activityEvents: events, taskHistory: [], now: NOW });
  assert.deepEqual(profile.activeSections, ["literature-review", "meta-analysis"]);
});

test("tasksPerActiveDay is null with no active days, and computed otherwise", () => {
  const empty = computeBehaviorProfile({ activityEvents: [], taskHistory: [], now: NOW });
  assert.equal(empty.tasksPerActiveDay, null);

  const days = ["2026-07-01", "2026-07-02"];
  const tasks = [
    task({ task_date: days[0], status: "completed" }),
    task({ task_date: days[0], status: "completed", id: "t2" }),
    task({ task_date: days[1], status: "pending" }),
  ];
  const events = days.map((day) => ev("literature_row_saved", `${day}T09:00:00.000Z`));
  const profile = computeBehaviorProfile({ activityEvents: events, taskHistory: tasks, now: NOW });
  assert.equal(profile.tasksPerActiveDay, 1); // 2 completed / 2 active days
});

test("history outside the 30-day window is ignored", () => {
  const events = [ev("literature_row_saved", "2026-01-01T09:00:00.000Z")];
  const tasks = [task({ task_date: "2026-01-01", status: "completed" })];
  const profile = computeBehaviorProfile({ activityEvents: events, taskHistory: tasks, now: NOW });
  assert.equal(profile.sampleDays, 0);
  assert.deepEqual(profile.activeSections, []);
});
