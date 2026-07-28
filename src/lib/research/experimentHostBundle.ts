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
export const EXPERIMENT_HOST_BUNDLE_VERSION = 1 as const;
export const MAX_EXPERIMENT_HOST_BUNDLE_BYTES = 8 * 1024 * 1024;

export type ExperimentHostExecutionMode = "pilot" | "production";

export interface ExperimentHostCodebook {
  releaseId: string;
  releaseNumber: number;
  releaseChecksum: string;
  timingClaim: "browser-measured";
  variables: ReturnType<typeof collectExperimentVariables>;
  trialTables: Array<{
    id: string;
    name: string;
    sourceFilename: string;
    sourceChecksum: string;
    columns: string[];
    rowCount: number;
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
    html: string;
  };
  codebook: ExperimentHostCodebook;
  dataPolicy: {
    participantResponses: "local-only";
    localDatabase: "sqlite";
    cloudUpload: false;
    mediaDirectoryPrepared: true;
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
  return {
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    timingClaim: "browser-measured",
    variables: collectExperimentVariables(release.studio),
    trialTables: release.studio.trialTables.map((table) => ({
      id: table.id,
      name: table.name,
      sourceFilename: table.sourceFilename,
      sourceChecksum: table.sourceChecksum,
      columns: [...table.columns],
      rowCount: table.rows.length,
    })),
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
  const runner = buildExperimentRunnerPackage(release.studio, {
    release,
    executionMode,
    collectorCheckpointEndpoint: "/api/checkpoints",
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
      html: runner.html,
    },
    codebook: hostCodebook(release),
    dataPolicy: {
      participantResponses: "local-only",
      localDatabase: "sqlite",
      cloudUpload: false,
      mediaDirectoryPrepared: true,
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
    || typeof value.runner.html !== "string"
    || value.runner.html.length > MAX_EXPERIMENT_HOST_BUNDLE_BYTES
    || !isRecord(value.codebook)
    || !isRecord(value.dataPolicy)
    || value.dataPolicy.participantResponses !== "local-only"
    || value.dataPolicy.localDatabase !== "sqlite"
    || value.dataPolicy.cloudUpload !== false
    || value.dataPolicy.mediaDirectoryPrepared !== true
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
    || !Array.isArray(value.codebook.variables)
    || !Array.isArray(value.codebook.trialTables)
  ) return null;

  const { bundleChecksum, ...payload } = value;
  if (await sha256Checksum(payload) !== bundleChecksum) return null;
  return value as unknown as ExperimentHostBundle;
}
