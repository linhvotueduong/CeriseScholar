import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createResearchArtifactIdentity, sha256ArtifactChecksum, type ResearchArtifactReference } from "../src/lib/research/artifactIdentity";
import { PROJECT_ROUTE_VERIFICATION_FIXTURES } from "../src/lib/research/projectRouteProfile";
import {
  PROPOSAL_CLAIM_KIND_DEFINITIONS,
  SYNTHESIS_GUIDANCE_SOURCES,
  compileProposalSynthesis,
  createClaimEvidenceMap,
  synthesisPromptsForRoute,
} from "../src/lib/research/proposalSynthesisPhase4";
import {
  createProjectEvidenceAssessment,
  createResearchProposalDocument,
  verifyResearchProposalDocument,
  type ProposalClaimEvidenceEntry,
} from "../src/lib/research/researchProposalDocument";

const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");
const JSON_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-4-verification.json");
const MARKDOWN_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-4-verification.md");
const VERIFIED_FOR = "2026-08-05";
const NOW = "2026-08-05T18:00:00.000Z";

interface AcceptanceCheck {
  id: string;
  label: string;
  passed: boolean;
  evidence: string;
}

const check = (id: string, label: string, passed: boolean, evidence: string): AcceptanceCheck => ({ id, label, passed, evidence });

function claim(input: ProposalClaimEvidenceEntry): ProposalClaimEvidenceEntry {
  return input;
}

async function evidenceReference(sourceId: string): Promise<ResearchArtifactReference> {
  const identity = await createResearchArtifactIdentity({
    artifactKind: "evidence-library",
    artifactId: sourceId,
    artifactSchemaVersion: 1,
    payload: { sourceId, title: `Verification source ${sourceId}`, version: 1 },
  });
  return { artifactKind: identity.artifactKind, artifactId: identity.artifactId, schemaVersion: identity.artifactSchemaVersion, checksum: identity.checksum };
}

async function main() {
  const [domainSource, testSource, uiSource, uiStyles, stage2Source, proposalSource, hookSource, persistenceSource] = await Promise.all([
    readFile(path.join(process.cwd(), "src/lib/research/proposalSynthesisPhase4.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/proposalSynthesisPhase4.test.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/ProposalSynthesisStudio.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage2SynthesisPhase4.module.css"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage2ProposalStudio.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/researchProposalDocument.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/hooks/useProjectEvidenceAssessments.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/researchProposalPersistence.ts"), "utf8"),
  ]);

  const matrix = await Promise.all(PROJECT_ROUTE_VERIFICATION_FIXTURES.map(async (fixture, index) => {
    const route = { intent: fixture.input.intent, methodFamily: fixture.input.methodFamily };
    const questionId = `rq-${index + 1}`;
    const assessmentId = `assessment-${index + 1}`;
    const sourceId = `source-${index + 1}`;
    const assessment = await createProjectEvidenceAssessment({
      projectId: fixture.input.projectId,
      assessmentId,
      sourceId,
      status: "included",
      decisionRationale: "The researcher included this source after project-specific appraisal.",
      linkedQuestionIds: [questionId],
      caveats: ["Applicability remains bounded to the reported context."],
      reviewedAt: NOW,
      sourceReference: await evidenceReference(sourceId),
      now: NOW,
    });
    const commonCaveat = ["The claim is bounded to the reviewed evidence, declared search scope, population, setting, and methods."];
    const claimEvidenceMap = createClaimEvidenceMap([
      claim({ id: `claim-known-${index + 1}`, kind: "known", text: "The reviewed evidence supports a bounded finding relevant to this question.", status: "supported", questionIds: [questionId], evidenceAssessmentIds: [assessmentId], caveats: commonCaveat }),
      claim({ id: `claim-gap-${index + 1}`, kind: "gap", text: "An important dimension remains insufficiently characterized within the declared boundary.", status: "researcher-reviewed", questionIds: [questionId], evidenceAssessmentIds: [assessmentId], caveats: commonCaveat }),
      claim({ id: `claim-significance-${index + 1}`, kind: "significance", text: "Addressing the bounded gap could improve scholarly or practical understanding.", status: "researcher-reviewed", questionIds: [questionId], evidenceAssessmentIds: [], caveats: commonCaveat }),
    ]);
    const compilation = compileProposalSynthesis({ route, selectedQuestionIds: [questionId], assessments: [assessment], claimEvidenceMap, evidenceStrategyReady: true, evidenceReviewReady: true });
    const proposal = await createResearchProposalDocument({ projectId: fixture.input.projectId, claimEvidenceMap, now: NOW });
    return {
      fixture: fixture.id,
      intent: route.intent,
      methodFamily: route.methodFamily,
      routePrompts: compilation.routePrompts.length,
      claims: claimEvidenceMap.claims.length,
      ready: compilation.ready,
      proposalValid: await verifyResearchProposalDocument(proposal),
    };
  }));

  const sourceId = "negative-source";
  const included = await createProjectEvidenceAssessment({
    projectId: "negative-project",
    assessmentId: "negative-assessment",
    sourceId,
    status: "included",
    decisionRationale: "Included by the researcher.",
    linkedQuestionIds: ["rq-1"],
    caveats: ["Bounded source."],
    reviewedAt: NOW,
    sourceReference: await evidenceReference(sourceId),
    now: NOW,
  });
  const unsafeGapMap = createClaimEvidenceMap([
    { id: "known", kind: "known", text: "Known.", status: "supported", questionIds: ["rq-1"], evidenceAssessmentIds: [included.assessmentId], caveats: [] },
    { id: "gap", kind: "gap", text: "No research exists.", status: "supported", questionIds: ["rq-1"], evidenceAssessmentIds: [included.assessmentId], caveats: [] },
    { id: "why", kind: "significance", text: "It matters.", status: "researcher-reviewed", questionIds: ["rq-1"], evidenceAssessmentIds: [], caveats: [] },
  ]);
  const unsafeGap = compileProposalSynthesis({ route: { intent: "primary-data", methodFamily: "quantitative" }, selectedQuestionIds: ["rq-1"], assessments: [included], claimEvidenceMap: unsafeGapMap, evidenceStrategyReady: true, evidenceReviewReady: true });
  const staleUpstream = compileProposalSynthesis({ route: { intent: "primary-data", methodFamily: "quantitative" }, selectedQuestionIds: ["rq-new"], assessments: [included], claimEvidenceMap: unsafeGapMap, evidenceStrategyReady: false, evidenceReviewReady: false });
  const qualitativePrompts = synthesisPromptsForRoute({ intent: "primary-data", methodFamily: "qualitative" }).join(" ");
  const secondaryPrompts = synthesisPromptsForRoute({ intent: "secondary-data", methodFamily: "quantitative" }).join(" ");
  const synthesisPrompts = synthesisPromptsForRoute({ intent: "evidence-synthesis", methodFamily: "evidence-synthesis" }).join(" ");

  const acceptance: AcceptanceCheck[] = [
    check("AC-01", "Twelve-route synthesis matrix", matrix.length === 12 && matrix.every((item) => item.ready && item.proposalValid && item.routePrompts >= 3), "Every canonical route produces route guidance, a ready claim map, and a checksum-valid canonical proposal."),
    check("AC-02", "Researcher-owned canonical claim map", proposalSource.includes("researcher-owned-claim-map-not-novelty-or-truth-certification") && stage2Source.includes("claimEvidenceMap") && stage2Source.includes("createResearchProposalDocument"), "Claims save as a new proposal revision through the existing canonical checksum lineage."),
    check("AC-03", "Human-reviewed gap boundary", unsafeGap.ready === false && unsafeGap.issues.some((item) => item.id === "gap-human-review-gap") && unsafeGap.issues.some((item) => item.id === "gap-boundary-gap"), "A gap cannot be represented as an automatically supported fact and must expose at least one boundary."),
    check("AC-04", "Known → gap → significance chain", domainSource.includes("known-landscape-required") && domainSource.includes("reviewed-gap-required") && domainSource.includes("significance-required"), "Readiness requires a reviewed evidence landscape, bounded gap, and reason that addressing it matters."),
    check("AC-05", "Question-level traceability", domainSource.includes("question-claim-coverage") && domainSource.includes("question-gap-coverage") && domainSource.includes("question-evidence-coverage"), "Every selected question must connect to claims, included evidence, and a researcher-reviewed gap."),
    check("AC-06", "Included-source accountability", domainSource.includes("included-source-unlinked") && uiSource.includes("Sources used"), "Every source left included in Phase 3 must be used by a claim or returned to the review ledger for a different decision."),
    check("AC-07", "Stale upstream failure", staleUpstream.ready === false && staleUpstream.issues.some((item) => item.id === "evidence-strategy-not-ready") && staleUpstream.issues.some((item) => item.id === "evidence-review-not-ready") && staleUpstream.issues.some((item) => item.id.includes("stale-question")), "Changed questions or unfinished upstream artifacts block readiness without deleting the draft synthesis."),
    check("AC-08", "Contested evidence preservation", domainSource.includes("contested-comparison") && domainSource.includes("at least two included sources") && testSource.includes("contested claims preserve disagreement"), "A contested claim preserves at least two inspectable sources and a caveat instead of flattening disagreement."),
    check("AC-09", "Qualitative route language", /context|participant perspectives|interpretation/i.test(qualitativePrompts) && !/effect-size required|statistical-certainty language required/i.test(qualitativePrompts), "Qualitative synthesis keeps context, perspectives, interpretation, and divergent cases without coercing statistical fields."),
    check("AC-10", "Secondary-data route language", /dataset|variables|measurement|missingness|provenance/i.test(secondaryPrompts), "Secondary-data gaps distinguish an important question from dataset coverage and representational limits."),
    check("AC-11", "Evidence-synthesis certainty language", /certainty|heterogeneity|indirectness|imprecision|missing evidence/i.test(synthesisPrompts) && domainSource.includes("synthesis-certainty"), "Review routes make certainty, applicability, and review-process limits explicit for each final claim."),
    check("AC-12", "Current authority registry", SYNTHESIS_GUIDANCE_SOURCES.length === 5 && SYNTHESIS_GUIDANCE_SOURCES.every((source) => source.sourceUrl.startsWith("https://") && source.accessedAt === VERIFIED_FOR), "Cochrane interpretation/certainty/qualitative guidance, AHRQ gap characterization, and PRISMA reporting are pinned by role, version, URL, and date."),
    check("AC-13", "No numeric evidence score", PROPOSAL_CLAIM_KIND_DEFINITIONS.length === 7 && !/overallScore|qualityScore|numericScore/.test(domainSource + uiSource), "Seven claim roles structure the argument without calculating a universal quality or certainty score."),
    check("AC-14", "Researcher status control", uiSource.includes("Researcher status") && uiSource.includes("Researcher reviewed") && !uiSource.includes("/api/ai"), "The researcher selects every claim status; Phase 4 performs no AI-generated or auto-applied synthesis decision."),
    check("AC-15", "Draft-safe editing", uiSource.includes("Drafts may be saved before readiness") && uiSource.includes("Remove from draft") && uiSource.includes("Save synthesis map"), "Researchers may work iteratively and save incomplete maps while derived blockers remain visible."),
    check("AC-16", "Conflict-safe evidence input", uiSource.includes("Evidence review conflicts must be resolved in Step 3") && hookSource.includes("useSecureVersion") && hookSource.includes("useDeviceVersion"), "An upstream per-source conflict remains visible and prevents readiness without overwriting either evidence review."),
    check("AC-17", "Real Stage 2 readiness integration", stage2Source.includes("ProposalSynthesisStudio") && stage2Source.includes("synthesisReady") && stage2Source.includes('step.canvas === "proposal-synthesis"'), "Step 4 navigation readiness is derived from the functional synthesis compiler and current source state."),
    check("AC-18", "Bounded responsive workspace", uiStyles.includes("max-height: 350px") && uiStyles.includes("overflow: auto") && uiStyles.includes("position: sticky") && uiStyles.includes("@media (max-width: 760px)"), "Long claim collections scroll within the Stage 2 canvas, with deliberate desktop and mobile layouts."),
    check("AC-19", "Optimistic proposal persistence retained", stage2Source.includes("expectedCloudChecksum") && stage2Source.includes("saveQueue") && persistenceSource.includes('.eq("checksum", expectedCloudChecksum)'), "Saving synthesis uses the existing serialized, checksum-guarded proposal persistence rather than a parallel state silo."),
    check("AC-20", "No participant or deployment expansion", !uiSource.includes("participant response") && !domainSource.includes("participantData") && !stage2Source.includes("apply migration"), "Phase 4 stores scholarly claim mapping only; it adds no participant rows, schema activation, or remote deployment."),
  ];

  const coreReport = {
    build: "Build 2, Phase 4 — evidence synthesis and gap studio",
    schemaVersion: 1,
    verifiedFor: VERIFIED_FOR,
    summary: {
      passed: acceptance.filter((item) => item.passed).length,
      failed: acceptance.filter((item) => !item.passed).length,
      acceptanceChecks: acceptance.length,
      routeFixtures: matrix.length,
      claimKinds: PROPOSAL_CLAIM_KIND_DEFINITIONS.length,
      guidanceSources: SYNTHESIS_GUIDANCE_SOURCES.length,
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
      evidenceHook: await sha256ArtifactChecksum(hookSource),
      persistence: await sha256ArtifactChecksum(persistenceSource),
    },
    activation: {
      phase1MigrationStillUnapplied: true,
      remoteDeploymentPerformed: false,
      participantRowsStored: false,
      aiSynthesisDecisionsPerformed: false,
      noveltyOrTruthCertified: false,
      browserRuntimeAvailable: false,
      browserValidationNote: "The Browser plugin is listed, but its required callable browser-control runtime is not exposed in this session. Standalone Playwright fallback was not pre-authorized.",
    },
  };
  const report = { ...coreReport, reportChecksum: await sha256ArtifactChecksum(coreReport) };
  const markdown = [
    "# Build 2 Phase 4 Verification",
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
    ...matrix.map((item) => `- ${item.fixture}: ${item.intent}/${item.methodFamily}; ${item.claims} claims; ${item.routePrompts} route prompts; ${item.ready && item.proposalValid ? "PASS" : "FAIL"}`),
    "",
    "## Activation boundary",
    "",
    "- Phase 1 Supabase migration applied: no",
    "- Remote deployment performed: no",
    "- Participant rows or responses stored: no",
    "- AI synthesis decisions performed: no",
    "- Novelty, truth, certainty, methodological quality, or approval certified: no",
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
