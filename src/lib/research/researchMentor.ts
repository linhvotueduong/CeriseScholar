import { isResearchArtifactChecksum, sha256ArtifactChecksum, type ResearchArtifactChecksum, type ResearchArtifactReference } from "./artifactIdentity";
import { assessResearchPathwayReadiness } from "./researchPathwayBrief";
import { createResearchPathwayDocument, type ResearchPathwayDocument } from "./researchPathwayDocument";
import { PHASE2_STAGE_1_STEP_IDS } from "./researchPathwayPhase2Model";
import type { ResearchPathDraft } from "./researchPathDraft";
import { addResearchPathwayRow, type ResearchPathwayRowCollection } from "./researchPathwayPhase3Rows";
import type { MentorContextEnvelope } from "./mentorContextEnvelope";
import {
  objectHasOnlyKeys,
  type ResearchMentorContextBudget,
} from "./researchMentorHardening";

export const RESEARCH_MENTOR_SCHEMA_VERSION = 1 as const;
export const MAX_RESEARCH_MENTOR_REQUEST_BYTES = 128 * 1024;
export const MAX_RESEARCH_MENTOR_PROMPT = 2_000;
export const MAX_RESEARCH_MENTOR_CONTEXT_ITEMS = 32;
export const MAX_RESEARCH_MENTOR_TURNS = 6;
export const MAX_RESEARCH_MENTOR_SUGGESTIONS = 4;

export const RESEARCH_MENTOR_MODES = [
  "reflect",
  "find-bridge",
  "narrow",
  "map-evidence",
  "compare-options",
  "next-step",
] as const;

export type ResearchMentorMode = typeof RESEARCH_MENTOR_MODES[number];
export type ResearchMentorObservationCategory = "clarity" | "alternatives" | "evidence" | "scope" | "traceability" | "route" | "pause";
export type ResearchMentorSuggestionKind = "observation" | "canvas-option" | "next-step";
export type ResearchMentorEpistemicStatus = "brainstorming-not-evidence" | "uncertain-needs-evidence" | "supported-by-approved-evidence";
export type ResearchMentorCanvasField = "text" | "title" | "situation" | "uncertainty" | "known" | "missing" | "search-terms";

export interface ResearchMentorRedactionSummary {
  email: number;
  phone: number;
  address: number;
  namedPerson: number;
  institutionalIdentifier: number;
}

export interface ResearchMentorObservation {
  id: string;
  category: ResearchMentorObservationCategory;
  title: string;
  detail: string;
  stepId: string;
  relatedItemIds: string[];
  basis: "pathway-content" | "derived-readiness" | "local-editing-pause";
  claim: "work-state-observation-not-mental-state-diagnosis";
}

export interface ResearchMentorContextItem {
  id: string;
  kind: "idea" | "problem-frame" | "baseline-entry" | "question-candidate";
  status: string;
  fields: Record<string, string | string[]>;
}

export interface ResearchMentorContext {
  schemaVersion: typeof RESEARCH_MENTOR_SCHEMA_VERSION;
  projectId: string;
  activeStepId: string;
  pathwaySource: ResearchArtifactReference;
  /** Content-only binding used to reject advice after the researcher changes the pathway. */
  pathwayContentChecksum: ResearchArtifactChecksum;
  activeItems: ResearchMentorContextItem[];
  selectedProblemFrameIds: string[];
  selectedQuestionIds: string[];
  route: ResearchPathwayDocument["decision"]["route"];
  unresolvedQuestions: string[];
  observations: ResearchMentorObservation[];
  ignoredObservationIds: string[];
  redactionSummary: ResearchMentorRedactionSummary;
  contextChecksum: ResearchArtifactChecksum;
  participantDataIncluded: false;
  chatTranscriptStored: false;
  claim: "bounded-stage1-context-not-independent-validity-novelty-ethics-or-mental-state-assessment";
}

export interface ResearchMentorTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ResearchMentorRequest {
  projectId: string;
  mode: ResearchMentorMode;
  prompt: string;
  context: ResearchMentorContext | null;
  projectContext: MentorContextEnvelope;
  turns: ResearchMentorTurn[];
  techniqueRun?: unknown | null;
}

interface ResearchMentorSuggestionBase {
  id: string;
  kind: ResearchMentorSuggestionKind;
  title: string;
  rationale: string;
  uncertainty: string;
  observationIds: string[];
  sourceItemIds: string[];
  distinctiveLens: string;
  epistemicStatus: ResearchMentorEpistemicStatus;
  evidenceIds: string[];
}

export interface ResearchMentorAdvisorySuggestion extends ResearchMentorSuggestionBase {
  kind: "observation" | "next-step";
  recommendation: string;
}

export interface ResearchMentorCanvasSuggestion extends ResearchMentorSuggestionBase {
  kind: "canvas-option";
  targetCollection: ResearchPathwayRowCollection;
  targetField: ResearchMentorCanvasField;
  proposedText: string;
  action: "create-alternative";
}

export type ResearchMentorSuggestion = ResearchMentorAdvisorySuggestion | ResearchMentorCanvasSuggestion;

export interface ParsedResearchMentorResponse {
  summary: string;
  suggestions: ResearchMentorSuggestion[];
  reflectiveQuestion: string;
  rejectedSuggestions: Array<{ index: number; reason: string }>;
}

export interface ResearchMentorApiResponse extends ParsedResearchMentorResponse {
  generatedAt: string;
  servedModel: string;
  mode: ResearchMentorMode;
  contextChecksum: ResearchArtifactChecksum;
  contextContentChecksum: ResearchArtifactChecksum;
  pathwayContentChecksum: ResearchArtifactChecksum | null;
  pathwaySource: ResearchArtifactReference | null;
  redactionSummary: ResearchMentorRedactionSummary;
  hardening: ResearchMentorContextBudget;
  claim: "ai-advisory-research-mentoring-not-authorship-validation-approval-or-mental-health-assessment";
}

const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g;
const ADDRESS_PATTERN = /\b\d{1,6}\s+[A-Za-z0-9.' -]{2,60}\s(?:street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|lane|ln\.?|drive|dr\.?|court|ct\.?|way)\b/gi;
const NAMED_PERSON_PATTERN = /\b(?:Dr\.?|Professor|Prof\.?|Mr\.?|Mrs\.?|Ms\.?|Mx\.?)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g;
const INSTITUTIONAL_ID_PATTERN = /\b(?:irb|protocol|approval|study)(?:\s*(?:number|no\.?|id|#))?\s*[:#-]?\s*(?:[A-Z]{1,10}[-_:]?)?\d{2,}[A-Z0-9._-]*\b/gi;
const UNSAFE_MODEL_CLAIM_PATTERN = /\b(?:approved|validated|proven|compliant|guaranteed|definitively novel|ethically acceptable|mentally|depressed|anxious|lazy|unmotivated)\b/i;
const STEP_SET = new Set<string>(PHASE2_STAGE_1_STEP_IDS);

const STEP_TARGETS: Readonly<Record<string, ReadonlyArray<{
  collection: ResearchPathwayRowCollection;
  fields: readonly ResearchMentorCanvasField[];
}>>> = {
  "stage-01-capture-concern": [{ collection: "ideas", fields: ["text"] }],
  "stage-01-shape-problems": [{ collection: "problems", fields: ["title", "situation", "uncertainty"] }],
  "stage-01-explore-baseline": [{ collection: "baseline", fields: ["known", "missing", "search-terms"] }],
  "stage-01-develop-questions": [{ collection: "questions", fields: ["text"] }],
  "stage-01-choose-pathway": [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeText(value: unknown, maximum: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maximum)
    : "";
}

function safeToken(value: unknown): string {
  const candidate = safeText(value, 160);
  return TOKEN_PATTERN.test(candidate) ? candidate : "";
}

function safeTokenList(value: unknown, maximum = 64): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(safeToken).filter(Boolean))].slice(0, maximum);
}

function redactionSummary(): ResearchMentorRedactionSummary {
  return { email: 0, phone: 0, address: 0, namedPerson: 0, institutionalIdentifier: 0 };
}

function replaceAndCount(value: string, pattern: RegExp, token: string): { value: string; count: number } {
  let count = 0;
  pattern.lastIndex = 0;
  return { value: value.replace(pattern, () => { count += 1; return token; }), count };
}

export function redactResearchMentorText(value: string, summary: ResearchMentorRedactionSummary = redactionSummary()): string {
  let redacted = safeText(value, 20_000);
  const replacements: ReadonlyArray<{ key: keyof ResearchMentorRedactionSummary; pattern: RegExp; token: string }> = [
    { key: "email", pattern: EMAIL_PATTERN, token: "[EMAIL REDACTED]" },
    { key: "phone", pattern: PHONE_PATTERN, token: "[PHONE REDACTED]" },
    { key: "institutionalIdentifier", pattern: INSTITUTIONAL_ID_PATTERN, token: "[INSTITUTIONAL IDENTIFIER REDACTED]" },
    { key: "address", pattern: ADDRESS_PATTERN, token: "[ADDRESS REDACTED]" },
    { key: "namedPerson", pattern: NAMED_PERSON_PATTERN, token: "[NAME REDACTED]" },
  ];
  for (const item of replacements) {
    const next = replaceAndCount(redacted, item.pattern, item.token);
    redacted = next.value;
    summary[item.key] += next.count;
  }
  return redacted;
}

function sourceReference(document: ResearchPathwayDocument): ResearchArtifactReference {
  return {
    artifactKind: document.identity.artifactKind,
    artifactId: document.identity.artifactId,
    schemaVersion: document.identity.artifactSchemaVersion,
    checksum: document.identity.checksum,
  };
}

function activeStatus(status: string): boolean {
  return status !== "parked" && status !== "rejected";
}

function redactedFields(fields: Record<string, string | string[]>, summary: ResearchMentorRedactionSummary): Record<string, string | string[]> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [
    key,
    Array.isArray(value) ? value.map((item) => redactResearchMentorText(item, summary)) : redactResearchMentorText(value, summary),
  ]));
}

function contextItems(document: ResearchPathwayDocument, summary: ResearchMentorRedactionSummary): ResearchMentorContextItem[] {
  const items: ResearchMentorContextItem[] = [];
  document.ideas.filter((item) => activeStatus(item.status)).forEach((item) => items.push({
    id: item.id, kind: "idea", status: item.status,
    fields: redactedFields({ text: item.text, affectedContext: item.affectedContext, whyItMatters: item.whyItMatters }, summary),
  }));
  document.problemFrames.filter((item) => activeStatus(item.status)).forEach((item) => items.push({
    id: item.id, kind: "problem-frame", status: item.status,
    fields: redactedFields({ title: item.title, situation: item.situation, affected: item.affected, consequence: item.consequence, uncertainty: item.uncertainty, observedBasis: item.observedBasis, interpretation: item.interpretation, assumptions: item.assumptions, alternativeExplanations: item.alternativeExplanations }, summary),
  }));
  document.baselineEntries.filter((item) => activeStatus(item.status)).forEach((item) => items.push({
    id: item.id, kind: "baseline-entry", status: item.status,
    fields: redactedFields({ known: item.known, contested: item.contested, missing: item.missing, assumed: item.assumed, searchTerms: item.searchTerms, adjacentDisciplines: item.adjacentDisciplines, missingVoices: item.missingVoices, linkedProblemFrameIds: item.linkedProblemFrameIds, evidenceReferenceIds: item.evidenceReferenceIds }, summary),
  }));
  document.questionCandidates.filter((item) => activeStatus(item.status)).forEach((item) => items.push({
    id: item.id, kind: "question-candidate", status: item.status,
    fields: redactedFields({ text: item.text, family: item.family ?? "", linkedProblemFrameIds: item.linkedProblemFrameIds, linkedBaselineEntryIds: item.linkedBaselineEntryIds, populationOrSource: item.scope.populationOrSource, setting: item.scope.setting, constructOrPhenomenon: item.scope.constructOrPhenomenon, timeframe: item.scope.timeframe, comparison: item.scope.comparison, evidenceAccess: item.scope.evidenceAccess, comparisonNotes: item.comparisonNotes }, summary),
  }));
  return items.slice(0, MAX_RESEARCH_MENTOR_CONTEXT_ITEMS);
}

function observation(input: Omit<ResearchMentorObservation, "claim">): ResearchMentorObservation {
  return { ...input, claim: "work-state-observation-not-mental-state-diagnosis" };
}

export function deriveResearchMentorObservations(
  document: ResearchPathwayDocument,
  activeStepId: string,
  behavior: { idleSeconds?: number; editCount?: number } = {},
): ResearchMentorObservation[] {
  if (!STEP_SET.has(activeStepId)) return [];
  const activeIdeas = document.ideas.filter((item) => activeStatus(item.status));
  const activeFrames = document.problemFrames.filter((item) => activeStatus(item.status));
  const activeBaseline = document.baselineEntries.filter((item) => activeStatus(item.status));
  const activeQuestions = document.questionCandidates.filter((item) => activeStatus(item.status));
  const selectedFrames = activeFrames.filter((item) => item.status === "selected");
  const selectedQuestions = activeQuestions.filter((item) => item.status === "selected");
  const observations: ResearchMentorObservation[] = [];

  if (activeStepId === PHASE2_STAGE_1_STEP_IDS[0]) {
    if (!activeIdeas.some((item) => item.text.trim())) observations.push(observation({ id: "concern-not-captured", category: "clarity", title: "The concern is still open", detail: "No active idea currently states the concern in the researcher’s own words.", stepId: activeStepId, relatedItemIds: [], basis: "derived-readiness" }));
    else if (!activeIdeas.some((item) => item.affectedContext.trim())) observations.push(observation({ id: "affected-context-open", category: "scope", title: "The affected context is still open", detail: "An active idea is present, but who, what, or which context is affected has not been recorded yet.", stepId: activeStepId, relatedItemIds: activeIdeas.filter((item) => item.text.trim()).map((item) => item.id), basis: "pathway-content" }));
  }
  if (activeStepId === PHASE2_STAGE_1_STEP_IDS[1]) {
    if (activeFrames.filter((item) => item.title.trim() || item.situation.trim()).length < 2) observations.push(observation({ id: "single-problem-frame", category: "alternatives", title: "Only one developed frame is visible", detail: "A second honest framing may make the tradeoffs easier to compare before selection.", stepId: activeStepId, relatedItemIds: activeFrames.map((item) => item.id), basis: "pathway-content" }));
    const incompleteSelected = selectedFrames.find((item) => !item.situation.trim() || !item.uncertainty.trim());
    if (incompleteSelected) observations.push(observation({ id: `selected-frame-bounds-${incompleteSelected.id}`, category: "clarity", title: "The selected frame still has open boundaries", detail: "Its situation or researchable uncertainty is not yet documented.", stepId: activeStepId, relatedItemIds: [incompleteSelected.id], basis: "pathway-content" }));
    if (selectedFrames.length && !selectedFrames.some((item) => item.observedBasis.trim() && item.interpretation.trim() && item.assumptions.trim() && item.alternativeExplanations.trim())) observations.push(observation({ id: "selected-frame-reasoning-open", category: "clarity", title: "Reasoning layers are not yet separated", detail: "The selected frame does not yet distinguish observation, interpretation, assumptions, and plausible alternatives.", stepId: activeStepId, relatedItemIds: selectedFrames.map((item) => item.id), basis: "derived-readiness" }));
  }
  if (activeStepId === PHASE2_STAGE_1_STEP_IDS[2]) {
    const documented = activeBaseline.filter((item) => [item.known, item.contested, item.missing, item.assumed].some((value) => value.trim()));
    if (!documented.length) observations.push(observation({ id: "baseline-not-started", category: "evidence", title: "The baseline is still open", detail: "No active entry yet records what is known, contested, missing, or assumed.", stepId: activeStepId, relatedItemIds: [], basis: "derived-readiness" }));
    else if (!documented.some((item) => item.linkedProblemFrameIds.length)) observations.push(observation({ id: "baseline-frame-link-open", category: "traceability", title: "Evidence is not linked to a frame", detail: "The baseline entries have not yet been connected to a candidate problem frame.", stepId: activeStepId, relatedItemIds: documented.map((item) => item.id), basis: "pathway-content" }));
    if (documented.some((item) => item.missing.trim()) && !documented.some((item) => item.searchTerms.trim())) observations.push(observation({ id: "gap-search-language-open", category: "evidence", title: "A gap lacks search language", detail: "A missing-evidence note is present, but no search terms or adjacent language have been recorded.", stepId: activeStepId, relatedItemIds: documented.filter((item) => item.missing.trim()).map((item) => item.id), basis: "pathway-content" }));
  }
  if (activeStepId === PHASE2_STAGE_1_STEP_IDS[3]) {
    const viable = activeQuestions.filter((item) => item.status === "promising" || item.status === "selected");
    if (viable.length < 2) observations.push(observation({ id: "question-comparison-open", category: "alternatives", title: "Question comparison is still open", detail: "Fewer than two active questions are marked promising or selected.", stepId: activeStepId, relatedItemIds: viable.map((item) => item.id), basis: "derived-readiness" }));
    const unlinked = viable.find((item) => !item.linkedProblemFrameIds.length || !item.linkedBaselineEntryIds.length);
    if (unlinked) observations.push(observation({ id: `question-links-${unlinked.id}`, category: "traceability", title: "A viable question has an open evidence link", detail: "This question is not yet linked to both a problem frame and a baseline entry.", stepId: activeStepId, relatedItemIds: [unlinked.id], basis: "pathway-content" }));
    const unscoped = selectedQuestions.find((item) => !item.scope.populationOrSource.trim() || !item.scope.constructOrPhenomenon.trim() || !item.scope.setting.trim() || !item.scope.evidenceAccess.trim());
    if (unscoped) observations.push(observation({ id: `question-scope-${unscoped.id}`, category: "scope", title: "The selected question has open scope choices", detail: "Its source or population, phenomenon, setting, or evidence access is still incomplete.", stepId: activeStepId, relatedItemIds: [unscoped.id], basis: "derived-readiness" }));
  }
  if (activeStepId === PHASE2_STAGE_1_STEP_IDS[4]) {
    if (!document.decision.rationale.trim()) observations.push(observation({ id: "pathway-rationale-open", category: "route", title: "The pathway rationale is still open", detail: "The reason for choosing this provisional pathway has not been documented.", stepId: activeStepId, relatedItemIds: [...document.decision.selectedProblemFrameIds, ...document.decision.selectedQuestionIds], basis: "derived-readiness" }));
    const step = assessResearchPathwayReadiness(document).steps.find((item) => item.stepId === activeStepId);
    if (step?.conditions.some((item) => item.id === "route-resolved" && !item.met)) observations.push(observation({ id: "route-decisions-open", category: "route", title: "Some route decisions remain open", detail: "Intent, method family, setting, assignment, audience or source, sensitivity, and confidence are not all resolved.", stepId: activeStepId, relatedItemIds: [], basis: "derived-readiness" }));
    if (step?.conditions.some((item) => item.id === "route-consistent" && !item.met)) observations.push(observation({ id: "route-contradiction", category: "route", title: "The provisional route has a contradiction", detail: "At least one route choice conflicts with another and needs researcher review.", stepId: activeStepId, relatedItemIds: [], basis: "derived-readiness" }));
  }

  const readinessStep = assessResearchPathwayReadiness(document).steps.find((item) => item.stepId === activeStepId);
  if ((behavior.idleSeconds ?? 0) >= 120 && (behavior.editCount ?? 0) >= 2 && readinessStep?.status !== "ready") {
    observations.push(observation({ id: "unfinished-editing-pause", category: "pause", title: "This unfinished point has been quiet for a while", detail: "The canvas has not changed recently. This may be reflection rather than a blockage; open the mentor only if another perspective would help.", stepId: activeStepId, relatedItemIds: [], basis: "local-editing-pause" }));
  }
  return observations.slice(0, 4);
}

export async function createResearchMentorContext(input: {
  projectId: string;
  activeStepId: string;
  draft: ResearchPathDraft;
  document: ResearchPathwayDocument;
  ignoredObservationIds?: readonly string[];
  idleSeconds?: number;
  editCount?: number;
}): Promise<ResearchMentorContext> {
  if (!TOKEN_PATTERN.test(input.projectId) || !STEP_SET.has(input.activeStepId)) throw new Error("Research mentor scope is invalid.");
  const currentDocument = await createResearchPathwayDocument({
    projectId: input.projectId,
    draft: input.draft,
    previous: input.document,
    now: input.document.updatedAt,
    migrationSources: ["canonical"],
  });
  const summary = redactionSummary();
  const ignoredObservationIds = [...new Set((input.ignoredObservationIds ?? []).filter((item) => TOKEN_PATTERN.test(item)))].slice(0, 32);
  const ignored = new Set(ignoredObservationIds);
  const activeItems = contextItems(currentDocument, summary);
  const selectedProblemFrameIds = [...currentDocument.decision.selectedProblemFrameIds];
  const selectedQuestionIds = [...currentDocument.decision.selectedQuestionIds];
  const route = currentDocument.decision.route;
  const unresolvedQuestions = currentDocument.decision.unresolvedQuestions.map((item) => redactResearchMentorText(item, summary));
  const pathwayContentChecksum = await sha256ArtifactChecksum({
    activeItems,
    selectedProblemFrameIds,
    selectedQuestionIds,
    route,
    unresolvedQuestions,
  });
  const core = {
    schemaVersion: RESEARCH_MENTOR_SCHEMA_VERSION,
    projectId: input.projectId,
    activeStepId: input.activeStepId,
    pathwaySource: sourceReference(currentDocument),
    pathwayContentChecksum,
    activeItems,
    selectedProblemFrameIds,
    selectedQuestionIds,
    route,
    unresolvedQuestions,
    observations: deriveResearchMentorObservations(currentDocument, input.activeStepId, { idleSeconds: input.idleSeconds, editCount: input.editCount }).filter((item) => !ignored.has(item.id)),
    ignoredObservationIds,
    redactionSummary: summary,
    participantDataIncluded: false as const,
    chatTranscriptStored: false as const,
    claim: "bounded-stage1-context-not-independent-validity-novelty-ethics-or-mental-state-assessment" as const,
  };
  return { ...core, contextChecksum: await sha256ArtifactChecksum(core) };
}

function normalizeContextItem(value: unknown): ResearchMentorContextItem | null {
  if (!isRecord(value)) return null;
  const id = safeToken(value.id);
  const kind = ["idea", "problem-frame", "baseline-entry", "question-candidate"].includes(String(value.kind)) ? value.kind as ResearchMentorContextItem["kind"] : null;
  if (!id || !kind || !isRecord(value.fields)) return null;
  const fields: Record<string, string | string[]> = {};
  for (const [key, field] of Object.entries(value.fields).slice(0, 24)) {
    const safeKey = safeToken(key);
    if (!safeKey) continue;
    fields[safeKey] = Array.isArray(field) ? field.map((item) => safeText(item, 2_000)).filter(Boolean).slice(0, 32) : safeText(field, 4_000);
  }
  return { id, kind, status: safeToken(value.status) || "exploring", fields };
}

function normalizeObservation(value: unknown, activeStepId: string): ResearchMentorObservation | null {
  if (!isRecord(value)) return null;
  const id = safeToken(value.id);
  const categories: readonly ResearchMentorObservationCategory[] = ["clarity", "alternatives", "evidence", "scope", "traceability", "route", "pause"];
  const category = categories.includes(value.category as ResearchMentorObservationCategory) ? value.category as ResearchMentorObservationCategory : null;
  const basis = ["pathway-content", "derived-readiness", "local-editing-pause"].includes(String(value.basis)) ? value.basis as ResearchMentorObservation["basis"] : null;
  if (!id || !category || !basis || value.stepId !== activeStepId || value.claim !== "work-state-observation-not-mental-state-diagnosis") return null;
  const title = safeText(value.title, 240);
  const detail = safeText(value.detail, 800);
  if (!title || !detail) return null;
  return { id, category, title, detail, stepId: activeStepId, relatedItemIds: safeTokenList(value.relatedItemIds), basis, claim: "work-state-observation-not-mental-state-diagnosis" };
}

function normalizeRedactionSummary(value: unknown): ResearchMentorRedactionSummary | null {
  if (!isRecord(value)) return null;
  const result = redactionSummary();
  for (const key of Object.keys(result) as Array<keyof ResearchMentorRedactionSummary>) {
    const count = value[key];
    if (!Number.isSafeInteger(count) || Number(count) < 0 || Number(count) > 10_000) return null;
    result[key] = Number(count);
  }
  return result;
}

function normalizeRoute(value: unknown): ResearchPathwayDocument["decision"]["route"] | null {
  if (!isRecord(value)) return null;
  const from = <T extends string>(candidate: unknown, allowed: readonly T[]): T | null => (
    candidate === null ? null : allowed.includes(candidate as T) ? candidate as T : null
  );
  const intent = from(value.intent, ["primary-data", "secondary-data", "evidence-synthesis"] as const);
  const methodFamily = from(value.methodFamily, ["quantitative", "qualitative", "mixed-methods", "evidence-synthesis"] as const);
  const assignment = from(value.assignment, ["randomized", "non-randomized", "none", "undetermined"] as const);
  const setting = from(value.setting, ["online-home", "laboratory", "field", "telephone", "import-only", "not-applicable", "undetermined"] as const);
  const audience = from(value.audience, ["adult", "minor", "capacity-limited", "not-participant", "undetermined"] as const);
  const dataSensitivity = from(value.dataSensitivity, ["public", "deidentified", "restricted", "identifiable", "undetermined"] as const);
  const confidence = from(value.confidence, ["unrated", "low", "medium", "high"] as const);
  const backcastingChoice = from(value.backcastingChoice, ["undecided", "use", "not-use"] as const);
  const possibleSpecialProcedures = Array.isArray(value.possibleSpecialProcedures)
    ? [...new Set(value.possibleSpecialProcedures.filter((item): item is "recording" | "deception" | "specimen" | "genetic" | "longitudinal" | "reconsent" => ["recording", "deception", "specimen", "genetic", "longitudinal", "reconsent"].includes(String(item))))].slice(0, 6)
    : [];
  if (value.intent !== null && intent === null || value.methodFamily !== null && methodFamily === null
    || value.assignment !== null && assignment === null || value.setting !== null && setting === null
    || value.audience !== null && audience === null || value.dataSensitivity !== null && dataSensitivity === null
    || confidence === null || backcastingChoice === null) return null;
  return { intent, methodFamily, assignment, setting, audience, dataSensitivity, possibleSpecialProcedures, confidence, backcastingChoice };
}

export async function normalizeAndVerifyResearchMentorContext(value: unknown): Promise<ResearchMentorContext | null> {
  if (!isRecord(value) || value.schemaVersion !== RESEARCH_MENTOR_SCHEMA_VERSION) return null;
  const projectId = safeToken(value.projectId);
  const activeStepId = safeToken(value.activeStepId);
  if (!projectId || !STEP_SET.has(activeStepId) || !isRecord(value.pathwaySource)) return null;
  const pathwaySource: ResearchArtifactReference = {
    artifactKind: safeToken(value.pathwaySource.artifactKind),
    artifactId: safeToken(value.pathwaySource.artifactId),
    schemaVersion: Number(value.pathwaySource.schemaVersion),
    checksum: value.pathwaySource.checksum as ResearchArtifactChecksum,
  };
  if (!pathwaySource.artifactKind || !pathwaySource.artifactId || !Number.isSafeInteger(pathwaySource.schemaVersion) || !isResearchArtifactChecksum(pathwaySource.checksum)) return null;
  const activeItems = Array.isArray(value.activeItems) ? value.activeItems.map(normalizeContextItem).filter((item): item is ResearchMentorContextItem => Boolean(item)).slice(0, MAX_RESEARCH_MENTOR_CONTEXT_ITEMS) : [];
  const observations = Array.isArray(value.observations) ? value.observations.map((item) => normalizeObservation(item, activeStepId)).filter((item): item is ResearchMentorObservation => Boolean(item)).slice(0, 4) : [];
  const ignoredObservationIds = safeTokenList(value.ignoredObservationIds, 32);
  const summary = normalizeRedactionSummary(value.redactionSummary);
  const route = normalizeRoute(value.route);
  if (!summary || !route || !isResearchArtifactChecksum(value.contextChecksum) || !isResearchArtifactChecksum(value.pathwayContentChecksum) || value.participantDataIncluded !== false || value.chatTranscriptStored !== false || value.claim !== "bounded-stage1-context-not-independent-validity-novelty-ethics-or-mental-state-assessment") return null;
  const selectedProblemFrameIds = safeTokenList(value.selectedProblemFrameIds);
  const selectedQuestionIds = safeTokenList(value.selectedQuestionIds);
  const unresolvedQuestions = Array.isArray(value.unresolvedQuestions) ? value.unresolvedQuestions.map((item) => safeText(item, 2_000)).filter(Boolean).slice(0, 64) : [];
  const pathwayContentChecksum = await sha256ArtifactChecksum({
    activeItems,
    selectedProblemFrameIds,
    selectedQuestionIds,
    route,
    unresolvedQuestions,
  });
  if (pathwayContentChecksum !== value.pathwayContentChecksum) return null;
  const core = {
    schemaVersion: RESEARCH_MENTOR_SCHEMA_VERSION,
    projectId,
    activeStepId,
    pathwaySource,
    pathwayContentChecksum,
    activeItems,
    selectedProblemFrameIds,
    selectedQuestionIds,
    route,
    unresolvedQuestions,
    observations,
    ignoredObservationIds,
    redactionSummary: summary,
    participantDataIncluded: false as const,
    chatTranscriptStored: false as const,
    claim: "bounded-stage1-context-not-independent-validity-novelty-ethics-or-mental-state-assessment" as const,
  };
  const checksum = await sha256ArtifactChecksum(core);
  return checksum === value.contextChecksum ? { ...core, contextChecksum: checksum } : null;
}

export function normalizeResearchMentorRequest(value: unknown): Omit<ResearchMentorRequest, "context" | "projectContext"> & { context: unknown | null; projectContext: unknown | null } | null {
  if (!isRecord(value)) return null;
  const projectId = safeToken(value.projectId);
  const mode = RESEARCH_MENTOR_MODES.includes(value.mode as ResearchMentorMode) ? value.mode as ResearchMentorMode : null;
  const prompt = safeText(value.prompt, MAX_RESEARCH_MENTOR_PROMPT);
  if (!projectId || !mode || !prompt || (!value.context && !value.projectContext)) return null;
  const turns = Array.isArray(value.turns) ? value.turns.flatMap((turn) => {
    if (!isRecord(turn) || (turn.role !== "user" && turn.role !== "assistant")) return [];
    const content = safeText(turn.content, 1_500);
    return content ? [{ role: turn.role, content } as ResearchMentorTurn] : [];
  }).slice(-MAX_RESEARCH_MENTOR_TURNS) : [];
  return { projectId, mode, prompt, context: value.context ?? null, projectContext: value.projectContext ?? null, turns, techniqueRun: value.techniqueRun ?? null };
}

function targetAllowed(stepId: string, collection: ResearchPathwayRowCollection, field: ResearchMentorCanvasField): boolean {
  return STEP_TARGETS[stepId]?.some((target) => target.collection === collection && target.fields.includes(field)) ?? false;
}

export function parseResearchMentorResponse(value: string, context: ResearchMentorContext | null, projectContext?: MentorContextEnvelope): ParsedResearchMentorResponse {
  const rejectedSuggestions: Array<{ index: number; reason: string }> = [];
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return { summary: "The mentor response could not be verified.", suggestions: [], reflectiveQuestion: "What would help move this research decision forward?", rejectedSuggestions: [{ index: -1, reason: "invalid-json" }] };
  }
  if (!isRecord(raw)) return { summary: "The mentor response could not be verified.", suggestions: [], reflectiveQuestion: "What would help move this research decision forward?", rejectedSuggestions: [{ index: -1, reason: "invalid-object" }] };
  if (!objectHasOnlyKeys(raw, ["summary", "suggestions", "reflectiveQuestion"])) {
    return { summary: "The mentor response could not be verified.", suggestions: [], reflectiveQuestion: "What would help move this research decision forward?", rejectedSuggestions: [{ index: -1, reason: "unexpected-top-level-field" }] };
  }
  if (typeof raw.summary !== "string" || !Array.isArray(raw.suggestions) || typeof raw.reflectiveQuestion !== "string") {
    return { summary: "The mentor response could not be verified.", suggestions: [], reflectiveQuestion: "What would help move this research decision forward?", rejectedSuggestions: [{ index: -1, reason: "invalid-response-shape" }] };
  }
  const rawSummary = safeText(raw.summary, 1_200);
  const rawQuestion = safeText(raw.reflectiveQuestion, 600);
  const summary = rawSummary && !UNSAFE_MODEL_CLAIM_PATTERN.test(rawSummary)
    ? rawSummary
    : "Review each option carefully; no project change has been made.";
  const reflectiveQuestion = rawQuestion && !UNSAFE_MODEL_CLAIM_PATTERN.test(rawQuestion)
    ? rawQuestion
    : "Which option best reflects the research decision you want to make?";
  const knownObservationIds = new Set([
    ...(context?.observations.map((item) => item.id) ?? []),
    ...(projectContext?.workStateNotes.map((item) => item.id) ?? []),
  ]);
  const knownItemIds = new Set([
    ...(context?.activeItems.map((item) => item.id) ?? []),
    ...(projectContext?.activeContextItems.map((item) => item.id) ?? []),
    ...(projectContext?.approvedEvidence.map((item) => item.id) ?? []),
    ...(projectContext?.artifacts.map((item) => item.id) ?? []),
  ]);
  const knownEvidenceIds = new Set(projectContext?.approvedEvidence.map((item) => item.id) ?? []);
  const suggestions: ResearchMentorSuggestion[] = [];
  const seenIds = new Set<string>();
  const rawSuggestions = Array.isArray(raw.suggestions) ? raw.suggestions.slice(0, 12) : [];
  rawSuggestions.forEach((candidate, index) => {
    if (!isRecord(candidate)) { rejectedSuggestions.push({ index, reason: "malformed" }); return; }
    const id = safeToken(candidate.id);
    const kind = ["observation", "canvas-option", "next-step"].includes(String(candidate.kind)) ? candidate.kind as ResearchMentorSuggestionKind : null;
    const commonKeys = ["id", "kind", "title", "rationale", "uncertainty", "observationIds", "sourceItemIds", "distinctiveLens", "epistemicStatus", "evidenceIds"];
    const allowedKeys = kind === "canvas-option"
      ? [...commonKeys, "targetCollection", "targetField", "proposedText", "action"]
      : [...commonKeys, "recommendation"];
    if (!objectHasOnlyKeys(candidate, allowedKeys)) { rejectedSuggestions.push({ index, reason: "unexpected-suggestion-field" }); return; }
    const title = safeText(candidate.title, 240);
    const rationale = safeText(candidate.rationale, 1_200);
    const uncertainty = safeText(candidate.uncertainty, 800);
    if (!id || seenIds.has(id) || !kind || !title || !rationale || !uncertainty || UNSAFE_MODEL_CLAIM_PATTERN.test(`${title} ${rationale} ${uncertainty}`)) { rejectedSuggestions.push({ index, reason: "unsafe-or-malformed" }); return; }
    const observationIds = safeTokenList(candidate.observationIds).filter((item) => knownObservationIds.has(item));
    const sourceItemIds = safeTokenList(candidate.sourceItemIds).filter((item) => knownItemIds.has(item));
    const distinctiveLens = safeText(candidate.distinctiveLens, 500);
    const epistemicStatus: ResearchMentorEpistemicStatus = ["brainstorming-not-evidence", "uncertain-needs-evidence", "supported-by-approved-evidence"].includes(String(candidate.epistemicStatus))
      ? candidate.epistemicStatus as ResearchMentorEpistemicStatus
      : "uncertain-needs-evidence";
    const evidenceIds = safeTokenList(candidate.evidenceIds).filter((item) => knownEvidenceIds.has(item));
    if (epistemicStatus === "supported-by-approved-evidence" && evidenceIds.length === 0) { rejectedSuggestions.push({ index, reason: "unsupported-evidence-status" }); return; }
    const base = { id, kind, title, rationale, uncertainty, observationIds, sourceItemIds, distinctiveLens, epistemicStatus, evidenceIds };
    if (kind === "canvas-option") {
      const collection = ["ideas", "parking", "problems", "baseline", "questions"].includes(String(candidate.targetCollection)) ? candidate.targetCollection as ResearchPathwayRowCollection : null;
      const field = ["text", "title", "situation", "uncertainty", "known", "missing", "search-terms"].includes(String(candidate.targetField)) ? candidate.targetField as ResearchMentorCanvasField : null;
      const proposedText = safeText(candidate.proposedText, 2_000);
      if (!context || projectContext?.capability.allowsCanvasAlternatives === false || !collection || !field || !proposedText || candidate.action !== "create-alternative" || !targetAllowed(context.activeStepId, collection, field) || UNSAFE_MODEL_CLAIM_PATTERN.test(proposedText)) { rejectedSuggestions.push({ index, reason: "invalid-canvas-target" }); return; }
      suggestions.push({ ...base, kind, targetCollection: collection, targetField: field, proposedText, action: "create-alternative" });
    } else {
      const recommendation = safeText(candidate.recommendation, 1_500);
      if (!recommendation || UNSAFE_MODEL_CLAIM_PATTERN.test(recommendation)) { rejectedSuggestions.push({ index, reason: "unsafe-recommendation" }); return; }
      suggestions.push({ ...base, kind, recommendation });
    }
    seenIds.add(id);
  });
  return { summary, suggestions: suggestions.slice(0, MAX_RESEARCH_MENTOR_SUGGESTIONS), reflectiveQuestion, rejectedSuggestions };
}

export function mentorCanvasFieldKey(collection: ResearchPathwayRowCollection, slot: string, field: ResearchMentorCanvasField): string {
  const prefixes: Record<ResearchPathwayRowCollection, string> = { ideas: "idea", parking: "parking", problems: "frame", baseline: "baseline", questions: "question" };
  if (!/^(?:\d+|p3-[1-9]\d*)$/.test(slot)) throw new Error("Research mentor row slot is invalid.");
  return `${prefixes[collection]}-${slot}-${field}`;
}

export function applyResearchMentorCanvasSuggestion(
  fields: Record<string, string>,
  activeStepId: string,
  suggestion: ResearchMentorCanvasSuggestion,
): { fields: Record<string, string>; slot: string | null } {
  if (!targetAllowed(activeStepId, suggestion.targetCollection, suggestion.targetField)) return { fields, slot: null };
  const added = addResearchPathwayRow(fields, suggestion.targetCollection);
  if (!added.slot) return added;
  return {
    slot: added.slot,
    fields: {
      ...added.fields,
      [mentorCanvasFieldKey(suggestion.targetCollection, added.slot, suggestion.targetField)]: suggestion.proposedText,
    },
  };
}

export async function researchMentorSuggestionChecksum(suggestion: ResearchMentorSuggestion): Promise<ResearchArtifactChecksum> {
  return sha256ArtifactChecksum(suggestion);
}

const DECISION_STORAGE_PREFIX = "cerise:research-mentor-decisions:v1";

export function researchMentorDecisionStorageKey(projectId: string): string {
  if (!TOKEN_PATTERN.test(projectId)) throw new Error("Research mentor project ID is invalid.");
  return `${DECISION_STORAGE_PREFIX}:${projectId}`;
}

export function appendLocalResearchMentorDecision(storage: Storage, projectId: string, decision: unknown): number {
  const key = researchMentorDecisionStorageKey(projectId);
  let current: unknown[] = [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(key) ?? "[]");
    if (Array.isArray(parsed)) current = parsed.filter((item) => isRecord(item) && item.projectId === projectId && item.domain === "pathway").slice(-199);
  } catch {
    current = [];
  }
  const next = [...current, decision].slice(-200);
  storage.setItem(key, JSON.stringify(next));
  return next.length;
}
