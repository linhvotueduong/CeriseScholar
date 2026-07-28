import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPERIMENT_TIMING_DIAGNOSTIC_LIMITATION,
  experimentTimingDiagnosticCsv,
  readExperimentTimingDiagnosticReports,
  summarizeExperimentTimingDiagnostic,
  writeExperimentTimingDiagnosticReport,
  type ExperimentTimingDiagnosticReport,
} from "./experimentTimingDiagnostics";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

function stableSummary(interruptionCount = 0) {
  return summarizeExperimentTimingDiagnostic({
    performanceNowDeltasMs: Array.from({ length: 80 }, () => 0.01),
    animationFrameIntervalsMs: Array.from({ length: 72 }, () => 16.667),
    timeoutDriftsMs: Array.from({ length: 24 }, () => 1.2),
  }, {
    diagnosticId: "diagnostic-1",
    recordedAt: "2026-07-26T18:00:00.000Z",
    interruptionCount,
    timeoutTargetMs: 20,
  });
}

test("stable browser samples are described without claiming scientific validity", () => {
  const summary = stableSummary();
  assert.equal(summary.status, "stable");
  assert.equal(summary.animationFrameSampleCount, 72);
  assert.equal(summary.animationFrameJankRate, 0);
  assert.match(EXPERIMENT_TIMING_DIAGNOSTIC_LIMITATION, /does not measure physical display onset/);
});

test("unstable frame pacing and focus loss require researcher review", () => {
  const review = summarizeExperimentTimingDiagnostic({
    performanceNowDeltasMs: [0.01, 0.01, 0.01],
    animationFrameIntervalsMs: Array.from({ length: 72 }, (_, index) => index % 10 === 0 ? 80 : 16.667),
    timeoutDriftsMs: Array.from({ length: 24 }, (_, index) => index > 20 ? 50 : 1),
  }, {
    diagnosticId: "diagnostic-2",
    recordedAt: "2026-07-26T18:01:00.000Z",
    interruptionCount: 0,
    timeoutTargetMs: 20,
  });
  assert.equal(review.status, "review");
  assert.ok(review.reviewNotes.some((note) => note.includes("frame")));

  assert.equal(stableSummary(1).status, "interrupted");
});

test("detailed reports are bounded to local storage and CSV neutralizes formulas", () => {
  const storage = memoryStorage();
  const summary = stableSummary();
  const report: ExperimentTimingDiagnosticReport = {
    ...summary,
    projectId: "project-1",
    environment: {
      userAgent: "Test browser",
      language: "en",
      platform: "=FORMULA",
      viewportWidth: 1_440,
      viewportHeight: 900,
      devicePixelRatio: 2,
      hardwareConcurrency: 8,
      deviceMemoryGb: 16,
      secureContext: true,
      crossOriginIsolated: false,
    },
    samples: {
      performanceNowDeltasMs: [0.01],
      animationFrameIntervalsMs: [16.667],
      timeoutDriftsMs: [1.2],
    },
    reviewNotes: summary.reviewNotes,
    limitation: EXPERIMENT_TIMING_DIAGNOSTIC_LIMITATION,
  };

  writeExperimentTimingDiagnosticReport(storage, report);
  const stored = readExperimentTimingDiagnosticReports(storage, "project-1");
  assert.equal(stored.length, 1);
  assert.equal(stored[0].diagnosticId, report.diagnosticId);
  assert.match(experimentTimingDiagnosticCsv(report), /"'=FORMULA"/);
  assert.deepEqual(readExperimentTimingDiagnosticReports(storage, "another-project"), []);
});
