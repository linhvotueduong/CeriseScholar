import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createResearchArtifactIdentity, type ResearchArtifactReference } from "./artifactIdentity";
import {
  compileProposalHandoff,
  createProposalHandoffPackage,
  createProposalHandoffResponsibilityDraft,
  deriveProposalHandoffResponsibilities,
  normalizeProposalHandoffPackage,
  proposalHandoffIsCurrent,
  verifyProposalHandoffPackage,
  type ProposalHandoffResponsibility,
} from "./proposalHandoffPhase7";
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
import {
  readProposalHandoffCache,
  reconcileProposalHandoffCache,
  writeProposalHandoffCache,
} from "./proposalHandoffCache";

const PROJECT_ID = "phase7-proposal-project";
const NOW = "2026-08-05T23:55:00.000Z";

const route: ProposalStudyRoute = {
  intent: "primary-data",
  methodFamily: "quantitative",
  assignment: "randomized",
  setting: "laboratory",
  audience: "adult",
  dataSensitivity: "deidentified",
  possibleSpecialProcedures: [],
};

const questions: ProposalStudyQuestion[] = [{
  id: "rq-1",
  text: "Does the proposed comparison answer the bounded research question?",
  family: "explanatory",
  scope: { populationOrSource: "Adults", setting: "Laboratory", constructOrPhenomenon: "Focal construct", timeframe: "One session", comparison: "Two conditions", evidenceAccess: "To be confirmed" },
}];

function identityReference(identity: Awaited<ReturnType<typeof createResearchArtifactIdentity>>): ResearchArtifactReference {
  return { artifactKind: identity.artifactKind, artifactId: identity.artifactId, schemaVersion: identity.artifactSchemaVersion, checksum: identity.checksum };
}

async function pathwayReference(seed = "current"): Promise<ResearchArtifactReference> {
  return identityReference(await createResearchArtifactIdentity({ artifactKind: "research-pathway", artifactId: `pathway-${PROJECT_ID}`, artifactSchemaVersion: 2, payload: { seed } }));
}

async function assessment(seed = "current"): Promise<ProjectEvidenceAssessment> {
  const source = await createResearchArtifactIdentity({ artifactKind: "evidence-library", artifactId: "source-1", artifactSchemaVersion: 1, payload: { seed } });
  return createProjectEvidenceAssessment({
    projectId: PROJECT_ID,
    assessmentId: "assessment-1",
    sourceId: "source-1",
    status: "included",
    decisionRationale: "Included for the current question.",
    linkedQuestionIds: ["rq-1"],
    sourceReference: identityReference(source),
    reviewedAt: NOW,
    now: NOW,
  });
}

function claimMap(): ClaimEvidenceMap {
  return {
    schemaVersion: 1,
    claims: [{ id: "gap", kind: "gap", text: "A bounded gap remains.", status: "researcher-reviewed", questionIds: ["rq-1"], evidenceAssessmentIds: ["assessment-1"], caveats: ["Bounded by the review."] }],
    claim: "researcher-owned-claim-map-not-novelty-or-truth-certification",
  };
}

function sections(): ResearchProposalSection[] {
  return ["proposal_background", "proposal_problem_statement", "proposal_literature_review", "proposal_current_study", "proposal_method_materials", "proposal_references"].map((id) => ({
    id,
    title: id,
    role: id,
    content: `Researcher-owned ${id} prose.`,
    citationKeys: id === "proposal_references" ? ["source-1"] : [],
    sourceKnowledgeEntryIds: [],
    sourceAssetIds: [],
    sourceClaimIds: id === "proposal_problem_statement" ? ["gap"] : [],
    sourceEvidenceAssessmentIds: id === "proposal_references" || id === "proposal_problem_statement" ? ["assessment-1"] : [],
    sourceContractEntryIds: ["proposal_current_study", "proposal_method_materials"].includes(id) ? ["study-rq-1"] : [],
    requirementIds: [],
    unresolvedSupportNotes: id === "proposal_literature_review" ? "The evidence boundary remains a proposal limitation." : "",
    researcherReviewed: true,
  }));
}

async function proposal(pathway: ResearchArtifactReference): Promise<ResearchProposalDocument> {
  const requirements = { ...createEmptyProposalRequirementsProfile(PROJECT_ID), researcherConfirmed: true };
  const contract = createProposedStudyContract({
    route,
    entries: [{ id: "study-rq-1", questionId: "rq-1", purpose: "Test the question.", evidenceNeed: "Comparable observations.", populationOrSource: "Adults.", proposedMethod: "A randomized comparison.", analysisDirection: "Estimate the comparison with uncertainty.", uncertainty: "Finalize measures and feasibility in Stage 3." }],
    feasibilityNotes: "Confirm staffing, timing, and equipment.",
    accessNotes: "Confirm recruitment and laboratory access.",
    ethicsAndSensitivityNotes: "Resolve participant rights and privacy before collection.",
  });
  return createResearchProposalDocument({ projectId: PROJECT_ID, requirements, claimEvidenceMap: claimMap(), proposedStudyContract: contract, sections: sections(), sourceReferences: [pathway], now: NOW });
}

function reviewed(items: readonly ProposalHandoffResponsibility[]): ProposalHandoffResponsibility[] {
  return items.map((item) => ({
    ...item,
    disposition: item.kind === "section-support-limit" ? "retained-proposal-limitation" : "carry-to-stage3",
    stage3Target: item.kind === "section-support-limit" ? "" : item.kind === "ethics-sensitivity" ? "consent-and-rights" : "build-study",
    rationale: item.kind === "section-support-limit" ? "Preserve this limitation in later writing." : "Stage 3 must operationalize and verify this responsibility.",
  }));
}

async function fixture() {
  const pathway = await pathwayReference();
  const currentProposal = await proposal(pathway);
  const currentAssessment = await assessment();
  const responsibilities = reviewed(createProposalHandoffResponsibilityDraft(currentProposal));
  const compilation = compileProposalHandoff({ proposal: currentProposal, pathwayReference: pathway, assessments: [currentAssessment], responsibilities, pathwayReady: true, requirementsReady: true, evidenceReviewReady: true, synthesisReady: true, studyContractReady: true, compositionReady: true });
  return { pathway, currentProposal, currentAssessment, responsibilities, compilation };
}

test("derives every question and cross-question Stage 3 responsibility without adding checkboxes", async () => {
  const pathway = await pathwayReference();
  const currentProposal = await proposal(pathway);
  const derived = deriveProposalHandoffResponsibilities(currentProposal);
  assert.deepEqual(derived.map((item) => item.kind), ["question-uncertainty", "feasibility", "access", "ethics-sensitivity", "section-support-limit"]);
  assert.ok(derived.every((item) => item.disposition === "unreviewed"));
});

test("draft reconciliation preserves a decision only while its exact proposal source is unchanged", async () => {
  const pathway = await pathwayReference();
  const original = await proposal(pathway);
  const previous = reviewed(createProposalHandoffResponsibilityDraft(original));
  assert.deepEqual(createProposalHandoffResponsibilityDraft(original, previous), previous);
  const changed = await createResearchProposalDocument({ projectId: PROJECT_ID, previous: original, proposedStudyContract: { ...original.proposedStudyContract, feasibilityNotes: "Changed feasibility responsibility." }, now: "2026-08-06T00:00:00.000Z" });
  const reconciled = createProposalHandoffResponsibilityDraft(changed, previous);
  assert.equal(reconciled.find((item) => item.id === "global-feasibility")?.disposition, "unreviewed");
  assert.equal(reconciled.find((item) => item.id === "global-access")?.disposition, "carry-to-stage3");
});

test("readiness fails independently for every upstream artifact lane", async () => {
  const current = await fixture();
  const result = compileProposalHandoff({ proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [current.currentAssessment], responsibilities: current.responsibilities, pathwayReady: false, requirementsReady: false, evidenceReviewReady: false, synthesisReady: false, studyContractReady: false, compositionReady: false, evidenceConflictCount: 1 });
  for (const id of ["pathway-not-current", "requirements-not-ready", "evidence-review-not-ready", "synthesis-not-ready", "study-contract-not-ready", "composition-not-ready"]) assert.ok(result.issues.some((item) => item.id === id));
  assert.equal(result.readyToFreeze, false);
});

test("responsibilities require an explicit disposition, target when carried, and rationale", async () => {
  const current = await fixture();
  const unreviewed = createProposalHandoffResponsibilityDraft(current.currentProposal);
  const result = compileProposalHandoff({ proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [current.currentAssessment], responsibilities: unreviewed, pathwayReady: true, requirementsReady: true, evidenceReviewReady: true, synthesisReady: true, studyContractReady: true, compositionReady: true });
  assert.ok(result.issues.some((item) => item.id.startsWith("unreviewed-responsibility-")));
  const missingTarget = current.responsibilities.map((item, index) => index === 0 ? { ...item, stage3Target: "" as const, rationale: "" } : item);
  const targetResult = compileProposalHandoff({ proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [current.currentAssessment], responsibilities: missingTarget, pathwayReady: true, requirementsReady: true, evidenceReviewReady: true, synthesisReady: true, studyContractReady: true, compositionReady: true });
  assert.ok(targetResult.issues.some((item) => item.id.startsWith("missing-target-")));
  assert.ok(targetResult.issues.some((item) => item.id.startsWith("missing-rationale-")));
});

test("a complete ledger freezes a checksum-valid reference-only Stage 3 package", async () => {
  const current = await fixture();
  assert.equal(current.compilation.readyToFreeze, true);
  const packageValue = await createProposalHandoffPackage({ proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [current.currentAssessment], questions, route, responsibilities: current.responsibilities, compilation: current.compilation, now: NOW });
  assert.equal(await verifyProposalHandoffPackage(packageValue), true);
  assert.equal(packageValue.questionHandoffs[0].questionText, questions[0].text);
  assert.equal(packageValue.evidenceManifest[0].assessmentChecksum, current.currentAssessment.identity.checksum);
  assert.equal(packageValue.identity.sourceFingerprint.sources.length, 2);
  assert.equal(packageValue.participantDataIncluded, false);
});

test("tampering with a frozen responsibility or evidence receipt fails closed", async () => {
  const current = await fixture();
  const packageValue = await createProposalHandoffPackage({ proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [current.currentAssessment], questions, route, responsibilities: current.responsibilities, compilation: current.compilation, now: NOW });
  assert.equal(await verifyProposalHandoffPackage({ ...packageValue, responsibilities: packageValue.responsibilities.map((item, index) => index === 0 ? { ...item, rationale: "Changed after freeze." } : item) }), false);
  assert.equal(await normalizeProposalHandoffPackage({ ...packageValue, projectId: "another-project" }, PROJECT_ID), null);
});

test("a proposal, pathway, assessment, or evidence-source checksum change makes the handoff stale", async () => {
  const current = await fixture();
  const packageValue = await createProposalHandoffPackage({ proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [current.currentAssessment], questions, route, responsibilities: current.responsibilities, compilation: current.compilation, now: NOW });
  assert.equal(await proposalHandoffIsCurrent({ package: packageValue, proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [current.currentAssessment] }), true);
  const changedAssessment = await assessment("changed-source");
  assert.equal(await proposalHandoffIsCurrent({ package: packageValue, proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [changedAssessment] }), false);
  assert.equal(await proposalHandoffIsCurrent({ package: packageValue, proposal: current.currentProposal, pathwayReference: await pathwayReference("changed"), assessments: [current.currentAssessment] }), false);
});

test("freeze is blocked when a source responsibility is stale or marked for Stage 2 resolution", async () => {
  const current = await fixture();
  const stale = current.responsibilities.map((item, index) => index === 0 ? { ...item, sourceText: "Old text" } : item);
  const staleResult = compileProposalHandoff({ proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [current.currentAssessment], responsibilities: stale, pathwayReady: true, requirementsReady: true, evidenceReviewReady: true, synthesisReady: true, studyContractReady: true, compositionReady: true });
  assert.ok(staleResult.issues.some((item) => item.id.startsWith("stale-responsibility-")));
  const upstream = current.responsibilities.map((item, index) => index === 0 ? { ...item, disposition: "resolve-in-stage2" as const } : item);
  const upstreamResult = compileProposalHandoff({ proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [current.currentAssessment], responsibilities: upstream, pathwayReady: true, requirementsReady: true, evidenceReviewReady: true, synthesisReady: true, studyContractReady: true, compositionReady: true });
  assert.ok(upstreamResult.issues.some((item) => item.id.startsWith("resolve-upstream-")));
});

test("a second freeze creates a new revision without mutating the first package", async () => {
  const current = await fixture();
  const first = await createProposalHandoffPackage({ proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [current.currentAssessment], questions, route, responsibilities: current.responsibilities, compilation: current.compilation, now: NOW });
  const second = await createProposalHandoffPackage({ proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [current.currentAssessment], questions, route, responsibilities: current.responsibilities, compilation: current.compilation, previous: first, now: "2026-08-06T00:05:00.000Z" });
  assert.equal(first.revision, 1);
  assert.equal(second.revision, 2);
  assert.notEqual(first.identity.checksum, second.identity.checksum);
  assert.equal(await verifyProposalHandoffPackage(first), true);
});

test("the frozen claim cannot represent approval, certification, or participant data", async () => {
  const current = await fixture();
  const packageValue = await createProposalHandoffPackage({ proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [current.currentAssessment], questions, route, responsibilities: current.responsibilities, compilation: current.compilation, now: NOW });
  assert.match(packageValue.claim, /not-factual-novelty-methodological-ethical-compliance-submission-funding-or-collection-approval/);
  assert.equal(JSON.stringify(packageValue).includes("participantRows"), false);
  assert.equal(JSON.stringify(packageValue).includes("chatTranscript"), false);
});

test("the device cache validates checksums and detects independent secure edits", async () => {
  const current = await fixture();
  const first = await createProposalHandoffPackage({ proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [current.currentAssessment], questions, route, responsibilities: current.responsibilities, compilation: current.compilation, now: NOW });
  const device = await createProposalHandoffPackage({ proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [current.currentAssessment], questions, route, responsibilities: current.responsibilities, compilation: current.compilation, previous: first, now: "2026-08-06T00:05:00.000Z" });
  const cloud = await createProposalHandoffPackage({ proposal: current.currentProposal, pathwayReference: current.pathway, assessments: [current.currentAssessment], questions, route, responsibilities: current.responsibilities, compilation: current.compilation, previous: first, now: "2026-08-06T00:06:00.000Z" });
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  writeProposalHandoffCache(storage, { projectId: PROJECT_ID, package: device, draftProposalChecksum: current.currentProposal.identity.checksum, draftResponsibilities: current.responsibilities, lastSyncedChecksum: first.identity.checksum, dirty: true });
  const cached = await readProposalHandoffCache(storage, PROJECT_ID);
  assert.equal(cached?.package?.identity.checksum, device.identity.checksum);
  assert.equal(reconcileProposalHandoffCache({ cache: cached, cloud, cloudStoredChecksum: cloud.identity.checksum }).kind, "review-required");
  const raw = JSON.parse(values.values().next().value as string);
  raw.package.revision = 999;
  values.set(values.keys().next().value as string, JSON.stringify(raw));
  assert.equal(await readProposalHandoffCache(storage, PROJECT_ID), null);
});

test("the additive migration keeps current state owner-scoped and history trigger-only", async () => {
  const sql = await readFile("supabase/migrations/20260805233000_build2_phase7_proposal_handoff.sql", "utf8");
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/g);
  assert.match(sql, /FOR SELECT TO authenticated/);
  assert.match(sql, /FOR INSERT TO authenticated/);
  assert.match(sql, /FOR UPDATE TO authenticated/);
  assert.doesNotMatch(sql, /FOR DELETE TO authenticated/);
  assert.match(sql, /GRANT SELECT ON TABLE public\.research_proposal_handoff_revisions TO authenticated/);
  assert.doesNotMatch(sql, /GRANT SELECT, INSERT ON TABLE public\.research_proposal_handoff_revisions/);
  assert.match(sql, /capture_research_proposal_handoff_revision[\s\S]*SECURITY DEFINER/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.capture_research_proposal_handoff_revision\(\) FROM authenticated/);
});
