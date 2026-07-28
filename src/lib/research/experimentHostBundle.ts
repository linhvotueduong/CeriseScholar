import {
  normalizeExperimentRelease,
  sha256Checksum,
  verifyExperimentRelease,
  type ExperimentRelease,
} from "./experimentRelease";
import {
  buildExperimentRunnerPackage,
  EXPERIMENT_RUNNER_PACKAGE_VERSION,
  experimentRunnerFilename,
} from "./experimentRunnerPackage";
import { collectExperimentVariables } from "./experimentStudio";

export const EXPERIMENT_HOST_BUNDLE_FORMAT = "cerise-local-research-host" as const;
export const EXPERIMENT_HOST_BUNDLE_VERSION = 5 as const;
export const MAX_EXPERIMENT_HOST_BUNDLE_BYTES = 8 * 1024 * 1024;
export const MAX_EXPERIMENT_AUDIO_CHUNK_BYTES = 1024 * 1024;
export const MAX_EXPERIMENT_VIDEO_CHUNK_BYTES = 2 * 1024 * 1024;

export type ExperimentHostExecutionMode = "pilot" | "production";

export interface ExperimentHostCodebook {
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  timingClaim: "browser-measured";
  analysisContract: {
    schemaVersion: number;
    checksum: string;
    readinessStatus: "ready" | "needs-planning";
    warningCount: number;
    researchQuestionIds: string[];
  };
  variables: ReturnType<typeof collectExperimentVariables>;
  trialTables: Array<{
    id: string;
    name: string;
    sourceFilename: string;
    sourceChecksum: string;
    columns: string[];
    rowCount: number;
  }>;
  audioResponses: Array<{
    blockId: string;
    variableName: string;
    consentBlockId: string;
    maxDurationSeconds: number;
    maxBytes: number;
  }>;
  videoResponses: Array<{
    blockId: string;
    variableName: string;
    consentBlockId: string;
    includeAudio: boolean;
    audioConsentBlockId: string;
    maxDurationSeconds: number;
    maxBytes: number;
    cameraFacing: "user" | "environment";
  }>;
}
export interface ExperimentHostBundlePayload {
  bundleFormat: typeof EXPERIMENT_HOST_BUNDLE_FORMAT;
  bundleVersion: typeof EXPERIMENT_HOST_BUNDLE_VERSION;
  createdAt: string;
  executionMode: ExperimentHostExecutionMode;
  participantResponsesIncluded: false;
  release: ExperimentRelease;
  runner: {
    packageVersion: typeof EXPERIMENT_RUNNER_PACKAGE_VERSION;
    checkpointEndpoint: "/api/checkpoints";
    audioEndpoint: "/api/audio" | null;
    videoEndpoint: "/api/video" | null;
    html: string;
  };
  codebook: ExperimentHostCodebook;
  dataPolicy: {
    participantResponses: "local-only";
    localDatabase: "sqlite";
    cloudUpload: false;
    mediaDirectoryPrepared: true;
    audioResponses: "local-only";
    audioExecutionBoundary: "localhost-only";
    audioMaxChunkBytes: typeof MAX_EXPERIMENT_AUDIO_CHUNK_BYTES;
    videoResponses: "local-only";
    videoExecutionBoundary: "localhost-only";
    videoMaxChunkBytes: typeof MAX_EXPERIMENT_VIDEO_CHUNK_BYTES;
    pilotDataIsolation: "separate-mode-exports";
    productionLaunchGate: "local-preflight-and-rehearsal";
  };
}

export interface ExperimentHostBundle extends ExperimentHostBundlePayload {
  bundleChecksum: string;
}

export interface BuiltExperimentHostBundle {
  filename: string;
  content: string;
  mimeType: "application/vnd.cerise.local-host+json;charset=utf-8";
  bundle: ExperimentHostBundle;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function bundleFilename(title: string, releaseNumber: number): string {
  return experimentRunnerFilename(`${title}-release-${releaseNumber}-local-host`)
    .replace(/\.html$/i, ".cerisehost");
}

function hostCodebook(release: ExperimentRelease): ExperimentHostCodebook {
  const analysisContract = release.manifest.analysisContract;
  const analysisContractChecksum = release.manifest.analysisContractChecksum;
  if (!analysisContract || !analysisContractChecksum) {
    throw new Error("A Phase 8 analysis contract is required for new Local Research Host bundles.");
  }
  return {
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    timingClaim: "browser-measured",
    analysisContract: {
      schemaVersion: analysisContract.schemaVersion,
      checksum: analysisContractChecksum,
      readinessStatus: analysisContract.readiness.status,
      warningCount: analysisContract.readiness.warningCount,
      researchQuestionIds: analysisContract.researchQuestions.map((question) => question.id),
    },
    variables: collectExperimentVariables(release.studio),
    trialTables: release.studio.trialTables.map((table) => ({
      id: table.id,
      name: table.name,
      sourceFilename: table.sourceFilename,
      sourceChecksum: table.sourceChecksum,
      columns: [...table.columns],
      rowCount: table.rows.length,
    })),
    audioResponses: release.studio.blocks.flatMap((block) => (
      block.type === "audio-response" && block.audio
        ? [{
            blockId: block.id,
            variableName: block.variableName,
            consentBlockId: block.audio.consentBlockId,
            maxDurationSeconds: block.audio.maxDurationSeconds,
            maxBytes: block.audio.maxBytes,
          }]
        : []
    )),
    videoResponses: release.studio.blocks.flatMap((block) => (
      block.type === "video-response" && block.video
        ? [{
            blockId: block.id,
            variableName: block.variableName,
            consentBlockId: block.video.consentBlockId,
            includeAudio: block.video.includeAudio,
            audioConsentBlockId: block.video.audioConsentBlockId,
            maxDurationSeconds: block.video.maxDurationSeconds,
            maxBytes: block.video.maxBytes,
            cameraFacing: block.video.cameraFacing,
          }]
        : []
    )),
  };
}

export async function buildExperimentHostBundle(
  release: ExperimentRelease,
  options: { executionMode?: ExperimentHostExecutionMode; createdAt?: string } = {},
): Promise<BuiltExperimentHostBundle> {
  if (!await verifyExperimentRelease(release)) {
    throw new Error("The selected release failed its integrity check.");
  }
  const executionMode = options.executionMode ?? "pilot";
  const containsAudio = (release.manifest.audioResponseCount ?? 0) > 0;
  const containsVideo = (release.manifest.videoResponseCount ?? 0) > 0;
  const runner = buildExperimentRunnerPackage(release.studio, {
    release,
    executionMode,
    collectorCheckpointEndpoint: "/api/checkpoints",
    ...(containsAudio ? { collectorAudioEndpoint: "/api/audio" } : {}),
    ...(containsVideo ? { collectorVideoEndpoint: "/api/video" } : {}),
  });
  const payload: ExperimentHostBundlePayload = {
    bundleFormat: EXPERIMENT_HOST_BUNDLE_FORMAT,
    bundleVersion: EXPERIMENT_HOST_BUNDLE_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    executionMode,
    participantResponsesIncluded: false,
    release,
    runner: {
      packageVersion: EXPERIMENT_RUNNER_PACKAGE_VERSION,
      checkpointEndpoint: "/api/checkpoints",
      audioEndpoint: containsAudio ? "/api/audio" : null,
      videoEndpoint: containsVideo ? "/api/video" : null,
      html: runner.html,
    },
    codebook: hostCodebook(release),
    dataPolicy: {
      participantResponses: "local-only",
      localDatabase: "sqlite",
      cloudUpload: false,
      mediaDirectoryPrepared: true,
      audioResponses: "local-only",
      audioExecutionBoundary: "localhost-only",
      audioMaxChunkBytes: MAX_EXPERIMENT_AUDIO_CHUNK_BYTES,
      videoResponses: "local-only",
      videoExecutionBoundary: "localhost-only",
      videoMaxChunkBytes: MAX_EXPERIMENT_VIDEO_CHUNK_BYTES,
      pilotDataIsolation: "separate-mode-exports",
      productionLaunchGate: "local-preflight-and-rehearsal",
    },
  };
  const bundle: ExperimentHostBundle = {
    ...payload,
    bundleChecksum: await sha256Checksum(payload),
  };
  const content = JSON.stringify(bundle, null, 2);
  if (new TextEncoder().encode(content).byteLength > MAX_EXPERIMENT_HOST_BUNDLE_BYTES) {
    throw new Error("This Local Research Host bundle is too large. Reduce embedded study assets before exporting.");
  }
  return {
    filename: bundleFilename(release.studio.title, release.releaseNumber),
    content,
    mimeType: "application/vnd.cerise.local-host+json;charset=utf-8",
    bundle,
  };
}

export async function verifyExperimentHostBundle(value: unknown): Promise<ExperimentHostBundle | null> {
  if (!isRecord(value)) return null;
  if (
    value.bundleFormat !== EXPERIMENT_HOST_BUNDLE_FORMAT
    || value.bundleVersion !== EXPERIMENT_HOST_BUNDLE_VERSION
    || typeof value.createdAt !== "string"
    || value.createdAt.length > 40
    || (value.executionMode !== "pilot" && value.executionMode !== "production")
    || value.participantResponsesIncluded !== false
    || typeof value.bundleChecksum !== "string"
    || !/^sha256:[a-f0-9]{64}$/.test(value.bundleChecksum)
    || !isRecord(value.runner)
    || value.runner.packageVersion !== EXPERIMENT_RUNNER_PACKAGE_VERSION
    || value.runner.checkpointEndpoint !== "/api/checkpoints"
    || (value.runner.audioEndpoint !== null && value.runner.audioEndpoint !== "/api/audio")
    || (value.runner.videoEndpoint !== null && value.runner.videoEndpoint !== "/api/video")
    || typeof value.runner.html !== "string"
    || value.runner.html.length > MAX_EXPERIMENT_HOST_BUNDLE_BYTES
    || !isRecord(value.codebook)
    || !isRecord(value.dataPolicy)
    || value.dataPolicy.participantResponses !== "local-only"
    || value.dataPolicy.localDatabase !== "sqlite"
    || value.dataPolicy.cloudUpload !== false
    || value.dataPolicy.mediaDirectoryPrepared !== true
    || value.dataPolicy.audioResponses !== "local-only"
    || value.dataPolicy.audioExecutionBoundary !== "localhost-only"
    || value.dataPolicy.audioMaxChunkBytes !== MAX_EXPERIMENT_AUDIO_CHUNK_BYTES
    || value.dataPolicy.videoResponses !== "local-only"
    || value.dataPolicy.videoExecutionBoundary !== "localhost-only"
    || value.dataPolicy.videoMaxChunkBytes !== MAX_EXPERIMENT_VIDEO_CHUNK_BYTES
    || value.dataPolicy.pilotDataIsolation !== "separate-mode-exports"
    || value.dataPolicy.productionLaunchGate !== "local-preflight-and-rehearsal"
  ) return null;

  let encodedBytes: number;
  try {
    encodedBytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return null;
  }
  if (encodedBytes > MAX_EXPERIMENT_HOST_BUNDLE_BYTES) return null;

  const release = normalizeExperimentRelease(value.release);
  if (!release || !await verifyExperimentRelease(release)) return null;
  if (
    value.codebook.releaseId !== release.releaseId
    || value.codebook.releaseNumber !== release.releaseNumber
    || value.codebook.releaseChecksum !== release.checksum
    || value.codebook.timingClaim !== "browser-measured"
    || !isRecord(value.codebook.analysisContract)
    || !Array.isArray(value.codebook.variables)
    || !Array.isArray(value.codebook.trialTables)
    || !Array.isArray(value.codebook.audioResponses)
    || !Array.isArray(value.codebook.videoResponses)
  ) return null;
  const analysisContract = release.manifest.analysisContract;
  if (
    !analysisContract
    || value.codebook.analysisContract.schemaVersion !== analysisContract.schemaVersion
    || value.codebook.analysisContract.checksum !== release.manifest.analysisContractChecksum
    || value.codebook.analysisContract.readinessStatus !== analysisContract.readiness.status
    || value.codebook.analysisContract.warningCount !== analysisContract.readiness.warningCount
    || !Array.isArray(value.codebook.analysisContract.researchQuestionIds)
    || value.codebook.analysisContract.researchQuestionIds.length !== analysisContract.researchQuestions.length
    || value.codebook.analysisContract.researchQuestionIds.some((
      id: unknown,
      index: number,
    ) => id !== analysisContract.researchQuestions[index]?.id)
  ) return null;
  const audioResponseCount = release.manifest.audioResponseCount ?? 0;
  const containsAudio = audioResponseCount > 0;
  if (
    value.runner.audioEndpoint !== (containsAudio ? "/api/audio" : null)
    || value.codebook.audioResponses.length !== audioResponseCount
    || (containsAudio && !value.runner.html.includes("/api/audio"))
  ) return null;
  const videoResponseCount = release.manifest.videoResponseCount ?? 0;
  const containsVideo = videoResponseCount > 0;
  if (
    value.runner.videoEndpoint !== (containsVideo ? "/api/video" : null)
    || value.codebook.videoResponses.length !== videoResponseCount
    || (containsVideo && !value.runner.html.includes("/api/video"))
  ) return null;

  const { bundleChecksum, ...payload } = value;
  if (await sha256Checksum(payload) !== bundleChecksum) return null;
  return value as unknown as ExperimentHostBundle;
}
