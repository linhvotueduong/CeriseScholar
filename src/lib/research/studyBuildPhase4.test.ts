import assert from "node:assert/strict";
import test from "node:test";
import { createExperimentBlock, validateExperimentStudio } from "./experimentStudio";
import { compileStudyBuildProfile } from "./studyBuildCompiler";
import {
  createStudyBuildMaterializationPreview,
  suggestedStudyBuildDecision,
  type StudyBuildRecommendationDecision,
} from "./studyBuildMaterializer";
import {
  applyStudyBuildReconciliation,
  createRebuiltStudyDraft,
  createStudioSourceLink,
  createStudyBuildReconciliationPreview,
} from "./studyBuildReconciliation";
import type { StudyBuildProfile } from "./studyBuildProfile";
import {
  STUDY_DESIGN_OPTIONS,
  type ConstructRole,
  type StudyDesignDocument,
  type StudyDesignKind,
  type StudySetting,
} from "./studyDesign";

const SETTINGS = ["online", "laboratory", "field", "hybrid"] as const;

function phase4Document(
  designKind: Exclude<StudyDesignKind, "">,
  setting: Exclude<StudySetting, "">,
): StudyDesignDocument {
  const qualitative = designKind === "qualitative";
  const grouped = designKind === "randomized-between" || designKind === "within-subjects" || designKind === "quasi-experimental";
  const firstRole: ConstructRole = qualitative ? "qualitative-concept" : "outcome";
  return {
    schemaVersion: 1,
    projectId: `phase-4-${designKind}-${setting}`,
    updatedAt: "2026-07-31T12:00:00.000Z",
    spec: {
      design: {
        goal: qualitative ? "explore-experience" : designKind === "randomized-between" ? "test-causal-effect" : "describe-pattern",
        setting,
        hybridSettings: setting === "hybrid" ? ["online", "field"] : [],
        constraints: "Use the bounded current runtime and preserve participant control.",
        availableDevices: setting === "laboratory" ? "Managed laptop and keyboard" : "Responsive connected browser",
        selectedDesign: designKind,
        selectionRationale: "The selected design matches the approved research question and declared setting.",
        approved: true,
      },
      researchQuestions: [
        {
          id: "rq-1",
          question: qualitative ? "How do participants describe the experience?" : "What is the planned outcome?",
          hypothesis: qualitative ? "" : "The outcome differs in the expected direction.",
          construct: qualitative ? "Lived experience" : "Planned outcome",
          constructRole: firstRole,
          operationalDefinition: qualitative ? "Participant account" : "A source-linked response",
          measure: qualitative ? "Open prompt" : "Seven-point rating scale",
          expectedDirection: qualitative ? "" : "Declared before collection",
          evidenceNote: "Phase 4 source-linked fixture.",
        },
        ...(designKind === "mixed-methods" ? [{
          id: "rq-2",
          question: "How do participants explain the quantitative pattern?",
          hypothesis: "",
          construct: "Participant explanation",
          constructRole: "qualitative-concept" as const,
          operationalDefinition: "Participant account",
          measure: "Open prompt",
          expectedDirection: "",
          evidenceNote: "Qualitative lane.",
        }] : []),
      ],
      participants: {
        targetPopulation: "Eligible adults",
        inclusionCriteria: "Meets the approved eligibility criteria",
        exclusionCriteria: "Does not meet the approved eligibility criteria",
        samplingStrategy: "Declared sampling strategy",
        recruitmentChannel: "Approved recruitment route",
        plannedSampleSize: "100",
        sampleSizeRationale: "Method-appropriate planning rationale",
        expectedEffectSize: qualitative ? "" : "0.5",
        alpha: "0.05",
        power: "0.80",
        conditions: grouped ? "Condition A; Condition B" : "",
        allocationMethod: designKind === "randomized-between"
          ? "Simple random allocation"
          : designKind === "quasi-experimental"
            ? "Naturally occurring group recorded by the researcher"
            : "",
        allocationRatio: designKind === "randomized-between" ? "1:1" : "",
        counterbalancing: designKind === "within-subjects" ? "Approved fixed AB sequence with order-effects limitation" : "",
        deviceRequirements: setting === "laboratory" ? "Managed display" : "Connected browser",
        accessibilityRequirements: "Keyboard access, semantic controls, reflow, and reduced motion",
        approved: true,
      },
      legacyNotes: {},
    },
  };
}

function decisionsFor(profile: StudyBuildProfile): StudyBuildRecommendationDecision[] {
  return profile.modules.map((recommendation) => {
    const action = suggestedStudyBuildDecision(recommendation);
    return {
      recommendationId: recommendation.id,
      action,
      note: action === "modify" ? "Create the bounded scaffold and preserve this source-linked note." : "",
    };
  });
}

async function materialize(document: StudyDesignDocument, projectName = "Phase 4 verification") {
  const profile = await compileStudyBuildProfile(document);
  const decisions = decisionsFor(profile);
  const preview = await createStudyBuildMaterializationPreview({
    profile,
    studyDesign: document,
    projectName,
    decisions,
    createdAt: "2026-07-31T18:00:00.000Z",
    existingDocument: false,
  });
  return { profile, decisions, preview };
}

test("all 32 design and setting pairs have tested materialization or an explicit bounded result", async () => {
  let runnable = 0;
  let bounded = 0;
  for (const option of STUDY_DESIGN_OPTIONS) {
    for (const setting of SETTINGS) {
      const { preview } = await materialize(phase4Document(option.id, setting));
      if (option.id === "longitudinal") {
        assert.equal(preview.slice, "longitudinal-authoring-only");
        assert.equal(preview.canCreate, false);
        assert.ok(preview.issues.some((issue) => issue.id === "source-longitudinal-runtime-boundary"));
        assert.ok(preview.issues.some((issue) => issue.message.includes("Bounded alternative:")));
        bounded += 1;
      } else {
        assert.equal(preview.canCreate, true, `${option.id} + ${setting}: ${preview.issues.map((issue) => issue.message).join(" | ")} ${preview.validationErrors.join(" | ")}`);
        assert.ok(preview.candidate);
        assert.deepEqual(validateExperimentStudio(preview.candidate!).filter((issue) => issue.severity === "error"), []);
        runnable += 1;
      }
    }
  }
  assert.equal(runnable, 28);
  assert.equal(bounded, 4);
});

test("within-subjects materialization preserves explicit order and stable repeated outcome identities", async () => {
  const { preview } = await materialize(phase4Document("within-subjects", "online"));
  assert.equal(preview.canCreate, true);
  assert.equal(preview.candidate?.assignment.method, "single");
  assert.match(preview.candidate?.blocks.find((block) => block.id === "block-within-order")?.prompt ?? "", /fixed AB sequence/);
  assert.ok(preview.candidate?.blocks.some((block) => block.id === "block-within-1-rq-1" && block.variableName === "within_1_rq_1"));
  assert.ok(preview.candidate?.blocks.some((block) => block.id === "block-within-2-rq-1" && block.variableName === "within_2_rq_1"));
});

test("quasi-experimental materialization never claims or performs random assignment", async () => {
  const { preview } = await materialize(phase4Document("quasi-experimental", "field"));
  assert.equal(preview.candidate?.assignment.method, "single");
  assert.deepEqual(preview.candidate?.conditions.map((condition) => condition.name), ["All participants"]);
  assert.deepEqual(preview.candidate?.blocks.find((block) => block.id === "block-existing-group")?.choices, ["Condition A", "Condition B"]);
  assert.match(preview.candidate?.blocks.find((block) => block.id === "block-existing-group")?.prompt ?? "", /does not randomize/);
});

test("hybrid materialization declares shared and setting-specific procedures", async () => {
  const { preview } = await materialize(phase4Document("mixed-methods", "hybrid"));
  assert.equal(preview.canCreate, true);
  assert.deepEqual(
    preview.candidate?.blocks.find((block) => block.id === "block-hybrid-setting-entry")?.choices,
    ["Online / participant home", "Field / real-world setting"],
  );
  assert.ok(preview.candidate?.blocks.some((block) => block.id === "block-hybrid-online"));
  assert.ok(preview.candidate?.blocks.some((block) => block.id === "block-hybrid-field"));
  assert.equal(preview.candidate?.branchRules.filter((rule) => rule.id.startsWith("branch-hybrid-")).length, 2);
  assert.ok(preview.candidate?.blocks.some((block) => block.id === "block-mixed-quantitative-lane"));
  assert.ok(preview.candidate?.blocks.some((block) => block.id === "block-mixed-qualitative-lane"));
});

test("three-way reconciliation preserves manual blocks and requires rationale for researcher-owned conflicts", async () => {
  const originalDocument = phase4Document("cross-sectional-survey", "online");
  const original = await materialize(originalDocument, "Original survey");
  const sourceLink = await createStudioSourceLink(
    original.preview,
    original.profile,
    original.decisions,
    "2026-07-31T18:00:00.000Z",
  );
  const current = structuredClone(original.preview.candidate!);
  current.blocks.find((block) => block.id === "block-survey-measure-rq-1")!.heading = "Researcher-authored heading";
  const manual = createExperimentBlock("instructions", "block-manual-interview-note");
  manual.title = "Manual interview note";
  manual.internalName = "manual_interview_note";
  manual.heading = "Researcher-authored content";
  manual.prompt = "This block was created directly in Studio.";
  current.blocks.push(manual);

  const changedSource = structuredClone(originalDocument);
  changedSource.updatedAt = "2026-08-01T12:00:00.000Z";
  changedSource.spec.researchQuestions[0].question = "What is the revised planned outcome?";
  const proposed = await materialize(changedSource, "Revised survey");
  const reconciliation = await createStudyBuildReconciliationPreview(
    sourceLink,
    current,
    proposed.preview,
    proposed.profile,
  );
  const conflict = reconciliation.changes.find((change) => change.semanticId === "block:block-survey-measure-rq-1");
  assert.equal(conflict?.risk, "researcher-owned");
  assert.ok(reconciliation.preservedManualSemanticIds.includes("block:block-manual-interview-note"));

  await assert.rejects(() => applyStudyBuildReconciliation(
    reconciliation,
    current,
    proposed.preview,
    proposed.profile,
    reconciliation.changes.map((change) => ({
      changeId: change.id,
      action: change.id === conflict?.id ? "keep" : "apply",
      rationale: "",
    })),
    proposed.decisions,
    "2026-08-01T18:00:00.000Z",
    sourceLink,
  ), /rationale/);

  const applied = await applyStudyBuildReconciliation(
    reconciliation,
    current,
    proposed.preview,
    proposed.profile,
    reconciliation.changes.map((change) => ({
      changeId: change.id,
      action: change.id === conflict?.id ? "keep" : "apply",
      rationale: change.id === conflict?.id ? "The researcher-authored heading remains the approved participant-facing wording." : "",
    })),
    proposed.decisions,
    "2026-08-01T18:00:00.000Z",
    sourceLink,
  );
  assert.ok(applied.document.blocks.some((block) => block.id === "block-manual-interview-note"));
  assert.equal(applied.document.blocks.find((block) => block.id === "block-survey-measure-rq-1")?.heading, "Researcher-authored heading");
  assert.ok(applied.sourceLink.researcherOverrides.some((override) => override.semanticId === "block:block-survey-measure-rq-1"));
});

test("rebuild-as-new-draft produces a separate checksum-bound artifact", async () => {
  const result = await materialize(phase4Document("observational", "field"));
  const draft = await createRebuiltStudyDraft(
    result.preview,
    result.profile,
    result.decisions,
    "2026-08-01T18:00:00.000Z",
  );
  assert.equal(draft.projectId, result.profile.projectId);
  assert.equal(draft.document.projectId, result.profile.projectId);
  assert.equal(draft.sourceLink.baselineDocument.blocks.length, draft.document.blocks.length);
  assert.match(draft.integrityClaim, /does-not-replace-current/);
});
