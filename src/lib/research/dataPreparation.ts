import { canonicalJson, sha256Checksum, type ExperimentRelease } from "./experimentRelease";
import { collectExperimentVariables } from "./experimentStudio";
import {
  DATA_INTAKE_AUDIT_SCHEMA_VERSION,
  MAX_DATA_INTAKE_SESSIONS,
  MAX_DATA_INTAKE_TRIALS,
  MAX_DATA_INTAKE_VARIABLES,
  isDataIntakeAuditReady,
  type DataIntakeAuditReceipt,
  type DataIntakeSourceFile,
} from "./dataIntakeAudit";

export const DATA_PREPARATION_SCHEMA_VERSION = 1 as const;
export const DATA_PREPARATION_PACKAGE_VERSION = 1 as const;
export const MAX_PREPARATION_OPERATIONS = 40;
export const MAX_PREPARATION_DOCUMENT_BYTES = 256 * 1024;
export const MAX_PREPARATION_TEXT = 1_000;
export const MAX_PREPARATION_LITERAL = 200;

export const PREPARATION_META_COLUMNS = [
  "_cerise_session_id",
  "_cerise_condition_id",
  "_cerise_condition_name",
  "_cerise_started_at",
  "_cerise_updated_at",
] as const;

export type PreparationOperationType =
  | "recode-missing"
  | "trim-text"
  | "coerce-number"
  | "reverse-score"
  | "composite-score"
  | "exclude-record";

export type PreparationComparison =
  | "is-missing"
  | "equals"
  | "not-equals"
  | "less-than"
  | "greater-than";

interface PreparationOperationBase {
  id: string;
  enabled: boolean;
  rationale: string;
}

export interface RecodeMissingOperation extends PreparationOperationBase {
  type: "recode-missing";
  variableNames: string[];
  missingValues: string[];
}

export interface TrimTextOperation extends PreparationOperationBase {
  type: "trim-text";
  variableNames: string[];
}

export interface CoerceNumberOperation extends PreparationOperationBase {
  type: "coerce-number";
  variableNames: string[];
  invalidToMissing: true;
}

export interface ReverseScoreOperation extends PreparationOperationBase {
  type: "reverse-score";
  sourceVariable: string;
  targetVariable: string;
  minimum: number;
  maximum: number;
}

export interface CompositeScoreOperation extends PreparationOperationBase {
  type: "composite-score";
  sourceVariables: string[];
  targetVariable: string;
  method: "mean" | "sum";
  minimumValid: number;
}

export interface ExcludeRecordOperation extends PreparationOperationBase {
  type: "exclude-record";
  sourceVariable: string;
  comparator: PreparationComparison;
  comparisonValue: string;
}

export type PreparationOperation =
  | RecodeMissingOperation
  | TrimTextOperation
  | CoerceNumberOperation
  | ReverseScoreOperation
  | CompositeScoreOperation
  | ExcludeRecordOperation;

export interface PreparationOperationSummary {
  id: string;
  type: PreparationOperationType;
  inputRows: number;
  outputRows: number;
  affectedCells: number;
  excludedRows: number;
  createdVariables: string[];
}

export interface DataPreparationRunSummary {
  preparedAt: string;
  operationFingerprint: string;
  sourceProductionChecksum: string;
  sourceCompletedRows: number;
  sourceNonCompletedRows: number;
  inputRows: number;
  outputRows: number;
  excludedRows: number;
  inputColumns: number;
  outputColumns: number;
  inputMissingCells: number;
  outputMissingCells: number;
  inputTrialRows: number;
  outputTrialRows: number;
  operationSummaries: PreparationOperationSummary[];
  responseChecksum: string;
  trialChecksum: string;
  packageChecksum: string;
}

export interface DataPreparationReadiness {
  status: "needs-source" | "needs-review" | "needs-export" | "ready";
  issues: string[];
}

export interface DataPreparationDocument {
  schemaVersion: typeof DATA_PREPARATION_SCHEMA_VERSION;
  projectId: string;
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  contractChecksum: string;
  sourceAudit: {
    schemaVersion: typeof DATA_INTAKE_AUDIT_SCHEMA_VERSION;
    auditedAt: string;
    reviewedAt: string;
    productionChecksum: string;
  };
  createdAt: string;
  updatedAt: string;
  operations: PreparationOperation[];
  lastRun: DataPreparationRunSummary | null;
  reviewedAt: string;
  exportedAt: string;
  readiness: DataPreparationReadiness;
  rawDataRetention: "memory-only-never-persisted";
  scientificClaim:
    "deterministic-derived-data-preparation-not-statistical-analysis-or-validity-certification";
}

export type PreparationValue = string | number | boolean | null;
export type PreparedResponseRow = Record<string, PreparationValue>;

export interface PreparedTrialRow {
  _cerise_session_id: string;
  _cerise_condition_id: string;
  table_id: string;
  table_name: string;
  loop_block_id: string;
  trial_id: string;
  source_row_index: number | null;
  repetition: number | null;
  order_index: number | null;
  practice: boolean;
  response: PreparationValue;
  correct_answer: PreparationValue;
  correct: boolean | null;
  reaction_time_ms: number | null;
  deadline_ms: number | null;
  deadline_exceeded: boolean | null;
  completion_reason: string;
}

export interface DataPreparationPackage {
  packageVersion: typeof DATA_PREPARATION_PACKAGE_VERSION;
  projectId: string;
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  contractChecksum: string;
  preparedAt: string;
  source: {
    auditSchemaVersion: typeof DATA_INTAKE_AUDIT_SCHEMA_VERSION;
    auditReviewedAt: string;
    files: DataIntakeSourceFile[];
    inputBoundary:
      "completed-production-sessions-only-pilot-withdrawn-and-incomplete-excluded";
  };
  operations: PreparationOperation[];
  operationLog: PreparationOperationSummary[];
  responseColumns: string[];
  trialColumns: string[];
  responses: PreparedResponseRow[];
  trials: PreparedTrialRow[];
  integrity: {
    responseChecksum: string;
    trialChecksum: string;
    packageChecksum: string;
  };
  dataClassification: "potentially-identifying-local-research-data";
  rawSourceMutation: "none-derived-copy-only";
}

export interface BuildDataPreparationInput {
  production: unknown;
  sourceFiles: DataIntakeSourceFile[];
  release: ExperimentRelease;
  auditReceipt: DataIntakeAuditReceipt;
  document: DataPreparationDocument;
  preparedAt?: string;
}

export interface BuildDataPreparationResult {
  document: DataPreparationDocument;
  package: DataPreparationPackage;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface ParsedProduction {
  rows: PreparedResponseRow[];
  trials: PreparedTrialRow[];
  completedSessionIds: Set<string>;
  totalSessions: number;
}

export const PREPARATION_OPERATION_OPTIONS: ReadonlyArray<{
  type: PreparationOperationType;
  label: string;
  description: string;
}> = [
  {
    type: "recode-missing",
    label: "Recode missing values",
    description: "Map exact declared literals to missing in the derived copy.",
  },
  {
    type: "trim-text",
    label: "Trim text",
    description: "Remove leading and trailing whitespace from selected text fields.",
  },
  {
    type: "coerce-number",
    label: "Convert to number",
    description: "Convert canonical numeric strings; invalid values become missing.",
  },
  {
    type: "reverse-score",
    label: "Reverse score",
    description: "Create a new variable using min + max − observed value.",
  },
  {
    type: "composite-score",
    label: "Compute composite",
    description: "Create a deterministic mean or sum from selected variables.",
  },
  {
    type: "exclude-record",
    label: "Apply exclusion rule",
    description: "Exclude completed records with one explicit, reviewable comparison.",
  },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeJsonByteLength(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function boundedString(value: unknown, maximum = MAX_PREPARATION_TEXT): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function cleanText(value: unknown, maximum = MAX_PREPARATION_TEXT): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function finiteNonNegativeInteger(value: unknown): value is number {
  return finiteNumber(value) && Number.isInteger(value) && value >= 0;
}

function safeVariableName(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(value);
}

function safeOperationId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
}

function parseTextArray(
  value: unknown,
  maximum: number,
  itemMaximum = MAX_PREPARATION_LITERAL,
): string[] | null {
  if (
    !Array.isArray(value)
    || value.length > maximum
    || !value.every((item) => boundedString(item, itemMaximum))
  ) return null;
  return value.map((item) => String(item).trim());
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function productionSource(receipt: DataIntakeAuditReceipt): DataIntakeSourceFile | null {
  return receipt.sourceFiles.find((file) => file.role === "production") ?? null;
}

function sourceFilesMatch(
  selected: DataIntakeSourceFile[],
  expected: DataIntakeSourceFile[],
): boolean {
  if (selected.length !== expected.length) return false;
  return expected.every((file) => selected.some((candidate) => (
    candidate.role === file.role
    && candidate.byteSize === file.byteSize
    && candidate.checksum === file.checksum
  )));
}

function availableSourceColumns(release: ExperimentRelease): string[] {
  return [
    ...PREPARATION_META_COLUMNS,
    ...collectExperimentVariables(release.studio).map((variable) => variable.name),
  ];
}

function operationTarget(operation: PreparationOperation): string | null {
  if (operation.type === "reverse-score" || operation.type === "composite-score") {
    return operation.targetVariable;
  }
  return null;
}

function normalizeVariableSelection(value: unknown, available: Set<string>): string[] | null {
  const parsed = parseTextArray(value, MAX_DATA_INTAKE_VARIABLES, 100);
  if (!parsed || parsed.length === 0) return null;
  const unique = uniqueStrings(parsed);
  if (unique.length !== parsed.length || unique.some((name) => !available.has(name))) return null;
  return unique;
}

function normalizeOperation(
  value: unknown,
  available: Set<string>,
): PreparationOperation | null {
  if (
    !isRecord(value)
    || !safeOperationId(value.id)
    || typeof value.enabled !== "boolean"
    || !boundedString(value.rationale)
    || !PREPARATION_OPERATION_OPTIONS.some((option) => option.type === value.type)
  ) return null;

  const base = {
    id: value.id,
    enabled: value.enabled,
    rationale: cleanText(value.rationale),
  };

  if (value.type === "recode-missing") {
    const variableNames = normalizeVariableSelection(value.variableNames, available);
    const missingValues = parseTextArray(value.missingValues, 20);
    if (!variableNames || !missingValues || missingValues.length === 0) return null;
    return {
      ...base,
      type: "recode-missing",
      variableNames,
      missingValues: uniqueStrings(missingValues),
    };
  }
  if (value.type === "trim-text") {
    const variableNames = normalizeVariableSelection(value.variableNames, available);
    return variableNames ? { ...base, type: "trim-text", variableNames } : null;
  }
  if (value.type === "coerce-number") {
    const variableNames = normalizeVariableSelection(value.variableNames, available);
    if (!variableNames || value.invalidToMissing !== true) return null;
    return { ...base, type: "coerce-number", variableNames, invalidToMissing: true };
  }
  if (value.type === "reverse-score") {
    if (
      !boundedString(value.sourceVariable, 100)
      || !available.has(value.sourceVariable)
      || !safeVariableName(value.targetVariable)
      || available.has(value.targetVariable)
      || String(value.targetVariable).startsWith("_cerise_")
      || !finiteNumber(value.minimum)
      || !finiteNumber(value.maximum)
      || value.maximum <= value.minimum
    ) return null;
    return {
      ...base,
      type: "reverse-score",
      sourceVariable: value.sourceVariable,
      targetVariable: value.targetVariable,
      minimum: value.minimum,
      maximum: value.maximum,
    };
  }
  if (value.type === "composite-score") {
    const sourceVariables = normalizeVariableSelection(value.sourceVariables, available);
    if (
      !sourceVariables
      || sourceVariables.length < 2
      || !safeVariableName(value.targetVariable)
      || available.has(value.targetVariable)
      || String(value.targetVariable).startsWith("_cerise_")
      || !["mean", "sum"].includes(String(value.method))
      || !finiteNonNegativeInteger(value.minimumValid)
      || value.minimumValid < 1
      || value.minimumValid > sourceVariables.length
    ) return null;
    return {
      ...base,
      type: "composite-score",
      sourceVariables,
      targetVariable: value.targetVariable,
      method: value.method as "mean" | "sum",
      minimumValid: value.minimumValid,
    };
  }
  if (
    !boundedString(value.sourceVariable, 100)
    || !available.has(value.sourceVariable)
    || !["is-missing", "equals", "not-equals", "less-than", "greater-than"].includes(
      String(value.comparator),
    )
    || !boundedString(value.comparisonValue, MAX_PREPARATION_LITERAL)
  ) return null;
  const comparator = value.comparator as PreparationComparison;
  const comparisonValue = cleanText(value.comparisonValue, MAX_PREPARATION_LITERAL);
  if (
    comparator !== "is-missing"
    && !comparisonValue
  ) return null;
  if (
    ["less-than", "greater-than"].includes(comparator)
    && toFiniteNumeric(comparisonValue) === null
  ) return null;
  return {
    ...base,
    type: "exclude-record",
    sourceVariable: value.sourceVariable,
    comparator,
    comparisonValue,
  };
}

export function normalizePreparationOperations(
  value: unknown,
  release: ExperimentRelease,
): PreparationOperation[] | null {
  if (!Array.isArray(value) || value.length > MAX_PREPARATION_OPERATIONS) return null;
  const available = new Set(availableSourceColumns(release));
  const ids = new Set<string>();
  const output: PreparationOperation[] = [];
  for (const candidate of value) {
    const normalized = normalizeOperation(candidate, available);
    if (!normalized || ids.has(normalized.id)) return null;
    ids.add(normalized.id);
    output.push(normalized);
    const target = operationTarget(normalized);
    if (target) available.add(target);
  }
  return output;
}

export function preparationOperationFingerprint(operations: PreparationOperation[]): string {
  const value = canonicalJson(operations);
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `ops-v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createPreparationOperation(
  type: PreparationOperationType,
  ordinal: number,
  release: ExperimentRelease,
): PreparationOperation {
  const variables = collectExperimentVariables(release.studio).map((variable) => variable.name);
  const first = variables[0] ?? PREPARATION_META_COLUMNS[1];
  const second = variables[1] ?? first;
  const id = `operation-${Date.now().toString(36)}-${Math.max(1, ordinal)}`;
  if (type === "recode-missing") {
    return {
      id,
      type,
      enabled: true,
      rationale: "",
      variableNames: [first],
      missingValues: ["NA"],
    };
  }
  if (type === "trim-text") {
    return { id, type, enabled: true, rationale: "", variableNames: [first] };
  }
  if (type === "coerce-number") {
    return {
      id,
      type,
      enabled: true,
      rationale: "",
      variableNames: [first],
      invalidToMissing: true,
    };
  }
  if (type === "reverse-score") {
    return {
      id,
      type,
      enabled: true,
      rationale: "",
      sourceVariable: first,
      targetVariable: `${first.slice(0, 70)}_reversed`,
      minimum: 1,
      maximum: 7,
    };
  }
  if (type === "composite-score") {
    return {
      id,
      type,
      enabled: true,
      rationale: "",
      sourceVariables: uniqueStrings([first, second]),
      targetVariable: "composite_score",
      method: "mean",
      minimumValid: 1,
    };
  }
  return {
    id,
    type,
    enabled: true,
    rationale: "",
    sourceVariable: first,
    comparator: "is-missing",
    comparisonValue: "",
  };
}

function normalizeSourceAudit(
  value: unknown,
  audit: DataIntakeAuditReceipt,
): DataPreparationDocument["sourceAudit"] | null {
  const production = productionSource(audit);
  if (
    !production
    || !isRecord(value)
    || value.schemaVersion !== DATA_INTAKE_AUDIT_SCHEMA_VERSION
    || value.auditedAt !== audit.auditedAt
    || value.reviewedAt !== audit.reviewedAt
    || value.productionChecksum !== production.checksum
  ) return null;
  return {
    schemaVersion: DATA_INTAKE_AUDIT_SCHEMA_VERSION,
    auditedAt: audit.auditedAt,
    reviewedAt: audit.reviewedAt,
    productionChecksum: production.checksum,
  };
}

function normalizeOperationSummary(value: unknown): PreparationOperationSummary | null {
  if (
    !isRecord(value)
    || !safeOperationId(value.id)
    || !PREPARATION_OPERATION_OPTIONS.some((option) => option.type === value.type)
    || !finiteNonNegativeInteger(value.inputRows)
    || !finiteNonNegativeInteger(value.outputRows)
    || !finiteNonNegativeInteger(value.affectedCells)
    || !finiteNonNegativeInteger(value.excludedRows)
  ) return null;
  const createdVariables = parseTextArray(value.createdVariables, 4, 80);
  if (!createdVariables || createdVariables.some((name) => !safeVariableName(name))) return null;
  return {
    id: value.id,
    type: value.type as PreparationOperationType,
    inputRows: value.inputRows,
    outputRows: value.outputRows,
    affectedCells: value.affectedCells,
    excludedRows: value.excludedRows,
    createdVariables,
  };
}

function safeChecksum(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function normalizeRunSummary(value: unknown): DataPreparationRunSummary | null {
  if (!isRecord(value)) return null;
  const integerFields = [
    "sourceCompletedRows",
    "sourceNonCompletedRows",
    "inputRows",
    "outputRows",
    "excludedRows",
    "inputColumns",
    "outputColumns",
    "inputMissingCells",
    "outputMissingCells",
    "inputTrialRows",
    "outputTrialRows",
  ] as const;
  if (
    !boundedString(value.preparedAt, 40)
    || !boundedString(value.operationFingerprint, 40)
    || !safeChecksum(value.sourceProductionChecksum)
    || !safeChecksum(value.responseChecksum)
    || !safeChecksum(value.trialChecksum)
    || !safeChecksum(value.packageChecksum)
    || !integerFields.every((field) => finiteNonNegativeInteger(value[field]))
    || !Array.isArray(value.operationSummaries)
    || value.operationSummaries.length > MAX_PREPARATION_OPERATIONS
  ) return null;
  const operationSummaries = value.operationSummaries.map(normalizeOperationSummary);
  if (operationSummaries.some((item) => !item)) return null;
  return {
    ...(value as unknown as DataPreparationRunSummary),
    operationSummaries: operationSummaries as PreparationOperationSummary[],
  };
}

function preparationReadiness(
  operations: PreparationOperation[],
  lastRun: DataPreparationRunSummary | null,
  reviewedAt: string,
  exportedAt: string,
  audit: DataIntakeAuditReceipt,
): DataPreparationReadiness {
  const issues: string[] = [];
  const fingerprint = preparationOperationFingerprint(operations);
  const production = productionSource(audit);
  if (!isDataIntakeAuditReady(audit)) {
    issues.push("The Phase 8.2 intake audit is not ready.");
  }
  if (operations.some((operation) => operation.enabled && !operation.rationale)) {
    issues.push("Every enabled operation needs a scientific or procedural rationale.");
  }
  if (
    !lastRun
    || !production
    || lastRun.sourceProductionChecksum !== production.checksum
    || lastRun.operationFingerprint !== fingerprint
  ) {
    issues.push("Re-select and prepare the audited source with the current operation log.");
    return { status: "needs-source", issues };
  }
  if (!reviewedAt) {
    issues.push("Review the aggregate preparation impact and operation provenance.");
    return { status: "needs-review", issues };
  }
  if (!exportedAt) {
    issues.push("Export the derived local package before continuing to analysis.");
    return { status: "needs-export", issues };
  }
  return { status: issues.length === 0 ? "ready" : "needs-review", issues };
}

export function createDataPreparationDocument(
  release: ExperimentRelease,
  audit: DataIntakeAuditReceipt,
  createdAt = new Date().toISOString(),
): DataPreparationDocument | null {
  const production = productionSource(audit);
  if (!production || !isDataIntakeAuditReady(audit)) return null;
  const operations: PreparationOperation[] = [];
  return {
    schemaVersion: DATA_PREPARATION_SCHEMA_VERSION,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum: release.manifest.analysisContractChecksum ?? "",
    sourceAudit: {
      schemaVersion: DATA_INTAKE_AUDIT_SCHEMA_VERSION,
      auditedAt: audit.auditedAt,
      reviewedAt: audit.reviewedAt,
      productionChecksum: production.checksum,
    },
    createdAt,
    updatedAt: createdAt,
    operations,
    lastRun: null,
    reviewedAt: "",
    exportedAt: "",
    readiness: preparationReadiness(operations, null, "", "", audit),
    rawDataRetention: "memory-only-never-persisted",
    scientificClaim:
      "deterministic-derived-data-preparation-not-statistical-analysis-or-validity-certification",
  };
}

export function normalizeDataPreparationDocument(
  value: unknown,
  release: ExperimentRelease,
  audit: DataIntakeAuditReceipt,
): DataPreparationDocument | null {
  if (
    !isRecord(value)
    || value.schemaVersion !== DATA_PREPARATION_SCHEMA_VERSION
    || value.projectId !== release.projectId
    || value.releaseId !== release.releaseId
    || value.releaseNumber !== release.releaseNumber
    || value.releaseChecksum !== release.checksum
    || value.contractChecksum !== release.manifest.analysisContractChecksum
    || !boundedString(value.createdAt, 40)
    || !boundedString(value.updatedAt, 40)
    || !boundedString(value.reviewedAt, 40)
    || !boundedString(value.exportedAt, 40)
    || value.rawDataRetention !== "memory-only-never-persisted"
    || value.scientificClaim
      !== "deterministic-derived-data-preparation-not-statistical-analysis-or-validity-certification"
  ) return null;
  const sourceAudit = normalizeSourceAudit(value.sourceAudit, audit);
  const operations = normalizePreparationOperations(value.operations, release);
  const lastRun = value.lastRun === null ? null : normalizeRunSummary(value.lastRun);
  if (!sourceAudit || !operations || (value.lastRun !== null && !lastRun)) return null;
  const normalized: DataPreparationDocument = {
    schemaVersion: DATA_PREPARATION_SCHEMA_VERSION,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum: release.manifest.analysisContractChecksum ?? "",
    sourceAudit,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    operations,
    lastRun,
    reviewedAt: value.reviewedAt,
    exportedAt: value.exportedAt,
    readiness: preparationReadiness(
      operations,
      lastRun,
      value.reviewedAt,
      value.exportedAt,
      audit,
    ),
    rawDataRetention: "memory-only-never-persisted",
    scientificClaim:
      "deterministic-derived-data-preparation-not-statistical-analysis-or-validity-certification",
  };
  return safeJsonByteLength(normalized) <= MAX_PREPARATION_DOCUMENT_BYTES ? normalized : null;
}

export function updateDataPreparationOperations(
  document: DataPreparationDocument,
  operations: PreparationOperation[],
  release: ExperimentRelease,
  audit: DataIntakeAuditReceipt,
  updatedAt = new Date().toISOString(),
): DataPreparationDocument {
  const normalizedOperations = normalizePreparationOperations(operations, release);
  if (!normalizedOperations) throw new Error("The preparation operations are invalid.");
  const updated = {
    ...document,
    updatedAt,
    operations: normalizedOperations,
    lastRun: null,
    reviewedAt: "",
    exportedAt: "",
  };
  const normalized = normalizeDataPreparationDocument(updated, release, audit);
  if (!normalized) throw new Error("The preparation draft failed validation.");
  return normalized;
}

function toPreparationValue(value: unknown): PreparationValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    if (value.length > 50_000) throw new Error("A response value exceeds the 50,000 character preparation limit.");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value;
  }
  if (typeof value === "boolean") return value;
  throw new Error("Phase 8.3 supports scalar response values only.");
}

function toFiniteNumeric(value: PreparationValue | string): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeString(value: unknown, maximum: number): string | null {
  return typeof value === "string" && value.length <= maximum ? value : null;
}

function toOptionalInteger(value: unknown): number | null {
  return finiteNumber(value) && Number.isInteger(value) ? value : null;
}

function toOptionalNumber(value: unknown): number | null {
  return finiteNumber(value) ? value : null;
}

function parseTrial(
  candidate: unknown,
  sessionId: string,
  conditionId: string,
): PreparedTrialRow {
  if (!isRecord(candidate)) throw new Error("A trial row is not a valid object.");
  return {
    _cerise_session_id: sessionId,
    _cerise_condition_id: conditionId,
    table_id: safeString(candidate.tableId, 120) ?? "",
    table_name: safeString(candidate.tableName, 200) ?? "",
    loop_block_id: safeString(candidate.loopBlockId, 120) ?? "",
    trial_id: safeString(candidate.trialId, 120) ?? "",
    source_row_index: toOptionalInteger(candidate.sourceRowIndex),
    repetition: toOptionalInteger(candidate.repetition),
    order_index: toOptionalInteger(candidate.orderIndex),
    practice: candidate.practice === true,
    response: toPreparationValue(candidate.response),
    correct_answer: toPreparationValue(candidate.correctAnswer),
    correct: typeof candidate.correct === "boolean" ? candidate.correct : null,
    reaction_time_ms: toOptionalNumber(candidate.reactionTimeMs),
    deadline_ms: toOptionalNumber(candidate.deadlineMs),
    deadline_exceeded:
      typeof candidate.deadlineExceeded === "boolean" ? candidate.deadlineExceeded : null,
    completion_reason: safeString(candidate.completionReason, 120) ?? "",
  };
}

function parseProduction(
  value: unknown,
  release: ExperimentRelease,
): ParsedProduction {
  if (
    !isRecord(value)
    || value.releaseId !== release.releaseId
    || value.releaseChecksum !== release.checksum
    || value.executionMode !== "production"
    || !Array.isArray(value.sessions)
    || value.sessions.length > MAX_DATA_INTAKE_SESSIONS
  ) throw new Error("production/responses.json does not match the selected frozen release.");

  const frozenVariables = collectExperimentVariables(release.studio);
  const rows: PreparedResponseRow[] = [];
  const trials: PreparedTrialRow[] = [];
  const completedSessionIds = new Set<string>();
  for (const candidate of value.sessions) {
    if (
      !isRecord(candidate)
      || !safeString(candidate.sessionId, 200)
      || !["started", "completed", "withdrawn"].includes(String(candidate.status))
      || candidate.releaseId !== release.releaseId
      || candidate.releaseChecksum !== release.checksum
      || candidate.executionMode !== "production"
      || !isRecord(candidate.condition)
      || !safeString(candidate.condition.id, 100)
      || !safeString(candidate.condition.name, 200)
      || !isRecord(candidate.responses)
    ) throw new Error("A production session does not match the frozen response schema.");
    if (candidate.status !== "completed") continue;
    const sessionId = String(candidate.sessionId);
    const conditionId = String(candidate.condition.id);
    const conditionName = String(candidate.condition.name);
    if (completedSessionIds.has(sessionId)) {
      throw new Error("A duplicate completed production session ID was found.");
    }
    completedSessionIds.add(sessionId);
    const row: PreparedResponseRow = {
      _cerise_session_id: sessionId,
      _cerise_condition_id: conditionId,
      _cerise_condition_name: conditionName,
      _cerise_started_at: safeString(candidate.startedAt, 40) ?? "",
      _cerise_updated_at: safeString(candidate.updatedAt, 40) ?? "",
    };
    for (const variable of frozenVariables) {
      row[variable.name] = toPreparationValue(candidate.responses[variable.name]);
    }
    rows.push(row);

    const sessionTrials = Array.isArray(candidate.trials)
      ? candidate.trials
      : Array.isArray(candidate.trialResults)
        ? candidate.trialResults
        : [];
    if (trials.length + sessionTrials.length > MAX_DATA_INTAKE_TRIALS) {
      throw new Error("The production trial rows exceed the Phase 8.3 preparation limit.");
    }
    for (const trial of sessionTrials) {
      trials.push(parseTrial(trial, sessionId, conditionId));
    }
  }
  return {
    rows,
    trials,
    completedSessionIds,
    totalSessions: value.sessions.length,
  };
}

function isMissing(value: PreparationValue): boolean {
  return value === null || (typeof value === "string" && value.trim() === "");
}

function comparisonMatches(
  value: PreparationValue,
  comparator: PreparationComparison,
  comparisonValue: string,
): boolean {
  if (comparator === "is-missing") return isMissing(value);
  if (isMissing(value)) return false;
  if (comparator === "equals") return String(value) === comparisonValue;
  if (comparator === "not-equals") return String(value) !== comparisonValue;
  const numeric = toFiniteNumeric(value);
  const comparison = toFiniteNumeric(comparisonValue);
  if (numeric === null || comparison === null) return false;
  return comparator === "less-than" ? numeric < comparison : numeric > comparison;
}

function applyOperation(
  inputRows: PreparedResponseRow[],
  operation: PreparationOperation,
): { rows: PreparedResponseRow[]; summary: PreparationOperationSummary } {
  const rows = inputRows.map((row) => ({ ...row }));
  const summary: PreparationOperationSummary = {
    id: operation.id,
    type: operation.type,
    inputRows: rows.length,
    outputRows: rows.length,
    affectedCells: 0,
    excludedRows: 0,
    createdVariables: [],
  };
  if (!operation.enabled) return { rows, summary };

  if (operation.type === "exclude-record") {
    const filtered = rows.filter((row) => !comparisonMatches(
      row[operation.sourceVariable] ?? null,
      operation.comparator,
      operation.comparisonValue,
    ));
    summary.outputRows = filtered.length;
    summary.excludedRows = rows.length - filtered.length;
    return { rows: filtered, summary };
  }

  for (const row of rows) {
    if (operation.type === "recode-missing") {
      for (const variableName of operation.variableNames) {
        const current = row[variableName] ?? null;
        if (
          typeof current === "string"
          && operation.missingValues.includes(current)
        ) {
          row[variableName] = null;
          summary.affectedCells += 1;
        }
      }
    } else if (operation.type === "trim-text") {
      for (const variableName of operation.variableNames) {
        const current = row[variableName] ?? null;
        if (typeof current === "string" && current !== current.trim()) {
          row[variableName] = current.trim();
          summary.affectedCells += 1;
        }
      }
    } else if (operation.type === "coerce-number") {
      for (const variableName of operation.variableNames) {
        const current = row[variableName] ?? null;
        if (isMissing(current) || typeof current === "number") continue;
        const numeric = toFiniteNumeric(current);
        row[variableName] = numeric;
        summary.affectedCells += 1;
      }
    } else if (operation.type === "reverse-score") {
      const numeric = toFiniteNumeric(row[operation.sourceVariable] ?? null);
      row[operation.targetVariable] = numeric === null
        ? null
        : operation.minimum + operation.maximum - numeric;
      summary.affectedCells += 1;
    } else {
      const values = operation.sourceVariables
        .map((name) => toFiniteNumeric(row[name] ?? null))
        .filter((value): value is number => value !== null);
      row[operation.targetVariable] = values.length >= operation.minimumValid
        ? operation.method === "sum"
          ? values.reduce((total, value) => total + value, 0)
          : values.reduce((total, value) => total + value, 0) / values.length
        : null;
      summary.affectedCells += 1;
    }
  }
  const target = operationTarget(operation);
  if (target) summary.createdVariables = [target];
  return { rows, summary };
}

function missingCellCount(rows: PreparedResponseRow[], columns: string[]): number {
  return rows.reduce((total, row) => (
    total + columns.reduce((rowTotal, column) => (
      rowTotal + (isMissing(row[column] ?? null) ? 1 : 0)
    ), 0)
  ), 0);
}

function trialColumns(): string[] {
  return [
    "_cerise_session_id",
    "_cerise_condition_id",
    "table_id",
    "table_name",
    "loop_block_id",
    "trial_id",
    "source_row_index",
    "repetition",
    "order_index",
    "practice",
    "response",
    "correct_answer",
    "correct",
    "reaction_time_ms",
    "deadline_ms",
    "deadline_exceeded",
    "completion_reason",
  ];
}

export async function buildDataPreparationPackage(
  input: BuildDataPreparationInput,
): Promise<BuildDataPreparationResult> {
  const {
    release,
    auditReceipt,
    sourceFiles,
    production,
  } = input;
  if (!isDataIntakeAuditReady(auditReceipt)) {
    throw new Error("Complete and review Phase 8.2 before preparing participant data.");
  }
  if (!sourceFilesMatch(sourceFiles, auditReceipt.sourceFiles)) {
    throw new Error("The selected export files do not match the reviewed Phase 8.2 checksums.");
  }
  const normalizedDocument = normalizeDataPreparationDocument(
    input.document,
    release,
    auditReceipt,
  );
  if (!normalizedDocument) throw new Error("The preparation draft is invalid.");
  if (normalizedDocument.operations.some((operation) => operation.enabled && !operation.rationale)) {
    throw new Error("Add a rationale to every enabled preparation operation.");
  }

  const parsed = parseProduction(production, release);
  const sourceColumns = availableSourceColumns(release);
  const analysisSourceColumns = collectExperimentVariables(release.studio)
    .map((variable) => variable.name);
  let rows = parsed.rows.map((row) => ({ ...row }));
  const operationSummaries: PreparationOperationSummary[] = [];
  for (const operation of normalizedDocument.operations) {
    const applied = applyOperation(rows, operation);
    rows = applied.rows;
    operationSummaries.push(applied.summary);
  }
  const keptSessionIds = new Set(rows.map((row) => String(row._cerise_session_id)));
  const trials = parsed.trials.filter((trial) => keptSessionIds.has(trial._cerise_session_id));
  const derivedColumns = normalizedDocument.operations
    .map(operationTarget)
    .filter((value): value is string => Boolean(value));
  const responseColumns = uniqueStrings([...sourceColumns, ...derivedColumns]);
  const analysisOutputColumns = uniqueStrings([...analysisSourceColumns, ...derivedColumns]);
  const preparedAt = input.preparedAt ?? new Date().toISOString();
  const responseChecksum = await sha256Checksum({ columns: responseColumns, rows });
  const preparedTrialColumns = trialColumns();
  const trialChecksum = await sha256Checksum({ columns: preparedTrialColumns, rows: trials });
  const unsignedPackage = {
    packageVersion: DATA_PREPARATION_PACKAGE_VERSION,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum: release.manifest.analysisContractChecksum ?? "",
    preparedAt,
    source: {
      auditSchemaVersion: DATA_INTAKE_AUDIT_SCHEMA_VERSION,
      auditReviewedAt: auditReceipt.reviewedAt,
      files: sourceFiles,
      inputBoundary:
        "completed-production-sessions-only-pilot-withdrawn-and-incomplete-excluded" as const,
    },
    operations: normalizedDocument.operations,
    operationLog: operationSummaries,
    responseColumns,
    trialColumns: preparedTrialColumns,
    responses: rows,
    trials,
    integrity: {
      responseChecksum,
      trialChecksum,
    },
    dataClassification: "potentially-identifying-local-research-data" as const,
    rawSourceMutation: "none-derived-copy-only" as const,
  };
  const packageChecksum = await sha256Checksum(unsignedPackage);
  const preparedPackage: DataPreparationPackage = {
    ...unsignedPackage,
    integrity: {
      ...unsignedPackage.integrity,
      packageChecksum,
    },
  };
  const sourceProductionChecksum = productionSource(auditReceipt)?.checksum;
  if (!sourceProductionChecksum) throw new Error("The intake receipt lacks a production checksum.");
  const lastRun: DataPreparationRunSummary = {
    preparedAt,
    operationFingerprint: preparationOperationFingerprint(normalizedDocument.operations),
    sourceProductionChecksum,
    sourceCompletedRows: parsed.rows.length,
    sourceNonCompletedRows: parsed.totalSessions - parsed.rows.length,
    inputRows: parsed.rows.length,
    outputRows: rows.length,
    excludedRows: parsed.rows.length - rows.length,
    inputColumns: sourceColumns.length,
    outputColumns: responseColumns.length,
    inputMissingCells: missingCellCount(parsed.rows, analysisSourceColumns),
    outputMissingCells: missingCellCount(rows, analysisOutputColumns),
    inputTrialRows: parsed.trials.length,
    outputTrialRows: trials.length,
    operationSummaries,
    responseChecksum,
    trialChecksum,
    packageChecksum,
  };
  const updated: DataPreparationDocument = {
    ...normalizedDocument,
    updatedAt: preparedAt,
    lastRun,
    reviewedAt: "",
    exportedAt: "",
    readiness: preparationReadiness(
      normalizedDocument.operations,
      lastRun,
      "",
      "",
      auditReceipt,
    ),
  };
  return { document: updated, package: preparedPackage };
}

export function markDataPreparationReviewed(
  document: DataPreparationDocument,
  release: ExperimentRelease,
  audit: DataIntakeAuditReceipt,
  reviewedAt = new Date().toISOString(),
): DataPreparationDocument {
  const normalized = normalizeDataPreparationDocument(document, release, audit);
  if (!normalized || !normalized.lastRun || normalized.readiness.status !== "needs-review") {
    throw new Error("Run and review the current preparation operations first.");
  }
  const updated = {
    ...normalized,
    updatedAt: reviewedAt,
    reviewedAt,
    exportedAt: "",
  };
  const result = normalizeDataPreparationDocument(updated, release, audit);
  if (!result) throw new Error("The preparation review could not be recorded.");
  return result;
}

export function markDataPreparationExported(
  document: DataPreparationDocument,
  release: ExperimentRelease,
  audit: DataIntakeAuditReceipt,
  exportedAt = new Date().toISOString(),
): DataPreparationDocument {
  const normalized = normalizeDataPreparationDocument(document, release, audit);
  if (!normalized || !normalized.reviewedAt || !normalized.lastRun) {
    throw new Error("Confirm the preparation review before exporting.");
  }
  const updated = {
    ...normalized,
    updatedAt: exportedAt,
    exportedAt,
  };
  const result = normalizeDataPreparationDocument(updated, release, audit);
  if (!result) throw new Error("The preparation export could not be recorded.");
  return result;
}

export function dataPreparationStorageKey(projectId: string, releaseId: string): string {
  return `cerise-data-preparation:${projectId}:${releaseId}:v${DATA_PREPARATION_SCHEMA_VERSION}`;
}

export function readDataPreparationDocument(
  storage: StorageLike,
  release: ExperimentRelease,
  audit: DataIntakeAuditReceipt,
): DataPreparationDocument | null {
  const stored = storage.getItem(dataPreparationStorageKey(release.projectId, release.releaseId));
  if (!stored || new TextEncoder().encode(stored).byteLength > MAX_PREPARATION_DOCUMENT_BYTES) {
    return null;
  }
  try {
    return normalizeDataPreparationDocument(JSON.parse(stored), release, audit);
  } catch {
    return null;
  }
}

export function writeDataPreparationDocument(
  storage: StorageLike,
  release: ExperimentRelease,
  audit: DataIntakeAuditReceipt,
  document: DataPreparationDocument,
): DataPreparationDocument {
  const normalized = normalizeDataPreparationDocument(document, release, audit);
  if (!normalized) throw new Error("The preparation document failed validation and was not saved.");
  storage.setItem(
    dataPreparationStorageKey(release.projectId, release.releaseId),
    JSON.stringify(normalized),
  );
  return normalized;
}

export function isDataPreparationReady(document: DataPreparationDocument | null): boolean {
  return Boolean(document && document.readiness.status === "ready");
}
