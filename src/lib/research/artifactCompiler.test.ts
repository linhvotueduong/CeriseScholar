import assert from "node:assert/strict";
import test from "node:test";
import {
  createResearchArtifactApplyPreview,
  diffResearchArtifacts,
  runResearchArtifactCompiler,
  type ResearchArtifactCompiler,
} from "./artifactCompiler";

interface Input {
  schemaVersion: 1;
  title: string;
}

interface Output {
  schemaVersion: 1;
  slug: string;
}

const compiler: ResearchArtifactCompiler<Input, Output> = {
  compilerId: "fixture-compiler",
  compilerVersion: 1,
  artifactKind: "fixture-output",
  artifactSchemaVersion: 1,
  normalizeInput(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const title = "title" in value && typeof value.title === "string" ? value.title.trim().slice(0, 100) : "";
    return title ? { schemaVersion: 1, title } : null;
  },
  compile(input) {
    return { schemaVersion: 1, slug: input.title.toLowerCase().replace(/\s+/g, "-") };
  },
  collectIssues(output) {
    return output.slug.includes("review")
      ? [{
          id: "needs_review",
          severity: "warning",
          category: "Fixture Check",
          message: "Review the generated fixture.",
          repairTarget: "Fixture Output",
          sourceReferences: [],
        }]
      : [];
  },
};

test("compiler foundation normalizes input, derives readiness, and creates an identity", async () => {
  const result = await runResearchArtifactCompiler(compiler, { title: "Needs Review", ignored: true }, "fixture-1");

  assert.deepEqual(result.input, { schemaVersion: 1, title: "Needs Review" });
  assert.deepEqual(result.output, { schemaVersion: 1, slug: "needs-review" });
  assert.equal(result.readiness.status, "review");
  assert.equal(result.issues[0]?.id, "needs-review");
  assert.match(result.identity.checksum, /^sha256:[a-f0-9]{64}$/);
  await assert.rejects(runResearchArtifactCompiler(compiler, { title: "" }, "fixture-1"), /input is invalid/);
});

test("semantic diffs expose paths and hashes without copying research content", async () => {
  const before = { title: "Sensitive interview topic", modules: ["survey"], old: true };
  const after = { title: "Revised sensitive topic", modules: ["survey", "interview"], added: true };
  const changes = await diffResearchArtifacts(before, after);
  const serialized = JSON.stringify(changes);

  assert.ok(changes.some((change) => change.path === "/title" && change.kind === "changed"));
  assert.ok(changes.some((change) => change.path === "/modules/1" && change.kind === "added"));
  assert.ok(changes.some((change) => change.path === "/old" && change.kind === "removed"));
  assert.doesNotMatch(serialized, /Sensitive interview topic|Revised sensitive topic/);
});

test("apply preview requires explicit accepted decisions and reasons", async () => {
  const current = { a: 1 };
  const candidate = { a: 2, b: true };
  const changes = await diffResearchArtifacts(current, candidate);
  const partial = await createResearchArtifactApplyPreview(current, candidate, [{
    changeId: changes[0].id,
    decision: "accept",
    reason: "Researcher accepted this bounded change.",
  }]);
  assert.equal(partial.canApplyWholeCandidate, false);
  assert.equal(partial.summary.deferred, 1);

  const accepted = await createResearchArtifactApplyPreview(
    current,
    candidate,
    changes.map((change) => ({
      changeId: change.id,
      decision: "accept" as const,
      reason: "Researcher accepted this bounded change.",
    })),
  );
  assert.equal(accepted.canApplyWholeCandidate, true);
  assert.equal(accepted.summary.accepted, changes.length);
});
