import {
  collectExperimentVariables,
  EXPERIMENT_STUDIO_SCHEMA_VERSION,
  MAX_EXPERIMENT_BLOCKS,
  MAX_EXPERIMENT_BRANCH_RULES,
  MAX_EXPERIMENT_CONDITIONS,
  MAX_EXPERIMENT_SPEC_BYTES,
  MAX_EXPERIMENT_TRIAL_COLUMNS,
  MAX_EXPERIMENT_TRIAL_ROWS,
  MAX_EXPERIMENT_TRIAL_TABLES,
  normalizeExperimentStudioDocument,
  validateExperimentStudio,
  type ExperimentStudioDocument,
} from "./experimentStudio";
import {
  ANALYSIS_CONTRACT_SCHEMA_VERSION,
  createAnalysisContract,
  normalizeAnalysisContract,
  type AnalysisContract,
} from "./analysisContract";
import type { StudyDesignDocument } from "./studyDesign";

export const EXPERIMENT_RELEASE_FORMAT_VERSION = 5 as const;
export const MAX_EXPERIMENT_RELEASE_NOTES_LENGTH = 2_000;
export type ExperimentReleaseFormatVersion = 1 | 2 | 3 | 4 | typeof EXPERIMENT_RELEASE_FORMAT_VERSION;

export type ExperimentReleaseValidationLevel = "blocking" | "warning" | "advisory";

export interface ExperimentReleaseValidationIssue {
  id: string;
  level: ExperimentReleaseValidationLevel;
  category: "flow" | "research" | "privacy" | "accessibility" | "execution" | "data";
  message: string;
  blockId?: string;
}

export interface ExperimentReleaseValidationSummary {
  blocking: number;
  warning: number;
  advisory: number;
}

export interface ExperimentReleaseReviewAttestations {
  draftRehearsed: boolean;
  consentWithdrawalTested: boolean;
  conditionAndVariableReview: boolean;
  pilotDataPlanConfirmed: boolean;
}

export interface ExperimentReleaseReview extends ExperimentReleaseReviewAttestations {
  reviewedAt: string;
}

export interface ExperimentReleaseManifest {
  formatVersion: ExperimentReleaseFormatVersion;
  studySchemaVersion: number;
  blockCount: number;
  variableCount: number;
  conditionCount: number;
  trialTableCount: number;
  trialRowCount: number;
  timingClaim: "browser-measured";
  timingDiagnostic?: {
    diagnosticId: string;
    engineVersion: string;
    recordedAt: string;
    status: "stable" | "review" | "interrupted";
  } | null;
  participantDataBoundary: "local-only";
  audioResponseCount?: number;
  videoResponseCount?: number;
  containsSensitiveMedia?: boolean;
  audioCaptureBoundary?: "localhost-only" | null;
  videoCaptureBoundary?: "localhost-only" | null;
  analysisContractSchemaVersion?: typeof ANALYSIS_CONTRACT_SCHEMA_VERSION;
  analysisContractChecksum?: string;
  analysisContract?: AnalysisContract;
  review: ExperimentReleaseReview;
  validationSummary: ExperimentReleaseValidationSummary;
  validationIssues: ExperimentReleaseValidationIssue[];
}

export interface ExperimentRelease {
  releaseId: string;
  projectId: string;
  releaseNumber: number;
  createdAt: string;
  releaseNotes: string;
  checksum: string;
  manifest: ExperimentReleaseManifest;
  studio: ExperimentStudioDocument;
}

export interface CreateExperimentReleaseInput {
  releaseId: string;
  releaseNumber: number;
  createdAt: string;
  releaseNotes: string;
  studio: ExperimentStudioDocument;
  review: ExperimentReleaseReviewAttestations;
  studyDesign?: StudyDesignDocument | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function frozenStudioShapeIsSafe(
  value: Record<string, unknown>,
  projectId: string,
  studySchemaVersion: number,
): boolean {
  if (
    value.projectId !== projectId
    || value.schemaVersion !== studySchemaVersion
    || !Number.isInteger(studySchemaVersion)
    || studySchemaVersion < 1
    || studySchemaVersion > EXPERIMENT_STUDIO_SCHEMA_VERSION
    || typeof value.title !== "string"
    || typeof value.updatedAt !== "string"
    || !Array.isArray(value.blocks)
    || value.blocks.length > MAX_EXPERIMENT_BLOCKS
    || !Array.isArray(value.conditions)
    || value.conditions.length > MAX_EXPERIMENT_CONDITIONS
    || !Array.isArray(value.branchRules)
    || value.branchRules.length > MAX_EXPERIMENT_BRANCH_RULES
    || !isRecord(value.assignment)
    || !isRecord(value.execution)
    || !Array.isArray(value.trialTables)
    || value.trialTables.length > MAX_EXPERIMENT_TRIAL_TABLES
    || (value.timingDiagnostic !== null
      && value.timingDiagnostic !== undefined
      && !isRecord(value.timingDiagnostic))
  ) return false;

  if (
    !value.blocks.every(isRecord)
    || !value.conditions.every(isRecord)
    || !value.branchRules.every(isRecord)
  ) return false;

  for (const table of value.trialTables) {
    if (
      !isRecord(table)
      || !Array.isArray(table.columns)
      || table.columns.length > MAX_EXPERIMENT_TRIAL_COLUMNS
      || !table.columns.every((column) => typeof column === "string")
      || !Array.isArray(table.rows)
      || table.rows.length > MAX_EXPERIMENT_TRIAL_ROWS
      || !table.rows.every((row) => (
        Array.isArray(row)
        && row.length <= MAX_EXPERIMENT_TRIAL_COLUMNS
        && row.every((cell) => typeof cell === "string")
      ))
    ) return false;
  }

  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength <= MAX_EXPERIMENT_SPEC_BYTES;
  } catch {
    return false;
  }
}

function compareIssues(
  left: ExperimentReleaseValidationIssue,
  right: ExperimentReleaseValidationIssue,
): number {
  const order: Record<ExperimentReleaseValidationLevel, number> = {
    blocking: 0,
    warning: 1,
    advisory: 2,
  };
  return order[left.level] - order[right.level] || left.id.localeCompare(right.id);
}

function reachableBlockIds(document: ExperimentStudioDocument): Set<string> {
  const reachable = new Set<string>();
  const pending = document.blocks[0] ? [document.blocks[0].id] : [];
  while (pending.length > 0) {
    const blockId = pending.pop();
    if (!blockId || reachable.has(blockId)) continue;
    reachable.add(blockId);
    const index = document.blocks.findIndex((block) => block.id === blockId);
    const block = document.blocks[index];
    if (!block) continue;
    const targets = [
      block.nextBlockId || document.blocks[index + 1]?.id || "__end__",
      ...document.branchRules
        .filter((rule) => rule.sourceBlockId === blockId)
        .map((rule) => rule.targetBlockId),
    ];
    for (const target of targets) {
      if (target && target !== "__end__" && !reachable.has(target)) pending.push(target);
    }
  }
  return reachable;
}

export function collectExperimentReleaseValidation(
  document: ExperimentStudioDocument,
): ExperimentReleaseValidationIssue[] {
  const issues: ExperimentReleaseValidationIssue[] = validateExperimentStudio(document).map((issue) => ({
    id: issue.id,
    level: issue.severity === "error" ? "blocking" : "warning",
    category: issue.id.includes("variable") ? "data" : "flow",
    message: issue.message,
    ...(issue.blockId ? { blockId: issue.blockId } : {}),
  }));

  const reachable = reachableBlockIds(document);
  for (const block of document.blocks) {
    if (!reachable.has(block.id)) {
      issues.push({
        id: `unreachable-${block.id}`,
        level: "warning",
        category: "flow",
        blockId: block.id,
        message: `${block.title} cannot be reached from the first participant screen.`,
      });
    }
    if (block.media && !block.media.altText.trim()) {
      issues.push({
        id: `missing-alt-${block.id}`,
        level: "warning",
        category: "accessibility",
        blockId: block.id,
        message: `${block.title} needs neutral alternative text for its image.`,
      });
    }
  }

  if (document.assignment.method === "random" && document.conditions.length > 1) {
    const weights = document.conditions.map((condition) => condition.weight);
    const minimum = Math.min(...weights);
    const maximum = Math.max(...weights);
    if (minimum > 0 && maximum / minimum >= 4) {
      issues.push({
        id: "allocation-imbalance",
        level: "warning",
        category: "research",
        message: "Condition allocation is highly unequal. Confirm that the ratio is intentional and analysis-ready.",
      });
    }
  }

  if (!document.blocks.some((block) => block.required && block.responseType !== "none")) {
    issues.push({
      id: "no-required-response",
      level: "advisory",
      category: "data",
      message: "No participant response is required. Review the missing-data implications before release.",
    });
  }
  if (!document.blocks.some((block) => block.responseDeadlineMs > 0 || block.displayDurationMs > 0)) {
    issues.push({
      id: "no-timed-blocks",
      level: "advisory",
      category: "execution",
      message: "This release uses untimed screens. That is suitable for many surveys but should be intentional for behavioral tasks.",
    });
  }
  const hasBehavioralTiming = document.blocks.some((block) => (
    block.responseType === "keyboard"
    || block.responseDeadlineMs > 0
    || block.displayDurationMs > 0
    || block.type === "trial-loop"
  ));
  if (hasBehavioralTiming && !document.timingDiagnostic) {
    issues.push({
      id: "timing-diagnostic-missing",
      level: "advisory",
      category: "execution",
      message: "Run the browser timing diagnostic on a representative device and repeat it for every planned browser and device class.",
    });
  } else if (hasBehavioralTiming && document.timingDiagnostic?.status !== "stable") {
    issues.push({
      id: "timing-diagnostic-review",
      level: "warning",
      category: "execution",
      message: document.timingDiagnostic?.status === "interrupted"
        ? "The selected timing diagnostic was interrupted. Repeat it with the tab visible and focused."
        : "The selected timing diagnostic crossed an engineering review threshold. Review the detailed local report before release.",
    });
  }
  if (hasBehavioralTiming && document.execution.allowBackNavigation) {
    issues.push({
      id: "timed-task-back-navigation",
      level: "warning",
      category: "research",
      message: "Back navigation is enabled in a timed behavioral flow. Confirm that revisiting trials cannot invalidate exposure or reaction-time measures.",
    });
  }
  if (document.blocks.some((block) => block.responseType === "keyboard" && !block.practice)) {
    issues.push({
      id: "keyboard-task-no-practice",
      level: "advisory",
      category: "research",
      message: "At least one scored keyboard task has no practice trial. Review whether participants need a non-production rehearsal.",
    });
  }
  if (
    document.assignment.method === "random"
    && document.conditions.length > 1
    && !document.blocks.some((block) => block.type === "attention-check")
  ) {
    issues.push({
      id: "condition-check-review",
      level: "advisory",
      category: "research",
      message: "This study assigns multiple conditions but has no explicit attention-check block. Decide whether an attention or manipulation check is theoretically appropriate.",
    });
  }
  if (document.execution.requireFullscreen) {
    issues.push({
      id: "fullscreen-accessibility-review",
      level: "warning",
      category: "accessibility",
      message: "Fullscreen is requested. Test keyboard escape, assistive technology behavior, and the participant fallback when fullscreen is denied.",
    });
  }
  const audioBlocks = document.blocks.filter((block) => block.type === "audio-response");
  if (audioBlocks.length > 0) {
    issues.push({
      id: "audio-sensitive-media",
      level: "warning",
      category: "privacy",
      message: "Raw voice recordings can identify participants and may contain sensitive information. Confirm approved consent, access control, retention, and deletion procedures.",
    });
    issues.push({
      id: "audio-localhost-only",
      level: "warning",
      category: "execution",
      message: "Audio responses run only on the same Mac through the native Local Research Host. Trusted-LAN and portable HTML execution are blocked for audio collection.",
    });
    issues.push({
      id: "audio-device-pilot",
      level: "advisory",
      category: "research",
      message: "Pilot microphone permission, browser codec, input level, duration limits, and withdrawal deletion on every planned Mac and browser configuration.",
    });
    issues.push({
      id: "audio-measurement-limit",
      level: "advisory",
      category: "execution",
      message: "Audio capture is not calibrated acoustic measurement and does not provide certified recording-onset or audio-latency timing.",
    });
  }
  const videoBlocks = document.blocks.filter((block) => block.type === "video-response");
  if (videoBlocks.length > 0) {
    issues.push({
      id: "video-sensitive-media",
      level: "warning",
      category: "privacy",
      message: "Raw camera recordings can identify participants, surroundings, and bystanders. Confirm approved consent, framing guidance, access control, retention, and deletion procedures.",
    });
    issues.push({
      id: "video-localhost-only",
      level: "warning",
      category: "execution",
      message: "Video responses run only on the same Mac through the native Local Research Host. Trusted-LAN and portable HTML execution are blocked for video collection.",
    });
    issues.push({
      id: "video-device-pilot",
      level: "advisory",
      category: "research",
      message: "Pilot camera permission, browser codec, framing, duration and storage limits, and withdrawal deletion on every planned Mac and browser configuration.",
    });
    issues.push({
      id: "video-measurement-limit",
      level: "advisory",
      category: "execution",
      message: "Video capture is not biometric, clinical, eye-tracking, or calibrated behavioral measurement and does not provide certified recording-onset timing.",
    });
  }
  issues.push({
    id: "browser-timing-claim",
    level: "advisory",
    category: "execution",
    message: "Timing is browser-measured and must not be described as certified millisecond precision.",
  });
  issues.push({
    id: "device-rehearsal",
    level: "advisory",
    category: "accessibility",
    message: "Rehearse the frozen release on every browser and device class planned for data collection.",
  });

  const deduplicated = new Map<string, ExperimentReleaseValidationIssue>();
  for (const issue of issues) deduplicated.set(issue.id, issue);
  return [...deduplicated.values()].sort(compareIssues);
}

export function summarizeExperimentReleaseValidation(
  issues: readonly ExperimentReleaseValidationIssue[],
): ExperimentReleaseValidationSummary {
  return issues.reduce<ExperimentReleaseValidationSummary>((summary, issue) => {
    summary[issue.level] += 1;
    return summary;
  }, { blocking: 0, warning: 0, advisory: 0 });
}

export function canFreezeExperimentRelease(document: ExperimentStudioDocument): boolean {
  return !collectExperimentReleaseValidation(document).some((issue) => issue.level === "blocking");
}

export function experimentReleaseReviewComplete(review: ExperimentReleaseReviewAttestations): boolean {
  return review.draftRehearsed
    && review.consentWithdrawalTested
    && review.conditionAndVariableReview
    && review.pilotDataPlanConfirmed;
}

export function createCompletedExperimentReleaseReview(): ExperimentReleaseReviewAttestations {
  return {
    draftRehearsed: true,
    consentWithdrawalTested: true,
    conditionAndVariableReview: true,
    pilotDataPlanConfirmed: true,
  };
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

export async function sha256Checksum(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

export function experimentReleasePayload(
  input: CreateExperimentReleaseInput,
  analysisContract: AnalysisContract,
  analysisContractChecksum: string,
) {
  const issues = collectExperimentReleaseValidation(input.studio);
  const audioResponseCount = input.studio.blocks.filter((block) => block.type === "audio-response").length;
  const videoResponseCount = input.studio.blocks.filter((block) => block.type === "video-response").length;
  return {
    releaseId: input.releaseId,
    projectId: input.studio.projectId,
    releaseNumber: input.releaseNumber,
    createdAt: input.createdAt,
    releaseNotes: input.releaseNotes.trim().slice(0, MAX_EXPERIMENT_RELEASE_NOTES_LENGTH),
    manifest: {
      formatVersion: EXPERIMENT_RELEASE_FORMAT_VERSION,
      studySchemaVersion: input.studio.schemaVersion,
      blockCount: input.studio.blocks.length,
      variableCount: collectExperimentVariables(input.studio).length,
      conditionCount: input.studio.conditions.length,
      trialTableCount: input.studio.trialTables.length,
      trialRowCount: input.studio.trialTables.reduce((sum, table) => sum + table.rows.length, 0),
      timingClaim: "browser-measured" as const,
      timingDiagnostic: input.studio.timingDiagnostic ? {
        diagnosticId: input.studio.timingDiagnostic.diagnosticId,
        engineVersion: input.studio.timingDiagnostic.engineVersion,
        recordedAt: input.studio.timingDiagnostic.recordedAt,
        status: input.studio.timingDiagnostic.status,
      } : null,
      participantDataBoundary: "local-only" as const,
      audioResponseCount,
      videoResponseCount,
      containsSensitiveMedia: audioResponseCount > 0 || videoResponseCount > 0,
      audioCaptureBoundary: audioResponseCount > 0 ? "localhost-only" as const : null,
      videoCaptureBoundary: videoResponseCount > 0 ? "localhost-only" as const : null,
      analysisContractSchemaVersion: ANALYSIS_CONTRACT_SCHEMA_VERSION,
      analysisContractChecksum,
      analysisContract,
      review: { ...input.review, reviewedAt: input.createdAt },
      validationSummary: summarizeExperimentReleaseValidation(issues),
      validationIssues: issues,
    },
    studio: input.studio,
  };
}

export async function createExperimentRelease(
  input: CreateExperimentReleaseInput,
): Promise<ExperimentRelease> {
  const studio = normalizeExperimentStudioDocument(input.studio, input.studio.projectId);
  if (!canFreezeExperimentRelease(studio)) {
    throw new Error("Resolve blocking validation issues before creating a release.");
  }
  if (!Number.isInteger(input.releaseNumber) || input.releaseNumber < 1) {
    throw new Error("A release number must be a positive integer.");
  }
  if (!experimentReleaseReviewComplete(input.review)) {
    throw new Error("Complete the release review checklist before creating a release.");
  }
  const analysisContract = createAnalysisContract(studio, input.studyDesign, input.createdAt);
  const analysisContractChecksum = await sha256Checksum(analysisContract);
  const payload = experimentReleasePayload(
    { ...input, studio },
    analysisContract,
    analysisContractChecksum,
  );
  return { ...payload, checksum: await sha256Checksum(payload) };
}

export async function verifyExperimentRelease(release: ExperimentRelease): Promise<boolean> {
  const { checksum, ...payload } = release;
  if (!/^sha256:[a-f0-9]{64}$/.test(checksum) || await sha256Checksum(payload) !== checksum) return false;
  if (release.manifest.formatVersion >= 5) {
    const contract = release.manifest.analysisContract;
    const contractChecksum = release.manifest.analysisContractChecksum;
    if (
      !contract
      || typeof contractChecksum !== "string"
      || !/^sha256:[a-f0-9]{64}$/.test(contractChecksum)
      || await sha256Checksum(contract) !== contractChecksum
    ) return false;
  }
  return true;
}

export function normalizeExperimentRelease(value: unknown): ExperimentRelease | null {
  if (!isRecord(value) || !isRecord(value.manifest) || !isRecord(value.studio)) return null;
  const releaseId = typeof value.releaseId === "string" && value.releaseId.length <= 100 ? value.releaseId : "";
  const projectId = typeof value.projectId === "string" && value.projectId.length <= 100 ? value.projectId : "";
  const releaseNumber = typeof value.releaseNumber === "number" && Number.isInteger(value.releaseNumber)
    ? value.releaseNumber
    : 0;
  const createdAt = typeof value.createdAt === "string" && value.createdAt.length <= 40 ? value.createdAt : "";
  const checksum = typeof value.checksum === "string" ? value.checksum : "";
  const releaseNotes = typeof value.releaseNotes === "string"
    && value.releaseNotes.length <= MAX_EXPERIMENT_RELEASE_NOTES_LENGTH
    ? value.releaseNotes
    : null;
  if (!releaseId || !projectId || releaseNumber < 1 || !createdAt || !/^sha256:[a-f0-9]{64}$/.test(checksum)) return null;
  if (releaseNotes === null || value.studio.projectId !== projectId) return null;

  const formatVersion = value.manifest.formatVersion === 1
    ? 1
    : value.manifest.formatVersion === 2
      ? 2
      : value.manifest.formatVersion === 3
        ? 3
        : value.manifest.formatVersion === 4
          ? 4
          : value.manifest.formatVersion === EXPERIMENT_RELEASE_FORMAT_VERSION
            ? EXPERIMENT_RELEASE_FORMAT_VERSION
            : null;
  if (!formatVersion) return null;

  const nonNegativeInteger = (candidate: unknown): candidate is number => (
    typeof candidate === "number" && Number.isInteger(candidate) && candidate >= 0
  );
  if (
    !nonNegativeInteger(value.manifest.studySchemaVersion)
    || !nonNegativeInteger(value.manifest.blockCount)
    || !nonNegativeInteger(value.manifest.variableCount)
    || !nonNegativeInteger(value.manifest.conditionCount)
    || !nonNegativeInteger(value.manifest.trialTableCount)
    || !nonNegativeInteger(value.manifest.trialRowCount)
    || value.manifest.timingClaim !== "browser-measured"
    || value.manifest.participantDataBoundary !== "local-only"
  ) return null;
  if (!frozenStudioShapeIsSafe(value.studio, projectId, value.manifest.studySchemaVersion)) return null;

  let audioResponseCount = 0;
  let containsSensitiveMedia = false;
  let audioCaptureBoundary: ExperimentReleaseManifest["audioCaptureBoundary"] = null;
  if (formatVersion >= 3) {
    if (
      !nonNegativeInteger(value.manifest.audioResponseCount)
      || typeof value.manifest.containsSensitiveMedia !== "boolean"
      || (
        value.manifest.audioCaptureBoundary !== null
        && value.manifest.audioCaptureBoundary !== "localhost-only"
      )
    ) return null;
    audioResponseCount = value.manifest.audioResponseCount;
    containsSensitiveMedia = value.manifest.containsSensitiveMedia;
    audioCaptureBoundary = value.manifest.audioCaptureBoundary;
    const frozenAudioCount = (value.studio.blocks as Array<Record<string, unknown>>)
      .filter((block) => block.type === "audio-response").length;
    if (
      frozenAudioCount !== audioResponseCount
      || (
        formatVersion === 3
        && containsSensitiveMedia !== (audioResponseCount > 0)
      )
      || audioCaptureBoundary !== (audioResponseCount > 0 ? "localhost-only" : null)
    ) return null;
  }
  let videoResponseCount = 0;
  let videoCaptureBoundary: ExperimentReleaseManifest["videoCaptureBoundary"] = null;
  if (formatVersion >= 4) {
    if (
      !nonNegativeInteger(value.manifest.videoResponseCount)
      || (
        value.manifest.videoCaptureBoundary !== null
        && value.manifest.videoCaptureBoundary !== "localhost-only"
      )
    ) return null;
    videoResponseCount = value.manifest.videoResponseCount;
    videoCaptureBoundary = value.manifest.videoCaptureBoundary;
    const frozenVideoCount = (value.studio.blocks as Array<Record<string, unknown>>)
      .filter((block) => block.type === "video-response").length;
    if (
      frozenVideoCount !== videoResponseCount
      || containsSensitiveMedia !== (audioResponseCount > 0 || videoResponseCount > 0)
      || videoCaptureBoundary !== (videoResponseCount > 0 ? "localhost-only" : null)
    ) return null;
  }

  let analysisContract: AnalysisContract | undefined;
  let analysisContractChecksum: string | undefined;
  if (formatVersion >= 5) {
    if (
      value.manifest.analysisContractSchemaVersion !== ANALYSIS_CONTRACT_SCHEMA_VERSION
      || typeof value.manifest.analysisContractChecksum !== "string"
      || !/^sha256:[a-f0-9]{64}$/.test(value.manifest.analysisContractChecksum)
    ) return null;
    analysisContract = normalizeAnalysisContract(value.manifest.analysisContract, projectId) ?? undefined;
    if (!analysisContract) return null;
    analysisContractChecksum = value.manifest.analysisContractChecksum;
  }

  const reviewValue = isRecord(value.manifest.review) ? value.manifest.review : {};
  if (
    typeof reviewValue.reviewedAt !== "string"
    || reviewValue.reviewedAt.length > 40
  ) return null;
  const review: ExperimentReleaseReview = {
    draftRehearsed: reviewValue.draftRehearsed === true,
    consentWithdrawalTested: reviewValue.consentWithdrawalTested === true,
    conditionAndVariableReview: reviewValue.conditionAndVariableReview === true,
    pilotDataPlanConfirmed: reviewValue.pilotDataPlanConfirmed === true,
    reviewedAt: reviewValue.reviewedAt,
  };

  const rawSummary = isRecord(value.manifest.validationSummary) ? value.manifest.validationSummary : {};
  if (
    !nonNegativeInteger(rawSummary.blocking)
    || !nonNegativeInteger(rawSummary.warning)
    || !nonNegativeInteger(rawSummary.advisory)
  ) return null;
  const validationSummary: ExperimentReleaseValidationSummary = {
    blocking: rawSummary.blocking,
    warning: rawSummary.warning,
    advisory: rawSummary.advisory,
  };

  const allowedLevels: readonly ExperimentReleaseValidationLevel[] = ["blocking", "warning", "advisory"];
  const allowedCategories: readonly ExperimentReleaseValidationIssue["category"][] = [
    "flow",
    "research",
    "privacy",
    "accessibility",
    "execution",
    "data",
  ];
  if (!Array.isArray(value.manifest.validationIssues) || value.manifest.validationIssues.length > 500) return null;
  const validationIssues: ExperimentReleaseValidationIssue[] = [];
  for (const candidate of value.manifest.validationIssues) {
    if (
      !isRecord(candidate)
      || typeof candidate.id !== "string"
      || candidate.id.length > 200
      || typeof candidate.level !== "string"
      || !allowedLevels.includes(candidate.level as ExperimentReleaseValidationLevel)
      || typeof candidate.category !== "string"
      || !allowedCategories.includes(candidate.category as ExperimentReleaseValidationIssue["category"])
      || typeof candidate.message !== "string"
      || candidate.message.length > 2_000
      || (candidate.blockId !== undefined && (typeof candidate.blockId !== "string" || candidate.blockId.length > 100))
    ) return null;
    validationIssues.push({
      id: candidate.id,
      level: candidate.level as ExperimentReleaseValidationLevel,
      category: candidate.category as ExperimentReleaseValidationIssue["category"],
      message: candidate.message,
      ...(typeof candidate.blockId === "string" ? { blockId: candidate.blockId } : {}),
    });
  }

  const hasTimingDiagnostic = Object.prototype.hasOwnProperty.call(value.manifest, "timingDiagnostic");
  if (formatVersion >= 2 && !hasTimingDiagnostic) return null;
  let timingDiagnostic: ExperimentReleaseManifest["timingDiagnostic"];
  if (value.manifest.timingDiagnostic === null || value.manifest.timingDiagnostic === undefined) {
    timingDiagnostic = null;
  } else if (
    isRecord(value.manifest.timingDiagnostic)
    && typeof value.manifest.timingDiagnostic.diagnosticId === "string"
    && value.manifest.timingDiagnostic.diagnosticId.length <= 100
    && typeof value.manifest.timingDiagnostic.engineVersion === "string"
    && value.manifest.timingDiagnostic.engineVersion.length <= 100
    && typeof value.manifest.timingDiagnostic.recordedAt === "string"
    && value.manifest.timingDiagnostic.recordedAt.length <= 40
    && (
      value.manifest.timingDiagnostic.status === "stable"
      || value.manifest.timingDiagnostic.status === "review"
      || value.manifest.timingDiagnostic.status === "interrupted"
    )
  ) {
    timingDiagnostic = {
      diagnosticId: value.manifest.timingDiagnostic.diagnosticId,
      engineVersion: value.manifest.timingDiagnostic.engineVersion,
      recordedAt: value.manifest.timingDiagnostic.recordedAt,
      status: value.manifest.timingDiagnostic.status,
    };
  } else {
    return null;
  }

  const studio = value.studio as unknown as ExperimentStudioDocument;
  return {
    releaseId,
    projectId,
    releaseNumber,
    createdAt,
    releaseNotes,
    checksum,
    manifest: {
      formatVersion,
      studySchemaVersion: value.manifest.studySchemaVersion,
      blockCount: value.manifest.blockCount,
      variableCount: value.manifest.variableCount,
      conditionCount: value.manifest.conditionCount,
      trialTableCount: value.manifest.trialTableCount,
      trialRowCount: value.manifest.trialRowCount,
      timingClaim: "browser-measured",
      ...(formatVersion === EXPERIMENT_RELEASE_FORMAT_VERSION || hasTimingDiagnostic
        ? { timingDiagnostic }
        : {}),
      participantDataBoundary: "local-only",
      ...(formatVersion >= 3
        ? {
            audioResponseCount,
            containsSensitiveMedia,
            audioCaptureBoundary,
          }
        : {}),
      ...(formatVersion >= 4
        ? {
            videoResponseCount,
            videoCaptureBoundary,
          }
        : {}),
      ...(formatVersion >= 5 && analysisContract && analysisContractChecksum
        ? {
            analysisContractSchemaVersion: ANALYSIS_CONTRACT_SCHEMA_VERSION,
            analysisContractChecksum,
            analysisContract,
          }
        : {}),
      review,
      validationSummary,
      validationIssues,
    },
    studio,
  };
}
