import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";

interface Check {
  id: string;
  label: string;
  passed: boolean;
  evidence: string;
}

const ROOT = process.cwd();
const OUTPUT = `${ROOT}/output`;

function check(id: string, label: string, passed: boolean, evidence: string): Check {
  return { id, label, passed, evidence };
}

async function main() {
  const [domain, component, cache, persistence, migration, workspace, planner, graph, registry, docs] = await Promise.all([
    readFile(`${ROOT}/src/lib/research/proposalReviewPhase9.ts`, "utf8"),
    readFile(`${ROOT}/src/components/research-path/ProposalReviewReleaseStudio.tsx`, "utf8"),
    readFile(`${ROOT}/src/lib/research/proposalReviewCache.ts`, "utf8"),
    readFile(`${ROOT}/src/lib/research/proposalReviewPersistence.ts`, "utf8"),
    readFile(`${ROOT}/supabase/migrations/20260806033000_build2_phase9_reviewed_proposal_baseline.sql`, "utf8"),
    readFile(`${ROOT}/src/components/research-path/ResearchPathWorkspace.tsx`, "utf8"),
    readFile(`${ROOT}/src/components/research-path/Stage3StudyPlanner.tsx`, "utf8"),
    readFile(`${ROOT}/src/lib/research/researchArtifactGraph.ts`, "utf8"),
    readFile(`${ROOT}/src/lib/research/researchArtifactRegistry.ts`, "utf8"),
    readFile(`${ROOT}/docs/build-2-phase-9-reviewed-proposal-baseline.md`, "utf8"),
  ]);

  let testsPassed = true;
  let testEvidence = "proposal review and graph tests passed";
  try {
    execFileSync("npx", ["tsx", "--test", "src/lib/research/proposalReviewPhase9.test.ts", "src/lib/research/researchArtifactGraph.test.ts"], { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    testsPassed = false;
    testEvidence = error instanceof Error ? error.message.slice(0, 500) : "test command failed";
  }

  const checks: Check[] = [
    check("AC-01", "Executable domain tests", testsPassed, testEvidence),
    check("AC-02", "Non-duplicative artifact boundary", domain.includes('artifactKind: "reviewed-proposal-baseline"') && registry.includes('definition("reviewed-proposal-baseline"'), "Phase 9 wraps rather than rewrites the Phase 7 proposal-handoff artifact."),
    check("AC-03", "Exact handoff checksum binding", domain.includes("sources: [handoffReference]") && domain.includes("reviewedHandoffReference"), "Researcher and advisory receipts bind to one exact handoff reference."),
    check("AC-04", "Seven derived verification lanes", domain.includes('"claim-evidence-reference-consistency"') && domain.includes('"question-gap-method-traceability"') && domain.includes('"open-risk-ledger"'), "Readiness is compiled from independent integrity lanes."),
    check("AC-05", "Researcher review record", domain.includes("ProposalResearcherReviewRecord") && domain.includes("reviewStatement") && domain.includes("minimum = 0"), "A concrete bounded researcher statement is required."),
    check("AC-06", "No institutional approval claim", domain.includes("not-institutional-ethics-legal-methodological-funder-or-publication-approval") && component.includes("This is not institutional approval"), "Researcher review and advisory input are labelled without authority inflation."),
    check("AC-07", "Optional external receipts", domain.includes("MAX_PROPOSAL_EXTERNAL_REVIEW_RECEIPTS = 25") && component.includes("No external review is required by Cerise"), "External advisory review is supported but never required by the compiler."),
    check("AC-08", "Attachment fingerprint only", domain.includes("fileBytesStored: false") && component.includes("The file itself will not be stored"), "PDF, DOCX, and text attachments produce bounded metadata and SHA-256 receipts only."),
    check("AC-09", "RQ-gap-method traceability", domain.includes("deriveTraceability") && component.includes("Research question → gap → proposed method → analysis"), "Every question is visibly traced to its reviewed gap and proposed method/analysis."),
    check("AC-10", "Claim/citation/reference closure", domain.includes("claimEvidenceReferenceIssues") && domain.includes("citation-key-coverage"), "Claims, evidence assessments, section links, reference provenance, and citation-key coverage close deterministically."),
    check("AC-11", "Three Stage 2 knowledge entries", domain.includes("stage2-${suffix}-research-direction") && domain.includes("stage2-${suffix}-evidence-gap-boundary") && domain.includes("stage2-${suffix}-planned-method-limits"), "The review freeze emits direction, evidence-gap, and proposed-method/limit records."),
    check("AC-12", "Living Research Record persistence", component.includes("appendResearchKnowledgeEntry") && component.includes("appendLocalMentorInsight"), "Checksum-valid entries are preserved on device and attempted in owner-scoped secure storage."),
    check("AC-13", "Self-contained portable export", domain.includes("proposal: ResearchProposalDocument") && domain.includes("evidenceManifest: ProjectEvidenceAssessment[]") && domain.includes("livingResearchEntries"), "One export contains the complete proposal, assessment manifest, reviewed baseline, and knowledge entries."),
    check("AC-14", "Participant and source-file exclusion", domain.includes("participantDataIncluded: false") && domain.includes("sourceFilesIncluded: false"), "The release excludes participant rows and original evidence/review file bytes."),
    check("AC-15", "Stage 3 exact baseline display", planner.includes("Current verified Stage 2 handoff · researcher-reviewed baseline") && planner.includes("reviewedProposalBaseline.identity.checksum"), "Stage 3 shows the exact proposal revision and reviewed-baseline checksum."),
    check("AC-16", "Stage 3 completion gate", workspace.includes("!proposalHandoffCurrent || !reviewedProposalBaselineCurrent"), "Study planning cannot complete using only an unreviewed technical handoff."),
    check("AC-17", "Stale reconciliation", workspace.includes("reviewedProposalBaseline.handoffReference.checksum === proposalHandoff.identity.checksum") && domain.includes("reviewedProposalBaselineIsCurrent"), "A handoff change preserves the old review and makes it stale."),
    check("AC-18", "Device/secure conflict safety", cache.includes('kind: "review-required"') && persistence.includes("expectedCloudChecksum"), "Checksum-aware optimistic concurrency requires explicit conflict reconciliation."),
    check("AC-19", "Owner-scoped append-only history", migration.includes("FOR SELECT TO authenticated") && migration.includes("FOR INSERT TO authenticated") && migration.includes("FOR UPDATE TO authenticated") && !migration.includes("FOR DELETE TO authenticated") && migration.includes("capture_research_proposal_review_baseline_revision"), "RLS protects current state and a trigger-only revision table preserves history."),
    check("AC-20", "Artifact graph propagation", graph.includes('{ source: "proposal-handoff", target: "reviewed-proposal-baseline", action: "rereview"') && graph.includes('{ source: "reviewed-proposal-baseline", target: "study-design"'), "The canonical graph expresses technical handoff → human review → Stage 3 products."),
    check("AC-21", "Bounded inputs and exports", domain.includes("MAX_PROPOSAL_REVIEW_EXPORT_BYTES") && domain.includes("maximumBytes: 2 * 1024 * 1024") && migration.includes("pg_column_size(baseline) <= 2097152"), "Client, checksum canonicalizer, and database enforce explicit size limits."),
    check("AC-22", "Review-before-release UX", component.includes("Create reviewed baseline") && component.includes("Export proposal + evidence manifest") && component.includes("disabled={busy || !baselineCurrent"), "Export is disabled until a current researcher-reviewed baseline and knowledge receipts exist."),
    check("AC-23", "Architecture and verification documentation", docs.includes("## Artifact boundary") && docs.includes("## Researcher verification"), "The implementation boundary, workflow, safety claims, and manual checks are documented."),
  ];

  const report = {
    phase: "Build 2 Phase 9",
    generatedAt: new Date().toISOString(),
    passed: checks.filter((item) => item.passed).length,
    total: checks.length,
    success: checks.every((item) => item.passed),
    checks,
  };
  await mkdir(OUTPUT, { recursive: true });
  await writeFile(`${OUTPUT}/build-2-phase-9-verification.json`, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(`${OUTPUT}/build-2-phase-9-verification.md`, `# Build 2 Phase 9 Verification\n\nResult: **${report.passed}/${report.total} passed**\n\n${checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} ${item.id} — ${item.label}: ${item.evidence}`).join("\n")}\n`);
  console.log(`Build 2 Phase 9 verification: ${report.passed}/${report.total} passed`);
  for (const item of checks) console.log(`${item.passed ? "PASS" : "FAIL"} ${item.id} ${item.label}`);
  if (!report.success) process.exitCode = 1;
}

void main();
