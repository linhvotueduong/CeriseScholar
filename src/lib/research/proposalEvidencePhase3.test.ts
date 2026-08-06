import assert from "node:assert/strict";
import test from "node:test";
import {
  EVIDENCE_APPRAISAL_LENSES,
  EVIDENCE_GUIDANCE_SOURCES,
  appendEvidenceSearchVersion,
  assessmentIdForEvidenceSource,
  compileEvidenceReview,
  compileEvidenceStrategy,
  createDefaultEvidenceStrategy,
  createEvidenceAppraisalItems,
  createEvidenceLibraryReference,
  recommendedEvidenceAppraisalLens,
} from "./proposalEvidencePhase3";
import { createProjectEvidenceAssessment } from "./researchProposalDocument";
import type { EvidenceLibraryRow } from "./evidenceLibrary";

const ROUTE = { intent: "primary-data", methodFamily: "qualitative" } as const;
const NOW = "2026-08-05T12:00:00.000Z";

function source(id = "source-1", title = "A qualitative study"): EvidenceLibraryRow {
  return {
    id,
    user_id: "user-1",
    project_id: null,
    pdf_id: null,
    source: "scholarask",
    title,
    doc_type: "Qualitative study",
    evidence: null,
    caveat: null,
    status: "ready",
    citation: "Scholar (2026)",
    url: "https://example.test/source",
    created_at: NOW,
  };
}

test("strategy compilation is route-aware and fails closed until all planning responsibilities exist", () => {
  const empty = createDefaultEvidenceStrategy(ROUTE, ["rq-1"]);
  const first = compileEvidenceStrategy({ route: ROUTE, selectedQuestionIds: ["rq-1"], strategy: empty });
  assert.equal(first.ready, false);
  assert.ok(first.recommendedSourceTypes.includes("Qualitative empirical studies"));
  assert.ok(first.issues.some((issue) => issue.id === "search-version-required"));
  const complete = appendEvidenceSearchVersion({
    ...empty,
    concepts: ["revision feedback"],
    synonyms: ["formative feedback"],
    sourceTypes: ["Qualitative empirical studies"],
    eligibilityNotes: "Include empirical studies of adult learners; exclude non-empirical commentary.",
    stoppingRationale: "Stop after the planned databases and citation trails produce no new concepts in the final update pass.",
  }, { query: "revision AND (feedback OR formative)", sourceSystems: ["ERIC"] });
  const result = compileEvidenceStrategy({ route: ROUTE, selectedQuestionIds: ["rq-1"], strategy: complete });
  assert.equal(result.ready, true);
  assert.ok(result.issues.some((issue) => issue.id === "run-log-advisory"));
});

test("evidence-synthesis route requires an executed version but preserves immutable search history", () => {
  const route = { intent: "evidence-synthesis", methodFamily: "evidence-synthesis" } as const;
  const base = {
    ...createDefaultEvidenceStrategy(route, ["rq-1"]),
    concepts: ["feedback"], synonyms: ["formative assessment"], sourceTypes: ["Primary studies eligible for synthesis"],
    eligibilityNotes: "Pre-specified eligibility boundary.", stoppingRationale: "Update at submission and stop at the protocol-defined date.",
  };
  const planned = appendEvidenceSearchVersion(base, { query: "feedback", sourceSystems: ["ERIC"] });
  assert.equal(compileEvidenceStrategy({ route, selectedQuestionIds: ["rq-1"], strategy: planned }).ready, false);
  const executed = appendEvidenceSearchVersion(planned, { query: "feedback", sourceSystems: ["ERIC"], runAt: NOW, resultCount: 42 });
  assert.equal(compileEvidenceStrategy({ route, selectedQuestionIds: ["rq-1"], strategy: executed }).ready, true);
  assert.equal(executed.searchVersions[0].runAt, null);
  assert.equal(executed.searchVersions[1].version, 2);
});

test("authority and appraisal registries use HTTPS sources and never expose a numeric score", () => {
  for (const source of EVIDENCE_GUIDANCE_SOURCES) assert.match(source.sourceUrl, /^https:\/\//);
  for (const lens of EVIDENCE_APPRAISAL_LENSES) {
    assert.match(lens.authorityUrl, /^https:\/\//);
    assert.ok(lens.criteria.length >= 5);
    assert.doesNotMatch(JSON.stringify(lens), /numeric score|overall score/i);
  }
  assert.equal(recommendedEvidenceAppraisalLens(ROUTE, "Interview study"), "qualitative-study");
  assert.equal(recommendedEvidenceAppraisalLens({ intent: "secondary-data", methodFamily: "quantitative" }, "Dataset"), "secondary-dataset");
});

test("source references exclude the user identity and change when source metadata changes", async () => {
  const first = await createEvidenceLibraryReference(source());
  const second = await createEvidenceLibraryReference(source("source-1", "Corrected title"));
  assert.equal(first.artifactId, "source-1");
  assert.notEqual(first.checksum, second.checksum);
  assert.doesNotMatch(JSON.stringify(first), /user-1/);
});

test("review readiness requires resolved, appraised, question-linked researcher decisions", async () => {
  const row = source();
  const sourceReference = await createEvidenceLibraryReference(row);
  const assessmentId = assessmentIdForEvidenceSource(row.id);
  const draft = await createProjectEvidenceAssessment({
    projectId: "project-1",
    assessmentId,
    sourceId: row.id,
    status: "awaiting-review",
    appraisalFramework: "qualitative-study",
    appraisal: createEvidenceAppraisalItems("qualitative-study"),
    sourceReference,
    now: NOW,
  });
  assert.equal(compileEvidenceReview({ selectedQuestionIds: ["rq-1"], assessments: [draft] }).ready, false);
  const completedAppraisal = draft.appraisal.map((item) => ({ ...item, answer: "yes" as const }));
  const included = await createProjectEvidenceAssessment({
    projectId: "project-1",
    assessmentId,
    sourceId: row.id,
    previous: draft,
    status: "included",
    decisionRationale: "This source directly informs the selected question within the recorded context.",
    linkedQuestionIds: ["rq-1"],
    appraisalFramework: "qualitative-study",
    appraisal: completedAppraisal,
    caveats: ["Transferability is limited to the reported educational setting."],
    sourceReference,
    reviewedAt: NOW,
    now: NOW,
  });
  const result = compileEvidenceReview({ selectedQuestionIds: ["rq-1"], assessments: [included] });
  assert.equal(result.ready, true);
  assert.deepEqual(result.coveredQuestionIds, ["rq-1"]);
  assert.equal(result.claim, "researcher-owned-project-review-not-global-quality-score-truth-or-novelty-certification");
});

test("unexplained uncertain appraisal responses block a final decision", async () => {
  const row = source("source-2");
  const sourceReference = await createEvidenceLibraryReference(row);
  const assessment = await createProjectEvidenceAssessment({
    projectId: "project-1",
    assessmentId: assessmentIdForEvidenceSource(row.id),
    sourceId: row.id,
    status: "included",
    decisionRationale: "Relevant to the selected question.",
    linkedQuestionIds: ["rq-1"],
    appraisalFramework: "qualitative-study",
    appraisal: createEvidenceAppraisalItems("qualitative-study"),
    caveats: ["Appraisal remains uncertain."],
    sourceReference,
    reviewedAt: NOW,
    now: NOW,
  });
  assert.equal(compileEvidenceReview({ selectedQuestionIds: ["rq-1"], assessments: [assessment] }).ready, false);
});
