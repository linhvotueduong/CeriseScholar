import type { AnalysisPlanDocument } from "./analysisPlan";
import type {
  AnalysisDiagnostic,
  AnalysisExecutionSpecification,
  AnalysisMethodResult,
} from "./analysisExecution";
import type {
  ResultsDivergenceRecord,
  ResultsQuestionRecord,
  ResultsRecordPackage,
} from "./analysisResults";
import type {
  RobustnessAnalysisResult,
  RobustnessAnalysisReview,
  RobustnessRecordPackage,
} from "./analysisRobustness";

export const MAX_ANALYSIS_REVIEWER_PROMPT = 1_500;
export const MAX_ANALYSIS_REVIEWER_TEXT = 4_000;
export const MAX_ANALYSIS_REVIEWER_SUGGESTIONS = 12;
export const MAX_ANALYSIS_REVIEWER_EVIDENCE = 24;

export type AnalysisReviewerSuggestionCategory =
  | "rq-analysis-alignment"
  | "variable-or-model-compatibility"
  | "diagnostic-explanation"
  | "sensitivity-analysis"
  | "causal-overclaim"
  | "robustness-comparison"
  | "results-paragraph"
  | "figure-recommendation"
  | "unsupported-analysis";

export type AnalysisReviewerSuggestionPriority =
  | "note"
  | "consider"
  | "important";

export interface AnalysisReviewerEvidenceReference {
  id: string;
  label: string;
}

interface AnalysisReviewerPlanContext {
  id: string;
  wording: string;
  hypothesis: string;
  designation: string;
  estimand: {
    population: string;
    exposureOrIntervention: string;
    comparator: string;
    outcome: string;
    summaryMeasure: string;
    timepoint: string;
  };
  outcomeVariables: string[];
  predictorVariables: string[];
  covariateVariables: string[];
  unitOfAnalysis: string;
  plannedMethod: string;
  effectSize: string;
  missingDataStrategy: string;
  exclusionRules: string[];
  transformations: string[];
  multiplicityStrategy: string;
  sensitivityAnalyses: string[];
}

interface AnalysisReviewerPrimaryContext {
  specification: AnalysisExecutionSpecification;
  result: AnalysisMethodResult;
}

interface AnalysisReviewerInterpretationContext {
  record: ResultsQuestionRecord;
  divergences: ResultsDivergenceRecord[];
}

interface AnalysisReviewerRobustnessContext {
  analysis: RobustnessAnalysisResult;
  review: RobustnessAnalysisReview | null;
}

export interface AnalysisReviewerContext {
  releaseId: string;
  resultsRecordChecksum: string;
  robustnessRecordChecksum: string;
  researchQuestion: AnalysisReviewerPlanContext;
  primaryAnalyses: AnalysisReviewerPrimaryContext[];
  interpretation: AnalysisReviewerInterpretationContext;
  robustnessAnalyses: AnalysisReviewerRobustnessContext[];
  evidenceIndex: AnalysisReviewerEvidenceReference[];
}

export interface AnalysisReviewerRequest {
  projectId: string;
  prompt: string;
  context: AnalysisReviewerContext;
}

export interface AnalysisReviewerSuggestion {
  category: AnalysisReviewerSuggestionCategory;
  priority: AnalysisReviewerSuggestionPriority;
  title: string;
  observation: string;
  evidenceReferences: string[];
  recommendation: string;
  limitation: string;
}

export interface AnalysisReviewerResponse {
  summary: string;
  suggestions: AnalysisReviewerSuggestion[];
}

const SUGGESTION_CATEGORIES: readonly AnalysisReviewerSuggestionCategory[] = [
  "rq-analysis-alignment",
  "variable-or-model-compatibility",
  "diagnostic-explanation",
  "sensitivity-analysis",
  "causal-overclaim",
  "robustness-comparison",
  "results-paragraph",
  "figure-recommendation",
  "unsupported-analysis",
];
const SUGGESTION_PRIORITIES: readonly AnalysisReviewerSuggestionPriority[] = [
  "note",
  "consider",
  "important",
];
const METHOD_IDS = [
  "descriptive-summary",
  "pearson-correlation",
  "spearman-rank-correlation",
  "two-group-mean-difference",
  "paired-samples-mean-difference",
  "simple-linear-regression",
] as const;
const DESIGNATIONS = ["unspecified", "primary", "secondary", "exploratory"] as const;
const CLAIM_STRENGTHS = [
  "not-selected",
  "descriptive",
  "associational",
  "comparative",
  "predictive",
  "causal-requires-external-justification",
] as const;
const ROBUSTNESS_STATUSES = [
  "not-declared",
  "not-performed",
  "performed-outside-cerise",
  "not-applicable-with-rationale",
] as const;
const COMPARISON_STATUSES = [
  "direction-consistent",
  "direction-different",
  "interval-boundary-consistent",
  "interval-boundary-different",
  "not-estimable",
] as const;
const CONCLUSION_IMPACTS = [
  "not-reviewed",
  "unchanged",
  "weakened",
  "strengthened",
  "changed",
  "inconclusive",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeString(value: unknown, maximum = MAX_ANALYSIS_REVIEWER_TEXT): string {
  return typeof value === "string"
    ? value.replace(/\u0000/g, "").trim().slice(0, maximum)
    : "";
}

function safeId(value: unknown): string {
  return safeString(value, 160).replace(/[^A-Za-z0-9._:-]/g, "");
}

function safeChecksum(value: unknown): string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value)
    ? value
    : "";
}

function safeTextList(
  value: unknown,
  maximumItems = MAX_ANALYSIS_REVIEWER_EVIDENCE,
  maximumText = 1_000,
): string[] {
  return Array.isArray(value)
    ? value
      .slice(0, maximumItems)
      .map((item) => safeString(item, maximumText))
      .filter(Boolean)
    : [];
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && allowed.includes(value as T)
    ? value as T
    : null;
}

function safeDiagnostic(value: unknown): AnalysisDiagnostic | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  const severity = enumValue(value.severity, ["pass", "advisory", "blocking"] as const);
  const label = safeString(value.label, 500);
  const detail = safeString(value.detail, 2_000);
  return id && severity && label && detail ? { id, severity, label, detail } : null;
}

function safeMethodResult(value: unknown): AnalysisMethodResult | null {
  if (
    !isRecord(value)
    || !isRecord(value.primaryEstimate)
    || !isRecord(value.interval)
  ) return null;
  const analysisId = safeId(value.analysisId);
  const researchQuestionId = safeId(value.researchQuestionId);
  const methodId = enumValue(value.methodId, METHOD_IDS);
  const planAlignment = enumValue(
    value.planAlignment,
    ["aligned", "deviation-recorded"] as const,
  );
  const completeSampleSize = finiteNumber(value.completeSampleSize);
  const excludedMissingOrInvalid = finiteNumber(value.excludedMissingOrInvalid);
  const estimateValue = finiteNumber(value.primaryEstimate.value);
  const intervalLevel = finiteNumber(value.interval.level);
  const intervalLower = finiteNumber(value.interval.lower);
  const intervalUpper = finiteNumber(value.interval.upper);
  if (
    !analysisId
    || !researchQuestionId
    || !methodId
    || !planAlignment
    || completeSampleSize === null
    || !Number.isInteger(completeSampleSize)
    || completeSampleSize < 0
    || excludedMissingOrInvalid === null
    || !Number.isInteger(excludedMissingOrInvalid)
    || excludedMissingOrInvalid < 0
    || estimateValue === null
    || intervalLevel === null
    || ![0.9, 0.95, 0.99].includes(intervalLevel)
    || intervalLower === null
    || intervalUpper === null
    || intervalLower > intervalUpper
  ) return null;
  const diagnostics = Array.isArray(value.diagnostics)
    ? value.diagnostics
      .slice(0, MAX_ANALYSIS_REVIEWER_EVIDENCE)
      .map(safeDiagnostic)
      .filter((item): item is AnalysisDiagnostic => Boolean(item))
    : [];
  const metrics = Array.isArray(value.metrics)
    ? value.metrics.slice(0, MAX_ANALYSIS_REVIEWER_EVIDENCE).flatMap((item) => {
      if (!isRecord(item)) return [];
      const metricValue = finiteNumber(item.value);
      const id = safeId(item.id);
      const label = safeString(item.label, 500);
      const formatted = safeString(item.formatted, 500);
      return id && label && formatted && metricValue !== null
        ? [{ id, label, value: metricValue, formatted }]
        : [];
    })
    : [];
  return {
    analysisId,
    researchQuestionId,
    researchQuestion: safeString(value.researchQuestion, 2_000),
    methodId,
    methodLabel: safeString(value.methodLabel, 500),
    outcomeVariable: safeId(value.outcomeVariable),
    predictorVariable: safeId(value.predictorVariable),
    planAlignment,
    completeSampleSize,
    excludedMissingOrInvalid,
    primaryEstimate: {
      id: safeId(value.primaryEstimate.id),
      label: safeString(value.primaryEstimate.label, 500),
      value: estimateValue,
      formatted: safeString(value.primaryEstimate.formatted, 500),
    },
    metrics,
    interval: {
      label: safeString(value.interval.label, 500),
      level: intervalLevel as AnalysisMethodResult["interval"]["level"],
      lower: intervalLower,
      upper: intervalUpper,
      method: safeString(value.interval.method, 1_000),
    },
    diagnostics,
    assumptions: safeTextList(value.assumptions),
    computationNotes: safeTextList(value.computationNotes),
  };
}

function safeSpecification(value: unknown): AnalysisExecutionSpecification | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  const researchQuestionId = safeId(value.researchQuestionId);
  const methodId = enumValue(value.methodId, [...METHOD_IDS, "not-selected"] as const);
  const confidenceLevel = finiteNumber(value.confidenceLevel);
  if (
    !id
    || !researchQuestionId
    || !methodId
    || typeof value.enabled !== "boolean"
    || confidenceLevel === null
    || ![0.9, 0.95, 0.99].includes(confidenceLevel)
  ) return null;
  return {
    id,
    researchQuestionId,
    enabled: value.enabled,
    methodId,
    outcomeVariable: safeId(value.outcomeVariable),
    predictorVariable: safeId(value.predictorVariable),
    confidenceLevel: confidenceLevel as AnalysisExecutionSpecification["confidenceLevel"],
    deviationRationale: safeString(value.deviationRationale, 2_000),
  };
}

function safeQuestionRecord(value: unknown): ResultsQuestionRecord | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  const researchQuestionId = safeId(value.researchQuestionId);
  const designation = enumValue(value.designation, DESIGNATIONS);
  const claimStrength = enumValue(value.claimStrength, CLAIM_STRENGTHS);
  const robustnessStatus = enumValue(value.robustnessStatus, ROBUSTNESS_STATUSES);
  if (
    !id
    || !researchQuestionId
    || !designation
    || !claimStrength
    || !robustnessStatus
  ) return null;
  const diagnosticResponses = Array.isArray(value.diagnosticResponses)
    ? value.diagnosticResponses.slice(0, MAX_ANALYSIS_REVIEWER_EVIDENCE).flatMap((item) => (
      isRecord(item)
        ? [{
            diagnosticId: safeId(item.diagnosticId),
            label: safeString(item.label, 500),
            severity: "advisory" as const,
            note: safeString(item.note, 2_000),
          }]
        : []
    ))
    : [];
  return {
    id,
    researchQuestionId,
    researchQuestion: safeString(value.researchQuestion, 2_000),
    designation,
    linkedResultIds: safeTextList(value.linkedResultIds).map(safeId).filter(Boolean),
    directAnswer: safeString(value.directAnswer),
    statisticalMeaning: safeString(value.statisticalMeaning),
    practicalMeaning: safeString(value.practicalMeaning),
    claim: safeString(value.claim),
    claimStrength,
    causalJustification: safeString(value.causalJustification),
    limitations: safeString(value.limitations),
    robustnessStatus,
    robustnessEvidence: safeString(value.robustnessEvidence),
    unexpectedFinding: safeString(value.unexpectedFinding),
    diagnosticResponses,
    tableTitle: safeString(value.tableTitle, 500),
    tableCaption: safeString(value.tableCaption),
    figureTitle: safeString(value.figureTitle, 500),
    figureCaption: safeString(value.figureCaption),
    tableApproved: value.tableApproved === true,
    figureApproved: value.figureApproved === true,
    researcherConfirmed: value.researcherConfirmed === true,
  };
}

function safeDivergence(value: unknown): ResultsDivergenceRecord | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  const researchQuestionId = safeId(value.researchQuestionId);
  if (!id || !researchQuestionId) return null;
  return {
    id,
    researchQuestionId,
    source: value.source === "phase-8-4-execution"
      ? "phase-8-4-execution"
      : "researcher-authored",
    summary: safeString(value.summary, 2_000),
    rationale: safeString(value.rationale, 2_000),
    impact: safeString(value.impact, 2_000),
    acknowledged: value.acknowledged === true,
  };
}

function safeRobustnessAnalysis(value: unknown): RobustnessAnalysisResult | null {
  if (
    !isRecord(value)
    || !isRecord(value.primaryEstimate)
    || !isRecord(value.primaryEstimate.interval)
  ) return null;
  const analysisId = safeId(value.analysisId);
  const researchQuestionId = safeId(value.researchQuestionId);
  const methodId = enumValue(value.methodId, METHOD_IDS);
  const comparisonStatus = enumValue(value.comparisonStatus, COMPARISON_STATUSES);
  const primaryValue = finiteNumber(value.primaryEstimate.value);
  const lower = finiteNumber(value.primaryEstimate.interval.lower);
  const upper = finiteNumber(value.primaryEstimate.interval.upper);
  const level = finiteNumber(value.primaryEstimate.interval.level);
  const completeSampleSize = finiteNumber(value.completeSampleSize);
  if (
    !analysisId
    || !researchQuestionId
    || !methodId
    || !comparisonStatus
    || primaryValue === null
    || lower === null
    || upper === null
    || lower > upper
    || level === null
    || ![0.9, 0.95, 0.99].includes(level)
    || completeSampleSize === null
    || !Number.isInteger(completeSampleSize)
    || completeSampleSize < 0
  ) return null;
  const alternatives = Array.isArray(value.alternatives)
    ? value.alternatives.slice(0, 6).flatMap((item) => {
      if (!isRecord(item)) return [];
      const estimate = item.estimate === null ? null : finiteNumber(item.estimate);
      let interval: RobustnessAnalysisResult["alternatives"][number]["interval"] = null;
      if (isRecord(item.interval)) {
        const intervalLevel = finiteNumber(item.interval.level);
        const intervalLower = finiteNumber(item.interval.lower);
        const intervalUpper = finiteNumber(item.interval.upper);
        if (
          intervalLevel !== null
          && [0.9, 0.95, 0.99].includes(intervalLevel)
          && intervalLower !== null
          && intervalUpper !== null
          && intervalLower <= intervalUpper
        ) {
          interval = {
            level: intervalLevel,
            lower: intervalLower,
            upper: intervalUpper,
            method: safeString(item.interval.method, 1_000),
          };
        }
      }
      return estimate === null && item.estimate !== null
        ? []
        : [{
            id: safeId(item.id),
            label: safeString(item.label, 500),
            estimate,
            formatted: safeString(item.formatted, 500),
            method: safeString(item.method, 1_000),
            interval,
          }];
    })
    : [];
  let influence: RobustnessAnalysisResult["influence"] = null;
  if (value.influence !== null && value.influence !== undefined) {
    if (!isRecord(value.influence)) return null;
    const evaluatedDeletions = finiteNumber(value.influence.evaluatedDeletions);
    const minimumEstimate = finiteNumber(value.influence.minimumEstimate);
    const maximumEstimate = finiteNumber(value.influence.maximumEstimate);
    const maximumAbsoluteChange = finiteNumber(value.influence.maximumAbsoluteChange);
    const relativeMaximumChange = value.influence.relativeMaximumChange === null
      ? null
      : finiteNumber(value.influence.relativeMaximumChange);
    if (
      evaluatedDeletions === null
      || !Number.isInteger(evaluatedDeletions)
      || evaluatedDeletions < 0
      || minimumEstimate === null
      || maximumEstimate === null
      || maximumAbsoluteChange === null
      || relativeMaximumChange === null
        && value.influence.relativeMaximumChange !== null
      || typeof value.influence.directionChanged !== "boolean"
    ) return null;
    influence = {
      evaluatedDeletions,
      minimumEstimate,
      maximumEstimate,
      maximumAbsoluteChange,
      relativeMaximumChange,
      directionChanged: value.influence.directionChanged,
      method: safeString(value.influence.method, 1_000),
    };
  }
  return {
    analysisId,
    researchQuestionId,
    researchQuestion: safeString(value.researchQuestion, 2_000),
    methodId,
    methodLabel: safeString(value.methodLabel, 500),
    outcomeVariable: safeId(value.outcomeVariable),
    predictorVariable: safeId(value.predictorVariable),
    completeSampleSize,
    primaryEstimate: {
      id: safeId(value.primaryEstimate.id),
      label: safeString(value.primaryEstimate.label, 500),
      value: primaryValue,
      formatted: safeString(value.primaryEstimate.formatted, 500),
      interval: {
        level,
        lower,
        upper,
        method: safeString(value.primaryEstimate.interval.method, 1_000),
      },
    },
    alternatives,
    influence,
    comparisonStatus,
    requiresAttention: value.requiresAttention === true,
    comparisonNote: safeString(value.comparisonNote, 2_000),
    diagnostics: safeTextList(value.diagnostics),
    limitations: safeTextList(value.limitations),
  };
}

function safeRobustnessReview(value: unknown): RobustnessAnalysisReview | null {
  if (!isRecord(value)) return null;
  const analysisId = safeId(value.analysisId);
  const researchQuestionId = safeId(value.researchQuestionId);
  const conclusionImpact = enumValue(value.conclusionImpact, CONCLUSION_IMPACTS);
  if (!analysisId || !researchQuestionId || !conclusionImpact) return null;
  return {
    analysisId,
    researchQuestionId,
    conclusionImpact,
    interpretation: safeString(value.interpretation),
    limitations: safeString(value.limitations),
    acknowledged: value.acknowledged === true,
  };
}

export function createAnalysisReviewerContext(
  plan: AnalysisPlanDocument,
  resultsRecord: ResultsRecordPackage,
  robustnessRecord: RobustnessRecordPackage,
  researchQuestionId: string,
): AnalysisReviewerContext | null {
  const question = plan.researchQuestions.find((item) => item.id === researchQuestionId);
  const record = resultsRecord.interpretation.researchQuestions.find(
    (item) => item.researchQuestionId === researchQuestionId,
  );
  const results = resultsRecord.aggregateAnalysis.results.filter(
    (item) => item.researchQuestionId === researchQuestionId,
  );
  if (!question || !record || results.length === 0) return null;

  const specifications = resultsRecord.aggregateAnalysis.specifications;
  const primaryAnalyses = results.slice(0, 4).flatMap((result) => {
    const specification = specifications.find((item) => item.id === result.analysisId)
      ?? specifications.find((item) => item.researchQuestionId === researchQuestionId);
    return specification ? [{ specification, result }] : [];
  });
  if (primaryAnalyses.length === 0) return null;

  const robustnessAnalyses = robustnessRecord.analyses
    .filter((item) => item.researchQuestionId === researchQuestionId)
    .slice(0, 4)
    .map((analysis) => ({
      analysis,
      review: robustnessRecord.reviews.find(
        (item) => item.analysisId === analysis.analysisId,
      ) ?? null,
    }));
  const divergences = resultsRecord.interpretation.divergences
    .filter((item) => item.researchQuestionId === researchQuestionId)
    .slice(0, MAX_ANALYSIS_REVIEWER_EVIDENCE);
  const evidenceIndex: AnalysisReviewerEvidenceReference[] = [
    {
      id: `plan:${question.id}`,
      label: "Frozen analysis-plan research question",
    },
    ...primaryAnalyses.flatMap(({ result }) => [
      {
        id: `result:${result.analysisId}`,
        label: `${result.methodLabel} aggregate result`,
      },
      ...result.diagnostics.map((diagnostic) => ({
        id: `diagnostic:${result.analysisId}:${diagnostic.id}`,
        label: `${diagnostic.label} diagnostic`,
      })),
    ]),
    {
      id: `interpretation:${record.id}`,
      label: "Researcher-approved Results Record interpretation",
    },
    ...divergences.map((item) => ({
      id: `divergence:${item.id}`,
      label: "Recorded plan-to-execution divergence",
    })),
    ...robustnessAnalyses.map(({ analysis }) => ({
      id: `robustness:${analysis.analysisId}`,
      label: `${analysis.methodLabel} robustness comparison`,
    })),
  ].slice(0, MAX_ANALYSIS_REVIEWER_EVIDENCE);

  return {
    releaseId: resultsRecord.releaseId,
    resultsRecordChecksum: resultsRecord.integrity.packageChecksum,
    robustnessRecordChecksum: robustnessRecord.integrity.packageChecksum,
    researchQuestion: {
      id: question.id,
      wording: question.question,
      hypothesis: question.hypothesis,
      designation: question.designation,
      estimand: { ...question.estimand },
      outcomeVariables: [...question.outcomeVariables],
      predictorVariables: [...question.predictorVariables],
      covariateVariables: [...question.covariateVariables],
      unitOfAnalysis: question.unitOfAnalysis,
      plannedMethod: question.plannedMethod,
      effectSize: question.effectSize,
      missingDataStrategy: question.missingDataStrategy,
      exclusionRules: [...question.exclusionRules],
      transformations: [...question.transformations],
      multiplicityStrategy: question.multiplicityStrategy,
      sensitivityAnalyses: [...question.sensitivityAnalyses],
    },
    primaryAnalyses,
    interpretation: { record, divergences },
    robustnessAnalyses,
    evidenceIndex,
  };
}

function normalizeContext(value: unknown): AnalysisReviewerContext | null {
  if (
    !isRecord(value)
    || !isRecord(value.researchQuestion)
    || !isRecord(value.researchQuestion.estimand)
    || !isRecord(value.interpretation)
  ) return null;
  const releaseId = safeId(value.releaseId);
  const resultsRecordChecksum = safeChecksum(value.resultsRecordChecksum);
  const robustnessRecordChecksum = safeChecksum(value.robustnessRecordChecksum);
  const questionId = safeId(value.researchQuestion.id);
  const wording = safeString(value.researchQuestion.wording, 2_000);
  if (
    !releaseId
    || !resultsRecordChecksum
    || !robustnessRecordChecksum
    || !questionId
    || !wording
  ) return null;

  const primaryAnalyses = Array.isArray(value.primaryAnalyses)
    ? value.primaryAnalyses.slice(0, 4).flatMap((item) => {
      if (!isRecord(item)) return [];
      const specification = safeSpecification(item.specification);
      const result = safeMethodResult(item.result);
      return specification && result && result.researchQuestionId === questionId
        ? [{ specification, result }]
        : [];
    })
    : [];
  const record = safeQuestionRecord(value.interpretation.record);
  if (!record || record.researchQuestionId !== questionId || primaryAnalyses.length === 0) {
    return null;
  }
  const divergences = Array.isArray(value.interpretation.divergences)
    ? value.interpretation.divergences
      .slice(0, MAX_ANALYSIS_REVIEWER_EVIDENCE)
      .map(safeDivergence)
      .filter((item): item is ResultsDivergenceRecord => (
        item !== null && item.researchQuestionId === questionId
      ))
    : [];
  const robustnessAnalyses = Array.isArray(value.robustnessAnalyses)
    ? value.robustnessAnalyses.slice(0, 4).flatMap((item) => {
      if (!isRecord(item)) return [];
      const analysis = safeRobustnessAnalysis(item.analysis);
      const review = item.review === null ? null : safeRobustnessReview(item.review);
      return analysis && analysis.researchQuestionId === questionId
        ? [{ analysis, review }]
        : [];
    })
    : [];
  const evidenceIndex = Array.isArray(value.evidenceIndex)
    ? value.evidenceIndex.slice(0, MAX_ANALYSIS_REVIEWER_EVIDENCE).flatMap((item) => {
      if (!isRecord(item)) return [];
      const id = safeString(item.id, 240).replace(/[^A-Za-z0-9._:-]/g, "");
      const label = safeString(item.label, 500);
      return id && label ? [{ id, label }] : [];
    })
    : [];
  if (evidenceIndex.length === 0) return null;

  return {
    releaseId,
    resultsRecordChecksum,
    robustnessRecordChecksum,
    researchQuestion: {
      id: questionId,
      wording,
      hypothesis: safeString(value.researchQuestion.hypothesis, 2_000),
      designation: safeString(value.researchQuestion.designation, 40),
      estimand: {
        population: safeString(value.researchQuestion.estimand.population, 1_000),
        exposureOrIntervention: safeString(
          value.researchQuestion.estimand.exposureOrIntervention,
          1_000,
        ),
        comparator: safeString(value.researchQuestion.estimand.comparator, 1_000),
        outcome: safeString(value.researchQuestion.estimand.outcome, 1_000),
        summaryMeasure: safeString(value.researchQuestion.estimand.summaryMeasure, 1_000),
        timepoint: safeString(value.researchQuestion.estimand.timepoint, 1_000),
      },
      outcomeVariables: safeTextList(value.researchQuestion.outcomeVariables).map(safeId),
      predictorVariables: safeTextList(value.researchQuestion.predictorVariables).map(safeId),
      covariateVariables: safeTextList(value.researchQuestion.covariateVariables).map(safeId),
      unitOfAnalysis: safeString(value.researchQuestion.unitOfAnalysis, 100),
      plannedMethod: safeString(value.researchQuestion.plannedMethod, 1_000),
      effectSize: safeString(value.researchQuestion.effectSize, 1_000),
      missingDataStrategy: safeString(value.researchQuestion.missingDataStrategy, 1_000),
      exclusionRules: safeTextList(value.researchQuestion.exclusionRules),
      transformations: safeTextList(value.researchQuestion.transformations),
      multiplicityStrategy: safeString(value.researchQuestion.multiplicityStrategy, 1_000),
      sensitivityAnalyses: safeTextList(value.researchQuestion.sensitivityAnalyses),
    },
    primaryAnalyses,
    interpretation: { record, divergences },
    robustnessAnalyses,
    evidenceIndex,
  };
}

export function normalizeAnalysisReviewerRequest(
  value: unknown,
): AnalysisReviewerRequest | null {
  if (!isRecord(value)) return null;
  const projectId = safeId(value.projectId);
  const prompt = safeString(value.prompt, MAX_ANALYSIS_REVIEWER_PROMPT);
  const context = normalizeContext(value.context);
  return projectId && prompt && context ? { projectId, prompt, context } : null;
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export function parseAnalysisReviewerResponse(
  raw: string,
  allowedEvidenceIds: readonly string[],
): AnalysisReviewerResponse {
  const parsed = extractJsonObject(raw);
  if (!isRecord(parsed)) {
    return {
      summary: safeString(raw)
        || "The reviewer did not return a structured aggregate-only review.",
      suggestions: [],
    };
  }
  const allowed = new Set(allowedEvidenceIds);
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions
      .slice(0, MAX_ANALYSIS_REVIEWER_SUGGESTIONS)
      .flatMap((item) => {
        if (!isRecord(item)) return [];
        const category = enumValue(item.category, SUGGESTION_CATEGORIES);
        const priority = enumValue(item.priority, SUGGESTION_PRIORITIES);
        const title = safeString(item.title, 500);
        const observation = safeString(item.observation);
        const recommendation = safeString(item.recommendation);
        const limitation = safeString(item.limitation);
        const evidenceReferences = safeTextList(
          item.evidenceReferences,
          MAX_ANALYSIS_REVIEWER_EVIDENCE,
          240,
        ).filter((id) => allowed.has(id));
        if (
          !category
          || !priority
          || !title
          || !observation
          || !recommendation
          || !limitation
          || evidenceReferences.length === 0
        ) return [];
        return [{
          category,
          priority,
          title,
          observation,
          evidenceReferences: [...new Set(evidenceReferences)],
          recommendation,
          limitation,
        }];
      })
    : [];
  return {
    summary: safeString(parsed.summary)
      || "Review each suggestion against the cited aggregate evidence before deciding.",
    suggestions,
  };
}
