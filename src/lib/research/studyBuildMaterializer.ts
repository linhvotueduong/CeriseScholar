import { diffResearchArtifacts } from "./artifactCompiler";
import { sha256ArtifactChecksum, type ResearchArtifactChecksum } from "./artifactIdentity";
import {
  EXPERIMENT_STUDIO_SCHEMA_VERSION,
  createExperimentBlock,
  createExperimentBranchRule,
  createExperimentCondition,
  validateExperimentStudio,
  type ExperimentBlock,
  type ExperimentBlockType,
  type ExperimentBranchRule,
  type ExperimentCondition,
  type ExperimentStudioDocument,
} from "./experimentStudio";
import { canCompleteStudyStep, type ResearchQuestionPlan, type StudyDesignDocument } from "./studyDesign";
import type {
  StudyBuildModuleRecommendation,
  StudyBuildProfile,
} from "./studyBuildProfile";

export const STUDY_BUILD_MATERIALIZER_VERSION = 2 as const;
export const STUDY_BUILD_CREATION_RECEIPT_SCHEMA_VERSION = 1 as const;
export const MAX_STUDY_BUILD_DECISION_NOTE_LENGTH = 2_000;

export type StudyBuildSlice =
  | "online-survey"
  | "randomized-laboratory"
  | "phase-4-composable"
  | "longitudinal-authoring-only";
export type StudyBuildDecisionAction = "accept" | "modify" | "decline" | "defer";

export interface StudyBuildRecommendationDecision {
  recommendationId: string;
  action: StudyBuildDecisionAction;
  note: string;
}

export interface StudyBuildMaterializationChange {
  id: string;
  kind: "block" | "branch" | "condition" | "execution" | "runtime-boundary";
  path: string;
  summary: string;
  recommendationIds: string[];
}

export interface StudyBuildSelectionIssue {
  id: string;
  recommendationId?: string;
  message: string;
}

export interface StudyBuildMaterializationPreview {
  slice: StudyBuildSlice | null;
  candidate: ExperimentStudioDocument | null;
  candidateChecksum: ResearchArtifactChecksum | null;
  profileChecksum: ResearchArtifactChecksum;
  changes: StudyBuildMaterializationChange[];
  exactChangedPaths: string[];
  issues: StudyBuildSelectionIssue[];
  validationErrors: string[];
  canCreate: boolean;
}

export interface StudyBuildMaterializationInput {
  profile: StudyBuildProfile;
  studyDesign: StudyDesignDocument;
  projectName: string;
  decisions: readonly StudyBuildRecommendationDecision[];
  createdAt: string;
  existingDocument: boolean;
}

export interface StudyBuildCreationReceipt {
  schemaVersion: typeof STUDY_BUILD_CREATION_RECEIPT_SCHEMA_VERSION;
  materializerVersion: typeof STUDY_BUILD_MATERIALIZER_VERSION;
  projectId: string;
  createdAt: string;
  slice: StudyBuildSlice;
  profileChecksum: ResearchArtifactChecksum;
  candidateChecksum: ResearchArtifactChecksum;
  sourceFingerprintChecksum: ResearchArtifactChecksum;
  decisions: StudyBuildRecommendationDecision[];
  changes: StudyBuildMaterializationChange[];
  integrityClaim: "checksums-prove-content-identity-not-scientific-ethics-or-release-approval";
}

interface StorageLike {
  setItem(key: string, value: string): void;
}

function cleanNote(note: string): string {
  return note.trim().replace(/\s+/g, " ").slice(0, MAX_STUDY_BUILD_DECISION_NOTE_LENGTH);
}

function safeToken(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return normalized || fallback;
}

function decisionMap(decisions: readonly StudyBuildRecommendationDecision[]) {
  return new Map(decisions.map((decision) => [decision.recommendationId, {
    ...decision,
    note: cleanNote(decision.note),
  }]));
}

function included(
  decisions: ReadonlyMap<string, StudyBuildRecommendationDecision>,
  recommendationId: string,
): boolean {
  const action = decisions.get(recommendationId)?.action;
  return action === "accept" || action === "modify";
}

function addBlock(
  blocks: ExperimentBlock[],
  type: ExperimentBlockType,
  id: string,
  patch: Partial<ExperimentBlock> = {},
): ExperimentBlock {
  const block = { ...createExperimentBlock(type, id), ...patch };
  blocks.push(block);
  return block;
}

function measureBlockType(question: ResearchQuestionPlan): ExperimentBlockType {
  const measure = question.measure.toLocaleLowerCase();
  if (/open|free.?text|written|narrative|comment/.test(measure)) return "text";
  if (/single.?choice|multiple.?choice|categor|yes.?no|binary/.test(measure)) return "single-choice";
  return "rating";
}

function addQuestionBlocks(
  blocks: ExperimentBlock[],
  questions: readonly ResearchQuestionPlan[],
  prefix: string,
): ExperimentBlock[] {
  const idPrefix = prefix.replaceAll("_", "-");
  return questions.filter((question) => question.question.trim()).map((question, index) => {
    const type = measureBlockType(question);
    const variableName = safeToken(question.id, `${prefix}_${index + 1}`);
    const stableQuestionId = safeToken(question.id, String(index + 1)).replaceAll("_", "-");
    const block = addBlock(blocks, type, `block-${idPrefix}-${stableQuestionId}`, {
      title: question.construct.trim() || `Measure ${index + 1}`,
      internalName: `${prefix}_${index + 1}`,
      heading: question.construct.trim() || `Measure ${index + 1}`,
      prompt: question.question.trim(),
      variableName,
      required: true,
    });
    if (type === "single-choice") {
      block.choices = ["Option one — replace with the approved response", "Option two — replace with the approved response"];
    }
    return block;
  });
}

function parseConditionNames(value: string): string[] {
  const names = value
    .split(/[;,\n]/)
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 12);
  return [...new Set(names.map((name) => name.toLocaleLowerCase()))]
    .map((normalized) => names.find((name) => name.toLocaleLowerCase() === normalized)!)
    .slice(0, 12);
}

function parseConditionWeights(value: string, count: number): number[] {
  const weights = value.split(/[:;,\s]+/).map(Number).filter((weight) => Number.isInteger(weight) && weight > 0 && weight <= 100);
  return weights.length === count ? weights : Array.from({ length: count }, () => 1);
}

function hasValidConditionWeights(value: string, count: number): boolean {
  const weights = value.split(/[:;,\s]+/).map(Number).filter((weight) => Number.isInteger(weight) && weight > 0 && weight <= 100);
  return weights.length === count;
}

function change(
  id: string,
  kind: StudyBuildMaterializationChange["kind"],
  path: string,
  summary: string,
  ...recommendationIds: string[]
): StudyBuildMaterializationChange {
  return { id, kind, path, summary, recommendationIds };
}

export function resolveStudyBuildSlice(profile: StudyBuildProfile): StudyBuildSlice | null {
  if (profile.designKind === "cross-sectional-survey" && profile.setting === "online") return "online-survey";
  if (profile.designKind === "randomized-between" && profile.setting === "laboratory") return "randomized-laboratory";
  if (profile.designKind === "longitudinal") return "longitudinal-authoring-only";
  return "phase-4-composable";
}

export function suggestedStudyBuildDecision(
  recommendation: StudyBuildModuleRecommendation,
): StudyBuildDecisionAction {
  if (recommendation.status === "unsupported") return "defer";
  if (recommendation.selectionDefault === "include") return "accept";
  if (recommendation.selectionDefault === "configure") return "modify";
  return "decline";
}

export function collectStudyBuildSelectionIssues(
  profile: StudyBuildProfile,
  studyDesign: StudyDesignDocument,
  decisions: readonly StudyBuildRecommendationDecision[],
  existingDocument: boolean,
): StudyBuildSelectionIssue[] {
  const issues: StudyBuildSelectionIssue[] = [];
  const byId = decisionMap(decisions);
  const slice = resolveStudyBuildSlice(profile);
  if (existingDocument) {
    issues.push({ id: "existing-studio", message: "An Experimental Studio document already exists. Phase 3 never regenerates over existing work." });
  }
  for (const stepId of ["stage-03-step-01", "stage-03-step-02", "stage-03-step-03"]) {
    if (!canCompleteStudyStep(studyDesign.spec, stepId)) {
      issues.push({ id: `source-${stepId}`, message: `Finish the required decisions in ${stepId.replace("stage-03-step-0", "Step 0")} before creating a study draft.` });
    }
  }
  for (const conflict of profile.conflicts) {
    issues.push({ id: conflict.id, message: conflict.message });
  }
  for (const finding of profile.capabilityFindings.filter((item) => item.severity === "blocking")) {
    issues.push({ id: finding.id, message: finding.message });
  }
  if (profile.designKind === "randomized-between") {
    const conditionNames = parseConditionNames(studyDesign.spec.participants.conditions);
    if (conditionNames.length < 2) {
      issues.push({ id: "source-randomized-conditions", message: "Return to Step 03 and define at least two distinct named conditions before creating a randomized study." });
    }
    if (!studyDesign.spec.participants.allocationMethod.trim()) {
      issues.push({ id: "source-randomized-allocation-method", message: "Return to Step 03 and define the random allocation method before creating a randomized study." });
    }
    if (conditionNames.length >= 2 && !hasValidConditionWeights(studyDesign.spec.participants.allocationRatio, conditionNames.length)) {
      issues.push({ id: "source-randomized-allocation-ratio", message: `Return to Step 03 and define ${conditionNames.length} positive allocation weights, such as ${Array.from({ length: conditionNames.length }, () => "1").join(":")}.` });
    }
  }
  if (profile.designKind === "within-subjects") {
    const conditionNames = parseConditionNames(studyDesign.spec.participants.conditions);
    if (conditionNames.length < 2) {
      issues.push({ id: "source-within-conditions", message: "Return to Step 03 and define at least two repeated conditions before creating a within-subjects study." });
    }
    if (!studyDesign.spec.participants.counterbalancing.trim()) {
      issues.push({ id: "source-within-order", message: "Return to Step 03 and define or justify the condition-order strategy before creating a within-subjects study." });
    }
  }
  if (profile.designKind === "quasi-experimental") {
    if (parseConditionNames(studyDesign.spec.participants.conditions).length < 2) {
      issues.push({ id: "source-quasi-groups", message: "Return to Step 03 and name at least two naturally occurring groups or exposure states. Cerise will not invent or randomly assign them." });
    }
  }
  if (profile.designKind === "mixed-methods") {
    const active = studyDesign.spec.researchQuestions.filter((question) => question.question.trim());
    if (!active.some((question) => question.constructRole === "qualitative-concept")) {
      issues.push({ id: "source-mixed-qualitative-lane", message: "Return to Step 02 and map at least one research question to a qualitative concept before creating a mixed-methods study." });
    }
    if (!active.some((question) => question.constructRole !== "qualitative-concept")) {
      issues.push({ id: "source-mixed-quantitative-lane", message: "Return to Step 02 and map at least one research question to a quantitative construct before creating a mixed-methods study." });
    }
  }
  if (profile.setting === "hybrid" && studyDesign.spec.design.hybridSettings.length < 2) {
    issues.push({ id: "source-hybrid-settings", message: "Return to Step 01 and choose at least two concrete settings for the hybrid branch." });
  }
  if (slice === "longitudinal-authoring-only") {
    issues.push({
      id: "source-longitudinal-runtime-boundary",
      message: "Cerise can author and export a longitudinal wave plan, but cannot create a runnable multi-wave draft until a reviewed identity, scheduling, reminder, and recontact service is available.",
    });
  }
  for (const recommendation of profile.modules) {
    const decision = byId.get(recommendation.id);
    if (!decision) {
      issues.push({
        id: `decision-missing-${recommendation.id}`,
        recommendationId: recommendation.id,
        message: `Choose accept, modify, decline, or defer for ${recommendation.id}.`,
      });
      continue;
    }
    if (decision.action === "modify" && !decision.note) {
      issues.push({
        id: `modify-note-${recommendation.id}`,
        recommendationId: recommendation.id,
        message: `Describe the intended modification for ${recommendation.id}.`,
      });
    }
    if (recommendation.status === "required" && (decision.action === "decline" || decision.action === "defer")) {
      issues.push({
        id: `required-excluded-${recommendation.id}`,
        recommendationId: recommendation.id,
        message: `${recommendation.id} is required for this starting study. Accept it or choose Modify and record the intended change.`,
      });
    }
    if (recommendation.status === "unsupported" && (decision.action === "accept" || decision.action === "modify")) {
      issues.push({
        id: `unsupported-included-${recommendation.id}`,
        recommendationId: recommendation.id,
        message: `${recommendation.id} cannot be included because the current runtime does not support it.`,
      });
    }
  }
  return issues;
}

function surveyCandidate(
  input: StudyBuildMaterializationInput,
  decisions: ReadonlyMap<string, StudyBuildRecommendationDecision>,
): { document: ExperimentStudioDocument; changes: StudyBuildMaterializationChange[] } {
  const blocks: ExperimentBlock[] = [];
  const changes: StudyBuildMaterializationChange[] = [];
  if (included(decisions, "flow.welcome")) {
    addBlock(blocks, "welcome", "block-welcome", {
      title: "Welcome and participant support",
      internalName: "welcome_and_support",
      heading: "Welcome to this survey",
      prompt: "Review the approved study introduction here. Participation is voluntary; you may stop at any time. Add the approved research-team contact and support route before release.",
    });
    changes.push(change("add-welcome", "block", "/blocks/block-welcome", "Add a welcome screen with voluntary-exit and support placeholders.", "flow.welcome", "flow.participant-exit-support"));
  }
  if (included(decisions, "flow.consent-reference")) {
    addBlock(blocks, "consent", "block-consent-reference", {
      title: "Consent form binding point",
      internalName: "later_bound_consent",
      heading: "Consent form will be added in Step 05",
      prompt: "This is a binding point, not approved consent language. Add and verify the applicable consent or information form in Step 05 before pilot export.",
      variableName: "participation_decision",
      choices: ["Continue after the approved form is bound", "Do not participate"],
    });
    changes.push(change("add-consent-reference", "block", "/blocks/block-consent-reference", "Reserve a refusal-safe binding point for the Step 05 consent artifact; no consent language is generated.", "flow.consent-reference"));
  }
  if (included(decisions, "setting.online.shared-device-privacy")) {
    addBlock(blocks, "instructions", "block-home-privacy", {
      title: "Home and shared-device privacy",
      internalName: "home_privacy_guidance",
      heading: "Choose a suitable place and device",
      prompt: "Add study-specific guidance about privacy, shared devices, interruptions, sound, and how to exit safely without submitting a partial response.",
    });
    changes.push(change("add-home-privacy", "block", "/blocks/block-home-privacy", "Add editable shared-device and home privacy guidance.", "setting.online.shared-device-privacy", "flow.participant-exit-support"));
  }
  if (included(decisions, "participants.flow-and-eligibility")) {
    addBlock(blocks, "instructions", "block-eligibility-handoff", {
      title: "Eligibility handoff",
      internalName: "eligibility_handoff",
      heading: "Eligibility must match the approved participant plan",
      prompt: "Add only the approved eligibility or researcher-screening workflow. Do not collect unnecessary sensitive information here.",
    });
    changes.push(change("add-eligibility-handoff", "block", "/blocks/block-eligibility-handoff", "Add a bounded eligibility handoff without inventing screening criteria.", "participants.flow-and-eligibility"));
  }
  if (included(decisions, "design.survey.measure-sections")) {
    addBlock(blocks, "instructions", "block-survey-instructions", {
      title: "Survey instructions",
      internalName: "survey_instructions",
      heading: "How to complete this survey",
      prompt: "Answer each item using the approved response options. Optional items must remain visibly optional, and you may stop at any time.",
    });
    const questionBlocks = addQuestionBlocks(blocks, input.studyDesign.spec.researchQuestions, "survey_measure");
    changes.push(change("add-survey-sections", "block", "/blocks/survey-measures", `Add survey instructions and ${questionBlocks.length} source-linked measure block${questionBlocks.length === 1 ? "" : "s"}.`, "design.survey.measure-sections", "measures.evidence-map"));
  }
  if (included(decisions, "design.survey.skip-logic")) {
    const routing = addBlock(blocks, "single-choice", "block-survey-routing", {
      title: "Configurable skip-logic question",
      internalName: "survey_routing_question",
      heading: "Replace with the approved routing question",
      prompt: "Configure this item and destination from the approved measure plan before release.",
      variableName: "survey_route",
      choices: ["This applies to me", "This does not apply to me"],
      required: true,
    });
    changes.push(change("add-survey-routing", "block", `/blocks/${routing.id}`, "Add one clearly marked routing template for researcher configuration.", "design.survey.skip-logic"));
  }
  if (included(decisions, "design.survey.demographics")) {
    addBlock(blocks, "single-choice", "block-optional-demographic", {
      title: "Optional demographic item",
      internalName: "optional_demographic",
      heading: "Add only a justified demographic item",
      prompt: "Replace this placeholder with an approved, analysis-justified question or remove the block.",
      variableName: "optional_demographic",
      choices: ["Approved response option", "Prefer not to answer"],
      required: false,
    });
    changes.push(change("add-demographic-placeholder", "block", "/blocks/block-optional-demographic", "Add one optional demographic placeholder with a prefer-not-to-answer option.", "design.survey.demographics"));
  }
  if (included(decisions, "flow.debrief-and-close")) {
    addBlock(blocks, "debrief", "block-debrief", {
      title: "Debrief and submit",
      internalName: "debrief_and_submit",
      heading: "Thank you",
      prompt: "Add the approved debrief, withdrawal-after-participation instructions, research contact, and submission confirmation before release.",
    });
    changes.push(change("add-debrief", "block", "/blocks/block-debrief", "Add a debrief and explicit study-close placeholder.", "flow.debrief-and-close"));
  }

  const branchRules = [];
  if (blocks.some((block) => block.id === "block-survey-routing") && blocks.some((block) => block.id === "block-debrief")) {
    const rule = createExperimentBranchRule("branch-survey-not-applicable", "block-survey-routing", "block-debrief");
    rule.operator = "equals";
    rule.value = "This does not apply to me";
    branchRules.push(rule);
    changes.push(change("add-survey-skip-rule", "branch", "/branchRules/branch-survey-not-applicable", "Route the not-applicable template response to the debrief; researcher configuration is still required.", "design.survey.skip-logic"));
  }
  changes.push(change("configure-online-execution", "execution", "/execution", "Keep back navigation available and disable fullscreen and focus-change monitoring by default for home participation.", "setting.online.responsive-layout", "accessibility.participant-flow"));
  if (included(decisions, "setting.online.interruption-recovery")) {
    changes.push(change("declare-checkpoint-boundary", "runtime-boundary", "/runtime/checkpoint-recovery", "Use the release-bound local checkpoint capability; no durable offline synchronization is claimed.", "setting.online.interruption-recovery"));
  }

  return {
    document: {
      schemaVersion: EXPERIMENT_STUDIO_SCHEMA_VERSION,
      projectId: input.studyDesign.projectId,
      title: `${input.projectName} — online survey draft`,
      updatedAt: input.createdAt,
      blocks,
      conditions: [createExperimentCondition("condition-all", "All participants")],
      assignment: { method: "single", previewSeed: 492_810 },
      branchRules,
      execution: { allowBackNavigation: true, requireFullscreen: false, logFocusChanges: false },
      trialTables: [],
      timingDiagnostic: null,
    },
    changes,
  };
}

function laboratoryCandidate(
  input: StudyBuildMaterializationInput,
  decisions: ReadonlyMap<string, StudyBuildRecommendationDecision>,
): { document: ExperimentStudioDocument; changes: StudyBuildMaterializationChange[] } {
  const blocks: ExperimentBlock[] = [];
  const changes: StudyBuildMaterializationChange[] = [];
  if (included(decisions, "flow.welcome")) {
    addBlock(blocks, "welcome", "block-welcome", {
      title: "Welcome and participant support",
      internalName: "welcome_and_support",
      heading: "Welcome to this laboratory study",
      prompt: "The researcher will explain the session handoff. Participation is voluntary; you may refuse or stop without penalty. Add approved contact and support details before release.",
    });
    changes.push(change("add-lab-welcome", "block", "/blocks/block-welcome", "Add a laboratory welcome with voluntary-exit and support placeholders.", "flow.welcome", "flow.participant-exit-support"));
  }
  if (included(decisions, "setting.lab.researcher-handoff")) {
    addBlock(blocks, "instructions", "block-researcher-handoff", {
      title: "Researcher setup and handoff",
      internalName: "researcher_handoff",
      heading: "Researcher setup before participant handoff",
      prompt: "Confirm the approved eligibility process, correct study, room, device, session identifier, and researcher script. Then hand control to the participant without displaying prior session data.",
    });
    changes.push(change("add-researcher-handoff", "block", "/blocks/block-researcher-handoff", "Add a researcher setup, eligibility confirmation, and participant-handoff checkpoint.", "setting.lab.researcher-handoff", "participants.flow-and-eligibility"));
  }
  if (included(decisions, "flow.consent-reference")) {
    addBlock(blocks, "consent", "block-consent-reference", {
      title: "Consent form binding point",
      internalName: "later_bound_consent",
      heading: "Consent form will be added in Step 05",
      prompt: "This is a binding point, not approved consent language. Add and verify the applicable consent form in Step 05 before pilot export.",
      variableName: "participation_decision",
      choices: ["Continue after the approved form is bound", "Do not participate"],
    });
    changes.push(change("add-consent-reference", "block", "/blocks/block-consent-reference", "Reserve a refusal-safe binding point for the Step 05 consent artifact; no consent language is generated.", "flow.consent-reference"));
  }
  if (included(decisions, "setting.lab.equipment-check")) {
    addBlock(blocks, "instructions", "block-equipment-check", {
      title: "Equipment and room check",
      internalName: "equipment_check",
      heading: "Confirm equipment readiness",
      prompt: "Verify the approved display, input device, audio or camera permissions if applicable, room conditions, calibration state, and accessibility accommodations before the participant begins.",
    });
    changes.push(change("add-equipment-check", "block", "/blocks/block-equipment-check", "Add an editable room, device, calibration, and accommodation check.", "setting.lab.equipment-check"));
  }

  const conditionNames = parseConditionNames(input.studyDesign.spec.participants.conditions);
  const safeNames = conditionNames.length >= 2 ? conditionNames : ["Condition A", "Condition B"];
  const weights = parseConditionWeights(input.studyDesign.spec.participants.allocationRatio, safeNames.length);
  const conditions = safeNames.map((name, index) => ({
    ...createExperimentCondition(`condition-${index + 1}`, name),
    weight: weights[index] ?? 1,
  }));
  if (included(decisions, "design.randomized.allocation")) {
    changes.push(change("configure-random-allocation", "condition", "/conditions", `Create ${conditions.length} named conditions with the declared allocation weights and deterministic random assignment.`, "design.randomized.allocation"));
  }

  const branchRules = [];
  if (included(decisions, "design.randomized.condition-routing")) {
    addBlock(blocks, "single-choice", "block-condition-router", {
      title: "Start assigned condition",
      internalName: "condition_router",
      heading: "Ready to begin the assigned task?",
      prompt: "The assignment is already determined. Choose Start to open the assigned condition, or end this session.",
      variableName: "condition_start_decision",
      choices: ["Start assigned task", "End this session"],
      required: true,
    });
    for (const [index, condition] of conditions.entries()) {
      addBlock(blocks, "instructions", `block-condition-${index + 1}`, {
        title: `${condition.name} instructions`,
        internalName: `condition_${index + 1}_instructions`,
        heading: `${condition.name} procedure`,
        prompt: "Replace this placeholder with the approved condition-specific instructions and stimuli. Keep all unintended differences controlled.",
        nextBlockId: "block-condition-task",
      });
      const rule = createExperimentBranchRule(`branch-${condition.id}`, "block-condition-router", `block-condition-${index + 1}`);
      rule.conditionId = condition.id;
      rule.operator = "equals";
      rule.value = "Start assigned task";
      branchRules.push(rule);
    }
    changes.push(change("add-condition-routing", "branch", "/branchRules/condition-routing", `Add condition-aware routing to ${conditions.length} editable procedure branches.`, "design.randomized.condition-routing"));
    addBlock(blocks, "keyboard-response", "block-condition-task", {
      title: "Condition task trial",
      internalName: "condition_task_trial",
      heading: "Complete the assigned task",
      prompt: "Replace this bounded keyboard trial with the approved task or import a reviewed trial table in Experimental Studio.",
      variableName: "condition_task_response",
      responseDeadlineMs: 2_000,
      allowedKeys: ["f", "j"],
    });
    changes.push(change("add-condition-task", "block", "/blocks/block-condition-task", "Add one bounded task-trial starter shared by the assigned condition routes.", "design.randomized.condition-routing"));
  }
  if (included(decisions, "design.randomized.manipulation-check")) {
    addBlock(blocks, "rating", "block-manipulation-check", {
      title: "Manipulation check",
      internalName: "manipulation_check",
      heading: "Configure the approved manipulation check",
      prompt: "Replace this placeholder with the approved item that measures whether the intended condition difference was experienced.",
      variableName: "manipulation_check",
    });
    changes.push(change("add-manipulation-check", "block", "/blocks/block-manipulation-check", "Add an editable manipulation-check measure after the condition task.", "design.randomized.manipulation-check"));
  }
  if (included(decisions, "design.randomized.outcomes")) {
    const questionBlocks = addQuestionBlocks(blocks, input.studyDesign.spec.researchQuestions, "outcome");
    changes.push(change("add-lab-outcomes", "block", "/blocks/outcomes", `Add ${questionBlocks.length} comparable source-linked outcome block${questionBlocks.length === 1 ? "" : "s"} after assignment.`, "design.randomized.outcomes", "measures.evidence-map"));
  }
  if (included(decisions, "flow.debrief-and-close")) {
    addBlock(blocks, "debrief", "block-debrief", {
      title: "Debrief and session close",
      internalName: "debrief_and_session_close",
      heading: "Thank you",
      prompt: "Add the approved debrief and withdrawal instructions. Return the device to the researcher so the session can close and reset without exposing prior data.",
    });
    changes.push(change("add-lab-debrief", "block", "/blocks/block-debrief", "Add a debrief that hands the device back for a clean session close.", "flow.debrief-and-close", "setting.lab.session-reset"));
  }
  if (blocks.some((block) => block.id === "block-condition-router") && blocks.some((block) => block.id === "block-debrief")) {
    const endRule = createExperimentBranchRule("branch-end-lab-session", "block-condition-router", "block-debrief");
    endRule.operator = "equals";
    endRule.value = "End this session";
    branchRules.push(endRule);
    changes.push(change("add-session-end-route", "branch", "/branchRules/branch-end-lab-session", "Route the participant-controlled stop choice to the session close.", "flow.participant-exit-support", "setting.lab.session-reset"));
  }
  changes.push(change("configure-lab-execution", "execution", "/execution", "Disable back navigation during condition execution; keep fullscreen and focus monitoring off until scientifically justified and disclosed.", "setting.lab.researcher-handoff", "accessibility.participant-flow"));
  if (included(decisions, "setting.lab.session-reset")) {
    changes.push(change("declare-session-reset-boundary", "runtime-boundary", "/runtime/session-reset", "Require rehearsal of response clearing and next-participant reset before a pilot candidate can be frozen.", "setting.lab.session-reset"));
  }

  return {
    document: {
      schemaVersion: EXPERIMENT_STUDIO_SCHEMA_VERSION,
      projectId: input.studyDesign.projectId,
      title: `${input.projectName} — randomized laboratory draft`,
      updatedAt: input.createdAt,
      blocks,
      conditions,
      assignment: { method: "random", previewSeed: 492_810 },
      branchRules,
      execution: { allowBackNavigation: false, requireFullscreen: false, logFocusChanges: false },
      trialTables: [],
      timingDiagnostic: null,
    },
    changes,
  };
}

function addCommonFlow(
  blocks: ExperimentBlock[],
  changes: StudyBuildMaterializationChange[],
  decisions: ReadonlyMap<string, StudyBuildRecommendationDecision>,
) {
  if (included(decisions, "flow.welcome")) {
    addBlock(blocks, "welcome", "block-welcome", {
      title: "Welcome and participant support",
      internalName: "welcome_and_support",
      heading: "Welcome",
      prompt: "Add the approved study introduction, voluntary participation statement, research contact, and support route before release. Participants may stop at any time.",
    });
    changes.push(change("add-welcome", "block", "/blocks/block-welcome", "Add a source-linked welcome, voluntary-exit, and support placeholder.", "flow.welcome", "flow.participant-exit-support"));
  }
  if (included(decisions, "flow.consent-reference")) {
    addBlock(blocks, "consent", "block-consent-reference", {
      title: "Consent form binding point",
      internalName: "later_bound_consent",
      heading: "Consent form will be added in Step 05",
      prompt: "This is a binding point, not approved consent language. Add and verify the applicable consent or information form in Step 05 before pilot export.",
      variableName: "participation_decision",
      choices: ["Continue after the approved form is bound", "Do not participate"],
    });
    changes.push(change("add-consent-reference", "block", "/blocks/block-consent-reference", "Reserve a refusal-safe binding point for the Step 05 consent artifact; no consent language is generated.", "flow.consent-reference"));
  }
  if (included(decisions, "participants.flow-and-eligibility")) {
    addBlock(blocks, "instructions", "block-eligibility-handoff", {
      title: "Participant entry and eligibility",
      internalName: "eligibility_handoff",
      heading: "Eligibility must match the approved participant plan",
      prompt: "Add only the approved eligibility or researcher-screening workflow. Do not collect unnecessary sensitive information in this placeholder.",
    });
    changes.push(change("add-eligibility-handoff", "block", "/blocks/block-eligibility-handoff", "Add a bounded participant-entry handoff without inventing screening criteria.", "participants.flow-and-eligibility"));
  }
}

function addSettingOverlay(
  input: StudyBuildMaterializationInput,
  blocks: ExperimentBlock[],
  branchRules: ExperimentBranchRule[],
  changes: StudyBuildMaterializationChange[],
  decisions: ReadonlyMap<string, StudyBuildRecommendationDecision>,
): ExperimentStudioDocument["execution"] {
  const setting = input.profile.setting;
  if (setting === "online") {
    if (included(decisions, "setting.online.shared-device-privacy")) {
      addBlock(blocks, "instructions", "block-online-privacy", {
        title: "Home and shared-device privacy",
        internalName: "online_privacy_guidance",
        heading: "Choose a suitable place and device",
        prompt: "Add study-specific guidance for shared devices, privacy, interruptions, sound, and safe exit without submitting an incomplete response.",
      });
      changes.push(change("add-online-privacy", "block", "/blocks/block-online-privacy", "Add editable online/home privacy and safe-exit guidance.", "setting.online.shared-device-privacy"));
    }
    changes.push(change("configure-online-execution", "execution", "/execution", "Keep back navigation available; fullscreen and focus-change monitoring remain off by default.", "setting.online.responsive-layout", "accessibility.participant-flow"));
    if (included(decisions, "setting.online.interruption-recovery")) {
      changes.push(change("declare-online-recovery-boundary", "runtime-boundary", "/runtime/checkpoint-recovery", "Declare same-browser checkpoint recovery without claiming cross-device or durable offline synchronization.", "setting.online.interruption-recovery"));
    }
    return { allowBackNavigation: true, requireFullscreen: false, logFocusChanges: false };
  }
  if (setting === "laboratory") {
    if (included(decisions, "setting.lab.researcher-handoff")) {
      addBlock(blocks, "instructions", "block-researcher-handoff", {
        title: "Researcher setup and handoff",
        internalName: "researcher_handoff",
        heading: "Researcher setup before participant handoff",
        prompt: "Confirm the approved eligibility process, study version, room, device, session identifier, and researcher script before handing control to the participant.",
      });
      changes.push(change("add-researcher-handoff", "block", "/blocks/block-researcher-handoff", "Add a laboratory setup and participant-handoff boundary.", "setting.lab.researcher-handoff"));
    }
    if (included(decisions, "setting.lab.equipment-check")) {
      addBlock(blocks, "instructions", "block-equipment-check", {
        title: "Equipment and room readiness",
        internalName: "equipment_readiness",
        heading: "Verify the approved equipment profile",
        prompt: "Check the room, display, input, audio, camera, peripherals, timing assumptions, and required accommodations before the participant begins.",
      });
      changes.push(change("add-equipment-check", "block", "/blocks/block-equipment-check", "Add an editable room, equipment, and accommodation check.", "setting.lab.equipment-check"));
    }
    changes.push(change("declare-lab-reset-boundary", "runtime-boundary", "/runtime/session-reset", "Require rehearsal of clean session close and next-participant reset.", "setting.lab.session-reset"));
    return { allowBackNavigation: false, requireFullscreen: false, logFocusChanges: false };
  }
  if (setting === "field") {
    if (included(decisions, "setting.field.device-readiness")) {
      addBlock(blocks, "instructions", "block-field-readiness", {
        title: "Field device readiness",
        internalName: "field_device_readiness",
        heading: "Verify this connected field session",
        prompt: "Confirm battery, storage, required permissions, the approved connection, safe location, and interruption plan. This flow does not provide durable offline synchronization.",
      });
      changes.push(change("add-field-readiness", "block", "/blocks/block-field-readiness", "Add a connected field-device and interruption readiness boundary.", "setting.field.device-readiness", "setting.field.interruption"));
    }
    if (included(decisions, "setting.field.bystander-privacy")) {
      addBlock(blocks, "instructions", "block-field-privacy", {
        title: "Bystander and third-party privacy",
        internalName: "field_bystander_privacy",
        heading: "Protect people and information around the session",
        prompt: "Add the approved field permissions, bystander or third-party handling, minimum necessary context collection, and safe stop procedure.",
      });
      changes.push(change("add-field-privacy", "block", "/blocks/block-field-privacy", "Add an explicit bystander, third-party, and field-safety boundary.", "setting.field.bystander-privacy"));
    }
    changes.push(change("declare-field-connectivity-boundary", "runtime-boundary", "/runtime/field-connectivity", "Require verified connected conditions or an approved external platform; no offline replication claim is made.", "setting.field.interruption"));
    return { allowBackNavigation: true, requireFullscreen: false, logFocusChanges: false };
  }

  const selectedSettings = input.studyDesign.spec.design.hybridSettings;
  if (included(decisions, "setting.hybrid.branch")) {
    const labels: Record<(typeof selectedSettings)[number], string> = {
      online: "Online / participant home",
      laboratory: "Research laboratory",
      field: "Field / real-world setting",
    };
    const entry = addBlock(blocks, "single-choice", "block-hybrid-setting-entry", {
      title: "Hybrid setting entry",
      internalName: "hybrid_setting_entry",
      heading: "Confirm the approved setting for this session",
      prompt: "Select the setting already assigned through the approved recruitment and session workflow. This selection does not assign a study condition.",
      variableName: "session_setting",
      choices: selectedSettings.map((item) => labels[item]),
      required: true,
    });
    selectedSettings.forEach((item) => {
      const settingBlock = addBlock(blocks, "instructions", `block-hybrid-${item}`, {
        title: `${labels[item]} procedure`,
        internalName: `hybrid_${item}_procedure`,
        heading: `${labels[item]} instructions`,
        prompt: "Define only the approved setting-specific deviation here. Shared measures and stable variable identities remain in the common protocol that follows.",
      });
      const rule = createExperimentBranchRule(`branch-hybrid-${item}`, entry.id, settingBlock.id);
      rule.value = labels[item];
      branchRules.push(rule);
    });
    changes.push(change("add-hybrid-branches", "branch", "/branchRules/hybrid-settings", `Add ${selectedSettings.length} named setting branches with one shared protocol core.`, "setting.hybrid.branch", "setting.hybrid.shared-core", "setting.hybrid.deviations"));
  }
  changes.push(change("declare-hybrid-boundary", "runtime-boundary", "/runtime/hybrid-orchestration", "Keep shared measure identity while requiring separate rehearsal and release review for each selected setting.", "setting.hybrid.rehearsal"));
  return { allowBackNavigation: true, requireFullscreen: false, logFocusChanges: false };
}

function addStableQuestionBlocks(
  blocks: ExperimentBlock[],
  questions: readonly ResearchQuestionPlan[],
  prefix: string,
  forceType?: ExperimentBlockType,
) {
  return questions.filter((question) => question.question.trim()).map((question, index) => {
    const idToken = safeToken(question.id, `${prefix}_${index + 1}`).replaceAll("_", "-");
    const type = forceType ?? measureBlockType(question);
    const block = addBlock(blocks, type, `block-${prefix}-${idToken}`, {
      title: question.construct.trim() || `Evidence source ${index + 1}`,
      internalName: `${prefix}_${safeToken(question.id, String(index + 1))}`,
      heading: question.construct.trim() || `Evidence source ${index + 1}`,
      prompt: question.question.trim(),
      variableName: `${safeToken(prefix, "measure")}_${safeToken(question.id, String(index + 1))}`,
      required: type === "text" ? false : true,
    });
    if (type === "single-choice") block.choices = ["Approved response option one", "Approved response option two"];
    return block;
  });
}

function addDesignModules(
  input: StudyBuildMaterializationInput,
  blocks: ExperimentBlock[],
  branchRules: ExperimentBranchRule[],
  changes: StudyBuildMaterializationChange[],
  decisions: ReadonlyMap<string, StudyBuildRecommendationDecision>,
): { conditions: ExperimentCondition[]; assignment: ExperimentStudioDocument["assignment"] } {
  const design = input.profile.designKind;
  const questions = input.studyDesign.spec.researchQuestions;
  const participantPlan = input.studyDesign.spec.participants;
  if (design === "randomized-between") {
    const names = parseConditionNames(participantPlan.conditions);
    const weights = parseConditionWeights(participantPlan.allocationRatio, names.length);
    const conditions = names.map((name, index) => ({
      ...createExperimentCondition(`condition-${safeToken(name, String(index + 1)).replaceAll("_", "-")}`, name),
      weight: weights[index],
    }));
    const router = addBlock(blocks, "single-choice", "block-condition-router", {
      title: "Condition-aware procedure entry",
      internalName: "condition_procedure_entry",
      heading: "Begin the assigned procedure",
      prompt: "Continue only after the approved allocation has completed. The participant does not choose a condition.",
      variableName: "condition_procedure_status",
      choices: ["Begin assigned procedure", "Stop this session"],
    });
    conditions.forEach((condition) => {
      const procedure = addBlock(blocks, "instructions", `block-condition-${condition.id.replace("condition-", "")}`, {
        title: `${condition.name} procedure`,
        internalName: `procedure_${safeToken(condition.name, condition.id)}`,
        heading: "Condition-specific instructions",
        prompt: `Replace this placeholder with the approved ${condition.name} procedure. Do not reveal assignment information that should remain concealed.`,
      });
      const rule = createExperimentBranchRule(`branch-${condition.id}`, router.id, procedure.id);
      rule.value = "Begin assigned procedure";
      rule.conditionId = condition.id;
      branchRules.push(rule);
    });
    if (included(decisions, "design.randomized.manipulation-check")) {
      addBlock(blocks, "rating", "block-manipulation-check", {
        title: "Manipulation check",
        internalName: "manipulation_check",
        heading: "Configure the approved manipulation check",
        prompt: "Replace this placeholder with the approved measure of whether the intended condition difference was experienced.",
        variableName: "manipulation_check",
      });
    }
    const outcomeBlocks = addStableQuestionBlocks(blocks, questions, "outcome");
    changes.push(change("add-randomized-design", "condition", "/conditions", `Add auditable random allocation, ${conditions.length} condition procedures, and ${outcomeBlocks.length} comparable outcome block${outcomeBlocks.length === 1 ? "" : "s"}.`, "design.randomized.allocation", "design.randomized.condition-routing", "design.randomized.outcomes"));
    return { conditions, assignment: { method: "random", previewSeed: 492_810 } };
  }
  if (design === "within-subjects") {
    const names = parseConditionNames(participantPlan.conditions);
    addBlock(blocks, "instructions", "block-within-order", {
      title: "Repeated-condition order",
      internalName: "within_condition_order",
      heading: "Follow the approved condition order",
      prompt: `Approved source strategy: ${participantPlan.counterbalancing.trim()}. The current runner creates this explicit sequence; general order assignment remains a documented capability limit.`,
    });
    names.forEach((name, conditionIndex) => {
      addBlock(blocks, "instructions", `block-within-${safeToken(name, String(conditionIndex + 1)).replaceAll("_", "-")}`, {
        title: `${name} condition`,
        internalName: `within_condition_${conditionIndex + 1}`,
        heading: `${name} procedure`,
        prompt: "Replace with the approved repeated-condition procedure, break or washout instructions, and order-specific safeguards.",
      });
      questions.filter((question) => question.question.trim()).forEach((question, questionIndex) => {
        const type = measureBlockType(question);
        const block = addBlock(blocks, type, `block-within-${conditionIndex + 1}-${safeToken(question.id, String(questionIndex + 1)).replaceAll("_", "-")}`, {
          title: `${question.construct.trim() || `Outcome ${questionIndex + 1}`} · ${name}`,
          internalName: `within_${conditionIndex + 1}_${safeToken(question.id, String(questionIndex + 1))}`,
          heading: question.construct.trim() || "Repeated outcome",
          prompt: question.question.trim(),
          variableName: `within_${conditionIndex + 1}_${safeToken(question.id, String(questionIndex + 1))}`,
          required: true,
        });
        if (type === "single-choice") block.choices = ["Approved response option one", "Approved response option two"];
      });
    });
    changes.push(change("add-within-design", "block", "/blocks/within-subjects", `Add an explicit ${names.length}-condition sequence with stable repeated-outcome identities and a visible counterbalancing limit.`, "design.within.repeated-condition-loop", "design.within.counterbalancing", "design.within.repeated-outcomes", "design.within.carryover-plan"));
  } else if (design === "quasi-experimental") {
    const groups = parseConditionNames(participantPlan.conditions);
    addBlock(blocks, "single-choice", "block-existing-group", {
      title: "Existing group or exposure",
      internalName: "existing_group_or_exposure",
      heading: "Record the existing group without assigning it",
      prompt: "Use the approved participant or researcher-entered mapping. Cerise does not randomize this quasi-experimental study.",
      variableName: "existing_group",
      choices: groups,
      required: true,
    });
    const baseline = addStableQuestionBlocks(blocks, questions, "baseline");
    changes.push(change("add-quasi-design", "block", "/blocks/quasi-experimental", `Add a non-random existing-group mapping and ${baseline.length} source-linked baseline or covariate block${baseline.length === 1 ? "" : "s"}.`, "design.quasi.group-source", "design.quasi.baseline-covariates", "design.quasi.exposure-timing"));
  } else if (design === "cross-sectional-survey") {
    addBlock(blocks, "instructions", "block-survey-instructions", {
      title: "Survey instructions",
      internalName: "survey_instructions",
      heading: "How to complete this survey",
      prompt: "Use only the approved response options. Optional items must remain visibly optional, and participants may stop at any time.",
    });
    const measures = addStableQuestionBlocks(blocks, questions, "survey");
    changes.push(change("add-survey-design", "block", "/blocks/survey", `Add survey instructions and ${measures.length} stable source-linked measure block${measures.length === 1 ? "" : "s"}.`, "design.survey.measure-sections", "measures.evidence-map"));
  } else if (design === "observational") {
    addBlock(blocks, "text", "block-observation-context", {
      title: "Observation context",
      internalName: "observation_context",
      heading: "Record only the approved observation context",
      prompt: "Capture the minimum necessary environment, interval, event, and privacy-relevant context defined in the coding plan.",
      variableName: "observation_context",
      required: true,
    });
    const codes = addStableQuestionBlocks(blocks, questions, "observation");
    changes.push(change("add-observational-design", "block", "/blocks/observation", `Add structured context capture and ${codes.length} source-linked coding field${codes.length === 1 ? "" : "s"}; multi-observer reliability remains an analysis workflow.`, "design.observational.coding-schema", "design.observational.context", "design.observational.reliability"));
  } else if (design === "qualitative") {
    addBlock(blocks, "instructions", "block-qualitative-control", {
      title: "Participant-controlled qualitative session",
      internalName: "qualitative_participant_control",
      heading: "You may pause, skip, or stop",
      prompt: "Add the approved interviewer or self-guided instructions. Open-ended responses remain optional unless the reviewed protocol justifies otherwise.",
    });
    if (included(decisions, "design.qualitative.recording-choice")) {
      addBlock(blocks, "instructions", "block-recording-binding-note", {
        title: "Separate recording choice binding point",
        internalName: "recording_choice_binding",
        heading: "Recording choice will be bound in Step 05",
        prompt: "Do not add audio or video capture until the separate reviewed recording choice, permitted alternative, retention, use, access, and deletion facts are bound and verified.",
      });
    }
    const prompts = addStableQuestionBlocks(blocks, questions, "qualitative", "text");
    changes.push(change("add-qualitative-design", "block", "/blocks/qualitative", `Add participant-controlled instructions and ${prompts.length} qualitative prompt${prompts.length === 1 ? "" : "s"} without forcing numeric outcome roles.`, "design.qualitative.topic-guide", "design.qualitative.participant-control", "design.qualitative.recording-choice", "design.qualitative.data-plan"));
  } else if (design === "mixed-methods") {
    const quantitative = questions.filter((question) => question.constructRole !== "qualitative-concept");
    const qualitative = questions.filter((question) => question.constructRole === "qualitative-concept");
    addBlock(blocks, "instructions", "block-mixed-quantitative-lane", {
      title: "Quantitative lane",
      internalName: "mixed_quantitative_lane",
      heading: "Quantitative procedure",
      prompt: "Complete the source-linked quantitative measures. Their variable identities remain separate from qualitative sources.",
    });
    const quantitativeBlocks = addStableQuestionBlocks(blocks, quantitative, "mixed_quant");
    addBlock(blocks, "instructions", "block-mixed-qualitative-lane", {
      title: "Qualitative lane",
      internalName: "mixed_qualitative_lane",
      heading: "Qualitative procedure",
      prompt: "Complete the source-linked open prompts. Sequence, priority, linkage, and integration remain explicit analysis metadata.",
    });
    const qualitativeBlocks = addStableQuestionBlocks(blocks, qualitative, "mixed_qual", "text");
    changes.push(change("add-mixed-design", "block", "/blocks/mixed-methods", `Add separate ${quantitativeBlocks.length}-measure quantitative and ${qualitativeBlocks.length}-source qualitative lanes; integration stays an analysis artifact.`, "design.mixed.quantitative-lane", "design.mixed.qualitative-lane", "design.mixed.integration"));
  }
  return {
    conditions: [createExperimentCondition("condition-all", "All participants")],
    assignment: { method: "single", previewSeed: 492_810 },
  };
}

function composableCandidate(
  input: StudyBuildMaterializationInput,
  decisions: ReadonlyMap<string, StudyBuildRecommendationDecision>,
): { document: ExperimentStudioDocument; changes: StudyBuildMaterializationChange[] } {
  const blocks: ExperimentBlock[] = [];
  const branchRules: ExperimentBranchRule[] = [];
  const changes: StudyBuildMaterializationChange[] = [];
  addCommonFlow(blocks, changes, decisions);
  const execution = addSettingOverlay(input, blocks, branchRules, changes, decisions);
  const design = addDesignModules(input, blocks, branchRules, changes, decisions);
  if (included(decisions, "flow.debrief-and-close")) {
    addBlock(blocks, "debrief", "block-debrief", {
      title: "Debrief and study close",
      internalName: "debrief_and_close",
      heading: "Thank you",
      prompt: "Add the approved debrief, withdrawal-after-participation instructions, research contact, submission confirmation, and setting-specific session-close steps before release.",
    });
    changes.push(change("add-debrief", "block", "/blocks/block-debrief", "Add a shared debrief, withdrawal information, and explicit study close.", "flow.debrief-and-close", "flow.participant-exit-support"));
  }
  return {
    document: {
      schemaVersion: EXPERIMENT_STUDIO_SCHEMA_VERSION,
      projectId: input.studyDesign.projectId,
      title: `${input.projectName} — ${input.profile.designKind} ${input.profile.setting} draft`,
      updatedAt: input.createdAt,
      blocks,
      conditions: design.conditions,
      assignment: design.assignment,
      branchRules,
      execution,
      trialTables: [],
      timingDiagnostic: null,
    },
    changes,
  };
}

export async function createStudyBuildMaterializationPreview(
  input: StudyBuildMaterializationInput,
): Promise<StudyBuildMaterializationPreview> {
  const profileChecksum = await sha256ArtifactChecksum(input.profile);
  const issues = collectStudyBuildSelectionIssues(
    input.profile,
    input.studyDesign,
    input.decisions,
    input.existingDocument,
  );
  const slice = resolveStudyBuildSlice(input.profile);
  if (!slice || issues.length > 0) {
    return {
      slice,
      candidate: null,
      candidateChecksum: null,
      profileChecksum,
      changes: [],
      exactChangedPaths: [],
      issues,
      validationErrors: [],
      canCreate: false,
    };
  }
  const decisions = decisionMap(input.decisions);
  const result = slice === "online-survey"
    ? surveyCandidate(input, decisions)
    : slice === "randomized-laboratory"
      ? laboratoryCandidate(input, decisions)
      : composableCandidate(input, decisions);
  const validationErrors = validateExperimentStudio(result.document)
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.message);
  const baseline: ExperimentStudioDocument = {
    ...result.document,
    blocks: [],
    conditions: [],
    branchRules: [],
    execution: { allowBackNavigation: true, requireFullscreen: false, logFocusChanges: false },
  };
  const exactChangedPaths = (await diffResearchArtifacts(baseline, result.document)).map((item) => item.path);
  return {
    slice,
    candidate: result.document,
    candidateChecksum: await sha256ArtifactChecksum(result.document),
    profileChecksum,
    changes: result.changes,
    exactChangedPaths,
    issues,
    validationErrors,
    canCreate: validationErrors.length === 0,
  };
}

export function studyBuildCreationReceiptStorageKey(projectId: string): string {
  return `cerise-study-build-receipt:${projectId}:v${STUDY_BUILD_CREATION_RECEIPT_SCHEMA_VERSION}`;
}

export function createStudyBuildCreationReceipt(
  preview: StudyBuildMaterializationPreview,
  input: StudyBuildMaterializationInput,
): StudyBuildCreationReceipt {
  if (!preview.canCreate || !preview.slice || !preview.candidateChecksum) {
    throw new Error("A blocked Study Build preview cannot produce a creation receipt.");
  }
  return {
    schemaVersion: STUDY_BUILD_CREATION_RECEIPT_SCHEMA_VERSION,
    materializerVersion: STUDY_BUILD_MATERIALIZER_VERSION,
    projectId: input.studyDesign.projectId,
    createdAt: input.createdAt,
    slice: preview.slice,
    profileChecksum: preview.profileChecksum,
    candidateChecksum: preview.candidateChecksum,
    sourceFingerprintChecksum: input.profile.sourceFingerprint.checksum,
    decisions: input.decisions.map((decision) => ({ ...decision, note: cleanNote(decision.note) })),
    changes: preview.changes,
    integrityClaim: "checksums-prove-content-identity-not-scientific-ethics-or-release-approval",
  };
}

export function writeStudyBuildCreationReceipt(storage: StorageLike, receipt: StudyBuildCreationReceipt): void {
  storage.setItem(studyBuildCreationReceiptStorageKey(receipt.projectId), JSON.stringify(receipt));
}
