import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeResearchReadiness,
  isGenuineApa,
  sourceTarget,
  READINESS_WHY_LINES,
  READINESS_SUMMARY_MAX,
  type ReadinessSignals,
} from "./researchReadiness";

const NOW = Date.parse("2026-07-02T12:00:00Z");
const RECENT = NOW - 60 * 60 * 1000; // 1h ago — inside the 7-day window
const STALE = NOW - 10 * 24 * 60 * 60 * 1000; // 10 days ago — outside the window

function blank(): ReadinessSignals {
  return {
    now: NOW,
    titleText: "",
    topicText: "",
    pathwayText: null,
    settings: { hasTargetDate: false, hasPace: false, hasProjectModel: false, expectedSources: null },
    sources: { total: 0, ocrFailed: 0, finished: null, insightSources: 0 },
    highlights: 0,
    meaningfulNotes: 0,
    userCodes: 0,
    themedRows: 0,
    codedHighlightFraction: 0,
    rows: { total: 0, insightful: 0, genuineApa: 0, synthesized: 0, ripe: 0, ripeSynthesized: 0 },
    draft: { litSection: false, coreSections: 0, referencesSynced: false, abstract: false, conclusion: false },
    meta: { exists: false, question: false, hypothesis: false, typeSet: false, mapped: false, results: false, requiredByScope: false },
    journeyEvents: null,
    synthQuality: 0,
    recentEvents: [],
  };
}

function withPlanAndTopic(s: ReadinessSignals): ReadinessSignals {
  return {
    ...s,
    titleText: "Sleep and memory consolidation in adolescents",
    topicText: "How sleep quality affects memory consolidation in high-school students.",
    settings: { ...s.settings, hasTargetDate: true, hasPace: true, hasProjectModel: true },
  };
}

/** Evidence base fully captured (also satisfies pathway via the evidence hatch). */
function withEvidence(s: ReadinessSignals): ReadinessSignals {
  return {
    ...s,
    sources: { total: 6, ocrFailed: 0, finished: null, insightSources: 2 },
    highlights: 12,
    meaningfulNotes: 6,
    userCodes: 3,
    themedRows: 8,
    codedHighlightFraction: 0.7,
    rows: { ...s.rows, total: 12, insightful: 4 },
  };
}

function withReview(s: ReadinessSignals): ReadinessSignals {
  return { ...s, rows: { ...s.rows, insightful: 9, ripe: 9 } };
}

function withClaims(s: ReadinessSignals): ReadinessSignals {
  return { ...s, rows: { ...s.rows, genuineApa: 8 } };
}

function withSynthesis(s: ReadinessSignals): ReadinessSignals {
  return { ...s, rows: { ...s.rows, synthesized: 7, ripeSynthesized: 6 }, synthQuality: 0.55 };
}

function withDraft(s: ReadinessSignals): ReadinessSignals {
  return {
    ...s,
    draft: { litSection: true, coreSections: 4, referencesSynced: true, abstract: true, conclusion: true },
  };
}

function allComplete(): ReadinessSignals {
  return withDraft(withSynthesis(withClaims(withReview(withEvidence(withPlanAndTopic(blank()))))));
}

// ---------------------------------------------------------------- cold start ladder

test("blank project starts at Research plan / Name your project", () => {
  const r = computeResearchReadiness(blank());
  assert.equal(r.currentStatus, "Research plan");
  assert.equal(r.nextBestMove, "Name your project");
  assert.equal(r.readinessStageId, "research_plan");
});

test("plan checklist walks in order while status stays put", () => {
  const s = blank();
  s.titleText = "Sleep and memory consolidation in adolescents";
  let r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Research plan");
  assert.equal(r.nextBestMove, "Set target date");
  s.settings.hasTargetDate = true;
  r = computeResearchReadiness(s);
  assert.equal(r.nextBestMove, "Choose work pace");
  s.settings.hasPace = true;
  r = computeResearchReadiness(s);
  assert.equal(r.nextBestMove, "Pick project type");
  s.settings.hasProjectModel = true;
  r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Research topic");
  assert.equal(r.nextBestMove, "Add topic description");
});

test("plan+topic done but no work and no pathway -> Theme clarity", () => {
  const r = computeResearchReadiness(withPlanAndTopic(blank()));
  assert.equal(r.currentStatus, "Theme clarity");
  assert.equal(r.nextBestMove, "Explore research pathways");
});

test("pathway move becomes 'State your pathway' once the pathway home ships", () => {
  const s = withPlanAndTopic(blank());
  s.pathwayText = ""; // home exists, still empty
  const r = computeResearchReadiness(s);
  assert.equal(r.nextBestMove, "State your pathway");
});

// ------------------------------------------------------- pathway recognition routes

test("pathway recognized from meta question + hypothesis (data-first analyst)", () => {
  const s = withPlanAndTopic(blank());
  s.meta = { ...s.meta, exists: true, question: true, hypothesis: true };
  const r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Evidence base");
  assert.equal(r.nextBestMove, "Upload a source");
});

test("pathway recognized from a ScholarAsk journey query", () => {
  const s = withPlanAndTopic(blank());
  s.journeyEvents = 1;
  const r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Evidence base");
});

test("pathway recognized from stated pathway text", () => {
  const s = withPlanAndTopic(blank());
  s.pathwayText = "Does sleep restriction reduce recall accuracy in teens?";
  const r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Evidence base");
});

// -------------------------------------------------------------------- escape hatches

test("collector: uploads + one highlight escape plan, topic, and pathway", () => {
  const s = blank();
  s.sources = { total: 8, ocrFailed: 0, finished: null, insightSources: 0 };
  s.highlights = 1;
  s.rows = { ...s.rows, total: 1 };
  const r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Evidence base");
  assert.equal(r.nextBestMove, "Add sticky notes");
});

test("placeholder title still gates when there is no real work", () => {
  const s = blank();
  s.titleText = "Untitled Project";
  const r = computeResearchReadiness(s);
  assert.equal(r.nextBestMove, "Name your project");
});

// ------------------------------------------------------------- evidence base checks

test("source target scales from the user's own declared plan", () => {
  assert.equal(sourceTarget(null), 5);
  assert.equal(sourceTarget(20), 16);
  const s = withPlanAndTopic(blank());
  s.settings.expectedSources = 20;
  s.sources = { total: 10, ocrFailed: 0, finished: null, insightSources: 0 };
  s.highlights = 1;
  s.rows = { ...s.rows, total: 1 };
  let r = computeResearchReadiness(s);
  assert.equal(r.nextBestMove, "Add more sources");
  s.sources.total = 16;
  r = computeResearchReadiness(s);
  assert.notEqual(r.nextBestMove, "Add more sources");
});

test("failed OCR surfaces 'Check source text'", () => {
  const s = withPlanAndTopic(blank());
  s.sources = { total: 6, ocrFailed: 1, finished: null, insightSources: 0 };
  s.highlights = 1;
  s.rows = { ...s.rows, total: 1 };
  const r = computeResearchReadiness(s);
  assert.equal(r.nextBestMove, "Check source text");
});

test("typing themes directly on rows satisfies codes (anyOf, founder decision B)", () => {
  const s = withEvidence(withPlanAndTopic(blank()));
  s.userCodes = 0;
  s.themedRows = 5;
  const r = computeResearchReadiness(s);
  assert.notEqual(r.nextBestMove, "Create your codes");
});

test("auto-inserted default codes do not count (userCodes excludes them upstream)", () => {
  const s = withEvidence(withPlanAndTopic(blank()));
  s.userCodes = 0;
  s.themedRows = 0;
  const r = computeResearchReadiness(s);
  assert.equal(r.nextBestMove, "Create your codes");
});

test("finish-button signal gates sources_finished when available", () => {
  const s = withEvidence(withPlanAndTopic(blank()));
  s.sources = { total: 6, ocrFailed: 0, finished: 2, insightSources: 2 }; // button shipped, 2/6 finished
  const r = computeResearchReadiness(s);
  assert.equal(r.nextBestMove, "Finish your sources");
});

// ----------------------------------------------------- review / claims / synthesis

test("evidence complete -> Source review asks for insight coverage", () => {
  const s = withEvidence(withPlanAndTopic(blank()));
  const r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Source review");
  assert.equal(r.nextBestMove, "Write insights"); // 4/12 insightful < 60%
});

test("genuine-APA gate: stub references never satisfy Claim support", () => {
  assert.equal(isGenuineApa('Smith. "A paper about sleep".'), false);
  assert.equal(isGenuineApa("Smith, J. (2020). Sleep and memory. Journal of Sleep."), true);
  const s = withReview(withEvidence(withPlanAndTopic(blank())));
  s.rows.genuineApa = 0; // all rows still carry auto-stubs only
  const r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Claim support");
  assert.equal(r.nextBestMove, "Add APA references");
});

test("synthesis ripens per finished source's rows and then gates on quality", () => {
  const s = withClaims(withReview(withEvidence(withPlanAndTopic(blank()))));
  s.rows.synthesized = 1;
  s.rows.ripeSynthesized = 1; // 1/9 ripe rows synthesized < 60%
  s.synthQuality = 0.9;
  let r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Synthesis");
  assert.equal(r.nextBestMove, "Synthesize your sources");
  s.rows.ripeSynthesized = 6;
  s.synthQuality = 0.2;
  r = computeResearchReadiness(s);
  assert.equal(r.nextBestMove, "Deepen your synthesis");
});

// ------------------------------------------------------------------- paper & final

test("paper draft walks lit-review-first order, then terminal Draft complete", () => {
  const s = withSynthesis(withClaims(withReview(withEvidence(withPlanAndTopic(blank())))));
  let r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Paper draft");
  assert.equal(r.nextBestMove, "Draft literature review");
  s.draft.litSection = true;
  s.draft.coreSections = 2;
  r = computeResearchReadiness(s);
  assert.equal(r.nextBestMove, "Draft core sections");
  s.draft.coreSections = 4;
  r = computeResearchReadiness(s);
  assert.equal(r.nextBestMove, "Sync references");
  s.draft.referencesSynced = true;
  r = computeResearchReadiness(s);
  assert.equal(r.nextBestMove, "Write abstract last");
});

test("everything complete -> Draft complete / Review full draft (no fake export move)", () => {
  const r = computeResearchReadiness(allComplete());
  assert.equal(r.currentStatus, "Draft complete");
  assert.equal(r.nextBestMove, "Review full draft");
  assert.match(r.readinessSummary, /end to end/);
  assert.equal(r.reason, "all_required_complete");
});

// ------------------------------------------------- status follows the user (anti-nag)

test("early writer: recent draft activity keeps status on Paper draft, not Evidence", () => {
  const s = withPlanAndTopic(blank());
  s.sources = { total: 1, ocrFailed: 0, finished: null, insightSources: 0 };
  s.highlights = 1;
  s.rows = { ...s.rows, total: 1 };
  s.draft.litSection = true;
  s.recentEvents = [{ type: "paper_draft_saved", at: RECENT }];
  const r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Paper draft");
  assert.equal(r.nextBestMove, "Draft core sections");
  assert.match(r.reason, /^active:/);
});

test("saving the Research Pathway home anchors status on Theme clarity too (§6.3 entry route 1/2)", () => {
  const s = withPlanAndTopic(blank());
  s.pathwayText = "Does sleep restriction reduce recall accuracy in teens?";
  s.recentEvents = [{ type: "research_pathway_saved", at: RECENT }];
  const r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Theme clarity");
  assert.match(r.reason, /^(active|bridge):/);
});

test("jumper: recent journey query anchors status on Theme clarity and bridges forward", () => {
  const s = withPlanAndTopic(blank());
  s.journeyEvents = 2;
  s.recentEvents = [
    { type: "research_query_submitted", at: RECENT },
    { type: "highlight_created", at: RECENT - 1000 },
  ];
  const r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Theme clarity");
  assert.equal(r.nextBestMove, "Upload a source"); // bridge to earliest gap
  assert.match(r.reason, /^bridge:/);
});

test("active area complete bridges to the earliest unmet area with completion tone", () => {
  const s = withEvidence(withPlanAndTopic(blank()));
  s.recentEvents = [{ type: "note_created", at: RECENT }];
  const r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Evidence base");
  assert.match(r.readinessSummary, /insights/); // the WHY of the bridge move
  assert.equal(r.nextBestMove, "Write insights");
});

test("stale events fall back to the ladder (returner)", () => {
  const s = withPlanAndTopic(blank());
  s.draft.litSection = true;
  s.recentEvents = [{ type: "paper_draft_saved", at: STALE }];
  const r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Theme clarity"); // foundational gap, not Paper draft
  assert.match(r.reason, /^ladder:/);
});

test("noise events (opens) never anchor status", () => {
  const s = withPlanAndTopic(blank());
  s.recentEvents = [{ type: "project_opened", at: RECENT }];
  const r = computeResearchReadiness(s);
  assert.match(r.reason, /^ladder:/);
});

test("row-save event resolves to the earliest incomplete Lit Review area", () => {
  const s = withEvidence(withPlanAndTopic(blank()));
  s.recentEvents = [{ type: "literature_row_saved", at: RECENT }];
  const r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Source review");
});

// ----------------------------------------------------------------------- meta lane

test("meta-first analyst: recent meta work makes Meta analysis the status", () => {
  const s = withPlanAndTopic(blank());
  s.meta = { ...s.meta, exists: true, question: true, hypothesis: true, typeSet: true };
  s.recentEvents = [{ type: "meta_analysis_updated", at: RECENT }];
  const r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Meta analysis");
  assert.equal(r.nextBestMove, "Map your data");
});

test("meta lane complete bridges forward to Evidence base, never backwards", () => {
  const s = withPlanAndTopic(blank());
  s.meta = { exists: true, question: true, hypothesis: true, typeSet: true, mapped: true, results: true, requiredByScope: false };
  s.recentEvents = [{ type: "meta_analysis_updated", at: RECENT }];
  const r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Meta analysis");
  assert.equal(r.nextBestMove, "Upload a source");
});

test("meta lane never blocks the ladder fallback and hides checks when empty", () => {
  const s = blank();
  s.meta = { ...s.meta, exists: true }; // row auto-created by visiting the page
  const r = computeResearchReadiness(s);
  assert.equal(r.currentStatus, "Research plan");
  assert.equal(r.microChecks.some((c) => c.id.startsWith("meta.")), false);
  s.meta.question = true; // real content -> lane appears
  const r2 = computeResearchReadiness(s);
  assert.equal(r2.microChecks.some((c) => c.id.startsWith("meta.")), true);
});

// ------------------------------------------------------------------------- honesty

test("advisory pathway exploration is never done and never gates", () => {
  const r = computeResearchReadiness(allComplete());
  const advisory = r.microChecks.find((c) => c.id === "pathway.explore");
  assert.ok(advisory);
  assert.equal(advisory.measurable, false);
  assert.equal(advisory.done, false);
  assert.equal(r.currentStatus, "Draft complete"); // it did not gate the terminal state
});

test("health rows: Evidence base shows a finished-source count, never a checks fraction", () => {
  const r = computeResearchReadiness(withEvidence(withPlanAndTopic(blank())));
  assert.equal(r.healthRows.length, 4);
  const labels = r.healthRows.map((row) => row.label);
  assert.deepEqual(labels, ["Plan & pathway", "Evidence base", "Claim support", "Synthesis & draft"]);
  assert.equal(r.healthRows[0].value, "Strong");
  assert.equal(r.healthRows[1].value, "2 finished"); // count of finish-reviewed sources
  assert.equal(r.healthRows[2].value, "Needs work"); // qualitative, no fractions
  assert.equal(r.healthRows[3].value, "Not started");
  for (const row of r.healthRows) assert.doesNotMatch(row.value, /\d+\/\d+/);
});

test("Evidence base health reads Strong only when every source is finished", () => {
  const s = withEvidence(withPlanAndTopic(blank()));
  s.sources = { total: 6, ocrFailed: 0, finished: 6, insightSources: 6 };
  const r = computeResearchReadiness(s);
  assert.equal(r.healthRows[1].value, "Strong");
  assert.equal(r.healthRows[1].tone, "green");
});

test("deterministic: same signals -> same result", () => {
  const a = computeResearchReadiness(withEvidence(withPlanAndTopic(blank())));
  const b = computeResearchReadiness(withEvidence(withPlanAndTopic(blank())));
  assert.deepEqual(a, b);
});

test("every readiness summary fits the 2-line card budget (founder rule)", () => {
  for (const line of READINESS_WHY_LINES) {
    assert.ok(
      line.length <= READINESS_SUMMARY_MAX,
      `why-line is ${line.length} chars (max ${READINESS_SUMMARY_MAX}): "${line}"`
    );
  }
});

test("readiness summary explains WHY the move helps, warmly", () => {
  const r = computeResearchReadiness(blank());
  assert.equal(r.nextBestMove, "Name your project");
  assert.match(r.readinessSummary, /A clear name/); // explains the benefit, not a command
});
