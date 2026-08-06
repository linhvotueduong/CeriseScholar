import {
  canonicalArtifactJson,
  createResearchArtifactIdentity,
  normalizeResearchArtifactIdentity,
  verifyResearchArtifactIdentity,
  type ResearchArtifactIdentity,
} from "./artifactIdentity";
import {
  EMPTY_RESEARCH_PATH_DRAFT,
  normalizeResearchPathDraft,
  readStepDraft,
  type ResearchPathDraft,
} from "./researchPathDraft";
import {
  LEGACY_STAGE_1_STEP_IDS,
  PHASE2_STAGE_1_STEP_IDS,
  RESEARCH_BASELINE_SOURCES,
  RESEARCH_CRITERION_RATINGS,
  RESEARCH_IDEA_KINDS,
  RESEARCH_PATHWAY_ITEM_STATUSES,
  RESEARCH_QUESTION_FAMILIES,
  emptyQuestionCriteria,
  emptyQuestionScope,
  emptyResearchPathwayDecision,
  isPhase3ResearchPathwayField,
  phase2MappedFieldKeys,
  readPhase2PathwayDraft,
  type CandidateProblemFrame,
  type ResearchBaselineEntry,
  type ResearchIdeaSpark,
  type ResearchPathwayDecision,
  type ResearchPathwayItemOrigin,
  type ResearchPathwayItemStatus,
  type ResearchQuestionCandidate,
} from "./researchPathwayPhase2Model";
import { researchPathwayRosterFieldKey } from "./researchPathwayPhase3Rows";

export type {
  CandidateProblemFrame,
  ResearchBaselineEntry,
  ResearchIdeaSpark,
  ResearchPathwayDecision,
  ResearchPathwayItemOrigin,
  ResearchPathwayItemStatus,
  ResearchQuestionCandidate,
  ResearchQuestionFamily,
} from "./researchPathwayPhase2Model";

export const RESEARCH_PATHWAY_DOCUMENT_SCHEMA_VERSION = 2 as const;
export const MAX_RESEARCH_PATHWAY_ITEMS = 500;
export const MAX_RESEARCH_PATHWAY_TEXT = 20_000;

export type ResearchPathwayMigrationSource = "workspace-v1" | "workspace-v2" | "project-columns" | "canonical";

export interface LegacyProjectPathwayFields {
  researchQuestion: string;
  researchApproach: string;
  researchHypothesis: string;
  updatedAt: string | null;
}

export interface ResearchPathwayStepState {
  stepId: string;
  completed: boolean;
  checks: Record<string, boolean>;
}

export interface ResearchPathwayLegacyFieldSet {
  stepId: string;
  fields: Record<string, string>;
}

export interface ResearchPathwayMigrationMetadata {
  sources: ResearchPathwayMigrationSource[];
  importedAt: string | null;
  legacyWorkspacePreserved: true;
  legacyProjectColumnsDualWritten: true;
  legacyStepStates: ResearchPathwayStepState[];
}

export interface ResearchPathwayPayload {
  schemaVersion: typeof RESEARCH_PATHWAY_DOCUMENT_SCHEMA_VERSION;
  projectId: string;
  revision: number;
  ideas: ResearchIdeaSpark[];
  problemFrames: CandidateProblemFrame[];
  baselineEntries: ResearchBaselineEntry[];
  questionCandidates: ResearchQuestionCandidate[];
  decision: ResearchPathwayDecision;
  parkingLot: ResearchIdeaSpark[];
  stepStates: ResearchPathwayStepState[];
  unmappedLegacyFields: ResearchPathwayLegacyFieldSet[];
  migration: ResearchPathwayMigrationMetadata;
  updatedAt: string;
  participantDataIncluded: false;
  claim: "researcher-owned-provisional-pathway-not-novelty-methodological-or-ethical-validation";
}

export interface ResearchPathwayDocument extends ResearchPathwayPayload {
  identity: ResearchArtifactIdentity;
}

const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const ITEM_ORIGINS: readonly ResearchPathwayItemOrigin[] = ["researcher", "legacy-workspace", "legacy-project", "system-migration"];
const MIGRATION_SOURCES: readonly ResearchPathwayMigrationSource[] = ["workspace-v1", "workspace-v2", "project-columns", "canonical"];
const ROUTE_INTENTS = ["primary-data", "secondary-data", "evidence-synthesis"] as const;
const METHOD_FAMILIES = ["quantitative", "qualitative", "mixed-methods", "evidence-synthesis"] as const;
const ASSIGNMENT_STRATEGIES = ["randomized", "non-randomized", "none", "undetermined"] as const;
const ROUTE_SETTINGS = ["online-home", "laboratory", "field", "telephone", "import-only", "not-applicable", "undetermined"] as const;
const ROUTE_AUDIENCES = ["adult", "minor", "capacity-limited", "not-participant", "undetermined"] as const;
const DATA_SENSITIVITIES = ["public", "deidentified", "restricted", "identifiable", "undetermined"] as const;
const SPECIAL_PROCEDURES = ["recording", "deception", "specimen", "genetic", "longitudinal", "reconsent"] as const;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function cleanText(value: unknown, maximum = MAX_RESEARCH_PATHWAY_TEXT): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maximum)
    : "";
}

function token(value: unknown): string {
  const candidate = cleanText(value, 160);
  return TOKEN_PATTERN.test(candidate) ? candidate : "";
}

function isoTimestamp(value: unknown, fallback?: string): string | null {
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) return new Date(value).toISOString();
  if (fallback && Number.isFinite(Date.parse(fallback))) return new Date(fallback).toISOString();
  return null;
}

function unique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort();
}

function uniqueItems<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => item.id && !seen.has(item.id) && seen.add(item.id)).slice(0, MAX_RESEARCH_PATHWAY_ITEMS);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return unique(value.map((item) => cleanText(item)).filter(Boolean)).slice(0, MAX_RESEARCH_PATHWAY_ITEMS);
}

function orderedStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanText(item)).filter(Boolean))].slice(0, MAX_RESEARCH_PATHWAY_ITEMS);
}

function stringMap(value: unknown): Record<string, string> {
  const candidate = record(value);
  if (!candidate) return {};
  return Object.fromEntries(Object.entries(candidate)
    .filter(([key, item]) => token(key) && typeof item === "string")
    .slice(0, MAX_RESEARCH_PATHWAY_ITEMS)
    .map(([key, item]) => [key, cleanText(item)])
    .sort(([left], [right]) => left.localeCompare(right)));
}

function booleanMap(value: unknown): Record<string, boolean> {
  const candidate = record(value);
  if (!candidate) return {};
  return Object.fromEntries(Object.entries(candidate)
    .filter(([key, item]) => token(key) && typeof item === "boolean")
    .slice(0, MAX_RESEARCH_PATHWAY_ITEMS)
    .sort(([left], [right]) => left.localeCompare(right))) as Record<string, boolean>;
}

function member<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return values.includes(value as T) ? value as T : fallback;
}

function nullableMember<T extends string>(value: unknown, values: readonly T[]): T | null {
  return values.includes(value as T) ? value as T : null;
}

function payloadOf(document: ResearchPathwayDocument): ResearchPathwayPayload {
  const { identity: _identity, ...payload } = document;
  void _identity;
  return payload;
}

function artifactId(projectId: string): string {
  return `pathway-${projectId}`;
}

function sortedNumericFieldIndexes(fields: Record<string, string>, pattern: RegExp): number[] {
  const indexes = new Set<number>();
  for (const key of Object.keys(fields)) {
    const match = pattern.exec(key);
    if (match) indexes.add(Number(match[1]));
  }
  return [...indexes].filter(Number.isSafeInteger).sort((left, right) => left - right);
}

function workspaceProblemFrames(draft: ResearchPathDraft): CandidateProblemFrame[] {
  const fields = readStepDraft(draft, LEGACY_STAGE_1_STEP_IDS[0]).fields;
  return sortedNumericFieldIndexes(fields, /^problem-(\d+)-(?:situation|consequence|response)$/).flatMap((index) => {
    const situation = cleanText(fields[`problem-${index}-situation`]);
    const consequence = cleanText(fields[`problem-${index}-consequence`]);
    const proposedResponse = cleanText(fields[`problem-${index}-response`]);
    if (![situation, consequence, proposedResponse].some(Boolean)) return [];
    return [{
      id: `legacy-problem-${index + 1}`,
      title: "",
      situation,
      affected: "",
      consequence,
      uncertainty: "",
      observedBasis: "",
      assumptions: "",
      interpretation: "",
      alternativeExplanations: "",
      proposedResponse,
      status: "exploring" as const,
      origin: "legacy-workspace" as const,
      legacyRowIndex: index,
    }];
  });
}

function workspaceBaselineEntries(draft: ResearchPathDraft): ResearchBaselineEntry[] {
  const fields = readStepDraft(draft, LEGACY_STAGE_1_STEP_IDS[1]).fields;
  const surfaces = [["scholarask", "scholarask"], ["workspace", "workspace"], ["evidence", "evidence-library"]] as const;
  return surfaces.flatMap(([fieldPrefix, surface]) => {
    const needs = cleanText(fields[`${fieldPrefix}-needs`]);
    const gaps = cleanText(fields[`${fieldPrefix}-gaps`]);
    if (![needs, gaps].some(Boolean)) return [];
    return [{
      id: `legacy-baseline-${fieldPrefix}`,
      surface,
      known: "",
      contested: "",
      missing: gaps,
      assumed: "",
      needs,
      gaps,
      searchTerms: "",
      adjacentDisciplines: "",
      missingVoices: "",
      linkedProblemFrameIds: [],
      evidenceReferenceIds: [],
      status: "exploring" as const,
      origin: "legacy-workspace" as const,
    }];
  });
}

function legacyQuestion(id: string, text: string, status: ResearchPathwayItemStatus, collection: "raw" | "key" | "project", index: number | null, origin: ResearchPathwayItemOrigin): ResearchQuestionCandidate {
  return {
    id,
    text,
    family: null,
    status,
    origin,
    linkedProblemFrameIds: [],
    linkedBaselineEntryIds: [],
    scope: emptyQuestionScope(),
    methodologicalImplications: [],
    embeddedAssumptions: [],
    criteria: emptyQuestionCriteria(),
    comparisonNotes: "",
    legacyCollection: collection,
    legacyRowIndex: index,
  };
}

function workspaceQuestionCandidates(draft: ResearchPathDraft): ResearchQuestionCandidate[] {
  const fields = readStepDraft(draft, LEGACY_STAGE_1_STEP_IDS[2]).fields;
  const raw = sortedNumericFieldIndexes(fields, /^raw-question-(\d+)$/).flatMap((index) => {
    const text = cleanText(fields[`raw-question-${index}`]);
    return text ? [legacyQuestion(`legacy-raw-question-${index + 1}`, text, "exploring", "raw", index, "legacy-workspace")] : [];
  });
  const key = sortedNumericFieldIndexes(fields, /^key-question-(\d+)$/).flatMap((index) => {
    const text = cleanText(fields[`key-question-${index}`]);
    return text ? [legacyQuestion(`legacy-key-question-${index + 1}`, text, "selected", "key", index, "legacy-workspace")] : [];
  });
  return [...raw, ...key];
}

function legacyMappedFieldKeys(): Map<string, Set<string>> {
  const problem = new Set<string>(["identified-problem"]);
  const questions = new Set<string>();
  for (let index = 0; index < MAX_RESEARCH_PATHWAY_ITEMS; index += 1) {
    ["situation", "consequence", "response"].forEach((key) => problem.add(`problem-${index}-${key}`));
    questions.add(`raw-question-${index}`);
    questions.add(`key-question-${index}`);
  }
  const baseline = new Set<string>(["baseline-synthesis"]);
  for (const prefix of ["scholarask", "workspace", "evidence"]) {
    baseline.add(`${prefix}-needs`);
    baseline.add(`${prefix}-gaps`);
  }
  return new Map([
    [LEGACY_STAGE_1_STEP_IDS[0], problem],
    [LEGACY_STAGE_1_STEP_IDS[1], baseline],
    [LEGACY_STAGE_1_STEP_IDS[2], questions],
    [LEGACY_STAGE_1_STEP_IDS[3], new Set(["backcasting-vision", "backcasting-baseline", "backcasting-concepts", "backcasting-roadmap"])],
  ]);
}

function collectUnmappedFields(draft: ResearchPathDraft): ResearchPathwayLegacyFieldSet[] {
  const mapped = new Map([...legacyMappedFieldKeys(), ...phase2MappedFieldKeys()]);
  return [...LEGACY_STAGE_1_STEP_IDS, ...PHASE2_STAGE_1_STEP_IDS].flatMap((stepId) => {
    const remaining = Object.fromEntries(Object.entries(readStepDraft(draft, stepId).fields)
      .filter(([key, value]) => !mapped.get(stepId)?.has(key) && !isPhase3ResearchPathwayField(stepId, key) && value.trim())
      .sort(([left], [right]) => left.localeCompare(right)));
    return Object.keys(remaining).length ? [{ stepId, fields: remaining }] : [];
  });
}

function readStepStates(draft: ResearchPathDraft, stepIds: readonly string[]): ResearchPathwayStepState[] {
  return stepIds.map((stepId) => {
    const step = readStepDraft(draft, stepId);
    return { stepId, completed: step.completed, checks: Object.fromEntries(Object.entries(step.checks).sort(([left], [right]) => left.localeCompare(right))) };
  });
}

function simpleDerivedStepStates(projection: ReturnType<typeof readPhase2PathwayDraft>): ResearchPathwayStepState[] {
  const decision = projection.decision;
  const values = [
    projection.ideas.some((item) => item.status !== "parked" && item.status !== "rejected" && item.text.trim()),
    projection.problemFrames.some((item) => item.status !== "parked" && item.status !== "rejected" && item.situation.trim() && item.uncertainty.trim()),
    projection.baselineEntries.some((item) => item.status !== "parked" && item.status !== "rejected" && [item.known, item.contested, item.missing, item.assumed].some((value) => value.trim())),
    projection.questionCandidates.some((item) => item.status !== "parked" && item.status !== "rejected" && item.text.trim()),
    Boolean(decision.selectedProblemFrameIds.length && decision.selectedQuestionIds.length && decision.rationale.trim()),
  ];
  return PHASE2_STAGE_1_STEP_IDS.map((stepId, index) => ({ stepId, completed: values[index], checks: {} }));
}

function mergeLegacyProjectQuestion(candidates: ResearchQuestionCandidate[], fields: LegacyProjectPathwayFields | null): ResearchQuestionCandidate[] {
  const question = cleanText(fields?.researchQuestion);
  if (!question || candidates.some((candidate) => candidate.text.localeCompare(question, undefined, { sensitivity: "base" }) === 0)) return candidates;
  return [...candidates, legacyQuestion("legacy-project-question", question, candidates.some((item) => item.status === "selected") ? "promising" : "selected", "project", null, "legacy-project")];
}

export function emptyLegacyProjectPathwayFields(): LegacyProjectPathwayFields {
  return { researchQuestion: "", researchApproach: "", researchHypothesis: "", updatedAt: null };
}

export function isLegacyProjectPathwayEmpty(fields: LegacyProjectPathwayFields | null): boolean {
  return !fields || ![fields.researchQuestion, fields.researchApproach, fields.researchHypothesis].some((value) => value.trim());
}

export async function createResearchPathwayDocument(input: {
  projectId: string;
  draft?: ResearchPathDraft;
  legacyProject?: LegacyProjectPathwayFields | null;
  previous?: ResearchPathwayDocument | null;
  migrationSources?: readonly ResearchPathwayMigrationSource[];
  now?: string;
}): Promise<ResearchPathwayDocument> {
  const projectId = token(input.projectId);
  if (!projectId) throw new Error("Research pathway project ID is invalid.");
  const draft = normalizeResearchPathDraft(input.draft ?? EMPTY_RESEARCH_PATH_DRAFT);
  const previous = input.previous ?? null;
  const legacyProject = input.legacyProject ?? null;
  const phase2 = readPhase2PathwayDraft(draft);
  const legacyProblems = workspaceProblemFrames(draft);
  const legacyBaseline = workspaceBaselineEntries(draft);
  const legacyQuestions = mergeLegacyProjectQuestion(workspaceQuestionCandidates(draft), legacyProject);
  const problemStep = readStepDraft(draft, LEGACY_STAGE_1_STEP_IDS[0]);
  const baselineStep = readStepDraft(draft, LEGACY_STAGE_1_STEP_IDS[1]);
  const backcastingStep = readStepDraft(draft, LEGACY_STAGE_1_STEP_IDS[3]);
  const now = isoTimestamp(input.now) ?? new Date().toISOString();

  const replaceRepresented = <T extends { id: string }>(previousItems: readonly T[], next: readonly T[], representedIds: readonly string[]): T[] => (
    uniqueItems([...previousItems.filter((item) => !representedIds.includes(item.id)), ...next])
  );
  const problems = phase2.hasPhase2Fields
    ? replaceRepresented(previous?.problemFrames ?? [], phase2.problemFrames, phase2.representedIds.problemFrames)
    : uniqueItems([...(previous?.problemFrames.filter((item) => item.origin !== "legacy-workspace") ?? []), ...legacyProblems]);
  const baseline = phase2.hasPhase2Fields
    ? replaceRepresented(previous?.baselineEntries ?? [], phase2.baselineEntries, phase2.representedIds.baselineEntries)
    : uniqueItems([...(previous?.baselineEntries.filter((item) => item.origin !== "legacy-workspace") ?? []), ...legacyBaseline]);
  const questions = phase2.hasPhase2Fields
    ? replaceRepresented(previous?.questionCandidates.filter((item) => legacyProject === null || item.origin !== "legacy-project") ?? [], phase2.questionCandidates, phase2.representedIds.questionCandidates)
    : uniqueItems([...(previous?.questionCandidates.filter((item) => item.origin !== "legacy-workspace" && (legacyProject === null || item.origin !== "legacy-project")) ?? []), ...legacyQuestions]);
  const ideas = phase2.hasPhase2Fields
    ? replaceRepresented(previous?.ideas ?? [], phase2.ideas, phase2.representedIds.ideas)
    : previous?.ideas ?? [];
  const parkingLot = phase2.hasPhase2Fields
    ? replaceRepresented(previous?.parkingLot ?? [], phase2.parkingLot, phase2.representedIds.parkingLot)
    : previous?.parkingLot ?? [];

  const selectedFrames = problems.filter((item) => item.status === "selected");
  const selectedQuestions = questions.filter((item) => item.status === "selected");
  const priorDecision = previous?.decision ?? emptyResearchPathwayDecision();
  const phase2Decision = phase2.hasPhase2Fields ? phase2.decision : priorDecision;
  const decision: ResearchPathwayDecision = {
    ...emptyResearchPathwayDecision(),
    ...priorDecision,
    ...phase2Decision,
    identifiedProblem: cleanText(phase2Decision.identifiedProblem || problemStep.fields["identified-problem"] || priorDecision.identifiedProblem),
    baselineSynthesis: cleanText(phase2Decision.baselineSynthesis || baselineStep.fields["baseline-synthesis"] || priorDecision.baselineSynthesis),
    mainQuestion: cleanText(selectedQuestions[0]?.text || legacyProject?.researchQuestion || phase2Decision.mainQuestion || priorDecision.mainQuestion),
    researchApproach: cleanText(phase2Decision.researchApproach || legacyProject?.researchApproach || priorDecision.researchApproach),
    workingHypothesis: cleanText(legacyProject?.researchHypothesis || priorDecision.workingHypothesis),
    selectedProblemFrameIds: selectedFrames.map((item) => item.id),
    selectedQuestionIds: selectedQuestions.map((item) => item.id),
    rationale: cleanText(phase2Decision.rationale || priorDecision.rationale),
    unresolvedQuestions: unique((phase2Decision.unresolvedQuestions.length ? phase2Decision.unresolvedQuestions : priorDecision.unresolvedQuestions).map((item) => cleanText(item)).filter(Boolean)).slice(0, MAX_RESEARCH_PATHWAY_ITEMS),
    route: phase2Decision.route,
    backcasting: phase2.hasPhase2Fields ? phase2Decision.backcasting : {
      vision: cleanText(backcastingStep.fields["backcasting-vision"] || priorDecision.backcasting.vision),
      baseline: cleanText(backcastingStep.fields["backcasting-baseline"] || priorDecision.backcasting.baseline),
      concepts: cleanText(backcastingStep.fields["backcasting-concepts"] || priorDecision.backcasting.concepts),
      roadmap: cleanText(backcastingStep.fields["backcasting-roadmap"] || priorDecision.backcasting.roadmap),
    },
  };
  const sources = unique([
    ...(previous?.migration.sources ?? []),
    ...(input.migrationSources ?? []),
    ...(!isLegacyProjectPathwayEmpty(legacyProject) ? ["project-columns" as const] : []),
  ].filter((source): source is ResearchPathwayMigrationSource => MIGRATION_SOURCES.includes(source)));
  const payload: ResearchPathwayPayload = {
    schemaVersion: RESEARCH_PATHWAY_DOCUMENT_SCHEMA_VERSION,
    projectId,
    revision: (previous?.revision ?? 0) + 1,
    ideas,
    problemFrames: problems,
    baselineEntries: baseline,
    questionCandidates: questions,
    decision,
    parkingLot,
    stepStates: simpleDerivedStepStates({ ...phase2, problemFrames: problems, baselineEntries: baseline, questionCandidates: questions, ideas, parkingLot, decision }),
    unmappedLegacyFields: collectUnmappedFields(draft),
    migration: {
      sources,
      importedAt: previous?.migration.importedAt ?? (sources.some((source) => source !== "canonical") ? now : null),
      legacyWorkspacePreserved: true,
      legacyProjectColumnsDualWritten: true,
      legacyStepStates: previous?.migration.legacyStepStates.length ? previous.migration.legacyStepStates : readStepStates(draft, LEGACY_STAGE_1_STEP_IDS),
    },
    updatedAt: now,
    participantDataIncluded: false,
    claim: "researcher-owned-provisional-pathway-not-novelty-methodological-or-ethical-validation",
  };
  return { ...payload, identity: await createResearchArtifactIdentity({ artifactKind: "research-pathway", artifactId: artifactId(projectId), artifactSchemaVersion: RESEARCH_PATHWAY_DOCUMENT_SCHEMA_VERSION, payload }) };
}

function projectPhase2Fields(document: ResearchPathwayDocument): Map<string, Record<string, string>> {
  const fields = new Map<string, Record<string, string>>(PHASE2_STAGE_1_STEP_IDS.map((stepId) => [stepId, {}]));
  const writeRosters = (target: Record<string, string>, collection: "ideas" | "parking" | "problems" | "baseline" | "questions", activeCount: number, archivedCount: number) => {
    if (activeCount + archivedCount === 0) return;
    target[researchPathwayRosterFieldKey(collection, "active")] = JSON.stringify(Array.from({ length: activeCount }, (_, index) => String(index)));
    target[researchPathwayRosterFieldKey(collection, "archived")] = JSON.stringify(Array.from({ length: archivedCount }, (_, index) => String(activeCount + index)));
  };
  const concern = fields.get(PHASE2_STAGE_1_STEP_IDS[0])!;
  const firstNarrative = document.ideas.find((item) => item.id === "concern-narrative");
  if (firstNarrative) {
    concern["concern-narrative"] = firstNarrative.text;
    concern["concern-affected"] = firstNarrative.affectedContext;
    concern["concern-matters"] = firstNarrative.whyItMatters;
  }
  const ideaItems = document.ideas.filter((item) => item.id !== "concern-narrative" && item.origin === "researcher");
  const activeIdeas = ideaItems.filter((item) => item.status !== "parked" && item.status !== "rejected");
  const archivedIdeas = ideaItems.filter((item) => item.status === "parked" || item.status === "rejected");
  writeRosters(concern, "ideas", activeIdeas.length, archivedIdeas.length);
  [...activeIdeas, ...archivedIdeas].forEach((item, index) => Object.assign(concern, {
    [`idea-${index}-id`]: item.id, [`idea-${index}-text`]: item.text, [`idea-${index}-kind`]: item.kind,
    [`idea-${index}-affected`]: item.affectedContext, [`idea-${index}-status`]: item.status,
  }));
  const activeParking = document.parkingLot.filter((item) => item.origin === "researcher" && item.status !== "rejected");
  const archivedParking = document.parkingLot.filter((item) => item.origin === "researcher" && item.status === "rejected");
  writeRosters(concern, "parking", activeParking.length, archivedParking.length);
  [...activeParking, ...archivedParking].forEach((item, index) => Object.assign(concern, {
    [`parking-${index}-id`]: item.id, [`parking-${index}-text`]: item.text, [`parking-${index}-status`]: item.status,
  }));

  const problem = fields.get(PHASE2_STAGE_1_STEP_IDS[1])!;
  const researcherProblems = document.problemFrames.filter((item) => item.origin === "researcher");
  const activeProblems = researcherProblems.filter((item) => item.status !== "parked" && item.status !== "rejected");
  const archivedProblems = researcherProblems.filter((item) => item.status === "parked" || item.status === "rejected");
  writeRosters(problem, "problems", activeProblems.length, archivedProblems.length);
  [...activeProblems, ...archivedProblems].forEach((item, index) => Object.assign(problem, {
    [`frame-${index}-id`]: item.id, [`frame-${index}-title`]: item.title, [`frame-${index}-situation`]: item.situation,
    [`frame-${index}-affected`]: item.affected, [`frame-${index}-consequence`]: item.consequence, [`frame-${index}-uncertainty`]: item.uncertainty,
    [`frame-${index}-observed`]: item.observedBasis, [`frame-${index}-assumptions`]: item.assumptions,
    [`frame-${index}-interpretation`]: item.interpretation, [`frame-${index}-alternatives`]: item.alternativeExplanations,
    [`frame-${index}-status`]: item.status,
  }));

  const baseline = fields.get(PHASE2_STAGE_1_STEP_IDS[2])!;
  baseline["baseline-synthesis"] = document.decision.baselineSynthesis;
  const researcherBaseline = document.baselineEntries.filter((item) => item.origin === "researcher");
  const activeBaseline = researcherBaseline.filter((item) => item.status !== "parked" && item.status !== "rejected");
  const archivedBaseline = researcherBaseline.filter((item) => item.status === "parked" || item.status === "rejected");
  writeRosters(baseline, "baseline", activeBaseline.length, archivedBaseline.length);
  [...activeBaseline, ...archivedBaseline].forEach((item, index) => Object.assign(baseline, {
    [`baseline-${index}-id`]: item.id, [`baseline-${index}-source`]: item.surface, [`baseline-${index}-known`]: item.known,
    [`baseline-${index}-contested`]: item.contested, [`baseline-${index}-missing`]: item.missing, [`baseline-${index}-assumed`]: item.assumed,
    [`baseline-${index}-search-terms`]: item.searchTerms, [`baseline-${index}-adjacent`]: item.adjacentDisciplines,
    [`baseline-${index}-missing-voices`]: item.missingVoices, [`baseline-${index}-linked-frames`]: item.linkedProblemFrameIds.join("\n"),
    [`baseline-${index}-evidence-refs`]: item.evidenceReferenceIds.join("\n"), [`baseline-${index}-status`]: item.status,
  }));

  const question = fields.get(PHASE2_STAGE_1_STEP_IDS[3])!;
  const researcherQuestions = document.questionCandidates.filter((item) => item.origin === "researcher");
  const activeQuestions = researcherQuestions.filter((item) => item.status !== "parked" && item.status !== "rejected");
  const archivedQuestions = researcherQuestions.filter((item) => item.status === "parked" || item.status === "rejected");
  writeRosters(question, "questions", activeQuestions.length, archivedQuestions.length);
  [...activeQuestions, ...archivedQuestions].forEach((item, index) => Object.assign(question, {
    [`question-${index}-id`]: item.id, [`question-${index}-text`]: item.text, [`question-${index}-family`]: item.family ?? "",
    [`question-${index}-status`]: item.status, [`question-${index}-linked-frames`]: item.linkedProblemFrameIds.join("\n"),
    [`question-${index}-linked-baseline`]: item.linkedBaselineEntryIds.join("\n"), [`question-${index}-scope-population`]: item.scope.populationOrSource,
    [`question-${index}-scope-setting`]: item.scope.setting, [`question-${index}-scope-construct`]: item.scope.constructOrPhenomenon,
    [`question-${index}-scope-timeframe`]: item.scope.timeframe, [`question-${index}-scope-comparison`]: item.scope.comparison,
    [`question-${index}-scope-evidence`]: item.scope.evidenceAccess, [`question-${index}-implications`]: item.methodologicalImplications.join("\n"),
    [`question-${index}-assumptions`]: item.embeddedAssumptions.join("\n"), [`question-${index}-criterion-significance`]: item.criteria.significance,
    [`question-${index}-criterion-interest`]: item.criteria.researcherInterest, [`question-${index}-criterion-feasibility`]: item.criteria.feasibility,
    [`question-${index}-criterion-ethics`]: item.criteria.ethics, [`question-${index}-criterion-evidence`]: item.criteria.evidenceAccess,
    [`question-${index}-criterion-contribution`]: item.criteria.contribution, [`question-${index}-comparison-notes`]: item.comparisonNotes,
  }));

  const choice = fields.get(PHASE2_STAGE_1_STEP_IDS[4])!;
  Object.assign(choice, {
    "pathway-rationale": document.decision.rationale, "pathway-uncertainties": document.decision.unresolvedQuestions.join("\n"),
    "route-intent": document.decision.route.intent ?? "", "route-method": document.decision.route.methodFamily ?? "",
    "route-assignment": document.decision.route.assignment ?? "",
    "route-setting": document.decision.route.setting ?? "", "route-audience": document.decision.route.audience ?? "",
    "route-sensitivity": document.decision.route.dataSensitivity ?? "", "route-special-procedures": document.decision.route.possibleSpecialProcedures.join("\n"),
    "route-confidence": document.decision.route.confidence, "backcasting-choice": document.decision.route.backcastingChoice,
    "backcasting-vision": document.decision.backcasting.vision, "backcasting-baseline": document.decision.backcasting.baseline,
    "backcasting-concepts": document.decision.backcasting.concepts, "backcasting-roadmap": document.decision.backcasting.roadmap,
  });
  return fields;
}

export function researchPathwayDocumentToDraft(document: ResearchPathwayDocument, currentDraft: ResearchPathDraft = EMPTY_RESEARCH_PATH_DRAFT): ResearchPathDraft {
  const current = normalizeResearchPathDraft(currentDraft);
  const steps = { ...current.steps };
  const phase2Fields = projectPhase2Fields(document);
  document.unmappedLegacyFields.forEach((item) => {
    const target = phase2Fields.get(item.stepId);
    if (target) Object.assign(target, item.fields);
  });
  const mapped = phase2MappedFieldKeys();
  for (const state of document.stepStates) {
    const prior = current.steps[state.stepId] ?? { completed: false, fields: {}, checks: {} };
    const preserved = Object.fromEntries(Object.entries(prior.fields).filter(([key]) => !mapped.get(state.stepId)?.has(key) && !isPhase3ResearchPathwayField(state.stepId, key)));
    steps[state.stepId] = { completed: state.completed, checks: { ...state.checks }, fields: { ...preserved, ...(phase2Fields.get(state.stepId) ?? {}) } };
  }

  const legacyFields = new Map<string, Record<string, string>>(LEGACY_STAGE_1_STEP_IDS.map((stepId) => [stepId, {}]));
  document.problemFrames.filter((item) => item.legacyRowIndex !== null).forEach((item) => Object.assign(legacyFields.get(LEGACY_STAGE_1_STEP_IDS[0])!, {
    [`problem-${item.legacyRowIndex}-situation`]: item.situation, [`problem-${item.legacyRowIndex}-consequence`]: item.consequence,
    [`problem-${item.legacyRowIndex}-response`]: item.proposedResponse,
  }));
  legacyFields.get(LEGACY_STAGE_1_STEP_IDS[0])!["identified-problem"] = document.decision.identifiedProblem;
  const prefix: Partial<Record<ResearchBaselineEntry["surface"], string>> = { scholarask: "scholarask", workspace: "workspace", "evidence-library": "evidence" };
  document.baselineEntries.forEach((entry) => {
    const target = prefix[entry.surface];
    if (target) Object.assign(legacyFields.get(LEGACY_STAGE_1_STEP_IDS[1])!, { [`${target}-needs`]: entry.needs, [`${target}-gaps`]: entry.gaps });
  });
  legacyFields.get(LEGACY_STAGE_1_STEP_IDS[1])!["baseline-synthesis"] = document.decision.baselineSynthesis;
  document.questionCandidates.forEach((item) => {
    if (item.legacyRowIndex !== null && item.legacyCollection && item.legacyCollection !== "project") legacyFields.get(LEGACY_STAGE_1_STEP_IDS[2])![`${item.legacyCollection}-question-${item.legacyRowIndex}`] = item.text;
  });
  Object.assign(legacyFields.get(LEGACY_STAGE_1_STEP_IDS[3])!, {
    "backcasting-vision": document.decision.backcasting.vision, "backcasting-baseline": document.decision.backcasting.baseline,
    "backcasting-concepts": document.decision.backcasting.concepts, "backcasting-roadmap": document.decision.backcasting.roadmap,
  });
  document.unmappedLegacyFields.forEach((item) => {
    const target = legacyFields.get(item.stepId);
    if (target) Object.assign(target, item.fields);
  });
  for (const state of document.migration.legacyStepStates) {
    const prior = current.steps[state.stepId] ?? { completed: false, fields: {}, checks: {} };
    const preserved = Object.fromEntries(Object.entries(prior.fields).filter(([key]) => !legacyMappedFieldKeys().get(state.stepId)?.has(key)));
    steps[state.stepId] = { completed: state.completed, checks: { ...state.checks }, fields: { ...preserved, ...(legacyFields.get(state.stepId) ?? {}) } };
  }
  return { steps };
}

function normalizeIdea(raw: unknown): ResearchIdeaSpark | null {
  const item = record(raw);
  if (!item || !token(item.id) || !ITEM_ORIGINS.includes(item.origin as ResearchPathwayItemOrigin)) return null;
  return {
    id: token(item.id), text: cleanText(item.text), kind: member(item.kind, RESEARCH_IDEA_KINDS, "other"),
    affectedContext: cleanText(item.affectedContext), whyItMatters: cleanText(item.whyItMatters), status: member(item.status, RESEARCH_PATHWAY_ITEM_STATUSES, "exploring"),
    origin: item.origin as ResearchPathwayItemOrigin,
  };
}

function normalizeProblem(raw: unknown): CandidateProblemFrame | null {
  const item = record(raw);
  if (!item || !token(item.id) || !ITEM_ORIGINS.includes(item.origin as ResearchPathwayItemOrigin)) return null;
  const legacyRowIndex = item.legacyRowIndex === null ? null : Number.isSafeInteger(item.legacyRowIndex) && (item.legacyRowIndex as number) >= 0 ? item.legacyRowIndex as number : NaN;
  if (Number.isNaN(legacyRowIndex)) return null;
  return {
    id: token(item.id), title: cleanText(item.title), situation: cleanText(item.situation), affected: cleanText(item.affected),
    consequence: cleanText(item.consequence), uncertainty: cleanText(item.uncertainty), observedBasis: cleanText(item.observedBasis),
    assumptions: cleanText(item.assumptions), interpretation: cleanText(item.interpretation), alternativeExplanations: cleanText(item.alternativeExplanations),
    proposedResponse: cleanText(item.proposedResponse), status: member(item.status, RESEARCH_PATHWAY_ITEM_STATUSES, "exploring"),
    origin: item.origin as ResearchPathwayItemOrigin, legacyRowIndex,
  };
}

function normalizeBaseline(raw: unknown): ResearchBaselineEntry | null {
  const item = record(raw);
  if (!item || !token(item.id) || !ITEM_ORIGINS.includes(item.origin as ResearchPathwayItemOrigin)) return null;
  return {
    id: token(item.id), surface: member(item.surface, RESEARCH_BASELINE_SOURCES, "other"), known: cleanText(item.known),
    contested: cleanText(item.contested), missing: cleanText(item.missing), assumed: cleanText(item.assumed), needs: cleanText(item.needs),
    gaps: cleanText(item.gaps), searchTerms: cleanText(item.searchTerms), adjacentDisciplines: cleanText(item.adjacentDisciplines),
    missingVoices: cleanText(item.missingVoices), linkedProblemFrameIds: stringList(item.linkedProblemFrameIds),
    evidenceReferenceIds: stringList(item.evidenceReferenceIds), status: member(item.status, RESEARCH_PATHWAY_ITEM_STATUSES, "exploring"),
    origin: item.origin as ResearchPathwayItemOrigin,
  };
}

function normalizeQuestion(raw: unknown): ResearchQuestionCandidate | null {
  const item = record(raw);
  if (!item || !token(item.id) || !ITEM_ORIGINS.includes(item.origin as ResearchPathwayItemOrigin)) return null;
  const scope = record(item.scope) ?? {};
  const criteria = record(item.criteria) ?? {};
  const legacyCollection = item.legacyCollection === null ? null : nullableMember(item.legacyCollection, ["raw", "key", "project"] as const);
  const legacyRowIndex = item.legacyRowIndex === null ? null : Number.isSafeInteger(item.legacyRowIndex) && (item.legacyRowIndex as number) >= 0 ? item.legacyRowIndex as number : NaN;
  if (item.legacyCollection !== null && !legacyCollection || Number.isNaN(legacyRowIndex)) return null;
  return {
    id: token(item.id), text: cleanText(item.text), family: nullableMember(item.family, RESEARCH_QUESTION_FAMILIES),
    status: member(item.status, RESEARCH_PATHWAY_ITEM_STATUSES, "exploring"), origin: item.origin as ResearchPathwayItemOrigin,
    linkedProblemFrameIds: stringList(item.linkedProblemFrameIds), linkedBaselineEntryIds: stringList(item.linkedBaselineEntryIds),
    scope: { populationOrSource: cleanText(scope.populationOrSource), setting: cleanText(scope.setting), constructOrPhenomenon: cleanText(scope.constructOrPhenomenon), timeframe: cleanText(scope.timeframe), comparison: cleanText(scope.comparison), evidenceAccess: cleanText(scope.evidenceAccess) },
    methodologicalImplications: stringList(item.methodologicalImplications), embeddedAssumptions: stringList(item.embeddedAssumptions),
    criteria: { significance: member(criteria.significance, RESEARCH_CRITERION_RATINGS, "unrated"), researcherInterest: member(criteria.researcherInterest, RESEARCH_CRITERION_RATINGS, "unrated"), feasibility: member(criteria.feasibility, RESEARCH_CRITERION_RATINGS, "unrated"), ethics: member(criteria.ethics, RESEARCH_CRITERION_RATINGS, "unrated"), evidenceAccess: member(criteria.evidenceAccess, RESEARCH_CRITERION_RATINGS, "unrated"), contribution: member(criteria.contribution, RESEARCH_CRITERION_RATINGS, "unrated") },
    comparisonNotes: cleanText(item.comparisonNotes), legacyCollection, legacyRowIndex,
  };
}

function normalizeStepStates(value: unknown, expectedIds: readonly string[]): ResearchPathwayStepState[] | null {
  if (!Array.isArray(value) || value.length !== expectedIds.length) return null;
  const states = value.map((raw) => {
    const item = record(raw);
    return item && token(item.stepId) && typeof item.completed === "boolean" ? { stepId: token(item.stepId), completed: item.completed, checks: booleanMap(item.checks) } : null;
  });
  if (states.some((item) => !item)) return null;
  const result = states as ResearchPathwayStepState[];
  return canonicalArtifactJson(result.map((item) => item.stepId).sort()) === canonicalArtifactJson([...expectedIds].sort()) ? result : null;
}

function normalizePayload(value: unknown, projectId: string): ResearchPathwayPayload | null {
  const payload = record(value);
  if (!payload || payload.schemaVersion !== 2 || payload.projectId !== projectId || !Number.isSafeInteger(payload.revision) || (payload.revision as number) < 1) return null;
  const ideas = Array.isArray(payload.ideas) ? payload.ideas.map(normalizeIdea) : [];
  const parkingLot = Array.isArray(payload.parkingLot) ? payload.parkingLot.map(normalizeIdea) : [];
  const problems = Array.isArray(payload.problemFrames) ? payload.problemFrames.map(normalizeProblem) : [];
  const baselines = Array.isArray(payload.baselineEntries) ? payload.baselineEntries.map(normalizeBaseline) : [];
  const questions = Array.isArray(payload.questionCandidates) ? payload.questionCandidates.map(normalizeQuestion) : [];
  if ([ideas, parkingLot, problems, baselines, questions].some((items) => items.length > MAX_RESEARCH_PATHWAY_ITEMS || items.some((item) => !item))) return null;
  const normalizedIdeas = ideas as ResearchIdeaSpark[];
  const normalizedParking = parkingLot as ResearchIdeaSpark[];
  const normalizedProblems = problems as CandidateProblemFrame[];
  const normalizedBaselines = baselines as ResearchBaselineEntry[];
  const normalizedQuestions = questions as ResearchQuestionCandidate[];
  const allGroups = [[...normalizedIdeas, ...normalizedParking], normalizedProblems, normalizedBaselines, normalizedQuestions];
  if (allGroups.some((items) => new Set(items.map((item) => item.id)).size !== items.length)) return null;
  const problemIds = new Set(normalizedProblems.map((item) => item.id));
  const baselineIds = new Set(normalizedBaselines.map((item) => item.id));
  if (normalizedBaselines.some((item) => item.linkedProblemFrameIds.some((id) => !problemIds.has(id))) || normalizedQuestions.some((item) => item.linkedProblemFrameIds.some((id) => !problemIds.has(id)) || item.linkedBaselineEntryIds.some((id) => !baselineIds.has(id)))) return null;

  const rawDecision = record(payload.decision);
  const rawRoute = record(rawDecision?.route);
  const rawBackcasting = record(rawDecision?.backcasting);
  if (!rawDecision || !rawRoute || !rawBackcasting) return null;
  const selectedProblemFrameIds = orderedStringList(rawDecision.selectedProblemFrameIds);
  const selectedQuestionIds = orderedStringList(rawDecision.selectedQuestionIds);
  if (selectedProblemFrameIds.some((id) => !problemIds.has(id)) || selectedQuestionIds.some((id) => !normalizedQuestions.some((item) => item.id === id))) return null;
  const decision: ResearchPathwayDecision = {
    identifiedProblem: cleanText(rawDecision.identifiedProblem), baselineSynthesis: cleanText(rawDecision.baselineSynthesis),
    mainQuestion: cleanText(rawDecision.mainQuestion), researchApproach: cleanText(rawDecision.researchApproach), workingHypothesis: cleanText(rawDecision.workingHypothesis),
    selectedProblemFrameIds, selectedQuestionIds, rationale: cleanText(rawDecision.rationale), unresolvedQuestions: stringList(rawDecision.unresolvedQuestions),
    route: {
      intent: nullableMember(rawRoute.intent, ROUTE_INTENTS), methodFamily: nullableMember(rawRoute.methodFamily, METHOD_FAMILIES),
      assignment: nullableMember(rawRoute.assignment, ASSIGNMENT_STRATEGIES),
      setting: nullableMember(rawRoute.setting, ROUTE_SETTINGS), audience: nullableMember(rawRoute.audience, ROUTE_AUDIENCES),
      dataSensitivity: nullableMember(rawRoute.dataSensitivity, DATA_SENSITIVITIES), possibleSpecialProcedures: stringList(rawRoute.possibleSpecialProcedures).filter((item): item is typeof SPECIAL_PROCEDURES[number] => SPECIAL_PROCEDURES.includes(item as typeof SPECIAL_PROCEDURES[number])),
      confidence: member(rawRoute.confidence, ["unrated", "low", "medium", "high"] as const, "unrated"),
      backcastingChoice: member(rawRoute.backcastingChoice, ["undecided", "use", "not-use"] as const, "undecided"),
    },
    backcasting: { vision: cleanText(rawBackcasting.vision), baseline: cleanText(rawBackcasting.baseline), concepts: cleanText(rawBackcasting.concepts), roadmap: cleanText(rawBackcasting.roadmap) },
  };
  const stepStates = normalizeStepStates(payload.stepStates, PHASE2_STAGE_1_STEP_IDS);
  const migration = record(payload.migration);
  const legacyStepStates = normalizeStepStates(migration?.legacyStepStates, LEGACY_STAGE_1_STEP_IDS);
  if (!stepStates || !migration || !legacyStepStates || migration.legacyWorkspacePreserved !== true || migration.legacyProjectColumnsDualWritten !== true) return null;
  const sources = Array.isArray(migration.sources) ? migration.sources.filter((item): item is ResearchPathwayMigrationSource => MIGRATION_SOURCES.includes(item as ResearchPathwayMigrationSource)) : [];
  if (!Array.isArray(migration.sources) || sources.length !== migration.sources.length) return null;
  const unmappedLegacyFields = Array.isArray(payload.unmappedLegacyFields) ? payload.unmappedLegacyFields.map((raw) => {
    const item = record(raw);
    return item && token(item.stepId) ? { stepId: token(item.stepId), fields: stringMap(item.fields) } : null;
  }) : [];
  if (unmappedLegacyFields.some((item) => !item)) return null;
  const updatedAt = isoTimestamp(payload.updatedAt);
  const importedAt = migration.importedAt === null ? null : isoTimestamp(migration.importedAt);
  if (!updatedAt || migration.importedAt !== null && !importedAt || payload.participantDataIncluded !== false || payload.claim !== "researcher-owned-provisional-pathway-not-novelty-methodological-or-ethical-validation") return null;
  return {
    schemaVersion: 2, projectId, revision: payload.revision as number, ideas: normalizedIdeas, problemFrames: normalizedProblems,
    baselineEntries: normalizedBaselines, questionCandidates: normalizedQuestions, decision, parkingLot: normalizedParking, stepStates,
    unmappedLegacyFields: unmappedLegacyFields as ResearchPathwayLegacyFieldSet[],
    migration: { sources: unique(sources), importedAt, legacyWorkspacePreserved: true, legacyProjectColumnsDualWritten: true, legacyStepStates },
    updatedAt, participantDataIncluded: false, claim: "researcher-owned-provisional-pathway-not-novelty-methodological-or-ethical-validation",
  };
}

async function migrateVerifiedV1(candidate: Record<string, unknown>, projectId: string, identity: ResearchArtifactIdentity): Promise<ResearchPathwayDocument | null> {
  const rawPayload = { ...candidate };
  delete rawPayload.identity;
  if (!await verifyResearchArtifactIdentity(identity, rawPayload)) return null;
  const rawIdeas = Array.isArray(rawPayload.ideas) ? rawPayload.ideas.map((raw) => {
    const item = record(raw); return item && token(item.id) ? { id: token(item.id), text: cleanText(item.text), kind: "other" as const, affectedContext: "", whyItMatters: "", status: member(item.status, RESEARCH_PATHWAY_ITEM_STATUSES, "exploring"), origin: member(item.origin, ITEM_ORIGINS, "system-migration") } : null;
  }).filter(Boolean) as ResearchIdeaSpark[] : [];
  const rawProblems = Array.isArray(rawPayload.problemFrames) ? rawPayload.problemFrames.map((raw) => {
    const item = record(raw); if (!item || !token(item.id)) return null;
    return { id: token(item.id), title: "", situation: cleanText(item.situation), affected: "", consequence: cleanText(item.consequence), uncertainty: "", observedBasis: "", assumptions: "", interpretation: "", alternativeExplanations: "", proposedResponse: cleanText(item.proposedResponse), status: member(item.status, RESEARCH_PATHWAY_ITEM_STATUSES, "exploring"), origin: member(item.origin, ITEM_ORIGINS, "system-migration"), legacyRowIndex: item.legacyRowIndex === null ? null : Number.isSafeInteger(item.legacyRowIndex) ? item.legacyRowIndex as number : null };
  }).filter(Boolean) as CandidateProblemFrame[] : [];
  const rawBaselines = Array.isArray(rawPayload.baselineEntries) ? rawPayload.baselineEntries.map((raw) => {
    const item = record(raw); if (!item || !token(item.id)) return null;
    const gaps = cleanText(item.gaps); return { id: token(item.id), surface: member(item.surface, ["scholarask", "workspace", "evidence-library", "other"] as const, "other"), known: "", contested: "", missing: gaps, assumed: "", needs: cleanText(item.needs), gaps, searchTerms: "", adjacentDisciplines: "", missingVoices: "", linkedProblemFrameIds: [], evidenceReferenceIds: [], status: member(item.status, RESEARCH_PATHWAY_ITEM_STATUSES, "exploring"), origin: member(item.origin, ITEM_ORIGINS, "system-migration") };
  }).filter(Boolean) as ResearchBaselineEntry[] : [];
  const rawQuestions = Array.isArray(rawPayload.questionCandidates) ? rawPayload.questionCandidates.map((raw) => {
    const item = record(raw); if (!item || !token(item.id)) return null;
    return { ...legacyQuestion(token(item.id), cleanText(item.text), member(item.status, RESEARCH_PATHWAY_ITEM_STATUSES, "exploring"), member(item.legacyCollection, ["raw", "key", "project"] as const, "raw"), item.legacyRowIndex === null ? null : Number.isSafeInteger(item.legacyRowIndex) ? item.legacyRowIndex as number : null, member(item.origin, ITEM_ORIGINS, "system-migration")), family: nullableMember(item.family, RESEARCH_QUESTION_FAMILIES) };
  }).filter(Boolean) as ResearchQuestionCandidate[] : [];
  const rawDecision = record(rawPayload.decision) ?? {};
  const rawBackcasting = record(rawDecision.backcasting) ?? {};
  const selectedQuestionIds = stringList(rawDecision.selectedQuestionIds).filter((id) => rawQuestions.some((item) => item.id === id));
  const decision: ResearchPathwayDecision = {
    ...emptyResearchPathwayDecision(), identifiedProblem: cleanText(rawDecision.identifiedProblem), baselineSynthesis: cleanText(rawDecision.baselineSynthesis),
    mainQuestion: cleanText(rawDecision.mainQuestion), researchApproach: cleanText(rawDecision.researchApproach), workingHypothesis: cleanText(rawDecision.workingHypothesis),
    selectedQuestionIds, rationale: cleanText(rawDecision.rationale), unresolvedQuestions: stringList(rawDecision.unresolvedQuestions),
    backcasting: { vision: cleanText(rawBackcasting.vision), baseline: cleanText(rawBackcasting.baseline), concepts: cleanText(rawBackcasting.concepts), roadmap: cleanText(rawBackcasting.roadmap) },
  };
  const legacyStepStates = normalizeStepStates(rawPayload.stepStates, LEGACY_STAGE_1_STEP_IDS) ?? LEGACY_STAGE_1_STEP_IDS.map((stepId) => ({ stepId, completed: false, checks: {} }));
  const migrationRaw = record(rawPayload.migration) ?? {};
  const sources = Array.isArray(migrationRaw.sources) ? migrationRaw.sources.filter((item): item is ResearchPathwayMigrationSource => MIGRATION_SOURCES.includes(item as ResearchPathwayMigrationSource)) : [];
  const updatedAt = isoTimestamp(rawPayload.updatedAt) ?? new Date(0).toISOString();
  const payload: ResearchPathwayPayload = {
    schemaVersion: 2, projectId, revision: Number.isSafeInteger(rawPayload.revision) ? (rawPayload.revision as number) + 1 : 1,
    ideas: uniqueItems(rawIdeas), problemFrames: uniqueItems(rawProblems), baselineEntries: uniqueItems(rawBaselines), questionCandidates: uniqueItems(rawQuestions), decision,
    parkingLot: [], stepStates: PHASE2_STAGE_1_STEP_IDS.map((stepId) => ({ stepId, completed: false, checks: {} })),
    unmappedLegacyFields: Array.isArray(rawPayload.unmappedLegacyFields) ? rawPayload.unmappedLegacyFields.flatMap((raw) => { const item = record(raw); return item && token(item.stepId) ? [{ stepId: token(item.stepId), fields: stringMap(item.fields) }] : []; }) : [],
    migration: { sources: unique([...sources, "canonical"]), importedAt: isoTimestamp(migrationRaw.importedAt), legacyWorkspacePreserved: true, legacyProjectColumnsDualWritten: true, legacyStepStates },
    updatedAt, participantDataIncluded: false, claim: "researcher-owned-provisional-pathway-not-novelty-methodological-or-ethical-validation",
  };
  return { ...payload, identity: await createResearchArtifactIdentity({ artifactKind: "research-pathway", artifactId: artifactId(projectId), artifactSchemaVersion: 2, payload, sources: [{ artifactKind: identity.artifactKind, artifactId: identity.artifactId, schemaVersion: identity.artifactSchemaVersion, checksum: identity.checksum }] }) };
}

export async function normalizeResearchPathwayDocument(value: unknown, projectId: string): Promise<ResearchPathwayDocument | null> {
  const candidate = record(value);
  if (!candidate) return null;
  const identity = normalizeResearchArtifactIdentity(candidate.identity);
  if (!identity || identity.artifactKind !== "research-pathway" || identity.artifactId !== artifactId(projectId)) return null;
  if (identity.artifactSchemaVersion === 1) return migrateVerifiedV1(candidate, projectId, identity);
  if (identity.artifactSchemaVersion !== 2) return null;
  const payloadCandidate = { ...candidate };
  delete payloadCandidate.identity;
  const payload = normalizePayload(payloadCandidate, projectId);
  if (!payload || canonicalArtifactJson(payload) !== canonicalArtifactJson(payloadCandidate) || !await verifyResearchArtifactIdentity(identity, payload)) return null;
  return { ...payload, identity };
}

export async function verifyResearchPathwayDocument(document: ResearchPathwayDocument): Promise<boolean> {
  const normalized = await normalizeResearchPathwayDocument(document, document.projectId);
  return normalized !== null && canonicalArtifactJson(normalized) === canonicalArtifactJson(document);
}

export async function rebaseResearchPathwayDocument(document: ResearchPathwayDocument, previous: ResearchPathwayDocument | null, now = new Date().toISOString()): Promise<ResearchPathwayDocument> {
  if (previous && previous.projectId !== document.projectId) throw new Error("Research pathway revisions cannot be rebased across projects.");
  const payload: ResearchPathwayPayload = {
    ...payloadOf(document), revision: (previous?.revision ?? 0) + 1, updatedAt: isoTimestamp(now) ?? new Date().toISOString(),
    migration: { ...document.migration, sources: unique([...document.migration.sources, ...(previous ? ["canonical" as const] : [])]) },
  };
  return { ...payload, identity: await createResearchArtifactIdentity({ artifactKind: "research-pathway", artifactId: artifactId(document.projectId), artifactSchemaVersion: 2, payload }) };
}

export function researchPathwayContentView(document: ResearchPathwayDocument): unknown {
  const payload = payloadOf(document);
  const { revision: _revision, updatedAt: _updatedAt, migration: _migration, ...content } = payload;
  void _revision; void _updatedAt; void _migration;
  return content;
}

export function researchPathwayDocumentsHaveSameContent(left: ResearchPathwayDocument, right: ResearchPathwayDocument): boolean {
  return canonicalArtifactJson(researchPathwayContentView(left)) === canonicalArtifactJson(researchPathwayContentView(right));
}

export function isResearchPathwayDocumentEmpty(document: ResearchPathwayDocument): boolean {
  return !document.ideas.length && !document.problemFrames.length && !document.baselineEntries.length && !document.questionCandidates.length
    && !document.parkingLot.length && ![document.decision.identifiedProblem, document.decision.baselineSynthesis, document.decision.mainQuestion,
      document.decision.researchApproach, document.decision.workingHypothesis, document.decision.rationale, ...document.decision.unresolvedQuestions,
      ...Object.values(document.decision.backcasting)].some((value) => value.trim()) && !document.unmappedLegacyFields.length;
}

export function legacyProjectFieldsFromResearchPathway(document: ResearchPathwayDocument): LegacyProjectPathwayFields {
  return { researchQuestion: document.decision.mainQuestion, researchApproach: document.decision.researchApproach, researchHypothesis: document.decision.workingHypothesis, updatedAt: document.updatedAt };
}
