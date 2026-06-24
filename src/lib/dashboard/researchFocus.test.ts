import { test } from "node:test";
import assert from "node:assert/strict";
import { computeResearchFocus } from "./deriveDashboardState";
import type { DashboardPaceMode } from "./targetPace";
import type { SectionScores } from "./todayTargetModel";

const S = (over: Partial<SectionScores> = {}): SectionScores => ({
  metaAnalysisScore: 0,
  literatureReviewScore: 0,
  workspaceSynthesisScore: 0,
  paperDraftScore: 0,
  citationScore: 0,
  ...over,
});
const focus = (scores: SectionScores, codedRows = 0, noteRows = 0, paceMode: DashboardPaceMode = "moderate") =>
  computeResearchFocus({ scores, codedRows, noteRows, paceMode });

// Keyword that the recommended move must contain for each possible bottleneck section.
const MOVE_KEYWORD: Record<string, RegExp> = {
  "literature-review": /literature rows?/i,
  "meta-analysis": /effect sizes?/i,
  workspace: /synthesis paragraphs?/i,
  draft: /draft .*paragraphs?|write it up/i,
  citations: /citations? to claims/i,
};

test("empty project -> literature-review is the bottleneck, honest thin-evidence watch point", () => {
  const r = focus(S());
  assert.equal(r.bottleneckSection, "literature-review");
  assert.match(r.recommended, /literature rows/i);
  assert.match(r.watchPoint, /evidence base is thin/i);
});

test("sparse (Geopolitical-style) project -> weakest early stage, never draft/citations", () => {
  // Some evidence, thin model/synthesis, nothing drafted.
  const r = focus(S({ literatureReviewScore: 0.5, metaAnalysisScore: 0.15, workspaceSynthesisScore: 0.3 }), 1);
  assert.equal(r.bottleneckSection, "meta-analysis");
  assert.notEqual(r.bottleneckSection, "draft");
  assert.notEqual(r.bottleneckSection, "citations");
  assert.match(r.recommended, /effect sizes/i);
});

test("all-strong project -> 'good shape' message and a light time estimate", () => {
  const r = focus(
    S({
      literatureReviewScore: 0.8,
      metaAnalysisScore: 0.8,
      workspaceSynthesisScore: 0.8,
      paperDraftScore: 0.8,
      citationScore: 0.8,
    }),
    5
  );
  assert.match(r.recommended, /good shape/i);
  assert.equal(r.estimatedTime, "10-20 min");
  assert.deepEqual(
    r.health.map((h) => h.value),
    ["Good", "Good", "Strong", "Ready"]
  );
});

test("citation-gating: citations (score 0) is NOT picked until there is a draft", () => {
  const r = focus(
    S({ literatureReviewScore: 0.8, metaAnalysisScore: 0.8, workspaceSynthesisScore: 0.8, paperDraftScore: 0.1, citationScore: 0 })
  );
  assert.equal(r.bottleneckSection, "draft");
  assert.notEqual(r.bottleneckSection, "citations");
});

test("citations unlock once a draft exists and become the bottleneck when weakest", () => {
  const r = focus(
    S({ literatureReviewScore: 0.8, metaAnalysisScore: 0.8, workspaceSynthesisScore: 0.8, paperDraftScore: 0.6, citationScore: 0.1 })
  );
  assert.equal(r.bottleneckSection, "citations");
  assert.match(r.recommended, /citations to claims/i);
});

test("draft-gating: draft (score 0) is NOT picked before synthesis is ready", () => {
  const r = focus(
    S({ literatureReviewScore: 0.8, metaAnalysisScore: 0.5, workspaceSynthesisScore: 0.1, paperDraftScore: 0, citationScore: 0 })
  );
  assert.equal(r.bottleneckSection, "workspace");
  assert.notEqual(r.bottleneckSection, "draft");
});

test("Start next move routes to exactly the section the recommended move describes", () => {
  const scenarios = [
    S(),
    S({ literatureReviewScore: 0.5, metaAnalysisScore: 0.15, workspaceSynthesisScore: 0.3 }),
    S({ literatureReviewScore: 0.8, metaAnalysisScore: 0.8, workspaceSynthesisScore: 0.1, paperDraftScore: 0 }),
    S({ literatureReviewScore: 0.8, metaAnalysisScore: 0.8, workspaceSynthesisScore: 0.8, paperDraftScore: 0.1 }),
    S({ literatureReviewScore: 0.8, metaAnalysisScore: 0.8, workspaceSynthesisScore: 0.8, paperDraftScore: 0.6, citationScore: 0.1 }),
  ];
  for (const scores of scenarios) {
    const r = focus(scores);
    // The button routes to r.bottleneckSection; the card's recommended copy must be about
    // that same section, so the user lands where the card pointed.
    assert.match(r.recommended, MOVE_KEYWORD[r.bottleneckSection]);
  }
});

test("pace scales the suggested chunk and the time estimate", () => {
  const low = focus(S(), 0, 0, "low");
  const high = focus(S(), 0, 0, "high");
  assert.match(low.recommended, /Add 1 literature row\b/);
  assert.ok(!/literature rows/.test(low.recommended), "low pace must read 'row' (singular)");
  assert.match(high.recommended, /Add 3–4 literature rows/);
  assert.equal(low.estimatedTime, "25-35 min");
  assert.equal(high.estimatedTime, "35-55 min");
});
