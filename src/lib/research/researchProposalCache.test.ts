import assert from "node:assert/strict";
import test from "node:test";
import { createResearchProposalDocument } from "./researchProposalDocument";
import {
  readResearchProposalCache,
  reconcileResearchProposalCache,
  researchProposalCacheKey,
  writeResearchProposalCache,
} from "./researchProposalCache";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

test("proposal cache is versioned, project-scoped, and checksum verified", async () => {
  const storage = memoryStorage();
  const document = await createResearchProposalDocument({ projectId: "cache-project", now: "2026-08-05T00:00:00.000Z" });
  writeResearchProposalCache(storage, { document, lastSyncedChecksum: null, dirty: true });
  assert.match(researchProposalCacheKey(document.projectId), /:v1:/);
  assert.equal((await readResearchProposalCache(storage as Storage, document.projectId))?.document.identity.checksum, document.identity.checksum);
  assert.equal(await readResearchProposalCache(storage as Storage, "another-project"), null);
  const raw = JSON.parse(storage.getItem(researchProposalCacheKey(document.projectId))!);
  raw.document.title = "tampered";
  storage.setItem(researchProposalCacheKey(document.projectId), JSON.stringify(raw));
  assert.equal(await readResearchProposalCache(storage as Storage, document.projectId), null);
});

test("proposal reconciliation preserves divergent dirty versions for an explicit choice", async () => {
  const first = await createResearchProposalDocument({ projectId: "conflict-project", title: "First", now: "2026-08-05T00:00:00.000Z" });
  const device = await createResearchProposalDocument({ projectId: "conflict-project", previous: first, title: "Device", now: "2026-08-05T01:00:00.000Z" });
  const cloud = await createResearchProposalDocument({ projectId: "conflict-project", previous: first, title: "Cloud", now: "2026-08-05T02:00:00.000Z" });
  const result = reconcileResearchProposalCache({
    cache: { version: 1, projectId: first.projectId, document: device, lastSyncedChecksum: first.identity.checksum, dirty: true, cachedAt: device.updatedAt },
    cloud,
    cloudStoredChecksum: cloud.identity.checksum,
  });
  assert.equal(result.kind, "review-required");
  if (result.kind === "review-required") {
    assert.equal(result.device.title, "Device");
    assert.equal(result.cloud.title, "Cloud");
  }
});

test("device edits remain current when secure storage still matches the last synchronized checksum", async () => {
  const cloud = await createResearchProposalDocument({ projectId: "device-current", now: "2026-08-05T00:00:00.000Z" });
  const device = await createResearchProposalDocument({ projectId: "device-current", previous: cloud, title: "Local edit", now: "2026-08-05T01:00:00.000Z" });
  const result = reconcileResearchProposalCache({
    cache: { version: 1, projectId: cloud.projectId, document: device, lastSyncedChecksum: cloud.identity.checksum, dirty: true, cachedAt: device.updatedAt },
    cloud,
    cloudStoredChecksum: cloud.identity.checksum,
  });
  assert.equal(result.kind, "device-current");
  if (result.kind === "device-current") assert.equal(result.document.title, "Local edit");
});
