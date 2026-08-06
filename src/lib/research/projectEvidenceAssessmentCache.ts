import type { ResearchArtifactChecksum } from "./artifactIdentity";
import {
  verifyProjectEvidenceAssessment,
  type ProjectEvidenceAssessment,
} from "./researchProposalDocument";

export const PROJECT_EVIDENCE_ASSESSMENT_CACHE_VERSION = 1 as const;

export interface ProjectEvidenceAssessmentCacheEntry {
  assessment: ProjectEvidenceAssessment;
  lastSyncedChecksum: ResearchArtifactChecksum | null;
  dirty: boolean;
  cachedAt: string;
}

export interface ProjectEvidenceAssessmentCacheEnvelope {
  version: typeof PROJECT_EVIDENCE_ASSESSMENT_CACHE_VERSION;
  projectId: string;
  entries: ProjectEvidenceAssessmentCacheEntry[];
}

export interface ProjectEvidenceAssessmentConflict {
  assessmentId: string;
  device: ProjectEvidenceAssessment;
  cloud: ProjectEvidenceAssessment;
  expectedCloudChecksum: ResearchArtifactChecksum;
}

export interface ProjectEvidenceAssessmentReconciliation {
  entries: ProjectEvidenceAssessmentCacheEntry[];
  conflicts: ProjectEvidenceAssessmentConflict[];
}

export function projectEvidenceAssessmentCacheKey(projectId: string): string {
  return `cerise:project-evidence-assessments:v${PROJECT_EVIDENCE_ASSESSMENT_CACHE_VERSION}:${projectId}`;
}

function checksum(value: unknown): ResearchArtifactChecksum | null {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value)
    ? value as ResearchArtifactChecksum
    : null;
}

export async function readProjectEvidenceAssessmentCache(
  storage: Pick<Storage, "getItem">,
  projectId: string,
): Promise<ProjectEvidenceAssessmentCacheEnvelope | null> {
  try {
    const raw = storage.getItem(projectEvidenceAssessmentCacheKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProjectEvidenceAssessmentCacheEnvelope>;
    if (parsed.version !== PROJECT_EVIDENCE_ASSESSMENT_CACHE_VERSION || parsed.projectId !== projectId || !Array.isArray(parsed.entries) || parsed.entries.length > 500) return null;
    const entries = (await Promise.all(parsed.entries.map(async (candidate) => {
      if (!candidate || typeof candidate !== "object" || !candidate.assessment || candidate.assessment.projectId !== projectId) return null;
      if (!await verifyProjectEvidenceAssessment(candidate.assessment)) return null;
      return {
        assessment: candidate.assessment,
        lastSyncedChecksum: checksum(candidate.lastSyncedChecksum),
        dirty: candidate.dirty === true,
        cachedAt: typeof candidate.cachedAt === "string" && Number.isFinite(Date.parse(candidate.cachedAt))
          ? new Date(candidate.cachedAt).toISOString()
          : candidate.assessment.updatedAt,
      } satisfies ProjectEvidenceAssessmentCacheEntry;
    }))).filter((entry): entry is ProjectEvidenceAssessmentCacheEntry => entry !== null);
    if (entries.length !== parsed.entries.length) return null;
    if (new Set(entries.map((entry) => entry.assessment.assessmentId)).size !== entries.length) return null;
    return { version: PROJECT_EVIDENCE_ASSESSMENT_CACHE_VERSION, projectId, entries };
  } catch {
    return null;
  }
}

export function writeProjectEvidenceAssessmentCache(
  storage: Pick<Storage, "setItem">,
  projectId: string,
  entries: readonly ProjectEvidenceAssessmentCacheEntry[],
): void {
  const envelope: ProjectEvidenceAssessmentCacheEnvelope = {
    version: PROJECT_EVIDENCE_ASSESSMENT_CACHE_VERSION,
    projectId,
    entries: entries.slice(0, 500).map((entry) => ({ ...entry })),
  };
  try {
    storage.setItem(projectEvidenceAssessmentCacheKey(projectId), JSON.stringify(envelope));
  } catch {
    // Device storage can be unavailable or full. Secure persistence remains independent.
  }
}

export function reconcileProjectEvidenceAssessments(input: {
  cache: ProjectEvidenceAssessmentCacheEnvelope | null;
  cloud: readonly ProjectEvidenceAssessment[];
}): ProjectEvidenceAssessmentReconciliation {
  const localById = new Map(input.cache?.entries.map((entry) => [entry.assessment.assessmentId, entry]) ?? []);
  const cloudById = new Map(input.cloud.map((assessment) => [assessment.assessmentId, assessment]));
  const ids = [...new Set([...localById.keys(), ...cloudById.keys()])].sort();
  const entries: ProjectEvidenceAssessmentCacheEntry[] = [];
  const conflicts: ProjectEvidenceAssessmentConflict[] = [];
  for (const id of ids) {
    const local = localById.get(id);
    const cloud = cloudById.get(id);
    if (local && !cloud) {
      entries.push(local);
      continue;
    }
    if (!local && cloud) {
      entries.push({ assessment: cloud, lastSyncedChecksum: cloud.identity.checksum, dirty: false, cachedAt: cloud.updatedAt });
      continue;
    }
    if (!local || !cloud) continue;
    if (local.assessment.identity.checksum === cloud.identity.checksum || !local.dirty) {
      entries.push({ assessment: cloud, lastSyncedChecksum: cloud.identity.checksum, dirty: false, cachedAt: cloud.updatedAt });
      continue;
    }
    if (local.lastSyncedChecksum === cloud.identity.checksum) {
      entries.push(local);
      continue;
    }
    entries.push(local);
    conflicts.push({ assessmentId: id, device: local.assessment, cloud, expectedCloudChecksum: cloud.identity.checksum });
  }
  return { entries, conflicts };
}
