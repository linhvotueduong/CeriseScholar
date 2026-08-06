import type { ConsentPhase5Document } from "./consentPhase5";
import {
  createConsentPhase6State,
  normalizeConsentPhase6State,
  type ConsentPhase6Artifact,
  type ConsentPhase6ArtifactKind,
  type ConsentPhase6ModuleId,
  type ConsentPhase6OptionalChoice,
  type ConsentPhase6State,
} from "./consentPhase6Model";
import { compileConsentPhase8AndDependencies } from "./consentPhase8";

export type ConsentPhase6IssueSeverity = "blocking" | "warning" | "advisory";

export interface ConsentPhase6Issue {
  id: string;
  severity: ConsentPhase6IssueSeverity;
  repairTarget: "module" | "artifact" | "governance";
  moduleId: ConsentPhase6ModuleId;
  artifactId?: string;
  message: string;
}

export interface ConsentPhase6ModuleDefinition {
  id: ConsentPhase6ModuleId;
  label: string;
  detail: string;
  authorityNote: string;
}

export const CONSENT_PHASE_6_MODULES: readonly ConsentPhase6ModuleDefinition[] = [
  {
    id: "behavioral",
    label: "Behavioral task & randomization",
    detail: "Assignment, task burden, stopping rules, and participant-facing task risks.",
    authorityNote: "Study implementation can suggest this module; the researcher determines its final participant-facing content.",
  },
  {
    id: "focus-group",
    label: "Focus-group confidentiality",
    detail: "Group privacy limits, moderator safeguards, participant reminders, and recording boundaries.",
    authorityNote: "Researchers can promise their own safeguards, not that other participants will keep discussion confidential.",
  },
  {
    id: "disclosure-debrief",
    label: "Incomplete disclosure & debrief",
    detail: "Necessity, alternatives, approval evidence, debrief timing, and post-debrief data choice.",
    authorityNote: "Selecting an experiment design never authorizes incomplete disclosure or deception.",
  },
  {
    id: "recording-boundaries",
    label: "Recording boundaries",
    detail: "Research use, access, retention, destruction, teaching, presentations, and public use.",
    authorityNote: "Uses beyond the research protocol may require a separate participant choice or release.",
  },
  {
    id: "telephone",
    label: "Telephone consent",
    detail: "Separate eligibility-screening and main-study scripts with distinct data contracts.",
    authorityNote: "Screening agreement and main-study consent are different participant decisions.",
  },
  {
    id: "lifecycle",
    label: "Recontact & changed information",
    detail: "Ongoing willingness, new-information triggers, addenda, and full renewed consent.",
    authorityNote: "Cerise records a human disposition for each change; it does not decide when renewed consent is required.",
  },
  {
    id: "optional-choices",
    label: "Optional sub-studies",
    detail: "Independent choices for optional activities, data uses, or ancillary research.",
    authorityNote: "A participant can decline an independent optional activity without being recorded as declining the main study.",
  },
] as const;

export function getConsentPhase6Module(
  state: ConsentPhase6State,
  moduleId: ConsentPhase6ModuleId,
) {
  return ({
    behavioral: state.behavioral,
    "focus-group": state.focusGroup,
    "disclosure-debrief": state.disclosure,
    "recording-boundaries": state.recording,
    telephone: state.telephone,
    lifecycle: state.lifecycle,
    "optional-choices": state.optionalChoices,
  } as const)[moduleId];
}

function fact(document: ConsentPhase5Document, id: string): string {
  return document.studyFacts.find((item) => item.id === id)?.value ?? "";
}

export function collectConsentPhase6Suggestions(document: ConsentPhase5Document): ConsentPhase6ModuleId[] {
  const result: ConsentPhase6ModuleId[] = [];
  if (/random assignment/i.test(fact(document, "fact-assignment")) || /experiment/i.test(fact(document, "fact-design"))) {
    result.push("behavioral");
  }
  if (!/^No audio or video/i.test(fact(document, "fact-recording"))) result.push("recording-boundaries");
  if (/longitudinal|repeated|follow-up|panel/i.test(`${fact(document, "fact-design")} ${fact(document, "fact-procedure")}`)) {
    result.push("lifecycle");
  }
  return result;
}

function mergeArtifact(
  current: ReadonlyMap<string, ConsentPhase6Artifact>,
  draft: Omit<ConsentPhase6Artifact, "reviewState">,
): ConsentPhase6Artifact {
  const existing = current.get(draft.id);
  const changed = Boolean(existing && (
    existing.kind !== draft.kind
    || existing.title !== draft.title
    || existing.decisionMode !== draft.decisionMode
    || existing.participantText !== draft.participantText
    || existing.sourceModuleId !== draft.sourceModuleId
    || existing.authorityReference !== draft.authorityReference
  ));
  return {
    ...draft,
    reviewState: changed ? "human-review-required" : existing?.reviewState ?? "human-review-required",
  };
}

function optionalChoiceArtifact(choice: ConsentPhase6OptionalChoice): Omit<ConsentPhase6Artifact, "reviewState"> {
  return {
    id: `phase6-optional-${choice.id}`,
    kind: "optional-choice",
    title: choice.title || "Optional research choice",
    decisionMode: "separate-optional-choice",
    participantText: [choice.participantText, choice.dataUse, choice.retentionOrDestruction].filter(Boolean).join("\n\n"),
    sourceModuleId: "optional-choices",
    authorityReference: choice.authorityReference,
  };
}

export function compileConsentPhase6Artifacts(state: ConsentPhase6State): ConsentPhase6Artifact[] {
  const current = new Map(state.artifacts.map((artifact) => [artifact.id, artifact]));
  const drafts: Array<Omit<ConsentPhase6Artifact, "reviewState">> = [];
  if (state.behavioral.applicability === "applicable") {
    drafts.push({
      id: "phase6-behavioral-disclosure",
      kind: "behavioral-disclosure",
      title: "Behavioral task and assignment information",
      decisionMode: "information-only",
      participantText: [state.behavioral.assignmentDisclosure, state.behavioral.taskRisks, state.behavioral.stoppingRules].filter(Boolean).join("\n\n"),
      sourceModuleId: "behavioral",
      authorityReference: state.behavioral.authorityReference,
    });
  }
  if (state.focusGroup.applicability === "applicable") {
    drafts.push({
      id: "phase6-focus-group-information",
      kind: "focus-group-information",
      title: "Focus-group privacy and confidentiality limits",
      decisionMode: "information-only",
      participantText: [
        state.focusGroup.researcherSafeguards,
        "The research team will ask everyone to respect the privacy of the group, but cannot guarantee that other participants will keep the discussion confidential.",
        state.focusGroup.participantReminder,
      ].filter(Boolean).join("\n\n"),
      sourceModuleId: "focus-group",
      authorityReference: state.focusGroup.authorityReference,
    });
  }
  if (state.disclosure.applicability === "applicable" && state.disclosure.mode !== "full-disclosure" && state.disclosure.debrief.determination === "required") {
    drafts.push({
      id: "phase6-debrief",
      kind: "debrief",
      title: "Study debrief",
      decisionMode: "information-only",
      participantText: state.disclosure.debrief.participantText,
      sourceModuleId: "disclosure-debrief",
      authorityReference: state.disclosure.approvalReference,
    });
  }
  if (state.telephone.applicability === "applicable") {
    if (state.telephone.pathways.includes("eligibility-screening")) {
      drafts.push({
        id: "phase6-telephone-screening",
        kind: "telephone-screening-script",
        title: "Telephone eligibility-screening script",
        decisionMode: "separate-optional-choice",
        participantText: state.telephone.screeningScript,
        sourceModuleId: "telephone",
        authorityReference: state.telephone.authorityReference,
      });
    }
    if (state.telephone.pathways.includes("main-study")) {
      drafts.push({
        id: "phase6-telephone-main-study",
        kind: "telephone-main-study-script",
        title: "Telephone main-study consent script",
        decisionMode: "main-participation",
        participantText: state.telephone.mainStudyScript,
        sourceModuleId: "telephone",
        authorityReference: state.telephone.authorityReference,
      });
    }
  }
  const addendumTriggers = state.lifecycle.triggers.filter((trigger) => (
    trigger.humanDisposition === "changed-information-addendum"
    || trigger.humanDisposition === "full-reconsent"
  ));
  const reconsentTriggers = state.lifecycle.triggers.filter((trigger) => trigger.humanDisposition === "full-reconsent");
  const addendumAuthority = [...new Set(addendumTriggers.map((trigger) => trigger.authorityReference).filter(Boolean))].join("; ");
  const reconsentAuthority = [...new Set(reconsentTriggers.map((trigger) => trigger.authorityReference).filter(Boolean))].join("; ");
  if (state.lifecycle.applicability === "applicable" && state.lifecycle.changedInformationText && addendumTriggers.length > 0) {
    drafts.push({
      id: "phase6-changed-information",
      kind: "changed-information-addendum",
      title: "Changed information addendum",
      decisionMode: "information-only",
      participantText: state.lifecycle.changedInformationText,
      sourceModuleId: "lifecycle",
      authorityReference: addendumAuthority || state.lifecycle.authorityReference,
    });
  }
  if (state.lifecycle.applicability === "applicable" && reconsentTriggers.length > 0) {
    drafts.push({
      id: "phase6-reconsent",
      kind: "reconsent",
      title: "Renewed consent for changed study information",
      decisionMode: "main-participation",
      participantText: state.lifecycle.changedInformationText,
      sourceModuleId: "lifecycle",
      authorityReference: reconsentAuthority || state.lifecycle.authorityReference,
    });
  }
  if (state.optionalChoices.applicability === "applicable") {
    drafts.push(...state.optionalChoices.choices.map(optionalChoiceArtifact));
  }
  return drafts.map((draft) => mergeArtifact(current, draft));
}

function recordingParticipantText(state: ConsentPhase6State): string {
  const useBoundary = state.recording.nonResearchUse === "none"
    ? "The recording will not be used for teaching, presentations, or public use."
    : `Any ${state.recording.nonResearchUse.replaceAll("-", " ")} use is governed by a separate participant release (${state.recording.separateReleaseReference || "reference pending"}).`;
  const declineBoundary = state.recording.mayDeclineAndContinueMainStudy === "yes"
    ? "You may decline recording and still continue the main study."
    : state.recording.mayDeclineAndContinueMainStudy === "no-by-human-determination"
      ? "Recording is required for this study under the recorded human determination. You may decline the study."
      : "Whether recording may be declined without leaving the main study has not yet been determined.";
  return [
    state.recording.researchUse,
    state.recording.accessPlan,
    state.recording.retentionOrDestruction,
    useBoundary,
    declineBoundary,
  ].filter(Boolean).join(" ");
}

function synchronizeRecordingForms(
  document: ConsentPhase5Document,
  state: ConsentPhase6State,
): Pick<ConsentPhase5Document, "forms" | "inputs"> {
  if (state.recording.applicability !== "applicable") {
    return { forms: document.forms, inputs: document.inputs };
  }
  const compiledText = recordingParticipantText(state);
  const decisionMode = state.recording.mayDeclineAndContinueMainStudy === "no-by-human-determination"
    ? "separate-required-choice" as const
    : "separate-optional-choice" as const;
  return {
    inputs: {
      ...document.inputs,
      recordingPurpose: state.recording.researchUse,
      recordingAccessAndUse: [state.recording.accessPlan, state.recording.nonResearchUse === "none"
        ? "No teaching, presentation, or public use."
        : `${state.recording.nonResearchUse.replaceAll("-", " ")} use requires the separate release recorded in ${state.recording.separateReleaseReference || "the pending determination"}.`].filter(Boolean).join(" "),
      recordingRetention: state.recording.retentionOrDestruction,
    },
    forms: document.forms.map((form) => {
      if (form.kind !== "audio-recording-choice" && form.kind !== "video-recording-choice") return form;
      return {
        ...form,
        decisionMode,
        clauses: form.clauses.map((clause) => {
          if (clause.kind !== "audio-recording-choice" && clause.kind !== "video-recording-choice") return clause;
          const sourceChanged = clause.lastCompiledText !== compiledText;
          return {
            ...clause,
            text: clause.researcherEdited ? clause.text : compiledText,
            lastCompiledText: compiledText,
            reviewState: sourceChanged ? "human-review-required" as const : clause.reviewState,
          };
        }),
      };
    }),
  };
}

export function updateConsentPhase6State(
  document: ConsentPhase5Document,
  updater: (state: ConsentPhase6State) => ConsentPhase6State,
  updatedAt = new Date().toISOString(),
): ConsentPhase5Document {
  const candidate = updater(structuredClone(document.phase6));
  const normalized = normalizeConsentPhase6State(candidate);
  if (!normalized) throw new Error("The Phase 6 consent module update is invalid.");
  normalized.artifacts = compileConsentPhase6Artifacts(normalized);
  const recording = synchronizeRecordingForms(document, normalized);
  const next = {
    ...document,
    ...recording,
    phase6: normalized,
    versions: [],
    exports: [],
    updatedAt,
  };
  return compileConsentPhase8AndDependencies(next);
}

export function reviewConsentPhase6Artifact(
  document: ConsentPhase5Document,
  artifactId: string,
  reviewState: ConsentPhase6Artifact["reviewState"],
  updatedAt = new Date().toISOString(),
): ConsentPhase5Document {
  return updateConsentPhase6State(document, (state) => ({
    ...state,
    artifacts: state.artifacts.map((artifact) => artifact.id === artifactId ? { ...artifact, reviewState } : artifact),
  }), updatedAt);
}

function pushMissing(
  issues: ConsentPhase6Issue[],
  moduleId: ConsentPhase6ModuleId,
  key: string,
  value: string,
  message: string,
) {
  if (!value.trim()) issues.push({ id: `phase6-${moduleId}-${key}`, severity: "blocking", repairTarget: "module", moduleId, message });
}

export function collectConsentPhase6Issues(document: ConsentPhase5Document): ConsentPhase6Issue[] {
  const state = document.phase6;
  const issues: ConsentPhase6Issue[] = [];
  const suggested = collectConsentPhase6Suggestions(document);
  for (const moduleId of suggested) {
    if (getConsentPhase6Module(state, moduleId).applicability === "not-configured") {
      issues.push({
        id: `phase6-${moduleId}-suggested-not-resolved`,
        severity: "warning",
        repairTarget: "module",
        moduleId,
        message: `${CONSENT_PHASE_6_MODULES.find((module) => module.id === moduleId)?.label} is suggested by implemented study facts. Record whether it applies.`,
      });
    }
  }
  for (const definition of CONSENT_PHASE_6_MODULES) {
    const moduleState = getConsentPhase6Module(state, definition.id);
    if (moduleState.applicability === "applicable" && moduleState.determinationSource === "none") {
      issues.push({ id: `phase6-${definition.id}-source`, severity: "blocking", repairTarget: "module", moduleId: definition.id, message: `Record who determined that ${definition.label.toLowerCase()} applies.` });
    }
    if (moduleState.applicability === "applicable" && !moduleState.authorityReference) {
      issues.push({ id: `phase6-${definition.id}-reference`, severity: "blocking", repairTarget: "module", moduleId: definition.id, message: `Record the protocol, institutional, or researcher determination reference for ${definition.label.toLowerCase()}.` });
    }
  }
  if (state.behavioral.applicability === "applicable") {
    pushMissing(issues, "behavioral", "assignment", state.behavioral.assignmentDisclosure, "Explain participant-facing assignment or randomization.");
    pushMissing(issues, "behavioral", "risks", state.behavioral.taskRisks, "Describe behavioral task risks and discomforts.");
    pushMissing(issues, "behavioral", "stopping", state.behavioral.stoppingRules, "Describe task stopping, pause, or withdrawal rules.");
  }
  if (state.focusGroup.applicability === "applicable") {
    pushMissing(issues, "focus-group", "safeguards", state.focusGroup.researcherSafeguards, "Describe safeguards controlled by the research team.");
    if (!state.focusGroup.confidentialityLimitAcknowledged) {
      issues.push({ id: "phase6-focus-group-limit", severity: "blocking", repairTarget: "module", moduleId: "focus-group", message: "Acknowledge that the research team cannot guarantee confidentiality by other focus-group participants." });
    }
    const forbiddenGuarantee = /(?:guarantee|ensure|promise).{0,40}(?:participants?|members?|everyone).{0,40}(?:confidential|private)|(?:participants?|members?|everyone).{0,40}(?:will always|are guaranteed to).{0,20}(?:keep|remain).{0,20}(?:confidential|private)/i;
    if (forbiddenGuarantee.test(`${state.focusGroup.researcherSafeguards} ${state.focusGroup.participantReminder}`)) {
      issues.push({ id: "phase6-focus-group-false-guarantee", severity: "blocking", repairTarget: "module", moduleId: "focus-group", message: "Focus-group wording cannot promise that other participants will keep the discussion confidential." });
    }
  }
  if (state.disclosure.applicability === "applicable") {
    const altered = state.disclosure.mode !== "full-disclosure";
    if (altered) {
      pushMissing(issues, "disclosure-debrief", "necessity", state.disclosure.scientificNecessity, "Explain the scientific necessity for incomplete disclosure or deception.");
      pushMissing(issues, "disclosure-debrief", "alternatives", state.disclosure.alternativesConsidered, "Document less-restrictive alternatives considered.");
      pushMissing(issues, "disclosure-debrief", "withheld", state.disclosure.withheldInformation, "Describe the information that would be withheld or altered.");
      if (state.disclosure.undisclosedRiskDeclaration !== "no-undisclosed-risk") {
        issues.push({ id: "phase6-disclosure-undisclosed-risk", severity: "blocking", repairTarget: "module", moduleId: "disclosure-debrief", message: "Incomplete disclosure cannot pass the authoring gate until undisclosed risks are resolved by the applicable human authority." });
      }
      if (state.disclosure.willingnessImpactDeclaration !== "does-not-affect-willingness") {
        issues.push({ id: "phase6-disclosure-willingness", severity: "blocking", repairTarget: "module", moduleId: "disclosure-debrief", message: "Record the human determination about whether withheld information could affect willingness to participate." });
      }
      if (state.disclosure.waiverOrAlterationStatus !== "approved" || !state.disclosure.approvalReference) {
        issues.push({ id: "phase6-disclosure-approval", severity: "blocking", repairTarget: "governance", moduleId: "disclosure-debrief", message: "Requested or proposed incomplete disclosure remains blocked until the applicable human approval and reference are recorded." });
      }
      if (state.disclosure.debrief.determination === "not-determined") {
        issues.push({ id: "phase6-debrief-undetermined", severity: "blocking", repairTarget: "module", moduleId: "disclosure-debrief", message: "Record a human determination that debriefing is required or document the authority-approved reason it is not required." });
      } else if (state.disclosure.debrief.determination === "required") {
        if (state.disclosure.debrief.timing === "not-determined") {
          issues.push({ id: "phase6-debrief-timing", severity: "blocking", repairTarget: "module", moduleId: "disclosure-debrief", message: "Set the human-reviewed debrief timing." });
        }
        pushMissing(issues, "disclosure-debrief", "debrief-method", state.disclosure.debrief.deliveryMethod, "Describe how the debrief will be delivered.");
        pushMissing(issues, "disclosure-debrief", "debrief-text", state.disclosure.debrief.participantText, "Draft the participant debrief artifact.");
        if (state.disclosure.debrief.dataUseChoice === "not-determined") {
          issues.push({ id: "phase6-debrief-data-choice", severity: "blocking", repairTarget: "module", moduleId: "disclosure-debrief", message: "Record the human determination about a post-debrief data-use choice." });
        }
      } else if (!state.disclosure.debrief.determinationReference || !state.disclosure.debrief.exceptionRationale) {
        issues.push({ id: "phase6-debrief-exception-reference", severity: "blocking", repairTarget: "governance", moduleId: "disclosure-debrief", message: "A no-debrief decision requires the applicable human determination reference and rationale." });
      }
    }
    if (state.disclosure.consentProcess === "waiver-of-consent-proposed" && (state.disclosure.consentWaiverStatus !== "approved" || !state.disclosure.consentWaiverReference)) {
      issues.push({ id: "phase6-consent-waiver-approval", severity: "blocking", repairTarget: "governance", moduleId: "disclosure-debrief", message: "A waiver of the consent process is distinct from a waiver of signed documentation and remains blocked until its own human approval is recorded." });
    }
  }
  if (state.recording.applicability === "applicable") {
    pushMissing(issues, "recording-boundaries", "use", state.recording.researchUse, "Describe the permitted research use of recordings.");
    pushMissing(issues, "recording-boundaries", "access", state.recording.accessPlan, "Describe who can access recordings.");
    pushMissing(issues, "recording-boundaries", "retention", state.recording.retentionOrDestruction, "Describe recording retention or destruction.");
    if (state.recording.mayDeclineAndContinueMainStudy === "not-determined") {
      issues.push({ id: "phase6-recording-decline-path", severity: "blocking", repairTarget: "module", moduleId: "recording-boundaries", message: "Record whether declining recording permits continued main-study participation." });
    }
    if (state.recording.nonResearchUse !== "none" && (!state.recording.separateReleaseRequired || !state.recording.separateReleaseReference)) {
      issues.push({ id: "phase6-recording-nonresearch-release", severity: "blocking", repairTarget: "governance", moduleId: "recording-boundaries", message: "Teaching, presentation, or public recording use requires a separate-release determination and reference." });
    }
  }
  if (state.telephone.applicability === "applicable") {
    if (state.telephone.pathways.length === 0) {
      issues.push({ id: "phase6-telephone-pathway", severity: "blocking", repairTarget: "module", moduleId: "telephone", message: "Select telephone eligibility screening, main-study consent, or both." });
    }
    if (state.telephone.pathways.includes("eligibility-screening")) {
      pushMissing(issues, "telephone", "screen-purpose", state.telephone.screeningPurpose, "Describe the purpose of telephone eligibility screening.");
      pushMissing(issues, "telephone", "screen-retention", state.telephone.screeningDataRetention, "Describe retention of screening information.");
      pushMissing(issues, "telephone", "screen-deletion", state.telephone.screeningDataDeletion, "Describe deletion handling for ineligible or declining people.");
      pushMissing(issues, "telephone", "screen-script", state.telephone.screeningScript, "Draft a distinct eligibility-screening script.");
    }
    if (state.telephone.pathways.includes("main-study")) pushMissing(issues, "telephone", "main-script", state.telephone.mainStudyScript, "Draft a distinct main-study telephone consent script.");
    if (!state.telephone.agreementBeforeSubstantiveQuestions) {
      issues.push({ id: "phase6-telephone-agreement", severity: "blocking", repairTarget: "module", moduleId: "telephone", message: "The telephone flow must obtain agreement before substantive research or screening questions." });
    }
    pushMissing(issues, "telephone", "questions", state.telephone.questionOpportunity, "Describe the participant's opportunity to ask questions.");
    pushMissing(issues, "telephone", "copy", state.telephone.copyDeliveryPlan, "Describe how the participant can receive the current information or consent copy.");
    pushMissing(issues, "telephone", "documentation", state.telephone.discussionDocumentationPlan, "Describe how the consent discussion and issues are documented.");
  }
  if (state.lifecycle.applicability === "applicable") {
    pushMissing(issues, "lifecycle", "recontact", state.lifecycle.recontactPlan, "Describe whether and why participants will be recontacted.");
    pushMissing(issues, "lifecycle", "willingness", state.lifecycle.ongoingWillingnessCheck, "Describe how ongoing willingness and withdrawal will be checked.");
    for (const trigger of state.lifecycle.triggers) {
      if (!trigger.description || !trigger.affectedParticipants || trigger.humanDisposition === "not-determined" || !trigger.authorityReference) {
        issues.push({ id: `phase6-lifecycle-trigger-${trigger.id}`, severity: "blocking", repairTarget: "module", moduleId: "lifecycle", message: `Changed-information trigger “${trigger.description || trigger.id}” needs affected participants, a human disposition, and its authority reference.` });
      }
    }
    if (state.lifecycle.triggers.some((trigger) => ["changed-information-addendum", "full-reconsent"].includes(trigger.humanDisposition)) && !state.lifecycle.changedInformationText) {
      issues.push({ id: "phase6-lifecycle-addendum", severity: "blocking", repairTarget: "artifact", moduleId: "lifecycle", message: "Draft changed-information participant text for the selected addendum or renewed-consent path." });
    }
  }
  if (state.optionalChoices.applicability === "applicable") {
    if (state.optionalChoices.choices.length === 0) {
      issues.push({ id: "phase6-optional-empty", severity: "blocking", repairTarget: "module", moduleId: "optional-choices", message: "Add at least one independently decidable optional research choice." });
    }
    for (const choice of state.optionalChoices.choices) {
      if (!choice.title || !choice.purpose || !choice.participantText || !choice.dataUse || !choice.retentionOrDestruction) {
        issues.push({ id: `phase6-optional-${choice.id}-content`, severity: "blocking", repairTarget: "module", moduleId: "optional-choices", message: `Optional choice “${choice.title || choice.id}” needs purpose, participant text, data use, and retention or destruction.` });
      }
      if (choice.declineOutcome === "stop-main-study-by-human-determination" && !choice.authorityReference) {
        issues.push({ id: `phase6-optional-${choice.id}-decline`, severity: "blocking", repairTarget: "governance", moduleId: "optional-choices", message: `Optional choice “${choice.title || choice.id}” cannot stop main-study participation without a recorded human determination.` });
      }
    }
  }
  for (const artifact of state.artifacts) {
    if (!artifact.participantText) {
      issues.push({ id: `phase6-artifact-${artifact.id}-empty`, severity: "blocking", repairTarget: "artifact", moduleId: artifact.sourceModuleId, artifactId: artifact.id, message: `${artifact.title} has no participant-facing text.` });
    }
    if (artifact.reviewState !== "human-reviewed") {
      issues.push({ id: `phase6-artifact-${artifact.id}-review`, severity: "blocking", repairTarget: "artifact", moduleId: artifact.sourceModuleId, artifactId: artifact.id, message: `${artifact.title} requires explicit human review for this study.` });
    }
  }
  const order = { blocking: 0, warning: 1, advisory: 2 } as const;
  return issues.sort((left, right) => order[left.severity] - order[right.severity] || left.id.localeCompare(right.id));
}

export function phase6ParticipantPreview(document: ConsentPhase5Document, artifactId: string): string {
  const artifact = document.phase6.artifacts.find((item) => item.id === artifactId);
  return artifact ? `${artifact.title}\n\n${artifact.participantText}` : "No Phase 6 participant artifact has been compiled.";
}

export function createPhase6OptionalChoice(index: number): ConsentPhase6OptionalChoice {
  return {
    id: `choice-${index}`,
    title: "",
    purpose: "",
    participantText: "",
    dataUse: "",
    retentionOrDestruction: "",
    declineOutcome: "continue-main-study",
    authorityReference: "",
    reviewState: "not-reviewed",
  };
}

export function migrateConsentPhase6State(value: unknown): ConsentPhase6State {
  return normalizeConsentPhase6State(value) ?? createConsentPhase6State();
}

export function consentPhase6ArtifactFamily(kind: ConsentPhase6ArtifactKind): string {
  return kind.replaceAll("-", " ");
}
