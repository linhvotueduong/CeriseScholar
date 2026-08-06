import type { MethodFamily, ResearchIntent } from "./projectRouteProfile";
import {
  CLAIM_EVIDENCE_MAP_SCHEMA_VERSION,
  type ClaimEvidenceMap,
  type ProjectEvidenceAssessment,
  type ProposalClaimEvidenceEntry,
  type ProposalClaimKind,
  type ProposalClaimStatus,
} from "./researchProposalDocument";

export const PROPOSAL_SYNTHESIS_PHASE4_VERSION = 1 as const;

export type ProposalSynthesisRoute = {
  intent: ResearchIntent | "undetermined";
  methodFamily: MethodFamily | "undetermined";
};

export interface SynthesisGuidanceSource {
  id: string;
  name: string;
  version: string;
  sourceUrl: string;
  accessedAt: string;
  role: "interpretation" | "certainty" | "qualitative-synthesis" | "gap-characterization" | "reporting";
}

export interface ProposalClaimKindDefinition {
  id: ProposalClaimKind;
  label: string;
  description: string;
  prompt: string;
  evidenceRequired: boolean;
}

export interface ProposalSynthesisIssue {
  id: string;
  severity: "blocking" | "advisory";
  message: string;
  claimId: string | null;
  questionId: string | null;
  assessmentId: string | null;
}

export interface ProposalSynthesisQuestionSummary {
  questionId: string;
  claimIds: string[];
  evidenceAssessmentIds: string[];
  gapClaimIds: string[];
  ready: boolean;
}

export interface ProposalSynthesisCompilation {
  schemaVersion: typeof PROPOSAL_SYNTHESIS_PHASE4_VERSION;
  route: ProposalSynthesisRoute;
  routeLabel: string;
  routePrompts: string[];
  guidanceSources: SynthesisGuidanceSource[];
  includedAssessmentIds: string[];
  linkedIncludedAssessmentIds: string[];
  unlinkedIncludedAssessmentIds: string[];
  questionSummaries: ProposalSynthesisQuestionSummary[];
  statusCounts: Record<ProposalClaimStatus, number>;
  kindCounts: Record<ProposalClaimKind, number>;
  issues: ProposalSynthesisIssue[];
  ready: boolean;
  claim: "researcher-reviewed-synthesis-map-not-novelty-truth-certainty-or-methodological-certification";
}

const ACCESSED_AT = "2026-08-05";

export const SYNTHESIS_GUIDANCE_SOURCES: readonly SynthesisGuidanceSource[] = [
  {
    id: "cochrane-handbook-interpretation-6-5",
    name: "Cochrane Handbook, Chapter 15: Interpreting results and drawing conclusions",
    version: "Version 6.5; chapter updated August 2023",
    sourceUrl: "https://training.cochrane.org/handbook/current/chapter-15",
    accessedAt: ACCESSED_AT,
    role: "interpretation",
  },
  {
    id: "cochrane-handbook-certainty-6-5",
    name: "Cochrane Handbook, Chapter 14: Completing Summary of Findings tables and grading certainty",
    version: "Version 6.5",
    sourceUrl: "https://training.cochrane.org/handbook/current/chapter-14",
    accessedAt: ACCESSED_AT,
    role: "certainty",
  },
  {
    id: "cochrane-handbook-qualitative-6-5",
    name: "Cochrane Handbook, Chapter 21: Qualitative evidence",
    version: "Version 6.5; chapter updated October 2019",
    sourceUrl: "https://training.cochrane.org/handbook/current/chapter-21",
    accessedAt: ACCESSED_AT,
    role: "qualitative-synthesis",
  },
  {
    id: "ahrq-research-gap-framework",
    name: "AHRQ Frameworks for Determining Research Gaps During Systematic Reviews",
    version: "Methods Research Report, 2011",
    sourceUrl: "https://effectivehealthcare.ahrq.gov/sites/default/files/pdf/methods-future-research-steps-framework_research.pdf",
    accessedAt: ACCESSED_AT,
    role: "gap-characterization",
  },
  {
    id: "prisma-2020-expanded-checklist",
    name: "PRISMA 2020 expanded checklist",
    version: "PRISMA 2020",
    sourceUrl: "https://www.prisma-statement.org/s/PRISMA_2020_expanded_checklist-yc78.pdf",
    accessedAt: ACCESSED_AT,
    role: "reporting",
  },
] as const;

export const PROPOSAL_CLAIM_KIND_DEFINITIONS: readonly ProposalClaimKindDefinition[] = [
  {
    id: "background",
    label: "Context",
    description: "The setting, population, phenomenon, theory, or history needed to understand the problem.",
    prompt: "What context is necessary, and which boundaries stop it from being universal?",
    evidenceRequired: true,
  },
  {
    id: "problem",
    label: "Problem",
    description: "The documented consequence, tension, unmet need, or practical concern the project addresses.",
    prompt: "What is happening, for whom, where, and why does it warrant attention?",
    evidenceRequired: true,
  },
  {
    id: "known",
    label: "What is known",
    description: "A bounded finding or interpretation that the reviewed evidence supports for this project.",
    prompt: "What can be said without extending beyond the populations, contexts, methods, or uncertainty in the evidence?",
    evidenceRequired: true,
  },
  {
    id: "contested",
    label: "Contested evidence",
    description: "A disagreement, inconsistency, divergent interpretation, or context-dependent pattern that must remain visible.",
    prompt: "Where do sources diverge, and could design, context, measurement, or interpretation explain the difference?",
    evidenceRequired: true,
  },
  {
    id: "gap",
    label: "Research gap",
    description: "A researcher-reviewed statement of what remains unanswered or insufficiently characterized after the bounded review.",
    prompt: "Is the gap about population, context, outcome, method, measurement, mechanism, implementation, dataset coverage, or certainty?",
    evidenceRequired: true,
  },
  {
    id: "significance",
    label: "Why the gap matters",
    description: "The scholarly, practical, policy, community, or methodological importance of addressing the gap.",
    prompt: "Who could use the answer, and what decision or understanding could it improve?",
    evidenceRequired: false,
  },
  {
    id: "proposed-contribution",
    label: "Proposed contribution",
    description: "A bounded promise about what the proposed study intends to add—not a result or novelty certification.",
    prompt: "What will the proposed study contribute if completed, without pre-claiming its findings?",
    evidenceRequired: false,
  },
] as const;

const CLAIM_KINDS = PROPOSAL_CLAIM_KIND_DEFINITIONS.map((item) => item.id);
const CLAIM_STATUSES: readonly ProposalClaimStatus[] = ["draft", "supported", "contested", "unsupported", "researcher-reviewed"];

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function issue(
  id: string,
  message: string,
  details: Partial<Pick<ProposalSynthesisIssue, "severity" | "claimId" | "questionId" | "assessmentId">> = {},
): ProposalSynthesisIssue {
  return {
    id,
    severity: details.severity ?? "blocking",
    message,
    claimId: details.claimId ?? null,
    questionId: details.questionId ?? null,
    assessmentId: details.assessmentId ?? null,
  };
}

function emptyCounts<T extends string>(values: readonly T[]): Record<T, number> {
  return Object.fromEntries(values.map((value) => [value, 0])) as Record<T, number>;
}

function routeLabel(route: ProposalSynthesisRoute): string {
  if (route.intent === "evidence-synthesis") return "Evidence synthesis";
  if (route.intent === "secondary-data") return "Secondary-data study";
  if (route.methodFamily === "qualitative") return "Qualitative primary study";
  if (route.methodFamily === "mixed-methods") return "Mixed-methods primary study";
  if (route.methodFamily === "quantitative") return "Quantitative primary study";
  return "Route awaiting confirmation";
}

export function synthesisPromptsForRoute(route: ProposalSynthesisRoute): string[] {
  if (route.intent === "evidence-synthesis") return [
    "Separate the direction or meaning of findings from certainty in the body of evidence.",
    "Characterize heterogeneity, indirectness, imprecision, missing evidence, and review-process limitations before proposing a gap.",
    "Do not treat an empty search result as proof that no study exists.",
  ];
  if (route.intent === "secondary-data") return [
    "Separate an important research question from what the selected dataset can actually represent.",
    "Characterize gaps in population, period, setting, variables, measurement, missingness, linkage, access, and version provenance.",
    "Do not treat an unavailable variable as evidence that the underlying phenomenon does not exist.",
  ];
  if (route.methodFamily === "qualitative") return [
    "Preserve context, participant perspectives, researcher interpretation, and divergent cases.",
    "A qualitative gap may concern meaning, experience, mechanism, implementation, context, or whose voice is absent.",
    "Do not force qualitative findings into effect-size or statistical-certainty language.",
  ];
  if (route.methodFamily === "mixed-methods") return [
    "Synthesize qualitative and quantitative strands separately before stating an integrated inference.",
    "Keep disagreement between strands visible and explain the planned point of integration.",
    "A gap may arise from either strand or from the absence of credible integration.",
  ];
  return [
    "Separate effect direction or association from precision, bias, applicability, and practical importance.",
    "Treat null, imprecise, inconsistent, and absent evidence as different situations.",
    "Bound every gap to the population, setting, measures, design, and evidence reviewed.",
  ];
}

export function createProposalClaimId(existingClaims: readonly ProposalClaimEvidenceEntry[]): string {
  const ids = new Set(existingClaims.map((claim) => claim.id));
  let index = existingClaims.length + 1;
  while (ids.has(`claim-${String(index).padStart(3, "0")}`)) index += 1;
  return `claim-${String(index).padStart(3, "0")}`;
}

export function createProposalClaim(
  existingClaims: readonly ProposalClaimEvidenceEntry[],
  kind: ProposalClaimKind,
  questionIds: readonly string[] = [],
): ProposalClaimEvidenceEntry {
  if (!CLAIM_KINDS.includes(kind)) throw new Error("Proposal claim kind is invalid.");
  return {
    id: createProposalClaimId(existingClaims),
    kind,
    text: "",
    status: "draft",
    questionIds: unique(questionIds),
    evidenceAssessmentIds: [],
    caveats: [],
  };
}

export function createClaimEvidenceMap(claims: readonly ProposalClaimEvidenceEntry[]): ClaimEvidenceMap {
  const ids = new Set<string>();
  return {
    schemaVersion: CLAIM_EVIDENCE_MAP_SCHEMA_VERSION,
    claims: claims.map((claim) => {
      const id = claim.id.trim();
      if (!id || ids.has(id)) throw new Error("Every synthesis claim needs a unique stable ID.");
      if (!CLAIM_KINDS.includes(claim.kind) || !CLAIM_STATUSES.includes(claim.status)) throw new Error("Proposal claim kind or status is invalid.");
      ids.add(id);
      return {
        ...claim,
        id,
        text: claim.text.trim(),
        questionIds: unique(claim.questionIds),
        evidenceAssessmentIds: unique(claim.evidenceAssessmentIds),
        caveats: unique(claim.caveats),
      };
    }),
    claim: "researcher-owned-claim-map-not-novelty-or-truth-certification",
  };
}

export function compileProposalSynthesis(input: {
  route: ProposalSynthesisRoute;
  selectedQuestionIds: readonly string[];
  assessments: readonly ProjectEvidenceAssessment[];
  claimEvidenceMap: ClaimEvidenceMap;
  evidenceStrategyReady: boolean;
  evidenceReviewReady: boolean;
}): ProposalSynthesisCompilation {
  const selectedQuestionIds = unique(input.selectedQuestionIds);
  const selectedQuestionSet = new Set(selectedQuestionIds);
  const assessmentById = new Map(input.assessments.map((assessment) => [assessment.assessmentId, assessment]));
  const includedAssessments = input.assessments.filter((assessment) => assessment.status === "included");
  const includedAssessmentIds = includedAssessments.map((assessment) => assessment.assessmentId);
  const includedSet = new Set(includedAssessmentIds);
  const linkedIncludedSet = new Set<string>();
  const issues: ProposalSynthesisIssue[] = [];
  const statusCounts = emptyCounts(CLAIM_STATUSES);
  const kindCounts = emptyCounts(CLAIM_KINDS);

  if (!input.evidenceStrategyReady) issues.push(issue("evidence-strategy-not-ready", "Finish the current Evidence Strategy before treating the synthesis as ready."));
  if (!input.evidenceReviewReady) issues.push(issue("evidence-review-not-ready", "Resolve the Project Source Review Ledger before finalizing synthesis claims."));
  if (selectedQuestionIds.length === 0) issues.push(issue("selected-question-required", "Select at least one Stage 1 research question before synthesizing evidence."));
  if (input.claimEvidenceMap.claims.length === 0) issues.push(issue("claim-required", "Add at least one bounded synthesis claim."));

  const normalizedText = new Map<string, string>();
  for (const claim of input.claimEvidenceMap.claims) {
    statusCounts[claim.status] += 1;
    kindCounts[claim.kind] += 1;
    const claimId = claim.id;
    const definition = PROPOSAL_CLAIM_KIND_DEFINITIONS.find((item) => item.id === claim.kind);
    const linkedAssessments = unique(claim.evidenceAssessmentIds);
    const linkedQuestions = unique(claim.questionIds);
    const includedLinks = linkedAssessments.filter((assessmentId) => includedSet.has(assessmentId));
    includedLinks.forEach((assessmentId) => linkedIncludedSet.add(assessmentId));

    if (!claim.text.trim()) issues.push(issue(`claim-text-${claimId}`, "Write the claim before reviewing its status.", { claimId }));
    if (claim.status === "draft") issues.push(issue(`claim-draft-${claimId}`, "Choose a researcher-reviewed status for this claim or remove it from the synthesis.", { claimId }));
    if (linkedQuestions.length === 0) issues.push(issue(`claim-question-${claimId}`, "Link this claim to at least one selected research question.", { claimId }));
    for (const questionId of linkedQuestions) {
      if (!selectedQuestionSet.has(questionId)) issues.push(issue(`claim-stale-question-${claimId}-${questionId}`, "This claim links to a question that is no longer selected in Stage 1.", { claimId, questionId }));
    }
    for (const assessmentId of linkedAssessments) {
      const assessment = assessmentById.get(assessmentId);
      if (!assessment) issues.push(issue(`claim-missing-assessment-${claimId}-${assessmentId}`, "This claim links to an evidence assessment that is no longer available.", { claimId, assessmentId }));
      else if (assessment.status !== "included") issues.push(issue(`claim-nonincluded-assessment-${claimId}-${assessmentId}`, "Only researcher-included evidence can support a synthesis claim.", { claimId, assessmentId }));
    }
    if ((definition?.evidenceRequired || claim.status === "supported" || claim.status === "contested") && includedLinks.length === 0) {
      issues.push(issue(`claim-evidence-${claimId}`, "Link this claim to at least one reviewed, included source.", { claimId }));
    }
    if (claim.status === "contested" && includedLinks.length < 2) {
      issues.push(issue(`contested-comparison-${claimId}`, "A contested claim needs at least two included sources so the disagreement remains inspectable.", { claimId }));
    }
    if ((claim.status === "contested" || claim.status === "unsupported") && claim.caveats.length === 0) {
      issues.push(issue(`claim-caveat-${claimId}`, "Explain the disagreement or support limitation in at least one caveat.", { claimId }));
    }
    if (claim.kind === "gap") {
      if (claim.status !== "researcher-reviewed") issues.push(issue(`gap-human-review-${claimId}`, "A research-gap claim must be marked Researcher reviewed; Cerise cannot certify a gap as a supported fact.", { claimId }));
      if (claim.caveats.length === 0) issues.push(issue(`gap-boundary-${claimId}`, "Bound the gap with at least one limitation, context, population, method, measurement, or search caveat.", { claimId }));
    }
    if (claim.kind === "proposed-contribution" && claim.status !== "draft" && claim.status !== "researcher-reviewed") {
      issues.push(issue(`contribution-human-review-${claimId}`, "A proposed contribution is a researcher-reviewed intention, not a supported result.", { claimId }));
    }
    if (input.route.intent === "evidence-synthesis" && claim.status !== "draft" && claim.caveats.length === 0) {
      issues.push(issue(`synthesis-certainty-${claimId}`, "For an evidence-synthesis route, record the claim’s certainty, applicability, or review-process limitation as a caveat.", { claimId }));
    }

    const textKey = claim.text.trim().toLocaleLowerCase().replace(/\s+/g, " ");
    const previousClaimId = textKey ? normalizedText.get(textKey) : undefined;
    if (previousClaimId) issues.push(issue(`duplicate-claim-${claimId}`, "This claim duplicates another claim’s wording. Merge them or make the distinction explicit.", { severity: "advisory", claimId }));
    else if (textKey) normalizedText.set(textKey, claimId);
  }

  if (input.claimEvidenceMap.claims.length > 0) {
    const hasKnownClaim = input.claimEvidenceMap.claims.some((claim) => (claim.kind === "known" || claim.kind === "background" || claim.kind === "problem") && claim.status !== "draft" && claim.status !== "unsupported");
    const hasGapClaim = input.claimEvidenceMap.claims.some((claim) => claim.kind === "gap" && claim.status === "researcher-reviewed");
    const hasSignificanceClaim = input.claimEvidenceMap.claims.some((claim) => claim.kind === "significance" && claim.status !== "draft" && claim.status !== "unsupported");
    if (!hasKnownClaim) issues.push(issue("known-landscape-required", "Add at least one reviewed context, problem, or what-is-known claim before establishing the gap."));
    if (!hasGapClaim) issues.push(issue("reviewed-gap-required", "Add at least one bounded, researcher-reviewed research-gap claim."));
    if (!hasSignificanceClaim) issues.push(issue("significance-required", "Explain why addressing the bounded gap matters before proposing a study."));
  }

  const questionSummaries = selectedQuestionIds.map((questionId) => {
    const claims = input.claimEvidenceMap.claims.filter((claim) => claim.questionIds.includes(questionId));
    const gapClaims = claims.filter((claim) => claim.kind === "gap" && claim.status === "researcher-reviewed");
    const evidenceAssessmentIds = unique(claims.flatMap((claim) => claim.evidenceAssessmentIds.filter((assessmentId) => includedSet.has(assessmentId))));
    if (claims.length === 0) issues.push(issue(`question-claim-coverage-${questionId}`, "This selected research question has no synthesis claim.", { questionId }));
    if (gapClaims.length === 0) issues.push(issue(`question-gap-coverage-${questionId}`, "This selected research question has no bounded, researcher-reviewed gap claim.", { questionId }));
    if (evidenceAssessmentIds.length === 0) issues.push(issue(`question-evidence-coverage-${questionId}`, "This selected research question has no included evidence linked through the claim map.", { questionId }));
    return {
      questionId,
      claimIds: claims.map((claim) => claim.id),
      evidenceAssessmentIds,
      gapClaimIds: gapClaims.map((claim) => claim.id),
      ready: claims.length > 0 && gapClaims.length > 0 && evidenceAssessmentIds.length > 0,
    };
  });

  const unlinkedIncludedAssessmentIds = includedAssessmentIds.filter((assessmentId) => !linkedIncludedSet.has(assessmentId));
  for (const assessmentId of unlinkedIncludedAssessmentIds) {
    issues.push(issue(`included-source-unlinked-${assessmentId}`, "An included source is not used by any synthesis claim. Link it or return to the review ledger and change its decision.", { assessmentId }));
  }
  if (input.route.intent === "undetermined" || input.route.methodFamily === "undetermined") {
    issues.push(issue("route-undetermined", "Confirm the Stage 1 research route so Cerise can show the correct synthesis guidance.", { severity: "advisory" }));
  }

  return {
    schemaVersion: PROPOSAL_SYNTHESIS_PHASE4_VERSION,
    route: input.route,
    routeLabel: routeLabel(input.route),
    routePrompts: synthesisPromptsForRoute(input.route),
    guidanceSources: [...SYNTHESIS_GUIDANCE_SOURCES],
    includedAssessmentIds,
    linkedIncludedAssessmentIds: includedAssessmentIds.filter((assessmentId) => linkedIncludedSet.has(assessmentId)),
    unlinkedIncludedAssessmentIds,
    questionSummaries,
    statusCounts,
    kindCounts,
    issues,
    ready: !issues.some((candidate) => candidate.severity === "blocking"),
    claim: "researcher-reviewed-synthesis-map-not-novelty-truth-certainty-or-methodological-certification",
  };
}
