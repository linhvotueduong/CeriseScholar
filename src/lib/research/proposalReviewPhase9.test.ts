import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createResearchArtifactIdentity, type ResearchArtifactReference } from "./artifactIdentity";
import {
  compileProposalHandoff,
  createProposalHandoffPackage,
  createProposalHandoffResponsibilityDraft,
  type ProposalHandoffResponsibility,
} from "./proposalHandoffPhase7";
import {
  compileProposalReview,
  compileStage2KnowledgeEntries,
  createProposalExternalReviewReceipt,
  createProposalReviewExportBundle,
  createReviewedProposalBaseline,
  normalizeReviewedProposalBaseline,
  reviewedProposalBaselineIsCurrent,
  verifyProposalExternalReviewReceipt,
  verifyProposalReviewExportBundle,
  verifyReviewedProposalBaseline,
  type ProposalResearcherReviewDraft,
} from "./proposalReviewPhase9";
import {
  readProposalReviewCache,
  reconcileProposalReviewCache,
  writeProposalReviewCache,
} from "./proposalReviewCache";
import { createProposedStudyContract, type ProposalStudyQuestion, type ProposalStudyRoute } from "./proposalStudyContractPhase5";
import {
  createEmptyProposalRequirementsProfile,
  createProjectEvidenceAssessment,
  createResearchProposalDocument,
  type ClaimEvidenceMap,
  type ProjectEvidenceAssessment,
  type ResearchProposalDocument,
  type ResearchProposalSection,
} from "./researchProposalDocument";

const PROJECT_ID = "phase9-proposal-project";
const NOW = "2026-08-06T03:40:00.000Z";
const REVIEW: ProposalResearcherReviewDraft = { reviewerRole: "principal-investigator", reviewStatement: "I reviewed the exact proposal, evidence closure, proposed method, limitations, and Stage 3 responsibility assignments." };
const route: ProposalStudyRoute = { intent: "primary-data", methodFamily: "quantitative", assignment: "randomized", setting: "laboratory", audience: "adult", dataSensitivity: "deidentified", possibleSpecialProcedures: [] };
const questions: ProposalStudyQuestion[] = [{ id: "rq-1", text: "Does the bounded comparison address the reviewed gap?", family: "explanatory", scope: { populationOrSource: "Adults", setting: "Laboratory", constructOrPhenomenon: "Focal construct", timeframe: "One session", comparison: "Two conditions", evidenceAccess: "Reviewed evidence" } }];

function ref(identity: Awaited<ReturnType<typeof createResearchArtifactIdentity>>): ResearchArtifactReference {
  return { artifactKind: identity.artifactKind, artifactId: identity.artifactId, schemaVersion: identity.artifactSchemaVersion, checksum: identity.checksum };
}

async function pathway(seed = "current") {
  return ref(await createResearchArtifactIdentity({ artifactKind: "research-pathway", artifactId: `pathway-${PROJECT_ID}`, artifactSchemaVersion: 2, payload: { seed } }));
}

async function assessment(seed = "current"): Promise<ProjectEvidenceAssessment> {
  const source = await createResearchArtifactIdentity({ artifactKind: "evidence-library", artifactId: "source-1", artifactSchemaVersion: 1, payload: { seed } });
  return createProjectEvidenceAssessment({ projectId: PROJECT_ID, assessmentId: "assessment-1", sourceId: "source-1", status: "included", decisionRationale: "Included after project-specific appraisal.", linkedQuestionIds: ["rq-1"], sourceReference: ref(source), reviewedAt: NOW, now: NOW });
}

function claims(): ClaimEvidenceMap {
  return { schemaVersion: 1, claims: [{ id: "gap-1", kind: "gap", text: "A bounded evidence gap remains for this population and setting.", status: "researcher-reviewed", questionIds: ["rq-1"], evidenceAssessmentIds: ["assessment-1"], caveats: ["The gap is bounded by the reviewed source set."] }], claim: "researcher-owned-claim-map-not-novelty-or-truth-certification" };
}

function sections(): ResearchProposalSection[] {
  return ["proposal_background", "proposal_problem_statement", "proposal_literature_review", "proposal_current_study", "proposal_method_materials", "proposal_references"].map((id) => ({
    id,
    title: id,
    role: id,
    content: `Researcher-reviewed ${id} content with a bounded source relationship.`,
    citationKeys: id === "proposal_references" ? ["source-1"] : [],
    sourceKnowledgeEntryIds: [],
    sourceAssetIds: [],
    sourceClaimIds: ["proposal_problem_statement", "proposal_literature_review", "proposal_current_study"].includes(id) ? ["gap-1"] : [],
    sourceEvidenceAssessmentIds: ["proposal_problem_statement", "proposal_literature_review", "proposal_references"].includes(id) ? ["assessment-1"] : [],
    sourceContractEntryIds: ["proposal_current_study", "proposal_method_materials"].includes(id) ? ["study-rq-1"] : [],
    requirementIds: [],
    unresolvedSupportNotes: id === "proposal_literature_review" ? "Retain the bounded evidence limitation." : "",
    researcherReviewed: true,
  }));
}

async function proposal(pathwayReference: ResearchArtifactReference): Promise<ResearchProposalDocument> {
  const requirements = { ...createEmptyProposalRequirementsProfile(PROJECT_ID), route: { intent: route.intent, methodFamily: route.methodFamily }, researcherConfirmed: true };
  const contract = createProposedStudyContract({ route, entries: [{ id: "study-rq-1", questionId: "rq-1", purpose: "Test the bounded comparison.", evidenceNeed: "Comparable observations.", populationOrSource: "Adults in a laboratory setting.", proposedMethod: "Randomized between-group comparison.", analysisDirection: "Estimate the group contrast with uncertainty.", uncertainty: "Finalize measures and operational feasibility in Stage 3." }], feasibilityNotes: "Confirm staffing, timing, and equipment.", accessNotes: "Confirm recruitment and laboratory access.", ethicsAndSensitivityNotes: "Resolve participant rights and privacy before collection." });
  return createResearchProposalDocument({ projectId: PROJECT_ID, requirements, claimEvidenceMap: claims(), proposedStudyContract: contract, sections: sections(), sourceReferences: [pathwayReference], now: NOW });
}

function reviewedResponsibilities(items: readonly ProposalHandoffResponsibility[]): ProposalHandoffResponsibility[] {
  return items.map((item) => ({ ...item, disposition: item.kind === "section-support-limit" ? "retained-proposal-limitation" : "carry-to-stage3", stage3Target: item.kind === "section-support-limit" ? "" : item.kind === "ethics-sensitivity" ? "consent-and-rights" : "build-study", rationale: item.kind === "section-support-limit" ? "Preserve this bounded limitation in later writing." : "Stage 3 must operationalize and verify this exact responsibility." }));
}

async function fixture() {
  const pathwayReference = await pathway();
  const proposalValue = await proposal(pathwayReference);
  const assessmentValue = await assessment();
  const responsibilities = reviewedResponsibilities(createProposalHandoffResponsibilityDraft(proposalValue));
  const handoffCompilation = compileProposalHandoff({ proposal: proposalValue, pathwayReference, assessments: [assessmentValue], responsibilities, pathwayReady: true, requirementsReady: true, evidenceReviewReady: true, synthesisReady: true, studyContractReady: true, compositionReady: true });
  const handoff = await createProposalHandoffPackage({ proposal: proposalValue, pathwayReference, assessments: [assessmentValue], questions, route, responsibilities, compilation: handoffCompilation, now: NOW });
  const compilation = compileProposalReview({ proposal: proposalValue, handoff, handoffCurrent: true, researcherReview: REVIEW });
  const knowledgeEntries = await compileStage2KnowledgeEntries({ proposal: proposalValue, handoff, createdAt: NOW });
  return { proposalValue, assessmentValue, handoff, compilation, knowledgeEntries };
}

async function baseline(previous?: Awaited<ReturnType<typeof createReviewedProposalBaseline>> | null) {
  const current = await fixture();
  const value = await createReviewedProposalBaseline({ proposal: current.proposalValue, handoff: current.handoff, compilation: current.compilation, researcherReview: REVIEW, externalReviewReceipts: [], knowledgeEntries: current.knowledgeEntries, previous: previous ?? null, now: previous ? "2026-08-06T04:00:00.000Z" : NOW });
  return { ...current, baseline: value };
}

test("readiness is derived from seven independent lanes and requires a concrete researcher review", async () => {
  const current = await fixture();
  assert.equal(current.compilation.readyToFreeze, true);
  assert.equal(current.compilation.checks.length, 7);
  assert.ok(current.compilation.checks.every((check) => check.status === "passed"));
  const blocked = compileProposalReview({ proposal: current.proposalValue, handoff: current.handoff, handoffCurrent: true, researcherReview: { ...REVIEW, reviewStatement: "Too short" } });
  assert.equal(blocked.readyToFreeze, false);
  assert.ok(blocked.issues.some((item) => item.lane === "researcher-review"));
});

test("the compiler exposes exact RQ to gap to method and analysis traceability", async () => {
  const current = await fixture();
  assert.deepEqual(current.compilation.traceability, [{ questionId: "rq-1", questionText: questions[0].text, gapClaimIds: ["gap-1"], studyContractEntryId: "study-rq-1", proposedMethod: "Randomized between-group comparison.", analysisDirection: "Estimate the group contrast with uncertainty." }]);
});

test("optional external receipts bind to one handoff and never claim approval", async () => {
  const current = await fixture();
  const receipt = await createProposalExternalReviewReceipt({ id: "advisor-review-1", kind: "advisor", reviewerLabel: "Faculty advisor", organization: "Example department", outcome: "comments-recorded", summary: "The advisor identified two wording changes and one feasibility question.", reviewedAt: NOW, attachment: null }, current.handoff);
  assert.equal(await verifyProposalExternalReviewReceipt(receipt), true);
  assert.equal(receipt.reviewedHandoffReference.checksum, current.handoff.identity.checksum);
  assert.match(receipt.claim, /not-institutional-ethics-legal-methodological-funder-or-publication-approval/);
  assert.equal(await verifyProposalExternalReviewReceipt({ ...receipt, summary: "Changed after receipt." }), false);
});

test("a reviewed baseline is immutable, self-verifying, and contains no participant rows", async () => {
  const current = await baseline();
  assert.equal(await verifyReviewedProposalBaseline(current.baseline), true);
  assert.equal(current.baseline.identity.artifactKind, "reviewed-proposal-baseline");
  assert.equal(current.baseline.identity.sourceFingerprint.sources[0].checksum, current.handoff.identity.checksum);
  assert.equal(current.baseline.participantDataIncluded, false);
  assert.doesNotMatch(JSON.stringify(current.baseline), /participantRows|signatureBytes|chatTranscript/);
  assert.equal(await normalizeReviewedProposalBaseline({ ...current.baseline, proposalRevision: 999 }, PROJECT_ID), null);
});

test("Stage 3 currency requires the exact handoff and a changed handoff preserves the old review as stale", async () => {
  const current = await baseline();
  assert.equal(reviewedProposalBaselineIsCurrent(current.baseline, current.handoff), true);
  const changedPathway = await pathway("changed");
  const changedProposal = await proposal(changedPathway);
  const changedResponsibilities = reviewedResponsibilities(createProposalHandoffResponsibilityDraft(changedProposal));
  const handoffCompilation = compileProposalHandoff({ proposal: changedProposal, pathwayReference: changedPathway, assessments: [current.assessmentValue], responsibilities: changedResponsibilities, pathwayReady: true, requirementsReady: true, evidenceReviewReady: true, synthesisReady: true, studyContractReady: true, compositionReady: true });
  const changedHandoff = await createProposalHandoffPackage({ proposal: changedProposal, pathwayReference: changedPathway, assessments: [current.assessmentValue], questions, route, responsibilities: changedResponsibilities, compilation: handoffCompilation, previous: current.handoff, now: "2026-08-06T04:05:00.000Z" });
  assert.equal(reviewedProposalBaselineIsCurrent(current.baseline, changedHandoff), false);
  assert.equal(await verifyReviewedProposalBaseline(current.baseline), true);
});

test("review freeze creates three checksum-bound Stage 2 Living Research Record entries", async () => {
  const current = await fixture();
  assert.equal(current.knowledgeEntries.length, 3);
  assert.deepEqual(current.knowledgeEntries.map((entry) => entry.stage), [2, 2, 2]);
  assert.ok(current.knowledgeEntries.every((entry) => entry.sourceReferences[0].checksum === current.handoff.identity.checksum));
  assert.ok(current.knowledgeEntries.some((entry) => entry.manuscriptTargets.includes("methods")));
});

test("portable export packages the complete proposal, assessment manifest, and knowledge entries together", async () => {
  const current = await baseline();
  const bundle = await createProposalReviewExportBundle({ baseline: current.baseline, proposal: current.proposalValue, handoff: current.handoff, assessments: [current.assessmentValue], knowledgeEntries: current.knowledgeEntries, exportedAt: NOW });
  assert.equal(await verifyProposalReviewExportBundle(bundle), true);
  assert.equal(bundle.proposal.identity.checksum, current.baseline.proposalReference.checksum);
  assert.equal(bundle.evidenceManifest[0].identity.checksum, current.handoff.evidenceManifest[0].assessmentChecksum);
  assert.equal(bundle.livingResearchEntries.length, 3);
  assert.equal(bundle.sourceFilesIncluded, false);
  assert.equal(await verifyProposalReviewExportBundle({ ...bundle, participantDataIncluded: true as false }), false);
});

test("device and secure baseline conflicts require explicit reconciliation", async () => {
  const first = await baseline();
  const device = await createReviewedProposalBaseline({ proposal: first.proposalValue, handoff: first.handoff, compilation: first.compilation, researcherReview: { ...REVIEW, reviewStatement: `${REVIEW.reviewStatement} Device clarification.` }, externalReviewReceipts: [], knowledgeEntries: first.knowledgeEntries, previous: first.baseline, now: "2026-08-06T04:10:00.000Z" });
  const cloud = await createReviewedProposalBaseline({ proposal: first.proposalValue, handoff: first.handoff, compilation: first.compilation, researcherReview: { ...REVIEW, reviewStatement: `${REVIEW.reviewStatement} Secure clarification.` }, externalReviewReceipts: [], knowledgeEntries: first.knowledgeEntries, previous: first.baseline, now: "2026-08-06T04:11:00.000Z" });
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  writeProposalReviewCache(storage, { projectId: PROJECT_ID, baseline: device, draftReview: { reviewerRole: device.researcherReview.reviewerRole, reviewStatement: device.researcherReview.reviewStatement }, draftExternalReceipts: [], knowledgeEntries: first.knowledgeEntries, lastSyncedChecksum: first.baseline.identity.checksum, dirty: true });
  const cached = await readProposalReviewCache(storage, PROJECT_ID);
  assert.equal(cached?.baseline?.identity.checksum, device.identity.checksum);
  assert.equal(reconcileProposalReviewCache({ cache: cached, cloud, cloudStoredChecksum: cloud.identity.checksum }).kind, "review-required");
});

test("the additive migration is owner-scoped and writes history through a trigger only", async () => {
  const sql = await readFile("supabase/migrations/20260806033000_build2_phase9_reviewed_proposal_baseline.sql", "utf8");
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/g);
  assert.match(sql, /FOR SELECT TO authenticated/);
  assert.match(sql, /FOR INSERT TO authenticated/);
  assert.match(sql, /FOR UPDATE TO authenticated/);
  assert.doesNotMatch(sql, /FOR DELETE TO authenticated/);
  assert.match(sql, /GRANT SELECT ON TABLE public\.research_proposal_review_baseline_revisions TO authenticated/);
  assert.doesNotMatch(sql, /GRANT SELECT, INSERT ON TABLE public\.research_proposal_review_baseline_revisions/);
  assert.match(sql, /capture_research_proposal_review_baseline_revision[\s\S]*SECURITY DEFINER/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.capture_research_proposal_review_baseline_revision\(\) FROM authenticated/);
});
