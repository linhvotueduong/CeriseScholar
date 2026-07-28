import assert from "node:assert/strict";
import test from "node:test";
import { createExperimentStudioDocument } from "./experimentStudio";
import { createCompletedExperimentReleaseReview, createExperimentRelease } from "./experimentRelease";
import {
  readLocalExperimentReleases,
  verifiedExperimentReleases,
  writeLocalExperimentRelease,
} from "./experimentReleasePersistence";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

test("local immutable releases round-trip in descending version order", async () => {
  const storage = memoryStorage();
  const studio = createExperimentStudioDocument("project-1");
  const first = await createExperimentRelease({
    releaseId: "release-1",
    releaseNumber: 1,
    createdAt: "2026-07-20T10:00:00.000Z",
    releaseNotes: "First",
    studio,
    review: createCompletedExperimentReleaseReview(),
  });
  const second = await createExperimentRelease({
    releaseId: "release-2",
    releaseNumber: 2,
    createdAt: "2026-07-20T11:00:00.000Z",
    releaseNotes: "Second",
    studio,
    review: createCompletedExperimentReleaseReview(),
  });

  writeLocalExperimentRelease(storage, first);
  writeLocalExperimentRelease(storage, second);
  assert.deepEqual(readLocalExperimentReleases(storage, "project-1").map((release) => release.releaseNumber), [2, 1]);
  assert.deepEqual(readLocalExperimentReleases(storage, "another-project"), []);

  const tampered = { ...second, releaseNotes: "Changed after freezing" };
  assert.deepEqual(await verifiedExperimentReleases([second, tampered], "project-1"), [second]);
});
