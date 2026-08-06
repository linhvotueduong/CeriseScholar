import type { StudySetting } from "./studyDesign";
import { contribution, type StudyBuildRegistryContribution } from "./studyBuildRegistry";

type ConcreteStudySetting = Exclude<StudySetting, "">;

export type StudySettingModuleRegistry = Readonly<Record<ConcreteStudySetting, StudyBuildRegistryContribution>>;

export const STUDY_SETTING_MODULE_REGISTRY: StudySettingModuleRegistry = {
  online: contribution({
    modules: [
      {
        id: "setting.online.responsive-layout",
        moduleKind: "responsive-layout",
        status: "required",
        sourceKinds: ["setting", "accessibility"],
        proposedBlockRoles: ["responsive-participant-screen"],
        proposedVariableRoles: [],
        rationale: "Unsupervised online participation must remain usable on declared mobile and desktop viewports.",
      },
      {
        id: "setting.online.interruption-recovery",
        moduleKind: "interruption-recovery",
        status: "recommended",
        sourceKinds: ["setting", "runtime"],
        proposedBlockRoles: ["checkpoint-and-recovery"],
        proposedVariableRoles: ["checkpoint-sequence", "resume-status"],
        rationale: "Home participation is vulnerable to refreshes, interruptions, connectivity changes, and accidental closure.",
      },
      {
        id: "setting.online.shared-device-privacy",
        moduleKind: "shared-device-privacy",
        status: "recommended",
        sourceKinds: ["setting", "participants"],
        proposedBlockRoles: ["privacy-guidance", "safe-exit"],
        proposedVariableRoles: [],
        rationale: "Participants may use shared devices or complete the study where other people can see or hear them.",
      },
      {
        id: "flow.participant-exit-support",
        moduleKind: "participant-exit-and-support",
        status: "required",
        sourceKinds: ["product-default", "setting", "participants"],
        proposedBlockRoles: ["participant-exit", "support-access"],
        proposedVariableRoles: ["completion-status"],
        rationale: "Participants must be able to stop safely and retain access to appropriate support or contact information.",
      },
    ],
    checks: [
      {
        id: "check.online.devices",
        level: "required",
        repairTarget: "participants",
        message: "Declare supported browsers, devices, input methods, bandwidth assumptions, and accessibility needs.",
        sourceKinds: ["setting", "participants", "accessibility"],
      },
      {
        id: "check.online.no-covert-monitoring",
        level: "required",
        repairTarget: "studio",
        message: "Do not enable fullscreen or focus-change monitoring by default; require scientific justification and later consent disclosure.",
        sourceKinds: ["setting", "participants"],
      },
      {
        id: "check.online.home-burden",
        level: "recommended",
        repairTarget: "studio",
        message: "Rehearse realistic home completion time, interruption recovery, privacy, and participant-controlled exit.",
        sourceKinds: ["setting", "participants"],
      },
    ],
    capabilityRequests: [
      {
        id: "responsive-participant-layout",
        requiredForRunnable: true,
        repairTarget: "studio",
        rationale: "The online/home setting requires a participant flow that reflows across declared devices.",
        sourceKinds: ["setting", "accessibility", "runtime"],
      },
      {
        id: "checkpoint-recovery",
        requiredForRunnable: false,
        repairTarget: "studio",
        rationale: "Recovery is recommended for unsupervised completion but must stay within current browser and Host limits.",
        sourceKinds: ["setting", "runtime"],
      },
    ],
  }),
  laboratory: contribution({
    modules: [
      {
        id: "setting.lab.researcher-handoff",
        moduleKind: "researcher-handoff",
        status: "required",
        sourceKinds: ["setting", "participants"],
        proposedBlockRoles: ["researcher-setup", "participant-handoff"],
        proposedVariableRoles: ["session-id"],
        rationale: "Laboratory studies need a clear boundary between researcher setup and the participant-facing flow.",
      },
      {
        id: "setting.lab.equipment-check",
        moduleKind: "equipment-readiness",
        status: "recommended",
        sourceKinds: ["setting", "participants", "runtime"],
        proposedBlockRoles: ["equipment-check", "calibration-check"],
        proposedVariableRoles: ["device-profile", "equipment-check-status"],
        rationale: "Room, display, input, audio, camera, peripheral, and calibration state can materially affect laboratory evidence.",
      },
      {
        id: "setting.lab.session-reset",
        moduleKind: "session-reset",
        status: "required",
        sourceKinds: ["setting", "runtime"],
        proposedBlockRoles: ["session-close", "next-participant-reset"],
        proposedVariableRoles: ["session-close-status"],
        rationale: "Each participant session must close cleanly without exposing prior responses or pilot state.",
      },
      {
        id: "flow.participant-exit-support",
        moduleKind: "participant-exit-and-support",
        status: "required",
        sourceKinds: ["product-default", "setting", "participants"],
        proposedBlockRoles: ["assisted-refusal", "assisted-withdrawal", "support-access"],
        proposedVariableRoles: ["completion-status"],
        rationale: "Laboratory staff must rehearse a respectful refusal and withdrawal path that does not pressure participants.",
      },
    ],
    checks: [
      {
        id: "check.lab.rehearsal",
        level: "required",
        repairTarget: "studio",
        message: "Rehearse researcher setup, participant handoff, refusal, withdrawal, session close, and reset on representative equipment.",
        sourceKinds: ["setting", "participants", "runtime"],
      },
      {
        id: "check.lab.timing-claims",
        level: "recommended",
        repairTarget: "studio",
        message: "Run timing diagnostics when latency matters and describe browser timing without certified-device claims.",
        sourceKinds: ["setting", "runtime"],
      },
    ],
    capabilityRequests: [{
      id: "researcher-led-session-handoff",
      requiredForRunnable: true,
      repairTarget: "studio",
      rationale: "The lab setting requires an explicit researcher setup and participant handoff workflow.",
      sourceKinds: ["setting", "runtime"],
    }],
  }),
  field: contribution({
    modules: [
      {
        id: "setting.field.context",
        moduleKind: "field-context",
        status: "required",
        sourceKinds: ["setting", "measures"],
        proposedBlockRoles: ["environment-context"],
        proposedVariableRoles: ["context-id", "environment-context"],
        rationale: "Field conditions can affect the evidence and need a bounded, study-justified context record.",
      },
      {
        id: "setting.field.device-readiness",
        moduleKind: "field-device-readiness",
        status: "required",
        sourceKinds: ["setting", "participants", "runtime"],
        proposedBlockRoles: ["battery-storage-permission-check"],
        proposedVariableRoles: ["device-readiness-status"],
        rationale: "Field collection must account for device battery, storage, permissions, and interruption risk.",
      },
      {
        id: "setting.field.bystander-privacy",
        moduleKind: "bystander-privacy",
        status: "required",
        sourceKinds: ["setting", "participants"],
        proposedBlockRoles: ["bystander-and-third-party-privacy"],
        proposedVariableRoles: [],
        rationale: "Field work may involve bystanders, third-party information, or spaces with changing privacy expectations.",
      },
      {
        id: "setting.field.interruption",
        moduleKind: "field-interruption-strategy",
        status: "required",
        sourceKinds: ["setting", "runtime"],
        proposedBlockRoles: ["interruption-and-recovery-plan"],
        proposedVariableRoles: ["interruption-status"],
        rationale: "The field workflow needs an explicit strategy for lost connectivity and interrupted sessions.",
      },
    ],
    checks: [
      {
        id: "check.field.connectivity",
        level: "required",
        repairTarget: "studio",
        message: "Choose a supported connected workflow or an approved external capture alternative; do not assume durable offline synchronization.",
        sourceKinds: ["setting", "runtime"],
      },
      {
        id: "check.field.privacy-safety",
        level: "required",
        repairTarget: "participants",
        message: "Resolve field permissions, safety, bystander privacy, third-party data, and the minimum necessary location/context collection.",
        sourceKinds: ["setting", "participants"],
      },
    ],
    capabilityRequests: [
      {
        id: "connected-field-collection",
        requiredForRunnable: true,
        repairTarget: "studio",
        rationale: "The current participant runtime can support bounded field collection when a suitable connection is available.",
        sourceKinds: ["setting", "runtime"],
      },
      {
        id: "durable-offline-synchronization",
        requiredForRunnable: false,
        repairTarget: "studio",
        rationale: "Field conditions may lose connectivity, but the current runtime must not claim durable offline synchronization.",
        sourceKinds: ["setting", "runtime"],
      },
    ],
  }),
  hybrid: contribution({
    modules: [
      {
        id: "setting.hybrid.branch",
        moduleKind: "setting-branch",
        status: "required",
        sourceKinds: ["setting"],
        proposedBlockRoles: ["setting-entry", "setting-branch"],
        proposedVariableRoles: ["setting-id"],
        rationale: "Hybrid does not mean generic defaults; every permitted setting needs an explicit entry or branch.",
      },
      {
        id: "setting.hybrid.shared-core",
        moduleKind: "shared-protocol-core",
        status: "required",
        sourceKinds: ["setting", "measures"],
        proposedBlockRoles: ["shared-protocol"],
        proposedVariableRoles: ["shared-measure-id"],
        rationale: "A shared protocol core preserves comparable measures and variable identity across settings.",
      },
      {
        id: "setting.hybrid.deviations",
        moduleKind: "setting-specific-deviations",
        status: "required",
        sourceKinds: ["setting", "design"],
        proposedBlockRoles: ["online-deviation", "lab-or-field-deviation"],
        proposedVariableRoles: ["setting-deviation-id"],
        rationale: "Setting-specific procedural differences must be named and reviewable rather than hidden in generic defaults.",
      },
      {
        id: "setting.hybrid.rehearsal",
        moduleKind: "per-setting-rehearsal",
        status: "required",
        sourceKinds: ["setting", "runtime"],
        proposedBlockRoles: ["per-setting-readiness-check"],
        proposedVariableRoles: ["setting-readiness-status"],
        rationale: "Each permitted setting requires its own device, support, privacy, and execution rehearsal.",
      },
    ],
    checks: [
      {
        id: "check.hybrid.explicit-branches",
        level: "required",
        repairTarget: "studio",
        message: "Define the shared core, every permitted setting branch, and each named procedural deviation.",
        sourceKinds: ["setting", "design", "measures"],
      },
      {
        id: "check.hybrid.comparability",
        level: "required",
        repairTarget: "measures",
        message: "Verify comparable measure identity and disclose analytically important setting differences.",
        sourceKinds: ["setting", "measures"],
      },
    ],
    capabilityRequests: [{
      id: "hybrid-setting-branches",
      requiredForRunnable: true,
      repairTarget: "studio",
      rationale: "The selected setting requires explicit, testable branches rather than one generic participant flow.",
      sourceKinds: ["setting", "runtime"],
    }],
  }),
};

export function getStudySettingContribution(
  setting: ConcreteStudySetting,
): StudyBuildRegistryContribution {
  return STUDY_SETTING_MODULE_REGISTRY[setting];
}
