import assert from "node:assert/strict";
import test from "node:test";
import { createResearchArtifactIdentity, type ResearchArtifactReference } from "./artifactIdentity";
import {
  PROPOSAL_CLAIM_KIND_DEFINITIONS,
  SYNTHESIS_GUIDANCE_SOURCES,
  compileProposalSynthesis,
  createClaimEvidenceMap,
  createProposalClaim,
  synthesisPromptsForRoute,
} from "./proposalSynthesisPhase4";
import {
  createProjectEvidenceAssessment,
  createResearchProposalDocument,
  type ProjectEvidenceAssessment,
  type ProposalClaimEvidenceEntry,
} from "./researchProposalDocument";

const NOW = "2026-08-05T16:00:00.000Z";
const PROJECT_ID = "project-phase4";
const ROUTE = { intent: "primary-data", methodFamily: "quantitative" } as const;

async function sourceReference(sourceId: string): Promise<ResearchArtifactReference> {
  const identity = await createResearchArtifactIdentity({
    artifactKind: "evidence-library",
    artifactId: sourceId,
    artifactSchemaVersion: 1,
    payload: { title: `Source ${sourceId}`, version: 1 },
  });
  return {
    artifactKind: identity.artifactKind,
    artifactId: identity.artifactId,
    schemaVersion: identity.artifactSchemaVersion,
    checksum: identity.checksum,
  };
}

async function includedAssessment(assessmentId: string, questionIds = ["rq-1"]): Promise<ProjectEvidenceAssessment> {
  const sourceId = `source-${assessmentId}`;
  return createProjectEvidenceAssessment({
    projectId: PROJECT_ID,
    assessmentId,
    sourceId,
    status: "included",
    decisionRationale: "The researcher judged this source relevant within the stated project boundary.",
    linkedQuestionIds: questionIds,
    caveats: ["The reported context limits transferability."],
    reviewedAt: NOW,
    sourceReference: await sourceReference(sourceId),
    now: NOW,
  });
}

function claim(input: Partial<ProposalClaimEvidenceEntry> & Pick<ProposalClaimEvidenceEntry, "id" | "kind" | "text">): ProposalClaimEvidenceEntry {
  return {
    id: input.id,
    kind: input.kind,
    text: input.text,
    status: input.status ?? "researcher-reviewed",
    questionIds: input.questionIds ?? ["rq-1"],
    evidenceAssessmentIds: input.evidenceAssessmentIds ?? [],
    caveats: input.caveats ?? [],
  };
}

test("claim helpers create stable IDs and normalize link collections without changing researcher order", () => {
  const first = createProposalClaim([], "known", ["rq-1", "rq-1"]);
  const second = createProposalClaim([first], "gap", ["rq-1"]);
  assert.equal(first.id, "claim-001");
  assert.equal(second.id, "claim-002");
  const map = createClaimEvidenceMap([{ ...first, text: "  A bounded finding. ", evidenceAssessmentIds: ["a-1", "a-1"], caveats: ["Limit", "Limit"] }, second]);
  assert.equal(map.claims[0].text, "A bounded finding.");
  assert.deepEqual(map.claims[0].evidenceAssessmentIds, ["a-1"]);
  assert.deepEqual(map.claims.map((item) => item.id), ["claim-001", "claim-002"]);
});

test("a bounded known → gap → significance chain can become ready only after human review", async () => {
  const evidence = await includedAssessment("assessment-1");
  const map = createClaimEvidenceMap([
    claim({ id: "claim-known", kind: "known", text: "Structured feedback is associated with revision behavior in the reviewed settings.", status: "supported", evidenceAssessmentIds: [evidence.assessmentId] }),
    claim({ id: "claim-gap", kind: "gap", text: "How learners interpret feedback during revision remains insufficiently characterized in the target setting.", evidenceAssessmentIds: [evidence.assessmentId], caveats: ["The search and included evidence were bounded to adult education and English-language sources."] }),
    claim({ id: "claim-significance", kind: "significance", text: "Understanding that interpretation could improve the design of usable feedback." }),
  ]);
  const result = compileProposalSynthesis({
    route: ROUTE,
    selectedQuestionIds: ["rq-1"],
    assessments: [evidence],
    claimEvidenceMap: map,
    evidenceStrategyReady: true,
    evidenceReviewReady: true,
  });
  assert.equal(result.ready, true);
  assert.deepEqual(result.unlinkedIncludedAssessmentIds, []);
  assert.equal(result.questionSummaries[0].ready, true);
  const proposal = await createResearchProposalDocument({ projectId: PROJECT_ID, claimEvidenceMap: map, now: NOW });
  assert.equal(proposal.claimEvidenceMap.claims.length, 3);
  assert.equal(proposal.identity.artifactKind, "research-proposal");
});

test("a gap cannot be auto-certified as supported and must expose its boundary", async () => {
  const evidence = await includedAssessment("assessment-1");
  const map = createClaimEvidenceMap([
    claim({ id: "claim-known", kind: "known", text: "A known finding.", status: "supported", evidenceAssessmentIds: [evidence.assessmentId] }),
    claim({ id: "claim-gap", kind: "gap", text: "No research exists.", status: "supported", evidenceAssessmentIds: [evidence.assessmentId] }),
    claim({ id: "claim-significance", kind: "significance", text: "The question matters." }),
  ]);
  const result = compileProposalSynthesis({ route: ROUTE, selectedQuestionIds: ["rq-1"], assessments: [evidence], claimEvidenceMap: map, evidenceStrategyReady: true, evidenceReviewReady: true });
  assert.equal(result.ready, false);
  assert.ok(result.issues.some((item) => item.id === "gap-human-review-claim-gap"));
  assert.ok(result.issues.some((item) => item.id === "gap-boundary-claim-gap"));
});

test("stale, excluded, and unused evidence remain visible and block readiness", async () => {
  const included = await includedAssessment("assessment-included");
  const excludedSourceId = "source-excluded";
  const excluded = await createProjectEvidenceAssessment({
    projectId: PROJECT_ID,
    assessmentId: "assessment-excluded",
    sourceId: excludedSourceId,
    status: "excluded",
    decisionRationale: "The source does not answer the selected project question.",
    reviewedAt: NOW,
    sourceReference: await sourceReference(excludedSourceId),
    now: NOW,
  });
  const map = createClaimEvidenceMap([
    claim({ id: "claim-known", kind: "known", text: "A claim.", status: "supported", evidenceAssessmentIds: [excluded.assessmentId, "assessment-missing"] }),
    claim({ id: "claim-gap", kind: "gap", text: "A bounded gap.", evidenceAssessmentIds: [excluded.assessmentId], caveats: ["Bounded review."] }),
    claim({ id: "claim-significance", kind: "significance", text: "This matters." }),
  ]);
  const result = compileProposalSynthesis({ route: ROUTE, selectedQuestionIds: ["rq-1"], assessments: [included, excluded], claimEvidenceMap: map, evidenceStrategyReady: true, evidenceReviewReady: true });
  assert.equal(result.ready, false);
  assert.ok(result.issues.some((item) => item.assessmentId === excluded.assessmentId && item.id.includes("nonincluded")));
  assert.ok(result.issues.some((item) => item.assessmentId === "assessment-missing"));
  assert.deepEqual(result.unlinkedIncludedAssessmentIds, [included.assessmentId]);
});

test("contested claims preserve disagreement instead of flattening it", async () => {
  const first = await includedAssessment("assessment-1");
  const map = createClaimEvidenceMap([
    claim({ id: "claim-known", kind: "known", text: "A known pattern.", status: "supported", evidenceAssessmentIds: [first.assessmentId] }),
    claim({ id: "claim-contested", kind: "contested", text: "Sources disagree about the pattern.", status: "contested", evidenceAssessmentIds: [first.assessmentId] }),
    claim({ id: "claim-gap", kind: "gap", text: "The source of disagreement is unresolved.", evidenceAssessmentIds: [first.assessmentId], caveats: ["Only one directly comparable source is currently included."] }),
    claim({ id: "claim-significance", kind: "significance", text: "Resolving the disagreement matters." }),
  ]);
  const result = compileProposalSynthesis({ route: ROUTE, selectedQuestionIds: ["rq-1"], assessments: [first], claimEvidenceMap: map, evidenceStrategyReady: true, evidenceReviewReady: true });
  assert.equal(result.ready, false);
  assert.ok(result.issues.some((item) => item.id === "contested-comparison-claim-contested"));
  assert.ok(result.issues.some((item) => item.id === "claim-caveat-claim-contested"));
});

test("route guidance protects qualitative meaning and evidence-synthesis certainty", async () => {
  const qualitative = synthesisPromptsForRoute({ intent: "primary-data", methodFamily: "qualitative" }).join(" ");
  assert.match(qualitative, /context|interpretation/i);
  assert.doesNotMatch(qualitative, /must calculate|effect size required/i);
  const evidence = await includedAssessment("assessment-1");
  const map = createClaimEvidenceMap([
    claim({ id: "claim-known", kind: "known", text: "A known finding.", status: "supported", evidenceAssessmentIds: [evidence.assessmentId] }),
    claim({ id: "claim-gap", kind: "gap", text: "A bounded gap.", evidenceAssessmentIds: [evidence.assessmentId], caveats: ["Search boundary recorded."] }),
    claim({ id: "claim-significance", kind: "significance", text: "The gap matters." }),
  ]);
  const synthesis = compileProposalSynthesis({ route: { intent: "evidence-synthesis", methodFamily: "evidence-synthesis" }, selectedQuestionIds: ["rq-1"], assessments: [evidence], claimEvidenceMap: map, evidenceStrategyReady: true, evidenceReviewReady: true });
  assert.equal(synthesis.ready, false);
  assert.ok(synthesis.issues.some((item) => item.id === "synthesis-certainty-claim-known"));
  assert.ok(synthesis.issues.some((item) => item.id === "synthesis-certainty-claim-significance"));
});

test("authority and claim registries are bounded, source-backed, and avoid numeric certainty scores", () => {
  assert.equal(PROPOSAL_CLAIM_KIND_DEFINITIONS.length, 7);
  assert.ok(SYNTHESIS_GUIDANCE_SOURCES.length >= 5);
  for (const source of SYNTHESIS_GUIDANCE_SOURCES) assert.match(source.sourceUrl, /^https:\/\//);
  assert.doesNotMatch(JSON.stringify({ sources: SYNTHESIS_GUIDANCE_SOURCES, kinds: PROPOSAL_CLAIM_KIND_DEFINITIONS }), /numeric score|overall score|novelty certified/i);
});
