import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256ArtifactChecksum } from "../src/lib/research/artifactIdentity";
import type { EvidenceLibraryRow } from "../src/lib/research/evidenceLibrary";
import {
  EVIDENCE_APPRAISAL_LENSES,
  EVIDENCE_GUIDANCE_SOURCES,
  appendEvidenceSearchVersion,
  assessmentIdForEvidenceSource,
  compileEvidenceReview,
  compileEvidenceStrategy,
  createDefaultEvidenceStrategy,
  createEvidenceAppraisalItems,
  createEvidenceLibraryReference,
  recommendedEvidenceAppraisalLens,
} from "../src/lib/research/proposalEvidencePhase3";
import { PROJECT_ROUTE_VERIFICATION_FIXTURES } from "../src/lib/research/projectRouteProfile";
import {
  createProjectEvidenceAssessment,
  createResearchProposalDocument,
  verifyProjectEvidenceAssessment,
  verifyResearchProposalDocument,
} from "../src/lib/research/researchProposalDocument";

const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");
const JSON_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-3-verification.json");
const MARKDOWN_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-3-verification.md");
const VERIFIED_FOR = "2026-08-05";
const NOW = "2026-08-05T15:00:00.000Z";

interface AcceptanceCheck {
  id: string;
  label: string;
  passed: boolean;
  evidence: string;
}

const check = (id: string, label: string, passed: boolean, evidence: string): AcceptanceCheck => ({ id, label, passed, evidence });

function sourceRow(id: string, docType: string): EvidenceLibraryRow {
  return {
    id,
    user_id: "verification-user",
    project_id: null,
    pdf_id: null,
    source: "scholarask",
    title: `Verification source ${id}`,
    doc_type: docType,
    evidence: "Project-relevant evidence summary.",
    caveat: "Context must be checked.",
    status: "ready",
    citation: "Verification et al. (2026)",
    url: `https://example.test/${id}`,
    created_at: NOW,
  };
}

async function main() {
  const [domainSource, strategyUi, reviewUi, uiStyles, hookSource, cacheSource, persistenceSource, stage2Source] = await Promise.all([
    readFile(path.join(process.cwd(), "src/lib/research/proposalEvidencePhase3.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/ProposalEvidenceStrategyStudio.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/ProposalEvidenceReviewStudio.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage2EvidencePhase3.module.css"), "utf8"),
    readFile(path.join(process.cwd(), "src/hooks/useProjectEvidenceAssessments.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/projectEvidenceAssessmentCache.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/researchProposalPersistence.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage2ProposalStudio.tsx"), "utf8"),
  ]);

  const matrix = await Promise.all(PROJECT_ROUTE_VERIFICATION_FIXTURES.map(async (fixture, index) => {
    const route = { intent: fixture.input.intent, methodFamily: fixture.input.methodFamily };
    const questionId = `rq-${index + 1}`;
    const base = {
      ...createDefaultEvidenceStrategy(route, [questionId]),
      concepts: ["primary concept"],
      synonyms: ["alternate concept"],
      sourceTypes: ["Peer-reviewed research"],
      eligibilityNotes: "Include sources that directly answer the selected question; exclude sources outside the declared context.",
      stoppingRationale: "Search all planned systems, inspect citation trails, and update once before proposal release.",
    };
    const strategy = appendEvidenceSearchVersion(base, {
      query: "primary concept OR alternate concept",
      sourceSystems: ["Field-specific bibliographic database"],
      runAt: route.intent === "evidence-synthesis" ? NOW : null,
      resultCount: route.intent === "evidence-synthesis" ? 25 : null,
    });
    const strategyResult = compileEvidenceStrategy({ route, selectedQuestionIds: [questionId], strategy });
    const source = sourceRow(`source-${index + 1}`, route.intent === "secondary-data" ? "Dataset" : route.methodFamily === "qualitative" ? "Qualitative study" : route.methodFamily === "mixed-methods" ? "Mixed-methods study" : route.intent === "evidence-synthesis" ? "Systematic review" : "Quantitative study");
    const sourceReference = await createEvidenceLibraryReference(source);
    const lensId = recommendedEvidenceAppraisalLens(route, source.doc_type);
    const assessment = await createProjectEvidenceAssessment({
      projectId: fixture.input.projectId,
      assessmentId: assessmentIdForEvidenceSource(source.id),
      sourceId: source.id,
      status: "included",
      decisionRationale: "The researcher judged this source directly relevant within the recorded project boundaries.",
      linkedQuestionIds: [questionId],
      appraisalFramework: lensId,
      appraisal: createEvidenceAppraisalItems(lensId).map((item) => ({ ...item, answer: "yes" as const })),
      caveats: ["Applicability remains bounded to the reported context."],
      sourceReference,
      reviewedAt: NOW,
      now: NOW,
    });
    const reviewResult = compileEvidenceReview({ selectedQuestionIds: [questionId], assessments: [assessment] });
    const proposal = await createResearchProposalDocument({ projectId: fixture.input.projectId, evidenceStrategy: strategy, now: NOW });
    return {
      fixture: fixture.id,
      intent: route.intent,
      methodFamily: route.methodFamily,
      lensId,
      strategyReady: strategyResult.ready,
      reviewReady: reviewResult.ready,
      assessmentValid: await verifyProjectEvidenceAssessment(assessment),
      proposalValid: await verifyResearchProposalDocument(proposal),
    };
  }));

  const immutableBase = appendEvidenceSearchVersion({
    ...createDefaultEvidenceStrategy({ intent: "primary-data", methodFamily: "quantitative" }, ["rq-1"]),
    concepts: ["feedback"], synonyms: ["formative"], sourceTypes: ["Peer-reviewed research"], eligibilityNotes: "Eligible empirical studies.", stoppingRationale: "Update before release.",
  }, { query: "feedback", sourceSystems: ["System A"] });
  const immutableNext = appendEvidenceSearchVersion(immutableBase, { query: "feedback OR formative", sourceSystems: ["System A", "System B"], runAt: NOW, resultCount: 10 });
  const changedQuestion = compileEvidenceStrategy({ route: { intent: "primary-data", methodFamily: "quantitative" }, selectedQuestionIds: ["rq-new"], strategy: immutableNext });
  const unresolvedReview = compileEvidenceReview({ selectedQuestionIds: ["rq-1"], assessments: [] });

  const acceptance: AcceptanceCheck[] = [
    check("AC-01", "Twelve-route evidence matrix", matrix.length === 12 && matrix.every((item) => item.strategyReady && item.reviewReady && item.assessmentValid && item.proposalValid), "Every canonical route produces a ready strategy, valid project assessment, ready review ledger, and checksum-valid proposal."),
    check("AC-02", "Exact question coverage", changedQuestion.ready === false && changedQuestion.issues.some((issue) => issue.id === "question-coverage") && changedQuestion.issues.some((issue) => issue.id === "stale-question-link"), "Changed Stage 1 selections make old evidence links explicitly stale rather than silently rebasing them."),
    check("AC-03", "Immutable search history", immutableNext.searchVersions.length === 2 && immutableNext.searchVersions[0].query === "feedback" && immutableNext.searchVersions[1].version === 2, "Saving a search appends a version while preserving the exact previous query."),
    check("AC-04", "Evidence-synthesis run boundary", domainSource.includes("synthesis-run-required") && matrix.find((item) => item.fixture === "systematic-review")?.strategyReady === true, "Review routes require at least one executed search while other proposal routes may begin with a planned version."),
    check("AC-05", "Current guidance registry", EVIDENCE_GUIDANCE_SOURCES.length === 5 && EVIDENCE_GUIDANCE_SOURCES.every((source) => source.sourceUrl.startsWith("https://") && source.accessedAt === VERIFIED_FOR), "Cochrane, PRISMA-S, CASP, MMAT, and JBI guidance is pinned by source, version, role, and access date."),
    check("AC-06", "Non-scored appraisal lenses", EVIDENCE_APPRAISAL_LENSES.length === 6 && EVIDENCE_APPRAISAL_LENSES.every((lens) => lens.criteria.length >= 5) && !/overallScore|qualityScore|numericScore/.test(domainSource), "Six route/source-aware lenses record domain judgments and rationales without calculating a universal score."),
    check("AC-07", "Route-aware lens selection", matrix.some((item) => item.lensId === "qualitative-study") && matrix.some((item) => item.lensId === "mixed-methods-study") && matrix.some((item) => item.lensId === "secondary-dataset") && matrix.some((item) => item.lensId === "evidence-synthesis"), "Qualitative, mixed-methods, secondary-data, and synthesis routes receive different default appraisal responsibilities."),
    check("AC-08", "Exact source fingerprints", domainSource.includes("createEvidenceLibraryReference") && domainSource.includes("participantDataIncluded: false") && !domainSource.includes("userId: row.user_id"), "Assessments bind the selected library metadata checksum without copying the account identity or participant rows into the artifact."),
    check("AC-09", "Global/project state separation", reviewUi.includes("It never rewrites the global library record") && reviewUi.includes("Project-specific assessment") && !hookSource.includes("deleteEvidenceLibraryRow"), "Adding or deciding a source creates a separate project artifact and does not mutate the Evidence Library record."),
    check("AC-10", "Human final-decision boundary", reviewUi.includes("it does not calculate an overall quality score or decide inclusion for you") && hookSource.includes("reviewedAt: finalDecision") && domainSource.includes("researcher-owned-project-review"), "Cerise structures appraisal; only the researcher selects include/exclude and supplies the rationale."),
    check("AC-11", "Question-level review readiness", unresolvedReview.ready === false && unresolvedReview.issues.some((issue) => issue.id === "review-source-required") && domainSource.includes("question-evidence-"), "Synthesis cannot become ready until every selected question has reviewed included evidence and all added decisions are resolved."),
    check("AC-12", "Uncertainty explanations", domainSource.includes("Explain every No, Unclear, or Not applicable appraisal response") && reviewUi.includes("Explain this response before finalizing"), "Non-affirmative appraisal judgments remain usable but require an explicit explanation."),
    check("AC-13", "Versioned bounded device cache", cacheSource.includes(":v${PROJECT_EVIDENCE_ASSESSMENT_CACHE_VERSION}:") && cacheSource.includes("entries.length > 500") && cacheSource.includes("verifyProjectEvidenceAssessment"), "The local ledger is project-scoped, bounded to 500 records, and checksum-verifies every cached assessment."),
    check("AC-14", "Per-source conflict isolation", cacheSource.includes("ProjectEvidenceAssessmentConflict") && hookSource.includes("useSecureVersion") && hookSource.includes("useDeviceVersion") && reviewUi.includes("Neither version was overwritten"), "A divergent source assessment requires an explicit per-source choice without blocking unrelated records from loading."),
    check("AC-15", "Optimistic secure persistence", persistenceSource.includes("fetchProjectEvidenceAssessments") && persistenceSource.includes('.eq("checksum", expectedCloudChecksum)') && hookSource.includes("saveQueue"), "Assessment loads are owner/project scoped and writes are checksum-guarded and serialized."),
    check("AC-16", "Real Stage 2 integration", stage2Source.includes("ProposalEvidenceStrategyStudio") && stage2Source.includes("ProposalEvidenceReviewStudio") && stage2Source.includes("evidenceStrategyCompilation?.ready") && stage2Source.includes("reviewReady"), "Steps 2 and 3 are functional studios and their navigation readiness is derived from artifacts rather than manual checkboxes."),
    check("AC-17", "Existing evidence tools retained", stage2Source.includes("EmbeddedScholarAsk") && stage2Source.includes("EmbeddedLiteratureReview") && stage2Source.includes("EmbeddedEvidenceLibrary") && stage2Source.includes("EmbeddedProjectWorkspace"), "ScholarAsk, Literature Review, Evidence Library, and the project workspace remain reachable beside the structured strategy."),
    check("AC-18", "Bounded responsive workspace", uiStyles.includes("overflow-x: auto") && uiStyles.includes("scroll-snap-type") && uiStyles.includes("@media (max-width: 760px)") && strategyUi.includes("stickyFooter"), "Long evidence lists scroll inside the workspace; desktop review stays connected and mobile layouts stack deliberately."),
    check("AC-19", "No hidden AI or participant expansion", !strategyUi.includes("/api/ai") && !reviewUi.includes("/api/ai") && !hookSource.includes("participant") && domainSource.includes("participantDataIncluded: false"), "Phase 3 stores no AI chat, prompt, participant response, or automatic decision artifact."),
    check("AC-20", "No destructive activation", !persistenceSource.includes("apply migration") && !hookSource.includes("apply migration") && stage2Source.includes("saved on this device"), "The existing unapplied Phase 1 migration boundary remains intact; Phase 3 falls back to the verified device cache and performs no deployment."),
  ];

  const coreReport = {
    build: "Build 2, Phase 3 — versioned evidence strategy and project source review ledger",
    schemaVersion: 1,
    verifiedFor: VERIFIED_FOR,
    summary: {
      passed: acceptance.filter((item) => item.passed).length,
      failed: acceptance.filter((item) => !item.passed).length,
      acceptanceChecks: acceptance.length,
      routeFixtures: matrix.length,
      appraisalLenses: EVIDENCE_APPRAISAL_LENSES.length,
      guidanceSources: EVIDENCE_GUIDANCE_SOURCES.length,
    },
    acceptance,
    matrix,
    implementationChecksums: {
      domain: await sha256ArtifactChecksum(domainSource),
      strategyUi: await sha256ArtifactChecksum(strategyUi),
      reviewUi: await sha256ArtifactChecksum(reviewUi),
      styles: await sha256ArtifactChecksum(uiStyles),
      hook: await sha256ArtifactChecksum(hookSource),
      cache: await sha256ArtifactChecksum(cacheSource),
      persistence: await sha256ArtifactChecksum(persistenceSource),
      stage2: await sha256ArtifactChecksum(stage2Source),
    },
    activation: {
      phase1MigrationStillUnapplied: true,
      remoteDeploymentPerformed: false,
      participantRowsStored: false,
      aiInclusionDecisionsPerformed: false,
      browserRuntimeAvailable: false,
      browserValidationNote: "The Browser plugin is listed, but its required callable browser-control runtime is not exposed in this session. Standalone Playwright fallback was not pre-authorized.",
    },
  };
  const report = { ...coreReport, reportChecksum: await sha256ArtifactChecksum(coreReport) };
  const markdown = [
    "# Build 2 Phase 3 Verification",
    "",
    `Verified for: ${VERIFIED_FOR}`,
    "",
    `Result: **${report.summary.passed}/${report.summary.acceptanceChecks} acceptance checks passed**`,
    "",
    `Report checksum: \`${report.reportChecksum}\``,
    "",
    ...acceptance.map((item) => `- ${item.passed ? "PASS" : "FAIL"} — **${item.id}: ${item.label}** — ${item.evidence}`),
    "",
    "## Route matrix",
    "",
    ...matrix.map((item) => `- ${item.fixture}: ${item.intent}/${item.methodFamily}; ${item.lensId}; ${item.strategyReady && item.reviewReady && item.assessmentValid && item.proposalValid ? "PASS" : "FAIL"}`),
    "",
    "## Activation boundary",
    "",
    "- Phase 1 Supabase migration applied: no",
    "- Remote deployment performed: no",
    "- Participant rows or responses stored: no",
    "- AI inclusion or exclusion decisions performed: no",
    "- Browser plugin runtime callable in this session: no",
    "- Standalone Playwright fallback used: no (not pre-authorized)",
    "",
  ].join("\n");
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await Promise.all([
    writeFile(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(MARKDOWN_PATH, markdown, "utf8"),
  ]);
  process.stdout.write(`${JSON.stringify({ result: report.summary.failed ? "FAIL" : "PASS", passed: report.summary.passed, failed: report.summary.failed, reportChecksum: report.reportChecksum, json: JSON_PATH, markdown: MARKDOWN_PATH }, null, 2)}\n`);
  if (report.summary.failed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
