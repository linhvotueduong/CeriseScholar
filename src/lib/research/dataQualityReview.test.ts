import assert from "node:assert/strict";
import test from "node:test";
import {
  createAnalysisPlanDocument,
  normalizeAnalysisPlanDocument,
  type AnalysisPlanDocument,
} from "./analysisPlan";
import {
  auditDataIntakeBundle,
  markDataIntakeAuditReviewed,
  type DataIntakeSourceFile,
} from "./dataIntakeAudit";
import {
  buildDataPreparationPackage,
  createDataPreparationDocument,
  markDataPreparationExported,
  markDataPreparationReviewed,
  type DataPreparationDocument,
  type DataPreparationPackage,
} from "./dataPreparation";
import {
  buildDataQualityRecordExport,
  buildDataQualityReport,
  createDataQualityReviewDocument,
  isDataQualityReviewReady,
  markDataQualityReviewed,
  runDataQualityReview,
  updateDataQualityAssessment,
  verifyDataQualityRecordExport,
  writeDataQualityReviewDocument,
} from "./dataQualityReview";
import {
  createCompletedExperimentReleaseReview,
  createExperimentRelease,
  sha256Checksum,
  type ExperimentRelease,
} from "./experimentRelease";
import { buildExperimentHostBundle } from "./experimentHostBundle";
import {
  createExperimentBlock,
  createExperimentStudioDocument,
} from "./experimentStudio";
import { EMPTY_RESEARCH_PATH_DRAFT } from "./researchPathDraft";
import { createStudyDesignDocument } from "./studyDesign";

interface Fixture {
  release: ExperimentRelease;
  plan: AnalysisPlanDocument;
  preparation: DataPreparationDocument;
  preparedPackage: DataPreparationPackage;
  outcome: string;
}

async function fixture(): Promise<Fixture> {
  const projectId = "project-data-quality-review";
  const studio = createExperimentStudioDocument(projectId);
  const predictorBlock = createExperimentBlock("rating", "quality-predictor");
  predictorBlock.variableName = "predictor_score";
  predictorBlock.internalName = "predictor_score";
  const groupBlock = createExperimentBlock("single-choice", "quality-group");
  groupBlock.variableName = "group_assignment";
  groupBlock.internalName = "group_assignment";
  groupBlock.choices = ["A", "B"];
  studio.blocks.splice(studio.blocks.length - 1, 0, predictorBlock, groupBlock);
  studio.conditions = [
    { id: "condition-a", name: "A", weight: 1 },
    { id: "condition-b", name: "B", weight: 1 },
  ];
  studio.assignment.method = "random";

  const design = createStudyDesignDocument(projectId, EMPTY_RESEARCH_PATH_DRAFT);
  const frozenVariables = studio.blocks
    .map((block) => block.variableName)
    .filter(Boolean);
  const [outcome, predictor, group] = frozenVariables;
  assert.ok(outcome && predictor && group);
  design.spec.researchQuestions[0] = {
    ...design.spec.researchQuestions[0],
    id: "rq-quality",
    question: "How strongly does the predictor relate to the outcome?",
    hypothesis: "Higher predictor values correspond to higher outcome values.",
    construct: "Outcome",
    constructRole: "outcome",
    operationalDefinition: "The numeric outcome recorded by the frozen study.",
    measure: outcome,
    expectedDirection: "Positive",
  };
  design.spec.participants.targetPopulation = "Eligible adults";
  const release = await createExperimentRelease({
    releaseId: "release-data-quality-review",
    releaseNumber: 8,
    createdAt: "2026-07-29T12:00:00.000Z",
    releaseNotes: "Phase 8.7B deterministic quality-review fixture",
    studio,
    studyDesign: design,
    review: createCompletedExperimentReleaseReview(),
  });
  const host = await buildExperimentHostBundle(release, {
    createdAt: "2026-07-29T12:10:00.000Z",
    executionMode: "production",
  });
  const plan = createAnalysisPlanDocument(release, "2026-07-29T12:20:00.000Z");
  assert.ok(plan);
  plan.dataAccessDeclaration = "not-accessed";
  const question = plan.researchQuestions[0];
  question.designation = "primary";
  question.estimand.population = "Eligible adults";
  question.estimand.outcome = "Numeric outcome";
  question.outcomeVariables = [outcome];
  question.predictorVariables = [predictor];
  question.unitOfAnalysis = "participant";
  question.plannedMethod = "Simple linear regression";
  question.effectSize = "Unstandardized slope";
  question.missingDataStrategy = "Use complete pairs and report missingness.";
  question.multiplicityStrategy = "One primary analysis; no adjustment.";
  plan.variables.forEach((variable) => {
    variable.roles = variable.name === outcome
      ? ["outcome"]
      : variable.name === predictor
        ? ["predictor"]
        : variable.name === group
          ? ["group"]
          : ["administrative"];
  });
  const normalizedPlan = normalizeAnalysisPlanDocument(plan, release);
  assert.ok(normalizedPlan);
  assert.equal(normalizedPlan.readiness.status, "ready");

  const sourceFiles = await Promise.all(([
    ["release", "release.json"],
    ["codebook", "codebook.json"],
    ["analysis-contract", "analysis-contract.json"],
    ["production", "production/responses.json"],
    ["pilot", "pilot/responses.json"],
  ] as const).map(async ([role, name]) => ({
    role,
    name,
    byteSize: 300,
    checksum: await sha256Checksum({ role, name }),
  })));
  const sessions = Array.from({ length: 8 }, (_, index) => {
    const x = index + 1;
    return {
      checkpointVersion: 4,
      checkpointSequence: 2,
      idempotencyKey: `quality-private-session-${x}:2`,
      releaseId: release.releaseId,
      releaseNumber: release.releaseNumber,
      releaseChecksum: release.checksum,
      sessionId: `quality-private-session-${x}`,
      status: "completed",
      currentIndex: 4,
      condition: {
        ...release.studio.conditions[index < 4 ? 0 : 1],
      },
      responses: Object.fromEntries(normalizedPlan.variables.map((variable) => [
        variable.name,
        variable.name === outcome
          ? index === 7 ? null : 2 * x + 1
          : variable.name === predictor
            ? x
            : variable.name === group
              ? index < 4 ? "A" : "B"
              : 1,
      ])),
      audioResponses: {},
      videoResponses: {},
      timings: [],
      events: [],
      history: [],
      trials: [],
      trialOrder: [],
      startedAt: `2026-07-29T13:${String(index).padStart(2, "0")}:00.000Z`,
      updatedAt: `2026-07-29T13:${String(index).padStart(2, "0")}:30.000Z`,
      executionMode: "production",
    };
  });
  const production = {
    releaseId: release.releaseId,
    releaseChecksum: release.checksum,
    executionMode: "production",
    exportedAt: "2026-07-29T14:00:00.000Z",
    sessions,
  };
  const pilot = {
    releaseId: release.releaseId,
    releaseChecksum: release.checksum,
    executionMode: "pilot",
    exportedAt: "2026-07-29T14:00:00.000Z",
    sessions: [],
  };
  const audited = await auditDataIntakeBundle({
    release,
    codebook: host.bundle.codebook,
    analysisContract: release.manifest.analysisContract,
    production,
    pilot,
    sourceFiles,
  }, release, normalizedPlan, "2026-07-29T14:10:00.000Z");
  assert.notEqual(audited.status, "blocked", JSON.stringify(audited.issues));
  const audit = markDataIntakeAuditReviewed(
    audited,
    release,
    "2026-07-29T14:20:00.000Z",
  );
  let preparation = createDataPreparationDocument(
    release,
    audit,
    "2026-07-29T14:30:00.000Z",
  );
  assert.ok(preparation);
  const prepared = await buildDataPreparationPackage({
    release,
    auditReceipt: audit,
    sourceFiles: sourceFiles as DataIntakeSourceFile[],
    production,
    document: preparation,
    preparedAt: "2026-07-29T14:40:00.000Z",
  });
  preparation = markDataPreparationReviewed(
    prepared.document,
    release,
    audit,
    "2026-07-29T14:50:00.000Z",
  );
  preparation = markDataPreparationExported(
    preparation,
    release,
    audit,
    "2026-07-29T15:00:00.000Z",
  );
  return {
    release,
    plan: normalizedPlan,
    preparation,
    preparedPackage: prepared.package,
    outcome,
  };
}

function preparedEnvelope(current: Fixture) {
  return {
    exportType: "cerise-derived-data-package",
    exportBoundary: "Potentially identifying local research data.",
    exportedAt: "2026-07-29T15:00:00.000Z",
    package: current.preparedPackage,
  };
}

test("builds bounded aggregate profiles without participant-level value lists", async () => {
  const current = await fixture();
  const report = buildDataQualityReport(
    current.preparedPackage,
    current.release,
    current.plan,
    current.preparation,
  );
  const outcome = report.variables.find((profile) => profile.name === current.outcome);
  assert.ok(outcome);
  assert.equal(outcome.missingCount, 1);
  assert.equal(outcome.observedCount, 7);
  assert.ok(outcome.numericSummary);
  assert.ok(report.findings.some((finding) => finding.id === `variable:${current.outcome}`));
  assert.ok(report.findings.some((finding) => finding.id === "dataset:condition-allocation"));
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes("quality-private-session-1"), false);
  assert.equal(serialized.includes('"_cerise_session_id"'), false);
});

test("requires explicit dispositions and exports a verified aggregate-only record", async () => {
  const current = await fixture();
  const envelope = preparedEnvelope(current);
  const created = createDataQualityReviewDocument(
    current.release,
    current.plan,
    current.preparation,
    "2026-07-29T15:10:00.000Z",
  );
  assert.ok(created);
  const run = await runDataQualityReview(
    created,
    envelope,
    current.release,
    current.plan,
    current.preparation,
    "2026-07-29T15:20:00.000Z",
  );
  assert.equal(run.document.readiness.status, "needs-assessment");
  const assessed = updateDataQualityAssessment(
    run.document,
    {
      reviews: run.document.reviews.map((review) => ({
        ...review,
        disposition: "accepted-as-described",
        note: "Reviewed against the analysis plan and retained for interpretation.",
        acknowledged: true,
      })),
      overallConclusion:
        "The derived dataset is suitable for the bounded primary analysis with the recorded missingness caveat.",
      remainingLimitations:
        "Missingness mechanisms, representativeness, and external timing validity remain unresolved.",
    },
    current.release,
    current.plan,
    current.preparation,
    "2026-07-29T15:30:00.000Z",
  );
  const reviewed = markDataQualityReviewed(
    assessed,
    current.release,
    current.plan,
    current.preparation,
    "2026-07-29T15:40:00.000Z",
  );
  const built = await buildDataQualityRecordExport(
    reviewed,
    current.preparedPackage,
    current.release,
    current.plan,
    current.preparation,
    "2026-07-29T15:50:00.000Z",
  );
  assert.equal(isDataQualityReviewReady(built.document), true);
  assert.equal(built.export.package.boundaries.participantRowsIncluded, false);
  assert.equal(built.export.package.boundaries.participantLevelValuesIncluded, false);
  assert.equal(built.export.package.boundaries.automaticExclusionsApplied, false);
  const verified = await verifyDataQualityRecordExport(
    built.export,
    envelope,
    built.document,
    current.release,
    current.plan,
    current.preparation,
  );
  assert.equal(
    verified.integrity.packageChecksum,
    built.export.package.integrity.packageChecksum,
  );

  const storage = new Map<string, string>();
  writeDataQualityReviewDocument(
    {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, value); },
    },
    current.release,
    current.plan,
    current.preparation,
    built.document,
  );
  const persisted = [...storage.values()].join("");
  assert.equal(persisted.includes("quality-private-session-1"), false);
  assert.equal(persisted.includes('"responses"'), false);

  const changed = structuredClone(built.export);
  changed.package.report.summary.responseRows += 1;
  await assert.rejects(
    verifyDataQualityRecordExport(
      changed,
      envelope,
      built.document,
      current.release,
      current.plan,
      current.preparation,
    ),
    /does not match/,
  );
});

test("rejects a changed Phase 8.3 row before quality aggregation", async () => {
  const current = await fixture();
  const created = createDataQualityReviewDocument(
    current.release,
    current.plan,
    current.preparation,
    "2026-07-29T16:00:00.000Z",
  );
  assert.ok(created);
  const changed = structuredClone(preparedEnvelope(current));
  changed.package.responses[0][current.outcome] = 999;
  await assert.rejects(
    runDataQualityReview(
      created,
      changed,
      current.release,
      current.plan,
      current.preparation,
    ),
    /checksum/,
  );
});
