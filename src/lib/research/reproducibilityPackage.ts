import { ANALYSIS_CONTRACT_SCHEMA_VERSION } from "./analysisContract";
import {
  ANALYSIS_EXECUTION_SCHEMA_VERSION,
  ANALYSIS_RESULTS_PACKAGE_VERSION,
  isAnalysisExecutionReady,
  type AnalysisExecutionDocument,
} from "./analysisExecution";
import {
  ANALYSIS_PLAN_SCHEMA_VERSION,
  type AnalysisPlanDocument,
} from "./analysisPlan";
import {
  ANALYSIS_INTERPRETATION_SCHEMA_VERSION,
  RESULTS_RECORD_EXPORT_BOUNDARY,
  RESULTS_RECORD_EXPORT_TYPE,
  RESULTS_RECORD_PACKAGE_VERSION,
  isAnalysisInterpretationReady,
  verifyResultsRecordExport,
  type AnalysisInterpretationDocument,
  type ResultsRecordExport,
} from "./analysisResults";
import {
  DATA_INTAKE_AUDIT_SCHEMA_VERSION,
  isDataIntakeAuditReady,
  type DataIntakeAuditReceipt,
} from "./dataIntakeAudit";
import {
  DATA_PREPARATION_PACKAGE_VERSION,
  DATA_PREPARATION_SCHEMA_VERSION,
  isDataPreparationReady,
  type DataPreparationDocument,
} from "./dataPreparation";
import {
  canonicalJson,
  sha256Checksum,
  type ExperimentRelease,
} from "./experimentRelease";

export const REPRODUCIBILITY_DOCUMENT_SCHEMA_VERSION = 1 as const;
export const REPRODUCIBILITY_MANIFEST_SCHEMA_VERSION = 1 as const;
export const REPRODUCIBILITY_ENGINE_VERSION = "cerise-reproducibility-1" as const;
export const CERISE_APPLICATION_VERSION = "0.1.0" as const;
export const MAX_REPRODUCIBILITY_DOCUMENT_BYTES = 256 * 1024;
export const MAX_REPRODUCIBILITY_ARCHIVE_BYTES = 24 * 1024 * 1024;
export const MAX_REPRODUCIBILITY_FILE_BYTES = 16 * 1024 * 1024;
export const MAX_REPRODUCIBILITY_FILES = 24;
export const MAX_REPRODUCIBILITY_TEXT = 2_000;

const TAR_BLOCK_BYTES = 512;
const MANIFEST_PATH = "manifest.json";
const RESULTS_RECORD_PATH = "results/phase-8.5-results-record.json";
export const REPRODUCIBILITY_ARCHIVE_CONTENTS = [
  { path: "README.md", label: "Reader guide and boundaries" },
  { path: "metadata/frozen-release.json", label: "Frozen release metadata" },
  { path: "metadata/data-dictionary.json", label: "Data dictionary" },
  { path: "planning/analysis-contract.json", label: "Frozen analysis contract" },
  { path: "planning/analysis-plan.json", label: "Analysis Plan export" },
  { path: "audit/data-intake-audit.json", label: "Aggregate intake audit" },
  { path: "preparation/operation-log.json", label: "Preparation operation log" },
  { path: "analysis/phase-8.4-index.json", label: "Method registry and analysis index" },
  { path: RESULTS_RECORD_PATH, label: "Aggregate results, interpretation, tables, and figures" },
  {
    path: "provenance/divergence-and-amendment-register.json",
    label: "Divergence and amendment register",
  },
  { path: "environment/versions.json", label: "Engine, schema, and environment versions" },
  { path: "references/restricted-materials.json", label: "External restricted-material references" },
  { path: "verification/verification-report.json", label: "Verification report" },
] as const;
const REQUIRED_CONTENT_PATHS = REPRODUCIBILITY_ARCHIVE_CONTENTS.map(
  (item) => item.path,
);

export type RestrictedMaterialStatus =
  | "not-declared"
  | "referenced-outside-archive"
  | "not-referenced"
  | "not-collected";

export interface RestrictedMaterialReference {
  status: RestrictedMaterialStatus;
  reference: string;
  accessConditions: string;
}

export interface ReproducibilityEnvironment {
  capturedAt: string;
  context: "archive-build-environment-not-analysis-execution-environment";
  userAgent: string;
  language: string;
  platform: string;
  timeZone: string;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  hardwareConcurrency: number | null;
  secureContext: boolean;
}

export interface ReproducibilityBuildReceipt {
  archiveCreatedAt: string;
  archiveChecksum: string;
  manifestChecksum: string;
  fileSetChecksum: string;
  fileCount: number;
  archiveBytes: number;
  verifiedAt: string;
  verificationStatus: "verified";
}

export interface ReproducibilityReadiness {
  status:
    | "needs-context"
    | "needs-review"
    | "needs-build"
    | "needs-export"
    | "ready";
  issues: string[];
}

export interface ReproducibilityPackageDocument {
  schemaVersion: typeof REPRODUCIBILITY_DOCUMENT_SCHEMA_VERSION;
  projectId: string;
  projectLabel: string;
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  contractChecksum: string;
  analysisPlanUpdatedAt: string;
  source: {
    resultsRecordCreatedAt: string;
    resultsRecordChecksum: string;
    analysisResultsPackageChecksum: string;
    resultChecksum: string;
    preparationPackageChecksum: string;
  };
  createdAt: string;
  updatedAt: string;
  environment: ReproducibilityEnvironment;
  executionEnvironmentNotes: string;
  restrictedMaterials: {
    participantData: RestrictedMaterialReference;
    rawMedia: RestrictedMaterialReference;
    combinedSqlite: RestrictedMaterialReference;
  };
  reviewNotes: string;
  researcherConfirmed: boolean;
  reviewedAt: string;
  lastBuild: ReproducibilityBuildReceipt | null;
  exportedAt: string;
  readiness: ReproducibilityReadiness;
  archiveBoundary:
    "metadata-and-aggregate-outputs-only-no-participant-rows-media-or-sqlite";
  uploadBoundary: "local-download-only-no-automatic-upload";
  verificationClaim:
    "self-verifying-checksums-not-authenticity-reproducibility-or-validity-certification";
}

export interface ReproducibilityManifestEntry {
  path: string;
  mediaType: "application/json" | "text/markdown";
  byteSize: number;
  checksum: string;
}

export interface ReproducibilityManifest {
  schemaVersion: typeof REPRODUCIBILITY_MANIFEST_SCHEMA_VERSION;
  packageId: string;
  projectId: string;
  projectLabel: string;
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  contractChecksum: string;
  createdAt: string;
  archiveFormat: "ustar";
  contentRoles: {
    readme: "README.md";
    frozenRelease: "metadata/frozen-release.json";
    dataDictionary: "metadata/data-dictionary.json";
    analysisContract: "planning/analysis-contract.json";
    analysisPlan: "planning/analysis-plan.json";
    intakeAudit: "audit/data-intake-audit.json";
    preparationLog: "preparation/operation-log.json";
    analysisIndex: "analysis/phase-8.4-index.json";
    resultsRecord: typeof RESULTS_RECORD_PATH;
    divergenceRegister: "provenance/divergence-and-amendment-register.json";
    environment: "environment/versions.json";
    restrictedMaterials: "references/restricted-materials.json";
    verificationReport: "verification/verification-report.json";
  };
  sourceIntegrity: ReproducibilityPackageDocument["source"];
  files: ReproducibilityManifestEntry[];
  privacy: {
    participantRowsIncluded: false;
    derivedParticipantRowsIncluded: false;
    rawMediaIncluded: false;
    combinedSqliteIncluded: false;
  };
  integrity: {
    fileSetChecksum: string;
    manifestChecksum: string;
  };
  uploadBoundary: "local-download-only-no-automatic-upload";
  verificationClaim:
    "self-verifying-checksums-not-authenticity-reproducibility-or-validity-certification";
}

export interface ReproducibilityArchiveVerification {
  status: "verified";
  verifiedAt: string;
  archiveChecksum: string;
  manifestChecksum: string;
  fileSetChecksum: string;
  fileCount: number;
  archiveBytes: number;
  manifest: ReproducibilityManifest;
  checks: Array<{
    id: string;
    status: "pass";
    detail: string;
  }>;
}

export interface BuildReproducibilityArchiveInput {
  document: ReproducibilityPackageDocument;
  release: ExperimentRelease;
  plan: AnalysisPlanDocument;
  audit: DataIntakeAuditReceipt;
  preparation: DataPreparationDocument;
  execution: AnalysisExecutionDocument;
  interpretation: AnalysisInterpretationDocument;
  resultsRecord: ResultsRecordExport;
  verifiedAt?: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface ArchiveFile {
  path: string;
  mediaType: ReproducibilityManifestEntry["mediaType"];
  bytes: Uint8Array;
}

const MATERIAL_STATUSES: readonly RestrictedMaterialStatus[] = [
  "not-declared",
  "referenced-outside-archive",
  "not-referenced",
  "not-collected",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function safeJsonByteLength(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function safeText(value: unknown, maximum = MAX_REPRODUCIBILITY_TEXT): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function safeLine(value: unknown, maximum = 200): string {
  return safeText(value, maximum).replace(/[\r\n]+/g, " ");
}

function safeId(value: unknown): string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(value)
    ? value
    : "";
}

function safeChecksum(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function safeTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function safeInteger(value: unknown, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= maximum;
}

function safeFinite(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number"
    && Number.isFinite(value)
    && value >= minimum
    && value <= maximum;
}

async function checksumBytes(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes as BufferSource);
  const hex = Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  return `sha256:${hex}`;
}

function jsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${canonicalJson(value)}\n`);
}

function markdownBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value.replace(/\r\n/g, "\n"));
}

function normalizeReference(value: unknown): RestrictedMaterialReference | null {
  if (!isRecord(value) || !exactKeys(value, ["status", "reference", "accessConditions"])) {
    return null;
  }
  if (
    typeof value.status !== "string"
    || !MATERIAL_STATUSES.includes(value.status as RestrictedMaterialStatus)
  ) return null;
  return {
    status: value.status as RestrictedMaterialStatus,
    reference: safeText(value.reference),
    accessConditions: safeText(value.accessConditions),
  };
}

function normalizeEnvironment(value: unknown): ReproducibilityEnvironment | null {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "capturedAt",
      "context",
      "userAgent",
      "language",
      "platform",
      "timeZone",
      "viewportWidth",
      "viewportHeight",
      "devicePixelRatio",
      "hardwareConcurrency",
      "secureContext",
    ])
    || !safeTimestamp(value.capturedAt)
    || value.context !== "archive-build-environment-not-analysis-execution-environment"
    || typeof value.userAgent !== "string"
    || value.userAgent.length > 1_000
    || typeof value.language !== "string"
    || value.language.length > 40
    || typeof value.platform !== "string"
    || value.platform.length > 120
    || typeof value.timeZone !== "string"
    || value.timeZone.length > 120
    || !safeInteger(value.viewportWidth, 100_000)
    || !safeInteger(value.viewportHeight, 100_000)
    || !safeFinite(value.devicePixelRatio, 0, 100)
    || !(
      value.hardwareConcurrency === null
      || safeInteger(value.hardwareConcurrency, 1_000)
    )
    || typeof value.secureContext !== "boolean"
  ) return null;
  return {
    capturedAt: value.capturedAt,
    context: "archive-build-environment-not-analysis-execution-environment",
    userAgent: value.userAgent,
    language: value.language,
    platform: value.platform,
    timeZone: value.timeZone,
    viewportWidth: value.viewportWidth,
    viewportHeight: value.viewportHeight,
    devicePixelRatio: value.devicePixelRatio,
    hardwareConcurrency: value.hardwareConcurrency,
    secureContext: value.secureContext,
  };
}

function normalizeBuildReceipt(value: unknown): ReproducibilityBuildReceipt | null {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "archiveCreatedAt",
      "archiveChecksum",
      "manifestChecksum",
      "fileSetChecksum",
      "fileCount",
      "archiveBytes",
      "verifiedAt",
      "verificationStatus",
    ])
    || !safeTimestamp(value.archiveCreatedAt)
    || !safeChecksum(value.archiveChecksum)
    || !safeChecksum(value.manifestChecksum)
    || !safeChecksum(value.fileSetChecksum)
    || !safeInteger(value.fileCount, MAX_REPRODUCIBILITY_FILES)
    || !safeInteger(value.archiveBytes, MAX_REPRODUCIBILITY_ARCHIVE_BYTES)
    || !safeTimestamp(value.verifiedAt)
    || value.verificationStatus !== "verified"
  ) return null;
  return value as unknown as ReproducibilityBuildReceipt;
}

function referenceIssues(
  reference: RestrictedMaterialReference,
  label: string,
  allowNotCollected: boolean,
): string[] {
  if (reference.status === "not-declared") return [`Choose how ${label} is referenced.`];
  if (reference.status === "not-collected" && !allowNotCollected) {
    return [`${label} cannot be marked not collected for this completed analysis chain.`];
  }
  if (
    reference.status === "referenced-outside-archive"
    && (!reference.reference || !reference.accessConditions)
  ) {
    return [`Add the external reference and access conditions for ${label}.`];
  }
  return [];
}

function readinessFor(
  document: Omit<ReproducibilityPackageDocument, "readiness">,
  rawMediaCollected: boolean,
): ReproducibilityReadiness {
  const issues = [
    ...referenceIssues(
      document.restrictedMaterials.participantData,
      "participant data",
      false,
    ),
    ...referenceIssues(
      document.restrictedMaterials.rawMedia,
      "raw media",
      !rawMediaCollected,
    ),
    ...referenceIssues(
      document.restrictedMaterials.combinedSqlite,
      "the combined SQLite database",
      false,
    ),
  ];
  if (
    document.restrictedMaterials.rawMedia.status === "not-collected"
    && rawMediaCollected
  ) {
    issues.push("Raw media exists in the frozen release and cannot be marked not collected.");
  }
  if (!document.executionEnvironmentNotes) {
    issues.push("Describe the Phase 8.4 browser/device environment or state that it was not recorded.");
  }
  if (issues.length > 0) return { status: "needs-context", issues };
  if (!document.researcherConfirmed || !document.reviewedAt) {
    return {
      status: "needs-review",
      issues: ["Confirm the archive contents, omissions, references, and verification boundary."],
    };
  }
  if (!document.lastBuild) {
    return {
      status: "needs-build",
      issues: ["Build and independently verify the deterministic archive."],
    };
  }
  if (!document.exportedAt) {
    return {
      status: "needs-export",
      issues: ["Export the verified archive to a researcher-approved local location."],
    };
  }
  return { status: "ready", issues: [] };
}

function rawMediaCollected(release: ExperimentRelease): boolean {
  return Boolean(
    (release.manifest.audioResponseCount ?? 0) > 0
    || (release.manifest.videoResponseCount ?? 0) > 0
    || release.manifest.containsSensitiveMedia,
  );
}

function normalizeDocument(
  value: unknown,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  audit: DataIntakeAuditReceipt,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  interpretation: AnalysisInterpretationDocument,
): ReproducibilityPackageDocument | null {
  if (
    safeJsonByteLength(value) > MAX_REPRODUCIBILITY_DOCUMENT_BYTES
    || !isRecord(value)
    || !exactKeys(value, [
      "schemaVersion",
      "projectId",
      "projectLabel",
      "releaseId",
      "releaseNumber",
      "releaseChecksum",
      "contractChecksum",
      "analysisPlanUpdatedAt",
      "source",
      "createdAt",
      "updatedAt",
      "environment",
      "executionEnvironmentNotes",
      "restrictedMaterials",
      "reviewNotes",
      "researcherConfirmed",
      "reviewedAt",
      "lastBuild",
      "exportedAt",
      "readiness",
      "archiveBoundary",
      "uploadBoundary",
      "verificationClaim",
    ])
    || value.schemaVersion !== REPRODUCIBILITY_DOCUMENT_SCHEMA_VERSION
    || value.projectId !== release.projectId
    || value.releaseId !== release.releaseId
    || value.releaseNumber !== release.releaseNumber
    || value.releaseChecksum !== release.checksum
    || value.contractChecksum !== release.manifest.analysisContractChecksum
    || value.analysisPlanUpdatedAt !== plan.updatedAt
    || plan.readiness.status !== "ready"
    || !isDataIntakeAuditReady(audit)
    || !isDataPreparationReady(preparation)
    || !isAnalysisExecutionReady(execution)
    || !isAnalysisInterpretationReady(interpretation)
    || !safeLine(value.projectLabel)
    || !isRecord(value.source)
    || !exactKeys(value.source, [
      "resultsRecordCreatedAt",
      "resultsRecordChecksum",
      "analysisResultsPackageChecksum",
      "resultChecksum",
      "preparationPackageChecksum",
    ])
    || !safeTimestamp(value.source.resultsRecordCreatedAt)
    || !safeChecksum(value.source.resultsRecordChecksum)
    || !safeChecksum(value.source.analysisResultsPackageChecksum)
    || !safeChecksum(value.source.resultChecksum)
    || !safeChecksum(value.source.preparationPackageChecksum)
    || value.source.resultsRecordCreatedAt !== interpretation.exportedAt
    || value.source.analysisResultsPackageChecksum !== interpretation.source.packageChecksum
    || value.source.analysisResultsPackageChecksum !== execution.lastRun?.packageChecksum
    || value.source.resultChecksum !== interpretation.source.resultChecksum
    || value.source.resultChecksum !== execution.lastRun?.resultChecksum
    || value.source.preparationPackageChecksum !== preparation.lastRun?.packageChecksum
    || !safeTimestamp(value.createdAt)
    || !safeTimestamp(value.updatedAt)
    || !isRecord(value.restrictedMaterials)
    || !exactKeys(value.restrictedMaterials, [
      "participantData",
      "rawMedia",
      "combinedSqlite",
    ])
    || typeof value.executionEnvironmentNotes !== "string"
    || value.executionEnvironmentNotes.length > MAX_REPRODUCIBILITY_TEXT
    || typeof value.reviewNotes !== "string"
    || value.reviewNotes.length > MAX_REPRODUCIBILITY_TEXT
    || typeof value.researcherConfirmed !== "boolean"
    || !(value.reviewedAt === "" || safeTimestamp(value.reviewedAt))
    || !(value.exportedAt === "" || safeTimestamp(value.exportedAt))
    || value.archiveBoundary
      !== "metadata-and-aggregate-outputs-only-no-participant-rows-media-or-sqlite"
    || value.uploadBoundary !== "local-download-only-no-automatic-upload"
    || value.verificationClaim
      !== "self-verifying-checksums-not-authenticity-reproducibility-or-validity-certification"
  ) return null;

  const environment = normalizeEnvironment(value.environment);
  const participantData = normalizeReference(value.restrictedMaterials.participantData);
  const rawMedia = normalizeReference(value.restrictedMaterials.rawMedia);
  const combinedSqlite = normalizeReference(value.restrictedMaterials.combinedSqlite);
  const lastBuild = value.lastBuild === null ? null : normalizeBuildReceipt(value.lastBuild);
  if (!environment || !participantData || !rawMedia || !combinedSqlite) return null;
  if (value.lastBuild !== null && !lastBuild) return null;
  if (
    value.createdAt > value.updatedAt
    || (value.reviewedAt && (
      !value.researcherConfirmed
      || value.reviewedAt < value.createdAt
      || value.reviewedAt > value.updatedAt
    ))
    || (lastBuild && (
      !value.reviewedAt
      || lastBuild.archiveCreatedAt !== value.reviewedAt
      || lastBuild.verifiedAt < value.reviewedAt
      || lastBuild.verifiedAt > value.updatedAt
    ))
    || (value.exportedAt && (
      !lastBuild
      || value.exportedAt < lastBuild.verifiedAt
      || value.exportedAt !== value.updatedAt
    ))
  ) return null;

  const base = {
    schemaVersion: REPRODUCIBILITY_DOCUMENT_SCHEMA_VERSION,
    projectId: release.projectId,
    projectLabel: safeLine(value.projectLabel),
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum: release.manifest.analysisContractChecksum ?? "",
    analysisPlanUpdatedAt: plan.updatedAt,
    source: {
      resultsRecordCreatedAt: value.source.resultsRecordCreatedAt,
      resultsRecordChecksum: value.source.resultsRecordChecksum,
      analysisResultsPackageChecksum: value.source.analysisResultsPackageChecksum,
      resultChecksum: value.source.resultChecksum,
      preparationPackageChecksum: value.source.preparationPackageChecksum,
    },
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    environment,
    executionEnvironmentNotes: safeText(value.executionEnvironmentNotes),
    restrictedMaterials: { participantData, rawMedia, combinedSqlite },
    reviewNotes: safeText(value.reviewNotes),
    researcherConfirmed: value.researcherConfirmed,
    reviewedAt: value.reviewedAt,
    lastBuild,
    exportedAt: value.exportedAt,
    archiveBoundary:
      "metadata-and-aggregate-outputs-only-no-participant-rows-media-or-sqlite" as const,
    uploadBoundary: "local-download-only-no-automatic-upload" as const,
    verificationClaim:
      "self-verifying-checksums-not-authenticity-reproducibility-or-validity-certification" as const,
  };
  return {
    ...base,
    readiness: readinessFor(base, rawMediaCollected(release)),
  };
}

export function captureReproducibilityEnvironment(
  capturedAt = new Date().toISOString(),
): ReproducibilityEnvironment {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    throw new Error("The archive-build environment can be captured only in a browser.");
  }
  return {
    capturedAt,
    context: "archive-build-environment-not-analysis-execution-environment",
    userAgent: navigator.userAgent.slice(0, 1_000),
    language: navigator.language.slice(0, 40),
    platform: navigator.platform.slice(0, 120),
    timeZone: (Intl.DateTimeFormat().resolvedOptions().timeZone ?? "").slice(0, 120),
    viewportWidth: Math.max(0, Math.trunc(window.innerWidth)),
    viewportHeight: Math.max(0, Math.trunc(window.innerHeight)),
    devicePixelRatio: Number.isFinite(window.devicePixelRatio)
      ? Math.max(0, Math.min(100, window.devicePixelRatio))
      : 1,
    hardwareConcurrency: Number.isFinite(navigator.hardwareConcurrency)
      ? Math.max(1, Math.trunc(navigator.hardwareConcurrency))
      : null,
    secureContext: window.isSecureContext,
  };
}

export function createReproducibilityPackageDocument(
  projectLabel: string,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  audit: DataIntakeAuditReceipt,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  interpretation: AnalysisInterpretationDocument,
  resultsRecord: ResultsRecordExport,
  environment: ReproducibilityEnvironment,
  createdAt = new Date().toISOString(),
): ReproducibilityPackageDocument | null {
  if (
    !isDataIntakeAuditReady(audit)
    || !isDataPreparationReady(preparation)
    || !isAnalysisExecutionReady(execution)
    || !isAnalysisInterpretationReady(interpretation)
    || resultsRecord.package.integrity.analysisResultsPackageChecksum
      !== interpretation.source.packageChecksum
  ) return null;
  const mediaStatus: RestrictedMaterialStatus = rawMediaCollected(release)
    ? "not-declared"
    : "not-collected";
  return normalizeDocument({
    schemaVersion: REPRODUCIBILITY_DOCUMENT_SCHEMA_VERSION,
    projectId: release.projectId,
    projectLabel: safeLine(projectLabel) || "Research project",
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    contractChecksum: release.manifest.analysisContractChecksum,
    analysisPlanUpdatedAt: plan.updatedAt,
    source: {
      resultsRecordCreatedAt: resultsRecord.exportedAt,
      resultsRecordChecksum: resultsRecord.package.integrity.packageChecksum,
      analysisResultsPackageChecksum:
        resultsRecord.package.integrity.analysisResultsPackageChecksum,
      resultChecksum: resultsRecord.package.source.resultChecksum,
      preparationPackageChecksum: resultsRecord.package.source.preparationPackageChecksum,
    },
    createdAt,
    updatedAt: createdAt,
    environment,
    executionEnvironmentNotes: "",
    restrictedMaterials: {
      participantData: {
        status: "not-declared",
        reference: "",
        accessConditions: "",
      },
      rawMedia: {
        status: mediaStatus,
        reference: "",
        accessConditions: "",
      },
      combinedSqlite: {
        status: "not-declared",
        reference: "",
        accessConditions: "",
      },
    },
    reviewNotes: "",
    researcherConfirmed: false,
    reviewedAt: "",
    lastBuild: null,
    exportedAt: "",
    readiness: { status: "needs-context", issues: [] },
    archiveBoundary:
      "metadata-and-aggregate-outputs-only-no-participant-rows-media-or-sqlite",
    uploadBoundary: "local-download-only-no-automatic-upload",
    verificationClaim:
      "self-verifying-checksums-not-authenticity-reproducibility-or-validity-certification",
  }, release, plan, audit, preparation, execution, interpretation);
}

type ReproducibilityEditableFields = Pick<
  ReproducibilityPackageDocument,
  | "executionEnvironmentNotes"
  | "restrictedMaterials"
  | "reviewNotes"
  | "researcherConfirmed"
>;

export function updateReproducibilityPackageDocument(
  document: ReproducibilityPackageDocument,
  changes: Partial<ReproducibilityEditableFields>,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  audit: DataIntakeAuditReceipt,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  interpretation: AnalysisInterpretationDocument,
  updatedAt = new Date().toISOString(),
): ReproducibilityPackageDocument {
  const candidate = {
    ...document,
    ...changes,
    updatedAt,
    researcherConfirmed: changes.researcherConfirmed ?? false,
    reviewedAt: "",
    lastBuild: null,
    exportedAt: "",
  };
  const normalized = normalizeDocument(
    candidate,
    release,
    plan,
    audit,
    preparation,
    execution,
    interpretation,
  );
  if (!normalized) throw new Error("The reproducibility archive record could not be updated.");
  return normalized;
}

export function markReproducibilityPackageReviewed(
  document: ReproducibilityPackageDocument,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  audit: DataIntakeAuditReceipt,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  interpretation: AnalysisInterpretationDocument,
  reviewedAt = new Date().toISOString(),
): ReproducibilityPackageDocument {
  const current = normalizeDocument(
    document,
    release,
    plan,
    audit,
    preparation,
    execution,
    interpretation,
  );
  if (
    !current
    || current.readiness.status !== "needs-review"
    || !current.researcherConfirmed
  ) {
    throw new Error("Complete and confirm the reproducibility archive review first.");
  }
  const normalized = normalizeDocument({
    ...current,
    updatedAt: reviewedAt,
    reviewedAt,
  }, release, plan, audit, preparation, execution, interpretation);
  if (!normalized) throw new Error("The reproducibility archive review could not be recorded.");
  return normalized;
}

export function recordReproducibilityBuild(
  document: ReproducibilityPackageDocument,
  verification: ReproducibilityArchiveVerification,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  audit: DataIntakeAuditReceipt,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  interpretation: AnalysisInterpretationDocument,
): ReproducibilityPackageDocument {
  if (
    document.readiness.status !== "needs-build"
    && document.readiness.status !== "needs-export"
    && document.readiness.status !== "ready"
  ) {
    throw new Error("Review the archive contents before building the package.");
  }
  const receipt: ReproducibilityBuildReceipt = {
    archiveCreatedAt: document.reviewedAt,
    archiveChecksum: verification.archiveChecksum,
    manifestChecksum: verification.manifestChecksum,
    fileSetChecksum: verification.fileSetChecksum,
    fileCount: verification.fileCount,
    archiveBytes: verification.archiveBytes,
    verifiedAt: verification.verifiedAt,
    verificationStatus: "verified",
  };
  const normalized = normalizeDocument({
    ...document,
    updatedAt: verification.verifiedAt,
    lastBuild: receipt,
    exportedAt: "",
  }, release, plan, audit, preparation, execution, interpretation);
  if (!normalized) throw new Error("The verified archive receipt could not be recorded.");
  return normalized;
}

export function markReproducibilityPackageExported(
  document: ReproducibilityPackageDocument,
  archiveChecksum: string,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  audit: DataIntakeAuditReceipt,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  interpretation: AnalysisInterpretationDocument,
  exportedAt = new Date().toISOString(),
): ReproducibilityPackageDocument {
  if (
    !["needs-export", "ready"].includes(document.readiness.status)
    || document.lastBuild?.archiveChecksum !== archiveChecksum
  ) {
    throw new Error("Export requires the exact reviewed and verified archive build.");
  }
  const normalized = normalizeDocument({
    ...document,
    updatedAt: exportedAt,
    exportedAt,
  }, release, plan, audit, preparation, execution, interpretation);
  if (!normalized) throw new Error("The reproducibility archive export could not be recorded.");
  return normalized;
}

function readme(document: ReproducibilityPackageDocument): string {
  return `# Cerise Scholar Reproducibility Package

Project: ${safeLine(document.projectLabel)}
Release: v${document.releaseNumber}
Release ID: ${document.releaseId}
Release checksum: ${document.releaseChecksum}
Package created: ${document.reviewedAt}

## What this archive contains

This local archive contains the frozen analysis contract, data dictionary,
Analysis Plan, aggregate Data Intake receipt, deterministic preparation
operation log, Phase 8.4 configuration and aggregate Results Record, Phase 8.5
interpretation/tables/figures, divergence register, version metadata, external
restricted-material references, a SHA-256 manifest, and a verification report.

The Phase 8.4 aggregate results are stored once inside
\`${RESULTS_RECORD_PATH}\`; \`analysis/phase-8.4-index.json\` points to that
file and records the reviewed execution receipt.

## Privacy boundary

Participant rows, derived participant rows, raw audio/video, and the combined
SQLite database are not embedded. Researcher-controlled locations may be
referenced in \`references/restricted-materials.json\`.

## Verification boundary

The manifest uses SHA-256 to detect file changes. These checksums are not a
digital signature and do not prove authorship, scientific reproducibility,
validity, ethics approval, preregistration, or publication readiness. The
recorded browser context describes archive construction, not the original
Phase 8.4 execution environment. Nothing is uploaded automatically.
`;
}

function sourceFiles(input: BuildReproducibilityArchiveInput): ArchiveFile[] {
  const {
    document,
    release,
    plan,
    audit,
    preparation,
    execution,
    interpretation,
    resultsRecord,
  } = input;
  const { analysisContract: _contract, ...manifestMetadata } = release.manifest;
  void _contract;
  const phase84Index = {
    schemaVersion: ANALYSIS_EXECUTION_SCHEMA_VERSION,
    projectId: release.projectId,
    releaseId: release.releaseId,
    releaseChecksum: release.checksum,
    analysisPlanUpdatedAt: plan.updatedAt,
    preparation: execution.preparation,
    specifications: execution.specifications,
    lastRun: execution.lastRun,
    reviewedAt: execution.reviewedAt,
    exportedAt: execution.exportedAt,
    methodRegistry: resultsRecord.package.aggregateAnalysis.methodRegistry,
    aggregateResultsLocation: RESULTS_RECORD_PATH,
    resultChecksum: resultsRecord.package.source.resultChecksum,
    resultsRecordChecksum: resultsRecord.package.integrity.packageChecksum,
    participantRowsIncluded: false,
  };
  const divergenceRegister = {
    schemaVersion: 1,
    projectId: release.projectId,
    releaseId: release.releaseId,
    contractChecksum: document.contractChecksum,
    trustedAmendmentLedger: false,
    phase84ConfigurationDepartures: execution.specifications
      .filter((item) => item.enabled && item.deviationRationale.trim())
      .map((item) => ({
        analysisId: item.id,
        researchQuestionId: item.researchQuestionId,
        rationale: item.deviationRationale,
      })),
    phase85Divergences: interpretation.divergences,
    boundary:
      "researcher-authored-divergence-register-not-a-signed-or-trusted-amendment-ledger",
  };
  const restrictedMaterials = {
    schemaVersion: 1,
    projectId: release.projectId,
    releaseId: release.releaseId,
    participantData: document.restrictedMaterials.participantData,
    rawMedia: document.restrictedMaterials.rawMedia,
    combinedSqlite: document.restrictedMaterials.combinedSqlite,
    participantRowsIncluded: false,
    derivedParticipantRowsIncluded: false,
    rawMediaIncluded: false,
    combinedSqliteIncluded: false,
    reviewedAt: document.reviewedAt,
  };
  const versionMetadata = {
    application: {
      name: "Cerise Scholar",
      version: CERISE_APPLICATION_VERSION,
    },
    engine: {
      reproducibility: REPRODUCIBILITY_ENGINE_VERSION,
      analysisExecutionBoundary:
        "deterministic-browser-local-reviewed-registry-no-arbitrary-code-no-ai",
    },
    schemas: {
      releaseFormat: release.manifest.formatVersion,
      study: release.manifest.studySchemaVersion,
      analysisContract: ANALYSIS_CONTRACT_SCHEMA_VERSION,
      analysisPlan: ANALYSIS_PLAN_SCHEMA_VERSION,
      dataIntakeAudit: DATA_INTAKE_AUDIT_SCHEMA_VERSION,
      dataPreparationDocument: DATA_PREPARATION_SCHEMA_VERSION,
      dataPreparationPackage: DATA_PREPARATION_PACKAGE_VERSION,
      analysisExecution: ANALYSIS_EXECUTION_SCHEMA_VERSION,
      analysisResultsPackage: ANALYSIS_RESULTS_PACKAGE_VERSION,
      analysisInterpretation: ANALYSIS_INTERPRETATION_SCHEMA_VERSION,
      resultsRecord: RESULTS_RECORD_PACKAGE_VERSION,
      reproducibilityDocument: REPRODUCIBILITY_DOCUMENT_SCHEMA_VERSION,
      reproducibilityManifest: REPRODUCIBILITY_MANIFEST_SCHEMA_VERSION,
    },
    archiveBuildEnvironment: document.environment,
    analysisExecutionEnvironment: {
      capturedByPhase84: false,
      researcherNotes: document.executionEnvironmentNotes,
    },
  };
  const verificationReport = {
    schemaVersion: 1,
    generatedAt: document.reviewedAt,
    status: "verified-at-build",
    checks: [
      "immutable release checksum verified against the local frozen release",
      "contract, plan, audit, preparation, execution, and Results Record identities matched",
      "Results Record package and interpretation checksums verified before archive construction",
      "archive contains metadata and aggregate outputs only",
      "every non-manifest archive file is listed with a SHA-256 checksum",
      "the completed TAR is parsed and re-verified before export is enabled",
    ],
    limitations: [
      "checksums are not digital signatures and do not prove authorship",
      "the Phase 8.4 browser/device execution environment was not automatically captured",
      "package verification is not scientific reproducibility or validity certification",
      "external restricted-material references are not opened or verified by Cerise",
    ],
  };
  const files: Array<[string, ReproducibilityManifestEntry["mediaType"], unknown]> = [
    ["metadata/frozen-release.json", "application/json", {
      schemaVersion: 1,
      projectId: release.projectId,
      releaseId: release.releaseId,
      releaseNumber: release.releaseNumber,
      createdAt: release.createdAt,
      releaseNotes: release.releaseNotes,
      checksum: release.checksum,
      manifest: manifestMetadata,
      exclusions: [
        "frozen Studio specification and embedded study media",
        "participant rows and local collector database",
      ],
      checksumBoundary:
        "release checksum verified locally before packaging; metadata-only file cannot independently reconstruct it",
    }],
    ["metadata/data-dictionary.json", "application/json", {
      schemaVersion: 1,
      projectId: release.projectId,
      releaseId: release.releaseId,
      contractChecksum: document.contractChecksum,
      variables: plan.variables,
      source: "frozen-analysis-plan-variable-dictionary",
    }],
    ["planning/analysis-contract.json", "application/json", {
      schemaVersion: release.manifest.analysisContractSchemaVersion,
      checksum: release.manifest.analysisContractChecksum,
      contract: release.manifest.analysisContract,
    }],
    ["planning/analysis-plan.json", "application/json", plan],
    ["audit/data-intake-audit.json", "application/json", audit],
    ["preparation/operation-log.json", "application/json", {
      schemaVersion: preparation.schemaVersion,
      projectId: preparation.projectId,
      releaseId: preparation.releaseId,
      contractChecksum: preparation.contractChecksum,
      sourceAudit: preparation.sourceAudit,
      operations: preparation.operations,
      lastRun: preparation.lastRun,
      reviewedAt: preparation.reviewedAt,
      exportedAt: preparation.exportedAt,
      participantRowsIncluded: false,
      rawDataRetention: preparation.rawDataRetention,
    }],
    ["analysis/phase-8.4-index.json", "application/json", phase84Index],
    [RESULTS_RECORD_PATH, "application/json", resultsRecord],
    [
      "provenance/divergence-and-amendment-register.json",
      "application/json",
      divergenceRegister,
    ],
    ["environment/versions.json", "application/json", versionMetadata],
    ["references/restricted-materials.json", "application/json", restrictedMaterials],
    ["verification/verification-report.json", "application/json", verificationReport],
  ];
  return [
    {
      path: "README.md",
      mediaType: "text/markdown",
      bytes: markdownBytes(readme(document)),
    },
    ...files.map(([path, mediaType, value]) => ({
      path,
      mediaType,
      bytes: jsonBytes(value),
    })),
  ];
}

async function manifestFor(
  document: ReproducibilityPackageDocument,
  files: ArchiveFile[],
): Promise<ReproducibilityManifest> {
  const entries = await Promise.all(files
    .toSorted((left, right) => left.path.localeCompare(right.path))
    .map(async (file): Promise<ReproducibilityManifestEntry> => ({
      path: file.path,
      mediaType: file.mediaType,
      byteSize: file.bytes.byteLength,
      checksum: await checksumBytes(file.bytes),
    })));
  const fileSetChecksum = await checksumBytes(jsonBytes(entries));
  const unsigned = {
    schemaVersion: REPRODUCIBILITY_MANIFEST_SCHEMA_VERSION,
    packageId: `reproducibility-${document.releaseId}`,
    projectId: document.projectId,
    projectLabel: document.projectLabel,
    releaseId: document.releaseId,
    releaseNumber: document.releaseNumber,
    releaseChecksum: document.releaseChecksum,
    contractChecksum: document.contractChecksum,
    createdAt: document.reviewedAt,
    archiveFormat: "ustar" as const,
    contentRoles: {
      readme: "README.md" as const,
      frozenRelease: "metadata/frozen-release.json" as const,
      dataDictionary: "metadata/data-dictionary.json" as const,
      analysisContract: "planning/analysis-contract.json" as const,
      analysisPlan: "planning/analysis-plan.json" as const,
      intakeAudit: "audit/data-intake-audit.json" as const,
      preparationLog: "preparation/operation-log.json" as const,
      analysisIndex: "analysis/phase-8.4-index.json" as const,
      resultsRecord: RESULTS_RECORD_PATH as typeof RESULTS_RECORD_PATH,
      divergenceRegister:
        "provenance/divergence-and-amendment-register.json" as const,
      environment: "environment/versions.json" as const,
      restrictedMaterials: "references/restricted-materials.json" as const,
      verificationReport: "verification/verification-report.json" as const,
    },
    sourceIntegrity: document.source,
    files: entries,
    privacy: {
      participantRowsIncluded: false as const,
      derivedParticipantRowsIncluded: false as const,
      rawMediaIncluded: false as const,
      combinedSqliteIncluded: false as const,
    },
    integrity: { fileSetChecksum },
    uploadBoundary: "local-download-only-no-automatic-upload" as const,
    verificationClaim:
      "self-verifying-checksums-not-authenticity-reproducibility-or-validity-certification" as const,
  };
  const manifestChecksum = await checksumBytes(jsonBytes(unsigned));
  return {
    ...unsigned,
    integrity: { fileSetChecksum, manifestChecksum },
  };
}

function writeAscii(target: Uint8Array, offset: number, length: number, value: string) {
  const bytes = new TextEncoder().encode(value);
  if (bytes.byteLength > length) throw new Error("A TAR field exceeds its fixed width.");
  target.set(bytes, offset);
}

function octal(value: number, width: number): string {
  const digits = Math.max(0, Math.trunc(value)).toString(8);
  if (digits.length > width - 1) throw new Error("A TAR numeric field exceeds its limit.");
  return `${digits.padStart(width - 1, "0")}\0`;
}

function tarHeader(path: string, byteSize: number): Uint8Array {
  if (!safeArchivePath(path)) throw new Error(`Unsafe archive path: ${path}`);
  const header = new Uint8Array(TAR_BLOCK_BYTES);
  writeAscii(header, 0, 100, path);
  writeAscii(header, 100, 8, octal(0o644, 8));
  writeAscii(header, 108, 8, octal(0, 8));
  writeAscii(header, 116, 8, octal(0, 8));
  writeAscii(header, 124, 12, octal(byteSize, 12));
  writeAscii(header, 136, 12, octal(0, 12));
  header.fill(32, 148, 156);
  header[156] = "0".charCodeAt(0);
  writeAscii(header, 257, 6, "ustar\0");
  writeAscii(header, 263, 2, "00");
  writeAscii(header, 265, 32, "cerise");
  writeAscii(header, 297, 32, "cerise");
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeAscii(header, 148, 8, `${checksum.toString(8).padStart(6, "0")}\0 `);
  return header;
}

function buildTar(files: ArchiveFile[]): Uint8Array {
  const ordered = files.toSorted((left, right) => left.path.localeCompare(right.path));
  const total = ordered.reduce((sum, file) => (
    sum + TAR_BLOCK_BYTES
      + Math.ceil(file.bytes.byteLength / TAR_BLOCK_BYTES) * TAR_BLOCK_BYTES
  ), TAR_BLOCK_BYTES * 2);
  if (total > MAX_REPRODUCIBILITY_ARCHIVE_BYTES) {
    throw new Error("The reproducibility archive exceeds the 24 MB local limit.");
  }
  const archive = new Uint8Array(total);
  let offset = 0;
  ordered.forEach((file) => {
    archive.set(tarHeader(file.path, file.bytes.byteLength), offset);
    offset += TAR_BLOCK_BYTES;
    archive.set(file.bytes, offset);
    offset += Math.ceil(file.bytes.byteLength / TAR_BLOCK_BYTES) * TAR_BLOCK_BYTES;
  });
  return archive;
}

function safeArchivePath(path: string): boolean {
  return path.length > 0
    && path.length <= 100
    && /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(path)
    && !path.startsWith("/")
    && !path.split("/").includes("..")
    && !path.includes("//");
}

function zeroBlock(bytes: Uint8Array, offset: number): boolean {
  for (let index = offset; index < offset + TAR_BLOCK_BYTES; index += 1) {
    if (bytes[index] !== 0) return false;
  }
  return true;
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  const field = bytes.slice(offset, offset + length);
  const zero = field.indexOf(0);
  return new TextDecoder("utf-8", { fatal: true })
    .decode(zero >= 0 ? field.slice(0, zero) : field)
    .trim();
}

function readOctal(bytes: Uint8Array, offset: number, length: number): number {
  const value = readAscii(bytes, offset, length).replace(/\s/g, "");
  if (!/^[0-7]+$/.test(value)) throw new Error("The TAR contains an invalid numeric field.");
  const parsed = Number.parseInt(value, 8);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error("The TAR contains an out-of-range numeric field.");
  }
  return parsed;
}

function parseTar(bytes: Uint8Array): Map<string, Uint8Array> {
  if (
    bytes.byteLength < TAR_BLOCK_BYTES * 3
    || bytes.byteLength > MAX_REPRODUCIBILITY_ARCHIVE_BYTES
    || bytes.byteLength % TAR_BLOCK_BYTES !== 0
  ) throw new Error("Select a bounded Cerise reproducibility TAR archive.");
  const files = new Map<string, Uint8Array>();
  let offset = 0;
  while (offset + TAR_BLOCK_BYTES <= bytes.byteLength) {
    if (zeroBlock(bytes, offset)) {
      if (
        offset + (TAR_BLOCK_BYTES * 2) > bytes.byteLength
        || !zeroBlock(bytes, offset + TAR_BLOCK_BYTES)
      ) throw new Error("The TAR end marker is incomplete.");
      for (let index = offset; index < bytes.byteLength; index += 1) {
        if (bytes[index] !== 0) throw new Error("The TAR has non-zero trailing bytes.");
      }
      return files;
    }
    const header = bytes.slice(offset, offset + TAR_BLOCK_BYTES);
    const expectedChecksum = readOctal(header, 148, 8);
    let actualChecksum = 0;
    header.forEach((byte, index) => {
      actualChecksum += index >= 148 && index < 156 ? 32 : byte;
    });
    if (expectedChecksum !== actualChecksum) throw new Error("A TAR header checksum failed.");
    const path = readAscii(header, 0, 100);
    const magic = readAscii(header, 257, 6);
    const type = header[156];
    const byteSize = readOctal(header, 124, 12);
    if (
      !safeArchivePath(path)
      || magic !== "ustar"
      || ![0, "0".charCodeAt(0)].includes(type)
      || byteSize > MAX_REPRODUCIBILITY_FILE_BYTES
      || files.has(path)
      || files.size >= MAX_REPRODUCIBILITY_FILES
    ) throw new Error("The TAR contains an unsupported or unsafe entry.");
    const canonicalHeader = tarHeader(path, byteSize);
    if (header.some((byte, index) => byte !== canonicalHeader[index])) {
      throw new Error("A TAR header does not match the deterministic Cerise format.");
    }
    offset += TAR_BLOCK_BYTES;
    const paddedSize = Math.ceil(byteSize / TAR_BLOCK_BYTES) * TAR_BLOCK_BYTES;
    if (offset + paddedSize > bytes.byteLength - (TAR_BLOCK_BYTES * 2)) {
      throw new Error("A TAR entry exceeds the archive boundary.");
    }
    for (
      let index = offset + byteSize;
      index < offset + paddedSize;
      index += 1
    ) {
      if (bytes[index] !== 0) {
        throw new Error("A TAR entry contains non-zero padding bytes.");
      }
    }
    files.set(path, bytes.slice(offset, offset + byteSize));
    offset += paddedSize;
  }
  throw new Error("The TAR is missing its end marker.");
}

function parseJsonFile(files: Map<string, Uint8Array>, path: string): unknown {
  const bytes = files.get(path);
  if (!bytes) throw new Error(`The archive is missing ${path}.`);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`${path} is not valid UTF-8 JSON.`);
  }
}

function normalizeManifest(value: unknown): ReproducibilityManifest | null {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "schemaVersion",
      "packageId",
      "projectId",
      "projectLabel",
      "releaseId",
      "releaseNumber",
      "releaseChecksum",
      "contractChecksum",
      "createdAt",
      "archiveFormat",
      "contentRoles",
      "sourceIntegrity",
      "files",
      "privacy",
      "integrity",
      "uploadBoundary",
      "verificationClaim",
    ])
    || value.schemaVersion !== REPRODUCIBILITY_MANIFEST_SCHEMA_VERSION
    || !safeId(value.packageId)
    || !safeId(value.projectId)
    || !safeLine(value.projectLabel)
    || !safeId(value.releaseId)
    || !safeInteger(value.releaseNumber)
    || !safeChecksum(value.releaseChecksum)
    || !safeChecksum(value.contractChecksum)
    || !safeTimestamp(value.createdAt)
    || value.archiveFormat !== "ustar"
    || !isRecord(value.contentRoles)
    || canonicalJson(value.contentRoles) !== canonicalJson({
      readme: "README.md",
      frozenRelease: "metadata/frozen-release.json",
      dataDictionary: "metadata/data-dictionary.json",
      analysisContract: "planning/analysis-contract.json",
      analysisPlan: "planning/analysis-plan.json",
      intakeAudit: "audit/data-intake-audit.json",
      preparationLog: "preparation/operation-log.json",
      analysisIndex: "analysis/phase-8.4-index.json",
      resultsRecord: RESULTS_RECORD_PATH,
      divergenceRegister: "provenance/divergence-and-amendment-register.json",
      environment: "environment/versions.json",
      restrictedMaterials: "references/restricted-materials.json",
      verificationReport: "verification/verification-report.json",
    })
    || !isRecord(value.sourceIntegrity)
    || !exactKeys(value.sourceIntegrity, [
      "resultsRecordCreatedAt",
      "resultsRecordChecksum",
      "analysisResultsPackageChecksum",
      "resultChecksum",
      "preparationPackageChecksum",
    ])
    || !safeTimestamp(value.sourceIntegrity.resultsRecordCreatedAt)
    || !safeChecksum(value.sourceIntegrity.resultsRecordChecksum)
    || !safeChecksum(value.sourceIntegrity.analysisResultsPackageChecksum)
    || !safeChecksum(value.sourceIntegrity.resultChecksum)
    || !safeChecksum(value.sourceIntegrity.preparationPackageChecksum)
    || !Array.isArray(value.files)
    || value.files.length !== REQUIRED_CONTENT_PATHS.length
    || !isRecord(value.privacy)
    || canonicalJson(value.privacy) !== canonicalJson({
      participantRowsIncluded: false,
      derivedParticipantRowsIncluded: false,
      rawMediaIncluded: false,
      combinedSqliteIncluded: false,
    })
    || !isRecord(value.integrity)
    || !exactKeys(value.integrity, ["fileSetChecksum", "manifestChecksum"])
    || !safeChecksum(value.integrity.fileSetChecksum)
    || !safeChecksum(value.integrity.manifestChecksum)
    || value.uploadBoundary !== "local-download-only-no-automatic-upload"
    || value.verificationClaim
      !== "self-verifying-checksums-not-authenticity-reproducibility-or-validity-certification"
  ) return null;
  const entries: ReproducibilityManifestEntry[] = [];
  for (const item of value.files) {
    if (
      !isRecord(item)
      || !exactKeys(item, ["path", "mediaType", "byteSize", "checksum"])
      || typeof item.path !== "string"
      || !safeArchivePath(item.path)
      || !["application/json", "text/markdown"].includes(String(item.mediaType))
      || !safeInteger(item.byteSize, MAX_REPRODUCIBILITY_FILE_BYTES)
      || !safeChecksum(item.checksum)
    ) return null;
    entries.push(item as unknown as ReproducibilityManifestEntry);
  }
  const paths = entries.map((entry) => entry.path);
  if (
    new Set(paths).size !== paths.length
    || canonicalJson(paths.toSorted())
      !== canonicalJson([...REQUIRED_CONTENT_PATHS].toSorted())
  ) return null;
  return {
    ...(value as unknown as ReproducibilityManifest),
    files: entries,
  };
}

function resultsRecordSelfChecksum(value: unknown): Promise<string> {
  if (
    !isRecord(value)
    || value.exportType !== RESULTS_RECORD_EXPORT_TYPE
    || value.exportBoundary !== RESULTS_RECORD_EXPORT_BOUNDARY
    || !safeTimestamp(value.exportedAt)
    || !isRecord(value.package)
    || value.package.createdAt !== value.exportedAt
    || !isRecord(value.package.integrity)
    || !safeChecksum(value.package.integrity.packageChecksum)
    || value.package.participantRowsIncluded !== false
  ) throw new Error("The archived Results Record is malformed.");
  const unsigned = {
    ...value.package,
    integrity: {
      analysisResultsPackageChecksum:
        value.package.integrity.analysisResultsPackageChecksum,
      interpretationChecksum: value.package.integrity.interpretationChecksum,
    },
  };
  return sha256Checksum(unsigned);
}

export async function verifyReproducibilityArchive(
  archive: Uint8Array,
  expected?: {
    projectId: string;
    releaseId: string;
    releaseChecksum: string;
    resultsRecordChecksum: string;
  },
  verifiedAt = new Date().toISOString(),
): Promise<ReproducibilityArchiveVerification> {
  const files = parseTar(archive);
  const manifestValue = parseJsonFile(files, MANIFEST_PATH);
  const manifest = normalizeManifest(manifestValue);
  if (!manifest || files.size !== manifest.files.length + 1) {
    throw new Error("The archive manifest shape or file set is invalid.");
  }
  if (
    expected
    && (
      manifest.projectId !== expected.projectId
      || manifest.releaseId !== expected.releaseId
      || manifest.releaseChecksum !== expected.releaseChecksum
      || manifest.sourceIntegrity.resultsRecordChecksum
        !== expected.resultsRecordChecksum
    )
  ) throw new Error("The archive does not match the selected project and Results Record.");

  const unsignedManifest = {
    ...manifest,
    integrity: { fileSetChecksum: manifest.integrity.fileSetChecksum },
  };
  const manifestChecksum = await checksumBytes(jsonBytes(unsignedManifest));
  if (manifestChecksum !== manifest.integrity.manifestChecksum) {
    throw new Error("The manifest checksum failed.");
  }
  const expectedEntries = manifest.files.toSorted(
    (left, right) => left.path.localeCompare(right.path),
  );
  for (const entry of expectedEntries) {
    const content = files.get(entry.path);
    if (
      !content
      || content.byteLength !== entry.byteSize
      || await checksumBytes(content) !== entry.checksum
    ) throw new Error(`The file checksum failed for ${entry.path}.`);
  }
  const fileSetChecksum = await checksumBytes(jsonBytes(expectedEntries));
  if (fileSetChecksum !== manifest.integrity.fileSetChecksum) {
    throw new Error("The file-set checksum failed.");
  }

  const resultsRecord = parseJsonFile(files, RESULTS_RECORD_PATH);
  const computedResultsRecordChecksum = await resultsRecordSelfChecksum(resultsRecord);
  if (computedResultsRecordChecksum !== manifest.sourceIntegrity.resultsRecordChecksum) {
    throw new Error("The archived Results Record package checksum failed.");
  }
  const restricted = parseJsonFile(files, "references/restricted-materials.json");
  if (
    !isRecord(restricted)
    || restricted.participantRowsIncluded !== false
    || restricted.derivedParticipantRowsIncluded !== false
    || restricted.rawMediaIncluded !== false
    || restricted.combinedSqliteIncluded !== false
  ) throw new Error("The restricted-material exclusion declaration is invalid.");

  const archiveChecksum = await checksumBytes(archive);
  return {
    status: "verified",
    verifiedAt,
    archiveChecksum,
    manifestChecksum,
    fileSetChecksum,
    fileCount: files.size,
    archiveBytes: archive.byteLength,
    manifest,
    checks: [
      {
        id: "tar-structure",
        status: "pass",
        detail: "The bounded USTAR structure, entry types, paths, sizes, and headers are valid.",
      },
      {
        id: "manifest-integrity",
        status: "pass",
        detail: "The manifest and complete file-set checksums match.",
      },
      {
        id: "file-integrity",
        status: "pass",
        detail: `${manifest.files.length} non-manifest files match their SHA-256 entries.`,
      },
      {
        id: "results-record-integrity",
        status: "pass",
        detail: "The embedded Results Record package checksum matches the manifest source chain.",
      },
      {
        id: "privacy-declaration",
        status: "pass",
        detail: "Participant rows, derived rows, raw media, and SQLite are declared excluded.",
      },
    ],
  };
}

export async function buildReproducibilityArchive(
  input: BuildReproducibilityArchiveInput,
): Promise<{
  archive: Uint8Array;
  manifest: ReproducibilityManifest;
  verification: ReproducibilityArchiveVerification;
}> {
  const {
    document,
    release,
    plan,
    audit,
    preparation,
    execution,
    interpretation,
    resultsRecord,
  } = input;
  if (
    !document.researcherConfirmed
    || !document.reviewedAt
    || !isDataIntakeAuditReady(audit)
    || !isDataPreparationReady(preparation)
    || !isAnalysisExecutionReady(execution)
    || !isAnalysisInterpretationReady(interpretation)
    || resultsRecord.package.integrity.packageChecksum
      !== document.source.resultsRecordChecksum
  ) throw new Error("A reviewed Phase 8.6 record and exact verified Results Record are required.");
  await verifyResultsRecordExport(
    resultsRecord,
    release,
    plan,
    preparation,
    execution,
    interpretation,
  );
  const normalized = normalizeDocument(
    document,
    release,
    plan,
    audit,
    preparation,
    execution,
    interpretation,
  );
  if (
    !normalized
    || !["needs-build", "needs-export", "ready"].includes(normalized.readiness.status)
  ) throw new Error("Complete the reproducibility context and review before building.");

  const files = sourceFiles(input);
  if (files.length !== REQUIRED_CONTENT_PATHS.length) {
    throw new Error("The reproducibility file set is incomplete.");
  }
  const manifest = await manifestFor(normalized, files);
  const archive = buildTar([
    ...files,
    {
      path: MANIFEST_PATH,
      mediaType: "application/json",
      bytes: jsonBytes(manifest),
    },
  ]);
  const verification = await verifyReproducibilityArchive(
    archive,
    {
      projectId: release.projectId,
      releaseId: release.releaseId,
      releaseChecksum: release.checksum,
      resultsRecordChecksum: document.source.resultsRecordChecksum,
    },
    input.verifiedAt,
  );
  return { archive, manifest, verification };
}

export function reproducibilityStorageKey(
  projectId: string,
  releaseId: string,
): string {
  return `cerise-reproducibility-package:${projectId}:${releaseId}:v${REPRODUCIBILITY_DOCUMENT_SCHEMA_VERSION}`;
}

export function readReproducibilityPackageDocument(
  storage: StorageLike,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  audit: DataIntakeAuditReceipt,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  interpretation: AnalysisInterpretationDocument,
): ReproducibilityPackageDocument | null {
  try {
    const stored = storage.getItem(
      reproducibilityStorageKey(release.projectId, release.releaseId),
    );
    if (
      !stored
      || new TextEncoder().encode(stored).byteLength
        > MAX_REPRODUCIBILITY_DOCUMENT_BYTES
    ) return null;
    return normalizeDocument(
      JSON.parse(stored),
      release,
      plan,
      audit,
      preparation,
      execution,
      interpretation,
    );
  } catch {
    return null;
  }
}

export function writeReproducibilityPackageDocument(
  storage: StorageLike,
  release: ExperimentRelease,
  plan: AnalysisPlanDocument,
  audit: DataIntakeAuditReceipt,
  preparation: DataPreparationDocument,
  execution: AnalysisExecutionDocument,
  interpretation: AnalysisInterpretationDocument,
  document: ReproducibilityPackageDocument,
): ReproducibilityPackageDocument {
  const normalized = normalizeDocument(
    document,
    release,
    plan,
    audit,
    preparation,
    execution,
    interpretation,
  );
  if (!normalized) throw new Error("The reproducibility archive record was not saved.");
  storage.setItem(
    reproducibilityStorageKey(release.projectId, release.releaseId),
    JSON.stringify(normalized),
  );
  return normalized;
}

export function isReproducibilityPackageReady(
  document: ReproducibilityPackageDocument | null,
): boolean {
  return document?.readiness.status === "ready";
}
