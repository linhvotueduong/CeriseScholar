import {
  ANALYSIS_CONTRACT_SCHEMA_VERSION,
  MAX_ANALYSIS_CONTRACT_BYTES,
  MAX_ANALYSIS_RESEARCH_QUESTIONS,
  MAX_ANALYSIS_RULES,
  MAX_ANALYSIS_TEXT_LENGTH,
  MAX_ANALYSIS_VARIABLES,
  type AnalysisContract,
  type AnalysisDesignation,
  type AnalysisUnit,
  type AnalysisVariableRole,
} from "./analysisContract";
import type { ExperimentRelease } from "./experimentRelease";

export const ANALYSIS_PLAN_SCHEMA_VERSION = 1 as const;
export const MAX_ANALYSIS_PLAN_BYTES = MAX_ANALYSIS_CONTRACT_BYTES;

export type AnalysisPlanDataAccess =
  | "not-declared"
  | "not-accessed"
  | "accessed-before-planning";

export type AnalysisPlanSection =
  | "release"
  | "questions"
  | "variables"
  | "global"
  | "readiness";

export interface AnalysisEstimand {
  population: string;
  exposureOrIntervention: string;
  comparator: string;
  outcome: string;
  summaryMeasure: string;
  timepoint: string;
}

export interface AnalysisPlanResearchQuestion {
  id: string;
  question: string;
  hypothesis: string;
  designation: AnalysisDesignation;
  estimand: AnalysisEstimand;
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

export interface AnalysisPlanVariable {
  name: string;
  blockId: string;
  blockTitle: string;
  responseType: string;
  required: boolean;
  roles: AnalysisVariableRole[];
}

export interface AnalysisPlanIssue {
  id: string;
  scope: "plan" | "research-question" | "variable";
  message: string;
  researchQuestionId?: string;
  variableName?: string;
}

export interface AnalysisPlanReadiness {
  status: "ready" | "needs-planning";
  completedDecisions: number;
  totalDecisions: number;
  issues: AnalysisPlanIssue[];
}

export interface AnalysisPlanDocument {
  schemaVersion: typeof ANALYSIS_PLAN_SCHEMA_VERSION;
  projectId: string;
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  contractSchemaVersion: typeof ANALYSIS_CONTRACT_SCHEMA_VERSION;
  contractChecksum: string;
  contractFrozenAt: string;
  createdAt: string;
  updatedAt: string;
  researchQuestions: AnalysisPlanResearchQuestion[];
  variables: AnalysisPlanVariable[];
  globalPlan: {
    unitOfAnalysis: AnalysisUnit;
    missingDataStrategy: string;
    exclusionRules: string[];
    transformations: string[];
    multiplicityStrategy: string;
    sensitivityAnalyses: string[];
  };
  dataAccessDeclaration: AnalysisPlanDataAccess;
  readiness: AnalysisPlanReadiness;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DESIGNATIONS: readonly AnalysisDesignation[] = [
  "unspecified",
  "primary",
  "secondary",
  "exploratory",
];
const ANALYSIS_UNITS: readonly AnalysisUnit[] = [
  "unspecified",
  "participant",
  "trial",
  "response",
];
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
const DATA_ACCESS_VALUES: readonly AnalysisPlanDataAccess[] = [
  "not-declared",
  "not-accessed",
  "accessed-before-planning",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedText(value: unknown, maximum = MAX_ANALYSIS_TEXT_LENGTH): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function cleanText(value: unknown, maximum = MAX_ANALYSIS_TEXT_LENGTH): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function parseEnum<T extends string>(value: unknown, values: readonly T[]): T | null {
  return typeof value === "string" && values.includes(value as T) ? value as T : null;
}

function parseTextArray(value: unknown, maximum = MAX_ANALYSIS_RULES): string[] | null {
  if (!Array.isArray(value) || value.length > maximum) return null;
  if (!value.every((item) => boundedText(item))) return null;
  return value.map((item) => cleanText(item)).filter(Boolean);
}

function parseEstimand(value: unknown): AnalysisEstimand | null {
  if (!isRecord(value)) return null;
  const keys: ReadonlyArray<keyof AnalysisEstimand> = [
    "population",
    "exposureOrIntervention",
    "comparator",
    "outcome",
    "summaryMeasure",
    "timepoint",
  ];
  if (!keys.every((key) => boundedText(value[key]))) return null;
  return {
    population: cleanText(value.population),
    exposureOrIntervention: cleanText(value.exposureOrIntervention),
    comparator: cleanText(value.comparator),
    outcome: cleanText(value.outcome),
    summaryMeasure: cleanText(value.summaryMeasure),
    timepoint: cleanText(value.timepoint),
  };
}

function planResearchQuestion(
  contract: AnalysisContract,
  question: AnalysisContract["researchQuestions"][number],
): AnalysisPlanResearchQuestion {
  return {
    id: question.id,
    question: question.question,
    hypothesis: question.hypothesis,
    designation: question.designation,
    estimand: {
      population: contract.design.targetPopulation,
      exposureOrIntervention: question.predictorVariables.join(", "),
      comparator: "",
      outcome: question.outcomeVariables.join(", "),
      summaryMeasure: question.effectSize,
      timepoint: "",
    },
    outcomeVariables: [...question.outcomeVariables],
    predictorVariables: [...question.predictorVariables],
    covariateVariables: [...question.covariateVariables],
    unitOfAnalysis: question.unitOfAnalysis,
    plannedMethod: question.plannedMethod,
    effectSize: question.effectSize,
    missingDataStrategy: question.missingDataStrategy,
    exclusionRules: [...question.exclusionRules],
    transformations: [...question.transformations],
    multiplicityStrategy: question.multiplicityStrategy,
    sensitivityAnalyses: [...question.sensitivityAnalyses],
  };
}

export function collectAnalysisPlanReadiness(
  plan: Omit<AnalysisPlanDocument, "readiness"> | AnalysisPlanDocument,
): AnalysisPlanReadiness {
  const issues: AnalysisPlanIssue[] = [];
  let completedDecisions = 0;
  const decisionsPerQuestion = 8;

  if (plan.researchQuestions.length === 0) {
    issues.push({
      id: "analysis-plan-no-research-questions",
      scope: "plan",
      message: "The frozen release does not contain a research question to plan.",
    });
  }

  for (const question of plan.researchQuestions) {
    const checks: ReadonlyArray<[string, boolean, string]> = [
      [
        "designation",
        question.designation !== "unspecified",
        "Classify this question as primary, secondary, or exploratory.",
      ],
      [
        "population",
        Boolean(question.estimand.population.trim()),
        "Define the population represented by this estimand.",
      ],
      [
        "estimand-outcome",
        Boolean(question.estimand.outcome.trim()),
        "Define the outcome component of this estimand.",
      ],
      [
        "outcome-variable",
        question.outcomeVariables.length > 0,
        "Map at least one frozen outcome variable.",
      ],
      [
        "method",
        Boolean(question.plannedMethod.trim()),
        "Record the planned analysis method.",
      ],
      [
        "unit",
        question.unitOfAnalysis !== "unspecified",
        "Choose the unit of analysis.",
      ],
      [
        "missingness",
        Boolean(question.missingDataStrategy.trim()),
        "Record how missing data will be handled.",
      ],
      [
        "multiplicity",
        Boolean(question.multiplicityStrategy.trim()),
        "Record the multiplicity strategy, including when no adjustment is planned.",
      ],
    ];

    for (const [id, complete, message] of checks) {
      if (complete) {
        completedDecisions += 1;
      } else {
        issues.push({
          id: `analysis-plan-${question.id}-${id}`,
          scope: "research-question",
          researchQuestionId: question.id,
          message,
        });
      }
    }
  }

  if (plan.dataAccessDeclaration === "not-declared") {
    issues.push({
      id: "analysis-plan-data-access",
      scope: "plan",
      message: "Declare whether participant data was accessed before this plan was completed.",
    });
  } else {
    completedDecisions += 1;
  }

  for (const variable of plan.variables) {
    if (variable.roles.includes("unassigned")) {
      issues.push({
        id: `analysis-plan-variable-${variable.name}`,
        scope: "variable",
        variableName: variable.name,
        message: "Assign this frozen variable an analysis or administrative role.",
      });
    } else {
      completedDecisions += 1;
    }
  }

  const totalDecisions =
    plan.researchQuestions.length * decisionsPerQuestion
    + plan.variables.length
    + 1;
  return {
    status: issues.length === 0 ? "ready" : "needs-planning",
    completedDecisions,
    totalDecisions,
    issues,
  };
}

export function createAnalysisPlanDocument(
  release: ExperimentRelease,
  now = new Date().toISOString(),
): AnalysisPlanDocument | null {
  const contract = release.manifest.analysisContract;
  const contractChecksum = release.manifest.analysisContractChecksum;
  if (
    !contract
    || !contractChecksum
    || release.manifest.analysisContractSchemaVersion !== ANALYSIS_CONTRACT_SCHEMA_VERSION
  ) return null;

  const core: Omit<AnalysisPlanDocument, "readiness"> = {
    schemaVersion: ANALYSIS_PLAN_SCHEMA_VERSION,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractSchemaVersion: ANALYSIS_CONTRACT_SCHEMA_VERSION,
    contractChecksum,
    contractFrozenAt: contract.frozenAt,
    createdAt: now,
    updatedAt: now,
    researchQuestions: contract.researchQuestions.map((question) => (
      planResearchQuestion(contract, question)
    )),
    variables: contract.variables.map((variable) => ({
      ...variable,
      roles: [...variable.roles],
    })),
    globalPlan: {
      unitOfAnalysis: contract.globalPlan.unitOfAnalysis,
      missingDataStrategy: contract.globalPlan.missingDataStrategy,
      exclusionRules: [...contract.globalPlan.exclusionRules],
      transformations: [...contract.globalPlan.transformations],
      multiplicityStrategy: contract.globalPlan.multiplicityStrategy,
      sensitivityAnalyses: [...contract.globalPlan.sensitivityAnalyses],
    },
    dataAccessDeclaration: "not-declared",
  };
  return { ...core, readiness: collectAnalysisPlanReadiness(core) };
}

export function normalizeAnalysisPlanDocument(
  value: unknown,
  release: ExperimentRelease,
): AnalysisPlanDocument | null {
  if (!isRecord(value) || value.schemaVersion !== ANALYSIS_PLAN_SCHEMA_VERSION) return null;
  const contract = release.manifest.analysisContract;
  const contractChecksum = release.manifest.analysisContractChecksum;
  if (!contract || !contractChecksum) return null;
  if (
    value.projectId !== release.projectId
    || value.releaseId !== release.releaseId
    || value.releaseNumber !== release.releaseNumber
    || value.releaseChecksum !== release.checksum
    || value.contractSchemaVersion !== ANALYSIS_CONTRACT_SCHEMA_VERSION
    || value.contractChecksum !== contractChecksum
    || value.contractFrozenAt !== contract.frozenAt
    || !boundedText(value.createdAt, 40)
    || !boundedText(value.updatedAt, 40)
    || !Array.isArray(value.researchQuestions)
    || value.researchQuestions.length > MAX_ANALYSIS_RESEARCH_QUESTIONS
    || !Array.isArray(value.variables)
    || value.variables.length > MAX_ANALYSIS_VARIABLES
    || !isRecord(value.globalPlan)
  ) return null;

  const dataAccessDeclaration = parseEnum(value.dataAccessDeclaration, DATA_ACCESS_VALUES);
  if (dataAccessDeclaration === null) return null;

  const contractQuestions = new Map(contract.researchQuestions.map((item) => [item.id, item]));
  const frozenVariableNames = new Set(contract.variables.map((item) => item.name));
  const researchQuestions: AnalysisPlanResearchQuestion[] = [];
  const seenQuestionIds = new Set<string>();

  for (const raw of value.researchQuestions) {
    if (
      !isRecord(raw)
      || !boundedText(raw.id, 100)
      || seenQuestionIds.has(raw.id)
      || !boundedText(raw.question)
      || !boundedText(raw.hypothesis)
      || !boundedText(raw.plannedMethod)
      || !boundedText(raw.effectSize)
      || !boundedText(raw.missingDataStrategy)
      || !boundedText(raw.multiplicityStrategy)
    ) return null;
    const frozen = contractQuestions.get(raw.id);
    if (!frozen || raw.question !== frozen.question || raw.hypothesis !== frozen.hypothesis) return null;
    const designation = parseEnum(raw.designation, DESIGNATIONS);
    const unitOfAnalysis = parseEnum(raw.unitOfAnalysis, ANALYSIS_UNITS);
    const estimand = parseEstimand(raw.estimand);
    const outcomeVariables = parseTextArray(raw.outcomeVariables, MAX_ANALYSIS_VARIABLES);
    const predictorVariables = parseTextArray(raw.predictorVariables, MAX_ANALYSIS_VARIABLES);
    const covariateVariables = parseTextArray(raw.covariateVariables, MAX_ANALYSIS_VARIABLES);
    const exclusionRules = parseTextArray(raw.exclusionRules);
    const transformations = parseTextArray(raw.transformations);
    const sensitivityAnalyses = parseTextArray(raw.sensitivityAnalyses);
    if (
      designation === null
      || unitOfAnalysis === null
      || !estimand
      || !outcomeVariables
      || !predictorVariables
      || !covariateVariables
      || !exclusionRules
      || !transformations
      || !sensitivityAnalyses
      || [...outcomeVariables, ...predictorVariables, ...covariateVariables]
        .some((name) => !frozenVariableNames.has(name))
    ) return null;
    seenQuestionIds.add(raw.id);
    researchQuestions.push({
      id: raw.id,
      question: raw.question,
      hypothesis: raw.hypothesis,
      designation,
      estimand,
      outcomeVariables,
      predictorVariables,
      covariateVariables,
      unitOfAnalysis,
      plannedMethod: cleanText(raw.plannedMethod),
      effectSize: cleanText(raw.effectSize),
      missingDataStrategy: cleanText(raw.missingDataStrategy),
      exclusionRules,
      transformations,
      multiplicityStrategy: cleanText(raw.multiplicityStrategy),
      sensitivityAnalyses,
    });
  }
  if (researchQuestions.length !== contract.researchQuestions.length) return null;

  const contractVariables = new Map(contract.variables.map((item) => [item.name, item]));
  const variables: AnalysisPlanVariable[] = [];
  const seenVariableNames = new Set<string>();
  for (const raw of value.variables) {
    if (
      !isRecord(raw)
      || !boundedText(raw.name, 100)
      || seenVariableNames.has(raw.name)
      || !boundedText(raw.blockId, 100)
      || !boundedText(raw.blockTitle, 200)
      || !boundedText(raw.responseType, 100)
      || typeof raw.required !== "boolean"
      || !Array.isArray(raw.roles)
      || raw.roles.length < 1
      || raw.roles.length > VARIABLE_ROLES.length
    ) return null;
    const frozen = contractVariables.get(raw.name);
    if (
      !frozen
      || raw.blockId !== frozen.blockId
      || raw.blockTitle !== frozen.blockTitle
      || raw.responseType !== frozen.responseType
      || raw.required !== frozen.required
    ) return null;
    const roles = raw.roles.map((role) => parseEnum(role, VARIABLE_ROLES));
    if (roles.some((role) => role === null)) return null;
    const uniqueRoles = Array.from(new Set(roles as AnalysisVariableRole[]));
    if (uniqueRoles.length !== roles.length) return null;
    seenVariableNames.add(raw.name);
    variables.push({
      name: raw.name,
      blockId: raw.blockId,
      blockTitle: raw.blockTitle,
      responseType: raw.responseType,
      required: raw.required,
      roles: uniqueRoles,
    });
  }
  if (variables.length !== contract.variables.length) return null;

  const globalUnit = parseEnum(value.globalPlan.unitOfAnalysis, ANALYSIS_UNITS);
  const globalExclusions = parseTextArray(value.globalPlan.exclusionRules);
  const globalTransformations = parseTextArray(value.globalPlan.transformations);
  const globalSensitivities = parseTextArray(value.globalPlan.sensitivityAnalyses);
  if (
    globalUnit === null
    || !boundedText(value.globalPlan.missingDataStrategy)
    || !boundedText(value.globalPlan.multiplicityStrategy)
    || !globalExclusions
    || !globalTransformations
    || !globalSensitivities
  ) return null;

  const core: Omit<AnalysisPlanDocument, "readiness"> = {
    schemaVersion: ANALYSIS_PLAN_SCHEMA_VERSION,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractSchemaVersion: ANALYSIS_CONTRACT_SCHEMA_VERSION,
    contractChecksum,
    contractFrozenAt: contract.frozenAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    researchQuestions,
    variables,
    globalPlan: {
      unitOfAnalysis: globalUnit,
      missingDataStrategy: cleanText(value.globalPlan.missingDataStrategy),
      exclusionRules: globalExclusions,
      transformations: globalTransformations,
      multiplicityStrategy: cleanText(value.globalPlan.multiplicityStrategy),
      sensitivityAnalyses: globalSensitivities,
    },
    dataAccessDeclaration,
  };
  const normalized = { ...core, readiness: collectAnalysisPlanReadiness(core) };
  try {
    if (new TextEncoder().encode(JSON.stringify(normalized)).byteLength > MAX_ANALYSIS_PLAN_BYTES) {
      return null;
    }
  } catch {
    return null;
  }
  return normalized;
}

export function analysisPlanStorageKey(projectId: string, releaseId: string): string {
  return `cerise-analysis-plan:${projectId}:${releaseId}:v${ANALYSIS_PLAN_SCHEMA_VERSION}`;
}

export function readAnalysisPlanDocument(
  storage: StorageLike,
  release: ExperimentRelease,
): AnalysisPlanDocument | null {
  const stored = storage.getItem(analysisPlanStorageKey(release.projectId, release.releaseId));
  if (!stored) return null;
  if (new TextEncoder().encode(stored).byteLength > MAX_ANALYSIS_PLAN_BYTES) return null;
  try {
    return normalizeAnalysisPlanDocument(JSON.parse(stored), release);
  } catch {
    return null;
  }
}

export function writeAnalysisPlanDocument(
  storage: StorageLike,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
): AnalysisPlanDocument {
  const normalized = normalizeAnalysisPlanDocument(plan, release);
  if (!normalized) throw new Error("The analysis plan failed validation and was not saved.");
  storage.setItem(
    analysisPlanStorageKey(release.projectId, release.releaseId),
    JSON.stringify(normalized),
  );
  return normalized;
}
