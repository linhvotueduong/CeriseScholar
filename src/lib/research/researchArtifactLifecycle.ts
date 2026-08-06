import {
  collectResearchArtifactInvalidations,
  type ResearchArtifactInvalidationAction,
  type ResearchArtifactKind,
  type ResearchArtifactGraph,
} from "./researchArtifactGraph";
import type {
  ResearchArtifactChecksum,
  ResearchArtifactReference,
} from "./artifactIdentity";

export const RESEARCH_ARTIFACT_INDEX_SCHEMA_VERSION = 1 as const;

export type ResearchArtifactLifecycleStatus =
  | "current"
  | "stale"
  | "blocked"
  | "superseded"
  | "missing";

export interface ResearchArtifactIndexRecord {
  schemaVersion: typeof RESEARCH_ARTIFACT_INDEX_SCHEMA_VERSION;
  projectId: string;
  userId: string;
  artifactKind: ResearchArtifactKind;
  artifactId: string;
  artifactSchemaVersion: number;
  checksum: ResearchArtifactChecksum;
  payloadChecksum: ResearchArtifactChecksum;
  sourceFingerprintChecksum: ResearchArtifactChecksum;
  sourceReferences: ResearchArtifactReference[];
  storageLocator: string;
  lifecycleStatus: Exclude<ResearchArtifactLifecycleStatus, "missing">;
  supersedesArtifactId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchArtifactLifecycleFinding {
  artifactKind: ResearchArtifactKind;
  artifactId: string | null;
  status: ResearchArtifactLifecycleStatus;
  repairAction: ResearchArtifactInvalidationAction | "create" | "none";
  changedSources: ResearchArtifactKind[];
  reason: string;
}

function artifactKey(kind: string, id: string): string {
  return `${kind}:${id}`;
}

export function evaluateResearchArtifactLifecycle(
  records: readonly ResearchArtifactIndexRecord[],
  graph: ResearchArtifactGraph,
): ResearchArtifactLifecycleFinding[] {
  const active = records.filter((record) => record.lifecycleStatus !== "superseded");
  const latestByIdentity = new Map(
    active.map((record) => [artifactKey(record.artifactKind, record.artifactId), record]),
  );
  const directlyChanged = new Set<ResearchArtifactKind>();
  const findings = new Map<string, ResearchArtifactLifecycleFinding>();

  for (const record of records) {
    if (record.lifecycleStatus === "superseded") {
      findings.set(artifactKey(record.artifactKind, record.artifactId), {
        artifactKind: record.artifactKind,
        artifactId: record.artifactId,
        status: "superseded",
        repairAction: "none",
        changedSources: [],
        reason: "A newer version supersedes this immutable artifact revision.",
      });
      continue;
    }
    const mismatches = record.sourceReferences.filter((source) => {
      const current = latestByIdentity.get(artifactKey(source.artifactKind, source.artifactId));
      return !current || current.checksum !== source.checksum;
    });
    if (mismatches.length > 0) {
      directlyChanged.add(record.artifactKind);
      findings.set(artifactKey(record.artifactKind, record.artifactId), {
        artifactKind: record.artifactKind,
        artifactId: record.artifactId,
        status: "stale",
        repairAction: "reverify",
        changedSources: [...new Set(mismatches.map((item) => item.artifactKind as ResearchArtifactKind))].sort(),
        reason: "One or more checksum-bound source revisions are missing or no longer current.",
      });
    } else {
      findings.set(artifactKey(record.artifactKind, record.artifactId), {
        artifactKind: record.artifactKind,
        artifactId: record.artifactId,
        status: record.lifecycleStatus,
        repairAction: record.lifecycleStatus === "blocked" ? "reverify" : "none",
        changedSources: [],
        reason: record.lifecycleStatus === "blocked"
          ? "The artifact has unresolved blocking findings."
          : "The artifact and all recorded source checksums are current.",
      });
    }
  }

  if (directlyChanged.size > 0) {
    const propagated = collectResearchArtifactInvalidations([...directlyChanged], graph);
    for (const invalidation of propagated) {
      for (const record of active.filter((item) => item.artifactKind === invalidation.artifactKind)) {
        const key = artifactKey(record.artifactKind, record.artifactId);
        const current = findings.get(key);
        if (current?.status === "stale") continue;
        findings.set(key, {
          artifactKind: record.artifactKind,
          artifactId: record.artifactId,
          status: "stale",
          repairAction: invalidation.action,
          changedSources: invalidation.changedSources,
          reason: invalidation.reason,
        });
      }
    }
  }

  return [...findings.values()].sort((left, right) => (
    left.artifactKind.localeCompare(right.artifactKind)
    || (left.artifactId ?? "").localeCompare(right.artifactId ?? "")
  ));
}

export function createResearchArtifactIndexRecord(
  input: Omit<ResearchArtifactIndexRecord, "schemaVersion">,
): ResearchArtifactIndexRecord {
  if (input.sourceReferences.some((source) => source.artifactKind === input.artifactKind && source.artifactId === input.artifactId)) {
    throw new Error("A research artifact cannot list itself as a source.");
  }
  if (input.storageLocator.includes("participant") || input.storageLocator.includes("signature")) {
    throw new Error("Participant and signature storage locators are excluded from the foundation index.");
  }
  return { schemaVersion: RESEARCH_ARTIFACT_INDEX_SCHEMA_VERSION, ...input };
}
