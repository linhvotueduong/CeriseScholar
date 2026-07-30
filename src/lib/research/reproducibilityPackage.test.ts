import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnalysisResultsPackage,
  createAnalysisExecutionDocument,
  markAnalysisExecutionExported,
  markAnalysisExecutionReviewed,
  updateAnalysisSpecifications,
} from "./analysisExecution";
import {
  createAnalysisPlanDocument,
  normalizeAnalysisPlanDocument,
} from "./analysisPlan";
import {
  RESULTS_RECORD_EXPORT_BOUNDARY,
  RESULTS_RECORD_EXPORT_TYPE,
  buildResultsRecordPackage,
  createAnalysisInterpretationDocument,
  markAnalysisInterpretationExported,
  markAnalysisInterpretationReviewed,
  updateAnalysisInterpretation,
  verifyResultsRecordExport,
} from "./analysisResults";
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
} from "./dataPreparation";
import {
  createCompletedExperimentReleaseReview,
  createExperimentRelease,
  sha256Checksum,
} from "./experimentRelease";
import { buildExperimentHostBundle } from "./experimentHostBundle";
import {
  createExperimentBlock,
  createExperimentStudioDocument,
} from "./experimentStudio";
import {
  buildReproducibilityArchive,
  createReproducibilityPackageDocument,
  isReproducibilityPackageReady,
  markReproducibilityPackageExported,
  markReproducibilityPackageReviewed,
  readReproducibilityPackageDocument,
  recordReproducibilityBuild,
  updateReproducibilityPackageDocument,
  verifyReproducibilityArchive,
  writeReproducibilityPackageDocument,
  type ReproducibilityEnvironment,
} from "./reproducibilityPackage";
import { EMPTY_RESEARCH_PATH_DRAFT } from "./researchPathDraft";
import { createStudyDesignDocument } from "./studyDesign";

async function fixture() {
  const projectId = "project-reproducibility";
  const studio = createExperimentStudioDocument(projectId);
  const predictorBlock = createExperimentBlock("rating", "block-predictor");
  predictorBlock.variableName = "predictor_score";
  predictorBlock.internalName = "predictor_score";
  predictorBlock.heading = "Predictor score";
  const groupBlock = createExperimentBlock("single-choice", "block-group");
  groupBlock.variableName = "group_assignment";
  groupBlock.internalName = "group_assignment";
  groupBlock.heading = "Group assignment";
  groupBlock.choices = ["A", "B"];
  studio.blocks.splice(studio.blocks.length - 1, 0, predictorBlock, groupBlock);
  studio.conditions = [
    { id: "condition-a", name: "A", weight: 1 },
    { id: "condition-b", name: "B", weight: 1 },
  ];
  studio.assignment.method = "random";

  const design = createStudyDesignDocument(projectId, EMPTY_RESEARCH_PATH_DRAFT);
  const frozenVariables = studio.blocks
    .map((block) => "variableName" in block ? block.variableName : "")
    .filter(Boolean);
  const [outcome, predictor, group] = frozenVariables;
  assert.ok(outcome);
  assert.ok(predictor);
  assert.ok(group);
  design.spec.researchQuestions[0] = {
    ...design.spec.researchQuestions[0],
    id: "rq-reproducibility",
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
    releaseId: "release-reproducibility",
    releaseNumber: 5,
    createdAt: "2026-07-30T12:00:00.000Z",
    releaseNotes: "Phase 8.6 deterministic archive fixture",
    studio,
    studyDesign: design,
    review: createCompletedExperimentReleaseReview(),
  });
  const host = await buildExperimentHostBundle(release, {
    createdAt: "2026-07-30T12:05:00.000Z",
    executionMode: "production",
  });
  const createdPlan = createAnalysisPlanDocument(release, "2026-07-30T12:10:00.000Z");
  assert.ok(createdPlan);
  createdPlan.dataAccessDeclaration = "not-accessed";
  const question = createdPlan.researchQuestions[0];
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
  question.sensitivityAnalyses = ["Repeat after a justified quality exclusion."];
  createdPlan.variables.forEach((variable) => {
    variable.roles = variable.name === outcome
      ? ["outcome"]
      : variable.name === predictor
        ? ["predictor"]
        : variable.name === group
          ? ["group"]
        : ["administrative"];
  });
  const plan = normalizeAnalysisPlanDocument(createdPlan, release);
  assert.ok(plan);
  assert.equal(plan.readiness.status, "ready");

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
  const sessions = Array.from({ length: 10 }, (_, index) => {
    const x = index + 1;
    return {
      checkpointVersion: 4,
      checkpointSequence: 2,
      idempotencyKey: `private-session-${index + 1}:2`,
      releaseId: release.releaseId,
      releaseNumber: release.releaseNumber,
      releaseChecksum: release.checksum,
      sessionId: `private-session-${index + 1}`,
      status: "completed",
      currentIndex: 4,
      condition: {
        ...release.studio.conditions[0],
        id: index < 5 ? "condition-a" : "condition-b",
        name: index < 5 ? "A" : "B",
      },
      responses: Object.fromEntries(plan.variables.map((variable) => [
        variable.name,
        variable.name === outcome
          ? 2 * x + 1
          : variable.name === predictor
            ? x
            : variable.name === group
              ? index < 5 ? "A" : "B"
            : 1,
      ])),
      audioResponses: {},
      videoResponses: {},
      timings: [],
      events: [],
      history: [],
      trials: [],
      trialOrder: [],
      startedAt: `2026-07-30T13:${String(index).padStart(2, "0")}:00.000Z`,
      updatedAt: `2026-07-30T13:${String(index).padStart(2, "0")}:30.000Z`,
      executionMode: "production",
    };
  });
  const production = {
    releaseId: release.releaseId,
    releaseChecksum: release.checksum,
    executionMode: "production",
    exportedAt: "2026-07-30T14:00:00.000Z",
    sessions,
  };
  const pilot = {
    releaseId: release.releaseId,
    releaseChecksum: release.checksum,
    executionMode: "pilot",
    exportedAt: "2026-07-30T14:00:00.000Z",
    sessions: [],
  };
  const audited = await auditDataIntakeBundle({
    release,
    codebook: host.bundle.codebook,
    analysisContract: release.manifest.analysisContract,
    production,
    pilot,
    sourceFiles,
  }, release, plan, "2026-07-30T14:10:00.000Z");
  const audit = markDataIntakeAuditReviewed(
    audited,
    release,
    "2026-07-30T14:20:00.000Z",
  );
  let preparation = createDataPreparationDocument(
    release,
    audit,
    "2026-07-30T14:30:00.000Z",
  );
  assert.ok(preparation);
  const prepared = await buildDataPreparationPackage({
    release,
    auditReceipt: audit,
    sourceFiles: sourceFiles as DataIntakeSourceFile[],
    production,
    document: preparation,
    preparedAt: "2026-07-30T14:40:00.000Z",
  });
  preparation = markDataPreparationReviewed(
    prepared.document,
    release,
    audit,
    "2026-07-30T14:50:00.000Z",
  );
  preparation = markDataPreparationExported(
    preparation,
    release,
    audit,
    "2026-07-30T15:00:00.000Z",
  );

  const createdExecution = createAnalysisExecutionDocument(
    release,
    plan,
    preparation,
    "2026-07-30T15:10:00.000Z",
  );
  assert.ok(createdExecution);
  const configuredExecution = updateAnalysisSpecifications(
    createdExecution,
    [{
      ...createdExecution.specifications[0],
      enabled: true,
      methodId: "simple-linear-regression",
      outcomeVariable: outcome,
      predictorVariable: predictor,
    }],
    release,
    plan,
    preparation,
    "2026-07-30T15:20:00.000Z",
  );
  const run = await buildAnalysisResultsPackage({
    document: configuredExecution,
    preparedPackage: prepared.package,
    release,
    plan,
    preparation,
    executedAt: "2026-07-30T15:30:00.000Z",
  });
  assert.equal(
    run.document.lastRun?.blockingDiagnostics,
    0,
    JSON.stringify(run.package.results.flatMap((item) => item.diagnostics)),
  );
  const reviewedExecution = markAnalysisExecutionReviewed(
    run.document,
    release,
    plan,
    preparation,
    "2026-07-30T15:40:00.000Z",
  );
  const execution = markAnalysisExecutionExported(
    reviewedExecution,
    release,
    plan,
    preparation,
    "2026-07-30T15:50:00.000Z",
  );

  const createdInterpretation = createAnalysisInterpretationDocument(
    release,
    plan,
    preparation,
    execution,
    run.package,
    "2026-07-30T16:00:00.000Z",
  );
  assert.ok(createdInterpretation);
  const record = {
    ...createdInterpretation.researchQuestions[0],
    directAnswer: "The reviewed aggregate result supports a positive association.",
    statisticalMeaning: "The estimated slope and 95% interval are reported in the linked result.",
    practicalMeaning: "The estimate should be interpreted on the frozen outcome scale.",
    claim: "Predictor score was positively associated with outcome score.",
    claimStrength: "associational" as const,
    limitations: "The analysis is unadjusted and does not establish causality.",
    robustnessStatus: "not-performed" as const,
    robustnessEvidence: "No sensitivity analysis was performed.",
    diagnosticResponses: createdInterpretation.researchQuestions[0]
      .diagnosticResponses.map((item) => ({
        ...item,
        note: "The advisory was reviewed and remains a limitation.",
      })),
    tableCaption: "Aggregate regression result.",
    figureCaption: "Estimate and 95% confidence interval.",
    tableApproved: true,
    figureApproved: true,
    researcherConfirmed: true,
  };
  const completedInterpretation = updateAnalysisInterpretation(
    createdInterpretation,
    {
      researchQuestions: [record],
      studyLimitations: "Small single-setting analysis.",
      boundaryConditions: "Limited to the frozen measures and sampled setting.",
      noUnexpectedFindingsConfirmed: true,
    },
    release,
    plan,
    preparation,
    execution,
    "2026-07-30T16:10:00.000Z",
  );
  const reviewedInterpretation = markAnalysisInterpretationReviewed(
    completedInterpretation,
    release,
    plan,
    preparation,
    execution,
    "2026-07-30T16:20:00.000Z",
  );
  const interpretation = markAnalysisInterpretationExported(
    reviewedInterpretation,
    release,
    plan,
    preparation,
    execution,
    "2026-07-30T16:30:00.000Z",
  );
  const resultsPackage = await buildResultsRecordPackage({
    document: interpretation,
    resultsPackage: run.package,
    createdAt: interpretation.exportedAt,
  });
  const resultsRecord = {
    exportType: RESULTS_RECORD_EXPORT_TYPE,
    exportBoundary: RESULTS_RECORD_EXPORT_BOUNDARY,
    exportedAt: interpretation.exportedAt,
    package: resultsPackage,
  };
  await verifyResultsRecordExport(
    resultsRecord,
    release,
    plan,
    preparation,
    execution,
    interpretation,
  );
  return {
    release,
    plan,
    audit,
    preparation,
    execution,
    interpretation,
    resultsRecord,
  };
}

const environment: ReproducibilityEnvironment = {
  capturedAt: "2026-07-30T16:35:00.000Z",
  context: "archive-build-environment-not-analysis-execution-environment",
  userAgent: "Cerise test browser",
  language: "en-US",
  platform: "test",
  timeZone: "UTC",
  viewportWidth: 1440,
  viewportHeight: 1000,
  devicePixelRatio: 2,
  hardwareConcurrency: 8,
  secureContext: true,
};

test("builds and independently verifies a deterministic metadata-only archive", async () => {
  const current = await fixture();
  const created = createReproducibilityPackageDocument(
    "Archive test project",
    current.release,
    current.plan,
    current.audit,
    current.preparation,
    current.execution,
    current.interpretation,
    current.resultsRecord,
    environment,
    "2026-07-30T16:40:00.000Z",
  );
  assert.ok(created);
  const completed = updateReproducibilityPackageDocument(
    created,
    {
      executionEnvironmentNotes:
        "The Phase 8.4 execution browser was not separately recorded.",
      restrictedMaterials: {
        participantData: {
          status: "referenced-outside-archive",
          reference: "Restricted project data vault",
          accessConditions: "Principal investigator approval required",
        },
        rawMedia: {
          status: "not-collected",
          reference: "",
          accessConditions: "",
        },
        combinedSqlite: {
          status: "not-referenced",
          reference: "",
          accessConditions: "",
        },
      },
      reviewNotes: "Archive contents and exclusions reviewed.",
      researcherConfirmed: true,
    },
    current.release,
    current.plan,
    current.audit,
    current.preparation,
    current.execution,
    current.interpretation,
    "2026-07-30T16:45:00.000Z",
  );
  assert.equal(completed.readiness.status, "needs-review");
  const reviewed = markReproducibilityPackageReviewed(
    completed,
    current.release,
    current.plan,
    current.audit,
    current.preparation,
    current.execution,
    current.interpretation,
    "2026-07-30T16:50:00.000Z",
  );
  assert.equal(reviewed.readiness.status, "needs-build");

  const first = await buildReproducibilityArchive({
    ...current,
    document: reviewed,
    verifiedAt: "2026-07-30T16:55:00.000Z",
  });
  assert.equal(first.verification.status, "verified");
  assert.equal(first.manifest.privacy.participantRowsIncluded, false);
  assert.equal(first.verification.fileCount, 14);
  assert.doesNotMatch(
    new TextDecoder().decode(first.archive),
    /private-session-1/,
  );
  const firstFileSize = Number.parseInt(
    new TextDecoder()
      .decode(first.archive.slice(124, 136))
      .replaceAll("\0", "")
      .trim(),
    8,
  );
  assert.ok(Number.isSafeInteger(firstFileSize));
  assert.notEqual(firstFileSize % 512, 0);
  const changedPadding = first.archive.slice();
  changedPadding[512 + firstFileSize] = 1;
  await assert.rejects(
    verifyReproducibilityArchive(changedPadding),
    /non-zero padding/,
  );

  const built = recordReproducibilityBuild(
    reviewed,
    first.verification,
    current.release,
    current.plan,
    current.audit,
    current.preparation,
    current.execution,
    current.interpretation,
  );
  assert.equal(built.readiness.status, "needs-export");
  const second = await buildReproducibilityArchive({
    ...current,
    document: built,
    verifiedAt: "2026-07-30T17:00:00.000Z",
  });
  assert.equal(second.verification.archiveChecksum, first.verification.archiveChecksum);

  const exported = markReproducibilityPackageExported(
    built,
    second.verification.archiveChecksum,
    current.release,
    current.plan,
    current.audit,
    current.preparation,
    current.execution,
    current.interpretation,
    "2026-07-30T17:05:00.000Z",
  );
  assert.equal(isReproducibilityPackageReady(exported), true);
  const exportedAgain = markReproducibilityPackageExported(
    exported,
    second.verification.archiveChecksum,
    current.release,
    current.plan,
    current.audit,
    current.preparation,
    current.execution,
    current.interpretation,
    "2026-07-30T17:06:00.000Z",
  );
  assert.equal(isReproducibilityPackageReady(exportedAgain), true);

  const storage = new Map<string, string>();
  writeReproducibilityPackageDocument(
    {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, value); },
    },
    current.release,
    current.plan,
    current.audit,
    current.preparation,
    current.execution,
    current.interpretation,
    exportedAgain,
  );
  const stored = [...storage.values()][0];
  assert.ok(stored);
  assert.doesNotMatch(stored, /aggregateAnalysis|primaryEstimate|private-session/);
  assert.ok(readReproducibilityPackageDocument(
    {
      getItem: (key) => storage.get(key) ?? null,
      setItem: () => {},
    },
    current.release,
    current.plan,
    current.audit,
    current.preparation,
    current.execution,
    current.interpretation,
  ));
});

test("rejects a changed archive entry even when the TAR remains parseable", async () => {
  const current = await fixture();
  const created = createReproducibilityPackageDocument(
    "Tamper test project",
    current.release,
    current.plan,
    current.audit,
    current.preparation,
    current.execution,
    current.interpretation,
    current.resultsRecord,
    environment,
    "2026-07-30T17:10:00.000Z",
  );
  assert.ok(created);
  const completed = updateReproducibilityPackageDocument(
    created,
    {
      executionEnvironmentNotes: "Execution environment was not recorded.",
      restrictedMaterials: {
        participantData: {
          status: "not-referenced",
          reference: "",
          accessConditions: "",
        },
        rawMedia: {
          status: "not-collected",
          reference: "",
          accessConditions: "",
        },
        combinedSqlite: {
          status: "not-referenced",
          reference: "",
          accessConditions: "",
        },
      },
      researcherConfirmed: true,
    },
    current.release,
    current.plan,
    current.audit,
    current.preparation,
    current.execution,
    current.interpretation,
    "2026-07-30T17:15:00.000Z",
  );
  const reviewed = markReproducibilityPackageReviewed(
    completed,
    current.release,
    current.plan,
    current.audit,
    current.preparation,
    current.execution,
    current.interpretation,
    "2026-07-30T17:20:00.000Z",
  );
  const built = await buildReproducibilityArchive({
    ...current,
    document: reviewed,
    verifiedAt: "2026-07-30T17:25:00.000Z",
  });
  const changed = built.archive.slice();
  changed[600] ^= 1;
  await assert.rejects(
    verifyReproducibilityArchive(changed),
    /checksum failed/,
  );
});
