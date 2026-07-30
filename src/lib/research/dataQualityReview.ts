import type { AnalysisPlanDocument, AnalysisPlanVariable } from "./analysisPlan";
import {
  MAX_ANALYSIS_COLUMNS,
  MAX_DERIVED_PACKAGE_BYTES,
  verifyPreparedAnalysisPackage,
} from "./analysisExecution";
import {
  DATA_PREPARATION_SCHEMA_VERSION,
  PREPARATION_META_COLUMNS,
  type DataPreparationDocument,
  type DataPreparationPackage,
  type PreparationValue,
  type PreparedResponseRow,
  type PreparedTrialRow,
} from "./dataPreparation";
import {
  canonicalJson,
  sha256Checksum,
  type ExperimentRelease,
} from "./experimentRelease";

export const DATA_QUALITY_REVIEW_SCHEMA_VERSION = 1 as const;
export const DATA_QUALITY_RECORD_PACKAGE_VERSION = 1 as const;
export const DATA_QUALITY_ENGINE_VERSION = "cerise-data-quality-review-v1" as const;
export const MAX_DATA_QUALITY_DOCUMENT_BYTES = 512 * 1024;
export const MAX_DATA_QUALITY_EXPORT_BYTES = 8 * 1024 * 1024;
export const MAX_DATA_QUALITY_TEXT = 1_000;
export const MAX_DATA_QUALITY_DECISION_NOTE = 500;
export const MAX_DATA_QUALITY_FINDINGS = MAX_ANALYSIS_COLUMNS + 10;

export type DataQualityFindingSeverity = "review" | "information";
export type DataQualityFindingCategory =
  | "preparation"
  | "completeness"
  | "type-consistency"
  | "distribution"
  | "conditions"
  | "trials"
  | "inclusion"
  | "behavioral";
export type DataQualityDisposition =
  | "not-reviewed"
  | "accepted-as-described"
  | "addressed-in-preparation"
  | "requires-sensitivity-review"
  | "not-applicable";

export interface DataQualityNumericSummary {
  count: number;
  minimum: number;
  firstQuartile: number;
  median: number;
  thirdQuartile: number;
  maximum: number;
  mean: number;
  sampleStandardDeviation: number | null;
}

export interface DataQualityVariableProfile {
  name: string;
  source: "frozen" | "derived";
  responseType: string;
  roles: string[];
  required: boolean;
  totalCount: number;
  observedCount: number;
  missingCount: number;
  missingRate: number;
  numericCount: number;
  textCount: number;
  booleanCount: number;
  distinctCount: number;
  singletonCount: number;
  largestLevelCount: number;
  numericSummary: DataQualityNumericSummary | null;
}

export interface DataQualityMetric {
  id: string;
  label: string;
  value: number;
  denominator: number | null;
}

export interface DataQualityFinding {
  id: string;
  severity: DataQualityFindingSeverity;
  category: DataQualityFindingCategory;
  scope: "dataset" | "variable" | "trials";
  variableName: string;
  title: string;
  detail: string;
  metrics: DataQualityMetric[];
}

export interface DataQualityConditionCount {
  id: string;
  name: string;
  count: number;
}

export interface DataQualityInclusionRuleCount {
  operationId: string;
  excludedRows: number;
}

export interface DataQualityDatasetSummary {
  responseRows: number;
  responseVariables: number;
  totalMissingCells: number;
  completeRows: number;
  incompleteRows: number;
  duplicateResponsePatternRows: number;
  conditionCounts: DataQualityConditionCount[];
  unexpectedOrMissingConditionRows: number;
  trialRows: number;
  practiceTrialRows: number;
  productionTrialRows: number;
  missingTrialResponses: number;
  correctKnownTrialRows: number;
  correctTrialRows: number;
  incorrectTrialRows: number;
  deadlineExceededTrialRows: number;
  invalidReactionTimeRows: number;
  duplicateTrialKeyRows: number;
  reactionTimeSummary: DataQualityNumericSummary | null;
  inclusionLedger: {
    completedRows: number;
    includedRows: number;
    excludedRows: number;
    exclusionRuleCounts: DataQualityInclusionRuleCount[];
  };
  behavioral: {
    sessionsProfiled: number;
    attentionChecksExpected: number;
    attentionChecksObserved: number;
    attentionChecksCorrect: number;
    attentionChecksIncorrect: number;
    attentionChecksMissing: number;
    sessionsWithAttentionReviewCue: number;
    focusLossEvents: number;
    sessionsWithFocusLoss: number;
    productionTrials: number;
    scoredProductionTrials: number;
    correctProductionTrials: number;
    incorrectProductionTrials: number;
    scoredAccuracyRate: number | null;
    deadlineExceededProductionTrials: number;
    sessionsWithDeadlineExceeded: number;
    participantAccuracySummary: DataQualityNumericSummary | null;
    participantMedianReactionTimeSummary: DataQualityNumericSummary | null;
  };
  preparation: {
    sourceCompletedRows: number;
    outputRows: number;
    excludedRows: number;
    inputMissingCells: number;
    outputMissingCells: number;
    inputTrialRows: number;
    outputTrialRows: number;
  };
}

export interface DataQualityReport {
  engineVersion: typeof DATA_QUALITY_ENGINE_VERSION;
  summary: DataQualityDatasetSummary;
  variables: DataQualityVariableProfile[];
  findings: DataQualityFinding[];
}

export interface DataQualityFindingReview {
  findingId: string;
  disposition: DataQualityDisposition;
  note: string;
  acknowledged: boolean;
}

export interface DataQualityRunReceipt {
  runAt: string;
  preparedPackageChecksum: string;
  engineVersion: typeof DATA_QUALITY_ENGINE_VERSION;
  responseRows: number;
  trialRows: number;
  variableCount: number;
  findingCount: number;
  findingIds: string[];
  reportChecksum: string;
}

export interface DataQualityReadiness {
  status:
    | "needs-source"
    | "needs-assessment"
    | "needs-review"
    | "needs-export"
    | "ready";
  issues: string[];
}

export interface DataQualityReviewDocument {
  schemaVersion: typeof DATA_QUALITY_REVIEW_SCHEMA_VERSION;
  projectId: string;
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  contractChecksum: string;
  analysisPlanUpdatedAt: string;
  preparation: {
    schemaVersion: typeof DATA_PREPARATION_SCHEMA_VERSION;
    preparedAt: string;
    packageChecksum: string;
    operationFingerprint: string;
  };
  createdAt: string;
  updatedAt: string;
  lastRun: DataQualityRunReceipt | null;
  reviews: DataQualityFindingReview[];
  overallConclusion: string;
  remainingLimitations: string;
  reviewedAt: string;
  exportedAt: string;
  lastExportChecksum: string;
  readiness: DataQualityReadiness;
  participantDataRetention: "memory-only-never-persisted-or-uploaded";
  scientificClaim:
    "bounded-descriptive-quality-review-not-automatic-cleaning-inference-or-validity-certification";
}

export interface DataQualityRecordPackage {
  packageVersion: typeof DATA_QUALITY_RECORD_PACKAGE_VERSION;
  projectId: string;
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  contractChecksum: string;
  analysisPlanUpdatedAt: string;
  reviewedAt: string;
  exportedAt: string;
  source: {
    preparationSchemaVersion: typeof DATA_PREPARATION_SCHEMA_VERSION;
    preparedAt: string;
    operationFingerprint: string;
    preparedPackageChecksum: string;
    inputBoundary:
      "verified-phase-8-3-derived-package-completed-production-sessions-only";
  };
  report: DataQualityReport;
  reviews: DataQualityFindingReview[];
  overallConclusion: string;
  remainingLimitations: string;
  boundaries: {
    participantRowsIncluded: false;
    participantLevelValuesIncluded: false;
    automaticExclusionsApplied: false;
    automaticCorrectionsApplied: false;
    inferentialStatisticsIncluded: false;
    aiProcessingUsed: false;
  };
  integrity: {
    preparedPackageChecksum: string;
    reportChecksum: string;
    packageChecksum: string;
  };
  dataClassification: "aggregate-quality-output-potentially-sensitive";
}

export interface DataQualityRecordExport {
  exportType: "cerise-data-quality-record-package";
  exportBoundary:
    "aggregate-only-reviewed-quality-record-no-participant-rows-values-or-automatic-decisions";
  exportedAt: string;
  package: DataQualityRecordPackage;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DISPOSITIONS: readonly DataQualityDisposition[] = [
  "not-reviewed",
  "accepted-as-described",
  "addressed-in-preparation",
  "requires-sensitivity-review",
  "not-applicable",
];

const META_COLUMN_SET = new Set<string>(PREPARATION_META_COLUMNS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeJsonByteLength(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function safeTimestamp(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 40
    && !Number.isNaN(Date.parse(value));
}

function safeChecksum(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function boundedText(value: unknown, maximum = MAX_DATA_QUALITY_TEXT): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function cleanText(value: unknown, maximum = MAX_DATA_QUALITY_TEXT): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function safeFindingId(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 180
    && /^[A-Za-z0-9:_-]+$/.test(value);
}

function isMissing(value: PreparationValue | undefined): boolean {
  return value === null
    || value === undefined
    || (typeof value === "string" && value.trim() === "");
}

function round(value: number, precision = 6): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function quantile(sorted: number[], probability: number): number {
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const fraction = position - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction;
}

function numericSummary(values: number[]): DataQualityNumericSummary | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sampleStandardDeviation = values.length > 1
    ? Math.sqrt(
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1),
    )
    : null;
  return {
    count: values.length,
    minimum: round(sorted[0]),
    firstQuartile: round(quantile(sorted, 0.25)),
    median: round(quantile(sorted, 0.5)),
    thirdQuartile: round(quantile(sorted, 0.75)),
    maximum: round(sorted[sorted.length - 1]),
    mean: round(mean),
    sampleStandardDeviation: sampleStandardDeviation === null
      ? null
      : round(sampleStandardDeviation),
  };
}

function valueKey(value: PreparationValue): string {
  return `${typeof value}:${canonicalJson(value)}`;
}

function profileVariable(
  rows: PreparedResponseRow[],
  name: string,
  planVariable: AnalysisPlanVariable | undefined,
): DataQualityVariableProfile {
  const values = rows
    .map((row) => row[name])
    .filter((value): value is PreparationValue => !isMissing(value));
  const levelCounts = new Map<string, number>();
  const numbers: number[] = [];
  let textCount = 0;
  let booleanCount = 0;
  for (const value of values) {
    levelCounts.set(valueKey(value), (levelCounts.get(valueKey(value)) ?? 0) + 1);
    if (typeof value === "number" && Number.isFinite(value)) numbers.push(value);
    else if (typeof value === "string") textCount += 1;
    else if (typeof value === "boolean") booleanCount += 1;
  }
  const counts = [...levelCounts.values()];
  const missingCount = rows.length - values.length;
  return {
    name,
    source: planVariable ? "frozen" : "derived",
    responseType: planVariable?.responseType ?? "derived",
    roles: planVariable?.roles ?? [],
    required: planVariable?.required ?? false,
    totalCount: rows.length,
    observedCount: values.length,
    missingCount,
    missingRate: rows.length === 0 ? 0 : round(missingCount / rows.length),
    numericCount: numbers.length,
    textCount,
    booleanCount,
    distinctCount: levelCounts.size,
    singletonCount: counts.filter((count) => count === 1).length,
    largestLevelCount: counts.length === 0 ? 0 : Math.max(...counts),
    numericSummary: numbers.length === values.length ? numericSummary(numbers) : null,
  };
}

function metric(
  id: string,
  label: string,
  value: number,
  denominator: number | null = null,
): DataQualityMetric {
  return { id, label, value, denominator };
}

function profileFinding(profile: DataQualityVariableProfile): DataQualityFinding | null {
  const signals: string[] = [];
  const metrics: DataQualityMetric[] = [];
  const observedKinds = [
    profile.numericCount > 0,
    profile.textCount > 0,
    profile.booleanCount > 0,
  ].filter(Boolean).length;
  const analysisRole = profile.roles.some((role) => (
    role === "outcome"
    || role === "predictor"
    || role === "covariate"
    || role === "group"
  ));
  let severity: DataQualityFindingSeverity = "information";

  if (profile.observedCount === 0) {
    signals.push("No observed values remain in the derived dataset.");
    metrics.push(metric("missing", "Missing rows", profile.missingCount, profile.totalCount));
    severity = "review";
  } else {
    if (profile.missingCount > 0) {
      signals.push("Missing values remain and require interpretation under the recorded plan.");
      metrics.push(metric("missing", "Missing rows", profile.missingCount, profile.totalCount));
      if (profile.required || analysisRole) severity = "review";
    }
    if (observedKinds > 1) {
      signals.push("Observed values use more than one scalar type.");
      metrics.push(
        metric("numeric", "Numeric values", profile.numericCount, profile.observedCount),
        metric("text", "Text values", profile.textCount, profile.observedCount),
        metric("boolean", "Boolean values", profile.booleanCount, profile.observedCount),
      );
      severity = "review";
    }
    if (profile.observedCount > 1 && profile.distinctCount === 1) {
      signals.push("All observed values are identical, so this variable has no observed variation.");
      metrics.push(metric("distinct", "Distinct observed values", 1, profile.observedCount));
      severity = "review";
    } else if (profile.singletonCount > 0 && profile.textCount + profile.booleanCount > 0) {
      signals.push("At least one observed categorical or text level occurs once.");
      metrics.push(metric(
        "singleton-levels",
        "Single-occurrence levels",
        profile.singletonCount,
        profile.distinctCount,
      ));
    }
  }

  if (signals.length === 0) return null;
  return {
    id: `variable:${profile.name}`,
    severity,
    category: observedKinds > 1
      ? "type-consistency"
      : profile.missingCount > 0 || profile.observedCount === 0
        ? "completeness"
        : "distribution",
    scope: "variable",
    variableName: profile.name,
    title: `${profile.name} requires a descriptive decision`,
    detail: signals.join(" "),
    metrics: metrics.slice(0, 8),
  };
}

function responsePatternDuplicates(rows: PreparedResponseRow[], columns: string[]): number {
  if (columns.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = canonicalJson(columns.map((column) => row[column] ?? null));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
}

function duplicateTrialKeys(trials: PreparedTrialRow[]): number {
  const counts = new Map<string, number>();
  for (const trial of trials) {
    const key = canonicalJson([
      trial._cerise_session_id,
      trial.table_id,
      trial.loop_block_id,
      trial.trial_id,
      trial.repetition,
      trial.order_index,
    ]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
}

function preparationFinding(summary: DataQualityDatasetSummary): DataQualityFinding {
  return {
    id: "dataset:preparation-bridge",
    severity: summary.preparation.excludedRows > 0 ? "review" : "information",
    category: "preparation",
    scope: "dataset",
    variableName: "",
    title: "Review the preparation-to-quality handoff",
    detail: summary.preparation.excludedRows > 0
      ? "The derived package contains explicit record exclusions. Confirm that this quality review describes the resulting analysis population and that the recorded rationales remain appropriate."
      : "The derived package did not exclude completed production records. Confirm that the recorded transformations and remaining quality characteristics describe the intended analysis population.",
    metrics: [
      metric(
        "output-rows",
        "Derived response rows",
        summary.preparation.outputRows,
        summary.preparation.sourceCompletedRows,
      ),
      metric(
        "excluded-rows",
        "Explicitly excluded rows",
        summary.preparation.excludedRows,
        summary.preparation.sourceCompletedRows,
      ),
      metric(
        "output-missing",
        "Missing cells after preparation",
        summary.preparation.outputMissingCells,
        null,
      ),
    ],
  };
}

function datasetFinding(summary: DataQualityDatasetSummary): DataQualityFinding {
  const hasReviewCue = summary.duplicateResponsePatternRows > 0
    || summary.incompleteRows > 0
    || summary.unexpectedOrMissingConditionRows > 0;
  return {
    id: "dataset:coverage",
    severity: hasReviewCue ? "review" : "information",
    category: "completeness",
    scope: "dataset",
    variableName: "",
    title: "Review dataset coverage and response-pattern duplication",
    detail: hasReviewCue
      ? "The aggregate dataset profile contains incomplete rows, repeated response patterns, or condition identifiers outside the frozen condition list. These are review cues, not automatic exclusion rules."
      : "All derived rows are complete across the profiled variables, no repeated response pattern was detected, and condition identifiers match the frozen list.",
    metrics: [
      metric("complete-rows", "Complete rows", summary.completeRows, summary.responseRows),
      metric("incomplete-rows", "Incomplete rows", summary.incompleteRows, summary.responseRows),
      metric(
        "duplicate-pattern-rows",
        "Rows beyond first matching pattern",
        summary.duplicateResponsePatternRows,
        summary.responseRows,
      ),
      metric(
        "unexpected-conditions",
        "Unexpected or missing condition rows",
        summary.unexpectedOrMissingConditionRows,
        summary.responseRows,
      ),
    ],
  };
}

function conditionFinding(summary: DataQualityDatasetSummary): DataQualityFinding | null {
  if (summary.conditionCounts.length < 2) return null;
  return {
    id: "dataset:condition-allocation",
    severity: summary.unexpectedOrMissingConditionRows > 0 ? "review" : "information",
    category: "conditions",
    scope: "dataset",
    variableName: "",
    title: "Interpret observed condition allocation against the frozen design",
    detail: "Condition counts are reported descriptively. Cerise does not apply an imbalance threshold or decide whether allocation differences affect the planned analysis.",
    metrics: summary.conditionCounts.slice(0, 8).map((condition) => metric(
      `condition-${condition.id}`,
      condition.name,
      condition.count,
      summary.responseRows,
    )),
  };
}

function trialFinding(summary: DataQualityDatasetSummary): DataQualityFinding | null {
  if (summary.trialRows === 0) return null;
  const hasReviewCue = summary.missingTrialResponses > 0
    || summary.invalidReactionTimeRows > 0
    || summary.duplicateTrialKeyRows > 0;
  return {
    id: "trials:coverage",
    severity: hasReviewCue ? "review" : "information",
    category: "trials",
    scope: "trials",
    variableName: "",
    title: "Review trial coverage, timing, and scoring completeness",
    detail: "Trial summaries are aggregate browser-recorded observations. They do not certify physical onset timing, justify exclusions, or replace a trial-level analysis plan.",
    metrics: [
      metric("production", "Production trial rows", summary.productionTrialRows, summary.trialRows),
      metric("practice", "Practice trial rows", summary.practiceTrialRows, summary.trialRows),
      metric("missing-response", "Missing trial responses", summary.missingTrialResponses, summary.trialRows),
      metric("deadline-exceeded", "Deadline-exceeded rows", summary.deadlineExceededTrialRows, summary.trialRows),
      metric("invalid-rt", "Non-positive reaction times", summary.invalidReactionTimeRows, summary.trialRows),
      metric("duplicate-key", "Rows beyond first matching trial key", summary.duplicateTrialKeyRows, summary.trialRows),
    ],
  };
}

function inclusionFinding(summary: DataQualityDatasetSummary): DataQualityFinding | null {
  if (summary.inclusionLedger.completedRows === 0) return null;
  return {
    id: "dataset:inclusion-ledger",
    severity: summary.inclusionLedger.excludedRows > 0 ? "review" : "information",
    category: "inclusion",
    scope: "dataset",
    variableName: "",
    title: "Review the participant inclusion ledger",
    detail: summary.inclusionLedger.excludedRows > 0
      ? "The checksummed ledger links every completed production session to its final inclusion state and recorded exclusion operation IDs. Counts are shown here without participant identifiers; confirm each rule against its recorded rationale."
      : "The checksummed ledger records every completed production session as included. Counts are shown here without participant identifiers, and no exclusion decision was invented by the quality engine.",
    metrics: [
      metric(
        "completed",
        "Completed production sessions",
        summary.inclusionLedger.completedRows,
        null,
      ),
      metric(
        "included",
        "Included sessions",
        summary.inclusionLedger.includedRows,
        summary.inclusionLedger.completedRows,
      ),
      metric(
        "excluded",
        "Excluded sessions",
        summary.inclusionLedger.excludedRows,
        summary.inclusionLedger.completedRows,
      ),
      ...summary.inclusionLedger.exclusionRuleCounts.slice(0, 5).map((item) => metric(
        `rule-${item.operationId}`,
        `Excluded by ${item.operationId}`,
        item.excludedRows,
        summary.inclusionLedger.completedRows,
      )),
    ],
  };
}

function behavioralFinding(summary: DataQualityDatasetSummary): DataQualityFinding | null {
  const behavioral = summary.behavioral;
  if (behavioral.sessionsProfiled === 0) return null;
  const hasReviewCue = behavioral.attentionChecksIncorrect > 0
    || behavioral.attentionChecksMissing > 0
    || behavioral.sessionsWithFocusLoss > 0
    || behavioral.sessionsWithDeadlineExceeded > 0;
  return {
    id: "dataset:behavioral-checks",
    severity: hasReviewCue ? "review" : "information",
    category: "behavioral",
    scope: "dataset",
    variableName: "",
    title: "Review behavioral checks and participant-level performance summaries",
    detail: "Attention-check, focus-loss, accuracy, deadline, and RT summaries are descriptive review cues for the included analysis population. Cerise does not turn them into automatic exclusions or validity judgments.",
    metrics: [
      metric(
        "attention-incorrect",
        "Incorrect attention checks",
        behavioral.attentionChecksIncorrect,
        behavioral.attentionChecksExpected,
      ),
      metric(
        "attention-missing",
        "Missing attention checks",
        behavioral.attentionChecksMissing,
        behavioral.attentionChecksExpected,
      ),
      metric(
        "focus-loss-sessions",
        "Sessions with focus-loss events",
        behavioral.sessionsWithFocusLoss,
        behavioral.sessionsProfiled,
      ),
      metric(
        "deadline-sessions",
        "Sessions with deadline-exceeded trials",
        behavioral.sessionsWithDeadlineExceeded,
        behavioral.sessionsProfiled,
      ),
      metric(
        "correct-trials",
        "Correct scored production trials",
        behavioral.correctProductionTrials,
        behavioral.scoredProductionTrials,
      ),
    ],
  };
}

export function buildDataQualityReport(
  preparedPackage: DataPreparationPackage,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
): DataQualityReport {
  if (!preparation.lastRun) {
    throw new Error("The reviewed Phase 8.3 run receipt is required.");
  }
  const analysisColumns = preparedPackage.responseColumns
    .filter((column) => !META_COLUMN_SET.has(column))
    .slice(0, MAX_ANALYSIS_COLUMNS);
  const planVariables = new Map(plan.variables.map((variable) => [variable.name, variable]));
  const variables = analysisColumns.map((name) => profileVariable(
    preparedPackage.responses,
    name,
    planVariables.get(name),
  ));
  const totalMissingCells = variables.reduce((sum, profile) => sum + profile.missingCount, 0);
  const incompleteRows = preparedPackage.responses.filter((row) => (
    analysisColumns.some((column) => isMissing(row[column]))
  )).length;
  const knownConditions = new Map(release.studio.conditions.map((condition) => [
    condition.id,
    condition,
  ]));
  const conditionCounts = release.studio.conditions.map((condition) => ({
    id: condition.id,
    name: condition.name,
    count: preparedPackage.responses.filter((row) => (
      row._cerise_condition_id === condition.id
    )).length,
  }));
  const unexpectedOrMissingConditionRows = preparedPackage.responses.filter((row) => (
    typeof row._cerise_condition_id !== "string"
    || !knownConditions.has(row._cerise_condition_id)
  )).length;
  const validReactionTimes = preparedPackage.trials
    .map((trial) => trial.reaction_time_ms)
    .filter((value): value is number => (
      typeof value === "number" && Number.isFinite(value) && value > 0
    ));
  const inclusionLedgerRows = preparedPackage.inclusionLedger?.rows ?? [];
  const exclusionRuleCounts = new Map<string, number>();
  for (const row of inclusionLedgerRows) {
    for (const operationId of row.exclusion_operation_ids) {
      exclusionRuleCounts.set(operationId, (exclusionRuleCounts.get(operationId) ?? 0) + 1);
    }
  }
  const behavioralRows = (preparedPackage.behavioralSummary?.rows ?? [])
    .filter((row) => row.included);
  const participantAccuracies = behavioralRows
    .filter((row) => row.scored_production_trials > 0)
    .map((row) => row.correct_production_trials / row.scored_production_trials);
  const participantMedianReactionTimes = behavioralRows
    .map((row) => row.median_reaction_time_ms)
    .filter((value): value is number => (
      typeof value === "number" && Number.isFinite(value)
    ));
  const scoredProductionTrials = behavioralRows.reduce(
    (sum, row) => sum + row.scored_production_trials,
    0,
  );
  const correctProductionTrials = behavioralRows.reduce(
    (sum, row) => sum + row.correct_production_trials,
    0,
  );
  const attentionChecksExpected = behavioralRows.reduce(
    (sum, row) => sum + row.attention_checks_expected,
    0,
  );
  const attentionChecksObserved = behavioralRows.reduce(
    (sum, row) => sum + row.attention_checks_observed,
    0,
  );
  const summary: DataQualityDatasetSummary = {
    responseRows: preparedPackage.responses.length,
    responseVariables: variables.length,
    totalMissingCells,
    completeRows: preparedPackage.responses.length - incompleteRows,
    incompleteRows,
    duplicateResponsePatternRows: responsePatternDuplicates(
      preparedPackage.responses,
      analysisColumns,
    ),
    conditionCounts,
    unexpectedOrMissingConditionRows,
    trialRows: preparedPackage.trials.length,
    practiceTrialRows: preparedPackage.trials.filter((trial) => trial.practice).length,
    productionTrialRows: preparedPackage.trials.filter((trial) => !trial.practice).length,
    missingTrialResponses: preparedPackage.trials.filter((trial) => (
      isMissing(trial.response)
    )).length,
    correctKnownTrialRows: preparedPackage.trials.filter((trial) => (
      trial.correct !== null
    )).length,
    correctTrialRows: preparedPackage.trials.filter((trial) => trial.correct === true).length,
    incorrectTrialRows: preparedPackage.trials.filter((trial) => trial.correct === false).length,
    deadlineExceededTrialRows: preparedPackage.trials.filter((trial) => (
      trial.deadline_exceeded === true
    )).length,
    invalidReactionTimeRows: preparedPackage.trials.filter((trial) => (
      typeof trial.reaction_time_ms === "number"
      && Number.isFinite(trial.reaction_time_ms)
      && trial.reaction_time_ms <= 0
    )).length,
    duplicateTrialKeyRows: duplicateTrialKeys(preparedPackage.trials),
    reactionTimeSummary: numericSummary(validReactionTimes),
    inclusionLedger: {
      completedRows: inclusionLedgerRows.length || preparation.lastRun.sourceCompletedRows,
      includedRows: inclusionLedgerRows.filter((row) => row.included).length
        || preparation.lastRun.outputRows,
      excludedRows: inclusionLedgerRows.filter((row) => !row.included).length
        || preparation.lastRun.excludedRows,
      exclusionRuleCounts: [...exclusionRuleCounts.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([operationId, excludedRows]) => ({ operationId, excludedRows })),
    },
    behavioral: {
      sessionsProfiled: behavioralRows.length,
      attentionChecksExpected,
      attentionChecksObserved,
      attentionChecksCorrect: behavioralRows.reduce(
        (sum, row) => sum + row.attention_checks_correct,
        0,
      ),
      attentionChecksIncorrect: behavioralRows.reduce(
        (sum, row) => sum + row.attention_checks_incorrect,
        0,
      ),
      attentionChecksMissing: attentionChecksExpected - attentionChecksObserved,
      sessionsWithAttentionReviewCue: behavioralRows.filter((row) => (
        row.attention_checks_incorrect > 0
        || row.attention_checks_observed < row.attention_checks_expected
      )).length,
      focusLossEvents: behavioralRows.reduce((sum, row) => sum + row.focus_loss_events, 0),
      sessionsWithFocusLoss: behavioralRows.filter((row) => row.focus_loss_events > 0).length,
      productionTrials: behavioralRows.reduce((sum, row) => sum + row.production_trials, 0),
      scoredProductionTrials,
      correctProductionTrials,
      incorrectProductionTrials: behavioralRows.reduce(
        (sum, row) => sum + row.incorrect_production_trials,
        0,
      ),
      scoredAccuracyRate: scoredProductionTrials === 0
        ? null
        : round(correctProductionTrials / scoredProductionTrials),
      deadlineExceededProductionTrials: behavioralRows.reduce(
        (sum, row) => sum + row.deadline_exceeded_production_trials,
        0,
      ),
      sessionsWithDeadlineExceeded: behavioralRows.filter((row) => (
        row.deadline_exceeded_production_trials > 0
      )).length,
      participantAccuracySummary: numericSummary(participantAccuracies),
      participantMedianReactionTimeSummary: numericSummary(participantMedianReactionTimes),
    },
    preparation: {
      sourceCompletedRows: preparation.lastRun.sourceCompletedRows,
      outputRows: preparation.lastRun.outputRows,
      excludedRows: preparation.lastRun.excludedRows,
      inputMissingCells: preparation.lastRun.inputMissingCells,
      outputMissingCells: preparation.lastRun.outputMissingCells,
      inputTrialRows: preparation.lastRun.inputTrialRows,
      outputTrialRows: preparation.lastRun.outputTrialRows,
    },
  };
  const conditionReview = conditionFinding(summary);
  const trialReview = trialFinding(summary);
  const inclusionReview = inclusionFinding(summary);
  const behavioralReview = behavioralFinding(summary);
  const findings = [
    preparationFinding(summary),
    datasetFinding(summary),
    ...(inclusionReview ? [inclusionReview] : []),
    ...(behavioralReview ? [behavioralReview] : []),
    ...variables.map(profileFinding).filter((finding): finding is DataQualityFinding => (
      finding !== null
    )),
    ...(conditionReview ? [conditionReview] : []),
    ...(trialReview ? [trialReview] : []),
  ].slice(0, MAX_DATA_QUALITY_FINDINGS);
  return {
    engineVersion: DATA_QUALITY_ENGINE_VERSION,
    summary,
    variables,
    findings,
  };
}

function defaultReviews(findingIds: string[]): DataQualityFindingReview[] {
  return findingIds.map((findingId) => ({
    findingId,
    disposition: "not-reviewed",
    note: "",
    acknowledged: false,
  }));
}

function sourceMatches(
  document: DataQualityReviewDocument,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
): boolean {
  return Boolean(
    preparation.lastRun
    && document.projectId === release.projectId
    && document.releaseId === release.releaseId
    && document.releaseNumber === release.releaseNumber
    && document.releaseChecksum === release.checksum
    && document.contractChecksum === release.manifest.analysisContractChecksum
    && document.analysisPlanUpdatedAt === plan.updatedAt
    && document.preparation.schemaVersion === DATA_PREPARATION_SCHEMA_VERSION
    && document.preparation.preparedAt === preparation.lastRun.preparedAt
    && document.preparation.packageChecksum === preparation.lastRun.packageChecksum
    && document.preparation.operationFingerprint === preparation.lastRun.operationFingerprint
  );
}

function qualityReadiness(
  lastRun: DataQualityRunReceipt | null,
  reviews: DataQualityFindingReview[],
  overallConclusion: string,
  remainingLimitations: string,
  reviewedAt: string,
  exportedAt: string,
  lastExportChecksum: string,
): DataQualityReadiness {
  if (!lastRun) {
    return {
      status: "needs-source",
      issues: ["Select and verify the exact Phase 8.3 derived-data package."],
    };
  }
  const reviewIds = new Set(reviews.map((review) => review.findingId));
  const completeReviews = lastRun.findingIds.every((findingId) => {
    const review = reviews.find((candidate) => candidate.findingId === findingId);
    return Boolean(
      review
      && review.disposition !== "not-reviewed"
      && review.note
      && review.acknowledged,
    );
  });
  if (
    reviews.length !== lastRun.findingIds.length
    || reviewIds.size !== lastRun.findingIds.length
    || !completeReviews
    || !overallConclusion
    || !remainingLimitations
  ) {
    return {
      status: "needs-assessment",
      issues: [
        "Classify, explain, and acknowledge every aggregate finding.",
        "Record the overall quality conclusion and remaining limitations.",
      ],
    };
  }
  if (!reviewedAt) {
    return {
      status: "needs-review",
      issues: ["Confirm the complete data-quality and descriptive review."],
    };
  }
  if (!exportedAt || !lastExportChecksum) {
    return {
      status: "needs-export",
      issues: ["Export and independently verify the aggregate quality record."],
    };
  }
  return { status: "ready", issues: [] };
}

export function createDataQualityReviewDocument(
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  createdAt = new Date().toISOString(),
): DataQualityReviewDocument | null {
  if (
    !safeTimestamp(createdAt)
    || plan.readiness.status !== "ready"
    || preparation.readiness.status !== "ready"
    || !preparation.lastRun
    || release.projectId !== plan.projectId
    || release.projectId !== preparation.projectId
  ) return null;
  return {
    schemaVersion: DATA_QUALITY_REVIEW_SCHEMA_VERSION,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum: release.manifest.analysisContractChecksum ?? "",
    analysisPlanUpdatedAt: plan.updatedAt,
    preparation: {
      schemaVersion: DATA_PREPARATION_SCHEMA_VERSION,
      preparedAt: preparation.lastRun.preparedAt,
      packageChecksum: preparation.lastRun.packageChecksum,
      operationFingerprint: preparation.lastRun.operationFingerprint,
    },
    createdAt,
    updatedAt: createdAt,
    lastRun: null,
    reviews: [],
    overallConclusion: "",
    remainingLimitations: "",
    reviewedAt: "",
    exportedAt: "",
    lastExportChecksum: "",
    readiness: qualityReadiness(null, [], "", "", "", "", ""),
    participantDataRetention: "memory-only-never-persisted-or-uploaded",
    scientificClaim:
      "bounded-descriptive-quality-review-not-automatic-cleaning-inference-or-validity-certification",
  };
}

function normalizeRun(value: unknown): DataQualityRunReceipt | null {
  if (!isRecord(value)) return null;
  if (
    !safeTimestamp(value.runAt)
    || !safeChecksum(value.preparedPackageChecksum)
    || value.engineVersion !== DATA_QUALITY_ENGINE_VERSION
    || !Number.isInteger(value.responseRows)
    || Number(value.responseRows) < 0
    || !Number.isInteger(value.trialRows)
    || Number(value.trialRows) < 0
    || !Number.isInteger(value.variableCount)
    || Number(value.variableCount) < 0
    || Number(value.variableCount) > MAX_ANALYSIS_COLUMNS
    || !Number.isInteger(value.findingCount)
    || Number(value.findingCount) < 0
    || Number(value.findingCount) > MAX_DATA_QUALITY_FINDINGS
    || !Array.isArray(value.findingIds)
    || value.findingIds.length !== value.findingCount
    || !value.findingIds.every(safeFindingId)
    || new Set(value.findingIds).size !== value.findingIds.length
    || !safeChecksum(value.reportChecksum)
  ) return null;
  return {
    runAt: value.runAt as string,
    preparedPackageChecksum: value.preparedPackageChecksum as string,
    engineVersion: DATA_QUALITY_ENGINE_VERSION,
    responseRows: value.responseRows as number,
    trialRows: value.trialRows as number,
    variableCount: value.variableCount as number,
    findingCount: value.findingCount as number,
    findingIds: [...value.findingIds] as string[],
    reportChecksum: value.reportChecksum as string,
  };
}

function normalizeReviews(
  value: unknown,
  findingIds: string[],
): DataQualityFindingReview[] | null {
  if (!Array.isArray(value) || value.length !== findingIds.length) return null;
  const byId = new Map<string, DataQualityFindingReview>();
  for (const candidate of value) {
    if (
      !isRecord(candidate)
      || !safeFindingId(candidate.findingId)
      || !findingIds.includes(candidate.findingId)
      || !DISPOSITIONS.includes(candidate.disposition as DataQualityDisposition)
      || !boundedText(candidate.note, MAX_DATA_QUALITY_DECISION_NOTE)
      || typeof candidate.acknowledged !== "boolean"
      || byId.has(candidate.findingId)
    ) return null;
    byId.set(candidate.findingId, {
      findingId: candidate.findingId,
      disposition: candidate.disposition as DataQualityDisposition,
      note: cleanText(candidate.note, MAX_DATA_QUALITY_DECISION_NOTE),
      acknowledged: candidate.acknowledged,
    });
  }
  return findingIds.map((findingId) => byId.get(findingId) as DataQualityFindingReview);
}

export function normalizeDataQualityReviewDocument(
  value: unknown,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
): DataQualityReviewDocument | null {
  if (
    !isRecord(value)
    || value.schemaVersion !== DATA_QUALITY_REVIEW_SCHEMA_VERSION
    || !isRecord(value.preparation)
    || !safeTimestamp(value.createdAt)
    || !safeTimestamp(value.updatedAt)
    || !boundedText(value.overallConclusion)
    || !boundedText(value.remainingLimitations)
    || (value.reviewedAt !== "" && !safeTimestamp(value.reviewedAt))
    || (value.exportedAt !== "" && !safeTimestamp(value.exportedAt))
    || (value.lastExportChecksum !== "" && !safeChecksum(value.lastExportChecksum))
    || value.participantDataRetention !== "memory-only-never-persisted-or-uploaded"
    || value.scientificClaim
      !== "bounded-descriptive-quality-review-not-automatic-cleaning-inference-or-validity-certification"
    || safeJsonByteLength(value) > MAX_DATA_QUALITY_DOCUMENT_BYTES
  ) return null;
  const provisional = value as unknown as DataQualityReviewDocument;
  if (!sourceMatches(provisional, release, plan, preparation)) return null;
  const lastRun = value.lastRun === null ? null : normalizeRun(value.lastRun);
  if (value.lastRun !== null && !lastRun) return null;
  if (
    lastRun
    && lastRun.preparedPackageChecksum !== provisional.preparation.packageChecksum
  ) return null;
  const reviews = normalizeReviews(value.reviews, lastRun?.findingIds ?? []);
  if (!reviews) return null;
  const normalized: DataQualityReviewDocument = {
    schemaVersion: DATA_QUALITY_REVIEW_SCHEMA_VERSION,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum: release.manifest.analysisContractChecksum ?? "",
    analysisPlanUpdatedAt: plan.updatedAt,
    preparation: {
      schemaVersion: DATA_PREPARATION_SCHEMA_VERSION,
      preparedAt: preparation.lastRun?.preparedAt ?? "",
      packageChecksum: preparation.lastRun?.packageChecksum ?? "",
      operationFingerprint: preparation.lastRun?.operationFingerprint ?? "",
    },
    createdAt: value.createdAt as string,
    updatedAt: value.updatedAt as string,
    lastRun,
    reviews,
    overallConclusion: cleanText(value.overallConclusion),
    remainingLimitations: cleanText(value.remainingLimitations),
    reviewedAt: value.reviewedAt as string,
    exportedAt: value.exportedAt as string,
    lastExportChecksum: value.lastExportChecksum as string,
    readiness: qualityReadiness(
      lastRun,
      reviews,
      cleanText(value.overallConclusion),
      cleanText(value.remainingLimitations),
      String(value.reviewedAt),
      String(value.exportedAt),
      String(value.lastExportChecksum),
    ),
    participantDataRetention: "memory-only-never-persisted-or-uploaded",
    scientificClaim:
      "bounded-descriptive-quality-review-not-automatic-cleaning-inference-or-validity-certification",
  };
  return safeJsonByteLength(normalized) <= MAX_DATA_QUALITY_DOCUMENT_BYTES
    ? normalized
    : null;
}

export async function runDataQualityReview(
  document: DataQualityReviewDocument,
  preparedExport: unknown,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  runAt = new Date().toISOString(),
): Promise<{
  document: DataQualityReviewDocument;
  preparedPackage: DataPreparationPackage;
  report: DataQualityReport;
}> {
  if (!safeTimestamp(runAt)) throw new Error("The quality-review timestamp is invalid.");
  const normalized = normalizeDataQualityReviewDocument(
    document,
    release,
    plan,
    preparation,
  );
  if (!normalized) throw new Error("The data-quality review document is invalid.");
  const preparedPackage = await verifyPreparedAnalysisPackage(
    preparedExport,
    release,
    plan,
    preparation,
  );
  const report = buildDataQualityReport(preparedPackage, release, plan, preparation);
  const reportChecksum = await sha256Checksum(report);
  const findingIds = report.findings.map((finding) => finding.id);
  const updated: DataQualityReviewDocument = {
    ...normalized,
    updatedAt: runAt,
    lastRun: {
      runAt,
      preparedPackageChecksum: preparedPackage.integrity.packageChecksum,
      engineVersion: DATA_QUALITY_ENGINE_VERSION,
      responseRows: report.summary.responseRows,
      trialRows: report.summary.trialRows,
      variableCount: report.variables.length,
      findingCount: report.findings.length,
      findingIds,
      reportChecksum,
    },
    reviews: defaultReviews(findingIds),
    reviewedAt: "",
    exportedAt: "",
    lastExportChecksum: "",
  };
  const next = normalizeDataQualityReviewDocument(
    updated,
    release,
    plan,
    preparation,
  );
  if (!next) throw new Error("The aggregate quality run receipt failed validation.");
  return { document: next, preparedPackage, report };
}

export function updateDataQualityAssessment(
  document: DataQualityReviewDocument,
  changes: {
    reviews?: DataQualityFindingReview[];
    overallConclusion?: string;
    remainingLimitations?: string;
  },
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  updatedAt = new Date().toISOString(),
): DataQualityReviewDocument {
  if (!safeTimestamp(updatedAt)) throw new Error("The assessment timestamp is invalid.");
  const normalized = normalizeDataQualityReviewDocument(
    document,
    release,
    plan,
    preparation,
  );
  if (!normalized?.lastRun) {
    throw new Error("Run the aggregate quality checks before recording decisions.");
  }
  const updated = {
    ...normalized,
    updatedAt,
    reviews: changes.reviews ?? normalized.reviews,
    overallConclusion: changes.overallConclusion ?? normalized.overallConclusion,
    remainingLimitations: changes.remainingLimitations ?? normalized.remainingLimitations,
    reviewedAt: "",
    exportedAt: "",
    lastExportChecksum: "",
  };
  const next = normalizeDataQualityReviewDocument(
    updated,
    release,
    plan,
    preparation,
  );
  if (!next) throw new Error("The data-quality assessment failed validation.");
  return next;
}

export function markDataQualityReviewed(
  document: DataQualityReviewDocument,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  reviewedAt = new Date().toISOString(),
): DataQualityReviewDocument {
  if (!safeTimestamp(reviewedAt)) throw new Error("The review timestamp is invalid.");
  const normalized = normalizeDataQualityReviewDocument(
    document,
    release,
    plan,
    preparation,
  );
  if (!normalized || normalized.readiness.status !== "needs-review") {
    throw new Error("Complete and acknowledge every finding and the study-level assessment first.");
  }
  const next = normalizeDataQualityReviewDocument(
    {
      ...normalized,
      updatedAt: reviewedAt,
      reviewedAt,
      exportedAt: "",
      lastExportChecksum: "",
    },
    release,
    plan,
    preparation,
  );
  if (!next) throw new Error("The complete quality review could not be confirmed.");
  return next;
}

async function createRecordPackage(
  document: DataQualityReviewDocument,
  report: DataQualityReport,
  exportedAt: string,
): Promise<DataQualityRecordPackage> {
  if (!document.lastRun || !document.reviewedAt) {
    throw new Error("Confirm the complete quality review before export.");
  }
  const reportChecksum = await sha256Checksum(report);
  if (reportChecksum !== document.lastRun.reportChecksum) {
    throw new Error("The aggregate report no longer matches the reviewed run.");
  }
  const unsigned = {
    packageVersion: DATA_QUALITY_RECORD_PACKAGE_VERSION,
    projectId: document.projectId,
    releaseId: document.releaseId,
    releaseNumber: document.releaseNumber,
    releaseChecksum: document.releaseChecksum,
    contractChecksum: document.contractChecksum,
    analysisPlanUpdatedAt: document.analysisPlanUpdatedAt,
    reviewedAt: document.reviewedAt,
    exportedAt,
    source: {
      preparationSchemaVersion: DATA_PREPARATION_SCHEMA_VERSION,
      preparedAt: document.preparation.preparedAt,
      operationFingerprint: document.preparation.operationFingerprint,
      preparedPackageChecksum: document.preparation.packageChecksum,
      inputBoundary:
        "verified-phase-8-3-derived-package-completed-production-sessions-only" as const,
    },
    report,
    reviews: document.reviews,
    overallConclusion: document.overallConclusion,
    remainingLimitations: document.remainingLimitations,
    boundaries: {
      participantRowsIncluded: false as const,
      participantLevelValuesIncluded: false as const,
      automaticExclusionsApplied: false as const,
      automaticCorrectionsApplied: false as const,
      inferentialStatisticsIncluded: false as const,
      aiProcessingUsed: false as const,
    },
    integrity: {
      preparedPackageChecksum: document.preparation.packageChecksum,
      reportChecksum,
    },
    dataClassification: "aggregate-quality-output-potentially-sensitive" as const,
  };
  const packageChecksum = await sha256Checksum(unsigned);
  return {
    ...unsigned,
    integrity: {
      ...unsigned.integrity,
      packageChecksum,
    },
  };
}

export async function buildDataQualityRecordExport(
  document: DataQualityReviewDocument,
  preparedPackage: DataPreparationPackage,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  exportedAt = new Date().toISOString(),
): Promise<{
  document: DataQualityReviewDocument;
  export: DataQualityRecordExport;
}> {
  if (!safeTimestamp(exportedAt)) throw new Error("The export timestamp is invalid.");
  const normalized = normalizeDataQualityReviewDocument(
    document,
    release,
    plan,
    preparation,
  );
  if (
    !normalized?.lastRun
    || normalized.readiness.status !== "needs-export"
    || preparedPackage.integrity.packageChecksum !== normalized.preparation.packageChecksum
  ) {
    throw new Error("Re-select the reviewed Phase 8.3 package and confirm the quality review first.");
  }
  const report = buildDataQualityReport(preparedPackage, release, plan, preparation);
  const packageRecord = await createRecordPackage(normalized, report, exportedAt);
  const next = normalizeDataQualityReviewDocument(
    {
      ...normalized,
      updatedAt: exportedAt,
      exportedAt,
      lastExportChecksum: packageRecord.integrity.packageChecksum,
    },
    release,
    plan,
    preparation,
  );
  if (!next) throw new Error("The verified export receipt could not be stored.");
  return {
    document: next,
    export: {
      exportType: "cerise-data-quality-record-package",
      exportBoundary:
        "aggregate-only-reviewed-quality-record-no-participant-rows-values-or-automatic-decisions",
      exportedAt,
      package: packageRecord,
    },
  };
}

export async function verifyDataQualityRecordExport(
  value: unknown,
  preparedExport: unknown,
  localDocument: DataQualityReviewDocument,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
): Promise<DataQualityRecordPackage> {
  if (
    safeJsonByteLength(value) > MAX_DATA_QUALITY_EXPORT_BYTES
    || !isRecord(value)
    || value.exportType !== "cerise-data-quality-record-package"
    || value.exportBoundary
      !== "aggregate-only-reviewed-quality-record-no-participant-rows-values-or-automatic-decisions"
    || !safeTimestamp(value.exportedAt)
    || !isRecord(value.package)
  ) throw new Error("Select a valid aggregate Phase 8.7B quality-record export.");
  const normalized = normalizeDataQualityReviewDocument(
    localDocument,
    release,
    plan,
    preparation,
  );
  if (
    !normalized
    || normalized.readiness.status !== "ready"
    || normalized.exportedAt !== value.exportedAt
  ) throw new Error("The local quality-review receipt is not ready for this export.");
  const preparedPackage = await verifyPreparedAnalysisPackage(
    preparedExport,
    release,
    plan,
    preparation,
  );
  const report = buildDataQualityReport(preparedPackage, release, plan, preparation);
  const expected = await createRecordPackage(normalized, report, value.exportedAt);
  if (
    canonicalJson(value.package) !== canonicalJson(expected)
    || expected.integrity.packageChecksum !== normalized.lastExportChecksum
  ) throw new Error("The aggregate quality record does not match its source rows or local review.");
  return expected;
}

export function dataQualityReviewStorageKey(projectId: string, releaseId: string): string {
  return `cerise-data-quality-review:${projectId}:${releaseId}:v${DATA_QUALITY_REVIEW_SCHEMA_VERSION}`;
}

export function readDataQualityReviewDocument(
  storage: StorageLike,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
): DataQualityReviewDocument | null {
  const stored = storage.getItem(dataQualityReviewStorageKey(release.projectId, release.releaseId));
  if (!stored || new TextEncoder().encode(stored).byteLength > MAX_DATA_QUALITY_DOCUMENT_BYTES) {
    return null;
  }
  try {
    return normalizeDataQualityReviewDocument(
      JSON.parse(stored),
      release,
      plan,
      preparation,
    );
  } catch {
    return null;
  }
}

export function writeDataQualityReviewDocument(
  storage: StorageLike,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  document: DataQualityReviewDocument,
): DataQualityReviewDocument {
  const normalized = normalizeDataQualityReviewDocument(
    document,
    release,
    plan,
    preparation,
  );
  if (!normalized) {
    throw new Error("The quality-review document failed validation and was not saved.");
  }
  storage.setItem(
    dataQualityReviewStorageKey(release.projectId, release.releaseId),
    JSON.stringify(normalized),
  );
  return normalized;
}

export function isDataQualityReviewReady(
  document: DataQualityReviewDocument | null,
): boolean {
  return Boolean(document && document.readiness.status === "ready");
}

export { MAX_DERIVED_PACKAGE_BYTES };
