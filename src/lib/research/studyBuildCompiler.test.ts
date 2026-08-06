import assert from "node:assert/strict";
import test from "node:test";
import { sha256ArtifactChecksum, verifyResearchArtifactSourceFingerprint } from "./artifactIdentity";
import {
  compileStudyBuildProfile,
  compileStudyBuildProfileVariants,
  STUDY_BUILD_PROFILE_VARIANTS,
} from "./studyBuildCompiler";
import { STUDY_RUNTIME_CAPABILITY_REGISTRY } from "./studyBuildCapabilities";
import { STUDY_DESIGN_MODULE_REGISTRY } from "./studyBuildDesignModules";
import { collectStudyBuildProfileReadiness } from "./studyBuildProfile";
import { STUDY_SETTING_MODULE_REGISTRY } from "./studyBuildSettingModules";
import {
  STUDY_DESIGN_OPTIONS,
  type ConstructRole,
  type StudyDesignDocument,
  type StudyDesignKind,
  type StudySetting,
} from "./studyDesign";

const SETTINGS = ["online", "laboratory", "field", "hybrid"] as const;

function verificationDocument(
  designKind: Exclude<StudyDesignKind, "">,
  setting: Exclude<StudySetting, "">,
): StudyDesignDocument {
  const firstRole: ConstructRole = designKind === "qualitative" ? "qualitative-concept" : "outcome";
  return {
    schemaVersion: 1,
    projectId: `phase-2-${designKind}-${setting}`,
    updatedAt: "2026-07-31T12:00:00.000Z",
    spec: {
      design: {
        goal: designKind === "qualitative" ? "explore-experience" : "describe-pattern",
        setting,
        hybridSettings: setting === "hybrid" ? ["online", "laboratory"] : [],
        constraints: "Use only capabilities represented in the current verified profile.",
        availableDevices: setting === "laboratory" ? "Researcher-managed laptop" : "Responsive browser device",
        selectedDesign: designKind,
        selectionRationale: `Verification fixture for ${designKind} in ${setting}.`,
        approved: true,
      },
      researchQuestions: [
        {
          id: "rq-1",
          question: designKind === "qualitative"
            ? "How do participants describe the experience?"
            : "What pattern is present in the planned outcome?",
          hypothesis: designKind === "qualitative" ? "" : "The planned outcome varies in the expected direction.",
          construct: designKind === "qualitative" ? "Lived experience" : "Planned outcome",
          constructRole: firstRole,
          operationalDefinition: designKind === "qualitative" ? "Participant account" : "Scored response",
          measure: designKind === "qualitative" ? "Open prompt" : "Validated or study-authored measure",
          expectedDirection: designKind === "qualitative" ? "" : "Declared before collection",
          evidenceNote: "Source-linked Phase 2 verification fixture.",
        },
        ...(designKind === "mixed-methods"
          ? [{
              id: "rq-2",
              question: "How do participants explain the quantitative pattern?",
              hypothesis: "",
              construct: "Participant explanation",
              constructRole: "qualitative-concept" as const,
              operationalDefinition: "Participant account",
              measure: "Open prompt",
              expectedDirection: "",
              evidenceNote: "Qualitative lane fixture.",
            }]
          : []),
      ],
      participants: {
        targetPopulation: "Adults eligible for the declared study",
        inclusionCriteria: "Meets the approved eligibility criteria",
        exclusionCriteria: "Does not meet the approved eligibility criteria",
        samplingStrategy: "Declared sampling strategy",
        recruitmentChannel: "Declared recruitment channel",
        plannedSampleSize: "100",
        sampleSizeRationale: "Method-appropriate planning rationale",
        expectedEffectSize: designKind === "qualitative" ? "" : "0.5",
        alpha: "0.05",
        power: "0.80",
        conditions: designKind === "randomized-between" ? "Control; intervention" : "",
        allocationMethod: designKind === "randomized-between" ? "Simple random allocation" : "",
        allocationRatio: designKind === "randomized-between" ? "1:1" : "",
        counterbalancing: designKind === "within-subjects" ? "Rotated condition order" : "",
        deviceRequirements: setting === "laboratory" ? "Researcher-managed keyboard and display" : "Supported browser",
        accessibilityRequirements: "Keyboard access, semantic controls, reflow, and reduced motion",
        approved: true,
      },
      legacyNotes: {},
    },
  };
}

const REQUIRED_DESIGN_MODULES: Record<Exclude<StudyDesignKind, "">, string[]> = {
  "randomized-between": [
    "design.randomized.allocation",
    "design.randomized.condition-routing",
    "design.randomized.outcomes",
  ],
  "within-subjects": [
    "design.within.repeated-condition-loop",
    "design.within.counterbalancing",
    "design.within.repeated-outcomes",
  ],
  "quasi-experimental": [
    "design.quasi.group-source",
    "design.quasi.baseline-covariates",
  ],
  "cross-sectional-survey": ["design.survey.measure-sections"],
  longitudinal: [
    "design.longitudinal.wave-plan",
    "design.longitudinal.measure-identity",
    "design.longitudinal.recontact",
  ],
  observational: [
    "design.observational.coding-schema",
    "design.observational.context",
  ],
  qualitative: [
    "design.qualitative.topic-guide",
    "design.qualitative.participant-control",
    "design.qualitative.data-plan",
  ],
  "mixed-methods": [
    "design.mixed.quantitative-lane",
    "design.mixed.qualitative-lane",
    "design.mixed.integration",
  ],
};

const REQUIRED_SETTING_MODULES: Record<Exclude<StudySetting, "">, string[]> = {
  online: ["setting.online.responsive-layout"],
  laboratory: ["setting.lab.researcher-handoff", "setting.lab.session-reset"],
  field: ["setting.field.context", "setting.field.device-readiness", "setting.field.bystander-privacy"],
  hybrid: ["setting.hybrid.branch", "setting.hybrid.shared-core", "setting.hybrid.deviations"],
};

test("the Phase 2 registries cover every existing design, setting, and requested runtime capability", () => {
  assert.deepEqual(Object.keys(STUDY_DESIGN_MODULE_REGISTRY).sort(), STUDY_DESIGN_OPTIONS.map((option) => option.id).sort());
  assert.deepEqual(Object.keys(STUDY_SETTING_MODULE_REGISTRY).sort(), [...SETTINGS].sort());

  const requested = [
    ...Object.values(STUDY_DESIGN_MODULE_REGISTRY),
    ...Object.values(STUDY_SETTING_MODULE_REGISTRY),
  ].flatMap((item) => item.capabilityRequests.map((request) => request.id));
  for (const id of requested) assert.ok(STUDY_RUNTIME_CAPABILITY_REGISTRY[id], `Missing runtime capability ${id}`);
});

test("all 32 design and setting pairs compile deterministically with traceable recommendations", async () => {
  let combinations = 0;
  for (const option of STUDY_DESIGN_OPTIONS) {
    for (const setting of SETTINGS) {
      const document = verificationDocument(option.id, setting);
      const first = await compileStudyBuildProfile(document);
      const second = await compileStudyBuildProfile({ ...document, updatedAt: "2099-01-01T00:00:00.000Z" });
      assert.equal(await sha256ArtifactChecksum(first), await sha256ArtifactChecksum(second));
      assert.equal(first.designKind, option.id);
      assert.equal(first.setting, setting);
      assert.equal(first.conflicts.length, 0);
      assert.equal(await verifyResearchArtifactSourceFingerprint(first.sourceFingerprint), true);
      assert.ok(first.modules.length > 0);
      assert.equal(first.rationales.length, first.modules.length);
      assert.deepEqual(first.modules.map((module) => module.id), [...first.modules.map((module) => module.id)].sort());

      const moduleIds = new Set(first.modules.map((module) => module.id));
      for (const expected of REQUIRED_DESIGN_MODULES[option.id]) assert.ok(moduleIds.has(expected), `${option.id} lacks ${expected}`);
      for (const expected of REQUIRED_SETTING_MODULES[setting]) assert.ok(moduleIds.has(expected), `${setting} lacks ${expected}`);
      assert.ok(
        first.requiredChecks.some((check) => check.id.startsWith(`check.${option.id === "cross-sectional-survey" ? "survey" : option.id.split("-")[0]}.`)),
        `${option.id} lacks a required methodological validator`,
      );
      for (const recommendation of first.modules) {
        assert.ok(recommendation.sourceReferences.length > 0, `${recommendation.id} lacks source evidence`);
        assert.ok(recommendation.rationale.length > 20, `${recommendation.id} lacks a usable rationale`);
        assert.ok(first.rationales.some((rationale) => (
          rationale.recommendationId === recommendation.id
          && rationale.sourceReferences.length > 0
        )));
      }
      combinations += 1;
    }
  }
  assert.equal(combinations, 32);
});

test("semantic deduplication keeps one higher-precedence participant exit requirement with combined provenance", async () => {
  const profile = await compileStudyBuildProfile(verificationDocument("cross-sectional-survey", "online"));
  const exitModules = profile.modules.filter((recommendation) => recommendation.id === "flow.participant-exit-support");
  assert.equal(exitModules.length, 1);
  assert.equal(exitModules[0].status, "required");
  assert.equal(exitModules[0].moduleKind, "participant-exit-and-support");
  assert.ok(exitModules[0].sourceReferences.some((source) => source.artifactKind === "study-participant-plan"));
  assert.ok(exitModules[0].sourceReferences.some((source) => source.artifactKind === "study-design-decision"));
  assert.ok(exitModules[0].sourceReferences.some((source) => source.artifactKind === "study-build-registry"));
});

test("guided, minimal-compatible, and blank-with-requirements are bounded selection variants", async () => {
  const profiles = await compileStudyBuildProfileVariants(
    verificationDocument("cross-sectional-survey", "online"),
  );
  assert.deepEqual(Object.keys(profiles), [...STUDY_BUILD_PROFILE_VARIANTS]);
  const guidedRecommended = profiles.guided.modules.find((module) => module.status === "recommended");
  const minimalRecommended = profiles["minimal-compatible"].modules.find((module) => module.id === guidedRecommended?.id);
  const blankRequired = profiles["blank-with-requirements"].modules.find((module) => module.status === "required");
  assert.equal(guidedRecommended?.selectionDefault, "include");
  assert.equal(minimalRecommended?.selectionDefault, "exclude");
  assert.equal(blankRequired?.selectionDefault, "configure");
  assert.deepEqual(
    profiles.guided.modules.map((module) => module.id),
    profiles["minimal-compatible"].modules.map((module) => module.id),
  );
});

test("qualitative and mixed-method profiles preserve methodology-specific lanes", async () => {
  const qualitative = await compileStudyBuildProfile(verificationDocument("qualitative", "online"));
  assert.deepEqual(qualitative.methodLanes, ["qualitative"]);
  assert.equal(qualitative.modules.some((module) => (
    module.proposedVariableRoles.includes("primary-outcome")
    || module.proposedVariableRoles.includes("quantitative-measure")
  )), false);
  assert.ok(qualitative.requiredChecks.some((check) => check.id === "check.qualitative.no-forced-quant-fields"));

  const mixed = await compileStudyBuildProfile(verificationDocument("mixed-methods", "hybrid"));
  assert.deepEqual(mixed.methodLanes, ["quantitative", "qualitative"]);
  assert.ok(mixed.modules.some((module) => module.moduleKind === "quantitative-lane"));
  assert.ok(mixed.modules.some((module) => module.moduleKind === "qualitative-lane"));
  assert.ok(mixed.modules.some((module) => module.moduleKind === "mixed-methods-integration"));
  assert.ok(mixed.requiredChecks.some((check) => check.id === "check.mixed.separate-lanes"));
  assert.ok(mixed.requiredChecks.some((check) => check.id === "check.mixed.integration"));
});

test("unsupported and limited runtime capabilities fail closed with bounded alternatives", async () => {
  const longitudinal = await compileStudyBuildProfile(verificationDocument("longitudinal", "online"));
  const readiness = collectStudyBuildProfileReadiness(longitudinal);
  assert.equal(readiness.status, "blocked");
  assert.ok(longitudinal.capabilityFindings.some((finding) => (
    finding.capability === "cross-session-participant-identity"
    && finding.status === "unsupported"
    && finding.severity === "blocking"
    && finding.message.includes("Bounded alternative:")
  )));
  assert.ok(longitudinal.capabilityFindings.some((finding) => (
    finding.capability === "scheduling-reminders-and-recontact"
    && finding.status === "unsupported"
    && finding.severity === "blocking"
  )));

  const field = await compileStudyBuildProfile(verificationDocument("observational", "field"));
  assert.ok(field.capabilityFindings.some((finding) => (
    finding.capability === "durable-offline-synchronization"
    && finding.status === "unsupported"
    && finding.severity === "warning"
    && finding.message.includes("do not market")
  )));
});

test("online surveys and randomized lab experiments are structurally different before UI materialization", async () => {
  const survey = await compileStudyBuildProfile(verificationDocument("cross-sectional-survey", "online"));
  const laboratoryExperiment = await compileStudyBuildProfile(verificationDocument("randomized-between", "laboratory"));
  const surveyIds = new Set(survey.modules.map((module) => module.id));
  const laboratoryIds = new Set(laboratoryExperiment.modules.map((module) => module.id));

  assert.ok(surveyIds.has("design.survey.measure-sections"));
  assert.ok(surveyIds.has("setting.online.responsive-layout"));
  assert.equal(surveyIds.has("design.randomized.allocation"), false);
  assert.equal(surveyIds.has("setting.lab.session-reset"), false);

  assert.ok(laboratoryIds.has("design.randomized.allocation"));
  assert.ok(laboratoryIds.has("design.randomized.condition-routing"));
  assert.ok(laboratoryIds.has("setting.lab.researcher-handoff"));
  assert.ok(laboratoryIds.has("setting.lab.session-reset"));
  assert.equal(laboratoryIds.has("design.survey.skip-logic"), false);
  assert.notEqual(await sha256ArtifactChecksum(survey), await sha256ArtifactChecksum(laboratoryExperiment));
});

test("a quasi-experimental source that declares random assignment is blocked as a source conflict", async () => {
  const document = verificationDocument("quasi-experimental", "field");
  document.spec.participants.allocationMethod = "random assignment";
  const profile = await compileStudyBuildProfile(document);
  assert.equal(collectStudyBuildProfileReadiness(profile).status, "blocked");
  assert.ok(profile.conflicts.some((conflict) => conflict.id === "conflict.quasi.random-assignment"));
});

test("profile compilation does not depend on AI or network access", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("Network access is forbidden during deterministic compilation.");
  }) as typeof fetch;
  try {
    const profile = await compileStudyBuildProfile(verificationDocument("cross-sectional-survey", "online"));
    assert.equal(profile.compilerVersion, 1);
    assert.ok(profile.modules.length > 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
