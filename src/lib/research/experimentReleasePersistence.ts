import {
  normalizeExperimentRelease,
  verifyExperimentRelease,
  type ExperimentRelease,
  type ExperimentReleaseReviewAttestations,
} from "./experimentRelease";

const EXPERIMENT_RELEASE_STORAGE_VERSION = 1;
const MAX_LOCAL_RELEASES = 20;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function experimentReleaseStorageKey(projectId: string): string {
  return `cerise-experiment-releases:${projectId}:v${EXPERIMENT_RELEASE_STORAGE_VERSION}`;
}

export function readLocalExperimentReleases(
  storage: StorageLike,
  projectId: string,
): ExperimentRelease[] {
  const stored = storage.getItem(experimentReleaseStorageKey(projectId));
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((candidate) => normalizeExperimentRelease(candidate))
      .filter((candidate): candidate is ExperimentRelease => Boolean(candidate))
      .filter((release) => release.projectId === projectId)
      .sort((left, right) => right.releaseNumber - left.releaseNumber)
      .slice(0, MAX_LOCAL_RELEASES);
  } catch {
    return [];
  }
}

export function writeLocalExperimentRelease(
  storage: StorageLike,
  release: ExperimentRelease,
): ExperimentRelease[] {
  const current = readLocalExperimentReleases(storage, release.projectId);
  const next = [release, ...current.filter((item) => item.releaseId !== release.releaseId)]
    .sort((left, right) => right.releaseNumber - left.releaseNumber)
    .slice(0, MAX_LOCAL_RELEASES);
  storage.setItem(experimentReleaseStorageKey(release.projectId), JSON.stringify(next));
  return next;
}

export async function verifiedExperimentReleases(
  releases: readonly ExperimentRelease[],
  projectId: string,
): Promise<ExperimentRelease[]> {
  const checks = await Promise.all(releases.map(async (release) => (
    release.projectId === projectId && await verifyExperimentRelease(release) ? release : null
  )));
  return checks.filter((release): release is ExperimentRelease => Boolean(release));
}

export async function fetchExperimentReleases(projectId: string): Promise<ExperimentRelease[]> {
  const response = await fetch(`/api/experimental-studio/releases?projectId=${encodeURIComponent(projectId)}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("Cloud releases are unavailable.");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !Array.isArray((body as { releases?: unknown }).releases)) return [];
  const releases = (body as { releases: unknown[] }).releases
    .map((candidate) => normalizeExperimentRelease(candidate))
    .filter((candidate): candidate is ExperimentRelease => Boolean(candidate))
    .filter((release) => release.projectId === projectId);
  return verifiedExperimentReleases(releases, projectId);
}

export async function persistExperimentRelease(
  projectId: string,
  releaseNotes: string,
  studio: ExperimentRelease["studio"],
  review: ExperimentReleaseReviewAttestations,
): Promise<ExperimentRelease> {
  const response = await fetch("/api/experimental-studio/releases", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, releaseNotes, studio, review }),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
      ? (body as { error: string }).error
      : "The release could not be saved securely.";
    throw new Error(message);
  }
  const release = body && typeof body === "object"
    ? normalizeExperimentRelease((body as { release?: unknown }).release)
    : null;
  if (!release || !await verifyExperimentRelease(release)) {
    throw new Error("The release response failed its integrity check.");
  }
  return release;
}
