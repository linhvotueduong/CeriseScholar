import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExperimentHostBundle,
  EXPERIMENT_HOST_BUNDLE_FORMAT,
  verifyExperimentHostBundle,
} from "./experimentHostBundle";
import {
  createCompletedExperimentReleaseReview,
  createExperimentRelease,
} from "./experimentRelease";
import { createExperimentStudioDocument } from "./experimentStudio";

async function releaseFixture() {
  return createExperimentRelease({
    releaseId: "a7350a2a-b8be-46bc-a07a-1e0945cd9de4",
    releaseNumber: 4,
    createdAt: "2026-07-27T14:00:00.000Z",
    releaseNotes: "Local Research Host fixture",
    studio: createExperimentStudioDocument("project-phase-7"),
    review: createCompletedExperimentReleaseReview(),
  });
}

test("builds a verified local-only host bundle around a frozen release", async () => {
  const release = await releaseFixture();
  const built = await buildExperimentHostBundle(release, {
    createdAt: "2026-07-27T15:00:00.000Z",
    executionMode: "pilot",
  });

  assert.equal(built.filename, "untitled-experimental-study-release-4-local-host.cerisehost");
  assert.equal(built.bundle.bundleFormat, EXPERIMENT_HOST_BUNDLE_FORMAT);
  assert.equal(built.bundle.release.checksum, release.checksum);
  assert.equal(built.bundle.dataPolicy.participantResponses, "local-only");
  assert.equal(built.bundle.dataPolicy.cloudUpload, false);
  assert.match(built.bundle.runner.html, /\/api\/checkpoints/);
  assert.match(built.bundle.runner.html, new RegExp(release.checksum));
  assert.doesNotMatch(
    built.bundle.runner.html,
    /api\.openai\.com|api\.openrouter\.ai|supabase\.co/i,
  );
  assert.ok(await verifyExperimentHostBundle(JSON.parse(built.content)));
});

test("rejects a host bundle when its runner or release has been altered", async () => {
  const release = await releaseFixture();
  const built = await buildExperimentHostBundle(release, {
    createdAt: "2026-07-27T15:00:00.000Z",
  });
  const runnerTamper = structuredClone(built.bundle);
  runnerTamper.runner.html += "<!-- changed -->";
  assert.equal(await verifyExperimentHostBundle(runnerTamper), null);

  const releaseTamper = structuredClone(built.bundle);
  releaseTamper.release.studio.title = "Changed after release";
  assert.equal(await verifyExperimentHostBundle(releaseTamper), null);
});
