export const CONSENT_PHASE_7_SCHEMA_VERSION = 1 as const;
export const MAX_CONSENT_PHASE_7_ARTIFACTS = 16;

export type ConsentPhase7PackageId =
  | "parental-permission"
  | "assent"
  | "lar-surrogate"
  | "accessible-oral"
  | "translated-variant"
  | "short-form";
export type ConsentPhase7Applicability = "not-configured" | "not-applicable" | "applicable";
export type ConsentPhase7DeterminationSource = "none" | "researcher" | "institution";
export type ConsentPhase7ReviewState = "not-reviewed" | "human-review-required" | "human-reviewed";
export type ConsentPhase7QualifiedReviewState = "not-reviewed" | "qualified-human-review-required" | "qualified-human-reviewed";

export interface ConsentPhase7Decision {
  applicability: ConsentPhase7Applicability;
  determinationSource: ConsentPhase7DeterminationSource;
  authorityReference: string;
  researcherRationale: string;
}

export interface ConsentPhase7AuthorityProfile {
  determinationSource: ConsentPhase7DeterminationSource;
  authorityReference: string;
  jurisdiction: string;
  requiredPackages: ConsentPhase7PackageId[];
  localContacts: string;
  runtimeBoundaryAcknowledged: boolean;
}

export interface ConsentPhase7ParentalPermission extends ConsentPhase7Decision {
  participantGroup: string;
  permissionRule: "not-determined" | "one-parent-by-human-determination" | "two-parent-by-human-determination" | "other-institution-rule" | "waived-by-human-authority";
  permissionRuleReference: string;
  permissionProcess: string;
  childPrivacyPlan: string;
  participantText: string;
}

export interface ConsentPhase7Assent extends ConsentPhase7Decision {
  participantGroup: string;
  developmentalDescription: string;
  capabilityAssessmentPlan: string;
  assentProcess: string;
  dissentHandling: string;
  documentationMethod: string;
  linkedParentPermissionArtifactId: string;
  ageOfMajorityPlan: string;
  ageOfMajorityRuleReference: string;
  participantText: string;
}

export interface ConsentPhase7LarSurrogate extends ConsentPhase7Decision {
  participantGroup: string;
  capacityAssessmentPlan: string;
  authorityBasis: string;
  representativeSelectionProcess: string;
  participantInvolvementPlan: string;
  dissentHandling: string;
  capacityReassessmentPlan: string;
  directConsentTransitionPlan: string;
  participantText: string;
}

export interface ConsentPhase7AccessibleOral extends ConsentPhase7Decision {
  participantGroup: string;
  accommodationNeed: string;
  communicationMethod: string;
  comprehensionCheck: string;
  witnessDetermination: "not-determined" | "required-by-human-determination" | "not-required-by-human-determination";
  witnessPlan: string;
  alternativeIndicationMethod: string;
  copyDeliveryPlan: string;
  participantText: string;
}

export interface ConsentPhase7TranslatedVariant extends ConsentPhase7Decision {
  participantGroup: string;
  sourceArtifactId: string;
  sourceLanguage: string;
  targetLanguage: string;
  translationMethod: "not-determined" | "human-translation" | "professional-service" | "ai-assisted-draft";
  translatorQualifications: string;
  qualifiedReviewerName: string;
  qualifiedReviewerCredentials: string;
  qualifiedReviewState: ConsentPhase7QualifiedReviewState;
  participantText: string;
}

export interface ConsentPhase7ShortForm extends ConsentPhase7Decision {
  participantGroup: string;
  useRationale: string;
  sourceLanguage: string;
  targetLanguage: string;
  summaryArtifactId: string;
  approvalStatus: "not-requested" | "requested" | "approved" | "denied";
  approvalReference: string;
  interpreterPlan: string;
  witnessPlan: string;
  signatureResponsibilityPlan: string;
  copyDeliveryPlan: string;
  participantText: string;
  summaryText: string;
}

export type ConsentPhase7ArtifactKind =
  | "parent-permission"
  | "assent"
  | "lar-or-surrogate-consent"
  | "accessible-oral-script"
  | "translated-variant"
  | "short-form"
  | "short-form-summary";

export interface ConsentPhase7Artifact {
  id: string;
  kind: ConsentPhase7ArtifactKind;
  packageId: ConsentPhase7PackageId;
  title: string;
  audience: string;
  language: string;
  participantText: string;
  authorityReference: string;
  sourceArtifactId: string | null;
  sourceIdentity: string;
  reviewState: ConsentPhase7ReviewState;
  qualifiedReviewState: ConsentPhase7QualifiedReviewState | null;
  runtimeMode: "authoring-export-only";
}

export interface ConsentPhase7State {
  schemaVersion: typeof CONSENT_PHASE_7_SCHEMA_VERSION;
  profile: ConsentPhase7AuthorityProfile;
  parentalPermission: ConsentPhase7ParentalPermission;
  assent: ConsentPhase7Assent;
  larSurrogate: ConsentPhase7LarSurrogate;
  accessibleOral: ConsentPhase7AccessibleOral;
  translatedVariant: ConsentPhase7TranslatedVariant;
  shortForm: ConsentPhase7ShortForm;
  artifacts: ConsentPhase7Artifact[];
}

const EMPTY_DECISION: ConsentPhase7Decision = {
  applicability: "not-configured",
  determinationSource: "none",
  authorityReference: "",
  researcherRationale: "",
};

export function createConsentPhase7State(): ConsentPhase7State {
  return {
    schemaVersion: CONSENT_PHASE_7_SCHEMA_VERSION,
    profile: { determinationSource: "none", authorityReference: "", jurisdiction: "", requiredPackages: [], localContacts: "", runtimeBoundaryAcknowledged: false },
    parentalPermission: { ...EMPTY_DECISION, participantGroup: "", permissionRule: "not-determined", permissionRuleReference: "", permissionProcess: "", childPrivacyPlan: "", participantText: "" },
    assent: { ...EMPTY_DECISION, participantGroup: "", developmentalDescription: "", capabilityAssessmentPlan: "", assentProcess: "", dissentHandling: "", documentationMethod: "", linkedParentPermissionArtifactId: "", ageOfMajorityPlan: "", ageOfMajorityRuleReference: "", participantText: "" },
    larSurrogate: { ...EMPTY_DECISION, participantGroup: "", capacityAssessmentPlan: "", authorityBasis: "", representativeSelectionProcess: "", participantInvolvementPlan: "", dissentHandling: "", capacityReassessmentPlan: "", directConsentTransitionPlan: "", participantText: "" },
    accessibleOral: { ...EMPTY_DECISION, participantGroup: "", accommodationNeed: "", communicationMethod: "", comprehensionCheck: "", witnessDetermination: "not-determined", witnessPlan: "", alternativeIndicationMethod: "", copyDeliveryPlan: "", participantText: "" },
    translatedVariant: { ...EMPTY_DECISION, participantGroup: "", sourceArtifactId: "form-main", sourceLanguage: "en-US", targetLanguage: "", translationMethod: "not-determined", translatorQualifications: "", qualifiedReviewerName: "", qualifiedReviewerCredentials: "", qualifiedReviewState: "not-reviewed", participantText: "" },
    shortForm: { ...EMPTY_DECISION, participantGroup: "", useRationale: "", sourceLanguage: "en-US", targetLanguage: "", summaryArtifactId: "form-main", approvalStatus: "not-requested", approvalReference: "", interpreterPlan: "", witnessPlan: "", signatureResponsibilityPlan: "", copyDeliveryPlan: "", participantText: "", summaryText: "" },
    artifacts: [],
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function string(value: unknown, maximum = 20_000): string | null {
  return typeof value === "string" && value.length <= maximum ? value.replace(/\r\n/g, "\n") : null;
}

function oneOf<T extends string>(value: unknown, values: readonly T[]): T | null {
  return typeof value === "string" && values.includes(value as T) ? value as T : null;
}

const PACKAGE_IDS = ["parental-permission", "assent", "lar-surrogate", "accessible-oral", "translated-variant", "short-form"] as const;
const APPLICABILITY = ["not-configured", "not-applicable", "applicable"] as const;
const DETERMINATION = ["none", "researcher", "institution"] as const;
const REVIEW = ["not-reviewed", "human-review-required", "human-reviewed"] as const;
const QUALIFIED_REVIEW = ["not-reviewed", "qualified-human-review-required", "qualified-human-reviewed"] as const;
const ARTIFACT_KINDS = ["parent-permission", "assent", "lar-or-surrogate-consent", "accessible-oral-script", "translated-variant", "short-form", "short-form-summary"] as const;

function decision(value: Record<string, unknown>): ConsentPhase7Decision | null {
  const applicability = oneOf(value.applicability, APPLICABILITY);
  const determinationSource = oneOf(value.determinationSource, DETERMINATION);
  const authorityReference = string(value.authorityReference, 2_000);
  const researcherRationale = string(value.researcherRationale, 10_000);
  return applicability && determinationSource && authorityReference !== null && researcherRationale !== null
    ? { applicability, determinationSource, authorityReference, researcherRationale }
    : null;
}

function strings(value: Record<string, unknown>, keys: readonly string[]): Record<string, string> | null {
  const result: Record<string, string> = {};
  for (const key of keys) {
    const normalized = string(value[key]);
    if (normalized === null) return null;
    result[key] = normalized;
  }
  return result;
}

function normalizeArtifacts(value: unknown): ConsentPhase7Artifact[] | null {
  if (!Array.isArray(value) || value.length > MAX_CONSENT_PHASE_7_ARTIFACTS) return null;
  const artifacts = value.map((item): ConsentPhase7Artifact | null => {
    if (!record(item)) return null;
    const kind = oneOf(item.kind, ARTIFACT_KINDS);
    const packageId = oneOf(item.packageId, PACKAGE_IDS);
    const reviewState = oneOf(item.reviewState, REVIEW);
    const qualifiedReviewState = item.qualifiedReviewState === null ? null : oneOf(item.qualifiedReviewState, QUALIFIED_REVIEW);
    const values = strings(item, ["id", "title", "audience", "language", "participantText", "authorityReference", "sourceIdentity"]);
    const sourceArtifactId = item.sourceArtifactId === null ? null : string(item.sourceArtifactId, 160);
    if (!kind || !packageId || !reviewState || qualifiedReviewState === null && item.qualifiedReviewState !== null || !values || sourceArtifactId === null && item.sourceArtifactId !== null || item.runtimeMode !== "authoring-export-only") return null;
    return { ...values, id: values.id, kind, packageId, title: values.title, audience: values.audience, language: values.language, participantText: values.participantText, authorityReference: values.authorityReference, sourceArtifactId, sourceIdentity: values.sourceIdentity, reviewState, qualifiedReviewState, runtimeMode: "authoring-export-only" };
  });
  return artifacts.some((item) => item === null) ? null : artifacts as ConsentPhase7Artifact[];
}

export function normalizeConsentPhase7State(value: unknown): ConsentPhase7State | null {
  if (!record(value) || value.schemaVersion !== CONSENT_PHASE_7_SCHEMA_VERSION) return null;
  const profileValue = value.profile;
  if (!record(profileValue)) return null;
  const profileStrings = strings(profileValue, ["authorityReference", "jurisdiction", "localContacts"]);
  const profileSource = oneOf(profileValue.determinationSource, DETERMINATION);
  if (!profileStrings || !profileSource || !Array.isArray(profileValue.requiredPackages) || profileValue.requiredPackages.length > PACKAGE_IDS.length || typeof profileValue.runtimeBoundaryAcknowledged !== "boolean") return null;
  const requiredPackages = profileValue.requiredPackages.map((item) => oneOf(item, PACKAGE_IDS));
  if (requiredPackages.some((item) => item === null) || new Set(requiredPackages).size !== requiredPackages.length) return null;

  const parental = value.parentalPermission;
  const assent = value.assent;
  const lar = value.larSurrogate;
  const oral = value.accessibleOral;
  const translated = value.translatedVariant;
  const shortForm = value.shortForm;
  if (![parental, assent, lar, oral, translated, shortForm].every(record)) return null;
  const pd = decision(parental as Record<string, unknown>), ad = decision(assent as Record<string, unknown>), ld = decision(lar as Record<string, unknown>), od = decision(oral as Record<string, unknown>), td = decision(translated as Record<string, unknown>), sd = decision(shortForm as Record<string, unknown>);
  const ps = strings(parental as Record<string, unknown>, ["participantGroup", "permissionRuleReference", "permissionProcess", "childPrivacyPlan", "participantText"]);
  const as = strings(assent as Record<string, unknown>, ["participantGroup", "developmentalDescription", "capabilityAssessmentPlan", "assentProcess", "dissentHandling", "documentationMethod", "linkedParentPermissionArtifactId", "ageOfMajorityPlan", "ageOfMajorityRuleReference", "participantText"]);
  const ls = strings(lar as Record<string, unknown>, ["participantGroup", "capacityAssessmentPlan", "authorityBasis", "representativeSelectionProcess", "participantInvolvementPlan", "dissentHandling", "capacityReassessmentPlan", "directConsentTransitionPlan", "participantText"]);
  const os = strings(oral as Record<string, unknown>, ["participantGroup", "accommodationNeed", "communicationMethod", "comprehensionCheck", "witnessPlan", "alternativeIndicationMethod", "copyDeliveryPlan", "participantText"]);
  const ts = strings(translated as Record<string, unknown>, ["participantGroup", "sourceArtifactId", "sourceLanguage", "targetLanguage", "translatorQualifications", "qualifiedReviewerName", "qualifiedReviewerCredentials", "participantText"]);
  const ss = strings(shortForm as Record<string, unknown>, ["participantGroup", "useRationale", "sourceLanguage", "targetLanguage", "summaryArtifactId", "approvalReference", "interpreterPlan", "witnessPlan", "signatureResponsibilityPlan", "copyDeliveryPlan", "participantText", "summaryText"]);
  const permissionRule = oneOf((parental as Record<string, unknown>).permissionRule, ["not-determined", "one-parent-by-human-determination", "two-parent-by-human-determination", "other-institution-rule", "waived-by-human-authority"] as const);
  const witnessDetermination = oneOf((oral as Record<string, unknown>).witnessDetermination, ["not-determined", "required-by-human-determination", "not-required-by-human-determination"] as const);
  const translationMethod = oneOf((translated as Record<string, unknown>).translationMethod, ["not-determined", "human-translation", "professional-service", "ai-assisted-draft"] as const);
  const qualifiedReviewState = oneOf((translated as Record<string, unknown>).qualifiedReviewState, QUALIFIED_REVIEW);
  const approvalStatus = oneOf((shortForm as Record<string, unknown>).approvalStatus, ["not-requested", "requested", "approved", "denied"] as const);
  const artifacts = normalizeArtifacts(value.artifacts);
  if (!pd || !ad || !ld || !od || !td || !sd || !ps || !as || !ls || !os || !ts || !ss || !permissionRule || !witnessDetermination || !translationMethod || !qualifiedReviewState || !approvalStatus || !artifacts) return null;
  return {
    schemaVersion: CONSENT_PHASE_7_SCHEMA_VERSION,
    profile: { determinationSource: profileSource, authorityReference: profileStrings.authorityReference, jurisdiction: profileStrings.jurisdiction, requiredPackages: requiredPackages as ConsentPhase7PackageId[], localContacts: profileStrings.localContacts, runtimeBoundaryAcknowledged: profileValue.runtimeBoundaryAcknowledged },
    parentalPermission: { ...pd, ...ps, permissionRule } as ConsentPhase7ParentalPermission,
    assent: { ...ad, ...as } as ConsentPhase7Assent,
    larSurrogate: { ...ld, ...ls } as ConsentPhase7LarSurrogate,
    accessibleOral: { ...od, ...os, witnessDetermination } as ConsentPhase7AccessibleOral,
    translatedVariant: { ...td, ...ts, translationMethod, qualifiedReviewState } as ConsentPhase7TranslatedVariant,
    shortForm: { ...sd, ...ss, approvalStatus } as ConsentPhase7ShortForm,
    artifacts,
  };
}
