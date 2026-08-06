import assert from "node:assert/strict";
import test from "node:test";
import { PROJECT_ROUTE_VERIFICATION_FIXTURES } from "./projectRouteProfile";
import {
  STUDY_CONTRACT_GUIDANCE_SOURCES,
  alignProposedStudyContractRoute,
  compileProposedStudyContract,
  createProposedStudyContract,
  createProposedStudyContractDraft,
  studyContractGuidanceForRoute,
  type ProposalStudyQuestion,
  type ProposalStudyRoute,
} from "./proposalStudyContractPhase5";
import {
  createEmptyProposedStudyContract,
  createResearchProposalDocument,
  verifyResearchProposalDocument,
  type ClaimEvidenceMap,
  type ProposedStudyContract,
} from "./researchProposalDocument";

const NOW = "2026-08-05T20:00:00.000Z";

function route(index = 0): ProposalStudyRoute {
  const input = PROJECT_ROUTE_VERIFICATION_FIXTURES[index].input;
  return {
    intent: input.intent,
    methodFamily: input.methodFamily,
    assignment: input.assignment,
    setting: input.setting,
    audience: input.audience,
    dataSensitivity: input.dataSensitivity,
    possibleSpecialProcedures: [...input.specialProcedures],
  };
}

function question(id = "rq-1", text = "How does structured feedback shape revision quality?"): ProposalStudyQuestion {
  return {
    id,
    text,
    family: "explanatory",
    scope: {
      populationOrSource: "Adult learners in online courses",
      setting: "Online learning",
      constructOrPhenomenon: "Revision quality",
      timeframe: "One academic term",
      comparison: "Different feedback conditions",
      evidenceAccess: "Recruitment through participating courses",
    },
  };
}

function claims(questionIds = ["rq-1"]): ClaimEvidenceMap {
  return {
    schemaVersion: 1,
    claims: questionIds.flatMap((questionId, index) => [
      { id: `known-${index + 1}`, kind: "known" as const, text: "A bounded finding.", status: "supported" as const, questionIds: [questionId], evidenceAssessmentIds: [`assessment-${index + 1}`], caveats: [] },
      { id: `gap-${index + 1}`, kind: "gap" as const, text: "A bounded gap remains.", status: "researcher-reviewed" as const, questionIds: [questionId], evidenceAssessmentIds: [`assessment-${index + 1}`], caveats: ["The reviewed context is limited."] },
    ]),
    claim: "researcher-owned-claim-map-not-novelty-or-truth-certification",
  };
}

function completeContract(currentRoute = route(), questions = [question()]): ProposedStudyContract {
  return createProposedStudyContract({
    route: currentRoute,
    entries: questions.map((item, index) => ({
      id: `study-entry-${index + 1}`,
      questionId: item.id,
      purpose: "Estimate how the proposed evidence would answer this question within its declared boundary.",
      evidenceNeed: "Comparable observations of feedback exposure and revision quality with transparent measurement.",
      populationOrSource: item.scope.populationOrSource || "A bounded population or source.",
      proposedMethod: "A prospective comparison appropriate to the question and setting.",
      analysisDirection: "Estimate the comparison with uncertainty and assess defensible alternative specifications.",
      uncertainty: "Recruitment, measurement validity, missingness, and feasibility remain to be resolved.",
    })),
    feasibilityNotes: "Confirm staffing, schedule, recruitment rate, tooling, and a stopping decision before implementation.",
    accessNotes: "Confirm site access, permissions, recruitment channels, accommodations, and material availability.",
    ethicsAndSensitivityNotes: "Stage 3 must resolve participant rights, privacy, retention, sensitivity, and institutional requirements.",
  });
}

test("draft creation adds one stable empty entry per missing selected question without deleting stale work", () => {
  const current = {
    ...createEmptyProposedStudyContract(),
    entries: [{ id: "legacy-entry", questionId: "rq-old", purpose: "Preserved", evidenceNeed: "", populationOrSource: "", proposedMethod: "", analysisDirection: "", uncertainty: "" }],
  };
  const draft = createProposedStudyContractDraft({ current, questions: [question("rq-1"), question("rq-2")], route: route() });
  assert.equal(draft.entries.length, 3);
  assert.equal(draft.entries[0].purpose, "Preserved");
  assert.deepEqual(draft.entries.slice(1).map((entry) => entry.questionId), ["rq-1", "rq-2"]);
  assert.equal(draft.entries[1].populationOrSource, "Adult learners in online courses");
  assert.equal(draft.intent, "primary-data");
});

test("a complete question-level contract becomes ready without claiming implementation or approval", async () => {
  const currentRoute = route();
  const contract = completeContract(currentRoute);
  const compilation = compileProposedStudyContract({ route: currentRoute, questions: [question()], claimEvidenceMap: claims(), contract, synthesisReady: true });
  assert.equal(compilation.ready, true);
  assert.equal(compilation.questionSummaries[0].ready, true);
  assert.match(compilation.claim, /not-runnable-implementation/);
  const proposal = await createResearchProposalDocument({ projectId: "phase5-project", proposedStudyContract: contract, now: NOW });
  assert.equal(await verifyResearchProposalDocument(proposal), true);
  assert.equal(proposal.proposedStudyContract.implementationDeferredToStage3, true);
});

test("route drift is preserved until the researcher explicitly aligns the contract", () => {
  const oldRoute = route(0);
  const newRoute = route(1);
  const contract = completeContract(oldRoute);
  const stale = compileProposedStudyContract({ route: newRoute, questions: [question()], claimEvidenceMap: claims(), contract, synthesisReady: true });
  assert.equal(stale.ready, false);
  assert.ok(stale.issues.some((item) => item.id === "route-drift"));
  const aligned = alignProposedStudyContractRoute(contract, newRoute);
  const reviewed = compileProposedStudyContract({ route: newRoute, questions: [question()], claimEvidenceMap: claims(), contract: aligned, synthesisReady: true });
  assert.equal(reviewed.issues.some((item) => item.id === "route-drift"), false);
});

test("missing, duplicate, and stale question entries fail closed without deleting content", () => {
  const currentRoute = route();
  const base = completeContract(currentRoute);
  const malformed = { ...base, entries: [base.entries[0], { ...base.entries[0], id: "duplicate" }, { ...base.entries[0], id: "stale", questionId: "rq-old" }] };
  const result = compileProposedStudyContract({ route: currentRoute, questions: [question()], claimEvidenceMap: claims(), contract: malformed, synthesisReady: true });
  assert.equal(result.ready, false);
  assert.ok(result.issues.some((item) => item.id === "duplicate-entry-rq-1"));
  assert.ok(result.issues.some((item) => item.id === "stale-entry-stale"));
  assert.deepEqual(result.staleEntryIds, ["stale"]);
});

test("every contract field and every cross-question implementation note has a distinct blocking responsibility", () => {
  const currentRoute = route();
  const empty = createProposedStudyContractDraft({ current: createEmptyProposedStudyContract(), questions: [question()], route: currentRoute });
  const result = compileProposedStudyContract({ route: currentRoute, questions: [question()], claimEvidenceMap: claims(), contract: empty, synthesisReady: true });
  assert.equal(result.ready, false);
  for (const key of ["purpose", "evidenceNeed", "proposedMethod", "analysisDirection", "uncertainty"]) assert.ok(result.issues.some((item) => item.field === key));
  for (const key of ["feasibilityNotes", "accessNotes", "ethicsAndSensitivityNotes"]) assert.ok(result.issues.some((item) => item.field === key));
});

test("upstream synthesis and current researcher-reviewed gap remain required", () => {
  const currentRoute = route();
  const contract = completeContract(currentRoute);
  const result = compileProposedStudyContract({ route: currentRoute, questions: [question()], claimEvidenceMap: { ...claims(), claims: [] }, contract, synthesisReady: false });
  assert.equal(result.ready, false);
  assert.ok(result.issues.some((item) => item.id === "synthesis-not-ready"));
  assert.ok(result.issues.some((item) => item.id === "gap-link-rq-1"));
});

test("route guidance materially differs across qualitative, mixed, secondary, and synthesis work", () => {
  const qualitative = studyContractGuidanceForRoute(route(3));
  const mixed = studyContractGuidanceForRoute(route(5));
  const secondary = studyContractGuidanceForRoute(route(6));
  const synthesis = studyContractGuidanceForRoute(route(8));
  assert.match(qualitative.routePrompts.join(" "), /context|interpretive/i);
  assert.match(mixed.routePrompts.join(" "), /integration/i);
  assert.match(secondary.routePrompts.join(" "), /provenance|version|missingness/i);
  assert.match(synthesis.routePrompts.join(" "), /eligibility|synthesis/i);
  assert.notDeepEqual(qualitative.suggestions.proposedMethod, mixed.suggestions.proposedMethod);
  assert.notDeepEqual(secondary.suggestions.analysisDirection, synthesis.suggestions.analysisDirection);
});

test("randomization, protected audiences, sensitive data, and special procedures are advisories for Stage 3—not inferred approvals", () => {
  const currentRoute = route(2);
  const result = compileProposedStudyContract({ route: currentRoute, questions: [question()], claimEvidenceMap: claims(), contract: completeContract(currentRoute), synthesisReady: true });
  assert.equal(result.ready, true);
  assert.ok(result.issues.some((item) => item.id === "randomization-handoff" && item.severity === "advisory"));
  assert.ok(result.issues.some((item) => item.id === "special-procedure-handoff" && item.severity === "advisory"));
  assert.ok(result.issues.some((item) => item.id === "sensitive-data-handoff" && item.severity === "advisory"));
});

test("authority sources are HTTPS, versioned, and explicitly bounded as planning prompts", () => {
  assert.equal(STUDY_CONTRACT_GUIDANCE_SOURCES.length, 7);
  for (const source of STUDY_CONTRACT_GUIDANCE_SOURCES) {
    assert.match(source.sourceUrl, /^https:\/\//);
    assert.equal(source.accessedAt, "2026-08-05");
    assert.equal(source.boundary, "planning-prompt-not-design-prescription-quality-score-compliance-or-approval");
  }
});
