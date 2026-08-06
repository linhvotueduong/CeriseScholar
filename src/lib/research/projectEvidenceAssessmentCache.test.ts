import assert from "node:assert/strict";
import test from "node:test";
import { createResearchArtifactIdentity, type ResearchArtifactIdentity } from "./artifactIdentity";
import {
  projectEvidenceAssessmentCacheKey,
  readProjectEvidenceAssessmentCache,
  reconcileProjectEvidenceAssessments,
  writeProjectEvidenceAssessmentCache,
} from "./projectEvidenceAssessmentCache";
import { createProjectEvidenceAssessment } from "./researchProposalDocument";

const NOW = "2026-08-05T12:00:00.000Z";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

function reference(identity: ResearchArtifactIdentity) {
  return { artifactKind: identity.artifactKind, artifactId: identity.artifactId, schemaVersion: identity.artifactSchemaVersion, checksum: identity.checksum };
}

async function assessment(title = "Source", previous = null as Awaited<ReturnType<typeof createProjectEvidenceAssessment>> | null) {
  const source = await createResearchArtifactIdentity({ artifactKind: "evidence-library", artifactId: "source-1", artifactSchemaVersion: 1, payload: { title } });
  return createProjectEvidenceAssessment({
    projectId: "project-1",
    assessmentId: "review-source-1",
    sourceId: "source-1",
    previous,
    sourceReference: reference(source),
    researcherNotes: title,
    now: previous ? "2026-08-05T13:00:00.000Z" : NOW,
  });
}

test("assessment cache is versioned, project-scoped, bounded, and checksum verified", async () => {
  const storage = memoryStorage();
  const item = await assessment();
  writeProjectEvidenceAssessmentCache(storage as Storage, "project-1", [{ assessment: item, lastSyncedChecksum: null, dirty: true, cachedAt: NOW }]);
  assert.match(projectEvidenceAssessmentCacheKey("project-1"), /:v1:/);
  assert.equal((await readProjectEvidenceAssessmentCache(storage as Storage, "project-1"))?.entries[0].assessment.identity.checksum, item.identity.checksum);
  assert.equal(await readProjectEvidenceAssessmentCache(storage as Storage, "project-2"), null);
  const raw = JSON.parse(storage.getItem(projectEvidenceAssessmentCacheKey("project-1"))!);
  raw.entries[0].assessment.researcherNotes = "tampered";
  storage.setItem(projectEvidenceAssessmentCacheKey("project-1"), JSON.stringify(raw));
  assert.equal(await readProjectEvidenceAssessmentCache(storage as Storage, "project-1"), null);
});

test("assessment reconciliation preserves divergent dirty copies for explicit review", async () => {
  const baseline = await assessment("Baseline");
  const device = await assessment("Device", baseline);
  const cloud = await assessment("Cloud", baseline);
  const result = reconcileProjectEvidenceAssessments({
    cache: { version: 1, projectId: "project-1", entries: [{ assessment: device, lastSyncedChecksum: baseline.identity.checksum, dirty: true, cachedAt: NOW }] },
    cloud: [cloud],
  });
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.entries[0].assessment.researcherNotes, "Device");
});

test("device revision remains current when cloud matches its last synchronized checksum", async () => {
  const cloud = await assessment("Cloud");
  const device = await assessment("Device", cloud);
  const result = reconcileProjectEvidenceAssessments({
    cache: { version: 1, projectId: "project-1", entries: [{ assessment: device, lastSyncedChecksum: cloud.identity.checksum, dirty: true, cachedAt: NOW }] },
    cloud: [cloud],
  });
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.entries[0].assessment.identity.checksum, device.identity.checksum);
});
