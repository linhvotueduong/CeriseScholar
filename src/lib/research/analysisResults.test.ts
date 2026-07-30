import assert from "node:assert/strict";
import test from "node:test";
import {
  analysisConfigurationFingerprint,
  type AnalysisExecutionDocument,
  type AnalysisExecutionSpecification,
  type AnalysisMethodResult,
  type AnalysisResultsPackage,
} from "./analysisExecution";
import type { AnalysisPlanDocument } from "./analysisPlan";
import {
  buildResultsRecordPackage,
  createAnalysisInterpretationDocument,
  isAnalysisInterpretationReady,
  markAnalysisInterpretationExported,
  markAnalysisInterpretationReviewed,
  updateAnalysisInterpretation,
  verifyAnalysisResultsPackage,
  writeAnalysisInterpretationDocument,
} from "./analysisResults";
import type { DataPreparationDocument } from "./dataPreparation";
import {
  sha256Checksum,
  type ExperimentRelease,
} from "./experimentRelease";

interface Fixture {
  release: ExperimentRelease;
  plan: AnalysisPlanDocument;
  preparation: DataPreparationDocument;
  execution: AnalysisExecutionDocument;
  resultsPackage: AnalysisResultsPackage;
  envelope: {
    exportType: string;
    exportBoundary: string;
    exportedAt: string;
    package: AnalysisResultsPackage;
  };
}

async function fixture(): Promise<Fixture> {
  const contract = {
    schemaVersion: 1,
    projectId: "project-results",
    releaseId: "release-results",
    frozenAt: "2026-07-29T12:00:00.000Z",
    researchQuestions: [],
    variables: [],
  };
  const contractChecksum = await sha256Checksum(contract);
  const releasePayload = {
    releaseId: "release-results",
    projectId: "project-results",
    releaseNumber: 5,
    createdAt: "2026-07-29T12:00:00.000Z",
    releaseNotes: "Phase 8.5 fixture",
    manifest: {
      formatVersion: 5,
      studySchemaVersion: 7,
      blockCount: 0,
      variableCount: 2,
      conditionCount: 0,
      trialTableCount: 0,
      trialRowCount: 0,
      timingClaim: "browser-measured",
      participantDataBoundary: "local-only",
      analysisContractSchemaVersion: 1,
      analysisContractChecksum: contractChecksum,
      analysisContract: contract,
      review: {
        draftRehearsed: true,
        consentWithdrawalTested: true,
        conditionAndVariableReview: true,
        pilotDataPlanConfirmed: true,
        reviewedAt: "2026-07-29T12:00:00.000Z",
      },
      validationSummary: { blocking: 0, warning: 0, advisory: 0 },
      validationIssues: [],
    },
    studio: {},
  };
  const release = {
    ...releasePayload,
    checksum: await sha256Checksum(releasePayload),
  } as unknown as ExperimentRelease;
  const plan = {
    schemaVersion: 1,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractSchemaVersion: 1,
    contractChecksum,
    contractFrozenAt: release.createdAt,
    createdAt: "2026-07-29T12:10:00.000Z",
    updatedAt: "2026-07-29T12:20:00.000Z",
    researchQuestions: [{
      id: "rq-1",
      question: "How strongly is predictor score associated with outcome score?",
      hypothesis: "Higher predictor scores correspond to higher outcome scores.",
      designation: "primary",
      estimand: {
        population: "Eligible adults",
        exposureOrIntervention: "Predictor score",
        comparator: "",
        outcome: "Outcome score",
        summaryMeasure: "Unstandardized slope",
        timepoint: "Post-task",
      },
      outcomeVariables: ["outcome_score"],
      predictorVariables: ["predictor_score"],
      covariateVariables: [],
      unitOfAnalysis: "participant",
      plannedMethod: "Simple linear regression",
      effectSize: "Unstandardized slope",
      missingDataStrategy: "Complete pairs",
      exclusionRules: [],
      transformations: [],
      multiplicityStrategy: "One primary analysis",
      sensitivityAnalyses: ["Repeat after the documented quality exclusion, if justified."],
    }],
    variables: [],
    globalPlan: {
      unitOfAnalysis: "participant",
      missingDataStrategy: "Complete pairs",
      exclusionRules: [],
      transformations: [],
      multiplicityStrategy: "One primary analysis",
      sensitivityAnalyses: [],
    },
    dataAccessDeclaration: "not-accessed",
    readiness: {
      status: "ready",
      completedDecisions: 8,
      totalDecisions: 8,
      issues: [],
    },
  } as AnalysisPlanDocument;
  const specification: AnalysisExecutionSpecification = {
    id: "analysis-rq-1",
    researchQuestionId: "rq-1",
    enabled: true,
    methodId: "simple-linear-regression",
    outcomeVariable: "outcome_score",
    predictorVariable: "predictor_score",
    confidenceLevel: 0.95,
    deviationRationale: "",
  };
  const result: AnalysisMethodResult = {
    analysisId: specification.id,
    researchQuestionId: "rq-1",
    researchQuestion: plan.researchQuestions[0].question,
    methodId: "simple-linear-regression",
    methodLabel: "Simple linear regression",
    outcomeVariable: "outcome_score",
    predictorVariable: "predictor_score",
    planAlignment: "aligned",
    completeSampleSize: 40,
    excludedMissingOrInvalid: 2,
    primaryEstimate: {
      id: "slope",
      label: "Unstandardized slope",
      value: 1.25,
      formatted: "1.25",
    },
    metrics: [{
      id: "r-squared",
      label: "R²",
      value: 0.42,
      formatted: "0.42",
    }],
    interval: {
      label: "Slope interval",
      level: 0.95,
      lower: 0.6,
      upper: 1.9,
      method: "Student-t interval",
    },
    diagnostics: [
      {
        id: "numeric-inputs",
        severity: "pass",
        label: "Numeric inputs",
        detail: "Every non-missing value is numeric.",
      },
      {
        id: "independence-review",
        severity: "advisory",
        label: "Independence requires researcher review",
        detail: "Cerise cannot infer independence from aggregate output.",
      },
    ],
    assumptions: ["Independent observations", "Approximately linear relationship"],
    computationNotes: ["Complete pairs only"],
  };
  const resultChecksum = await sha256Checksum([result]);
  const preparationChecksum = await sha256Checksum({ prepared: true });
  const unsignedPackage = {
    packageVersion: 1 as const,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum,
    analysisPlanUpdatedAt: plan.updatedAt,
    executedAt: "2026-07-29T13:00:00.000Z",
    source: {
      preparationSchemaVersion: 1 as const,
      preparedAt: "2026-07-29T12:40:00.000Z",
      operationFingerprint: "preparation-fingerprint",
      packageChecksum: preparationChecksum,
      inputBoundary:
        "verified-phase-8-3-derived-package-completed-production-sessions-only" as const,
    },
    specifications: [specification],
    results: [result],
    methodRegistry: [{
      id: "simple-linear-regression" as const,
      label: "Simple linear regression",
      effectSize: "Unstandardized slope and R²",
      confidenceInterval: "Student-t interval for the slope",
      assumptions: ["Independent observations"],
    }],
    integrity: {
      sourcePackageChecksum: preparationChecksum,
      resultChecksum,
    },
    dataClassification: "aggregate-statistical-output-potentially-sensitive" as const,
    participantRowsIncluded: false as const,
    executionBoundary:
      "deterministic-browser-local-reviewed-registry-no-arbitrary-code-no-ai" as const,
  };
  const packageChecksum = await sha256Checksum(unsignedPackage);
  const resultsPackage: AnalysisResultsPackage = {
    ...unsignedPackage,
    integrity: { ...unsignedPackage.integrity, packageChecksum },
  };
  const preparation = {
    readiness: { status: "ready", issues: [] },
    lastRun: {
      preparedAt: unsignedPackage.source.preparedAt,
      packageChecksum: preparationChecksum,
      operationFingerprint: unsignedPackage.source.operationFingerprint,
    },
  } as unknown as DataPreparationDocument;
  const execution = {
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum,
    analysisPlanUpdatedAt: plan.updatedAt,
    specifications: [specification],
    lastRun: {
      runAt: resultsPackage.executedAt,
      sourcePackageChecksum: preparationChecksum,
      configurationFingerprint: analysisConfigurationFingerprint([specification]),
      analysisCount: 1,
      sourceRows: 42,
      blockingDiagnostics: 0,
      advisoryDiagnostics: 1,
      resultChecksum,
      packageChecksum,
    },
    readiness: { status: "ready", issues: [] },
  } as unknown as AnalysisExecutionDocument;
  return {
    release,
    plan,
    preparation,
    execution,
    resultsPackage,
    envelope: {
      exportType: "cerise-analysis-results-package",
      exportBoundary: "Aggregate statistical output may remain sensitive.",
      exportedAt: "2026-07-29T13:10:00.000Z",
      package: resultsPackage,
    },
  };
}

test("verifies the complete Phase 8.4 chain and rejects changed or row-bearing packages", async () => {
  const current = await fixture();
  const verified = await verifyAnalysisResultsPackage(
    current.envelope,
    current.release,
    current.plan,
    current.preparation,
    current.execution,
  );
  assert.equal(verified.integrity.packageChecksum, current.resultsPackage.integrity.packageChecksum);

  const changed = structuredClone(current.envelope);
  changed.package.results[0].primaryEstimate.value = 99;
  await assert.rejects(
    verifyAnalysisResultsPackage(
      changed,
      current.release,
      current.plan,
      current.preparation,
      current.execution,
    ),
    /checksum/,
  );

  const rowBearing = {
    ...current.envelope,
    package: {
      ...current.resultsPackage,
      participantRows: [{ sessionId: "participant-1" }],
    },
  };
  await assert.rejects(
    verifyAnalysisResultsPackage(
      rowBearing,
      current.release,
      current.plan,
      current.preparation,
      current.execution,
    ),
    /reviewed and exported/,
  );
});

test("requires RQ-linked meaning, diagnostics, robustness disclosure, and output approval", async () => {
  const current = await fixture();
  const created = createAnalysisInterpretationDocument(
    current.release,
    current.plan,
    current.preparation,
    current.execution,
    current.resultsPackage,
    "2026-07-29T13:20:00.000Z",
  );
  assert.ok(created);
  assert.equal(created.readiness.status, "needs-interpretation");
  const question = {
    ...created.researchQuestions[0],
    directAnswer: "Higher predictor scores were associated with higher outcome scores in this sample.",
    statisticalMeaning: "The estimated slope was 1.25 with a 95% interval from 0.60 to 1.90.",
    practicalMeaning: "A one-unit predictor difference corresponded to an estimated 1.25-unit outcome difference.",
    claim: "Predictor score was positively associated with outcome score.",
    claimStrength: "associational" as const,
    limitations: "The model is unadjusted and the interval does not establish causality.",
    robustnessStatus: "not-performed" as const,
    robustnessEvidence: "No additional sensitivity analysis was run; this remains a limitation.",
    diagnosticResponses: created.researchQuestions[0].diagnosticResponses.map((item) => ({
      ...item,
      note: "The study design and unit-of-analysis record were reviewed; Cerise cannot verify independence.",
    })),
    tableCaption: "Unadjusted regression estimate for the primary research question.",
    figureCaption: "Point estimate and 95% confidence interval for the unstandardized slope.",
    tableApproved: true,
    figureApproved: true,
    researcherConfirmed: true,
  };
  const completed = updateAnalysisInterpretation(
    created,
    {
      researchQuestions: [question],
      studyLimitations: "Small single-site sample and unadjusted analysis.",
      boundaryConditions: "Interpretation is limited to the sampled setting and measured variables.",
      noUnexpectedFindingsConfirmed: true,
    },
    current.release,
    current.plan,
    current.preparation,
    current.execution,
    "2026-07-29T13:30:00.000Z",
  );
  assert.equal(completed.readiness.status, "needs-review");
  const reviewed = markAnalysisInterpretationReviewed(
    completed,
    current.release,
    current.plan,
    current.preparation,
    current.execution,
    "2026-07-29T13:40:00.000Z",
  );
  assert.equal(reviewed.readiness.status, "needs-export");
  const exported = markAnalysisInterpretationExported(
    reviewed,
    current.release,
    current.plan,
    current.preparation,
    current.execution,
    "2026-07-29T13:50:00.000Z",
  );
  assert.equal(isAnalysisInterpretationReady(exported), true);

  const resultsRecord = await buildResultsRecordPackage({
    document: exported,
    resultsPackage: current.resultsPackage,
  });
  assert.equal(resultsRecord.participantRowsIncluded, false);
  assert.equal(resultsRecord.tables.length, 1);
  assert.equal(resultsRecord.figures.length, 1);
  assert.doesNotMatch(JSON.stringify(resultsRecord), /participant-1/);
});

test("local persistence contains interpretation and provenance but no aggregate result payload", async () => {
  const current = await fixture();
  const document = createAnalysisInterpretationDocument(
    current.release,
    current.plan,
    current.preparation,
    current.execution,
    current.resultsPackage,
  );
  assert.ok(document);
  const writes = new Map<string, string>();
  writeAnalysisInterpretationDocument(
    {
      getItem: (key) => writes.get(key) ?? null,
      setItem: (key, value) => { writes.set(key, value); },
    },
    current.release,
    current.plan,
    current.preparation,
    current.execution,
    document,
  );
  const stored = [...writes.values()][0];
  assert.ok(stored);
  assert.doesNotMatch(stored, /primaryEstimate/);
  assert.doesNotMatch(stored, /\"metrics\"/);
  assert.doesNotMatch(stored, /\"results\"/);
  assert.match(stored, /aggregate-results-only-no-participant-rows/);
});
