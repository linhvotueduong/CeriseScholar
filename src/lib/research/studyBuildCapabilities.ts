import type { StudyCapabilityStatus } from "./studyBuildProfile";

export interface StudyRuntimeCapabilityDefinition {
  id: string;
  status: StudyCapabilityStatus;
  currentBoundary: string;
  boundedAlternative: string;
  evidence: string;
}

export type StudyCapabilityRegistry = Readonly<Record<string, StudyRuntimeCapabilityDefinition>>;

/**
 * Versioned description of what Experiment Studio v8 and the Local Research
 * Host can honestly execute today. Updating a status changes compiler source
 * fingerprints and therefore requires a reviewed Phase 2+ capability update.
 */
export const STUDY_RUNTIME_CAPABILITY_REGISTRY_VERSION = 1 as const;

export const STUDY_RUNTIME_CAPABILITY_REGISTRY: StudyCapabilityRegistry = {
  "participant-refusal-and-exit": {
    id: "participant-refusal-and-exit",
    status: "supported",
    currentBoundary: "Consent refusal and participant-ended sessions terminate the local runner without continuing through study blocks.",
    boundedAlternative: "None required for the currently supported local runner path.",
    evidence: "Experiment Studio consent blocks, participant-ended events, and runner completion states.",
  },
  "responsive-forms-and-branching": {
    id: "responsive-forms-and-branching",
    status: "supported",
    currentBoundary: "Rating, single-choice, long-text, keyboard, and deterministic response routing are supported in the current responsive runner.",
    boundedAlternative: "Complex survey widgets must be represented with supported controls or deferred.",
    evidence: "Experiment Studio v8 response types, branch rules, and responsive runner styles.",
  },
  "simple-random-assignment": {
    id: "simple-random-assignment",
    status: "supported",
    currentBoundary: "Deterministic weighted random assignment across named conditions is supported.",
    boundedAlternative: "Use an external institution-approved service for stratified, covariate-adaptive, response-adaptive, or concealed allocation beyond this simple model.",
    evidence: "Experiment Studio v8 condition weights, preview seed, and runner assignment receipt.",
  },
  "condition-specific-flow": {
    id: "condition-specific-flow",
    status: "supported",
    currentBoundary: "Condition-aware branch rules and condition-filtered trial rows are supported.",
    boundedAlternative: "Procedures that cannot be represented by deterministic condition branches must be authored and run outside the current runner.",
    evidence: "Experiment Studio v8 branch rules and trial-table condition mapping.",
  },
  "repeated-trial-loops": {
    id: "repeated-trial-loops",
    status: "supported",
    currentBoundary: "Fixed, shuffled, and rotated trial-table repetitions are supported within one participant session.",
    boundedAlternative: "Use explicit blocks or an approved external runtime for adaptive or cross-session loops.",
    evidence: "Experiment Studio v8 trial loops and deterministic trial materialization.",
  },
  "counterbalanced-condition-orders": {
    id: "counterbalanced-condition-orders",
    status: "supported-with-limits",
    currentBoundary: "Rotated trial order is available, but general condition-sequence counterbalancing is not a first-class assignment mode.",
    boundedAlternative: "Materialize approved condition orders explicitly and verify balance outside the runner, or use a supported trial-table rotation when scientifically appropriate.",
    evidence: "Experiment Studio v8 fixed, shuffle, and rotate trial orders; assignment supports only single or random.",
  },
  "naturally-occurring-group-mapping": {
    id: "naturally-occurring-group-mapping",
    status: "supported-with-limits",
    currentBoundary: "Existing group or exposure can be collected as a response and used in deterministic routing, but there is no dedicated quasi-experimental group workflow.",
    boundedAlternative: "Use a validated response or researcher-entered mapping and verify that no runtime text claims randomization.",
    evidence: "Experiment Studio v8 response variables and branch rules.",
  },
  "cross-session-participant-identity": {
    id: "cross-session-participant-identity",
    status: "unsupported",
    currentBoundary: "The current runner creates a new local session identity and does not provide a privacy-reviewed cross-session participant identity service.",
    boundedAlternative: "Author and export separate release-bound waves, then use an institution-approved identity/linkage workflow outside Cerise until this capability is implemented and reviewed.",
    evidence: "Current runner session IDs and absence of a governed cross-session identity contract.",
  },
  "scheduling-reminders-and-recontact": {
    id: "scheduling-reminders-and-recontact",
    status: "unsupported",
    currentBoundary: "Cerise does not currently schedule participant waves, send reminders, or govern recontact details.",
    boundedAlternative: "Plan and export waves in Cerise, but schedule and recontact participants through an institution-approved system; do not label the Cerise package a runnable multi-wave study.",
    evidence: "No scheduling, reminder, or recontact runtime exists in Experiment Studio v8 or Local Research Host.",
  },
  "structured-observer-workflow": {
    id: "structured-observer-workflow",
    status: "supported-with-limits",
    currentBoundary: "Supported response blocks can capture structured observer entries, but dedicated interval timers, multi-observer identity, and reliability workflows are not first-class runtime features.",
    boundedAlternative: "Use an explicit supported coding form for one observer per session and calculate reliability in the analysis workflow, or export the protocol to a validated observation tool.",
    evidence: "Experiment Studio v8 response controls, timestamps, and current absence of observer-specific identity and interval tooling.",
  },
  "individual-qualitative-session": {
    id: "individual-qualitative-session",
    status: "supported-with-limits",
    currentBoundary: "Long-text and bounded same-Mac audio/video responses are supported for individual sessions; remote synchronous interviewing, focus-group identity, and multi-party recording consent are not.",
    boundedAlternative: "Use individual text or same-Mac recorded responses within current limits, or author/export the protocol for an institution-approved interview or focus-group platform.",
    evidence: "Experiment Studio v8 text/audio/video blocks and Local Research Host media boundaries.",
  },
  "mixed-methods-integration-metadata": {
    id: "mixed-methods-integration-metadata",
    status: "authoring-export-only",
    currentBoundary: "The participant runtime can execute supported quantitative and qualitative blocks, while sequence, priority, linkage, and integration metadata remain planning and analysis artifacts.",
    boundedAlternative: "Run supported participant procedures and carry the reviewed integration plan into Cerise analysis; do not claim that the runner performs methodological integration.",
    evidence: "Current Study Studio runtime and separate Cerise quantitative and qualitative analysis lanes.",
  },
  "responsive-participant-layout": {
    id: "responsive-participant-layout",
    status: "supported",
    currentBoundary: "The runner reflows participant screens for declared desktop and compact mobile viewports.",
    boundedAlternative: "Restrict supported devices if a custom stimulus or response cannot pass representative-device rehearsal.",
    evidence: "Current runner responsive styles and participant-screen layout.",
  },
  "checkpoint-recovery": {
    id: "checkpoint-recovery",
    status: "supported-with-limits",
    currentBoundary: "Same-browser recovery uses bounded local IndexedDB and Host checkpoints; it is not a cross-device or identity-linked resume service.",
    boundedAlternative: "Use one-session completion, document the same-device recovery boundary, or use an approved external longitudinal platform for cross-device resume.",
    evidence: "Runner recovery database and Local Research Host checkpoint endpoint.",
  },
  "researcher-led-session-handoff": {
    id: "researcher-led-session-handoff",
    status: "supported",
    currentBoundary: "A researcher can prepare the local runner, hand it to a participant, close the session, and start a new local session.",
    boundedAlternative: "Use a written external operating procedure for equipment or room steps that are not represented in the runner.",
    evidence: "Local Research Host pilot/production modes, session lifecycle, and export checks.",
  },
  "connected-field-collection": {
    id: "connected-field-collection",
    status: "supported-with-limits",
    currentBoundary: "The local web runner can collect a bounded session in a field setting when the required local/host connection and device permissions remain available.",
    boundedAlternative: "Restrict the field protocol to verified connected conditions or export it to an institution-approved field platform.",
    evidence: "Local runner and Host session/checkpoint behavior; no durable remote/offline sync claim.",
  },
  "durable-offline-synchronization": {
    id: "durable-offline-synchronization",
    status: "unsupported",
    currentBoundary: "The runner does not provide conflict-safe durable offline synchronization across devices or collection sites.",
    boundedAlternative: "Require a verified connection or use an institution-approved offline-capable platform; do not market the Cerise flow as offline collection.",
    evidence: "Current Local Research Host and checkpoint architecture has no offline replication protocol.",
  },
  "hybrid-setting-branches": {
    id: "hybrid-setting-branches",
    status: "supported-with-limits",
    currentBoundary: "Deterministic setting branches can be authored, but multi-entry deployment, cross-setting identity, and per-setting release orchestration are not first-class capabilities.",
    boundedAlternative: "Create explicit release-bound branches or separate setting-specific candidates and reconcile their measures manually.",
    evidence: "Experiment Studio v8 branch rules and current single-package runner lifecycle.",
  },
  "baseline-accessible-controls": {
    id: "baseline-accessible-controls",
    status: "supported",
    currentBoundary: "The code-native runner supports semantic form controls, keyboard interaction, reflow, and reduced-motion styling, subject to study-specific rehearsal.",
    boundedAlternative: "Constrain the supported participant/device profile or supply an approved accessible alternative when a study-specific stimulus or timing requirement cannot be accommodated.",
    evidence: "Current semantic form controls, responsive CSS, keyboard response handling, and reduced-motion styles.",
  },
};

export function getStudyRuntimeCapability(
  id: string,
): StudyRuntimeCapabilityDefinition | null {
  return STUDY_RUNTIME_CAPABILITY_REGISTRY[id] ?? null;
}
