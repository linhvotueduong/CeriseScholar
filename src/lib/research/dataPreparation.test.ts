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
  type DataIntakeAuditReceipt,
  type DataIntakeSourceFile,
} from "./dataIntakeAudit";
import {
  buildDataPreparationPackage,
  createDataPreparationDocument,
  isDataPreparationReady,
  markDataPreparationExported,
  markDataPreparationReviewed,
  normalizeDataPreparationDocument,
  updateDataPreparationOperations,
  type PreparationOperation,
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

async function fixture(): Promise<{
  release: ExperimentRelease;
  plan: AnalysisPlanDocument;
  audit: DataIntakeAuditReceipt;
  sourceFiles: DataIntakeSourceFile[];
  production: Record<string, unknown>;
}> {
  const studio = createExperimentStudioDocument("project-preparation");
  const secondaryBlock = createExperimentBlock("rating", "block-secondary-rating");
  secondaryBlock.variableName = "secondary_rating";
  secondaryBlock.internalName = "secondary_rating";
  const attentionBlock = createExperimentBlock("attention-check", "block-attention-check");
  attentionBlock.variableName = "attention_check";
  attentionBlock.internalName = "attention_check";
  studio.blocks.splice(studio.blocks.length - 1, 0, secondaryBlock, attentionBlock);
  const design = createStudyDesignDocument("project-preparation", EMPTY_RESEARCH_PATH_DRAFT);
  design.spec.researchQuestions[0] = {
    ...design.spec.researchQuestions[0],
    id: "rq-preparation",
    question: "Does the intervention change the planned responses?",
    hypothesis: "The intervention changes the planned responses.",
    construct: "Planned response",
    constructRole: "outcome",
    operationalDefinition: "Response captured in the frozen study",
    measure: studio.blocks[3].variableName,
    expectedDirection: "Higher",
  };
  design.spec.participants.targetPopulation = "Eligible adults";
  const release = await createExperimentRelease({
    releaseId: "release-preparation",
    releaseNumber: 3,
    createdAt: "2026-07-28T20:00:00.000Z",
    releaseNotes: "Phase 8.3 preparation fixture",
    studio,
    studyDesign: design,
    review: createCompletedExperimentReleaseReview(),
  });
  const host = await buildExperimentHostBundle(release, {
    createdAt: "2026-07-28T20:30:00.000Z",
    executionMode: "production",
  });
  const plan = createAnalysisPlanDocument(release, "2026-07-28T21:00:00.000Z");
  assert.ok(plan);
  plan.dataAccessDeclaration = "not-accessed";
  for (const question of plan.researchQuestions) {
    question.designation = "primary";
    question.estimand.population = "Eligible adults";
    question.estimand.outcome = "Planned response";
    question.outcomeVariables = [plan.variables[0].name];
    question.unitOfAnalysis = "participant";
    question.plannedMethod = "Linear model";
    question.missingDataStrategy = "Report missingness and use complete cases.";
    question.multiplicityStrategy = "One primary question; no adjustment.";
  }
  for (const variable of plan.variables) {
    variable.roles = variable.name === plan.variables[0].name
      ? ["outcome"]
      : ["administrative"];
  }
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
    byteSize: 200,
    checksum: await sha256Checksum({ role, name }),
  })));
  const variables = normalizedPlan.variables.map((variable) => variable.name);
  const completed = {
    checkpointVersion: 4,
    checkpointSequence: 2,
    idempotencyKey: "session-one:2",
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    sessionId: "session-one",
    status: "completed",
    currentIndex: 4,
    condition: release.studio.conditions[0],
    responses: Object.fromEntries(variables.map((name, index) => [
      name,
      name === attentionBlock.variableName
        ? attentionBlock.correctAnswer
        : index === 0
          ? " NA "
          : index === 1
            ? "6"
            : "3",
    ])),
    audioResponses: {},
    videoResponses: {},
    timings: [],
    events: [
      { type: "visibility-hidden", at: "2026-07-28T21:11:00.000Z", blockId: "block-one", screenIndex: 1 },
      { type: "window-blur", at: "2026-07-28T21:11:01.000Z", blockId: "block-one", screenIndex: 1 },
    ],
    history: [],
    trials: [{
      tableId: "table-one",
      tableName: "Trials",
      loopBlockId: "loop-one",
      trialId: "trial-one",
      sourceRowIndex: 0,
      repetition: 1,
      orderIndex: 0,
      practice: false,
      response: "f",
      correctAnswer: "f",
      correct: true,
      reactionTimeMs: 420,
      deadlineMs: 1_000,
      deadlineExceeded: false,
      completionReason: "response",
    }],
    trialOrder: ["loop-one:trial-one:1"],
    startedAt: "2026-07-28T21:10:00.000Z",
    updatedAt: "2026-07-28T21:12:00.000Z",
    executionMode: "production",
  };
  const completedExcluded = {
    ...completed,
    idempotencyKey: "session-two:2",
    sessionId: "session-two",
    responses: Object.fromEntries(variables.map((name, index) => [
      name,
      name === attentionBlock.variableName
        ? "Incorrect attention response"
        : index === 0
          ? "4"
          : index === 1
            ? "2"
            : "1",
    ])),
    events: [],
    trials: [{
      ...completed.trials[0],
      trialId: "trial-two",
      response: "j",
      correctAnswer: "f",
      correct: false,
      reactionTimeMs: 820,
    }],
    trialOrder: ["loop-one:trial-two:1"],
    startedAt: "2026-07-28T21:20:00.000Z",
    updatedAt: "2026-07-28T21:22:00.000Z",
  };
  const incomplete = {
    ...completed,
    sessionId: "session-incomplete",
    idempotencyKey: "session-incomplete:1",
    status: "started",
    responses: {},
    trials: [],
  };
  const production = {
    releaseId: release.releaseId,
    releaseChecksum: release.checksum,
    executionMode: "production",
    exportedAt: "2026-07-28T22:00:00.000Z",
    sessions: [completed, completedExcluded, incomplete],
  };
  const pilot = {
    releaseId: release.releaseId,
    releaseChecksum: release.checksum,
    executionMode: "pilot",
    exportedAt: "2026-07-28T22:00:00.000Z",
    sessions: [],
  };
  const audited = await auditDataIntakeBundle({
    release,
    codebook: host.bundle.codebook,
    analysisContract: release.manifest.analysisContract,
    production,
    pilot,
    sourceFiles,
  }, release, normalizedPlan, "2026-07-28T22:10:00.000Z");
  assert.notEqual(audited.status, "blocked", JSON.stringify(audited.issues));
  const audit = markDataIntakeAuditReviewed(
    audited,
    release,
    "2026-07-28T22:20:00.000Z",
  );
  return { release, plan: normalizedPlan, audit, sourceFiles, production };
}

function preparationOperations(plan: AnalysisPlanDocument): PreparationOperation[] {
  const first = plan.variables[0].name;
  const second = plan.variables[1].name;
  return [
    {
      id: "trim-primary",
      type: "trim-text",
      enabled: true,
      rationale: "Standardize surrounding whitespace before the declared missing-value map.",
      variableNames: [first],
    },
    {
      id: "missing-primary",
      type: "recode-missing",
      enabled: true,
      rationale: "The collection protocol used NA as an explicit missing marker.",
      variableNames: [first],
      missingValues: ["NA"],
    },
    {
      id: "numeric-secondary",
      type: "coerce-number",
      enabled: true,
      rationale: "The frozen Likert response was exported as a numeric string.",
      variableNames: [second],
      invalidToMissing: true,
    },
    {
      id: "reverse-secondary",
      type: "reverse-score",
      enabled: true,
      rationale: "The item direction is opposite to the planned construct direction.",
      sourceVariable: second,
      targetVariable: `${second}_reversed`,
      minimum: 1,
      maximum: 7,
    },
    {
      id: "composite-planned",
      type: "composite-score",
      enabled: true,
      rationale: "Create the prespecified two-item mean for the planned analysis.",
      sourceVariables: [second, `${second}_reversed`],
      targetVariable: "planned_composite",
      method: "mean",
      minimumValid: 2,
    },
  ];
}

test("builds a deterministic derived package without mutating the source export", async () => {
  const { release, plan, audit, sourceFiles, production } = await fixture();
  const original = structuredClone(production);
  const draft = createDataPreparationDocument(release, audit);
  assert.ok(draft);
  const document = updateDataPreparationOperations(
    draft,
    preparationOperations(plan),
    release,
    audit,
    "2026-07-28T22:30:00.000Z",
  );
  const result = await buildDataPreparationPackage({
    production,
    sourceFiles,
    release,
    auditReceipt: audit,
    document,
    preparedAt: "2026-07-28T22:40:00.000Z",
  });

  assert.deepEqual(production, original);
  assert.equal(result.package.responses.length, 2);
  assert.equal(result.package.trials.length, 2);
  assert.equal(result.document.lastRun?.sourceNonCompletedRows, 1);
  assert.equal(result.document.lastRun?.inputRows, 2);
  assert.equal(result.document.lastRun?.outputRows, 2);
  assert.equal(result.package.responses[0][plan.variables[0].name], null);
  assert.equal(result.package.responses[0][plan.variables[1].name], 6);
  assert.equal(
    result.package.responses[0][`${plan.variables[1].name}_reversed`],
    2,
  );
  assert.equal(result.package.responses[0].planned_composite, 4);
  assert.match(result.package.integrity.packageChecksum, /^sha256:[a-f0-9]{64}$/);
  assert.equal(result.package.inclusionLedger?.rows.length, 2);
  assert.equal(result.package.behavioralSummary?.rows.length, 2);
});

test("derives explicit accuracy and RT summaries with an auditable inclusion ledger", async () => {
  const { release, audit, sourceFiles, production } = await fixture();
  const draft = createDataPreparationDocument(release, audit);
  assert.ok(draft);
  const operations: PreparationOperation[] = [
    {
      id: "participant-accuracy",
      type: "summarize-trial-accuracy",
      enabled: true,
      rationale: "Summarize scored production trials before applying the prespecified threshold.",
      targetVariable: "trial_accuracy",
      includePractice: false,
      minimumScoredTrials: 1,
    },
    {
      id: "participant-rt",
      type: "summarize-reaction-time",
      enabled: true,
      rationale: "Summarize bounded production-trial timing without practice or deadline rows.",
      targetVariable: "median_reaction_time",
      method: "median",
      includePractice: false,
      correctOnly: false,
      excludeDeadlineExceeded: true,
      minimumMilliseconds: 100,
      maximumMilliseconds: 2_000,
      minimumValidTrials: 1,
    },
    {
      id: "accuracy-threshold",
      type: "exclude-record",
      enabled: true,
      rationale: "Apply the protocol-defined minimum scored-trial accuracy.",
      sourceVariable: "trial_accuracy",
      comparator: "less-than",
      comparisonValue: "0.5",
    },
  ];
  const document = updateDataPreparationOperations(
    draft,
    operations,
    release,
    audit,
  );
  const result = await buildDataPreparationPackage({
    production,
    sourceFiles,
    release,
    auditReceipt: audit,
    document,
    preparedAt: "2026-07-28T23:10:00.000Z",
  });

  assert.equal(result.package.responses.length, 1);
  assert.equal(result.package.responses[0].trial_accuracy, 1);
  assert.equal(result.package.responses[0].median_reaction_time, 420);
  assert.deepEqual(result.package.inclusionLedger?.rows, [
    {
      _cerise_session_id: "session-one",
      _cerise_condition_id: release.studio.conditions[0].id,
      included: true,
      exclusion_operation_ids: [],
    },
    {
      _cerise_session_id: "session-two",
      _cerise_condition_id: release.studio.conditions[0].id,
      included: false,
      exclusion_operation_ids: ["accuracy-threshold"],
    },
  ]);
  assert.deepEqual(
    result.package.behavioralSummary?.rows.map((row) => ({
      id: row._cerise_session_id,
      included: row.included,
      attentionCorrect: row.attention_checks_correct,
      attentionIncorrect: row.attention_checks_incorrect,
      focusLoss: row.focus_loss_events,
      accuracy: [row.correct_production_trials, row.scored_production_trials],
      medianRt: row.median_reaction_time_ms,
    })),
    [
      {
        id: "session-one",
        included: true,
        attentionCorrect: 1,
        attentionIncorrect: 0,
        focusLoss: 2,
        accuracy: [1, 1],
        medianRt: 420,
      },
      {
        id: "session-two",
        included: false,
        attentionCorrect: 0,
        attentionIncorrect: 1,
        focusLoss: 0,
        accuracy: [0, 1],
        medianRt: 820,
      },
    ],
  );
  assert.match(result.document.lastRun?.inclusionLedgerChecksum ?? "", /^sha256:/);
  assert.match(result.document.lastRun?.behavioralSummaryChecksum ?? "", /^sha256:/);
});

test("blocks source-checksum drift before participant rows are prepared", async () => {
  const { release, plan, audit, sourceFiles, production } = await fixture();
  const draft = createDataPreparationDocument(release, audit);
  assert.ok(draft);
  const document = updateDataPreparationOperations(
    draft,
    preparationOperations(plan),
    release,
    audit,
  );
  const changedFiles = sourceFiles.map((file) => (
    file.role === "production" ? { ...file, byteSize: file.byteSize + 1 } : file
  ));
  await assert.rejects(
    () => buildDataPreparationPackage({
      production,
      sourceFiles: changedFiles,
      release,
      auditReceipt: audit,
      document,
    }),
    /do not match the reviewed Phase 8\.2 checksums/,
  );
});

test("stores only bounded provenance and becomes ready after review and export", async () => {
  const { release, plan, audit, sourceFiles, production } = await fixture();
  const draft = createDataPreparationDocument(release, audit);
  assert.ok(draft);
  const document = updateDataPreparationOperations(
    draft,
    preparationOperations(plan),
    release,
    audit,
  );
  const prepared = await buildDataPreparationPackage({
    production,
    sourceFiles,
    release,
    auditReceipt: audit,
    document,
    preparedAt: "2026-07-28T22:40:00.000Z",
  });
  assert.equal(isDataPreparationReady(prepared.document), false);
  const reviewed = markDataPreparationReviewed(
    prepared.document,
    release,
    audit,
    "2026-07-28T22:50:00.000Z",
  );
  const exported = markDataPreparationExported(
    reviewed,
    release,
    audit,
    "2026-07-28T23:00:00.000Z",
  );
  assert.equal(isDataPreparationReady(exported), true);
  const serialized = JSON.stringify(exported);
  assert.doesNotMatch(serialized, /session-one|session-two|session-incomplete|" NA "|"6"/);
  assert.ok(normalizeDataPreparationDocument(exported, release, audit));
});

test("rejects arbitrary or unresolved operation inputs", async () => {
  const { release, audit } = await fixture();
  const draft = createDataPreparationDocument(release, audit);
  assert.ok(draft);
  assert.throws(() => updateDataPreparationOperations(
    draft,
    [{
      id: "unsafe-expression",
      type: "reverse-score",
      enabled: true,
      rationale: "Attempted arbitrary expression.",
      sourceVariable: "not_a_frozen_variable",
      targetVariable: "derived",
      minimum: 1,
      maximum: 7,
    }],
    release,
    audit,
  ));
});
