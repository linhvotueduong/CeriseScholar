import type { ResearchArtifactChecksum } from "./artifactIdentity";
import {
  normalizeReviewedProposalBaseline,
  type ProposalExternalReviewReceipt,
  type ProposalResearcherReviewDraft,
  type ReviewedProposalBaselinePackage,
} from "./proposalReviewPhase9";

export const PROPOSAL_REVIEW_CACHE_VERSION = 1 as const;

export interface ProposalReviewCacheEnvelope {
  version: typeof PROPOSAL_REVIEW_CACHE_VERSION;
  projectId: string;
  baseline: ReviewedProposalBaselinePackage | null;
  draftReview: ProposalResearcherReviewDraft;
  draftExternalReceipts: ProposalExternalReviewReceipt[];
  knowledgeEntries: unknown[];
  lastSyncedChecksum: ResearchArtifactChecksum | null;
  dirty: boolean;
  cachedAt: string;
}

export type ProposalReviewCacheReconciliation =
  | { kind: "none"; baseline: null; expectedCloudChecksum: null }
  | { kind: "device-current"; baseline: ReviewedProposalBaselinePackage; expectedCloudChecksum: ResearchArtifactChecksum | null }
  | { kind: "cloud-current"; baseline: ReviewedProposalBaselinePackage; expectedCloudChecksum: ResearchArtifactChecksum }
  | { kind: "review-required"; device: ReviewedProposalBaselinePackage; cloud: ReviewedProposalBaselinePackage; expectedCloudChecksum: ResearchArtifactChecksum };

function checksum(value: unknown): ResearchArtifactChecksum | null {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value) ? value as ResearchArtifactChecksum : null;
}

export function proposalReviewCacheKey(projectId: string): string {
  return `cerise:proposal-review:v${PROPOSAL_REVIEW_CACHE_VERSION}:${projectId}`;
}

export async function readProposalReviewCache(storage: Pick<Storage, "getItem">, projectId: string): Promise<ProposalReviewCacheEnvelope | null> {
  try {
    const raw = storage.getItem(proposalReviewCacheKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProposalReviewCacheEnvelope>;
    if (parsed.version !== PROPOSAL_REVIEW_CACHE_VERSION || parsed.projectId !== projectId) return null;
    const baseline = parsed.baseline ? await normalizeReviewedProposalBaseline(parsed.baseline, projectId) : null;
    if (parsed.baseline && !baseline) return null;
    const draftReview = parsed.draftReview;
    if (!draftReview || typeof draftReview.reviewerRole !== "string" || typeof draftReview.reviewStatement !== "string") return null;
    return {
      version: PROPOSAL_REVIEW_CACHE_VERSION,
      projectId,
      baseline,
      draftReview,
      draftExternalReceipts: Array.isArray(parsed.draftExternalReceipts) ? parsed.draftExternalReceipts.slice(0, 25) : [],
      knowledgeEntries: Array.isArray(parsed.knowledgeEntries) ? parsed.knowledgeEntries.slice(0, 3) : [],
      lastSyncedChecksum: checksum(parsed.lastSyncedChecksum),
      dirty: parsed.dirty === true,
      cachedAt: typeof parsed.cachedAt === "string" && Number.isFinite(Date.parse(parsed.cachedAt)) ? new Date(parsed.cachedAt).toISOString() : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeProposalReviewCache(storage: Pick<Storage, "setItem">, input: Omit<ProposalReviewCacheEnvelope, "version" | "cachedAt">): void {
  try {
    storage.setItem(proposalReviewCacheKey(input.projectId), JSON.stringify({ ...input, version: PROPOSAL_REVIEW_CACHE_VERSION, cachedAt: new Date().toISOString() } satisfies ProposalReviewCacheEnvelope));
  } catch {
    // Device storage can be unavailable or full. Secure persistence remains independent.
  }
}

export function reconcileProposalReviewCache(input: {
  cache: ProposalReviewCacheEnvelope | null;
  cloud: ReviewedProposalBaselinePackage | null;
  cloudStoredChecksum: ResearchArtifactChecksum | null;
}): ProposalReviewCacheReconciliation {
  const cloudChecksum = input.cloudStoredChecksum ?? input.cloud?.identity.checksum ?? null;
  if (!input.cache?.baseline && !input.cloud) return { kind: "none", baseline: null, expectedCloudChecksum: null };
  if (input.cache?.baseline && !input.cloud) return { kind: "device-current", baseline: input.cache.baseline, expectedCloudChecksum: null };
  if (!input.cache?.baseline && input.cloud && cloudChecksum) return { kind: "cloud-current", baseline: input.cloud, expectedCloudChecksum: cloudChecksum };
  if (!input.cache?.baseline || !input.cloud || !cloudChecksum) return { kind: "none", baseline: null, expectedCloudChecksum: null };
  if (input.cache.baseline.identity.checksum === input.cloud.identity.checksum || !input.cache.dirty) return { kind: "cloud-current", baseline: input.cloud, expectedCloudChecksum: cloudChecksum };
  if (input.cache.lastSyncedChecksum === cloudChecksum) return { kind: "device-current", baseline: input.cache.baseline, expectedCloudChecksum: cloudChecksum };
  return { kind: "review-required", device: input.cache.baseline, cloud: input.cloud, expectedCloudChecksum: cloudChecksum };
}
