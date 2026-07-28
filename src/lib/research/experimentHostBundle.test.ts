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
import { createExperimentBlock, createExperimentStudioDocument } from "./experimentStudio";

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
  assert.equal(built.bundle.dataPolicy.audioResponses, "local-only");
  assert.equal(built.bundle.runner.audioEndpoint, null);
  assert.match(built.bundle.runner.html, /\/api\/checkpoints/);
  assert.match(built.bundle.runner.html, new RegExp(release.checksum));
  assert.doesNotMatch(
    built.bundle.runner.html,
    /api\.openai\.com|api\.openrouter\.ai|supabase\.co/i,
  );
  assert.ok(await verifyExperimentHostBundle(JSON.parse(built.content)));
});

test("freezes bounded same-Mac audio settings into the codebook and runner", async () => {
  const studio = createExperimentStudioDocument("project-phase-7-audio");
  const audioConsent = createExperimentBlock("audio-consent", "audio-consent-1");
  const audio = createExperimentBlock("audio-response", "audio-response-1");
  assert.ok(audio.audio);
  audio.audio.consentBlockId = audioConsent.id;
  studio.blocks.splice(2, 0, audioConsent, audio);
  const release = await createExperimentRelease({
    releaseId: "c8a70fcb-7338-427f-a02f-ea5e4122bb18",
    releaseNumber: 1,
    createdAt: "2026-07-28T12:00:00.000Z",
    releaseNotes: "Audio Local Host fixture",
    studio,
    review: createCompletedExperimentReleaseReview(),
  });
  const built = await buildExperimentHostBundle(release, {
    createdAt: "2026-07-28T12:30:00.000Z",
  });

  assert.equal(built.bundle.bundleVersion, 4);
  assert.equal(built.bundle.runner.packageVersion, 6);
  assert.equal(built.bundle.runner.audioEndpoint, "/api/audio");
  assert.equal(built.bundle.codebook.audioResponses.length, 1);
  assert.equal(built.bundle.codebook.audioResponses[0].consentBlockId, audioConsent.id);
  assert.equal(built.bundle.dataPolicy.audioExecutionBoundary, "localhost-only");
  assert.equal(built.bundle.dataPolicy.pilotDataIsolation, "separate-mode-exports");
  assert.equal(built.bundle.dataPolicy.productionLaunchGate, "local-preflight-and-rehearsal");
  assert.match(built.bundle.runner.html, /microphone/);
  assert.ok(await verifyExperimentHostBundle(JSON.parse(built.content)));
});

test("freezes consent-linked same-Mac video settings without enabling LAN or cloud capture", async () => {
  const studio = createExperimentStudioDocument("project-phase-7-video");
  const videoConsent = createExperimentBlock("video-consent", "video-consent-1");
  const audioConsent = createExperimentBlock("audio-consent", "audio-consent-1");
  const video = createExperimentBlock("video-response", "video-response-1");
  assert.ok(video.video);
  video.video.consentBlockId = videoConsent.id;
  video.video.includeAudio = true;
  video.video.audioConsentBlockId = audioConsent.id;
  video.video.maxDurationSeconds = 45;
  video.video.maxBytes = 20 * 1024 * 1024;
  studio.blocks.splice(2, 0, videoConsent, audioConsent, video);
  const release = await createExperimentRelease({
    releaseId: "d9fdcf20-51b9-4f66-8ce9-5a217a05f7f3",
    releaseNumber: 1,
    createdAt: "2026-07-28T16:00:00.000Z",
    releaseNotes: "Video Local Host fixture",
    studio,
    review: createCompletedExperimentReleaseReview(),
  });
  const built = await buildExperimentHostBundle(release, {
    createdAt: "2026-07-28T16:30:00.000Z",
  });

  assert.equal(built.bundle.runner.videoEndpoint, "/api/video");
  assert.equal(built.bundle.codebook.videoResponses.length, 1);
  assert.deepEqual(built.bundle.codebook.videoResponses[0], {
    blockId: video.id,
    variableName: video.variableName,
    consentBlockId: videoConsent.id,
    includeAudio: true,
    audioConsentBlockId: audioConsent.id,
    maxDurationSeconds: 45,
    maxBytes: 20 * 1024 * 1024,
    cameraFacing: "user",
  });
  assert.equal(built.bundle.dataPolicy.videoExecutionBoundary, "localhost-only");
  assert.equal(built.bundle.dataPolicy.cloudUpload, false);
  assert.match(built.bundle.runner.html, /\/api\/video/);
  assert.match(built.bundle.runner.html, /Check camera/);
  assert.doesNotMatch(built.bundle.runner.html, /api\.openai\.com|api\.openrouter\.ai|supabase\.co/i);
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
