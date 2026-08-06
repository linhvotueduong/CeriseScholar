import assert from "node:assert/strict";
import test from "node:test";
import { PROJECT_ROUTE_VERIFICATION_FIXTURES } from "./projectRouteProfile";
import {
  PROPOSAL_COMPOSITION_GUIDANCE_SOURCES,
  PROPOSAL_COMPOSITION_SECTION_DEFINITIONS,
  compileProposalComposition,
  createProposalCompositionDraft,
  proposalCompositionPromptsForRoute,
  suggestedRequirementIds,
  type ProposalCompositionSectionKey,
} from "./proposalCompositionPhase6";
import {
  createEmptyProposalRequirementsProfile,
  createProjectEvidenceAssessment,
  createResearchProposalDocument,
  verifyResearchProposalDocument,
  type ClaimEvidenceMap,
  type ProjectEvidenceAssessment,
  type ProposalRequirementsProfile,
  type ProposedStudyContract,
  type ResearchProposalSection,
} from "./researchProposalDocument";
import { createProposedStudyContract } from "./proposalStudyContractPhase5";
import { createResearchArtifactIdentity } from "./artifactIdentity";

const PROJECT_ID = "phase6-project";
const NOW = "2026-08-05T23:00:00.000Z";

function route(index = 0) {
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

function requirements(maximumWords: number | null = null): ProposalRequirementsProfile {
  return {
    ...createEmptyProposalRequirementsProfile(PROJECT_ID),
    purpose: "funder",
    route: { intent: "primary-data", methodFamily: "quantitative" },
    citationStyle: "APA 7",
    maximumWords,
    requirements: [
      { id: "req-gap", label: "Research gap and significance", description: "Explain the bounded gap and importance.", required: true, authorityId: null },
      { id: "req-method", label: "Approach and analysis", description: "Describe design, methods, feasibility, and analysis.", required: true, authorityId: null },
    ],
    researcherConfirmed: true,
  };
}

function claims(): ClaimEvidenceMap {
  return {
    schemaVersion: 1,
    claims: [
      { id: "known", kind: "known", text: "Prior evidence supports a bounded pattern.", status: "supported", questionIds: ["rq-1"], evidenceAssessmentIds: ["assessment-1"], caveats: ["Context is bounded."] },
      { id: "gap", kind: "gap", text: "A bounded gap remains.", status: "researcher-reviewed", questionIds: ["rq-1"], evidenceAssessmentIds: ["assessment-1"], caveats: ["The search boundary is explicit."] },
      { id: "significance", kind: "significance", text: "Addressing the gap could improve understanding.", status: "researcher-reviewed", questionIds: ["rq-1"], evidenceAssessmentIds: [], caveats: [] },
      { id: "contribution", kind: "proposed-contribution", text: "The proposed study may make a bounded contribution.", status: "researcher-reviewed", questionIds: ["rq-1"], evidenceAssessmentIds: [], caveats: [] },
    ],
    claim: "researcher-owned-claim-map-not-novelty-or-truth-certification",
  };
}

function contract(): ProposedStudyContract {
  const currentRoute = route();
  return createProposedStudyContract({
    route: currentRoute,
    entries: [{
      id: "study-rq-1",
      questionId: "rq-1",
      purpose: "Clarify the role of the question.",
      evidenceNeed: "Comparable observations are needed.",
      populationOrSource: "A bounded source or population.",
      proposedMethod: "A prospective comparison.",
      analysisDirection: "Estimate a comparison with uncertainty.",
      uncertainty: "Feasibility and measurement remain unresolved.",
    }],
    feasibilityNotes: "Confirm resources and schedule.",
    accessNotes: "Confirm access and permissions.",
    ethicsAndSensitivityNotes: "Resolve participant rights and privacy in Stage 3.",
  });
}

async function assessment(): Promise<ProjectEvidenceAssessment> {
  const identity = await createResearchArtifactIdentity({ artifactKind: "evidence-library", artifactId: "source-1", artifactSchemaVersion: 1, payload: { title: "Included evidence" } });
  return createProjectEvidenceAssessment({
    projectId: PROJECT_ID,
    assessmentId: "assessment-1",
    sourceId: "source-1",
    status: "included",
    decisionRationale: "The researcher included this source for the selected question.",
    linkedQuestionIds: ["rq-1"],
    reviewedAt: NOW,
    sourceReference: { artifactKind: identity.artifactKind, artifactId: identity.artifactId, schemaVersion: identity.artifactSchemaVersion, checksum: identity.checksum },
    now: NOW,
  });
}

function section(
  id: ProposalCompositionSectionKey,
  input: Partial<ResearchProposalSection> = {},
): ResearchProposalSection {
  return {
    id,
    title: id.replaceAll("_", " "),
    role: id,
    content: `${id} researcher-authored proposal text with explicit boundaries and traceability.`,
    citationKeys: [],
    sourceKnowledgeEntryIds: [],
    sourceAssetIds: [],
    sourceClaimIds: [],
    sourceEvidenceAssessmentIds: [],
    sourceContractEntryIds: [],
    requirementIds: [],
    unresolvedSupportNotes: "",
    researcherReviewed: true,
    ...input,
  };
}

function completeSections(): ResearchProposalSection[] {
  return [
    section("proposal_background", { sourceClaimIds: ["known"], sourceEvidenceAssessmentIds: ["assessment-1"] }),
    section("proposal_problem_statement", { sourceClaimIds: ["gap", "significance"], sourceEvidenceAssessmentIds: ["assessment-1"], requirementIds: ["req-gap"] }),
    section("proposal_literature_review", { sourceClaimIds: ["known", "gap"], sourceEvidenceAssessmentIds: ["assessment-1"] }),
    section("proposal_current_study", { sourceClaimIds: ["gap", "significance", "contribution"], sourceEvidenceAssessmentIds: ["assessment-1"], sourceContractEntryIds: ["study-rq-1"] }),
    section("proposal_method_materials", { sourceClaimIds: ["contribution"], sourceContractEntryIds: ["study-rq-1"], requirementIds: ["req-method"] }),
    section("proposal_references", { content: "Included evidence reference.", citationKeys: ["source-1"], sourceEvidenceAssessmentIds: ["assessment-1"] }),
  ];
}

test("composition draft preserves exact legacy prose and materializes six traceability records", () => {
  const exact = "  Exact legacy bytes.\n\nKeep spacing.  ";
  const draft = createProposalCompositionDraft([{ id: "proposal_background", title: "Background", role: "proposal_background", content: exact, citationKeys: [], sourceKnowledgeEntryIds: [], sourceAssetIds: [] }]);
  assert.equal(draft.length, 6);
  assert.equal(draft[0].content, exact);
  assert.equal(draft[0].researcherReviewed, false);
  assert.deepEqual(draft.map((item) => item.id), PROPOSAL_COMPOSITION_SECTION_DEFINITIONS.map((item) => item.key));
});

test("a complete source-linked proposal becomes ready and remains checksum valid", async () => {
  const included = await assessment();
  const sections = completeSections();
  const result = compileProposalComposition({ route: route(), requirements: requirements(), claimEvidenceMap: claims(), proposedStudyContract: contract(), assessments: [included], sections, requirementsReady: true, synthesisReady: true, contractReady: true });
  assert.equal(result.ready, true);
  assert.equal(result.sectionSummaries.every((item) => item.ready), true);
  const proposal = await createResearchProposalDocument({ projectId: PROJECT_ID, requirements: requirements(), claimEvidenceMap: claims(), proposedStudyContract: contract(), sections, now: NOW });
  assert.equal(await verifyResearchProposalDocument(proposal), true);
});

test("upstream artifacts remain independent fail-closed composition gates", async () => {
  const result = compileProposalComposition({ route: route(), requirements: requirements(), claimEvidenceMap: claims(), proposedStudyContract: contract(), assessments: [await assessment()], sections: completeSections(), requirementsReady: false, synthesisReady: false, contractReady: false });
  assert.equal(result.ready, false);
  for (const id of ["requirements-not-ready", "synthesis-not-ready", "contract-not-ready"]) assert.ok(result.issues.some((item) => item.id === id));
});

test("content and explicit researcher review are separate responsibilities", async () => {
  const sections = completeSections().map((item) => item.id === "proposal_background" ? { ...item, content: "", researcherReviewed: false } : item);
  const result = compileProposalComposition({ route: route(), requirements: requirements(), claimEvidenceMap: claims(), proposedStudyContract: contract(), assessments: [await assessment()], sections, requirementsReady: true, synthesisReady: true, contractReady: true });
  assert.ok(result.issues.some((item) => item.id === "section-content-proposal_background"));
  assert.ok(result.issues.some((item) => item.id === "section-review-proposal_background"));
});

test("problem, current-study, and method sections retain their distinct source responsibilities", async () => {
  const sections = completeSections().map((item) => ({ ...item, sourceClaimIds: [], sourceContractEntryIds: [] }));
  const result = compileProposalComposition({ route: route(), requirements: requirements(), claimEvidenceMap: claims(), proposedStudyContract: contract(), assessments: [await assessment()], sections, requirementsReady: true, synthesisReady: true, contractReady: true });
  assert.ok(result.issues.some((item) => item.id === "problem-gap-required"));
  assert.ok(result.issues.some((item) => item.id === "problem-significance-required"));
  assert.ok(result.issues.some((item) => item.id === "current-study-claim-required"));
  assert.ok(result.issues.some((item) => item.id.startsWith("contract-coverage-proposal_current_study")));
  assert.ok(result.issues.some((item) => item.id.startsWith("contract-coverage-proposal_method_materials")));
});

test("claim-to-evidence closure and references coverage prevent invisible provenance loss", async () => {
  const sections = completeSections().map((item) => ({ ...item, sourceEvidenceAssessmentIds: [], citationKeys: [] }));
  const result = compileProposalComposition({ route: route(), requirements: requirements(), claimEvidenceMap: claims(), proposedStudyContract: contract(), assessments: [await assessment()], sections, requirementsReady: true, synthesisReady: true, contractReady: true });
  assert.ok(result.issues.some((item) => item.id.startsWith("claim-evidence-closure")));
  assert.ok(result.issues.some((item) => item.id === "literature-trace-required"));
  assert.equal(result.sectionSummaries.find((item) => item.sectionId === "proposal_references")?.ready, false);
});

test("required profile items must map to at least one proposal section", async () => {
  const sections = completeSections().map((item) => ({ ...item, requirementIds: [] }));
  const result = compileProposalComposition({ route: route(), requirements: requirements(), claimEvidenceMap: claims(), proposedStudyContract: contract(), assessments: [await assessment()], sections, requirementsReady: true, synthesisReady: true, contractReady: true });
  assert.ok(result.issues.some((item) => item.id === "required-requirement-req-gap"));
  assert.ok(result.issues.some((item) => item.id === "required-requirement-req-method"));
});

test("the selected word limit is derived across six sections and fails closed when exceeded", async () => {
  const result = compileProposalComposition({ route: route(), requirements: requirements(5), claimEvidenceMap: claims(), proposedStudyContract: contract(), assessments: [await assessment()], sections: completeSections(), requirementsReady: true, synthesisReady: true, contractReady: true });
  assert.equal(result.ready, false);
  assert.ok(result.totalWords > 5);
  assert.ok(result.issues.some((item) => item.id === "maximum-word-limit"));
});

test("route prompts preserve qualitative, mixed, secondary, synthesis, and quantitative distinctions", () => {
  assert.match(proposalCompositionPromptsForRoute(route(3)).join(" "), /reflexivity|interpretive/i);
  assert.match(proposalCompositionPromptsForRoute(route(5)).join(" "), /integration|strand/i);
  assert.match(proposalCompositionPromptsForRoute(route(6)).join(" "), /provenance|version|missingness/i);
  assert.match(proposalCompositionPromptsForRoute(route(8)).join(" "), /protocol|eligibility|selection/i);
  assert.match(proposalCompositionPromptsForRoute(route(0)).join(" "), /bias|uncertainty|sensitivity/i);
});

test("requirement suggestions remain editable heuristics and guidance sources retain explicit boundaries", () => {
  const method = PROPOSAL_COMPOSITION_SECTION_DEFINITIONS.find((item) => item.key === "proposal_method_materials");
  assert.ok(method);
  assert.deepEqual(suggestedRequirementIds(method, requirements()), ["req-method"]);
  assert.equal(PROPOSAL_COMPOSITION_GUIDANCE_SOURCES.length, 6);
  for (const source of PROPOSAL_COMPOSITION_GUIDANCE_SOURCES) {
    assert.match(source.sourceUrl, /^https:\/\//);
    assert.equal(source.accessedAt, "2026-08-05");
    assert.equal(source.boundary, "section-completeness-and-traceability-not-format-compliance-writing-quality-or-approval");
  }
});
