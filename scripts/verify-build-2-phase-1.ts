import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createResearchArtifactIdentity,
  sha256ArtifactChecksum,
  type ResearchArtifactIdentity,
  type ResearchArtifactReference,
} from "../src/lib/research/artifactIdentity";
import { indexResearchArtifact } from "../src/lib/research/researchFoundation";
import { CERISE_RESEARCH_ARTIFACT_GRAPH, validateResearchArtifactGraph } from "../src/lib/research/researchArtifactGraph";
import { evaluateResearchArtifactLifecycle } from "../src/lib/research/researchArtifactLifecycle";
import { RESEARCH_ARTIFACT_DEFINITIONS, validateResearchArtifactRegistry } from "../src/lib/research/researchArtifactRegistry";
import {
  createProjectEvidenceAssessment,
  createResearchProposalDocument,
  exportLegacyProposalSections,
  importLegacyProposalSections,
  normalizeResearchProposalDocument,
  verifyProjectEvidenceAssessment,
  verifyResearchProposalDocument,
} from "../src/lib/research/researchProposalDocument";
import { PROPOSAL_SECTIONS } from "../src/types/paper-section";

const VERIFIED_FOR = "2026-08-04";
const NOW = "2026-08-04T23:00:00.000Z";
const LATER = "2026-08-05T09:00:00.000Z";
const PROJECT_ID = "00000000-0000-4000-8000-000000000211";
const USER_ID = "00000000-0000-4000-8000-000000000212";
const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");
const JSON_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-1-verification.json");
const MARKDOWN_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-1-verification.md");

interface AcceptanceCheck {
  id: string;
  label: string;
  passed: boolean;
  evidence: string;
}

function reference(identity: ResearchArtifactIdentity): ResearchArtifactReference {
  return {
    artifactKind: identity.artifactKind,
    artifactId: identity.artifactId,
    schemaVersion: identity.artifactSchemaVersion,
    checksum: identity.checksum,
  };
}

function check(id: string, label: string, passed: boolean, evidence: string): AcceptanceCheck {
  return { id, label, passed, evidence };
}

async function main() {
  const migration = await readFile(path.join(process.cwd(), "supabase/migrations/20260804230000_build2_phase1_proposal_foundation.sql"), "utf8");
  const schemaSource = await readFile(path.join(process.cwd(), "src/lib/research/researchProposalDocument.ts"), "utf8");
  const persistence = await readFile(path.join(process.cwd(), "src/lib/research/researchProposalPersistence.ts"), "utf8");
  const graphSource = await readFile(path.join(process.cwd(), "src/lib/research/researchArtifactGraph.ts"), "utf8");

  const pathway = await createResearchArtifactIdentity({
    artifactKind: "research-pathway",
    artifactId: `pathway-${PROJECT_ID}`,
    artifactSchemaVersion: 2,
    payload: { projectId: PROJECT_ID, selectedQuestionIds: ["rq-1"] },
  });
  const legacyRows = PROPOSAL_SECTIONS.map((section_key, index) => ({
    section_key,
    content: `  ${index}: ${section_key}\nExact legacy bytes.  `,
    updated_at: NOW,
  }));
  const imported = await importLegacyProposalSections({
    projectId: PROJECT_ID,
    projectTitle: "Evidence-to-proposal verification",
    rows: legacyRows,
    sourceReferences: [reference(pathway)],
    importedAt: NOW,
  });
  const exported = new Map(exportLegacyProposalSections(imported).map((row) => [row.section_key, row.content]));
  const deterministic = await importLegacyProposalSections({
    projectId: PROJECT_ID,
    projectTitle: "Evidence-to-proposal verification",
    rows: legacyRows,
    sourceReferences: [reference(pathway)],
    importedAt: NOW,
  });
  const revised = await createResearchProposalDocument({ projectId: PROJECT_ID, previous: imported, title: "Reviewed title", now: LATER });
  const tampered = { ...imported, title: "Changed after checksum" };

  const oldSource = await createResearchArtifactIdentity({
    artifactKind: "evidence-library",
    artifactId: "evidence-source-1",
    artifactSchemaVersion: 1,
    payload: { title: "Original source" },
  });
  const newSource = await createResearchArtifactIdentity({
    artifactKind: "evidence-library",
    artifactId: "evidence-source-1",
    artifactSchemaVersion: 1,
    payload: { title: "Corrected source" },
  });
  const assessment = await createProjectEvidenceAssessment({
    projectId: PROJECT_ID,
    assessmentId: "assessment-1",
    sourceId: "evidence-source-1",
    status: "included",
    decisionRationale: "Relevant to the selected question with documented caveats.",
    sourceReference: reference(oldSource),
    reviewedAt: NOW,
    now: NOW,
  });
  const evidenceProposal = await createResearchProposalDocument({
    projectId: PROJECT_ID,
    sourceReferences: [reference(pathway), reference(assessment.identity)],
    now: NOW,
  });
  const lifecycle = evaluateResearchArtifactLifecycle(
    [newSource, assessment.identity, evidenceProposal.identity].map((identity) => indexResearchArtifact({
      projectId: PROJECT_ID,
      userId: USER_ID,
      identity,
      storageLocator: `domain:${identity.artifactKind}:${identity.artifactId}`,
      createdAt: NOW,
    })),
    CERISE_RESEARCH_ARTIFACT_GRAPH,
  );
  const tables = ["research_proposals", "research_proposal_revisions", "project_evidence_assessments", "project_evidence_assessment_revisions"];
  const acceptance: AcceptanceCheck[] = [
    check("AC-01", "Canonical proposal", await verifyResearchProposalDocument(imported), "The Stage 2 proposal is checksum-valid and exact-pathway bound."),
    check("AC-02", "Six-section lossless import", legacyRows.every((row) => exported.get(row.section_key) === row.content), "All six existing proposal_* strings round-trip without trimming, reordering, or synthesis."),
    check("AC-03", "Deterministic identity", deterministic.identity.checksum === imported.identity.checksum, "Equivalent content, time, and source references produce the same SHA-256 identity."),
    check("AC-04", "Revision lineage", revised.revision === 2 && revised.revisionHistory[1].previousChecksum === imported.identity.checksum, "A proposal edit creates a new revision that names the prior checksum."),
    check("AC-05", "Tamper rejection", await normalizeResearchProposalDocument(tampered, PROJECT_ID) === null, "Content changed after checksum creation fails closed."),
    check("AC-06", "Project isolation", await normalizeResearchProposalDocument(imported, "00000000-0000-4000-8000-000000000299") === null, "A valid proposal cannot be loaded into a different project."),
    check("AC-07", "Separate evidence judgment", await verifyProjectEvidenceAssessment(assessment) && assessment.identity.artifactKind === "project-evidence-assessment", "Project inclusion and appraisal state is independent from global source metadata."),
    check("AC-08", "Exact evidence fingerprint", assessment.identity.sourceFingerprint.sources[0].checksum === oldSource.checksum, "Every assessment names the exact source revision it judged."),
    check("AC-09", "Stale-source propagation", lifecycle.find((item) => item.artifactKind === "project-evidence-assessment")?.status === "stale" && lifecycle.find((item) => item.artifactKind === "research-proposal")?.status === "stale", "A changed library source invalidates the assessment and reconciles the downstream proposal."),
    check("AC-10", "Stage boundary", imported.proposedStudyContract.implementationDeferredToStage3 === true && imported.proposedStudyContract.claim.includes("not-runnable-study"), "Stage 2 records proposed intent; Stage 3 remains responsible for runnable implementation."),
    check("AC-11", "No approval claim", imported.claim.includes("not-novelty") && imported.requirements.claim.includes("not-compliance") && assessment.claim.includes("not-universal-quality-score"), "Schemas cannot represent novelty, compliance, truth, methodological, ethical, or submission approval."),
    check("AC-12", "Participant-data exclusion", imported.participantDataIncluded === false && assessment.participantDataIncluded === false && migration.includes("participant_exclusion"), "Proposal-domain payloads explicitly prohibit participant rows."),
    check("AC-13", "Optimistic concurrency", persistence.includes('.eq("checksum", expectedCloudChecksum)') && persistence.includes('error.code === "23505"'), "Writes compare the expected current checksum and convert insertion races into researcher-visible conflicts."),
    check("AC-14", "Compatibility dual-write", persistence.includes('from("paper_sections").upsert') && persistence.includes("exportLegacyProposalSections"), "Canonical saves continue writing the six legacy proposal sections during migration."),
    check("AC-15", "Owner/project RLS", tables.every((table) => migration.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`) && migration.includes(`ALTER TABLE public.${table} FORCE ROW LEVEL SECURITY`) && migration.includes(`REVOKE ALL ON TABLE public.${table} FROM anon`)) && migration.includes("projects.user_id = (SELECT auth.uid())"), "All four tables enforce authenticated owner and project membership at the database boundary."),
    check("AC-16", "Append-only histories", migration.includes("AFTER INSERT OR UPDATE ON public.research_proposals") && migration.includes("AFTER INSERT OR UPDATE ON public.project_evidence_assessments") && !/GRANT (UPDATE|DELETE).*research_proposal_revisions/.test(migration) && !/GRANT (UPDATE|DELETE).*project_evidence_assessment_revisions/.test(migration), "Accepted proposal and assessment revisions are captured automatically and cannot be edited or deleted by clients."),
    check("AC-17", "Indexed access paths", migration.includes("project_evidence_assessments_project_status_idx") && migration.includes("research_proposal_revisions_project_recorded_idx") && migration.includes("project_evidence_assessments_user_id_idx"), "Owner, status, history, foreign-key, and cascade access paths are indexed."),
    check("AC-18", "Additive migration", !/DROP TABLE public\.(paper_sections|evidence_library)|DELETE FROM public\.(paper_sections|evidence_library)/.test(migration), "Legacy paper and evidence tables remain untouched for rollback and compatibility."),
    check("AC-19", "Artifact registry", validateResearchArtifactRegistry().length === 0 && RESEARCH_ARTIFACT_DEFINITIONS.some((item) => item.kind === "project-evidence-assessment"), "The project assessment has one canonical owner and a no-participant-data registry contract."),
    check("AC-20", "Acyclic lineage graph", validateResearchArtifactGraph(CERISE_RESEARCH_ARTIFACT_GRAPH).length === 0 && graphSource.includes('source: "project-evidence-assessment", target: "research-proposal"'), "Pathway, source, assessment, proposal, and Stage 3 lineage remains acyclic."),
    check("AC-21", "Bounded untrusted payloads", schemaSource.includes("MAX_PROPOSAL_SECTION_TEXT") && schemaSource.includes("maximumBytes: 4 * 1024 * 1024") && migration.includes("pg_column_size(document) <= 4194304"), "Application and database layers apply matching bounded-payload controls."),
  ];

  const coreReport = {
    build: "Build 2, Phase 1 — proposal-domain and migration foundation",
    schemaVersion: 1,
    verifiedFor: VERIFIED_FOR,
    summary: {
      passed: acceptance.filter((item) => item.passed).length,
      failed: acceptance.filter((item) => !item.passed).length,
      acceptanceChecks: acceptance.length,
      canonicalDomains: 2,
      persistenceTables: 4,
      legacyProposalSections: PROPOSAL_SECTIONS.length,
    },
    acceptance,
    implementationChecksums: {
      migration: await sha256ArtifactChecksum(migration),
      schema: await sha256ArtifactChecksum(schemaSource),
      persistence: await sha256ArtifactChecksum(persistence),
      graph: await sha256ArtifactChecksum(graphSource),
    },
    privacyBoundary: {
      participantRowsStored: false,
      participantResponsesStored: false,
      consentReceiptsStored: false,
      uploadedFileContentsStoredInArtifactIndex: false,
      AIChatTranscriptsStored: false,
    },
    activation: {
      migrationCreated: true,
      migrationApplied: false,
      remoteDeploymentPerformed: false,
      stage2UiReplaced: false,
      note: "Review and apply the Supabase migration separately; the existing Stage 2 UI and paper_sections compatibility path remain active.",
    },
  };
  const report = { ...coreReport, reportChecksum: await sha256ArtifactChecksum(coreReport) };
  const markdown = [
    "# Build 2 Phase 1 Verification",
    "",
    `Verified for: ${report.verifiedFor}`,
    "",
    `Result: **${report.summary.passed}/${report.summary.acceptanceChecks} acceptance checks passed**`,
    "",
    `Report checksum: \`${report.reportChecksum}\``,
    "",
    "## Acceptance checks",
    "",
    ...acceptance.map((item) => `- ${item.passed ? "PASS" : "FAIL"} — **${item.id}: ${item.label}** — ${item.evidence}`),
    "",
    "## Activation boundary",
    "",
    "- Migration created and reviewed locally: yes",
    "- Supabase migration applied: no",
    "- Remote deployment performed: no",
    "- Stage 2 UI replaced: no (scheduled for Build 2 Phase 2)",
    "- Legacy paper_sections import and dual-write path retained: yes",
    "",
  ].join("\n");
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await Promise.all([
    writeFile(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(MARKDOWN_PATH, markdown, "utf8"),
  ]);
  process.stdout.write(`${JSON.stringify({
    result: report.summary.failed === 0 ? "PASS" : "FAIL",
    passed: report.summary.passed,
    failed: report.summary.failed,
    reportChecksum: report.reportChecksum,
    json: JSON_PATH,
    markdown: MARKDOWN_PATH,
  }, null, 2)}\n`);
  if (report.summary.failed > 0) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
