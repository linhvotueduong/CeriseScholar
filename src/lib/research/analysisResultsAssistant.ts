import type { AnalysisMethodResult } from "./analysisExecution";
import type { AnalysisPlanResearchQuestion } from "./analysisPlan";
import type {
  ResultsClaimStrength,
  ResultsQuestionRecord,
  ResultsRobustnessStatus,
} from "./analysisResults";

export const MAX_RESULTS_ASSISTANT_PROMPT = 1_500;
export const MAX_RESULTS_ASSISTANT_TEXT = 2_000;
export const MAX_RESULTS_ASSISTANT_LIST = 8;

export interface AnalysisResultsAssistantContext {
  releaseId: string;
  resultChecksum: string;
  researchQuestion: {
    id: string;
    wording: string;
    designation: string;
    plannedMethod: string;
    effectSize: string;
    unitOfAnalysis: string;
    sensitivityPlan: string[];
  };
  aggregateResult: {
    analysisId: string;
    method: string;
    outcome: string;
    predictor: string;
    planAlignment: string;
    completeSampleSize: number;
    excludedMissingOrInvalid: number;
    primaryEstimate: {
      label: string;
      value: number;
      formatted: string;
    };
    interval: {
      level: number;
      lower: number;
      upper: number;
      method: string;
    };
    metrics: Array<{
      label: string;
      value: number;
      formatted: string;
    }>;
    advisories: Array<{
      label: string;
      detail: string;
    }>;
    assumptions: string[];
    computationNotes: string[];
  };
  researcherDraft: {
    directAnswer: string;
    statisticalMeaning: string;
    practicalMeaning: string;
    claim: string;
    claimStrength: ResultsClaimStrength;
    limitations: string;
    robustnessStatus: ResultsRobustnessStatus;
    robustnessEvidence: string;
  };
}

export interface AnalysisResultsAssistantRequest {
  projectId: string;
  prompt: string;
  context: AnalysisResultsAssistantContext;
}

export interface AnalysisResultsAssistantSuggestion {
  directAnswer: string;
  statisticalMeaning: string;
  practicalMeaning: string;
  claim: string;
  claimStrength: Exclude<
    ResultsClaimStrength,
    "not-selected" | "causal-requires-external-justification"
  >;
  limitations: string;
  overclaimWarnings: string[];
  reviewQuestions: string[];
}

export interface AnalysisResultsAssistantResponse {
  reply: string;
  suggestion: AnalysisResultsAssistantSuggestion | null;
}

const NON_CAUSAL_CLAIM_STRENGTHS = [
  "descriptive",
  "associational",
  "comparative",
  "predictive",
] as const;
const CLAIM_STRENGTHS: readonly ResultsClaimStrength[] = [
  "not-selected",
  ...NON_CAUSAL_CLAIM_STRENGTHS,
  "causal-requires-external-justification",
];
const ROBUSTNESS_STATUSES: readonly ResultsRobustnessStatus[] = [
  "not-declared",
  "not-performed",
  "performed-outside-cerise",
  "not-applicable-with-rationale",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeString(value: unknown, maximum = MAX_RESULTS_ASSISTANT_TEXT): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function safeId(value: unknown): string {
  return safeString(value, 120).replace(/[^A-Za-z0-9_-]/g, "");
}

function safeChecksum(value: unknown): string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value) ? value : "";
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeList(value: unknown, maximumLength = 1_000): string[] {
  return Array.isArray(value)
    ? value
      .slice(0, MAX_RESULTS_ASSISTANT_LIST)
      .map((item) => safeString(item, maximumLength))
      .filter(Boolean)
    : [];
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && allowed.includes(value as T)
    ? value as T
    : null;
}

export function createAnalysisResultsAssistantContext(
  releaseId: string,
  resultChecksum: string,
  question: AnalysisPlanResearchQuestion,
  result: AnalysisMethodResult,
  record: ResultsQuestionRecord,
): AnalysisResultsAssistantContext {
  return {
    releaseId: releaseId.slice(0, 120),
    resultChecksum,
    researchQuestion: {
      id: question.id.slice(0, 120),
      wording: question.question.slice(0, 2_000),
      designation: question.designation,
      plannedMethod: question.plannedMethod.slice(0, 1_000),
      effectSize: question.effectSize.slice(0, 1_000),
      unitOfAnalysis: question.unitOfAnalysis,
      sensitivityPlan: question.sensitivityAnalyses.slice(0, MAX_RESULTS_ASSISTANT_LIST)
        .map((item) => item.slice(0, 1_000)),
    },
    aggregateResult: {
      analysisId: result.analysisId.slice(0, 120),
      method: result.methodLabel.slice(0, 500),
      outcome: result.outcomeVariable.slice(0, 120),
      predictor: result.predictorVariable.slice(0, 120),
      planAlignment: result.planAlignment,
      completeSampleSize: result.completeSampleSize,
      excludedMissingOrInvalid: result.excludedMissingOrInvalid,
      primaryEstimate: {
        label: result.primaryEstimate.label.slice(0, 500),
        value: result.primaryEstimate.value,
        formatted: result.primaryEstimate.formatted.slice(0, 500),
      },
      interval: {
        level: result.interval.level,
        lower: result.interval.lower,
        upper: result.interval.upper,
        method: result.interval.method.slice(0, 500),
      },
      metrics: result.metrics.slice(0, MAX_RESULTS_ASSISTANT_LIST).map((metric) => ({
        label: metric.label.slice(0, 500),
        value: metric.value,
        formatted: metric.formatted.slice(0, 500),
      })),
      advisories: result.diagnostics
        .filter((diagnostic) => diagnostic.severity === "advisory")
        .slice(0, MAX_RESULTS_ASSISTANT_LIST)
        .map((diagnostic) => ({
          label: diagnostic.label.slice(0, 500),
          detail: diagnostic.detail.slice(0, 2_000),
        })),
      assumptions: result.assumptions.slice(0, MAX_RESULTS_ASSISTANT_LIST)
        .map((item) => item.slice(0, 1_000)),
      computationNotes: result.computationNotes.slice(0, MAX_RESULTS_ASSISTANT_LIST)
        .map((item) => item.slice(0, 1_000)),
    },
    researcherDraft: {
      directAnswer: record.directAnswer.slice(0, MAX_RESULTS_ASSISTANT_TEXT),
      statisticalMeaning: record.statisticalMeaning.slice(0, MAX_RESULTS_ASSISTANT_TEXT),
      practicalMeaning: record.practicalMeaning.slice(0, MAX_RESULTS_ASSISTANT_TEXT),
      claim: record.claim.slice(0, MAX_RESULTS_ASSISTANT_TEXT),
      claimStrength: record.claimStrength,
      limitations: record.limitations.slice(0, MAX_RESULTS_ASSISTANT_TEXT),
      robustnessStatus: record.robustnessStatus,
      robustnessEvidence: record.robustnessEvidence.slice(0, MAX_RESULTS_ASSISTANT_TEXT),
    },
  };
}

function normalizeContext(value: unknown): AnalysisResultsAssistantContext | null {
  if (
    !isRecord(value)
    || !isRecord(value.researchQuestion)
    || !isRecord(value.aggregateResult)
    || !isRecord(value.aggregateResult.primaryEstimate)
    || !isRecord(value.aggregateResult.interval)
    || !isRecord(value.researcherDraft)
  ) return null;
  const releaseId = safeId(value.releaseId);
  const resultChecksum = safeChecksum(value.resultChecksum);
  const questionId = safeId(value.researchQuestion.id);
  const wording = safeString(value.researchQuestion.wording);
  const analysisId = safeId(value.aggregateResult.analysisId);
  const completeSampleSize = finiteNumber(value.aggregateResult.completeSampleSize);
  const excluded = finiteNumber(value.aggregateResult.excludedMissingOrInvalid);
  const estimateValue = finiteNumber(value.aggregateResult.primaryEstimate.value);
  const intervalLevel = finiteNumber(value.aggregateResult.interval.level);
  const lower = finiteNumber(value.aggregateResult.interval.lower);
  const upper = finiteNumber(value.aggregateResult.interval.upper);
  const claimStrength = enumValue(value.researcherDraft.claimStrength, CLAIM_STRENGTHS);
  const robustnessStatus = enumValue(
    value.researcherDraft.robustnessStatus,
    ROBUSTNESS_STATUSES,
  );
  if (
    !releaseId
    || !resultChecksum
    || !questionId
    || !wording
    || !analysisId
    || completeSampleSize === null
    || !Number.isInteger(completeSampleSize)
    || completeSampleSize < 0
    || excluded === null
    || !Number.isInteger(excluded)
    || excluded < 0
    || estimateValue === null
    || intervalLevel === null
    || ![0.9, 0.95, 0.99].includes(intervalLevel)
    || lower === null
    || upper === null
    || lower > upper
    || !claimStrength
    || !robustnessStatus
  ) return null;
  const rawMetrics = Array.isArray(value.aggregateResult.metrics)
    ? value.aggregateResult.metrics
    : [];
  const metrics = rawMetrics.slice(0, MAX_RESULTS_ASSISTANT_LIST).flatMap((metric) => {
    if (!isRecord(metric)) return [];
    const metricValue = finiteNumber(metric.value);
    if (metricValue === null) return [];
    return [{
      label: safeString(metric.label, 500),
      value: metricValue,
      formatted: safeString(metric.formatted, 500),
    }];
  });
  const rawAdvisories = Array.isArray(value.aggregateResult.advisories)
    ? value.aggregateResult.advisories
    : [];
  const advisories = rawAdvisories.slice(0, MAX_RESULTS_ASSISTANT_LIST).flatMap((item) => (
    isRecord(item)
      ? [{
          label: safeString(item.label, 500),
          detail: safeString(item.detail),
        }]
      : []
  ));
  return {
    releaseId,
    resultChecksum,
    researchQuestion: {
      id: questionId,
      wording,
      designation: safeString(value.researchQuestion.designation, 40),
      plannedMethod: safeString(value.researchQuestion.plannedMethod, 1_000),
      effectSize: safeString(value.researchQuestion.effectSize, 1_000),
      unitOfAnalysis: safeString(value.researchQuestion.unitOfAnalysis, 100),
      sensitivityPlan: safeList(value.researchQuestion.sensitivityPlan),
    },
    aggregateResult: {
      analysisId,
      method: safeString(value.aggregateResult.method, 500),
      outcome: safeString(value.aggregateResult.outcome, 120),
      predictor: safeString(value.aggregateResult.predictor, 120),
      planAlignment: safeString(value.aggregateResult.planAlignment, 40),
      completeSampleSize,
      excludedMissingOrInvalid: excluded,
      primaryEstimate: {
        label: safeString(value.aggregateResult.primaryEstimate.label, 500),
        value: estimateValue,
        formatted: safeString(value.aggregateResult.primaryEstimate.formatted, 500),
      },
      interval: {
        level: intervalLevel,
        lower,
        upper,
        method: safeString(value.aggregateResult.interval.method, 500),
      },
      metrics,
      advisories,
      assumptions: safeList(value.aggregateResult.assumptions),
      computationNotes: safeList(value.aggregateResult.computationNotes),
    },
    researcherDraft: {
      directAnswer: safeString(value.researcherDraft.directAnswer),
      statisticalMeaning: safeString(value.researcherDraft.statisticalMeaning),
      practicalMeaning: safeString(value.researcherDraft.practicalMeaning),
      claim: safeString(value.researcherDraft.claim),
      claimStrength,
      limitations: safeString(value.researcherDraft.limitations),
      robustnessStatus,
      robustnessEvidence: safeString(value.researcherDraft.robustnessEvidence),
    },
  };
}

export function normalizeAnalysisResultsAssistantRequest(
  value: unknown,
): AnalysisResultsAssistantRequest | null {
  if (!isRecord(value)) return null;
  const projectId = safeId(value.projectId);
  const prompt = safeString(value.prompt, MAX_RESULTS_ASSISTANT_PROMPT);
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

export function parseAnalysisResultsAssistantResponse(
  raw: string,
): AnalysisResultsAssistantResponse {
  const parsed = extractJsonObject(raw);
  if (!isRecord(parsed)) {
    return {
      reply: safeString(raw) || "The assistant did not return a structured interpretation review.",
      suggestion: null,
    };
  }
  const reply = safeString(parsed.reply)
    || "Review the draft suggestion carefully against the exact aggregate result.";
  if (!isRecord(parsed.suggestion)) return { reply, suggestion: null };
  const claimStrength = enumValue(
    parsed.suggestion.claimStrength,
    NON_CAUSAL_CLAIM_STRENGTHS,
  );
  const suggestion = {
    directAnswer: safeString(parsed.suggestion.directAnswer),
    statisticalMeaning: safeString(parsed.suggestion.statisticalMeaning),
    practicalMeaning: safeString(parsed.suggestion.practicalMeaning),
    claim: safeString(parsed.suggestion.claim),
    claimStrength,
    limitations: safeString(parsed.suggestion.limitations),
    overclaimWarnings: safeList(parsed.suggestion.overclaimWarnings, 500),
    reviewQuestions: safeList(parsed.suggestion.reviewQuestions, 500),
  };
  if (
    !suggestion.directAnswer
    || !suggestion.statisticalMeaning
    || !suggestion.practicalMeaning
    || !suggestion.claim
    || !suggestion.claimStrength
    || !suggestion.limitations
  ) return { reply, suggestion: null };
  return {
    reply,
    suggestion: suggestion as AnalysisResultsAssistantSuggestion,
  };
}
