import assert from "node:assert/strict";
import test from "node:test";
import { createExperimentStudioDocument } from "./experimentStudio";
import {
  canonicalJson,
  canFreezeExperimentRelease,
  collectExperimentReleaseValidation,
  createCompletedExperimentReleaseReview,
  createExperimentRelease,
  normalizeExperimentRelease,
  sha256Checksum,
  verifyExperimentRelease,
} from "./experimentRelease";

test("canonical release JSON is stable across object key order", () => {
  assert.equal(canonicalJson({ b: 2, a: { d: 4, c: 3 } }), canonicalJson({ a: { c: 3, d: 4 }, b: 2 }));
});

test("a frozen release has a reproducible SHA-256 integrity checksum", async () => {
  const studio = createExperimentStudioDocument("project-1");
  studio.updatedAt = "2026-07-20T12:00:00.000Z";
  const release = await createExperimentRelease({
    releaseId: "release-1",
    releaseNumber: 1,
    createdAt: "2026-07-20T12:30:00.000Z",
    releaseNotes: "Initial pilot release",
    studio,
    review: createCompletedExperimentReleaseReview(),
  });

  assert.match(release.checksum, /^sha256:[a-f0-9]{64}$/);
  assert.equal(release.manifest.timingClaim, "browser-measured");
  assert.equal(release.manifest.formatVersion, 2);
  assert.equal(release.manifest.timingDiagnostic, null);
  assert.equal(release.manifest.participantDataBoundary, "local-only");
  assert.equal(release.manifest.trialTableCount, 0);
  assert.equal(release.manifest.trialRowCount, 0);
  assert.equal(await verifyExperimentRelease(release), true);

  const roundTrip = normalizeExperimentRelease(JSON.parse(JSON.stringify(release)));
  assert.ok(roundTrip);
  assert.equal(await verifyExperimentRelease(roundTrip), true);

  release.releaseNotes = "Changed after release";
  assert.equal(await verifyExperimentRelease(release), false);
});

test("loading Phase 6.1 releases preserves their original checksum and frozen validation report", async () => {
  const current = await createExperimentRelease({
    releaseId: "legacy-release",
    releaseNumber: 1,
    createdAt: "2026-07-21T12:30:00.000Z",
    releaseNotes: "Frozen before timing diagnostics",
    studio: createExperimentStudioDocument("project-1"),
    review: createCompletedExperimentReleaseReview(),
  });
  const legacyStudio = { ...current.studio } as Record<string, unknown>;
  legacyStudio.schemaVersion = 5;
  delete legacyStudio.timingDiagnostic;
  const legacyManifest = { ...current.manifest } as Record<string, unknown>;
  legacyManifest.formatVersion = 1;
  legacyManifest.studySchemaVersion = 5;
  delete legacyManifest.timingDiagnostic;
  const legacyPayload = {
    releaseId: current.releaseId,
    projectId: current.projectId,
    releaseNumber: current.releaseNumber,
    createdAt: current.createdAt,
    releaseNotes: current.releaseNotes,
    manifest: legacyManifest,
    studio: legacyStudio,
  };
  const legacyRelease = {
    ...legacyPayload,
    checksum: await sha256Checksum(legacyPayload),
  };

  const normalized = normalizeExperimentRelease(legacyRelease);
  assert.ok(normalized);
  assert.equal(normalized.manifest.formatVersion, 1);
  assert.equal(normalized.manifest.timingDiagnostic, undefined);
  assert.equal(await verifyExperimentRelease(normalized), true);
});

test("release loading rejects malformed or oversized frozen study payloads", async () => {
  const release = await createExperimentRelease({
    releaseId: "bounded-release",
    releaseNumber: 1,
    createdAt: "2026-07-21T13:00:00.000Z",
    releaseNotes: "Payload boundary test",
    studio: createExperimentStudioDocument("project-1"),
    review: createCompletedExperimentReleaseReview(),
  });

  const malformed = JSON.parse(JSON.stringify(release));
  malformed.studio.blocks = "not-an-array";
  assert.equal(normalizeExperimentRelease(malformed), null);

  const oversized = JSON.parse(JSON.stringify(release));
  oversized.studio.title = "x".repeat(500_000);
  assert.equal(normalizeExperimentRelease(oversized), null);
});

test("release creation requires an explicit researcher review checklist", async () => {
  const studio = createExperimentStudioDocument("project-1");
  await assert.rejects(() => createExperimentRelease({
    releaseId: "release-unreviewed",
    releaseNumber: 1,
    createdAt: "2026-07-20T12:30:00.000Z",
    releaseNotes: "Not reviewed",
    studio,
    review: {
      ...createCompletedExperimentReleaseReview(),
      draftRehearsed: false,
    },
  }), /release review checklist/);
});

test("blocking Studio errors prevent a release", () => {
  const studio = createExperimentStudioDocument("project-1");
  studio.blocks[3].variableName = "1 invalid";
  assert.equal(canFreezeExperimentRelease(studio), false);
});

test("release validation records unreachable screens and scientific advisories", () => {
  const studio = createExperimentStudioDocument("project-1");
  studio.blocks[0].nextBlockId = "__end__";
  const issues = collectExperimentReleaseValidation(studio);
  assert.ok(issues.some((issue) => issue.id.startsWith("unreachable-")));
  assert.ok(issues.some((issue) => issue.id === "browser-timing-claim"));
});

test("timed releases record representative-device diagnostics without treating them as certification", async () => {
  const studio = createExperimentStudioDocument("project-1");
  studio.blocks[3].responseDeadlineMs = 1_500;
  assert.ok(collectExperimentReleaseValidation(studio).some((issue) => issue.id === "timing-diagnostic-missing"));

  studio.timingDiagnostic = {
    schemaVersion: 1,
    diagnosticId: "diagnostic-1",
    engineVersion: "cerise-browser-timing-1",
    recordedAt: "2026-07-26T18:00:00.000Z",
    status: "stable",
    performanceNowResolutionMs: 0.01,
    animationFrameSampleCount: 72,
    animationFrameMedianMs: 16.667,
    animationFrameP95Ms: 16.9,
    animationFrameJankRate: 0,
    timeoutSampleCount: 24,
    timeoutTargetMs: 20,
    timeoutMedianDriftMs: 0.8,
    timeoutP95DriftMs: 2.1,
    interruptionCount: 0,
  };
  assert.equal(
    collectExperimentReleaseValidation(studio).some((issue) => issue.id === "timing-diagnostic-missing"),
    false,
  );
  const release = await createExperimentRelease({
    releaseId: "release-timing",
    releaseNumber: 1,
    createdAt: "2026-07-26T18:05:00.000Z",
    releaseNotes: "Representative browser checked",
    studio,
    review: createCompletedExperimentReleaseReview(),
  });
  assert.equal(release.manifest.timingDiagnostic?.diagnosticId, "diagnostic-1");
  assert.equal(release.manifest.timingClaim, "browser-measured");
});
