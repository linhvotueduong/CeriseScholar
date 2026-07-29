import type {
  AnalysisPlanDocument,
  AnalysisPlanResearchQuestion,
} from "./analysisPlan";
import {
  DATA_PREPARATION_PACKAGE_VERSION,
  DATA_PREPARATION_SCHEMA_VERSION,
  MAX_PREPARATION_OPERATIONS,
  type DataPreparationDocument,
  type DataPreparationPackage,
  type PreparationValue,
  type PreparedResponseRow,
} from "./dataPreparation";
import {
  MAX_DATA_INTAKE_SESSIONS,
  MAX_DATA_INTAKE_TRIALS,
  MAX_DATA_INTAKE_VARIABLES,
} from "./dataIntakeAudit";
import {
  canonicalJson,
  sha256Checksum,
  type ExperimentRelease,
} from "./experimentRelease";

export const ANALYSIS_EXECUTION_SCHEMA_VERSION = 1 as const;
export const ANALYSIS_RESULTS_PACKAGE_VERSION = 1 as const;
export const MAX_ANALYSIS_EXECUTION_BYTES = 256 * 1024;
export const MAX_ANALYSIS_RESULTS_BYTES = 8 * 1024 * 1024;
export const MAX_DERIVED_PACKAGE_BYTES = 36 * 1024 * 1024;
export const MAX_ANALYSIS_TEXT = 1_000;
export const MAX_ANALYSIS_SPECIFICATIONS = 48;
export const MAX_ANALYSIS_COLUMNS = MAX_DATA_INTAKE_VARIABLES + MAX_PREPARATION_OPERATIONS;

export const ANALYSIS_CONFIDENCE_LEVELS = [0.9, 0.95, 0.99] as const;
export type AnalysisConfidenceLevel = (typeof ANALYSIS_CONFIDENCE_LEVELS)[number];

export type AnalysisMethodId =
  | "descriptive-summary"
  | "pearson-correlation"
  | "two-group-mean-difference"
  | "simple-linear-regression";

export type AnalysisDiagnosticSeverity = "pass" | "advisory" | "blocking";

export interface AnalysisMethodDefinition {
  id: AnalysisMethodId;
  label: string;
  shortLabel: string;
  description: string;
  effectSize: string;
  confidenceInterval: string;
  assumptions: string[];
  minimumSample: number;
  requiresPredictor: boolean;
}

export const ANALYSIS_METHOD_REGISTRY: ReadonlyArray<AnalysisMethodDefinition> = [
  {
    id: "descriptive-summary",
    label: "Descriptive summary",
    shortLabel: "Descriptives",
    description: "Summarize one numeric variable with its center, spread, range, and mean interval.",
    effectSize: "Mean and standard deviation",
    confidenceInterval: "Student-t interval for the mean",
    assumptions: [
      "The selected values are numeric.",
      "The observations represent the declared unit of analysis.",
      "The mean interval assumes independent observations and is sensitive to strong skew at small samples.",
    ],
    minimumSample: 2,
    requiresPredictor: false,
  },
  {
    id: "pearson-correlation",
    label: "Pearson correlation",
    shortLabel: "Correlation",
    description: "Estimate the linear association between two numeric variables using complete pairs.",
    effectSize: "Pearson r",
    confidenceInterval: "Fisher-z interval for r",
    assumptions: [
      "Both variables are numeric with non-zero variance.",
      "The relationship is approximately linear and observations are independent.",
      "Influential observations and non-random missingness require researcher review.",
    ],
    minimumSample: 4,
    requiresPredictor: true,
  },
  {
    id: "two-group-mean-difference",
    label: "Two-group mean difference",
    shortLabel: "Mean difference",
    description: "Compare one numeric outcome across exactly two observed groups using Welch inference.",
    effectSize: "Raw mean difference and Hedges g",
    confidenceInterval: "Welch Student-t interval for the raw mean difference",
    assumptions: [
      "The outcome is numeric and the predictor contains exactly two groups.",
      "Observations are independent within and across groups.",
      "Welch inference allows unequal variances but remains sensitive to strong skew at small samples.",
    ],
    minimumSample: 4,
    requiresPredictor: true,
  },
  {
    id: "simple-linear-regression",
    label: "Simple linear regression",
    shortLabel: "Linear regression",
    description: "Estimate one numeric outcome from one numeric predictor with an intercept.",
    effectSize: "Unstandardized slope and R²",
    confidenceInterval: "Student-t interval for the slope",
    assumptions: [
      "The outcome and predictor are numeric with a linear relationship.",
      "Residuals are independent with approximately constant variance.",
      "The slope interval assumes approximately normal residuals, especially at small samples.",
    ],
    minimumSample: 3,
    requiresPredictor: true,
  },
] as const;

export interface AnalysisExecutionSpecification {
  id: string;
  researchQuestionId: string;
  enabled: boolean;
  methodId: AnalysisMethodId | "not-selected";
  outcomeVariable: string;
  predictorVariable: string;
  confidenceLevel: AnalysisConfidenceLevel;
  deviationRationale: string;
}

export interface AnalysisDiagnostic {
  id: string;
  severity: AnalysisDiagnosticSeverity;
  label: string;
  detail: string;
}

export interface AnalysisMetric {
  id: string;
  label: string;
  value: number;
  formatted: string;
}

export interface AnalysisInterval {
  label: string;
  level: AnalysisConfidenceLevel;
  lower: number;
  upper: number;
  method: string;
}

export interface AnalysisMethodResult {
  analysisId: string;
  researchQuestionId: string;
  researchQuestion: string;
  methodId: AnalysisMethodId;
  methodLabel: string;
  outcomeVariable: string;
  predictorVariable: string;
  planAlignment: "aligned" | "deviation-recorded";
  completeSampleSize: number;
  excludedMissingOrInvalid: number;
  primaryEstimate: AnalysisMetric;
  metrics: AnalysisMetric[];
  interval: AnalysisInterval;
  diagnostics: AnalysisDiagnostic[];
  assumptions: string[];
  computationNotes: string[];
}

export interface AnalysisRunReceipt {
  runAt: string;
  sourcePackageChecksum: string;
  configurationFingerprint: string;
  analysisCount: number;
  sourceRows: number;
  blockingDiagnostics: number;
  advisoryDiagnostics: number;
  resultChecksum: string;
  packageChecksum: string;
}

export interface AnalysisExecutionReadiness {
  status: "needs-configuration" | "needs-run" | "needs-review" | "needs-export" | "ready";
  issues: string[];
}

export interface AnalysisExecutionDocument {
  schemaVersion: typeof ANALYSIS_EXECUTION_SCHEMA_VERSION;
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
  specifications: AnalysisExecutionSpecification[];
  lastRun: AnalysisRunReceipt | null;
  reviewedAt: string;
  exportedAt: string;
  readiness: AnalysisExecutionReadiness;
  participantDataRetention: "memory-only-never-persisted-or-uploaded";
  scientificClaim:
    "reviewed-local-method-registry-not-general-statistics-software-or-validity-certification";
}

export interface AnalysisResultsPackage {
  packageVersion: typeof ANALYSIS_RESULTS_PACKAGE_VERSION;
  projectId: string;
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  contractChecksum: string;
  analysisPlanUpdatedAt: string;
  executedAt: string;
  source: {
    preparationSchemaVersion: typeof DATA_PREPARATION_SCHEMA_VERSION;
    preparedAt: string;
    operationFingerprint: string;
    packageChecksum: string;
    inputBoundary:
      "verified-phase-8-3-derived-package-completed-production-sessions-only";
  };
  specifications: AnalysisExecutionSpecification[];
  results: AnalysisMethodResult[];
  methodRegistry: Array<{
    id: AnalysisMethodId;
    label: string;
    effectSize: string;
    confidenceInterval: string;
    assumptions: string[];
  }>;
  integrity: {
    sourcePackageChecksum: string;
    resultChecksum: string;
    packageChecksum: string;
  };
  dataClassification: "aggregate-statistical-output-potentially-sensitive";
  participantRowsIncluded: false;
  executionBoundary:
    "deterministic-browser-local-reviewed-registry-no-arbitrary-code-no-ai";
}

export interface BuildAnalysisResultsInput {
  document: AnalysisExecutionDocument;
  preparedPackage: DataPreparationPackage;
  release: ExperimentRelease;
  plan: AnalysisPlanDocument;
  preparation: DataPreparationDocument;
  executedAt?: string;
}

export interface BuildAnalysisResultsResult {
  document: AnalysisExecutionDocument;
  package: AnalysisResultsPackage;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface NumericSelection {
  values: number[];
  missing: number;
  invalid: number;
}

interface NumericPairs {
  x: number[];
  y: number[];
  missing: number;
  invalid: number;
}

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

function boundedString(value: unknown, maximum = MAX_ANALYSIS_TEXT): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function cleanText(value: unknown, maximum = MAX_ANALYSIS_TEXT): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function safeChecksum(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function finiteNonNegativeInteger(value: unknown): value is number {
  return finiteNumber(value) && Number.isInteger(value) && value >= 0;
}

function safeSpecificationId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,99}$/.test(value);
}

function safeVariableName(value: unknown): value is string {
  return typeof value === "string" && /^_?[A-Za-z][A-Za-z0-9_]{0,99}$/.test(value);
}

function isConfidenceLevel(value: unknown): value is AnalysisConfidenceLevel {
  return ANALYSIS_CONFIDENCE_LEVELS.includes(value as AnalysisConfidenceLevel);
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

function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "Not estimable";
  if (Math.abs(value) >= 10_000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) {
    return value.toExponential(2);
  }
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function sampleVariance(values: number[], average = mean(values)): number {
  if (values.length < 2) return 0;
  return values.reduce((total, value) => total + ((value - average) ** 2), 0)
    / (values.length - 1);
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[center - 1] + sorted[center]) / 2
    : sorted[center];
}

function logGamma(value: number): number {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019572e-6,
    1.5056327351493116e-7,
  ];
  if (value < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  }
  const adjusted = value - 1;
  let series = 0.9999999999998099;
  coefficients.forEach((coefficient, index) => {
    series += coefficient / (adjusted + index + 1);
  });
  const term = adjusted + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI)
    + (adjusted + 0.5) * Math.log(term)
    - term
    + Math.log(series);
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const maximumIterations = 200;
  const epsilon = 3e-14;
  const floor = 1e-300;
  const combined = a + b;
  const aPlusOne = a + 1;
  const aMinusOne = a - 1;
  let c = 1;
  let d = 1 - (combined * x) / aPlusOne;
  if (Math.abs(d) < floor) d = floor;
  d = 1 / d;
  let result = d;
  for (let iteration = 1; iteration <= maximumIterations; iteration += 1) {
    const doubled = 2 * iteration;
    let numerator = (
      iteration
      * (b - iteration)
      * x
    ) / ((aMinusOne + doubled) * (a + doubled));
    d = 1 + numerator * d;
    if (Math.abs(d) < floor) d = floor;
    c = 1 + numerator / c;
    if (Math.abs(c) < floor) c = floor;
    d = 1 / d;
    result *= d * c;

    numerator = -(
      (a + iteration)
      * (combined + iteration)
      * x
    ) / ((a + doubled) * (aPlusOne + doubled));
    d = 1 + numerator * d;
    if (Math.abs(d) < floor) d = floor;
    c = 1 + numerator / c;
    if (Math.abs(c) < floor) c = floor;
    d = 1 / d;
    const delta = d * c;
    result *= delta;
    if (Math.abs(delta - 1) < epsilon) break;
  }
  return result;
}

function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b)
    - logGamma(a)
    - logGamma(b)
    + a * Math.log(x)
    + b * Math.log(1 - x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(a, b, x)) / a
    : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

function studentTCdf(value: number, degreesOfFreedom: number): number {
  const x = degreesOfFreedom / (degreesOfFreedom + value ** 2);
  const beta = regularizedBeta(x, degreesOfFreedom / 2, 0.5);
  return value >= 0 ? 1 - beta / 2 : beta / 2;
}

export function studentTCritical(
  confidenceLevel: AnalysisConfidenceLevel,
  degreesOfFreedom: number,
): number {
  if (!Number.isFinite(degreesOfFreedom) || degreesOfFreedom <= 0) {
    throw new Error("A positive degree of freedom is required.");
  }
  const target = 1 - (1 - confidenceLevel) / 2;
  let low = 0;
  let high = 100;
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const midpoint = (low + high) / 2;
    if (studentTCdf(midpoint, degreesOfFreedom) < target) low = midpoint;
    else high = midpoint;
  }
  return (low + high) / 2;
}

function normalCritical(level: AnalysisConfidenceLevel): number {
  if (level === 0.9) return 1.6448536269514722;
  if (level === 0.99) return 2.5758293035489004;
  return 1.959963984540054;
}

function numericSelection(
  rows: PreparedResponseRow[],
  variable: string,
): NumericSelection {
  const output: NumericSelection = { values: [], missing: 0, invalid: 0 };
  rows.forEach((row) => {
    const value = row[variable];
    if (isMissing(value)) output.missing += 1;
    else if (finiteNumber(value)) output.values.push(value);
    else output.invalid += 1;
  });
  return output;
}

function numericPairs(
  rows: PreparedResponseRow[],
  predictor: string,
  outcome: string,
): NumericPairs {
  const output: NumericPairs = { x: [], y: [], missing: 0, invalid: 0 };
  rows.forEach((row) => {
    const x = row[predictor];
    const y = row[outcome];
    if (isMissing(x) || isMissing(y)) {
      output.missing += 1;
    } else if (finiteNumber(x) && finiteNumber(y)) {
      output.x.push(x);
      output.y.push(y);
    } else {
      output.invalid += 1;
    }
  });
  return output;
}

function commonDiagnostics(
  totalRows: number,
  complete: number,
  invalid: number,
  minimum: number,
): AnalysisDiagnostic[] {
  const missing = totalRows - complete - invalid;
  return [
    {
      id: "numeric-inputs",
      severity: invalid === 0 ? "pass" : "blocking",
      label: "Numeric inputs",
      detail: invalid === 0
        ? "Every non-missing value used by this method is numeric."
        : `${invalid} non-missing value(s) are not numeric. Return to Phase 8.3 and add an explicit conversion or exclusion.`,
    },
    {
      id: "complete-observations",
      severity: complete >= minimum ? "pass" : "blocking",
      label: "Sufficient complete observations",
      detail: `${complete} complete observation(s); ${missing} excluded for missingness. This method requires at least ${minimum}.`,
    },
    {
      id: "independence-review",
      severity: "advisory",
      label: "Independence requires researcher review",
      detail: "Cerise cannot infer whether observations satisfy the frozen unit-of-analysis and independence assumptions.",
    },
  ];
}

function planMethodMatches(methodId: AnalysisMethodId, plannedMethod: string): boolean {
  const normalized = plannedMethod.toLocaleLowerCase();
  if (methodId === "descriptive-summary") {
    return /(descriptive|summary|mean|median)/.test(normalized);
  }
  if (methodId === "pearson-correlation") {
    return /(pearson|correlation|correlational)/.test(normalized);
  }
  if (methodId === "two-group-mean-difference") {
    return /(welch|independent.*t|t[- ]?test|mean difference|two[- ]?group)/.test(normalized);
  }
  return /(simple linear|linear regression|linear model|ordinary least squares|ols)/.test(normalized);
}

export function analysisSpecificationAlignment(
  specification: AnalysisExecutionSpecification,
  question: AnalysisPlanResearchQuestion,
): { aligned: boolean; issues: string[] } {
  if (specification.methodId === "not-selected") {
    return { aligned: false, issues: ["Select a method from the reviewed registry."] };
  }
  const issues: string[] = [];
  if (!planMethodMatches(specification.methodId, question.plannedMethod)) {
    issues.push("The selected registry method does not directly match the frozen planned-method wording.");
  }
  if (
    question.outcomeVariables.length > 0
    && !question.outcomeVariables.includes(specification.outcomeVariable)
  ) {
    issues.push("The selected outcome is not one of the outcome variables mapped in the frozen plan.");
  }
  const method = ANALYSIS_METHOD_REGISTRY.find((item) => item.id === specification.methodId);
  if (
    method?.requiresPredictor
    && question.predictorVariables.length > 0
    && !question.predictorVariables.includes(specification.predictorVariable)
  ) {
    issues.push("The selected predictor or group is not mapped as a predictor in the frozen plan.");
  }
  return { aligned: issues.length === 0, issues };
}

function createMetric(id: string, label: string, value: number, digits = 3): AnalysisMetric {
  return {
    id,
    label,
    value: round(value),
    formatted: formatNumber(value, digits),
  };
}

function methodDefinition(methodId: AnalysisMethodId): AnalysisMethodDefinition {
  const method = ANALYSIS_METHOD_REGISTRY.find((item) => item.id === methodId);
  if (!method) throw new Error("The selected analysis method is not registered.");
  return method;
}

function blockingDiagnostic(diagnostics: AnalysisDiagnostic[]): AnalysisDiagnostic | undefined {
  return diagnostics.find((diagnostic) => diagnostic.severity === "blocking");
}

function buildDescriptiveResult(
  rows: PreparedResponseRow[],
  specification: AnalysisExecutionSpecification,
  question: AnalysisPlanResearchQuestion,
): AnalysisMethodResult {
  const selected = numericSelection(rows, specification.outcomeVariable);
  const diagnostics = commonDiagnostics(
    rows.length,
    selected.values.length,
    selected.invalid,
    2,
  );
  const blocking = blockingDiagnostic(diagnostics);
  if (blocking) throw new Error(`${question.id}: ${blocking.detail}`);
  const average = mean(selected.values);
  const variance = sampleVariance(selected.values, average);
  const standardDeviation = Math.sqrt(variance);
  diagnostics.push({
    id: "variance-present",
    severity: standardDeviation > 0 ? "pass" : "advisory",
    label: "Variance present",
    detail: standardDeviation > 0
      ? "The selected outcome has non-zero observed variance."
      : "Every complete observed value is identical; interpret the interval and spread cautiously.",
  });
  diagnostics.push({
    id: "distribution-review",
    severity: selected.values.length >= 30 ? "pass" : "advisory",
    label: "Distribution review",
    detail: selected.values.length >= 30
      ? "The complete sample is at least 30; still inspect distribution shape and design assumptions."
      : "The complete sample is below 30. Strong skew or outliers can materially affect the mean interval.",
  });
  const critical = studentTCritical(
    specification.confidenceLevel,
    selected.values.length - 1,
  );
  const margin = critical * standardDeviation / Math.sqrt(selected.values.length);
  const planAlignment = analysisSpecificationAlignment(specification, question).aligned
    ? "aligned"
    : "deviation-recorded";
  return {
    analysisId: specification.id,
    researchQuestionId: question.id,
    researchQuestion: question.question,
    methodId: "descriptive-summary",
    methodLabel: methodDefinition("descriptive-summary").label,
    outcomeVariable: specification.outcomeVariable,
    predictorVariable: "",
    planAlignment,
    completeSampleSize: selected.values.length,
    excludedMissingOrInvalid: selected.missing + selected.invalid,
    primaryEstimate: createMetric("mean", "Mean", average),
    metrics: [
      createMetric("mean", "Mean", average),
      createMetric("median", "Median", median(selected.values)),
      createMetric("sd", "Sample SD", standardDeviation),
      createMetric("minimum", "Minimum", Math.min(...selected.values)),
      createMetric("maximum", "Maximum", Math.max(...selected.values)),
      createMetric(
        "missing-rate",
        "Missing / invalid",
        ((selected.missing + selected.invalid) / rows.length) * 100,
        1,
      ),
    ],
    interval: {
      label: "Mean confidence interval",
      level: specification.confidenceLevel,
      lower: round(average - margin),
      upper: round(average + margin),
      method: "Two-sided Student-t interval using the sample standard deviation.",
    },
    diagnostics,
    assumptions: [...methodDefinition("descriptive-summary").assumptions],
    computationNotes: [
      "Missing and invalid values are excluded listwise for this variable.",
      "The standard deviation uses the n − 1 sample denominator.",
      "No distributional normality test is treated as an automatic validity decision.",
    ],
  };
}

function pearsonCoefficient(x: number[], y: number[]): number {
  const meanX = mean(x);
  const meanY = mean(y);
  let covariance = 0;
  let sumSquaresX = 0;
  let sumSquaresY = 0;
  for (let index = 0; index < x.length; index += 1) {
    const centeredX = x[index] - meanX;
    const centeredY = y[index] - meanY;
    covariance += centeredX * centeredY;
    sumSquaresX += centeredX ** 2;
    sumSquaresY += centeredY ** 2;
  }
  if (sumSquaresX === 0 || sumSquaresY === 0) return Number.NaN;
  return covariance / Math.sqrt(sumSquaresX * sumSquaresY);
}

function buildCorrelationResult(
  rows: PreparedResponseRow[],
  specification: AnalysisExecutionSpecification,
  question: AnalysisPlanResearchQuestion,
): AnalysisMethodResult {
  const pairs = numericPairs(
    rows,
    specification.predictorVariable,
    specification.outcomeVariable,
  );
  const diagnostics = commonDiagnostics(rows.length, pairs.x.length, pairs.invalid, 4);
  const correlation = pearsonCoefficient(pairs.x, pairs.y);
  diagnostics.push({
    id: "variance-present",
    severity: Number.isFinite(correlation) ? "pass" : "blocking",
    label: "Variance present",
    detail: Number.isFinite(correlation)
      ? "Both variables have non-zero observed variance."
      : "At least one selected variable has zero variance, so Pearson r is undefined.",
  });
  diagnostics.push({
    id: "linearity-review",
    severity: "advisory",
    label: "Linearity and influential cases",
    detail: "Review a plot in approved statistical software when non-linearity, clustered data, or influential observations are plausible.",
  });
  const blocking = blockingDiagnostic(diagnostics);
  if (blocking) throw new Error(`${question.id}: ${blocking.detail}`);
  const boundedCorrelation = Math.max(-0.999999, Math.min(0.999999, correlation));
  const fisher = 0.5 * Math.log((1 + boundedCorrelation) / (1 - boundedCorrelation));
  const margin = normalCritical(specification.confidenceLevel) / Math.sqrt(pairs.x.length - 3);
  const lower = Math.tanh(fisher - margin);
  const upper = Math.tanh(fisher + margin);
  const planAlignment = analysisSpecificationAlignment(specification, question).aligned
    ? "aligned"
    : "deviation-recorded";
  return {
    analysisId: specification.id,
    researchQuestionId: question.id,
    researchQuestion: question.question,
    methodId: "pearson-correlation",
    methodLabel: methodDefinition("pearson-correlation").label,
    outcomeVariable: specification.outcomeVariable,
    predictorVariable: specification.predictorVariable,
    planAlignment,
    completeSampleSize: pairs.x.length,
    excludedMissingOrInvalid: pairs.missing + pairs.invalid,
    primaryEstimate: createMetric("pearson-r", "Pearson r", correlation),
    metrics: [
      createMetric("pearson-r", "Pearson r", correlation),
      createMetric("r-squared", "r²", correlation ** 2),
      createMetric(
        "complete-rate",
        "Complete pairs",
        (pairs.x.length / rows.length) * 100,
        1,
      ),
      createMetric(
        "missing-rate",
        "Missing / invalid",
        ((pairs.missing + pairs.invalid) / rows.length) * 100,
        1,
      ),
    ],
    interval: {
      label: "Pearson r confidence interval",
      level: specification.confidenceLevel,
      lower: round(lower),
      upper: round(upper),
      method: "Two-sided Fisher-z transformed interval.",
    },
    diagnostics,
    assumptions: [...methodDefinition("pearson-correlation").assumptions],
    computationNotes: [
      "Only rows with both selected variables present and numeric are analyzed.",
      "The interval uses the Fisher-z approximation and requires at least four complete pairs.",
      "No causal or non-linear interpretation is implied.",
    ],
  };
}

function buildMeanDifferenceResult(
  rows: PreparedResponseRow[],
  specification: AnalysisExecutionSpecification,
  question: AnalysisPlanResearchQuestion,
): AnalysisMethodResult {
  const grouped = new Map<string, number[]>();
  let missing = 0;
  let invalid = 0;
  rows.forEach((row) => {
    const groupValue = row[specification.predictorVariable];
    const outcomeValue = row[specification.outcomeVariable];
    if (isMissing(groupValue) || isMissing(outcomeValue)) {
      missing += 1;
      return;
    }
    if (!finiteNumber(outcomeValue)) {
      invalid += 1;
      return;
    }
    const group = String(groupValue).trim().slice(0, 200);
    grouped.set(group, [...(grouped.get(group) ?? []), outcomeValue]);
  });
  const groups = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
  const complete = groups.reduce((total, [, values]) => total + values.length, 0);
  const diagnostics = commonDiagnostics(rows.length, complete, invalid, 4);
  diagnostics.push({
    id: "exactly-two-groups",
    severity: groups.length === 2 ? "pass" : "blocking",
    label: "Exactly two observed groups",
    detail: groups.length === 2
      ? `The comparison uses “${groups[0][0]}” and “${groups[1][0]}”.`
      : `${groups.length} non-missing group(s) were observed; this registry method requires exactly two.`,
  });
  diagnostics.push({
    id: "group-size",
    severity: groups.length === 2 && groups.every(([, values]) => values.length >= 2)
      ? "pass"
      : "blocking",
    label: "Group sample sizes",
    detail: groups.length === 2
      ? groups.map(([label, values]) => `${label}: n=${values.length}`).join("; ")
      : "Group sample sizes cannot be evaluated until exactly two groups are present.",
  });
  diagnostics.push({
    id: "distribution-review",
    severity: groups.length === 2 && groups.every(([, values]) => values.length >= 30)
      ? "pass"
      : "advisory",
    label: "Within-group distribution review",
    detail: "Welch inference tolerates unequal variances, but skew, dependence, and influential observations still require review.",
  });
  const blocking = blockingDiagnostic(diagnostics);
  if (blocking || groups.length !== 2) {
    throw new Error(`${question.id}: ${blocking?.detail ?? "Exactly two groups are required."}`);
  }
  const [firstLabel, first] = groups[0];
  const [secondLabel, second] = groups[1];
  const firstMean = mean(first);
  const secondMean = mean(second);
  const firstVariance = sampleVariance(first, firstMean);
  const secondVariance = sampleVariance(second, secondMean);
  const difference = firstMean - secondMean;
  const firstTerm = firstVariance / first.length;
  const secondTerm = secondVariance / second.length;
  const standardError = Math.sqrt(firstTerm + secondTerm);
  const degreesOfFreedom = standardError === 0
    ? first.length + second.length - 2
    : ((firstTerm + secondTerm) ** 2)
      / (
        (firstTerm ** 2) / (first.length - 1)
        + (secondTerm ** 2) / (second.length - 1)
      );
  const critical = studentTCritical(specification.confidenceLevel, degreesOfFreedom);
  const margin = critical * standardError;
  const pooledVariance = (
    (first.length - 1) * firstVariance
    + (second.length - 1) * secondVariance
  ) / (first.length + second.length - 2);
  const pooledStandardDeviation = Math.sqrt(pooledVariance);
  const cohensD = pooledStandardDeviation === 0
    ? null
    : difference / pooledStandardDeviation;
  const hedgesCorrection = 1 - 3 / (4 * (first.length + second.length) - 9);
  const hedgesG = cohensD === null ? null : cohensD * hedgesCorrection;
  diagnostics.push({
    id: "standardized-effect-estimable",
    severity: hedgesG === null ? "advisory" : "pass",
    label: "Standardized effect",
    detail: hedgesG === null
      ? "The pooled within-group standard deviation is zero, so Hedges g is undefined and is omitted."
      : "The pooled within-group standard deviation is non-zero, so Hedges g is estimable.",
  });
  const planAlignment = analysisSpecificationAlignment(specification, question).aligned
    ? "aligned"
    : "deviation-recorded";
  return {
    analysisId: specification.id,
    researchQuestionId: question.id,
    researchQuestion: question.question,
    methodId: "two-group-mean-difference",
    methodLabel: methodDefinition("two-group-mean-difference").label,
    outcomeVariable: specification.outcomeVariable,
    predictorVariable: specification.predictorVariable,
    planAlignment,
    completeSampleSize: complete,
    excludedMissingOrInvalid: missing + invalid,
    primaryEstimate: createMetric("mean-difference", `${firstLabel} − ${secondLabel}`, difference),
    metrics: [
      createMetric("mean-difference", `${firstLabel} − ${secondLabel}`, difference),
      createMetric("first-mean", `${firstLabel} mean`, firstMean),
      createMetric("second-mean", `${secondLabel} mean`, secondMean),
      ...(hedgesG === null ? [] : [createMetric("hedges-g", "Hedges g", hedgesG)]),
      createMetric("welch-df", "Welch df", degreesOfFreedom, 2),
      createMetric(
        "missing-rate",
        "Missing / invalid",
        ((missing + invalid) / rows.length) * 100,
        1,
      ),
    ],
    interval: {
      label: "Raw mean-difference confidence interval",
      level: specification.confidenceLevel,
      lower: round(difference - margin),
      upper: round(difference + margin),
      method: "Two-sided Welch Student-t interval.",
    },
    diagnostics,
    assumptions: [...methodDefinition("two-group-mean-difference").assumptions],
    computationNotes: [
      `The signed estimate is the mean of “${firstLabel}” minus the mean of “${secondLabel}”; lexical group order is deterministic.`,
      hedgesG === null
        ? "Hedges g is omitted because the pooled sample standard deviation is zero."
        : "Hedges g uses the pooled sample standard deviation with a small-sample correction.",
      "No multiplicity adjustment is applied automatically.",
    ],
  };
}

function buildRegressionResult(
  rows: PreparedResponseRow[],
  specification: AnalysisExecutionSpecification,
  question: AnalysisPlanResearchQuestion,
): AnalysisMethodResult {
  const pairs = numericPairs(
    rows,
    specification.predictorVariable,
    specification.outcomeVariable,
  );
  const diagnostics = commonDiagnostics(rows.length, pairs.x.length, pairs.invalid, 3);
  const meanX = pairs.x.length > 0 ? mean(pairs.x) : 0;
  const meanY = pairs.y.length > 0 ? mean(pairs.y) : 0;
  const sumSquaresX = pairs.x.reduce((total, value) => total + ((value - meanX) ** 2), 0);
  const totalSumSquares = pairs.y.reduce(
    (total, value) => total + ((value - meanY) ** 2),
    0,
  );
  diagnostics.push({
    id: "predictor-variance",
    severity: sumSquaresX > 0 ? "pass" : "blocking",
    label: "Predictor variance present",
    detail: sumSquaresX > 0
      ? "The selected predictor has non-zero observed variance."
      : "The selected predictor has zero variance, so a slope cannot be estimated.",
  });
  diagnostics.push({
    id: "outcome-variance",
    severity: totalSumSquares > 0 ? "pass" : "blocking",
    label: "Outcome variance present",
    detail: totalSumSquares > 0
      ? "The selected outcome has non-zero observed variance."
      : "The selected outcome has zero variance, so this registry will not report a regression or R².",
  });
  const blocking = blockingDiagnostic(diagnostics);
  if (blocking) throw new Error(`${question.id}: ${blocking.detail}`);
  let sumProducts = 0;
  for (let index = 0; index < pairs.x.length; index += 1) {
    sumProducts += (pairs.x[index] - meanX) * (pairs.y[index] - meanY);
  }
  const slope = sumProducts / sumSquaresX;
  const intercept = meanY - slope * meanX;
  const residuals = pairs.x.map((value, index) => (
    pairs.y[index] - (intercept + slope * value)
  ));
  const residualSumSquares = residuals.reduce((total, value) => total + value ** 2, 0);
  const degreesOfFreedom = pairs.x.length - 2;
  const meanSquaredError = residualSumSquares / degreesOfFreedom;
  const slopeStandardError = Math.sqrt(meanSquaredError / sumSquaresX);
  const critical = studentTCritical(specification.confidenceLevel, degreesOfFreedom);
  const margin = critical * slopeStandardError;
  const rSquared = Math.max(
    0,
    Math.min(1, 1 - residualSumSquares / totalSumSquares),
  );
  const influentialThreshold = 4 / pairs.x.length;
  const influentialCount = meanSquaredError > 0
    ? pairs.x.reduce((count, value, index) => {
      const leverage = 1 / pairs.x.length + ((value - meanX) ** 2) / sumSquaresX;
      const denominator = Math.max((1 - leverage) ** 2, Number.EPSILON);
      const cooksDistance = (
        (residuals[index] ** 2) / (2 * meanSquaredError)
      ) * (leverage / denominator);
      return count + (cooksDistance > influentialThreshold ? 1 : 0);
    }, 0)
    : 0;
  diagnostics.push({
    id: "influential-case-screen",
    severity: influentialCount === 0 ? "pass" : "advisory",
    label: "Influential-case screen",
    detail: influentialCount === 0
      ? "No complete case exceeds the aggregate Cook’s-distance screen of 4/n."
      : `${influentialCount} complete case(s) exceed the Cook’s-distance screen of 4/n. Review them in approved statistical software without automatic deletion.`,
  });
  diagnostics.push({
    id: "residual-assumptions",
    severity: "advisory",
    label: "Residual assumptions",
    detail: "Inspect residual linearity, variance, dependence, and distribution before confirmatory interpretation.",
  });
  const planAlignment = analysisSpecificationAlignment(specification, question).aligned
    ? "aligned"
    : "deviation-recorded";
  return {
    analysisId: specification.id,
    researchQuestionId: question.id,
    researchQuestion: question.question,
    methodId: "simple-linear-regression",
    methodLabel: methodDefinition("simple-linear-regression").label,
    outcomeVariable: specification.outcomeVariable,
    predictorVariable: specification.predictorVariable,
    planAlignment,
    completeSampleSize: pairs.x.length,
    excludedMissingOrInvalid: pairs.missing + pairs.invalid,
    primaryEstimate: createMetric("slope", "Slope", slope),
    metrics: [
      createMetric("slope", "Slope", slope),
      createMetric("intercept", "Intercept", intercept),
      createMetric("r-squared", "R²", rSquared),
      createMetric("slope-se", "Slope SE", slopeStandardError),
      createMetric(
        "missing-rate",
        "Missing / invalid",
        ((pairs.missing + pairs.invalid) / rows.length) * 100,
        1,
      ),
    ],
    interval: {
      label: "Slope confidence interval",
      level: specification.confidenceLevel,
      lower: round(slope - margin),
      upper: round(slope + margin),
      method: "Two-sided Student-t interval for the ordinary least-squares slope.",
    },
    diagnostics,
    assumptions: [...methodDefinition("simple-linear-regression").assumptions],
    computationNotes: [
      "The model contains one predictor and an intercept.",
      "Cook’s distance is reported only as an aggregate advisory count; no row is shown or removed.",
      "No covariates, interactions, clustering, weights, multiplicity adjustments, or robust standard errors are applied.",
    ],
  };
}

function executeSpecification(
  rows: PreparedResponseRow[],
  specification: AnalysisExecutionSpecification,
  question: AnalysisPlanResearchQuestion,
): AnalysisMethodResult {
  if (specification.methodId === "not-selected") {
    throw new Error(`${question.id}: Select a reviewed analysis method.`);
  }
  const alignment = analysisSpecificationAlignment(specification, question);
  if (!alignment.aligned && !specification.deviationRationale.trim()) {
    throw new Error(
      `${question.id}: Record why the executed method or variables differ from the frozen plan.`,
    );
  }
  if (specification.methodId === "descriptive-summary") {
    return buildDescriptiveResult(rows, specification, question);
  }
  if (specification.methodId === "pearson-correlation") {
    return buildCorrelationResult(rows, specification, question);
  }
  if (specification.methodId === "two-group-mean-difference") {
    return buildMeanDifferenceResult(rows, specification, question);
  }
  return buildRegressionResult(rows, specification, question);
}

function inferMethod(plannedMethod: string): AnalysisMethodId | "not-selected" {
  const candidates = ANALYSIS_METHOD_REGISTRY.filter((method) => (
    planMethodMatches(method.id, plannedMethod)
  ));
  return candidates.length === 1 ? candidates[0].id : "not-selected";
}

function defaultSpecification(
  question: AnalysisPlanResearchQuestion,
  ordinal: number,
): AnalysisExecutionSpecification {
  return {
    id: `analysis-${String(ordinal + 1).padStart(2, "0")}-${question.id
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "question"}`,
    researchQuestionId: question.id,
    enabled: question.designation !== "exploratory",
    methodId: inferMethod(question.plannedMethod),
    outcomeVariable: question.outcomeVariables[0] ?? "",
    predictorVariable: question.predictorVariables[0] ?? "",
    confidenceLevel: 0.95,
    deviationRationale: "",
  };
}

function normalizeSpecification(
  value: unknown,
  question: AnalysisPlanResearchQuestion,
): AnalysisExecutionSpecification | null {
  if (
    !isRecord(value)
    || !safeSpecificationId(value.id)
    || value.researchQuestionId !== question.id
    || typeof value.enabled !== "boolean"
    || ![
      "not-selected",
      ...ANALYSIS_METHOD_REGISTRY.map((method) => method.id),
    ].includes(String(value.methodId))
    || !boundedString(value.outcomeVariable, 100)
    || !boundedString(value.predictorVariable, 100)
    || !boundedString(value.deviationRationale)
    || !isConfidenceLevel(value.confidenceLevel)
  ) return null;
  const outcomeVariable = cleanText(value.outcomeVariable, 100);
  const predictorVariable = cleanText(value.predictorVariable, 100);
  if (
    (outcomeVariable && !safeVariableName(outcomeVariable))
    || (predictorVariable && !safeVariableName(predictorVariable))
  ) return null;
  return {
    id: value.id,
    researchQuestionId: question.id,
    enabled: value.enabled,
    methodId: value.methodId as AnalysisMethodId | "not-selected",
    outcomeVariable,
    predictorVariable,
    confidenceLevel: value.confidenceLevel,
    deviationRationale: cleanText(value.deviationRationale),
  };
}

export function analysisConfigurationFingerprint(
  specifications: AnalysisExecutionSpecification[],
): string {
  const value = canonicalJson(specifications);
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `analysis-v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function requiredQuestions(plan: AnalysisPlanDocument): Set<string> {
  const primary = plan.researchQuestions
    .filter((question) => question.designation === "primary")
    .map((question) => question.id);
  return new Set(primary.length > 0 ? primary : plan.researchQuestions.slice(0, 1).map((item) => item.id));
}

function specificationIssues(
  specifications: AnalysisExecutionSpecification[],
  plan: AnalysisPlanDocument,
): string[] {
  const issues: string[] = [];
  const required = requiredQuestions(plan);
  for (const question of plan.researchQuestions) {
    const specification = specifications.find((item) => item.researchQuestionId === question.id);
    if (!specification) {
      issues.push(`Create an execution specification for ${question.id}.`);
      continue;
    }
    if (required.has(question.id) && !specification.enabled) {
      issues.push(`${question.id} is primary and cannot be omitted from Phase 8.4.`);
      continue;
    }
    if (!specification.enabled) continue;
    if (specification.methodId === "not-selected") {
      issues.push(`Select a reviewed registry method for ${question.id}.`);
      continue;
    }
    const method = methodDefinition(specification.methodId);
    if (!specification.outcomeVariable) {
      issues.push(`Select an outcome variable for ${question.id}.`);
    }
    if (method.requiresPredictor && !specification.predictorVariable) {
      issues.push(`Select a predictor or group variable for ${question.id}.`);
    }
    if (
      method.requiresPredictor
      && specification.outcomeVariable === specification.predictorVariable
    ) {
      issues.push(`${question.id} must use different outcome and predictor variables.`);
    }
    const alignment = analysisSpecificationAlignment(specification, question);
    if (!alignment.aligned && !specification.deviationRationale) {
      issues.push(`Record a deviation rationale for ${question.id}.`);
    }
  }
  if (!specifications.some((specification) => specification.enabled)) {
    issues.push("Enable at least one analysis specification.");
  }
  return issues;
}

function executionReadiness(
  specifications: AnalysisExecutionSpecification[],
  lastRun: AnalysisRunReceipt | null,
  reviewedAt: string,
  exportedAt: string,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
): AnalysisExecutionReadiness {
  const issues = specificationIssues(specifications, plan);
  if (issues.length > 0) return { status: "needs-configuration", issues };
  const fingerprint = analysisConfigurationFingerprint(specifications);
  if (
    !lastRun
    || !preparation.lastRun
    || lastRun.sourcePackageChecksum !== preparation.lastRun.packageChecksum
    || lastRun.configurationFingerprint !== fingerprint
  ) {
    return {
      status: "needs-run",
      issues: ["Import and verify the current Phase 8.3 package, then run the configured analyses."],
    };
  }
  if (lastRun.blockingDiagnostics > 0) {
    return {
      status: "needs-run",
      issues: ["Resolve every blocking method diagnostic and run the analyses again."],
    };
  }
  if (!reviewedAt) {
    return {
      status: "needs-review",
      issues: ["Review the estimates, intervals, assumptions, and diagnostics before export."],
    };
  }
  if (!exportedAt) {
    return {
      status: "needs-export",
      issues: ["Export the aggregate results package before continuing."],
    };
  }
  return { status: "ready", issues: [] };
}

function normalizeRunReceipt(value: unknown): AnalysisRunReceipt | null {
  if (
    !isRecord(value)
    || !boundedString(value.runAt, 40)
    || !safeChecksum(value.sourcePackageChecksum)
    || !boundedString(value.configurationFingerprint, 40)
    || !finiteNonNegativeInteger(value.analysisCount)
    || !finiteNonNegativeInteger(value.sourceRows)
    || !finiteNonNegativeInteger(value.blockingDiagnostics)
    || !finiteNonNegativeInteger(value.advisoryDiagnostics)
    || !safeChecksum(value.resultChecksum)
    || !safeChecksum(value.packageChecksum)
  ) return null;
  return value as unknown as AnalysisRunReceipt;
}

export function createAnalysisExecutionDocument(
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  createdAt = new Date().toISOString(),
): AnalysisExecutionDocument | null {
  if (
    plan.readiness.status !== "ready"
    || preparation.readiness.status !== "ready"
    || !preparation.lastRun
    || release.projectId !== plan.projectId
    || release.releaseId !== plan.releaseId
    || release.releaseId !== preparation.releaseId
  ) return null;
  const specifications = plan.researchQuestions
    .slice(0, MAX_ANALYSIS_SPECIFICATIONS)
    .map(defaultSpecification);
  return {
    schemaVersion: ANALYSIS_EXECUTION_SCHEMA_VERSION,
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
    specifications,
    lastRun: null,
    reviewedAt: "",
    exportedAt: "",
    readiness: executionReadiness(specifications, null, "", "", plan, preparation),
    participantDataRetention: "memory-only-never-persisted-or-uploaded",
    scientificClaim:
      "reviewed-local-method-registry-not-general-statistics-software-or-validity-certification",
  };
}

export function normalizeAnalysisExecutionDocument(
  value: unknown,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
): AnalysisExecutionDocument | null {
  if (
    !preparation.lastRun
    || !isRecord(value)
    || value.schemaVersion !== ANALYSIS_EXECUTION_SCHEMA_VERSION
    || value.projectId !== release.projectId
    || value.releaseId !== release.releaseId
    || value.releaseNumber !== release.releaseNumber
    || value.releaseChecksum !== release.checksum
    || value.contractChecksum !== release.manifest.analysisContractChecksum
    || value.analysisPlanUpdatedAt !== plan.updatedAt
    || !isRecord(value.preparation)
    || value.preparation.schemaVersion !== DATA_PREPARATION_SCHEMA_VERSION
    || value.preparation.preparedAt !== preparation.lastRun.preparedAt
    || value.preparation.packageChecksum !== preparation.lastRun.packageChecksum
    || value.preparation.operationFingerprint !== preparation.lastRun.operationFingerprint
    || !boundedString(value.createdAt, 40)
    || !boundedString(value.updatedAt, 40)
    || !boundedString(value.reviewedAt, 40)
    || !boundedString(value.exportedAt, 40)
    || value.participantDataRetention !== "memory-only-never-persisted-or-uploaded"
    || value.scientificClaim
      !== "reviewed-local-method-registry-not-general-statistics-software-or-validity-certification"
    || !Array.isArray(value.specifications)
    || value.specifications.length !== plan.researchQuestions.length
    || value.specifications.length > MAX_ANALYSIS_SPECIFICATIONS
  ) return null;
  const specifications = value.specifications.map((candidate, index) => (
    normalizeSpecification(candidate, plan.researchQuestions[index])
  ));
  if (
    specifications.some((item) => !item)
    || new Set(specifications.map((item) => item?.id)).size !== specifications.length
  ) return null;
  const lastRun = value.lastRun === null ? null : normalizeRunReceipt(value.lastRun);
  if (value.lastRun !== null && !lastRun) return null;
  const normalizedSpecifications = specifications as AnalysisExecutionSpecification[];
  const normalized: AnalysisExecutionDocument = {
    schemaVersion: ANALYSIS_EXECUTION_SCHEMA_VERSION,
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
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    specifications: normalizedSpecifications,
    lastRun,
    reviewedAt: value.reviewedAt,
    exportedAt: value.exportedAt,
    readiness: executionReadiness(
      normalizedSpecifications,
      lastRun,
      value.reviewedAt,
      value.exportedAt,
      plan,
      preparation,
    ),
    participantDataRetention: "memory-only-never-persisted-or-uploaded",
    scientificClaim:
      "reviewed-local-method-registry-not-general-statistics-software-or-validity-certification",
  };
  return safeJsonByteLength(normalized) <= MAX_ANALYSIS_EXECUTION_BYTES ? normalized : null;
}

export function updateAnalysisSpecifications(
  document: AnalysisExecutionDocument,
  specifications: AnalysisExecutionSpecification[],
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  updatedAt = new Date().toISOString(),
): AnalysisExecutionDocument {
  const updated = {
    ...document,
    updatedAt,
    specifications,
    lastRun: null,
    reviewedAt: "",
    exportedAt: "",
  };
  const normalized = normalizeAnalysisExecutionDocument(updated, release, plan, preparation);
  if (!normalized) throw new Error("The analysis configuration failed validation.");
  return normalized;
}

function scalarPreparationValue(value: unknown): value is PreparationValue {
  return value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || finiteNumber(value);
}

function validateColumns(value: unknown, maximum: number): string[] | null {
  if (
    !Array.isArray(value)
    || value.length === 0
    || value.length > maximum
    || !value.every(safeVariableName)
    || new Set(value).size !== value.length
  ) return null;
  return value as string[];
}

function validateResponseRows(value: unknown, columns: string[]): PreparedResponseRow[] | null {
  if (!Array.isArray(value) || value.length > MAX_DATA_INTAKE_SESSIONS) return null;
  const allowed = new Set(columns);
  const sessionIds = new Set<string>();
  for (const candidate of value) {
    if (!isRecord(candidate) || Object.keys(candidate).some((key) => !allowed.has(key))) return null;
    for (const column of columns) {
      const cell = candidate[column];
      if (cell !== undefined && !scalarPreparationValue(cell)) return null;
      if (typeof cell === "string" && cell.length > 50_000) return null;
    }
    const sessionId = candidate._cerise_session_id;
    if (
      typeof sessionId !== "string"
      || sessionId.length === 0
      || sessionId.length > 200
      || sessionIds.has(sessionId)
    ) return null;
    sessionIds.add(sessionId);
  }
  return value as PreparedResponseRow[];
}

function validateTrialRows(value: unknown, columns: string[]): boolean {
  if (!Array.isArray(value) || value.length > MAX_DATA_INTAKE_TRIALS) return false;
  const allowed = new Set(columns);
  return value.every((candidate) => (
    isRecord(candidate)
    && Object.keys(candidate).every((key) => allowed.has(key))
    && columns.every((column) => {
      const cell = candidate[column];
      return cell === undefined
        || (scalarPreparationValue(cell)
          && (typeof cell !== "string" || cell.length <= 50_000));
    })
  ));
}

export async function verifyPreparedAnalysisPackage(
  value: unknown,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
): Promise<DataPreparationPackage> {
  if (
    !preparation.lastRun
    || preparation.readiness.status !== "ready"
    || plan.readiness.status !== "ready"
    || safeJsonByteLength(value) > MAX_DERIVED_PACKAGE_BYTES
    || !isRecord(value)
    || value.exportType !== "cerise-derived-data-package"
    || !boundedString(value.exportBoundary, 1_000)
    || !boundedString(value.exportedAt, 40)
    || !isRecord(value.package)
  ) throw new Error("Select the exported Phase 8.3 derived-data JSON package.");
  const candidate = value.package;
  if (
    candidate.packageVersion !== DATA_PREPARATION_PACKAGE_VERSION
    || candidate.projectId !== release.projectId
    || candidate.releaseId !== release.releaseId
    || candidate.releaseNumber !== release.releaseNumber
    || candidate.releaseChecksum !== release.checksum
    || candidate.contractChecksum !== release.manifest.analysisContractChecksum
    || candidate.preparedAt !== preparation.lastRun.preparedAt
    || !isRecord(candidate.source)
    || !Array.isArray(candidate.operations)
    || candidate.operations.length > MAX_PREPARATION_OPERATIONS
    || !Array.isArray(candidate.operationLog)
    || candidate.operationLog.length > MAX_PREPARATION_OPERATIONS
    || candidate.dataClassification !== "potentially-identifying-local-research-data"
    || candidate.rawSourceMutation !== "none-derived-copy-only"
    || !isRecord(candidate.integrity)
    || !safeChecksum(candidate.integrity.responseChecksum)
    || !safeChecksum(candidate.integrity.trialChecksum)
    || !safeChecksum(candidate.integrity.packageChecksum)
  ) throw new Error("The derived package does not match the selected release and preparation receipt.");
  const responseColumns = validateColumns(candidate.responseColumns, MAX_ANALYSIS_COLUMNS);
  const trialColumns = validateColumns(candidate.trialColumns, 64);
  if (!responseColumns || !trialColumns) {
    throw new Error("The derived package contains an invalid or oversized column dictionary.");
  }
  const responses = validateResponseRows(candidate.responses, responseColumns);
  if (!responses || !validateTrialRows(candidate.trials, trialColumns)) {
    throw new Error("The derived package contains invalid or oversized response or trial rows.");
  }
  const responseChecksum = await sha256Checksum({ columns: responseColumns, rows: responses });
  const trialChecksum = await sha256Checksum({ columns: trialColumns, rows: candidate.trials });
  if (
    responseChecksum !== candidate.integrity.responseChecksum
    || trialChecksum !== candidate.integrity.trialChecksum
  ) throw new Error("The derived response or trial checksum does not match its contents.");
  const unsignedPackage = {
    ...candidate,
    integrity: {
      responseChecksum: candidate.integrity.responseChecksum,
      trialChecksum: candidate.integrity.trialChecksum,
    },
  };
  const packageChecksum = await sha256Checksum(unsignedPackage);
  if (
    packageChecksum !== candidate.integrity.packageChecksum
    || packageChecksum !== preparation.lastRun.packageChecksum
  ) throw new Error("The derived package checksum does not match the reviewed Phase 8.3 export.");
  return candidate as unknown as DataPreparationPackage;
}

export async function buildAnalysisResultsPackage(
  input: BuildAnalysisResultsInput,
): Promise<BuildAnalysisResultsResult> {
  const {
    release,
    plan,
    preparation,
    preparedPackage,
  } = input;
  const normalized = normalizeAnalysisExecutionDocument(
    input.document,
    release,
    plan,
    preparation,
  );
  if (!normalized) throw new Error("The analysis execution document is invalid.");
  const configurationIssues = specificationIssues(normalized.specifications, plan);
  if (configurationIssues.length > 0) throw new Error(configurationIssues[0]);
  const availableColumns = new Set(preparedPackage.responseColumns);
  normalized.specifications.filter((specification) => specification.enabled).forEach((specification) => {
    const method = specification.methodId === "not-selected"
      ? null
      : methodDefinition(specification.methodId);
    if (!availableColumns.has(specification.outcomeVariable)) {
      throw new Error(`${specification.researchQuestionId}: The outcome is not in the verified derived package.`);
    }
    if (method?.requiresPredictor && !availableColumns.has(specification.predictorVariable)) {
      throw new Error(`${specification.researchQuestionId}: The predictor is not in the verified derived package.`);
    }
  });
  const results = normalized.specifications
    .filter((specification) => specification.enabled)
    .map((specification) => {
      const question = plan.researchQuestions.find(
        (item) => item.id === specification.researchQuestionId,
      );
      if (!question) throw new Error("An execution specification has no frozen research question.");
      return executeSpecification(preparedPackage.responses, specification, question);
    });
  const executedAt = input.executedAt ?? new Date().toISOString();
  const resultChecksum = await sha256Checksum(results);
  const methodRegistry = [...new Set(results.map((result) => result.methodId))].map((id) => {
    const method = methodDefinition(id);
    return {
      id: method.id,
      label: method.label,
      effectSize: method.effectSize,
      confidenceInterval: method.confidenceInterval,
      assumptions: [...method.assumptions],
    };
  });
  const unsignedPackage = {
    packageVersion: ANALYSIS_RESULTS_PACKAGE_VERSION,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum: release.manifest.analysisContractChecksum ?? "",
    analysisPlanUpdatedAt: plan.updatedAt,
    executedAt,
    source: {
      preparationSchemaVersion: DATA_PREPARATION_SCHEMA_VERSION,
      preparedAt: preparedPackage.preparedAt,
      operationFingerprint: preparation.lastRun?.operationFingerprint ?? "",
      packageChecksum: preparedPackage.integrity.packageChecksum,
      inputBoundary:
        "verified-phase-8-3-derived-package-completed-production-sessions-only" as const,
    },
    specifications: normalized.specifications.filter((item) => item.enabled),
    results,
    methodRegistry,
    integrity: {
      sourcePackageChecksum: preparedPackage.integrity.packageChecksum,
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
    integrity: {
      ...unsignedPackage.integrity,
      packageChecksum,
    },
  };
  if (safeJsonByteLength(resultsPackage) > MAX_ANALYSIS_RESULTS_BYTES) {
    throw new Error("The aggregate results package exceeds the Phase 8.4 size limit.");
  }
  const diagnostics = results.flatMap((result) => result.diagnostics);
  const lastRun: AnalysisRunReceipt = {
    runAt: executedAt,
    sourcePackageChecksum: preparedPackage.integrity.packageChecksum,
    configurationFingerprint: analysisConfigurationFingerprint(normalized.specifications),
    analysisCount: results.length,
    sourceRows: preparedPackage.responses.length,
    blockingDiagnostics: diagnostics.filter((item) => item.severity === "blocking").length,
    advisoryDiagnostics: diagnostics.filter((item) => item.severity === "advisory").length,
    resultChecksum,
    packageChecksum,
  };
  const document: AnalysisExecutionDocument = {
    ...normalized,
    updatedAt: executedAt,
    lastRun,
    reviewedAt: "",
    exportedAt: "",
    readiness: executionReadiness(
      normalized.specifications,
      lastRun,
      "",
      "",
      plan,
      preparation,
    ),
  };
  return { document, package: resultsPackage };
}

export function markAnalysisExecutionReviewed(
  document: AnalysisExecutionDocument,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  reviewedAt = new Date().toISOString(),
): AnalysisExecutionDocument {
  const normalized = normalizeAnalysisExecutionDocument(document, release, plan, preparation);
  if (
    !normalized
    || !normalized.lastRun
    || normalized.readiness.status !== "needs-review"
    || normalized.lastRun.blockingDiagnostics > 0
  ) throw new Error("Run the current configuration and resolve blocking diagnostics first.");
  const updated = {
    ...normalized,
    updatedAt: reviewedAt,
    reviewedAt,
    exportedAt: "",
  };
  const result = normalizeAnalysisExecutionDocument(updated, release, plan, preparation);
  if (!result) throw new Error("The analysis review could not be recorded.");
  return result;
}

export function markAnalysisExecutionExported(
  document: AnalysisExecutionDocument,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  exportedAt = new Date().toISOString(),
): AnalysisExecutionDocument {
  const normalized = normalizeAnalysisExecutionDocument(document, release, plan, preparation);
  if (!normalized?.lastRun || !normalized.reviewedAt) {
    throw new Error("Confirm the analysis review before exporting.");
  }
  const updated = { ...normalized, updatedAt: exportedAt, exportedAt };
  const result = normalizeAnalysisExecutionDocument(updated, release, plan, preparation);
  if (!result) throw new Error("The analysis export could not be recorded.");
  return result;
}

export function analysisExecutionStorageKey(projectId: string, releaseId: string): string {
  return `cerise-analysis-execution:${projectId}:${releaseId}:v${ANALYSIS_EXECUTION_SCHEMA_VERSION}`;
}

export function readAnalysisExecutionDocument(
  storage: StorageLike,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
): AnalysisExecutionDocument | null {
  const stored = storage.getItem(analysisExecutionStorageKey(release.projectId, release.releaseId));
  if (!stored || new TextEncoder().encode(stored).byteLength > MAX_ANALYSIS_EXECUTION_BYTES) {
    return null;
  }
  try {
    return normalizeAnalysisExecutionDocument(JSON.parse(stored), release, plan, preparation);
  } catch {
    return null;
  }
}

export function writeAnalysisExecutionDocument(
  storage: StorageLike,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  document: AnalysisExecutionDocument,
): AnalysisExecutionDocument {
  const normalized = normalizeAnalysisExecutionDocument(
    document,
    release,
    plan,
    preparation,
  );
  if (!normalized) throw new Error("The analysis execution document was not saved.");
  storage.setItem(
    analysisExecutionStorageKey(release.projectId, release.releaseId),
    JSON.stringify(normalized),
  );
  return normalized;
}

export function isAnalysisExecutionReady(
  document: AnalysisExecutionDocument | null,
): boolean {
  return Boolean(document && document.readiness.status === "ready");
}
