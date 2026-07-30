import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnalysisResultsPackage,
  createAnalysisExecutionDocument,
  markAnalysisExecutionExported,
  markAnalysisExecutionReviewed,
  updateAnalysisSpecifications,
  type AnalysisExecutionDocument,
  type AnalysisExecutionSpecification,
  type AnalysisMethodId,
  type AnalysisResultsPackage,
} from "./analysisExecution";
import {
  buildRobustnessRecordExport,
  createAnalysisRobustnessDocument,
  isAnalysisRobustnessReady,
  markAnalysisRobustnessReviewed,
  runAnalysisRobustness,
  updateAnalysisRobustnessAssessment,
  verifyAggregateRobustnessRecordExport,
  verifyRobustnessRecordExport,
  writeAnalysisRobustnessDocument,
} from "./analysisRobustness";
import {
  createAnalysisPlanDocument,
  normalizeAnalysisPlanDocument,
  type AnalysisPlanDocument,
} from "./analysisPlan";
import {
  auditDataIntakeBundle,
  markDataIntakeAuditReviewed,
  type DataIntakeAuditReceipt,
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
  audit: DataIntakeAuditReceipt;
  preparation: DataPreparationDocument;
  preparedPackage: DataPreparationPackage;
  outcome: string;
  predictor: string;
  group: string;
}

interface ExecutedFixture extends Fixture {
  execution: AnalysisExecutionDocument;
  resultsPackage: AnalysisResultsPackage;
  preparedExport: {
    exportType: string;
    exportBoundary: string;
    exportedAt: string;
    package: DataPreparationPackage;
  };
  resultsExport: {
    exportType: string;
    exportBoundary: string;
    exportedAt: string;
    package: AnalysisResultsPackage;
  };
}

async function fixture(): Promise<Fixture> {
  const projectId = "project-analysis-robustness";
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
  assert.ok(outcome && predictor && group);
  design.spec.researchQuestions[0] = {
    ...design.spec.researchQuestions[0],
    id: "rq-robustness",
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
    releaseId: "release-analysis-robustness",
    releaseNumber: 7,
    createdAt: "2026-07-29T12:00:00.000Z",
    releaseNotes: "Phase 8.7A deterministic robustness fixture",
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
  const sessions = Array.from({ length: 10 }, (_, index) => {
    const x = index + 1;
    const outcomes = [3, 4, 8, 7, 12, 10, 16, 15, 23, 21];
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
      responses: Object.fromEntries(normalizedPlan.variables.map((variable) => [
        variable.name,
        variable.name === outcome
          ? outcomes[index]
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
    audit,
    preparation,
    preparedPackage: prepared.package,
    outcome,
    predictor,
    group,
  };
}

function configure(
  base: AnalysisExecutionSpecification,
  methodId: AnalysisMethodId,
  outcome: string,
  predictor: string,
): AnalysisExecutionSpecification {
  return {
    ...base,
    enabled: true,
    methodId,
    outcomeVariable: outcome,
    predictorVariable: predictor,
    deviationRationale: methodId === "simple-linear-regression"
      ? ""
      : "The robustness fixture exercises this reviewed registry method.",
  };
}

async function executedFixture(methodId: AnalysisMethodId): Promise<ExecutedFixture> {
  const current = await fixture();
  const created = createAnalysisExecutionDocument(
    current.release,
    current.plan,
    current.preparation,
    "2026-07-29T15:10:00.000Z",
  );
  assert.ok(created);
  const predictor = methodId === "descriptive-summary"
    ? ""
    : methodId === "two-group-mean-difference"
      ? current.group
      : current.predictor;
  const configured = updateAnalysisSpecifications(
    created,
    [configure(created.specifications[0], methodId, current.outcome, predictor)],
    current.release,
    current.plan,
    current.preparation,
    "2026-07-29T15:20:00.000Z",
  );
  const run = await buildAnalysisResultsPackage({
    document: configured,
    preparedPackage: current.preparedPackage,
    release: current.release,
    plan: current.plan,
    preparation: current.preparation,
    executedAt: "2026-07-29T15:30:00.000Z",
  });
  const reviewed = markAnalysisExecutionReviewed(
    run.document,
    current.release,
    current.plan,
    current.preparation,
    "2026-07-29T15:40:00.000Z",
  );
  const execution = markAnalysisExecutionExported(
    reviewed,
    current.release,
    current.plan,
    current.preparation,
    "2026-07-29T15:50:00.000Z",
  );
  return {
    ...current,
    execution,
    resultsPackage: run.package,
    preparedExport: {
      exportType: "cerise-derived-data-package",
      exportBoundary: "Potentially identifying local research data.",
      exportedAt: current.preparation.exportedAt,
      package: current.preparedPackage,
    },
    resultsExport: {
      exportType: "cerise-analysis-results-package",
      exportBoundary: "Aggregate statistical output only.",
      exportedAt: execution.exportedAt,
      package: run.package,
    },
  };
}

test("runs the bounded method-specific registry against independently recomputed primary estimates", async () => {
  const cases: Array<{
    methodId: AnalysisMethodId;
    alternative: number;
    influenceMinimum: number | null;
    influenceMaximum: number | null;
  }> = [
    {
      methodId: "descriptive-summary",
      alternative: 11,
      influenceMinimum: 10.66666667,
      influenceMaximum: 12.88888889,
    },
    {
      methodId: "pearson-correlation",
      alternative: 0.95151515,
      influenceMinimum: 0.94543326,
      influenceMaximum: 0.96908565,
    },
    {
      methodId: "spearman-rank-correlation",
      alternative: 0.95709586,
      influenceMinimum: null,
      influenceMaximum: null,
    },
    {
      methodId: "two-group-mean-difference",
      alternative: -9,
      influenceMinimum: -11.95,
      influenceMaximum: -8.7,
    },
    {
      methodId: "paired-samples-mean-difference",
      alternative: 6,
      influenceMinimum: 5.55555556,
      influenceMaximum: 6.88888889,
    },
    {
      methodId: "simple-linear-regression",
      alternative: 2.15151515,
      influenceMinimum: 1.95,
      influenceMaximum: 2.23529412,
    },
  ];
  for (const expected of cases) {
    const current = await executedFixture(expected.methodId);
    const document = createAnalysisRobustnessDocument(
      current.release,
      current.plan,
      current.preparation,
      current.execution,
      "2026-07-29T16:00:00.000Z",
    );
    assert.ok(document);
    const run = await runAnalysisRobustness(
      document,
      current.preparedExport,
      current.resultsExport,
      current.release,
      current.plan,
      current.preparation,
      current.execution,
      "2026-07-29T16:10:00.000Z",
    );
    assert.equal(run.analyses.length, 1);
    const analysis = run.analyses[0];
    assert.equal(analysis.methodId, expected.methodId);
    assert.ok(Math.abs((analysis.alternatives[0].estimate ?? 0) - expected.alternative) < 1e-7);
    if (expected.influenceMinimum === null || expected.influenceMaximum === null) {
      assert.equal(analysis.influence, null);
    } else {
      assert.equal(analysis.influence?.minimumEstimate, expected.influenceMinimum);
      assert.equal(analysis.influence?.maximumEstimate, expected.influenceMaximum);
    }
    assert.equal(analysis.requiresAttention, false);
    if (expected.methodId === "simple-linear-regression") {
      assert.deepEqual(analysis.alternatives[0].interval, {
        level: 0.95,
        lower: 1.58842266,
        upper: 2.71460764,
        method: "Two-sided Student-t interval using the HC3 slope standard error.",
      });
    }
  }
});

test("requires explicit assessment, exports no participant rows, and rejects tampering", async () => {
  const current = await executedFixture("pearson-correlation");
  const created = createAnalysisRobustnessDocument(
    current.release,
    current.plan,
    current.preparation,
    current.execution,
    "2026-07-29T16:00:00.000Z",
  );
  assert.ok(created);
  const run = await runAnalysisRobustness(
    created,
    current.preparedExport,
    current.resultsExport,
    current.release,
    current.plan,
    current.preparation,
    current.execution,
    "2026-07-29T16:10:00.000Z",
  );
  const assessed = updateAnalysisRobustnessAssessment(
    run.document,
    {
      reviews: run.document.reviews.map((review) => ({
        ...review,
        conclusionImpact: "unchanged",
        interpretation: "The rank and leave-one-out comparisons preserve the observed direction.",
        limitations: "The checks do not address clustered observations or missing-not-at-random mechanisms.",
        acknowledged: true,
      })),
      overallConclusion: "The bounded checks did not change the observed direction of the primary estimate.",
      unperformedChecks: "No alternate missing-data treatment, clustering model, or multiplicity procedure was run.",
    },
    current.release,
    current.plan,
    current.preparation,
    current.execution,
    "2026-07-29T16:20:00.000Z",
  );
  assert.equal(assessed.readiness.status, "needs-review");
  const reviewed = markAnalysisRobustnessReviewed(
    assessed,
    current.release,
    current.plan,
    current.preparation,
    current.execution,
    "2026-07-29T16:30:00.000Z",
  );
  const exported = await buildRobustnessRecordExport(
    reviewed,
    run.preparedPackage,
    run.resultsPackage,
    current.release,
    current.plan,
    current.preparation,
    current.execution,
    "2026-07-29T16:40:00.000Z",
  );
  assert.equal(isAnalysisRobustnessReady(exported.document), true);
  assert.equal(exported.export.package.participantRowsIncluded, false);
  assert.equal(exported.export.package.automaticExclusionsApplied, false);
  assert.doesNotMatch(JSON.stringify(exported.export), /private-session-/);

  const verified = await verifyRobustnessRecordExport(
    exported.export,
    current.preparedExport,
    current.resultsExport,
    exported.document,
    current.release,
    current.plan,
    current.preparation,
    current.execution,
  );
  assert.equal(verified.integrity.packageChecksum, exported.document.lastExportChecksum);
  const aggregateVerified = await verifyAggregateRobustnessRecordExport(
    exported.export,
    exported.document,
    current.release,
    current.plan,
    current.preparation,
    current.execution,
  );
  assert.equal(
    aggregateVerified.integrity.packageChecksum,
    exported.document.lastExportChecksum,
  );

  const changed = structuredClone(exported.export);
  changed.package.analyses[0].alternatives[0].estimate = 0.5;
  await assert.rejects(
    verifyRobustnessRecordExport(
      changed,
      current.preparedExport,
      current.resultsExport,
      exported.document,
      current.release,
      current.plan,
      current.preparation,
      current.execution,
    ),
    /changed/,
  );
  await assert.rejects(
    verifyAggregateRobustnessRecordExport(
      changed,
      exported.document,
      current.release,
      current.plan,
      current.preparation,
      current.execution,
    ),
    /changed/,
  );

  const writes = new Map<string, string>();
  writeAnalysisRobustnessDocument(
    {
      getItem: (key) => writes.get(key) ?? null,
      setItem: (key, value) => { writes.set(key, value); },
    },
    current.release,
    current.plan,
    current.preparation,
    current.execution,
    exported.document,
  );
  const persisted = [...writes.values()][0];
  assert.ok(persisted);
  assert.doesNotMatch(persisted, /private-session-/);
  assert.doesNotMatch(persisted, /\"responses\"/);
  assert.doesNotMatch(persisted, /\"analyses\"/);
});
