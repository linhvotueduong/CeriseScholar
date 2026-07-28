import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import test from "node:test";
import { createExperimentStudioDocument } from "./experimentStudio";
import { createCompletedExperimentReleaseReview, createExperimentRelease } from "./experimentRelease";
import { buildExperimentCollectorPackage } from "./experimentCollectorPackage";

test("the local collector is a self-contained SQLite service with no cloud response path", async () => {
  const studio = createExperimentStudioDocument("project-1");
  const release = await createExperimentRelease({
    releaseId: "b5b3de1c-651c-4f29-84af-d28b867a70bb",
    releaseNumber: 3,
    createdAt: "2026-07-20T18:00:00.000Z",
    releaseNotes: "Pilot",
    studio,
    review: createCompletedExperimentReleaseReview(),
  });
  const collector = buildExperimentCollectorPackage(release);

  assert.equal(collector.filename, "untitled-experimental-study-release-3-collector.mjs");
  assert.match(collector.source, /node:sqlite/);
  assert.match(collector.source, /127\.0\.0\.1/);
  assert.match(collector.source, /--lan/);
  assert.match(collector.source, /idempotency_key TEXT PRIMARY KEY/);
  assert.match(collector.source, /checkpoint_sequence INTEGER NOT NULL/);
  assert.match(collector.source, /excluded\.checkpoint_sequence>=sessions\.checkpoint_sequence/);
  assert.match(collector.source, /trials\.csv/);
  assert.match(collector.source, /exportTrialsCsv/);
  assert.match(collector.source, /MAX_BODY_BYTES=4\*1024\*1024/);
  assert.match(collector.source, /origin&&origin!==expectedOrigin/);
  assert.match(collector.source, new RegExp(release.checksum));
  assert.match(collector.source, /Local Pilot Collector/);
  assert.doesNotMatch(collector.source, /fetch\(["']https:|api\.openai\.com|api\.openrouter\.ai|supabase\.co/i);
});

test("the generated local collector is valid executable ESM", async () => {
  const studio = createExperimentStudioDocument("project-1");
  const release = await createExperimentRelease({
    releaseId: "45dc5f4f-74d2-47e4-8ad0-709856b3cf3b",
    releaseNumber: 1,
    createdAt: "2026-07-20T18:00:00.000Z",
    releaseNotes: "Syntax validation",
    studio,
    review: createCompletedExperimentReleaseReview(),
  });
  const collector = buildExperimentCollectorPackage(release);
  const directory = mkdtempSync(join(tmpdir(), "cerise-collector-test-"));
  const pathname = join(directory, collector.filename);
  try {
    writeFileSync(pathname, collector.source, "utf8");
    const result = spawnSync(process.execPath, ["--check", pathname], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("the local collector accepts same-origin checkpoints and preserves the newest sequence", async () => {
  const studio = createExperimentStudioDocument("project-1");
  const release = await createExperimentRelease({
    releaseId: "4ed0bd77-f64d-4bfa-837a-e5a77787c852",
    releaseNumber: 2,
    createdAt: "2026-07-20T18:00:00.000Z",
    releaseNotes: "Collector smoke test",
    studio,
    review: createCompletedExperimentReleaseReview(),
  });
  const collector = buildExperimentCollectorPackage(release);
  const directory = mkdtempSync(join(tmpdir(), "cerise-collector-smoke-"));
  const pathname = join(directory, collector.filename);
  writeFileSync(pathname, collector.source, "utf8");
  const child = spawn(process.execPath, [pathname], { cwd: directory, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => { output += chunk; });
  try {
    const deadline = Date.now() + 5_000;
    while (!output.includes("Researcher dashboard:") && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    const participant = output.match(/Participant URL: (http:\/\/[^\s]+)/)?.[1];
    const admin = output.match(/Researcher dashboard: (http:\/\/[^\s]+)/)?.[1];
    assert.ok(participant, output);
    assert.ok(admin, output);
    assert.equal((await fetch(participant)).status, 200);

    const checkpoint = (sequence: number, answer: string, status = "started") => ({
      checkpointVersion: 1,
      checkpointSequence: sequence,
      idempotencyKey: `session-1:${sequence}:${answer || status}`,
      releaseId: release.releaseId,
      releaseNumber: release.releaseNumber,
      releaseChecksum: release.checksum,
      sessionId: "session-1",
      status,
      currentIndex: 3,
      condition: { id: "condition-all", name: "All participants" },
      responses: answer ? { "block-rating-1": answer } : {},
      timings: [],
      events: [],
      history: [],
      startedAt: "2026-07-20T18:01:00.000Z",
      updatedAt: new Date().toISOString(),
      executionMode: "pilot",
    });
    const post = (body: unknown, origin = participant) => fetch(`${participant}/api/checkpoints`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify(body),
    });
    assert.equal((await post(checkpoint(1, "4"))).status, 200);
    assert.equal((await post(checkpoint(2, "6"))).status, 200);
    assert.equal((await post(checkpoint(1, "2"))).status, 200);
    assert.equal((await post(checkpoint(3, "7"), "https://example.invalid")).status, 403);

    let exported = await (await fetch(`${admin}/responses.json`)).json() as { sessions: Array<{ status?: string; responses?: Record<string, string> }> };
    assert.equal(exported.sessions[0]?.responses?.["block-rating-1"], "6");

    assert.equal((await post(checkpoint(3, "", "withdrawn"))).status, 200);
    exported = await (await fetch(`${admin}/responses.json`)).json() as { sessions: Array<{ status?: string; responses?: Record<string, string> }> };
    assert.equal(exported.sessions[0]?.status, "withdrawn");
    assert.deepEqual(exported.sessions[0]?.responses, {});
  } finally {
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      if (child.exitCode !== null) resolve();
      else child.once("exit", () => resolve());
    });
    rmSync(directory, { force: true, recursive: true });
  }
});
