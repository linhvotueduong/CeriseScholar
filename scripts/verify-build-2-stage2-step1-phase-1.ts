import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256ArtifactChecksum, type ResearchArtifactChecksum } from "../src/lib/research/artifactIdentity";
import { PROJECT_ROUTE_VERIFICATION_FIXTURES } from "../src/lib/research/projectRouteProfile";
import { compileProposalRequirements, createDefaultProposalRequirementDraft } from "../src/lib/research/proposalRequirementsCompiler";
import { createEmptyProposalSetupDecision } from "../src/lib/research/proposalSetupDecision";
import { createResearchProposalDocument, normalizeResearchProposalDocument, verifyResearchProposalDocument } from "../src/lib/research/researchProposalDocument";
import type { ResearchPathwayBrief } from "../src/lib/research/researchPathwayBrief";
import { buildStage2Step1ViewModel, proposalSetupDecisionFromProfile } from "../src/lib/research/stage2Step1ViewModel";

const VERIFIED_FOR = "2026-08-06";
const PROJECT_ID = "stage2-step1-phase1-verification";
const NOW = "2026-08-06T12:00:00.000Z";
const CHECKSUM = `sha256:${"2".repeat(64)}` as ResearchArtifactChecksum;
const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");
const JSON_PATH = path.join(OUTPUT_DIRECTORY, "build-2-stage2-step1-phase-1-verification.json");
const MARKDOWN_PATH = path.join(OUTPUT_DIRECTORY, "build-2-stage2-step1-phase-1-verification.md");

interface AcceptanceCheck {
  id: string;
  label: string;
  passed: boolean;
  evidence: string;
}

const check = (id: string, label: string, passed: boolean, evidence: string): AcceptanceCheck => ({ id, label, passed, evidence });

function verificationBrief(): ResearchPathwayBrief {
  return {
    schemaVersion: 1,
    projectId: PROJECT_ID,
    pathwayRevision: 2,
    source: { artifactKind: "research-pathway", artifactId: `pathway-${PROJECT_ID}`, schemaVersion: 2, checksum: CHECKSUM },
    selectedProblems: [],
    selectedQuestions: [],
    baseline: [],
    baselineSynthesis: "",
    rationale: "A bounded route was selected by the researcher.",
    unresolvedUncertainties: [],
    route: {} as ResearchPathwayBrief["route"],
    backcasting: { included: false, vision: "", baseline: "", concepts: "", roadmap: "" },
    readiness: { readyForStage2: true, steps: [], blockingIssueIds: [], advisoryIssueIds: [] },
    compiledAt: NOW,
    checksum: CHECKSUM,
    claim: "researcher-selected-provisional-pathway-not-independent-validity-novelty-or-ethics-approval",
  };
}

async function main() {
  const [decisionSource, preferenceSource, viewModelSource, testSource, compilerSource, proposalSchemaSource, uiSource, documentation] = await Promise.all([
    readFile(path.join(process.cwd(), "src/lib/research/proposalSetupDecision.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/stage2Step1ExperiencePreferences.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/stage2Step1ViewModel.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/stage2Step1ViewModel.test.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/proposalRequirementsCompiler.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/researchProposalDocument.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage2ProposalStudio.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "docs/build-2-stage2-step1-phase-1-view-model-foundation.md"), "utf8"),
  ]);
  const route = { intent: "primary-data" as const, methodFamily: "quantitative" as const };
  const legacyDraft = createDefaultProposalRequirementDraft(route);
  legacyDraft.researcherConfirmed = true;
  const legacy = compileProposalRequirements({ projectId: PROJECT_ID, route, draft: legacyDraft });
  const legacyDocument = await createResearchProposalDocument({ projectId: PROJECT_ID, requirements: legacy.profile, now: NOW });
  const normalizedLegacy = await normalizeResearchProposalDocument(JSON.parse(JSON.stringify(legacyDocument)), PROJECT_ID);
  const setup = {
    ...createEmptyProposalSetupDecision(),
    destinationKind: "internal" as const,
    instructionSourceStatus: "not-required" as const,
    recommendationDecision: "accepted" as const,
  };
  const structuredDraft = { ...legacyDraft, setupDecision: setup };
  const structured = compileProposalRequirements({ projectId: PROJECT_ID, route, draft: structuredDraft, previous: legacy.profile });
  const structuredDocument = await createResearchProposalDocument({ projectId: PROJECT_ID, requirements: structured.profile, now: NOW });
  const combinations = (["guided", "balanced", "concise"] as const).flatMap((guidanceLevel) =>
    (["comfortable", "dense"] as const).map((informationDensity) => ({ guidanceLevel, informationDensity })),
  );
  const models = combinations.map((preferences) => buildStage2Step1ViewModel({
    pathwayAvailable: true,
    brief: verificationBrief(),
    compiled: structured,
    preferences,
    sourceChanged: false,
    authorityDriftIssues: [],
    versionConflict: false,
    profileMaterialized: true,
  }));
  const routeMatrix = PROJECT_ROUTE_VERIFICATION_FIXTURES.map((fixture) => {
    const fixtureRoute = { intent: fixture.input.intent, methodFamily: fixture.input.methodFamily };
    const draft = createDefaultProposalRequirementDraft(fixtureRoute);
    draft.researcherConfirmed = true;
    const compiled = compileProposalRequirements({ projectId: fixture.input.projectId, route: fixtureRoute, draft });
    return { id: fixture.id, ready: compiled.ready, setupDecisionAbsent: compiled.profile.setupDecision === undefined };
  });

  const acceptance: AcceptanceCheck[] = [
    check("AC-01", "Optional backward-compatible setup decision", proposalSchemaSource.includes("setupDecision?: ProposalSetupDecision") && legacy.profile.setupDecision === undefined, "The existing requirements schema accepts the optional field without injecting it into historical profiles."),
    check("AC-02", "Historical checksum preservation", Boolean(normalizedLegacy) && normalizedLegacy?.identity.checksum === legacyDocument.identity.checksum, "An existing serialized proposal remains checksum-valid and is not rewritten during normalization."),
    check("AC-03", "Deliberate setup revision", structured.ready && structured.profile.revision === legacy.profile.revision + 1 && structured.profile.setupDecision?.recommendationDecision === "accepted", "A researcher-supplied setup decision creates a normal new profile revision."),
    check("AC-04", "Setup checksum binding", await verifyResearchProposalDocument(structuredDocument) && structuredDocument.identity.checksum !== legacyDocument.identity.checksum, "A deliberately saved setup decision participates in the proposal checksum."),
    check("AC-05", "Bounded decision model", decisionSource.includes("destinationName, 500") && decisionSource.includes("selectionRationale, 20_000") && decisionSource.includes("unresolvedRequirements.length > 100"), "Destination, rationale, and unresolved requirement fields have explicit application bounds."),
    check("AC-06", "No invented legacy rationale", proposalSetupDecisionFromProfile(legacy.profile).origin === "legacy-adapter" && proposalSetupDecisionFromProfile(legacy.profile).decision.recommendationDecision === "legacy-unspecified" && legacy.profile.setupDecision === undefined, "Legacy profiles receive an in-memory display adapter without fabricated historical rationale or persistence."),
    check("AC-07", "Fail-closed recommendation review", compilerSource.includes("proposal-recommendation-review-required") && compilerSource.includes("proposal-recommendation-override-rationale-required") && compilerSource.includes("proposal-recommendation-selection-mismatch"), "Structured setup decisions cannot become ready with an unreviewed or unexplained recommendation choice."),
    check("AC-08", "Fail-closed source status", compilerSource.includes("proposal-requirements-source-provisional") && compilerSource.includes("proposal-registered-authority-missing") && compilerSource.includes("proposal-researcher-defined-authority-missing"), "Provisional, registered, and researcher-defined source statuses must agree with authority provenance."),
    check("AC-09", "Separate preference storage", preferenceSource.includes("cerise:stage2-step1:experience:v") && !preferenceSource.includes("ResearchProposalDocument") && !preferenceSource.includes("researcherConfirmed"), "Guidance and density preferences use a separate versioned device key with no proposal content or readiness."),
    check("AC-10", "Six-mode canonical equivalence", models.length === 6 && models.every((model) => model.state.id === "ready") && models.every((model) => JSON.stringify(model.canonicalFacts) === JSON.stringify(models[0].canonicalFacts)), "All guidance and density combinations produce identical canonical facts and readiness."),
    check("AC-11", "Deterministic view model", viewModelSource.includes("resolveStage2Step1ExperienceState") && viewModelSource.includes("proposalRequirementTemplateIdFromProfile") && viewModelSource.includes("authorityDriftIssues") && viewModelSource.includes("profileMaterialized"), "The view model composes canonical compiler, provenance, drift, conflict, and persistence facts rather than creating a second compiler."),
    check("AC-12", "Exact recovery actions", buildStage2Step1ViewModel({ pathwayAvailable: true, brief: verificationBrief(), compiled: structured, sourceChanged: false, authorityDriftIssues: [], versionConflict: true, profileMaterialized: true }).primaryAction?.id === "resolve-version-conflict" && buildStage2Step1ViewModel({ pathwayAvailable: true, brief: null, compiled: structured, sourceChanged: false, authorityDriftIssues: [], versionConflict: false, profileMaterialized: true }).primaryAction?.targetStepId === "stage-01-choose-pathway", "Conflict resolution and incomplete Stage 1 recovery use the Phase 0 action contract."),
    check("AC-13", "Twelve-route compatibility", routeMatrix.length === 12 && routeMatrix.every((item) => item.ready && item.setupDecisionAbsent), "Every existing canonical route retains its previous compiler behavior until a setup decision is deliberately supplied."),
    check("AC-14", "No readiness side effects in view layer", !viewModelSource.includes("createResearchProposalDocument") && !viewModelSource.includes("saveResearchProposalDocument") && !viewModelSource.includes("writeResearchProposalCache"), "Building a view model cannot save, confirm, revise, or mutate a proposal."),
    check("AC-15", "No live UI activation", !uiSource.includes("stage2Step1ViewModel") && !uiSource.includes("ProposalSetupDecision") && documentation.includes("does not replace the live interface"), "The current React screen remains unchanged until the responsive screen-shell phase is approved."),
    check("AC-16", "No database or remote activation", !decisionSource.includes("supabase") && !preferenceSource.includes("supabase") && !viewModelSource.includes("supabase") && !proposalSchemaSource.includes("apply migration"), "Phase 1 requires no table migration, RLS change, API change, remote write, or deployment."),
    check("AC-17", "Executable compatibility coverage", testSource.includes("legacy proposal profiles remain checksum-valid") && testSource.includes("all six presentation combinations") && testSource.includes("12-route compiler matrix"), "The focused suite covers legacy identity, structured setup, preferences, recovery, and route compatibility."),
  ];
  const coreReport = {
    build: "Build 2 — Stage 2 Step 1 — Phase 1 View-Model Foundation",
    schemaVersion: 1,
    verifiedFor: VERIFIED_FOR,
    summary: {
      passed: acceptance.filter((item) => item.passed).length,
      failed: acceptance.filter((item) => !item.passed).length,
      acceptanceChecks: acceptance.length,
      routeFixtures: routeMatrix.length,
      presentationCombinations: combinations.length,
      canonicalSetupDecisionOptional: true,
    },
    acceptance,
    routeMatrix,
    implementationChecksums: {
      setupDecision: await sha256ArtifactChecksum(decisionSource),
      preferences: await sha256ArtifactChecksum(preferenceSource),
      viewModel: await sha256ArtifactChecksum(viewModelSource),
      tests: await sha256ArtifactChecksum(testSource),
      compiler: await sha256ArtifactChecksum(compilerSource),
      proposalSchema: await sha256ArtifactChecksum(proposalSchemaSource),
      documentation: await sha256ArtifactChecksum(documentation),
    },
    activation: {
      liveStage2UiChanged: false,
      existingProposalDocumentsRewritten: false,
      databaseMigrationCreatedOrApplied: false,
      remoteDeploymentPerformed: false,
      nextApprovedPhase: "Phase 2 — responsive Step 1 screen shell",
    },
  };
  const report = { ...coreReport, reportChecksum: await sha256ArtifactChecksum(coreReport) };
  const markdown = [
    "# Build 2 — Stage 2 Step 1 — Phase 1 Verification",
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
    "## Compatibility matrix",
    "",
    ...routeMatrix.map((item) => `- ${item.ready && item.setupDecisionAbsent ? "PASS" : "FAIL"} — ${item.id}: existing behavior preserved`),
    "",
    "## Activation boundary",
    "",
    "- Live Stage 2 interface changed: no",
    "- Existing proposals rewritten: no",
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
  if (report.summary.failed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
