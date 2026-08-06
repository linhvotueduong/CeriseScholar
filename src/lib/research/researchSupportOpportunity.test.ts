import assert from "node:assert/strict";
import test from "node:test";
import { createResearchPathwayDocument } from "./researchPathwayDocument";
import type { ResearchPathDraft } from "./researchPathDraft";
import {
  RESEARCH_SUPPORT_CORRECTION_COOLDOWN_MS,
  cooldownResearchSupportCategory,
  createResearchSupportActivity,
  createResearchSupportPreferences,
  deriveResearchSupportOpportunity,
  deriveResearchSupportSignals,
  isReturningToUnfinishedResearch,
  loadResearchSupportPreferences,
  recordResearchSupportBreakpoint,
  recordResearchSupportSession,
  restoreResearchSupportCategory,
  saveResearchSupportPreferences,
  suppressResearchSupportCategory,
  updateResearchSupportMode,
  type ResearchSupportBreakpoint,
} from "./researchSupportOpportunity";

const NOW = Date.parse("2026-08-04T12:00:00.000Z");
const STEP = "stage-01-shape-problems";

function draft(explicitFriction = false): ResearchPathDraft {
  return { steps: {
    "stage-01-capture-concern": { completed: false, checks: {}, fields: { "concern-narrative": explicitFriction ? "I am stuck and do not know what to do next with these possible directions." : "I want to understand how research ideas become bounded problems.", "idea-0-text": "Problem framing may be a hidden bottleneck.", "idea-0-status": "promising" } },
    "stage-01-shape-problems": { completed: false, checks: {}, fields: {
      "frame-0-id": "frame-a", "frame-0-title": "Conceptual boundaries", "frame-0-situation": "The idea remains broad.", "frame-0-uncertainty": "Which boundary matters?", "frame-0-status": "exploring",
      "frame-1-id": "frame-b", "frame-1-title": "Evidence navigation", "frame-1-situation": "Search terms remain broad.", "frame-1-uncertainty": "Which adjacent field helps?", "frame-1-status": "exploring",
      "frame-2-id": "frame-c", "frame-2-title": "Decision criteria", "frame-2-situation": "Several viable routes remain.", "frame-2-uncertainty": "Which criteria should guide comparison?", "frame-2-status": "promising",
    } },
    "stage-01-explore-baseline": { completed: false, checks: {}, fields: {} },
    "stage-01-develop-questions": { completed: false, checks: {}, fields: {} },
    "stage-01-choose-pathway": { completed: false, checks: {}, fields: {} },
  } };
}

function breakpoint(sequence: number, stepId: string, kind: ResearchSupportBreakpoint["kind"] = "step-navigation"): ResearchSupportBreakpoint {
  return { sequence, stepId, kind, at: NOW + sequence * 1_000 };
}

function storage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

async function loopFixture(explicitFriction = false) {
  const document = await createResearchPathwayDocument({ projectId: "support-project", draft: draft(explicitFriction), now: new Date(NOW).toISOString() });
  let activity = createResearchSupportActivity(document.projectId);
  [STEP, "stage-01-explore-baseline", STEP, "stage-01-explore-baseline", STEP].forEach((stepId, index) => {
    activity = recordResearchSupportBreakpoint(activity, breakpoint(index + 1, stepId), document);
  });
  return { document, activity, event: breakpoint(6, STEP, "field-blur") };
}

test("quiet thinking is weak context and never creates an indication by itself", async () => {
  const document = await createResearchPathwayDocument({ projectId: "quiet-project", draft: draft(), now: new Date(NOW).toISOString() });
  const activity = createResearchSupportActivity(document.projectId);
  const preferences = createResearchSupportPreferences(document.projectId);
  const event = breakpoint(1, STEP, "field-blur");
  const signals = deriveResearchSupportSignals({ document, stepId: STEP, activity, idleSeconds: 600, editCount: 12 });
  assert.ok(signals.some((item) => item.id === "unfinished-pause" && item.strength === "weak"));
  assert.equal(deriveResearchSupportOpportunity({ document, stepId: STEP, activity, preferences, breakpoint: event, idleSeconds: 600, editCount: 12 }), null);
});

test("two task signals at a natural breakpoint produce one neutral opportunity", async () => {
  const { document, activity, event } = await loopFixture();
  const opportunity = deriveResearchSupportOpportunity({ document, stepId: STEP, activity, preferences: createResearchSupportPreferences(document.projectId), breakpoint: event });
  assert.ok(opportunity);
  assert.equal(opportunity?.category, "too-many-unresolved-paths");
  assert.ok(opportunity?.signals.some((item) => item.id === "multiple-open-paths"));
  assert.ok(opportunity?.signals.some((item) => item.id === "navigation-loop"));
  assert.equal(opportunity?.minimumStrongSignalsMet, true);
  assert.equal(opportunity?.rawSignalHistoryIncluded, false);
  assert.doesNotMatch(JSON.stringify(opportunity), /depressed|anxious|adhd|perfectionis|diagnos/i);
});

test("explicit requests for help remain local signals and still require a second signal", async () => {
  const { document, activity, event } = await loopFixture(true);
  const opportunity = deriveResearchSupportOpportunity({ document, stepId: STEP, activity, preferences: createResearchSupportPreferences(document.projectId), breakpoint: event });
  assert.ok(opportunity?.signals.some((item) => item.id === "explicit-friction-language"));
  assert.doesNotMatch(JSON.stringify(opportunity), /I am stuck and do not know what to do next/);
});

test("focus and on-request modes produce zero proactive indications", async () => {
  const { document, activity, event } = await loopFixture();
  const base = createResearchSupportPreferences(document.projectId);
  for (const mode of ["focus", "on-request"] as const) {
    const preferences = updateResearchSupportMode(base, mode);
    assert.equal(deriveResearchSupportOpportunity({ document, stepId: STEP, activity, preferences, breakpoint: event }), null);
  }
});

test("correction cooldown and permanent suppression alter future behavior", async () => {
  const { document, activity, event } = await loopFixture();
  const base = createResearchSupportPreferences(document.projectId);
  const first = deriveResearchSupportOpportunity({ document, stepId: STEP, activity, preferences: base, breakpoint: event });
  assert.ok(first);
  if (!first) return;
  const corrected = cooldownResearchSupportCategory(base, first.category, event.at, RESEARCH_SUPPORT_CORRECTION_COOLDOWN_MS);
  assert.equal(deriveResearchSupportOpportunity({ document, stepId: STEP, activity, preferences: corrected, breakpoint: { ...event, sequence: 7, at: event.at + 60_000 } }), null);
  const suppressed = suppressResearchSupportCategory(base, first.category);
  assert.equal(deriveResearchSupportOpportunity({ document, stepId: STEP, activity, preferences: suppressed, breakpoint: { ...event, sequence: 8, at: event.at + 365 * 24 * 60 * 60 * 1_000 } }), null);
  const restored = restoreResearchSupportCategory(suppressed, first.category);
  assert.ok(deriveResearchSupportOpportunity({ document, stepId: STEP, activity, preferences: restored, breakpoint: { ...event, sequence: 9, at: event.at + 1_000 } }));
});

test("project-scoped preferences fail open without retaining raw signal history", async () => {
  const local = storage();
  const preferences = createResearchSupportPreferences("support-storage");
  saveResearchSupportPreferences(local, preferences);
  assert.deepEqual(loadResearchSupportPreferences(local, "support-storage", NOW), preferences);
  const stored = local.getItem("cerise:research-support:v1:support-storage") ?? "";
  assert.match(stored, /"rawSignalHistoryStored":false/);
  assert.doesNotMatch(stored, /recentStepVisits|revisionBreakpoints|researcherText/);
  local.setItem("cerise:research-support:v1:support-storage", JSON.stringify({ ...preferences, projectId: "another-project", rawSignalHistoryStored: true }));
  assert.deepEqual(loadResearchSupportPreferences(local, "support-storage", NOW), createResearchSupportPreferences("support-storage"));
});

test("returning-to-unfinished detection uses one bounded session marker", async () => {
  const earlier = await createResearchPathwayDocument({ projectId: "return-project", draft: draft(), now: new Date(NOW - 3_600_000).toISOString() });
  const changedDraft = draft();
  changedDraft.steps[STEP].fields["frame-0-situation"] = "The idea changed after the prior session.";
  const current = await createResearchPathwayDocument({ projectId: "return-project", draft: changedDraft, previous: earlier, now: new Date(NOW).toISOString() });
  const preferences = recordResearchSupportSession(createResearchSupportPreferences(earlier.projectId), earlier, STEP, NOW - 3_600_000);
  assert.equal(isReturningToUnfinishedResearch(preferences, current, STEP, NOW), true);
  assert.equal(isReturningToUnfinishedResearch(preferences, current, STEP, NOW - 3_500_000), false);
});
