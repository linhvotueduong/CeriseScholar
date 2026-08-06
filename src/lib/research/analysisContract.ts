import {
  collectExperimentVariables,
  type ExperimentResponseType,
  type ExperimentStudioDocument,
} from "./experimentStudio";
import type {
  ConstructRole,
  StudyDesignDocument,
  StudyDesignGoal,
  StudyDesignKind,
  StudySetting,
} from "./studyDesign";

export const ANALYSIS_CONTRACT_SCHEMA_VERSION = 1 as const;
export const MAX_ANALYSIS_CONTRACT_BYTES = 256 * 1024;
export const MAX_ANALYSIS_RESEARCH_QUESTIONS = 16;
export const MAX_ANALYSIS_VARIABLES = 512;
export const MAX_ANALYSIS_TEXT_LENGTH = 4_000;
export const MAX_ANALYSIS_RULES = 32;

export type AnalysisDesignation = "unspecified" | "primary" | "secondary" | "exploratory";
export type AnalysisVariableRole =
  | "unassigned"
  | "outcome"
  | "predictor"
  | "covariate"
  | "mediator"
  | "moderator"
  | "group"
  | "identifier"
  | "administrative"
  | "qualitative";
export type AnalysisUnit = "unspecified" | "participant" | "trial" | "response";

export interface AnalysisContractVariable {
  name: string;
  blockId: string;
  blockTitle: string;
  responseType: ExperimentResponseType;
  required: boolean;
  roles: AnalysisVariableRole[];
}

export interface AnalysisContractResearchQuestion {
  id: string;
  question: string;
  hypothesis: string;
  designation: AnalysisDesignation;
  construct: string;
  constructRole: ConstructRole;
  operationalDefinition: string;
  measure: string;
  expectedDirection: string;
  outcomeVariables: string[];
  predictorVariables: string[];
  covariateVariables: string[];
  unitOfAnalysis: AnalysisUnit;
  plannedMethod: string;
  effectSize: string;
  missingDataStrategy: string;
  exclusionRules: string[];
  transformations: string[];
  multiplicityStrategy: string;
  sensitivityAnalyses: string[];
}

export interface AnalysisContractIssue {
  id: string;
  severity: "warning";
  scope: "contract" | "research-question" | "variable";
  message: string;
  researchQuestionId?: string;
  variableName?: string;
}

export interface AnalysisContract {
  schemaVersion: typeof ANALYSIS_CONTRACT_SCHEMA_VERSION;
  projectId: string;
  frozenAt: string;
  provenance: {
    studyDesignSchemaVersion: number | null;
    studyDesignUpdatedAt: string | null;
    experimentStudioSchemaVersion: number;
    experimentStudioUpdatedAt: string;
  };
  design: {
    kind: StudyDesignKind;
    goal: StudyDesignGoal;
    setting: StudySetting;
    targetPopulation: string;
    plannedSampleSize: string;
    alpha: "0.05" | "0.01";
    power: "0.80" | "0.90";
  };
  researchQuestions: AnalysisContractResearchQuestion[];
  variables: AnalysisContractVariable[];
  globalPlan: {
    unitOfAnalysis: AnalysisUnit;
    missingDataStrategy: string;
    exclusionRules: string[];
    transformations: string[];
    multiplicityStrategy: string;
    sensitivityAnalyses: string[];
  };
  dataAccessDeclaration: "not-declared";
  readiness: {
    status: "ready" | "needs-planning";
    warningCount: number;
    issues: AnalysisContractIssue[];
  };
}

const RESPONSE_TYPES: readonly ExperimentResponseType[] = [
  "none",
  "consent",
  "single-choice",
  "likert",
  "long-text",
  "keyboard",
  "audio",
  "video",
];
const CONSTRUCT_ROLES: readonly ConstructRole[] = [
  "",
  "predictor",
  "outcome",
  "mediator",
  "moderator",
  "qualitative-concept",
];
const DESIGN_KINDS: readonly StudyDesignKind[] = [
  "",
  "randomized-between",
  "within-subjects",
  "quasi-experimental",
  "cross-sectional-survey",
  "longitudinal",
  "observational",
  "qualitative",
  "mixed-methods",
];
const DESIGN_GOALS: readonly StudyDesignGoal[] = [
  "",
  "test-causal-effect",
  "compare-groups",
  "describe-pattern",
  "track-change",
  "explore-experience",
];
const STUDY_SETTINGS: readonly StudySetting[] = ["", "online", "laboratory", "field", "hybrid"];
const DESIGNATIONS: readonly AnalysisDesignation[] = ["unspecified", "primary", "secondary", "exploratory"];
const VARIABLE_ROLES: readonly AnalysisVariableRole[] = [
  "unassigned",
  "outcome",
  "predictor",
  "covariate",
  "mediator",
  "moderator",
  "group",
  "identifier",
  "administrative",
  "qualitative",
];
const ANALYSIS_UNITS: readonly AnalysisUnit[] = ["unspecified", "participant", "trial", "response"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, maximum = MAX_ANALYSIS_TEXT_LENGTH): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function boundedText(value: unknown, maximum = MAX_ANALYSIS_TEXT_LENGTH): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function safeIdentifier(value: unknown, fallback: string): string {
  const candidate = cleanText(value, 100);
  if (/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(candidate)) return candidate;
  const normalized = candidate
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return normalized || fallback;
}

function uniqueIdentifier(value: unknown, fallback: string, used: Set<string>): string {
  const base = safeIdentifier(value, fallback);
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base.slice(0, Math.max(1, 96 - String(suffix).length))}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function cleanRules(value: string): string[] {
  const trimmed = cleanText(value);
  return trimmed ? [trimmed] : [];
}

function matchedVariableName(measure: string, names: ReadonlySet<string>): string[] {
  const candidate = measure.trim();
  return candidate && names.has(candidate) ? [candidate] : [];
}

function roleFromConstruct(role: ConstructRole): AnalysisVariableRole {
  if (role === "outcome" || role === "predictor" || role === "mediator" || role === "moderator") {
    return role;
  }
  if (role === "qualitative-concept") return "qualitative";
  return "unassigned";
}

function inferGlobalUnit(studio: ExperimentStudioDocument): AnalysisUnit {
  if (studio.blocks.some((block) => block.type === "trial-loop")) return "trial";
  if (collectExperimentVariables(studio).length > 0) return "participant";
  return "unspecified";
}

function contractCore(
  studio: ExperimentStudioDocument,
  studyDesign: StudyDesignDocument | null | undefined,
  frozenAt: string,
): Omit<AnalysisContract, "readiness"> {
  const sourceQuestions = studyDesign?.spec.researchQuestions ?? [];
  const variables = collectExperimentVariables(studio).slice(0, MAX_ANALYSIS_VARIABLES);
  const variableNames = new Set(variables.map((variable) => variable.name));
  const usedIds = new Set<string>();
  const researchQuestions = sourceQuestions
    .filter((question) => question.question.trim())
    .slice(0, MAX_ANALYSIS_RESEARCH_QUESTIONS)
    .map((question, index): AnalysisContractResearchQuestion => {
      const matched = matchedVariableName(question.measure, variableNames);
      const inferredRole = roleFromConstruct(question.constructRole);
      return {
        id: uniqueIdentifier(question.id, `rq-${index + 1}`, usedIds),
        question: cleanText(question.question),
        hypothesis: cleanText(question.hypothesis),
        designation: "unspecified",
        construct: cleanText(question.construct),
        constructRole: question.constructRole,
        operationalDefinition: cleanText(question.operationalDefinition),
        measure: cleanText(question.measure),
        expectedDirection: cleanText(question.expectedDirection),
        outcomeVariables: inferredRole === "outcome" ? matched : [],
        predictorVariables: inferredRole === "predictor" ? matched : [],
        covariateVariables: [],
        unitOfAnalysis: inferGlobalUnit(studio),
        plannedMethod: "",
        effectSize: cleanText(studyDesign?.spec.participants.expectedEffectSize),
        missingDataStrategy: "",
        exclusionRules: cleanRules(studyDesign?.spec.participants.exclusionCriteria ?? ""),
        transformations: [],
        multiplicityStrategy: "",
        sensitivityAnalyses: [],
      };
    });

  const rolesByVariable = new Map<string, Set<AnalysisVariableRole>>();
  for (const variable of variables) rolesByVariable.set(variable.name, new Set());
  for (const question of researchQuestions) {
    question.outcomeVariables.forEach((name) => rolesByVariable.get(name)?.add("outcome"));
    question.predictorVariables.forEach((name) => rolesByVariable.get(name)?.add("predictor"));
    question.covariateVariables.forEach((name) => rolesByVariable.get(name)?.add("covariate"));
  }

  return {
    schemaVersion: ANALYSIS_CONTRACT_SCHEMA_VERSION,
    projectId: studio.projectId,
    frozenAt: cleanText(frozenAt, 40),
    provenance: {
      studyDesignSchemaVersion: studyDesign?.schemaVersion ?? null,
      studyDesignUpdatedAt: studyDesign?.updatedAt ? cleanText(studyDesign.updatedAt, 40) : null,
      experimentStudioSchemaVersion: studio.schemaVersion,
      experimentStudioUpdatedAt: cleanText(studio.updatedAt, 40),
    },
    design: {
      kind: studyDesign?.spec.design.selectedDesign ?? "",
      goal: studyDesign?.spec.design.goal ?? "",
      setting: studyDesign?.spec.design.setting ?? "",
      targetPopulation: cleanText(studyDesign?.spec.participants.targetPopulation),
      plannedSampleSize: cleanText(studyDesign?.spec.participants.plannedSampleSize, 200),
      alpha: studyDesign?.spec.participants.alpha ?? "0.05",
      power: studyDesign?.spec.participants.power ?? "0.80",
    },
    researchQuestions,
    variables: variables.map((variable) => {
      const roles = Array.from(rolesByVariable.get(variable.name) ?? []);
      return {
        ...variable,
        name: cleanText(variable.name, 100),
        blockId: cleanText(variable.blockId, 100),
        blockTitle: cleanText(variable.blockTitle, 200),
        roles: roles.length > 0
          ? roles
          : variable.responseType === "consent"
            ? ["administrative"]
            : ["unassigned"],
      };
    }),
    globalPlan: {
      unitOfAnalysis: inferGlobalUnit(studio),
      missingDataStrategy: "",
      exclusionRules: cleanRules(studyDesign?.spec.participants.exclusionCriteria ?? ""),
      transformations: [],
      multiplicityStrategy: "",
      sensitivityAnalyses: [],
    },
    dataAccessDeclaration: "not-declared",
  };
}

export function validateAnalysisContract(
  contract: Omit<AnalysisContract, "readiness"> | AnalysisContract,
): AnalysisContractIssue[] {
  const issues: AnalysisContractIssue[] = [];
  if (contract.researchQuestions.length === 0) {
    issues.push({
      id: "analysis-no-research-questions",
      severity: "warning",
      scope: "contract",
      message: "No research question was frozen into this release.",
    });
  }
  if (contract.variables.length === 0) {
    issues.push({
      id: "analysis-no-variables",
      severity: "warning",
      scope: "contract",
      message: "No participant-response variable was frozen into this release.",
    });
  }
  for (const question of contract.researchQuestions) {
    if (question.designation === "unspecified") {
      issues.push({
        id: `analysis-${question.id}-designation`,
        severity: "warning",
        scope: "research-question",
        researchQuestionId: question.id,
        message: "Classify this question as primary, secondary, or exploratory before confirmatory analysis.",
      });
    }
    if (question.outcomeVariables.length === 0) {
      issues.push({
        id: `analysis-${question.id}-outcome`,
        severity: "warning",
        scope: "research-question",
        researchQuestionId: question.id,
        message: "Map at least one measured outcome variable to this research question.",
      });
    }
    if (!question.plannedMethod) {
      issues.push({
        id: `analysis-${question.id}-method`,
        severity: "warning",
        scope: "research-question",
        researchQuestionId: question.id,
        message: "Record the planned analysis method before running an inferential analysis.",
      });
    }
  }
  for (const variable of contract.variables) {
    if (variable.roles.includes("unassigned")) {
      issues.push({
        id: `analysis-variable-${variable.name}-role`,
        severity: "warning",
        scope: "variable",
        variableName: variable.name,
        message: "Assign an analysis role to this variable before analysis.",
      });
    }
  }
  return issues;
}

export function createAnalysisContract(
  studio: ExperimentStudioDocument,
  studyDesign: StudyDesignDocument | null | undefined,
  frozenAt: string,
): AnalysisContract {
  const core = contractCore(studio, studyDesign, frozenAt);
  const issues = validateAnalysisContract(core);
  return {
    ...core,
    readiness: {
      status: issues.length === 0 ? "ready" : "needs-planning",
      warningCount: issues.length,
      issues,
    },
  };
}

function parseStringArray(value: unknown, maximumItems = MAX_ANALYSIS_RULES): string[] | null {
  if (!Array.isArray(value) || value.length > maximumItems) return null;
  if (!value.every((item) => boundedText(item))) return null;
  return value.map((item) => (item as string).trim());
}

function parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : null;
}

function parseIssue(value: unknown): AnalysisContractIssue | null {
  if (
    !isRecord(value)
    || !boundedText(value.id, 200)
    || value.severity !== "warning"
    || !["contract", "research-question", "variable"].includes(String(value.scope))
    || !boundedText(value.message, 2_000)
    || (value.researchQuestionId !== undefined && !boundedText(value.researchQuestionId, 100))
    || (value.variableName !== undefined && !boundedText(value.variableName, 100))
  ) return null;
  return {
    id: value.id,
    severity: "warning",
    scope: value.scope as AnalysisContractIssue["scope"],
    message: value.message,
    ...(typeof value.researchQuestionId === "string" ? { researchQuestionId: value.researchQuestionId } : {}),
    ...(typeof value.variableName === "string" ? { variableName: value.variableName } : {}),
  };
}

export function normalizeAnalysisContract(
  value: unknown,
  expectedProjectId: string,
): AnalysisContract | null {
  if (!isRecord(value) || value.schemaVersion !== ANALYSIS_CONTRACT_SCHEMA_VERSION) return null;
  if (
    value.projectId !== expectedProjectId
    || !boundedText(value.projectId, 100)
    || !boundedText(value.frozenAt, 40)
    || !isRecord(value.provenance)
    || (
      value.provenance.studyDesignSchemaVersion !== null
      && (!Number.isInteger(value.provenance.studyDesignSchemaVersion) || Number(value.provenance.studyDesignSchemaVersion) < 1)
    )
    || (
      value.provenance.studyDesignUpdatedAt !== null
      && !boundedText(value.provenance.studyDesignUpdatedAt, 40)
    )
    || !Number.isInteger(value.provenance.experimentStudioSchemaVersion)
    || Number(value.provenance.experimentStudioSchemaVersion) < 1
    || !boundedText(value.provenance.experimentStudioUpdatedAt, 40)
    || !isRecord(value.design)
    || !Array.isArray(value.researchQuestions)
    || value.researchQuestions.length > MAX_ANALYSIS_RESEARCH_QUESTIONS
    || !Array.isArray(value.variables)
    || value.variables.length > MAX_ANALYSIS_VARIABLES
    || !isRecord(value.globalPlan)
    || value.dataAccessDeclaration !== "not-declared"
    || !isRecord(value.readiness)
  ) return null;

  const kind = parseEnum(value.design.kind, DESIGN_KINDS);
  const goal = parseEnum(value.design.goal, DESIGN_GOALS);
  const setting = parseEnum(value.design.setting, STUDY_SETTINGS);
  if (
    kind === null
    || goal === null
    || setting === null
    || !boundedText(value.design.targetPopulation)
    || !boundedText(value.design.plannedSampleSize, 200)
    || !["0.05", "0.01"].includes(String(value.design.alpha))
    || !["0.80", "0.90"].includes(String(value.design.power))
  ) return null;

  const researchQuestions: AnalysisContractResearchQuestion[] = [];
  const researchQuestionIds = new Set<string>();
  for (const raw of value.researchQuestions) {
    if (
      !isRecord(raw)
      || !boundedText(raw.id, 100)
      || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(raw.id)
      || researchQuestionIds.has(raw.id)
      || !boundedText(raw.question)
      || !boundedText(raw.hypothesis)
      || !boundedText(raw.construct)
      || !boundedText(raw.operationalDefinition)
      || !boundedText(raw.measure)
      || !boundedText(raw.expectedDirection)
      || !boundedText(raw.plannedMethod)
      || !boundedText(raw.effectSize)
      || !boundedText(raw.missingDataStrategy)
      || !boundedText(raw.multiplicityStrategy)
    ) return null;
    const designation = parseEnum(raw.designation, DESIGNATIONS);
    const constructRole = parseEnum(raw.constructRole, CONSTRUCT_ROLES);
    const unitOfAnalysis = parseEnum(raw.unitOfAnalysis, ANALYSIS_UNITS);
    const outcomeVariables = parseStringArray(raw.outcomeVariables, MAX_ANALYSIS_VARIABLES);
    const predictorVariables = parseStringArray(raw.predictorVariables, MAX_ANALYSIS_VARIABLES);
    const covariateVariables = parseStringArray(raw.covariateVariables, MAX_ANALYSIS_VARIABLES);
    const exclusionRules = parseStringArray(raw.exclusionRules);
    const transformations = parseStringArray(raw.transformations);
    const sensitivityAnalyses = parseStringArray(raw.sensitivityAnalyses);
    if (
      designation === null
      || constructRole === null
      || unitOfAnalysis === null
      || !outcomeVariables
      || !predictorVariables
      || !covariateVariables
      || !exclusionRules
      || !transformations
      || !sensitivityAnalyses
    ) return null;
    researchQuestionIds.add(raw.id);
    researchQuestions.push({
      id: raw.id,
      question: raw.question,
      hypothesis: raw.hypothesis,
      designation,
      construct: raw.construct,
      constructRole,
      operationalDefinition: raw.operationalDefinition,
      measure: raw.measure,
      expectedDirection: raw.expectedDirection,
      outcomeVariables,
      predictorVariables,
      covariateVariables,
      unitOfAnalysis,
      plannedMethod: raw.plannedMethod,
      effectSize: raw.effectSize,
      missingDataStrategy: raw.missingDataStrategy,
      exclusionRules,
      transformations,
      multiplicityStrategy: raw.multiplicityStrategy,
      sensitivityAnalyses,
    });
  }

  const variables: AnalysisContractVariable[] = [];
  const variableNames = new Set<string>();
  for (const raw of value.variables) {
    if (
      !isRecord(raw)
      || !boundedText(raw.name, 100)
      || !raw.name
      || variableNames.has(raw.name)
      || !boundedText(raw.blockId, 100)
      || !boundedText(raw.blockTitle, 200)
      || typeof raw.required !== "boolean"
      || !Array.isArray(raw.roles)
      || raw.roles.length < 1
      || raw.roles.length > VARIABLE_ROLES.length
    ) return null;
    const responseType = parseEnum(raw.responseType, RESPONSE_TYPES);
    const roles = raw.roles.map((role) => parseEnum(role, VARIABLE_ROLES));
    if (responseType === null || roles.some((role) => role === null)) return null;
    const uniqueRoles = Array.from(new Set(roles as AnalysisVariableRole[]));
    if (uniqueRoles.length !== roles.length) return null;
    variableNames.add(raw.name);
    variables.push({
      name: raw.name,
      blockId: raw.blockId,
      blockTitle: raw.blockTitle,
      responseType,
      required: raw.required,
      roles: uniqueRoles,
    });
  }

  for (const question of researchQuestions) {
    const references = [
      ...question.outcomeVariables,
      ...question.predictorVariables,
      ...question.covariateVariables,
    ];
    if (references.some((name) => !variableNames.has(name))) return null;
  }

  const globalUnit = parseEnum(value.globalPlan.unitOfAnalysis, ANALYSIS_UNITS);
  const globalExclusions = parseStringArray(value.globalPlan.exclusionRules);
  const globalTransformations = parseStringArray(value.globalPlan.transformations);
  const globalSensitivities = parseStringArray(value.globalPlan.sensitivityAnalyses);
  if (
    globalUnit === null
    || !boundedText(value.globalPlan.missingDataStrategy)
    || !boundedText(value.globalPlan.multiplicityStrategy)
    || !globalExclusions
    || !globalTransformations
    || !globalSensitivities
  ) return null;

  if (
    !["ready", "needs-planning"].includes(String(value.readiness.status))
    || !Number.isInteger(value.readiness.warningCount)
    || Number(value.readiness.warningCount) < 0
    || !Array.isArray(value.readiness.issues)
    || value.readiness.issues.length > 2_000
  ) return null;
  const readinessIssues = value.readiness.issues.map(parseIssue);
  if (readinessIssues.some((issue) => issue === null)) return null;

  const contract: AnalysisContract = {
    schemaVersion: ANALYSIS_CONTRACT_SCHEMA_VERSION,
    projectId: value.projectId,
    frozenAt: value.frozenAt,
    provenance: {
      studyDesignSchemaVersion: value.provenance.studyDesignSchemaVersion as number | null,
      studyDesignUpdatedAt: value.provenance.studyDesignUpdatedAt as string | null,
      experimentStudioSchemaVersion: value.provenance.experimentStudioSchemaVersion as number,
      experimentStudioUpdatedAt: value.provenance.experimentStudioUpdatedAt,
    },
    design: {
      kind,
      goal,
      setting,
      targetPopulation: value.design.targetPopulation,
      plannedSampleSize: value.design.plannedSampleSize,
      alpha: value.design.alpha as "0.05" | "0.01",
      power: value.design.power as "0.80" | "0.90",
    },
    researchQuestions,
    variables,
    globalPlan: {
      unitOfAnalysis: globalUnit,
      missingDataStrategy: value.globalPlan.missingDataStrategy,
      exclusionRules: globalExclusions,
      transformations: globalTransformations,
      multiplicityStrategy: value.globalPlan.multiplicityStrategy,
      sensitivityAnalyses: globalSensitivities,
    },
    dataAccessDeclaration: "not-declared",
    readiness: {
      status: value.readiness.status as AnalysisContract["readiness"]["status"],
      warningCount: value.readiness.warningCount as number,
      issues: readinessIssues as AnalysisContractIssue[],
    },
  };
  const expectedIssues = validateAnalysisContract(contract);
  const expectedStatus = expectedIssues.length === 0 ? "ready" : "needs-planning";
  const issuesMatch = contract.readiness.issues.length === expectedIssues.length
    && contract.readiness.issues.every((issue, index) => {
      const expected = expectedIssues[index];
      return Boolean(expected)
        && issue.id === expected.id
        && issue.severity === expected.severity
        && issue.scope === expected.scope
        && issue.message === expected.message
        && issue.researchQuestionId === expected.researchQuestionId
        && issue.variableName === expected.variableName;
    });
  if (
    contract.readiness.status !== expectedStatus
    || contract.readiness.warningCount !== expectedIssues.length
    || !issuesMatch
  ) return null;
  try {
    if (new TextEncoder().encode(JSON.stringify(contract)).byteLength > MAX_ANALYSIS_CONTRACT_BYTES) return null;
  } catch {
    return null;
  }
  return contract;
}
