import {
  canonicalJson,
  sha256Checksum,
} from "./experimentRelease";

export const QUALITATIVE_ANALYSIS_SCHEMA_VERSION = 1 as const;
export const QUALITATIVE_ANALYSIS_PACKAGE_VERSION = 1 as const;
export const QUALITATIVE_ANALYSIS_EXPORT_TYPE =
  "cerise-qualitative-analysis-package" as const;
export const QUALITATIVE_ANALYSIS_EXPORT_BOUNDARY =
  "local-qualitative-metadata-safe-excerpts-and-integration-record-no-raw-transcripts-or-media" as const;
export const MAX_QUALITATIVE_DOCUMENT_BYTES = 2 * 1024 * 1024;
export const MAX_QUALITATIVE_EXPORT_BYTES = 4 * 1024 * 1024;
export const MAX_TRANSCRIPT_BYTES = 5 * 1024 * 1024;
export const MAX_TRANSCRIPT_CHARACTERS = 2_000_000;
export const MAX_QUALITATIVE_TEXT = 8_000;
export const MAX_REPORTING_EXCERPT = 2_000;
export const MAX_QUALITATIVE_SOURCES = 48;
export const MAX_QUALITATIVE_CODES = 160;
export const MAX_CODEBOOK_VERSIONS = 80;
export const MAX_QUALITATIVE_SEGMENTS = 4_000;
export const MAX_QUALITATIVE_MEMOS = 400;
export const MAX_QUALITATIVE_THEMES = 120;
export const MAX_QUANTITATIVE_EVIDENCE = 120;
export const MAX_JOINT_DISPLAYS = 160;
export const MAX_TRIANGULATION_RECORDS = 160;

export type QualitativeLaneMode =
  | "not-selected"
  | "qualitative"
  | "mixed-methods"
  | "not-applicable";
export type QualitativeCodeOrigin = "a-priori" | "emergent";
export type QualitativeConsentScope =
  | "not-reviewed"
  | "analysis-only"
  | "analysis-and-anonymized-reporting"
  | "restricted-no-quotation";
export type QuotationUse =
  | "not-reviewed"
  | "paraphrase-only"
  | "direct-quote-approved"
  | "not-for-reporting";
export type RedactionStatus =
  | "not-reviewed"
  | "no-identifiers-observed"
  | "redacted-copy-reviewed"
  | "not-applicable";
export type MemoScope = "study" | "source" | "segment" | "theme";
export type MixedMethodsDesign =
  | "not-selected"
  | "convergent"
  | "explanatory-sequential"
  | "exploratory-sequential"
  | "embedded"
  | "multiphase"
  | "other";
export type IntegrationRelationship =
  | "not-reviewed"
  | "convergence"
  | "complementarity"
  | "divergence"
  | "expansion"
  | "silence";
export type TriangulationKind =
  | "across-sources"
  | "across-methods"
  | "across-investigators"
  | "participant-feedback"
  | "negative-case"
  | "single-source-not-applicable";

export interface QualitativeSource {
  id: string;
  label: string;
  originalFilename: string;
  fileType: "txt" | "md" | "srt" | "vtt";
  byteLength: number;
  characterCount: number;
  textChecksum: string;
  mediaReference: string;
  collectionContext: string;
  consentScope: QualitativeConsentScope;
  importedAt: string;
}

export interface LoadedQualitativeSource {
  source: QualitativeSource;
  text: string;
}

export interface QualitativeCode {
  id: string;
  name: string;
  definition: string;
  inclusionCriteria: string;
  exclusionCriteria: string;
  origin: QualitativeCodeOrigin;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface QualitativeCodebookVersion {
  version: number;
  createdAt: string;
  rationale: string;
  codes: QualitativeCode[];
  codesChecksum: string;
}

export interface QualitativeSegment {
  id: string;
  sourceId: string;
  startOffset: number;
  endOffset: number;
  selectedTextChecksum: string;
  codeIds: string[];
  mediaStart: string;
  mediaEnd: string;
  analyticNote: string;
  quotationUse: QuotationUse;
  redactionStatus: RedactionStatus;
  reportingExcerpt: string;
  createdAt: string;
  updatedAt: string;
}

export interface QualitativeMemo {
  id: string;
  scope: MemoScope;
  sourceId: string;
  segmentId: string;
  themeId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface QualitativeTheme {
  id: string;
  title: string;
  statement: string;
  boundary: string;
  codeIds: string[];
  supportingSegmentIds: string[];
  negativeCaseSegmentIds: string[];
  negativeCaseReview: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuantitativeEvidenceReference {
  id: string;
  label: string;
  sourceReference: string;
  aggregateFinding: string;
  limitations: string;
  researcherVerified: boolean;
}

export interface MixedMethodsJointDisplay {
  id: string;
  themeId: string;
  quantitativeEvidenceId: string;
  relationship: IntegrationRelationship;
  integratedInterpretation: string;
  metaInference: string;
  limitations: string;
  reviewed: boolean;
}

export interface QualitativeTriangulationRecord {
  id: string;
  kind: TriangulationKind;
  title: string;
  sourceIds: string[];
  themeIds: string[];
  convergentEvidence: string;
  contradictoryEvidence: string;
  resolution: string;
  limitations: string;
  reviewed: boolean;
}

export interface QualitativeReadiness {
  status:
    | "needs-scope"
    | "needs-sources"
    | "needs-coding"
    | "needs-themes"
    | "needs-integration"
    | "needs-review"
    | "needs-export"
    | "ready";
  issues: string[];
}

export interface QualitativeAnalysisDocument {
  schemaVersion: typeof QUALITATIVE_ANALYSIS_SCHEMA_VERSION;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  mode: QualitativeLaneMode;
  notApplicableRationale: string;
  studyQuestion: string;
  inquiryApproach: string;
  researcherPositioning: string;
  analysisProcedure: string;
  integrationDesign: MixedMethodsDesign;
  integrationRationale: string;
  sources: QualitativeSource[];
  codes: QualitativeCode[];
  codebookVersions: QualitativeCodebookVersion[];
  segments: QualitativeSegment[];
  memos: QualitativeMemo[];
  themes: QualitativeTheme[];
  quantitativeEvidence: QuantitativeEvidenceReference[];
  jointDisplays: MixedMethodsJointDisplay[];
  triangulationRecords: QualitativeTriangulationRecord[];
  overallConclusion: string;
  remainingLimitations: string;
  reviewedAt: string;
  exportedAt: string;
  lastExportChecksum: string;
  readiness: QualitativeReadiness;
  transcriptRetention:
    "active-tab-only-source-text-never-persisted-uploaded-or-exported";
  mediaBoundary:
    "reference-labels-only-no-media-import-playback-transcription-or-ai-access";
  inferenceBoundary:
    "no-automatic-emotion-face-personality-or-behavioral-inference";
  scientificClaim:
    "researcher-authored-qualitative-record-not-validity-consent-or-publication-certification";
}

export interface QualitativeCodeSourceMatrixRow {
  codeId: string;
  codeName: string;
  sourceCounts: Array<{
    sourceId: string;
    sourceLabel: string;
    segmentCount: number;
  }>;
  totalSegments: number;
}

export interface QualitativeAnalysisPackage {
  packageVersion: typeof QUALITATIVE_ANALYSIS_PACKAGE_VERSION;
  projectId: string;
  createdAt: string;
  reviewedAt: string;
  mode: Exclude<QualitativeLaneMode, "not-selected">;
  scope: {
    notApplicableRationale: string;
    studyQuestion: string;
    inquiryApproach: string;
    researcherPositioning: string;
    analysisProcedure: string;
    integrationDesign: MixedMethodsDesign;
    integrationRationale: string;
  };
  sourceCatalog: QualitativeSource[];
  codebook: {
    currentCodes: QualitativeCode[];
    versions: QualitativeCodebookVersion[];
  };
  analysis: {
    segments: QualitativeSegment[];
    memos: QualitativeMemo[];
    themes: QualitativeTheme[];
    codeBySourceMatrix: QualitativeCodeSourceMatrixRow[];
    triangulationRecords: QualitativeTriangulationRecord[];
  };
  integration: {
    quantitativeEvidence: QuantitativeEvidenceReference[];
    jointDisplays: MixedMethodsJointDisplay[];
  };
  conclusions: {
    overallConclusion: string;
    remainingLimitations: string;
  };
  boundaries: {
    rawTranscriptTextIncluded: false;
    rawMediaIncluded: false;
    automaticTranscriptionUsed: false;
    automaticInferenceUsed: false;
    directQuotationRequiresConsentAndRedactionReview: true;
    quantitativeStatisticsExecuted: false;
  };
  integrity: {
    sourceCatalogChecksum: string;
    codebookLedgerChecksum: string;
    analysisLedgerChecksum: string;
    integrationLedgerChecksum: string;
    packageChecksum: string;
  };
  dataClassification:
    "local-qualitative-analysis-metadata-and-researcher-approved-excerpts-potentially-identifiable";
  scientificBoundary:
    "audit-ready-researcher-authored-record-not-methodological-integrity-consent-or-publication-certification";
}

export interface QualitativeAnalysisExport {
  exportType: typeof QUALITATIVE_ANALYSIS_EXPORT_TYPE;
  exportBoundary: typeof QUALITATIVE_ANALYSIS_EXPORT_BOUNDARY;
  exportedAt: string;
  package: QualitativeAnalysisPackage;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const MODES: readonly QualitativeLaneMode[] = [
  "not-selected",
  "qualitative",
  "mixed-methods",
  "not-applicable",
];
const CONSENT_SCOPES: readonly QualitativeConsentScope[] = [
  "not-reviewed",
  "analysis-only",
  "analysis-and-anonymized-reporting",
  "restricted-no-quotation",
];
const CODE_ORIGINS: readonly QualitativeCodeOrigin[] = ["a-priori", "emergent"];
const QUOTATION_USES: readonly QuotationUse[] = [
  "not-reviewed",
  "paraphrase-only",
  "direct-quote-approved",
  "not-for-reporting",
];
const REDACTION_STATUSES: readonly RedactionStatus[] = [
  "not-reviewed",
  "no-identifiers-observed",
  "redacted-copy-reviewed",
  "not-applicable",
];
const MEMO_SCOPES: readonly MemoScope[] = ["study", "source", "segment", "theme"];
const MIXED_DESIGNS: readonly MixedMethodsDesign[] = [
  "not-selected",
  "convergent",
  "explanatory-sequential",
  "exploratory-sequential",
  "embedded",
  "multiphase",
  "other",
];
const RELATIONSHIPS: readonly IntegrationRelationship[] = [
  "not-reviewed",
  "convergence",
  "complementarity",
  "divergence",
  "expansion",
  "silence",
];
const TRIANGULATION_KINDS: readonly TriangulationKind[] = [
  "across-sources",
  "across-methods",
  "across-investigators",
  "participant-feedback",
  "negative-case",
  "single-source-not-applicable",
];
const FILE_TYPES = ["txt", "md", "srt", "vtt"] as const;
const SAFE_COLOR = /^#[0-9a-fA-F]{6}$/;

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

function safeChecksum(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function safeTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function safeId(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 160
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);
}

function finiteNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number"
    && Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0;
}

function cleanText(value: unknown, maximum = MAX_QUALITATIVE_TEXT): string {
  return typeof value === "string"
    ? value.replace(/\u0000/g, "").trim().slice(0, maximum)
    : "";
}

function cleanInline(value: unknown, maximum = 300): string {
  return cleanText(value, maximum).replace(/\s+/g, " ");
}

function parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && allowed.includes(value as T)
    ? value as T
    : null;
}

function uniqueIds(values: unknown, maximum: number): string[] | null {
  if (!Array.isArray(values) || values.length > maximum || !values.every(safeId)) return null;
  const result = [...new Set(values)];
  return result.length === values.length ? result : null;
}

function codeSnapshotMatchesCurrent(
  current: QualitativeCode[],
  version: QualitativeCodebookVersion | undefined,
): boolean {
  return Boolean(version && canonicalJson(version.codes) === canonicalJson(current));
}

export function collectQualitativeReadiness(
  document: Omit<QualitativeAnalysisDocument, "readiness"> | QualitativeAnalysisDocument,
): QualitativeReadiness {
  const issues: string[] = [];
  if (document.mode === "not-selected") {
    return {
      status: "needs-scope",
      issues: ["Choose qualitative, mixed-methods, or document why this lane is not applicable."],
    };
  }
  if (document.mode === "not-applicable") {
    if (document.notApplicableRationale.trim().length < 20) {
      issues.push("Explain why qualitative or mixed-methods analysis is not applicable.");
      return { status: "needs-scope", issues };
    }
    if (!document.reviewedAt) {
      return { status: "needs-review", issues: [] };
    }
    if (!document.exportedAt) {
      return { status: "needs-export", issues: ["Export the qualitative-lane decision record."] };
    }
    return { status: "ready", issues: [] };
  }

  if (!document.studyQuestion.trim()) issues.push("Record the qualitative or mixed-methods research question.");
  if (!document.inquiryApproach.trim()) issues.push("Describe the qualitative approach to inquiry.");
  if (!document.researcherPositioning.trim()) issues.push("Record researcher positioning or reflexive context.");
  if (!document.analysisProcedure.trim()) issues.push("Describe the manual analytic procedure and unit of analysis.");
  if (issues.length > 0) return { status: "needs-scope", issues };

  if (document.sources.length === 0) issues.push("Import at least one local transcript.");
  document.sources.forEach((source) => {
    if (source.consentScope === "not-reviewed") {
      issues.push(`Review analysis and quotation consent for ${source.label}.`);
    }
  });
  if (issues.length > 0) return { status: "needs-sources", issues };

  const latestVersion = document.codebookVersions.at(-1);
  if (document.codes.length === 0) issues.push("Create at least one defined code.");
  document.codes.forEach((code) => {
    if (
      !code.name.trim()
      || !code.definition.trim()
      || !code.inclusionCriteria.trim()
      || !code.exclusionCriteria.trim()
    ) {
      issues.push(`Complete the definition and inclusion/exclusion boundaries for code ${code.id}.`);
    }
  });
  if (!latestVersion || !codeSnapshotMatchesCurrent(document.codes, latestVersion)) {
    issues.push("Freeze a codebook version that matches the current code definitions.");
  }
  if (document.segments.length === 0) issues.push("Create at least one manually selected coded segment.");
  const codeIds = new Set(document.codes.map((code) => code.id));
  const sourceMap = new Map(document.sources.map((source) => [source.id, source]));
  document.segments.forEach((segment) => {
    const source = sourceMap.get(segment.sourceId);
    if (segment.codeIds.length === 0 || segment.codeIds.some((id) => !codeIds.has(id))) {
      issues.push(`Assign at least one current code to segment ${segment.id}.`);
    }
    if (segment.quotationUse === "not-reviewed" || segment.redactionStatus === "not-reviewed") {
      issues.push(`Complete quotation and redaction review for segment ${segment.id}.`);
    }
    if (
      segment.quotationUse === "direct-quote-approved"
      && (
        source?.consentScope !== "analysis-and-anonymized-reporting"
        || !segment.reportingExcerpt.trim()
        || segment.redactionStatus === "not-applicable"
      )
    ) {
      issues.push(`Direct quotation ${segment.id} requires source consent, a reviewed safe excerpt, and redaction review.`);
    }
    if (segment.quotationUse !== "direct-quote-approved" && segment.reportingExcerpt.trim()) {
      issues.push(`Remove the reporting excerpt from ${segment.id} or approve it for direct quotation.`);
    }
  });
  if (!document.memos.some((memo) => memo.scope === "study" && memo.body.trim())) {
    issues.push("Add at least one study-level analytic or reflexive memo.");
  }
  document.memos.forEach((memo) => {
    const linked = memo.scope === "study"
      || (memo.scope === "source" && sourceMap.has(memo.sourceId))
      || (memo.scope === "segment" && document.segments.some((item) => item.id === memo.segmentId))
      || (memo.scope === "theme" && document.themes.some((item) => item.id === memo.themeId));
    if (!memo.title.trim() || !memo.body.trim() || !linked) {
      issues.push(`Complete the title, body, and valid scope link for memo ${memo.id}.`);
    }
  });
  if (issues.length > 0) return { status: "needs-coding", issues };

  const segmentIds = new Set(document.segments.map((segment) => segment.id));
  document.themes.forEach((theme) => {
    if (
      !theme.title.trim()
      || !theme.statement.trim()
      || !theme.boundary.trim()
      || theme.codeIds.length === 0
      || theme.supportingSegmentIds.length === 0
      || theme.supportingSegmentIds.some((id) => !segmentIds.has(id))
      || theme.negativeCaseSegmentIds.some((id) => !segmentIds.has(id))
      || !theme.negativeCaseReview.trim()
    ) {
      issues.push(`Complete the evidence, boundary, and negative-case review for theme ${theme.id}.`);
    }
  });
  if (document.themes.length === 0) issues.push("Develop at least one evidence-backed theme.");
  if (document.triangulationRecords.length === 0) {
    issues.push("Record triangulation or explain why a single-source check is not applicable.");
  }
  document.triangulationRecords.forEach((record) => {
    const needsLinkedEvidence = record.kind !== "single-source-not-applicable";
    if (
      !record.title.trim()
      || !record.resolution.trim()
      || !record.limitations.trim()
      || (needsLinkedEvidence && record.sourceIds.length === 0 && record.themeIds.length === 0)
      || !record.reviewed
    ) {
      issues.push(`Complete and review triangulation record ${record.id}.`);
    }
  });
  if (issues.length > 0) return { status: "needs-themes", issues };

  if (document.mode === "mixed-methods") {
    if (document.integrationDesign === "not-selected") {
      issues.push("Choose and document the mixed-methods integration design.");
    }
    if (!document.integrationRationale.trim()) {
      issues.push("Explain why qualitative and quantitative evidence are being integrated.");
    }
    if (!document.quantitativeEvidence.some((item) => item.researcherVerified)) {
      issues.push("Add at least one researcher-verified aggregate quantitative finding.");
    }
    document.quantitativeEvidence.forEach((item) => {
      if (
        item.researcherVerified
        && (
          !item.label.trim()
          || !item.sourceReference.trim()
          || !item.aggregateFinding.trim()
          || !item.limitations.trim()
        )
      ) {
        issues.push(`Complete the source, aggregate finding, and limitations for ${item.id}.`);
      }
    });
    if (document.jointDisplays.length === 0) {
      issues.push("Create at least one mixed-methods joint display.");
    }
    document.jointDisplays.forEach((display) => {
      if (
        display.relationship === "not-reviewed"
        || !display.integratedInterpretation.trim()
        || !display.metaInference.trim()
        || !display.limitations.trim()
        || !display.reviewed
      ) {
        issues.push(`Complete and review joint display ${display.id}.`);
      }
    });
    if (issues.length > 0) return { status: "needs-integration", issues };
  }

  if (!document.overallConclusion.trim()) issues.push("Record the overall qualitative or integrated conclusion.");
  if (!document.remainingLimitations.trim()) issues.push("Record remaining limitations and transferability boundaries.");
  if (!document.reviewedAt || issues.length > 0) {
    return { status: "needs-review", issues };
  }
  if (!document.exportedAt) {
    return {
      status: "needs-export",
      issues: ["Export the reviewed qualitative analysis package."],
    };
  }
  return { status: "ready", issues: [] };
}

export function createQualitativeAnalysisDocument(
  projectId: string,
  createdAt = new Date().toISOString(),
): QualitativeAnalysisDocument {
  if (!safeId(projectId) || !safeTimestamp(createdAt)) {
    throw new Error("A valid project and timestamp are required.");
  }
  const draft = {
    schemaVersion: QUALITATIVE_ANALYSIS_SCHEMA_VERSION,
    projectId,
    createdAt,
    updatedAt: createdAt,
    mode: "not-selected" as const,
    notApplicableRationale: "",
    studyQuestion: "",
    inquiryApproach: "",
    researcherPositioning: "",
    analysisProcedure: "",
    integrationDesign: "not-selected" as const,
    integrationRationale: "",
    sources: [],
    codes: [],
    codebookVersions: [],
    segments: [],
    memos: [],
    themes: [],
    quantitativeEvidence: [],
    jointDisplays: [],
    triangulationRecords: [],
    overallConclusion: "",
    remainingLimitations: "",
    reviewedAt: "",
    exportedAt: "",
    lastExportChecksum: "",
    transcriptRetention:
      "active-tab-only-source-text-never-persisted-uploaded-or-exported" as const,
    mediaBoundary:
      "reference-labels-only-no-media-import-playback-transcription-or-ai-access" as const,
    inferenceBoundary:
      "no-automatic-emotion-face-personality-or-behavioral-inference" as const,
    scientificClaim:
      "researcher-authored-qualitative-record-not-validity-consent-or-publication-certification" as const,
  };
  return { ...draft, readiness: collectQualitativeReadiness(draft) };
}

function parseSource(value: unknown): QualitativeSource | null {
  if (
    !isRecord(value)
    || !safeId(value.id)
    || typeof value.label !== "string"
    || typeof value.originalFilename !== "string"
    || !finiteNonNegativeInteger(value.byteLength)
    || !finiteNonNegativeInteger(value.characterCount)
    || value.byteLength > MAX_TRANSCRIPT_BYTES
    || value.characterCount > MAX_TRANSCRIPT_CHARACTERS
    || !safeChecksum(value.textChecksum)
    || !safeTimestamp(value.importedAt)
  ) return null;
  const fileType = parseEnum(value.fileType, FILE_TYPES);
  const consentScope = parseEnum(value.consentScope, CONSENT_SCOPES);
  if (!fileType || !consentScope) return null;
  return {
    id: value.id,
    label: cleanInline(value.label, 200),
    originalFilename: cleanInline(value.originalFilename, 240),
    fileType,
    byteLength: value.byteLength,
    characterCount: value.characterCount,
    textChecksum: value.textChecksum,
    mediaReference: cleanInline(value.mediaReference, 500),
    collectionContext: cleanText(value.collectionContext, 2_000),
    consentScope,
    importedAt: value.importedAt,
  };
}

function parseCode(value: unknown): QualitativeCode | null {
  if (
    !isRecord(value)
    || !safeId(value.id)
    || typeof value.name !== "string"
    || typeof value.definition !== "string"
    || typeof value.inclusionCriteria !== "string"
    || typeof value.exclusionCriteria !== "string"
    || typeof value.color !== "string"
    || !SAFE_COLOR.test(value.color)
    || !safeTimestamp(value.createdAt)
    || !safeTimestamp(value.updatedAt)
  ) return null;
  const origin = parseEnum(value.origin, CODE_ORIGINS);
  if (!origin) return null;
  return {
    id: value.id,
    name: cleanInline(value.name, 160),
    definition: cleanText(value.definition, 2_000),
    inclusionCriteria: cleanText(value.inclusionCriteria, 2_000),
    exclusionCriteria: cleanText(value.exclusionCriteria, 2_000),
    origin,
    color: value.color.toLowerCase(),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function parseCodebookVersion(value: unknown): QualitativeCodebookVersion | null {
  if (
    !isRecord(value)
    || !finiteNonNegativeInteger(value.version)
    || value.version < 1
    || !safeTimestamp(value.createdAt)
    || typeof value.rationale !== "string"
    || !Array.isArray(value.codes)
    || value.codes.length > MAX_QUALITATIVE_CODES
    || !safeChecksum(value.codesChecksum)
  ) return null;
  const codes = value.codes.map(parseCode);
  if (codes.some((code) => !code)) return null;
  return {
    version: value.version,
    createdAt: value.createdAt,
    rationale: cleanText(value.rationale, 2_000),
    codes: codes as QualitativeCode[],
    codesChecksum: value.codesChecksum,
  };
}

function parseSegment(value: unknown): QualitativeSegment | null {
  if (
    !isRecord(value)
    || !safeId(value.id)
    || !safeId(value.sourceId)
    || !finiteNonNegativeInteger(value.startOffset)
    || !finiteNonNegativeInteger(value.endOffset)
    || value.endOffset <= value.startOffset
    || !safeChecksum(value.selectedTextChecksum)
    || typeof value.mediaStart !== "string"
    || typeof value.mediaEnd !== "string"
    || typeof value.analyticNote !== "string"
    || typeof value.reportingExcerpt !== "string"
    || !safeTimestamp(value.createdAt)
    || !safeTimestamp(value.updatedAt)
  ) return null;
  const codeIds = uniqueIds(value.codeIds, MAX_QUALITATIVE_CODES);
  const quotationUse = parseEnum(value.quotationUse, QUOTATION_USES);
  const redactionStatus = parseEnum(value.redactionStatus, REDACTION_STATUSES);
  if (!codeIds || !quotationUse || !redactionStatus) return null;
  return {
    id: value.id,
    sourceId: value.sourceId,
    startOffset: value.startOffset,
    endOffset: value.endOffset,
    selectedTextChecksum: value.selectedTextChecksum,
    codeIds,
    mediaStart: cleanInline(value.mediaStart, 40),
    mediaEnd: cleanInline(value.mediaEnd, 40),
    analyticNote: cleanText(value.analyticNote, 4_000),
    quotationUse,
    redactionStatus,
    reportingExcerpt: cleanText(value.reportingExcerpt, MAX_REPORTING_EXCERPT),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function parseMemo(value: unknown): QualitativeMemo | null {
  if (
    !isRecord(value)
    || !safeId(value.id)
    || typeof value.sourceId !== "string"
    || typeof value.segmentId !== "string"
    || typeof value.themeId !== "string"
    || typeof value.title !== "string"
    || typeof value.body !== "string"
    || !safeTimestamp(value.createdAt)
    || !safeTimestamp(value.updatedAt)
  ) return null;
  const scope = parseEnum(value.scope, MEMO_SCOPES);
  if (!scope) return null;
  return {
    id: value.id,
    scope,
    sourceId: safeId(value.sourceId) ? value.sourceId : "",
    segmentId: safeId(value.segmentId) ? value.segmentId : "",
    themeId: safeId(value.themeId) ? value.themeId : "",
    title: cleanInline(value.title, 200),
    body: cleanText(value.body),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function parseTheme(value: unknown): QualitativeTheme | null {
  if (
    !isRecord(value)
    || !safeId(value.id)
    || typeof value.title !== "string"
    || typeof value.statement !== "string"
    || typeof value.boundary !== "string"
    || typeof value.negativeCaseReview !== "string"
    || !safeTimestamp(value.createdAt)
    || !safeTimestamp(value.updatedAt)
  ) return null;
  const codeIds = uniqueIds(value.codeIds, MAX_QUALITATIVE_CODES);
  const supportingSegmentIds = uniqueIds(value.supportingSegmentIds, MAX_QUALITATIVE_SEGMENTS);
  const negativeCaseSegmentIds = uniqueIds(value.negativeCaseSegmentIds, MAX_QUALITATIVE_SEGMENTS);
  if (!codeIds || !supportingSegmentIds || !negativeCaseSegmentIds) return null;
  return {
    id: value.id,
    title: cleanInline(value.title, 240),
    statement: cleanText(value.statement),
    boundary: cleanText(value.boundary, 4_000),
    codeIds,
    supportingSegmentIds,
    negativeCaseSegmentIds,
    negativeCaseReview: cleanText(value.negativeCaseReview, 4_000),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function parseQuantitativeEvidence(value: unknown): QuantitativeEvidenceReference | null {
  if (
    !isRecord(value)
    || !safeId(value.id)
    || typeof value.label !== "string"
    || typeof value.sourceReference !== "string"
    || typeof value.aggregateFinding !== "string"
    || typeof value.limitations !== "string"
    || typeof value.researcherVerified !== "boolean"
  ) return null;
  return {
    id: value.id,
    label: cleanInline(value.label, 240),
    sourceReference: cleanText(value.sourceReference, 2_000),
    aggregateFinding: cleanText(value.aggregateFinding, 4_000),
    limitations: cleanText(value.limitations, 4_000),
    researcherVerified: value.researcherVerified,
  };
}

function parseJointDisplay(value: unknown): MixedMethodsJointDisplay | null {
  if (
    !isRecord(value)
    || !safeId(value.id)
    || !safeId(value.themeId)
    || !safeId(value.quantitativeEvidenceId)
    || typeof value.integratedInterpretation !== "string"
    || typeof value.metaInference !== "string"
    || typeof value.limitations !== "string"
    || typeof value.reviewed !== "boolean"
  ) return null;
  const relationship = parseEnum(value.relationship, RELATIONSHIPS);
  if (!relationship) return null;
  return {
    id: value.id,
    themeId: value.themeId,
    quantitativeEvidenceId: value.quantitativeEvidenceId,
    relationship,
    integratedInterpretation: cleanText(value.integratedInterpretation),
    metaInference: cleanText(value.metaInference),
    limitations: cleanText(value.limitations, 4_000),
    reviewed: value.reviewed,
  };
}

function parseTriangulation(value: unknown): QualitativeTriangulationRecord | null {
  if (
    !isRecord(value)
    || !safeId(value.id)
    || typeof value.title !== "string"
    || typeof value.convergentEvidence !== "string"
    || typeof value.contradictoryEvidence !== "string"
    || typeof value.resolution !== "string"
    || typeof value.limitations !== "string"
    || typeof value.reviewed !== "boolean"
  ) return null;
  const kind = parseEnum(value.kind, TRIANGULATION_KINDS);
  const sourceIds = uniqueIds(value.sourceIds, MAX_QUALITATIVE_SOURCES);
  const themeIds = uniqueIds(value.themeIds, MAX_QUALITATIVE_THEMES);
  if (!kind || !sourceIds || !themeIds) return null;
  return {
    id: value.id,
    kind,
    title: cleanInline(value.title, 240),
    sourceIds,
    themeIds,
    convergentEvidence: cleanText(value.convergentEvidence, 4_000),
    contradictoryEvidence: cleanText(value.contradictoryEvidence, 4_000),
    resolution: cleanText(value.resolution, 4_000),
    limitations: cleanText(value.limitations, 4_000),
    reviewed: value.reviewed,
  };
}

function allUnique<T>(items: T[], key: (item: T) => string | number): boolean {
  return new Set(items.map(key)).size === items.length;
}

export function normalizeQualitativeAnalysisDocument(
  value: unknown,
  projectId: string,
): QualitativeAnalysisDocument | null {
  if (
    safeJsonByteLength(value) > MAX_QUALITATIVE_DOCUMENT_BYTES
    || !isRecord(value)
    || value.schemaVersion !== QUALITATIVE_ANALYSIS_SCHEMA_VERSION
    || value.projectId !== projectId
    || !safeTimestamp(value.createdAt)
    || !safeTimestamp(value.updatedAt)
    || (value.reviewedAt !== "" && !safeTimestamp(value.reviewedAt))
    || (value.exportedAt !== "" && !safeTimestamp(value.exportedAt))
    || (value.lastExportChecksum !== "" && !safeChecksum(value.lastExportChecksum))
    || !Array.isArray(value.sources)
    || value.sources.length > MAX_QUALITATIVE_SOURCES
    || !Array.isArray(value.codes)
    || value.codes.length > MAX_QUALITATIVE_CODES
    || !Array.isArray(value.codebookVersions)
    || value.codebookVersions.length > MAX_CODEBOOK_VERSIONS
    || !Array.isArray(value.segments)
    || value.segments.length > MAX_QUALITATIVE_SEGMENTS
    || !Array.isArray(value.memos)
    || value.memos.length > MAX_QUALITATIVE_MEMOS
    || !Array.isArray(value.themes)
    || value.themes.length > MAX_QUALITATIVE_THEMES
    || !Array.isArray(value.quantitativeEvidence)
    || value.quantitativeEvidence.length > MAX_QUANTITATIVE_EVIDENCE
    || !Array.isArray(value.jointDisplays)
    || value.jointDisplays.length > MAX_JOINT_DISPLAYS
    || !Array.isArray(value.triangulationRecords)
    || value.triangulationRecords.length > MAX_TRIANGULATION_RECORDS
    || value.transcriptRetention
      !== "active-tab-only-source-text-never-persisted-uploaded-or-exported"
    || value.mediaBoundary
      !== "reference-labels-only-no-media-import-playback-transcription-or-ai-access"
    || value.inferenceBoundary
      !== "no-automatic-emotion-face-personality-or-behavioral-inference"
    || value.scientificClaim
      !== "researcher-authored-qualitative-record-not-validity-consent-or-publication-certification"
  ) return null;
  const mode = parseEnum(value.mode, MODES);
  const integrationDesign = parseEnum(value.integrationDesign, MIXED_DESIGNS);
  if (!mode || !integrationDesign) return null;
  const sources = value.sources.map(parseSource);
  const codes = value.codes.map(parseCode);
  const versions = value.codebookVersions.map(parseCodebookVersion);
  const segments = value.segments.map(parseSegment);
  const memos = value.memos.map(parseMemo);
  const themes = value.themes.map(parseTheme);
  const quantitativeEvidence = value.quantitativeEvidence.map(parseQuantitativeEvidence);
  const jointDisplays = value.jointDisplays.map(parseJointDisplay);
  const triangulationRecords = value.triangulationRecords.map(parseTriangulation);
  if (
    sources.some((item) => !item)
    || codes.some((item) => !item)
    || versions.some((item) => !item)
    || segments.some((item) => !item)
    || memos.some((item) => !item)
    || themes.some((item) => !item)
    || quantitativeEvidence.some((item) => !item)
    || jointDisplays.some((item) => !item)
    || triangulationRecords.some((item) => !item)
  ) return null;
  const normalizedSources = sources as QualitativeSource[];
  const normalizedCodes = codes as QualitativeCode[];
  const normalizedVersions = versions as QualitativeCodebookVersion[];
  const normalizedSegments = segments as QualitativeSegment[];
  const normalizedMemos = memos as QualitativeMemo[];
  const normalizedThemes = themes as QualitativeTheme[];
  const normalizedQuantitativeEvidence =
    quantitativeEvidence as QuantitativeEvidenceReference[];
  const normalizedJointDisplays = jointDisplays as MixedMethodsJointDisplay[];
  const normalizedTriangulation =
    triangulationRecords as QualitativeTriangulationRecord[];
  if (
    !allUnique(normalizedSources, (item) => item.id)
    || !allUnique(normalizedCodes, (item) => item.id)
    || !allUnique(normalizedVersions, (item) => item.version)
    || !allUnique(normalizedSegments, (item) => item.id)
    || !allUnique(normalizedMemos, (item) => item.id)
    || !allUnique(normalizedThemes, (item) => item.id)
    || !allUnique(normalizedQuantitativeEvidence, (item) => item.id)
    || !allUnique(normalizedJointDisplays, (item) => item.id)
    || !allUnique(normalizedTriangulation, (item) => item.id)
  ) return null;
  const sourceIds = new Set(normalizedSources.map((item) => item.id));
  const codeIds = new Set(normalizedCodes.map((item) => item.id));
  const segmentIds = new Set(normalizedSegments.map((item) => item.id));
  const themeIds = new Set(normalizedThemes.map((item) => item.id));
  const evidenceIds = new Set(normalizedQuantitativeEvidence.map((item) => item.id));
  if (
    normalizedSegments.some((item) => (
      !sourceIds.has(item.sourceId)
      || item.endOffset > (
        normalizedSources.find((source) => source.id === item.sourceId)?.characterCount ?? 0
      )
      || item.codeIds.some((id) => !codeIds.has(id))
    ))
    || normalizedMemos.some((item) => (
      (item.sourceId && !sourceIds.has(item.sourceId))
      || (item.segmentId && !segmentIds.has(item.segmentId))
      || (item.themeId && !themeIds.has(item.themeId))
    ))
    || normalizedThemes.some((item) => (
      item.codeIds.some((id) => !codeIds.has(id))
      || item.supportingSegmentIds.some((id) => !segmentIds.has(id))
      || item.negativeCaseSegmentIds.some((id) => !segmentIds.has(id))
    ))
    || normalizedJointDisplays.some((item) => (
      !themeIds.has(item.themeId) || !evidenceIds.has(item.quantitativeEvidenceId)
    ))
    || normalizedTriangulation.some((item) => (
      item.sourceIds.some((id) => !sourceIds.has(id))
      || item.themeIds.some((id) => !themeIds.has(id))
    ))
  ) return null;
  for (let index = 0; index < normalizedVersions.length; index += 1) {
    if (
      normalizedVersions[index].version !== index + 1
      || !allUnique(normalizedVersions[index].codes, (item) => item.id)
    ) return null;
  }
  const normalizedBase = {
    schemaVersion: QUALITATIVE_ANALYSIS_SCHEMA_VERSION,
    projectId,
    createdAt: value.createdAt as string,
    updatedAt: value.updatedAt as string,
    mode,
    notApplicableRationale: cleanText(value.notApplicableRationale, 4_000),
    studyQuestion: cleanText(value.studyQuestion, 4_000),
    inquiryApproach: cleanText(value.inquiryApproach, 4_000),
    researcherPositioning: cleanText(value.researcherPositioning),
    analysisProcedure: cleanText(value.analysisProcedure),
    integrationDesign,
    integrationRationale: cleanText(value.integrationRationale, 4_000),
    sources: normalizedSources,
    codes: normalizedCodes,
    codebookVersions: normalizedVersions,
    segments: normalizedSegments,
    memos: normalizedMemos,
    themes: normalizedThemes,
    quantitativeEvidence: normalizedQuantitativeEvidence,
    jointDisplays: normalizedJointDisplays,
    triangulationRecords: normalizedTriangulation,
    overallConclusion: cleanText(value.overallConclusion),
    remainingLimitations: cleanText(value.remainingLimitations),
    reviewedAt: value.reviewedAt as string,
    exportedAt: value.exportedAt as string,
    lastExportChecksum: value.lastExportChecksum as string,
    transcriptRetention:
      "active-tab-only-source-text-never-persisted-uploaded-or-exported" as const,
    mediaBoundary:
      "reference-labels-only-no-media-import-playback-transcription-or-ai-access" as const,
    inferenceBoundary:
      "no-automatic-emotion-face-personality-or-behavioral-inference" as const,
    scientificClaim:
      "researcher-authored-qualitative-record-not-validity-consent-or-publication-certification" as const,
  };
  const readiness = collectQualitativeReadiness(normalizedBase);
  if (
    readiness.status === "ready"
    && (!normalizedBase.exportedAt || !normalizedBase.lastExportChecksum)
  ) return null;
  return { ...normalizedBase, readiness };
}

export function updateQualitativeAnalysisDocument(
  document: QualitativeAnalysisDocument,
  changes: Partial<Omit<
    QualitativeAnalysisDocument,
    | "schemaVersion"
    | "projectId"
    | "createdAt"
    | "updatedAt"
    | "reviewedAt"
    | "exportedAt"
    | "lastExportChecksum"
    | "readiness"
    | "transcriptRetention"
    | "mediaBoundary"
    | "inferenceBoundary"
    | "scientificClaim"
  >>,
  updatedAt = new Date().toISOString(),
): QualitativeAnalysisDocument {
  const candidate = normalizeQualitativeAnalysisDocument({
    ...document,
    ...changes,
    updatedAt,
    reviewedAt: "",
    exportedAt: "",
    lastExportChecksum: "",
  }, document.projectId);
  if (!candidate) throw new Error("The qualitative analysis change could not be saved.");
  return candidate;
}

export async function createLoadedQualitativeSource(
  filename: string,
  text: string,
  existingSourceIds: readonly string[] = [],
  importedAt = new Date().toISOString(),
): Promise<LoadedQualitativeSource> {
  const originalFilename = cleanInline(filename, 240);
  const extension = originalFilename.split(".").at(-1)?.toLowerCase() ?? "";
  if (!parseEnum(extension, FILE_TYPES)) {
    throw new Error("Select a UTF-8 .txt, .md, .srt, or .vtt transcript.");
  }
  if (!safeTimestamp(importedAt) || text.includes("\u0000")) {
    throw new Error("The transcript is not valid bounded UTF-8 text.");
  }
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (
    byteLength === 0
    || byteLength > MAX_TRANSCRIPT_BYTES
    || text.length > MAX_TRANSCRIPT_CHARACTERS
  ) {
    throw new Error("The transcript is empty or exceeds the 5 MB local import limit.");
  }
  const textChecksum = await sha256Checksum(text);
  const baseId = `source-${textChecksum.slice(7, 19)}`;
  let id = baseId;
  let suffix = 2;
  while (existingSourceIds.includes(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  const label = originalFilename.replace(/\.[^.]+$/, "") || `Transcript ${existingSourceIds.length + 1}`;
  return {
    source: {
      id,
      label: cleanInline(label, 200),
      originalFilename,
      fileType: extension as QualitativeSource["fileType"],
      byteLength,
      characterCount: text.length,
      textChecksum,
      mediaReference: "",
      collectionContext: "",
      consentScope: "not-reviewed",
      importedAt,
    },
    text,
  };
}

export async function verifyLoadedQualitativeSource(
  loaded: LoadedQualitativeSource,
  expected: QualitativeSource,
): Promise<boolean> {
  return loaded.source.id === expected.id
    && loaded.text.length === expected.characterCount
    && new TextEncoder().encode(loaded.text).byteLength === expected.byteLength
    && await sha256Checksum(loaded.text) === expected.textChecksum;
}

export async function createQualitativeSegment(
  source: LoadedQualitativeSource,
  startOffset: number,
  endOffset: number,
  existingSegmentIds: readonly string[] = [],
  createdAt = new Date().toISOString(),
): Promise<QualitativeSegment> {
  if (
    !finiteNonNegativeInteger(startOffset)
    || !finiteNonNegativeInteger(endOffset)
    || endOffset <= startOffset
    || endOffset > source.text.length
    || !safeTimestamp(createdAt)
  ) throw new Error("Select a non-empty transcript segment first.");
  const selectedTextChecksum = await sha256Checksum(
    source.text.slice(startOffset, endOffset),
  );
  const baseId = `segment-${selectedTextChecksum.slice(7, 19)}`;
  let id = baseId;
  let suffix = 2;
  while (existingSegmentIds.includes(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  return {
    id,
    sourceId: source.source.id,
    startOffset,
    endOffset,
    selectedTextChecksum,
    codeIds: [],
    mediaStart: "",
    mediaEnd: "",
    analyticNote: "",
    quotationUse: "not-reviewed",
    redactionStatus: "not-reviewed",
    reportingExcerpt: "",
    createdAt,
    updatedAt: createdAt,
  };
}

export async function freezeQualitativeCodebook(
  document: QualitativeAnalysisDocument,
  rationale: string,
  createdAt = new Date().toISOString(),
): Promise<QualitativeAnalysisDocument> {
  if (
    document.codes.length === 0
    || !cleanText(rationale, 2_000)
    || !safeTimestamp(createdAt)
    || document.codebookVersions.length >= MAX_CODEBOOK_VERSIONS
  ) throw new Error("Create defined codes and record a version rationale first.");
  const codes = document.codes.map((code) => ({ ...code }));
  const version: QualitativeCodebookVersion = {
    version: document.codebookVersions.length + 1,
    createdAt,
    rationale: cleanText(rationale, 2_000),
    codes,
    codesChecksum: await sha256Checksum(codes),
  };
  return updateQualitativeAnalysisDocument(
    document,
    { codebookVersions: [...document.codebookVersions, version] },
    createdAt,
  );
}

export function buildQualitativeCodeSourceMatrix(
  document: Pick<QualitativeAnalysisDocument, "codes" | "sources" | "segments">,
): QualitativeCodeSourceMatrixRow[] {
  return document.codes.map((code) => {
    const sourceCounts = document.sources.map((source) => ({
      sourceId: source.id,
      sourceLabel: source.label,
      segmentCount: document.segments.filter(
        (segment) => segment.sourceId === source.id && segment.codeIds.includes(code.id),
      ).length,
    }));
    return {
      codeId: code.id,
      codeName: code.name,
      sourceCounts,
      totalSegments: sourceCounts.reduce((sum, item) => sum + item.segmentCount, 0),
    };
  });
}

export function markQualitativeAnalysisReviewed(
  document: QualitativeAnalysisDocument,
  reviewedAt = new Date().toISOString(),
): QualitativeAnalysisDocument {
  const normalized = normalizeQualitativeAnalysisDocument(document, document.projectId);
  if (
    !normalized
    || normalized.readiness.status !== "needs-review"
    || normalized.readiness.issues.length > 0
    || !safeTimestamp(reviewedAt)
  ) throw new Error("Resolve every qualitative analysis review item before confirmation.");
  const candidate = normalizeQualitativeAnalysisDocument({
    ...normalized,
    updatedAt: reviewedAt,
    reviewedAt,
    exportedAt: "",
    lastExportChecksum: "",
  }, document.projectId);
  if (!candidate || candidate.readiness.status !== "needs-export") {
    throw new Error("The qualitative analysis review could not be confirmed.");
  }
  return candidate;
}

async function buildQualitativePackage(
  document: QualitativeAnalysisDocument,
  exportedAt: string,
): Promise<QualitativeAnalysisPackage> {
  if (document.mode === "not-selected") {
    throw new Error("Choose a qualitative-lane scope before export.");
  }
  const sourceCatalog = document.sources;
  const codebook = {
    currentCodes: document.codes,
    versions: document.codebookVersions,
  };
  const analysis = {
    segments: document.segments,
    memos: document.memos,
    themes: document.themes,
    codeBySourceMatrix: buildQualitativeCodeSourceMatrix(document),
    triangulationRecords: document.triangulationRecords,
  };
  const integration = {
    quantitativeEvidence: document.quantitativeEvidence,
    jointDisplays: document.jointDisplays,
  };
  const sourceCatalogChecksum = await sha256Checksum(sourceCatalog);
  const codebookLedgerChecksum = await sha256Checksum(codebook);
  const analysisLedgerChecksum = await sha256Checksum(analysis);
  const integrationLedgerChecksum = await sha256Checksum(integration);
  const unsigned = {
    packageVersion: QUALITATIVE_ANALYSIS_PACKAGE_VERSION,
    projectId: document.projectId,
    createdAt: exportedAt,
    reviewedAt: document.reviewedAt,
    mode: document.mode,
    scope: {
      notApplicableRationale: document.notApplicableRationale,
      studyQuestion: document.studyQuestion,
      inquiryApproach: document.inquiryApproach,
      researcherPositioning: document.researcherPositioning,
      analysisProcedure: document.analysisProcedure,
      integrationDesign: document.integrationDesign,
      integrationRationale: document.integrationRationale,
    },
    sourceCatalog,
    codebook,
    analysis,
    integration,
    conclusions: {
      overallConclusion: document.overallConclusion,
      remainingLimitations: document.remainingLimitations,
    },
    boundaries: {
      rawTranscriptTextIncluded: false as const,
      rawMediaIncluded: false as const,
      automaticTranscriptionUsed: false as const,
      automaticInferenceUsed: false as const,
      directQuotationRequiresConsentAndRedactionReview: true as const,
      quantitativeStatisticsExecuted: false as const,
    },
    integrity: {
      sourceCatalogChecksum,
      codebookLedgerChecksum,
      analysisLedgerChecksum,
      integrationLedgerChecksum,
    },
    dataClassification:
      "local-qualitative-analysis-metadata-and-researcher-approved-excerpts-potentially-identifiable" as const,
    scientificBoundary:
      "audit-ready-researcher-authored-record-not-methodological-integrity-consent-or-publication-certification" as const,
  };
  return {
    ...unsigned,
    integrity: {
      ...unsigned.integrity,
      packageChecksum: await sha256Checksum(unsigned),
    },
  };
}

export async function buildQualitativeAnalysisExport(
  document: QualitativeAnalysisDocument,
  exportedAt = new Date().toISOString(),
): Promise<{
  document: QualitativeAnalysisDocument;
  export: QualitativeAnalysisExport;
}> {
  const normalized = normalizeQualitativeAnalysisDocument(document, document.projectId);
  if (
    !normalized
    || normalized.readiness.status !== "needs-export"
    || !safeTimestamp(exportedAt)
  ) throw new Error("Confirm the complete qualitative analysis before export.");
  const packageRecord = await buildQualitativePackage(normalized, exportedAt);
  const exportRecord: QualitativeAnalysisExport = {
    exportType: QUALITATIVE_ANALYSIS_EXPORT_TYPE,
    exportBoundary: QUALITATIVE_ANALYSIS_EXPORT_BOUNDARY,
    exportedAt,
    package: packageRecord,
  };
  if (safeJsonByteLength(exportRecord) > MAX_QUALITATIVE_EXPORT_BYTES) {
    throw new Error("The qualitative analysis package exceeds the 4 MB export limit.");
  }
  const next = normalizeQualitativeAnalysisDocument({
    ...normalized,
    updatedAt: exportedAt,
    exportedAt,
    lastExportChecksum: packageRecord.integrity.packageChecksum,
  }, normalized.projectId);
  if (!next || next.readiness.status !== "ready") {
    throw new Error("The qualitative analysis export receipt could not be recorded.");
  }
  return { document: next, export: exportRecord };
}

export async function verifyQualitativeAnalysisExport(
  value: unknown,
  projectId: string,
): Promise<QualitativeAnalysisPackage> {
  if (
    safeJsonByteLength(value) > MAX_QUALITATIVE_EXPORT_BYTES
    || !isRecord(value)
    || value.exportType !== QUALITATIVE_ANALYSIS_EXPORT_TYPE
    || value.exportBoundary !== QUALITATIVE_ANALYSIS_EXPORT_BOUNDARY
    || !safeTimestamp(value.exportedAt)
    || !isRecord(value.package)
  ) throw new Error("Select a valid exported Phase 8.9 qualitative analysis package.");
  const packageRecord = value.package as unknown as QualitativeAnalysisPackage;
  if (
    packageRecord.packageVersion !== QUALITATIVE_ANALYSIS_PACKAGE_VERSION
    || packageRecord.projectId !== projectId
    || packageRecord.createdAt !== value.exportedAt
    || !isRecord(packageRecord.boundaries)
    || packageRecord.boundaries.rawTranscriptTextIncluded !== false
    || packageRecord.boundaries.rawMediaIncluded !== false
    || packageRecord.boundaries.automaticTranscriptionUsed !== false
    || packageRecord.boundaries.automaticInferenceUsed !== false
    || !isRecord(packageRecord.integrity)
    || !isRecord(packageRecord.scope)
    || !isRecord(packageRecord.conclusions)
    || !Array.isArray(packageRecord.sourceCatalog)
    || !isRecord(packageRecord.codebook)
    || !isRecord(packageRecord.analysis)
    || !isRecord(packageRecord.integration)
  ) throw new Error("The qualitative analysis package boundary is invalid.");
  const sourceChecksum = await sha256Checksum(packageRecord.sourceCatalog);
  const codebookChecksum = await sha256Checksum(packageRecord.codebook);
  const analysisChecksum = await sha256Checksum(packageRecord.analysis);
  const integrationChecksum = await sha256Checksum(packageRecord.integration);
  const normalizedDocument = normalizeQualitativeAnalysisDocument({
    schemaVersion: QUALITATIVE_ANALYSIS_SCHEMA_VERSION,
    projectId,
    createdAt: packageRecord.createdAt,
    updatedAt: packageRecord.createdAt,
    mode: packageRecord.mode,
    notApplicableRationale: packageRecord.scope.notApplicableRationale,
    studyQuestion: packageRecord.scope.studyQuestion,
    inquiryApproach: packageRecord.scope.inquiryApproach,
    researcherPositioning: packageRecord.scope.researcherPositioning,
    analysisProcedure: packageRecord.scope.analysisProcedure,
    integrationDesign: packageRecord.scope.integrationDesign,
    integrationRationale: packageRecord.scope.integrationRationale,
    sources: packageRecord.sourceCatalog,
    codes: packageRecord.codebook.currentCodes,
    codebookVersions: packageRecord.codebook.versions,
    segments: packageRecord.analysis.segments,
    memos: packageRecord.analysis.memos,
    themes: packageRecord.analysis.themes,
    quantitativeEvidence: packageRecord.integration.quantitativeEvidence,
    jointDisplays: packageRecord.integration.jointDisplays,
    triangulationRecords: packageRecord.analysis.triangulationRecords,
    overallConclusion: packageRecord.conclusions.overallConclusion,
    remainingLimitations: packageRecord.conclusions.remainingLimitations,
    reviewedAt: packageRecord.reviewedAt,
    exportedAt: packageRecord.createdAt,
    lastExportChecksum: packageRecord.integrity.packageChecksum,
    transcriptRetention:
      "active-tab-only-source-text-never-persisted-uploaded-or-exported",
    mediaBoundary:
      "reference-labels-only-no-media-import-playback-transcription-or-ai-access",
    inferenceBoundary:
      "no-automatic-emotion-face-personality-or-behavioral-inference",
    scientificClaim:
      "researcher-authored-qualitative-record-not-validity-consent-or-publication-certification",
  }, projectId);
  for (const version of packageRecord.codebook.versions) {
    if (await sha256Checksum(version.codes) !== version.codesChecksum) {
      throw new Error("The qualitative codebook version checksum has changed.");
    }
  }
  const { packageChecksum, ...integrityWithoutPackage } = packageRecord.integrity;
  const unsigned = {
    ...packageRecord,
    integrity: integrityWithoutPackage,
  };
  if (
    sourceChecksum !== packageRecord.integrity.sourceCatalogChecksum
    || codebookChecksum !== packageRecord.integrity.codebookLedgerChecksum
    || analysisChecksum !== packageRecord.integrity.analysisLedgerChecksum
    || integrationChecksum !== packageRecord.integrity.integrationLedgerChecksum
    || !normalizedDocument
    || normalizedDocument.readiness.status !== "ready"
    || await sha256Checksum(unsigned) !== packageChecksum
    || canonicalJson(packageRecord).includes("\"text\":")
    || canonicalJson(packageRecord).includes("\"transcript\":")
  ) throw new Error("The qualitative analysis package or an integrity checksum has changed.");
  return packageRecord;
}

export function qualitativeAnalysisStorageKey(projectId: string): string {
  return `cerise-qualitative-analysis:${projectId}:v${QUALITATIVE_ANALYSIS_SCHEMA_VERSION}`;
}

export function readQualitativeAnalysisDocument(
  storage: StorageLike,
  projectId: string,
): QualitativeAnalysisDocument | null {
  const stored = storage.getItem(qualitativeAnalysisStorageKey(projectId));
  if (!stored || new TextEncoder().encode(stored).byteLength > MAX_QUALITATIVE_DOCUMENT_BYTES) {
    return null;
  }
  try {
    return normalizeQualitativeAnalysisDocument(JSON.parse(stored), projectId);
  } catch {
    return null;
  }
}

export function writeQualitativeAnalysisDocument(
  storage: StorageLike,
  document: QualitativeAnalysisDocument,
): QualitativeAnalysisDocument {
  const normalized = normalizeQualitativeAnalysisDocument(document, document.projectId);
  if (!normalized) throw new Error("The qualitative analysis document was not saved.");
  storage.setItem(qualitativeAnalysisStorageKey(document.projectId), JSON.stringify(normalized));
  return normalized;
}

export function isQualitativeAnalysisReady(
  document: QualitativeAnalysisDocument | null,
): boolean {
  return Boolean(document && document.readiness.status === "ready");
}
