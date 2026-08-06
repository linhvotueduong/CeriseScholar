import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createResearchArtifactIdentity,
  type ResearchArtifactIdentity,
  type ResearchArtifactReference,
} from "./artifactIdentity";
import { indexResearchArtifact } from "./researchFoundation";
import { createResearchDecisionRecord, verifyResearchDecisionRecord } from "./researchDecisionLedger";
import { CERISE_RESEARCH_ARTIFACT_GRAPH } from "./researchArtifactGraph";
import { evaluateResearchArtifactLifecycle } from "./researchArtifactLifecycle";
import {
  createProjectEvidenceAssessment,
  createResearchProposalDocument,
  exportLegacyProposalSections,
  importLegacyProposalSections,
  normalizeResearchProposalDocument,
  verifyProjectEvidenceAssessment,
  verifyResearchProposalDocument,
} from "./researchProposalDocument";
import { PROPOSAL_SECTIONS } from "../../types/paper-section";

const NOW = "2026-08-04T23:00:00.000Z";
const LATER = "2026-08-05T09:00:00.000Z";
const PROJECT_ID = "00000000-0000-4000-8000-000000000201";
const USER_ID = "00000000-0000-4000-8000-000000000202";

function reference(identity: ResearchArtifactIdentity): ResearchArtifactReference {
  return {
    artifactKind: identity.artifactKind,
    artifactId: identity.artifactId,
    schemaVersion: identity.artifactSchemaVersion,
    checksum: identity.checksum,
  };
}

async function pathwayReference(): Promise<ResearchArtifactReference> {
  return reference(await createResearchArtifactIdentity({
    artifactKind: "research-pathway",
    artifactId: `pathway-${PROJECT_ID}`,
    artifactSchemaVersion: 2,
    payload: { projectId: PROJECT_ID, question: "How does structured feedback shape revision quality?" },
  }));
}

test("all six legacy proposal sections migrate and round-trip byte-for-byte", async () => {
  const rows = PROPOSAL_SECTIONS.map((section_key, index) => ({
    section_key,
    content: `  ${index}: ${section_key}\n\nExact spacing remains.  `,
    updated_at: NOW,
  }));
  const proposal = await importLegacyProposalSections({
    projectId: PROJECT_ID,
    projectTitle: "Revision study",
    rows,
    sourceReferences: [await pathwayReference()],
    importedAt: NOW,
  });
  assert.equal(await verifyResearchProposalDocument(proposal), true);
  assert.equal(proposal.sections.length, 6);
  assert.equal(proposal.migration.importedLegacySectionKeys.length, 6);
  const exported = new Map(exportLegacyProposalSections(proposal).map((row) => [row.section_key, row.content]));
  for (const row of rows) assert.equal(exported.get(row.section_key), row.content);
});

test("proposal identity is deterministic and binds the exact Stage 1 revision", async () => {
  const source = await pathwayReference();
  const input = {
    projectId: PROJECT_ID,
    title: "Revision study",
    sourceReferences: [source],
    now: NOW,
  } as const;
  const [first, second] = await Promise.all([
    createResearchProposalDocument(input),
    createResearchProposalDocument(input),
  ]);
  assert.equal(first.identity.checksum, second.identity.checksum);
  assert.deepEqual(first.identity.sourceFingerprint.sources, [source]);
  assert.equal(first.participantDataIncluded, false);
  assert.equal(first.proposedStudyContract.implementationDeferredToStage3, true);
});

test("proposal revisions preserve the prior checksum instead of mutating history", async () => {
  const first = await createResearchProposalDocument({ projectId: PROJECT_ID, title: "First", sourceReferences: [await pathwayReference()], now: NOW });
  const second = await createResearchProposalDocument({ projectId: PROJECT_ID, title: "Second", previous: first, now: LATER });
  assert.equal(second.revision, 2);
  assert.equal(second.revisionHistory.length, 2);
  assert.equal(second.revisionHistory[1].previousChecksum, first.identity.checksum);
  assert.notEqual(second.identity.checksum, first.identity.checksum);
  assert.equal(await verifyResearchProposalDocument(second), true);
});

test("tampered, cross-project, and participant-containing proposal payloads fail closed", async () => {
  const proposal = await createResearchProposalDocument({ projectId: PROJECT_ID, now: NOW });
  assert.equal(await normalizeResearchProposalDocument({ ...proposal, title: "Changed after checksum" }, PROJECT_ID), null);
  assert.equal(await normalizeResearchProposalDocument(proposal, "00000000-0000-4000-8000-000000000299"), null);
  assert.equal(await normalizeResearchProposalDocument({ ...proposal, participantDataIncluded: true }, PROJECT_ID), null);
});

test("project evidence assessments are project-specific, revisioned, and source-checksum bound", async () => {
  const source = await createResearchArtifactIdentity({
    artifactKind: "evidence-library",
    artifactId: "source-001",
    artifactSchemaVersion: 1,
    payload: { title: "A source", doi: "10.0000/example" },
  });
  const first = await createProjectEvidenceAssessment({
    projectId: PROJECT_ID,
    assessmentId: "assessment-001",
    sourceId: "source-001",
    status: "awaiting-review",
    appraisalFramework: "route-appropriate-framework-pending",
    sourceReference: reference(source),
    now: NOW,
  });
  const second = await createProjectEvidenceAssessment({
    projectId: PROJECT_ID,
    assessmentId: "assessment-001",
    sourceId: "source-001",
    status: "included",
    decisionRationale: "Directly informs the selected question; limitations remain recorded.",
    linkedQuestionIds: ["rq-1"],
    previous: first,
    sourceReference: reference(source),
    reviewedAt: LATER,
    now: LATER,
  });
  assert.equal(await verifyProjectEvidenceAssessment(first), true);
  assert.equal(await verifyProjectEvidenceAssessment(second), true);
  assert.equal(second.revision, 2);
  assert.equal(second.identity.sourceFingerprint.sources[0].checksum, source.checksum);
  assert.equal(second.claim, "project-specific-evidence-judgment-not-universal-quality-score-or-truth-certification");
  await assert.rejects(() => createProjectEvidenceAssessment({
    projectId: PROJECT_ID,
    assessmentId: "changed-id",
    sourceId: "source-001",
    previous: first,
    sourceReference: reference(source),
    now: LATER,
  }), /immutable/);
});

test("a changed library source makes its project assessment and proposal stale", async () => {
  const oldSource = await createResearchArtifactIdentity({ artifactKind: "evidence-library", artifactId: "source-002", artifactSchemaVersion: 1, payload: { title: "Original" } });
  const newSource = await createResearchArtifactIdentity({ artifactKind: "evidence-library", artifactId: "source-002", artifactSchemaVersion: 1, payload: { title: "Corrected metadata" } });
  const assessment = await createProjectEvidenceAssessment({ projectId: PROJECT_ID, assessmentId: "assessment-002", sourceId: "source-002", sourceReference: reference(oldSource), now: NOW });
  const proposal = await createResearchProposalDocument({ projectId: PROJECT_ID, sourceReferences: [reference(assessment.identity)], now: NOW });
  const records = [newSource, assessment.identity, proposal.identity].map((identity) => indexResearchArtifact({
    projectId: PROJECT_ID,
    userId: USER_ID,
    identity,
    storageLocator: `domain:${identity.artifactKind}:${identity.artifactId}`,
    createdAt: NOW,
  }));
  const findings = evaluateResearchArtifactLifecycle(records, CERISE_RESEARCH_ARTIFACT_GRAPH);
  assert.equal(findings.find((item) => item.artifactKind === "project-evidence-assessment")?.status, "stale");
  assert.equal(findings.find((item) => item.artifactKind === "research-proposal")?.status, "stale");
});

test("proposal and evidence decisions use the unified no-transcript review ledger", async () => {
  const proposal = await createResearchProposalDocument({ projectId: PROJECT_ID, now: NOW });
  const decision = await createResearchDecisionRecord({
    id: "proposal-decision-1",
    projectId: PROJECT_ID,
    domain: "proposal",
    suggestionId: "section-clarity-1",
    suggestionKind: "writing-patch",
    suggestionSummary: "Clarify the selected proposal section.",
    action: "kept-current",
    decisionReason: "The researcher retained the original wording.",
    decidedAt: NOW,
    baseArtifact: reference(proposal.identity),
    suggestionChecksum: proposal.identity.checksum,
    resultingArtifact: null,
    servedModel: "not-served-phase-1",
  });
  assert.equal(await verifyResearchDecisionRecord(decision), true);
  assert.equal(decision.promptStored, false);
  assert.equal(decision.chatTranscriptStored, false);
});

test("Build 2 migration is additive, owner-isolated, revision-preserving, and indexed", async () => {
  const sql = await readFile(new URL("../../../supabase/migrations/20260804230000_build2_phase1_proposal_foundation.sql", import.meta.url), "utf8");
  const tables = ["research_proposals", "research_proposal_revisions", "project_evidence_assessments", "project_evidence_assessment_revisions"];
  for (const table of tables) {
    assert.match(sql, new RegExp(`CREATE TABLE public\\.${table}`));
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} FORCE ROW LEVEL SECURITY`));
    assert.match(sql, new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM anon`));
  }
  assert.match(sql, /projects\.user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(sql, /AFTER INSERT OR UPDATE ON public\.research_proposals/);
  assert.match(sql, /AFTER INSERT OR UPDATE ON public\.project_evidence_assessments/);
  assert.match(sql, /project_evidence_assessments_project_status_idx/);
  assert.doesNotMatch(sql, /GRANT (UPDATE|DELETE).*research_proposal_revisions/);
  assert.doesNotMatch(sql, /GRANT (UPDATE|DELETE).*project_evidence_assessment_revisions/);
  assert.doesNotMatch(sql, /DROP TABLE public\.(paper_sections|evidence_library)|DELETE FROM public\.(paper_sections|evidence_library)/);
});
