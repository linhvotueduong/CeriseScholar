import {
  createResearchArtifactIdentity,
  normalizeResearchArtifactIdentity,
  verifyResearchArtifactIdentity,
  type ResearchArtifactIdentity,
  type ResearchArtifactReference,
} from "./artifactIdentity";
import type {
  AssignmentStrategy,
  DataSensitivity,
  MethodFamily,
  ParticipantAudience,
  ResearchIntent,
  ResearchSetting,
  SpecialProcedure,
} from "./projectRouteProfile";
import {
  PROPOSAL_SECTIONS,
  SECTION_LABELS,
  type PaperSection,
} from "../../types/paper-section";
import {
  validateProposalSetupDecision,
  type ProposalSetupDecision,
} from "./proposalSetupDecision";

export type { ProposalSetupDecision } from "./proposalSetupDecision";

export const RESEARCH_PROPOSAL_SCHEMA_VERSION = 1 as const;
export const PROPOSAL_REQUIREMENTS_SCHEMA_VERSION = 1 as const;
export const CLAIM_EVIDENCE_MAP_SCHEMA_VERSION = 1 as const;
export const PROPOSED_STUDY_CONTRACT_SCHEMA_VERSION = 1 as const;
export const PROJECT_EVIDENCE_ASSESSMENT_SCHEMA_VERSION = 1 as const;

export const MAX_PROPOSAL_SECTIONS = 100;
export const MAX_PROPOSAL_SECTION_TEXT = 250_000;
export const MAX_PROPOSAL_COLLECTION_ITEMS = 1_000;
export const MAX_PROPOSAL_ITEM_TEXT = 20_000;

export type ProposalPurpose =
  | "thesis"
  | "dissertation"
  | "coursework"
  | "internal"
  | "funder"
  | "review-protocol"
  | "custom";

export type ProposalRequirementAuthorityKind =
  | "institution"
  | "funder"
  | "reporting-guideline"
  | "researcher-defined";

export interface ProposalRequirementAuthority {
  authorityId: string;
  kind: ProposalRequirementAuthorityKind;
  name: string;
  version: string;
  sourceUrl: string;
  accessedAt: string;
}

export interface ProposalRequirement {
  id: string;
  label: string;
  description: string;
  required: boolean;
  authorityId: string | null;
}

export interface ProposalRequirementsProfile {
  schemaVersion: typeof PROPOSAL_REQUIREMENTS_SCHEMA_VERSION;
  profileId: string;
  revision: number;
  purpose: ProposalPurpose;
  route: {
    intent: ResearchIntent | "undetermined";
    methodFamily: MethodFamily | "undetermined";
  };
  language: string;
  citationStyle: string;
  maximumWords: number | null;
  authorities: ProposalRequirementAuthority[];
  requirements: ProposalRequirement[];
  customNotes: string;
  setupDecision?: ProposalSetupDecision;
  researcherConfirmed: boolean;
  claim: "requirements-profile-not-compliance-approval-or-submission-certification";
}

export interface EvidenceSearchVersion {
  id: string;
  version: number;
  query: string;
  sourceSystems: string[];
  runAt: string | null;
  resultCount: number | null;
}

export interface ProposalEvidenceStrategy {
  questionIds: string[];
  concepts: string[];
  synonyms: string[];
  sourceTypes: string[];
  eligibilityNotes: string;
  searchVersions: EvidenceSearchVersion[];
  stoppingRationale: string;
}

export type ProposalClaimKind =
  | "background"
  | "problem"
  | "known"
  | "contested"
  | "gap"
  | "significance"
  | "proposed-contribution";
export type ProposalClaimStatus = "draft" | "supported" | "contested" | "unsupported" | "researcher-reviewed";

export interface ProposalClaimEvidenceEntry {
  id: string;
  kind: ProposalClaimKind;
  text: string;
  status: ProposalClaimStatus;
  questionIds: string[];
  evidenceAssessmentIds: string[];
  caveats: string[];
}

export interface ClaimEvidenceMap {
  schemaVersion: typeof CLAIM_EVIDENCE_MAP_SCHEMA_VERSION;
  claims: ProposalClaimEvidenceEntry[];
  claim: "researcher-owned-claim-map-not-novelty-or-truth-certification";
}

export interface ProposedStudyContractEntry {
  id: string;
  questionId: string;
  purpose: string;
  evidenceNeed: string;
  populationOrSource: string;
  proposedMethod: string;
  analysisDirection: string;
  uncertainty: string;
}

export interface ProposedStudyRouteSnapshot {
  assignment: AssignmentStrategy | "undetermined";
  setting: ResearchSetting | "undetermined";
  audience: ParticipantAudience | "undetermined";
  dataSensitivity: DataSensitivity | "undetermined";
  possibleSpecialProcedures: SpecialProcedure[];
}

export interface ProposedStudyContract {
  schemaVersion: typeof PROPOSED_STUDY_CONTRACT_SCHEMA_VERSION;
  intent: ResearchIntent | "undetermined";
  methodFamily: MethodFamily | "undetermined";
  routeSnapshot: ProposedStudyRouteSnapshot | null;
  entries: ProposedStudyContractEntry[];
  feasibilityNotes: string;
  accessNotes: string;
  ethicsAndSensitivityNotes: string;
  implementationDeferredToStage3: true;
  claim: "proposal-intent-not-runnable-study-methodological-validation-or-ethical-approval";
}

export interface ResearchProposalSection {
  id: string;
  title: string;
  role: string;
  content: string;
  citationKeys: string[];
  sourceKnowledgeEntryIds: string[];
  sourceAssetIds: string[];
  sourceClaimIds?: string[];
  sourceEvidenceAssessmentIds?: string[];
  sourceContractEntryIds?: string[];
  requirementIds?: string[];
  unresolvedSupportNotes?: string;
  researcherReviewed?: boolean;
}

export interface ResearchProposalRevisionRecord {
  revision: number;
  previousChecksum: string | null;
  createdAt: string;
  createdBy: "legacy-import" | "researcher" | "system-migration" | "reviewed-ai-patch";
}

export interface ResearchProposalMigrationMetadata {
  importedLegacySectionKeys: string[];
  legacyImportedAt: string | null;
  legacyPaperSectionsPreserved: true;
  legacyPaperSectionsDualWritten: true;
}

export interface ResearchProposalPayload {
  schemaVersion: typeof RESEARCH_PROPOSAL_SCHEMA_VERSION;
  projectId: string;
  title: string;
  language: string;
  revision: number;
  requirements: ProposalRequirementsProfile;
  evidenceStrategy: ProposalEvidenceStrategy;
  claimEvidenceMap: ClaimEvidenceMap;
  proposedStudyContract: ProposedStudyContract;
  sections: ResearchProposalSection[];
  unresolvedQuestions: string[];
  revisionHistory: ResearchProposalRevisionRecord[];
  migration: ResearchProposalMigrationMetadata;
  updatedAt: string;
  participantDataIncluded: false;
  claim: "researcher-owned-proposal-not-novelty-methodological-ethical-compliance-or-submission-approval";
}

export interface ResearchProposalDocument extends ResearchProposalPayload {
  identity: ResearchArtifactIdentity;
}

export type EvidenceAssessmentStatus = "candidate" | "included" | "excluded" | "awaiting-review";
export type EvidenceAppraisalAnswer = "yes" | "no" | "unclear" | "not-applicable";

export interface ProjectEvidenceAppraisalItem {
  criterionId: string;
  prompt: string;
  answer: EvidenceAppraisalAnswer;
  rationale: string;
}

export interface ProjectEvidenceAssessmentPayload {
  schemaVersion: typeof PROJECT_EVIDENCE_ASSESSMENT_SCHEMA_VERSION;
  projectId: string;
  assessmentId: string;
  sourceId: string;
  revision: number;
  status: EvidenceAssessmentStatus;
  decisionRationale: string;
  linkedQuestionIds: string[];
  linkedClaimIds: string[];
  appraisalFramework: string;
  appraisal: ProjectEvidenceAppraisalItem[];
  caveats: string[];
  researcherNotes: string;
  reviewedAt: string | null;
  updatedAt: string;
  participantDataIncluded: false;
  claim: "project-specific-evidence-judgment-not-universal-quality-score-or-truth-certification";
}

export interface ProjectEvidenceAssessment extends ProjectEvidenceAssessmentPayload {
  identity: ResearchArtifactIdentity;
}

export type LegacyProposalSection = Pick<PaperSection, "section_key" | "content" | "updated_at">;

const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const PURPOSES: readonly ProposalPurpose[] = ["thesis", "dissertation", "coursework", "internal", "funder", "review-protocol", "custom"];
const AUTHORITY_KINDS: readonly ProposalRequirementAuthorityKind[] = ["institution", "funder", "reporting-guideline", "researcher-defined"];
const INTENTS: ReadonlyArray<ResearchIntent | "undetermined"> = ["primary-data", "secondary-data", "evidence-synthesis", "undetermined"];
const METHODS: ReadonlyArray<MethodFamily | "undetermined"> = ["quantitative", "qualitative", "mixed-methods", "evidence-synthesis", "undetermined"];
const ASSIGNMENTS: ReadonlyArray<AssignmentStrategy | "undetermined"> = ["randomized", "non-randomized", "none", "undetermined"];
const SETTINGS: ReadonlyArray<ResearchSetting | "undetermined"> = ["online-home", "laboratory", "field", "telephone", "import-only", "not-applicable", "undetermined"];
const AUDIENCES: ReadonlyArray<ParticipantAudience | "undetermined"> = ["adult", "minor", "capacity-limited", "not-participant", "undetermined"];
const DATA_SENSITIVITIES: ReadonlyArray<DataSensitivity | "undetermined"> = ["public", "deidentified", "restricted", "identifiable", "undetermined"];
const SPECIAL_PROCEDURES: readonly SpecialProcedure[] = ["recording", "deception", "specimen", "genetic", "longitudinal", "reconsent"];
const ASSESSMENT_STATUSES: readonly EvidenceAssessmentStatus[] = ["candidate", "included", "excluded", "awaiting-review"];
const APPRAISAL_ANSWERS: readonly EvidenceAppraisalAnswer[] = ["yes", "no", "unclear", "not-applicable"];
const CLAIM_KINDS: readonly ProposalClaimKind[] = ["background", "problem", "known", "contested", "gap", "significance", "proposed-contribution"];
const CLAIM_STATUSES: readonly ProposalClaimStatus[] = ["draft", "supported", "contested", "unsupported", "researcher-reviewed"];
const LEGACY_SECTION_SET = new Set<string>(PROPOSAL_SECTIONS);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function token(value: unknown, label: string): string {
  if (typeof value !== "string" || !TOKEN_PATTERN.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function boundedText(value: unknown, maximum: number, label: string, allowEmpty = true): string {
  if (typeof value !== "string" || value.length > maximum || (!allowEmpty && !value.trim())) {
    throw new Error(`${label} is invalid or exceeds its size boundary.`);
  }
  return value;
}

function timestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error(`${label} is invalid.`);
  return new Date(value).toISOString();
}

function positiveRevision(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw new Error(`${label} is invalid.`);
  return value as number;
}

function uniqueTokens(values: readonly string[], label: string): string[] {
  return [...new Set(values.map((value) => token(value, label)))].sort();
}

function boundedStrings(values: readonly string[], maximumItems: number, maximumText: number, label: string): string[] {
  if (values.length > maximumItems) throw new Error(`${label} item limit exceeded.`);
  return [...new Set(values.map((value) => boundedText(value, maximumText, label)).filter((value) => value.trim()))].sort();
}

function emptyRequirements(projectId: string, language: string): ProposalRequirementsProfile {
  return {
    schemaVersion: PROPOSAL_REQUIREMENTS_SCHEMA_VERSION,
    profileId: `requirements-${projectId}`,
    revision: 1,
    purpose: "custom",
    route: { intent: "undetermined", methodFamily: "undetermined" },
    language,
    citationStyle: "undetermined",
    maximumWords: null,
    authorities: [],
    requirements: [],
    customNotes: "",
    researcherConfirmed: false,
    claim: "requirements-profile-not-compliance-approval-or-submission-certification",
  };
}

export function createEmptyProposalRequirementsProfile(projectId: string, language = "en-US"): ProposalRequirementsProfile {
  token(projectId, "Proposal project ID");
  boundedText(language, 35, "Proposal language", false);
  return emptyRequirements(projectId, language);
}

export function createEmptyProposedStudyContract(): ProposedStudyContract {
  return {
    schemaVersion: PROPOSED_STUDY_CONTRACT_SCHEMA_VERSION,
    intent: "undetermined",
    methodFamily: "undetermined",
    routeSnapshot: null,
    entries: [],
    feasibilityNotes: "",
    accessNotes: "",
    ethicsAndSensitivityNotes: "",
    implementationDeferredToStage3: true,
    claim: "proposal-intent-not-runnable-study-methodological-validation-or-ethical-approval",
  };
}

function validateRequirements(profile: ProposalRequirementsProfile, projectId: string): void {
  if (profile.schemaVersion !== PROPOSAL_REQUIREMENTS_SCHEMA_VERSION) throw new Error("Proposal requirements schema version is unsupported.");
  token(profile.profileId, "Requirements profile ID");
  positiveRevision(profile.revision, "Requirements profile revision");
  if (!PURPOSES.includes(profile.purpose)) throw new Error("Proposal purpose is invalid.");
  if (!INTENTS.includes(profile.route.intent) || !METHODS.includes(profile.route.methodFamily)) throw new Error("Proposal requirements route is invalid.");
  boundedText(profile.language, 35, "Requirements language", false);
  boundedText(profile.citationStyle, 160, "Citation style", false);
  if (profile.maximumWords !== null && (!Number.isSafeInteger(profile.maximumWords) || profile.maximumWords < 1 || profile.maximumWords > 2_000_000)) {
    throw new Error("Proposal maximum word count is invalid.");
  }
  if (profile.authorities.length > 100 || profile.requirements.length > 500) throw new Error("Proposal requirements collection limit exceeded.");
  const authorityIds = new Set<string>();
  for (const authority of profile.authorities) {
    const id = token(authority.authorityId, "Requirement authority ID");
    if (authorityIds.has(id)) throw new Error(`Duplicate requirement authority: ${id}`);
    authorityIds.add(id);
    if (!AUTHORITY_KINDS.includes(authority.kind)) throw new Error("Requirement authority kind is invalid.");
    boundedText(authority.name, 500, "Requirement authority name", false);
    boundedText(authority.version, 160, "Requirement authority version", false);
    boundedText(authority.sourceUrl, 2_000, "Requirement authority source URL", false);
    if (!authority.sourceUrl.startsWith("https://")) throw new Error("Requirement authority source URL must use HTTPS.");
    timestamp(authority.accessedAt, "Requirement authority access time");
  }
  const requirementIds = new Set<string>();
  for (const requirement of profile.requirements) {
    const id = token(requirement.id, "Requirement ID");
    if (requirementIds.has(id)) throw new Error(`Duplicate proposal requirement: ${id}`);
    requirementIds.add(id);
    boundedText(requirement.label, 500, "Requirement label", false);
    boundedText(requirement.description, MAX_PROPOSAL_ITEM_TEXT, "Requirement description");
    if (requirement.authorityId && !authorityIds.has(requirement.authorityId)) throw new Error("Proposal requirement references an unknown authority.");
  }
  boundedText(profile.customNotes, MAX_PROPOSAL_ITEM_TEXT, "Requirement notes");
  if (Object.prototype.hasOwnProperty.call(profile, "setupDecision")) {
    const setupIssues = validateProposalSetupDecision(profile.setupDecision);
    if (setupIssues.length) throw new Error(`Proposal setup decision is invalid: ${setupIssues.join(", ")}`);
  }
  if (profile.profileId !== `requirements-${projectId}` && !profile.profileId.startsWith("requirements-")) {
    throw new Error("Requirements profile is not project scoped.");
  }
}

function validateProposalPayload(payload: ResearchProposalPayload): void {
  const projectId = token(payload.projectId, "Proposal project ID");
  if (payload.schemaVersion !== RESEARCH_PROPOSAL_SCHEMA_VERSION) throw new Error("Research proposal schema version is unsupported.");
  positiveRevision(payload.revision, "Proposal revision");
  boundedText(payload.title, 1_000, "Proposal title");
  boundedText(payload.language, 35, "Proposal language", false);
  timestamp(payload.updatedAt, "Proposal update time");
  if (payload.participantDataIncluded !== false) throw new Error("Research proposals cannot contain participant rows.");
  if (payload.claim !== "researcher-owned-proposal-not-novelty-methodological-ethical-compliance-or-submission-approval") throw new Error("Research proposal boundary claim is invalid.");
  validateRequirements(payload.requirements, projectId);
  if (payload.sections.length > MAX_PROPOSAL_SECTIONS) throw new Error("Proposal section limit exceeded.");
  const sectionIds = new Set<string>();
  for (const section of payload.sections) {
    const id = token(section.id, "Proposal section ID");
    if (sectionIds.has(id)) throw new Error(`Duplicate proposal section: ${id}`);
    sectionIds.add(id);
    boundedText(section.title, 500, "Proposal section title", false);
    token(section.role, "Proposal section role");
    boundedText(section.content, MAX_PROPOSAL_SECTION_TEXT, "Proposal section content");
    uniqueTokens(section.citationKeys, "Citation key");
    uniqueTokens(section.sourceKnowledgeEntryIds, "Knowledge entry ID");
    uniqueTokens(section.sourceAssetIds, "Asset ID");
    uniqueTokens(section.sourceClaimIds ?? [], "Source claim ID");
    uniqueTokens(section.sourceEvidenceAssessmentIds ?? [], "Source evidence assessment ID");
    uniqueTokens(section.sourceContractEntryIds ?? [], "Source contract entry ID");
    uniqueTokens(section.requirementIds ?? [], "Proposal section requirement ID");
    boundedText(section.unresolvedSupportNotes ?? "", MAX_PROPOSAL_ITEM_TEXT, "Proposal section unresolved support notes");
    if (section.researcherReviewed !== undefined && typeof section.researcherReviewed !== "boolean") throw new Error("Proposal section review state is invalid.");
  }
  if (payload.evidenceStrategy.searchVersions.length > 500) throw new Error("Evidence search version limit exceeded.");
  boundedStrings(payload.evidenceStrategy.questionIds, 1_000, 160, "Evidence strategy question ID").forEach((id) => token(id, "Evidence strategy question ID"));
  boundedStrings(payload.evidenceStrategy.concepts, 1_000, 1_000, "Evidence concept");
  boundedStrings(payload.evidenceStrategy.synonyms, 2_000, 1_000, "Evidence synonym");
  boundedStrings(payload.evidenceStrategy.sourceTypes, 500, 500, "Evidence source type");
  boundedText(payload.evidenceStrategy.eligibilityNotes, MAX_PROPOSAL_ITEM_TEXT, "Eligibility notes");
  boundedText(payload.evidenceStrategy.stoppingRationale, MAX_PROPOSAL_ITEM_TEXT, "Stopping rationale");
  const searchIds = new Set<string>();
  for (const search of payload.evidenceStrategy.searchVersions) {
    const id = token(search.id, "Evidence search version ID");
    if (searchIds.has(id)) throw new Error(`Duplicate evidence search version: ${id}`);
    searchIds.add(id);
    positiveRevision(search.version, "Evidence search version");
    boundedText(search.query, MAX_PROPOSAL_ITEM_TEXT, "Evidence search query", false);
    boundedStrings(search.sourceSystems, 100, 500, "Evidence source system");
    if (search.runAt !== null) timestamp(search.runAt, "Evidence search run time");
    if (search.resultCount !== null && (!Number.isSafeInteger(search.resultCount) || search.resultCount < 0)) throw new Error("Evidence search result count is invalid.");
  }
  if (payload.claimEvidenceMap.schemaVersion !== CLAIM_EVIDENCE_MAP_SCHEMA_VERSION || payload.claimEvidenceMap.claim !== "researcher-owned-claim-map-not-novelty-or-truth-certification") throw new Error("Claim-evidence map boundary is invalid.");
  if (payload.claimEvidenceMap.claims.length > MAX_PROPOSAL_COLLECTION_ITEMS) throw new Error("Claim-evidence map item limit exceeded.");
  const claimIds = new Set<string>();
  for (const claim of payload.claimEvidenceMap.claims) {
    const id = token(claim.id, "Proposal claim ID");
    if (claimIds.has(id)) throw new Error(`Duplicate proposal claim: ${id}`);
    claimIds.add(id);
    if (!CLAIM_KINDS.includes(claim.kind) || !CLAIM_STATUSES.includes(claim.status)) throw new Error("Proposal claim kind or status is invalid.");
    boundedText(claim.text, MAX_PROPOSAL_ITEM_TEXT, "Proposal claim text", false);
    uniqueTokens(claim.questionIds, "Claim question ID");
    uniqueTokens(claim.evidenceAssessmentIds, "Evidence assessment ID");
    boundedStrings(claim.caveats, 100, MAX_PROPOSAL_ITEM_TEXT, "Claim caveat");
  }
  if (payload.proposedStudyContract.schemaVersion !== PROPOSED_STUDY_CONTRACT_SCHEMA_VERSION || payload.proposedStudyContract.implementationDeferredToStage3 !== true || payload.proposedStudyContract.claim !== "proposal-intent-not-runnable-study-methodological-validation-or-ethical-approval") throw new Error("Proposed Study Contract boundary is invalid.");
  if (!INTENTS.includes(payload.proposedStudyContract.intent) || !METHODS.includes(payload.proposedStudyContract.methodFamily)) throw new Error("Proposed Study Contract route is invalid.");
  const routeSnapshot = payload.proposedStudyContract.routeSnapshot;
  if (routeSnapshot !== undefined && routeSnapshot !== null) {
    if (!ASSIGNMENTS.includes(routeSnapshot.assignment) || !SETTINGS.includes(routeSnapshot.setting) || !AUDIENCES.includes(routeSnapshot.audience) || !DATA_SENSITIVITIES.includes(routeSnapshot.dataSensitivity)) throw new Error("Proposed Study Contract route snapshot is invalid.");
    if (!Array.isArray(routeSnapshot.possibleSpecialProcedures) || new Set(routeSnapshot.possibleSpecialProcedures).size !== routeSnapshot.possibleSpecialProcedures.length || routeSnapshot.possibleSpecialProcedures.some((procedure) => !SPECIAL_PROCEDURES.includes(procedure))) throw new Error("Proposed Study Contract special-procedure snapshot is invalid.");
  }
  if (payload.proposedStudyContract.entries.length > MAX_PROPOSAL_COLLECTION_ITEMS) throw new Error("Proposed Study Contract item limit exceeded.");
  const contractEntryIds = new Set<string>();
  for (const entry of payload.proposedStudyContract.entries) {
    const id = token(entry.id, "Proposed Study Contract entry ID");
    if (contractEntryIds.has(id)) throw new Error(`Duplicate Proposed Study Contract entry: ${id}`);
    contractEntryIds.add(id);
    token(entry.questionId, "Proposed Study Contract question ID");
    boundedText(entry.purpose, MAX_PROPOSAL_ITEM_TEXT, "Proposed Study Contract purpose");
    boundedText(entry.evidenceNeed, MAX_PROPOSAL_ITEM_TEXT, "Proposed Study Contract evidence need");
    boundedText(entry.populationOrSource, MAX_PROPOSAL_ITEM_TEXT, "Proposed Study Contract population or source");
    boundedText(entry.proposedMethod, MAX_PROPOSAL_ITEM_TEXT, "Proposed Study Contract method");
    boundedText(entry.analysisDirection, MAX_PROPOSAL_ITEM_TEXT, "Proposed Study Contract analysis direction");
    boundedText(entry.uncertainty, MAX_PROPOSAL_ITEM_TEXT, "Proposed Study Contract uncertainty");
  }
  boundedText(payload.proposedStudyContract.feasibilityNotes, MAX_PROPOSAL_ITEM_TEXT, "Proposed Study Contract feasibility notes");
  boundedText(payload.proposedStudyContract.accessNotes, MAX_PROPOSAL_ITEM_TEXT, "Proposed Study Contract access notes");
  boundedText(payload.proposedStudyContract.ethicsAndSensitivityNotes, MAX_PROPOSAL_ITEM_TEXT, "Proposed Study Contract ethics and sensitivity notes");
  boundedStrings(payload.unresolvedQuestions, 1_000, MAX_PROPOSAL_ITEM_TEXT, "Unresolved proposal question");
  if (payload.revisionHistory.some((item, index) => item.revision < 1 || item.revision > payload.revision || (index > 0 && item.revision <= payload.revisionHistory[index - 1].revision) || !Number.isFinite(Date.parse(item.createdAt)))) {
    throw new Error("Proposal revision history is invalid.");
  }
  if (payload.revisionHistory.length > 2_000) throw new Error("Proposal revision history limit exceeded.");
  if (payload.migration.legacyPaperSectionsPreserved !== true || payload.migration.legacyPaperSectionsDualWritten !== true) throw new Error("Proposal compatibility boundary is invalid.");
  if (payload.migration.importedLegacySectionKeys.some((key) => !LEGACY_SECTION_SET.has(key))) throw new Error("Proposal migration contains an unknown legacy section.");
}

export function researchProposalPayload(document: Omit<ResearchProposalDocument, "identity">): ResearchProposalPayload {
  return document;
}

export async function createResearchProposalDocument(input: {
  projectId: string;
  title?: string;
  language?: string;
  sections?: readonly ResearchProposalSection[];
  requirements?: ProposalRequirementsProfile;
  evidenceStrategy?: ProposalEvidenceStrategy;
  claimEvidenceMap?: ClaimEvidenceMap;
  proposedStudyContract?: ProposedStudyContract;
  unresolvedQuestions?: readonly string[];
  previous?: ResearchProposalDocument | null;
  sourceReferences?: readonly ResearchArtifactReference[];
  createdBy?: ResearchProposalRevisionRecord["createdBy"];
  importedLegacySectionKeys?: readonly string[];
  now?: string;
}): Promise<ResearchProposalDocument> {
  const projectId = token(input.projectId, "Proposal project ID");
  const language = input.language ?? input.previous?.language ?? "en-US";
  const now = timestamp(input.now ?? new Date().toISOString(), "Proposal update time");
  const previous = input.previous ?? null;
  const revision = (previous?.revision ?? 0) + 1;
  const previousHistory = previous?.revisionHistory ?? [];
  const importedKeys = [...new Set([
    ...(previous?.migration.importedLegacySectionKeys ?? []),
    ...(input.importedLegacySectionKeys ?? []),
  ])].filter((key) => LEGACY_SECTION_SET.has(key)).sort();
  const payload: ResearchProposalPayload = {
    schemaVersion: RESEARCH_PROPOSAL_SCHEMA_VERSION,
    projectId,
    title: input.title ?? previous?.title ?? "",
    language,
    revision,
    requirements: input.requirements ?? previous?.requirements ?? emptyRequirements(projectId, language),
    evidenceStrategy: input.evidenceStrategy ?? previous?.evidenceStrategy ?? {
      questionIds: [], concepts: [], synonyms: [], sourceTypes: [], eligibilityNotes: "", searchVersions: [], stoppingRationale: "",
    },
    claimEvidenceMap: input.claimEvidenceMap ?? previous?.claimEvidenceMap ?? {
      schemaVersion: CLAIM_EVIDENCE_MAP_SCHEMA_VERSION,
      claims: [],
      claim: "researcher-owned-claim-map-not-novelty-or-truth-certification",
    },
    proposedStudyContract: input.proposedStudyContract ?? previous?.proposedStudyContract ?? createEmptyProposedStudyContract(),
    sections: [...(input.sections ?? previous?.sections ?? [])],
    unresolvedQuestions: boundedStrings(input.unresolvedQuestions ?? previous?.unresolvedQuestions ?? [], 1_000, MAX_PROPOSAL_ITEM_TEXT, "Unresolved proposal question"),
    revisionHistory: [...previousHistory, {
      revision,
      previousChecksum: previous?.identity.checksum ?? null,
      createdAt: now,
      createdBy: input.createdBy ?? "researcher",
    }],
    migration: {
      importedLegacySectionKeys: importedKeys,
      legacyImportedAt: previous?.migration.legacyImportedAt ?? (importedKeys.length ? now : null),
      legacyPaperSectionsPreserved: true,
      legacyPaperSectionsDualWritten: true,
    },
    updatedAt: now,
    participantDataIncluded: false,
    claim: "researcher-owned-proposal-not-novelty-methodological-ethical-compliance-or-submission-approval",
  };
  validateProposalPayload(payload);
  return {
    ...payload,
    identity: await createResearchArtifactIdentity({
      artifactKind: "research-proposal",
      artifactId: `proposal-${projectId}`,
      artifactSchemaVersion: RESEARCH_PROPOSAL_SCHEMA_VERSION,
      payload,
      sources: input.sourceReferences ?? previous?.identity.sourceFingerprint.sources ?? [],
      limits: { maximumBytes: 4 * 1024 * 1024, maximumNodes: 100_000 },
    }),
  };
}

export async function importLegacyProposalSections(input: {
  projectId: string;
  projectTitle?: string;
  rows: readonly LegacyProposalSection[];
  sourceReferences?: readonly ResearchArtifactReference[];
  importedAt: string;
}): Promise<ResearchProposalDocument> {
  const byKey = new Map(input.rows.filter((row) => LEGACY_SECTION_SET.has(row.section_key)).map((row) => [row.section_key, row]));
  const sections = PROPOSAL_SECTIONS.flatMap((key) => {
    const row = byKey.get(key);
    return row ? [{
      id: key,
      title: SECTION_LABELS[key],
      role: key,
      content: row.content,
      citationKeys: [],
      sourceKnowledgeEntryIds: [],
      sourceAssetIds: [],
      sourceClaimIds: [],
      sourceEvidenceAssessmentIds: [],
      sourceContractEntryIds: [],
      requirementIds: [],
      unresolvedSupportNotes: "",
      researcherReviewed: false,
    }] : [];
  });
  return createResearchProposalDocument({
    projectId: input.projectId,
    title: input.projectTitle ?? "",
    sections,
    sourceReferences: input.sourceReferences,
    createdBy: "legacy-import",
    importedLegacySectionKeys: sections.map((section) => section.id),
    now: input.importedAt,
  });
}

export function exportLegacyProposalSections(document: ResearchProposalDocument): Array<{ section_key: string; content: string }> {
  const sections = new Map(document.sections.map((section) => [section.id, section]));
  return PROPOSAL_SECTIONS.flatMap((key) => {
    const section = sections.get(key);
    return section ? [{ section_key: key, content: section.content }] : [];
  });
}

export async function verifyResearchProposalDocument(document: ResearchProposalDocument): Promise<boolean> {
  try {
    const { identity, ...payload } = document;
    validateProposalPayload(payload);
    return identity.artifactKind === "research-proposal"
      && identity.artifactId === `proposal-${document.projectId}`
      && identity.artifactSchemaVersion === RESEARCH_PROPOSAL_SCHEMA_VERSION
      && await verifyResearchArtifactIdentity(identity, payload, { maximumBytes: 4 * 1024 * 1024, maximumNodes: 100_000 });
  } catch {
    return false;
  }
}

export async function normalizeResearchProposalDocument(value: unknown, projectId: string): Promise<ResearchProposalDocument | null> {
  try {
    const candidate = record(value);
    if (!candidate || candidate.projectId !== projectId) return null;
    const identity = normalizeResearchArtifactIdentity(candidate.identity);
    if (!identity) return null;
    const document = { ...candidate, identity } as unknown as ResearchProposalDocument;
    return await verifyResearchProposalDocument(document) ? document : null;
  } catch {
    return null;
  }
}

function validateAssessmentPayload(payload: ProjectEvidenceAssessmentPayload): void {
  token(payload.projectId, "Evidence assessment project ID");
  token(payload.assessmentId, "Evidence assessment ID");
  if (payload.assessmentId.length > 140) throw new Error("Evidence assessment ID exceeds its artifact identity boundary.");
  token(payload.sourceId, "Evidence source ID");
  if (payload.schemaVersion !== PROJECT_EVIDENCE_ASSESSMENT_SCHEMA_VERSION) throw new Error("Evidence assessment schema version is unsupported.");
  positiveRevision(payload.revision, "Evidence assessment revision");
  if (!ASSESSMENT_STATUSES.includes(payload.status)) throw new Error("Evidence assessment status is invalid.");
  boundedText(payload.decisionRationale, MAX_PROPOSAL_ITEM_TEXT, "Evidence decision rationale");
  uniqueTokens(payload.linkedQuestionIds, "Evidence-linked question ID");
  uniqueTokens(payload.linkedClaimIds, "Evidence-linked claim ID");
  boundedText(payload.appraisalFramework, 500, "Evidence appraisal framework");
  if (payload.appraisal.length > 500) throw new Error("Evidence appraisal item limit exceeded.");
  const criteria = new Set<string>();
  for (const item of payload.appraisal) {
    const id = token(item.criterionId, "Evidence appraisal criterion ID");
    if (criteria.has(id)) throw new Error(`Duplicate evidence appraisal criterion: ${id}`);
    criteria.add(id);
    boundedText(item.prompt, 2_000, "Evidence appraisal prompt", false);
    if (!APPRAISAL_ANSWERS.includes(item.answer)) throw new Error("Evidence appraisal answer is invalid.");
    boundedText(item.rationale, MAX_PROPOSAL_ITEM_TEXT, "Evidence appraisal rationale");
  }
  boundedStrings(payload.caveats, 500, MAX_PROPOSAL_ITEM_TEXT, "Evidence caveat");
  boundedText(payload.researcherNotes, MAX_PROPOSAL_ITEM_TEXT, "Evidence researcher notes");
  if (payload.reviewedAt !== null) timestamp(payload.reviewedAt, "Evidence review time");
  if ((payload.status === "included" || payload.status === "excluded") && (!payload.decisionRationale.trim() || payload.reviewedAt === null)) {
    throw new Error("Included and excluded evidence decisions require a rationale and review time.");
  }
  timestamp(payload.updatedAt, "Evidence assessment update time");
  if (payload.participantDataIncluded !== false || payload.claim !== "project-specific-evidence-judgment-not-universal-quality-score-or-truth-certification") throw new Error("Evidence assessment boundary is invalid.");
}

export async function createProjectEvidenceAssessment(input: {
  projectId: string;
  assessmentId: string;
  sourceId: string;
  status?: EvidenceAssessmentStatus;
  decisionRationale?: string;
  linkedQuestionIds?: readonly string[];
  linkedClaimIds?: readonly string[];
  appraisalFramework?: string;
  appraisal?: readonly ProjectEvidenceAppraisalItem[];
  caveats?: readonly string[];
  researcherNotes?: string;
  reviewedAt?: string | null;
  previous?: ProjectEvidenceAssessment | null;
  sourceReference: ResearchArtifactReference;
  now?: string;
}): Promise<ProjectEvidenceAssessment> {
  const previous = input.previous ?? null;
  if (previous && (previous.projectId !== input.projectId || previous.assessmentId !== input.assessmentId || previous.sourceId !== input.sourceId)) {
    throw new Error("Evidence assessment identity and source are immutable across revisions.");
  }
  if (input.sourceReference.artifactKind !== "evidence-library" || input.sourceReference.artifactId !== input.sourceId) {
    throw new Error("Evidence assessment source must be the matching evidence-library artifact.");
  }
  const payload: ProjectEvidenceAssessmentPayload = {
    schemaVersion: PROJECT_EVIDENCE_ASSESSMENT_SCHEMA_VERSION,
    projectId: input.projectId,
    assessmentId: input.assessmentId,
    sourceId: input.sourceId,
    revision: (previous?.revision ?? 0) + 1,
    status: input.status ?? previous?.status ?? "candidate",
    decisionRationale: input.decisionRationale ?? previous?.decisionRationale ?? "",
    linkedQuestionIds: uniqueTokens(input.linkedQuestionIds ?? previous?.linkedQuestionIds ?? [], "Evidence-linked question ID"),
    linkedClaimIds: uniqueTokens(input.linkedClaimIds ?? previous?.linkedClaimIds ?? [], "Evidence-linked claim ID"),
    appraisalFramework: input.appraisalFramework ?? previous?.appraisalFramework ?? "",
    appraisal: [...(input.appraisal ?? previous?.appraisal ?? [])],
    caveats: boundedStrings(input.caveats ?? previous?.caveats ?? [], 500, MAX_PROPOSAL_ITEM_TEXT, "Evidence caveat"),
    researcherNotes: input.researcherNotes ?? previous?.researcherNotes ?? "",
    reviewedAt: input.reviewedAt === undefined ? previous?.reviewedAt ?? null : input.reviewedAt,
    updatedAt: timestamp(input.now ?? new Date().toISOString(), "Evidence assessment update time"),
    participantDataIncluded: false,
    claim: "project-specific-evidence-judgment-not-universal-quality-score-or-truth-certification",
  };
  validateAssessmentPayload(payload);
  return {
    ...payload,
    identity: await createResearchArtifactIdentity({
      artifactKind: "project-evidence-assessment",
      artifactId: `assessment-${payload.assessmentId}`,
      artifactSchemaVersion: PROJECT_EVIDENCE_ASSESSMENT_SCHEMA_VERSION,
      payload,
      sources: [input.sourceReference],
      limits: { maximumBytes: 1024 * 1024 },
    }),
  };
}

export async function verifyProjectEvidenceAssessment(assessment: ProjectEvidenceAssessment): Promise<boolean> {
  try {
    const { identity, ...payload } = assessment;
    validateAssessmentPayload(payload);
    return identity.artifactKind === "project-evidence-assessment"
      && identity.artifactId === `assessment-${assessment.assessmentId}`
      && identity.artifactSchemaVersion === PROJECT_EVIDENCE_ASSESSMENT_SCHEMA_VERSION
      && identity.sourceFingerprint.sources.length === 1
      && identity.sourceFingerprint.sources[0].artifactKind === "evidence-library"
      && identity.sourceFingerprint.sources[0].artifactId === assessment.sourceId
      && await verifyResearchArtifactIdentity(identity, payload, { maximumBytes: 1024 * 1024 });
  } catch {
    return false;
  }
}
