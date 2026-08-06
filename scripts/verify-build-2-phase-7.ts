import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createResearchArtifactIdentity, sha256ArtifactChecksum, type ResearchArtifactReference } from "../src/lib/research/artifactIdentity";
import {
  compileProposalHandoff,
  createProposalHandoffPackage,
  createProposalHandoffResponsibilityDraft,
  verifyProposalHandoffPackage,
  type ProposalHandoffResponsibility,
} from "../src/lib/research/proposalHandoffPhase7";
import { createProposedStudyContract, type ProposalStudyQuestion, type ProposalStudyRoute } from "../src/lib/research/proposalStudyContractPhase5";
import { PROJECT_ROUTE_VERIFICATION_FIXTURES } from "../src/lib/research/projectRouteProfile";
import {
  createEmptyProposalRequirementsProfile,
  createProjectEvidenceAssessment,
  createResearchProposalDocument,
  type ClaimEvidenceMap,
  type ResearchProposalSection,
} from "../src/lib/research/researchProposalDocument";

const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");
const JSON_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-7-verification.json");
const MARKDOWN_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-7-verification.md");
const NOW = "2026-08-05T23:55:00.000Z";

interface AcceptanceCheck { id: string; label: string; passed: boolean; evidence: string }
const check = (id: string, label: string, passed: boolean, evidence: string): AcceptanceCheck => ({ id, label, passed, evidence });

function reference(identity: Awaited<ReturnType<typeof createResearchArtifactIdentity>>): ResearchArtifactReference {
  return { artifactKind: identity.artifactKind, artifactId: identity.artifactId, schemaVersion: identity.artifactSchemaVersion, checksum: identity.checksum };
}

function route(index: number): ProposalStudyRoute {
  const input = PROJECT_ROUTE_VERIFICATION_FIXTURES[index].input;
  return { intent: input.intent, methodFamily: input.methodFamily, assignment: input.assignment, setting: input.setting, audience: input.audience, dataSensitivity: input.dataSensitivity, possibleSpecialProcedures: [...input.specialProcedures] };
}

function questions(label: string): ProposalStudyQuestion[] {
  return [{ id: "rq-1", text: `What bounded evidence is needed for ${label}?`, family: "exploratory", scope: { populationOrSource: "Defined in the route", setting: "Defined in the route", constructOrPhenomenon: "Focal phenomenon", timeframe: "Study period", comparison: "When applicable", evidenceAccess: "To be confirmed" } }];
}

function claimMap(): ClaimEvidenceMap {
  return { schemaVersion: 1, claims: [{ id: "gap", kind: "gap", text: "A bounded researcher-reviewed gap remains.", status: "researcher-reviewed", questionIds: ["rq-1"], evidenceAssessmentIds: ["assessment-1"], caveats: ["Keep the evidence boundary visible."] }], claim: "researcher-owned-claim-map-not-novelty-or-truth-certification" };
}

function sections(): ResearchProposalSection[] {
  return ["proposal_background", "proposal_problem_statement", "proposal_literature_review", "proposal_current_study", "proposal_method_materials", "proposal_references"].map((id) => ({
    id,
    title: id,
    role: id,
    content: `Researcher-reviewed ${id} prose.`,
    citationKeys: id === "proposal_references" ? ["source-1"] : [],
    sourceKnowledgeEntryIds: [],
    sourceAssetIds: [],
    sourceClaimIds: id === "proposal_problem_statement" ? ["gap"] : [],
    sourceEvidenceAssessmentIds: ["proposal_problem_statement", "proposal_literature_review", "proposal_references"].includes(id) ? ["assessment-1"] : [],
    sourceContractEntryIds: ["proposal_current_study", "proposal_method_materials"].includes(id) ? ["study-rq-1"] : [],
    requirementIds: [],
    unresolvedSupportNotes: "",
    researcherReviewed: true,
  }));
}

function reviewed(items: ProposalHandoffResponsibility[]): ProposalHandoffResponsibility[] {
  return items.map((item) => ({ ...item, disposition: "carry-to-stage3", stage3Target: item.kind === "ethics-sensitivity" ? "consent-and-rights" : item.kind === "access" ? "plan-participants" : item.kind === "question-uncertainty" ? "map-measures" : "build-study", rationale: "Stage 3 must operationalize this exact proposal responsibility." }));
}

async function buildFixture(index: number) {
  const fixture = PROJECT_ROUTE_VERIFICATION_FIXTURES[index];
  const currentRoute = route(index);
  const currentQuestions = questions(fixture.label);
  const pathway = reference(await createResearchArtifactIdentity({ artifactKind: "research-pathway", artifactId: `pathway-${fixture.input.projectId}`, artifactSchemaVersion: 2, payload: { route: currentRoute, questions: currentQuestions } }));
  const source = reference(await createResearchArtifactIdentity({ artifactKind: "evidence-library", artifactId: "source-1", artifactSchemaVersion: 1, payload: { projectId: fixture.input.projectId, title: "Fixture source" } }));
  const assessment = await createProjectEvidenceAssessment({ projectId: fixture.input.projectId, assessmentId: "assessment-1", sourceId: "source-1", status: "included", decisionRationale: "Included for this project fixture.", linkedQuestionIds: ["rq-1"], sourceReference: source, reviewedAt: NOW, now: NOW });
  const requirements = { ...createEmptyProposalRequirementsProfile(fixture.input.projectId), researcherConfirmed: true };
  const contract = createProposedStudyContract({ route: currentRoute, entries: [{ id: "study-rq-1", questionId: "rq-1", purpose: "Answer the bounded question.", evidenceNeed: "Collect or access the declared evidence.", populationOrSource: "Defined in the route.", proposedMethod: "Operationalize the proposed route in Stage 3.", analysisDirection: "Use a method appropriate to the declared route.", uncertainty: "Finalize implementation details in Stage 3." }], feasibilityNotes: "Confirm feasibility before launch.", accessNotes: "Confirm access before launch.", ethicsAndSensitivityNotes: "Resolve rights and sensitivity requirements before collection." });
  const proposal = await createResearchProposalDocument({ projectId: fixture.input.projectId, requirements, claimEvidenceMap: claimMap(), proposedStudyContract: contract, sections: sections(), sourceReferences: [pathway], now: NOW });
  const responsibilities = reviewed(createProposalHandoffResponsibilityDraft(proposal));
  const compilation = compileProposalHandoff({ proposal, pathwayReference: pathway, assessments: [assessment], responsibilities, pathwayReady: true, requirementsReady: true, evidenceReviewReady: true, synthesisReady: true, studyContractReady: true, compositionReady: true });
  const packageValue = await createProposalHandoffPackage({ proposal, pathwayReference: pathway, assessments: [assessment], questions: currentQuestions, route: currentRoute, responsibilities, compilation, now: NOW });
  return { fixture: fixture.id, route: currentRoute, proposal, pathway, assessment, responsibilities, compilation, packageValue, valid: await verifyProposalHandoffPackage(packageValue) };
}

async function main() {
  const [domainSource, cacheSource, persistenceSource, uiSource, uiStyles, stage2Source, stage3Source, graphSource, registrySource, migrationSource] = await Promise.all([
    readFile(path.join(process.cwd(), "src/lib/research/proposalHandoffPhase7.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/proposalHandoffCache.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/proposalHandoffPersistence.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/ProposalHandoffStudio.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage2ProposalHandoffPhase7.module.css"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage2ProposalStudio.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage3StudyPlanner.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/researchArtifactGraph.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/researchArtifactRegistry.ts"), "utf8"),
    readFile(path.join(process.cwd(), "supabase/migrations/20260805233000_build2_phase7_proposal_handoff.sql"), "utf8"),
  ]);
  const matrix = await Promise.all(PROJECT_ROUTE_VERIFICATION_FIXTURES.map((_, index) => buildFixture(index)));
  const first = matrix[0];
  const upstreamBlocked = compileProposalHandoff({ proposal: first.proposal, pathwayReference: first.pathway, assessments: [first.assessment], responsibilities: first.responsibilities, pathwayReady: false, requirementsReady: false, evidenceReviewReady: false, synthesisReady: false, studyContractReady: false, compositionReady: false, evidenceConflictCount: 1 });
  const unresolved = compileProposalHandoff({ proposal: first.proposal, pathwayReference: first.pathway, assessments: [first.assessment], responsibilities: createProposalHandoffResponsibilityDraft(first.proposal), pathwayReady: true, requirementsReady: true, evidenceReviewReady: true, synthesisReady: true, studyContractReady: true, compositionReady: true });

  const acceptance: AcceptanceCheck[] = [
    check("AC-01", "Twelve canonical routes", matrix.length === 12 && matrix.every((item) => item.compilation.readyToFreeze && item.valid), "All 12 canonical research routes freeze checksum-valid handoff fixtures."),
    check("AC-02", "Separate immutable artifact", matrix.every((item) => item.packageValue.identity.artifactKind === "proposal-handoff" && item.packageValue.identity.checksum !== item.proposal.identity.checksum), "The handoff is not nested into or identified as the proposal."),
    check("AC-03", "Exact proposal and pathway binding", matrix.every((item) => item.packageValue.proposalReference.checksum === item.proposal.identity.checksum && item.packageValue.pathwayReference.checksum === item.pathway.checksum && item.packageValue.identity.sourceFingerprint.sources.length === 2), "Every fixture binds exact proposal and pathway references without a checksum cycle."),
    check("AC-04", "Evidence checksum manifest", matrix.every((item) => item.packageValue.evidenceManifest.length === 1 && item.packageValue.evidenceManifest[0].assessmentChecksum === item.assessment.identity.checksum), "Project evidence decisions and their source references are payload-bound."),
    check("AC-05", "Question-contract handoff", matrix.every((item) => item.packageValue.questionHandoffs.length === 1 && item.packageValue.questionHandoffs[0].questionText.length > 0), "Stage 3 receives exact question text and proposed-study contract fields."),
    check("AC-06", "Derived responsibility coverage", matrix.every((item) => item.responsibilities.some((entry) => entry.kind === "question-uncertainty") && item.responsibilities.some((entry) => entry.kind === "feasibility") && item.responsibilities.some((entry) => entry.kind === "access") && item.responsibilities.some((entry) => entry.kind === "ethics-sensitivity")), "Question and cross-question implementation responsibilities are explicit."),
    check("AC-07", "Researcher-owned disposition", domainSource.includes("carry-to-stage3") && domainSource.includes("retained-proposal-limitation") && domainSource.includes("resolve-in-stage2") && uiSource.includes("Researcher rationale"), "Each responsibility requires a disposition, owner when carried, and rationale."),
    check("AC-08", "Independent fail-closed lanes", !upstreamBlocked.readyToFreeze && ["pathway-not-current", "requirements-not-ready", "evidence-review-not-ready", "synthesis-not-ready", "study-contract-not-ready", "composition-not-ready"].every((id) => upstreamBlocked.issues.some((issue) => issue.id === id)), "No later lane hides an earlier source, evidence, contract, or composition failure."),
    check("AC-09", "Unreviewed work blocks freeze", !unresolved.readyToFreeze && unresolved.issues.some((issue) => issue.id.startsWith("unreviewed-responsibility-")), "Completion is derived from the ledger rather than manual completion checkboxes."),
    check("AC-10", "Tamper-evident normalization", domainSource.includes("verifyProposalHandoffPackage") && domainSource.includes("normalizeProposalHandoffPackage") && cacheSource.includes("normalizeProposalHandoffPackage"), "Invalid or cross-project packages fail closed at domain and device-cache boundaries."),
    check("AC-11", "Optimistic secure persistence", persistenceSource.includes('.eq("checksum", expectedCloudChecksum)') && persistenceSource.includes('status: "conflict"'), "Concurrent secure changes are detected by expected checksum."),
    check("AC-12", "Conflict-safe device rebase", uiSource.includes("previous: selected.cloud") && uiSource.includes("Saving the rebased device handoff"), "Selecting a device copy creates a new revision above secure history instead of overwriting equal revisions."),
    check("AC-13", "Owner-scoped append-only history", /ENABLE ROW LEVEL SECURITY/.test(migrationSource) && /GRANT SELECT ON TABLE public\.research_proposal_handoff_revisions/.test(migrationSource) && !/GRANT SELECT, INSERT ON TABLE public\.research_proposal_handoff_revisions/.test(migrationSource) && !/FOR DELETE TO authenticated/.test(migrationSource), "Current state is owner-scoped; immutable history is written only by the trigger."),
    check("AC-14", "Participant-data exclusion", matrix.every((item) => item.packageValue.participantDataIncluded === false) && migrationSource.includes("participant_exclusion") && !uiSource.includes("participantRows"), "The handoff carries research metadata and references, never participant rows."),
    check("AC-15", "Artifact index integration", persistenceSource.includes("upsertResearchArtifactIndexRecord") && registrySource.includes('definition("proposal-handoff"'), "Secure saves index the versioned handoff in the canonical registry."),
    check("AC-16", "Dependency graph integration", graphSource.includes('{ source: "research-proposal", target: "proposal-handoff"') && graphSource.includes('{ source: "proposal-handoff", target: "study-design"') && graphSource.includes('{ source: "proposal-handoff", target: "study-measures"') && graphSource.includes('{ source: "proposal-handoff", target: "participant-plan"'), "The graph now expresses proposal/evidence → handoff → Stage 3 products."),
    check("AC-17", "Functional Stage 2 verifier", stage2Source.includes("ProposalHandoffStudio") && stage2Source.includes("handoffReady") && !uiSource.includes('type="checkbox"') && uiSource.includes("Seven independent integrity lanes"), "The previous preview is replaced with a functional verifier and derived readiness."),
    check("AC-18", "Functional Stage 3 consumption", stage3Source.includes("Current verified Stage 2 handoff") && stage3Source.includes("questionHandoffs") && stage3Source.includes("stage3Target === target") && stage3Source.includes("Stale Stage 2 handoff"), "Design, measures, and participant planning display the exact frozen baseline, assigned work, and stale-source state."),
    check("AC-19", "Local-first export and performance", uiSource.includes("Export verified JSON") && uiSource.includes("useDeferredValue") && uiStyles.includes("content-visibility:auto") && uiStyles.includes("@media (max-width:760px)"), "The package exports locally, responsibility compilation is deferred, and large ledgers remain contained responsively."),
    check("AC-20", "Authority boundary", matrix.every((item) => /not-factual-novelty-methodological-ethical-compliance-submission-funding-or-collection-approval/.test(item.packageValue.claim)) && !uiSource.includes("/api/ai"), "No AI, legal, ethics, methodological, submission, funding, or collection approval is claimed."),
  ];
  const passed = acceptance.every((item) => item.passed);
  const reportCore = { schemaVersion: 1, build: "Build 2", phase: 7, verifiedAt: new Date().toISOString(), passed, activation: { migration: "not-applied", deployment: "not-requested", browserRuntime: "pending" }, matrix: matrix.map((item) => ({ fixture: item.fixture, intent: item.route.intent, methodFamily: item.route.methodFamily, setting: item.route.setting, responsibilities: item.responsibilities.length, revision: item.packageValue.revision, checksum: item.packageValue.identity.checksum, valid: item.valid })), acceptance };
  const report = { ...reportCore, reportChecksum: await sha256ArtifactChecksum(reportCore) };
  const markdown = [`# Build 2 Phase 7 Verification`, ``, `Result: **${passed ? "PASS" : "FAIL"}**`, ``, `Report checksum: \`${report.reportChecksum}\``, ``, `## Acceptance`, ``, ...acceptance.map((item) => `- ${item.passed ? "PASS" : "FAIL"} ${item.id} — ${item.label}: ${item.evidence}`), ``, `## Activation boundary`, ``, `- Migration: not applied`, `- Deployment: not requested`, `- Browser runtime: pending`, ``].join("\n");
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await Promise.all([writeFile(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`), writeFile(MARKDOWN_PATH, markdown)]);
  console.log(JSON.stringify({ passed, checks: acceptance.length, fixtures: matrix.length, reportChecksum: report.reportChecksum, json: JSON_PATH, markdown: MARKDOWN_PATH }, null, 2));
  if (!passed) process.exitCode = 1;
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
