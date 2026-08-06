import type { ResearchArtifactChecksum } from "./artifactIdentity";
import {
  PROPOSAL_REQUIREMENT_TEMPLATES,
  proposalRequirementTemplateIdFromProfile,
  type CompiledProposalRequirements,
  type ProposalRequirementIssue,
  type ProposalRequirementTemplateDefinition,
} from "./proposalRequirementsCompiler";
import {
  createEmptyProposalSetupDecision,
  normalizeProposalSetupDecision,
  type ProposalDestinationKind,
  type ProposalSetupDecision,
} from "./proposalSetupDecision";
import type { ResearchPathwayBrief } from "./researchPathwayBrief";
import type { ProposalRequirementsProfile } from "./researchProposalDocument";
import {
  STAGE2_STEP1_ACTIONS,
  STAGE2_STEP1_COPY_CONTRACT,
  resolveStage2Step1ExperienceState,
  type Stage2Step1ActionDefinition,
  type Stage2Step1ExperiencePreferences,
  type Stage2Step1ExperienceStateDefinition,
} from "./stage2Step1ExperienceContract";
import { normalizeStage2Step1ExperiencePreferences } from "./stage2Step1ExperiencePreferences";

export const STAGE2_STEP1_VIEW_MODEL_VERSION = 1 as const;

export type Stage2Step1DecisionSectionId =
  | "review-stage1"
  | "proposal-purpose"
  | "requirements-authority"
  | "recommended-structure"
  | "practical-constraints"
  | "contract-review";

export interface Stage2Step1DecisionSectionViewModel {
  id: Stage2Step1DecisionSectionId;
  label: string;
  status: "complete" | "current" | "needs-attention" | "not-started";
  issueIds: string[];
}

export interface Stage2Step1ViewModelInput {
  initialization?: "loading" | "loaded";
  pathwayAvailable: boolean;
  brief: ResearchPathwayBrief | null;
  compiled: CompiledProposalRequirements;
  setupDecision?: ProposalSetupDecision | null;
  preferences?: Stage2Step1ExperiencePreferences | null;
  sourceChanged: boolean;
  authorityDriftIssues: readonly ProposalRequirementIssue[];
  versionConflict: boolean;
  profileMaterialized: boolean;
}

export interface Stage2Step1ViewModel {
  version: typeof STAGE2_STEP1_VIEW_MODEL_VERSION;
  copy: typeof STAGE2_STEP1_COPY_CONTRACT;
  preferences: Stage2Step1ExperiencePreferences;
  state: Stage2Step1ExperienceStateDefinition;
  primaryAction: Stage2Step1ActionDefinition | null;
  stage1: {
    status: "missing" | "incomplete" | "current" | "changed";
    revision: number | null;
    checksum: ResearchArtifactChecksum | null;
    selectedProblems: Array<{ id: string; title: string; summary: string }>;
    selectedQuestions: Array<{ id: string; text: string }>;
    rationale: string;
    unresolvedUncertainties: string[];
  };
  proposal: {
    purpose: ProposalRequirementsProfile["purpose"];
    route: ProposalRequirementsProfile["route"];
    setupDecision: ProposalSetupDecision;
    setupOrigin: "canonical" | "legacy-adapter";
    selectedTemplateId: ReturnType<typeof proposalRequirementTemplateIdFromProfile>;
    primaryRecommendation: ProposalRequirementTemplateDefinition | null;
    alternativeRecommendations: ProposalRequirementTemplateDefinition[];
    allTemplates: ProposalRequirementTemplateDefinition[];
  };
  requirements: {
    total: number;
    required: number;
    contextual: number;
    authorities: number;
    profileRevision: number;
    blockingIssues: ProposalRequirementIssue[];
    advisoryIssues: ProposalRequirementIssue[];
  };
  progress: {
    completedVisiblePhases: number;
    totalVisiblePhases: 3;
    sections: Stage2Step1DecisionSectionViewModel[];
  };
  canonicalFacts: {
    profileId: string;
    profileRevision: number;
    purpose: ProposalRequirementsProfile["purpose"];
    route: ProposalRequirementsProfile["route"];
    stage1Checksum: ResearchArtifactChecksum | null;
    selectedTemplateId: ReturnType<typeof proposalRequirementTemplateIdFromProfile>;
    setupDecision: ProposalSetupDecision;
    researcherConfirmed: boolean;
    requirementIds: string[];
    authorityVersions: string[];
  };
  technicalDetails: {
    profileId: string;
    profileRevision: number;
    compilerVersion: number;
    stage1Checksum: ResearchArtifactChecksum | null;
    authoritySnapshots: Array<{ authorityId: string; version: string; sourceUrl: string; accessedAt: string }>;
  };
}

function legacyDestinationKind(profile: ProposalRequirementsProfile): ProposalDestinationKind {
  if (profile.purpose === "funder") return "funder";
  if (profile.purpose === "coursework") return "course-or-supervisor";
  if (profile.purpose === "internal") return "internal";
  return "undetermined";
}

export function proposalSetupDecisionFromProfile(profile: ProposalRequirementsProfile): {
  decision: ProposalSetupDecision;
  origin: "canonical" | "legacy-adapter";
} {
  const canonical = normalizeProposalSetupDecision(profile.setupDecision);
  if (canonical) return { decision: canonical, origin: "canonical" };
  const decision = createEmptyProposalSetupDecision();
  decision.destinationKind = legacyDestinationKind(profile);
  decision.instructionSourceStatus = profile.authorities.length
    ? "registered"
    : profile.researcherConfirmed
      ? "not-required"
      : "not-provided";
  decision.recommendationDecision = profile.researcherConfirmed ? "legacy-unspecified" : "unreviewed";
  return { decision, origin: "legacy-adapter" };
}

function issueIds(issues: readonly ProposalRequirementIssue[], matcher: (issue: ProposalRequirementIssue) => boolean): string[] {
  return issues.filter(matcher).map((issue) => issue.id).sort();
}

function isAuthorityIssue(issue: ProposalRequirementIssue): boolean {
  return issue.id.includes("authority") || issue.id.includes("requirements-source");
}

function isStage1Issue(issue: ProposalRequirementIssue): boolean {
  return issue.id === "stage1-route-unresolved";
}

function isConfirmationIssue(issue: ProposalRequirementIssue): boolean {
  return issue.id === "researcher-confirmation-required";
}

function sectionStatus(input: {
  complete: boolean;
  current: boolean;
  issueIds: string[];
}): Stage2Step1DecisionSectionViewModel["status"] {
  if (input.complete) return "complete";
  if (input.issueIds.length) return "needs-attention";
  if (input.current) return "current";
  return "not-started";
}

export function buildStage2Step1ViewModel(input: Stage2Step1ViewModelInput): Stage2Step1ViewModel {
  const preferences = normalizeStage2Step1ExperiencePreferences(input.preferences);
  const profile = input.compiled.profile;
  const selectedTemplateId = proposalRequirementTemplateIdFromProfile(profile);
  const recommendedDefinitions = input.compiled.recommendedTemplateIds.flatMap((id) => {
    const definition = PROPOSAL_REQUIREMENT_TEMPLATES.find((template) => template.id === id);
    return definition ? [definition] : [];
  });
  const explicitSetup = normalizeProposalSetupDecision(input.setupDecision);
  const adaptedSetup = explicitSetup
    ? { decision: explicitSetup, origin: "canonical" as const }
    : proposalSetupDecisionFromProfile(profile);
  const allIssues = [...input.compiled.issues, ...input.authorityDriftIssues]
    .filter((issue, index, collection) => collection.findIndex((candidate) => candidate.id === issue.id) === index)
    .sort((a, b) => (a.severity === b.severity ? a.id.localeCompare(b.id) : a.severity === "blocking" ? -1 : 1));
  const blockingIssues = allIssues.filter((issue) => issue.severity === "blocking");
  const advisoryIssues = allIssues.filter((issue) => issue.severity === "advisory");
  const stage1Status = input.sourceChanged
    ? "changed"
    : input.brief
      ? "current"
      : input.pathwayAvailable
        ? "incomplete"
        : "missing";
  const authorityStatus = input.authorityDriftIssues.length
    ? "drifted"
    : adaptedSetup.decision.instructionSourceStatus === "provisional" || adaptedSetup.decision.instructionSourceStatus === "not-provided"
        ? "provisional"
      : blockingIssues.some(isAuthorityIssue)
        ? "required-missing"
        : profile.authorities.length || adaptedSetup.decision.instructionSourceStatus === "registered" || adaptedSetup.decision.instructionSourceStatus === "researcher-defined"
          ? "current"
          : "not-required";
  const configurationBlockingIssues = blockingIssues.filter((issue) => !isStage1Issue(issue) && !isAuthorityIssue(issue) && !isConfirmationIssue(issue));
  const requirementsStatus = profile.requirements.length === 0 || configurationBlockingIssues.length
    ? "empty"
    : input.profileMaterialized
      ? "persisted"
      : "compiled";
  const state = resolveStage2Step1ExperienceState({
    initialization: input.initialization ?? "loaded",
    stage1Status,
    routeResolved: profile.route.intent !== "undetermined" && profile.route.methodFamily !== "undetermined",
    authorityStatus,
    requirementsStatus,
    researcherConfirmed: profile.researcherConfirmed,
    versionConflict: input.versionConflict,
  });
  const primaryAction = state.primaryActionId
    ? STAGE2_STEP1_ACTIONS.find((action) => action.id === state.primaryActionId) ?? null
    : null;
  const stage1IssueIds = issueIds(allIssues, isStage1Issue);
  const authorityIssueIds = issueIds(allIssues, isAuthorityIssue);
  const configurationIssueIds = issueIds(allIssues, (issue) => configurationBlockingIssues.some((candidate) => candidate.id === issue.id));
  const confirmationIssueIds = issueIds(allIssues, isConfirmationIssue);
  const stage1Complete = stage1Status === "current";
  const authorityComplete = authorityStatus === "current" || authorityStatus === "not-required";
  const configurationComplete = profile.requirements.length > 0 && configurationBlockingIssues.length === 0;
  const sections: Stage2Step1DecisionSectionViewModel[] = [
    { id: "review-stage1", label: "Review Stage 1", issueIds: stage1IssueIds, status: sectionStatus({ complete: stage1Complete, current: !stage1Complete, issueIds: stage1IssueIds }) },
    { id: "proposal-purpose", label: "What are you preparing?", issueIds: configurationIssueIds, status: sectionStatus({ complete: configurationComplete, current: stage1Complete, issueIds: configurationIssueIds }) },
    { id: "requirements-authority", label: "Who sets the requirements?", issueIds: authorityIssueIds, status: sectionStatus({ complete: authorityComplete, current: configurationComplete, issueIds: authorityIssueIds }) },
    { id: "recommended-structure", label: "Review the recommended structure", issueIds: configurationIssueIds, status: sectionStatus({ complete: configurationComplete, current: authorityComplete, issueIds: configurationIssueIds }) },
    { id: "practical-constraints", label: "Add practical instructions", issueIds: configurationIssueIds, status: sectionStatus({ complete: configurationComplete, current: authorityComplete, issueIds: configurationIssueIds }) },
    { id: "contract-review", label: "Confirm the proposal plan", issueIds: confirmationIssueIds, status: sectionStatus({ complete: state.id === "ready", current: configurationComplete && authorityComplete, issueIds: confirmationIssueIds }) },
  ];
  const stage1Checksum = input.brief?.source.checksum ?? null;
  const canonicalSetup = adaptedSetup.decision;
  return {
    version: STAGE2_STEP1_VIEW_MODEL_VERSION,
    copy: STAGE2_STEP1_COPY_CONTRACT,
    preferences,
    state,
    primaryAction,
    stage1: {
      status: stage1Status,
      revision: input.brief?.pathwayRevision ?? null,
      checksum: stage1Checksum,
      selectedProblems: input.brief?.selectedProblems.map((problem) => ({
        id: problem.id,
        title: problem.title,
        summary: problem.situation || problem.consequence,
      })) ?? [],
      selectedQuestions: input.brief?.selectedQuestions.map((question) => ({ id: question.id, text: question.text })) ?? [],
      rationale: input.brief?.rationale ?? "",
      unresolvedUncertainties: [...(input.brief?.unresolvedUncertainties ?? [])],
    },
    proposal: {
      purpose: profile.purpose,
      route: { ...profile.route },
      setupDecision: canonicalSetup,
      setupOrigin: adaptedSetup.origin,
      selectedTemplateId,
      primaryRecommendation: recommendedDefinitions[0] ?? null,
      alternativeRecommendations: recommendedDefinitions.slice(1),
      allTemplates: [...PROPOSAL_REQUIREMENT_TEMPLATES],
    },
    requirements: {
      total: profile.requirements.length,
      required: profile.requirements.filter((requirement) => requirement.required).length,
      contextual: profile.requirements.filter((requirement) => !requirement.required).length,
      authorities: profile.authorities.length,
      profileRevision: profile.revision,
      blockingIssues,
      advisoryIssues,
    },
    progress: {
      completedVisiblePhases: Number(stage1Complete) + Number(configurationComplete && authorityComplete) + Number(state.id === "ready"),
      totalVisiblePhases: 3,
      sections,
    },
    canonicalFacts: {
      profileId: profile.profileId,
      profileRevision: profile.revision,
      purpose: profile.purpose,
      route: { ...profile.route },
      stage1Checksum,
      selectedTemplateId,
      setupDecision: canonicalSetup,
      researcherConfirmed: profile.researcherConfirmed,
      requirementIds: profile.requirements.map((requirement) => requirement.id),
      authorityVersions: profile.authorities.map((authority) => `${authority.authorityId}:${authority.version}`),
    },
    technicalDetails: {
      profileId: profile.profileId,
      profileRevision: profile.revision,
      compilerVersion: input.compiled.compilerVersion,
      stage1Checksum,
      authoritySnapshots: profile.authorities.map((authority) => ({
        authorityId: authority.authorityId,
        version: authority.version,
        sourceUrl: authority.sourceUrl,
        accessedAt: authority.accessedAt,
      })),
    },
  };
}
