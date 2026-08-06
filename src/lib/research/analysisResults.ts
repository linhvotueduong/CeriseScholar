import {
  ANALYSIS_METHOD_REGISTRY,
  ANALYSIS_RESULTS_PACKAGE_VERSION,
  MAX_ANALYSIS_RESULTS_BYTES,
  MAX_ANALYSIS_SPECIFICATIONS,
  analysisConfigurationFingerprint,
  isAnalysisExecutionReady,
  type AnalysisDiagnostic,
  type AnalysisExecutionDocument,
  type AnalysisExecutionSpecification,
  type AnalysisMethodId,
  type AnalysisMethodResult,
  type AnalysisResultsPackage,
} from "./analysisExecution";
import type {
  AnalysisPlanDocument,
  AnalysisPlanResearchQuestion,
} from "./analysisPlan";
import type { DataPreparationDocument } from "./dataPreparation";
import {
  canonicalJson,
  sha256Checksum,
  verifyExperimentRelease,
  type ExperimentRelease,
} from "./experimentRelease";

export const ANALYSIS_INTERPRETATION_SCHEMA_VERSION = 1 as const;
export const RESULTS_RECORD_PACKAGE_VERSION = 1 as const;
export const RESULTS_RECORD_EXPORT_TYPE = "cerise-results-record-package" as const;
export const RESULTS_RECORD_EXPORT_BOUNDARY =
  "Aggregate results and researcher-authored interpretations may remain sensitive. Store only in an approved location." as const;
export const MAX_ANALYSIS_INTERPRETATION_BYTES = 512 * 1024;
export const MAX_RESULTS_RECORD_PACKAGE_BYTES = 12 * 1024 * 1024;
export const MAX_RESULTS_TEXT = 4_000;
export const MAX_RESULTS_SHORT_TEXT = 500;
export const MAX_RESULTS_DIAGNOSTICS = 32;
export const MAX_RESULTS_DIVERGENCES = 48;

export type ResultsClaimStrength =
  | "not-selected"
  | "descriptive"
  | "associational"
  | "comparative"
  | "predictive"
  | "causal-requires-external-justification";

export type ResultsRobustnessStatus =
  | "not-declared"
  | "not-performed"
  | "performed-outside-cerise"
  | "not-applicable-with-rationale";

export interface ResultsDiagnosticResponse {
  diagnosticId: string;
  label: string;
  severity: "advisory";
  note: string;
}

export interface ResultsQuestionRecord {
  id: string;
  researchQuestionId: string;
  researchQuestion: string;
  designation: AnalysisPlanResearchQuestion["designation"];
  linkedResultIds: string[];
  directAnswer: string;
  statisticalMeaning: string;
  practicalMeaning: string;
  claim: string;
  claimStrength: ResultsClaimStrength;
  causalJustification: string;
  limitations: string;
  robustnessStatus: ResultsRobustnessStatus;
  robustnessEvidence: string;
  unexpectedFinding: string;
  diagnosticResponses: ResultsDiagnosticResponse[];
  tableTitle: string;
  tableCaption: string;
  figureTitle: string;
  figureCaption: string;
  tableApproved: boolean;
  figureApproved: boolean;
  researcherConfirmed: boolean;
}

export interface ResultsDivergenceRecord {
  id: string;
  researchQuestionId: string;
  source: "phase-8-4-execution" | "researcher-authored";
  summary: string;
  rationale: string;
  impact: string;
  acknowledged: boolean;
}

export interface AnalysisInterpretationReadiness {
  status: "needs-interpretation" | "needs-review" | "needs-export" | "ready";
  issues: string[];
}

export interface AnalysisInterpretationDocument {
  schemaVersion: typeof ANALYSIS_INTERPRETATION_SCHEMA_VERSION;
  projectId: string;
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  contractChecksum: string;
  analysisPlanUpdatedAt: string;
  source: {
    executedAt: string;
    preparationPackageChecksum: string;
    resultChecksum: string;
    packageChecksum: string;
  };
  createdAt: string;
  updatedAt: string;
  researchQuestions: ResultsQuestionRecord[];
  studyLimitations: string;
  boundaryConditions: string;
  unexpectedFindings: string;
  noUnexpectedFindingsConfirmed: boolean;
  divergences: ResultsDivergenceRecord[];
  reviewedAt: string;
  exportedAt: string;
  readiness: AnalysisInterpretationReadiness;
  participantDataBoundary: "aggregate-results-only-no-participant-rows";
  robustnessBoundary:
    "researcher-authored-evidence-only-no-sensitivity-analysis-executed";
  scientificClaim:
    "researcher-reviewed-interpretation-not-validity-causality-or-publication-certification";
}

export interface ResultsTableRow {
  resultId: string;
  method: string;
  outcome: string;
  predictor: string;
  completeN: number;
  excludedMissingOrInvalid: number;
  estimateLabel: string;
  estimate: number;
  intervalLevel: number;
  intervalLower: number;
  intervalUpper: number;
  planAlignment: AnalysisMethodResult["planAlignment"];
}

export interface ResultsTable {
  id: string;
  researchQuestionId: string;
  title: string;
  caption: string;
  columns: Array<keyof ResultsTableRow>;
  rows: ResultsTableRow[];
}

export interface ResultsFigurePoint {
  resultId: string;
  label: string;
  estimate: number;
  lower: number;
  upper: number;
  intervalLevel: number;
}

export interface ResultsFigure {
  id: string;
  researchQuestionId: string;
  type: "confidence-interval";
  title: string;
  caption: string;
  xAxisLabel: string;
  zeroReference: true;
  points: ResultsFigurePoint[];
}

export interface ResultsRecordPackage {
  packageVersion: typeof RESULTS_RECORD_PACKAGE_VERSION;
  projectId: string;
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  contractChecksum: string;
  analysisPlanUpdatedAt: string;
  createdAt: string;
  source: {
    analysisResultsPackageChecksum: string;
    resultChecksum: string;
    preparationPackageChecksum: string;
    executedAt: string;
  };
  aggregateAnalysis: {
    specifications: AnalysisExecutionSpecification[];
    results: AnalysisMethodResult[];
    methodRegistry: AnalysisResultsPackage["methodRegistry"];
  };
  interpretation: {
    researchQuestions: ResultsQuestionRecord[];
    studyLimitations: string;
    boundaryConditions: string;
    unexpectedFindings: string;
    noUnexpectedFindingsConfirmed: boolean;
    divergences: ResultsDivergenceRecord[];
    reviewedAt: string;
  };
  tables: ResultsTable[];
  figures: ResultsFigure[];
  integrity: {
    analysisResultsPackageChecksum: string;
    interpretationChecksum: string;
    packageChecksum: string;
  };
  participantRowsIncluded: false;
  aiBoundary:
    "optional-researcher-side-ai-may-review-aggregate-output-only-and-cannot-change-results";
  robustnessBoundary:
    "records-researcher-authored-evidence-but-does-not-run-sensitivity-analysis";
  scientificClaim:
    "results-record-not-validity-causality-reproducibility-or-publication-certification";
}

export interface ResultsRecordExport {
  exportType: typeof RESULTS_RECORD_EXPORT_TYPE;
  exportBoundary: typeof RESULTS_RECORD_EXPORT_BOUNDARY;
  exportedAt: string;
  package: ResultsRecordPackage;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface BuildResultsRecordInput {
  document: AnalysisInterpretationDocument;
  resultsPackage: AnalysisResultsPackage;
  createdAt?: string;
}

const CLAIM_STRENGTHS: readonly ResultsClaimStrength[] = [
  "not-selected",
  "descriptive",
  "associational",
  "comparative",
  "predictive",
  "causal-requires-external-justification",
];
const ROBUSTNESS_STATUSES: readonly ResultsRobustnessStatus[] = [
  "not-declared",
  "not-performed",
  "performed-outside-cerise",
  "not-applicable-with-rationale",
];
const METHOD_IDS = new Set<AnalysisMethodId>(
  ANALYSIS_METHOD_REGISTRY.map((method) => method.id),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function safeJsonByteLength(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function boundedString(value: unknown, maximum = MAX_RESULTS_TEXT): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function cleanText(value: unknown, maximum = MAX_RESULTS_TEXT): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function safeChecksum(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function safeId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(value);
}

function safeVariable(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= 100
    && (/^_?[A-Za-z][A-Za-z0-9_]{0,99}$/.test(value) || value === "");
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nonNegativeInteger(value: unknown): value is number {
  return finiteNumber(value) && Number.isInteger(value) && value >= 0;
}

function safeTimestamp(value: unknown): value is string {
  return boundedString(value, 40) && !Number.isNaN(new Date(value).getTime());
}

function safeStringArray(
  value: unknown,
  maximumItems: number,
  maximumLength = MAX_RESULTS_TEXT,
): value is string[] {
  return Array.isArray(value)
    && value.length <= maximumItems
    && value.every((item) => boundedString(item, maximumLength));
}

function validateSpecification(value: unknown): value is AnalysisExecutionSpecification {
  if (!isRecord(value)) return false;
  return exactKeys(value, [
    "id",
    "researchQuestionId",
    "enabled",
    "methodId",
    "outcomeVariable",
    "predictorVariable",
    "confidenceLevel",
    "deviationRationale",
  ])
    && safeId(value.id)
    && safeId(value.researchQuestionId)
    && value.enabled === true
    && typeof value.methodId === "string"
    && METHOD_IDS.has(value.methodId as AnalysisMethodId)
    && safeVariable(value.outcomeVariable)
    && safeVariable(value.predictorVariable)
    && [0.9, 0.95, 0.99].includes(value.confidenceLevel as number)
    && boundedString(value.deviationRationale, 1_000);
}

function validateDiagnostic(value: unknown): value is AnalysisDiagnostic {
  if (!isRecord(value)) return false;
  return exactKeys(value, ["id", "severity", "label", "detail"])
    && safeId(value.id)
    && ["pass", "advisory", "blocking"].includes(String(value.severity))
    && boundedString(value.label, MAX_RESULTS_SHORT_TEXT)
    && boundedString(value.detail);
}

function validateMetric(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return exactKeys(value, ["id", "label", "value", "formatted"])
    && safeId(value.id)
    && boundedString(value.label, MAX_RESULTS_SHORT_TEXT)
    && finiteNumber(value.value)
    && boundedString(value.formatted, MAX_RESULTS_SHORT_TEXT);
}

function validateResult(
  value: unknown,
  plan: AnalysisPlanDocument,
): value is AnalysisMethodResult {
  if (!isRecord(value)) return false;
  if (!exactKeys(value, [
    "analysisId",
    "researchQuestionId",
    "researchQuestion",
    "methodId",
    "methodLabel",
    "outcomeVariable",
    "predictorVariable",
    "planAlignment",
    "completeSampleSize",
    "excludedMissingOrInvalid",
    "primaryEstimate",
    "metrics",
    "interval",
    "diagnostics",
    "assumptions",
    "computationNotes",
  ])) return false;
  const question = plan.researchQuestions.find(
    (item) => item.id === value.researchQuestionId,
  );
  if (
    !question
    || value.researchQuestion !== question.question
    || !safeId(value.analysisId)
    || !safeId(value.researchQuestionId)
    || typeof value.methodId !== "string"
    || !METHOD_IDS.has(value.methodId as AnalysisMethodId)
    || !boundedString(value.methodLabel, MAX_RESULTS_SHORT_TEXT)
    || !safeVariable(value.outcomeVariable)
    || !safeVariable(value.predictorVariable)
    || !["aligned", "deviation-recorded"].includes(String(value.planAlignment))
    || !nonNegativeInteger(value.completeSampleSize)
    || !nonNegativeInteger(value.excludedMissingOrInvalid)
    || !validateMetric(value.primaryEstimate)
    || !Array.isArray(value.metrics)
    || value.metrics.length > 24
    || !value.metrics.every(validateMetric)
    || !isRecord(value.interval)
    || !exactKeys(value.interval, ["label", "level", "lower", "upper", "method"])
    || !boundedString(value.interval.label, MAX_RESULTS_SHORT_TEXT)
    || ![0.9, 0.95, 0.99].includes(value.interval.level as number)
    || !finiteNumber(value.interval.lower)
    || !finiteNumber(value.interval.upper)
    || value.interval.lower > value.interval.upper
    || !boundedString(value.interval.method, MAX_RESULTS_SHORT_TEXT)
    || !Array.isArray(value.diagnostics)
    || value.diagnostics.length > MAX_RESULTS_DIAGNOSTICS
    || !value.diagnostics.every(validateDiagnostic)
    || value.diagnostics.some((diagnostic) => diagnostic.severity === "blocking")
    || !safeStringArray(value.assumptions, 24)
    || !safeStringArray(value.computationNotes, 24)
  ) return false;
  return true;
}

function validateMethodRegistry(value: unknown): value is AnalysisResultsPackage["methodRegistry"] {
  if (!Array.isArray(value) || value.length > ANALYSIS_METHOD_REGISTRY.length) return false;
  return value.every((candidate) => (
    isRecord(candidate)
    && exactKeys(candidate, [
      "id",
      "label",
      "effectSize",
      "confidenceInterval",
      "assumptions",
    ])
    && typeof candidate.id === "string"
    && METHOD_IDS.has(candidate.id as AnalysisMethodId)
    && boundedString(candidate.label, MAX_RESULTS_SHORT_TEXT)
    && boundedString(candidate.effectSize, MAX_RESULTS_SHORT_TEXT)
    && boundedString(candidate.confidenceInterval, MAX_RESULTS_SHORT_TEXT)
    && safeStringArray(candidate.assumptions, 24)
  ));
}

function validateResultsPackageShape(
  value: unknown,
  plan: AnalysisPlanDocument,
): value is AnalysisResultsPackage {
  if (!isRecord(value)) return false;
  if (!exactKeys(value, [
    "packageVersion",
    "projectId",
    "releaseId",
    "releaseNumber",
    "releaseChecksum",
    "contractChecksum",
    "analysisPlanUpdatedAt",
    "executedAt",
    "source",
    "specifications",
    "results",
    "methodRegistry",
    "integrity",
    "dataClassification",
    "participantRowsIncluded",
    "executionBoundary",
  ])) return false;
  if (
    value.packageVersion !== ANALYSIS_RESULTS_PACKAGE_VERSION
    || !safeId(value.projectId)
    || !safeId(value.releaseId)
    || !nonNegativeInteger(value.releaseNumber)
    || !safeChecksum(value.releaseChecksum)
    || !safeChecksum(value.contractChecksum)
    || !safeTimestamp(value.analysisPlanUpdatedAt)
    || !safeTimestamp(value.executedAt)
    || !isRecord(value.source)
    || !exactKeys(value.source, [
      "preparationSchemaVersion",
      "preparedAt",
      "operationFingerprint",
      "packageChecksum",
      "inputBoundary",
    ])
    || value.source.preparationSchemaVersion !== 1
    || !safeTimestamp(value.source.preparedAt)
    || !boundedString(value.source.operationFingerprint, 40)
    || !safeChecksum(value.source.packageChecksum)
    || value.source.inputBoundary
      !== "verified-phase-8-3-derived-package-completed-production-sessions-only"
    || !Array.isArray(value.specifications)
    || value.specifications.length === 0
    || value.specifications.length > MAX_ANALYSIS_SPECIFICATIONS
    || !value.specifications.every(validateSpecification)
    || !Array.isArray(value.results)
    || value.results.length !== value.specifications.length
    || !value.results.every((result) => validateResult(result, plan))
    || new Set(value.results.map((result) => result.analysisId)).size !== value.results.length
    || !validateMethodRegistry(value.methodRegistry)
    || !isRecord(value.integrity)
    || !exactKeys(value.integrity, [
      "sourcePackageChecksum",
      "resultChecksum",
      "packageChecksum",
    ])
    || !safeChecksum(value.integrity.sourcePackageChecksum)
    || !safeChecksum(value.integrity.resultChecksum)
    || !safeChecksum(value.integrity.packageChecksum)
    || value.dataClassification !== "aggregate-statistical-output-potentially-sensitive"
    || value.participantRowsIncluded !== false
    || value.executionBoundary
      !== "deterministic-browser-local-reviewed-registry-no-arbitrary-code-no-ai"
  ) return false;

  const specifications = value.specifications as AnalysisExecutionSpecification[];
  const results = value.results as AnalysisMethodResult[];
  return results.every((result, index) => {
    const specification = specifications[index];
    return result.analysisId === specification.id
      && result.researchQuestionId === specification.researchQuestionId
      && result.methodId === specification.methodId
      && result.outcomeVariable === specification.outcomeVariable
      && result.predictorVariable === specification.predictorVariable;
  });
}

export async function verifyAnalysisResultsPackage(
  value: unknown,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
): Promise<AnalysisResultsPackage> {
  if (
    safeJsonByteLength(value) > MAX_ANALYSIS_RESULTS_BYTES
    || !isRecord(value)
    || !exactKeys(value, ["exportType", "exportBoundary", "exportedAt", "package"])
    || value.exportType !== "cerise-analysis-results-package"
    || !boundedString(value.exportBoundary, 1_000)
    || !safeTimestamp(value.exportedAt)
    || !validateResultsPackageShape(value.package, plan)
    || !isAnalysisExecutionReady(execution)
    || !execution.lastRun
    || !preparation.lastRun
    || plan.readiness.status !== "ready"
    || preparation.readiness.status !== "ready"
  ) {
    throw new Error("Select the reviewed and exported Phase 8.4 aggregate results package.");
  }
  if (!await verifyExperimentRelease(release)) {
    throw new Error("The selected immutable release no longer passes its checksum verification.");
  }
  const candidate = value.package;
  const expectedSpecifications = execution.specifications.filter((item) => item.enabled);
  if (
    candidate.projectId !== release.projectId
    || candidate.releaseId !== release.releaseId
    || candidate.releaseNumber !== release.releaseNumber
    || candidate.releaseChecksum !== release.checksum
    || candidate.contractChecksum !== release.manifest.analysisContractChecksum
    || candidate.analysisPlanUpdatedAt !== plan.updatedAt
    || candidate.executedAt !== execution.lastRun.runAt
    || candidate.source.preparedAt !== preparation.lastRun.preparedAt
    || candidate.source.operationFingerprint !== preparation.lastRun.operationFingerprint
    || candidate.source.packageChecksum !== preparation.lastRun.packageChecksum
    || candidate.integrity.sourcePackageChecksum !== preparation.lastRun.packageChecksum
    || canonicalJson(candidate.specifications) !== canonicalJson(expectedSpecifications)
    || analysisConfigurationFingerprint(candidate.specifications)
      !== execution.lastRun.configurationFingerprint
  ) {
    throw new Error("The results package does not match the selected release, plan, preparation, and execution chain.");
  }
  const resultChecksum = await sha256Checksum(candidate.results);
  const unsignedPackage = {
    ...candidate,
    integrity: {
      sourcePackageChecksum: candidate.integrity.sourcePackageChecksum,
      resultChecksum: candidate.integrity.resultChecksum,
    },
  };
  const packageChecksum = await sha256Checksum(unsignedPackage);
  if (
    resultChecksum !== candidate.integrity.resultChecksum
    || packageChecksum !== candidate.integrity.packageChecksum
    || resultChecksum !== execution.lastRun.resultChecksum
    || packageChecksum !== execution.lastRun.packageChecksum
  ) {
    throw new Error("The aggregate result or whole-package checksum does not match.");
  }
  return candidate;
}

function advisoryDiagnostics(results: AnalysisMethodResult[]): Map<string, AnalysisDiagnostic[]> {
  const output = new Map<string, AnalysisDiagnostic[]>();
  results.forEach((result) => {
    const diagnostics = result.diagnostics.filter((item) => item.severity === "advisory");
    const existing = output.get(result.researchQuestionId) ?? [];
    diagnostics.forEach((diagnostic) => {
      if (!existing.some((item) => item.id === diagnostic.id)) existing.push(diagnostic);
    });
    output.set(result.researchQuestionId, existing);
  });
  return output;
}

function defaultQuestionRecord(
  question: AnalysisPlanResearchQuestion,
  resultsPackage: AnalysisResultsPackage,
  diagnostics: Map<string, AnalysisDiagnostic[]>,
): ResultsQuestionRecord {
  const resultIds = resultsPackage.results
    .filter((result) => result.researchQuestionId === question.id)
    .map((result) => result.analysisId);
  return {
    id: `interpretation-${question.id}`.slice(0, 120),
    researchQuestionId: question.id,
    researchQuestion: question.question,
    designation: question.designation,
    linkedResultIds: resultIds,
    directAnswer: "",
    statisticalMeaning: "",
    practicalMeaning: "",
    claim: "",
    claimStrength: "not-selected",
    causalJustification: "",
    limitations: "",
    robustnessStatus: "not-declared",
    robustnessEvidence: "",
    unexpectedFinding: "",
    diagnosticResponses: (diagnostics.get(question.id) ?? []).map((diagnostic) => ({
      diagnosticId: diagnostic.id,
      label: diagnostic.label,
      severity: "advisory",
      note: "",
    })),
    tableTitle: `${question.id}: Aggregate results`,
    tableCaption: "",
    figureTitle: `${question.id}: Estimate and confidence interval`,
    figureCaption: "",
    tableApproved: false,
    figureApproved: false,
    researcherConfirmed: false,
  };
}

function defaultDivergences(
  resultsPackage: AnalysisResultsPackage,
): ResultsDivergenceRecord[] {
  return resultsPackage.specifications.flatMap((specification) => {
    if (!specification.deviationRationale.trim()) return [];
    return [{
      id: `divergence-${specification.id}`.slice(0, 120),
      researchQuestionId: specification.researchQuestionId,
      source: "phase-8-4-execution" as const,
      summary: "The executed method or variable mapping differed from the frozen plan.",
      rationale: specification.deviationRationale,
      impact: "",
      acknowledged: false,
    }];
  });
}

function requiredQuestion(record: ResultsQuestionRecord): boolean {
  return record.designation === "primary" || record.linkedResultIds.length > 0;
}

function interpretationIssues(
  document: Pick<
    AnalysisInterpretationDocument,
    | "researchQuestions"
    | "studyLimitations"
    | "boundaryConditions"
    | "unexpectedFindings"
    | "noUnexpectedFindingsConfirmed"
    | "divergences"
  >,
): string[] {
  const issues: string[] = [];
  document.researchQuestions.forEach((record) => {
    if (record.designation === "primary" && record.linkedResultIds.length === 0) {
      issues.push(`${record.researchQuestionId}: no reviewed Phase 8.4 result is linked.`);
      return;
    }
    if (!requiredQuestion(record)) return;
    const requiredFields: ReadonlyArray<[string, string]> = [
      ["direct answer", record.directAnswer],
      ["statistical meaning", record.statisticalMeaning],
      ["practical meaning", record.practicalMeaning],
      ["claim", record.claim],
      ["limitations", record.limitations],
      ["robustness evidence note", record.robustnessEvidence],
      ["table caption", record.tableCaption],
      ["figure caption", record.figureCaption],
    ];
    requiredFields.forEach(([label, content]) => {
      if (!content.trim()) issues.push(`${record.researchQuestionId}: add the ${label}.`);
    });
    if (record.claimStrength === "not-selected") {
      issues.push(`${record.researchQuestionId}: classify the claim strength.`);
    }
    if (
      record.claimStrength === "causal-requires-external-justification"
      && !record.causalJustification.trim()
    ) {
      issues.push(`${record.researchQuestionId}: add the external causal-design justification.`);
    }
    if (record.robustnessStatus === "not-declared") {
      issues.push(`${record.researchQuestionId}: record whether robustness or sensitivity work was performed.`);
    }
    record.diagnosticResponses.forEach((diagnostic) => {
      if (!diagnostic.note.trim()) {
        issues.push(`${record.researchQuestionId}: respond to the ${diagnostic.label} advisory.`);
      }
    });
    if (!record.tableApproved) issues.push(`${record.researchQuestionId}: approve the results table.`);
    if (!record.figureApproved) issues.push(`${record.researchQuestionId}: approve the confidence-interval figure.`);
    if (!record.researcherConfirmed) {
      issues.push(`${record.researchQuestionId}: confirm the interpretation record.`);
    }
  });
  if (!document.studyLimitations.trim()) {
    issues.push("Add the study-level limitations.");
  }
  if (!document.boundaryConditions.trim()) {
    issues.push("Add the study-level boundary conditions.");
  }
  if (!document.unexpectedFindings.trim() && !document.noUnexpectedFindingsConfirmed) {
    issues.push("Record unexpected findings or explicitly confirm that none were identified.");
  }
  document.divergences.forEach((divergence) => {
    if (!divergence.summary.trim()) {
      issues.push(`${divergence.researchQuestionId}: summarize the plan divergence.`);
    }
    if (!divergence.rationale.trim()) {
      issues.push(`${divergence.researchQuestionId}: record the rationale for the plan divergence.`);
    }
    if (!divergence.impact.trim()) {
      issues.push(`${divergence.researchQuestionId}: record the impact of the plan divergence.`);
    }
    if (!divergence.acknowledged) {
      issues.push(`${divergence.researchQuestionId}: acknowledge the plan divergence.`);
    }
  });
  return issues;
}

export function collectAnalysisInterpretationReadiness(
  document: Pick<
    AnalysisInterpretationDocument,
    | "researchQuestions"
    | "studyLimitations"
    | "boundaryConditions"
    | "unexpectedFindings"
    | "noUnexpectedFindingsConfirmed"
    | "divergences"
    | "reviewedAt"
    | "exportedAt"
  >,
): AnalysisInterpretationReadiness {
  const issues = interpretationIssues(document);
  if (issues.length > 0) return { status: "needs-interpretation", issues };
  if (!document.reviewedAt) {
    return {
      status: "needs-review",
      issues: ["Confirm the complete interpretation, limitations, outputs, and divergence record."],
    };
  }
  if (!document.exportedAt) {
    return {
      status: "needs-export",
      issues: ["Export the aggregate Results Record before continuing."],
    };
  }
  return { status: "ready", issues: [] };
}

export function createAnalysisInterpretationDocument(
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  resultsPackage: AnalysisResultsPackage,
  createdAt = new Date().toISOString(),
): AnalysisInterpretationDocument | null {
  if (
    !execution.lastRun
    || !preparation.lastRun
    || !isAnalysisExecutionReady(execution)
    || resultsPackage.integrity.packageChecksum !== execution.lastRun.packageChecksum
    || resultsPackage.integrity.resultChecksum !== execution.lastRun.resultChecksum
  ) return null;
  const base = {
    schemaVersion: ANALYSIS_INTERPRETATION_SCHEMA_VERSION,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum: release.manifest.analysisContractChecksum ?? "",
    analysisPlanUpdatedAt: plan.updatedAt,
    source: {
      executedAt: resultsPackage.executedAt,
      preparationPackageChecksum: preparation.lastRun.packageChecksum,
      resultChecksum: resultsPackage.integrity.resultChecksum,
      packageChecksum: resultsPackage.integrity.packageChecksum,
    },
    createdAt,
    updatedAt: createdAt,
    researchQuestions: plan.researchQuestions.map((question) => defaultQuestionRecord(
      question,
      resultsPackage,
      advisoryDiagnostics(resultsPackage.results),
    )),
    studyLimitations: "",
    boundaryConditions: "",
    unexpectedFindings: "",
    noUnexpectedFindingsConfirmed: false,
    divergences: defaultDivergences(resultsPackage),
    reviewedAt: "",
    exportedAt: "",
    participantDataBoundary: "aggregate-results-only-no-participant-rows" as const,
    robustnessBoundary:
      "researcher-authored-evidence-only-no-sensitivity-analysis-executed" as const,
    scientificClaim:
      "researcher-reviewed-interpretation-not-validity-causality-or-publication-certification" as const,
  };
  return {
    ...base,
    readiness: collectAnalysisInterpretationReadiness(base),
  };
}

function normalizeDiagnosticResponse(value: unknown): ResultsDiagnosticResponse | null {
  if (
    !isRecord(value)
    || !exactKeys(value, ["diagnosticId", "label", "severity", "note"])
    || !safeId(value.diagnosticId)
    || !boundedString(value.label, MAX_RESULTS_SHORT_TEXT)
    || value.severity !== "advisory"
    || !boundedString(value.note)
  ) return null;
  return {
    diagnosticId: value.diagnosticId,
    label: cleanText(value.label, MAX_RESULTS_SHORT_TEXT),
    severity: "advisory",
    note: cleanText(value.note),
  };
}

function normalizeQuestionRecord(
  value: unknown,
  planQuestion: AnalysisPlanResearchQuestion,
): ResultsQuestionRecord | null {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "id",
      "researchQuestionId",
      "researchQuestion",
      "designation",
      "linkedResultIds",
      "directAnswer",
      "statisticalMeaning",
      "practicalMeaning",
      "claim",
      "claimStrength",
      "causalJustification",
      "limitations",
      "robustnessStatus",
      "robustnessEvidence",
      "unexpectedFinding",
      "diagnosticResponses",
      "tableTitle",
      "tableCaption",
      "figureTitle",
      "figureCaption",
      "tableApproved",
      "figureApproved",
      "researcherConfirmed",
    ])
    || !safeId(value.id)
    || value.researchQuestionId !== planQuestion.id
    || value.researchQuestion !== planQuestion.question
    || value.designation !== planQuestion.designation
    || !Array.isArray(value.linkedResultIds)
    || value.linkedResultIds.length > MAX_ANALYSIS_SPECIFICATIONS
    || !value.linkedResultIds.every(safeId)
    || new Set(value.linkedResultIds).size !== value.linkedResultIds.length
    || ![
      value.directAnswer,
      value.statisticalMeaning,
      value.practicalMeaning,
      value.claim,
      value.causalJustification,
      value.limitations,
      value.robustnessEvidence,
      value.unexpectedFinding,
      value.tableCaption,
      value.figureCaption,
    ].every((item) => boundedString(item))
    || !boundedString(value.tableTitle, MAX_RESULTS_SHORT_TEXT)
    || !boundedString(value.figureTitle, MAX_RESULTS_SHORT_TEXT)
    || !CLAIM_STRENGTHS.includes(value.claimStrength as ResultsClaimStrength)
    || !ROBUSTNESS_STATUSES.includes(value.robustnessStatus as ResultsRobustnessStatus)
    || !Array.isArray(value.diagnosticResponses)
    || value.diagnosticResponses.length > MAX_RESULTS_DIAGNOSTICS
    || ![value.tableApproved, value.figureApproved, value.researcherConfirmed]
      .every((item) => typeof item === "boolean")
  ) return null;
  const diagnosticResponses = value.diagnosticResponses.map(normalizeDiagnosticResponse);
  if (
    diagnosticResponses.some((item) => !item)
    || new Set(diagnosticResponses.map((item) => item?.diagnosticId)).size
      !== diagnosticResponses.length
  ) return null;
  return {
    id: value.id,
    researchQuestionId: planQuestion.id,
    researchQuestion: planQuestion.question,
    designation: planQuestion.designation,
    linkedResultIds: value.linkedResultIds as string[],
    directAnswer: cleanText(value.directAnswer),
    statisticalMeaning: cleanText(value.statisticalMeaning),
    practicalMeaning: cleanText(value.practicalMeaning),
    claim: cleanText(value.claim),
    claimStrength: value.claimStrength as ResultsClaimStrength,
    causalJustification: cleanText(value.causalJustification),
    limitations: cleanText(value.limitations),
    robustnessStatus: value.robustnessStatus as ResultsRobustnessStatus,
    robustnessEvidence: cleanText(value.robustnessEvidence),
    unexpectedFinding: cleanText(value.unexpectedFinding),
    diagnosticResponses: diagnosticResponses as ResultsDiagnosticResponse[],
    tableTitle: cleanText(value.tableTitle, MAX_RESULTS_SHORT_TEXT),
    tableCaption: cleanText(value.tableCaption),
    figureTitle: cleanText(value.figureTitle, MAX_RESULTS_SHORT_TEXT),
    figureCaption: cleanText(value.figureCaption),
    tableApproved: value.tableApproved as boolean,
    figureApproved: value.figureApproved as boolean,
    researcherConfirmed: value.researcherConfirmed as boolean,
  };
}

function normalizeDivergence(value: unknown): ResultsDivergenceRecord | null {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "id",
      "researchQuestionId",
      "source",
      "summary",
      "rationale",
      "impact",
      "acknowledged",
    ])
    || !safeId(value.id)
    || !safeId(value.researchQuestionId)
    || !["phase-8-4-execution", "researcher-authored"].includes(String(value.source))
    || !boundedString(value.summary)
    || !boundedString(value.rationale)
    || !boundedString(value.impact)
    || typeof value.acknowledged !== "boolean"
  ) return null;
  return {
    id: value.id,
    researchQuestionId: value.researchQuestionId,
    source: value.source as ResultsDivergenceRecord["source"],
    summary: cleanText(value.summary),
    rationale: cleanText(value.rationale),
    impact: cleanText(value.impact),
    acknowledged: value.acknowledged,
  };
}

export function normalizeAnalysisInterpretationDocument(
  value: unknown,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
): AnalysisInterpretationDocument | null {
  if (
    !execution.lastRun
    || !preparation.lastRun
    || !isRecord(value)
    || !exactKeys(value, [
      "schemaVersion",
      "projectId",
      "releaseId",
      "releaseNumber",
      "releaseChecksum",
      "contractChecksum",
      "analysisPlanUpdatedAt",
      "source",
      "createdAt",
      "updatedAt",
      "researchQuestions",
      "studyLimitations",
      "boundaryConditions",
      "unexpectedFindings",
      "noUnexpectedFindingsConfirmed",
      "divergences",
      "reviewedAt",
      "exportedAt",
      "readiness",
      "participantDataBoundary",
      "robustnessBoundary",
      "scientificClaim",
    ])
    || value.schemaVersion !== ANALYSIS_INTERPRETATION_SCHEMA_VERSION
    || value.projectId !== release.projectId
    || value.releaseId !== release.releaseId
    || value.releaseNumber !== release.releaseNumber
    || value.releaseChecksum !== release.checksum
    || value.contractChecksum !== release.manifest.analysisContractChecksum
    || value.analysisPlanUpdatedAt !== plan.updatedAt
    || !isRecord(value.source)
    || !exactKeys(value.source, [
      "executedAt",
      "preparationPackageChecksum",
      "resultChecksum",
      "packageChecksum",
    ])
    || value.source.executedAt !== execution.lastRun.runAt
    || value.source.preparationPackageChecksum !== preparation.lastRun.packageChecksum
    || value.source.resultChecksum !== execution.lastRun.resultChecksum
    || value.source.packageChecksum !== execution.lastRun.packageChecksum
    || !boundedString(value.createdAt, 40)
    || !boundedString(value.updatedAt, 40)
    || !boundedString(value.reviewedAt, 40)
    || !boundedString(value.exportedAt, 40)
    || !Array.isArray(value.researchQuestions)
    || value.researchQuestions.length !== plan.researchQuestions.length
    || !boundedString(value.studyLimitations)
    || !boundedString(value.boundaryConditions)
    || !boundedString(value.unexpectedFindings)
    || typeof value.noUnexpectedFindingsConfirmed !== "boolean"
    || !Array.isArray(value.divergences)
    || value.divergences.length > MAX_RESULTS_DIVERGENCES
    || value.participantDataBoundary !== "aggregate-results-only-no-participant-rows"
    || value.robustnessBoundary
      !== "researcher-authored-evidence-only-no-sensitivity-analysis-executed"
    || value.scientificClaim
      !== "researcher-reviewed-interpretation-not-validity-causality-or-publication-certification"
  ) return null;
  const questions = value.researchQuestions.map((candidate, index) => (
    normalizeQuestionRecord(candidate, plan.researchQuestions[index])
  ));
  const divergences = value.divergences.map(normalizeDivergence);
  const expectedLinks = new Map(
    plan.researchQuestions.map((question) => [
      question.id,
      execution.specifications
        .filter((specification) => (
          specification.enabled && specification.researchQuestionId === question.id
        ))
        .map((specification) => specification.id),
    ]),
  );
  if (
    questions.some((item) => !item)
    || divergences.some((item) => !item)
    || new Set(divergences.map((item) => item?.id)).size !== divergences.length
    || (questions as ResultsQuestionRecord[]).some((item) => (
      canonicalJson(item.linkedResultIds)
        !== canonicalJson(expectedLinks.get(item.researchQuestionId) ?? [])
    ))
    || (questions as ResultsQuestionRecord[]).reduce(
      (total, item) => total + item.diagnosticResponses.length,
      0,
    ) !== execution.lastRun.advisoryDiagnostics
    || (divergences as ResultsDivergenceRecord[]).some((item) => (
      !plan.researchQuestions.some((question) => question.id === item.researchQuestionId)
    ))
  ) return null;
  const normalizedBase = {
    schemaVersion: ANALYSIS_INTERPRETATION_SCHEMA_VERSION,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum: release.manifest.analysisContractChecksum ?? "",
    analysisPlanUpdatedAt: plan.updatedAt,
    source: {
      executedAt: value.source.executedAt,
      preparationPackageChecksum: value.source.preparationPackageChecksum,
      resultChecksum: value.source.resultChecksum,
      packageChecksum: value.source.packageChecksum,
    },
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    researchQuestions: questions as ResultsQuestionRecord[],
    studyLimitations: cleanText(value.studyLimitations),
    boundaryConditions: cleanText(value.boundaryConditions),
    unexpectedFindings: cleanText(value.unexpectedFindings),
    noUnexpectedFindingsConfirmed: value.noUnexpectedFindingsConfirmed,
    divergences: divergences as ResultsDivergenceRecord[],
    reviewedAt: value.reviewedAt,
    exportedAt: value.exportedAt,
    participantDataBoundary: "aggregate-results-only-no-participant-rows" as const,
    robustnessBoundary:
      "researcher-authored-evidence-only-no-sensitivity-analysis-executed" as const,
    scientificClaim:
      "researcher-reviewed-interpretation-not-validity-causality-or-publication-certification" as const,
  };
  const normalized: AnalysisInterpretationDocument = {
    ...normalizedBase,
    readiness: collectAnalysisInterpretationReadiness(normalizedBase),
  };
  return safeJsonByteLength(normalized) <= MAX_ANALYSIS_INTERPRETATION_BYTES
    ? normalized
    : null;
}

export function updateAnalysisInterpretation(
  document: AnalysisInterpretationDocument,
  changes: Partial<Pick<
    AnalysisInterpretationDocument,
    | "researchQuestions"
    | "studyLimitations"
    | "boundaryConditions"
    | "unexpectedFindings"
    | "noUnexpectedFindingsConfirmed"
    | "divergences"
  >>,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  updatedAt = new Date().toISOString(),
): AnalysisInterpretationDocument {
  const updated = {
    ...document,
    ...changes,
    updatedAt,
    reviewedAt: "",
    exportedAt: "",
  };
  const normalized = normalizeAnalysisInterpretationDocument(
    updated,
    release,
    plan,
    preparation,
    execution,
  );
  if (!normalized) throw new Error("The Results and Interpretation record failed validation.");
  return normalized;
}

export function markAnalysisInterpretationReviewed(
  document: AnalysisInterpretationDocument,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  reviewedAt = new Date().toISOString(),
): AnalysisInterpretationDocument {
  const normalized = normalizeAnalysisInterpretationDocument(
    document,
    release,
    plan,
    preparation,
    execution,
  );
  if (!normalized || interpretationIssues(normalized).length > 0) {
    throw new Error("Complete every required interpretation, limitation, output, and divergence decision first.");
  }
  const updated = {
    ...normalized,
    updatedAt: reviewedAt,
    reviewedAt,
    exportedAt: "",
  };
  const result = normalizeAnalysisInterpretationDocument(
    updated,
    release,
    plan,
    preparation,
    execution,
  );
  if (!result) throw new Error("The interpretation review could not be recorded.");
  return result;
}

export function markAnalysisInterpretationExported(
  document: AnalysisInterpretationDocument,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  exportedAt = new Date().toISOString(),
): AnalysisInterpretationDocument {
  const normalized = normalizeAnalysisInterpretationDocument(
    document,
    release,
    plan,
    preparation,
    execution,
  );
  if (!normalized?.reviewedAt || normalized.readiness.status !== "needs-export") {
    throw new Error("Confirm the complete Results and Interpretation review before export.");
  }
  const updated = { ...normalized, updatedAt: exportedAt, exportedAt };
  const result = normalizeAnalysisInterpretationDocument(
    updated,
    release,
    plan,
    preparation,
    execution,
  );
  if (!result) throw new Error("The Results Record export could not be recorded.");
  return result;
}

function resultRows(results: AnalysisMethodResult[]): ResultsTableRow[] {
  return results.map((result) => ({
    resultId: result.analysisId,
    method: result.methodLabel,
    outcome: result.outcomeVariable,
    predictor: result.predictorVariable,
    completeN: result.completeSampleSize,
    excludedMissingOrInvalid: result.excludedMissingOrInvalid,
    estimateLabel: result.primaryEstimate.label,
    estimate: result.primaryEstimate.value,
    intervalLevel: result.interval.level,
    intervalLower: result.interval.lower,
    intervalUpper: result.interval.upper,
    planAlignment: result.planAlignment,
  }));
}

export async function buildResultsRecordPackage(
  input: BuildResultsRecordInput,
): Promise<ResultsRecordPackage> {
  const { document, resultsPackage } = input;
  if (
    document.readiness.status !== "ready"
    || document.source.packageChecksum !== resultsPackage.integrity.packageChecksum
    || document.source.resultChecksum !== resultsPackage.integrity.resultChecksum
    || resultsPackage.participantRowsIncluded !== false
  ) {
    throw new Error("A ready interpretation and the exact verified aggregate results package are required.");
  }
  const tables = document.researchQuestions.flatMap((record): ResultsTable[] => {
    if (!requiredQuestion(record)) return [];
    const results = resultsPackage.results.filter(
      (result) => record.linkedResultIds.includes(result.analysisId),
    );
    return [{
      id: `table-${record.researchQuestionId}`,
      researchQuestionId: record.researchQuestionId,
      title: record.tableTitle,
      caption: record.tableCaption,
      columns: [
        "resultId",
        "method",
        "outcome",
        "predictor",
        "completeN",
        "excludedMissingOrInvalid",
        "estimateLabel",
        "estimate",
        "intervalLevel",
        "intervalLower",
        "intervalUpper",
        "planAlignment",
      ],
      rows: resultRows(results),
    }];
  });
  const figures = document.researchQuestions.flatMap((record): ResultsFigure[] => {
    if (!requiredQuestion(record)) return [];
    const results = resultsPackage.results.filter(
      (result) => record.linkedResultIds.includes(result.analysisId),
    );
    return [{
      id: `figure-${record.researchQuestionId}`,
      researchQuestionId: record.researchQuestionId,
      type: "confidence-interval",
      title: record.figureTitle,
      caption: record.figureCaption,
      xAxisLabel: "Estimate with confidence interval",
      zeroReference: true,
      points: results.map((result) => ({
        resultId: result.analysisId,
        label: `${result.methodLabel}: ${result.primaryEstimate.label}`,
        estimate: result.primaryEstimate.value,
        lower: result.interval.lower,
        upper: result.interval.upper,
        intervalLevel: result.interval.level,
      })),
    }];
  });
  const interpretation = {
    researchQuestions: document.researchQuestions,
    studyLimitations: document.studyLimitations,
    boundaryConditions: document.boundaryConditions,
    unexpectedFindings: document.unexpectedFindings,
    noUnexpectedFindingsConfirmed: document.noUnexpectedFindingsConfirmed,
    divergences: document.divergences,
    reviewedAt: document.reviewedAt,
  };
  const interpretationChecksum = await sha256Checksum(interpretation);
  const createdAt = input.createdAt ?? document.exportedAt;
  const unsigned = {
    packageVersion: RESULTS_RECORD_PACKAGE_VERSION,
    projectId: document.projectId,
    releaseId: document.releaseId,
    releaseNumber: document.releaseNumber,
    releaseChecksum: document.releaseChecksum,
    contractChecksum: document.contractChecksum,
    analysisPlanUpdatedAt: document.analysisPlanUpdatedAt,
    createdAt,
    source: {
      analysisResultsPackageChecksum: resultsPackage.integrity.packageChecksum,
      resultChecksum: resultsPackage.integrity.resultChecksum,
      preparationPackageChecksum: resultsPackage.integrity.sourcePackageChecksum,
      executedAt: resultsPackage.executedAt,
    },
    aggregateAnalysis: {
      specifications: resultsPackage.specifications,
      results: resultsPackage.results,
      methodRegistry: resultsPackage.methodRegistry,
    },
    interpretation,
    tables,
    figures,
    integrity: {
      analysisResultsPackageChecksum: resultsPackage.integrity.packageChecksum,
      interpretationChecksum,
    },
    participantRowsIncluded: false as const,
    aiBoundary:
      "optional-researcher-side-ai-may-review-aggregate-output-only-and-cannot-change-results" as const,
    robustnessBoundary:
      "records-researcher-authored-evidence-but-does-not-run-sensitivity-analysis" as const,
    scientificClaim:
      "results-record-not-validity-causality-reproducibility-or-publication-certification" as const,
  };
  const packageChecksum = await sha256Checksum(unsigned);
  const record: ResultsRecordPackage = {
    ...unsigned,
    integrity: { ...unsigned.integrity, packageChecksum },
  };
  if (safeJsonByteLength(record) > MAX_RESULTS_RECORD_PACKAGE_BYTES) {
    throw new Error("The aggregate Results Record exceeds the Phase 8.5 size limit.");
  }
  return record;
}

export async function verifyResultsRecordExport(
  value: unknown,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  document: AnalysisInterpretationDocument,
): Promise<ResultsRecordExport> {
  if (
    safeJsonByteLength(value) > MAX_RESULTS_RECORD_PACKAGE_BYTES
    || !isRecord(value)
    || !exactKeys(value, ["exportType", "exportBoundary", "exportedAt", "package"])
    || value.exportType !== RESULTS_RECORD_EXPORT_TYPE
    || value.exportBoundary !== RESULTS_RECORD_EXPORT_BOUNDARY
    || !safeTimestamp(value.exportedAt)
    || !isRecord(value.package)
    || !isAnalysisExecutionReady(execution)
    || !isAnalysisInterpretationReady(document)
    || plan.readiness.status !== "ready"
    || preparation.readiness.status !== "ready"
    || !execution.lastRun
    || !preparation.lastRun
  ) {
    throw new Error("Select the reviewed and exported Phase 8.5 Results Record.");
  }
  if (!await verifyExperimentRelease(release)) {
    throw new Error("The selected immutable release no longer passes checksum verification.");
  }

  const candidate = value.package;
  if (
    candidate.packageVersion !== RESULTS_RECORD_PACKAGE_VERSION
    || candidate.projectId !== release.projectId
    || candidate.releaseId !== release.releaseId
    || candidate.releaseNumber !== release.releaseNumber
    || candidate.releaseChecksum !== release.checksum
    || candidate.contractChecksum !== release.manifest.analysisContractChecksum
    || candidate.analysisPlanUpdatedAt !== plan.updatedAt
    || candidate.createdAt !== value.exportedAt
    || value.exportedAt !== document.exportedAt
    || !isRecord(candidate.source)
    || !isRecord(candidate.aggregateAnalysis)
    || !Array.isArray(candidate.aggregateAnalysis.specifications)
    || candidate.aggregateAnalysis.specifications.length === 0
    || candidate.aggregateAnalysis.specifications.length > MAX_ANALYSIS_SPECIFICATIONS
    || !candidate.aggregateAnalysis.specifications.every(validateSpecification)
    || !Array.isArray(candidate.aggregateAnalysis.results)
    || candidate.aggregateAnalysis.results.length
      !== candidate.aggregateAnalysis.specifications.length
    || !candidate.aggregateAnalysis.results.every((result) => validateResult(result, plan))
    || !validateMethodRegistry(candidate.aggregateAnalysis.methodRegistry)
    || candidate.participantRowsIncluded !== false
  ) {
    throw new Error("The Results Record shape or frozen identity is invalid.");
  }

  const expectedSpecifications = execution.specifications.filter((item) => item.enabled);
  const expectedMethodRegistry = [
    ...new Set(candidate.aggregateAnalysis.results.map((result) => result.methodId)),
  ].map((methodId) => {
    const method = ANALYSIS_METHOD_REGISTRY.find((item) => item.id === methodId);
    if (!method) throw new Error("The Results Record contains an unknown analysis method.");
    return {
      id: method.id,
      label: method.label,
      effectSize: method.effectSize,
      confidenceInterval: method.confidenceInterval,
      assumptions: [...method.assumptions],
    };
  });
  const resultChecksum = await sha256Checksum(candidate.aggregateAnalysis.results);
  if (
    canonicalJson(candidate.aggregateAnalysis.specifications)
      !== canonicalJson(expectedSpecifications)
    || canonicalJson(candidate.aggregateAnalysis.methodRegistry)
      !== canonicalJson(expectedMethodRegistry)
    || candidate.source.analysisResultsPackageChecksum
      !== execution.lastRun.packageChecksum
    || candidate.source.analysisResultsPackageChecksum
      !== document.source.packageChecksum
    || candidate.source.resultChecksum !== execution.lastRun.resultChecksum
    || candidate.source.resultChecksum !== document.source.resultChecksum
    || candidate.source.resultChecksum !== resultChecksum
    || candidate.source.preparationPackageChecksum
      !== preparation.lastRun.packageChecksum
    || candidate.source.executedAt !== execution.lastRun.runAt
  ) {
    throw new Error("The Results Record does not match the reviewed Phase 8 provenance chain.");
  }

  const embeddedResults: AnalysisResultsPackage = {
    packageVersion: ANALYSIS_RESULTS_PACKAGE_VERSION,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum: plan.contractChecksum,
    analysisPlanUpdatedAt: plan.updatedAt,
    executedAt: execution.lastRun.runAt,
    source: {
      preparationSchemaVersion: preparation.schemaVersion,
      preparedAt: preparation.lastRun.preparedAt,
      operationFingerprint: preparation.lastRun.operationFingerprint,
      packageChecksum: preparation.lastRun.packageChecksum,
      inputBoundary:
        "verified-phase-8-3-derived-package-completed-production-sessions-only",
    },
    specifications: candidate.aggregateAnalysis.specifications,
    results: candidate.aggregateAnalysis.results,
    methodRegistry: candidate.aggregateAnalysis.methodRegistry,
    integrity: {
      sourcePackageChecksum: preparation.lastRun.packageChecksum,
      resultChecksum,
      packageChecksum: execution.lastRun.packageChecksum,
    },
    dataClassification: "aggregate-statistical-output-potentially-sensitive",
    participantRowsIncluded: false,
    executionBoundary:
      "deterministic-browser-local-reviewed-registry-no-arbitrary-code-no-ai",
  };
  const expected = await buildResultsRecordPackage({
    document,
    resultsPackage: embeddedResults,
    createdAt: value.exportedAt,
  });
  if (canonicalJson(candidate) !== canonicalJson(expected)) {
    throw new Error("The Results Record contents or integrity checksums have changed.");
  }
  return value as unknown as ResultsRecordExport;
}

export function analysisInterpretationStorageKey(
  projectId: string,
  releaseId: string,
): string {
  return `cerise-analysis-interpretation:${projectId}:${releaseId}:v${ANALYSIS_INTERPRETATION_SCHEMA_VERSION}`;
}

export function readAnalysisInterpretationDocument(
  storage: StorageLike,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
): AnalysisInterpretationDocument | null {
  const stored = storage.getItem(
    analysisInterpretationStorageKey(release.projectId, release.releaseId),
  );
  if (!stored || new TextEncoder().encode(stored).byteLength > MAX_ANALYSIS_INTERPRETATION_BYTES) {
    return null;
  }
  try {
    return normalizeAnalysisInterpretationDocument(
      JSON.parse(stored),
      release,
      plan,
      preparation,
      execution,
    );
  } catch {
    return null;
  }
}

export function writeAnalysisInterpretationDocument(
  storage: StorageLike,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  document: AnalysisInterpretationDocument,
): AnalysisInterpretationDocument {
  const normalized = normalizeAnalysisInterpretationDocument(
    document,
    release,
    plan,
    preparation,
    execution,
  );
  if (!normalized) throw new Error("The Results and Interpretation record was not saved.");
  storage.setItem(
    analysisInterpretationStorageKey(release.projectId, release.releaseId),
    JSON.stringify(normalized),
  );
  return normalized;
}

export function isAnalysisInterpretationReady(
  document: AnalysisInterpretationDocument | null,
): boolean {
  return Boolean(document && document.readiness.status === "ready");
}

export function resultIntervalDomain(results: AnalysisMethodResult[]): {
  minimum: number;
  maximum: number;
} {
  let minimum = 0;
  let maximum = 0;
  results.forEach((result) => {
    minimum = Math.min(minimum, result.interval.lower, result.primaryEstimate.value);
    maximum = Math.max(maximum, result.interval.upper, result.primaryEstimate.value);
  });
  if (minimum === maximum) return { minimum: minimum - 1, maximum: maximum + 1 };
  const padding = (maximum - minimum) * 0.08;
  return { minimum: minimum - padding, maximum: maximum + padding };
}
