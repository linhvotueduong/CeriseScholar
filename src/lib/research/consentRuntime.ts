import {
  canonicalArtifactJson,
  isResearchArtifactChecksum,
  sha256ArtifactChecksum,
  type ResearchArtifactChecksum,
} from "./artifactIdentity";
import {
  isConsentPhase5Ready,
  type ConsentPhase5Document,
  type ConsentPhase5Form,
} from "./consentPhase5";
import {
  createExperimentBlock,
  EXPERIMENT_STUDIO_SCHEMA_VERSION,
  type ExperimentConsentFormReference,
  type ExperimentStudioDocument,
} from "./experimentStudio";

export const CONSENT_RUNTIME_ARTIFACT_VERSION = 1 as const;
export const CONSENT_RUNTIME_RECEIPT_VERSION = 1 as const;
export const MAX_CONSENT_RUNTIME_BYTES = 512 * 1024;
export const MAX_CONSENT_RUNTIME_DECISIONS = 24;

export type ConsentRuntimeDecisionKind =
  | "main-participation"
  | "audio-recording"
  | "video-recording"
  | "optional-research"
  | "recontact";

export type ConsentRuntimeIssueCode =
  | "authoring-not-ready"
  | "unsupported-documentation"
  | "unsupported-audience"
  | "unsupported-language"
  | "unsupported-protected-audience"
  | "unsupported-regulated-process"
  | "unsupported-broad-consent"
  | "missing-main-form"
  | "missing-withdrawal-boundary"
  | "unreviewed-runtime-choice"
  | "too-many-decisions";

export interface ConsentRuntimeIssue {
  code: ConsentRuntimeIssueCode;
  message: string;
}

export interface ConsentRuntimeSection {
  id: string;
  title: string;
  text: string;
}

export interface ConsentRuntimeDecision {
  id: string;
  kind: ConsentRuntimeDecisionKind;
  title: string;
  participantText: string;
  acceptLabel: string;
  declineLabel: string;
  requirement: "required-for-main-study" | "optional";
  declineOutcome: "end-before-study" | "continue-without-activity";
  sourceArtifactId: string;
}

export interface ConsentRuntimeForm {
  id: string;
  checksum: ResearchArtifactChecksum;
  title: string;
  audience: "adult-participant";
  language: "en-US";
  sections: ConsentRuntimeSection[];
}

export interface ConsentRuntimeArtifactCore {
  artifactVersion: typeof CONSENT_RUNTIME_ARTIFACT_VERSION;
  projectId: string;
  protocolId: string;
  protocolChecksum: ResearchArtifactChecksum;
  sourceFingerprintChecksum: ResearchArtifactChecksum;
  authoringVersion: number;
  form: ConsentRuntimeForm;
  decisions: ConsentRuntimeDecision[];
  contactsText: string;
  withdrawal: {
    method: string;
    dataBoundary: string;
    runtimeAction: "stop-new-collection-and-scrub-current-provisional-session";
  };
  reconsent: {
    triggerIds: string[];
    policy: "human-determined-before-continued-participation";
  };
  documentation: {
    method: "electronic-acknowledgement" | "implied";
    claim: "local-decision-receipt-not-signature-identity-proof-or-approval";
  };
  participantCopy: {
    filename: string;
    includesChecksums: true;
  };
  claim: "reviewed-adult-consent-runtime-not-legal-effect-approval-or-regulated-signature";
}

export interface ConsentRuntimeArtifact extends ConsentRuntimeArtifactCore {
  artifactChecksum: ResearchArtifactChecksum;
}

export interface ConsentRuntimeDecisionInput {
  main: "accepted" | "refused";
  optional: Record<string, "accepted" | "declined">;
}

export interface LocalConsentReceiptCore {
  receiptVersion: typeof CONSENT_RUNTIME_RECEIPT_VERSION;
  sessionId: string;
  releaseId: string;
  releaseChecksum: string;
  executionMode: "pilot" | "production";
  protocolChecksum: ResearchArtifactChecksum;
  artifactChecksum: ResearchArtifactChecksum;
  formId: string;
  formChecksum: ResearchArtifactChecksum;
  language: "en-US";
  decision: "accepted" | "refused" | "withdrawn" | "reconsented";
  decisionBasis: "main-accepted" | "main-declined" | "required-component-declined" | "participant-withdrew";
  optionalDecisions: Array<{
    decisionId: string;
    decision: "accepted" | "declined";
  }>;
  presentedAt: string;
  decidedAt: string;
  priorReceiptChecksum: ResearchArtifactChecksum | null;
  claim: "local-metadata-receipt-not-signature-identity-proof-or-approval";
}

export interface LocalConsentReceipt extends LocalConsentReceiptCore {
  receiptChecksum: ResearchArtifactChecksum;
}

export type ConsentRuntimeSessionStatus =
  | "awaiting-decision"
  | "active"
  | "reconsent-required"
  | "refused"
  | "withdrawn";

export interface ConsentRuntimeSessionState {
  status: ConsentRuntimeSessionStatus;
  artifactChecksum: ResearchArtifactChecksum;
  receipt: LocalConsentReceipt | null;
  pendingArtifactChecksum: ResearchArtifactChecksum | null;
}

export interface ConsentRuntimeSessionPayload {
  responses: Record<string, unknown>;
  audioResponses: Record<string, unknown>;
  videoResponses: Record<string, unknown>;
  timings: unknown[];
  events: unknown[];
  trials: unknown[];
  consentReceipt: LocalConsentReceipt | null;
}

function runtimeFormPayload(form: Omit<ConsentRuntimeForm, "checksum">) {
  return {
    id: form.id,
    title: form.title,
    audience: form.audience,
    language: form.language,
    sections: form.sections,
  };
}

function artifactCore(artifact: ConsentRuntimeArtifact): ConsentRuntimeArtifactCore {
  return Object.fromEntries(
    Object.entries(artifact).filter(([key]) => key !== "artifactChecksum"),
  ) as unknown as ConsentRuntimeArtifactCore;
}

function receiptCore(receipt: LocalConsentReceipt): LocalConsentReceiptCore {
  return Object.fromEntries(
    Object.entries(receipt).filter(([key]) => key !== "receiptChecksum"),
  ) as unknown as LocalConsentReceiptCore;
}

function includedSections(form: ConsentPhase5Form): ConsentRuntimeSection[] {
  return form.clauses
    .filter((clause) => clause.applicability === "included")
    .map((clause) => ({ id: clause.id, title: clause.title, text: clause.text }));
}

function formText(form: ConsentPhase5Form): string {
  return includedSections(form).map((section) => `${section.title}\n${section.text}`).join("\n\n");
}

function safeFilename(value: string): string {
  const stem = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
  return `${stem || "participant-consent"}.txt`;
}

function optionalKind(id: string, title: string): ConsentRuntimeDecisionKind {
  return /recontact|contact.*later|future contact/i.test(`${id} ${title}`)
    ? "recontact"
    : "optional-research";
}

export function collectConsentRuntimeIssues(
  document: ConsentPhase5Document,
  currentSourceFingerprint: ConsentPhase5Document["sourceFingerprint"],
): ConsentRuntimeIssue[] {
  const issues: ConsentRuntimeIssue[] = [];
  if (!isConsentPhase5Ready(document, currentSourceFingerprint)) {
    issues.push({
      code: "authoring-not-ready",
      message: "Export an issue-free checksum-bound review package for the current study source before binding participant runtime consent.",
    });
  }
  if (!["electronic-acknowledgement", "implied"].includes(document.governance.documentationMethod)) {
    issues.push({
      code: "unsupported-documentation",
      message: "This first runtime cannot execute signed, witnessed, verbal, telephone, short-form, or regulated electronic-signature documentation.",
    });
  }
  const main = document.forms.find((form) => form.id === "form-main");
  if (!main) {
    issues.push({ code: "missing-main-form", message: "A reviewed adult main-participation form is required." });
  } else {
    if (main.audience !== "adult-participant") {
      issues.push({ code: "unsupported-audience", message: "Phase 10 supports adult self-consent only." });
    }
    if (main.language !== "en-US") {
      issues.push({ code: "unsupported-language", message: "Phase 10 supports the reviewed English (en-US) form only." });
    }
  }
  if (
    document.phase7.profile.requiredPackages.length > 0
    || document.phase7.artifacts.length > 0
  ) {
    issues.push({
      code: "unsupported-protected-audience",
      message: "Guardian permission, assent, surrogate, oral, translated, and short-form packages remain authoring/export-only until multi-actor execution is approved.",
    });
  }
  const regulated = document.governance.pathway === "fda-regulated"
    || document.phase8.profile.fdaRegulatedStatus === "applicable-by-human-determination"
    || document.phase8.artifacts.some((artifact) => [
      "privacy-addendum-binding",
      "fda-electronic-process-specification",
    ].includes(artifact.kind));
  if (regulated) {
    issues.push({
      code: "unsupported-regulated-process",
      message: "FDA-regulated e-consent, identity verification, electronic signatures, and HIPAA/GDPR authorization require the approved external process recorded in Phase 8.",
    });
  }
  if (document.phase8.artifacts.some((artifact) => artifact.kind === "broad-consent-form")) {
    issues.push({
      code: "unsupported-broad-consent",
      message: "Dedicated broad-consent execution and durable refusal tracking are not part of the first adult runtime.",
    });
  }
  if (!document.inputs.withdrawalMethod.trim() || !document.inputs.withdrawalBoundary.trim()) {
    issues.push({
      code: "missing-withdrawal-boundary",
      message: "The reviewed form must state both how to stop and what can or cannot happen to information already collected.",
    });
  }
  const optionalArtifacts = [
    ...document.phase6.artifacts.filter((artifact) => artifact.decisionMode === "separate-optional-choice"),
    ...document.phase8.artifacts.filter((artifact) => artifact.decisionMode === "separate-optional-choice"),
  ];
  if (optionalArtifacts.some((artifact) => artifact.reviewState !== "human-reviewed")) {
    issues.push({
      code: "unreviewed-runtime-choice",
      message: "Every independent optional decision presented at runtime must be human reviewed for this study.",
    });
  }
  const decisionCount = 1 + document.forms.filter((form) => form.id !== "form-main").length + optionalArtifacts.length;
  if (decisionCount > MAX_CONSENT_RUNTIME_DECISIONS) {
    issues.push({ code: "too-many-decisions", message: `Keep the participant consent runtime at or below ${MAX_CONSENT_RUNTIME_DECISIONS} separate decisions.` });
  }
  return issues;
}

function runtimeDecisions(document: ConsentPhase5Document, main: ConsentPhase5Form): ConsentRuntimeDecision[] {
  const decisions: ConsentRuntimeDecision[] = [{
    id: "main-participation",
    kind: "main-participation",
    title: "Your participation decision",
    participantText: "Choose whether you want to take part after reviewing the complete information. Your choice will not affect benefits or services to which you are otherwise entitled.",
    acceptLabel: "I agree to take part",
    declineLabel: "I do not agree to take part",
    requirement: "required-for-main-study",
    declineOutcome: "end-before-study",
    sourceArtifactId: main.id,
  }];
  for (const form of document.forms.filter((candidate) => candidate.id !== main.id)) {
    const kind = form.kind === "audio-recording-choice" ? "audio-recording" : "video-recording";
    const optional = form.decisionMode === "separate-optional-choice";
    decisions.push({
      id: form.id,
      kind,
      title: form.title,
      participantText: formText(form),
      acceptLabel: `I agree to ${kind === "audio-recording" ? "audio" : "video"} recording`,
      declineLabel: `I do not agree to ${kind === "audio-recording" ? "audio" : "video"} recording`,
      requirement: optional ? "optional" : "required-for-main-study",
      declineOutcome: optional ? "continue-without-activity" : "end-before-study",
      sourceArtifactId: form.id,
    });
  }
  for (const artifact of document.phase6.artifacts.filter((item) => item.decisionMode === "separate-optional-choice")) {
    const source = document.phase6.optionalChoices.choices.find((choice) => `phase6-optional-${choice.id}` === artifact.id);
    const required = source?.declineOutcome === "stop-main-study-by-human-determination";
    decisions.push({
      id: artifact.id,
      kind: optionalKind(artifact.id, artifact.title),
      title: artifact.title,
      participantText: artifact.participantText,
      acceptLabel: "I agree to this optional activity",
      declineLabel: "I decline this optional activity",
      requirement: required ? "required-for-main-study" : "optional",
      declineOutcome: required ? "end-before-study" : "continue-without-activity",
      sourceArtifactId: artifact.id,
    });
  }
  for (const artifact of document.phase8.artifacts.filter((item) => item.decisionMode === "separate-optional-choice")) {
    decisions.push({
      id: artifact.id,
      kind: optionalKind(artifact.id, artifact.title),
      title: artifact.title,
      participantText: artifact.participantText,
      acceptLabel: "I agree to this optional research use",
      declineLabel: "I decline this optional research use",
      requirement: "optional",
      declineOutcome: "continue-without-activity",
      sourceArtifactId: artifact.id,
    });
  }
  return decisions;
}

export async function buildConsentRuntimeArtifact(
  document: ConsentPhase5Document,
  currentSourceFingerprint: ConsentPhase5Document["sourceFingerprint"],
): Promise<ConsentRuntimeArtifact> {
  const issues = collectConsentRuntimeIssues(document, currentSourceFingerprint);
  if (issues.length > 0) throw new Error(issues[0]?.message ?? "Consent runtime is not eligible.");
  const main = document.forms.find((form) => form.id === "form-main");
  const version = document.versions.at(-1);
  if (!main || !version) throw new Error("The checksum-bound reviewed main form is missing.");
  const formWithoutChecksum = {
    id: main.id,
    title: main.title,
    audience: "adult-participant" as const,
    language: "en-US" as const,
    sections: includedSections(main),
  };
  const form: ConsentRuntimeForm = {
    ...formWithoutChecksum,
    checksum: await sha256ArtifactChecksum(runtimeFormPayload(formWithoutChecksum), { maximumBytes: MAX_CONSENT_RUNTIME_BYTES }),
  };
  const contactsText = main.clauses.find((clause) => clause.kind === "contacts")?.text ?? "Use the study contact information in the reviewed form.";
  const core: ConsentRuntimeArtifactCore = {
    artifactVersion: CONSENT_RUNTIME_ARTIFACT_VERSION,
    projectId: document.projectId,
    protocolId: `consent-protocol-${document.projectId}`,
    protocolChecksum: version.documentChecksum,
    sourceFingerprintChecksum: currentSourceFingerprint.checksum,
    authoringVersion: version.version,
    form,
    decisions: runtimeDecisions(document, main),
    contactsText,
    withdrawal: {
      method: document.inputs.withdrawalMethod,
      dataBoundary: document.inputs.withdrawalBoundary,
      runtimeAction: "stop-new-collection-and-scrub-current-provisional-session",
    },
    reconsent: {
      triggerIds: document.phase6.lifecycle.triggers
        .filter((trigger) => trigger.humanDisposition === "full-reconsent")
        .map((trigger) => trigger.id),
      policy: "human-determined-before-continued-participation",
    },
    documentation: {
      method: document.governance.documentationMethod as "electronic-acknowledgement" | "implied",
      claim: "local-decision-receipt-not-signature-identity-proof-or-approval",
    },
    participantCopy: {
      filename: safeFilename(`${main.title}-v${version.version}`),
      includesChecksums: true,
    },
    claim: "reviewed-adult-consent-runtime-not-legal-effect-approval-or-regulated-signature",
  };
  canonicalArtifactJson(core, { maximumBytes: MAX_CONSENT_RUNTIME_BYTES });
  return {
    ...core,
    artifactChecksum: await sha256ArtifactChecksum(core, { maximumBytes: MAX_CONSENT_RUNTIME_BYTES }),
  };
}

export async function verifyConsentRuntimeArtifact(artifact: ConsentRuntimeArtifact): Promise<boolean> {
  try {
    if (
      artifact.artifactVersion !== CONSENT_RUNTIME_ARTIFACT_VERSION
      || artifact.form.audience !== "adult-participant"
      || artifact.form.language !== "en-US"
      || !isResearchArtifactChecksum(artifact.protocolChecksum)
      || !isResearchArtifactChecksum(artifact.sourceFingerprintChecksum)
      || !isResearchArtifactChecksum(artifact.form.checksum)
      || !isResearchArtifactChecksum(artifact.artifactChecksum)
      || artifact.decisions.length < 1
      || artifact.decisions.length > MAX_CONSENT_RUNTIME_DECISIONS
      || artifact.decisions[0]?.kind !== "main-participation"
      || artifact.documentation.claim !== "local-decision-receipt-not-signature-identity-proof-or-approval"
      || artifact.claim !== "reviewed-adult-consent-runtime-not-legal-effect-approval-or-regulated-signature"
    ) return false;
    const [formChecksum, artifactChecksum] = await Promise.all([
      sha256ArtifactChecksum(runtimeFormPayload(artifact.form), { maximumBytes: MAX_CONSENT_RUNTIME_BYTES }),
      sha256ArtifactChecksum(artifactCore(artifact), { maximumBytes: MAX_CONSENT_RUNTIME_BYTES }),
    ]);
    return formChecksum === artifact.form.checksum && artifactChecksum === artifact.artifactChecksum;
  } catch {
    return false;
  }
}

export function consentRuntimeReference(artifact: ConsentRuntimeArtifact): ExperimentConsentFormReference {
  return {
    consentProtocolId: artifact.protocolId,
    consentProtocolChecksum: artifact.protocolChecksum,
    consentArtifactChecksum: artifact.artifactChecksum,
    formId: artifact.form.id,
    formChecksum: artifact.form.checksum,
    language: artifact.form.language,
    audience: artifact.form.audience,
    decisionVariableName: "consent_receipt",
    decisionIds: artifact.decisions.map((decision) => decision.id),
  };
}

export function consentRuntimeArtifactMatchesReference(
  artifact: ConsentRuntimeArtifact | null | undefined,
  reference: ExperimentConsentFormReference | null | undefined,
): boolean {
  return Boolean(
    artifact
    && reference
    && artifact.protocolId === reference.consentProtocolId
    && artifact.protocolChecksum === reference.consentProtocolChecksum
    && artifact.artifactChecksum === reference.consentArtifactChecksum
    && artifact.form.id === reference.formId
    && artifact.form.checksum === reference.formChecksum
    && artifact.form.language === reference.language
    && artifact.form.audience === reference.audience
    && artifact.decisions.length === reference.decisionIds.length
    && artifact.decisions.every((decision, index) => decision.id === reference.decisionIds[index]),
  );
}

export async function bindConsentRuntimeToStudio(
  studio: ExperimentStudioDocument,
  artifact: ConsentRuntimeArtifact,
  updatedAt = new Date().toISOString(),
): Promise<ExperimentStudioDocument> {
  if (!await verifyConsentRuntimeArtifact(artifact)) throw new Error("The participant consent artifact failed checksum verification.");
  if (studio.projectId !== artifact.projectId) throw new Error("Consent and study belong to different projects.");
  const existingIndex = studio.blocks.findIndex((block) => block.type === "consent-form" || block.type === "consent");
  const existing = existingIndex >= 0 ? studio.blocks[existingIndex] : null;
  const block = createExperimentBlock("consent-form", existing?.id || "block-consent-form");
  block.internalName = "reviewed_consent_form";
  block.heading = artifact.form.title;
  block.prompt = "Present the checksum-bound reviewed consent artifact before any study procedure or data collection.";
  block.nextBlockId = existing?.nextBlockId ?? "";
  block.consentForm = consentRuntimeReference(artifact);
  const removed = new Set(studio.blocks
    .filter((candidate, index) => index === existingIndex || ["consent-form", "audio-consent", "video-consent"].includes(candidate.type))
    .map((candidate) => candidate.id));
  const successor = new Map<string, string>();
  studio.blocks.forEach((candidate, index) => {
    if (!removed.has(candidate.id)) return;
    const explicit = candidate.nextBlockId;
    if (explicit && explicit !== "__end__" && !removed.has(explicit)) {
      successor.set(candidate.id, explicit);
      return;
    }
    const next = studio.blocks.slice(index + 1).find((item) => !removed.has(item.id));
    successor.set(candidate.id, next?.id ?? "__end__");
  });
  const resolveTarget = (target: string): string => {
    let current = target;
    const visited = new Set<string>();
    while (removed.has(current) && !visited.has(current)) {
      visited.add(current);
      current = successor.get(current) ?? "__end__";
    }
    return current;
  };
  block.nextBlockId = resolveTarget(block.nextBlockId);
  const withoutConsent = studio.blocks
    .filter((candidate) => !removed.has(candidate.id))
    .map((candidate) => ({
      ...candidate,
      nextBlockId: resolveTarget(candidate.nextBlockId),
      audio: candidate.audio ? { ...candidate.audio, consentBlockId: block.id } : null,
      video: candidate.video ? {
        ...candidate.video,
        consentBlockId: block.id,
        audioConsentBlockId: candidate.video.includeAudio ? block.id : "",
      } : null,
    }));
  return {
    ...studio,
    schemaVersion: EXPERIMENT_STUDIO_SCHEMA_VERSION,
    blocks: [block, ...withoutConsent],
    branchRules: studio.branchRules.flatMap((rule) => (
      removed.has(rule.sourceBlockId) || removed.has(rule.targetBlockId)
        ? []
        : [rule]
    )),
    updatedAt,
  };
}

export async function createLocalConsentReceipt(
  artifact: ConsentRuntimeArtifact,
  input: {
    sessionId: string;
    releaseId?: string;
    releaseChecksum?: string;
    executionMode?: "pilot" | "production";
    decisions: ConsentRuntimeDecisionInput;
    presentedAt: string;
    decidedAt: string;
    priorReceiptChecksum?: ResearchArtifactChecksum | null;
    reconsent?: boolean;
  },
): Promise<LocalConsentReceipt> {
  if (!await verifyConsentRuntimeArtifact(artifact)) throw new Error("The participant consent artifact failed checksum verification.");
  if (!input.sessionId.trim() || !Date.parse(input.presentedAt) || !Date.parse(input.decidedAt)) {
    throw new Error("The local consent decision is missing valid session or time metadata.");
  }
  if (Date.parse(input.decidedAt) < Date.parse(input.presentedAt)) {
    throw new Error("The consent decision cannot precede presentation of the reviewed form.");
  }
  if (input.reconsent && !input.priorReceiptChecksum) {
    throw new Error("A reconsent receipt must link to the prior active consent receipt.");
  }
  const knownOptional = new Map(artifact.decisions.slice(1).map((decision) => [decision.id, decision]));
  const supplied = Object.entries(input.decisions.optional);
  const mainRefused = input.decisions.main === "refused";
  if (
    supplied.some(([id]) => !knownOptional.has(id))
    || (!mainRefused && supplied.length !== knownOptional.size)
  ) {
    throw new Error("Every applicable separate consent decision must be recorded exactly once.");
  }
  const requiredDeclined = [...knownOptional].some(([id, decision]) => (
    decision.requirement === "required-for-main-study" && input.decisions.optional[id] !== "accepted"
  ));
  const refused = input.decisions.main === "refused" || requiredDeclined;
  const core: LocalConsentReceiptCore = {
    receiptVersion: CONSENT_RUNTIME_RECEIPT_VERSION,
    sessionId: input.sessionId.slice(0, 120),
    releaseId: (input.releaseId || "unreleased").slice(0, 160),
    releaseChecksum: (input.releaseChecksum || "unreleased").slice(0, 160),
    executionMode: input.executionMode ?? "pilot",
    protocolChecksum: artifact.protocolChecksum,
    artifactChecksum: artifact.artifactChecksum,
    formId: artifact.form.id,
    formChecksum: artifact.form.checksum,
    language: artifact.form.language,
    decision: refused ? "refused" : input.reconsent ? "reconsented" : "accepted",
    decisionBasis: input.decisions.main === "refused"
      ? "main-declined"
      : requiredDeclined
        ? "required-component-declined"
        : "main-accepted",
    optionalDecisions: mainRefused ? [] : [...knownOptional.keys()].sort().map((decisionId) => ({
      decisionId,
      decision: input.decisions.optional[decisionId]!,
    })),
    presentedAt: input.presentedAt,
    decidedAt: input.decidedAt,
    priorReceiptChecksum: input.priorReceiptChecksum ?? null,
    claim: "local-metadata-receipt-not-signature-identity-proof-or-approval",
  };
  return {
    ...core,
    receiptChecksum: await sha256ArtifactChecksum(core, { maximumBytes: 64 * 1024 }),
  };
}

export async function createWithdrawalReceipt(
  activeReceipt: LocalConsentReceipt,
  decidedAt: string,
): Promise<LocalConsentReceipt> {
  if (activeReceipt.decision !== "accepted" && activeReceipt.decision !== "reconsented") {
    throw new Error("Only an active consent receipt can transition to withdrawal.");
  }
  if (!Date.parse(decidedAt) || Date.parse(decidedAt) < Date.parse(activeReceipt.decidedAt)) {
    throw new Error("Withdrawal must be recorded at or after the active consent decision.");
  }
  const core: LocalConsentReceiptCore = {
    ...receiptCore(activeReceipt),
    decision: "withdrawn",
    decisionBasis: "participant-withdrew",
    optionalDecisions: [],
    presentedAt: activeReceipt.presentedAt,
    decidedAt,
    priorReceiptChecksum: activeReceipt.receiptChecksum,
  };
  return { ...core, receiptChecksum: await sha256ArtifactChecksum(core, { maximumBytes: 64 * 1024 }) };
}

export function createConsentRuntimeSessionState(artifact: ConsentRuntimeArtifact): ConsentRuntimeSessionState {
  return {
    status: "awaiting-decision",
    artifactChecksum: artifact.artifactChecksum,
    receipt: null,
    pendingArtifactChecksum: null,
  };
}

export function transitionConsentRuntimeSession(
  state: ConsentRuntimeSessionState,
  action:
    | { type: "record-decision"; receipt: LocalConsentReceipt }
    | { type: "require-reconsent"; artifactChecksum: ResearchArtifactChecksum }
    | { type: "record-reconsent"; receipt: LocalConsentReceipt }
    | { type: "withdraw"; receipt: LocalConsentReceipt },
): ConsentRuntimeSessionState {
  if (action.type === "record-decision" && state.status === "awaiting-decision") {
    if (
      action.receipt.artifactChecksum !== state.artifactChecksum
      || !["accepted", "refused"].includes(action.receipt.decision)
      || action.receipt.priorReceiptChecksum !== null
    ) throw new Error("The receipt does not match the initial presented consent decision.");
    return {
      status: action.receipt.decision === "refused" ? "refused" : "active",
      artifactChecksum: state.artifactChecksum,
      receipt: action.receipt,
      pendingArtifactChecksum: null,
    };
  }
  if (action.type === "require-reconsent" && state.status === "active") {
    return { ...state, status: "reconsent-required", pendingArtifactChecksum: action.artifactChecksum };
  }
  if (action.type === "record-reconsent" && state.status === "reconsent-required") {
    if (
      action.receipt.decision !== "reconsented"
      || action.receipt.artifactChecksum !== state.pendingArtifactChecksum
      || action.receipt.priorReceiptChecksum !== state.receipt?.receiptChecksum
    ) {
      throw new Error("Continued participation requires a receipt for the pending amended artifact.");
    }
    return {
      status: "active",
      artifactChecksum: action.receipt.artifactChecksum,
      receipt: action.receipt,
      pendingArtifactChecksum: null,
    };
  }
  if (action.type === "withdraw" && (state.status === "active" || state.status === "reconsent-required")) {
    if (
      action.receipt.decision !== "withdrawn"
      || action.receipt.artifactChecksum !== state.artifactChecksum
      || action.receipt.priorReceiptChecksum !== state.receipt?.receiptChecksum
    ) throw new Error("The supplied receipt is not linked to the active consent receipt.");
    return { ...state, status: "withdrawn", receipt: action.receipt, pendingArtifactChecksum: null };
  }
  throw new Error(`Consent transition ${action.type} is not allowed from ${state.status}.`);
}

export function scrubSessionForRefusalOrWithdrawal(
  receipt: LocalConsentReceipt,
): ConsentRuntimeSessionPayload {
  if (receipt.decision !== "refused" && receipt.decision !== "withdrawn") {
    throw new Error("Session scrubbing requires a refusal or withdrawal receipt.");
  }
  return {
    responses: {},
    audioResponses: {},
    videoResponses: {},
    timings: [],
    events: [],
    trials: [],
    consentReceipt: receipt,
  };
}

export function participantConsentCopy(artifact: ConsentRuntimeArtifact): string {
  return [
    artifact.form.title,
    `Language: ${artifact.form.language}`,
    `Form checksum: ${artifact.form.checksum}`,
    `Consent artifact checksum: ${artifact.artifactChecksum}`,
    "",
    ...artifact.form.sections.flatMap((section) => [section.title, section.text, ""]),
    "Separate decisions",
    ...artifact.decisions.slice(1).flatMap((decision) => [decision.title, decision.participantText, ""]),
    "Questions",
    artifact.contactsText,
    "",
    "Stopping or withdrawing",
    artifact.withdrawal.method,
    artifact.withdrawal.dataBoundary,
    "",
    "Cerise acknowledgement receipts are local metadata records. They are not signatures, identity proof, institutional approval, or a legal determination.",
  ].join("\n");
}
