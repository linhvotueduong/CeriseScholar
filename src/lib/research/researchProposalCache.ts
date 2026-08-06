import type { ResearchArtifactChecksum } from "./artifactIdentity";
import {
  normalizeResearchProposalDocument,
  type ResearchProposalDocument,
} from "./researchProposalDocument";

export const RESEARCH_PROPOSAL_CACHE_VERSION = 1 as const;

export interface ResearchProposalCacheEnvelope {
  version: typeof RESEARCH_PROPOSAL_CACHE_VERSION;
  projectId: string;
  document: ResearchProposalDocument;
  lastSyncedChecksum: ResearchArtifactChecksum | null;
  dirty: boolean;
  cachedAt: string;
}

export function researchProposalCacheKey(projectId: string): string {
  return `cerise:research-proposal:v${RESEARCH_PROPOSAL_CACHE_VERSION}:${projectId}`;
}

export async function readResearchProposalCache(
  storage: Pick<Storage, "getItem">,
  projectId: string,
): Promise<ResearchProposalCacheEnvelope | null> {
  try {
    const raw = storage.getItem(researchProposalCacheKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ResearchProposalCacheEnvelope>;
    if (parsed.version !== RESEARCH_PROPOSAL_CACHE_VERSION || parsed.projectId !== projectId) return null;
    const document = await normalizeResearchProposalDocument(parsed.document, projectId);
    if (!document) return null;
    const lastSyncedChecksum = typeof parsed.lastSyncedChecksum === "string" && /^sha256:[a-f0-9]{64}$/.test(parsed.lastSyncedChecksum)
      ? parsed.lastSyncedChecksum as ResearchArtifactChecksum
      : null;
    return {
      version: RESEARCH_PROPOSAL_CACHE_VERSION,
      projectId,
      document,
      lastSyncedChecksum,
      dirty: parsed.dirty === true,
      cachedAt: typeof parsed.cachedAt === "string" && Number.isFinite(Date.parse(parsed.cachedAt))
        ? new Date(parsed.cachedAt).toISOString()
        : document.updatedAt,
    };
  } catch {
    return null;
  }
}

export function writeResearchProposalCache(
  storage: Pick<Storage, "setItem">,
  input: {
    document: ResearchProposalDocument;
    lastSyncedChecksum: ResearchArtifactChecksum | null;
    dirty: boolean;
  },
): void {
  const envelope: ResearchProposalCacheEnvelope = {
    version: RESEARCH_PROPOSAL_CACHE_VERSION,
    projectId: input.document.projectId,
    document: input.document,
    lastSyncedChecksum: input.lastSyncedChecksum,
    dirty: input.dirty,
    cachedAt: new Date().toISOString(),
  };
  storage.setItem(researchProposalCacheKey(input.document.projectId), JSON.stringify(envelope));
}

export type ResearchProposalCacheReconciliation =
  | { kind: "none"; document: null; expectedCloudChecksum: null }
  | { kind: "device-current"; document: ResearchProposalDocument; expectedCloudChecksum: ResearchArtifactChecksum | null }
  | { kind: "cloud-current"; document: ResearchProposalDocument; expectedCloudChecksum: ResearchArtifactChecksum }
  | {
    kind: "review-required";
    device: ResearchProposalDocument;
    cloud: ResearchProposalDocument;
    expectedCloudChecksum: ResearchArtifactChecksum;
  };

export function reconcileResearchProposalCache(input: {
  cache: ResearchProposalCacheEnvelope | null;
  cloud: ResearchProposalDocument | null;
  cloudStoredChecksum: ResearchArtifactChecksum | null;
}): ResearchProposalCacheReconciliation {
  const { cache, cloud } = input;
  const cloudChecksum = input.cloudStoredChecksum ?? cloud?.identity.checksum ?? null;
  if (!cache && !cloud) return { kind: "none", document: null, expectedCloudChecksum: null };
  if (cache && !cloud) return { kind: "device-current", document: cache.document, expectedCloudChecksum: null };
  if (!cache && cloud && cloudChecksum) return { kind: "cloud-current", document: cloud, expectedCloudChecksum: cloudChecksum };
  if (!cache || !cloud || !cloudChecksum) return { kind: "none", document: null, expectedCloudChecksum: null };
  if (cache.document.identity.checksum === cloud.identity.checksum) {
    return { kind: "cloud-current", document: cloud, expectedCloudChecksum: cloudChecksum };
  }
  if (!cache.dirty) return { kind: "cloud-current", document: cloud, expectedCloudChecksum: cloudChecksum };
  if (cache.lastSyncedChecksum === cloudChecksum) {
    return { kind: "device-current", document: cache.document, expectedCloudChecksum: cloudChecksum };
  }
  return {
    kind: "review-required",
    device: cache.document,
    cloud,
    expectedCloudChecksum: cloudChecksum,
  };
}
