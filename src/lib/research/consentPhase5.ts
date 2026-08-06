import {
  canonicalArtifactJson,
  createResearchArtifactSourceFingerprint,
  isResearchArtifactChecksum,
  normalizeResearchArtifactSourceFingerprint,
  sha256ArtifactChecksum,
  type ResearchArtifactChecksum,
  type ResearchArtifactSourceFingerprint,
} from "./artifactIdentity";
import {
  collectConsentAuthoritySafetyIssues,
  normalizeConsentAuthorityManifest,
  type ConsentAuthorityManifest,
  type ConsentClauseEditPolicy,
} from "./consentAuthority";
import {
  collectExperimentVariables,
  type ExperimentBlock,
  type ExperimentStudioDocument,
} from "./experimentStudio";
import type {
  ConsentDocumentationMethod,
  ConsentGovernanceDecisionSource,
  ConsentGovernancePathway,
  ConsentWaiverStatus,
} from "./consentProtocol";
import { collectConsentPhase6Issues } from "./consentPhase6";
import {
  createConsentPhase6State,
  normalizeConsentPhase6State,
  type ConsentPhase6ModuleId,
  type ConsentPhase6State,
} from "./consentPhase6Model";
import { collectConsentPhase7Issues } from "./consentPhase7";
import {
  createConsentPhase7State,
  normalizeConsentPhase7State,
  type ConsentPhase7PackageId,
  type ConsentPhase7State,
} from "./consentPhase7Model";
import { collectConsentPhase8Issues, compileConsentPhase8AndDependencies } from "./consentPhase8";
import {
  createConsentPhase8State,
  normalizeConsentPhase8State,
  type ConsentPhase8ModuleId,
  type ConsentPhase8State,
} from "./consentPhase8Model";
import { STUDY_DESIGN_OPTIONS, type StudyDesignDocument } from "./studyDesign";

export const CONSENT_PHASE_5_SCHEMA_VERSION = 4 as const;
export const CONSENT_PHASE_5_STORAGE_VERSION = 1 as const;
export const MAX_CONSENT_PHASE_5_BYTES = 1024 * 1024;
export const MAX_CONSENT_FORMS = 8;
export const MAX_CONSENT_CLAUSES = 80;
export const MAX_CONSENT_VERSIONS = 40;

export type ConsentPhase5FormKind =
  | "adult-standard"
  | "anonymous-survey-information"
  | "confidential-survey-information"
  | "adult-interview";
export type ConsentIdentifiability = "not-yet-determined" | "anonymous" | "confidential";
export type ConsentFutureUsePlan =
  | "not-yet-determined"
  | "may-use-after-removing-identifiers"
  | "will-not-use-for-future-research";
export type ConsentClauseApplicability = "included" | "not-applicable";
export type ConsentClauseReviewState = "not-reviewed" | "human-review-required" | "human-reviewed";
export type ConsentFactOrigin = "study-design" | "experiment-studio" | "researcher";

export interface ConsentPhase5AuthorityAttachment {
  filename: string;
  mediaType: string;
  byteLength: number;
  checksum: ResearchArtifactChecksum;
  importedAt: string;
  contentsStored: false;
}

export interface ConsentPhase5Governance {
  pathway: ConsentGovernancePathway;
  decisionSource: ConsentGovernanceDecisionSource;
  institutionReference: string;
  documentationMethod: ConsentDocumentationMethod;
  waiverOrAlteration: {
    status: ConsentWaiverStatus;
    approvalReference: string;
  } | null;
}

export interface ConsentStudyFact {
  id: string;
  label: string;
  value: string;
  origin: ConsentFactOrigin;
  sourceLocator: string;
  confidence: "implemented" | "declared" | "researcher-needed";
}

export interface ConsentResearcherInputs {
  studyPurpose: string;
  duration: string;
  risksAndDiscomforts: string;
  benefits: string;
  alternatives: string;
  compensationAndCosts: string;
  privacyProtections: string;
  dataAccess: string;
  dataRetention: string;
  withdrawalMethod: string;
  withdrawalBoundary: string;
  studyContact: string;
  rightsContact: string;
  identifiability: ConsentIdentifiability;
  futureUsePlan: ConsentFutureUsePlan;
  recordingPurpose: string;
  recordingAccessAndUse: string;
  recordingRetention: string;
}

export interface ConsentPhase5Clause {
  id: string;
  kind: string;
  title: string;
  text: string;
  lastCompiledText: string;
  researcherEdited: boolean;
  applicability: ConsentClauseApplicability;
  reviewState: ConsentClauseReviewState;
  sourceKind: "authority" | "study-derived" | "researcher";
  sourceId: string;
  sourceLocator: string;
  editPolicy: ConsentClauseEditPolicy;
  factIds: string[];
}

export interface ConsentPhase5Form {
  id: string;
  kind: ConsentPhase5FormKind | "audio-recording-choice" | "video-recording-choice";
  title: string;
  audience: "adult-participant";
  language: "en-US";
  decisionMode: "main-participation" | "separate-optional-choice" | "separate-required-choice";
  clauses: ConsentPhase5Clause[];
}

export interface ConsentPhase5Version {
  version: number;
  createdAt: string;
  documentChecksum: ResearchArtifactChecksum;
  sourceFingerprintChecksum: ResearchArtifactChecksum;
  authorityManifestId: string;
  authorityProfileVersion: string;
  claim: "authoring-review-snapshot-not-approval-or-legally-effective-consent";
}

export interface ConsentPhase5ExportReceipt {
  exportedAt: string;
  packageChecksum: ResearchArtifactChecksum;
  documentChecksum: ResearchArtifactChecksum;
  sourceFingerprintChecksum: ResearchArtifactChecksum;
  claim: "local-review-package-export-not-approval";
}

export interface ConsentPhase5Document {
  schemaVersion: typeof CONSENT_PHASE_5_SCHEMA_VERSION;
  projectId: string;
  authorityManifest: ConsentAuthorityManifest;
  authorityAttachment: ConsentPhase5AuthorityAttachment | null;
  authorityApplicabilityConfirmed: boolean;
  governance: ConsentPhase5Governance;
  formKind: ConsentPhase5FormKind;
  sourceFingerprint: ResearchArtifactSourceFingerprint;
  studyFacts: ConsentStudyFact[];
  inputs: ConsentResearcherInputs;
  forms: ConsentPhase5Form[];
  phase6: ConsentPhase6State;
  phase7: ConsentPhase7State;
  phase8: ConsentPhase8State;
  researcherNotes: string;
  versions: ConsentPhase5Version[];
  exports: ConsentPhase5ExportReceipt[];
  updatedAt: string;
}

export interface ConsentPhase5Issue {
  id: string;
  severity: "blocking" | "warning" | "advisory";
  repairTarget: "authority" | "governance" | "facts" | "form" | "review" | "source" | "module" | "artifact" | "protected-audience" | "specialized-module" | "specialized-artifact";
  message: string;
  clauseId?: string;
  moduleId?: ConsentPhase6ModuleId;
  specializedModuleId?: ConsentPhase8ModuleId;
  packageId?: ConsentPhase7PackageId;
  artifactId?: string;
}

export interface ConsentPhase5SourceCompilation {
  sourceFingerprint: ResearchArtifactSourceFingerprint;
  facts: ConsentStudyFact[];
  hasAudioRecording: boolean;
  hasVideoRecording: boolean;
  hasIdentifierSignals: boolean;
}

export interface ConsentPhase5ReviewPackage {
  schemaVersion: 4;
  createdAt: string;
  projectId: string;
  authority: {
    id: string;
    profileVersion: string;
    displayName: string;
    sourceUrls: string[];
    attachmentChecksum: ResearchArtifactChecksum | null;
  };
  governance: ConsentPhase5Governance;
  sourceFingerprint: ResearchArtifactSourceFingerprint;
  formKind: ConsentPhase5FormKind;
  studyFacts: ConsentStudyFact[];
  forms: ConsentPhase5Form[];
  phase6: ConsentPhase6State;
  phase7: ConsentPhase7State;
  phase8: ConsentPhase8State;
  issues: ConsentPhase5Issue[];
  documentChecksum: ResearchArtifactChecksum;
  packageChecksum: ResearchArtifactChecksum;
  claim: "review-package-not-irb-legal-ethics-compliance-or-release-approval";
}

const FORM_KIND_VALUES: readonly ConsentPhase5FormKind[] = [
  "adult-standard",
  "anonymous-survey-information",
  "confidential-survey-information",
  "adult-interview",
];
const GOVERNANCE_PATHWAYS: readonly ConsentGovernancePathway[] = [
  "not-yet-determined",
  "documented-exempt",
  "expedited-or-full",
  "fda-regulated",
  "other-institutional",
];
const DECISION_SOURCES: readonly ConsentGovernanceDecisionSource[] = ["none", "researcher", "institution"];
const DOCUMENTATION_METHODS: readonly ConsentDocumentationMethod[] = [
  "not-yet-determined",
  "signed-written",
  "signed-electronic",
  "verbal",
  "electronic-acknowledgement",
  "implied",
  "telephone-script",
  "short-form-oral-with-witness",
];
const WAIVER_STATUSES: readonly ConsentWaiverStatus[] = ["not-requested", "requested", "approved", "denied"];
const IDENTIFIABILITY_VALUES: readonly ConsentIdentifiability[] = ["not-yet-determined", "anonymous", "confidential"];
const FUTURE_USE_VALUES: readonly ConsentFutureUsePlan[] = [
  "not-yet-determined",
  "may-use-after-removing-identifiers",
  "will-not-use-for-future-research",
];
const CLAUSE_POLICIES: readonly ConsentClauseEditPolicy[] = [
  "locked",
  "fill-only",
  "editable",
  "conditional",
  "institution-review-required",
];
const REVIEW_STATES: readonly ConsentClauseReviewState[] = ["not-reviewed", "human-review-required", "human-reviewed"];

const EMPTY_INPUTS: ConsentResearcherInputs = {
  studyPurpose: "",
  duration: "",
  risksAndDiscomforts: "",
  benefits: "",
  alternatives: "Not taking part is the alternative to participating in this research.",
  compensationAndCosts: "",
  privacyProtections: "",
  dataAccess: "",
  dataRetention: "",
  withdrawalMethod: "",
  withdrawalBoundary: "",
  studyContact: "",
  rightsContact: "",
  identifiability: "not-yet-determined",
  futureUsePlan: "not-yet-determined",
  recordingPurpose: "",
  recordingAccessAndUse: "",
  recordingRetention: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedText(value: unknown, maximum: number, allowEmpty = false): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\r\n/g, "\n").trim().slice(0, maximum);
  return normalized || (allowEmpty ? "" : null);
}

function isoDateTime(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value ? value : null;
}

function enumValue<T extends string>(value: unknown, values: readonly T[]): T | null {
  return typeof value === "string" && values.includes(value as T) ? value as T : null;
}

function safeToken(value: string): string {
  const normalized = value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized.slice(0, 120) || "item";
}

function humanList(values: readonly string[]): string {
  const compact = values.map((value) => value.trim()).filter(Boolean);
  if (compact.length === 0) return "No data-producing responses are currently implemented.";
  if (compact.length === 1) return compact[0];
  return `${compact.slice(0, -1).join(", ")}, and ${compact.at(-1)}`;
}

function blockProcedureLabel(block: ExperimentBlock): string {
  const label = block.heading.trim() || block.title.trim() || block.type.replaceAll("-", " ");
  return label.replace(/\s+/g, " ").slice(0, 160);
}

function designLabel(document: StudyDesignDocument): string {
  return STUDY_DESIGN_OPTIONS.find((option) => option.id === document.spec.design.selectedDesign)?.title
    ?? document.spec.design.selectedDesign
    ?? "Not yet selected";
}

function settingLabel(setting: StudyDesignDocument["spec"]["design"]["setting"]): string {
  return ({
    "": "Not yet selected",
    online: "Online / participant home",
    laboratory: "Research laboratory",
    field: "Field setting",
    hybrid: "Hybrid settings",
  })[setting];
}

export async function compileConsentPhase5Source(
  studyDesign: StudyDesignDocument,
  studio: ExperimentStudioDocument,
): Promise<ConsentPhase5SourceCompilation> {
  // Consent binding is deliberately excluded from its own source fingerprint.
  // Otherwise the protocol checksum would depend on a Studio reference that in
  // turn depends on the protocol checksum, and merely binding the reviewed form
  // would immediately make that form stale.
  const consentTypes = new Set(["consent", "consent-form", "audio-consent", "video-consent"]);
  const consentBlockIds = new Set(studio.blocks.filter((block) => consentTypes.has(block.type)).map((block) => block.id));
  const consentSuccessors = new Map<string, string>();
  studio.blocks.forEach((block, index) => {
    if (!consentBlockIds.has(block.id)) return;
    const next = studio.blocks.slice(index + 1).find((candidate) => !consentBlockIds.has(candidate.id));
    consentSuccessors.set(block.id, next?.id ?? "__end__");
  });
  const consentIndependentTarget = (target: string): string => {
    let current = target;
    const visited = new Set<string>();
    while (consentBlockIds.has(current) && !visited.has(current)) {
      visited.add(current);
      current = consentSuccessors.get(current) ?? "__end__";
    }
    return current;
  };
  const consentIndependentStudioSource = {
    consentSourceSchemaVersion: 1,
    projectId: studio.projectId,
    title: studio.title,
    blocks: studio.blocks
      .filter((block) => !consentTypes.has(block.type))
      .map((block) => ({
        ...block,
        nextBlockId: consentIndependentTarget(block.nextBlockId),
        // Recording consent is represented by the reviewed protocol artifact at
        // runtime. The legacy block id and the semantic consent-form block id
        // are wiring details, so neither may make the protocol stale merely by
        // binding that same reviewed artifact into the Studio.
        audio: block.audio ? { ...block.audio, consentBlockId: "__reviewed-consent__" } : null,
        video: block.video ? {
          ...block.video,
          consentBlockId: "__reviewed-consent__",
          audioConsentBlockId: block.video.includeAudio ? "__reviewed-consent__" : "",
        } : null,
      })),
    conditions: studio.conditions,
    assignment: studio.assignment,
    branchRules: studio.branchRules.filter((rule) => (
      !consentBlockIds.has(rule.sourceBlockId) && !consentBlockIds.has(rule.targetBlockId)
    )),
    execution: studio.execution,
    trialTables: studio.trialTables,
    timingDiagnostic: studio.timingDiagnostic,
  };
  const [studyChecksum, studioChecksum] = await Promise.all([
    sha256ArtifactChecksum(studyDesign, { maximumBytes: 1024 * 1024 }),
    sha256ArtifactChecksum(consentIndependentStudioSource, { maximumBytes: 1024 * 1024 }),
  ]);
  const sourceFingerprint = await createResearchArtifactSourceFingerprint([
    {
      artifactKind: "study-design",
      artifactId: `study-design-${studyDesign.projectId}`,
      schemaVersion: studyDesign.schemaVersion,
      checksum: studyChecksum,
    },
    {
      artifactKind: "experiment-studio",
      artifactId: `experiment-studio-${studio.projectId}`,
      // Version the consent-independent projection rather than the mutable
      // Studio storage format. A consent-only migration must not make its own
      // reviewed source stale when no study procedure changed.
      schemaVersion: consentIndependentStudioSource.consentSourceSchemaVersion,
      checksum: studioChecksum,
    },
  ]);

  const participantBlocks = studio.blocks.filter((block) => ![
    "welcome",
    "consent",
    "consent-form",
    "audio-consent",
    "video-consent",
    "debrief",
  ].includes(block.type));
  const responseVariables = collectExperimentVariables(studio);
  const hasAudioRecording = studio.blocks.some((block) => block.type === "audio-response");
  const hasVideoRecording = studio.blocks.some((block) => block.type === "video-response");
  const identifierPattern = /(^|[_-])(name|email|phone|address|contact|student[_-]?id|participant[_-]?id|ip)([_-]|$)/i;
  const hasIdentifierSignals = responseVariables.some((variable) => identifierPattern.test(variable.name))
    || hasAudioRecording
    || hasVideoRecording;
  const timedMilliseconds = studio.blocks.reduce((total, block) => (
    total + Math.max(block.displayDurationMs, block.responseDeadlineMs, 0)
  ), 0);
  const procedures = participantBlocks.map(blockProcedureLabel);
  const facts: ConsentStudyFact[] = [
    {
      id: "fact-design",
      label: "Study design",
      value: designLabel(studyDesign),
      origin: "study-design",
      sourceLocator: "Stage 03 · Step 01",
      confidence: "declared",
    },
    {
      id: "fact-setting",
      label: "Setting",
      value: settingLabel(studyDesign.spec.design.setting),
      origin: "study-design",
      sourceLocator: "Stage 03 · Step 01",
      confidence: "declared",
    },
    {
      id: "fact-population",
      label: "Planned participants",
      value: studyDesign.spec.participants.targetPopulation || "Participant population needs researcher confirmation.",
      origin: studyDesign.spec.participants.targetPopulation ? "study-design" : "researcher",
      sourceLocator: "Stage 03 · Step 03",
      confidence: studyDesign.spec.participants.targetPopulation ? "declared" : "researcher-needed",
    },
    {
      id: "fact-procedure",
      label: "Implemented procedure",
      value: humanList(procedures),
      origin: "experiment-studio",
      sourceLocator: `Experimental Studio · ${participantBlocks.length} participant procedure blocks`,
      confidence: "implemented",
    },
    {
      id: "fact-responses",
      label: "Implemented response data",
      value: humanList(responseVariables.map((variable) => `${variable.blockTitle} (${variable.name})`)),
      origin: "experiment-studio",
      sourceLocator: `Experimental Studio · ${responseVariables.length} response variables`,
      confidence: "implemented",
    },
    {
      id: "fact-assignment",
      label: "Assignment",
      value: studio.assignment.method === "random" && studio.conditions.length > 1
        ? `Random assignment across ${studio.conditions.length} conditions: ${studio.conditions.map((condition) => condition.name).join(", ")}.`
        : "No random condition assignment is implemented.",
      origin: "experiment-studio",
      sourceLocator: "Experimental Studio · assignment settings",
      confidence: "implemented",
    },
    {
      id: "fact-recording",
      label: "Audio or video recording",
      value: hasAudioRecording || hasVideoRecording
        ? `${hasAudioRecording ? "Audio" : ""}${hasAudioRecording && hasVideoRecording ? " and " : ""}${hasVideoRecording ? "video" : ""} recording is implemented.`
        : "No audio or video response recording is implemented.",
      origin: "experiment-studio",
      sourceLocator: "Experimental Studio · media response blocks",
      confidence: "implemented",
    },
    {
      id: "fact-duration",
      label: "Implemented timed minimum",
      value: timedMilliseconds > 0
        ? `${Math.ceil(timedMilliseconds / 60_000)} minute timed minimum; total participant duration still needs researcher confirmation.`
        : "Total participant duration needs researcher confirmation.",
      origin: timedMilliseconds > 0 ? "experiment-studio" : "researcher",
      sourceLocator: "Experimental Studio · display and response timing",
      confidence: timedMilliseconds > 0 ? "implemented" : "researcher-needed",
    },
  ];

  return { sourceFingerprint, facts, hasAudioRecording, hasVideoRecording, hasIdentifierSignals };
}

function factValue(facts: readonly ConsentStudyFact[], id: string): string {
  return facts.find((fact) => fact.id === id)?.value ?? "Not yet described.";
}

interface ClauseTemplate {
  id: string;
  kind: string;
  title: string;
  text: string;
  sourceLocator: string;
  factIds: string[];
  editPolicy?: ConsentClauseEditPolicy;
}

function mainClauseTemplates(
  kind: ConsentPhase5FormKind,
  facts: readonly ConsentStudyFact[],
  inputs: ConsentResearcherInputs,
): ClauseTemplate[] {
  const exempt = kind !== "adult-standard";
  const purpose = inputs.studyPurpose || "[Describe why this research is being done.]";
  const duration = inputs.duration || "[State the expected total time.]";
  const procedure = factValue(facts, "fact-procedure");
  const assignment = factValue(facts, "fact-assignment");
  const risks = inputs.risksAndDiscomforts || "[Describe reasonably foreseeable risks or discomforts, including sensitive questions.]";
  const benefits = inputs.benefits || "[Describe expected benefits or state that there may be no direct benefit.]";
  const privacy = inputs.privacyProtections || "[Describe confidentiality or anonymity protections and their limits.]";
  const access = inputs.dataAccess || "[State who can access the research information.]";
  const retention = inputs.dataRetention || "[State how long information will be retained.]";
  const withdrawal = inputs.withdrawalMethod || "[Explain how a participant can stop or withdraw.]";
  const withdrawalBoundary = inputs.withdrawalBoundary || "[Explain what can and cannot be deleted after withdrawal or anonymization.]";
  const costs = inputs.compensationAndCosts || "[Describe payment, reimbursement, costs, or state that there are none.]";
  const studyContact = inputs.studyContact || "[Provide a study contact and a method for asking questions.]";
  const rightsContact = inputs.rightsContact || "[Provide the applicable participant-rights contact.]";
  const futureUse = inputs.futureUsePlan === "may-use-after-removing-identifiers"
    ? "Information may be used or shared for future research after identifiers are removed, subject to the applicable approved plan."
    : inputs.futureUsePlan === "will-not-use-for-future-research"
      ? "Information collected for this study will not be used or shared for future research studies."
      : "[State whether identifiable information, or information after identifiers are removed, may be used or shared for future research.]";
  const invitation = exempt
    ? `You are invited to consider taking part in research. ${purpose} Taking part is voluntary.`
    : `You are being asked to consider taking part in a research study. ${purpose} This summary highlights information that may matter most to your decision.`;

  return [
    {
      id: "clause-main-key-information",
      kind: "key-information",
      title: exempt ? "Before you decide" : "Key information",
      text: `${invitation} The activities are expected to take ${duration} The main foreseeable concerns are: ${risks}`,
      sourceLocator: "45 CFR 46.116(a)(4)–(5); authority profile key-information guidance",
      factIds: ["fact-procedure", "fact-duration"],
    },
    {
      id: "clause-main-purpose",
      kind: "purpose",
      title: "Why is this research being done?",
      text: purpose,
      sourceLocator: "45 CFR 46.116(b)(1)",
      factIds: ["fact-design"],
    },
    {
      id: "clause-main-procedure",
      kind: "procedures",
      title: "What will happen?",
      text: `If you choose to take part, the implemented study currently includes: ${procedure} ${assignment} Your total participation is expected to take ${duration}`,
      sourceLocator: "45 CFR 46.116(b)(1); implemented Studio procedure",
      factIds: ["fact-procedure", "fact-assignment", "fact-duration"],
    },
    {
      id: "clause-main-risks",
      kind: "risks",
      title: "What are the risks or discomforts?",
      text: risks,
      sourceLocator: "45 CFR 46.116(b)(2)",
      factIds: ["fact-responses", "fact-recording"],
    },
    {
      id: "clause-main-benefits",
      kind: "benefits",
      title: "Are there benefits?",
      text: benefits,
      sourceLocator: "45 CFR 46.116(b)(3)",
      factIds: [],
    },
    ...(exempt ? [] : [{
      id: "clause-main-alternatives",
      kind: "alternatives",
      title: "What are my alternatives?",
      text: inputs.alternatives || "Not taking part is the alternative to participating in this research.",
      sourceLocator: "45 CFR 46.116(b)(4), when applicable",
      factIds: [],
    }]),
    {
      id: "clause-main-privacy",
      kind: "confidentiality",
      title: "How will my information be handled?",
      text: `${privacy} ${access} ${retention} ${futureUse}`,
      sourceLocator: "45 CFR 46.116(b)(5) and (b)(9); implemented response data",
      factIds: ["fact-responses", "fact-recording"],
    },
    {
      id: "clause-main-costs",
      kind: "costs-compensation",
      title: "Will I be paid or have costs?",
      text: costs,
      sourceLocator: "Authority profile payment, reimbursement, and cost guidance",
      factIds: [],
    },
    {
      id: "clause-main-voluntary",
      kind: "voluntary-participation",
      title: "Is taking part voluntary?",
      text: "Taking part is your choice. You may refuse or stop without penalty or loss of benefits to which you are otherwise entitled.",
      sourceLocator: "45 CFR 46.116(b)(8)",
      factIds: [],
      editPolicy: "locked",
    },
    {
      id: "clause-main-withdrawal",
      kind: "withdrawal",
      title: "How can I stop or withdraw?",
      text: `${withdrawal} ${withdrawalBoundary}`,
      sourceLocator: "45 CFR 46.116(b)(8) and, when applicable, (c)(4)",
      factIds: [],
    },
    {
      id: "clause-main-contacts",
      kind: "contacts",
      title: "Who can answer my questions?",
      text: `For questions about the study: ${studyContact} For questions about participant rights: ${rightsContact}`,
      sourceLocator: "45 CFR 46.116(b)(7)",
      factIds: [],
    },
  ];
}

function recordingClauseTemplates(
  modality: "audio" | "video",
  inputs: ConsentResearcherInputs,
): ClauseTemplate[] {
  return [
    {
      id: `clause-${modality}-recording-choice`,
      kind: `${modality}-recording-choice`,
      title: `${modality === "audio" ? "Audio" : "Video"} recording choice`,
      text: `${inputs.recordingPurpose || "[Explain why the recording is needed.]"} ${inputs.recordingAccessAndUse || "[Explain who can access it and how it may be used.]"} ${inputs.recordingRetention || "[State when it will be destroyed or whether it will be retained indefinitely.]"}`,
      sourceLocator: "UCSF social and behavioral recording guidance; implemented Studio recording block",
      factIds: ["fact-recording"],
    },
  ];
}

function mergeClauses(
  templates: readonly ClauseTemplate[],
  current: readonly ConsentPhase5Clause[] = [],
): ConsentPhase5Clause[] {
  const currentById = new Map(current.map((clause) => [clause.id, clause]));
  return templates.map((template) => {
    const existing = currentById.get(template.id);
    const editPolicy = template.editPolicy ?? "editable";
    if (!existing) {
      return {
        ...template,
        text: template.text,
        lastCompiledText: template.text,
        researcherEdited: false,
        applicability: "included",
        reviewState: editPolicy === "institution-review-required" ? "human-review-required" : "not-reviewed",
        sourceKind: "study-derived",
        sourceId: "cerise-phase-5-consent-compiler",
        editPolicy,
      };
    }
    const sourceChanged = existing.lastCompiledText !== template.text;
    return {
      ...existing,
      title: template.title,
      kind: template.kind,
      sourceLocator: template.sourceLocator,
      factIds: [...template.factIds],
      editPolicy,
      text: existing.researcherEdited ? existing.text : template.text,
      lastCompiledText: template.text,
      reviewState: sourceChanged ? "human-review-required" : existing.reviewState,
    };
  });
}

function compileForms(
  kind: ConsentPhase5FormKind,
  facts: readonly ConsentStudyFact[],
  inputs: ConsentResearcherInputs,
  source: ConsentPhase5SourceCompilation,
  current: readonly ConsentPhase5Form[] = [],
): ConsentPhase5Form[] {
  const currentById = new Map(current.map((form) => [form.id, form]));
  const title = ({
    "adult-standard": "Adult research consent",
    "anonymous-survey-information": "Anonymous survey information and consent",
    "confidential-survey-information": "Confidential survey information and consent",
    "adult-interview": "Adult interview consent",
  })[kind];
  const mainCurrent = currentById.get("form-main");
  const forms: ConsentPhase5Form[] = [{
    id: "form-main",
    kind,
    title,
    audience: "adult-participant",
    language: "en-US",
    decisionMode: "main-participation",
    clauses: mergeClauses(mainClauseTemplates(kind, facts, inputs), mainCurrent?.clauses),
  }];
  if (source.hasAudioRecording) {
    const existing = currentById.get("form-audio-recording");
    forms.push({
      id: "form-audio-recording",
      kind: "audio-recording-choice",
      title: "Audio recording decision",
      audience: "adult-participant",
      language: "en-US",
      decisionMode: "separate-optional-choice",
      clauses: mergeClauses(recordingClauseTemplates("audio", inputs), existing?.clauses),
    });
  }
  if (source.hasVideoRecording) {
    const existing = currentById.get("form-video-recording");
    forms.push({
      id: "form-video-recording",
      kind: "video-recording-choice",
      title: "Video recording decision",
      audience: "adult-participant",
      language: "en-US",
      decisionMode: "separate-optional-choice",
      clauses: mergeClauses(recordingClauseTemplates("video", inputs), existing?.clauses),
    });
  }
  return forms;
}

export async function createConsentPhase5Document(
  projectId: string,
  studyDesign: StudyDesignDocument,
  studio: ExperimentStudioDocument,
  authorityManifest: ConsentAuthorityManifest,
  updatedAt = new Date().toISOString(),
): Promise<ConsentPhase5Document> {
  const authority = normalizeConsentAuthorityManifest(authorityManifest);
  if (!authority) throw new Error("The consent authority profile is invalid.");
  const source = await compileConsentPhase5Source(studyDesign, studio);
  const inputs = { ...EMPTY_INPUTS };
  const formKind: ConsentPhase5FormKind = studyDesign.spec.design.selectedDesign === "qualitative"
    ? "adult-interview"
    : "adult-standard";
  return {
    schemaVersion: CONSENT_PHASE_5_SCHEMA_VERSION,
    projectId,
    authorityManifest: authority,
    authorityAttachment: null,
    authorityApplicabilityConfirmed: false,
    governance: {
      pathway: "not-yet-determined",
      decisionSource: "none",
      institutionReference: "",
      documentationMethod: "not-yet-determined",
      waiverOrAlteration: null,
    },
    formKind,
    sourceFingerprint: source.sourceFingerprint,
    studyFacts: source.facts,
    inputs,
    forms: compileForms(formKind, source.facts, inputs, source),
    phase6: createConsentPhase6State(),
    phase7: createConsentPhase7State(),
    phase8: createConsentPhase8State(),
    researcherNotes: "",
    versions: [],
    exports: [],
    updatedAt,
  };
}

export async function reconcileConsentPhase5Document(
  document: ConsentPhase5Document,
  studyDesign: StudyDesignDocument,
  studio: ExperimentStudioDocument,
  updatedAt = new Date().toISOString(),
): Promise<ConsentPhase5Document> {
  const source = await compileConsentPhase5Source(studyDesign, studio);
  const next = {
    ...document,
    sourceFingerprint: source.sourceFingerprint,
    studyFacts: source.facts,
    forms: compileForms(document.formKind, source.facts, document.inputs, source, document.forms),
    exports: [],
    updatedAt,
  };
  return compileConsentPhase8AndDependencies(next);
}

export function updateConsentPhase5Inputs(
  document: ConsentPhase5Document,
  patch: Partial<ConsentResearcherInputs>,
  updatedAt = new Date().toISOString(),
): ConsentPhase5Document {
  const inputs = { ...document.inputs, ...patch };
  const source: ConsentPhase5SourceCompilation = {
    sourceFingerprint: document.sourceFingerprint,
    facts: document.studyFacts,
    hasAudioRecording: document.forms.some((form) => form.kind === "audio-recording-choice"),
    hasVideoRecording: document.forms.some((form) => form.kind === "video-recording-choice"),
    hasIdentifierSignals: false,
  };
  const next = {
    ...document,
    inputs,
    forms: compileForms(document.formKind, document.studyFacts, inputs, source, document.forms),
    exports: [],
    updatedAt,
  };
  return compileConsentPhase8AndDependencies(next);
}

export function changeConsentPhase5FormKind(
  document: ConsentPhase5Document,
  formKind: ConsentPhase5FormKind,
  updatedAt = new Date().toISOString(),
): ConsentPhase5Document {
  const source: ConsentPhase5SourceCompilation = {
    sourceFingerprint: document.sourceFingerprint,
    facts: document.studyFacts,
    hasAudioRecording: document.forms.some((form) => form.kind === "audio-recording-choice"),
    hasVideoRecording: document.forms.some((form) => form.kind === "video-recording-choice"),
    hasIdentifierSignals: false,
  };
  const next = {
    ...document,
    formKind,
    forms: compileForms(formKind, document.studyFacts, document.inputs, source, document.forms),
    exports: [],
    updatedAt,
  };
  return compileConsentPhase8AndDependencies(next);
}

export function changeConsentPhase5Authority(
  document: ConsentPhase5Document,
  authorityManifest: ConsentAuthorityManifest,
  updatedAt = new Date().toISOString(),
): ConsentPhase5Document {
  const authority = normalizeConsentAuthorityManifest(authorityManifest);
  if (!authority) return document;
  const next = {
    ...document,
    authorityManifest: authority,
    authorityAttachment: null,
    authorityApplicabilityConfirmed: false,
    forms: document.forms.map((form) => ({
      ...form,
      clauses: form.clauses.map((clause) => ({ ...clause, reviewState: "human-review-required" as const })),
    })),
    exports: [],
    updatedAt,
  };
  return compileConsentPhase8AndDependencies(next);
}

export function updateConsentPhase5Clause(
  document: ConsentPhase5Document,
  clauseId: string,
  patch: { text?: string; applicability?: ConsentClauseApplicability; reviewState?: ConsentClauseReviewState },
  updatedAt = new Date().toISOString(),
): { document: ConsentPhase5Document; issues: string[] } {
  const current = document.forms.flatMap((form) => form.clauses).find((clause) => clause.id === clauseId);
  if (!current) return { document, issues: ["unknown-clause"] };
  const issues: string[] = [];
  if (patch.text !== undefined) {
    if (patch.text.length > 20_000) issues.push("clause-text-too-long");
    if (["locked", "fill-only", "conditional"].includes(current.editPolicy) && patch.text !== current.text) {
      issues.push(`${current.editPolicy}-clause-text`);
    }
  }
  if (patch.applicability !== undefined && current.editPolicy !== "conditional") {
    issues.push("applicability-not-editable");
  }
  if (issues.length > 0) return { document, issues };
  const nextText = patch.text ?? current.text;
  const next = {
    ...current,
    text: nextText,
    researcherEdited: nextText !== current.lastCompiledText,
    sourceKind: nextText !== current.lastCompiledText ? "researcher" as const : current.sourceKind,
    applicability: patch.applicability ?? current.applicability,
    reviewState: patch.reviewState ?? (
      nextText !== current.text
        ? current.editPolicy === "institution-review-required" ? "human-review-required" : "not-reviewed"
        : current.reviewState
    ),
  };
  const nextDocument: ConsentPhase5Document = {
    ...document,
    forms: document.forms.map((form) => ({
      ...form,
      clauses: form.clauses.map((clause) => clause.id === clauseId ? next : clause),
    })),
    exports: [],
    updatedAt,
  };
  return {
    issues: [],
    document: compileConsentPhase8AndDependencies(nextDocument),
  };
}

function hasPlaceholder(text: string): boolean {
  return /\[[^\]]{3,}\]/.test(text);
}

function identifierSignalsFromFacts(document: ConsentPhase5Document): boolean {
  const responseFact = factValue(document.studyFacts, "fact-responses");
  const recordingFact = factValue(document.studyFacts, "fact-recording");
  return /(^|[(_\s-])(name|email|phone|address|contact|student[_ -]?id|participant[_ -]?id|ip)([)_\s-]|$)/i.test(responseFact)
    || !recordingFact.startsWith("No audio or video");
}

export function collectConsentPhase5Issues(
  document: ConsentPhase5Document,
  currentSourceFingerprint: ResearchArtifactSourceFingerprint = document.sourceFingerprint,
): ConsentPhase5Issue[] {
  const issues: ConsentPhase5Issue[] = collectConsentAuthoritySafetyIssues(document.authorityManifest).map((issue) => ({
    id: `authority-${issue.id}`,
    severity: issue.severity,
    repairTarget: "authority" as const,
    message: issue.message,
  }));
  if (!document.authorityApplicabilityConfirmed) {
    issues.push({
      id: "authority-applicability-unconfirmed",
      severity: "blocking",
      repairTarget: "authority",
      message: "The researcher must confirm that the selected authority profile and current template apply to this study.",
    });
  }
  if (document.governance.pathway === "not-yet-determined") {
    issues.push({
      id: "governance-pathway-undetermined",
      severity: "blocking",
      repairTarget: "governance",
      message: "Record the governance pathway determined by the researcher or applicable institution.",
    });
  }
  if (document.governance.decisionSource === "none") {
    issues.push({
      id: "governance-decision-source-missing",
      severity: "blocking",
      repairTarget: "governance",
      message: "Record who made the governance declaration; Cerise will not infer it from the design.",
    });
  }
  if (!document.governance.institutionReference) {
    issues.push({
      id: "governance-reference-missing",
      severity: "blocking",
      repairTarget: "governance",
      message: "Add the applicable institutional determination, protocol, or review reference.",
    });
  }
  if (document.governance.documentationMethod === "not-yet-determined") {
    issues.push({
      id: "documentation-method-undetermined",
      severity: "blocking",
      repairTarget: "governance",
      message: "Select the declared consent-documentation process.",
    });
  }
  const methodNeedsWaiverEvidence = document.governance.pathway !== "documented-exempt"
    && ["verbal", "electronic-acknowledgement", "implied"].includes(document.governance.documentationMethod);
  if (methodNeedsWaiverEvidence && document.governance.waiverOrAlteration?.status !== "approved") {
    issues.push({
      id: "waiver-documentation-not-approved",
      severity: "blocking",
      repairTarget: "governance",
      message: "A waiver of signed documentation cannot be treated as approved without the applicable human determination.",
    });
  }
  if (
    document.governance.waiverOrAlteration?.status === "approved"
    && !document.governance.waiverOrAlteration.approvalReference
  ) {
    issues.push({
      id: "waiver-approval-reference-missing",
      severity: "blocking",
      repairTarget: "governance",
      message: "Record the approval reference for the declared waiver or alteration.",
    });
  }
  if (document.sourceFingerprint.checksum !== currentSourceFingerprint.checksum) {
    issues.push({
      id: "study-source-stale",
      severity: "blocking",
      repairTarget: "source",
      message: "The implemented study changed after this consent draft was compiled. Reconcile the source facts before review or export.",
    });
  }
  const requiredInputs: ReadonlyArray<[keyof ConsentResearcherInputs, string]> = [
    ["studyPurpose", "Describe the study purpose in participant-facing language."],
    ["duration", "State the expected total participant duration."],
    ["risksAndDiscomforts", "Describe foreseeable risks and discomforts or explicitly state the assessed expectation."],
    ["benefits", "Describe expected benefits or state that there may be no direct benefit."],
    ["compensationAndCosts", "Describe payment, reimbursement, costs, or state that there are none."],
    ["privacyProtections", "Describe privacy and confidentiality protections and their limits."],
    ["dataAccess", "State who can access the research information."],
    ["dataRetention", "State how long the research information will be retained."],
    ["withdrawalMethod", "Explain how a participant can stop or withdraw."],
    ["withdrawalBoundary", "Explain the deletion or anonymization boundary after withdrawal."],
    ["studyContact", "Provide a study contact for questions."],
    ["rightsContact", "Provide the applicable participant-rights contact."],
  ];
  for (const [key, message] of requiredInputs) {
    if (!document.inputs[key]) {
      issues.push({ id: `input-${key}-missing`, severity: "blocking", repairTarget: "facts", message });
    }
  }
  if (document.inputs.identifiability === "not-yet-determined") {
    issues.push({
      id: "identifiability-undetermined",
      severity: "blocking",
      repairTarget: "facts",
      message: "Declare whether this form describes anonymous or confidential data handling.",
    });
  }
  if (document.inputs.futureUsePlan === "not-yet-determined") {
    issues.push({
      id: "future-use-undetermined",
      severity: "blocking",
      repairTarget: "facts",
      message: "State whether information may be used or shared for future research after identifiers are removed.",
    });
  }
  if (
    (document.formKind === "anonymous-survey-information" || document.inputs.identifiability === "anonymous")
    && identifierSignalsFromFacts(document)
  ) {
    issues.push({
      id: "anonymous-claim-conflicts-with-implemented-data",
      severity: "blocking",
      repairTarget: "facts",
      message: "The anonymous claim conflicts with implemented identifiers or audio/video recording. Use a confidential form or remove the linkable data path.",
    });
  }
  const hasRecording = document.forms.some((form) => form.kind === "audio-recording-choice" || form.kind === "video-recording-choice");
  if (hasRecording) {
    for (const [key, message] of [
      ["recordingPurpose", "Explain why recording is needed."],
      ["recordingAccessAndUse", "Explain recording access and permitted uses."],
      ["recordingRetention", "State how long recordings are kept or when they are destroyed."],
    ] as const) {
      if (!document.inputs[key]) {
        issues.push({ id: `input-${key}-missing`, severity: "blocking", repairTarget: "facts", message });
      }
    }
  }
  if (document.formKind !== "adult-standard" && document.governance.pathway !== "documented-exempt") {
    issues.push({
      id: "exempt-family-without-documented-exempt-path",
      severity: "warning",
      repairTarget: "governance",
      message: "This information-sheet family is commonly associated with institution-documented exempt research, but the current pathway is not documented exempt.",
    });
  }
  for (const clause of document.forms.flatMap((form) => form.clauses)) {
    const exculpatoryPattern = /(?:waive|give up|surrender|release).{0,90}(?:legal rights?|right to sue|liability|negligence)|(?:legal rights?|right to sue).{0,90}(?:waive|give up|surrender|release)/i;
    const coercivePattern = /participation (?:is|will be) mandatory|(?:must|required to) participate/i;
    const falseApprovalPattern = /(?:cerise|artificial intelligence|\bai\b|this (?:software|system|tool)).{0,50}(?:approved|certified|determined compliant)/i;
    const absolutePrivacyPattern = /(?:guaranteed|completely|perfectly|100%|zero risk).{0,35}(?:anonymous|anonymity|confidential|confidentiality|private|privacy)|(?:no (?:privacy|confidentiality|disclosure) risk)/i;
    if (clause.applicability === "included" && exculpatoryPattern.test(clause.text)) {
      issues.push({
        id: `clause-exculpatory-${clause.id}`,
        severity: "blocking",
        repairTarget: "form",
        message: `${clause.title} appears to ask participants to waive legal rights or release liability. Remove the exculpatory language and obtain applicable human review.`,
        clauseId: clause.id,
      });
    }
    if (clause.applicability === "included" && coercivePattern.test(clause.text)) {
      issues.push({
        id: `clause-coercive-${clause.id}`,
        severity: "blocking",
        repairTarget: "form",
        message: `${clause.title} appears to make research participation mandatory. Restore voluntary, refusal-safe language.`,
        clauseId: clause.id,
      });
    }
    if (clause.applicability === "included" && falseApprovalPattern.test(clause.text)) {
      issues.push({
        id: `clause-false-approval-${clause.id}`,
        severity: "blocking",
        repairTarget: "form",
        message: `${clause.title} attributes approval or compliance to software or AI. Only the applicable human authority can make that determination.`,
        clauseId: clause.id,
      });
    }
    if (clause.applicability === "included" && absolutePrivacyPattern.test(clause.text)) {
      issues.push({
        id: `clause-absolute-privacy-${clause.id}`,
        severity: "warning",
        repairTarget: "form",
        message: `${clause.title} appears to promise absolute privacy or confidentiality. Describe safeguards and realistic limits instead.`,
        clauseId: clause.id,
      });
    }
    if (clause.applicability === "included" && hasPlaceholder(clause.text)) {
      issues.push({
        id: `clause-placeholder-${clause.id}`,
        severity: "blocking",
        repairTarget: "form",
        message: `${clause.title} still contains unresolved participant-facing placeholders.`,
        clauseId: clause.id,
      });
    }
    if (clause.applicability === "included" && clause.reviewState !== "human-reviewed") {
      issues.push({
        id: `clause-review-${clause.id}`,
        severity: "blocking",
        repairTarget: "review",
        message: `${clause.title} requires explicit human review for this study.`,
        clauseId: clause.id,
      });
    }
  }
  issues.push(...collectConsentPhase6Issues(document));
  issues.push(...collectConsentPhase8Issues(document));
  issues.push(...collectConsentPhase7Issues(document));
  const severityOrder = { blocking: 0, warning: 1, advisory: 2 } as const;
  return issues.sort((left, right) => (
    severityOrder[left.severity] - severityOrder[right.severity]
    || left.id.localeCompare(right.id)
  ));
}

function versionPayload(document: ConsentPhase5Document) {
  const payload = { ...document } as Partial<ConsentPhase5Document>;
  delete payload.versions;
  delete payload.exports;
  delete payload.updatedAt;
  return payload;
}

export async function addConsentPhase5Version(
  document: ConsentPhase5Document,
  createdAt = new Date().toISOString(),
): Promise<ConsentPhase5Document> {
  const documentChecksum = await sha256ArtifactChecksum(versionPayload(document), {
    maximumBytes: MAX_CONSENT_PHASE_5_BYTES,
  });
  const version: ConsentPhase5Version = {
    version: (document.versions.at(-1)?.version ?? 0) + 1,
    createdAt,
    documentChecksum,
    sourceFingerprintChecksum: document.sourceFingerprint.checksum,
    authorityManifestId: document.authorityManifest.id,
    authorityProfileVersion: document.authorityManifest.profileVersion,
    claim: "authoring-review-snapshot-not-approval-or-legally-effective-consent",
  };
  return {
    ...document,
    versions: [...document.versions, version].slice(-MAX_CONSENT_VERSIONS),
    updatedAt: createdAt,
  };
}

export async function buildConsentPhase5ReviewPackage(
  document: ConsentPhase5Document,
  currentSourceFingerprint: ResearchArtifactSourceFingerprint,
  createdAt = new Date().toISOString(),
): Promise<ConsentPhase5ReviewPackage> {
  const issues = collectConsentPhase5Issues(document, currentSourceFingerprint);
  if (issues.some((issue) => issue.severity === "blocking")) {
    throw new Error("Resolve the blocking consent-authoring issues before exporting a review package.");
  }
  const documentChecksum = await sha256ArtifactChecksum(versionPayload(document), {
    maximumBytes: MAX_CONSENT_PHASE_5_BYTES,
  });
  const core = {
    schemaVersion: 4 as const,
    createdAt,
    projectId: document.projectId,
    authority: {
      id: document.authorityManifest.id,
      profileVersion: document.authorityManifest.profileVersion,
      displayName: document.authorityManifest.displayName,
      sourceUrls: document.authorityManifest.sources.map((source) => source.url),
      attachmentChecksum: document.authorityAttachment?.checksum ?? null,
    },
    governance: document.governance,
    sourceFingerprint: document.sourceFingerprint,
    formKind: document.formKind,
    studyFacts: document.studyFacts,
    forms: document.forms,
    phase6: document.phase6,
    phase7: document.phase7,
    phase8: document.phase8,
    issues,
    documentChecksum,
    claim: "review-package-not-irb-legal-ethics-compliance-or-release-approval" as const,
  };
  return { ...core, packageChecksum: await sha256ArtifactChecksum(core, { maximumBytes: MAX_CONSENT_PHASE_5_BYTES }) };
}

export function recordConsentPhase5Export(
  document: ConsentPhase5Document,
  reviewPackage: ConsentPhase5ReviewPackage,
): ConsentPhase5Document {
  if (
    reviewPackage.projectId !== document.projectId
    || reviewPackage.sourceFingerprint.checksum !== document.sourceFingerprint.checksum
  ) return document;
  return {
    ...document,
    exports: [...document.exports, {
      exportedAt: reviewPackage.createdAt,
      packageChecksum: reviewPackage.packageChecksum,
      documentChecksum: reviewPackage.documentChecksum,
      sourceFingerprintChecksum: reviewPackage.sourceFingerprint.checksum,
      claim: "local-review-package-export-not-approval" as const,
    }].slice(-MAX_CONSENT_VERSIONS),
    updatedAt: reviewPackage.createdAt,
  };
}

export function participantConsentPreview(document: ConsentPhase5Document, formId = "form-main"): string {
  const form = document.forms.find((candidate) => candidate.id === formId) ?? document.forms[0];
  if (!form) return "No participant form has been compiled.";
  return [form.title, ...form.clauses
    .filter((clause) => clause.applicability === "included")
    .flatMap((clause) => [clause.title, clause.text])]
    .join("\n\n");
}

export function isConsentPhase5Ready(
  document: ConsentPhase5Document,
  currentSourceFingerprint: ResearchArtifactSourceFingerprint,
): boolean {
  if (collectConsentPhase5Issues(document, currentSourceFingerprint).some((issue) => issue.severity === "blocking")) {
    return false;
  }
  const version = document.versions.at(-1);
  const receipt = document.exports.at(-1);
  return Boolean(
    version
    && receipt
    && version.documentChecksum === receipt.documentChecksum
    && version.sourceFingerprintChecksum === receipt.sourceFingerprintChecksum
    && receipt.sourceFingerprintChecksum === currentSourceFingerprint.checksum,
  );
}

function normalizeAttachment(value: unknown): ConsentPhase5AuthorityAttachment | null {
  if (value === null) return null;
  if (!isRecord(value)) return null;
  const filename = boundedText(value.filename, 255);
  const mediaType = boundedText(value.mediaType, 160);
  const importedAt = isoDateTime(value.importedAt);
  if (
    !filename
    || !mediaType
    || !Number.isSafeInteger(value.byteLength)
    || (value.byteLength as number) < 0
    || (value.byteLength as number) > 20 * 1024 * 1024
    || !isResearchArtifactChecksum(value.checksum)
    || !importedAt
    || value.contentsStored !== false
  ) return null;
  return {
    filename,
    mediaType,
    byteLength: value.byteLength as number,
    checksum: value.checksum,
    importedAt,
    contentsStored: false,
  };
}

function normalizeGovernance(value: unknown): ConsentPhase5Governance | null {
  if (!isRecord(value)) return null;
  const pathway = enumValue(value.pathway, GOVERNANCE_PATHWAYS);
  const decisionSource = enumValue(value.decisionSource, DECISION_SOURCES);
  const institutionReference = boundedText(value.institutionReference, 2_000, true);
  const documentationMethod = enumValue(value.documentationMethod, DOCUMENTATION_METHODS);
  if (!pathway || !decisionSource || institutionReference === null || !documentationMethod) return null;
  let waiverOrAlteration: ConsentPhase5Governance["waiverOrAlteration"] = null;
  if (value.waiverOrAlteration !== null) {
    if (!isRecord(value.waiverOrAlteration)) return null;
    const status = enumValue(value.waiverOrAlteration.status, WAIVER_STATUSES);
    const approvalReference = boundedText(value.waiverOrAlteration.approvalReference, 2_000, true);
    if (!status || approvalReference === null) return null;
    waiverOrAlteration = { status, approvalReference };
  }
  return { pathway, decisionSource, institutionReference, documentationMethod, waiverOrAlteration };
}

function normalizeInputs(value: unknown): ConsentResearcherInputs | null {
  if (!isRecord(value)) return null;
  const result = {} as ConsentResearcherInputs;
  for (const key of Object.keys(EMPTY_INPUTS) as Array<keyof ConsentResearcherInputs>) {
    if (key === "identifiability") {
      const normalized = enumValue(value[key], IDENTIFIABILITY_VALUES);
      if (!normalized) return null;
      result[key] = normalized;
    } else if (key === "futureUsePlan") {
      const normalized = enumValue(value[key], FUTURE_USE_VALUES);
      if (!normalized) return null;
      result[key] = normalized;
    } else {
      const normalized = boundedText(value[key], 20_000, true);
      if (normalized === null) return null;
      result[key] = normalized;
    }
  }
  return result;
}

function normalizeFacts(value: unknown): ConsentStudyFact[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const facts = value.map((item) => {
    if (!isRecord(item)) return null;
    const id = boundedText(item.id, 160);
    const label = boundedText(item.label, 200);
    const factValue = boundedText(item.value, 10_000);
    const origin = enumValue(item.origin, ["study-design", "experiment-studio", "researcher"] as const);
    const sourceLocator = boundedText(item.sourceLocator, 1_000);
    const confidence = enumValue(item.confidence, ["implemented", "declared", "researcher-needed"] as const);
    return id && label && factValue && origin && sourceLocator && confidence
      ? { id, label, value: factValue, origin, sourceLocator, confidence }
      : null;
  });
  if (facts.some((fact) => fact === null)) return null;
  const normalized = facts as ConsentStudyFact[];
  return new Set(normalized.map((fact) => fact.id)).size === normalized.length ? normalized : null;
}

function normalizeClauses(value: unknown): ConsentPhase5Clause[] | null {
  if (!Array.isArray(value) || value.length > MAX_CONSENT_CLAUSES) return null;
  const clauses = value.map((item) => {
    if (!isRecord(item) || !Array.isArray(item.factIds) || item.factIds.length > 24) return null;
    const id = boundedText(item.id, 160);
    const kind = boundedText(item.kind, 160);
    const title = boundedText(item.title, 500);
    const clauseText = boundedText(item.text, 20_000, true);
    const lastCompiledText = boundedText(item.lastCompiledText, 20_000, true);
    const applicability = enumValue(item.applicability, ["included", "not-applicable"] as const);
    const reviewState = enumValue(item.reviewState, REVIEW_STATES);
    const sourceKind = enumValue(item.sourceKind, ["authority", "study-derived", "researcher"] as const);
    const sourceId = boundedText(item.sourceId, 200);
    const sourceLocator = boundedText(item.sourceLocator, 2_000);
    const editPolicy = enumValue(item.editPolicy, CLAUSE_POLICIES);
    const factIds = item.factIds.map((factId) => boundedText(factId, 160));
    if (
      !id || !kind || !title || clauseText === null || lastCompiledText === null
      || typeof item.researcherEdited !== "boolean" || !applicability || !reviewState
      || !sourceKind || !sourceId || !sourceLocator || !editPolicy || factIds.some((factId) => factId === null)
    ) return null;
    return {
      id,
      kind,
      title,
      text: clauseText,
      lastCompiledText,
      researcherEdited: item.researcherEdited,
      applicability,
      reviewState,
      sourceKind,
      sourceId,
      sourceLocator,
      editPolicy,
      factIds: factIds as string[],
    };
  });
  if (clauses.some((clause) => clause === null)) return null;
  const normalized = clauses as ConsentPhase5Clause[];
  return new Set(normalized.map((clause) => clause.id)).size === normalized.length ? normalized : null;
}

function normalizeForms(value: unknown): ConsentPhase5Form[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CONSENT_FORMS) return null;
  const forms = value.map((item) => {
    if (!isRecord(item)) return null;
    const id = boundedText(item.id, 160);
    const kind = enumValue(item.kind, [...FORM_KIND_VALUES, "audio-recording-choice", "video-recording-choice"] as const);
    const title = boundedText(item.title, 500);
    const clauses = normalizeClauses(item.clauses);
    const decisionMode = enumValue(item.decisionMode, [
      "main-participation",
      "separate-optional-choice",
      "separate-required-choice",
    ] as const);
    return id && kind && title && item.audience === "adult-participant" && item.language === "en-US" && clauses && decisionMode
      ? { id, kind, title, audience: "adult-participant" as const, language: "en-US" as const, decisionMode, clauses }
      : null;
  });
  if (forms.some((form) => form === null)) return null;
  const normalized = forms as ConsentPhase5Form[];
  const clauseIds = normalized.flatMap((form) => form.clauses.map((clause) => clause.id));
  return new Set(normalized.map((form) => form.id)).size === normalized.length
    && new Set(clauseIds).size === clauseIds.length
    ? normalized
    : null;
}

function normalizeVersions(value: unknown): ConsentPhase5Version[] | null {
  if (!Array.isArray(value) || value.length > MAX_CONSENT_VERSIONS) return null;
  const versions = value.map((item) => {
    if (!isRecord(item)) return null;
    const createdAt = isoDateTime(item.createdAt);
    const authorityManifestId = boundedText(item.authorityManifestId, 160);
    const authorityProfileVersion = boundedText(item.authorityProfileVersion, 160);
    return Number.isSafeInteger(item.version) && (item.version as number) > 0
      && createdAt && isResearchArtifactChecksum(item.documentChecksum)
      && isResearchArtifactChecksum(item.sourceFingerprintChecksum)
      && authorityManifestId && authorityProfileVersion
      && item.claim === "authoring-review-snapshot-not-approval-or-legally-effective-consent"
      ? {
          version: item.version as number,
          createdAt,
          documentChecksum: item.documentChecksum,
          sourceFingerprintChecksum: item.sourceFingerprintChecksum,
          authorityManifestId,
          authorityProfileVersion,
          claim: item.claim,
        }
      : null;
  });
  if (versions.some((version) => version === null)) return null;
  const normalized = versions as ConsentPhase5Version[];
  return normalized.every((version, index) => index === 0 || version.version > normalized[index - 1].version)
    ? normalized
    : null;
}

function normalizeExports(value: unknown): ConsentPhase5ExportReceipt[] | null {
  if (!Array.isArray(value) || value.length > MAX_CONSENT_VERSIONS) return null;
  const exports = value.map((item) => {
    if (!isRecord(item)) return null;
    const exportedAt = isoDateTime(item.exportedAt);
    return exportedAt
      && isResearchArtifactChecksum(item.packageChecksum)
      && isResearchArtifactChecksum(item.documentChecksum)
      && isResearchArtifactChecksum(item.sourceFingerprintChecksum)
      && item.claim === "local-review-package-export-not-approval"
      ? {
          exportedAt,
          packageChecksum: item.packageChecksum,
          documentChecksum: item.documentChecksum,
          sourceFingerprintChecksum: item.sourceFingerprintChecksum,
          claim: item.claim,
        }
      : null;
  });
  return exports.some((receipt) => receipt === null) ? null : exports as ConsentPhase5ExportReceipt[];
}

export function normalizeConsentPhase5Document(value: unknown, projectId: string): ConsentPhase5Document | null {
  try {
    canonicalArtifactJson(value, { maximumBytes: MAX_CONSENT_PHASE_5_BYTES });
  } catch {
    return null;
  }
  if (!isRecord(value) || ![1, 2, 3, CONSENT_PHASE_5_SCHEMA_VERSION].includes(value.schemaVersion as 1 | 2 | 3 | 4) || value.projectId !== projectId) return null;
  const authorityManifest = normalizeConsentAuthorityManifest(value.authorityManifest);
  const authorityAttachment = normalizeAttachment(value.authorityAttachment);
  const governance = normalizeGovernance(value.governance);
  const formKind = enumValue(value.formKind, FORM_KIND_VALUES);
  const sourceFingerprint = normalizeResearchArtifactSourceFingerprint(value.sourceFingerprint);
  const studyFacts = normalizeFacts(value.studyFacts);
  const inputs = normalizeInputs(value.inputs);
  const forms = normalizeForms(value.forms);
  const phase6 = value.schemaVersion === 1 ? createConsentPhase6State() : normalizeConsentPhase6State(value.phase6);
  const phase7 = value.schemaVersion === 3 || value.schemaVersion === 4 ? normalizeConsentPhase7State(value.phase7) : createConsentPhase7State();
  const phase8 = value.schemaVersion === 4 ? normalizeConsentPhase8State(value.phase8) : createConsentPhase8State();
  const researcherNotes = boundedText(value.researcherNotes, 20_000, true);
  const versions = normalizeVersions(value.versions);
  const exports = normalizeExports(value.exports);
  const updatedAt = isoDateTime(value.updatedAt);
  if (
    !authorityManifest
    || (value.authorityAttachment !== null && !authorityAttachment)
    || typeof value.authorityApplicabilityConfirmed !== "boolean"
    || !governance || !formKind || !sourceFingerprint || !studyFacts || !inputs || !forms || !phase6 || !phase7 || !phase8
    || researcherNotes === null || !versions || !exports || !updatedAt
  ) return null;
  const normalized: ConsentPhase5Document = {
    schemaVersion: CONSENT_PHASE_5_SCHEMA_VERSION,
    projectId,
    authorityManifest,
    authorityAttachment,
    authorityApplicabilityConfirmed: value.authorityApplicabilityConfirmed,
    governance,
    formKind,
    sourceFingerprint,
    studyFacts,
    inputs,
    forms,
    phase6,
    phase7,
    phase8,
    researcherNotes,
    versions,
    exports,
    updatedAt,
  };
  try {
    canonicalArtifactJson(normalized, { maximumBytes: MAX_CONSENT_PHASE_5_BYTES });
    return normalized;
  } catch {
    return null;
  }
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function consentPhase5StorageKey(projectId: string): string {
  return `cerise-consent-protocol:${projectId}:v${CONSENT_PHASE_5_STORAGE_VERSION}`;
}

export function readConsentPhase5Document(storage: StorageLike, projectId: string): ConsentPhase5Document | null {
  const stored = storage.getItem(consentPhase5StorageKey(projectId));
  if (!stored) return null;
  try {
    return normalizeConsentPhase5Document(JSON.parse(stored), projectId);
  } catch {
    return null;
  }
}

export function writeConsentPhase5Document(storage: StorageLike, document: ConsentPhase5Document): void {
  const normalized = normalizeConsentPhase5Document(document, document.projectId);
  if (!normalized) throw new Error("The consent protocol is invalid and was not stored.");
  storage.setItem(consentPhase5StorageKey(document.projectId), JSON.stringify(normalized));
}

export function consentPhase5Filename(document: ConsentPhase5Document): string {
  return `cerise-consent-review-${safeToken(document.projectId)}-v${document.versions.at(-1)?.version ?? 0}.json`;
}
