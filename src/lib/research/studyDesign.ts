import { readStepDraft, type ResearchPathDraft } from "./researchPathDraft";

export const STUDY_DESIGN_SCHEMA_VERSION = 1 as const;

export type StudyDesignGoal =
  | ""
  | "test-causal-effect"
  | "compare-groups"
  | "describe-pattern"
  | "track-change"
  | "explore-experience";

export type StudySetting = "" | "online" | "laboratory" | "field" | "hybrid";

export type StudyDesignKind =
  | ""
  | "randomized-between"
  | "within-subjects"
  | "quasi-experimental"
  | "cross-sectional-survey"
  | "longitudinal"
  | "observational"
  | "qualitative"
  | "mixed-methods";

export type ConstructRole = "" | "predictor" | "outcome" | "mediator" | "moderator" | "qualitative-concept";

export interface StudyDesignDecision {
  goal: StudyDesignGoal;
  setting: StudySetting;
  constraints: string;
  availableDevices: string;
  selectedDesign: StudyDesignKind;
  selectionRationale: string;
  approved: boolean;
}

export interface ResearchQuestionPlan {
  id: string;
  question: string;
  hypothesis: string;
  construct: string;
  constructRole: ConstructRole;
  operationalDefinition: string;
  measure: string;
  expectedDirection: string;
  evidenceNote: string;
}

export interface ParticipantPlan {
  targetPopulation: string;
  inclusionCriteria: string;
  exclusionCriteria: string;
  samplingStrategy: string;
  recruitmentChannel: string;
  plannedSampleSize: string;
  sampleSizeRationale: string;
  expectedEffectSize: string;
  alpha: "0.05" | "0.01";
  power: "0.80" | "0.90";
  conditions: string;
  allocationMethod: string;
  allocationRatio: string;
  counterbalancing: string;
  deviceRequirements: string;
  accessibilityRequirements: string;
  approved: boolean;
}

export interface StudySpecification {
  design: StudyDesignDecision;
  researchQuestions: ResearchQuestionPlan[];
  participants: ParticipantPlan;
  legacyNotes: Record<string, string>;
}

export interface StudyDesignDocument {
  schemaVersion: typeof STUDY_DESIGN_SCHEMA_VERSION;
  projectId: string;
  updatedAt: string;
  spec: StudySpecification;
}

export interface StudyValidationIssue {
  id: string;
  severity: "required" | "warning";
  message: string;
}

export const STUDY_DESIGN_OPTIONS: ReadonlyArray<{
  id: Exclude<StudyDesignKind, "">;
  title: string;
  summary: string;
  bestFor: string;
}> = [
  {
    id: "randomized-between",
    title: "Randomized between-groups experiment",
    summary: "Assign different participants to conditions and compare their outcomes.",
    bestFor: "Testing whether a manipulated condition causes a measurable difference.",
  },
  {
    id: "within-subjects",
    title: "Within-subjects experiment",
    summary: "Each participant completes multiple conditions or repeated measurements.",
    bestFor: "Comparing conditions efficiently while controlling individual differences.",
  },
  {
    id: "quasi-experimental",
    title: "Quasi-experimental comparison",
    summary: "Compare naturally occurring groups or interventions without full random assignment.",
    bestFor: "Applied settings where randomization is impractical or inappropriate.",
  },
  {
    id: "cross-sectional-survey",
    title: "Cross-sectional survey",
    summary: "Collect self-report or structured measures from a sample at one point in time.",
    bestFor: "Describing patterns, associations, attitudes, or reported experiences.",
  },
  {
    id: "longitudinal",
    title: "Longitudinal or repeated-measures study",
    summary: "Collect comparable evidence from the same population across time.",
    bestFor: "Studying change, development, durability, or temporal ordering.",
  },
  {
    id: "observational",
    title: "Structured observational study",
    summary: "Record behavior or naturally occurring events without manipulating conditions.",
    bestFor: "Understanding real-world patterns when intervention is not required.",
  },
  {
    id: "qualitative",
    title: "Qualitative study",
    summary: "Use interviews, focus groups, diaries, or observations to understand meaning and experience.",
    bestFor: "Exploring mechanisms, perspectives, context, and under-specified phenomena.",
  },
  {
    id: "mixed-methods",
    title: "Mixed-methods study",
    summary: "Integrate quantitative and qualitative evidence in one coordinated design.",
    bestFor: "Explaining both the size of a pattern and why or how it occurs.",
  },
];

const EMPTY_DESIGN: StudyDesignDecision = {
  goal: "",
  setting: "",
  constraints: "",
  availableDevices: "",
  selectedDesign: "",
  selectionRationale: "",
  approved: false,
};

const EMPTY_PARTICIPANTS: ParticipantPlan = {
  targetPopulation: "",
  inclusionCriteria: "",
  exclusionCriteria: "",
  samplingStrategy: "",
  recruitmentChannel: "",
  plannedSampleSize: "",
  sampleSizeRationale: "",
  expectedEffectSize: "",
  alpha: "0.05",
  power: "0.80",
  conditions: "",
  allocationMethod: "",
  allocationRatio: "",
  counterbalancing: "",
  deviceRequirements: "",
  accessibilityRequirements: "",
  approved: false,
};

function makeQuestionPlan(question: string, index: number): ResearchQuestionPlan {
  return {
    id: `rq-${index + 1}`,
    question,
    hypothesis: "",
    construct: "",
    constructRole: "",
    operationalDefinition: "",
    measure: "",
    expectedDirection: "",
    evidenceNote: "",
  };
}

export function collectPathwayResearchQuestions(pathway: ResearchPathDraft): string[] {
  const questionDraft = readStepDraft(pathway, "stage-01-step-03");
  return Array.from({ length: 4 }, (_, index) => questionDraft.fields[`key-question-${index}`]?.trim() ?? "");
}

function collectLegacyNotes(pathway: ResearchPathDraft): Record<string, string> {
  const notes: Record<string, string> = {};
  for (const stepId of ["stage-03-step-01", "stage-03-step-02", "stage-03-step-03"]) {
    const step = readStepDraft(pathway, stepId);
    const imported = [
      step.fields["prompt-0"],
      step.fields["prompt-1"],
      step.fields["handoff-notes"],
    ].filter((value): value is string => Boolean(value?.trim()));
    if (imported.length > 0) notes[stepId] = imported.join("\n\n");
  }
  return notes;
}

export function createStudyDesignDocument(projectId: string, pathway: ResearchPathDraft): StudyDesignDocument {
  const questions = collectPathwayResearchQuestions(pathway);
  const participantsLegacy = readStepDraft(pathway, "stage-03-step-03");
  const designLegacy = readStepDraft(pathway, "stage-03-step-01");
  const conceptLegacy = readStepDraft(pathway, "stage-03-step-02");

  const researchQuestions = questions.map(makeQuestionPlan);
  if (researchQuestions[0]) {
    researchQuestions[0].construct = conceptLegacy.fields["prompt-0"] ?? "";
    researchQuestions[0].operationalDefinition = conceptLegacy.fields["prompt-1"] ?? "";
  }

  return {
    schemaVersion: STUDY_DESIGN_SCHEMA_VERSION,
    projectId,
    updatedAt: new Date().toISOString(),
    spec: {
      design: {
        ...EMPTY_DESIGN,
        selectionRationale: designLegacy.fields["prompt-1"] ?? "",
      },
      researchQuestions,
      participants: {
        ...EMPTY_PARTICIPANTS,
        targetPopulation: participantsLegacy.fields["prompt-0"] ?? "",
        samplingStrategy: participantsLegacy.fields["prompt-1"] ?? "",
      },
      legacyNotes: collectLegacyNotes(pathway),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
}

export function normalizeStudyDesignDocument(
  value: unknown,
  projectId: string,
  pathway: ResearchPathDraft,
): StudyDesignDocument {
  const fallback = createStudyDesignDocument(projectId, pathway);
  if (!isRecord(value)) return fallback;

  const specValue = isRecord(value.spec) ? value.spec : null;
  if (!specValue) return fallback;

  const designValue = isRecord(specValue.design) ? specValue.design : {};
  const participantValue = isRecord(specValue.participants) ? specValue.participants : {};
  const questionsValue = Array.isArray(specValue.researchQuestions) ? specValue.researchQuestions : [];
  const legacyValue = isRecord(specValue.legacyNotes) ? specValue.legacyNotes : {};

  const researchQuestions = Array.from({ length: 4 }, (_, index) => {
    const raw = isRecord(questionsValue[index]) ? questionsValue[index] : {};
    const inherited = fallback.spec.researchQuestions[index];
    return {
      id: stringValue(raw.id) || inherited.id,
      question: stringValue(raw.question) || inherited.question,
      hypothesis: stringValue(raw.hypothesis),
      construct: stringValue(raw.construct),
      constructRole: enumValue(
        raw.constructRole,
        ["", "predictor", "outcome", "mediator", "moderator", "qualitative-concept"] as const,
        "",
      ),
      operationalDefinition: stringValue(raw.operationalDefinition),
      measure: stringValue(raw.measure),
      expectedDirection: stringValue(raw.expectedDirection),
      evidenceNote: stringValue(raw.evidenceNote),
    } satisfies ResearchQuestionPlan;
  });

  return {
    schemaVersion: STUDY_DESIGN_SCHEMA_VERSION,
    projectId,
    updatedAt: stringValue(value.updatedAt) || fallback.updatedAt,
    spec: {
      design: {
        goal: enumValue(
          designValue.goal,
          ["", "test-causal-effect", "compare-groups", "describe-pattern", "track-change", "explore-experience"] as const,
          "",
        ),
        setting: enumValue(designValue.setting, ["", "online", "laboratory", "field", "hybrid"] as const, ""),
        constraints: stringValue(designValue.constraints),
        availableDevices: stringValue(designValue.availableDevices),
        selectedDesign: enumValue(
          designValue.selectedDesign,
          STUDY_DESIGN_OPTIONS.map((option) => option.id),
          "",
        ),
        selectionRationale: stringValue(designValue.selectionRationale),
        approved: designValue.approved === true,
      },
      researchQuestions,
      participants: {
        targetPopulation: stringValue(participantValue.targetPopulation),
        inclusionCriteria: stringValue(participantValue.inclusionCriteria),
        exclusionCriteria: stringValue(participantValue.exclusionCriteria),
        samplingStrategy: stringValue(participantValue.samplingStrategy),
        recruitmentChannel: stringValue(participantValue.recruitmentChannel),
        plannedSampleSize: stringValue(participantValue.plannedSampleSize),
        sampleSizeRationale: stringValue(participantValue.sampleSizeRationale),
        expectedEffectSize: stringValue(participantValue.expectedEffectSize),
        alpha: enumValue(participantValue.alpha, ["0.05", "0.01"] as const, "0.05"),
        power: enumValue(participantValue.power, ["0.80", "0.90"] as const, "0.80"),
        conditions: stringValue(participantValue.conditions),
        allocationMethod: stringValue(participantValue.allocationMethod),
        allocationRatio: stringValue(participantValue.allocationRatio),
        counterbalancing: stringValue(participantValue.counterbalancing),
        deviceRequirements: stringValue(participantValue.deviceRequirements),
        accessibilityRequirements: stringValue(participantValue.accessibilityRequirements),
        approved: participantValue.approved === true,
      },
      legacyNotes: Object.fromEntries(
        Object.entries(legacyValue).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      ),
    },
  };
}

export function updateStudySpecification(
  document: StudyDesignDocument,
  updater: (spec: StudySpecification) => StudySpecification,
): StudyDesignDocument {
  return {
    ...document,
    updatedAt: new Date().toISOString(),
    spec: updater(document.spec),
  };
}

export function getRecommendedDesigns(goal: StudyDesignGoal): StudyDesignKind[] {
  const map: Record<StudyDesignGoal, StudyDesignKind[]> = {
    "": ["randomized-between", "cross-sectional-survey", "qualitative"],
    "test-causal-effect": ["randomized-between", "within-subjects", "quasi-experimental"],
    "compare-groups": ["randomized-between", "quasi-experimental", "cross-sectional-survey"],
    "describe-pattern": ["cross-sectional-survey", "observational", "mixed-methods"],
    "track-change": ["longitudinal", "within-subjects", "mixed-methods"],
    "explore-experience": ["qualitative", "mixed-methods", "observational"],
  };
  return map[goal];
}

export function estimateTwoGroupSampleSize(effectSize: number, alpha: ParticipantPlan["alpha"], power: ParticipantPlan["power"]): number | null {
  if (!Number.isFinite(effectSize) || effectSize <= 0 || effectSize > 5) return null;
  const zAlpha = alpha === "0.01" ? 2.576 : 1.96;
  const zPower = power === "0.90" ? 1.282 : 0.842;
  return Math.ceil((2 * (zAlpha + zPower) ** 2) / effectSize ** 2) * 2;
}

export function validateStudyStep(spec: StudySpecification, stepId: string): StudyValidationIssue[] {
  if (stepId === "stage-03-step-01") {
    return [
      !spec.researchQuestions.some((item) => item.question.trim())
        ? { id: "design-rq", severity: "warning", message: "Add or import at least one research question so the design can be checked against it." }
        : null,
      !spec.design.goal
        ? { id: "design-goal", severity: "required", message: "Choose what the study must establish." }
        : null,
      !spec.design.selectedDesign
        ? { id: "design-kind", severity: "required", message: "Select a study design." }
        : null,
      !spec.design.selectionRationale.trim()
        ? { id: "design-rationale", severity: "required", message: "Explain why the selected design can answer the research questions." }
        : null,
      !spec.design.approved
        ? { id: "design-approval", severity: "required", message: "Approve the design decision before completing this step." }
        : null,
    ].filter((issue): issue is StudyValidationIssue => Boolean(issue));
  }

  if (stepId === "stage-03-step-02") {
    const activeQuestions = spec.researchQuestions.filter((item) => item.question.trim());
    const issues: StudyValidationIssue[] = [];
    if (activeQuestions.length === 0) {
      issues.push({ id: "measure-rq", severity: "required", message: "Add at least one research question." });
    }
    for (const question of activeQuestions) {
      if (!question.construct.trim()) {
        issues.push({ id: `${question.id}-construct`, severity: "required", message: `${question.id.toUpperCase()} needs a construct or qualitative concept.` });
      }
      if (!question.operationalDefinition.trim()) {
        issues.push({ id: `${question.id}-definition`, severity: "required", message: `${question.id.toUpperCase()} needs an operational definition.` });
      }
      if (!question.measure.trim()) {
        issues.push({ id: `${question.id}-measure`, severity: "required", message: `${question.id.toUpperCase()} needs a measure, task, interview guide, or data source.` });
      }
    }
    return issues;
  }

  if (stepId === "stage-03-step-03") {
    return [
      !spec.participants.targetPopulation.trim()
        ? { id: "participants-population", severity: "required", message: "Define the target population or data source." }
        : null,
      !spec.participants.samplingStrategy.trim()
        ? { id: "participants-sampling", severity: "required", message: "Choose and justify a sampling strategy." }
        : null,
      !spec.participants.plannedSampleSize.trim()
        ? { id: "participants-size", severity: "required", message: "Record a planned sample size or source count." }
        : null,
      !spec.participants.sampleSizeRationale.trim()
        ? { id: "participants-rationale", severity: "required", message: "Explain the basis for the sample-size decision." }
        : null,
      !spec.participants.accessibilityRequirements.trim()
        ? { id: "participants-accessibility", severity: "warning", message: "Record accessibility needs or state why none are anticipated." }
        : null,
      !spec.participants.approved
        ? { id: "participants-approval", severity: "required", message: "Approve the participant and sampling plan before completing this step." }
        : null,
    ].filter((issue): issue is StudyValidationIssue => Boolean(issue));
  }

  return [];
}

export function canCompleteStudyStep(spec: StudySpecification, stepId: string): boolean {
  return !validateStudyStep(spec, stepId).some((issue) => issue.severity === "required");
}
