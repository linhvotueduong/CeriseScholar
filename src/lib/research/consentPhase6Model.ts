export const CONSENT_PHASE_6_SCHEMA_VERSION = 1 as const;
export const MAX_CONSENT_PHASE_6_ARTIFACTS = 32;
export const MAX_CONSENT_PHASE_6_TRIGGERS = 24;
export const MAX_CONSENT_PHASE_6_OPTIONAL_CHOICES = 24;

export type ConsentPhase6Applicability = "not-configured" | "not-applicable" | "applicable";
export type ConsentPhase6DeterminationSource = "none" | "researcher" | "institution";
export type ConsentPhase6ReviewState = "not-reviewed" | "human-review-required" | "human-reviewed";
export type ConsentPhase6ApprovalStatus = "not-requested" | "requested" | "approved" | "denied";
export type ConsentPhase6ModuleId =
  | "behavioral"
  | "focus-group"
  | "disclosure-debrief"
  | "recording-boundaries"
  | "telephone"
  | "lifecycle"
  | "optional-choices";

export interface ConsentPhase6ModuleDecision {
  applicability: ConsentPhase6Applicability;
  determinationSource: ConsentPhase6DeterminationSource;
  authorityReference: string;
  researcherRationale: string;
}

export interface ConsentPhase6BehavioralModule extends ConsentPhase6ModuleDecision {
  assignmentDisclosure: string;
  taskRisks: string;
  stoppingRules: string;
}

export interface ConsentPhase6FocusGroupModule extends ConsentPhase6ModuleDecision {
  researcherSafeguards: string;
  participantReminder: string;
  confidentialityLimitAcknowledged: boolean;
}

export interface ConsentPhase6DebriefPlan {
  determination: "not-determined" | "required" | "not-required-by-human-authority";
  determinationReference: string;
  timing: "not-determined" | "immediate" | "delayed" | "manual-human-delivery";
  deliveryMethod: string;
  participantText: string;
  dataUseChoice: "not-determined" | "offer-after-debrief" | "not-offered-by-human-determination";
  exceptionRationale: string;
  reviewState: ConsentPhase6ReviewState;
}

export interface ConsentPhase6DisclosureModule extends ConsentPhase6ModuleDecision {
  mode: "full-disclosure" | "incomplete-disclosure-proposed" | "deception-proposed";
  consentProcess: "consent-required" | "waiver-of-consent-proposed";
  consentWaiverStatus: ConsentPhase6ApprovalStatus;
  consentWaiverReference: string;
  scientificNecessity: string;
  alternativesConsidered: string;
  withheldInformation: string;
  undisclosedRiskDeclaration: "not-determined" | "no-undisclosed-risk" | "risk-present";
  willingnessImpactDeclaration: "not-determined" | "does-not-affect-willingness" | "may-affect-willingness";
  waiverOrAlterationStatus: ConsentPhase6ApprovalStatus;
  approvalReference: string;
  debrief: ConsentPhase6DebriefPlan;
}

export interface ConsentPhase6RecordingModule extends ConsentPhase6ModuleDecision {
  researchUse: string;
  accessPlan: string;
  retentionOrDestruction: string;
  nonResearchUse: "none" | "teaching" | "presentation" | "public-use";
  separateReleaseRequired: boolean;
  separateReleaseReference: string;
  mayDeclineAndContinueMainStudy: "not-determined" | "yes" | "no-by-human-determination";
}

export interface ConsentPhase6TelephoneModule extends ConsentPhase6ModuleDecision {
  pathways: Array<"eligibility-screening" | "main-study">;
  screeningPurpose: string;
  screeningDataRetention: string;
  screeningDataDeletion: string;
  screeningScript: string;
  mainStudyScript: string;
  agreementBeforeSubstantiveQuestions: boolean;
  questionOpportunity: string;
  copyDeliveryPlan: string;
  discussionDocumentationPlan: string;
}

export interface ConsentPhase6ChangeTrigger {
  id: string;
  category: "new-risk" | "procedure-change" | "privacy-change" | "new-finding" | "participant-request" | "other";
  description: string;
  affectedParticipants: string;
  urgency: "routine" | "prompt" | "before-next-procedure";
  humanDisposition: "not-determined" | "notification" | "changed-information-addendum" | "full-reconsent" | "no-renewed-consent-required";
  authorityReference: string;
}

export interface ConsentPhase6LifecycleModule extends ConsentPhase6ModuleDecision {
  recontactPlan: string;
  recontactMethod: string;
  ongoingWillingnessCheck: string;
  changedInformationText: string;
  triggers: ConsentPhase6ChangeTrigger[];
}

export interface ConsentPhase6OptionalChoice {
  id: string;
  title: string;
  purpose: string;
  participantText: string;
  dataUse: string;
  retentionOrDestruction: string;
  declineOutcome: "continue-main-study" | "stop-main-study-by-human-determination";
  authorityReference: string;
  reviewState: ConsentPhase6ReviewState;
}

export interface ConsentPhase6OptionalChoicesModule extends ConsentPhase6ModuleDecision {
  choices: ConsentPhase6OptionalChoice[];
}

export type ConsentPhase6ArtifactKind =
  | "behavioral-disclosure"
  | "focus-group-information"
  | "debrief"
  | "telephone-screening-script"
  | "telephone-main-study-script"
  | "changed-information-addendum"
  | "reconsent"
  | "optional-choice";

export interface ConsentPhase6Artifact {
  id: string;
  kind: ConsentPhase6ArtifactKind;
  title: string;
  decisionMode: "information-only" | "main-participation" | "separate-optional-choice";
  participantText: string;
  sourceModuleId: ConsentPhase6ModuleId;
  reviewState: ConsentPhase6ReviewState;
  authorityReference: string;
}

export interface ConsentPhase6State {
  schemaVersion: typeof CONSENT_PHASE_6_SCHEMA_VERSION;
  behavioral: ConsentPhase6BehavioralModule;
  focusGroup: ConsentPhase6FocusGroupModule;
  disclosure: ConsentPhase6DisclosureModule;
  recording: ConsentPhase6RecordingModule;
  telephone: ConsentPhase6TelephoneModule;
  lifecycle: ConsentPhase6LifecycleModule;
  optionalChoices: ConsentPhase6OptionalChoicesModule;
  artifacts: ConsentPhase6Artifact[];
}

const EMPTY_DECISION: ConsentPhase6ModuleDecision = {
  applicability: "not-configured",
  determinationSource: "none",
  authorityReference: "",
  researcherRationale: "",
};

export function createConsentPhase6State(): ConsentPhase6State {
  return {
    schemaVersion: CONSENT_PHASE_6_SCHEMA_VERSION,
    behavioral: { ...EMPTY_DECISION, assignmentDisclosure: "", taskRisks: "", stoppingRules: "" },
    focusGroup: {
      ...EMPTY_DECISION,
      researcherSafeguards: "",
      participantReminder: "Please respect the privacy of everyone in the group and do not share what others say outside the session.",
      confidentialityLimitAcknowledged: false,
    },
    disclosure: {
      ...EMPTY_DECISION,
      mode: "full-disclosure",
      consentProcess: "consent-required",
      consentWaiverStatus: "not-requested",
      consentWaiverReference: "",
      scientificNecessity: "",
      alternativesConsidered: "",
      withheldInformation: "",
      undisclosedRiskDeclaration: "not-determined",
      willingnessImpactDeclaration: "not-determined",
      waiverOrAlterationStatus: "not-requested",
      approvalReference: "",
      debrief: {
        determination: "not-determined",
        determinationReference: "",
        timing: "not-determined",
        deliveryMethod: "",
        participantText: "",
        dataUseChoice: "not-determined",
        exceptionRationale: "",
        reviewState: "not-reviewed",
      },
    } as ConsentPhase6DisclosureModule,
    recording: {
      ...EMPTY_DECISION,
      researchUse: "",
      accessPlan: "",
      retentionOrDestruction: "",
      nonResearchUse: "none",
      separateReleaseRequired: false,
      separateReleaseReference: "",
      mayDeclineAndContinueMainStudy: "not-determined",
    },
    telephone: {
      ...EMPTY_DECISION,
      pathways: [],
      screeningPurpose: "",
      screeningDataRetention: "",
      screeningDataDeletion: "",
      screeningScript: "",
      mainStudyScript: "",
      agreementBeforeSubstantiveQuestions: false,
      questionOpportunity: "",
      copyDeliveryPlan: "",
      discussionDocumentationPlan: "",
    },
    lifecycle: {
      ...EMPTY_DECISION,
      recontactPlan: "",
      recontactMethod: "",
      ongoingWillingnessCheck: "",
      changedInformationText: "",
      triggers: [],
    },
    optionalChoices: { ...EMPTY_DECISION, choices: [] },
    artifacts: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : null;
}

function text(value: unknown, maximum = 20_000): string | null {
  return typeof value === "string" && value.length <= maximum
    ? value.replace(/\r\n/g, "\n")
    : null;
}

function token(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= 160 && /^[a-z0-9][a-z0-9._:-]*$/.test(value)
    ? value
    : null;
}

const APPLICABILITY = ["not-configured", "not-applicable", "applicable"] as const;
const DETERMINATION_SOURCES = ["none", "researcher", "institution"] as const;
const REVIEW_STATES = ["not-reviewed", "human-review-required", "human-reviewed"] as const;
const APPROVAL_STATUSES = ["not-requested", "requested", "approved", "denied"] as const;
const MODULE_IDS = ["behavioral", "focus-group", "disclosure-debrief", "recording-boundaries", "telephone", "lifecycle", "optional-choices"] as const;
const ARTIFACT_KINDS = ["behavioral-disclosure", "focus-group-information", "debrief", "telephone-screening-script", "telephone-main-study-script", "changed-information-addendum", "reconsent", "optional-choice"] as const;

function normalizeDecision(value: unknown): ConsentPhase6ModuleDecision | null {
  if (!isRecord(value)) return null;
  const applicability = enumValue(value.applicability, APPLICABILITY);
  const determinationSource = enumValue(value.determinationSource, DETERMINATION_SOURCES);
  const authorityReference = text(value.authorityReference, 2_000);
  const researcherRationale = text(value.researcherRationale, 10_000);
  return applicability && determinationSource && authorityReference !== null && researcherRationale !== null
    ? { applicability, determinationSource, authorityReference, researcherRationale }
    : null;
}

function strings<T extends string>(value: unknown, allowed: readonly T[], maximum: number): T[] | null {
  if (!Array.isArray(value) || value.length > maximum) return null;
  const result = value.map((item) => enumValue(item, allowed));
  return result.some((item) => item === null) || new Set(result).size !== result.length ? null : result as T[];
}

function normalizeArtifacts(value: unknown): ConsentPhase6Artifact[] | null {
  if (!Array.isArray(value) || value.length > MAX_CONSENT_PHASE_6_ARTIFACTS) return null;
  const artifacts = value.map((item) => {
    if (!isRecord(item)) return null;
    const id = token(item.id);
    const kind = enumValue(item.kind, ARTIFACT_KINDS);
    const title = text(item.title, 500);
    const decisionMode = enumValue(item.decisionMode, ["information-only", "main-participation", "separate-optional-choice"] as const);
    const participantText = text(item.participantText);
    const sourceModuleId = enumValue(item.sourceModuleId, MODULE_IDS);
    const reviewState = enumValue(item.reviewState, REVIEW_STATES);
    const authorityReference = text(item.authorityReference, 2_000);
    return id && kind && title && decisionMode && participantText !== null && sourceModuleId && reviewState && authorityReference !== null
      ? { id, kind, title, decisionMode, participantText, sourceModuleId, reviewState, authorityReference }
      : null;
  });
  if (artifacts.some((item) => item === null)) return null;
  const normalized = artifacts as ConsentPhase6Artifact[];
  return new Set(normalized.map((item) => item.id)).size === normalized.length ? normalized : null;
}

export function normalizeConsentPhase6State(value: unknown): ConsentPhase6State | null {
  if (!isRecord(value) || value.schemaVersion !== CONSENT_PHASE_6_SCHEMA_VERSION) return null;
  const behavioralDecision = normalizeDecision(value.behavioral);
  const focusDecision = normalizeDecision(value.focusGroup);
  const disclosureDecision = normalizeDecision(value.disclosure);
  const recordingDecision = normalizeDecision(value.recording);
  const telephoneDecision = normalizeDecision(value.telephone);
  const lifecycleDecision = normalizeDecision(value.lifecycle);
  const optionalDecision = normalizeDecision(value.optionalChoices);
  if (!behavioralDecision || !focusDecision || !disclosureDecision || !recordingDecision || !telephoneDecision || !lifecycleDecision || !optionalDecision) return null;
  if (!isRecord(value.behavioral) || !isRecord(value.focusGroup) || !isRecord(value.disclosure) || !isRecord(value.recording) || !isRecord(value.telephone) || !isRecord(value.lifecycle) || !isRecord(value.optionalChoices)) return null;
  const behavioralRecord = value.behavioral;
  const focusRecord = value.focusGroup;
  const disclosureRecord = value.disclosure;
  const recordingRecord = value.recording;
  const telephoneRecord = value.telephone;
  const lifecycleRecord = value.lifecycle;
  const optionalRecord = value.optionalChoices;

  const requiredText = (record: Record<string, unknown>, keys: string[]) => {
    const result: Record<string, string> = {};
    for (const key of keys) {
      const normalized = text(record[key]);
      if (normalized === null) return null;
      result[key] = normalized;
    }
    return result;
  };
  const behavioralText = requiredText(behavioralRecord, ["assignmentDisclosure", "taskRisks", "stoppingRules"]);
  const focusText = requiredText(focusRecord, ["researcherSafeguards", "participantReminder"]);
  const disclosureText = requiredText(disclosureRecord, ["consentWaiverReference", "scientificNecessity", "alternativesConsidered", "withheldInformation"]);
  const recordingText = requiredText(recordingRecord, ["researchUse", "accessPlan", "retentionOrDestruction", "separateReleaseReference"]);
  const telephoneText = requiredText(telephoneRecord, ["screeningPurpose", "screeningDataRetention", "screeningDataDeletion", "screeningScript", "mainStudyScript", "questionOpportunity", "copyDeliveryPlan", "discussionDocumentationPlan"]);
  const lifecycleText = requiredText(lifecycleRecord, ["recontactPlan", "recontactMethod", "ongoingWillingnessCheck", "changedInformationText"]);
  if (!behavioralText || !focusText || !disclosureText || !recordingText || !telephoneText || !lifecycleText) return null;

  if (typeof focusRecord.confidentialityLimitAcknowledged !== "boolean" || !isRecord(disclosureRecord.debrief)) return null;
  const debriefRecord = disclosureRecord.debrief;
  const disclosureMode = enumValue(disclosureRecord.mode, ["full-disclosure", "incomplete-disclosure-proposed", "deception-proposed"] as const);
  const consentProcess = enumValue(disclosureRecord.consentProcess, ["consent-required", "waiver-of-consent-proposed"] as const);
  const consentWaiverStatus = enumValue(disclosureRecord.consentWaiverStatus, APPROVAL_STATUSES);
  const undisclosedRiskDeclaration = enumValue(disclosureRecord.undisclosedRiskDeclaration, ["not-determined", "no-undisclosed-risk", "risk-present"] as const);
  const willingnessImpactDeclaration = enumValue(disclosureRecord.willingnessImpactDeclaration, ["not-determined", "does-not-affect-willingness", "may-affect-willingness"] as const);
  const waiverOrAlterationStatus = enumValue(disclosureRecord.waiverOrAlterationStatus, APPROVAL_STATUSES);
  const approvalReference = text(disclosureRecord.approvalReference, 2_000);
  const debriefText = requiredText(debriefRecord, ["determinationReference", "deliveryMethod", "participantText", "exceptionRationale"]);
  const debriefDetermination = enumValue(debriefRecord.determination, ["not-determined", "required", "not-required-by-human-authority"] as const);
  const debriefTiming = enumValue(debriefRecord.timing, ["not-determined", "immediate", "delayed", "manual-human-delivery"] as const);
  const dataUseChoice = enumValue(debriefRecord.dataUseChoice, ["not-determined", "offer-after-debrief", "not-offered-by-human-determination"] as const);
  const debriefReviewState = enumValue(debriefRecord.reviewState, REVIEW_STATES);
  if (!disclosureMode || !consentProcess || !consentWaiverStatus || !undisclosedRiskDeclaration || !willingnessImpactDeclaration || !waiverOrAlterationStatus || approvalReference === null || !debriefText || !debriefDetermination || !debriefTiming || !dataUseChoice || !debriefReviewState) return null;

  const nonResearchUse = enumValue(recordingRecord.nonResearchUse, ["none", "teaching", "presentation", "public-use"] as const);
  const mayDeclineAndContinueMainStudy = enumValue(recordingRecord.mayDeclineAndContinueMainStudy, ["not-determined", "yes", "no-by-human-determination"] as const);
  if (!nonResearchUse || typeof recordingRecord.separateReleaseRequired !== "boolean" || !mayDeclineAndContinueMainStudy) return null;
  const telephonePathways = strings(telephoneRecord.pathways, ["eligibility-screening", "main-study"] as const, 2);
  if (!telephonePathways || typeof telephoneRecord.agreementBeforeSubstantiveQuestions !== "boolean") return null;

  if (!Array.isArray(lifecycleRecord.triggers) || lifecycleRecord.triggers.length > MAX_CONSENT_PHASE_6_TRIGGERS) return null;
  const triggers = lifecycleRecord.triggers.map((item: unknown) => {
    if (!isRecord(item)) return null;
    const id = token(item.id);
    const category = enumValue(item.category, ["new-risk", "procedure-change", "privacy-change", "new-finding", "participant-request", "other"] as const);
    const description = text(item.description, 10_000);
    const affectedParticipants = text(item.affectedParticipants, 5_000);
    const urgency = enumValue(item.urgency, ["routine", "prompt", "before-next-procedure"] as const);
    const humanDisposition = enumValue(item.humanDisposition, ["not-determined", "notification", "changed-information-addendum", "full-reconsent", "no-renewed-consent-required"] as const);
    const authorityReference = text(item.authorityReference, 2_000);
    return id && category && description !== null && affectedParticipants !== null && urgency && humanDisposition && authorityReference !== null
      ? { id, category, description, affectedParticipants, urgency, humanDisposition, authorityReference }
      : null;
  });
  if (triggers.some((item) => item === null) || new Set(triggers.map((item) => item?.id)).size !== triggers.length) return null;

  if (!Array.isArray(optionalRecord.choices) || optionalRecord.choices.length > MAX_CONSENT_PHASE_6_OPTIONAL_CHOICES) return null;
  const choices = optionalRecord.choices.map((item: unknown) => {
    if (!isRecord(item)) return null;
    const id = token(item.id);
    const choiceText = requiredText(item, ["title", "purpose", "participantText", "dataUse", "retentionOrDestruction", "authorityReference"]);
    const declineOutcome = enumValue(item.declineOutcome, ["continue-main-study", "stop-main-study-by-human-determination"] as const);
    const reviewState = enumValue(item.reviewState, REVIEW_STATES);
    return id && choiceText && declineOutcome && reviewState ? { id, ...choiceText, declineOutcome, reviewState } as ConsentPhase6OptionalChoice : null;
  });
  if (choices.some((item) => item === null) || new Set(choices.map((item) => item?.id)).size !== choices.length) return null;
  const artifacts = normalizeArtifacts(value.artifacts);
  if (!artifacts) return null;

  return {
    schemaVersion: CONSENT_PHASE_6_SCHEMA_VERSION,
    behavioral: { ...behavioralDecision, ...behavioralText } as ConsentPhase6BehavioralModule,
    focusGroup: { ...focusDecision, ...focusText, confidentialityLimitAcknowledged: focusRecord.confidentialityLimitAcknowledged } as ConsentPhase6FocusGroupModule,
    disclosure: {
      ...disclosureDecision,
      ...disclosureText,
      mode: disclosureMode,
      consentProcess,
      consentWaiverStatus,
      undisclosedRiskDeclaration,
      willingnessImpactDeclaration,
      waiverOrAlterationStatus,
      approvalReference,
      debrief: {
        ...debriefText,
        determination: debriefDetermination,
        timing: debriefTiming,
        dataUseChoice,
        reviewState: debriefReviewState,
      } as ConsentPhase6DebriefPlan,
    } as ConsentPhase6DisclosureModule,
    recording: { ...recordingDecision, ...recordingText, nonResearchUse, separateReleaseRequired: recordingRecord.separateReleaseRequired, mayDeclineAndContinueMainStudy } as ConsentPhase6RecordingModule,
    telephone: { ...telephoneDecision, ...telephoneText, pathways: telephonePathways, agreementBeforeSubstantiveQuestions: telephoneRecord.agreementBeforeSubstantiveQuestions } as ConsentPhase6TelephoneModule,
    lifecycle: { ...lifecycleDecision, ...lifecycleText, triggers: triggers as ConsentPhase6ChangeTrigger[] } as ConsentPhase6LifecycleModule,
    optionalChoices: { ...optionalDecision, choices: choices as ConsentPhase6OptionalChoice[] },
    artifacts,
  };
}
