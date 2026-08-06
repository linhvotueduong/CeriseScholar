import assert from "node:assert/strict";
import test from "node:test";
import {
  STAGE2_STEP1_AI_MENTOR_BOUNDARY,
  STAGE2_STEP1_COPY_CONTRACT,
  STAGE2_STEP1_EXPERIENCE_CONTRACT,
  STAGE2_STEP1_EXPERIENCE_INVARIANTS,
  STAGE2_STEP1_EXPERIENCE_STATES,
  STAGE2_STEP1_PRESENTATION_OPTIONS,
  STAGE2_STEP1_TERM_REGISTRY,
  resolveStage2Step1ExperienceState,
  validateStage2Step1ExperienceContract,
  type Stage2Step1ExperienceFacts,
} from "./stage2Step1ExperienceContract";

const READY_FACTS: Stage2Step1ExperienceFacts = {
  initialization: "loaded",
  stage1Status: "current",
  routeResolved: true,
  authorityStatus: "current",
  requirementsStatus: "persisted",
  researcherConfirmed: true,
  versionConflict: false,
};

test("the Stage 2 Step 1 experience contract is internally valid", () => {
  assert.deepEqual(validateStage2Step1ExperienceContract(), []);
  assert.equal(STAGE2_STEP1_EXPERIENCE_CONTRACT.stageId, "stage-02");
  assert.equal(STAGE2_STEP1_EXPERIENCE_CONTRACT.stepId, "stage-02-confirm-brief");
  assert.equal(STAGE2_STEP1_EXPERIENCE_CONTRACT.nextStepId, "stage-02-step-01");
  assert.equal(STAGE2_STEP1_EXPERIENCE_STATES.length, 11);
});

test("the primary copy explains the decision without leading with engineering jargon", () => {
  assert.equal(STAGE2_STEP1_COPY_CONTRACT.primaryTitle, "Set Up Your Proposal");
  assert.equal(STAGE2_STEP1_COPY_CONTRACT.outcomeLabel, "Proposal Planning Contract");
  assert.doesNotMatch(`${STAGE2_STEP1_COPY_CONTRACT.primaryTitle} ${STAGE2_STEP1_COPY_CONTRACT.description}`, /compiler|schema|checksum|profile id/i);
  assert.deepEqual(STAGE2_STEP1_COPY_CONTRACT.visiblePhases.map((phase) => phase.id), [
    "review-stage1",
    "choose-requirements",
    "confirm-plan",
  ]);
});

test("guided and professional presentation choices never affect canonical artifacts", () => {
  assert.deepEqual(STAGE2_STEP1_PRESENTATION_OPTIONS.guidanceLevels.map((option) => option.id), ["guided", "balanced", "concise"]);
  assert.deepEqual(STAGE2_STEP1_PRESENTATION_OPTIONS.informationDensities.map((option) => option.id), ["comfortable", "dense"]);
  assert.ok(STAGE2_STEP1_PRESENTATION_OPTIONS.guidanceLevels.every((option) => option.artifactImpact === "none"));
  assert.ok(STAGE2_STEP1_PRESENTATION_OPTIONS.informationDensities.every((option) => option.artifactImpact === "none"));
  assert.doesNotMatch(JSON.stringify(STAGE2_STEP1_PRESENTATION_OPTIONS), /beginner|expert/i);
});

test("necessary scholarly terms remain available while engineering terms stay in technical details", () => {
  const byId = new Map(STAGE2_STEP1_TERM_REGISTRY.map((term) => [term.id, term]));
  assert.equal(byId.get("proposal-purpose")?.placement, "primary");
  assert.equal(byId.get("requirements-authority")?.placement, "primary");
  assert.equal(byId.get("compiler")?.placement, "technical-details");
  assert.equal(byId.get("checksum")?.placement, "technical-details");
});

test("ready requires current upstream data, current authority, persisted requirements, and researcher confirmation", () => {
  assert.equal(resolveStage2Step1ExperienceState(READY_FACTS).id, "ready");
  assert.equal(resolveStage2Step1ExperienceState({ ...READY_FACTS, authorityStatus: "not-required" }).id, "ready");
  assert.equal(resolveStage2Step1ExperienceState({ ...READY_FACTS, researcherConfirmed: false }).id, "needs-review");
  assert.equal(resolveStage2Step1ExperienceState({ ...READY_FACTS, requirementsStatus: "compiled" }).id, "saving");
  assert.equal(resolveStage2Step1ExperienceState({ ...READY_FACTS, authorityStatus: "provisional" }).id, "provisional");
  assert.equal(resolveStage2Step1ExperienceState({ ...READY_FACTS, authorityStatus: "required-missing" }).id, "authority-required");
  assert.equal(resolveStage2Step1ExperienceState({ ...READY_FACTS, routeResolved: false }).id, "stage1-incomplete");
});

test("conflict, upstream change, and authority drift take priority and never destroy work", () => {
  assert.equal(resolveStage2Step1ExperienceState({
    ...READY_FACTS,
    versionConflict: true,
    stage1Status: "changed",
    authorityStatus: "drifted",
  }).id, "version-conflict");
  assert.equal(resolveStage2Step1ExperienceState({ ...READY_FACTS, stage1Status: "changed", authorityStatus: "drifted" }).id, "stage1-changed");
  assert.equal(resolveStage2Step1ExperienceState({ ...READY_FACTS, authorityStatus: "drifted" }).id, "authority-changed");
  for (const stateId of ["version-conflict", "stage1-changed", "authority-changed"] as const) {
    const state = STAGE2_STEP1_EXPERIENCE_STATES.find((item) => item.id === stateId);
    assert.equal(state?.canComplete, false);
  }
});

test("completion remains derived instead of being granted by confirmation alone", () => {
  const stage1States: Stage2Step1ExperienceFacts["stage1Status"][] = ["missing", "incomplete", "current", "changed"];
  const authorityStates: Stage2Step1ExperienceFacts["authorityStatus"][] = ["not-required", "current", "provisional", "required-missing", "drifted"];
  const requirementStates: Stage2Step1ExperienceFacts["requirementsStatus"][] = ["empty", "compiled", "persisted"];
  for (const stage1Status of stage1States) {
    for (const authorityStatus of authorityStates) {
      for (const requirementsStatus of requirementStates) {
        const facts = { ...READY_FACTS, stage1Status, authorityStatus, requirementsStatus };
        const result = resolveStage2Step1ExperienceState(facts);
        if (result.id === "ready") {
          assert.equal(stage1Status, "current");
          assert.ok(authorityStatus === "current" || authorityStatus === "not-required");
          assert.equal(requirementsStatus, "persisted");
        }
      }
    }
  }
});

test("scientific, authority, artifact, AI, and stage boundaries are explicit", () => {
  const invariantIds = new Set(STAGE2_STEP1_EXPERIENCE_INVARIANTS.map((invariant) => invariant.id));
  for (const required of [
    "exact-stage1-source",
    "compiler-owns-requirements",
    "constant-rigor",
    "unknown-authority-provisional",
    "authority-drift-blocks",
    "conflicts-non-destructive",
    "route-appropriate-language",
    "no-certification-inflation",
    "ai-review-before-apply",
    "accessible-equivalent-path",
  ]) assert.ok(invariantIds.has(required), required);
  assert.ok(STAGE2_STEP1_AI_MENTOR_BOUNDARY.prohibited.some((action) => /confirm the proposal/i.test(action)));
  assert.ok(STAGE2_STEP1_AI_MENTOR_BOUNDARY.prohibited.some((action) => /claim compliance/i.test(action)));
  assert.match(STAGE2_STEP1_AI_MENTOR_BOUNDARY.applyPolicy, /review-before-apply/);
});
