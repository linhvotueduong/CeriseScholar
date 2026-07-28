import assert from "node:assert/strict";
import test from "node:test";
import { createExperimentStudioDocument } from "./experimentStudio";
import {
  createCompletedExperimentReleaseReview,
  createExperimentRelease,
} from "./experimentRelease";
import {
  analysisPlanStorageKey,
  collectAnalysisPlanReadiness,
  createAnalysisPlanDocument,
  normalizeAnalysisPlanDocument,
  readAnalysisPlanDocument,
  writeAnalysisPlanDocument,
} from "./analysisPlan";
import { EMPTY_RESEARCH_PATH_DRAFT } from "./researchPathDraft";
import { createStudyDesignDocument } from "./studyDesign";

async function analysisRelease() {
  const studio = createExperimentStudioDocument("project-analysis-plan");
  const design = createStudyDesignDocument("project-analysis-plan", EMPTY_RESEARCH_PATH_DRAFT);
  design.spec.researchQuestions[0] = {
    ...design.spec.researchQuestions[0],
    id: "rq-stress",
    question: "Does the intervention reduce stress?",
    hypothesis: "Intervention participants report lower stress.",
    construct: "Stress",
    constructRole: "outcome",
    operationalDefinition: "Post-intervention stress response",
    measure: studio.blocks[3].variableName,
    expectedDirection: "Lower",
  };
  design.spec.participants.targetPopulation = "International students";
  return createExperimentRelease({
    releaseId: "release-analysis-plan",
    releaseNumber: 3,
    createdAt: "2026-07-28T20:00:00.000Z",
    releaseNotes: "Analysis planning release",
    studio,
    studyDesign: design,
    review: createCompletedExperimentReleaseReview(),
  });
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    values,
  };
}

test("creates a release-bound analysis plan without mutating the frozen contract", async () => {
  const release = await analysisRelease();
  const frozenContract = structuredClone(release.manifest.analysisContract);
  const plan = createAnalysisPlanDocument(release, "2026-07-28T21:00:00.000Z");

  assert.ok(plan);
  assert.equal(plan.releaseChecksum, release.checksum);
  assert.equal(plan.contractChecksum, release.manifest.analysisContractChecksum);
  assert.equal(plan.researchQuestions[0].estimand.population, "International students");
  assert.equal(plan.dataAccessDeclaration, "not-declared");
  assert.deepEqual(release.manifest.analysisContract, frozenContract);
  assert.deepEqual(normalizeAnalysisPlanDocument(plan, release), plan);
});

test("rejects release drift, forged frozen wording, and unknown variable mappings", async () => {
  const release = await analysisRelease();
  const plan = createAnalysisPlanDocument(release);
  assert.ok(plan);

  const wrongRelease = structuredClone(plan);
  wrongRelease.releaseChecksum = "tampered";
  assert.equal(normalizeAnalysisPlanDocument(wrongRelease, release), null);

  const changedQuestion = structuredClone(plan);
  changedQuestion.researchQuestions[0].question = "A rewritten frozen question";
  assert.equal(normalizeAnalysisPlanDocument(changedQuestion, release), null);

  const unknownVariable = structuredClone(plan);
  unknownVariable.researchQuestions[0].outcomeVariables = ["unknown"];
  assert.equal(normalizeAnalysisPlanDocument(unknownVariable, release), null);
});

test("recomputes readiness and keeps malformed local storage inert", async () => {
  const release = await analysisRelease();
  const plan = createAnalysisPlanDocument(release);
  assert.ok(plan);

  const forged = structuredClone(plan);
  forged.readiness.status = "ready";
  forged.readiness.completedDecisions = forged.readiness.totalDecisions;
  forged.readiness.issues = [];
  forged.researchQuestions[0].plannedMethod = "   ";
  const normalized = normalizeAnalysisPlanDocument(forged, release);
  assert.ok(normalized);
  assert.equal(normalized.readiness.status, "needs-planning");
  assert.ok(normalized.readiness.issues.length > 0);
  assert.deepEqual(normalized.readiness, collectAnalysisPlanReadiness(normalized));

  const storage = memoryStorage();
  writeAnalysisPlanDocument(storage, release, plan);
  assert.deepEqual(readAnalysisPlanDocument(storage, release), plan);
  storage.values.set(analysisPlanStorageKey(release.projectId, release.releaseId), "{bad-json");
  assert.equal(readAnalysisPlanDocument(storage, release), null);
});

test("a complete analysis plan becomes ready without claiming preregistration", async () => {
  const release = await analysisRelease();
  const plan = createAnalysisPlanDocument(release);
  assert.ok(plan);

  plan.dataAccessDeclaration = "not-accessed";
  for (const question of plan.researchQuestions) {
    question.designation = "primary";
    question.estimand.population = question.estimand.population || "Participants";
    question.estimand.outcome = question.estimand.outcome || "Primary outcome";
    question.outcomeVariables = question.outcomeVariables.length > 0
      ? question.outcomeVariables
      : [plan.variables[0].name];
    question.unitOfAnalysis = "participant";
    question.plannedMethod = "Linear regression";
    question.missingDataStrategy = "Report missingness and use complete cases for the primary analysis.";
    question.multiplicityStrategy = "No adjustment: one primary research question.";
  }

  const normalized = normalizeAnalysisPlanDocument(plan, release);
  assert.ok(normalized);
  assert.equal(normalized.readiness.status, "ready");
  assert.equal(normalized.readiness.completedDecisions, normalized.readiness.totalDecisions);
  assert.equal("preregistered" in normalized, false);
});
