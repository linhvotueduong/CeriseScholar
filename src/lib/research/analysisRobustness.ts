import type { AnalysisPlanDocument } from "./analysisPlan";
import {
  ANALYSIS_METHOD_REGISTRY,
  studentTCritical,
  verifyPreparedAnalysisPackage,
  type AnalysisExecutionDocument,
  type AnalysisMethodId,
  type AnalysisMethodResult,
  type AnalysisResultsPackage,
} from "./analysisExecution";
import { verifyAnalysisResultsPackage } from "./analysisResults";
import type {
  DataPreparationDocument,
  DataPreparationPackage,
  PreparationValue,
  PreparedResponseRow,
} from "./dataPreparation";
import {
  canonicalJson,
  sha256Checksum,
  verifyExperimentRelease,
  type ExperimentRelease,
} from "./experimentRelease";

export const ANALYSIS_ROBUSTNESS_SCHEMA_VERSION = 1 as const;
export const ROBUSTNESS_RECORD_PACKAGE_VERSION = 1 as const;
export const ROBUSTNESS_ENGINE_VERSION = "cerise-reviewed-robustness-registry-1" as const;
export const ROBUSTNESS_RECORD_EXPORT_TYPE = "cerise-robustness-record-package" as const;
export const ROBUSTNESS_RECORD_EXPORT_BOUNDARY =
  "aggregate-robustness-output-only-no-participant-rows-no-automatic-exclusion-no-ai" as const;
export const MAX_ANALYSIS_ROBUSTNESS_BYTES = 512 * 1024;
export const MAX_ROBUSTNESS_RECORD_BYTES = 10 * 1024 * 1024;
export const MAX_ROBUSTNESS_TEXT = 4_000;
export const MAX_ROBUSTNESS_ANALYSES = 48;

export type RobustnessConclusionImpact =
  | "not-reviewed"
  | "unchanged"
  | "weakened"
  | "strengthened"
  | "changed"
  | "inconclusive";

export type RobustnessComparisonStatus =
  | "direction-consistent"
  | "direction-different"
  | "interval-boundary-consistent"
  | "interval-boundary-different"
  | "not-estimable";

export interface RobustnessAlternativeEstimate {
  id: string;
  label: string;
  estimate: number | null;
  formatted: string;
  method: string;
  interval: {
    level: number;
    lower: number;
    upper: number;
    method: string;
  } | null;
}

export interface RobustnessInfluenceSummary {
  evaluatedDeletions: number;
  minimumEstimate: number;
  maximumEstimate: number;
  maximumAbsoluteChange: number;
  relativeMaximumChange: number | null;
  directionChanged: boolean;
  method: string;
}

export interface RobustnessAnalysisResult {
  analysisId: string;
  researchQuestionId: string;
  researchQuestion: string;
  methodId: AnalysisMethodId;
  methodLabel: string;
  outcomeVariable: string;
  predictorVariable: string;
  completeSampleSize: number;
  primaryEstimate: {
    id: string;
    label: string;
    value: number;
    formatted: string;
    interval: {
      level: number;
      lower: number;
      upper: number;
      method: string;
    };
  };
  alternatives: RobustnessAlternativeEstimate[];
  influence: RobustnessInfluenceSummary | null;
  comparisonStatus: RobustnessComparisonStatus;
  requiresAttention: boolean;
  comparisonNote: string;
  diagnostics: string[];
  limitations: string[];
}

export interface RobustnessAnalysisReview {
  analysisId: string;
  researchQuestionId: string;
  conclusionImpact: RobustnessConclusionImpact;
  interpretation: string;
  limitations: string;
  acknowledged: boolean;
}

export interface RobustnessRunReceipt {
  runAt: string;
  preparedPackageChecksum: string;
  analysisResultsPackageChecksum: string;
  engineVersion: typeof ROBUSTNESS_ENGINE_VERSION;
  analysisCount: number;
  checkChecksum: string;
}

export interface AnalysisRobustnessReadiness {
  status: "needs-source" | "needs-assessment" | "needs-review" | "needs-export" | "ready";
  issues: string[];
}

export interface AnalysisRobustnessDocument {
  schemaVersion: typeof ANALYSIS_ROBUSTNESS_SCHEMA_VERSION;
  projectId: string;
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  contractChecksum: string;
  analysisPlanUpdatedAt: string;
  preparation: {
    preparedAt: string;
    operationFingerprint: string;
    packageChecksum: string;
  };
  execution: {
    runAt: string;
    configurationFingerprint: string;
    resultChecksum: string;
    packageChecksum: string;
  };
  createdAt: string;
  updatedAt: string;
  reviews: RobustnessAnalysisReview[];
  overallConclusion: string;
  unperformedChecks: string;
  lastRun: RobustnessRunReceipt | null;
  reviewedAt: string;
  exportedAt: string;
  lastExportChecksum: string;
  readiness: AnalysisRobustnessReadiness;
  participantDataRetention: "memory-only-never-persisted-or-uploaded";
  scientificClaim:
    "bounded-advisory-robustness-checks-not-validity-certification-or-automatic-analysis-approval";
}

export interface RobustnessRecordPackage {
  packageVersion: typeof ROBUSTNESS_RECORD_PACKAGE_VERSION;
  projectId: string;
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  contractChecksum: string;
  analysisPlanUpdatedAt: string;
  robustnessRunAt: string;
  reviewedAt: string;
  source: {
    preparedAt: string;
    operationFingerprint: string;
    preparedPackageChecksum: string;
    primaryAnalysisRunAt: string;
    primaryConfigurationFingerprint: string;
    primaryResultChecksum: string;
    analysisResultsPackageChecksum: string;
    inputBoundary:
      "exact-verified-phase-8-3-derived-package-and-phase-8-4-aggregate-results-package";
  };
  registry: Array<{
    methodId: AnalysisMethodId;
    primaryCheck: string;
    influenceCheck: string;
    boundary: string;
  }>;
  analyses: RobustnessAnalysisResult[];
  reviews: RobustnessAnalysisReview[];
  overallConclusion: string;
  unperformedChecks: string;
  integrity: {
    preparedPackageChecksum: string;
    analysisResultsPackageChecksum: string;
    checkChecksum: string;
    reviewChecksum: string;
    packageChecksum: string;
  };
  dataClassification: "aggregate-robustness-output-potentially-sensitive";
  participantRowsIncluded: false;
  automaticExclusionsApplied: false;
  scientificBoundary:
    "advisory-deterministic-comparisons-require-researcher-judgment-not-proof-of-robustness-validity-or-reproducibility";
}

export interface RobustnessRecordExport {
  exportType: typeof ROBUSTNESS_RECORD_EXPORT_TYPE;
  exportBoundary: typeof ROBUSTNESS_RECORD_EXPORT_BOUNDARY;
  exportedAt: string;
  package: RobustnessRecordPackage;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface NumericPairSelection {
  x: number[];
  y: number[];
}

interface GroupSelection {
  labels: [string, string];
  values: [number[], number[]];
}

const ROBUSTNESS_REGISTRY: Readonly<Record<AnalysisMethodId, {
  primaryCheck: string;
  influenceCheck: string;
  boundary: string;
}>> = {
  "descriptive-summary": {
    primaryCheck: "Median and 20% trimmed-mean center comparison",
    influenceCheck: "Leave-one-out mean range",
    boundary: "Center comparisons do not establish distributional adequacy.",
  },
  "pearson-correlation": {
    primaryCheck: "Spearman rank-correlation comparison",
    influenceCheck: "Leave-one-out Pearson-r range",
    boundary: "Rank correlation changes the association estimand and is not a replacement model.",
  },
  "spearman-rank-correlation": {
    primaryCheck: "Pearson linear-correlation comparison",
    influenceCheck: "No automatic rank-influence check in this batch",
    boundary: "Pearson correlation changes the association estimand; rank-specific influence review remains external.",
  },
  "two-group-mean-difference": {
    primaryCheck: "Median and 20% trimmed-mean group contrasts",
    influenceCheck: "Leave-one-out raw mean-difference range",
    boundary: "Robust-center contrasts do not replace a prespecified inferential model.",
  },
  "paired-samples-mean-difference": {
    primaryCheck: "Median and 20% trimmed paired-difference comparison",
    influenceCheck: "Leave-one-out paired mean-difference range",
    boundary: "Robust paired centers change the estimand and do not repair invalid pairing or dependence.",
  },
  "simple-linear-regression": {
    primaryCheck: "HC3 heteroskedasticity-consistent slope interval",
    influenceCheck: "Leave-one-out ordinary-least-squares slope range",
    boundary: "HC3 addresses variance estimation only; it does not repair nonlinearity, dependence, or confounding.",
  },
};

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

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function finiteNonNegativeInteger(value: unknown): value is number {
  return finiteNumber(value) && Number.isInteger(value) && value >= 0;
}

function safeChecksum(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function safeId(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 160
    && /^[A-Za-z0-9._:-]+$/.test(value);
}

function safeTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function boundedString(value: unknown, maximum = MAX_ROBUSTNESS_TEXT): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function cleanText(value: string, maximum = MAX_ROBUSTNESS_TEXT): string {
  return value.replace(/\u0000/g, "").trim().slice(0, maximum);
}

function round(value: number, digits = 8): number {
  if (!Number.isFinite(value)) return value;
  return Number(value.toFixed(digits));
}

function formatNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Not estimable";
  const absolute = Math.abs(value);
  if (absolute !== 0 && (absolute >= 1_000_000 || absolute < 0.0001)) {
    return value.toExponential(4);
  }
  return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function trimmedMean(values: number[], proportion = 0.2): number | null {
  const trim = Math.floor(values.length * proportion);
  const sorted = [...values].sort((left, right) => left - right);
  const retained = sorted.slice(trim, sorted.length - trim);
  return retained.length >= 2 ? mean(retained) : null;
}

function isMissing(value: PreparationValue | undefined): boolean {
  return value === null
    || value === undefined
    || (typeof value === "string" && value.trim() === "");
}

function numericValues(rows: PreparedResponseRow[], variable: string): number[] {
  const values: number[] = [];
  rows.forEach((row) => {
    const value = row[variable];
    if (!isMissing(value) && finiteNumber(value)) values.push(value);
  });
  return values;
}

function numericPairs(
  rows: PreparedResponseRow[],
  predictor: string,
  outcome: string,
): NumericPairSelection {
  const x: number[] = [];
  const y: number[] = [];
  rows.forEach((row) => {
    const predictorValue = row[predictor];
    const outcomeValue = row[outcome];
    if (
      !isMissing(predictorValue)
      && !isMissing(outcomeValue)
      && finiteNumber(predictorValue)
      && finiteNumber(outcomeValue)
    ) {
      x.push(predictorValue);
      y.push(outcomeValue);
    }
  });
  return { x, y };
}

function groupedValues(
  rows: PreparedResponseRow[],
  predictor: string,
  outcome: string,
): GroupSelection | null {
  const groups = new Map<string, number[]>();
  rows.forEach((row) => {
    const groupValue = row[predictor];
    const outcomeValue = row[outcome];
    if (isMissing(groupValue) || isMissing(outcomeValue) || !finiteNumber(outcomeValue)) return;
    const label = String(groupValue).trim().slice(0, 200);
    groups.set(label, [...(groups.get(label) ?? []), outcomeValue]);
  });
  const sorted = [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
  if (sorted.length !== 2) return null;
  return {
    labels: [sorted[0][0], sorted[1][0]],
    values: [sorted[0][1], sorted[1][1]],
  };
}

function pearson(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 2) return null;
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
  if (sumSquaresX <= 0 || sumSquaresY <= 0) return null;
  return covariance / Math.sqrt(sumSquaresX * sumSquaresY);
}

function averageRanks(values: number[]): number[] {
  const indexed = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value || left.index - right.index);
  const ranks = Array<number>(values.length);
  let start = 0;
  while (start < indexed.length) {
    let end = start + 1;
    while (end < indexed.length && indexed[end].value === indexed[start].value) end += 1;
    const averageRank = (start + 1 + end) / 2;
    for (let index = start; index < end; index += 1) {
      ranks[indexed[index].index] = averageRank;
    }
    start = end;
  }
  return ranks;
}

function spearman(x: number[], y: number[]): number | null {
  return pearson(averageRanks(x), averageRanks(y));
}

function regressionSlope(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;
  const meanX = mean(x);
  const meanY = mean(y);
  let sumSquaresX = 0;
  let sumProducts = 0;
  for (let index = 0; index < x.length; index += 1) {
    const centeredX = x[index] - meanX;
    sumSquaresX += centeredX ** 2;
    sumProducts += centeredX * (y[index] - meanY);
  }
  return sumSquaresX > 0 ? sumProducts / sumSquaresX : null;
}

function hc3SlopeInterval(
  x: number[],
  y: number[],
  confidenceLevel: number,
): { lower: number; upper: number } | null {
  const slope = regressionSlope(x, y);
  if (slope === null || x.length < 4) return null;
  const meanX = mean(x);
  const meanY = mean(y);
  const sumSquaresX = x.reduce((total, value) => total + ((value - meanX) ** 2), 0);
  if (sumSquaresX <= 0) return null;
  const intercept = meanY - slope * meanX;
  let variance = 0;
  for (let index = 0; index < x.length; index += 1) {
    const centeredX = x[index] - meanX;
    const leverage = 1 / x.length + (centeredX ** 2) / sumSquaresX;
    const oneMinusLeverage = 1 - leverage;
    if (oneMinusLeverage <= 1e-12) return null;
    const residual = y[index] - (intercept + slope * x[index]);
    const slopeWeight = centeredX / sumSquaresX;
    variance += (slopeWeight ** 2) * ((residual / oneMinusLeverage) ** 2);
  }
  const standardError = Math.sqrt(Math.max(0, variance));
  const critical = studentTCritical(confidenceLevel as 0.9 | 0.95 | 0.99, x.length - 2);
  return {
    lower: slope - critical * standardError,
    upper: slope + critical * standardError,
  };
}

function sign(value: number): -1 | 0 | 1 {
  if (Math.abs(value) <= 1e-12) return 0;
  return value < 0 ? -1 : 1;
}

function directionConsistent(primary: number, alternate: number): boolean {
  return sign(primary) === sign(alternate);
}

function relativeDifference(primary: number, alternate: number): number | null {
  return Math.abs(primary) <= 1e-12
    ? null
    : Math.abs(alternate - primary) / Math.abs(primary);
}

function leaveOneOutMean(
  values: number[],
  primary: number,
): RobustnessInfluenceSummary | null {
  if (values.length < 3) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  const remainingCount = values.length - 1;
  const estimates = values.map((value) => (total - value) / remainingCount);
  return influenceSummary(estimates, primary, "Each complete observation is omitted once.");
}

function pairMoments(
  x: number[],
  y: number[],
): {
  meanX: number;
  meanY: number;
  sumSquaresX: number;
  sumSquaresY: number;
  sumProducts: number;
} {
  const meanX = mean(x);
  const meanY = mean(y);
  let sumSquaresX = 0;
  let sumSquaresY = 0;
  let sumProducts = 0;
  for (let index = 0; index < x.length; index += 1) {
    const centeredX = x[index] - meanX;
    const centeredY = y[index] - meanY;
    sumSquaresX += centeredX ** 2;
    sumSquaresY += centeredY ** 2;
    sumProducts += centeredX * centeredY;
  }
  return { meanX, meanY, sumSquaresX, sumSquaresY, sumProducts };
}

function leaveOneOutPairMoments(
  x: number[],
  y: number[],
  estimator: (moments: ReturnType<typeof pairMoments>) => number | null,
  primary: number,
  method: string,
): RobustnessInfluenceSummary | null {
  if (x.length !== y.length || x.length < 4) return null;
  const moments = pairMoments(x, y);
  const estimates: number[] = [];
  const remainingCount = x.length - 1;
  for (let index = 0; index < x.length; index += 1) {
    const remainingMeanX = ((x.length * moments.meanX) - x[index]) / remainingCount;
    const remainingMeanY = ((y.length * moments.meanY) - y[index]) / remainingCount;
    const remainingMoments = {
      meanX: remainingMeanX,
      meanY: remainingMeanY,
      sumSquaresX: moments.sumSquaresX
        - ((x[index] - moments.meanX) * (x[index] - remainingMeanX)),
      sumSquaresY: moments.sumSquaresY
        - ((y[index] - moments.meanY) * (y[index] - remainingMeanY)),
      sumProducts: moments.sumProducts
        - ((x[index] - moments.meanX) * (y[index] - remainingMeanY)),
    };
    const estimate = estimator(remainingMoments);
    if (estimate !== null && Number.isFinite(estimate)) estimates.push(estimate);
  }
  return influenceSummary(estimates, primary, method);
}

function leaveOneOutPearson(
  x: number[],
  y: number[],
  primary: number,
): RobustnessInfluenceSummary | null {
  return leaveOneOutPairMoments(
    x,
    y,
    (moments) => {
      if (moments.sumSquaresX <= 1e-12 || moments.sumSquaresY <= 1e-12) return null;
      return moments.sumProducts / Math.sqrt(moments.sumSquaresX * moments.sumSquaresY);
    },
    primary,
    "Each complete pair is omitted once.",
  );
}

function leaveOneOutRegressionSlope(
  x: number[],
  y: number[],
  primary: number,
): RobustnessInfluenceSummary | null {
  return leaveOneOutPairMoments(
    x,
    y,
    (moments) => (
      moments.sumSquaresX > 1e-12
        ? moments.sumProducts / moments.sumSquaresX
        : null
    ),
    primary,
    "Each complete pair is omitted once.",
  );
}

function leaveOneOutGroups(
  selection: GroupSelection,
  primary: number,
): RobustnessInfluenceSummary | null {
  const estimates: number[] = [];
  const sums = selection.values.map((group) => (
    group.reduce((total, value) => total + value, 0)
  )) as [number, number];
  selection.values.forEach((group, groupIndex) => {
    group.forEach((value) => {
      const firstCount = selection.values[0].length - (groupIndex === 0 ? 1 : 0);
      const secondCount = selection.values[1].length - (groupIndex === 1 ? 1 : 0);
      if (firstCount < 2 || secondCount < 2) return;
      const firstSum = sums[0] - (groupIndex === 0 ? value : 0);
      const secondSum = sums[1] - (groupIndex === 1 ? value : 0);
      estimates.push((firstSum / firstCount) - (secondSum / secondCount));
    });
  });
  return influenceSummary(
    estimates,
    primary,
    "Each complete observation is omitted once when both groups retain at least two observations.",
  );
}

function influenceSummary(
  estimates: number[],
  primary: number,
  method: string,
): RobustnessInfluenceSummary | null {
  if (estimates.length === 0) return null;
  let minimumEstimate = estimates[0];
  let maximumEstimate = estimates[0];
  let maximumAbsoluteChange = 0;
  let changedDirection = false;
  estimates.forEach((estimate) => {
    minimumEstimate = Math.min(minimumEstimate, estimate);
    maximumEstimate = Math.max(maximumEstimate, estimate);
    maximumAbsoluteChange = Math.max(maximumAbsoluteChange, Math.abs(estimate - primary));
    changedDirection ||= !directionConsistent(primary, estimate);
  });
  return {
    evaluatedDeletions: estimates.length,
    minimumEstimate: round(minimumEstimate),
    maximumEstimate: round(maximumEstimate),
    maximumAbsoluteChange: round(maximumAbsoluteChange),
    relativeMaximumChange: Math.abs(primary) <= 1e-12
      ? null
      : round(maximumAbsoluteChange / Math.abs(primary)),
    directionChanged: changedDirection,
    method,
  };
}

function primaryMatches(result: AnalysisMethodResult, recomputed: number, sampleSize: number): void {
  if (
    result.completeSampleSize !== sampleSize
    || Math.abs(result.primaryEstimate.value - round(recomputed, 6)) > 1e-7
  ) {
    throw new Error(
      `${result.researchQuestionId}: The verified Phase 8.4 primary estimate does not match the selected derived rows.`,
    );
  }
}

function alternative(
  id: string,
  label: string,
  estimate: number | null,
  method: string,
  interval: RobustnessAlternativeEstimate["interval"] = null,
): RobustnessAlternativeEstimate {
  const roundedEstimate = estimate === null ? null : round(estimate);
  return {
    id,
    label,
    estimate: roundedEstimate,
    formatted: formatNumber(roundedEstimate),
    method,
    interval: interval
      ? {
        ...interval,
        lower: round(interval.lower),
        upper: round(interval.upper),
      }
      : null,
  };
}

function commonResult(
  result: AnalysisMethodResult,
  alternatives: RobustnessAlternativeEstimate[],
  influence: RobustnessInfluenceSummary | null,
  comparisonStatus: RobustnessComparisonStatus,
  comparisonNote: string,
  diagnostics: string[],
  limitations: string[],
): RobustnessAnalysisResult {
  const alternateRequiresAttention = comparisonStatus === "direction-different"
    || comparisonStatus === "interval-boundary-different";
  const influenceRequiresAttention = Boolean(
    influence
    && (
      influence.directionChanged
      || (influence.relativeMaximumChange !== null && influence.relativeMaximumChange >= 0.25)
    ),
  );
  return {
    analysisId: result.analysisId,
    researchQuestionId: result.researchQuestionId,
    researchQuestion: result.researchQuestion,
    methodId: result.methodId,
    methodLabel: result.methodLabel,
    outcomeVariable: result.outcomeVariable,
    predictorVariable: result.predictorVariable,
    completeSampleSize: result.completeSampleSize,
    primaryEstimate: {
      id: result.primaryEstimate.id,
      label: result.primaryEstimate.label,
      value: result.primaryEstimate.value,
      formatted: result.primaryEstimate.formatted,
      interval: {
        level: result.interval.level,
        lower: result.interval.lower,
        upper: result.interval.upper,
        method: result.interval.method,
      },
    },
    alternatives,
    influence,
    comparisonStatus,
    requiresAttention: alternateRequiresAttention || influenceRequiresAttention,
    comparisonNote,
    diagnostics,
    limitations,
  };
}

function descriptiveRobustness(
  rows: PreparedResponseRow[],
  result: AnalysisMethodResult,
): RobustnessAnalysisResult {
  const values = numericValues(rows, result.outcomeVariable);
  const primary = mean(values);
  primaryMatches(result, primary, values.length);
  const medianEstimate = median(values);
  const trimmed = trimmedMean(values);
  const comparisonEstimate = trimmed ?? medianEstimate;
  const relative = relativeDifference(primary, comparisonEstimate);
  const consistent = directionConsistent(primary, comparisonEstimate);
  const influence = leaveOneOutMean(values, primary);
  return commonResult(
    result,
    [
      alternative(
        "median-center",
        "Median",
        medianEstimate,
        "Observed median of the same complete values.",
      ),
      alternative(
        "trimmed-mean-20",
        "20% trimmed mean",
        trimmed,
        "Equal trimming from both tails after sorting; no row is deleted from the source.",
      ),
    ],
    influence,
    consistent ? "direction-consistent" : "direction-different",
    relative === null
      ? "The primary mean is near zero; assess absolute rather than relative center differences."
      : `The selected robust center differs from the primary mean by ${formatNumber(relative * 100)}%.`,
    [
      "The primary mean was independently recomputed from the selected derived rows.",
      "Median and trimmed mean are descriptive center comparisons, not inferential replacements.",
    ],
    [
      "These checks do not test independence, sampling validity, or missing-data assumptions.",
      "The trimmed mean changes the estimand and must be interpreted as a sensitivity comparison.",
    ],
  );
}

function correlationRobustness(
  rows: PreparedResponseRow[],
  result: AnalysisMethodResult,
): RobustnessAnalysisResult {
  const pairs = numericPairs(rows, result.predictorVariable, result.outcomeVariable);
  const primary = pearson(pairs.x, pairs.y);
  if (primary === null) throw new Error(`${result.researchQuestionId}: Pearson r is not estimable.`);
  primaryMatches(result, primary, pairs.x.length);
  const rank = spearman(pairs.x, pairs.y);
  const influence = leaveOneOutPearson(pairs.x, pairs.y, primary);
  const consistent = rank !== null && directionConsistent(primary, rank);
  return commonResult(
    result,
    [
      alternative(
        "spearman-rank-correlation",
        "Spearman rank correlation",
        rank,
        "Pearson correlation applied to average ranks with deterministic tie handling.",
      ),
    ],
    influence,
    rank === null
      ? "not-estimable"
      : consistent
        ? "direction-consistent"
        : "direction-different",
    rank === null
      ? "The rank comparison is not estimable because at least one ranked variable has zero variance."
      : consistent
        ? "Pearson and Spearman estimates have the same observed direction."
        : "Pearson and Spearman estimates have different observed directions and require explanation.",
    [
      "The primary Pearson coefficient was independently recomputed from the selected complete pairs.",
      "Average ranks are used for tied values.",
    ],
    [
      "Spearman correlation assesses monotonic rank association, not the same linear estimand as Pearson r.",
      "Neither check addresses clustered, repeated, weighted, or causally confounded observations.",
    ],
  );
}

function spearmanRobustness(
  rows: PreparedResponseRow[],
  result: AnalysisMethodResult,
): RobustnessAnalysisResult {
  const pairs = numericPairs(rows, result.predictorVariable, result.outcomeVariable);
  const primary = spearman(pairs.x, pairs.y);
  if (primary === null) throw new Error(`${result.researchQuestionId}: Spearman rho is not estimable.`);
  primaryMatches(result, primary, pairs.x.length);
  const linear = pearson(pairs.x, pairs.y);
  const consistent = linear !== null && directionConsistent(primary, linear);
  return commonResult(
    result,
    [
      alternative(
        "pearson-linear-correlation",
        "Pearson linear correlation",
        linear,
        "Pearson correlation of the same complete numeric pairs without rank transformation.",
      ),
    ],
    null,
    linear === null
      ? "not-estimable"
      : consistent
        ? "direction-consistent"
        : "direction-different",
    linear === null
      ? "The linear comparison is not estimable because at least one raw variable has zero variance."
      : consistent
        ? "Spearman and Pearson estimates have the same observed direction."
        : "Spearman and Pearson estimates have different observed directions and require explanation.",
    [
      "The primary Spearman coefficient was independently recomputed from deterministic average ranks.",
      "The Pearson comparison uses the exact same complete pairs without rank transformation.",
    ],
    [
      "Pearson correlation assesses linear association and is not a replacement for the prespecified monotonic estimand.",
      "This batch does not calculate a rank-specific leave-one-out range; influence, clustered data, and missing-data mechanisms remain external review items.",
    ],
  );
}

function meanDifferenceRobustness(
  rows: PreparedResponseRow[],
  result: AnalysisMethodResult,
): RobustnessAnalysisResult {
  const selection = groupedValues(rows, result.predictorVariable, result.outcomeVariable);
  if (!selection) throw new Error(`${result.researchQuestionId}: Exactly two observed groups are required.`);
  const primary = mean(selection.values[0]) - mean(selection.values[1]);
  const sampleSize = selection.values[0].length + selection.values[1].length;
  primaryMatches(result, primary, sampleSize);
  const medianDifference = median(selection.values[0]) - median(selection.values[1]);
  const firstTrimmed = trimmedMean(selection.values[0]);
  const secondTrimmed = trimmedMean(selection.values[1]);
  const trimmedDifference = firstTrimmed === null || secondTrimmed === null
    ? null
    : firstTrimmed - secondTrimmed;
  const comparisonEstimate = trimmedDifference ?? medianDifference;
  const consistent = directionConsistent(primary, comparisonEstimate);
  const influence = leaveOneOutGroups(selection, primary);
  return commonResult(
    result,
    [
      alternative(
        "group-median-difference",
        `${selection.labels[0]} − ${selection.labels[1]} median difference`,
        medianDifference,
        "Difference between observed group medians in the same deterministic lexical group order.",
      ),
      alternative(
        "group-trimmed-mean-difference",
        `${selection.labels[0]} − ${selection.labels[1]} 20% trimmed-mean difference`,
        trimmedDifference,
        "Difference between equally 20%-trimmed group means; no source row is deleted.",
      ),
    ],
    influence,
    consistent ? "direction-consistent" : "direction-different",
    consistent
      ? "The primary and selected robust-center contrast have the same observed direction."
      : "The primary and selected robust-center contrast have different observed directions.",
    [
      "The primary raw mean difference was independently recomputed in lexical group order.",
      "Both robust-center contrasts retain the original group labels and complete-case boundary.",
    ],
    [
      "Median and trimmed-mean differences change the estimand and do not replace Welch inference.",
      "These checks do not address dependence, clustering, multiplicity, or missing-data mechanisms.",
    ],
  );
}

function pairedMeanDifferenceRobustness(
  rows: PreparedResponseRow[],
  result: AnalysisMethodResult,
): RobustnessAnalysisResult {
  const pairs = numericPairs(rows, result.predictorVariable, result.outcomeVariable);
  const differences = pairs.y.map((outcome, index) => outcome - pairs.x[index]);
  if (differences.length < 2) {
    throw new Error(`${result.researchQuestionId}: At least two complete pairs are required.`);
  }
  const primary = mean(differences);
  primaryMatches(result, primary, differences.length);
  const medianDifference = median(differences);
  const trimmedDifference = trimmedMean(differences);
  const comparisonEstimate = trimmedDifference ?? medianDifference;
  const consistent = directionConsistent(primary, comparisonEstimate);
  const influence = leaveOneOutMean(differences, primary);
  return commonResult(
    result,
    [
      alternative(
        "paired-median-difference",
        "Median paired difference",
        medianDifference,
        "Observed median of the same complete within-row differences.",
      ),
      alternative(
        "paired-trimmed-mean-difference",
        "20% trimmed paired mean difference",
        trimmedDifference,
        "Equal trimming from both tails of the paired-difference distribution; no source row is deleted.",
      ),
    ],
    influence,
    consistent ? "direction-consistent" : "direction-different",
    consistent
      ? "The primary and selected robust paired-difference centers have the same observed direction."
      : "The primary and selected robust paired-difference centers have different observed directions.",
    [
      "The primary paired mean difference was independently recomputed as outcome minus paired variable within each complete row.",
      "Both alternatives retain the same complete-pair boundary and signed variable order.",
    ],
    [
      "Median and trimmed paired differences change the estimand and do not replace paired Student-t inference.",
      "These checks do not validate pairing, independence across units, carryover, clustering, multiplicity, or missing-data mechanisms.",
    ],
  );
}

function regressionRobustness(
  rows: PreparedResponseRow[],
  result: AnalysisMethodResult,
): RobustnessAnalysisResult {
  const pairs = numericPairs(rows, result.predictorVariable, result.outcomeVariable);
  const primary = regressionSlope(pairs.x, pairs.y);
  if (primary === null) throw new Error(`${result.researchQuestionId}: The OLS slope is not estimable.`);
  primaryMatches(result, primary, pairs.x.length);
  const hc3 = hc3SlopeInterval(pairs.x, pairs.y, result.interval.level);
  const influence = leaveOneOutRegressionSlope(pairs.x, pairs.y, primary);
  const primaryIncludesZero = result.interval.lower <= 0 && result.interval.upper >= 0;
  const hc3IncludesZero = hc3 ? hc3.lower <= 0 && hc3.upper >= 0 : null;
  const boundaryConsistent = hc3IncludesZero !== null && primaryIncludesZero === hc3IncludesZero;
  return commonResult(
    result,
    [
      alternative(
        "hc3-slope-interval",
        "OLS slope with HC3 interval",
        primary,
        "Same OLS slope with an HC3 leverage-adjusted heteroskedasticity-consistent covariance estimate.",
        hc3
          ? {
            level: result.interval.level,
            lower: hc3.lower,
            upper: hc3.upper,
            method: "Two-sided Student-t interval using the HC3 slope standard error.",
          }
          : null,
      ),
    ],
    influence,
    hc3 === null
      ? "not-estimable"
      : boundaryConsistent
        ? "interval-boundary-consistent"
        : "interval-boundary-different",
    hc3 === null
      ? "The HC3 interval is not estimable because leverage leaves an unstable residual adjustment."
      : boundaryConsistent
        ? "The ordinary and HC3 intervals have the same observed zero-inclusion boundary."
        : "The ordinary and HC3 intervals differ in whether zero is included; interpretation requires review.",
    [
      "The primary OLS slope was independently recomputed from the selected complete pairs.",
      "HC3 changes the slope variance estimate, not the fitted slope.",
    ],
    [
      "HC3 does not address nonlinearity, dependence, omitted variables, clustering, or causal identification.",
      "Zero inclusion is an interval description, not a standalone scientific decision.",
    ],
  );
}

export function buildRobustnessAnalysisResults(
  preparedPackage: DataPreparationPackage,
  resultsPackage: AnalysisResultsPackage,
): RobustnessAnalysisResult[] {
  if (
    preparedPackage.integrity.packageChecksum !== resultsPackage.source.packageChecksum
    || preparedPackage.integrity.packageChecksum !== resultsPackage.integrity.sourcePackageChecksum
  ) {
    throw new Error("The selected Phase 8.3 and Phase 8.4 packages do not share the same source checksum.");
  }
  if (resultsPackage.results.length === 0 || resultsPackage.results.length > MAX_ROBUSTNESS_ANALYSES) {
    throw new Error("The aggregate results package has no bounded analysis result to challenge.");
  }
  return resultsPackage.results.map((result) => {
    if (result.methodId === "descriptive-summary") {
      return descriptiveRobustness(preparedPackage.responses, result);
    }
    if (result.methodId === "pearson-correlation") {
      return correlationRobustness(preparedPackage.responses, result);
    }
    if (result.methodId === "spearman-rank-correlation") {
      return spearmanRobustness(preparedPackage.responses, result);
    }
    if (result.methodId === "two-group-mean-difference") {
      return meanDifferenceRobustness(preparedPackage.responses, result);
    }
    if (result.methodId === "paired-samples-mean-difference") {
      return pairedMeanDifferenceRobustness(preparedPackage.responses, result);
    }
    return regressionRobustness(preparedPackage.responses, result);
  });
}

function defaultReviews(execution: AnalysisExecutionDocument): RobustnessAnalysisReview[] {
  return execution.specifications
    .filter((specification) => specification.enabled)
    .map((specification) => ({
      analysisId: specification.id,
      researchQuestionId: specification.researchQuestionId,
      conclusionImpact: "not-reviewed" as const,
      interpretation: "",
      limitations: "",
      acknowledged: false,
    }));
}

function readiness(
  document: Pick<
    AnalysisRobustnessDocument,
    | "reviews"
    | "overallConclusion"
    | "unperformedChecks"
    | "lastRun"
    | "reviewedAt"
    | "exportedAt"
    | "lastExportChecksum"
    | "preparation"
    | "execution"
  >,
): AnalysisRobustnessReadiness {
  if (
    !document.lastRun
    || document.lastRun.preparedPackageChecksum !== document.preparation.packageChecksum
    || document.lastRun.analysisResultsPackageChecksum !== document.execution.packageChecksum
  ) {
    return {
      status: "needs-source",
      issues: ["Select and verify the exact Phase 8.3 and Phase 8.4 packages, then run the bounded checks."],
    };
  }
  const issues: string[] = [];
  document.reviews.forEach((review) => {
    if (review.conclusionImpact === "not-reviewed") {
      issues.push(`${review.researchQuestionId}: classify how the checks affect the primary conclusion.`);
    }
    if (!review.interpretation.trim()) {
      issues.push(`${review.researchQuestionId}: interpret the method-specific comparison.`);
    }
    if (!review.limitations.trim()) {
      issues.push(`${review.researchQuestionId}: record the remaining robustness limitations.`);
    }
    if (!review.acknowledged) {
      issues.push(`${review.researchQuestionId}: acknowledge the reviewed aggregate checks.`);
    }
  });
  if (!document.overallConclusion.trim()) {
    issues.push("Record the overall robustness conclusion.");
  }
  if (!document.unperformedChecks.trim()) {
    issues.push("Record which planned or relevant checks remain unperformed.");
  }
  if (issues.length > 0) return { status: "needs-assessment", issues };
  if (!document.reviewedAt) {
    return {
      status: "needs-review",
      issues: ["Confirm the complete robustness assessment before export."],
    };
  }
  if (!document.exportedAt || !safeChecksum(document.lastExportChecksum)) {
    return {
      status: "needs-export",
      issues: ["Export the aggregate robustness record before continuing."],
    };
  }
  return { status: "ready", issues: [] };
}

export function createAnalysisRobustnessDocument(
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  createdAt = new Date().toISOString(),
): AnalysisRobustnessDocument | null {
  if (
    !preparation.lastRun
    || !execution.lastRun
    || plan.readiness.status !== "ready"
    || preparation.readiness.status !== "ready"
    || execution.readiness.status !== "ready"
    || release.projectId !== plan.projectId
    || release.releaseId !== plan.releaseId
    || release.releaseId !== preparation.releaseId
    || release.releaseId !== execution.releaseId
    || !safeTimestamp(createdAt)
  ) return null;
  const reviews = defaultReviews(execution);
  const document: AnalysisRobustnessDocument = {
    schemaVersion: ANALYSIS_ROBUSTNESS_SCHEMA_VERSION,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum: release.manifest.analysisContractChecksum ?? "",
    analysisPlanUpdatedAt: plan.updatedAt,
    preparation: {
      preparedAt: preparation.lastRun.preparedAt,
      operationFingerprint: preparation.lastRun.operationFingerprint,
      packageChecksum: preparation.lastRun.packageChecksum,
    },
    execution: {
      runAt: execution.lastRun.runAt,
      configurationFingerprint: execution.lastRun.configurationFingerprint,
      resultChecksum: execution.lastRun.resultChecksum,
      packageChecksum: execution.lastRun.packageChecksum,
    },
    createdAt,
    updatedAt: createdAt,
    reviews,
    overallConclusion: "",
    unperformedChecks: "",
    lastRun: null,
    reviewedAt: "",
    exportedAt: "",
    lastExportChecksum: "",
    readiness: {
      status: "needs-source",
      issues: ["Select and verify the exact Phase 8.3 and Phase 8.4 packages, then run the bounded checks."],
    },
    participantDataRetention: "memory-only-never-persisted-or-uploaded",
    scientificClaim:
      "bounded-advisory-robustness-checks-not-validity-certification-or-automatic-analysis-approval",
  };
  return document;
}

function normalizeReview(
  value: unknown,
  expected: RobustnessAnalysisReview,
): RobustnessAnalysisReview | null {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "analysisId",
      "researchQuestionId",
      "conclusionImpact",
      "interpretation",
      "limitations",
      "acknowledged",
    ])
    || value.analysisId !== expected.analysisId
    || value.researchQuestionId !== expected.researchQuestionId
    || ![
      "not-reviewed",
      "unchanged",
      "weakened",
      "strengthened",
      "changed",
      "inconclusive",
    ].includes(value.conclusionImpact as string)
    || !boundedString(value.interpretation)
    || !boundedString(value.limitations)
    || typeof value.acknowledged !== "boolean"
  ) return null;
  return {
    analysisId: expected.analysisId,
    researchQuestionId: expected.researchQuestionId,
    conclusionImpact: value.conclusionImpact as RobustnessConclusionImpact,
    interpretation: cleanText(value.interpretation),
    limitations: cleanText(value.limitations),
    acknowledged: value.acknowledged,
  };
}

function normalizeRun(value: unknown): RobustnessRunReceipt | null {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "runAt",
      "preparedPackageChecksum",
      "analysisResultsPackageChecksum",
      "engineVersion",
      "analysisCount",
      "checkChecksum",
    ])
    || !safeTimestamp(value.runAt)
    || !safeChecksum(value.preparedPackageChecksum)
    || !safeChecksum(value.analysisResultsPackageChecksum)
    || value.engineVersion !== ROBUSTNESS_ENGINE_VERSION
    || !finiteNonNegativeInteger(value.analysisCount)
    || value.analysisCount < 1
    || value.analysisCount > MAX_ROBUSTNESS_ANALYSES
    || !safeChecksum(value.checkChecksum)
  ) return null;
  return value as unknown as RobustnessRunReceipt;
}

export function normalizeAnalysisRobustnessDocument(
  value: unknown,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
): AnalysisRobustnessDocument | null {
  if (
    !preparation.lastRun
    || !execution.lastRun
    || !isRecord(value)
    || !exactKeys(value, [
      "schemaVersion",
      "projectId",
      "releaseId",
      "releaseNumber",
      "releaseChecksum",
      "contractChecksum",
      "analysisPlanUpdatedAt",
      "preparation",
      "execution",
      "createdAt",
      "updatedAt",
      "reviews",
      "overallConclusion",
      "unperformedChecks",
      "lastRun",
      "reviewedAt",
      "exportedAt",
      "lastExportChecksum",
      "readiness",
      "participantDataRetention",
      "scientificClaim",
    ])
    || value.schemaVersion !== ANALYSIS_ROBUSTNESS_SCHEMA_VERSION
    || value.projectId !== release.projectId
    || value.releaseId !== release.releaseId
    || value.releaseNumber !== release.releaseNumber
    || value.releaseChecksum !== release.checksum
    || value.contractChecksum !== release.manifest.analysisContractChecksum
    || value.analysisPlanUpdatedAt !== plan.updatedAt
    || !isRecord(value.preparation)
    || !exactKeys(value.preparation, [
      "preparedAt",
      "operationFingerprint",
      "packageChecksum",
    ])
    || value.preparation.preparedAt !== preparation.lastRun.preparedAt
    || value.preparation.operationFingerprint !== preparation.lastRun.operationFingerprint
    || value.preparation.packageChecksum !== preparation.lastRun.packageChecksum
    || !isRecord(value.execution)
    || !exactKeys(value.execution, [
      "runAt",
      "configurationFingerprint",
      "resultChecksum",
      "packageChecksum",
    ])
    || value.execution.runAt !== execution.lastRun.runAt
    || value.execution.configurationFingerprint !== execution.lastRun.configurationFingerprint
    || value.execution.resultChecksum !== execution.lastRun.resultChecksum
    || value.execution.packageChecksum !== execution.lastRun.packageChecksum
    || !safeTimestamp(value.createdAt)
    || !safeTimestamp(value.updatedAt)
    || !(value.reviewedAt === "" || safeTimestamp(value.reviewedAt))
    || !(value.exportedAt === "" || safeTimestamp(value.exportedAt))
    || !(value.lastExportChecksum === "" || safeChecksum(value.lastExportChecksum))
    || !boundedString(value.overallConclusion)
    || !boundedString(value.unperformedChecks)
    || value.participantDataRetention !== "memory-only-never-persisted-or-uploaded"
    || value.scientificClaim
      !== "bounded-advisory-robustness-checks-not-validity-certification-or-automatic-analysis-approval"
    || !Array.isArray(value.reviews)
  ) return null;
  const expectedReviews = defaultReviews(execution);
  if (
    value.reviews.length !== expectedReviews.length
    || value.reviews.length > MAX_ROBUSTNESS_ANALYSES
  ) return null;
  const reviews = value.reviews.map((candidate, index) => (
    normalizeReview(candidate, expectedReviews[index])
  ));
  if (reviews.some((review) => !review)) return null;
  const lastRun = value.lastRun === null ? null : normalizeRun(value.lastRun);
  if (value.lastRun !== null && !lastRun) return null;
  const normalizedBase = {
    schemaVersion: ANALYSIS_ROBUSTNESS_SCHEMA_VERSION,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum: release.manifest.analysisContractChecksum ?? "",
    analysisPlanUpdatedAt: plan.updatedAt,
    preparation: {
      preparedAt: preparation.lastRun.preparedAt,
      operationFingerprint: preparation.lastRun.operationFingerprint,
      packageChecksum: preparation.lastRun.packageChecksum,
    },
    execution: {
      runAt: execution.lastRun.runAt,
      configurationFingerprint: execution.lastRun.configurationFingerprint,
      resultChecksum: execution.lastRun.resultChecksum,
      packageChecksum: execution.lastRun.packageChecksum,
    },
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    reviews: reviews as RobustnessAnalysisReview[],
    overallConclusion: cleanText(value.overallConclusion),
    unperformedChecks: cleanText(value.unperformedChecks),
    lastRun,
    reviewedAt: value.reviewedAt,
    exportedAt: value.exportedAt,
    lastExportChecksum: value.lastExportChecksum,
    participantDataRetention: "memory-only-never-persisted-or-uploaded" as const,
    scientificClaim:
      "bounded-advisory-robustness-checks-not-validity-certification-or-automatic-analysis-approval" as const,
  };
  const normalized: AnalysisRobustnessDocument = {
    ...normalizedBase,
    readiness: readiness(normalizedBase),
  };
  return safeJsonByteLength(normalized) <= MAX_ANALYSIS_ROBUSTNESS_BYTES
    ? normalized
    : null;
}

export function updateAnalysisRobustnessAssessment(
  document: AnalysisRobustnessDocument,
  update: {
    reviews?: RobustnessAnalysisReview[];
    overallConclusion?: string;
    unperformedChecks?: string;
  },
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  updatedAt = new Date().toISOString(),
): AnalysisRobustnessDocument {
  const candidate = {
    ...document,
    ...update,
    updatedAt,
    reviewedAt: "",
    exportedAt: "",
    lastExportChecksum: "",
  };
  const normalized = normalizeAnalysisRobustnessDocument(
    candidate,
    release,
    plan,
    preparation,
    execution,
  );
  if (!normalized) throw new Error("The robustness assessment failed validation.");
  return normalized;
}

export async function runAnalysisRobustness(
  document: AnalysisRobustnessDocument,
  preparedExport: unknown,
  resultsExport: unknown,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  runAt = new Date().toISOString(),
): Promise<{
  document: AnalysisRobustnessDocument;
  preparedPackage: DataPreparationPackage;
  resultsPackage: AnalysisResultsPackage;
  analyses: RobustnessAnalysisResult[];
}> {
  if (!safeTimestamp(runAt)) throw new Error("The robustness run timestamp is invalid.");
  const normalized = normalizeAnalysisRobustnessDocument(
    document,
    release,
    plan,
    preparation,
    execution,
  );
  if (!normalized) throw new Error("The robustness document is invalid.");
  const [preparedPackage, resultsPackage] = await Promise.all([
    verifyPreparedAnalysisPackage(preparedExport, release, plan, preparation),
    verifyAnalysisResultsPackage(
      resultsExport,
      release,
      plan,
      preparation,
      execution,
    ),
  ]);
  const analyses = buildRobustnessAnalysisResults(preparedPackage, resultsPackage);
  const checkChecksum = await sha256Checksum(analyses);
  const updated = {
    ...normalized,
    updatedAt: runAt,
    lastRun: {
      runAt,
      preparedPackageChecksum: preparedPackage.integrity.packageChecksum,
      analysisResultsPackageChecksum: resultsPackage.integrity.packageChecksum,
      engineVersion: ROBUSTNESS_ENGINE_VERSION,
      analysisCount: analyses.length,
      checkChecksum,
    },
    reviewedAt: "",
    exportedAt: "",
    lastExportChecksum: "",
  };
  if (!normalizeRun(updated.lastRun)) {
    throw new Error("The robustness run receipt fields failed validation.");
  }
  const nextDocument = normalizeAnalysisRobustnessDocument(
    updated,
    release,
    plan,
    preparation,
    execution,
  );
  if (!nextDocument) throw new Error("The robustness run receipt failed validation.");
  return { document: nextDocument, preparedPackage, resultsPackage, analyses };
}

export function markAnalysisRobustnessReviewed(
  document: AnalysisRobustnessDocument,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  reviewedAt = new Date().toISOString(),
): AnalysisRobustnessDocument {
  const normalized = normalizeAnalysisRobustnessDocument(
    document,
    release,
    plan,
    preparation,
    execution,
  );
  if (!normalized || readiness(normalized).status !== "needs-review") {
    throw new Error("Complete every method-specific assessment and remaining-check limitation first.");
  }
  const candidate = {
    ...normalized,
    updatedAt: reviewedAt,
    reviewedAt,
    exportedAt: "",
    lastExportChecksum: "",
  };
  const next = normalizeAnalysisRobustnessDocument(
    candidate,
    release,
    plan,
    preparation,
    execution,
  );
  if (!next) throw new Error("The robustness review could not be recorded.");
  return next;
}

function registryFor(analyses: RobustnessAnalysisResult[]) {
  return [...new Set(analyses.map((analysis) => analysis.methodId))].map((methodId) => ({
    methodId,
    ...ROBUSTNESS_REGISTRY[methodId],
  }));
}

export async function buildRobustnessRecordExport(
  document: AnalysisRobustnessDocument,
  preparedPackage: DataPreparationPackage,
  resultsPackage: AnalysisResultsPackage,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  exportedAt = new Date().toISOString(),
): Promise<{
  document: AnalysisRobustnessDocument;
  export: RobustnessRecordExport;
}> {
  const normalized = normalizeAnalysisRobustnessDocument(
    document,
    release,
    plan,
    preparation,
    execution,
  );
  if (
    !normalized
    || normalized.readiness.status !== "needs-export"
    || !normalized.lastRun
    || !safeTimestamp(exportedAt)
  ) {
    throw new Error("Confirm the reviewed robustness assessment before export.");
  }
  if (
    preparedPackage.integrity.packageChecksum !== normalized.lastRun.preparedPackageChecksum
    || resultsPackage.integrity.packageChecksum
      !== normalized.lastRun.analysisResultsPackageChecksum
  ) {
    throw new Error("Re-select the exact verified Phase 8.3 and Phase 8.4 packages before export.");
  }
  const analyses = buildRobustnessAnalysisResults(preparedPackage, resultsPackage);
  const checkChecksum = await sha256Checksum(analyses);
  if (checkChecksum !== normalized.lastRun.checkChecksum) {
    throw new Error("The deterministic robustness checks changed after review.");
  }
  const reviewPayload = {
    reviews: normalized.reviews,
    overallConclusion: normalized.overallConclusion,
    unperformedChecks: normalized.unperformedChecks,
  };
  const reviewChecksum = await sha256Checksum(reviewPayload);
  const unsignedPackage = {
    packageVersion: ROBUSTNESS_RECORD_PACKAGE_VERSION,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum: release.manifest.analysisContractChecksum ?? "",
    analysisPlanUpdatedAt: plan.updatedAt,
    robustnessRunAt: normalized.lastRun.runAt,
    reviewedAt: normalized.reviewedAt,
    source: {
      preparedAt: preparation.lastRun?.preparedAt ?? "",
      operationFingerprint: preparation.lastRun?.operationFingerprint ?? "",
      preparedPackageChecksum: preparedPackage.integrity.packageChecksum,
      primaryAnalysisRunAt: execution.lastRun?.runAt ?? "",
      primaryConfigurationFingerprint: execution.lastRun?.configurationFingerprint ?? "",
      primaryResultChecksum: resultsPackage.integrity.resultChecksum,
      analysisResultsPackageChecksum: resultsPackage.integrity.packageChecksum,
      inputBoundary:
        "exact-verified-phase-8-3-derived-package-and-phase-8-4-aggregate-results-package" as const,
    },
    registry: registryFor(analyses),
    analyses,
    reviews: normalized.reviews,
    overallConclusion: normalized.overallConclusion,
    unperformedChecks: normalized.unperformedChecks,
    integrity: {
      preparedPackageChecksum: preparedPackage.integrity.packageChecksum,
      analysisResultsPackageChecksum: resultsPackage.integrity.packageChecksum,
      checkChecksum,
      reviewChecksum,
    },
    dataClassification: "aggregate-robustness-output-potentially-sensitive" as const,
    participantRowsIncluded: false as const,
    automaticExclusionsApplied: false as const,
    scientificBoundary:
      "advisory-deterministic-comparisons-require-researcher-judgment-not-proof-of-robustness-validity-or-reproducibility" as const,
  };
  const packageChecksum = await sha256Checksum(unsignedPackage);
  const packageRecord: RobustnessRecordPackage = {
    ...unsignedPackage,
    integrity: {
      ...unsignedPackage.integrity,
      packageChecksum,
    },
  };
  const exportRecord: RobustnessRecordExport = {
    exportType: ROBUSTNESS_RECORD_EXPORT_TYPE,
    exportBoundary: ROBUSTNESS_RECORD_EXPORT_BOUNDARY,
    exportedAt,
    package: packageRecord,
  };
  if (safeJsonByteLength(exportRecord) > MAX_ROBUSTNESS_RECORD_BYTES) {
    throw new Error("The aggregate robustness record exceeds the Phase 8.7A size limit.");
  }
  const updated = {
    ...normalized,
    updatedAt: exportedAt,
    exportedAt,
    lastExportChecksum: packageChecksum,
  };
  const nextDocument = normalizeAnalysisRobustnessDocument(
    updated,
    release,
    plan,
    preparation,
    execution,
  );
  if (!nextDocument || nextDocument.readiness.status !== "ready") {
    throw new Error("The robustness export receipt could not be recorded.");
  }
  return { document: nextDocument, export: exportRecord };
}

function validInterval(value: unknown): boolean {
  return isRecord(value)
    && exactKeys(value, ["level", "lower", "upper", "method"])
    && [0.9, 0.95, 0.99].includes(value.level as number)
    && finiteNumber(value.lower)
    && finiteNumber(value.upper)
    && value.lower <= value.upper
    && boundedString(value.method, 1_000);
}

function validateRobustnessPackageShape(value: unknown): value is RobustnessRecordPackage {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "packageVersion",
      "projectId",
      "releaseId",
      "releaseNumber",
      "releaseChecksum",
      "contractChecksum",
      "analysisPlanUpdatedAt",
      "robustnessRunAt",
      "reviewedAt",
      "source",
      "registry",
      "analyses",
      "reviews",
      "overallConclusion",
      "unperformedChecks",
      "integrity",
      "dataClassification",
      "participantRowsIncluded",
      "automaticExclusionsApplied",
      "scientificBoundary",
    ])
    || value.packageVersion !== ROBUSTNESS_RECORD_PACKAGE_VERSION
    || !safeId(value.projectId)
    || !safeId(value.releaseId)
    || !finiteNonNegativeInteger(value.releaseNumber)
    || !safeChecksum(value.releaseChecksum)
    || !safeChecksum(value.contractChecksum)
    || !safeTimestamp(value.analysisPlanUpdatedAt)
    || !safeTimestamp(value.robustnessRunAt)
    || !safeTimestamp(value.reviewedAt)
    || !Array.isArray(value.registry)
    || value.registry.length > 4
    || !Array.isArray(value.analyses)
    || value.analyses.length < 1
    || value.analyses.length > MAX_ROBUSTNESS_ANALYSES
    || !Array.isArray(value.reviews)
    || value.reviews.length !== value.analyses.length
    || !boundedString(value.overallConclusion)
    || !boundedString(value.unperformedChecks)
    || !isRecord(value.source)
    || !exactKeys(value.source, [
      "preparedAt",
      "operationFingerprint",
      "preparedPackageChecksum",
      "primaryAnalysisRunAt",
      "primaryConfigurationFingerprint",
      "primaryResultChecksum",
      "analysisResultsPackageChecksum",
      "inputBoundary",
    ])
    || !safeTimestamp(value.source.preparedAt)
    || !boundedString(value.source.operationFingerprint, 100)
    || !safeChecksum(value.source.preparedPackageChecksum)
    || !safeTimestamp(value.source.primaryAnalysisRunAt)
    || !boundedString(value.source.primaryConfigurationFingerprint, 100)
    || !safeChecksum(value.source.primaryResultChecksum)
    || !safeChecksum(value.source.analysisResultsPackageChecksum)
    || value.source.inputBoundary
      !== "exact-verified-phase-8-3-derived-package-and-phase-8-4-aggregate-results-package"
    || !isRecord(value.integrity)
    || !exactKeys(value.integrity, [
      "preparedPackageChecksum",
      "analysisResultsPackageChecksum",
      "checkChecksum",
      "reviewChecksum",
      "packageChecksum",
    ])
    || !safeChecksum(value.integrity.preparedPackageChecksum)
    || !safeChecksum(value.integrity.analysisResultsPackageChecksum)
    || !safeChecksum(value.integrity.checkChecksum)
    || !safeChecksum(value.integrity.reviewChecksum)
    || !safeChecksum(value.integrity.packageChecksum)
    || value.dataClassification !== "aggregate-robustness-output-potentially-sensitive"
    || value.participantRowsIncluded !== false
    || value.automaticExclusionsApplied !== false
    || value.scientificBoundary
      !== "advisory-deterministic-comparisons-require-researcher-judgment-not-proof-of-robustness-validity-or-reproducibility"
  ) return false;
  return value.analyses.every((analysis) => {
    if (
      !isRecord(analysis)
      || !safeId(analysis.analysisId)
      || !safeId(analysis.researchQuestionId)
      || !Object.hasOwn(ROBUSTNESS_REGISTRY, analysis.methodId as string)
      || !finiteNonNegativeInteger(analysis.completeSampleSize)
      || !isRecord(analysis.primaryEstimate)
      || !finiteNumber(analysis.primaryEstimate.value)
      || !validInterval(analysis.primaryEstimate.interval)
      || !Array.isArray(analysis.alternatives)
      || analysis.alternatives.length > 3
      || !Array.isArray(analysis.diagnostics)
      || !analysis.diagnostics.every((item) => boundedString(item, 1_000))
      || !Array.isArray(analysis.limitations)
      || !analysis.limitations.every((item) => boundedString(item, 1_000))
    ) return false;
    return analysis.alternatives.every((candidate) => (
      isRecord(candidate)
      && safeId(candidate.id)
      && boundedString(candidate.label, 500)
      && (candidate.estimate === null || finiteNumber(candidate.estimate))
      && boundedString(candidate.formatted, 100)
      && boundedString(candidate.method, 1_000)
      && (candidate.interval === null || validInterval(candidate.interval))
    ));
  });
}

export async function verifyRobustnessRecordExport(
  value: unknown,
  preparedExport: unknown,
  resultsExport: unknown,
  localDocument: AnalysisRobustnessDocument,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
): Promise<RobustnessRecordPackage> {
  if (
    safeJsonByteLength(value) > MAX_ROBUSTNESS_RECORD_BYTES
    || !isRecord(value)
    || !exactKeys(value, ["exportType", "exportBoundary", "exportedAt", "package"])
    || value.exportType !== ROBUSTNESS_RECORD_EXPORT_TYPE
    || value.exportBoundary !== ROBUSTNESS_RECORD_EXPORT_BOUNDARY
    || !safeTimestamp(value.exportedAt)
    || !validateRobustnessPackageShape(value.package)
    || !await verifyExperimentRelease(release)
  ) {
    throw new Error("Select the exported Phase 8.7A aggregate robustness record.");
  }
  const normalizedDocument = normalizeAnalysisRobustnessDocument(
    localDocument,
    release,
    plan,
    preparation,
    execution,
  );
  if (!normalizedDocument || normalizedDocument.readiness.status !== "ready") {
    throw new Error("The local reviewed Phase 8.7A receipt is not ready.");
  }
  const [preparedPackage, resultsPackage] = await Promise.all([
    verifyPreparedAnalysisPackage(preparedExport, release, plan, preparation),
    verifyAnalysisResultsPackage(
      resultsExport,
      release,
      plan,
      preparation,
      execution,
    ),
  ]);
  const candidate = value.package;
  const analyses = buildRobustnessAnalysisResults(preparedPackage, resultsPackage);
  const checkChecksum = await sha256Checksum(analyses);
  const reviewPayload = {
    reviews: normalizedDocument.reviews,
    overallConclusion: normalizedDocument.overallConclusion,
    unperformedChecks: normalizedDocument.unperformedChecks,
  };
  const reviewChecksum = await sha256Checksum(reviewPayload);
  const unsignedPackage = {
    ...candidate,
    integrity: {
      preparedPackageChecksum: candidate.integrity.preparedPackageChecksum,
      analysisResultsPackageChecksum: candidate.integrity.analysisResultsPackageChecksum,
      checkChecksum: candidate.integrity.checkChecksum,
      reviewChecksum: candidate.integrity.reviewChecksum,
    },
  };
  const packageChecksum = await sha256Checksum(unsignedPackage);
  const expectedRegistry = registryFor(analyses);
  if (
    candidate.projectId !== release.projectId
    || candidate.releaseId !== release.releaseId
    || candidate.releaseNumber !== release.releaseNumber
    || candidate.releaseChecksum !== release.checksum
    || candidate.contractChecksum !== release.manifest.analysisContractChecksum
    || candidate.analysisPlanUpdatedAt !== plan.updatedAt
    || candidate.robustnessRunAt !== normalizedDocument.lastRun?.runAt
    || candidate.reviewedAt !== normalizedDocument.reviewedAt
    || candidate.source.preparedAt !== preparation.lastRun?.preparedAt
    || candidate.source.operationFingerprint !== preparation.lastRun?.operationFingerprint
    || candidate.source.preparedPackageChecksum !== preparedPackage.integrity.packageChecksum
    || candidate.source.primaryAnalysisRunAt !== execution.lastRun?.runAt
    || candidate.source.primaryConfigurationFingerprint
      !== execution.lastRun?.configurationFingerprint
    || candidate.source.primaryResultChecksum !== resultsPackage.integrity.resultChecksum
    || candidate.source.analysisResultsPackageChecksum
      !== resultsPackage.integrity.packageChecksum
    || canonicalJson(candidate.registry) !== canonicalJson(expectedRegistry)
    || canonicalJson(candidate.analyses) !== canonicalJson(analyses)
    || canonicalJson(candidate.reviews) !== canonicalJson(normalizedDocument.reviews)
    || candidate.overallConclusion !== normalizedDocument.overallConclusion
    || candidate.unperformedChecks !== normalizedDocument.unperformedChecks
    || candidate.integrity.preparedPackageChecksum !== preparedPackage.integrity.packageChecksum
    || candidate.integrity.analysisResultsPackageChecksum
      !== resultsPackage.integrity.packageChecksum
    || candidate.integrity.checkChecksum !== checkChecksum
    || candidate.integrity.reviewChecksum !== reviewChecksum
    || candidate.integrity.packageChecksum !== packageChecksum
    || normalizedDocument.lastExportChecksum !== packageChecksum
    || value.exportedAt !== normalizedDocument.exportedAt
  ) {
    throw new Error("The robustness record contents or source-chain checksums have changed.");
  }
  return candidate;
}

export function analysisRobustnessStorageKey(projectId: string, releaseId: string): string {
  return `cerise-analysis-robustness:${projectId}:${releaseId}:v${ANALYSIS_ROBUSTNESS_SCHEMA_VERSION}`;
}

export function readAnalysisRobustnessDocument(
  storage: StorageLike,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
): AnalysisRobustnessDocument | null {
  const stored = storage.getItem(analysisRobustnessStorageKey(release.projectId, release.releaseId));
  if (!stored || new TextEncoder().encode(stored).byteLength > MAX_ANALYSIS_ROBUSTNESS_BYTES) {
    return null;
  }
  try {
    return normalizeAnalysisRobustnessDocument(
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

export function writeAnalysisRobustnessDocument(
  storage: StorageLike,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  document: AnalysisRobustnessDocument,
): AnalysisRobustnessDocument {
  const normalized = normalizeAnalysisRobustnessDocument(
    document,
    release,
    plan,
    preparation,
    execution,
  );
  if (!normalized) throw new Error("The robustness document was not saved.");
  storage.setItem(
    analysisRobustnessStorageKey(release.projectId, release.releaseId),
    JSON.stringify(normalized),
  );
  return normalized;
}

export function isAnalysisRobustnessReady(
  document: AnalysisRobustnessDocument | null,
): boolean {
  return Boolean(document && document.readiness.status === "ready");
}

export function robustnessMethodLabel(methodId: AnalysisMethodId): string {
  return ANALYSIS_METHOD_REGISTRY.find((method) => method.id === methodId)?.label ?? methodId;
}
