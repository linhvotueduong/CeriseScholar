import {
  isResearchArtifactChecksum,
  normalizeResearchArtifactReference,
  sha256ArtifactChecksum,
  type ResearchArtifactChecksum,
  type ResearchArtifactReference,
} from "./artifactIdentity";

export const RESEARCH_DECISION_LEDGER_SCHEMA_VERSION = 1 as const;
export const MAX_RESEARCH_DECISION_SUMMARY = 2_000;

export type ResearchAssistantDomain =
  | "pathway"
  | "evidence"
  | "proposal"
  | "consent"
  | "analysis"
  | "manuscript"
  | "figure"
  | "recruitment"
  | "route";
export type ResearchDecisionAction =
  | "applied"
  | "applied-after-edit"
  | "kept-current"
  | "dismissed";

export interface ResearchDecisionRecord {
  schemaVersion: typeof RESEARCH_DECISION_LEDGER_SCHEMA_VERSION;
  id: string;
  projectId: string;
  domain: ResearchAssistantDomain;
  suggestionId: string;
  suggestionKind: string;
  suggestionSummary: string;
  action: ResearchDecisionAction;
  decisionReason: string;
  decidedAt: string;
  baseArtifact: ResearchArtifactReference;
  suggestionChecksum: ResearchArtifactChecksum;
  resultingArtifact: ResearchArtifactReference | null;
  servedModel: string;
  promptStored: false;
  chatTranscriptStored: false;
  checksum: ResearchArtifactChecksum;
  claim: "researcher-decision-record-not-ai-approval-authorship-governance-or-validity";
}

const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const DOMAINS: readonly ResearchAssistantDomain[] = ["pathway", "evidence", "proposal", "consent", "analysis", "manuscript", "figure", "recruitment", "route"];
const ACTIONS: readonly ResearchDecisionAction[] = ["applied", "applied-after-edit", "kept-current", "dismissed"];

function token(value: string, label: string): string {
  if (!TOKEN_PATTERN.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function bounded(value: string, maximum: number): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maximum);
}

function decisionPayload(record: Omit<ResearchDecisionRecord, "checksum">) {
  return record;
}

export async function createResearchDecisionRecord(
  input: Omit<ResearchDecisionRecord, "schemaVersion" | "promptStored" | "chatTranscriptStored" | "checksum" | "claim">,
): Promise<ResearchDecisionRecord> {
  if (!DOMAINS.includes(input.domain)) throw new Error("Research decision domain is invalid.");
  if (!ACTIONS.includes(input.action)) throw new Error("Research decision action is invalid.");
  if (!isResearchArtifactChecksum(input.suggestionChecksum)) throw new Error("Research decision suggestion checksum is invalid.");
  if (!normalizeResearchArtifactReference(input.baseArtifact)) throw new Error("Research decision base artifact is invalid.");
  if (input.resultingArtifact && !normalizeResearchArtifactReference(input.resultingArtifact)) {
    throw new Error("Research decision resulting artifact is invalid.");
  }
  const core: Omit<ResearchDecisionRecord, "checksum"> = {
    schemaVersion: RESEARCH_DECISION_LEDGER_SCHEMA_VERSION,
    ...input,
    id: token(input.id, "Research decision ID"),
    projectId: token(input.projectId, "Research decision project ID"),
    suggestionId: token(input.suggestionId, "Research suggestion ID"),
    suggestionKind: token(input.suggestionKind, "Research suggestion kind"),
    suggestionSummary: bounded(input.suggestionSummary, MAX_RESEARCH_DECISION_SUMMARY),
    decisionReason: bounded(input.decisionReason, MAX_RESEARCH_DECISION_SUMMARY),
    servedModel: bounded(input.servedModel, 240),
    decidedAt: new Date(input.decidedAt).toISOString(),
    promptStored: false,
    chatTranscriptStored: false,
    claim: "researcher-decision-record-not-ai-approval-authorship-governance-or-validity",
  };
  if (!core.suggestionSummary || !core.decisionReason) {
    throw new Error("Research decisions require a bounded summary and researcher reason.");
  }
  return { ...core, checksum: await sha256ArtifactChecksum(decisionPayload(core)) };
}

export async function verifyResearchDecisionRecord(record: ResearchDecisionRecord): Promise<boolean> {
  const { checksum, ...core } = record;
  return isResearchArtifactChecksum(checksum)
    && checksum === await sha256ArtifactChecksum(decisionPayload(core));
}

export interface LegacyConsentDecisionLike {
  id: string;
  projectId: string;
  suggestionId: string;
  suggestionKind: string;
  suggestionTitle: string;
  action: "applied" | "applied-after-edit" | "kept-current";
  decidedAt: string;
  baseRevisionChecksum: ResearchArtifactChecksum;
  proposedTextChecksum: ResearchArtifactChecksum | null;
  resultingTextChecksum: ResearchArtifactChecksum | null;
  servedModel: string;
}

/** Compatibility adapter; legacy rows remain intact and can be projected into the unified ledger. */
export async function adaptLegacyConsentDecision(
  legacy: LegacyConsentDecisionLike,
): Promise<ResearchDecisionRecord> {
  return createResearchDecisionRecord({
    id: `consent-${legacy.id}`.slice(0, 160),
    projectId: legacy.projectId,
    domain: "consent",
    suggestionId: legacy.suggestionId,
    suggestionKind: legacy.suggestionKind,
    suggestionSummary: legacy.suggestionTitle,
    action: legacy.action,
    decisionReason: "Imported from the existing checksum-bound consent decision ledger.",
    decidedAt: legacy.decidedAt,
    baseArtifact: {
      artifactKind: "consent-protocol",
      artifactId: `consent-${legacy.projectId}`,
      schemaVersion: 1,
      checksum: legacy.baseRevisionChecksum,
    },
    suggestionChecksum: legacy.proposedTextChecksum ?? legacy.baseRevisionChecksum,
    resultingArtifact: legacy.resultingTextChecksum ? {
      artifactKind: "consent-protocol",
      artifactId: `consent-${legacy.projectId}`,
      schemaVersion: 1,
      checksum: legacy.resultingTextChecksum,
    } : null,
    servedModel: legacy.servedModel,
  });
}
