import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createExperimentStudioDocument } from "./experimentStudio";
import {
  createAnalysisContract,
  normalizeAnalysisContract,
  validateAnalysisContract,
} from "./analysisContract";
import { EMPTY_RESEARCH_PATH_DRAFT } from "./researchPathDraft";
import { createStudyDesignDocument } from "./studyDesign";

test("creates a bounded analysis contract with stable research-question provenance", () => {
  const studio = createExperimentStudioDocument("project-analysis");
  studio.updatedAt = "2026-07-28T18:00:00.000Z";
  const design = createStudyDesignDocument("project-analysis", EMPTY_RESEARCH_PATH_DRAFT);
  design.updatedAt = "2026-07-28T17:00:00.000Z";
  design.spec.researchQuestions[0] = {
    ...design.spec.researchQuestions[0],
    id: "rq-stress",
    question: "Does the intervention reduce perceived stress?",
    hypothesis: "Intervention participants report lower stress.",
    construct: "Perceived stress",
    constructRole: "outcome",
    operationalDefinition: "Post-intervention rating",
    measure: studio.blocks[3].variableName,
    expectedDirection: "Lower",
  };

  const contract = createAnalysisContract(studio, design, "2026-07-28T19:00:00.000Z");
  assert.equal(contract.projectId, "project-analysis");
  assert.equal(contract.researchQuestions[0].id, "rq-stress");
  assert.deepEqual(contract.researchQuestions[0].outcomeVariables, [studio.blocks[3].variableName]);
  assert.equal(contract.provenance.studyDesignUpdatedAt, design.updatedAt);
  assert.equal(contract.dataAccessDeclaration, "not-declared");
  assert.ok(contract.readiness.warningCount > 0);
  assert.deepEqual(
    normalizeAnalysisContract(JSON.parse(JSON.stringify(contract)), studio.projectId),
    contract,
  );
});

test("rejects malformed references and forged readiness metadata", () => {
  const studio = createExperimentStudioDocument("project-analysis");
  const contract = createAnalysisContract(studio, null, "2026-07-28T19:00:00.000Z");

  const malformed = structuredClone(contract);
  malformed.researchQuestions.push({
    id: "rq-invalid",
    question: "Unknown outcome?",
    hypothesis: "",
    designation: "primary",
    construct: "",
    constructRole: "",
    operationalDefinition: "",
    measure: "",
    expectedDirection: "",
    outcomeVariables: ["unknown_variable"],
    predictorVariables: [],
    covariateVariables: [],
    unitOfAnalysis: "participant",
    plannedMethod: "",
    effectSize: "",
    missingDataStrategy: "",
    exclusionRules: [],
    transformations: [],
    multiplicityStrategy: "",
    sensitivityAnalyses: [],
  });
  assert.equal(normalizeAnalysisContract(malformed, studio.projectId), null);

  const forged = structuredClone(contract);
  forged.readiness.status = "ready";
  forged.readiness.warningCount = 0;
  forged.readiness.issues = [];
  assert.equal(normalizeAnalysisContract(forged, studio.projectId), null);
});

test("analysis validation remains advisory until the dedicated planning UI exists", () => {
  const studio = createExperimentStudioDocument("project-analysis");
  const contract = createAnalysisContract(studio, null, "2026-07-28T19:00:00.000Z");
  const issues = validateAnalysisContract(contract);
  assert.ok(issues.some((issue) => issue.id === "analysis-no-research-questions"));
  assert.ok(issues.every((issue) => issue.severity === "warning"));
});

test("the documented Phase 8.0 fixture matches the runtime contract", () => {
  const fixture = JSON.parse(readFileSync(
    new URL("../../../docs/fixtures/phase-8-analysis-contract-v1.json", import.meta.url),
    "utf8",
  ));
  assert.ok(normalizeAnalysisContract(fixture, "project-example"));
});
