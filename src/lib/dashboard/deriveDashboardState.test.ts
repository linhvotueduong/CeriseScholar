import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRecentChanges, buildGreeting, deriveCurrentSection, deriveDashboardState } from "./deriveDashboardState";
import type { DashboardActivityEvent, DashboardSourceData, TodayTargetContext } from "./deriveDashboardState";
import { INCLUDED_MONTHLY_ALLOWANCE } from "@/lib/ai/allowance";
import { DEFAULT_PROJECT_SCOPE, DEFAULT_PROJECT_TYPE } from "@/lib/dashboard/todayTargetModel";
import type { Project } from "@/types/project";

// A fully "real" Today's Target context — satisfies Research plan's target
// date/pace/project-model checks so the tests below can isolate what happens
// AFTER the plan area, at the Theme clarity / pathway boundary.
const REAL_TARGET_CONTEXT: TodayTargetContext = {
  settings: {
    paceMode: "moderate",
    deadlineDate: "2026-12-01",
    workWeekdays: [1, 2, 3, 4, 5],
    skippedDates: [],
    dailyWorkGoalMinutes: 90,
    manualTargetPercent: null,
    projectType: DEFAULT_PROJECT_TYPE,
    scope: { ...DEFAULT_PROJECT_SCOPE },
  },
  projectStartDate: new Date("2026-01-01T00:00:00.000Z"),
  today: new Date("2026-06-23T12:00:00.000Z"),
  hasPersistedTarget: true,
};

const ev = (event_type: string, iso: string, id = "e"): DashboardActivityEvent => ({
  id,
  user_id: "u",
  project_id: "p",
  event_type,
  section_id: "",
  label: "",
  created_at: iso,
});
const NOW = Date.parse("2026-06-23T12:00:00Z");

// Minimal fixtures for the aiUsage derivation tests below — deriveDashboardState needs
// a full Project + DashboardSourceData, but the aiUsage field only reads
// aiKeyLast4/aiUsageCountThisMonth, so everything else can stay blank/neutral.
const PROJECT: Project = {
  id: "p1",
  user_id: "u1",
  name: "Test project",
  description: "",
  color: "#000000",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};
function blankSource(overrides: Partial<DashboardSourceData> = {}): DashboardSourceData {
  return {
    pdfs: [],
    highlights: [],
    annotations: [],
    literatureEntries: [],
    paperSections: [],
    metaAnalysis: null,
    codes: [],
    courseModules: [],
    courseVideos: [],
    courseProgress: [],
    courseNotes: [],
    tasks: [],
    activityEvents: [],
    ...overrides,
  };
}

// Usage-speed-health fields (docs/ai-usage-card-states.md) that depend on the
// wall clock (cycleElapsedFraction/cycleRemainingMs) are asserted as sane
// ranges rather than exact values here, since these tests don't pin `now` via
// targetContext — every other new field is fully deterministic and checked exactly.
function assertSaneCycleFields(aiUsage: { cycleElapsedFraction: number; cycleRemainingMs: number }) {
  assert.ok(Number.isFinite(aiUsage.cycleElapsedFraction));
  assert.ok(aiUsage.cycleElapsedFraction >= 0 && aiUsage.cycleElapsedFraction <= 1);
  assert.ok(Number.isFinite(aiUsage.cycleRemainingMs));
  assert.ok(aiUsage.cycleRemainingMs >= 0);
}

test("aiUsage defaults to the shared allowance when no key is connected (matches demo/fixture fallback)", () => {
  const derived = deriveDashboardState(PROJECT, blankSource(), "2026-06-23");
  assert.equal(derived.aiUsage.lane, "default");
  assert.equal(derived.aiUsage.usedThisMonth, 0);
  assert.equal(derived.aiUsage.allowance, INCLUDED_MONTHLY_ALLOWANCE);
  assert.equal(derived.aiUsage.keyLast4, null);
  assert.equal(derived.aiUsage.usedToday, 0);
  assert.equal(derived.aiUsage.quota, INCLUDED_MONTHLY_ALLOWANCE);
  assert.equal(derived.aiUsage.cycle, "month");
  assert.equal(derived.aiUsage.priorDailyAverage, 0);
  assert.equal(derived.aiUsage.spikeAlertEnabled, true);
  assertSaneCycleFields(derived.aiUsage);
});

test("aiUsage switches to the byok lane once a key is connected", () => {
  const derived = deriveDashboardState(
    PROJECT,
    blankSource({
      aiKeyLast4: "9f3a",
      aiUsageCountThisMonth: 42,
      aiUsageCountToday: 7,
      aiUsagePriorDailyAverage: 3.5,
      aiSpikeAlertEnabled: false,
    }),
    "2026-06-23"
  );
  assert.equal(derived.aiUsage.lane, "byok");
  assert.equal(derived.aiUsage.usedThisMonth, 42);
  assert.equal(derived.aiUsage.allowance, null);
  assert.equal(derived.aiUsage.keyLast4, "9f3a");
  assert.equal(derived.aiUsage.usedToday, 7);
  assert.equal(derived.aiUsage.cycle, "day");
  assert.equal(derived.aiUsage.priorDailyAverage, 3.5);
  assert.equal(derived.aiUsage.spikeAlertEnabled, false);
  assert.ok(Number.isFinite(derived.aiUsage.quota) && derived.aiUsage.quota > 0);
  assertSaneCycleFields(derived.aiUsage);
});

test("Activity Log surfaces the real event amid 100 project_opened rows (not empty/fake)", () => {
  const events: DashboardActivityEvent[] = [
    ...Array.from({ length: 100 }, (_, i) => ev("project_opened", `2026-06-23T10:00:${String(i % 60).padStart(2, "0")}Z`, `o${i}`)),
    ev("source_uploaded", "2026-06-23T08:00:00Z", "s1"),
  ];
  const log = buildRecentChanges(events, NOW);
  assert.equal(log.length, 1);
  assert.match(log[0].title, /source|Evidence/i);
});

test("page-load noise only -> honest empty Activity Log (no fake rows)", () => {
  const events = [ev("project_opened", "2026-06-23T11:00:00Z"), ev("research_focus_opened", "2026-06-23T11:30:00Z"), ev("dashboard_loaded", "2026-06-23T11:40:00Z")];
  assert.deepEqual(buildRecentChanges(events, NOW), []);
});

test("repeated same-type events within 30 minutes are deduped to one", () => {
  const events = [
    ev("source_uploaded", "2026-06-23T10:00:00Z", "a"),
    ev("source_uploaded", "2026-06-23T10:10:00Z", "b"),
    ev("source_uploaded", "2026-06-23T10:20:00Z", "c"),
  ];
  assert.equal(buildRecentChanges(events, NOW).length, 1);
});

test("same-type events in different 30-min buckets are kept separately", () => {
  const events = [
    ev("source_uploaded", "2026-06-23T10:00:00Z", "a"),
    ev("source_uploaded", "2026-06-23T11:00:00Z", "b"),
  ];
  assert.equal(buildRecentChanges(events, NOW).length, 2);
});

test("keeps at most the 4 most recent meaningful events", () => {
  const events = [
    ev("source_uploaded", "2026-06-23T09:00:00Z"),
    ev("literature_row_saved", "2026-06-23T09:30:00Z"),
    ev("note_created", "2026-06-23T10:00:00Z"),
    ev("highlight_created", "2026-06-23T10:30:00Z"),
    ev("paper_draft_saved", "2026-06-23T11:00:00Z"),
  ];
  assert.equal(buildRecentChanges(events, NOW).length, 4);
});

test("deriveCurrentSection maps the most recent meaningful event to its section", () => {
  const events = [
    ev("literature_row_saved", "2026-06-23T09:00:00Z", "a"),
    ev("research_query_submitted", "2026-06-23T10:00:00Z", "b"),
    ev("paper_draft_saved", "2026-06-23T08:00:00Z", "c"),
  ];
  const result = deriveCurrentSection(events, { id: "meta-analysis", label: "Meta-analysis" });
  assert.deepEqual(result, { id: "scholarask", label: "ScholarAsk" });
});

test("deriveCurrentSection picks the most recent event regardless of input order", () => {
  const events = [
    ev("meta_analysis_updated", "2026-06-23T07:00:00Z", "a"),
    ev("source_uploaded", "2026-06-23T12:00:00Z", "b"),
  ];
  const result = deriveCurrentSection(events, { id: "literature-review", label: "Literature Review Table" });
  assert.deepEqual(result, { id: "workspace", label: "Workspace" });
});

test("deriveCurrentSection falls back to the supplied score-comparison result when no event maps to a section", () => {
  const events = [ev("project_opened", "2026-06-23T09:00:00Z"), ev("dashboard_task_completed", "2026-06-23T10:00:00Z")];
  const result = deriveCurrentSection(events, { id: "literature-review", label: "Literature Review Table" });
  assert.deepEqual(result, { id: "literature-review", label: "Literature Review Table" });
});

test("deriveCurrentSection falls back with no events at all", () => {
  const result = deriveCurrentSection([], { id: "meta-analysis", label: "Meta-analysis" });
  assert.deepEqual(result, { id: "meta-analysis", label: "Meta-analysis" });
});

// ----------------------------------------------------------- Research Pathway wiring
// docs/research-readiness-checklist-model.md §6.3/§7 — migrations 025/026 give the
// readiness engine real pathwayText / sources.finished signals instead of the
// permanent nulls that stood in before the Research Pathway home and Finish button
// shipped. These prove the DATA LAYER (deriveDashboardState) passes the real project/
// pdf fields through; researchReadiness.test.ts already proves the pure engine reacts
// correctly to non-null values (primary signal) and to null (escape hatch).

const PATHWAY_PROJECT: Project = {
  ...PROJECT,
  name: "Sleep and memory consolidation in adolescents",
  description: "How sleep quality affects memory consolidation in high-school students.",
};

test("pathwayText flows from projects.research_question through to the readiness engine", () => {
  const withPathway: Project = { ...PATHWAY_PROJECT, research_question: "Does sleep restriction reduce recall accuracy in teens?" };
  const derived = deriveDashboardState(withPathway, blankSource(), "2026-06-23", REAL_TARGET_CONTEXT);
  // Plan + topic + pathway all recognized with zero evidence work -> status moves
  // straight to Evidence base (the pathway check no longer needs the journey-event
  // or evidence-work escape hatches now that the home is wired up).
  assert.equal(derived.researchFocus.currentStatus, "Evidence base");
  assert.equal(derived.researchFocus.nextBestMove, "Upload a source");
});

test("pathwayText is recognized from the optional approach/hypothesis fields too", () => {
  const withApproachOnly: Project = { ...PATHWAY_PROJECT, research_hypothesis: "Teens sleeping under 7 hours will show worse next-day recall." };
  const derived = deriveDashboardState(withApproachOnly, blankSource(), "2026-06-23", REAL_TARGET_CONTEXT);
  assert.equal(derived.researchFocus.currentStatus, "Evidence base");
});

test("no pathway text at all still stays at Theme clarity, now with the 'State your pathway' home move", () => {
  const derived = deriveDashboardState(PATHWAY_PROJECT, blankSource(), "2026-06-23", REAL_TARGET_CONTEXT);
  assert.equal(derived.researchFocus.currentStatus, "Theme clarity");
  // Now that the Research Pathway home has shipped (pathwayText is "" rather than
  // null), the move copy adapts per §6.4: "State your pathway" (home exists, empty)
  // instead of "Explore research pathways" (blank-page explorer, home doesn't exist).
  assert.equal(derived.researchFocus.nextBestMove, "State your pathway");
});

test("sources.finished flows from pdfs.finished_at through to the Evidence base health row", () => {
  const pdfs = [
    { id: "pdf-1", ocr_status: "completed", finished_at: "2026-06-20T00:00:00.000Z" },
    { id: "pdf-2", ocr_status: "completed", finished_at: "2026-06-20T00:00:00.000Z" },
    { id: "pdf-3", ocr_status: "completed", finished_at: null },
  ];
  // Only ONE pdf has an insight row — if the engine were still falling back to the
  // insight-count proxy this would read "1 finished"; wired to the real column it
  // must read "2 finished" (pdf-1 and pdf-2 both have finished_at set).
  const literatureEntries = [{ id: "row-1", pdf_id: "pdf-1", source: "pdf-1", user_notes: "A real observation about sleep debt." }];
  const derived = deriveDashboardState(PATHWAY_PROJECT, blankSource({ pdfs, literatureEntries }), "2026-06-23");
  const evidenceRow = derived.researchFocus.health.find((row) => row.label === "Evidence base");
  assert.ok(evidenceRow);
  assert.equal(evidenceRow!.value, "2 finished");
});

test("sources.finished is honestly 0 when no source has been marked finished yet (not the insight escape hatch)", () => {
  const pdfs = [{ id: "pdf-1", ocr_status: "completed", finished_at: null }];
  const literatureEntries = [{ id: "row-1", pdf_id: "pdf-1", source: "pdf-1", user_notes: "A real observation about sleep debt." }];
  const derived = deriveDashboardState(PATHWAY_PROJECT, blankSource({ pdfs, literatureEntries }), "2026-06-23");
  const evidenceRow = derived.researchFocus.health.find((row) => row.label === "Evidence base");
  assert.ok(evidenceRow);
  assert.equal(evidenceRow!.value, "In progress"); // 0 finished, but real work exists
});

test("buildGreeting picks time-of-day by local hour", () => {
  assert.equal(buildGreeting(new Date(2026, 5, 23, 8), "x").timeOfDay, "morning");
  assert.equal(buildGreeting(new Date(2026, 5, 23, 13), "x").timeOfDay, "afternoon");
  assert.equal(buildGreeting(new Date(2026, 5, 23, 20), "x").timeOfDay, "evening");
  assert.equal(buildGreeting(new Date(2026, 5, 23, 8), "Complete literature rows.").focusLine, "Complete literature rows.");
});

// --- Stage 1 personalization pass-through (behaviorProfile/aiInsight) --------------

test("behaviorProfile defaults to a safe, lowConfidence shape when the caller never supplies one", () => {
  const derived = deriveDashboardState(PROJECT, blankSource(), "2026-06-23");
  assert.equal(derived.behaviorProfile.lowConfidence, true);
  assert.equal(derived.behaviorProfile.taskCompletionRate, null);
  assert.deepEqual(derived.behaviorProfile.activeSections, []);
  assert.equal(derived.aiInsight, null);
});

test("behaviorProfile and aiInsight pass through untouched when the caller supplies them", () => {
  const suppliedProfile = {
    sampleDays: 20,
    taskCompletionRate: 0.62,
    completionRateByDifficulty: { easy: 0.9 },
    activeSections: ["literature-review" as const],
    avoidedSection: "citations" as const,
    workRhythm: { activeDaysPerWeek: 4, longestGapDays: 2 },
    jumperScore: 0.3,
    tasksPerActiveDay: 1.5,
    lowConfidence: false,
  };
  const suppliedInsight = { guidance: "Focus on citations today.", focusSection: "citations" };
  const derived = deriveDashboardState(
    PROJECT,
    blankSource({ behaviorProfile: suppliedProfile, aiInsight: suppliedInsight }),
    "2026-06-23"
  );
  assert.deepEqual(derived.behaviorProfile, suppliedProfile);
  assert.deepEqual(derived.aiInsight, suppliedInsight);
});
