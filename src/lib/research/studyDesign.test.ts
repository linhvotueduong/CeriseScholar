import assert from "node:assert/strict";
import test from "node:test";
import { normalizeResearchPathDraft } from "./researchPathDraft";
import {
  createResearchPathStoredDocument,
  normalizeResearchPathStoredDocument,
} from "./researchPathStorage";
import {
  canCompleteStudyStep,
  createStudyDesignDocument,
  estimateTwoGroupSampleSize,
  normalizeStudyDesignDocument,
  validateStudyStep,
} from "./studyDesign";

const pathway = normalizeResearchPathDraft({
  steps: {
    "stage-01-step-03": {
      completed: true,
      fields: {
        "key-question-0": "Does sleep restriction reduce working-memory accuracy?",
        "key-question-1": "How do participants describe fatigue during the task?",
      },
      checks: {},
    },
    "stage-03-step-01": {
      completed: false,
      fields: {
        "prompt-0": "A repeated-measures experiment",
        "prompt-1": "It controls stable participant differences.",
      },
      checks: {},
    },
    "stage-03-step-03": {
      completed: false,
      fields: {
        "prompt-0": "University students aged 18–30",
        "prompt-1": "Purposive campus recruitment",
      },
      checks: {},
    },
  },
});

test("a new study specification inherits research questions and legacy Stage 3 notes", () => {
  const document = createStudyDesignDocument("project-1", pathway);

  assert.equal(document.schemaVersion, 1);
  assert.equal(document.spec.researchQuestions[0].question, "Does sleep restriction reduce working-memory accuracy?");
  assert.equal(document.spec.participants.targetPopulation, "University students aged 18–30");
  assert.match(document.spec.legacyNotes["stage-03-step-01"], /repeated-measures experiment/);
});

test("v1 pathway storage migrates to v2 without deleting old fields", () => {
  const migrated = normalizeResearchPathStoredDocument(pathway, "project-1");

  assert.equal(migrated.version, 2);
  assert.equal(
    migrated.pathway.steps["stage-01-step-03"].fields["key-question-1"],
    "How do participants describe fatigue during the task?",
  );
  assert.equal(migrated.studyDesign.spec.participants.samplingStrategy, "Purposive campus recruitment");
});

test("malformed browser or network data is normalized to a safe project-scoped document", () => {
  const normalized = normalizeStudyDesignDocument(
    { projectId: "attacker-project", spec: { researchQuestions: "not-an-array" } },
    "project-1",
    pathway,
  );

  assert.equal(normalized.projectId, "project-1");
  assert.equal(normalized.spec.researchQuestions.length, 4);
  assert.equal(normalized.spec.researchQuestions[0].question, "Does sleep restriction reduce working-memory accuracy?");
});

test("study completion gates require researcher decisions instead of checkbox-only completion", () => {
  const document = createResearchPathStoredDocument("project-1", pathway).studyDesign;
  assert.equal(canCompleteStudyStep(document.spec, "stage-03-step-01"), false);

  document.spec.design.goal = "test-causal-effect";
  document.spec.design.selectedDesign = "within-subjects";
  document.spec.design.selectionRationale = "The same participants can complete both sleep conditions.";
  document.spec.design.approved = true;

  assert.equal(validateStudyStep(document.spec, "stage-03-step-01").filter((issue) => issue.severity === "required").length, 0);
  assert.equal(canCompleteStudyStep(document.spec, "stage-03-step-01"), true);
});

test("the two-group planning calculator is deterministic and rejects invalid effects", () => {
  assert.equal(estimateTwoGroupSampleSize(0.5, "0.05", "0.80"), 126);
  assert.equal(estimateTwoGroupSampleSize(0, "0.05", "0.80"), null);
  assert.equal(estimateTwoGroupSampleSize(Number.NaN, "0.05", "0.80"), null);
});
