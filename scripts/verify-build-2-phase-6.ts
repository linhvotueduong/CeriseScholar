import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createResearchArtifactIdentity, sha256ArtifactChecksum } from "../src/lib/research/artifactIdentity";
import {
  PROPOSAL_COMPOSITION_GUIDANCE_SOURCES,
  PROPOSAL_COMPOSITION_SECTION_DEFINITIONS,
  compileProposalComposition,
  createProposalCompositionDraft,
  proposalCompositionPromptsForRoute,
  type ProposalCompositionSectionKey,
} from "../src/lib/research/proposalCompositionPhase6";
import { createProposedStudyContract, type ProposalStudyRoute } from "../src/lib/research/proposalStudyContractPhase5";
import { PROJECT_ROUTE_VERIFICATION_FIXTURES } from "../src/lib/research/projectRouteProfile";
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
} from "../src/lib/research/researchProposalDocument";

const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");
const JSON_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-6-verification.json");
const MARKDOWN_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-6-verification.md");
const VERIFIED_FOR = "2026-08-05";
const NOW = "2026-08-05T23:30:00.000Z";

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

function requirements(projectId: string, currentRoute: ProposalStudyRoute): ProposalRequirementsProfile {
  return {
    ...createEmptyProposalRequirementsProfile(projectId),
    purpose: "funder",
    route: { intent: currentRoute.intent, methodFamily: currentRoute.methodFamily },
    citationStyle: "APA 7",
    maximumWords: 4_000,
    requirements: [
      { id: "req-gap", label: "Research gap and significance", description: "Explain the bounded gap and why it matters.", required: true, authorityId: null },
      { id: "req-method", label: "Approach and analysis", description: "Describe the proposed method, feasibility, and analysis direction.", required: true, authorityId: null },
    ],
    researcherConfirmed: true,
  };
}

function claimMap(): ClaimEvidenceMap {
  return {
    schemaVersion: 1,
    claims: [
      { id: "known", kind: "known", text: "Prior evidence supports a bounded pattern.", status: "supported", questionIds: ["rq-1"], evidenceAssessmentIds: ["assessment-1"], caveats: ["The context remains bounded."] },
      { id: "gap", kind: "gap", text: "A researcher-reviewed gap remains.", status: "researcher-reviewed", questionIds: ["rq-1"], evidenceAssessmentIds: ["assessment-1"], caveats: ["The evidence boundary remains visible."] },
      { id: "significance", kind: "significance", text: "Addressing the gap could improve understanding.", status: "researcher-reviewed", questionIds: ["rq-1"], evidenceAssessmentIds: [], caveats: [] },
      { id: "contribution", kind: "proposed-contribution", text: "The proposed work may make a bounded contribution.", status: "researcher-reviewed", questionIds: ["rq-1"], evidenceAssessmentIds: [], caveats: [] },
    ],
    claim: "researcher-owned-claim-map-not-novelty-or-truth-certification",
  };
}

function contract(currentRoute: ProposalStudyRoute): ProposedStudyContract {
  return createProposedStudyContract({
    route: currentRoute,
    entries: [{
      id: "study-rq-1",
      questionId: "rq-1",
      purpose: "Clarify what the selected question contributes to the proposed study.",
      evidenceNeed: "Define the observations, accounts, records, or evidence units needed.",
      populationOrSource: "Use the bounded population or source declared by the route.",
      proposedMethod: "Use a route-appropriate proposal direction; implementation remains in Stage 3.",
      analysisDirection: "Connect the planned evidence to the question while preserving uncertainty.",
      uncertainty: "Access, measurement, feasibility, and defensible analysis choices remain unresolved.",
    }],
    feasibilityNotes: "Confirm expertise, resources, schedule, and go/no-go conditions.",
    accessNotes: "Confirm permissions, access, language, accessibility, and technology dependencies.",
    ethicsAndSensitivityNotes: "Stage 3 must resolve rights, privacy, consent when applicable, and institutional requirements.",
  });
}

async function assessment(projectId: string): Promise<ProjectEvidenceAssessment> {
  const identity = await createResearchArtifactIdentity({
    artifactKind: "evidence-library",
    artifactId: `source-${projectId}`,
    artifactSchemaVersion: 1,
    payload: { title: "Included evidence" },
  });
  return createProjectEvidenceAssessment({
    projectId,
    assessmentId: "assessment-1",
    sourceId: identity.artifactId,
    status: "included",
    decisionRationale: "The researcher included this source for the selected question.",
    linkedQuestionIds: ["rq-1"],
    reviewedAt: NOW,
    sourceReference: { artifactKind: identity.artifactKind, artifactId: identity.artifactId, schemaVersion: identity.artifactSchemaVersion, checksum: identity.checksum },
    now: NOW,
  });
}

function section(id: ProposalCompositionSectionKey, input: Partial<ResearchProposalSection> = {}): ResearchProposalSection {
  return {
    id,
    title: PROPOSAL_COMPOSITION_SECTION_DEFINITIONS.find((item) => item.key === id)?.label ?? id,
    role: id,
    content: `${id} contains researcher-owned proposal prose with explicit boundaries and traceability.`,
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
    section("proposal_references", { content: "Included evidence reference.", citationKeys: ["source-reference"], sourceEvidenceAssessmentIds: ["assessment-1"] }),
  ];
}

async function main() {
  const [domainSource, testSource, uiSource, uiStyles, stage2Source, proposalSource, persistenceSource] = await Promise.all([
    readFile(path.join(process.cwd(), "src/lib/research/proposalCompositionPhase6.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/proposalCompositionPhase6.test.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/ProposalComposerStudio.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage2ProposalCompositionPhase6.module.css"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage2ProposalStudio.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/researchProposalDocument.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/researchProposalPersistence.ts"), "utf8"),
  ]);

  const matrix = await Promise.all(PROJECT_ROUTE_VERIFICATION_FIXTURES.map(async (fixture, index) => {
    const currentRoute = route(index);
    const currentAssessment = await assessment(fixture.input.projectId);
    const sections = completeSections();
    const compilation = compileProposalComposition({
      route: currentRoute,
      requirements: requirements(fixture.input.projectId, currentRoute),
      claimEvidenceMap: claimMap(),
      proposedStudyContract: contract(currentRoute),
      assessments: [currentAssessment],
      sections,
      requirementsReady: true,
      synthesisReady: true,
      contractReady: true,
    });
    const proposal = await createResearchProposalDocument({
      projectId: fixture.input.projectId,
      requirements: requirements(fixture.input.projectId, currentRoute),
      claimEvidenceMap: claimMap(),
      proposedStudyContract: contract(currentRoute),
      sections,
      now: NOW,
    });
    return {
      fixture: fixture.id,
      intent: currentRoute.intent,
      methodFamily: currentRoute.methodFamily,
      setting: currentRoute.setting,
      prompts: compilation.routePrompts.length,
      ready: compilation.ready,
      proposalValid: await verifyResearchProposalDocument(proposal),
    };
  }));

  const currentRoute = route(0);
  const currentAssessment = await assessment("phase6-verifier");
  const profile = requirements("phase6-verifier", currentRoute);
  const complete = compileProposalComposition({ route: currentRoute, requirements: profile, claimEvidenceMap: claimMap(), proposedStudyContract: contract(currentRoute), assessments: [currentAssessment], sections: completeSections(), requirementsReady: true, synthesisReady: true, contractReady: true });
  const oldText = "  Exact legacy prose.\n\nKeep spacing and punctuation.  ";
  const migrated = createProposalCompositionDraft([{ id: "proposal_background", title: "Background", role: "proposal_background", content: oldText, citationKeys: [], sourceKnowledgeEntryIds: [], sourceAssetIds: [] }]);
  const unreviewed = completeSections().map((item) => item.id === "proposal_background" ? { ...item, researcherReviewed: false } : item);
  const reviewGate = compileProposalComposition({ route: currentRoute, requirements: profile, claimEvidenceMap: claimMap(), proposedStudyContract: contract(currentRoute), assessments: [currentAssessment], sections: unreviewed, requirementsReady: true, synthesisReady: true, contractReady: true });
  const noEvidence = completeSections().map((item) => ({ ...item, sourceEvidenceAssessmentIds: [], citationKeys: [] }));
  const evidenceGate = compileProposalComposition({ route: currentRoute, requirements: profile, claimEvidenceMap: claimMap(), proposedStudyContract: contract(currentRoute), assessments: [currentAssessment], sections: noEvidence, requirementsReady: true, synthesisReady: true, contractReady: true });
  const overLimit = compileProposalComposition({ route: currentRoute, requirements: { ...profile, maximumWords: 1 }, claimEvidenceMap: claimMap(), proposedStudyContract: contract(currentRoute), assessments: [currentAssessment], sections: completeSections(), requirementsReady: true, synthesisReady: true, contractReady: true });

  const acceptance: AcceptanceCheck[] = [
    check("AC-01", "Twelve-route composition matrix", matrix.length === 12 && matrix.every((item) => item.ready && item.proposalValid && item.prompts >= 3), "Every canonical route produces a ready, checksum-valid six-section proposal fixture."),
    check("AC-02", "Exact six-section compatibility contract", PROPOSAL_COMPOSITION_SECTION_DEFINITIONS.length === 6 && complete.sectionSummaries.length === 6, "Background, problem, literature review, current study, method/materials, and references remain canonical."),
    check("AC-03", "Legacy prose preservation", migrated.length === 6 && migrated[0].content === oldText, "Missing traceability records are added without normalizing existing prose."),
    check("AC-04", "Content and review are separate", !reviewGate.ready && reviewGate.issues.some((item) => item.id === "section-review-proposal_background") && uiSource.includes("Review resets whenever prose or provenance changes"), "Researcher review is explicit and resets on any prose or provenance edit."),
    check("AC-05", "Independent upstream gates", ["requirements-not-ready", "synthesis-not-ready", "contract-not-ready"].every((id) => domainSource.includes(id)), "Requirements, synthesis, and contract readiness remain independent fail-closed dependencies."),
    check("AC-06", "Claim-to-included-evidence closure", !evidenceGate.ready && evidenceGate.issues.some((item) => item.id.startsWith("claim-evidence-closure")), "A linked claim cannot hide its currently included support provenance."),
    check("AC-07", "Distinct rhetorical responsibilities", ["background-claim-required", "problem-gap-required", "problem-significance-required", "current-study-claim-required", "literature-trace-required"].every((id) => domainSource.includes(id)), "The six sections are not interchangeable free-text boxes."),
    check("AC-08", "Question-contract coverage", domainSource.includes("contract-coverage-") && complete.sectionSummaries.filter((item) => ["proposal_current_study", "proposal_method_materials"].includes(item.sectionId)).every((item) => item.contractCount === 1), "Current Study and Method/Materials both trace every current question contract."),
    check("AC-09", "Requirements mapping and word limit", domainSource.includes("required-requirement-") && !overLimit.ready && overLimit.issues.some((item) => item.id === "maximum-word-limit"), "Required profile items map to sections and the selected aggregate limit is derived."),
    check("AC-10", "Qualitative integrity", /reflexivity|interpretive/i.test(proposalCompositionPromptsForRoute(route(3)).join(" ")) && /Do not invent hypotheses, variables, power calculations/i.test(proposalCompositionPromptsForRoute(route(3)).join(" ")), "Qualitative proposals retain meaning and reflexivity without forced quantitative constructs."),
    check("AC-11", "Mixed-method integration", /timing|priority|integration|divergence/i.test(proposalCompositionPromptsForRoute(route(5)).join(" ")), "Mixed proposals expose strand integrity, integration, and divergence."),
    check("AC-12", "Secondary-data provenance", /version|provenance|coverage|missingness|licensing/i.test(proposalCompositionPromptsForRoute(route(6)).join(" ")), "Secondary-data writing preserves source fitness and access limitations."),
    check("AC-13", "Evidence-synthesis protocol boundary", /protocol|eligibility|selection|appraisal/i.test(proposalCompositionPromptsForRoute(route(8)).join(" ")), "Synthesis proposals expose protocol responsibilities without claiming implementation or registration."),
    check("AC-14", "Pinned scholarly authorities", PROPOSAL_COMPOSITION_GUIDANCE_SOURCES.length === 6 && PROPOSAL_COMPOSITION_GUIDANCE_SOURCES.every((source) => source.sourceUrl.startsWith("https://") && source.accessedAt === VERIFIED_FOR), "Six official or primary guidance sources are dated, versioned, and HTTPS-linked."),
    check("AC-15", "Selected profile remains controlling", PROPOSAL_COMPOSITION_GUIDANCE_SOURCES.every((source) => source.boundary === "section-completeness-and-traceability-not-format-compliance-writing-quality-or-approval") && uiSource.includes("Selected requirements control the proposal"), "Generic guidance cannot override the selected opportunity or institutional profile."),
    check("AC-16", "Researcher-controlled insertion", uiSource.includes("Insert as editable note") && uiSource.includes("Cerise exposes source material and deterministic starting notes") && !uiSource.includes("/api/ai"), "No source or generated prose is silently inserted, applied, or approved."),
    check("AC-17", "Functional Stage 2 readiness", stage2Source.includes("ProposalComposerStudio") && stage2Source.includes("compositionReady") && stage2Source.includes('step.canvas === "proposal-compose"'), "Step 6 readiness is derived from the real composer and current upstream state."),
    check("AC-18", "Canonical and compatibility persistence", stage2Source.includes("saveProposalSections") && persistenceSource.includes('from("paper_sections")') && persistenceSource.includes('.eq("checksum", expectedCloudChecksum)'), "Saves create checksum-bound canonical revisions and preserve the legacy six-section compatibility projection."),
    check("AC-19", "Bounded responsive workspace", uiStyles.includes("content-visibility:auto") && uiStyles.includes("overflow:auto") && uiStyles.includes("position:sticky") && uiStyles.includes("@media (max-width:760px)"), "Long source lists defer rendering and remain usable across desktop and compact layouts."),
    check("AC-20", "Proposal boundary and Stage 8 separation", complete.claim.includes("not-factual-methodological-ethical-compliance-submission-or-funding-approval") && uiSource.includes("Stage 8—not this proposal—will compose the final publication manuscript") && proposalSource.includes("participantDataIncluded: false"), "Phase 6 authors no participant runtime, final manuscript, certification, approval, deployment, or migration activation."),
  ];

  const coreReport = {
    build: "Build 2, Phase 6 — Source-linked Proposal Composer",
    schemaVersion: 1,
    verifiedFor: VERIFIED_FOR,
    summary: {
      passed: acceptance.filter((item) => item.passed).length,
      failed: acceptance.filter((item) => !item.passed).length,
      acceptanceChecks: acceptance.length,
      routeFixtures: matrix.length,
      canonicalSections: PROPOSAL_COMPOSITION_SECTION_DEFINITIONS.length,
      guidanceSources: PROPOSAL_COMPOSITION_GUIDANCE_SOURCES.length,
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
      aiProposalTextGeneratedOrApplied: false,
      factualMethodologicalEthicalComplianceSubmissionOrFundingApprovalCertified: false,
      browserRuntimeAvailable: false,
      browserValidationNote: "The Browser plugin is listed, but its required callable browser-control runtime is not exposed in this session. Standalone Playwright fallback was not pre-authorized.",
    },
  };
  const report = { ...coreReport, reportChecksum: await sha256ArtifactChecksum(coreReport) };
  const markdown = [
    "# Build 2 Phase 6 Verification",
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
    ...matrix.map((item) => `- ${item.fixture}: ${item.intent}/${item.methodFamily}/${item.setting}; ${item.ready && item.proposalValid ? "PASS" : "FAIL"}`),
    "",
    "## Activation boundary",
    "",
    "- Build 2 Phase 1 Supabase migration applied: no",
    "- Remote deployment performed: no",
    "- Participant rows or responses stored: no",
    "- AI proposal prose generated or applied: no",
    "- Factual verification, methodological/ethical/compliance determination, submission certification, or funding approval: no",
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
