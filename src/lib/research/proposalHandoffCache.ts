import type { ResearchArtifactChecksum } from "./artifactIdentity";
import {
  normalizeProposalHandoffPackage,
  normalizeProposalHandoffResponsibilityList,
  type ProposalHandoffPackage,
  type ProposalHandoffResponsibility,
} from "./proposalHandoffPhase7";

export const PROPOSAL_HANDOFF_CACHE_VERSION = 1 as const;

export interface ProposalHandoffCacheEnvelope {
  version: typeof PROPOSAL_HANDOFF_CACHE_VERSION;
  projectId: string;
  package: ProposalHandoffPackage | null;
  draftProposalChecksum: ResearchArtifactChecksum | null;
  draftResponsibilities: ProposalHandoffResponsibility[];
  lastSyncedChecksum: ResearchArtifactChecksum | null;
  dirty: boolean;
  cachedAt: string;
}

export type ProposalHandoffCacheReconciliation =
  | { kind: "none"; package: null; expectedCloudChecksum: null }
  | { kind: "device-current"; package: ProposalHandoffPackage; expectedCloudChecksum: ResearchArtifactChecksum | null }
  | { kind: "cloud-current"; package: ProposalHandoffPackage; expectedCloudChecksum: ResearchArtifactChecksum }
  | { kind: "review-required"; device: ProposalHandoffPackage; cloud: ProposalHandoffPackage; expectedCloudChecksum: ResearchArtifactChecksum };

export function proposalHandoffCacheKey(projectId: string): string {
  return `cerise:proposal-handoff:v${PROPOSAL_HANDOFF_CACHE_VERSION}:${projectId}`;
}

function checksum(value: unknown): ResearchArtifactChecksum | null {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value) ? value as ResearchArtifactChecksum : null;
}

export async function readProposalHandoffCache(storage: Pick<Storage, "getItem">, projectId: string): Promise<ProposalHandoffCacheEnvelope | null> {
  try {
    const raw = storage.getItem(proposalHandoffCacheKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProposalHandoffCacheEnvelope>;
    if (parsed.version !== PROPOSAL_HANDOFF_CACHE_VERSION || parsed.projectId !== projectId) return null;
    const packageValue = parsed.package ? await normalizeProposalHandoffPackage(parsed.package, projectId) : null;
    if (parsed.package && !packageValue) return null;
    const draftResponsibilities = normalizeProposalHandoffResponsibilityList(parsed.draftResponsibilities ?? []);
    if (!draftResponsibilities) return null;
    return {
      version: PROPOSAL_HANDOFF_CACHE_VERSION,
      projectId,
      package: packageValue,
      draftProposalChecksum: checksum(parsed.draftProposalChecksum),
      draftResponsibilities,
      lastSyncedChecksum: checksum(parsed.lastSyncedChecksum),
      dirty: parsed.dirty === true,
      cachedAt: typeof parsed.cachedAt === "string" && Number.isFinite(Date.parse(parsed.cachedAt)) ? new Date(parsed.cachedAt).toISOString() : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeProposalHandoffCache(storage: Pick<Storage, "setItem">, input: Omit<ProposalHandoffCacheEnvelope, "version" | "cachedAt">): void {
  try {
    storage.setItem(proposalHandoffCacheKey(input.projectId), JSON.stringify({ ...input, version: PROPOSAL_HANDOFF_CACHE_VERSION, cachedAt: new Date().toISOString() } satisfies ProposalHandoffCacheEnvelope));
  } catch {
    // Device storage can be unavailable or full. Secure persistence remains independent.
  }
}

export function reconcileProposalHandoffCache(input: { cache: ProposalHandoffCacheEnvelope | null; cloud: ProposalHandoffPackage | null; cloudStoredChecksum: ResearchArtifactChecksum | null }): ProposalHandoffCacheReconciliation {
  const cloudChecksum = input.cloudStoredChecksum ?? input.cloud?.identity.checksum ?? null;
  if (!input.cache?.package && !input.cloud) return { kind: "none", package: null, expectedCloudChecksum: null };
  if (input.cache?.package && !input.cloud) return { kind: "device-current", package: input.cache.package, expectedCloudChecksum: null };
  if (!input.cache?.package && input.cloud && cloudChecksum) return { kind: "cloud-current", package: input.cloud, expectedCloudChecksum: cloudChecksum };
  if (!input.cache?.package || !input.cloud || !cloudChecksum) return { kind: "none", package: null, expectedCloudChecksum: null };
  if (input.cache.package.identity.checksum === input.cloud.identity.checksum || !input.cache.dirty) return { kind: "cloud-current", package: input.cloud, expectedCloudChecksum: cloudChecksum };
  if (input.cache.lastSyncedChecksum === cloudChecksum) return { kind: "device-current", package: input.cache.package, expectedCloudChecksum: cloudChecksum };
  return { kind: "review-required", device: input.cache.package, cloud: input.cloud, expectedCloudChecksum: cloudChecksum };
}
