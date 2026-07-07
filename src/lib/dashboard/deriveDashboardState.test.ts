import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRecentChanges, buildGreeting, deriveDashboardState } from "./deriveDashboardState";
import type { DashboardActivityEvent, DashboardSourceData } from "./deriveDashboardState";
import { INCLUDED_MONTHLY_ALLOWANCE } from "@/lib/ai/allowance";
import type { Project } from "@/types/project";

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
const NEUTRAL_LOCAL_SETUP = { agentReady: false, ollamaReady: false, safetyReady: false };
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

test("aiUsage defaults to the Included lane + shared allowance when no key is connected (matches demo/fixture fallback)", () => {
  const derived = deriveDashboardState(PROJECT, blankSource(), NEUTRAL_LOCAL_SETUP, "2026-06-23");
  assert.deepEqual(derived.aiUsage, {
    lane: "default",
    usedThisMonth: 0,
    allowance: INCLUDED_MONTHLY_ALLOWANCE,
    keyLast4: null,
  });
});

test("aiUsage switches to the byok lane (unlimited, no allowance) once a key is connected", () => {
  const derived = deriveDashboardState(
    PROJECT,
    blankSource({ aiKeyLast4: "9f3a", aiUsageCountThisMonth: 42 }),
    NEUTRAL_LOCAL_SETUP,
    "2026-06-23"
  );
  assert.deepEqual(derived.aiUsage, {
    lane: "byok",
    usedThisMonth: 42,
    allowance: null,
    keyLast4: "9f3a",
  });
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

test("buildGreeting picks time-of-day by local hour", () => {
  assert.equal(buildGreeting(new Date(2026, 5, 23, 8), "x").timeOfDay, "morning");
  assert.equal(buildGreeting(new Date(2026, 5, 23, 13), "x").timeOfDay, "afternoon");
  assert.equal(buildGreeting(new Date(2026, 5, 23, 20), "x").timeOfDay, "evening");
  assert.equal(buildGreeting(new Date(2026, 5, 23, 8), "Complete literature rows.").focusLine, "Complete literature rows.");
});
