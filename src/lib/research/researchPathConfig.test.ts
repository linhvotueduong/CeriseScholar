import assert from "node:assert/strict";
import test from "node:test";
import { RESEARCH_PATH_STAGES } from "./researchPathConfig";

test("Stage 1 uses the five semantic research-framing steps", () => {
  const stage = RESEARCH_PATH_STAGES.find((item) => item.id === "stage-01");
  assert.ok(stage);
  assert.equal(stage.deliverable, "Research Pathway Brief");
  assert.deepEqual(stage.steps.map((step) => step.id), [
    "stage-01-capture-concern",
    "stage-01-shape-problems",
    "stage-01-explore-baseline",
    "stage-01-develop-questions",
    "stage-01-choose-pathway",
  ]);
  assert.ok(stage.steps.every((step) => step.canvas === "research-framing"));
});

test("Stage 2 exposes the seven-step source-traceable proposal workflow without shifting legacy draft ids", () => {
  const stage = RESEARCH_PATH_STAGES.find((item) => item.id === "stage-02");

  assert.ok(stage);
  assert.equal(stage.deliverable, "Reviewed Proposal Baseline and Stage 3 Handoff");
  assert.equal(stage.steps.length, 7);
  assert.deepEqual(
    stage.steps.map((step) => step.shortTitle),
    ["Confirm Brief", "Evidence Strategy", "Review Sources", "Synthesize Gap", "Proposed Study", "Compose Proposal", "Verify & Handoff"],
  );
  assert.deepEqual(
    stage.steps.map((step) => step.id),
    [
      "stage-02-confirm-brief",
      "stage-02-step-01",
      "stage-02-review-sources",
      "stage-02-synthesize-gap",
      "stage-02-step-02",
      "stage-02-step-03",
      "stage-02-verify-handoff",
    ],
  );
  assert.deepEqual(
    stage.steps.map((step) => step.canvas),
    [
      "proposal-brief",
      "proposal-evidence-strategy",
      "proposal-evidence-review",
      "proposal-synthesis",
      "proposal-study-contract",
      "proposal-compose",
      "proposal-verify",
    ],
  );
});

test("Stage 3 places consent after study implementation without shifting persisted step ids", () => {
  const stage = RESEARCH_PATH_STAGES.find((item) => item.id === "stage-03");

  assert.ok(stage);
  assert.equal(stage.title, "Design and Build the Study");
  assert.equal(stage.deliverable, "Runnable Study Prototype, Consent Protocol, and Design Specification");
  assert.deepEqual(
    stage.steps.map((step) => step.id),
    [
      "stage-03-step-01",
      "stage-03-step-02",
      "stage-03-step-03",
      "stage-03-step-04",
      "stage-03-consent",
      "stage-03-step-05",
      "stage-03-step-06",
    ],
  );
  assert.deepEqual(
    stage.steps.slice(0, 3).map((step) => step.canvas),
    ["study-design", "study-measures", "study-participants"],
  );
  assert.equal(stage.steps[3].canvas, "experiment-studio-launcher");
  assert.equal(stage.steps[4].canvas, "consent-workspace");
  assert.equal(stage.steps[5].canvas, "guided");
});

test("Stage 6 adds release-bound analysis tools without shifting persisted step ids", () => {
  const stage = RESEARCH_PATH_STAGES.find((item) => item.id === "stage-06");

  assert.ok(stage);
  assert.equal(stage.steps[0].id, "stage-06-analysis-plan");
  assert.equal(stage.steps[0].canvas, "analysis-plan-launcher");
  assert.equal(stage.steps[1].id, "stage-06-data-intake");
  assert.equal(stage.steps[1].canvas, "data-intake-audit-launcher");
  assert.equal(stage.steps[2].id, "stage-06-step-01");
  assert.equal(stage.steps[2].canvas, "data-preparation-launcher");
  assert.equal(stage.steps[3].id, "stage-06-step-02");
  assert.equal(stage.steps[3].canvas, "data-quality-review-launcher");
  assert.equal(stage.steps[4].id, "stage-06-step-03");
  assert.equal(stage.steps[4].canvas, "analysis-execution-launcher");
  assert.equal(stage.steps[5].id, "stage-06-step-04");
  assert.equal(stage.steps[5].canvas, "analysis-robustness-launcher");
  assert.equal(stage.steps[6].id, "stage-06-step-05");
  assert.equal(stage.steps[6].canvas, "analysis-results-launcher");
  assert.equal(stage.steps[7].id, "stage-06-ai-reviewer");
  assert.equal(stage.steps[7].canvas, "analysis-reviewer-launcher");
  assert.equal(stage.steps[8].id, "stage-06-qualitative-analysis");
  assert.equal(stage.steps[8].canvas, "qualitative-analysis-launcher");
  assert.deepEqual(
    stage.steps.slice(2, 7).map((step) => step.id),
    [
      "stage-06-step-01",
      "stage-06-step-02",
      "stage-06-step-03",
      "stage-06-step-04",
      "stage-06-step-05",
    ],
  );
});

test("Stage 8 appends the reproducibility package without shifting persisted step ids", () => {
  const stage = RESEARCH_PATH_STAGES.find((item) => item.id === "stage-08");

  assert.ok(stage);
  assert.deepEqual(
    stage.steps.slice(0, 4).map((step) => step.id),
    [
      "stage-08-step-01",
      "stage-08-step-02",
      "stage-08-step-03",
      "stage-08-step-04",
    ],
  );
  assert.equal(stage.steps[4].id, "stage-08-reproducibility-package");
  assert.equal(stage.steps[4].canvas, "reproducibility-package-launcher");
});
