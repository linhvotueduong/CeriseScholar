import type { AnalysisExecutionDocument } from "./analysisExecution";
import type { AnalysisPlanDocument } from "./analysisPlan";
import type { DataPreparationDocument } from "./dataPreparation";
import {
  canonicalJson,
  sha256Checksum,
  type ExperimentRelease,
} from "./experimentRelease";
import type {
  AnalysisInterpretationDocument,
  ResultsRecordPackage,
} from "./analysisResults";
import type {
  AnalysisRobustnessDocument,
  RobustnessRecordPackage,
} from "./analysisRobustness";
import {
  MAX_ANALYSIS_REVIEWER_SUGGESTIONS,
  MAX_ANALYSIS_REVIEWER_TEXT,
  type AnalysisReviewerResponse,
  type AnalysisReviewerSuggestion,
  type AnalysisReviewerSuggestionCategory,
  type AnalysisReviewerSuggestionPriority,
} from "./analysisReviewerAssistant";

export const ANALYSIS_REVIEWER_SCHEMA_VERSION = 1 as const;
export const ANALYSIS_REVIEW_PACKAGE_VERSION = 1 as const;
export const ANALYSIS_REVIEW_EXPORT_TYPE = "cerise-ai-analysis-review-package" as const;
export const ANALYSIS_REVIEW_EXPORT_BOUNDARY =
  "aggregate-only-ai-review-decision-ledger-no-participant-rows-no-upstream-mutations" as const;
export const MAX_ANALYSIS_REVIEWER_DOCUMENT_BYTES = 1024 * 1024;
export const MAX_ANALYSIS_REVIEW_EXPORT_BYTES = 2 * 1024 * 1024;
export const MAX_ANALYSIS_REVIEW_BATCHES = 48;
export const MAX_ANALYSIS_REVIEW_DECISIONS = 256;

export type AnalysisReviewerDecision = "pending" | "accepted" | "declined";

export interface AnalysisReviewerSource {
  resultsRecordChecksum: string;
  resultsRecordCreatedAt: string;
  primaryResultChecksum: string;
  robustnessRecordChecksum: string;
  robustnessRecordExportedAt: string;
  robustnessCheckChecksum: string;
  inputBoundary:
    "verified-phase-8-5-results-record-and-phase-8-7a-aggregate-robustness-record";
}

export interface AnalysisReviewerSuggestionRecord extends AnalysisReviewerSuggestion {
  id: string;
  batchId: string;
  researchQuestionId: string;
  decision: AnalysisReviewerDecision;
  researcherRationale: string;
  decidedAt: string;
}

export interface AnalysisReviewerBatch {
  id: string;
  researchQuestionId: string;
  generatedAt: string;
  servedModel: string;
  requestChecksum: string;
  responseChecksum: string;
  summary: string;
  suggestionIds: string[];
}

export interface AnalysisReviewerReadiness {
  status:
    | "needs-review"
    | "needs-decisions"
    | "needs-confirmation"
    | "needs-export"
    | "ready";
  issues: string[];
}

export interface AnalysisReviewerDocument {
  schemaVersion: typeof ANALYSIS_REVIEWER_SCHEMA_VERSION;
  projectId: string;
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  contractChecksum: string;
  analysisPlanUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  source: AnalysisReviewerSource;
  reviewScope: string[];
  batches: AnalysisReviewerBatch[];
  suggestions: AnalysisReviewerSuggestionRecord[];
  researcherConclusion: string;
  remainingLimitations: string;
  reviewedAt: string;
  exportedAt: string;
  lastExportChecksum: string;
  readiness: AnalysisReviewerReadiness;
  participantDataBoundary:
    "aggregate-only-no-participant-rows-session-identifiers-media-or-local-source-files";
  upstreamMutationBoundary:
    "ai-suggestions-never-change-plans-exclusions-analyses-results-or-interpretations";
  scientificClaim:
    "researcher-reviewed-ai-advice-not-scientific-validity-causality-or-publication-certification";
}

export interface AnalysisReviewPackage {
  packageVersion: typeof ANALYSIS_REVIEW_PACKAGE_VERSION;
  projectId: string;
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  contractChecksum: string;
  analysisPlanUpdatedAt: string;
  createdAt: string;
  reviewedAt: string;
  source: AnalysisReviewerSource;
  reviewScope: string[];
  decisionLedger: {
    batches: AnalysisReviewerBatch[];
    suggestions: AnalysisReviewerSuggestionRecord[];
    researcherConclusion: string;
    remainingLimitations: string;
  };
  integrity: {
    sourceChecksum: string;
    decisionLedgerChecksum: string;
    packageChecksum: string;
  };
  participantRowsIncluded: false;
  upstreamRecordsChanged: false;
  aiValidityCertification: false;
  scientificBoundary:
    "ai-review-is-advisory-and-requires-documented-researcher-decisions";
}

export interface AnalysisReviewExport {
  exportType: typeof ANALYSIS_REVIEW_EXPORT_TYPE;
  exportBoundary: typeof ANALYSIS_REVIEW_EXPORT_BOUNDARY;
  exportedAt: string;
  package: AnalysisReviewPackage;
}

export interface AnalysisReviewerDependencies {
  release: ExperimentRelease;
  plan: AnalysisPlanDocument;
  preparation: DataPreparationDocument;
  execution: AnalysisExecutionDocument;
  interpretation: AnalysisInterpretationDocument;
  robustness: AnalysisRobustnessDocument;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const CATEGORIES: readonly AnalysisReviewerSuggestionCategory[] = [
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
const PRIORITIES: readonly AnalysisReviewerSuggestionPriority[] = [
  "note",
  "consider",
  "important",
];
const DECISIONS: readonly AnalysisReviewerDecision[] = [
  "pending",
  "accepted",
  "declined",
];

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

function safeChecksum(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function safeId(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 200
    && /^[A-Za-z0-9._:-]+$/.test(value);
}

function safeTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function boundedString(value: unknown, maximum = MAX_ANALYSIS_REVIEWER_TEXT): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function cleanText(value: unknown, maximum = MAX_ANALYSIS_REVIEWER_TEXT): string {
  return typeof value === "string"
    ? value.replace(/\u0000/g, "").trim().slice(0, maximum)
    : "";
}

function parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && allowed.includes(value as T)
    ? value as T
    : null;
}

function dependencyScope(dependencies: AnalysisReviewerDependencies): string[] {
  const resultIds = new Set(
    dependencies.interpretation.researchQuestions.flatMap((question) => (
      question.linkedResultIds.length > 0 ? [question.researchQuestionId] : []
    )),
  );
  return dependencies.plan.researchQuestions
    .map((question) => question.id)
    .filter((id) => resultIds.has(id));
}

function dependenciesReady(dependencies: AnalysisReviewerDependencies): boolean {
  return Boolean(
    dependencies.release.manifest.analysisContractChecksum
    && dependencies.plan.readiness.status === "ready"
    && dependencies.preparation.readiness.status === "ready"
    && dependencies.execution.readiness.status === "ready"
    && dependencies.execution.lastRun
    && dependencies.interpretation.readiness.status === "ready"
    && dependencies.interpretation.exportedAt
    && dependencies.robustness.readiness.status === "ready"
    && dependencies.robustness.lastRun
    && dependencies.robustness.exportedAt
    && dependencies.robustness.lastExportChecksum,
  );
}

function expectedSource(
  dependencies: AnalysisReviewerDependencies,
  resultsRecordChecksum: string,
): AnalysisReviewerSource | null {
  if (
    !dependenciesReady(dependencies)
    || !safeChecksum(resultsRecordChecksum)
    || !dependencies.execution.lastRun
    || !dependencies.robustness.lastRun
  ) return null;
  return {
    resultsRecordChecksum,
    resultsRecordCreatedAt: dependencies.interpretation.exportedAt,
    primaryResultChecksum: dependencies.execution.lastRun.resultChecksum,
    robustnessRecordChecksum: dependencies.robustness.lastExportChecksum,
    robustnessRecordExportedAt: dependencies.robustness.exportedAt,
    robustnessCheckChecksum: dependencies.robustness.lastRun.checkChecksum,
    inputBoundary:
      "verified-phase-8-5-results-record-and-phase-8-7a-aggregate-robustness-record",
  };
}

function parseSource(value: unknown): AnalysisReviewerSource | null {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "resultsRecordChecksum",
      "resultsRecordCreatedAt",
      "primaryResultChecksum",
      "robustnessRecordChecksum",
      "robustnessRecordExportedAt",
      "robustnessCheckChecksum",
      "inputBoundary",
    ])
    || !safeChecksum(value.resultsRecordChecksum)
    || !safeTimestamp(value.resultsRecordCreatedAt)
    || !safeChecksum(value.primaryResultChecksum)
    || !safeChecksum(value.robustnessRecordChecksum)
    || !safeTimestamp(value.robustnessRecordExportedAt)
    || !safeChecksum(value.robustnessCheckChecksum)
    || value.inputBoundary
      !== "verified-phase-8-5-results-record-and-phase-8-7a-aggregate-robustness-record"
  ) return null;
  return value as unknown as AnalysisReviewerSource;
}

function parseBatch(value: unknown): AnalysisReviewerBatch | null {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "id",
      "researchQuestionId",
      "generatedAt",
      "servedModel",
      "requestChecksum",
      "responseChecksum",
      "summary",
      "suggestionIds",
    ])
    || !safeId(value.id)
    || !safeId(value.researchQuestionId)
    || !safeTimestamp(value.generatedAt)
    || !boundedString(value.servedModel, 300)
    || !safeChecksum(value.requestChecksum)
    || !safeChecksum(value.responseChecksum)
    || !boundedString(value.summary)
    || !Array.isArray(value.suggestionIds)
    || value.suggestionIds.length > MAX_ANALYSIS_REVIEWER_SUGGESTIONS
    || !value.suggestionIds.every(safeId)
  ) return null;
  return {
    id: value.id,
    researchQuestionId: value.researchQuestionId,
    generatedAt: value.generatedAt,
    servedModel: cleanText(value.servedModel, 300),
    requestChecksum: value.requestChecksum,
    responseChecksum: value.responseChecksum,
    summary: cleanText(value.summary),
    suggestionIds: [...value.suggestionIds],
  };
}

function parseSuggestion(value: unknown): AnalysisReviewerSuggestionRecord | null {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "id",
      "batchId",
      "researchQuestionId",
      "category",
      "priority",
      "title",
      "observation",
      "evidenceReferences",
      "recommendation",
      "limitation",
      "decision",
      "researcherRationale",
      "decidedAt",
    ])
    || !safeId(value.id)
    || !safeId(value.batchId)
    || !safeId(value.researchQuestionId)
    || !boundedString(value.title, 500)
    || !boundedString(value.observation)
    || !Array.isArray(value.evidenceReferences)
    || value.evidenceReferences.length === 0
    || value.evidenceReferences.length > 24
    || !value.evidenceReferences.every((item) => boundedString(item, 240))
    || !boundedString(value.recommendation)
    || !boundedString(value.limitation)
    || !boundedString(value.researcherRationale)
  ) return null;
  const category = parseEnum(value.category, CATEGORIES);
  const priority = parseEnum(value.priority, PRIORITIES);
  const decision = parseEnum(value.decision, DECISIONS);
  if (!category || !priority || !decision) return null;
  if (
    decision === "pending"
      ? value.decidedAt !== ""
      : !safeTimestamp(value.decidedAt) || !cleanText(value.researcherRationale)
  ) return null;
  return {
    id: value.id,
    batchId: value.batchId,
    researchQuestionId: value.researchQuestionId,
    category,
    priority,
    title: cleanText(value.title, 500),
    observation: cleanText(value.observation),
    evidenceReferences: value.evidenceReferences.map((item) => cleanText(item, 240)),
    recommendation: cleanText(value.recommendation),
    limitation: cleanText(value.limitation),
    decision,
    researcherRationale: cleanText(value.researcherRationale),
    decidedAt: value.decidedAt as string,
  };
}

export function collectAnalysisReviewerReadiness(
  document: Omit<AnalysisReviewerDocument, "readiness"> | AnalysisReviewerDocument,
): AnalysisReviewerReadiness {
  const issues: string[] = [];
  const coveredQuestions = new Set(document.batches.map((batch) => batch.researchQuestionId));
  document.reviewScope.forEach((questionId) => {
    if (!coveredQuestions.has(questionId)) {
      issues.push(`Request an aggregate AI review for research question ${questionId}.`);
    }
  });
  const pendingCount = document.suggestions.filter(
    (suggestion) => suggestion.decision === "pending",
  ).length;
  if (pendingCount > 0) {
    issues.push(`Accept or decline ${pendingCount} remaining AI suggestion(s) with a rationale.`);
  }
  if (!document.researcherConclusion.trim()) {
    issues.push("Record the researcher’s overall conclusion about the AI review.");
  }
  if (!document.remainingLimitations.trim()) {
    issues.push("Record the limitations that remain after the AI review.");
  }
  if (document.reviewScope.length === 0 || document.batches.length === 0) {
    return { status: "needs-review", issues };
  }
  if (document.reviewScope.some((questionId) => !coveredQuestions.has(questionId))) {
    return { status: "needs-review", issues };
  }
  if (pendingCount > 0) return { status: "needs-decisions", issues };
  if (!document.researcherConclusion.trim() || !document.remainingLimitations.trim()) {
    return { status: "needs-confirmation", issues };
  }
  if (!document.reviewedAt) return { status: "needs-confirmation", issues };
  if (!document.exportedAt) {
    return {
      status: "needs-export",
      issues: ["Export the aggregate AI review and decision ledger."],
    };
  }
  return { status: "ready", issues: [] };
}

export function createAnalysisReviewerDocument(
  dependencies: AnalysisReviewerDependencies,
  resultsRecord: ResultsRecordPackage,
  robustnessRecord: RobustnessRecordPackage,
  createdAt = new Date().toISOString(),
): AnalysisReviewerDocument | null {
  const source = expectedSource(dependencies, resultsRecord.integrity.packageChecksum);
  const reviewScope = dependencyScope(dependencies);
  if (
    !source
    || !safeTimestamp(createdAt)
    || reviewScope.length === 0
    || resultsRecord.releaseId !== dependencies.release.releaseId
    || resultsRecord.integrity.packageChecksum !== source.resultsRecordChecksum
    || resultsRecord.createdAt !== source.resultsRecordCreatedAt
    || resultsRecord.source.resultChecksum !== source.primaryResultChecksum
    || robustnessRecord.releaseId !== dependencies.release.releaseId
    || robustnessRecord.integrity.packageChecksum !== source.robustnessRecordChecksum
    || robustnessRecord.integrity.checkChecksum !== source.robustnessCheckChecksum
  ) return null;
  const draft = {
    schemaVersion: ANALYSIS_REVIEWER_SCHEMA_VERSION,
    projectId: dependencies.release.projectId,
    releaseId: dependencies.release.releaseId,
    releaseNumber: dependencies.release.releaseNumber,
    releaseChecksum: dependencies.release.checksum,
    contractChecksum: dependencies.release.manifest.analysisContractChecksum ?? "",
    analysisPlanUpdatedAt: dependencies.plan.updatedAt,
    createdAt,
    updatedAt: createdAt,
    source,
    reviewScope,
    batches: [],
    suggestions: [],
    researcherConclusion: "",
    remainingLimitations: "",
    reviewedAt: "",
    exportedAt: "",
    lastExportChecksum: "",
    participantDataBoundary:
      "aggregate-only-no-participant-rows-session-identifiers-media-or-local-source-files" as const,
    upstreamMutationBoundary:
      "ai-suggestions-never-change-plans-exclusions-analyses-results-or-interpretations" as const,
    scientificClaim:
      "researcher-reviewed-ai-advice-not-scientific-validity-causality-or-publication-certification" as const,
  };
  return {
    ...draft,
    readiness: collectAnalysisReviewerReadiness(draft),
  };
}

export function normalizeAnalysisReviewerDocument(
  value: unknown,
  dependencies: AnalysisReviewerDependencies,
): AnalysisReviewerDocument | null {
  if (
    safeJsonByteLength(value) > MAX_ANALYSIS_REVIEWER_DOCUMENT_BYTES
    || !isRecord(value)
    || value.schemaVersion !== ANALYSIS_REVIEWER_SCHEMA_VERSION
    || value.projectId !== dependencies.release.projectId
    || value.releaseId !== dependencies.release.releaseId
    || value.releaseNumber !== dependencies.release.releaseNumber
    || value.releaseChecksum !== dependencies.release.checksum
    || value.contractChecksum !== dependencies.release.manifest.analysisContractChecksum
    || value.analysisPlanUpdatedAt !== dependencies.plan.updatedAt
    || !safeTimestamp(value.createdAt)
    || !safeTimestamp(value.updatedAt)
    || (value.reviewedAt !== "" && !safeTimestamp(value.reviewedAt))
    || (value.exportedAt !== "" && !safeTimestamp(value.exportedAt))
    || (value.lastExportChecksum !== "" && !safeChecksum(value.lastExportChecksum))
    || !boundedString(value.researcherConclusion)
    || !boundedString(value.remainingLimitations)
    || value.participantDataBoundary
      !== "aggregate-only-no-participant-rows-session-identifiers-media-or-local-source-files"
    || value.upstreamMutationBoundary
      !== "ai-suggestions-never-change-plans-exclusions-analyses-results-or-interpretations"
    || value.scientificClaim
      !== "researcher-reviewed-ai-advice-not-scientific-validity-causality-or-publication-certification"
    || !Array.isArray(value.reviewScope)
    || !Array.isArray(value.batches)
    || value.batches.length > MAX_ANALYSIS_REVIEW_BATCHES
    || !Array.isArray(value.suggestions)
    || value.suggestions.length > MAX_ANALYSIS_REVIEW_DECISIONS
  ) return null;
  const source = parseSource(value.source);
  const expected = source
    ? expectedSource(dependencies, source.resultsRecordChecksum)
    : null;
  const reviewScope = value.reviewScope.filter(safeId);
  if (
    !source
    || !expected
    || canonicalJson(source) !== canonicalJson(expected)
    || canonicalJson(reviewScope) !== canonicalJson(dependencyScope(dependencies))
  ) return null;
  const batches = value.batches.map(parseBatch);
  const suggestions = value.suggestions.map(parseSuggestion);
  if (
    batches.some((item) => !item)
    || suggestions.some((item) => !item)
  ) return null;
  const normalizedBatches = batches as AnalysisReviewerBatch[];
  const normalizedSuggestions = suggestions as AnalysisReviewerSuggestionRecord[];
  const batchIds = new Set(normalizedBatches.map((batch) => batch.id));
  const suggestionIds = new Set(normalizedSuggestions.map((suggestion) => suggestion.id));
  if (
    batchIds.size !== normalizedBatches.length
    || suggestionIds.size !== normalizedSuggestions.length
    || normalizedBatches.some((batch) => (
      !reviewScope.includes(batch.researchQuestionId)
      || batch.suggestionIds.some((id) => !suggestionIds.has(id))
    ))
    || normalizedSuggestions.some((suggestion) => (
      !batchIds.has(suggestion.batchId)
      || !reviewScope.includes(suggestion.researchQuestionId)
    ))
  ) return null;
  const normalized = {
    schemaVersion: ANALYSIS_REVIEWER_SCHEMA_VERSION,
    projectId: value.projectId as string,
    releaseId: value.releaseId as string,
    releaseNumber: value.releaseNumber as number,
    releaseChecksum: value.releaseChecksum as string,
    contractChecksum: value.contractChecksum as string,
    analysisPlanUpdatedAt: value.analysisPlanUpdatedAt as string,
    createdAt: value.createdAt as string,
    updatedAt: value.updatedAt as string,
    source,
    reviewScope,
    batches: normalizedBatches,
    suggestions: normalizedSuggestions,
    researcherConclusion: cleanText(value.researcherConclusion),
    remainingLimitations: cleanText(value.remainingLimitations),
    reviewedAt: value.reviewedAt as string,
    exportedAt: value.exportedAt as string,
    lastExportChecksum: value.lastExportChecksum as string,
    participantDataBoundary:
      "aggregate-only-no-participant-rows-session-identifiers-media-or-local-source-files" as const,
    upstreamMutationBoundary:
      "ai-suggestions-never-change-plans-exclusions-analyses-results-or-interpretations" as const,
    scientificClaim:
      "researcher-reviewed-ai-advice-not-scientific-validity-causality-or-publication-certification" as const,
  };
  const readiness = collectAnalysisReviewerReadiness(normalized);
  if (
    readiness.status === "ready"
    && (!normalized.lastExportChecksum || !normalized.exportedAt)
  ) return null;
  return { ...normalized, readiness };
}

export async function recordAnalysisReviewerBatch(
  document: AnalysisReviewerDocument,
  response: AnalysisReviewerResponse,
  researchQuestionId: string,
  servedModel: string,
  requestChecksum: string,
  dependencies: AnalysisReviewerDependencies,
  generatedAt = new Date().toISOString(),
): Promise<AnalysisReviewerDocument> {
  const normalized = normalizeAnalysisReviewerDocument(document, dependencies);
  if (
    !normalized
    || !normalized.reviewScope.includes(researchQuestionId)
    || !safeChecksum(requestChecksum)
    || !safeTimestamp(generatedAt)
    || normalized.batches.length >= MAX_ANALYSIS_REVIEW_BATCHES
  ) throw new Error("The aggregate AI review batch could not be recorded.");
  const safeResponse: AnalysisReviewerResponse = {
    summary: cleanText(response.summary),
    suggestions: response.suggestions.slice(0, MAX_ANALYSIS_REVIEWER_SUGGESTIONS),
  };
  const responseChecksum = await sha256Checksum(safeResponse);
  const batchId = `review-${responseChecksum.slice(7, 23)}-${normalized.batches.length + 1}`;
  const suggestionRecords = safeResponse.suggestions.map((suggestion, index) => ({
    ...suggestion,
    id: `${batchId}-suggestion-${index + 1}`,
    batchId,
    researchQuestionId,
    decision: "pending" as const,
    researcherRationale: "",
    decidedAt: "",
  }));
  if (
    normalized.suggestions.length + suggestionRecords.length
    > MAX_ANALYSIS_REVIEW_DECISIONS
  ) throw new Error("The AI decision ledger has reached its bounded suggestion limit.");
  const batch: AnalysisReviewerBatch = {
    id: batchId,
    researchQuestionId,
    generatedAt,
    servedModel: cleanText(servedModel, 300) || "OpenRouter model",
    requestChecksum,
    responseChecksum,
    summary: safeResponse.summary,
    suggestionIds: suggestionRecords.map((suggestion) => suggestion.id),
  };
  const candidate = {
    ...normalized,
    updatedAt: generatedAt,
    batches: [...normalized.batches, batch],
    suggestions: [...normalized.suggestions, ...suggestionRecords],
    reviewedAt: "",
    exportedAt: "",
    lastExportChecksum: "",
  };
  const next = normalizeAnalysisReviewerDocument(candidate, dependencies);
  if (!next) throw new Error("The aggregate AI review batch could not be normalized.");
  return next;
}

export function decideAnalysisReviewerSuggestion(
  document: AnalysisReviewerDocument,
  suggestionId: string,
  decision: Exclude<AnalysisReviewerDecision, "pending">,
  researcherRationale: string,
  dependencies: AnalysisReviewerDependencies,
  decidedAt = new Date().toISOString(),
): AnalysisReviewerDocument {
  const normalized = normalizeAnalysisReviewerDocument(document, dependencies);
  const rationale = cleanText(researcherRationale);
  if (
    !normalized
    || !normalized.suggestions.some((suggestion) => suggestion.id === suggestionId)
    || !["accepted", "declined"].includes(decision)
    || !rationale
    || !safeTimestamp(decidedAt)
  ) throw new Error("Accepting or declining a suggestion requires a researcher rationale.");
  const candidate = {
    ...normalized,
    updatedAt: decidedAt,
    suggestions: normalized.suggestions.map((suggestion) => (
      suggestion.id === suggestionId
        ? {
            ...suggestion,
            decision,
            researcherRationale: rationale,
            decidedAt,
          }
        : suggestion
    )),
    reviewedAt: "",
    exportedAt: "",
    lastExportChecksum: "",
  };
  const next = normalizeAnalysisReviewerDocument(candidate, dependencies);
  if (!next) throw new Error("The AI suggestion decision could not be saved.");
  return next;
}

export function updateAnalysisReviewerNarrative(
  document: AnalysisReviewerDocument,
  changes: Pick<AnalysisReviewerDocument, "researcherConclusion" | "remainingLimitations">,
  dependencies: AnalysisReviewerDependencies,
  updatedAt = new Date().toISOString(),
): AnalysisReviewerDocument {
  const normalized = normalizeAnalysisReviewerDocument(document, dependencies);
  if (!normalized || !safeTimestamp(updatedAt)) {
    throw new Error("The AI review conclusion could not be updated.");
  }
  const candidate = {
    ...normalized,
    updatedAt,
    researcherConclusion: cleanText(changes.researcherConclusion),
    remainingLimitations: cleanText(changes.remainingLimitations),
    reviewedAt: "",
    exportedAt: "",
    lastExportChecksum: "",
  };
  const next = normalizeAnalysisReviewerDocument(candidate, dependencies);
  if (!next) throw new Error("The AI review conclusion could not be saved.");
  return next;
}

export function markAnalysisReviewerReviewed(
  document: AnalysisReviewerDocument,
  dependencies: AnalysisReviewerDependencies,
  reviewedAt = new Date().toISOString(),
): AnalysisReviewerDocument {
  const normalized = normalizeAnalysisReviewerDocument(document, dependencies);
  if (
    !normalized
    || normalized.readiness.status !== "needs-confirmation"
    || normalized.readiness.issues.length > 0
    || !safeTimestamp(reviewedAt)
  ) throw new Error("Review every question, decide every suggestion, and record the remaining boundaries first.");
  const candidate = {
    ...normalized,
    updatedAt: reviewedAt,
    reviewedAt,
    exportedAt: "",
    lastExportChecksum: "",
  };
  const next = normalizeAnalysisReviewerDocument(candidate, dependencies);
  if (!next || next.readiness.status !== "needs-export") {
    throw new Error("The researcher confirmation could not be recorded.");
  }
  return next;
}

function decisionLedger(document: AnalysisReviewerDocument) {
  return {
    batches: document.batches,
    suggestions: document.suggestions,
    researcherConclusion: document.researcherConclusion,
    remainingLimitations: document.remainingLimitations,
  };
}

export async function buildAnalysisReviewExport(
  document: AnalysisReviewerDocument,
  dependencies: AnalysisReviewerDependencies,
  exportedAt = new Date().toISOString(),
): Promise<{ document: AnalysisReviewerDocument; export: AnalysisReviewExport }> {
  const normalized = normalizeAnalysisReviewerDocument(document, dependencies);
  if (
    !normalized
    || normalized.readiness.status !== "needs-export"
    || !safeTimestamp(exportedAt)
  ) throw new Error("Confirm the complete AI review before export.");
  const ledger = decisionLedger(normalized);
  const sourceChecksum = await sha256Checksum(normalized.source);
  const decisionLedgerChecksum = await sha256Checksum(ledger);
  const unsigned = {
    packageVersion: ANALYSIS_REVIEW_PACKAGE_VERSION,
    projectId: normalized.projectId,
    releaseId: normalized.releaseId,
    releaseNumber: normalized.releaseNumber,
    releaseChecksum: normalized.releaseChecksum,
    contractChecksum: normalized.contractChecksum,
    analysisPlanUpdatedAt: normalized.analysisPlanUpdatedAt,
    createdAt: exportedAt,
    reviewedAt: normalized.reviewedAt,
    source: normalized.source,
    reviewScope: normalized.reviewScope,
    decisionLedger: ledger,
    integrity: {
      sourceChecksum,
      decisionLedgerChecksum,
    },
    participantRowsIncluded: false as const,
    upstreamRecordsChanged: false as const,
    aiValidityCertification: false as const,
    scientificBoundary:
      "ai-review-is-advisory-and-requires-documented-researcher-decisions" as const,
  };
  const packageChecksum = await sha256Checksum(unsigned);
  const packageRecord: AnalysisReviewPackage = {
    ...unsigned,
    integrity: { ...unsigned.integrity, packageChecksum },
  };
  const exportRecord: AnalysisReviewExport = {
    exportType: ANALYSIS_REVIEW_EXPORT_TYPE,
    exportBoundary: ANALYSIS_REVIEW_EXPORT_BOUNDARY,
    exportedAt,
    package: packageRecord,
  };
  if (safeJsonByteLength(exportRecord) > MAX_ANALYSIS_REVIEW_EXPORT_BYTES) {
    throw new Error("The aggregate AI review exceeds the Phase 8.8 export limit.");
  }
  const next = normalizeAnalysisReviewerDocument({
    ...normalized,
    updatedAt: exportedAt,
    exportedAt,
    lastExportChecksum: packageChecksum,
  }, dependencies);
  if (!next || next.readiness.status !== "ready") {
    throw new Error("The AI review export receipt could not be recorded.");
  }
  return { document: next, export: exportRecord };
}

export async function verifyAnalysisReviewExport(
  value: unknown,
  localDocument: AnalysisReviewerDocument,
  dependencies: AnalysisReviewerDependencies,
): Promise<AnalysisReviewPackage> {
  if (
    safeJsonByteLength(value) > MAX_ANALYSIS_REVIEW_EXPORT_BYTES
    || !isRecord(value)
    || !exactKeys(value, ["exportType", "exportBoundary", "exportedAt", "package"])
    || value.exportType !== ANALYSIS_REVIEW_EXPORT_TYPE
    || value.exportBoundary !== ANALYSIS_REVIEW_EXPORT_BOUNDARY
    || !safeTimestamp(value.exportedAt)
    || !isRecord(value.package)
  ) throw new Error("Select a valid exported Phase 8.8 aggregate AI review.");
  const normalized = normalizeAnalysisReviewerDocument(localDocument, dependencies);
  if (
    !normalized
    || normalized.readiness.status !== "ready"
    || normalized.exportedAt !== value.exportedAt
  ) throw new Error("The local Phase 8.8 review receipt is not ready for this export.");
  const built = await buildPackageForVerification(normalized, value.exportedAt);
  if (
    canonicalJson(value.package) !== canonicalJson(built)
    || built.integrity.packageChecksum !== normalized.lastExportChecksum
  ) throw new Error("The AI review or its decision ledger has changed after export.");
  return built;
}

async function buildPackageForVerification(
  document: AnalysisReviewerDocument,
  exportedAt: string,
): Promise<AnalysisReviewPackage> {
  const ledger = decisionLedger(document);
  const sourceChecksum = await sha256Checksum(document.source);
  const decisionLedgerChecksum = await sha256Checksum(ledger);
  const unsigned = {
    packageVersion: ANALYSIS_REVIEW_PACKAGE_VERSION,
    projectId: document.projectId,
    releaseId: document.releaseId,
    releaseNumber: document.releaseNumber,
    releaseChecksum: document.releaseChecksum,
    contractChecksum: document.contractChecksum,
    analysisPlanUpdatedAt: document.analysisPlanUpdatedAt,
    createdAt: exportedAt,
    reviewedAt: document.reviewedAt,
    source: document.source,
    reviewScope: document.reviewScope,
    decisionLedger: ledger,
    integrity: {
      sourceChecksum,
      decisionLedgerChecksum,
    },
    participantRowsIncluded: false as const,
    upstreamRecordsChanged: false as const,
    aiValidityCertification: false as const,
    scientificBoundary:
      "ai-review-is-advisory-and-requires-documented-researcher-decisions" as const,
  };
  return {
    ...unsigned,
    integrity: {
      ...unsigned.integrity,
      packageChecksum: await sha256Checksum(unsigned),
    },
  };
}

export function analysisReviewerStorageKey(projectId: string, releaseId: string): string {
  return `cerise-analysis-reviewer:${projectId}:${releaseId}:v${ANALYSIS_REVIEWER_SCHEMA_VERSION}`;
}

export function readAnalysisReviewerDocument(
  storage: StorageLike,
  dependencies: AnalysisReviewerDependencies,
): AnalysisReviewerDocument | null {
  const stored = storage.getItem(
    analysisReviewerStorageKey(
      dependencies.release.projectId,
      dependencies.release.releaseId,
    ),
  );
  if (
    !stored
    || new TextEncoder().encode(stored).byteLength > MAX_ANALYSIS_REVIEWER_DOCUMENT_BYTES
  ) return null;
  try {
    return normalizeAnalysisReviewerDocument(JSON.parse(stored), dependencies);
  } catch {
    return null;
  }
}

export function writeAnalysisReviewerDocument(
  storage: StorageLike,
  dependencies: AnalysisReviewerDependencies,
  document: AnalysisReviewerDocument,
): AnalysisReviewerDocument {
  const normalized = normalizeAnalysisReviewerDocument(document, dependencies);
  if (!normalized) throw new Error("The aggregate AI review document was not saved.");
  storage.setItem(
    analysisReviewerStorageKey(
      dependencies.release.projectId,
      dependencies.release.releaseId,
    ),
    JSON.stringify(normalized),
  );
  return normalized;
}

export function isAnalysisReviewerReady(
  document: AnalysisReviewerDocument | null,
): boolean {
  return Boolean(document && document.readiness.status === "ready");
}
