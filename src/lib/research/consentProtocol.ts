import {
  canonicalArtifactJson,
  normalizeResearchArtifactReference,
  normalizeResearchArtifactSourceFingerprint,
  type ResearchArtifactReference,
  type ResearchArtifactSourceFingerprint,
} from "./artifactIdentity";
import type {
  ConsentAuthorityManifest,
  ConsentCapabilityMode,
  ConsentTemplateFamily,
} from "./consentAuthority";

export const CONSENT_PROTOCOL_SCHEMA_VERSION = 1 as const;
export const MAX_CONSENT_PROTOCOL_BYTES = 512 * 1024;
export const MAX_CONSENT_PROTOCOL_ITEMS = 250;

export type ConsentGovernancePathway =
  | "not-yet-determined"
  | "documented-exempt"
  | "expedited-or-full"
  | "fda-regulated"
  | "other-institutional";
export type ConsentGovernanceDecisionSource = "none" | "researcher" | "institution";
export type ConsentWaiverStatus = "not-requested" | "requested" | "approved" | "denied";
export type ConsentDocumentationMethod =
  | "not-yet-determined"
  | "signed-written"
  | "signed-electronic"
  | "verbal"
  | "electronic-acknowledgement"
  | "implied"
  | "telephone-script"
  | "short-form-oral-with-witness";
export type ConsentParticipantAudience =
  | "adult-participant"
  | "parent-or-guardian"
  | "child-or-adolescent-assent"
  | "legally-authorized-representative"
  | "other";

export interface ConsentGovernanceDeclaration {
  pathway: ConsentGovernancePathway;
  decisionSource: ConsentGovernanceDecisionSource;
  institutionReference: string;
  documentationMethod: ConsentDocumentationMethod;
  waiverOrAlteration: {
    status: ConsentWaiverStatus;
    approvalReference: string;
  } | null;
}

export interface ConsentParticipantGroup {
  id: string;
  audience: ConsentParticipantAudience;
  language: string;
  description: string;
}

export interface ConsentFormRequirement {
  id: string;
  family: ConsentTemplateFamily;
  participantGroupId: string;
  capabilityMode: ConsentCapabilityMode;
  rationale: string;
}

export interface ConsentProcedureModule {
  id: string;
  moduleKind: string;
  sourceReferences: ResearchArtifactReference[];
  facts: Record<string, string>;
  rationale: string;
}

export interface ConsentProtocolDraft {
  schemaVersion: typeof CONSENT_PROTOCOL_SCHEMA_VERSION;
  projectId: string;
  authorityManifestId: string;
  authorityProfileVersion: string;
  sourceFingerprint: ResearchArtifactSourceFingerprint;
  governance: ConsentGovernanceDeclaration;
  participantGroups: ConsentParticipantGroup[];
  formRequirements: ConsentFormRequirement[];
  procedureModules: ConsentProcedureModule[];
  researcherNotes: string;
  updatedAt: string;
}

export interface ConsentProtocolFoundationIssue {
  id: string;
  severity: "blocking" | "warning" | "advisory";
  repairTarget: "authority" | "governance" | "participants" | "forms" | "procedure";
  message: string;
}

const GOVERNANCE_PATHWAYS = [
  "not-yet-determined",
  "documented-exempt",
  "expedited-or-full",
  "fda-regulated",
  "other-institutional",
] as const;
const DECISION_SOURCES = ["none", "researcher", "institution"] as const;
const WAIVER_STATUSES = ["not-requested", "requested", "approved", "denied"] as const;
const DOCUMENTATION_METHODS = [
  "not-yet-determined",
  "signed-written",
  "signed-electronic",
  "verbal",
  "electronic-acknowledgement",
  "implied",
  "telephone-script",
  "short-form-oral-with-witness",
] as const;
const AUDIENCES = [
  "adult-participant",
  "parent-or-guardian",
  "child-or-adolescent-assent",
  "legally-authorized-representative",
  "other",
] as const;
const FAMILIES = [
  "standard-plain-language",
  "documented-exempt",
  "telephone",
  "assent",
  "parental-permission",
  "surrogate-or-lar",
  "short-form-non-english",
  "addendum-or-reconsent",
  "biomedical-specialized",
  "broad-consent",
] as const;
const CAPABILITY_MODES = ["unavailable", "authoring-export-only", "runtime-supported"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : null;
}

function token(value: unknown, maximum = 160): string | null {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maximum
    && /^[a-z0-9][a-z0-9._:-]*$/.test(value)
    ? value
    : null;
}

function text(value: unknown, maximum: number, allowEmpty = false): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\r\n/g, "\n").trim().slice(0, maximum);
  return normalized || (allowEmpty ? "" : null);
}

function isoDateTime(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) || date.toISOString() !== value ? null : value;
}

function normalizeGovernance(value: unknown): ConsentGovernanceDeclaration | null {
  if (!isRecord(value)) return null;
  const pathway = enumValue(value.pathway, GOVERNANCE_PATHWAYS);
  const decisionSource = enumValue(value.decisionSource, DECISION_SOURCES);
  const institutionReference = text(value.institutionReference, 1_000, true);
  const documentationMethod = enumValue(value.documentationMethod, DOCUMENTATION_METHODS);
  if (!pathway || !decisionSource || institutionReference === null || !documentationMethod) return null;
  let waiverOrAlteration: ConsentGovernanceDeclaration["waiverOrAlteration"] = null;
  if (value.waiverOrAlteration !== null) {
    if (!isRecord(value.waiverOrAlteration)) return null;
    const status = enumValue(value.waiverOrAlteration.status, WAIVER_STATUSES);
    const approvalReference = text(value.waiverOrAlteration.approvalReference, 1_000, true);
    if (!status || approvalReference === null) return null;
    waiverOrAlteration = { status, approvalReference };
  }
  return { pathway, decisionSource, institutionReference, documentationMethod, waiverOrAlteration };
}

function normalizeParticipantGroups(value: unknown): ConsentParticipantGroup[] | null {
  if (!Array.isArray(value) || value.length > MAX_CONSENT_PROTOCOL_ITEMS) return null;
  const normalized = value.map((item) => {
    if (!isRecord(item)) return null;
    const id = token(item.id);
    const audience = enumValue(item.audience, AUDIENCES);
    const language = text(item.language, 100);
    const description = text(item.description, 2_000);
    return id && audience && language && description ? { id, audience, language, description } : null;
  });
  return normalized.some((item) => item === null) ? null : normalized as ConsentParticipantGroup[];
}

function normalizeFormRequirements(value: unknown): ConsentFormRequirement[] | null {
  if (!Array.isArray(value) || value.length > MAX_CONSENT_PROTOCOL_ITEMS) return null;
  const normalized = value.map((item) => {
    if (!isRecord(item)) return null;
    const id = token(item.id);
    const family = enumValue(item.family, FAMILIES);
    const participantGroupId = token(item.participantGroupId);
    const capabilityMode = enumValue(item.capabilityMode, CAPABILITY_MODES);
    const rationale = text(item.rationale, 2_000);
    return id && family && participantGroupId && capabilityMode && rationale
      ? { id, family, participantGroupId, capabilityMode, rationale }
      : null;
  });
  return normalized.some((item) => item === null) ? null : normalized as ConsentFormRequirement[];
}

function normalizeProcedureModules(value: unknown): ConsentProcedureModule[] | null {
  if (!Array.isArray(value) || value.length > MAX_CONSENT_PROTOCOL_ITEMS) return null;
  const normalized = value.map((item) => {
    if (!isRecord(item) || !isRecord(item.facts)) return null;
    const id = token(item.id);
    const moduleKind = token(item.moduleKind);
    const sourceValues = Array.isArray(item.sourceReferences) && item.sourceReferences.length <= 64
      ? item.sourceReferences.map(normalizeResearchArtifactReference)
      : null;
    const rationale = text(item.rationale, 2_000);
    if (!id || !moduleKind || !sourceValues || sourceValues.some((source) => source === null) || !rationale) return null;
    const facts: Record<string, string> = {};
    const entries = Object.entries(item.facts);
    if (entries.length > 100) return null;
    for (const [key, rawValue] of entries) {
      const factKey = token(key);
      const factValue = text(rawValue, 5_000, true);
      if (!factKey || factValue === null) return null;
      facts[factKey] = factValue;
    }
    return {
      id,
      moduleKind,
      sourceReferences: sourceValues as ResearchArtifactReference[],
      facts,
      rationale,
    };
  });
  return normalized.some((item) => item === null) ? null : normalized as ConsentProcedureModule[];
}

function uniqueIds(items: ReadonlyArray<{ id: string }>): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

export function normalizeConsentProtocolDraft(value: unknown, projectId: string): ConsentProtocolDraft | null {
  try {
    canonicalArtifactJson(value, { maximumBytes: MAX_CONSENT_PROTOCOL_BYTES });
  } catch {
    return null;
  }
  if (!isRecord(value) || value.schemaVersion !== CONSENT_PROTOCOL_SCHEMA_VERSION) return null;
  const authorityManifestId = token(value.authorityManifestId);
  const authorityProfileVersion = token(value.authorityProfileVersion, 100);
  const sourceFingerprint = normalizeResearchArtifactSourceFingerprint(value.sourceFingerprint);
  const governance = normalizeGovernance(value.governance);
  const participantGroups = normalizeParticipantGroups(value.participantGroups);
  const formRequirements = normalizeFormRequirements(value.formRequirements);
  const procedureModules = normalizeProcedureModules(value.procedureModules);
  const researcherNotes = text(value.researcherNotes, 20_000, true);
  const updatedAt = isoDateTime(value.updatedAt);
  if (
    value.projectId !== projectId
    || !authorityManifestId
    || !authorityProfileVersion
    || !sourceFingerprint
    || !governance
    || !participantGroups
    || !formRequirements
    || !procedureModules
    || researcherNotes === null
    || !updatedAt
    || !uniqueIds(participantGroups)
    || !uniqueIds(formRequirements)
    || !uniqueIds(procedureModules)
  ) return null;
  const participantGroupIds = new Set(participantGroups.map((group) => group.id));
  if (formRequirements.some((form) => !participantGroupIds.has(form.participantGroupId))) return null;

  const normalized: ConsentProtocolDraft = {
    schemaVersion: CONSENT_PROTOCOL_SCHEMA_VERSION,
    projectId,
    authorityManifestId,
    authorityProfileVersion,
    sourceFingerprint,
    governance,
    participantGroups,
    formRequirements,
    procedureModules,
    researcherNotes,
    updatedAt,
  };
  try {
    canonicalArtifactJson(normalized, { maximumBytes: MAX_CONSENT_PROTOCOL_BYTES });
    return normalized;
  } catch {
    return null;
  }
}

export function collectConsentProtocolFoundationIssues(
  draft: ConsentProtocolDraft,
  authority: ConsentAuthorityManifest | null,
): ConsentProtocolFoundationIssue[] {
  const issues: ConsentProtocolFoundationIssue[] = [];
  if (!authority || authority.id !== draft.authorityManifestId) {
    issues.push({
      id: "authority-missing",
      severity: "blocking",
      repairTarget: "authority",
      message: "Select and verify the authority profile used to compose this consent protocol.",
    });
  } else if (authority.profileVersion !== draft.authorityProfileVersion) {
    issues.push({
      id: "authority-source-changed",
      severity: "blocking",
      repairTarget: "authority",
      message: "The authority profile version changed. Reconcile the protocol without overwriting reviewed work.",
    });
  }
  if (draft.governance.pathway === "not-yet-determined") {
    issues.push({
      id: "governance-pathway-undetermined",
      severity: "blocking",
      repairTarget: "governance",
      message: "The researcher or applicable institution must determine the governance pathway.",
    });
  }
  if (draft.governance.decisionSource === "none") {
    issues.push({
      id: "governance-decision-source-missing",
      severity: "blocking",
      repairTarget: "governance",
      message: "Record whether the governance declaration came from the researcher or institution.",
    });
  }
  if (draft.governance.documentationMethod === "not-yet-determined") {
    issues.push({
      id: "documentation-method-undetermined",
      severity: "blocking",
      repairTarget: "governance",
      message: "Select the applicable consent-documentation process; Cerise will not infer it from the study design.",
    });
  }
  const waiver = draft.governance.waiverOrAlteration;
  const methodNeedsWaiverEvidence = draft.governance.pathway !== "documented-exempt"
    && ["verbal", "electronic-acknowledgement", "implied"].includes(
      draft.governance.documentationMethod,
    );
  if (methodNeedsWaiverEvidence && waiver?.status !== "approved") {
    issues.push({
      id: "waiver-documentation-not-approved",
      severity: "blocking",
      repairTarget: "governance",
      message: "A waiver of signed documentation cannot be treated as approved without the applicable human determination.",
    });
  }
  if (waiver?.status === "approved" && !waiver.approvalReference) {
    issues.push({
      id: "waiver-approval-reference-missing",
      severity: "blocking",
      repairTarget: "governance",
      message: "Record the approval reference for the declared waiver or alteration.",
    });
  }
  if (draft.participantGroups.length === 0) {
    issues.push({
      id: "participant-groups-missing",
      severity: "blocking",
      repairTarget: "participants",
      message: "Add every participant audience that requires a form or decision process.",
    });
  }
  for (const form of draft.formRequirements) {
    if (form.capabilityMode === "unavailable") {
      issues.push({
        id: `form-runtime-unavailable-${form.id}`,
        severity: "warning",
        repairTarget: "forms",
        message: `The ${form.family} form can be planned but is not currently executable.`,
      });
    }
  }
  const order = { blocking: 0, warning: 1, advisory: 2 } as const;
  return issues.sort((left, right) => order[left.severity] - order[right.severity] || left.id.localeCompare(right.id));
}
