import assert from "node:assert/strict";
import test from "node:test";
import { RESEARCH_PATH_STAGES } from "./researchPathConfig";

test("Stage 2 consolidates proposal writing into one Paper Writer step", () => {
  const stage = RESEARCH_PATH_STAGES.find((item) => item.id === "stage-02");

  assert.ok(stage);
  assert.equal(stage.steps.length, 3);
  assert.deepEqual(
    stage.steps.map((step) => step.shortTitle),
    ["RQ Roadmaps", "Literature Review", "Write Proposal"],
  );
  assert.deepEqual(
    stage.steps.map((step) => step.id),
    ["stage-02-step-02", "stage-02-step-01", "stage-02-step-03"],
  );
  assert.equal(stage.steps[0].canvas, "proposal-roadmaps");
  assert.equal(stage.steps[1].canvas, "proposal-literature");
  assert.equal(stage.steps[2].canvas, "proposal-paper");
});

test("Stage 3 preserves its six persisted step ids while introducing the study builder", () => {
  const stage = RESEARCH_PATH_STAGES.find((item) => item.id === "stage-03");

  assert.ok(stage);
  assert.equal(stage.title, "Design and Build the Study");
  assert.equal(stage.deliverable, "Runnable Study Prototype and Design Specification");
  assert.deepEqual(
    stage.steps.map((step) => step.id),
    [
      "stage-03-step-01",
      "stage-03-step-02",
      "stage-03-step-03",
      "stage-03-step-04",
      "stage-03-step-05",
      "stage-03-step-06",
    ],
  );
  assert.deepEqual(
    stage.steps.slice(0, 3).map((step) => step.canvas),
    ["study-design", "study-measures", "study-participants"],
  );
  assert.equal(stage.steps[3].canvas, "experiment-studio-launcher");
});

test("Stage 6 adds analysis planning without shifting persisted analysis-step ids", () => {
  const stage = RESEARCH_PATH_STAGES.find((item) => item.id === "stage-06");

  assert.ok(stage);
  assert.equal(stage.steps[0].id, "stage-06-analysis-plan");
  assert.equal(stage.steps[0].canvas, "analysis-plan-launcher");
  assert.equal(stage.steps[1].id, "stage-06-data-intake");
  assert.equal(stage.steps[1].canvas, "data-intake-audit-launcher");
  assert.equal(stage.steps[2].id, "stage-06-step-01");
  assert.equal(stage.steps[2].canvas, "data-preparation-launcher");
  assert.deepEqual(
    stage.steps.slice(2).map((step) => step.id),
    [
      "stage-06-step-01",
      "stage-06-step-02",
      "stage-06-step-03",
      "stage-06-step-04",
      "stage-06-step-05",
    ],
  );
});
