import type { AnalysisPlanDataAccess, AnalysisPlanDocument } from "./analysisPlan";
import { collectExperimentVariables } from "./experimentStudio";
import {
  normalizeExperimentRelease,
  sha256Checksum,
  verifyExperimentRelease,
  type ExperimentRelease,
} from "./experimentRelease";

export const DATA_INTAKE_AUDIT_SCHEMA_VERSION = 1 as const;
export const MAX_DATA_INTAKE_FILE_BYTES = 16 * 1024 * 1024;
export const MAX_DATA_INTAKE_TOTAL_BYTES = 36 * 1024 * 1024;
export const MAX_DATA_INTAKE_SESSIONS = 20_000;
export const MAX_DATA_INTAKE_TRIALS = 250_000;
export const MAX_DATA_INTAKE_VARIABLES = 512;
export const MAX_DATA_INTAKE_RECEIPT_BYTES = 256 * 1024;

export type DataIntakeIssueSeverity = "blocking" | "review" | "information";
export type DataIntakeIssueCategory =
  | "planning"
  | "identity"
  | "cohort"
  | "schema"
  | "quality";
export type DataIntakeAuditStatus = "blocked" | "review" | "pass";

export interface DataIntakeIssue {
  id: string;
  severity: DataIntakeIssueSeverity;
  category: DataIntakeIssueCategory;
  message: string;
}

export interface DataIntakeSourceFile {
  role: "release" | "codebook" | "analysis-contract" | "production" | "pilot";
  name: string;
  byteSize: number;
  checksum: string;
}

export interface DataIntakeModeSummary {
  total: number;
  started: number;
  completed: number;
  withdrawn: number;
  trialRows: number;
}

export interface DataIntakeVariableSummary {
  name: string;
  required: boolean;
  completedProductionCount: number;
  missingCount: number;
  missingRate: number;
}

export interface DataIntakeConditionSummary {
  id: string;
  name: string;
  completedProductionCount: number;
}

export interface DataIntakeAuditReceipt {
  schemaVersion: typeof DATA_INTAKE_AUDIT_SCHEMA_VERSION;
  projectId: string;
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  contractChecksum: string;
  auditedAt: string;
  reviewedAt: string;
  sourceExportedAt: {
    production: string;
    pilot: string;
  };
  sourceFiles: DataIntakeSourceFile[];
  analysisPlan: {
    updatedAt: string;
    readiness: "ready" | "needs-planning";
    dataAccessDeclaration: AnalysisPlanDataAccess;
  };
  dataAccessEvent: {
    observedAt: string;
    deviceReported: true;
    interpretation: "local-intake-after-plan-snapshot";
  };
  identity: {
    releaseVerified: boolean;
    contractMatched: boolean;
    codebookMatched: boolean;
  };
  cohortSeparation: {
    productionModeVerified: boolean;
    pilotModeVerified: boolean;
    crossModeDuplicateSessions: number;
  };
  modes: {
    production: DataIntakeModeSummary;
    pilot: DataIntakeModeSummary;
  };
  schema: {
    expectedVariables: string[];
    observedVariables: string[];
    unexpectedVariables: string[];
    neverObservedVariables: string[];
  };
  variables: DataIntakeVariableSummary[];
  conditions: DataIntakeConditionSummary[];
  quality: {
    duplicateSessionIds: number;
    unknownConditionSessions: number;
    invalidTimestampSessions: number;
    withdrawnPayloadViolations: number;
    missingRequiredResponses: number;
    primaryOutcomeMissingCount: number;
    primaryOutcomeCompletedCount: number;
    primaryOutcomeMissingRate: number;
  };
  issues: DataIntakeIssue[];
  status: DataIntakeAuditStatus;
  rawDataRetention: "discarded-after-local-aggregation";
  scientificClaim:
    "read-only-structural-audit-not-validity-certification-or-statistical-analysis";
}

export interface DataIntakeBundleInput {
  release: unknown;
  codebook: unknown;
  analysisContract: unknown;
  production: unknown;
  pilot: unknown;
  sourceFiles: DataIntakeSourceFile[];
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface ParsedMode {
  exportedAt: string;
  modeVerified: boolean;
  summary: DataIntakeModeSummary;
  sessionIds: Set<string>;
  observedVariables: Set<string>;
  missingByVariable: Map<string, number>;
  conditionCounts: Map<string, number>;
  duplicateSessionIds: number;
  unknownConditionSessions: number;
  invalidTimestampSessions: number;
  withdrawnPayloadViolations: number;
  missingRequiredResponses: number;
  primaryOutcomeMissingCount: number;
  primaryOutcomeCompletedCount: number;
  issues: DataIntakeIssue[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedString(value: unknown, maximum = 400): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function isSafeChecksum(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function safeJsonByteLength(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function finiteNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number"
    && Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0;
}

function hasResponse(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function payloadHasContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return isRecord(value) && Object.keys(value).length > 0;
}

function issue(
  id: string,
  severity: DataIntakeIssueSeverity,
  category: DataIntakeIssueCategory,
  message: string,
): DataIntakeIssue {
  return { id, severity, category, message };
}

function collectStatus(issues: DataIntakeIssue[]): DataIntakeAuditStatus {
  if (issues.some((item) => item.severity === "blocking")) return "blocked";
  if (issues.some((item) => item.severity === "review")) return "review";
  return "pass";
}

function codebookMatchesRelease(
  value: unknown,
  release: ExperimentRelease,
): { matched: boolean; issues: DataIntakeIssue[] } {
  const issues: DataIntakeIssue[] = [];
  if (!isRecord(value)) {
    return {
      matched: false,
      issues: [issue(
        "codebook-invalid",
        "blocking",
        "identity",
        "codebook.json is not a valid Cerise codebook object.",
      )],
    };
  }
  const contractChecksum = release.manifest.analysisContractChecksum;
  if (
    value.releaseId !== release.releaseId
    || value.releaseNumber !== release.releaseNumber
    || value.releaseChecksum !== release.checksum
  ) {
    issues.push(issue(
      "codebook-release-mismatch",
      "blocking",
      "identity",
      "The codebook does not identify the selected frozen release.",
    ));
  }
  if (
    !isRecord(value.analysisContract)
    || value.analysisContract.checksum !== contractChecksum
    || value.analysisContract.schemaVersion !== release.manifest.analysisContractSchemaVersion
  ) {
    issues.push(issue(
      "codebook-contract-mismatch",
      "blocking",
      "identity",
      "The codebook analysis-contract identity does not match the frozen release.",
    ));
  }
  const expected = collectExperimentVariables(release.studio);
  if (
    !Array.isArray(value.variables)
    || value.variables.length > MAX_DATA_INTAKE_VARIABLES
    || value.variables.length !== expected.length
  ) {
    issues.push(issue(
      "codebook-variable-count",
      "blocking",
      "identity",
      "The codebook variable count does not match the frozen release.",
    ));
  } else {
    const codebookVariables = value.variables;
    const variablesMatch = expected.every((variable, index) => {
      const candidate = codebookVariables[index];
      return isRecord(candidate)
        && candidate.name === variable.name
        && candidate.blockId === variable.blockId
        && candidate.blockTitle === variable.blockTitle
        && candidate.responseType === variable.responseType
        && candidate.required === variable.required;
    });
    if (!variablesMatch) {
      issues.push(issue(
        "codebook-variable-schema",
        "blocking",
        "identity",
        "The codebook variable definitions differ from the frozen release.",
      ));
    }
  }
  return { matched: issues.length === 0, issues };
}

function emptyModeSummary(): DataIntakeModeSummary {
  return { total: 0, started: 0, completed: 0, withdrawn: 0, trialRows: 0 };
}

function parseMode(
  value: unknown,
  expectedMode: "production" | "pilot",
  release: ExperimentRelease,
  expectedVariables: ReturnType<typeof collectExperimentVariables>,
  primaryOutcomeVariables: Set<string>,
): ParsedMode {
  const output: ParsedMode = {
    exportedAt: "",
    modeVerified: false,
    summary: emptyModeSummary(),
    sessionIds: new Set(),
    observedVariables: new Set(),
    missingByVariable: new Map(expectedVariables.map((variable) => [variable.name, 0])),
    conditionCounts: new Map(),
    duplicateSessionIds: 0,
    unknownConditionSessions: 0,
    invalidTimestampSessions: 0,
    withdrawnPayloadViolations: 0,
    missingRequiredResponses: 0,
    primaryOutcomeMissingCount: 0,
    primaryOutcomeCompletedCount: 0,
    issues: [],
  };

  if (
    !isRecord(value)
    || safeJsonByteLength(value) > MAX_DATA_INTAKE_FILE_BYTES
    || value.releaseId !== release.releaseId
    || value.releaseChecksum !== release.checksum
    || value.executionMode !== expectedMode
    || !boundedString(value.exportedAt, 40)
    || !Array.isArray(value.sessions)
    || value.sessions.length > MAX_DATA_INTAKE_SESSIONS
  ) {
    output.issues.push(issue(
      `${expectedMode}-export-invalid`,
      "blocking",
      "cohort",
      `The ${expectedMode} responses export is invalid, too large, or does not match this release.`,
    ));
    return output;
  }

  output.exportedAt = value.exportedAt;
  output.modeVerified = true;
  const conditionIds = new Set(release.studio.conditions.map((condition) => condition.id));
  const expectedNames = new Set(expectedVariables.map((variable) => variable.name));
  let totalTrials = 0;

  for (const candidate of value.sessions) {
    if (
      !isRecord(candidate)
      || !boundedString(candidate.sessionId, 200)
      || !boundedString(candidate.status, 20)
      || !["started", "completed", "withdrawn"].includes(candidate.status)
      || candidate.releaseId !== release.releaseId
      || candidate.releaseChecksum !== release.checksum
      || candidate.executionMode !== expectedMode
      || !isRecord(candidate.condition)
      || !boundedString(candidate.condition.id, 100)
      || !isRecord(candidate.responses)
    ) {
      output.issues.push(issue(
        `${expectedMode}-session-invalid`,
        "blocking",
        "schema",
        `At least one ${expectedMode} session does not match the frozen response schema.`,
      ));
      continue;
    }

    output.summary.total += 1;
    if (candidate.status === "completed") output.summary.completed += 1;
    else if (candidate.status === "withdrawn") output.summary.withdrawn += 1;
    else output.summary.started += 1;

    if (output.sessionIds.has(candidate.sessionId)) {
      output.duplicateSessionIds += 1;
    }
    output.sessionIds.add(candidate.sessionId);

    if (!conditionIds.has(candidate.condition.id)) {
      output.unknownConditionSessions += 1;
    } else if (candidate.status === "completed" && expectedMode === "production") {
      output.conditionCounts.set(
        candidate.condition.id,
        (output.conditionCounts.get(candidate.condition.id) ?? 0) + 1,
      );
    }

    const startedAt = boundedString(candidate.startedAt, 40)
      ? Date.parse(candidate.startedAt)
      : Number.NaN;
    const updatedAt = boundedString(candidate.updatedAt, 40)
      ? Date.parse(candidate.updatedAt)
      : Number.NaN;
    if (!Number.isFinite(startedAt) || !Number.isFinite(updatedAt) || updatedAt < startedAt) {
      output.invalidTimestampSessions += 1;
    }

    const responseKeys = Object.keys(candidate.responses);
    if (responseKeys.length > MAX_DATA_INTAKE_VARIABLES) {
      output.issues.push(issue(
        `${expectedMode}-response-width`,
        "blocking",
        "schema",
        `A ${expectedMode} session contains more response fields than the intake limit.`,
      ));
      continue;
    }
    for (const key of responseKeys) output.observedVariables.add(key);

    const trials = Array.isArray(candidate.trials)
      ? candidate.trials
      : Array.isArray(candidate.trialResults)
        ? candidate.trialResults
        : [];
    totalTrials += trials.length;
    if (totalTrials > MAX_DATA_INTAKE_TRIALS) {
      output.issues.push(issue(
        `${expectedMode}-trial-limit`,
        "blocking",
        "schema",
        `The ${expectedMode} export exceeds the Phase 8.2 trial-row limit.`,
      ));
      break;
    }

    if (candidate.status === "withdrawn") {
      if (
        payloadHasContent(candidate.responses)
        || payloadHasContent(candidate.trials)
        || payloadHasContent(candidate.trialResults)
        || payloadHasContent(candidate.audioResponses)
        || payloadHasContent(candidate.videoResponses)
      ) {
        output.withdrawnPayloadViolations += 1;
      }
      continue;
    }

    if (candidate.status === "completed" && expectedMode === "production") {
      let primaryMissing = false;
      for (const variable of expectedVariables) {
        const present = hasResponse(candidate.responses[variable.name]);
        if (!present) {
          output.missingByVariable.set(
            variable.name,
            (output.missingByVariable.get(variable.name) ?? 0) + 1,
          );
          if (variable.required) output.missingRequiredResponses += 1;
          if (primaryOutcomeVariables.has(variable.name)) primaryMissing = true;
        }
      }
      if (primaryOutcomeVariables.size > 0) {
        output.primaryOutcomeCompletedCount += 1;
        if (primaryMissing) output.primaryOutcomeMissingCount += 1;
      }
    }

    for (const key of responseKeys) {
      if (!expectedNames.has(key)) output.observedVariables.add(key);
    }
  }

  output.summary.trialRows = totalTrials;
  if (output.duplicateSessionIds > 0) {
    output.issues.push(issue(
      `${expectedMode}-duplicate-sessions`,
      "blocking",
      "quality",
      `${output.duplicateSessionIds} duplicate ${expectedMode} session ID(s) were found.`,
    ));
  }
  if (output.unknownConditionSessions > 0) {
    output.issues.push(issue(
      `${expectedMode}-unknown-conditions`,
      "blocking",
      "schema",
      `${output.unknownConditionSessions} ${expectedMode} session(s) reference an unknown condition.`,
    ));
  }
  if (output.invalidTimestampSessions > 0) {
    output.issues.push(issue(
      `${expectedMode}-invalid-timestamps`,
      "review",
      "quality",
      `${output.invalidTimestampSessions} ${expectedMode} session(s) have invalid or reversed timestamps.`,
    ));
  }
  if (output.withdrawnPayloadViolations > 0) {
    output.issues.push(issue(
      `${expectedMode}-withdrawal-payload`,
      "blocking",
      "quality",
      `${output.withdrawnPayloadViolations} withdrawn ${expectedMode} session(s) still contain response data.`,
    ));
  }
  return output;
}

function normalizeSourceFiles(value: unknown): DataIntakeSourceFile[] | null {
  if (!Array.isArray(value) || value.length !== 5) return null;
  const roles = new Set<DataIntakeSourceFile["role"]>();
  const output: DataIntakeSourceFile[] = [];
  for (const candidate of value) {
    if (
      !isRecord(candidate)
      || !["release", "codebook", "analysis-contract", "production", "pilot"].includes(
        String(candidate.role),
      )
      || !boundedString(candidate.name, 240)
      || !finiteNonNegativeInteger(candidate.byteSize)
      || candidate.byteSize > MAX_DATA_INTAKE_FILE_BYTES
      || !isSafeChecksum(candidate.checksum)
    ) return null;
    const role = candidate.role as DataIntakeSourceFile["role"];
    if (roles.has(role)) return null;
    roles.add(role);
    output.push({
      role,
      name: candidate.name,
      byteSize: candidate.byteSize,
      checksum: candidate.checksum,
    });
  }
  return output;
}

export async function auditDataIntakeBundle(
  input: DataIntakeBundleInput,
  expectedRelease: ExperimentRelease,
  plan: AnalysisPlanDocument | null,
  auditedAt = new Date().toISOString(),
): Promise<DataIntakeAuditReceipt> {
  const issues: DataIntakeIssue[] = [];
  const sourceFiles = normalizeSourceFiles(input.sourceFiles);
  if (
    !sourceFiles
    || sourceFiles.reduce((sum, file) => sum + file.byteSize, 0) > MAX_DATA_INTAKE_TOTAL_BYTES
  ) {
    issues.push(issue(
      "source-files-invalid",
      "blocking",
      "identity",
      "The selected export is incomplete, duplicated, or exceeds the Phase 8.2 intake limit.",
    ));
  }

  const importedRelease = normalizeExperimentRelease(input.release);
  const releaseVerified = Boolean(
    importedRelease
    && importedRelease.releaseId === expectedRelease.releaseId
    && importedRelease.checksum === expectedRelease.checksum
    && importedRelease.projectId === expectedRelease.projectId
    && await verifyExperimentRelease(importedRelease),
  );
  if (!releaseVerified) {
    issues.push(issue(
      "release-verification-failed",
      "blocking",
      "identity",
      "release.json failed integrity verification or does not match the selected release.",
    ));
  }

  const frozenContract = expectedRelease.manifest.analysisContract;
  const frozenContractChecksum = expectedRelease.manifest.analysisContractChecksum ?? "";
  const contractMatched = Boolean(
    frozenContract
    && isSafeChecksum(frozenContractChecksum)
    && safeJsonByteLength(input.analysisContract) <= MAX_DATA_INTAKE_FILE_BYTES
    && await sha256Checksum(input.analysisContract) === frozenContractChecksum
  );
  if (!contractMatched) {
    issues.push(issue(
      "contract-verification-failed",
      "blocking",
      "identity",
      "analysis-contract.json does not match the independently checksummed frozen contract.",
    ));
  }

  const codebookResult = codebookMatchesRelease(input.codebook, expectedRelease);
  issues.push(...codebookResult.issues);

  const planReady = Boolean(
    plan
    && plan.projectId === expectedRelease.projectId
    && plan.releaseId === expectedRelease.releaseId
    && plan.releaseChecksum === expectedRelease.checksum
    && plan.contractChecksum === frozenContractChecksum
    && plan.readiness.status === "ready",
  );
  if (!planReady) {
    issues.push(issue(
      "analysis-plan-not-ready",
      "blocking",
      "planning",
      "A ready Phase 8.1 analysis plan for this release is required before data intake.",
    ));
  }

  const expectedVariables = collectExperimentVariables(expectedRelease.studio)
    .slice(0, MAX_DATA_INTAKE_VARIABLES);
  const primaryOutcomeVariables = new Set(
    (plan?.researchQuestions ?? [])
      .filter((question) => question.designation === "primary")
      .flatMap((question) => question.outcomeVariables),
  );
  const production = parseMode(
    input.production,
    "production",
    expectedRelease,
    expectedVariables,
    primaryOutcomeVariables,
  );
  const pilot = parseMode(
    input.pilot,
    "pilot",
    expectedRelease,
    expectedVariables,
    primaryOutcomeVariables,
  );
  issues.push(...production.issues, ...pilot.issues);

  const crossModeDuplicateSessions = [...production.sessionIds]
    .filter((sessionId) => pilot.sessionIds.has(sessionId))
    .length;
  if (crossModeDuplicateSessions > 0) {
    issues.push(issue(
      "cross-mode-duplicate-sessions",
      "blocking",
      "cohort",
      `${crossModeDuplicateSessions} session ID(s) appear in both production and pilot exports.`,
    ));
  }
  if (production.summary.completed === 0) {
    issues.push(issue(
      "no-completed-production-sessions",
      "blocking",
      "quality",
      "No completed production session is available for preparation or analysis.",
    ));
  }
  if (production.summary.started > 0) {
    issues.push(issue(
      "incomplete-production-sessions",
      "review",
      "quality",
      `${production.summary.started} production session(s) are incomplete and remain excluded from completed-case summaries.`,
    ));
  }
  if (production.summary.withdrawn > 0) {
    issues.push(issue(
      "withdrawn-production-sessions",
      "information",
      "quality",
      `${production.summary.withdrawn} withdrawn production session(s) are retained only as empty audit records.`,
    ));
  }

  const expectedNames = expectedVariables.map((variable) => variable.name);
  const expectedNameSet = new Set(expectedNames);
  const observedVariables = [...new Set([
    ...production.observedVariables,
    ...pilot.observedVariables,
  ])].sort();
  const unexpectedVariables = observedVariables
    .filter((name) => !expectedNameSet.has(name))
    .sort();
  const neverObservedVariables = expectedNames
    .filter((name) => !observedVariables.includes(name))
    .sort();
  if (unexpectedVariables.length > 0) {
    issues.push(issue(
      "unexpected-response-fields",
      "review",
      "schema",
      `${unexpectedVariables.length} response field(s) are not declared by the frozen codebook.`,
    ));
  }
  if (neverObservedVariables.length > 0) {
    issues.push(issue(
      "never-observed-variables",
      "review",
      "schema",
      `${neverObservedVariables.length} frozen variable(s) were never observed in either export.`,
    ));
  }
  if (production.missingRequiredResponses > 0) {
    issues.push(issue(
      "missing-required-responses",
      "review",
      "quality",
      `${production.missingRequiredResponses} required response cell(s) are missing across completed production sessions.`,
    ));
  }
  if (production.primaryOutcomeMissingCount > 0) {
    issues.push(issue(
      "missing-primary-outcome",
      "review",
      "quality",
      `${production.primaryOutcomeMissingCount} completed production session(s) are missing at least one planned primary outcome.`,
    ));
  }
  if (primaryOutcomeVariables.size === 0) {
    issues.push(issue(
      "primary-outcome-not-declared",
      "review",
      "planning",
      "The ready plan does not designate a mapped primary outcome for missingness review.",
    ));
  }

  const variables = expectedVariables.map((variable) => {
    const missingCount = production.missingByVariable.get(variable.name) ?? 0;
    const denominator = production.summary.completed;
    return {
      name: variable.name,
      required: variable.required,
      completedProductionCount: denominator,
      missingCount,
      missingRate: denominator > 0 ? missingCount / denominator : 0,
    };
  });
  const conditions = expectedRelease.studio.conditions.map((condition) => ({
    id: condition.id,
    name: condition.name,
    completedProductionCount: production.conditionCounts.get(condition.id) ?? 0,
  }));
  const primaryOutcomeDenominator = production.primaryOutcomeCompletedCount;

  return {
    schemaVersion: DATA_INTAKE_AUDIT_SCHEMA_VERSION,
    projectId: expectedRelease.projectId,
    releaseId: expectedRelease.releaseId,
    releaseNumber: expectedRelease.releaseNumber,
    releaseChecksum: expectedRelease.checksum,
    contractChecksum: frozenContractChecksum,
    auditedAt,
    reviewedAt: "",
    sourceExportedAt: {
      production: production.exportedAt,
      pilot: pilot.exportedAt,
    },
    sourceFiles: sourceFiles ?? [],
    analysisPlan: {
      updatedAt: plan?.updatedAt ?? "",
      readiness: plan?.readiness.status ?? "needs-planning",
      dataAccessDeclaration: plan?.dataAccessDeclaration ?? "not-declared",
    },
    dataAccessEvent: {
      observedAt: auditedAt,
      deviceReported: true,
      interpretation: "local-intake-after-plan-snapshot",
    },
    identity: {
      releaseVerified,
      contractMatched,
      codebookMatched: codebookResult.matched,
    },
    cohortSeparation: {
      productionModeVerified: production.modeVerified,
      pilotModeVerified: pilot.modeVerified,
      crossModeDuplicateSessions,
    },
    modes: {
      production: production.summary,
      pilot: pilot.summary,
    },
    schema: {
      expectedVariables: expectedNames,
      observedVariables,
      unexpectedVariables,
      neverObservedVariables,
    },
    variables,
    conditions,
    quality: {
      duplicateSessionIds: production.duplicateSessionIds + pilot.duplicateSessionIds,
      unknownConditionSessions:
        production.unknownConditionSessions + pilot.unknownConditionSessions,
      invalidTimestampSessions:
        production.invalidTimestampSessions + pilot.invalidTimestampSessions,
      withdrawnPayloadViolations:
        production.withdrawnPayloadViolations + pilot.withdrawnPayloadViolations,
      missingRequiredResponses: production.missingRequiredResponses,
      primaryOutcomeMissingCount: production.primaryOutcomeMissingCount,
      primaryOutcomeCompletedCount: primaryOutcomeDenominator,
      primaryOutcomeMissingRate: primaryOutcomeDenominator > 0
        ? production.primaryOutcomeMissingCount / primaryOutcomeDenominator
        : 0,
    },
    issues,
    status: collectStatus(issues),
    rawDataRetention: "discarded-after-local-aggregation",
    scientificClaim:
      "read-only-structural-audit-not-validity-certification-or-statistical-analysis",
  };
}

function normalizeModeSummary(value: unknown): DataIntakeModeSummary | null {
  if (!isRecord(value)) return null;
  const fields: Array<keyof DataIntakeModeSummary> = [
    "total",
    "started",
    "completed",
    "withdrawn",
    "trialRows",
  ];
  if (!fields.every((field) => finiteNonNegativeInteger(value[field]))) return null;
  const total = value.total as number;
  const started = value.started as number;
  const completed = value.completed as number;
  const withdrawn = value.withdrawn as number;
  const trialRows = value.trialRows as number;
  if (total !== started + completed + withdrawn) return null;
  return {
    total,
    started,
    completed,
    withdrawn,
    trialRows,
  };
}

function normalizeIssues(value: unknown): DataIntakeIssue[] | null {
  if (!Array.isArray(value) || value.length > 200) return null;
  const output: DataIntakeIssue[] = [];
  for (const candidate of value) {
    if (
      !isRecord(candidate)
      || !boundedString(candidate.id, 160)
      || !["blocking", "review", "information"].includes(String(candidate.severity))
      || !["planning", "identity", "cohort", "schema", "quality"].includes(
        String(candidate.category),
      )
      || !boundedString(candidate.message, 600)
    ) return null;
    output.push({
      id: candidate.id,
      severity: candidate.severity as DataIntakeIssueSeverity,
      category: candidate.category as DataIntakeIssueCategory,
      message: candidate.message,
    });
  }
  return output;
}

export function normalizeDataIntakeAuditReceipt(
  value: unknown,
  release: ExperimentRelease,
): DataIntakeAuditReceipt | null {
  if (
    !isRecord(value)
    || value.schemaVersion !== DATA_INTAKE_AUDIT_SCHEMA_VERSION
    || value.projectId !== release.projectId
    || value.releaseId !== release.releaseId
    || value.releaseNumber !== release.releaseNumber
    || value.releaseChecksum !== release.checksum
    || value.contractChecksum !== release.manifest.analysisContractChecksum
    || !boundedString(value.auditedAt, 40)
    || !boundedString(value.reviewedAt, 40)
    || !isRecord(value.sourceExportedAt)
    || !boundedString(value.sourceExportedAt.production, 40)
    || !boundedString(value.sourceExportedAt.pilot, 40)
    || !isRecord(value.analysisPlan)
    || !boundedString(value.analysisPlan.updatedAt, 40)
    || !["ready", "needs-planning"].includes(String(value.analysisPlan.readiness))
    || !["not-declared", "not-accessed", "accessed-before-planning"].includes(
      String(value.analysisPlan.dataAccessDeclaration),
    )
    || !isRecord(value.dataAccessEvent)
    || !boundedString(value.dataAccessEvent.observedAt, 40)
    || value.dataAccessEvent.deviceReported !== true
    || value.dataAccessEvent.interpretation !== "local-intake-after-plan-snapshot"
    || !isRecord(value.identity)
    || typeof value.identity.releaseVerified !== "boolean"
    || typeof value.identity.contractMatched !== "boolean"
    || typeof value.identity.codebookMatched !== "boolean"
    || !isRecord(value.cohortSeparation)
    || typeof value.cohortSeparation.productionModeVerified !== "boolean"
    || typeof value.cohortSeparation.pilotModeVerified !== "boolean"
    || !finiteNonNegativeInteger(value.cohortSeparation.crossModeDuplicateSessions)
    || !isRecord(value.modes)
    || !isRecord(value.schema)
    || !isRecord(value.quality)
    || value.rawDataRetention !== "discarded-after-local-aggregation"
    || value.scientificClaim
      !== "read-only-structural-audit-not-validity-certification-or-statistical-analysis"
  ) return null;

  const sourceFiles = normalizeSourceFiles(value.sourceFiles);
  const production = normalizeModeSummary(value.modes.production);
  const pilot = normalizeModeSummary(value.modes.pilot);
  const issues = normalizeIssues(value.issues);
  if (!sourceFiles || !production || !pilot || !issues) return null;

  const textArray = (candidate: unknown): string[] | null => {
    if (
      !Array.isArray(candidate)
      || candidate.length > MAX_DATA_INTAKE_VARIABLES
      || !candidate.every((item) => boundedString(item, 200))
    ) return null;
    return candidate as string[];
  };
  const expectedVariables = textArray(value.schema.expectedVariables);
  const observedVariables = textArray(value.schema.observedVariables);
  const unexpectedVariables = textArray(value.schema.unexpectedVariables);
  const neverObservedVariables = textArray(value.schema.neverObservedVariables);
  if (
    !expectedVariables
    || !observedVariables
    || !unexpectedVariables
    || !neverObservedVariables
  ) return null;

  if (!Array.isArray(value.variables) || value.variables.length > MAX_DATA_INTAKE_VARIABLES) {
    return null;
  }
  const variables: DataIntakeVariableSummary[] = [];
  for (const candidate of value.variables) {
    if (
      !isRecord(candidate)
      || !boundedString(candidate.name, 200)
      || typeof candidate.required !== "boolean"
      || !finiteNonNegativeInteger(candidate.completedProductionCount)
      || !finiteNonNegativeInteger(candidate.missingCount)
      || typeof candidate.missingRate !== "number"
      || !Number.isFinite(candidate.missingRate)
      || candidate.missingRate < 0
      || candidate.missingRate > 1
    ) return null;
    variables.push(candidate as unknown as DataIntakeVariableSummary);
  }
  if (!Array.isArray(value.conditions) || value.conditions.length > 100) return null;
  const conditions: DataIntakeConditionSummary[] = [];
  for (const candidate of value.conditions) {
    if (
      !isRecord(candidate)
      || !boundedString(candidate.id, 100)
      || !boundedString(candidate.name, 200)
      || !finiteNonNegativeInteger(candidate.completedProductionCount)
    ) return null;
    conditions.push(candidate as unknown as DataIntakeConditionSummary);
  }

  const qualityIntegerFields: Array<keyof DataIntakeAuditReceipt["quality"]> = [
    "duplicateSessionIds",
    "unknownConditionSessions",
    "invalidTimestampSessions",
    "withdrawnPayloadViolations",
    "missingRequiredResponses",
    "primaryOutcomeMissingCount",
    "primaryOutcomeCompletedCount",
  ];
  const quality = value.quality as Record<string, unknown>;
  if (!qualityIntegerFields.every((field) => finiteNonNegativeInteger(quality[field]))) {
    return null;
  }
  if (
    typeof quality.primaryOutcomeMissingRate !== "number"
    || !Number.isFinite(quality.primaryOutcomeMissingRate)
    || quality.primaryOutcomeMissingRate < 0
    || quality.primaryOutcomeMissingRate > 1
  ) return null;

  const status = collectStatus(issues);
  if (value.status !== status) return null;
  const normalized: DataIntakeAuditReceipt = {
    ...(value as unknown as DataIntakeAuditReceipt),
    sourceFiles,
    modes: { production, pilot },
    schema: {
      expectedVariables,
      observedVariables,
      unexpectedVariables,
      neverObservedVariables,
    },
    variables,
    conditions,
    issues,
    status,
  };
  if (safeJsonByteLength(normalized) > MAX_DATA_INTAKE_RECEIPT_BYTES) return null;
  return normalized;
}

export function markDataIntakeAuditReviewed(
  receipt: DataIntakeAuditReceipt,
  release: ExperimentRelease,
  reviewedAt = new Date().toISOString(),
): DataIntakeAuditReceipt {
  const normalized = normalizeDataIntakeAuditReceipt(receipt, release);
  if (!normalized || normalized.status === "blocked") {
    throw new Error("Resolve the blocking intake issues before confirming review.");
  }
  return { ...normalized, reviewedAt };
}

export function dataIntakeAuditStorageKey(projectId: string, releaseId: string): string {
  return `cerise-data-intake-audit:${projectId}:${releaseId}:v${DATA_INTAKE_AUDIT_SCHEMA_VERSION}`;
}

export function readDataIntakeAuditReceipt(
  storage: StorageLike,
  release: ExperimentRelease,
): DataIntakeAuditReceipt | null {
  const stored = storage.getItem(dataIntakeAuditStorageKey(release.projectId, release.releaseId));
  if (!stored || new TextEncoder().encode(stored).byteLength > MAX_DATA_INTAKE_RECEIPT_BYTES) {
    return null;
  }
  try {
    return normalizeDataIntakeAuditReceipt(JSON.parse(stored), release);
  } catch {
    return null;
  }
}

export function writeDataIntakeAuditReceipt(
  storage: StorageLike,
  release: ExperimentRelease,
  receipt: DataIntakeAuditReceipt,
): DataIntakeAuditReceipt {
  const normalized = normalizeDataIntakeAuditReceipt(receipt, release);
  if (!normalized) throw new Error("The intake audit receipt failed validation and was not saved.");
  storage.setItem(
    dataIntakeAuditStorageKey(release.projectId, release.releaseId),
    JSON.stringify(normalized),
  );
  return normalized;
}

export function isDataIntakeAuditReady(receipt: DataIntakeAuditReceipt | null): boolean {
  return Boolean(
    receipt
    && receipt.status !== "blocked"
    && receipt.reviewedAt
    && receipt.identity.releaseVerified
    && receipt.identity.contractMatched
    && receipt.identity.codebookMatched
    && receipt.cohortSeparation.productionModeVerified
    && receipt.cohortSeparation.pilotModeVerified
    && receipt.cohortSeparation.crossModeDuplicateSessions === 0
    && receipt.analysisPlan.readiness === "ready",
  );
}
