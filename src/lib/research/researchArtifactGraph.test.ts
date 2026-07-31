import assert from "node:assert/strict";
import test from "node:test";
import {
  collectResearchArtifactInvalidations,
  STAGE_3_RESEARCH_ARTIFACT_GRAPH,
  validateResearchArtifactGraph,
} from "./researchArtifactGraph";

test("the Stage 3 dependency graph is acyclic and fully reasoned", () => {
  assert.deepEqual(validateResearchArtifactGraph(STAGE_3_RESEARCH_ARTIFACT_GRAPH), []);
  assert.ok(STAGE_3_RESEARCH_ARTIFACT_GRAPH.dependencies.every((edge) => edge.reason.length > 0));
});

test("a Studio change reconciles consent and invalidates contract and candidate review", () => {
  const invalidations = collectResearchArtifactInvalidations(["experiment-studio"]);
  const byKind = new Map(invalidations.map((item) => [item.artifactKind, item]));

  assert.equal(byKind.get("consent-protocol")?.action, "reconcile");
  assert.equal(byKind.get("analysis-contract")?.action, "reverify");
  assert.equal(byKind.get("pilot-candidate")?.action, "refreeze");
  assert.equal(byKind.get("governance-review")?.action, "rereview");
  assert.equal(byKind.get("host-readiness")?.action, "reverify");
  assert.equal(byKind.get("collection-authorization")?.action, "reverify");
});

test("multiple upstream changes are deduplicated and retain every changed source", () => {
  const invalidations = collectResearchArtifactInvalidations(["study-design", "participant-plan"]);
  const contract = invalidations.find((item) => item.artifactKind === "analysis-contract");
  assert.ok(contract);
  assert.deepEqual(contract.changedSources, ["participant-plan", "study-design"]);
  assert.equal(invalidations.filter((item) => item.artifactKind === "pilot-candidate").length, 1);
});

test("invalid custom graphs fail closed", () => {
  assert.deepEqual(validateResearchArtifactGraph({
    schemaVersion: 1,
    dependencies: [{
      source: "study-design",
      target: "study-design",
      action: "recompute",
      reason: "invalid",
    }],
  }), ["dependency-cycle", "self-dependency:study-design->study-design"]);
});
