import type { ResearchArtifactChecksum } from "./artifactIdentity";
import {
  normalizeResearchPathwayDocument,
  type ResearchPathwayDocument,
} from "./researchPathwayDocument";

export const RESEARCH_PATHWAY_CACHE_VERSION = 1 as const;

export interface ResearchPathwayCacheDocument {
  version: typeof RESEARCH_PATHWAY_CACHE_VERSION;
  projectId: string;
  document: ResearchPathwayDocument;
  lastSyncedChecksum: ResearchArtifactChecksum | null;
  dirty: boolean;
  cachedAt: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function researchPathwayCacheKey(projectId: string): string {
  return `cerise-canonical-pathway:${projectId}:v${RESEARCH_PATHWAY_CACHE_VERSION}`;
}

export async function readResearchPathwayCache(
  storage: StorageLike,
  projectId: string,
): Promise<ResearchPathwayCacheDocument | null> {
  const raw = storage.getItem(researchPathwayCacheKey(projectId));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      value.version !== RESEARCH_PATHWAY_CACHE_VERSION
      || value.projectId !== projectId
      || typeof value.dirty !== "boolean"
      || typeof value.cachedAt !== "string"
      || !Number.isFinite(Date.parse(value.cachedAt))
      || (value.lastSyncedChecksum !== null && (typeof value.lastSyncedChecksum !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value.lastSyncedChecksum)))
    ) return null;
    const document = await normalizeResearchPathwayDocument(value.document, projectId);
    if (!document) return null;
    return {
      version: RESEARCH_PATHWAY_CACHE_VERSION,
      projectId,
      document,
      lastSyncedChecksum: value.lastSyncedChecksum as ResearchArtifactChecksum | null,
      dirty: value.dirty,
      cachedAt: new Date(value.cachedAt).toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeResearchPathwayCache(
  storage: StorageLike,
  input: {
    document: ResearchPathwayDocument;
    lastSyncedChecksum: ResearchArtifactChecksum | null;
    dirty: boolean;
    cachedAt?: string;
  },
): void {
  storage.setItem(researchPathwayCacheKey(input.document.projectId), JSON.stringify({
    version: RESEARCH_PATHWAY_CACHE_VERSION,
    projectId: input.document.projectId,
    document: input.document,
    lastSyncedChecksum: input.lastSyncedChecksum,
    dirty: input.dirty,
    cachedAt: input.cachedAt ?? new Date().toISOString(),
  } satisfies ResearchPathwayCacheDocument));
}
