import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256ArtifactChecksum } from "../src/lib/research/artifactIdentity";
import { compileProposalRequirements, createDefaultProposalRequirementDraft } from "../src/lib/research/proposalRequirementsCompiler";
import { RESEARCH_PATH_STAGES } from "../src/lib/research/researchPathConfig";
import {
  STAGE2_STEP1_AI_MENTOR_BOUNDARY,
  STAGE2_STEP1_COPY_CONTRACT,
  STAGE2_STEP1_EXPERIENCE_CONTRACT,
  STAGE2_STEP1_EXPERIENCE_INVARIANTS,
  STAGE2_STEP1_LAYOUT_CONTRACT,
  STAGE2_STEP1_PRESENTATION_OPTIONS,
  STAGE2_STEP1_TERM_REGISTRY,
  resolveStage2Step1ExperienceState,
  validateStage2Step1ExperienceContract,
  type Stage2Step1ExperienceFacts,
} from "../src/lib/research/stage2Step1ExperienceContract";

const VERIFIED_FOR = "2026-08-06";
const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");
const JSON_PATH = path.join(OUTPUT_DIRECTORY, "build-2-stage2-step1-phase-0-verification.json");
const MARKDOWN_PATH = path.join(OUTPUT_DIRECTORY, "build-2-stage2-step1-phase-0-verification.md");

interface AcceptanceCheck {
  id: string;
  label: string;
  passed: boolean;
  evidence: string;
}

function check(id: string, label: string, passed: boolean, evidence: string): AcceptanceCheck {
  return { id, label, passed, evidence };
}

async function main() {
  const [contractSource, contractTest, contractDocument, proposalCompiler, proposalSchema, stage2Ui] = await Promise.all([
    readFile(path.join(process.cwd(), "src/lib/research/stage2Step1ExperienceContract.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/stage2Step1ExperienceContract.test.ts"), "utf8"),
    readFile(path.join(process.cwd(), "docs/build-2-stage2-step1-phase-0-experience-contract.md"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/proposalRequirementsCompiler.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/researchProposalDocument.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage2ProposalStudio.tsx"), "utf8"),
  ]);
  const stage2 = RESEARCH_PATH_STAGES.find((stage) => stage.id === "stage-02");
  const step1 = stage2?.steps.find((step) => step.id === "stage-02-confirm-brief");
  const invariantIds = new Set(STAGE2_STEP1_EXPERIENCE_INVARIANTS.map((invariant) => invariant.id));
  const readyFacts: Stage2Step1ExperienceFacts = {
    initialization: "loaded",
    stage1Status: "current",
    routeResolved: true,
    authorityStatus: "current",
    requirementsStatus: "persisted",
    researcherConfirmed: true,
    versionConflict: false,
  };
  const route = { intent: "primary-data" as const, methodFamily: "qualitative" as const };
  const draft = createDefaultProposalRequirementDraft(route);
  draft.researcherConfirmed = true;
  const compiled = compileProposalRequirements({ projectId: "stage2-step1-phase0", route, draft });

  const acceptance: AcceptanceCheck[] = [
    check("AC-01", "Valid versioned experience contract", validateStage2Step1ExperienceContract().length === 0 && STAGE2_STEP1_EXPERIENCE_CONTRACT.contractVersion === 1, "The machine-readable contract has unique states, actions, terms, invariants, and a declared state priority."),
    check("AC-02", "Stable workflow identity", step1?.canvas === "proposal-brief" && STAGE2_STEP1_EXPERIENCE_CONTRACT.stepId === step1.id && STAGE2_STEP1_EXPERIENCE_CONTRACT.nextStepId === "stage-02-step-01", "The redesign keeps existing Stage 2 step identities and the evidence-strategy successor."),
    check("AC-03", "Plain primary purpose", STAGE2_STEP1_COPY_CONTRACT.primaryTitle === "Set Up Your Proposal" && !/compiler|schema|checksum|profile id/i.test(`${STAGE2_STEP1_COPY_CONTRACT.primaryTitle} ${STAGE2_STEP1_COPY_CONTRACT.description}`), "Primary copy explains the researcher decision without leading with engineering language."),
    check("AC-04", "Scholarly terminology preserved", STAGE2_STEP1_TERM_REGISTRY.some((term) => term.id === "requirements-authority" && term.placement === "primary") && STAGE2_STEP1_TERM_REGISTRY.some((term) => term.id === "checksum" && term.placement === "technical-details"), "Necessary scholarly concepts remain available while implementation terms move to Technical details."),
    check("AC-05", "Adaptive presentation without adaptive rigor", STAGE2_STEP1_PRESENTATION_OPTIONS.guidanceLevels.length === 3 && STAGE2_STEP1_PRESENTATION_OPTIONS.informationDensities.length === 2 && JSON.stringify(STAGE2_STEP1_PRESENTATION_OPTIONS).includes("artifactImpact\":\"none") && !/beginner|expert/i.test(JSON.stringify(STAGE2_STEP1_PRESENTATION_OPTIONS)), "Guided, Balanced, Concise, Comfortable, and Dense change presentation only and do not classify the researcher."),
    check("AC-06", "Derived completion", resolveStage2Step1ExperienceState(readyFacts).id === "ready" && resolveStage2Step1ExperienceState({ ...readyFacts, researcherConfirmed: false }).id === "needs-review" && resolveStage2Step1ExperienceState({ ...readyFacts, requirementsStatus: "compiled" }).id === "saving", "Researcher confirmation is necessary but cannot independently mark the step complete."),
    check("AC-07", "Conflict precedence", resolveStage2Step1ExperienceState({ ...readyFacts, versionConflict: true, stage1Status: "changed", authorityStatus: "drifted" }).id === "version-conflict", "Divergent device and secure revisions are resolved before any other readiness state."),
    check("AC-08", "Upstream and authority review", resolveStage2Step1ExperienceState({ ...readyFacts, stage1Status: "changed" }).id === "stage1-changed" && resolveStage2Step1ExperienceState({ ...readyFacts, authorityStatus: "drifted" }).id === "authority-changed", "Stage 1 changes and authority drift reset the completion path without deleting prior work."),
    check("AC-09", "Honest provisional path", resolveStage2Step1ExperienceState({ ...readyFacts, authorityStatus: "provisional" }).id === "provisional" && invariantIds.has("unknown-authority-provisional"), "Unknown destination requirements permit exploration but cannot be represented as satisfied."),
    check("AC-10", "Canonical compiler ownership", STAGE2_STEP1_EXPERIENCE_CONTRACT.canonicalCompiler === "compileProposalRequirements" && invariantIds.has("compiler-owns-requirements") && compiled.ready, "The experience layer consumes the existing deterministic, route-aware compiler instead of creating a second readiness engine."),
    check("AC-11", "Route-appropriate scientific language", invariantIds.has("route-appropriate-language") && compiled.profile.profileId.endsWith("--jars-qual-2018") && !/\bvariables?\b|\bhypoth(?:esis|eses)\b/i.test(compiled.profile.requirements.map((item) => `${item.label} ${item.description}`).join(" ")), "The Phase 0 contract preserves current negative requirements for qualitative and other research routes."),
    check("AC-12", "Authority and non-certification boundaries", invariantIds.has("authority-provenance") && invariantIds.has("authority-drift-blocks") && invariantIds.has("no-certification-inflation") && proposalCompiler.includes("not-compliance-approval-submission"), "Authority provenance is versioned and no interface state may inflate planning into approval or compliance."),
    check("AC-13", "AI review-before-apply", STAGE2_STEP1_AI_MENTOR_BOUNDARY.applyPolicy.includes("review-before-apply") && STAGE2_STEP1_AI_MENTOR_BOUNDARY.prohibited.some((action) => /confirm the proposal/i.test(action)) && STAGE2_STEP1_AI_MENTOR_BOUNDARY.prohibited.some((action) => /claim compliance/i.test(action)), "The future mentor may explain and propose, but it cannot confirm, silently modify, invent authority, or certify."),
    check("AC-14", "Stage and participant-data boundaries", invariantIds.has("stage2-not-stage3") && invariantIds.has("no-participant-data") && proposalSchema.includes("participantDataIncluded: false") && proposalSchema.includes("implementationDeferredToStage3: true"), "Step 1 cannot become a runnable study, ethics approval, submission release, or participant-data store."),
    check("AC-15", "Responsive accessibility contract", STAGE2_STEP1_LAYOUT_CONTRACT.minimumInteractiveTargetPx === 44 && STAGE2_STEP1_LAYOUT_CONTRACT.zoomSupportPercent === 200 && invariantIds.has("accessible-equivalent-path"), "Desktop, tablet, mobile, keyboard, screen-reader, and zoomed workflows must expose equivalent decisions and recovery."),
    check("AC-16", "Phase 0 activation boundary", !contractSource.includes("from(\"@/lib/supabase") && !contractSource.includes("use client") && !stage2Ui.includes("STAGE2_STEP1_EXPERIENCE_CONTRACT") && contractDocument.includes("does not replace the current interface") && contractTest.includes("completion remains derived"), "Phase 0 adds only a contract, resolver, documentation, tests, and verification; no live UI, migration, remote data, or deployment is changed."),
  ];

  const coreReport = {
    build: "Build 2 — Stage 2 Step 1 — Phase 0 Experience Contract",
    schemaVersion: 1,
    verifiedFor: VERIFIED_FOR,
    summary: {
      passed: acceptance.filter((item) => item.passed).length,
      failed: acceptance.filter((item) => !item.passed).length,
      acceptanceChecks: acceptance.length,
      experienceStates: STAGE2_STEP1_EXPERIENCE_CONTRACT.statePriority.length,
      invariants: STAGE2_STEP1_EXPERIENCE_INVARIANTS.length,
      terms: STAGE2_STEP1_TERM_REGISTRY.length,
      guidanceLevels: STAGE2_STEP1_PRESENTATION_OPTIONS.guidanceLevels.length,
      densityLevels: STAGE2_STEP1_PRESENTATION_OPTIONS.informationDensities.length,
    },
    acceptance,
    implementationChecksums: {
      contract: await sha256ArtifactChecksum(contractSource),
      tests: await sha256ArtifactChecksum(contractTest),
      documentation: await sha256ArtifactChecksum(contractDocument),
      existingCompiler: await sha256ArtifactChecksum(proposalCompiler),
      existingProposalSchema: await sha256ArtifactChecksum(proposalSchema),
    },
    activation: {
      liveStage2UiChanged: false,
      proposalSchemaChanged: false,
      databaseMigrationCreatedOrApplied: false,
      remoteDeploymentPerformed: false,
      nextApprovedPhase: "Phase 1 — backward-compatible experience and view-model foundation",
    },
  };
  const report = { ...coreReport, reportChecksum: await sha256ArtifactChecksum(coreReport) };
  const markdown = [
    "# Build 2 — Stage 2 Step 1 — Phase 0 Verification",
    "",
    `Verified for: ${VERIFIED_FOR}`,
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
    "- Live Stage 2 interface changed: no",
    "- Canonical proposal schema changed: no",
    "- Database migration created or applied: no",
    "- Remote deployment performed: no",
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
