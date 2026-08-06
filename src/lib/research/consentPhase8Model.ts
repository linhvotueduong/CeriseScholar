export const CONSENT_PHASE_8_SCHEMA_VERSION = 1 as const;
export const MAX_CONSENT_PHASE_8_ARTIFACTS = 20;
export const MAX_CONSENT_PHASE_8_EXTERNAL_ADDENDA = 8;
export const MAX_CONSENT_PHASE_8_SOURCE_FACTS = 32;

export type ConsentPhase8ModuleId =
  | "regulated-intervention"
  | "procedure-exposure"
  | "results-return"
  | "specimens-genomics"
  | "data-sharing-future-use"
  | "broad-consent"
  | "privacy-addenda"
  | "fda-electronic-process";

export type ConsentPhase8Applicability =
  "not-configured" | "not-applicable" | "applicable";
export type ConsentPhase8DeterminationSource =
  "none" | "researcher" | "institution";
export type ConsentPhase8ScopeStatus =
  | "not-determined"
  | "applicable-by-human-determination"
  | "not-applicable-by-human-determination";
export type ConsentPhase8ReviewState =
  "human-review-required" | "human-reviewed";

export const CONSENT_PHASE_8_FIELD_IDS = {
  "regulated-intervention": [
    "intervention_category",
    "investigational_status",
    "intervention_description",
    "randomization_and_control",
    "placebo_or_sham",
    "foreseeable_risks",
    "alternatives",
    "research_injury",
    "participant_costs",
    "clinical_oversight",
    "participant_text",
  ],
  "procedure-exposure": [
    "procedures",
    "imaging",
    "radiation",
    "sedation",
    "reproductive_risks",
    "pregnancy_testing_and_prevention",
    "risk_monitoring",
    "stopping_and_emergency_plan",
    "participant_text",
  ],
  "results-return": [
    "result_types",
    "return_plan",
    "validation_and_confirmation",
    "clinical_actionability_boundary",
    "participant_choice",
    "incidental_or_secondary_findings",
    "genetic_counseling",
    "recontact_and_identity_plan",
    "participant_text",
  ],
  "specimens-genomics": [
    "specimen_types",
    "collection_procedure",
    "identifiability_and_coding",
    "coding_key_custodian",
    "genetic_testing",
    "whole_genome_or_exome",
    "commercial_profit_use",
    "participant_profit_share",
    "intellectual_property",
    "storage_location",
    "retention_period",
    "withdrawal_limits",
    "results_return_link",
    "participant_text",
  ],
  "data-sharing-future-use": [
    "data_categories",
    "sharing_mode",
    "repositories_and_recipients",
    "data_use_limitations",
    "future_use_scope",
    "identifiability_and_reidentification_risk",
    "withdrawal_limits",
    "downstream_governance",
    "choice_mode",
    "participant_text",
  ],
  "broad-consent": [
    "research_types",
    "data_and_specimens",
    "sharing_parties",
    "storage_duration",
    "research_use_duration",
    "specific_study_details",
    "commercial_profit_disclosure",
    "whole_genome_disclosure",
    "results_disclosure",
    "contacts",
    "refusal_and_nonresponse_tracking",
    "withdrawal_limits",
    "participant_text",
  ],
  "privacy-addenda": [
    "hipaa_authorization_reference",
    "gdpr_notice_reference",
    "controller_or_covered_entity",
    "privacy_contact",
    "legal_basis_authority",
    "international_transfer_safeguards",
    "privacy_office_review_reference",
    "integration_notes",
  ],
  "fda-electronic-process": [
    "external_system",
    "integration_status",
    "validation_package_reference",
    "part_11_assessment_reference",
    "identity_verification",
    "signature_method",
    "electronic_record_controls",
    "audit_trail",
    "copy_delivery",
    "outage_and_paper_fallback",
    "participant_text",
  ],
} as const satisfies Record<ConsentPhase8ModuleId, readonly string[]>;

export type ConsentPhase8FieldId =
  (typeof CONSENT_PHASE_8_FIELD_IDS)[ConsentPhase8ModuleId][number];

export interface ConsentPhase8RegulatoryProfile {
  determinationSource: ConsentPhase8DeterminationSource;
  institutionProfileReference: string;
  jurisdiction: string;
  hhsCommonRuleStatus: ConsentPhase8ScopeStatus;
  fdaRegulatedStatus: ConsentPhase8ScopeStatus;
  hipaaStatus: ConsentPhase8ScopeStatus;
  gdprStatus: ConsentPhase8ScopeStatus;
  nihGenomicDataSharingStatus: ConsentPhase8ScopeStatus;
  requiredModules: ConsentPhase8ModuleId[];
  specialistEscalationContacts: string;
  runtimeBoundaryAcknowledged: boolean;
  noParticipantDataAcknowledged: boolean;
}

export interface ConsentPhase8ModuleState {
  applicability: ConsentPhase8Applicability;
  determinationSource: ConsentPhase8DeterminationSource;
  authorityReference: string;
  researcherRationale: string;
  sourceFactIds: string[];
  protocolProcedureReference: string;
  participantProcedureDescription: string;
  specialistReviewRole: string;
  values: Record<string, string>;
}

export type ConsentPhase8ExternalAddendumKind =
  "hipaa-authorization" | "gdpr-notice" | "institutional-privacy-addendum";

export interface ConsentPhase8ExternalAddendum {
  id: string;
  kind: ConsentPhase8ExternalAddendumKind;
  title: string;
  filename: string;
  mediaType: string;
  byteLength: number;
  checksum: `sha256:${string}`;
  importedAt: string;
  authorityReference: string;
  contentsStored: false;
}

export type ConsentPhase8ArtifactKind =
  | "regulated-intervention-information"
  | "procedure-exposure-information"
  | "results-return-plan"
  | "specimen-genomic-information"
  | "data-sharing-future-use-choice"
  | "broad-consent-form"
  | "privacy-addendum-binding"
  | "fda-electronic-process-specification";

export interface ConsentPhase8SpecialistReview {
  state: ConsentPhase8ReviewState;
  reviewerName: string;
  reviewerRoleOrCredentials: string;
  reviewReference: string;
  sourceIdentity: string | null;
}

export interface ConsentPhase8Artifact {
  id: string;
  kind: ConsentPhase8ArtifactKind;
  moduleId: ConsentPhase8ModuleId;
  title: string;
  decisionMode:
    | "information-only"
    | "separate-optional-choice"
    | "dedicated-broad-consent"
    | "external-addendum"
    | "external-process-specification";
  participantText: string;
  sourceFactIds: string[];
  protocolProcedureReference: string;
  authorityReference: string;
  protectedElements: string[];
  externalAddendumIds: string[];
  sourceIdentity: string;
  reviewState: ConsentPhase8ReviewState;
  specialistReview: ConsentPhase8SpecialistReview;
  runtimeMode: "authoring-export-only";
}

export interface ConsentPhase8State {
  schemaVersion: typeof CONSENT_PHASE_8_SCHEMA_VERSION;
  profile: ConsentPhase8RegulatoryProfile;
  modules: Record<ConsentPhase8ModuleId, ConsentPhase8ModuleState>;
  externalAddenda: ConsentPhase8ExternalAddendum[];
  artifacts: ConsentPhase8Artifact[];
}

const MODULE_IDS = Object.keys(
  CONSENT_PHASE_8_FIELD_IDS,
) as ConsentPhase8ModuleId[];
const APPLICABILITY = [
  "not-configured",
  "not-applicable",
  "applicable",
] as const;
const DETERMINATION = ["none", "researcher", "institution"] as const;
const SCOPE = [
  "not-determined",
  "applicable-by-human-determination",
  "not-applicable-by-human-determination",
] as const;
const REVIEW = ["human-review-required", "human-reviewed"] as const;
const ADDENDUM_KINDS = [
  "hipaa-authorization",
  "gdpr-notice",
  "institutional-privacy-addendum",
] as const;
const ARTIFACT_KINDS = [
  "regulated-intervention-information",
  "procedure-exposure-information",
  "results-return-plan",
  "specimen-genomic-information",
  "data-sharing-future-use-choice",
  "broad-consent-form",
  "privacy-addendum-binding",
  "fda-electronic-process-specification",
] as const;
const DECISION_MODES = [
  "information-only",
  "separate-optional-choice",
  "dedicated-broad-consent",
  "external-addendum",
  "external-process-specification",
] as const;

function createModule(
  moduleId: ConsentPhase8ModuleId,
): ConsentPhase8ModuleState {
  return {
    applicability: "not-configured",
    determinationSource: "none",
    authorityReference: "",
    researcherRationale: "",
    sourceFactIds: [],
    protocolProcedureReference: "",
    participantProcedureDescription: "",
    specialistReviewRole: "",
    values: Object.fromEntries(
      CONSENT_PHASE_8_FIELD_IDS[moduleId].map((fieldId) => [fieldId, ""]),
    ),
  };
}

export function createConsentPhase8State(): ConsentPhase8State {
  return {
    schemaVersion: CONSENT_PHASE_8_SCHEMA_VERSION,
    profile: {
      determinationSource: "none",
      institutionProfileReference: "",
      jurisdiction: "",
      hhsCommonRuleStatus: "not-determined",
      fdaRegulatedStatus: "not-determined",
      hipaaStatus: "not-determined",
      gdprStatus: "not-determined",
      nihGenomicDataSharingStatus: "not-determined",
      requiredModules: [],
      specialistEscalationContacts: "",
      runtimeBoundaryAcknowledged: false,
      noParticipantDataAcknowledged: false,
    },
    modules: Object.fromEntries(
      MODULE_IDS.map((moduleId) => [moduleId, createModule(moduleId)]),
    ) as Record<ConsentPhase8ModuleId, ConsentPhase8ModuleState>,
    externalAddenda: [],
    artifacts: [],
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, maximum = 20_000): string | null {
  return typeof value === "string" && value.length <= maximum
    ? value.replace(/\r\n/g, "\n")
    : null;
}

function token(value: unknown): string | null {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 160 &&
    /^[a-z0-9][a-z0-9._:-]*$/.test(value)
    ? value
    : null;
}

function oneOf<T extends string>(
  value: unknown,
  values: readonly T[],
): T | null {
  return typeof value === "string" && values.includes(value as T)
    ? (value as T)
    : null;
}

function tokens(value: unknown, maximum: number): string[] | null {
  if (!Array.isArray(value) || value.length > maximum) return null;
  const normalized = value.map(token);
  return normalized.some((item) => item === null) ||
    new Set(normalized).size !== normalized.length
    ? null
    : (normalized as string[]);
}

function normalizeModule(
  value: unknown,
  moduleId: ConsentPhase8ModuleId,
): ConsentPhase8ModuleState | null {
  if (!record(value) || !record(value.values)) return null;
  const applicability = oneOf(value.applicability, APPLICABILITY);
  const determinationSource = oneOf(value.determinationSource, DETERMINATION);
  const authorityReference = text(value.authorityReference, 2_000);
  const researcherRationale = text(value.researcherRationale, 10_000);
  const sourceFactIds = tokens(
    value.sourceFactIds,
    MAX_CONSENT_PHASE_8_SOURCE_FACTS,
  );
  const protocolProcedureReference = text(
    value.protocolProcedureReference,
    4_000,
  );
  const participantProcedureDescription = text(
    value.participantProcedureDescription,
    10_000,
  );
  const specialistReviewRole = text(value.specialistReviewRole, 2_000);
  if (
    !applicability ||
    !determinationSource ||
    authorityReference === null ||
    researcherRationale === null ||
    !sourceFactIds ||
    protocolProcedureReference === null ||
    participantProcedureDescription === null ||
    specialistReviewRole === null
  )
    return null;
  const values: Record<string, string> = {};
  for (const fieldId of CONSENT_PHASE_8_FIELD_IDS[moduleId]) {
    const normalized = text(value.values[fieldId]);
    if (normalized === null) return null;
    values[fieldId] = normalized;
  }
  return {
    applicability,
    determinationSource,
    authorityReference,
    researcherRationale,
    sourceFactIds,
    protocolProcedureReference,
    participantProcedureDescription,
    specialistReviewRole,
    values,
  };
}

function normalizeAddenda(
  value: unknown,
): ConsentPhase8ExternalAddendum[] | null {
  if (
    !Array.isArray(value) ||
    value.length > MAX_CONSENT_PHASE_8_EXTERNAL_ADDENDA
  )
    return null;
  const addenda = value.map((item): ConsentPhase8ExternalAddendum | null => {
    if (!record(item)) return null;
    const id = token(item.id);
    const kind = oneOf(item.kind, ADDENDUM_KINDS);
    const title = text(item.title, 500);
    const filename = text(item.filename, 255);
    const mediaType = text(item.mediaType, 160);
    const authorityReference = text(item.authorityReference, 2_000);
    const checksum =
      typeof item.checksum === "string" &&
      /^sha256:[a-f0-9]{64}$/.test(item.checksum)
        ? (item.checksum as `sha256:${string}`)
        : null;
    const importedAt =
      typeof item.importedAt === "string" &&
      Number.isFinite(Date.parse(item.importedAt))
        ? item.importedAt
        : null;
    return id &&
      kind &&
      title !== null &&
      filename !== null &&
      mediaType !== null &&
      authorityReference !== null &&
      checksum &&
      importedAt &&
      Number.isSafeInteger(item.byteLength) &&
      (item.byteLength as number) >= 0 &&
      item.contentsStored === false
      ? {
          id,
          kind,
          title,
          filename,
          mediaType,
          byteLength: item.byteLength as number,
          checksum,
          importedAt,
          authorityReference,
          contentsStored: false,
        }
      : null;
  });
  return addenda.some((item) => item === null) ||
    new Set(addenda.map((item) => item?.id)).size !== addenda.length
    ? null
    : (addenda as ConsentPhase8ExternalAddendum[]);
}

function normalizeArtifacts(value: unknown): ConsentPhase8Artifact[] | null {
  if (!Array.isArray(value) || value.length > MAX_CONSENT_PHASE_8_ARTIFACTS)
    return null;
  const artifacts = value.map((item): ConsentPhase8Artifact | null => {
    if (!record(item) || !record(item.specialistReview)) return null;
    const id = token(item.id);
    const kind = oneOf(item.kind, ARTIFACT_KINDS);
    const moduleId = oneOf(item.moduleId, MODULE_IDS);
    const title = text(item.title, 500);
    const decisionMode = oneOf(item.decisionMode, DECISION_MODES);
    const participantText = text(item.participantText);
    const sourceFactIds = tokens(
      item.sourceFactIds,
      MAX_CONSENT_PHASE_8_SOURCE_FACTS,
    );
    const protocolProcedureReference = text(
      item.protocolProcedureReference,
      4_000,
    );
    const authorityReference = text(item.authorityReference, 2_000);
    const protectedElements = tokens(item.protectedElements, 32);
    const externalAddendumIds = tokens(
      item.externalAddendumIds,
      MAX_CONSENT_PHASE_8_EXTERNAL_ADDENDA,
    );
    const sourceIdentity = text(item.sourceIdentity, 200);
    const reviewState = oneOf(item.reviewState, REVIEW);
    const specialistState = oneOf(item.specialistReview.state, REVIEW);
    const reviewerName = text(item.specialistReview.reviewerName, 500);
    const reviewerRoleOrCredentials = text(
      item.specialistReview.reviewerRoleOrCredentials,
      1_000,
    );
    const reviewReference = text(item.specialistReview.reviewReference, 2_000);
    const specialistSourceIdentity =
      item.specialistReview.sourceIdentity === null
        ? null
        : text(item.specialistReview.sourceIdentity, 200);
    if (
      !id ||
      !kind ||
      !moduleId ||
      title === null ||
      !decisionMode ||
      participantText === null ||
      !sourceFactIds ||
      protocolProcedureReference === null ||
      authorityReference === null ||
      !protectedElements ||
      !externalAddendumIds ||
      sourceIdentity === null ||
      !reviewState ||
      !specialistState ||
      reviewerName === null ||
      reviewerRoleOrCredentials === null ||
      reviewReference === null ||
      (specialistSourceIdentity === null &&
        item.specialistReview.sourceIdentity !== null) ||
      item.runtimeMode !== "authoring-export-only"
    )
      return null;
    return {
      id,
      kind,
      moduleId,
      title,
      decisionMode,
      participantText,
      sourceFactIds,
      protocolProcedureReference,
      authorityReference,
      protectedElements,
      externalAddendumIds,
      sourceIdentity,
      reviewState,
      specialistReview: {
        state: specialistState,
        reviewerName,
        reviewerRoleOrCredentials,
        reviewReference,
        sourceIdentity: specialistSourceIdentity,
      },
      runtimeMode: "authoring-export-only",
    };
  });
  return artifacts.some((item) => item === null) ||
    new Set(artifacts.map((item) => item?.id)).size !== artifacts.length
    ? null
    : (artifacts as ConsentPhase8Artifact[]);
}

export function normalizeConsentPhase8State(
  value: unknown,
): ConsentPhase8State | null {
  if (
    !record(value) ||
    value.schemaVersion !== CONSENT_PHASE_8_SCHEMA_VERSION ||
    !record(value.profile) ||
    !record(value.modules)
  )
    return null;
  const determinationSource = oneOf(
    value.profile.determinationSource,
    DETERMINATION,
  );
  const institutionProfileReference = text(
    value.profile.institutionProfileReference,
    2_000,
  );
  const jurisdiction = text(value.profile.jurisdiction, 2_000);
  const hhsCommonRuleStatus = oneOf(value.profile.hhsCommonRuleStatus, SCOPE);
  const fdaRegulatedStatus = oneOf(value.profile.fdaRegulatedStatus, SCOPE);
  const hipaaStatus = oneOf(value.profile.hipaaStatus, SCOPE);
  const gdprStatus = oneOf(value.profile.gdprStatus, SCOPE);
  const nihGenomicDataSharingStatus = oneOf(
    value.profile.nihGenomicDataSharingStatus,
    SCOPE,
  );
  const requiredModules =
    Array.isArray(value.profile.requiredModules) &&
    value.profile.requiredModules.length <= MODULE_IDS.length
      ? value.profile.requiredModules.map((item) => oneOf(item, MODULE_IDS))
      : null;
  const specialistEscalationContacts = text(
    value.profile.specialistEscalationContacts,
    4_000,
  );
  if (
    !determinationSource ||
    institutionProfileReference === null ||
    jurisdiction === null ||
    !hhsCommonRuleStatus ||
    !fdaRegulatedStatus ||
    !hipaaStatus ||
    !gdprStatus ||
    !nihGenomicDataSharingStatus ||
    !requiredModules ||
    requiredModules.some((item) => item === null) ||
    new Set(requiredModules).size !== requiredModules.length ||
    specialistEscalationContacts === null ||
    typeof value.profile.runtimeBoundaryAcknowledged !== "boolean" ||
    typeof value.profile.noParticipantDataAcknowledged !== "boolean"
  )
    return null;
  const modules = {} as Record<ConsentPhase8ModuleId, ConsentPhase8ModuleState>;
  for (const moduleId of MODULE_IDS) {
    const normalized = normalizeModule(value.modules[moduleId], moduleId);
    if (!normalized) return null;
    modules[moduleId] = normalized;
  }
  const externalAddenda = normalizeAddenda(value.externalAddenda);
  const artifacts = normalizeArtifacts(value.artifacts);
  if (!externalAddenda || !artifacts) return null;
  return {
    schemaVersion: CONSENT_PHASE_8_SCHEMA_VERSION,
    profile: {
      determinationSource,
      institutionProfileReference,
      jurisdiction,
      hhsCommonRuleStatus,
      fdaRegulatedStatus,
      hipaaStatus,
      gdprStatus,
      nihGenomicDataSharingStatus,
      requiredModules: requiredModules as ConsentPhase8ModuleId[],
      specialistEscalationContacts,
      runtimeBoundaryAcknowledged: value.profile.runtimeBoundaryAcknowledged,
      noParticipantDataAcknowledged:
        value.profile.noParticipantDataAcknowledged,
    },
    modules,
    externalAddenda,
    artifacts,
  };
}
