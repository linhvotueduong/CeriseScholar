import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnalysisResultsPackage,
  createAnalysisExecutionDocument,
  isAnalysisExecutionReady,
  markAnalysisExecutionExported,
  markAnalysisExecutionReviewed,
  studentTCritical,
  updateAnalysisSpecifications,
  verifyPreparedAnalysisPackage,
  writeAnalysisExecutionDocument,
  type AnalysisExecutionSpecification,
  type AnalysisMethodId,
} from "./analysisExecution";
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

async function fixture(): Promise<Fixture> {
  const projectId = "project-analysis-execution";
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
  assert.ok(frozenVariables.length >= 3);
  const [outcome, predictor, group] = frozenVariables;
  design.spec.researchQuestions[0] = {
    ...design.spec.researchQuestions[0],
    id: "rq-analysis",
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
    releaseId: "release-analysis-execution",
    releaseNumber: 4,
    createdAt: "2026-07-29T12:00:00.000Z",
    releaseNotes: "Phase 8.4 deterministic execution fixture",
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
    return {
      checkpointVersion: 4,
      checkpointSequence: 2,
      idempotencyKey: `session-${index + 1}:2`,
      releaseId: release.releaseId,
      releaseNumber: release.releaseNumber,
      releaseChecksum: release.checksum,
      sessionId: `session-${index + 1}`,
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
      : "This test deliberately exercises another reviewed registry method.",
  };
}

test("student-t critical values match standard reference values", () => {
  assert.ok(Math.abs(studentTCritical(0.95, 10) - 2.228139) < 0.00001);
  assert.ok(Math.abs(studentTCritical(0.95, 30) - 2.042272) < 0.00001);
  assert.ok(Math.abs(studentTCritical(0.99, 5) - 4.032143) < 0.00001);
});

test("verifies the Phase 8.3 integrity chain and rejects a changed row", async () => {
  const current = await fixture();
  const envelope = {
    exportType: "cerise-derived-data-package",
    exportBoundary: "Potentially identifying local research data.",
    exportedAt: "2026-07-29T15:00:00.000Z",
    package: current.preparedPackage,
  };
  const verified = await verifyPreparedAnalysisPackage(
    envelope,
    current.release,
    current.plan,
    current.preparation,
  );
  assert.equal(verified.integrity.packageChecksum, current.preparedPackage.integrity.packageChecksum);

  const changed = structuredClone(envelope);
  changed.package.responses[0][current.outcome] = 999;
  await assert.rejects(
    verifyPreparedAnalysisPackage(
      changed,
      current.release,
      current.plan,
      current.preparation,
    ),
    /checksum/,
  );
});

test("executes every reviewed registry method with deterministic aggregate outputs", async () => {
  const current = await fixture();
  const cases: Array<{
    method: AnalysisMethodId;
    predictor: string;
    estimate: number;
  }> = [
    { method: "descriptive-summary", predictor: "", estimate: 12 },
    { method: "pearson-correlation", predictor: current.predictor, estimate: 1 },
    { method: "two-group-mean-difference", predictor: current.group, estimate: -10 },
    { method: "simple-linear-regression", predictor: current.predictor, estimate: 2 },
  ];
  for (const item of cases) {
    const created = createAnalysisExecutionDocument(
      current.release,
      current.plan,
      current.preparation,
      "2026-07-29T15:10:00.000Z",
    );
    assert.ok(created);
    const specifications = [
      configure(
        created.specifications[0],
        item.method,
        current.outcome,
        item.predictor,
      ),
    ];
    const document = updateAnalysisSpecifications(
      created,
      specifications,
      current.release,
      current.plan,
      current.preparation,
      "2026-07-29T15:20:00.000Z",
    );
    const result = await buildAnalysisResultsPackage({
      document,
      preparedPackage: current.preparedPackage,
      release: current.release,
      plan: current.plan,
      preparation: current.preparation,
      executedAt: "2026-07-29T15:30:00.000Z",
    });
    assert.equal(result.package.results.length, 1);
    assert.ok(
      Math.abs(result.package.results[0].primaryEstimate.value - item.estimate) < 0.000001,
      `${item.method} estimate`,
    );
    assert.equal(result.package.participantRowsIncluded, false);
    assert.equal(result.document.readiness.status, "needs-review");
  }
});

test("persists only execution metadata and reaches the reviewed/exported gate", async () => {
  const current = await fixture();
  const created = createAnalysisExecutionDocument(
    current.release,
    current.plan,
    current.preparation,
    "2026-07-29T16:00:00.000Z",
  );
  assert.ok(created);
  const configured = updateAnalysisSpecifications(
    created,
    [configure(
      created.specifications[0],
      "simple-linear-regression",
      current.outcome,
      current.predictor,
    )],
    current.release,
    current.plan,
    current.preparation,
    "2026-07-29T16:10:00.000Z",
  );
  const run = await buildAnalysisResultsPackage({
    document: configured,
    preparedPackage: current.preparedPackage,
    release: current.release,
    plan: current.plan,
    preparation: current.preparation,
    executedAt: "2026-07-29T16:20:00.000Z",
  });
  const reviewed = markAnalysisExecutionReviewed(
    run.document,
    current.release,
    current.plan,
    current.preparation,
    "2026-07-29T16:30:00.000Z",
  );
  const exported = markAnalysisExecutionExported(
    reviewed,
    current.release,
    current.plan,
    current.preparation,
    "2026-07-29T16:40:00.000Z",
  );
  assert.equal(isAnalysisExecutionReady(exported), true);
  const writes = new Map<string, string>();
  writeAnalysisExecutionDocument(
    {
      getItem: (key) => writes.get(key) ?? null,
      setItem: (key, value) => { writes.set(key, value); },
    },
    current.release,
    current.plan,
    current.preparation,
    exported,
  );
  const persisted = [...writes.values()][0];
  assert.ok(persisted);
  assert.doesNotMatch(persisted, /session-1/);
  assert.doesNotMatch(persisted, /\"responses\"/);
  assert.doesNotMatch(persisted, /\"results\"/);
});
