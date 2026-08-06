import assert from "node:assert/strict";
import test from "node:test";
import type { ResearchArtifactChecksum } from "./artifactIdentity";
import { PROJECT_ROUTE_VERIFICATION_FIXTURES } from "./projectRouteProfile";
import {
  compileProposalRequirements,
  createDefaultProposalRequirementDraft,
  proposalRequirementDraftFromProfile,
} from "./proposalRequirementsCompiler";
import {
  createEmptyProposalSetupDecision,
  normalizeProposalSetupDecision,
  validateProposalSetupDecision,
  type ProposalSetupDecision,
} from "./proposalSetupDecision";
import {
  createResearchProposalDocument,
  normalizeResearchProposalDocument,
  verifyResearchProposalDocument,
} from "./researchProposalDocument";
import type { ResearchPathwayBrief } from "./researchPathwayBrief";
import {
  STAGE2_STEP1_EXPERIENCE_PREFERENCES_KEY,
  defaultStage2Step1ExperiencePreferences,
  readStage2Step1ExperiencePreferences,
  writeStage2Step1ExperiencePreferences,
} from "./stage2Step1ExperiencePreferences";
import {
  buildStage2Step1ViewModel,
  proposalSetupDecisionFromProfile,
} from "./stage2Step1ViewModel";

const PROJECT_ID = "stage2-step1-phase1";
const NOW = "2026-08-06T12:00:00.000Z";
const CHECKSUM = `sha256:${"1".repeat(64)}` as ResearchArtifactChecksum;

function setupDecision(overrides: Partial<ProposalSetupDecision> = {}): ProposalSetupDecision {
  return {
    ...createEmptyProposalSetupDecision(),
    destinationKind: "internal",
    instructionSourceStatus: "not-required",
    recommendationDecision: "accepted",
    ...overrides,
  };
}

function brief(): ResearchPathwayBrief {
  return {
    schemaVersion: 1,
    projectId: PROJECT_ID,
    pathwayRevision: 4,
    source: { artifactKind: "research-pathway", artifactId: `pathway-${PROJECT_ID}`, schemaVersion: 2, checksum: CHECKSUM },
    selectedProblems: [{
      id: "problem-1",
      title: "Feedback timing",
      situation: "Revision feedback arrives at different times.",
      affected: "Students in writing courses",
      consequence: "Revision quality may vary.",
      uncertainty: "The relationship is not yet clear.",
      observedBasis: "Course observations",
      assumptions: "",
      interpretation: "",
      alternativeExplanations: "",
      proposedResponse: "",
      status: "selected",
      origin: "researcher",
      legacyRowIndex: null,
    }],
    selectedQuestions: [{
      id: "rq-1",
      text: "How does feedback timing shape revision quality?",
      family: "descriptive",
      status: "selected",
      origin: "researcher",
      linkedProblemFrameIds: ["problem-1"],
      linkedBaselineEntryIds: [],
      scope: {
        populationOrSource: "Students",
        setting: "Writing courses",
        constructOrPhenomenon: "Feedback timing and revision quality",
        timeframe: "One term",
        comparison: "Different feedback timings",
        evidenceAccess: "Course records and student work",
      },
      methodologicalImplications: [],
      embeddedAssumptions: [],
      criteria: { significance: "medium", researcherInterest: "high", feasibility: "medium", ethics: "medium", evidenceAccess: "medium", contribution: "medium" },
      comparisonNotes: "",
      legacyCollection: null,
      legacyRowIndex: null,
    }],
    baseline: [],
    baselineSynthesis: "",
    rationale: "The question is bounded and evidence can be collected within one term.",
    unresolvedUncertainties: ["Final program format"],
    route: {} as ResearchPathwayBrief["route"],
    backcasting: { included: false, vision: "", baseline: "", concepts: "", roadmap: "" },
    readiness: { readyForStage2: true, steps: [], blockingIssueIds: [], advisoryIssueIds: [] },
    compiledAt: NOW,
    checksum: CHECKSUM,
    claim: "researcher-selected-provisional-pathway-not-independent-validity-novelty-or-ethics-approval",
  };
}

test("legacy proposal profiles remain checksum-valid and are not silently rewritten", async () => {
  const route = { intent: "primary-data" as const, methodFamily: "quantitative" as const };
  const draft = createDefaultProposalRequirementDraft(route);
  draft.researcherConfirmed = true;
  const compiled = compileProposalRequirements({ projectId: PROJECT_ID, route, draft });
  assert.equal(compiled.profile.setupDecision, undefined);
  const document = await createResearchProposalDocument({ projectId: PROJECT_ID, requirements: compiled.profile, now: NOW });
  const before = JSON.stringify(document);
  const normalized = await normalizeResearchProposalDocument(JSON.parse(before), PROJECT_ID);
  assert.ok(normalized);
  assert.equal(normalized.identity.checksum, document.identity.checksum);
  assert.equal(JSON.stringify(document), before);
  assert.equal(proposalSetupDecisionFromProfile(compiled.profile).origin, "legacy-adapter");
  assert.equal(compiled.profile.setupDecision, undefined);
});

test("new proposal setup decisions are bounded, canonical, and checksum-bound only when deliberately supplied", async () => {
  const route = { intent: "primary-data" as const, methodFamily: "quantitative" as const };
  const legacyDraft = createDefaultProposalRequirementDraft(route);
  legacyDraft.researcherConfirmed = true;
  const legacy = compileProposalRequirements({ projectId: PROJECT_ID, route, draft: legacyDraft });
  const nextDraft = { ...legacyDraft, setupDecision: setupDecision() };
  const next = compileProposalRequirements({ projectId: PROJECT_ID, route, draft: nextDraft, previous: legacy.profile });
  assert.equal(next.ready, true);
  assert.equal(next.profile.revision, legacy.profile.revision + 1);
  assert.deepEqual(next.profile.setupDecision, nextDraft.setupDecision);
  const [legacyDocument, nextDocument] = await Promise.all([
    createResearchProposalDocument({ projectId: PROJECT_ID, requirements: legacy.profile, now: NOW }),
    createResearchProposalDocument({ projectId: PROJECT_ID, requirements: next.profile, now: NOW }),
  ]);
  assert.equal(await verifyResearchProposalDocument(nextDocument), true);
  assert.notEqual(nextDocument.identity.checksum, legacyDocument.identity.checksum);
});

test("proposal setup validation fails closed on oversized, malformed, or unjustified decisions", () => {
  assert.deepEqual(validateProposalSetupDecision(setupDecision()), []);
  assert.deepEqual(validateProposalSetupDecision(setupDecision({ destinationKind: "funder", destinationName: "" })), ["proposal-destination-name-required"]);
  assert.deepEqual(validateProposalSetupDecision(setupDecision({ recommendationDecision: "overridden", selectionRationale: "" })), ["proposal-recommendation-override-rationale-required"]);
  assert.equal(normalizeProposalSetupDecision({ ...setupDecision(), selectionRationale: "x".repeat(20_001) }), null);
});

test("an explicitly present null setup decision is rejected instead of being treated as a legacy absence", async () => {
  const route = { intent: "primary-data" as const, methodFamily: "quantitative" as const };
  const draft = createDefaultProposalRequirementDraft(route);
  draft.researcherConfirmed = true;
  const compiled = compileProposalRequirements({ projectId: PROJECT_ID, route, draft });
  await assert.rejects(() => createResearchProposalDocument({
    projectId: PROJECT_ID,
    requirements: { ...compiled.profile, setupDecision: null } as unknown as typeof compiled.profile,
    now: NOW,
  }), /Proposal setup decision is invalid/);
});

test("provisional sources and unreviewed recommendations cannot become ready", () => {
  const route = { intent: "primary-data" as const, methodFamily: "quantitative" as const };
  const provisional = createDefaultProposalRequirementDraft(route);
  provisional.researcherConfirmed = true;
  provisional.setupDecision = setupDecision({ destinationKind: "undetermined", instructionSourceStatus: "provisional" });
  const provisionalResult = compileProposalRequirements({ projectId: PROJECT_ID, route, draft: provisional });
  assert.equal(provisionalResult.ready, false);
  assert.ok(provisionalResult.issues.some((issue) => issue.id === "proposal-requirements-source-provisional"));
  const unreviewed = { ...provisional, setupDecision: setupDecision({ recommendationDecision: "unreviewed" }) };
  const unreviewedResult = compileProposalRequirements({ projectId: PROJECT_ID, route, draft: unreviewed });
  assert.equal(unreviewedResult.ready, false);
  assert.ok(unreviewedResult.issues.some((issue) => issue.id === "proposal-recommendation-review-required"));
  const provisionalModel = buildStage2Step1ViewModel({
    pathwayAvailable: true,
    brief: brief(),
    compiled: provisionalResult,
    setupDecision: provisional.setupDecision,
    sourceChanged: false,
    authorityDriftIssues: [],
    versionConflict: false,
    profileMaterialized: false,
  });
  assert.equal(provisionalModel.state.id, "provisional");
});

test("an override requires a rationale and round-trips without changing meaning", () => {
  const route = { intent: "primary-data" as const, methodFamily: "quantitative" as const };
  const draft = createDefaultProposalRequirementDraft(route);
  draft.templateId = "researcher-defined";
  draft.customRequirementLines = ["Project overview", "Evidence plan"];
  draft.customAuthorityName = "Example program";
  draft.customAuthorityVersion = "2026 handbook";
  draft.customAuthorityUrl = "https://example.edu/program/handbook";
  draft.researcherConfirmed = true;
  draft.setupDecision = setupDecision({
    destinationKind: "institution-or-program",
    destinationName: "Example program",
    instructionSourceStatus: "researcher-defined",
    recommendationDecision: "overridden",
    selectionRationale: "The program handbook controls this submission.",
  });
  const first = compileProposalRequirements({ projectId: PROJECT_ID, route, draft });
  assert.equal(first.ready, true);
  const restored = proposalRequirementDraftFromProfile(first.profile);
  const second = compileProposalRequirements({ projectId: PROJECT_ID, route, draft: restored, previous: first.profile });
  assert.deepEqual(second.profile, first.profile);
  assert.equal(second.profile.revision, first.profile.revision);
});

test("experience preferences use a separate versioned device key and repair invalid values", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  assert.deepEqual(readStage2Step1ExperiencePreferences(storage), defaultStage2Step1ExperiencePreferences());
  const saved = writeStage2Step1ExperiencePreferences(storage, { guidanceLevel: "concise", informationDensity: "dense" });
  assert.deepEqual(saved, { guidanceLevel: "concise", informationDensity: "dense" });
  assert.deepEqual(readStage2Step1ExperiencePreferences(storage), saved);
  values.set(STAGE2_STEP1_EXPERIENCE_PREFERENCES_KEY, JSON.stringify({ version: 1, preferences: { guidanceLevel: "expert", informationDensity: "tiny" } }));
  assert.deepEqual(readStage2Step1ExperiencePreferences(storage), defaultStage2Step1ExperiencePreferences());
});

test("all six presentation combinations produce identical canonical view-model facts", () => {
  const route = { intent: "primary-data" as const, methodFamily: "quantitative" as const };
  const draft = createDefaultProposalRequirementDraft(route);
  draft.setupDecision = setupDecision();
  draft.researcherConfirmed = true;
  const compiled = compileProposalRequirements({ projectId: PROJECT_ID, route, draft });
  const combinations = (["guided", "balanced", "concise"] as const).flatMap((guidanceLevel) =>
    (["comfortable", "dense"] as const).map((informationDensity) => ({ guidanceLevel, informationDensity })),
  );
  const models = combinations.map((preferences) => buildStage2Step1ViewModel({
    pathwayAvailable: true,
    brief: brief(),
    compiled,
    preferences,
    sourceChanged: false,
    authorityDriftIssues: [],
    versionConflict: false,
    profileMaterialized: true,
  }));
  assert.ok(models.every((model) => model.state.id === "ready"));
  assert.ok(models.every((model) => JSON.stringify(model.canonicalFacts) === JSON.stringify(models[0].canonicalFacts)));
  assert.equal(new Set(models.map((model) => `${model.preferences.guidanceLevel}:${model.preferences.informationDensity}`)).size, 6);
});

test("the view model exposes deterministic recovery states and exact actions", () => {
  const route = { intent: "primary-data" as const, methodFamily: "quantitative" as const };
  const draft = createDefaultProposalRequirementDraft(route);
  draft.setupDecision = setupDecision();
  draft.researcherConfirmed = true;
  const compiled = compileProposalRequirements({ projectId: PROJECT_ID, route, draft });
  const base = {
    pathwayAvailable: true,
    brief: brief(),
    compiled,
    sourceChanged: false,
    authorityDriftIssues: [],
    versionConflict: false,
    profileMaterialized: true,
  };
  const conflict = buildStage2Step1ViewModel({ ...base, versionConflict: true });
  assert.equal(conflict.state.id, "version-conflict");
  assert.equal(conflict.primaryAction?.id, "resolve-version-conflict");
  const changed = buildStage2Step1ViewModel({ ...base, sourceChanged: true });
  assert.equal(changed.state.id, "stage1-changed");
  assert.equal(changed.primaryAction?.targetStepId, "stage-02-confirm-brief");
  const incomplete = buildStage2Step1ViewModel({ ...base, brief: null });
  assert.equal(incomplete.state.id, "stage1-incomplete");
  assert.equal(incomplete.primaryAction?.targetStepId, "stage-01-choose-pathway");
});

test("the compatibility layer preserves the 12-route compiler matrix", () => {
  assert.equal(PROJECT_ROUTE_VERIFICATION_FIXTURES.length, 12);
  for (const fixture of PROJECT_ROUTE_VERIFICATION_FIXTURES) {
    const route = { intent: fixture.input.intent, methodFamily: fixture.input.methodFamily };
    const draft = createDefaultProposalRequirementDraft(route);
    draft.researcherConfirmed = true;
    const compiled = compileProposalRequirements({ projectId: fixture.input.projectId, route, draft });
    assert.equal(compiled.ready, true, fixture.id);
    assert.equal(compiled.profile.setupDecision, undefined, fixture.id);
  }
});
