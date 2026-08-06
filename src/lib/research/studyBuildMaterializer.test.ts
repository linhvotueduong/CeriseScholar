import assert from "node:assert/strict";
import test from "node:test";
import { resolveExperimentNextBlockId, validateExperimentStudio } from "./experimentStudio";
import { compileStudyBuildProfile } from "./studyBuildCompiler";
import {
  createStudyBuildCreationReceipt,
  createStudyBuildMaterializationPreview,
  suggestedStudyBuildDecision,
  type StudyBuildRecommendationDecision,
} from "./studyBuildMaterializer";
import type { StudyBuildProfile } from "./studyBuildProfile";
import type { StudyDesignDocument, StudyDesignKind, StudySetting } from "./studyDesign";

function buildDocument(
  designKind: Exclude<StudyDesignKind, "">,
  setting: Exclude<StudySetting, "">,
): StudyDesignDocument {
  return {
    schemaVersion: 1,
    projectId: `phase-3-${designKind}-${setting}`,
    updatedAt: "2026-07-31T12:00:00.000Z",
    spec: {
      design: {
        goal: designKind === "randomized-between" ? "test-causal-effect" : "describe-pattern",
        setting,
        hybridSettings: setting === "hybrid" ? ["online", "laboratory"] : [],
        constraints: "Use the current supported browser runtime.",
        availableDevices: setting === "laboratory" ? "Researcher-managed laptop and keyboard" : "Phone or desktop browser",
        selectedDesign: designKind,
        selectionRationale: "This design directly answers the approved research question.",
        approved: true,
      },
      researchQuestions: [{
        id: "rq-1",
        question: designKind === "randomized-between"
          ? "How does the assigned condition affect task confidence?"
          : "How confident are participants in the stated topic?",
        hypothesis: "Confidence differs in the expected direction.",
        construct: "Task confidence",
        constructRole: "outcome",
        operationalDefinition: "A 1–7 self-report rating collected after the planned procedure.",
        measure: "Seven-point rating scale",
        expectedDirection: "Higher in the intervention condition",
        evidenceNote: "Primary outcome for the approved design.",
      }],
      participants: {
        targetPopulation: "Eligible adults",
        inclusionCriteria: "Adult and able to use the declared device",
        exclusionCriteria: "Does not meet the approved eligibility criteria",
        samplingStrategy: "Declared convenience sample",
        recruitmentChannel: "Approved recruitment route",
        plannedSampleSize: "100",
        sampleSizeRationale: "Pre-study planning rationale",
        expectedEffectSize: "0.5",
        alpha: "0.05",
        power: "0.80",
        conditions: designKind === "randomized-between" ? "Control; Intervention" : "",
        allocationMethod: designKind === "randomized-between" ? "Simple random allocation" : "",
        allocationRatio: designKind === "randomized-between" ? "1:1" : "",
        counterbalancing: "",
        deviceRequirements: setting === "laboratory" ? "Managed keyboard and display" : "Responsive browser",
        accessibilityRequirements: "Keyboard access, screen-reader semantics, reflow, and reduced motion",
        approved: true,
      },
      legacyNotes: {},
    },
  };
}

function decisionsFor(profile: StudyBuildProfile): StudyBuildRecommendationDecision[] {
  return profile.modules.map((recommendation) => ({
    recommendationId: recommendation.id,
    action: suggestedStudyBuildDecision(recommendation),
    note: recommendation.selectionDefault === "configure" ? "Create the safe starter and revise it in Studio." : "",
  }));
}

async function previewFor(document: StudyDesignDocument) {
  const profile = await compileStudyBuildProfile(document);
  const decisions = decisionsFor(profile);
  return {
    profile,
    decisions,
    preview: await createStudyBuildMaterializationPreview({
      profile,
      studyDesign: document,
      projectName: "Phase 3 verification",
      decisions,
      createdAt: "2026-07-31T18:00:00.000Z",
      existingDocument: false,
    }),
  };
}

test("the online survey slice creates a refusal-safe, responsive starting study with an exact preview", async () => {
  const document = buildDocument("cross-sectional-survey", "online");
  const profile = await compileStudyBuildProfile(document);
  const decisions = decisionsFor(profile).map((decision) => (
    decision.recommendationId === "design.survey.demographics"
      ? { ...decision, action: "accept" as const }
      : decision
  ));
  const preview = await createStudyBuildMaterializationPreview({
    profile,
    studyDesign: document,
    projectName: "Home confidence survey",
    decisions,
    createdAt: "2026-07-31T18:00:00.000Z",
    existingDocument: false,
  });

  assert.equal(preview.slice, "online-survey");
  assert.equal(preview.canCreate, true);
  assert.ok(preview.candidateChecksum?.startsWith("sha256:"));
  assert.ok(preview.exactChangedPaths.length > 0);
  assert.deepEqual(validateExperimentStudio(preview.candidate!).filter((issue) => issue.severity === "error"), []);
  assert.equal(preview.candidate?.assignment.method, "single");
  assert.deepEqual(preview.candidate?.execution, {
    allowBackNavigation: true,
    requireFullscreen: false,
    logFocusChanges: false,
  });
  assert.ok(preview.candidate?.blocks.some((block) => block.id === "block-survey-measure-rq-1"));
  assert.ok(preview.candidate?.blocks.some((block) => block.id === "block-optional-demographic" && !block.required));
  assert.ok(preview.candidate?.branchRules.some((rule) => rule.id === "branch-survey-not-applicable"));

  const consent = preview.candidate?.blocks.find((block) => block.id === "block-consent-reference");
  assert.ok(consent);
  assert.match(consent.heading, /added in Step 05/);
  assert.equal(resolveExperimentNextBlockId(
    preview.candidate!,
    consent.id,
    { [consent.id]: consent.choices[1] },
    "condition-all",
  ), "__end__");
});

test("the randomized laboratory slice creates auditable allocation and condition-aware task routing", async () => {
  const { preview } = await previewFor(buildDocument("randomized-between", "laboratory"));
  assert.equal(preview.slice, "randomized-laboratory");
  assert.equal(preview.canCreate, true);
  assert.deepEqual(validateExperimentStudio(preview.candidate!).filter((issue) => issue.severity === "error"), []);
  assert.equal(preview.candidate?.assignment.method, "random");
  assert.deepEqual(preview.candidate?.conditions.map((condition) => condition.name), ["Control", "Intervention"]);
  assert.equal(preview.candidate?.branchRules.filter((rule) => rule.conditionId).length, 2);
  assert.ok(preview.candidate?.blocks.some((block) => block.id === "block-condition-task" && block.responseType === "keyboard"));
  assert.ok(preview.candidate?.blocks.some((block) => block.id === "block-manipulation-check"));
  assert.ok(preview.changes.some((item) => item.id === "declare-session-reset-boundary"));
});

test("the two supported slices materialize materially different Studio documents", async () => {
  const survey = await previewFor(buildDocument("cross-sectional-survey", "online"));
  const laboratory = await previewFor(buildDocument("randomized-between", "laboratory"));
  assert.notEqual(survey.preview.candidateChecksum, laboratory.preview.candidateChecksum);
  assert.equal(survey.preview.candidate?.assignment.method, "single");
  assert.equal(laboratory.preview.candidate?.assignment.method, "random");
  assert.ok(survey.preview.candidate?.blocks.some((block) => block.id === "block-survey-instructions"));
  assert.equal(survey.preview.candidate?.blocks.some((block) => block.id === "block-researcher-handoff"), false);
  assert.ok(laboratory.preview.candidate?.blocks.some((block) => block.id === "block-researcher-handoff"));
  assert.equal(laboratory.preview.candidate?.blocks.some((block) => block.id === "block-survey-instructions"), false);
});

test("required recommendation refusal, incomplete modification, and existing Studio work all fail closed", async () => {
  const document = buildDocument("cross-sectional-survey", "online");
  const profile = await compileStudyBuildProfile(document);
  const base = decisionsFor(profile);
  const requiredId = profile.modules.find((recommendation) => recommendation.status === "required")!.id;

  for (const decisions of [
    base.map((decision) => decision.recommendationId === requiredId ? { ...decision, action: "decline" as const } : decision),
    base.map((decision) => decision.recommendationId === requiredId ? { ...decision, action: "modify" as const, note: "" } : decision),
  ]) {
    const preview = await createStudyBuildMaterializationPreview({
      profile,
      studyDesign: document,
      projectName: "Blocked survey",
      decisions,
      createdAt: "2026-07-31T18:00:00.000Z",
      existingDocument: false,
    });
    assert.equal(preview.canCreate, false);
    assert.equal(preview.candidate, null);
    assert.ok(preview.issues.some((issue) => issue.recommendationId === requiredId));
  }

  const existing = await createStudyBuildMaterializationPreview({
    profile,
    studyDesign: document,
    projectName: "Protected survey",
    decisions: base,
    createdAt: "2026-07-31T18:00:00.000Z",
    existingDocument: true,
  });
  assert.equal(existing.canCreate, false);
  assert.ok(existing.issues.some((issue) => issue.id === "existing-studio"));
});

test("creation receipt binds the exact profile, source fingerprint, decisions, and candidate checksum", async () => {
  const document = buildDocument("cross-sectional-survey", "online");
  const { profile, decisions, preview } = await previewFor(document);
  const input = {
    profile,
    studyDesign: document,
    projectName: "Receipt survey",
    decisions,
    createdAt: "2026-07-31T18:00:00.000Z",
    existingDocument: false,
  };
  const receipt = createStudyBuildCreationReceipt(preview, input);
  assert.equal(receipt.profileChecksum, preview.profileChecksum);
  assert.equal(receipt.candidateChecksum, preview.candidateChecksum);
  assert.equal(receipt.sourceFingerprintChecksum, profile.sourceFingerprint.checksum);
  assert.equal(receipt.decisions.length, profile.modules.length);
  assert.match(receipt.integrityClaim, /not-scientific-ethics-or-release-approval/);
});

test("a survey in a laboratory uses the Phase 4 composable materializer", async () => {
  const document = buildDocument("cross-sectional-survey", "laboratory");
  const profile = await compileStudyBuildProfile(document);
  const preview = await createStudyBuildMaterializationPreview({
    profile,
    studyDesign: document,
    projectName: "Future slice",
    decisions: decisionsFor(profile),
    createdAt: "2026-07-31T18:00:00.000Z",
    existingDocument: false,
  });
  assert.equal(preview.slice, "phase-4-composable");
  assert.equal(preview.canCreate, true);
  assert.ok(preview.candidate?.blocks.some((block) => block.id === "block-researcher-handoff"));
  assert.ok(preview.candidate?.blocks.some((block) => block.id === "block-survey-instructions"));
});

test("randomized laboratory materialization does not invent missing conditions or allocation", async () => {
  const document = buildDocument("randomized-between", "laboratory");
  document.spec.participants.conditions = "";
  document.spec.participants.allocationMethod = "";
  document.spec.participants.allocationRatio = "";
  const profile = await compileStudyBuildProfile(document);
  const preview = await createStudyBuildMaterializationPreview({
    profile,
    studyDesign: document,
    projectName: "Incomplete randomized source",
    decisions: decisionsFor(profile),
    createdAt: "2026-07-31T18:00:00.000Z",
    existingDocument: false,
  });
  assert.equal(preview.canCreate, false);
  assert.equal(preview.candidate, null);
  assert.ok(preview.issues.some((issue) => issue.id === "source-randomized-conditions"));
  assert.ok(preview.issues.some((issue) => issue.id === "source-randomized-allocation-method"));
});
