import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSectionProgress } from "./sectionProgress";
import { computeAdjustedTargets, EMPTY_RESEARCH_COUNTS, type ResearchCounts } from "./todayTargetModel";

const SCOPE = {
  expectedSources: null,
  expectedPagesOrSections: null,
  quality: "professional" as const,
  complexity: "standard" as const,
  metaAnalysisRequired: false,
};
const targets = computeAdjustedTargets("literature-review", SCOPE);
const c = (over: Partial<ResearchCounts>): ResearchCounts => ({ ...EMPTY_RESEARCH_COUNTS, ...over });
const opts = { metaRelevant: false };
const pct = (score: number) => Math.round(score * 100);

test("uploaded-only PDFs stay tiny (Workspace <= 5%, Literature <= 5%)", () => {
  const s = computeSectionProgress(c({ uploadedSources: 999 }), targets, opts);
  assert.ok(s.workspaceSynthesisScore <= 0.05 + 1e-9, `workspace ${s.workspaceSynthesisScore}`);
  assert.ok(s.literatureReviewScore <= 0.05 + 1e-9, `lit ${s.literatureReviewScore}`);
});

test("highlights only -> Workspace <= ~15%", () => {
  const s = computeSectionProgress(c({ uploadedSources: 999, highlights: 999 }), targets, opts);
  assert.ok(s.workspaceSynthesisScore <= 0.15 + 1e-9, `workspace ${s.workspaceSynthesisScore}`);
});

test("notes without meaningful research (rowsWithNotes=0) keep Literature low", () => {
  // rows exist but no meaningful notes/evidence -> capped at 15%.
  const s = computeSectionProgress(c({ uploadedSources: 999, literatureRows: 999 }), targets, opts);
  assert.ok(s.literatureReviewScore <= 0.15 + 1e-9, `lit ${s.literatureReviewScore}`);
});

test("codes without synthesis keep Workspace <= ~40%", () => {
  const s = computeSectionProgress(
    c({ uploadedSources: 999, highlights: 999, notes: 999, codedRows: 999, themeCount: 999 }),
    targets,
    opts
  );
  assert.ok(s.workspaceSynthesisScore <= 0.4 + 1e-9, `workspace ${s.workspaceSynthesisScore}`);
});

test("meaningful notes but no codes/themes -> Workspace <= ~25%", () => {
  const s = computeSectionProgress(c({ uploadedSources: 999, highlights: 999, notes: 999 }), targets, opts);
  assert.ok(s.workspaceSynthesisScore <= 0.25 + 1e-9, `workspace ${s.workspaceSynthesisScore}`);
});

test("draft stays near 0 without real draft text; outline only <= 15%", () => {
  assert.equal(computeSectionProgress(c({}), targets, opts).paperDraftScore, 0);
  const outline = computeSectionProgress(c({ outlineSections: 999, draftSections: 999 }), targets, opts);
  assert.ok(outline.paperDraftScore <= 0.15 + 1e-9, `draft ${outline.paperDraftScore}`);
});

test("citation progress requires metadata then reference readiness", () => {
  assert.equal(computeSectionProgress(c({}), targets, opts).citationScore, 0); // no references
  const titleOnly = computeSectionProgress(c({ referencesCount: 999 }), targets, opts);
  assert.ok(pct(titleOnly.citationScore) <= 5, `title-only ${pct(titleOnly.citationScore)}%`);
  const meta = computeSectionProgress(c({ referencesCount: 999, citationsWithMetadata: 999 }), targets, opts);
  assert.ok(meta.citationScore <= 0.35 + 1e-9 && meta.citationScore > titleOnly.citationScore, `meta ${meta.citationScore}`);
  const apa = computeSectionProgress(
    c({ referencesCount: 999, citationsWithMetadata: 999, apaReadyReferences: 999, referencesLinkedToRows: 999 }),
    targets,
    opts
  );
  assert.ok(apa.citationScore > meta.citationScore, "APA + links raise citations further");
});

test("meta-analysis stays 0 when not relevant", () => {
  const counts = c({ metaQuestionSet: true, metaTestSelected: true, effectsMapped: 999, forestPlotReady: true });
  assert.equal(computeSectionProgress(counts, targets, { metaRelevant: false }).metaAnalysisScore, 0);
});

test("AI multiplier reduces shallow work but never inflates", () => {
  const data = c({ uploadedSources: 999, literatureRows: 999, rowsWithNotes: 999, rowsWithEvidenceFields: 999, codedRows: 999, synthesisUnits: 999, apaReadyReferences: 999 });
  const base = computeSectionProgress(data, targets, opts);
  const placeholder = computeSectionProgress(data, targets, { metaRelevant: false, signals: { isPlaceholder: true } });
  assert.ok(placeholder.literatureReviewScore < base.literatureReviewScore, "placeholder lowers");
  // High-quality AI cannot create progress where there is no data.
  const empty = computeSectionProgress(c({}), targets, {
    metaRelevant: false,
    signals: { noteMeaningfulness: 1, evidenceSpecificity: 1, citationReadiness: 1, confidence: 1 },
  });
  assert.equal(empty.workspaceSynthesisScore, 0);
  assert.equal(empty.literatureReviewScore, 0);
  assert.equal(empty.citationScore, 0);
});

test("only evidence-supported, citation-ready work approaches high completion", () => {
  const full = c({
    uploadedSources: 999, engagedSources: 999, literatureRows: 999, rowsWithNotes: 999, rowsWithEvidenceFields: 999,
    rowsWithCitationLinks: 999, codedRows: 999, synthesisUnits: 999, highlights: 999, notes: 999, themeCount: 999,
    outlineSections: 999, draftSections: 999, meaningfulLengthSections: 999, evidenceSupportedSections: 999,
    citedSections: 999, revisedSections: 999, referencesCount: 999, citationsWithMetadata: 999, apaReadyReferences: 999,
    referencesLinkedToRows: 999, duplicateIssues: 0,
  });
  const s = computeSectionProgress(full, targets, opts);
  assert.ok(
    s.literatureReviewScore > 0.85 && s.workspaceSynthesisScore > 0.85 && s.paperDraftScore > 0.85 && s.citationScore > 0.85,
    JSON.stringify(s)
  );
});
