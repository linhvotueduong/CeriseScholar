import assert from "node:assert/strict";
import test from "node:test";
import type { AnalysisExecutionDocument } from "./analysisExecution";
import type { AnalysisPlanDocument } from "./analysisPlan";
import type { DataPreparationDocument } from "./dataPreparation";
import type { ExperimentRelease } from "./experimentRelease";
import type {
  AnalysisInterpretationDocument,
  ResultsRecordPackage,
} from "./analysisResults";
import type {
  AnalysisRobustnessDocument,
  RobustnessRecordPackage,
} from "./analysisRobustness";
import {
  ANALYSIS_REVIEW_EXPORT_BOUNDARY,
  ANALYSIS_REVIEW_EXPORT_TYPE,
  buildAnalysisReviewExport,
  createAnalysisReviewerDocument,
  decideAnalysisReviewerSuggestion,
  isAnalysisReviewerReady,
  markAnalysisReviewerReviewed,
  normalizeAnalysisReviewerDocument,
  readAnalysisReviewerDocument,
  recordAnalysisReviewerBatch,
  updateAnalysisReviewerNarrative,
  verifyAnalysisReviewExport,
  writeAnalysisReviewerDocument,
  type AnalysisReviewerDependencies,
} from "./analysisReviewer";

const checksum = (value: string) => {
  const hex = value.charCodeAt(0).toString(16).padStart(2, "0");
  return `sha256:${hex.repeat(32)}`;
};

function fixtures(): {
  dependencies: AnalysisReviewerDependencies;
  resultsRecord: ResultsRecordPackage;
  robustnessRecord: RobustnessRecordPackage;
} {
  const release = {
    projectId: "project-1",
    releaseId: "release-1",
    releaseNumber: 1,
    checksum: checksum("a"),
    manifest: { analysisContractChecksum: checksum("b") },
  } as unknown as ExperimentRelease;
  const plan = {
    updatedAt: "2026-07-29T12:00:00.000Z",
    readiness: { status: "ready" },
    researchQuestions: [
      { id: "rq-1" },
      { id: "rq-2" },
    ],
  } as unknown as AnalysisPlanDocument;
  const preparation = {
    readiness: { status: "ready" },
  } as unknown as DataPreparationDocument;
  const execution = {
    readiness: { status: "ready" },
    lastRun: {
      resultChecksum: checksum("c"),
      packageChecksum: checksum("d"),
    },
  } as unknown as AnalysisExecutionDocument;
  const interpretation = {
    readiness: { status: "ready" },
    exportedAt: "2026-07-29T13:00:00.000Z",
    researchQuestions: [
      { researchQuestionId: "rq-1", linkedResultIds: ["analysis-1"] },
      { researchQuestionId: "rq-2", linkedResultIds: ["analysis-2"] },
    ],
  } as unknown as AnalysisInterpretationDocument;
  const robustness = {
    readiness: { status: "ready" },
    exportedAt: "2026-07-29T13:10:00.000Z",
    lastExportChecksum: checksum("e"),
    lastRun: { checkChecksum: checksum("f") },
  } as unknown as AnalysisRobustnessDocument;
  const resultsRecord = {
    releaseId: release.releaseId,
    createdAt: interpretation.exportedAt,
    source: { resultChecksum: execution.lastRun?.resultChecksum },
    integrity: { packageChecksum: checksum("g") },
  } as unknown as ResultsRecordPackage;
  const robustnessRecord = {
    releaseId: release.releaseId,
    integrity: {
      packageChecksum: robustness.lastExportChecksum,
      checkChecksum: robustness.lastRun?.checkChecksum,
    },
  } as unknown as RobustnessRecordPackage;
  return {
    dependencies: {
      release,
      plan,
      preparation,
      execution,
      interpretation,
      robustness,
    },
    resultsRecord,
    robustnessRecord,
  };
}

const responseWithSuggestion = {
  summary: "The claim should remain bounded by the aggregate evidence.",
  suggestions: [{
    category: "causal-overclaim" as const,
    priority: "important" as const,
    title: "Keep the conclusion associational",
    observation: "The reviewed interpretation uses an associational claim.",
    evidenceReferences: ["interpretation:result-rq-1"],
    recommendation: "Retain associational wording in later drafting.",
    limitation: "This review does not establish causality or scientific validity.",
  }],
};

test("reviewer requires every RQ, every suggestion decision, researcher review, and export", async () => {
  const current = fixtures();
  const created = createAnalysisReviewerDocument(
    current.dependencies,
    current.resultsRecord,
    current.robustnessRecord,
    "2026-07-29T14:00:00.000Z",
  );
  assert.ok(created);
  assert.equal(created.readiness.status, "needs-review");

  const firstBatch = await recordAnalysisReviewerBatch(
    created,
    responseWithSuggestion,
    "rq-1",
    "example/model",
    checksum("h"),
    current.dependencies,
    "2026-07-29T14:05:00.000Z",
  );
  assert.equal(firstBatch.readiness.status, "needs-review");
  assert.equal(firstBatch.suggestions[0].decision, "pending");

  const decided = decideAnalysisReviewerSuggestion(
    firstBatch,
    firstBatch.suggestions[0].id,
    "accepted",
    "This wording is consistent with the reviewed design boundary.",
    current.dependencies,
    "2026-07-29T14:10:00.000Z",
  );
  assert.equal(decided.suggestions[0].decision, "accepted");
  assert.equal(decided.readiness.status, "needs-review");

  const secondBatch = await recordAnalysisReviewerBatch(
    decided,
    {
      summary: "No additional evidence-linked suggestion was needed.",
      suggestions: [],
    },
    "rq-2",
    "example/model",
    checksum("i"),
    current.dependencies,
    "2026-07-29T14:15:00.000Z",
  );
  assert.equal(secondBatch.readiness.status, "needs-confirmation");

  const narrated = updateAnalysisReviewerNarrative(
    secondBatch,
    {
      researcherConclusion:
        "Retain associational wording and carry the accepted boundary into drafting.",
      remainingLimitations:
        "Aggregate review cannot establish independence, causality, or external validity.",
    },
    current.dependencies,
    "2026-07-29T14:20:00.000Z",
  );
  assert.equal(narrated.readiness.status, "needs-confirmation");

  const reviewed = markAnalysisReviewerReviewed(
    narrated,
    current.dependencies,
    "2026-07-29T14:25:00.000Z",
  );
  assert.equal(reviewed.readiness.status, "needs-export");

  const exported = await buildAnalysisReviewExport(
    reviewed,
    current.dependencies,
    "2026-07-29T14:30:00.000Z",
  );
  assert.equal(isAnalysisReviewerReady(exported.document), true);
  assert.equal(exported.export.exportType, ANALYSIS_REVIEW_EXPORT_TYPE);
  assert.equal(exported.export.exportBoundary, ANALYSIS_REVIEW_EXPORT_BOUNDARY);
  assert.equal(exported.export.package.participantRowsIncluded, false);
  assert.equal(exported.export.package.upstreamRecordsChanged, false);
  assert.equal(exported.export.package.aiValidityCertification, false);
  assert.equal(
    exported.export.package.decisionLedger.suggestions[0].decision,
    "accepted",
  );

  const verified = await verifyAnalysisReviewExport(
    exported.export,
    exported.document,
    current.dependencies,
  );
  assert.equal(
    verified.integrity.packageChecksum,
    exported.document.lastExportChecksum,
  );

  const changed = structuredClone(exported.export);
  changed.package.decisionLedger.suggestions[0].recommendation =
    "Silently change the frozen method.";
  await assert.rejects(
    verifyAnalysisReviewExport(changed, exported.document, current.dependencies),
    /changed after export/,
  );
});

test("reviewer normalization fails closed when the robustness receipt changes", () => {
  const current = fixtures();
  const created = createAnalysisReviewerDocument(
    current.dependencies,
    current.resultsRecord,
    current.robustnessRecord,
  );
  assert.ok(created);
  const changedDependencies = {
    ...current.dependencies,
    robustness: {
      ...current.dependencies.robustness,
      lastExportChecksum: checksum("z"),
    },
  };
  assert.equal(
    normalizeAnalysisReviewerDocument(created, changedDependencies),
    null,
  );
});

test("local reviewer persistence contains aggregate advice and boundaries but no row payload", () => {
  const current = fixtures();
  const created = createAnalysisReviewerDocument(
    current.dependencies,
    current.resultsRecord,
    current.robustnessRecord,
  );
  assert.ok(created);
  const writes = new Map<string, string>();
  writeAnalysisReviewerDocument({
    getItem: (key) => writes.get(key) ?? null,
    setItem: (key, value) => { writes.set(key, value); },
  }, current.dependencies, created);
  const stored = [...writes.values()][0];
  assert.ok(stored);
  assert.doesNotMatch(stored, /participantRows|sessionId|responseRows|trialRows/);
  assert.match(stored, /aggregate-only-no-participant-rows/);
  assert.ok(readAnalysisReviewerDocument({
    getItem: (key) => writes.get(key) ?? null,
    setItem: () => undefined,
  }, current.dependencies));
});
