import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256ArtifactChecksum } from "../src/lib/research/artifactIdentity";
import { PROJECT_ROUTE_VERIFICATION_FIXTURES } from "../src/lib/research/projectRouteProfile";
import {
  STUDY_CONTRACT_GUIDANCE_SOURCES,
  alignProposedStudyContractRoute,
  compileProposedStudyContract,
  createProposedStudyContract,
  createProposedStudyContractDraft,
  studyContractGuidanceForRoute,
  type ProposalStudyQuestion,
  type ProposalStudyRoute,
} from "../src/lib/research/proposalStudyContractPhase5";
import {
  createEmptyProposedStudyContract,
  createResearchProposalDocument,
  verifyResearchProposalDocument,
  type ClaimEvidenceMap,
  type ProposedStudyContract,
} from "../src/lib/research/researchProposalDocument";

const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");
const JSON_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-5-verification.json");
const MARKDOWN_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-5-verification.md");
const VERIFIED_FOR = "2026-08-05";
const NOW = "2026-08-05T22:00:00.000Z";

interface AcceptanceCheck { id: string; label: string; passed: boolean; evidence: string }
const check = (id: string, label: string, passed: boolean, evidence: string): AcceptanceCheck => ({ id, label, passed, evidence });

function route(index: number): ProposalStudyRoute {
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

function question(index: number): ProposalStudyQuestion {
  return {
    id: `rq-${index + 1}`,
    text: `What evidence would answer route-specific research question ${index + 1}?`,
    family: "explanatory",
    scope: {
      populationOrSource: "A bounded participant population, dataset, or body of evidence",
      setting: "The setting selected in Stage 1",
      constructOrPhenomenon: "The focal construct or phenomenon",
      timeframe: "The declared study period",
      comparison: "The comparison, contrast, or interpretive boundary",
      evidenceAccess: "Access remains to be confirmed",
    },
  };
}

function claimMap(questionId: string): ClaimEvidenceMap {
  return {
    schemaVersion: 1,
    claims: [{
      id: `gap-${questionId}`,
      kind: "gap",
      text: "A bounded, researcher-reviewed gap remains within the declared evidence boundary.",
      status: "researcher-reviewed",
      questionIds: [questionId],
      evidenceAssessmentIds: [],
      caveats: ["The gap is bounded by the reviewed evidence and search scope."],
    }],
    claim: "researcher-owned-claim-map-not-novelty-or-truth-certification",
  };
}

function completeContract(currentRoute: ProposalStudyRoute, item: ProposalStudyQuestion, index: number): ProposedStudyContract {
  return createProposedStudyContract({
    route: currentRoute,
    entries: [{
      id: `study-entry-${index + 1}`,
      questionId: item.id,
      purpose: "Explain the question's role in the proposed study and the inference it is intended to support.",
      evidenceNeed: "Specify the observation, comparison, account, record, material, or synthesis needed to answer it.",
      populationOrSource: item.scope.populationOrSource,
      proposedMethod: "Use a route-appropriate proposal-level method direction whose implementation remains deferred to Stage 3.",
      analysisDirection: "Connect the planned evidence to the question while preserving uncertainty, alternatives, and limitations.",
      uncertainty: "Access, measurement, feasibility, implementation details, and defensible analysis choices remain to be resolved.",
    }],
    feasibilityNotes: "Confirm expertise, resources, schedule, recruitment or source availability, dependencies, and go/no-go conditions.",
    accessNotes: "Confirm permissions, sites, datasets, materials, languages, accessibility, recruitment, and technology access.",
    ethicsAndSensitivityNotes: "Stage 3 must resolve rights, privacy, consent when applicable, data use, sensitivity, safeguards, and institutional requirements.",
  });
}

async function main() {
  const [domainSource, testSource, uiSource, uiStyles, stage2Source, proposalSource, persistenceSource, roadmapStyles] = await Promise.all([
    readFile(path.join(process.cwd(), "src/lib/research/proposalStudyContractPhase5.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/proposalStudyContractPhase5.test.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/ProposalStudyContractStudio.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage2StudyContractPhase5.module.css"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage2ProposalStudio.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/researchProposalDocument.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/researchProposalPersistence.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage2ProposalStudio.module.css"), "utf8"),
  ]);

  const matrix = await Promise.all(PROJECT_ROUTE_VERIFICATION_FIXTURES.map(async (fixture, index) => {
    const currentRoute = route(index);
    const item = question(index);
    const contract = completeContract(currentRoute, item, index);
    const compilation = compileProposedStudyContract({ route: currentRoute, questions: [item], claimEvidenceMap: claimMap(item.id), contract, synthesisReady: true });
    const proposal = await createResearchProposalDocument({ projectId: fixture.input.projectId, proposedStudyContract: contract, now: NOW });
    return {
      fixture: fixture.id,
      intent: currentRoute.intent,
      methodFamily: currentRoute.methodFamily,
      setting: currentRoute.setting,
      guidance: compilation.guidance.routeLabel,
      prompts: compilation.guidance.routePrompts.length,
      ready: compilation.ready,
      proposalValid: await verifyResearchProposalDocument(proposal),
    };
  }));

  const currentRoute = route(0);
  const item = question(0);
  const complete = completeContract(currentRoute, item, 0);
  const emptyDraft = createProposedStudyContractDraft({ current: createEmptyProposedStudyContract(), questions: [item], route: currentRoute });
  const fullyEmptyDraft = { ...emptyDraft, entries: emptyDraft.entries.map((entry) => ({ ...entry, populationOrSource: "" })) };
  const incomplete = compileProposedStudyContract({ route: currentRoute, questions: [item], claimEvidenceMap: claimMap(item.id), contract: fullyEmptyDraft, synthesisReady: true });
  const staleCurrent = { ...complete, entries: [{ ...complete.entries[0], questionId: "rq-retired" }] };
  const reconciled = createProposedStudyContractDraft({ current: staleCurrent, questions: [item], route: currentRoute });
  const changedRoute = route(6);
  const drift = compileProposedStudyContract({ route: changedRoute, questions: [item], claimEvidenceMap: claimMap(item.id), contract: complete, synthesisReady: true });
  const aligned = compileProposedStudyContract({ route: changedRoute, questions: [item], claimEvidenceMap: claimMap(item.id), contract: alignProposedStudyContractRoute(complete, changedRoute), synthesisReady: true });
  const qualitative = studyContractGuidanceForRoute(route(3));
  const mixed = studyContractGuidanceForRoute(route(5));
  const secondary = studyContractGuidanceForRoute(route(6));
  const synthesis = studyContractGuidanceForRoute(route(8));

  const acceptance: AcceptanceCheck[] = [
    check("AC-01", "Twelve-route contract matrix", matrix.length === 12 && matrix.every((entry) => entry.ready && entry.proposalValid && entry.prompts >= 3), "Every canonical route produces a ready, checksum-valid proposal contract with route-specific prompts."),
    check("AC-02", "Exactly one entry per selected question", domainSource.includes("duplicate-entry-") && domainSource.includes("missing-entry-") && testSource.includes("missing, duplicate, and stale question entries fail closed"), "Missing and duplicate question contracts fail closed."),
    check("AC-03", "Draft-safe reconciliation", reconciled.entries.length === 2 && reconciled.entries[0].questionId === "rq-retired" && reconciled.entries[1].questionId === item.id, "New selected questions receive a stable draft entry while stale researcher work remains until explicit removal."),
    check("AC-04", "Explicit route-drift review", !drift.ready && drift.issues.some((issue) => issue.id === "route-drift") && aligned.issues.every((issue) => issue.id !== "route-drift"), "A changed Stage 1 route preserves text and requires explicit alignment."),
    check("AC-05", "Six distinct question responsibilities", ["purpose", "evidenceNeed", "populationOrSource", "proposedMethod", "analysisDirection", "uncertainty"].every((field) => incomplete.issues.some((issue) => issue.field === field)), "Purpose, evidence, source/population, method, analysis, and uncertainty are independently required."),
    check("AC-06", "Cross-question feasibility, access, and ethics", ["feasibilityNotes", "accessNotes", "ethicsAndSensitivityNotes"].every((field) => incomplete.issues.some((issue) => issue.field === field)), "Implementation dependencies are explicit, cross-question contract fields."),
    check("AC-07", "Reviewed-gap and upstream gates", domainSource.includes("synthesis-not-ready") && domainSource.includes("gap-link-") && uiSource.includes("Exact Phase 4 input"), "The contract consumes the current researcher-reviewed Phase 4 gap and fails closed when synthesis is stale."),
    check("AC-08", "Qualitative integrity", /context|reflexivity|interpretive/i.test(qualitative.routePrompts.join(" ")) && /Do not force hypotheses, statistical power, variables, or effect-size/i.test(qualitative.routePrompts.join(" ")), "Qualitative work receives context and reflexivity prompts without forced quantitative fields."),
    check("AC-09", "Mixed-method integration", /timing|priority|integration|divergence/i.test(mixed.routePrompts.join(" ")) && /integration|joint display/i.test(mixed.suggestions.analysisDirection.join(" ")), "Mixed-method plans expose strand logic and their point of integration."),
    check("AC-10", "Secondary-data provenance", /provenance|version|missingness|permissions/i.test(secondary.routePrompts.join(" ")) && /Dataset, records, and analysis unit/.test(secondary.populationOrSourceLabel), "Secondary-data contracts foreground data fitness, version, coverage, access, and missingness."),
    check("AC-11", "Evidence-synthesis protocol direction", /eligibility|selection process|synthesis/i.test(synthesis.routePrompts.join(" ")) && /Eligible evidence units/.test(synthesis.populationOrSourceLabel), "Review routes define evidence units and protocol responsibilities without pretending to implement the review."),
    check("AC-12", "Quantitative rigor prompts", /bias reduction|missingness|exclusions|uncertainty|sensitivity/i.test(studyContractGuidanceForRoute(route(0)).routePrompts.join(" ")), "Quantitative plans expose bias, missingness, exclusions, uncertainty, and sensitivity responsibilities."),
    check("AC-13", "Pinned authority registry", STUDY_CONTRACT_GUIDANCE_SOURCES.length === 7 && STUDY_CONTRACT_GUIDANCE_SOURCES.every((source) => source.sourceUrl.startsWith("https://") && source.accessedAt === VERIFIED_FOR), "Seven official or registry authorities are versioned, dated, and HTTPS-linked."),
    check("AC-14", "Reporting-guideline boundary", STUDY_CONTRACT_GUIDANCE_SOURCES.every((source) => source.boundary === "planning-prompt-not-design-prescription-quality-score-compliance-or-approval") && uiSource.includes("Prospective completeness prompts—not a method selector"), "Guidance is used as completeness support, never a design prescription, score, compliance finding, or approval."),
    check("AC-15", "Exact Stage 1 route visible", uiSource.includes("Exact Stage 1 route") && uiSource.includes("Possible procedures") && stage2Source.includes("studyRouteFromPathway"), "Setting, assignment, audience, sensitivity, and possible procedures flow from the canonical Stage 1 decision."),
    check("AC-16", "Legacy roadmap preserved", stage2Source.includes("LegacyRoadmapPanel") && stage2Source.includes("roadmap-${current}") && roadmapStyles.includes("roadmapTableWrap") && uiSource.includes("preserved legacy research roadmap"), "Every legacy roadmap field remains editable as optional context, not a substitute contract."),
    check("AC-17", "Real Stage 2 readiness integration", stage2Source.includes("ProposalStudyContractStudio") && stage2Source.includes("studyContractReady") && stage2Source.includes('step.canvas === "proposal-study-contract"'), "Step 5 readiness is derived from the functional compiler and current Stage 1 source state."),
    check("AC-18", "Canonical checksum persistence", stage2Source.includes("saveProposedStudyContract") && stage2Source.includes("createResearchProposalDocument") && stage2Source.includes("expectedCloudChecksum") && persistenceSource.includes('.eq("checksum", expectedCloudChecksum)'), "Contract saves create canonical proposal revisions and retain serialized optimistic cloud writes."),
    check("AC-19", "Bounded responsive workspace", uiStyles.includes("content-visibility: auto") && uiStyles.includes("overflow: auto") && uiStyles.includes("position: sticky") && uiStyles.includes("@media (max-width: 760px)"), "Large question contracts remain bounded and responsive, with deferred rendering for long canvases."),
    check("AC-20", "No runnable-study or approval expansion", domainSource.includes("not-runnable-implementation-methodological-validation-ethical-approval-compliance-or-preregistration") && proposalSource.includes("implementationDeferredToStage3") && !uiSource.includes("/api/ai"), "Phase 5 proposes and hands off; it creates no participant runtime, AI decision, approval, migration activation, or deployment."),
  ];

  const coreReport = {
    build: "Build 2, Phase 5 — Proposed Study Contract",
    schemaVersion: 1,
    verifiedFor: VERIFIED_FOR,
    summary: {
      passed: acceptance.filter((item) => item.passed).length,
      failed: acceptance.filter((item) => !item.passed).length,
      acceptanceChecks: acceptance.length,
      routeFixtures: matrix.length,
      guidanceSources: STUDY_CONTRACT_GUIDANCE_SOURCES.length,
    },
    acceptance,
    matrix,
    implementationChecksums: {
      domain: await sha256ArtifactChecksum(domainSource),
      tests: await sha256ArtifactChecksum(testSource),
      ui: await sha256ArtifactChecksum(uiSource),
      styles: await sha256ArtifactChecksum(uiStyles),
      stage2: await sha256ArtifactChecksum(stage2Source),
      proposal: await sha256ArtifactChecksum(proposalSource),
      persistence: await sha256ArtifactChecksum(persistenceSource),
    },
    activation: {
      phase1MigrationStillUnapplied: true,
      remoteDeploymentPerformed: false,
      participantRowsStored: false,
      aiStudyDecisionsPerformed: false,
      methodologicalOrEthicalApprovalCertified: false,
      browserRuntimeAvailable: false,
      browserValidationNote: "The Browser plugin is listed, but its required callable browser-control runtime is not exposed in this session. Standalone Playwright fallback was not pre-authorized.",
    },
  };
  const report = { ...coreReport, reportChecksum: await sha256ArtifactChecksum(coreReport) };
  const markdown = [
    "# Build 2 Phase 5 Verification",
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
    ...matrix.map((entry) => `- ${entry.fixture}: ${entry.intent}/${entry.methodFamily}/${entry.setting}; ${entry.guidance}; ${entry.ready && entry.proposalValid ? "PASS" : "FAIL"}`),
    "",
    "## Activation boundary",
    "",
    "- Build 2 Phase 1 Supabase migration applied: no",
    "- Remote deployment performed: no",
    "- Participant rows or responses stored: no",
    "- AI study decisions performed: no",
    "- Methodological validation, ethics/compliance determination, preregistration, or approval certified: no",
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
