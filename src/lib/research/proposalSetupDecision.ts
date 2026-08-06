export const PROPOSAL_SETUP_DECISION_SCHEMA_VERSION = 1 as const;

export type ProposalRequirementTemplateId =
  | "generic-academic"
  | "nih-forms-i"
  | "nsf-pappg-24-1"
  | "prisma-p-2015"
  | "jars-qual-2018"
  | "mmars-2018"
  | "researcher-defined";

export type ProposalDestinationKind =
  | "institution-or-program"
  | "course-or-supervisor"
  | "funder"
  | "review-body"
  | "journal-or-professional-body"
  | "internal"
  | "other"
  | "undetermined";

export type ProposalInstructionSourceStatus =
  | "not-required"
  | "not-provided"
  | "registered"
  | "researcher-defined"
  | "provisional";

export type ProposalRecommendationDecision =
  | "unreviewed"
  | "accepted"
  | "overridden"
  | "legacy-unspecified";

export interface ProposalSetupDecision {
  schemaVersion: typeof PROPOSAL_SETUP_DECISION_SCHEMA_VERSION;
  destinationKind: ProposalDestinationKind;
  destinationName: string;
  instructionSourceStatus: ProposalInstructionSourceStatus;
  recommendationDecision: ProposalRecommendationDecision;
  selectionRationale: string;
  unresolvedRequirements: string[];
  claim: "researcher-owned-proposal-setup-not-authority-compliance-approval-or-submission-certification";
}

export const PROPOSAL_DESTINATION_OPTIONS: ReadonlyArray<{
  id: ProposalDestinationKind;
  label: string;
  description: string;
}> = [
  { id: "institution-or-program", label: "University, department, or program", description: "A thesis, dissertation, degree, school, or institutional process controls the proposal." },
  { id: "course-or-supervisor", label: "Course or supervisor", description: "A course brief, instructor, adviser, or supervisor provides the working instructions." },
  { id: "funder", label: "Funding organization", description: "A funding opportunity and institutional submission process control the application." },
  { id: "review-body", label: "Review or registration body", description: "A protocol standard, registry, or review organization defines the expected structure." },
  { id: "journal-or-professional-body", label: "Journal or professional body", description: "A journal, publisher, or professional standard informs the proposal format." },
  { id: "internal", label: "Internal research decision", description: "The proposal supports a team, laboratory, organization, or internal planning decision." },
  { id: "other", label: "Another destination", description: "A destination not represented by the listed categories controls the proposal." },
  { id: "undetermined", label: "Not decided yet", description: "The destination remains explicit and provisional until the researcher identifies it." },
] as const;

const DESTINATION_KINDS = new Set<ProposalDestinationKind>(PROPOSAL_DESTINATION_OPTIONS.map((option) => option.id));
const INSTRUCTION_SOURCE_STATUSES = new Set<ProposalInstructionSourceStatus>([
  "not-required",
  "not-provided",
  "registered",
  "researcher-defined",
  "provisional",
]);
const RECOMMENDATION_DECISIONS = new Set<ProposalRecommendationDecision>([
  "unreviewed",
  "accepted",
  "overridden",
  "legacy-unspecified",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function boundedText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string" || value.length > maximum) return null;
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function createEmptyProposalSetupDecision(): ProposalSetupDecision {
  return {
    schemaVersion: PROPOSAL_SETUP_DECISION_SCHEMA_VERSION,
    destinationKind: "undetermined",
    destinationName: "",
    instructionSourceStatus: "not-provided",
    recommendationDecision: "unreviewed",
    selectionRationale: "",
    unresolvedRequirements: [],
    claim: "researcher-owned-proposal-setup-not-authority-compliance-approval-or-submission-certification",
  };
}

export function normalizeProposalSetupDecision(value: unknown): ProposalSetupDecision | null {
  const candidate = record(value);
  if (!candidate || candidate.schemaVersion !== PROPOSAL_SETUP_DECISION_SCHEMA_VERSION) return null;
  if (typeof candidate.destinationKind !== "string" || !DESTINATION_KINDS.has(candidate.destinationKind as ProposalDestinationKind)) return null;
  if (typeof candidate.instructionSourceStatus !== "string" || !INSTRUCTION_SOURCE_STATUSES.has(candidate.instructionSourceStatus as ProposalInstructionSourceStatus)) return null;
  if (typeof candidate.recommendationDecision !== "string" || !RECOMMENDATION_DECISIONS.has(candidate.recommendationDecision as ProposalRecommendationDecision)) return null;
  const destinationName = boundedText(candidate.destinationName, 500);
  const selectionRationale = boundedText(candidate.selectionRationale, 20_000);
  if (destinationName === null || selectionRationale === null || !Array.isArray(candidate.unresolvedRequirements) || candidate.unresolvedRequirements.length > 100) return null;
  const unresolvedRequirements: string[] = [];
  for (const unresolved of candidate.unresolvedRequirements) {
    const normalized = boundedText(unresolved, 2_000);
    if (normalized === null) return null;
    const cleaned = normalized.trim();
    if (cleaned && !unresolvedRequirements.includes(cleaned)) unresolvedRequirements.push(cleaned);
  }
  if (candidate.claim !== "researcher-owned-proposal-setup-not-authority-compliance-approval-or-submission-certification") return null;
  return {
    schemaVersion: PROPOSAL_SETUP_DECISION_SCHEMA_VERSION,
    destinationKind: candidate.destinationKind as ProposalDestinationKind,
    destinationName,
    instructionSourceStatus: candidate.instructionSourceStatus as ProposalInstructionSourceStatus,
    recommendationDecision: candidate.recommendationDecision as ProposalRecommendationDecision,
    selectionRationale,
    unresolvedRequirements,
    claim: "researcher-owned-proposal-setup-not-authority-compliance-approval-or-submission-certification",
  };
}

export function validateProposalSetupDecision(value: unknown): string[] {
  const decision = normalizeProposalSetupDecision(value);
  if (!decision) return ["proposal-setup-decision-invalid"];
  const issues: string[] = [];
  if (decision.destinationKind !== "undetermined" && decision.destinationKind !== "internal" && !decision.destinationName.trim()) {
    issues.push("proposal-destination-name-required");
  }
  if (decision.recommendationDecision === "overridden" && !decision.selectionRationale.trim()) {
    issues.push("proposal-recommendation-override-rationale-required");
  }
  return issues;
}
