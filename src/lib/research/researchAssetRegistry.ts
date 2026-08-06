import {
  createResearchArtifactIdentity,
  isResearchArtifactChecksum,
  verifyResearchArtifactIdentity,
  type ResearchArtifactChecksum,
  type ResearchArtifactIdentity,
  type ResearchArtifactReference,
} from "./artifactIdentity";

export const RESEARCH_ASSET_SCHEMA_VERSION = 1 as const;

export type ResearchAssetKind = "figure" | "table" | "image" | "diagram" | "supplement";
export type ResearchAssetOrigin = "analysis" | "literature" | "researcher-upload" | "ai-generated" | "external-tool";
export type ResearchAssetRightsStatus = "owned" | "licensed" | "permission-required" | "permission-recorded" | "public-domain" | "unknown";
export type ResearchAssetReviewStatus = "draft" | "verified" | "retired";

export interface ResearchAssetRecord {
  schemaVersion: typeof RESEARCH_ASSET_SCHEMA_VERSION;
  id: string;
  projectId: string;
  kind: ResearchAssetKind;
  origin: ResearchAssetOrigin;
  title: string;
  caption: string;
  altText: string;
  storageLocator: string;
  contentChecksum: ResearchArtifactChecksum;
  sourceReferences: ResearchArtifactReference[];
  citationKeys: string[];
  rights: {
    status: ResearchAssetRightsStatus;
    license: string;
    attribution: string;
    evidenceLocator: string;
  };
  reviewStatus: ResearchAssetReviewStatus;
  participantDataIncluded: false;
  identity: ResearchArtifactIdentity;
  claim: "asset-provenance-record-not-copyright-clearance-or-publication-approval";
}

const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

function token(value: string, label: string): string {
  if (!TOKEN_PATTERN.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function assetPayload(record: Omit<ResearchAssetRecord, "identity">) {
  return record;
}

export async function createResearchAssetRecord(
  input: Omit<ResearchAssetRecord, "schemaVersion" | "participantDataIncluded" | "identity" | "claim">,
): Promise<ResearchAssetRecord> {
  if (/participant|signature|consent-receipt/i.test(input.storageLocator)) {
    throw new Error("Participant data and consent receipts cannot be registered as publication assets.");
  }
  if (!isResearchArtifactChecksum(input.contentChecksum)) throw new Error("Research asset content checksum is invalid.");
  const core: Omit<ResearchAssetRecord, "identity"> = {
    schemaVersion: RESEARCH_ASSET_SCHEMA_VERSION,
    ...input,
    id: token(input.id, "Research asset ID"),
    projectId: token(input.projectId, "Research asset project ID"),
    title: input.title.trim().slice(0, 1_000),
    caption: input.caption.trim().slice(0, 10_000),
    altText: input.altText.trim().slice(0, 5_000),
    storageLocator: input.storageLocator.trim().slice(0, 2_000),
    sourceReferences: [...input.sourceReferences].sort((left, right) => left.artifactKind.localeCompare(right.artifactKind) || left.artifactId.localeCompare(right.artifactId)),
    citationKeys: [...new Set(input.citationKeys.map((value) => token(value, "Citation key")))].sort(),
    rights: {
      status: input.rights.status,
      license: input.rights.license.trim().slice(0, 500),
      attribution: input.rights.attribution.trim().slice(0, 2_000),
      evidenceLocator: input.rights.evidenceLocator.trim().slice(0, 2_000),
    },
    participantDataIncluded: false,
    claim: "asset-provenance-record-not-copyright-clearance-or-publication-approval",
  };
  return {
    ...core,
    identity: await createResearchArtifactIdentity({
      artifactKind: "research-asset",
      artifactId: core.id,
      artifactSchemaVersion: RESEARCH_ASSET_SCHEMA_VERSION,
      payload: assetPayload(core),
      sources: core.sourceReferences,
    }),
  };
}

export async function verifyResearchAssetRecord(record: ResearchAssetRecord): Promise<boolean> {
  const { identity, ...core } = record;
  return verifyResearchArtifactIdentity(identity, assetPayload(core));
}

export function collectResearchAssetPublicationIssues(record: ResearchAssetRecord): string[] {
  const issues: string[] = [];
  if (!record.title) issues.push("title-required");
  if (!record.caption) issues.push("caption-required");
  if (record.kind !== "table" && !record.altText) issues.push("alt-text-required");
  if (record.origin === "literature" && record.citationKeys.length === 0) issues.push("literature-citation-required");
  if (["unknown", "permission-required"].includes(record.rights.status)) issues.push("rights-not-cleared");
  if (record.rights.status === "licensed" && !record.rights.license) issues.push("license-required");
  if (record.rights.status === "permission-recorded" && !record.rights.evidenceLocator) issues.push("permission-evidence-required");
  if (record.reviewStatus !== "verified") issues.push("asset-review-required");
  return issues.sort();
}
