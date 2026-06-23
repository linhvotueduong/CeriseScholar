import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRecentChanges, buildGreeting } from "./deriveDashboardState";
import type { DashboardActivityEvent } from "./deriveDashboardState";

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
