import assert from "node:assert/strict";
import test from "node:test";
import { Script } from "node:vm";
import { createExperimentBlock, createExperimentStudioDocument } from "./experimentStudio";
import {
  buildExperimentRunnerPackage,
  canBuildExperimentRunnerPackage,
  collectExperimentPackageChecks,
  escapeExperimentCsvCell,
  experimentRunnerFilename,
  normalizeExperimentRunnerFilename,
} from "./experimentRunnerPackage";

test("the local runner is one offline HTML file with a restrictive CSP", () => {
  const document = createExperimentStudioDocument("project-1");
  document.title = "International Student Stress Study";
  const runner = buildExperimentRunnerPackage(document, {
    nonce: "0123456789abcdef0123456789abcdef",
  });

  assert.equal(runner.filename, "international-student-stress-study.html");
  assert.equal(runner.mimeType, "text/html;charset=utf-8");
  assert.match(runner.html, /default-src 'none'/);
  assert.match(runner.html, /connect-src 'none'/);
  assert.match(runner.html, /script-src 'nonce-0123456789abcdef0123456789abcdef'/);
  assert.match(runner.html, /Portable study runner · no network connection/);
  assert.match(runner.html, /indexedDB/);
  assert.match(runner.html, /beforeunload/);
  assert.doesNotMatch(runner.html, /\bfetch\s*\(/);
  assert.doesNotMatch(runner.html, /XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage/);
  assert.doesNotMatch(runner.html, /\beval\s*\(|new\s+Function|document\.write|\.innerHTML\s*=/);
  const scripts = [...runner.html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length >= 2);
  assert.doesNotThrow(() => new Script(scripts.at(-1)?.[1] ?? ""));
});

test("participant-authored text cannot break out of the embedded JSON script", () => {
  const document = createExperimentStudioDocument("project-1");
  document.title = "</script><img src=x onerror=alert(1)>";
  document.blocks[0].prompt = "</script><script>globalThis.compromised=true</script>";
  const runner = buildExperimentRunnerPackage(document, {
    nonce: "fedcba9876543210fedcba9876543210",
  });

  assert.doesNotMatch(runner.html, /<img src=x/);
  assert.doesNotMatch(runner.html, /<script>globalThis\.compromised/);
  assert.match(runner.html, /\\u003c\/script\\u003e/);
  assert.match(runner.html, /&lt;\/script&gt;/);
});

test("approved compact images render locally without adding a network path", () => {
  const document = createExperimentStudioDocument("project-1");
  document.blocks[0].media = {
    kind: "image",
    dataUrl: "data:image/webp;base64,AAAA",
    altText: "Neutral geometric stimulus",
    source: "upload",
  };
  const runner = buildExperimentRunnerPackage(document, { nonce: "0123456789abcdef" });

  assert.match(runner.html, /stimulus-media/);
  assert.match(runner.html, /data:image\/webp;base64,AAAA/);
  assert.match(runner.html, /img-src data: blob:/);
  assert.match(runner.html, /connect-src 'none'/);
});

test("behavioral releases include reproducible trials and explicit scoring metadata", () => {
  const document = createExperimentStudioDocument("project-1");
  const keyboard = document.blocks[3];
  keyboard.type = "keyboard-response";
  keyboard.responseType = "keyboard";
  keyboard.allowedKeys = ["f", "j"];
  keyboard.correctAnswer = "j";
  keyboard.practice = true;
  document.execution.requireFullscreen = true;
  document.execution.logFocusChanges = false;
  const runner = buildExperimentRunnerPackage(document, { nonce: "0123456789abcdef" });

  assert.match(runner.html, /activeKeyHandler/);
  assert.match(runner.html, /shuffledChoices/);
  assert.match(runner.html, /requestFullscreen/);
  assert.match(runner.html, /browser-measured/);
  assert.match(runner.html, /scoring:scoring/);
  assert.match(runner.html, /PRACTICE/);
  assert.match(runner.html, /preloadImages/);
});

test("CSV trial loops are frozen into deterministic runtime and long-format export logic", () => {
  const document = createExperimentStudioDocument("project-1");
  document.trialTables = [{
    id: "stroop-table",
    name: "Stroop trials",
    sourceFilename: "stroop.csv",
    sourceChecksum: `sha256:${"a".repeat(64)}`,
    importedAt: "2026-07-21T12:00:00.000Z",
    columns: ["trial_id", "stimulus", "correct_key", "allowed_keys"],
    rows: [["t1", "RED", "r", "r|b"], ["t2", "BLUE", "b", "r|b"]],
  }];
  const loop = createExperimentBlock("trial-loop", "loop-1");
  loop.trialLoop = {
    tableId: "stroop-table",
    trialIdColumn: "trial_id",
    stimulusColumn: "stimulus",
    correctAnswerColumn: "correct_key",
    allowedKeysColumn: "allowed_keys",
    responseDeadlineColumn: "",
    conditionColumn: "",
    practiceColumn: "",
    order: "shuffle",
    repetitions: 2,
  };
  document.blocks.splice(3, 0, loop);
  const runner = buildExperimentRunnerPackage(document, { nonce: "0123456789abcdef" });

  assert.match(runner.html, /materializeBlocks/);
  assert.match(runner.html, /trialOrder/);
  assert.match(runner.html, /Download trial CSV/);
  assert.match(runner.html, /sourceColumns\.map/);
  assert.match(runner.html, /trial_id/);
  assert.match(runner.html, /packageVersion:4/);
  assert.match(runner.html, /timingDiagnostic/);
});

test("runner filenames are bounded and cannot contain paths", () => {
  assert.equal(experimentRunnerFilename("  A Study: Déjà Vu  "), "a-study-deja-vu.html");
  assert.equal(
    normalizeExperimentRunnerFilename("../../Research / Final.HTML", "Fallback"),
    "research-final.html",
  );
  assert.equal(normalizeExperimentRunnerFilename("", ""), "cerise-study.html");
});

test("CSV cells neutralize spreadsheet formulas and preserve quotes", () => {
  assert.equal(escapeExperimentCsvCell("=2+2"), "\"'=2+2\"");
  assert.equal(escapeExperimentCsvCell("  @SUM(A1:A2)"), "\"'  @SUM(A1:A2)\"");
  assert.equal(escapeExperimentCsvCell('He said "hello"'), '"He said ""hello"""');
});

test("release checks distinguish blocking errors from documented warnings", () => {
  const document = createExperimentStudioDocument("project-1");
  document.blocks = document.blocks.filter((block) => block.type !== "debrief");
  const checks = collectExperimentPackageChecks(document);

  assert.equal(checks.find((check) => check.id === "valid-specification")?.status, "pass");
  assert.equal(checks.find((check) => check.id === "debrief-screen")?.status, "warning");
  assert.equal(checks.find((check) => check.id === "no-network")?.status, "pass");
});

test("a package cannot be generated while the study has blocking errors", () => {
  const document = createExperimentStudioDocument("project-1");
  document.blocks[3].variableName = "1 invalid";

  assert.equal(canBuildExperimentRunnerPackage(document), false);
  assert.throws(
    () => buildExperimentRunnerPackage(document, { nonce: "0123456789abcdef" }),
    /Resolve blocking study errors/,
  );
});
