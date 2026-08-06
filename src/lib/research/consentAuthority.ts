import {
  canonicalArtifactJson,
  canonicalJson,
  isArtifactToken,
  isResearchArtifactChecksum,
  MAX_ARTIFACT_ID_LENGTH,
  type ResearchArtifactChecksum,
} from "./artifactIdentity";

export const CONSENT_AUTHORITY_SCHEMA_VERSION = 1 as const;
export const MAX_CONSENT_AUTHORITY_BYTES = 512 * 1024;
export const MAX_CONSENT_AUTHORITY_SOURCES = 64;
export const MAX_CONSENT_AUTHORITY_CLAUSES = 300;
export const MAX_CONSENT_CLAUSE_TEXT = 20_000;
export const MAX_CONSENT_PLACEHOLDERS = 40;

export type ConsentAuthorityProfileKind = "generic-baseline" | "institutional";
export type ConsentAuthorityEvidenceState =
  | "not-yet-determined"
  | "researcher-declared"
  | "institution-documented"
  | "human-review-required";
export type ConsentTemplateFamily =
  | "standard-plain-language"
  | "documented-exempt"
  | "telephone"
  | "assent"
  | "parental-permission"
  | "surrogate-or-lar"
  | "short-form-non-english"
  | "addendum-or-reconsent"
  | "biomedical-specialized"
  | "broad-consent";
export type ConsentAuthoritySourceKind = "regulation" | "guidance" | "template" | "companion";
export type ConsentClauseEditPolicy =
  | "locked"
  | "fill-only"
  | "editable"
  | "conditional"
  | "institution-review-required";
export type ConsentCapabilityMode = "unavailable" | "authoring-export-only" | "runtime-supported";
export type ConsentClauseApplicability = "required" | "included" | "not-applicable" | "unresolved";
export type ConsentClauseReviewState = "not-reviewed" | "human-review-required" | "human-reviewed";

export interface ConsentAuthoritySource {
  id: string;
  kind: ConsentAuthoritySourceKind;
  title: string;
  url: string;
  version: string;
  effectiveDate: string | null;
  retrievedAt: string;
  snapshotChecksum: ResearchArtifactChecksum | null;
}

export interface ConsentClauseDefinition {
  id: string;
  purpose: string;
  sourceId: string;
  sourceLocator: string;
  policy: ConsentClauseEditPolicy;
  sourceText: string;
  allowedPlaceholders: string[];
}

export interface ConsentAuthorityCapability {
  id: string;
  mode: ConsentCapabilityMode;
  prerequisites: string[];
}

export interface ConsentAuthorityManifest {
  schemaVersion: typeof CONSENT_AUTHORITY_SCHEMA_VERSION;
  id: string;
  profileVersion: string;
  profileKind: ConsentAuthorityProfileKind;
  displayName: string;
  institution: string | null;
  jurisdiction: string;
  evidenceState: ConsentAuthorityEvidenceState;
  effectiveDate: string | null;
  retrievedAt: string;
  families: ConsentTemplateFamily[];
  sources: ConsentAuthoritySource[];
  clauseDefinitions: ConsentClauseDefinition[];
  capabilities: ConsentAuthorityCapability[];
  redistribution: {
    status: "metadata-only" | "approved-for-bundling";
    allowsBundledSourceText: boolean;
    evidenceReference: string;
  };
  claimBoundary: "authoring-consistency-support-not-irb-legal-ethics-or-compliance-approval";
}

export interface ConsentAuthoritySafetyIssue {
  id: string;
  severity: "blocking" | "warning" | "advisory";
  message: string;
}

export interface ConsentAuthorityChangeSummary {
  status: "current" | "profile-updated" | "source-updated";
  changedSourceIds: string[];
  changedClauseDefinitionIds: string[];
}

export interface ConsentClauseDraft {
  definitionId: string;
  text: string;
  placeholderValues: Record<string, string>;
  applicability: ConsentClauseApplicability;
  reviewState: ConsentClauseReviewState;
}

export interface ConsentClausePatch {
  text?: string;
  placeholderValues?: Record<string, string>;
  applicability?: ConsentClauseApplicability;
}

export type ConsentClausePatchResult =
  | { ok: true; clause: ConsentClauseDraft; issues: [] }
  | { ok: false; clause: ConsentClauseDraft; issues: string[] };

const PROFILE_KINDS = ["generic-baseline", "institutional"] as const;
const EVIDENCE_STATES = [
  "not-yet-determined",
  "researcher-declared",
  "institution-documented",
  "human-review-required",
] as const;
const SOURCE_KINDS = ["regulation", "guidance", "template", "companion"] as const;
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
const CLAUSE_POLICIES = [
  "locked",
  "fill-only",
  "editable",
  "conditional",
  "institution-review-required",
] as const;
const CAPABILITY_MODES = ["unavailable", "authoring-export-only", "runtime-supported"] as const;
const APPLICABILITY_VALUES = ["required", "included", "not-applicable", "unresolved"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : null;
}

function boundedText(value: unknown, maximum: number, allowEmpty = false): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\r\n/g, "\n").trim().slice(0, maximum);
  return normalized || (allowEmpty ? "" : null);
}

function dateValue(value: unknown, nullable = false): string | null | undefined {
  if (value === null && nullable) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value ? undefined : value;
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_000) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function rawJsonIsBounded(value: unknown): boolean {
  try {
    canonicalArtifactJson(value, { maximumBytes: MAX_CONSENT_AUTHORITY_BYTES });
    return true;
  } catch {
    return false;
  }
}

function uniqueTokens(values: unknown, maximum: number): string[] | null {
  if (!Array.isArray(values) || values.length > maximum) return null;
  const result: string[] = [];
  for (const value of values) {
    if (!isArtifactToken(value, MAX_ARTIFACT_ID_LENGTH) || result.includes(value)) return null;
    result.push(value);
  }
  return result;
}

function normalizeSource(value: unknown): ConsentAuthoritySource | null {
  if (!isRecord(value)) return null;
  const kind = enumValue(value.kind, SOURCE_KINDS);
  const title = boundedText(value.title, 300);
  const url = httpsUrl(value.url);
  const version = boundedText(value.version, 100);
  const effectiveDate = dateValue(value.effectiveDate, true);
  const retrievedAt = dateValue(value.retrievedAt);
  if (
    !isArtifactToken(value.id, MAX_ARTIFACT_ID_LENGTH)
    || !kind
    || !title
    || !url
    || !version
    || effectiveDate === undefined
    || typeof retrievedAt !== "string"
    || (value.snapshotChecksum !== null && !isResearchArtifactChecksum(value.snapshotChecksum))
  ) return null;
  return {
    id: value.id,
    kind,
    title,
    url,
    version,
    effectiveDate,
    retrievedAt,
    snapshotChecksum: value.snapshotChecksum,
  };
}

function normalizeClauseDefinition(
  value: unknown,
  sourceIds: ReadonlySet<string>,
): ConsentClauseDefinition | null {
  if (!isRecord(value)) return null;
  const purpose = boundedText(value.purpose, 160);
  const sourceLocator = boundedText(value.sourceLocator, 500);
  const policy = enumValue(value.policy, CLAUSE_POLICIES);
  const sourceText = boundedText(value.sourceText, MAX_CONSENT_CLAUSE_TEXT, true);
  const allowedPlaceholders = uniqueTokens(value.allowedPlaceholders, MAX_CONSENT_PLACEHOLDERS);
  if (
    !isArtifactToken(value.id, MAX_ARTIFACT_ID_LENGTH)
    || !purpose
    || !isArtifactToken(value.sourceId, MAX_ARTIFACT_ID_LENGTH)
    || !sourceIds.has(value.sourceId)
    || !sourceLocator
    || !policy
    || sourceText === null
    || !allowedPlaceholders
  ) return null;
  return {
    id: value.id,
    purpose,
    sourceId: value.sourceId,
    sourceLocator,
    policy,
    sourceText,
    allowedPlaceholders,
  };
}

function normalizeCapability(value: unknown): ConsentAuthorityCapability | null {
  if (!isRecord(value)) return null;
  const mode = enumValue(value.mode, CAPABILITY_MODES);
  const prerequisites = uniqueTokens(value.prerequisites, 50);
  if (!isArtifactToken(value.id, MAX_ARTIFACT_ID_LENGTH) || !mode || !prerequisites) return null;
  return { id: value.id, mode, prerequisites };
}

export function normalizeConsentAuthorityManifest(value: unknown): ConsentAuthorityManifest | null {
  if (!isRecord(value) || !rawJsonIsBounded(value)) return null;
  const profileKind = enumValue(value.profileKind, PROFILE_KINDS);
  const displayName = boundedText(value.displayName, 300);
  const institution = value.institution === null ? null : boundedText(value.institution, 300);
  const jurisdiction = boundedText(value.jurisdiction, 300);
  const evidenceState = enumValue(value.evidenceState, EVIDENCE_STATES);
  const effectiveDate = dateValue(value.effectiveDate, true);
  const retrievedAt = dateValue(value.retrievedAt);
  const families = Array.isArray(value.families)
    ? value.families.map((family) => enumValue(family, FAMILIES))
    : null;
  if (
    value.schemaVersion !== CONSENT_AUTHORITY_SCHEMA_VERSION
    || !isArtifactToken(value.id, MAX_ARTIFACT_ID_LENGTH)
    || !isArtifactToken(value.profileVersion, 100)
    || !profileKind
    || !displayName
    || (value.institution !== null && !institution)
    || !jurisdiction
    || !evidenceState
    || effectiveDate === undefined
    || typeof retrievedAt !== "string"
    || !families
    || families.some((family) => family === null)
    || new Set(families).size !== families.length
    || !Array.isArray(value.sources)
    || value.sources.length === 0
    || value.sources.length > MAX_CONSENT_AUTHORITY_SOURCES
    || !Array.isArray(value.clauseDefinitions)
    || value.clauseDefinitions.length > MAX_CONSENT_AUTHORITY_CLAUSES
    || !Array.isArray(value.capabilities)
    || value.capabilities.length > 100
    || !isRecord(value.redistribution)
    || !["metadata-only", "approved-for-bundling"].includes(String(value.redistribution.status))
    || typeof value.redistribution.allowsBundledSourceText !== "boolean"
    || value.claimBoundary !== "authoring-consistency-support-not-irb-legal-ethics-or-compliance-approval"
  ) return null;

  const sources = value.sources.map(normalizeSource);
  if (sources.some((source) => source === null)) return null;
  const normalizedSources = sources as ConsentAuthoritySource[];
  const sourceIds = new Set(normalizedSources.map((source) => source.id));
  if (sourceIds.size !== normalizedSources.length) return null;
  const clauses = value.clauseDefinitions.map((clause) => normalizeClauseDefinition(clause, sourceIds));
  if (clauses.some((clause) => clause === null)) return null;
  const normalizedClauses = clauses as ConsentClauseDefinition[];
  if (new Set(normalizedClauses.map((clause) => clause.id)).size !== normalizedClauses.length) return null;
  const capabilities = value.capabilities.map(normalizeCapability);
  if (capabilities.some((capability) => capability === null)) return null;
  const normalizedCapabilities = capabilities as ConsentAuthorityCapability[];
  if (new Set(normalizedCapabilities.map((capability) => capability.id)).size !== normalizedCapabilities.length) return null;
  const evidenceReference = boundedText(value.redistribution.evidenceReference, 1_000, true);
  if (evidenceReference === null) return null;

  const normalized: ConsentAuthorityManifest = {
    schemaVersion: CONSENT_AUTHORITY_SCHEMA_VERSION,
    id: value.id,
    profileVersion: value.profileVersion,
    profileKind,
    displayName,
    institution,
    jurisdiction,
    evidenceState,
    effectiveDate,
    retrievedAt,
    families: families as ConsentTemplateFamily[],
    sources: normalizedSources.sort((left, right) => left.id.localeCompare(right.id)),
    clauseDefinitions: normalizedClauses.sort((left, right) => left.id.localeCompare(right.id)),
    capabilities: normalizedCapabilities.sort((left, right) => left.id.localeCompare(right.id)),
    redistribution: {
      status: value.redistribution.status as "metadata-only" | "approved-for-bundling",
      allowsBundledSourceText: value.redistribution.allowsBundledSourceText,
      evidenceReference,
    },
    claimBoundary: "authoring-consistency-support-not-irb-legal-ethics-or-compliance-approval",
  };
  try {
    canonicalArtifactJson(normalized, { maximumBytes: MAX_CONSENT_AUTHORITY_BYTES });
    return normalized;
  } catch {
    return null;
  }
}

export function collectConsentAuthoritySafetyIssues(
  manifest: ConsentAuthorityManifest,
): ConsentAuthoritySafetyIssue[] {
  const issues: ConsentAuthoritySafetyIssue[] = [];
  if (
    manifest.redistribution.allowsBundledSourceText
    && manifest.redistribution.status !== "approved-for-bundling"
  ) {
    issues.push({
      id: "redistribution-approval-missing",
      severity: "blocking",
      message: "Source text cannot be bundled until redistribution approval is documented.",
    });
  }
  if (
    manifest.redistribution.status === "metadata-only"
    && manifest.clauseDefinitions.some((clause) => clause.sourceText.length > 0)
  ) {
    issues.push({
      id: "metadata-profile-contains-source-text",
      severity: "blocking",
      message: "A metadata-only authority profile cannot embed institutional source text.",
    });
  }
  for (const source of manifest.sources) {
    if (!source.snapshotChecksum) {
      issues.push({
        id: `source-snapshot-unverified-${source.id}`,
        severity: "warning",
        message: `${source.title} is referenced by metadata but does not have a locally verified snapshot checksum.`,
      });
    }
  }
  for (const capability of manifest.capabilities) {
    if (capability.mode === "runtime-supported" && capability.prerequisites.length === 0) {
      issues.push({
        id: `runtime-prerequisites-missing-${capability.id}`,
        severity: "blocking",
        message: `Runtime capability ${capability.id} must name its approved prerequisites.`,
      });
    }
  }
  if (manifest.evidenceState === "not-yet-determined") {
    issues.push({
      id: "authority-not-yet-determined",
      severity: "warning",
      message: "The applicable authority and governance path still require a researcher or institution decision.",
    });
  }
  const order = { blocking: 0, warning: 1, advisory: 2 } as const;
  return issues.sort((left, right) => order[left.severity] - order[right.severity] || left.id.localeCompare(right.id));
}

export function compareConsentAuthorityManifests(
  previous: ConsentAuthorityManifest,
  current: ConsentAuthorityManifest,
): ConsentAuthorityChangeSummary {
  const previousSources = new Map(previous.sources.map((source) => [source.id, source]));
  const currentSources = new Map(current.sources.map((source) => [source.id, source]));
  const sourceIds = [...new Set([...previousSources.keys(), ...currentSources.keys()])].sort();
  const changedSourceIds = sourceIds.filter((id) => (
    canonicalJson(previousSources.get(id)) !== canonicalJson(currentSources.get(id))
  ));
  const previousClauses = new Map(previous.clauseDefinitions.map((clause) => [clause.id, clause]));
  const currentClauses = new Map(current.clauseDefinitions.map((clause) => [clause.id, clause]));
  const clauseIds = [...new Set([...previousClauses.keys(), ...currentClauses.keys()])].sort();
  const changedClauseDefinitionIds = clauseIds.filter((id) => (
    canonicalJson(previousClauses.get(id)) !== canonicalJson(currentClauses.get(id))
  ));
  const profileChanged = previous.profileVersion !== current.profileVersion
    || previous.effectiveDate !== current.effectiveDate
    || canonicalJson(previous.families) !== canonicalJson(current.families)
    || canonicalJson(previous.capabilities) !== canonicalJson(current.capabilities)
    || canonicalJson(previous.redistribution) !== canonicalJson(current.redistribution);
  return {
    status: changedSourceIds.length > 0
      ? "source-updated"
      : profileChanged || changedClauseDefinitionIds.length > 0
        ? "profile-updated"
        : "current",
    changedSourceIds,
    changedClauseDefinitionIds,
  };
}

export function createConsentClauseDraft(definition: ConsentClauseDefinition): ConsentClauseDraft {
  return {
    definitionId: definition.id,
    text: definition.sourceText,
    placeholderValues: {},
    applicability: definition.policy === "conditional" ? "unresolved" : "required",
    reviewState: definition.policy === "institution-review-required"
      ? "human-review-required"
      : "not-reviewed",
  };
}

export function applyConsentClausePatch(
  definition: ConsentClauseDefinition,
  current: ConsentClauseDraft,
  patch: ConsentClausePatch,
): ConsentClausePatchResult {
  const issues: string[] = [];
  if (current.definitionId !== definition.id) issues.push("clause-definition-mismatch");
  const requestedText = patch.text === undefined
    ? current.text
    : boundedText(patch.text, MAX_CONSENT_CLAUSE_TEXT, true);
  if (requestedText === null) issues.push("invalid-clause-text");
  if (patch.applicability !== undefined && !APPLICABILITY_VALUES.includes(patch.applicability)) {
    issues.push("invalid-applicability");
  }
  const placeholders = patch.placeholderValues ?? current.placeholderValues;
  const placeholderEntries = Object.entries(placeholders);
  if (placeholderEntries.length > MAX_CONSENT_PLACEHOLDERS) issues.push("too-many-placeholder-values");
  for (const [key, value] of placeholderEntries) {
    if (!definition.allowedPlaceholders.includes(key) || typeof value !== "string" || value.length > 2_000) {
      issues.push(`invalid-placeholder:${key}`);
    }
  }
  if (definition.policy === "locked") {
    if (patch.text !== undefined && patch.text !== current.text) issues.push("locked-clause-text");
    if (patch.placeholderValues !== undefined && canonicalJson(placeholders) !== canonicalJson(current.placeholderValues)) {
      issues.push("locked-clause-placeholders");
    }
    if (patch.applicability !== undefined && patch.applicability !== current.applicability) {
      issues.push("locked-clause-applicability");
    }
  }
  if (definition.policy === "fill-only" && patch.text !== undefined && patch.text !== current.text) {
    issues.push("fill-only-clause-text");
  }
  if (definition.policy === "conditional") {
    if (patch.text !== undefined && patch.text !== current.text) issues.push("conditional-clause-text");
    if (patch.placeholderValues !== undefined && canonicalJson(placeholders) !== canonicalJson(current.placeholderValues)) {
      issues.push("conditional-clause-placeholders");
    }
  } else if (patch.applicability !== undefined && patch.applicability !== current.applicability) {
    issues.push("applicability-not-editable");
  }
  if (issues.length > 0 || requestedText === null) {
    return { ok: false, clause: current, issues: [...new Set(issues)].sort() };
  }

  const changed = requestedText !== current.text
    || canonicalJson(placeholders) !== canonicalJson(current.placeholderValues)
    || (patch.applicability ?? current.applicability) !== current.applicability;
  return {
    ok: true,
    clause: {
      ...current,
      text: requestedText,
      placeholderValues: { ...placeholders },
      applicability: patch.applicability ?? current.applicability,
      reviewState: changed
        ? definition.policy === "institution-review-required" ? "human-review-required" : "not-reviewed"
        : current.reviewState,
    },
    issues: [],
  };
}

const COMMON_RULE_SOURCE: ConsentAuthoritySource = {
  id: "hhs-45-cfr-46-116",
  kind: "regulation",
  title: "45 CFR 46.116 — General requirements for informed consent",
  url: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.116",
  version: "current-2026-07-31",
  effectiveDate: null,
  retrievedAt: "2026-07-31",
  snapshotChecksum: null,
};

export const GENERIC_US_CONSENT_AUTHORITY_MANIFEST: ConsentAuthorityManifest = {
  schemaVersion: CONSENT_AUTHORITY_SCHEMA_VERSION,
  id: "generic-us-research-consent-baseline",
  profileVersion: "2026.08.01",
  profileKind: "generic-baseline",
  displayName: "U.S. research-consent authoring baseline",
  institution: null,
  jurisdiction: "United States — applicability must be determined by the researcher and institution",
  evidenceState: "human-review-required",
  effectiveDate: null,
  retrievedAt: "2026-08-01",
  families: ["standard-plain-language", "assent", "parental-permission", "surrogate-or-lar", "short-form-non-english", "broad-consent"],
  sources: [
    COMMON_RULE_SOURCE,
    {
      id: "hhs-45-cfr-46-102",
      kind: "regulation",
      title: "45 CFR 46.102 — Definitions, including legally authorized representative",
      url: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.102",
      version: "current-2026-08-01",
      effectiveDate: null,
      retrievedAt: "2026-08-01",
      snapshotChecksum: null,
    },
    {
      id: "hhs-45-cfr-46-408",
      kind: "regulation",
      title: "45 CFR 46.408 — Parental permission and child assent",
      url: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-D/section-46.408",
      version: "current-2026-08-01",
      effectiveDate: null,
      retrievedAt: "2026-08-01",
      snapshotChecksum: null,
    },
    {
      id: "hhs-45-cfr-46-117",
      kind: "regulation",
      title: "45 CFR 46.117 — Documentation of informed consent",
      url: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.117",
      version: "current-2026-07-31",
      effectiveDate: null,
      retrievedAt: "2026-07-31",
      snapshotChecksum: null,
    },
    {
      id: "hhs-ohrp-electronic-consent",
      kind: "guidance",
      title: "OHRP/FDA Use of Electronic Informed Consent — Questions and Answers",
      url: "https://www.hhs.gov/ohrp/regulations-and-policy/guidance/use-electronic-informed-consent-questions-and-answers/index.html",
      version: "current-2026-07-31",
      effectiveDate: null,
      retrievedAt: "2026-07-31",
      snapshotChecksum: null,
    },
    {
      id: "hhs-ohrp-informed-consent-faq",
      kind: "guidance",
      title: "OHRP Informed Consent FAQs",
      url: "https://www.hhs.gov/ohrp/regulations-and-policy/guidance/faq/informed-consent/index.html",
      version: "current-2026-07-31",
      effectiveDate: null,
      retrievedAt: "2026-07-31",
      snapshotChecksum: null,
    },
    {
      id: "hhs-ohrp-non-english-consent",
      kind: "guidance",
      title: "OHRP Obtaining and Documenting Informed Consent of Non-English Speakers",
      url: "https://www.hhs.gov/ohrp/regulations-and-policy/guidance/obtaining-and-documenting-infomed-consent-non-english-speakers/index.html",
      version: "current-2026-08-01",
      effectiveDate: null,
      retrievedAt: "2026-08-01",
      snapshotChecksum: null,
    },
    {
      id: "hhs-ohrp-children-faq",
      kind: "guidance",
      title: "OHRP Research with Children FAQs",
      url: "https://www.hhs.gov/ohrp/regulations-and-policy/guidance/faq/children-research/index.html",
      version: "current-2026-08-01",
      effectiveDate: null,
      retrievedAt: "2026-08-01",
      snapshotChecksum: null,
    },
    {
      id: "hhs-sachrp-new-information-reconsent",
      kind: "guidance",
      title: "SACHRP Consideration of New Information and Re-consent",
      url: "https://www.hhs.gov/ohrp/sachrp-committee/recommendations/april-7-2020-attachment-a/index.html",
      version: "current-2026-07-31",
      effectiveDate: null,
      retrievedAt: "2026-07-31",
      snapshotChecksum: null,
    },
    {
      id: "nih-irbo-deception-guidance",
      kind: "guidance",
      title: "NIH IRBO Review of Research Involving Deception",
      url: "https://irbo.nih.gov/confluence/download/attachments/38962257/IRB%20Review%20of%20Research%20Involving%20Deception-October%202023.pdf?api=v2&modificationDate=1695736025742&version=1",
      version: "2023-10",
      effectiveDate: null,
      retrievedAt: "2026-07-31",
      snapshotChecksum: null,
    },
  ],
  clauseDefinitions: [],
  capabilities: [
    { id: "structured-authoring", mode: "authoring-export-only", prerequisites: ["researcher-authority-selection"] },
    { id: "protected-audience-packages", mode: "authoring-export-only", prerequisites: ["human-applicability-determination", "jurisdiction-and-institution-profile"] },
    { id: "translated-consent-variants", mode: "authoring-export-only", prerequisites: ["source-version-binding", "qualified-human-language-review"] },
    { id: "short-form-consent", mode: "authoring-export-only", prerequisites: ["institutional-approval", "interpreter-witness-signature-plan"] },
    { id: "participant-runtime", mode: "unavailable", prerequisites: ["phase-10-runtime-approval"] },
    { id: "multi-actor-execution", mode: "unavailable", prerequisites: ["identity-authority-signature-witness-custody-controls"] },
  ],
  redistribution: {
    status: "metadata-only",
    allowsBundledSourceText: false,
    evidenceReference: "No federal or institutional template text is bundled by this profile.",
  },
  claimBoundary: "authoring-consistency-support-not-irb-legal-ethics-or-compliance-approval",
};

export const UCSF_2026_CONSENT_AUTHORITY_MANIFEST: ConsentAuthorityManifest = {
  schemaVersion: CONSENT_AUTHORITY_SCHEMA_VERSION,
  id: "ucsf-hrpp-consent-2026",
  profileVersion: "2026.07.01",
  profileKind: "institutional",
  displayName: "UCSF HRPP 2026 consent and assent metadata profile",
  institution: "University of California, San Francisco",
  jurisdiction: "UCSF institutional research — researcher must confirm current applicability",
  evidenceState: "institution-documented",
  effectiveDate: "2026-07-01",
  retrievedAt: "2026-07-31",
  families: [
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
  ],
  sources: [
    {
      id: "ucsf-consent-template-index",
      kind: "guidance",
      title: "UCSF Consent and Assent Form Templates",
      url: "https://irb.ucsf.edu/consent-and-assent-form-templates",
      version: "current-2026-07-31",
      effectiveDate: "2026-07-01",
      retrievedAt: "2026-07-31",
      snapshotChecksum: null,
    },
    {
      id: "ucsf-plain-language-template-2026",
      kind: "template",
      title: "UCSF Plain Language Informed Consent Form Template",
      url: "https://ucsf.app.box.com/shared/static/rm00h8y0lzbi8j6ayy5lokfa2zajruly.docx",
      version: "2026",
      effectiveDate: "2026-07-01",
      retrievedAt: "2026-07-31",
      snapshotChecksum: "sha256:6baad0e127ff0ddb4b7a27077694750ce84d2d74c39ce732cfc0934ed17a6a5b",
    },
    {
      id: "ucsf-plain-language-companion-2026",
      kind: "companion",
      title: "UCSF Informed Consent Form Companion Document",
      url: "https://ucsf.app.box.com/shared/static/r97j7bfx7zodlq9lmjs14uwh81zi93ou.docx",
      version: "2026-06-26",
      effectiveDate: "2026-07-01",
      retrievedAt: "2026-07-31",
      snapshotChecksum: "sha256:289acc2155ec6a6fb0d49541cb0ea13a1f511ef92a9d9005ef0d180c88e5f003",
    },
    {
      id: "ucsf-exempt-consent-guidance",
      kind: "guidance",
      title: "UCSF Exempt Consent Templates and Guidance",
      url: "https://irb.ucsf.edu/exempt-consent-templates-and-guidance",
      version: "current-2026-07-31",
      effectiveDate: null,
      retrievedAt: "2026-07-31",
      snapshotChecksum: null,
    },
    {
      id: "ucsf-social-behavioral-guidance",
      kind: "guidance",
      title: "UCSF Social and Behavioral Research Guidance",
      url: "https://irb.ucsf.edu/social-and-behavioral-research",
      version: "current-2026-07-31",
      effectiveDate: null,
      retrievedAt: "2026-07-31",
      snapshotChecksum: null,
    },
    {
      id: "ucsf-waiver-signed-consent-guidance",
      kind: "guidance",
      title: "UCSF Verbal, Electronic, or Implied Consent and Waiver of Signed Consent",
      url: "https://irb.ucsf.edu/verbal-electronic-or-implied-consent-waiver-signed-consent",
      version: "current-2026-07-31",
      effectiveDate: null,
      retrievedAt: "2026-07-31",
      snapshotChecksum: null,
    },
    {
      id: "ucsf-children-minors-guidance",
      kind: "guidance",
      title: "UCSF Children and Minors in Research",
      url: "https://irb.ucsf.edu/children-and-minors-research",
      version: "current-2026-07-31",
      effectiveDate: null,
      retrievedAt: "2026-07-31",
      snapshotChecksum: null,
    },
    {
      id: "ucsf-non-english-guidance",
      kind: "guidance",
      title: "UCSF Consenting Non-English Speakers",
      url: "https://irb.ucsf.edu/consenting-non-english-speakers",
      version: "current-2026-07-31",
      effectiveDate: null,
      retrievedAt: "2026-07-31",
      snapshotChecksum: null,
    },
    {
      id: "ucsf-short-form-update-2025",
      kind: "guidance",
      title: "UCSF Updated Requirements for the Short Form Consent Method",
      url: "https://irb.ucsf.edu/content/updated-requirements-for-short-form-consent-method",
      version: "effective-2025-08-20",
      effectiveDate: "2025-08-20",
      retrievedAt: "2026-08-01",
      snapshotChecksum: null,
    },
    {
      id: "ucsf-accessible-consent-guidance",
      kind: "guidance",
      title: "UCSF Enrolling Participants Who Are Blind, Illiterate, or Cannot Talk or Write",
      url: "https://irb.ucsf.edu/enrolling-subjects-who-are-legally-blind-illiterate-or-cannot-talk-or-write",
      version: "current-2026-08-01",
      effectiveDate: null,
      retrievedAt: "2026-08-01",
      snapshotChecksum: null,
    },
    {
      id: "ucsf-surrogate-consent-guidance",
      kind: "guidance",
      title: "UCSF Surrogate Consent",
      url: "https://irb.ucsf.edu/surrogate-consent",
      version: "current-2026-08-01",
      effectiveDate: null,
      retrievedAt: "2026-08-01",
      snapshotChecksum: null,
    },
  ],
  clauseDefinitions: [
    {
      id: "ucsf-protected-locked-language",
      purpose: "Institution-protected language marked as locked in the 2026 Companion",
      sourceId: "ucsf-plain-language-companion-2026",
      sourceLocator: "Companion sections marked with the lock icon",
      policy: "locked",
      sourceText: "",
      allowedPlaceholders: [],
    },
    {
      id: "ucsf-protected-fill-only-language",
      purpose: "Institutional language that permits only declared fill-in fields",
      sourceId: "ucsf-plain-language-companion-2026",
      sourceLocator: "Companion options that permit bracketed field completion only",
      policy: "fill-only",
      sourceText: "",
      allowedPlaceholders: [],
    },
    {
      id: "ucsf-conditional-option-language",
      purpose: "Institutional option selected only when the stated condition applies",
      sourceId: "ucsf-plain-language-companion-2026",
      sourceLocator: "Companion conditional options and applicability instructions",
      policy: "conditional",
      sourceText: "",
      allowedPlaceholders: [],
    },
    {
      id: "ucsf-study-specific-editable-language",
      purpose: "Researcher-authored study-specific information",
      sourceId: "ucsf-plain-language-template-2026",
      sourceLocator: "Template study-specific fields and sections marked editable",
      policy: "editable",
      sourceText: "",
      allowedPlaceholders: [],
    },
  ],
  capabilities: [
    { id: "structured-authoring", mode: "authoring-export-only", prerequisites: ["researcher-confirms-applicability"] },
    { id: "institutional-source-import", mode: "authoring-export-only", prerequisites: ["source-use-review"] },
    { id: "protected-audience-packages", mode: "authoring-export-only", prerequisites: ["researcher-confirms-current-ucsf-determination"] },
    { id: "translated-consent-variants", mode: "authoring-export-only", prerequisites: ["source-version-binding", "qualified-human-language-review"] },
    { id: "short-form-consent", mode: "authoring-export-only", prerequisites: ["irb-approval", "qualified-interpreter", "witness-and-signature-plan"] },
    { id: "participant-runtime", mode: "unavailable", prerequisites: ["phase-10-runtime-approval"] },
    { id: "multi-actor-execution", mode: "unavailable", prerequisites: ["identity-signature-process-approval"] },
  ],
  redistribution: {
    status: "metadata-only",
    allowsBundledSourceText: false,
    evidenceReference: "Cerise bundles source metadata, section-policy metadata, and verified document checksums only.",
  },
  claimBoundary: "authoring-consistency-support-not-irb-legal-ethics-or-compliance-approval",
};

const BUNDLED_MANIFESTS = [
  GENERIC_US_CONSENT_AUTHORITY_MANIFEST,
  UCSF_2026_CONSENT_AUTHORITY_MANIFEST,
] as const;

export function listBundledConsentAuthorityManifests(): ConsentAuthorityManifest[] {
  return BUNDLED_MANIFESTS.map((manifest) => {
    const normalized = normalizeConsentAuthorityManifest(manifest);
    if (!normalized) throw new Error(`Bundled consent authority manifest ${manifest.id} is invalid.`);
    return normalized;
  });
}

export function getBundledConsentAuthorityManifest(id: string): ConsentAuthorityManifest | null {
  const match = BUNDLED_MANIFESTS.find((manifest) => manifest.id === id);
  if (!match) return null;
  return normalizeConsentAuthorityManifest(match);
}
