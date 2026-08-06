import type { ResearchArtifactChecksum } from "./artifactIdentity";
import type { ResearchPathwayCacheDocument } from "./researchPathwayCache";
import {
  isResearchPathwayDocumentEmpty,
  researchPathwayDocumentsHaveSameContent,
  type ResearchPathwayDocument,
} from "./researchPathwayDocument";

export type ResearchPathwayReconciliationKind =
  | "empty"
  | "cloud-current"
  | "device-current"
  | "device-unsynced"
  | "review-required";

export interface ResearchPathwayDifferenceSummary {
  problemFrames: { cloud: number; device: number };
  baselineEntries: { cloud: number; device: number };
  questionCandidates: { cloud: number; device: number };
  cloudMainQuestion: string;
  deviceMainQuestion: string;
}

export interface ResearchPathwayReconciliation {
  kind: ResearchPathwayReconciliationKind;
  selected: ResearchPathwayDocument | null;
  cloud: ResearchPathwayDocument | null;
  device: ResearchPathwayDocument | null;
  expectedCloudChecksum: ResearchArtifactChecksum | null;
  differences: ResearchPathwayDifferenceSummary | null;
}

export function reconcileResearchPathwaySources(input: {
  cloud: ResearchPathwayDocument | null;
  cache: ResearchPathwayCacheDocument | null;
  migratedDevice: ResearchPathwayDocument | null;
}): ResearchPathwayReconciliation {
  const cloud = input.cloud;
  const migratedDiffersFromCache = Boolean(
    input.cache
    && input.migratedDevice
    && !researchPathwayDocumentsHaveSameContent(input.cache.document, input.migratedDevice),
  );
  const device = input.migratedDevice ?? input.cache?.document ?? null;
  const deviceDirty = migratedDiffersFromCache
    ? true
    : input.cache?.dirty ?? Boolean(device && !isResearchPathwayDocumentEmpty(device));
  const lastSynced = input.cache?.lastSyncedChecksum ?? null;

  if (!cloud && (!device || isResearchPathwayDocumentEmpty(device))) {
    return { kind: "empty", selected: device, cloud: null, device, expectedCloudChecksum: null, differences: null };
  }
  if (!cloud && device) {
    return { kind: "device-current", selected: device, cloud: null, device, expectedCloudChecksum: null, differences: null };
  }
  if (cloud && !device) {
    return { kind: "cloud-current", selected: cloud, cloud, device: null, expectedCloudChecksum: cloud.identity.checksum, differences: null };
  }
  if (!cloud || !device) throw new Error("Research pathway reconciliation reached an impossible source state.");
  if (researchPathwayDocumentsHaveSameContent(cloud, device)) {
    return { kind: "cloud-current", selected: cloud, cloud, device, expectedCloudChecksum: cloud.identity.checksum, differences: null };
  }
  if (deviceDirty && lastSynced === cloud.identity.checksum) {
    return { kind: "device-unsynced", selected: device, cloud, device, expectedCloudChecksum: cloud.identity.checksum, differences: null };
  }
  if (!deviceDirty) {
    return { kind: "cloud-current", selected: cloud, cloud, device, expectedCloudChecksum: cloud.identity.checksum, differences: null };
  }
  return {
    kind: "review-required",
    selected: null,
    cloud,
    device,
    expectedCloudChecksum: cloud.identity.checksum,
    differences: {
      problemFrames: { cloud: cloud.problemFrames.length, device: device.problemFrames.length },
      baselineEntries: { cloud: cloud.baselineEntries.length, device: device.baselineEntries.length },
      questionCandidates: { cloud: cloud.questionCandidates.length, device: device.questionCandidates.length },
      cloudMainQuestion: cloud.decision.mainQuestion,
      deviceMainQuestion: device.decision.mainQuestion,
    },
  };
}
