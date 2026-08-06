import {
  sha256ArtifactChecksum,
  type ResearchArtifactChecksum,
  type ResearchArtifactReference,
} from "./artifactIdentity";
import {
  compileProjectRouteProfile,
  validateProjectRouteInput,
  type ProjectRouteProfile,
  type ProjectRouteProfileInput,
  type ResearchIntent,
} from "./projectRouteProfile";
import {
  createResearchKnowledgeEntry,
  type ResearchKnowledgeEntry,
} from "./livingResearchRecord";
import type {
  CandidateProblemFrame,
  ResearchBaselineEntry,
  ResearchPathwayDocument,
  ResearchQuestionCandidate,
} from "./researchPathwayDocument";
import { PHASE2_STAGE_1_STEP_IDS } from "./researchPathwayPhase2Model";

export const RESEARCH_PATHWAY_BRIEF_SCHEMA_VERSION = 1 as const;

export type PathwayReadinessStatus = "ready" | "needs-work" | "not-started";

export interface PathwayReadinessCondition {
  id: string;
  label: string;
  met: boolean;
  blocking: boolean;
}

export interface PathwayStepReadiness {
  stepId: typeof PHASE2_STAGE_1_STEP_IDS[number];
  status: PathwayReadinessStatus;
  completed: number;
  total: number;
  conditions: PathwayReadinessCondition[];
}

export interface ResearchPathwayReadiness {
  readyForStage2: boolean;
  steps: PathwayStepReadiness[];
  blockingIssueIds: string[];
  advisoryIssueIds: string[];
}

export interface ResearchPathwayTerminology {
  contributorSingular: string;
  contributorPlural: string;
  evidenceUnit: string;
  scopeLabel: string;
  baselineGuidance: string;
  questionGuidance: string;
}

export interface ResearchPathwayBrief {
  schemaVersion: typeof RESEARCH_PATHWAY_BRIEF_SCHEMA_VERSION;
  projectId: string;
  pathwayRevision: number;
  source: ResearchArtifactReference;
  selectedProblems: CandidateProblemFrame[];
  selectedQuestions: ResearchQuestionCandidate[];
  baseline: ResearchBaselineEntry[];
  baselineSynthesis: string;
  rationale: string;
  unresolvedUncertainties: string[];
  route: ProjectRouteProfile;
  backcasting: {
    included: boolean;
    vision: string;
    baseline: string;
    concepts: string;
    roadmap: string;
  };
  readiness: ResearchPathwayReadiness;
  compiledAt: string;
  checksum: ResearchArtifactChecksum;
  claim: "researcher-selected-provisional-pathway-not-independent-validity-novelty-or-ethics-approval";
}

export interface ResearchPathwayRevisionDifference {
  hasPrevious: boolean;
  previousRevision: number | null;
  currentRevision: number;
  primaryQuestionChanged: boolean;
  rationaleChanged: boolean;
  routeChanged: boolean;
  addedProblemFrameIds: string[];
  removedProblemFrameIds: string[];
  changedProblemFrameIds: string[];
  addedQuestionIds: string[];
  removedQuestionIds: string[];
  changedQuestionIds: string[];
  addedUncertainties: string[];
  resolvedUncertainties: string[];
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function condition(id: string, label: string, met: boolean, blocking = true): PathwayReadinessCondition {
  return { id, label, met, blocking };
}

function stepReadiness(
  stepId: typeof PHASE2_STAGE_1_STEP_IDS[number],
  conditions: PathwayReadinessCondition[],
): PathwayStepReadiness {
  const completed = conditions.filter((item) => item.met).length;
  const started = completed > 0;
  return {
    stepId,
    status: conditions.filter((item) => item.blocking).every((item) => item.met)
      ? "ready"
      : started ? "needs-work" : "not-started",
    completed,
    total: conditions.length,
    conditions,
  };
}

export function terminologyForResearchIntent(intent: ResearchIntent | null): ResearchPathwayTerminology {
  if (intent === "primary-data") {
    return {
      contributorSingular: "participant or primary source",
      contributorPlural: "participants or primary sources",
      evidenceUnit: "response, observation, or measurement",
      scopeLabel: "people, source, or phenomenon",
      baselineGuidance: "Separate what is known about the people, setting, and phenomenon from what still needs primary evidence.",
      questionGuidance: "Define who or what contributes evidence without committing to variables or hypotheses before the method warrants them.",
    };
  }
  if (intent === "secondary-data") {
    return {
      contributorSingular: "dataset, archive, or record source",
      contributorPlural: "datasets, archives, or record sources",
      evidenceUnit: "record, field, timepoint, or coverage unit",
      scopeLabel: "data source or coverage population",
      baselineGuidance: "Separate known data coverage and measurement properties from missing fields, bias, access, or comparability concerns.",
      questionGuidance: "Frame the question around available records, measurement quality, coverage, and defensible inference.",
    };
  }
  if (intent === "evidence-synthesis") {
    return {
      contributorSingular: "study, document, or evidence source",
      contributorPlural: "studies, documents, or evidence sources",
      evidenceUnit: "study, report, claim, or comparison",
      scopeLabel: "evidence base",
      baselineGuidance: "Separate established patterns from contested findings, missing perspectives, and gaps in the evidence base.",
      questionGuidance: "Define the evidence base, phenomena, comparisons, and review boundaries; participant-study language does not apply.",
    };
  }
  return {
    contributorSingular: "person, source, dataset, or study",
    contributorPlural: "people, sources, datasets, or studies",
    evidenceUnit: "potential evidence unit",
    scopeLabel: "people, source, or evidence base",
    baselineGuidance: "Keep primary, secondary, and synthesis possibilities open while separating what is known, contested, missing, or assumed.",
    questionGuidance: "Shape questions before committing to participant, variable, or review terminology.",
  };
}

export function assessResearchPathwayReadiness(document: ResearchPathwayDocument): ResearchPathwayReadiness {
  const activeIdeas = document.ideas.filter((item) => item.status !== "parked" && item.status !== "rejected");
  const viableFrames = document.problemFrames.filter((item) => item.status === "promising" || item.status === "selected");
  const selectedFrames = document.problemFrames.filter((item) => item.status === "selected");
  const activeBaseline = document.baselineEntries.filter((item) => item.status !== "parked" && item.status !== "rejected");
  const viableQuestions = document.questionCandidates.filter((item) => item.status === "promising" || item.status === "selected");
  const selectedQuestions = document.questionCandidates.filter((item) => item.status === "selected");
  const route = document.decision.route;
  const routeResolved = Boolean(
    route.intent
    && route.methodFamily
    && route.assignment && route.assignment !== "undetermined"
    && route.setting && route.setting !== "undetermined"
    && route.audience && route.audience !== "undetermined"
    && route.dataSensitivity && route.dataSensitivity !== "undetermined"
    && route.confidence !== "unrated",
  );
  const routeInput = resolvedRouteInput(document);
  const routeConsistent = routeInput ? validateProjectRouteInput(routeInput).length === 0 : false;
  const backcastingResolved = route.backcastingChoice === "not-use"
    || route.backcastingChoice === "use" && Object.values(document.decision.backcasting).every(nonEmpty);
  const shouldConsiderBackcasting = selectedQuestions.some((item) => item.family === "design-oriented" || item.family === "evaluative");

  const steps = [
    stepReadiness(PHASE2_STAGE_1_STEP_IDS[0], [
      condition("concern-in-own-words", "Capture the concern in the researcher’s own words", activeIdeas.some((item) => nonEmpty(item.text))),
      condition("why-it-matters", "Describe who, what, or which context is affected", activeIdeas.some((item) => nonEmpty(item.affectedContext)), false),
    ]),
    stepReadiness(PHASE2_STAGE_1_STEP_IDS[1], [
      condition("candidate-frame", "Develop at least one viable candidate problem frame", viableFrames.length >= 1),
      condition("frame-separates-basis", "Separate observation, interpretation, assumptions, and alternatives", viableFrames.some((item) => nonEmpty(item.observedBasis) && nonEmpty(item.interpretation) && nonEmpty(item.assumptions) && nonEmpty(item.alternativeExplanations))),
      condition("selected-frame", "Select at least one provisional problem frame", selectedFrames.length >= 1),
    ]),
    stepReadiness(PHASE2_STAGE_1_STEP_IDS[2], [
      condition("baseline-entry", "Record at least one baseline entry", activeBaseline.length >= 1),
      condition("evidence-state", "Distinguish what is known, contested, missing, or assumed", activeBaseline.some((item) => [item.known, item.contested, item.missing, item.assumed].filter(nonEmpty).length >= 2)),
      condition("baseline-link", "Connect the baseline to a candidate problem", activeBaseline.some((item) => item.linkedProblemFrameIds.length > 0)),
    ]),
    stepReadiness(PHASE2_STAGE_1_STEP_IDS[3], [
      condition("question-comparison", "Develop at least two viable candidate research questions", viableQuestions.length >= 2),
      condition("question-traceability", "Link a viable question to its problem and baseline", viableQuestions.some((item) => item.linkedProblemFrameIds.length > 0 && item.linkedBaselineEntryIds.length > 0)),
      condition("question-scope", "Bound the source or population, phenomenon, setting, and evidence access", viableQuestions.some((item) => nonEmpty(item.scope.populationOrSource) && nonEmpty(item.scope.constructOrPhenomenon) && nonEmpty(item.scope.setting) && nonEmpty(item.scope.evidenceAccess))),
      condition("selected-question", "Select at least one provisional research question", selectedQuestions.length >= 1),
    ]),
    stepReadiness(PHASE2_STAGE_1_STEP_IDS[4], [
      condition("pathway-rationale", "Explain why this pathway was selected", nonEmpty(document.decision.rationale)),
      condition("route-resolved", "Choose a provisional intent, method family, setting, assignment, source or audience, and sensitivity", routeResolved),
      condition("route-consistent", "Resolve contradictions in the provisional route", routeConsistent),
      condition("backcasting-choice", "Use or explicitly set aside backcasting", backcastingResolved),
      condition("backcasting-advisory", "Consider backcasting for design-oriented or evaluative questions", !shouldConsiderBackcasting || route.backcastingChoice !== "undecided", false),
    ]),
  ];
  const blockingIssueIds = steps.flatMap((step) => step.conditions.filter((item) => item.blocking && !item.met).map((item) => item.id));
  const advisoryIssueIds = steps.flatMap((step) => step.conditions.filter((item) => !item.blocking && !item.met).map((item) => item.id));
  return { readyForStage2: blockingIssueIds.length === 0, steps, blockingIssueIds, advisoryIssueIds };
}

function sourceReference(document: ResearchPathwayDocument): ResearchArtifactReference {
  return {
    artifactKind: document.identity.artifactKind,
    artifactId: document.identity.artifactId,
    schemaVersion: document.identity.artifactSchemaVersion,
    checksum: document.identity.checksum,
  };
}

export async function compileRouteFromResearchPathway(document: ResearchPathwayDocument): Promise<ProjectRouteProfile | null> {
  const input = resolvedRouteInput(document);
  if (!input || validateProjectRouteInput(input).length) return null;
  return compileProjectRouteProfile(input);
}

function resolvedRouteInput(document: ResearchPathwayDocument): ProjectRouteProfileInput | null {
  const route = document.decision.route;
  if (!route.intent || !route.methodFamily || !route.assignment || route.assignment === "undetermined"
    || !route.setting || route.setting === "undetermined" || !route.audience || route.audience === "undetermined"
    || !route.dataSensitivity || route.dataSensitivity === "undetermined" || route.confidence === "unrated") return null;
  return {
    projectId: document.projectId,
    intent: route.intent,
    methodFamily: route.methodFamily,
    setting: route.setting,
    assignment: route.assignment,
    audience: route.audience,
    dataSensitivity: route.dataSensitivity,
    specialProcedures: route.possibleSpecialProcedures,
    confirmation: "draft",
  };
}

export async function compileResearchPathwayBrief(document: ResearchPathwayDocument): Promise<ResearchPathwayBrief | null> {
  const readiness = assessResearchPathwayReadiness(document);
  const route = await compileRouteFromResearchPathway(document);
  if (!readiness.readyForStage2 || !route) return null;
  const selectedProblems = document.problemFrames.filter((item) => document.decision.selectedProblemFrameIds.includes(item.id));
  const selectedQuestions = document.questionCandidates.filter((item) => document.decision.selectedQuestionIds.includes(item.id));
  const core = {
    schemaVersion: RESEARCH_PATHWAY_BRIEF_SCHEMA_VERSION,
    projectId: document.projectId,
    pathwayRevision: document.revision,
    source: sourceReference(document),
    selectedProblems,
    selectedQuestions,
    baseline: document.baselineEntries.filter((item) => item.status !== "parked" && item.status !== "rejected"),
    baselineSynthesis: document.decision.baselineSynthesis,
    rationale: document.decision.rationale,
    unresolvedUncertainties: document.decision.unresolvedQuestions,
    route,
    backcasting: {
      included: document.decision.route.backcastingChoice === "use",
      ...document.decision.backcasting,
    },
    readiness,
    compiledAt: document.updatedAt,
    claim: "researcher-selected-provisional-pathway-not-independent-validity-novelty-or-ethics-approval" as const,
  };
  return { ...core, checksum: await sha256ArtifactChecksum(core) };
}

export async function compilePathwayKnowledgeEntries(document: ResearchPathwayDocument): Promise<ResearchKnowledgeEntry[]> {
  const brief = await compileResearchPathwayBrief(document);
  if (!brief) return [];
  const sourceReferences = [brief.source];
  const suffix = `r${document.revision}`;
  const selectedQuestionText = brief.selectedQuestions.map((item) => item.text).join("\n");
  const routeSummary = `${brief.route.intent}; ${brief.route.methodFamily}; ${brief.route.setting}; ${brief.route.assignment}; ${brief.route.audience}; ${brief.route.dataSensitivity}`;
  return Promise.all([
    createResearchKnowledgeEntry({ id: `pathway-questions-${suffix}`, projectId: document.projectId, stage: 1, stepId: PHASE2_STAGE_1_STEP_IDS[3], kind: "decision", title: "Selected provisional research questions", body: selectedQuestionText, timing: "planned", author: "system-derived", sourceReferences, manuscriptTargets: ["introduction", "methods"], createdAt: document.updatedAt }),
    createResearchKnowledgeEntry({ id: `pathway-rationale-${suffix}`, projectId: document.projectId, stage: 1, stepId: PHASE2_STAGE_1_STEP_IDS[4], kind: "rationale", title: "Pathway selection rationale", body: brief.rationale, timing: "planned", author: "system-derived", sourceReferences, manuscriptTargets: ["introduction", "methods"], createdAt: document.updatedAt }),
    createResearchKnowledgeEntry({ id: `pathway-route-${suffix}`, projectId: document.projectId, stage: 1, stepId: PHASE2_STAGE_1_STEP_IDS[4], kind: "method-detail", title: "Provisional research route", body: routeSummary, timing: "planned", author: "system-derived", sourceReferences, manuscriptTargets: ["methods"], createdAt: document.updatedAt }),
    ...(brief.unresolvedUncertainties.length ? [createResearchKnowledgeEntry({ id: `pathway-uncertainties-${suffix}`, projectId: document.projectId, stage: 1, stepId: PHASE2_STAGE_1_STEP_IDS[4], kind: "limitation", title: "Unresolved pathway uncertainties", body: brief.unresolvedUncertainties.join("\n"), timing: "planned", author: "system-derived", sourceReferences, manuscriptTargets: ["introduction", "methods", "discussion"], createdAt: document.updatedAt })] : []),
  ]);
}

function changedIds<T extends { id: string }>(previous: readonly T[], current: readonly T[]): { added: string[]; removed: string[]; changed: string[] } {
  const oldMap = new Map(previous.map((item) => [item.id, JSON.stringify(item)]));
  const nextMap = new Map(current.map((item) => [item.id, JSON.stringify(item)]));
  return {
    added: [...nextMap.keys()].filter((id) => !oldMap.has(id)).sort(),
    removed: [...oldMap.keys()].filter((id) => !nextMap.has(id)).sort(),
    changed: [...nextMap.keys()].filter((id) => oldMap.has(id) && oldMap.get(id) !== nextMap.get(id)).sort(),
  };
}

export function compareResearchPathwayRevisions(current: ResearchPathwayDocument, previous: ResearchPathwayDocument | null): ResearchPathwayRevisionDifference {
  if (!previous) {
    return { hasPrevious: false, previousRevision: null, currentRevision: current.revision, primaryQuestionChanged: false, rationaleChanged: false, routeChanged: false, addedProblemFrameIds: [], removedProblemFrameIds: [], changedProblemFrameIds: [], addedQuestionIds: [], removedQuestionIds: [], changedQuestionIds: [], addedUncertainties: [], resolvedUncertainties: [] };
  }
  const frames = changedIds(previous.problemFrames, current.problemFrames);
  const questions = changedIds(previous.questionCandidates, current.questionCandidates);
  return {
    hasPrevious: true,
    previousRevision: previous.revision,
    currentRevision: current.revision,
    primaryQuestionChanged: previous.decision.mainQuestion !== current.decision.mainQuestion,
    rationaleChanged: previous.decision.rationale !== current.decision.rationale,
    routeChanged: JSON.stringify(previous.decision.route) !== JSON.stringify(current.decision.route),
    addedProblemFrameIds: frames.added,
    removedProblemFrameIds: frames.removed,
    changedProblemFrameIds: frames.changed,
    addedQuestionIds: questions.added,
    removedQuestionIds: questions.removed,
    changedQuestionIds: questions.changed,
    addedUncertainties: current.decision.unresolvedQuestions.filter((item) => !previous.decision.unresolvedQuestions.includes(item)),
    resolvedUncertainties: previous.decision.unresolvedQuestions.filter((item) => !current.decision.unresolvedQuestions.includes(item)),
  };
}
