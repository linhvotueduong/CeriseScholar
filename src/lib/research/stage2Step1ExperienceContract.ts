/**
 * Build 2 — Stage 2, Step 1 experience contract.
 *
 * This module defines the product behavior that the later interface phases must
 * implement. It deliberately does not compile proposal requirements or decide
 * scientific readiness. Those responsibilities remain with the canonical
 * proposal requirements compiler and proposal artifact lifecycle.
 */

export const STAGE2_STEP1_EXPERIENCE_CONTRACT_VERSION = 1 as const;

export type Stage2Step1GuidanceLevel = "guided" | "balanced" | "concise";
export type Stage2Step1InformationDensity = "comfortable" | "dense";

export interface Stage2Step1ExperiencePreferences {
  guidanceLevel: Stage2Step1GuidanceLevel;
  informationDensity: Stage2Step1InformationDensity;
}

export const STAGE2_STEP1_PRESENTATION_OPTIONS = {
  guidanceLevels: [
    {
      id: "guided",
      label: "Guided",
      description: "Adds definitions, examples, and decision support while preserving every scholarly requirement.",
      artifactImpact: "none",
    },
    {
      id: "balanced",
      label: "Balanced",
      description: "Shows scholarly terms with short explanations and the complete decision workflow.",
      artifactImpact: "none",
    },
    {
      id: "concise",
      label: "Concise",
      description: "Prioritizes compact controls, provenance, and comparison tools for efficient professional use.",
      artifactImpact: "none",
    },
  ],
  informationDensities: [
    {
      id: "comfortable",
      label: "Comfortable",
      description: "Uses more spacing and keeps supporting explanations visible.",
      artifactImpact: "none",
    },
    {
      id: "dense",
      label: "Dense",
      description: "Uses compact cards and tables without removing decisions, sources, or safeguards.",
      artifactImpact: "none",
    },
  ],
  defaultPreferences: {
    guidanceLevel: "balanced",
    informationDensity: "comfortable",
  },
  storageBoundary: "presentation-preferences-excluded-from-research-artifacts-readiness-revisions-and-checksums",
} as const;

export const STAGE2_STEP1_COPY_CONTRACT = {
  primaryTitle: "Set Up Your Proposal",
  scholarlyTitle: "Proposal brief and requirements",
  navigationTitle: "Proposal Setup",
  description: "Review your Stage 1 research direction, identify the proposal you are preparing, and confirm the instructions it must follow.",
  outcomeLabel: "Proposal Planning Contract",
  confirmationLabel: "I reviewed this proposal setup and its sources.",
  boundaryStatement: "Cerise organizes a planning contract; the current institution, opportunity, supervisor, journal, or review body controls the final requirements.",
  visiblePhases: [
    {
      id: "review-stage1",
      label: "Review Stage 1",
      description: "Check the problem, questions, research direction, and unresolved uncertainties carried forward.",
    },
    {
      id: "choose-requirements",
      label: "Choose proposal requirements",
      description: "Identify what you are preparing, who sets the rules, and the closest applicable structure.",
    },
    {
      id: "confirm-plan",
      label: "Confirm the plan",
      description: "Review the generated requirements, sources, limitations, and unresolved decisions.",
    },
  ],
} as const;

export type Stage2Step1TermPlacement = "primary" | "supporting" | "technical-details";

export interface Stage2Step1TermDefinition {
  id: string;
  canonicalTerm: string;
  userLabel: string;
  definition: string;
  placement: Stage2Step1TermPlacement;
}

export const STAGE2_STEP1_TERM_REGISTRY: readonly Stage2Step1TermDefinition[] = [
  {
    id: "proposal-purpose",
    canonicalTerm: "Proposal purpose",
    userLabel: "What are you preparing?",
    definition: "The kind of proposal and decision the document is intended to support.",
    placement: "primary",
  },
  {
    id: "requirements-authority",
    canonicalTerm: "Requirements authority",
    userLabel: "Who sets the requirements?",
    definition: "The institution, course, supervisor, funder, review body, journal, or other source that controls the proposal instructions.",
    placement: "primary",
  },
  {
    id: "requirements-profile",
    canonicalTerm: "Proposal requirements profile",
    userLabel: "Proposal plan",
    definition: "The versioned collection of applicable requirements, constraints, authority sources, and boundaries used by later proposal steps.",
    placement: "supporting",
  },
  {
    id: "research-route",
    canonicalTerm: "Research route",
    userLabel: "Research direction",
    definition: "The Stage 1 intent and method family used to keep proposal guidance appropriate to the planned evidence.",
    placement: "supporting",
  },
  {
    id: "provisional",
    canonicalTerm: "Provisional requirements",
    userLabel: "Requirements still to confirm",
    definition: "A usable planning baseline that is explicitly incomplete because the controlling instructions are not yet known.",
    placement: "primary",
  },
  {
    id: "compiler",
    canonicalTerm: "Proposal requirements compiler",
    userLabel: "Requirements compiler",
    definition: "The deterministic engine that converts the selected route, purpose, authority, and constraints into canonical proposal requirements.",
    placement: "technical-details",
  },
  {
    id: "source-lineage",
    canonicalTerm: "Source lineage",
    userLabel: "Connected source versions",
    definition: "The exact upstream artifact versions used to create the current proposal plan.",
    placement: "technical-details",
  },
  {
    id: "checksum",
    canonicalTerm: "Artifact checksum",
    userLabel: "Integrity checksum",
    definition: "A content identity used to detect changed, stale, conflicting, or tampered research artifacts.",
    placement: "technical-details",
  },
] as const;

export type Stage2Step1ActionId =
  | "finish-stage1"
  | "review-stage1-change"
  | "resolve-version-conflict"
  | "review-authority-change"
  | "identify-authority"
  | "configure-proposal"
  | "review-proposal-plan"
  | "continue-evidence-strategy";

export interface Stage2Step1ActionDefinition {
  id: Stage2Step1ActionId;
  label: string;
  destination: "stage1-pathway" | "current-step" | "stage2-evidence-strategy";
  targetStepId: string;
}

export const STAGE2_STEP1_ACTIONS: readonly Stage2Step1ActionDefinition[] = [
  { id: "finish-stage1", label: "Complete the Stage 1 handoff", destination: "stage1-pathway", targetStepId: "stage-01-choose-pathway" },
  { id: "review-stage1-change", label: "Review the updated Stage 1 direction", destination: "current-step", targetStepId: "stage-02-confirm-brief" },
  { id: "resolve-version-conflict", label: "Compare proposal versions", destination: "current-step", targetStepId: "stage-02-confirm-brief" },
  { id: "review-authority-change", label: "Review the updated requirements source", destination: "current-step", targetStepId: "stage-02-confirm-brief" },
  { id: "identify-authority", label: "Add the controlling requirements", destination: "current-step", targetStepId: "stage-02-confirm-brief" },
  { id: "configure-proposal", label: "Set up the proposal", destination: "current-step", targetStepId: "stage-02-confirm-brief" },
  { id: "review-proposal-plan", label: "Review the proposal plan", destination: "current-step", targetStepId: "stage-02-confirm-brief" },
  { id: "continue-evidence-strategy", label: "Continue to evidence strategy", destination: "stage2-evidence-strategy", targetStepId: "stage-02-step-01" },
] as const;

export type Stage2Step1ExperienceStateId =
  | "loading"
  | "version-conflict"
  | "stage1-changed"
  | "authority-changed"
  | "stage1-incomplete"
  | "authority-required"
  | "configuring"
  | "provisional"
  | "needs-review"
  | "saving"
  | "ready";

export interface Stage2Step1ExperienceStateDefinition {
  id: Stage2Step1ExperienceStateId;
  tone: "neutral" | "informational" | "attention" | "blocking" | "ready";
  heading: string;
  summary: string;
  primaryActionId: Stage2Step1ActionId | null;
  canExploreDownstream: boolean;
  canComplete: boolean;
}

export const STAGE2_STEP1_EXPERIENCE_STATES: readonly Stage2Step1ExperienceStateDefinition[] = [
  {
    id: "loading",
    tone: "neutral",
    heading: "Loading your proposal setup",
    summary: "Cerise is verifying the Stage 1 handoff and the latest proposal revision.",
    primaryActionId: null,
    canExploreDownstream: false,
    canComplete: false,
  },
  {
    id: "version-conflict",
    tone: "blocking",
    heading: "Choose which proposal version to keep",
    summary: "Secure storage and this device both changed. Neither version will be overwritten automatically.",
    primaryActionId: "resolve-version-conflict",
    canExploreDownstream: false,
    canComplete: false,
  },
  {
    id: "stage1-changed",
    tone: "attention",
    heading: "Your Stage 1 direction changed",
    summary: "The previous proposal plan remains available, but the updated problem, questions, or research route must be reviewed before confirmation.",
    primaryActionId: "review-stage1-change",
    canExploreDownstream: true,
    canComplete: false,
  },
  {
    id: "authority-changed",
    tone: "blocking",
    heading: "A requirements source changed",
    summary: "The stored source version no longer matches the current authority registry. Review the updated source before continuing.",
    primaryActionId: "review-authority-change",
    canExploreDownstream: true,
    canComplete: false,
  },
  {
    id: "stage1-incomplete",
    tone: "attention",
    heading: "Complete the research direction first",
    summary: "You may explore proposal options, but Cerise cannot confirm a proposal plan without the selected Stage 1 problem, questions, route, and rationale.",
    primaryActionId: "finish-stage1",
    canExploreDownstream: true,
    canComplete: false,
  },
  {
    id: "authority-required",
    tone: "blocking",
    heading: "Add the requirements that control this proposal",
    summary: "This proposal purpose requires an identifiable, versioned source and at least one recorded requirement.",
    primaryActionId: "identify-authority",
    canExploreDownstream: true,
    canComplete: false,
  },
  {
    id: "configuring",
    tone: "informational",
    heading: "Set up the proposal",
    summary: "Choose the proposal purpose, requirements source, structure, language, citations, and practical constraints.",
    primaryActionId: "configure-proposal",
    canExploreDownstream: true,
    canComplete: false,
  },
  {
    id: "provisional",
    tone: "attention",
    heading: "The proposal plan is provisional",
    summary: "Cerise can organize a general academic baseline, but the controlling local or destination-specific requirements are still unknown.",
    primaryActionId: "identify-authority",
    canExploreDownstream: true,
    canComplete: false,
  },
  {
    id: "needs-review",
    tone: "attention",
    heading: "Review the proposal plan",
    summary: "Confirm the generated requirements, authority sources, limitations, and unresolved decisions before continuing.",
    primaryActionId: "review-proposal-plan",
    canExploreDownstream: true,
    canComplete: false,
  },
  {
    id: "saving",
    tone: "informational",
    heading: "Saving the confirmed proposal plan",
    summary: "Cerise is creating a new checksum-bound proposal revision without changing prior history.",
    primaryActionId: null,
    canExploreDownstream: false,
    canComplete: false,
  },
  {
    id: "ready",
    tone: "ready",
    heading: "Proposal plan ready",
    summary: "The current Stage 1 direction, requirements profile, sources, and researcher confirmation are aligned.",
    primaryActionId: "continue-evidence-strategy",
    canExploreDownstream: true,
    canComplete: true,
  },
] as const;

export interface Stage2Step1ExperienceFacts {
  initialization: "loading" | "loaded";
  stage1Status: "missing" | "incomplete" | "current" | "changed";
  routeResolved: boolean;
  authorityStatus: "not-required" | "current" | "provisional" | "required-missing" | "drifted";
  requirementsStatus: "empty" | "compiled" | "persisted";
  researcherConfirmed: boolean;
  versionConflict: boolean;
}

const STATE_BY_ID = new Map(STAGE2_STEP1_EXPERIENCE_STATES.map((state) => [state.id, state]));

function experienceState(id: Stage2Step1ExperienceStateId): Stage2Step1ExperienceStateDefinition {
  const state = STATE_BY_ID.get(id);
  if (!state) throw new Error(`Unknown Stage 2 Step 1 experience state: ${id}`);
  return state;
}

/**
 * Resolves presentation state from readiness facts owned by canonical systems.
 * It does not infer scientific validity and does not replace compiler readiness.
 */
export function resolveStage2Step1ExperienceState(
  facts: Stage2Step1ExperienceFacts,
): Stage2Step1ExperienceStateDefinition {
  if (facts.initialization === "loading") return experienceState("loading");
  if (facts.versionConflict) return experienceState("version-conflict");
  if (facts.stage1Status === "changed") return experienceState("stage1-changed");
  if (facts.authorityStatus === "drifted") return experienceState("authority-changed");
  if (facts.stage1Status === "missing" || facts.stage1Status === "incomplete" || !facts.routeResolved) {
    return experienceState("stage1-incomplete");
  }
  if (facts.authorityStatus === "required-missing") return experienceState("authority-required");
  if (facts.requirementsStatus === "empty") return experienceState("configuring");
  if (facts.authorityStatus === "provisional") return experienceState("provisional");
  if (!facts.researcherConfirmed) return experienceState("needs-review");
  if (facts.requirementsStatus !== "persisted") return experienceState("saving");
  return experienceState("ready");
}

export interface Stage2Step1ExperienceInvariant {
  id: string;
  category: "scientific" | "artifact" | "authority" | "interaction" | "ai" | "accessibility" | "stage-boundary";
  rule: string;
  canonicalOwner: string;
}

export const STAGE2_STEP1_EXPERIENCE_INVARIANTS: readonly Stage2Step1ExperienceInvariant[] = [
  { id: "exact-stage1-source", category: "artifact", rule: "Display and bind the exact read-only Stage 1 revision and checksum; edits return to Stage 1.", canonicalOwner: "ResearchPathwayDocument" },
  { id: "compiler-owns-requirements", category: "scientific", rule: "Only the deterministic proposal requirements compiler may create canonical proposal requirements and compiler issues.", canonicalOwner: "compileProposalRequirements" },
  { id: "derived-readiness", category: "scientific", rule: "Completion is derived from canonical readiness facts; researcher confirmation is necessary but never sufficient by itself.", canonicalOwner: "proposal compiler and artifact lifecycle" },
  { id: "constant-rigor", category: "interaction", rule: "Guidance and density settings may change explanation and layout but never requirements, readiness, revisions, or checksums.", canonicalOwner: "experience preferences" },
  { id: "researcher-confirmation", category: "interaction", rule: "A researcher must review and confirm the proposal plan; AI and system automation cannot confirm it.", canonicalOwner: "ProposalRequirementDraft.researcherConfirmed" },
  { id: "authority-provenance", category: "authority", rule: "Controlling sources retain name, kind, version, HTTPS location, and access time.", canonicalOwner: "ProposalRequirementAuthority" },
  { id: "unknown-authority-provisional", category: "authority", rule: "Unknown destination requirements remain explicit and provisional rather than being represented as satisfied.", canonicalOwner: "experience and requirements profile" },
  { id: "authority-drift-blocks", category: "authority", rule: "A changed registered authority blocks completion until the updated source is reviewed.", canonicalOwner: "assessProposalRequirementAuthorityDrift" },
  { id: "upstream-change-resets-review", category: "artifact", rule: "A material Stage 1 change preserves prior revisions and resets researcher confirmation.", canonicalOwner: "ResearchProposalDocument lineage" },
  { id: "conflicts-non-destructive", category: "artifact", rule: "Divergent device and secure versions require an explicit choice; neither is overwritten automatically.", canonicalOwner: "research proposal reconciliation" },
  { id: "route-appropriate-language", category: "scientific", rule: "Qualitative, quantitative, mixed-methods, secondary-data, and evidence-synthesis routes retain appropriate concepts and negative requirements.", canonicalOwner: "proposal requirements compiler" },
  { id: "no-certification-inflation", category: "stage-boundary", rule: "The step cannot represent compliance, approval, novelty, truth, methodological validation, or submission readiness.", canonicalOwner: "proposal boundary claims" },
  { id: "stage2-not-stage3", category: "stage-boundary", rule: "The step configures a proposal planning contract and cannot claim that a runnable or ethically approved study exists.", canonicalOwner: "ResearchProposalDocument" },
  { id: "no-participant-data", category: "stage-boundary", rule: "The experience contract and proposal artifact cannot store participant rows, responses, or consent receipts.", canonicalOwner: "ResearchProposalDocument.participantDataIncluded" },
  { id: "ai-review-before-apply", category: "ai", rule: "AI may explain, compare, or propose bounded changes, but every content-changing action requires review before apply.", canonicalOwner: "researcher decision ledger" },
  { id: "ai-no-authority-invention", category: "ai", rule: "AI cannot invent controlling requirements, silently select an authority, or claim that a source is current without provenance.", canonicalOwner: "proposal mentor boundary" },
  { id: "accessible-equivalent-path", category: "accessibility", rule: "Keyboard, screen-reader, zoomed, mobile, and pointer workflows expose equivalent decisions, sources, statuses, and recovery actions.", canonicalOwner: "Stage 2 Step 1 interface" },
] as const;

export const STAGE2_STEP1_AI_MENTOR_BOUNDARY = {
  allowed: [
    "explain a scholarly term in project context",
    "compare registered proposal structures",
    "explain why a deterministic recommendation was produced",
    "identify questions the researcher may ask a supervisor or research office",
    "extract proposed requirements from a supplied source for review",
    "draft a bounded selection rationale for review",
  ],
  prohibited: [
    "confirm the proposal planning contract",
    "silently change canonical proposal requirements",
    "select a controlling authority without researcher review",
    "invent, certify, or silently refresh authoritative requirements",
    "claim compliance, approval, novelty, truth, methodological validity, or submission readiness",
    "store full chat transcripts in the research decision ledger",
  ],
  applyPolicy: "review-before-apply-with-researcher-owned-decision-record",
} as const;

export const STAGE2_STEP1_LAYOUT_CONTRACT = {
  desktop: {
    maximumContentWidthPx: 1600,
    contextColumnFraction: 0.34,
    configurationColumnFraction: 0.66,
    contextBehavior: "sticky-within-workspace",
  },
  tablet: {
    contextBehavior: "collapsible-summary-above-configuration",
  },
  mobile: {
    contextBehavior: "single-column-with-sticky-progress-and-actions",
  },
  readableLineLengthCh: 72,
  minimumInteractiveTargetPx: 44,
  zoomSupportPercent: 200,
  horizontalOverflowPolicy: "only-bounded-data-tables-may-scroll-horizontally",
} as const;

export const STAGE2_STEP1_EXPERIENCE_CONTRACT = {
  contractVersion: STAGE2_STEP1_EXPERIENCE_CONTRACT_VERSION,
  stageId: "stage-02",
  stepId: "stage-02-confirm-brief",
  nextStepId: "stage-02-step-01",
  canonicalArtifact: "ResearchProposalDocument.requirements",
  canonicalCompiler: "compileProposalRequirements",
  creates: [
    "versioned proposal requirements profile",
    "authority provenance snapshot",
    "researcher confirmation",
    "Stage 1 checksum-bound proposal revision",
  ],
  doesNotCreate: [
    "completed proposal narrative",
    "runnable study",
    "ethics approval",
    "institutional or funder compliance certification",
    "submission-ready package",
    "participant data",
  ],
  decisionSections: [
    "review-stage1",
    "proposal-purpose",
    "requirements-authority",
    "recommended-structure",
    "practical-constraints",
    "contract-review",
  ],
  statePriority: [
    "loading",
    "version-conflict",
    "stage1-changed",
    "authority-changed",
    "stage1-incomplete",
    "authority-required",
    "configuring",
    "provisional",
    "needs-review",
    "saving",
    "ready",
  ],
  downstreamConsumers: [
    "proposal evidence strategy",
    "proposal evidence review",
    "proposal synthesis",
    "proposed study contract",
    "proposal composer",
    "reviewed Stage 3 handoff",
  ],
} as const;

export function validateStage2Step1ExperienceContract(): string[] {
  const errors: string[] = [];
  const unique = (values: readonly string[], label: string) => {
    if (new Set(values).size !== values.length) errors.push(`${label} contains duplicate identifiers.`);
  };

  unique(STAGE2_STEP1_EXPERIENCE_STATES.map((state) => state.id), "Experience states");
  unique(STAGE2_STEP1_ACTIONS.map((action) => action.id), "Experience actions");
  unique(STAGE2_STEP1_TERM_REGISTRY.map((term) => term.id), "Term registry");
  unique(STAGE2_STEP1_EXPERIENCE_INVARIANTS.map((invariant) => invariant.id), "Experience invariants");

  const actionIds = new Set(STAGE2_STEP1_ACTIONS.map((action) => action.id));
  for (const state of STAGE2_STEP1_EXPERIENCE_STATES) {
    if (state.primaryActionId && !actionIds.has(state.primaryActionId)) {
      errors.push(`State ${state.id} references an unknown action.`);
    }
    if (state.canComplete && state.id !== "ready") errors.push(`Only the ready state may complete the step; found ${state.id}.`);
  }

  if (STAGE2_STEP1_EXPERIENCE_CONTRACT.statePriority.join("|") !== STAGE2_STEP1_EXPERIENCE_STATES.map((state) => state.id).join("|")) {
    errors.push("State definitions do not match the declared state priority.");
  }
  if (STAGE2_STEP1_PRESENTATION_OPTIONS.guidanceLevels.some((option) => option.artifactImpact !== "none")
    || STAGE2_STEP1_PRESENTATION_OPTIONS.informationDensities.some((option) => option.artifactImpact !== "none")) {
    errors.push("Presentation preferences must not affect research artifacts.");
  }
  const audienceLabels = [
    ...STAGE2_STEP1_PRESENTATION_OPTIONS.guidanceLevels.map((option) => option.label),
    ...STAGE2_STEP1_PRESENTATION_OPTIONS.informationDensities.map((option) => option.label),
  ].join(" ");
  if (/beginner|expert/i.test(audienceLabels)) errors.push("Presentation controls must not label researchers as beginner or expert.");
  if (!STAGE2_STEP1_EXPERIENCE_INVARIANTS.some((item) => item.id === "compiler-owns-requirements")) {
    errors.push("The experience contract must preserve the compiler ownership boundary.");
  }
  if (!STAGE2_STEP1_EXPERIENCE_INVARIANTS.some((item) => item.id === "no-certification-inflation")) {
    errors.push("The experience contract must preserve the non-certification boundary.");
  }
  return errors;
}
