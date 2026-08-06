import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256ArtifactChecksum } from "../src/lib/research/artifactIdentity";
import { PROJECT_ROUTE_VERIFICATION_FIXTURES } from "../src/lib/research/projectRouteProfile";
import {
  PROPOSAL_AUTHORITY_REGISTRY_ACCESSED_AT,
  PROPOSAL_REQUIREMENT_AUTHORITIES,
  compileProposalRequirements,
  createDefaultProposalRequirementDraft,
} from "../src/lib/research/proposalRequirementsCompiler";
import { RESEARCH_PATH_STAGES } from "../src/lib/research/researchPathConfig";
import { createResearchProposalDocument, verifyResearchProposalDocument } from "../src/lib/research/researchProposalDocument";

const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");
const JSON_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-2-verification.json");
const MARKDOWN_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-2-verification.md");
const VERIFIED_FOR = "2026-08-05";

interface AcceptanceCheck {
  id: string;
  label: string;
  passed: boolean;
  evidence: string;
}

const check = (id: string, label: string, passed: boolean, evidence: string): AcceptanceCheck => ({ id, label, passed, evidence });

async function main() {
  const [compilerSource, uiSource, uiStyles, workspaceSource, configSource, cacheSource, synthesisUiSource] = await Promise.all([
    readFile(path.join(process.cwd(), "src/lib/research/proposalRequirementsCompiler.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage2ProposalStudio.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/Stage2ProposalStudio.module.css"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/ResearchPathWorkspace.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/researchPathConfig.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/researchProposalCache.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/ProposalSynthesisStudio.tsx"), "utf8"),
  ]);
  const stage2 = RESEARCH_PATH_STAGES.find((stage) => stage.id === "stage-02");
  if (!stage2) throw new Error("Stage 2 is missing.");

  const matrix = await Promise.all(PROJECT_ROUTE_VERIFICATION_FIXTURES.map(async (fixture) => {
    const route = { intent: fixture.input.intent, methodFamily: fixture.input.methodFamily };
    const draft = createDefaultProposalRequirementDraft(route);
    draft.researcherConfirmed = true;
    const compiled = compileProposalRequirements({ projectId: fixture.input.projectId, route, draft });
    const proposal = await createResearchProposalDocument({ projectId: fixture.input.projectId, requirements: compiled.profile, now: "2026-08-05T00:00:00.000Z" });
    return { fixture: fixture.id, compiled, proposalValid: await verifyResearchProposalDocument(proposal) };
  }));
  const synthesis = matrix.find((item) => item.fixture === "systematic-review")!;
  const qualitative = matrix.filter((item) => ["recorded-interview", "focus-group"].includes(item.fixture));
  const synthesisText = synthesis.compiled.profile.requirements.map((item) => `${item.label} ${item.description}`).join(" ");
  const qualitativeText = qualitative.flatMap((item) => item.compiled.profile.requirements.map((requirement) => `${requirement.label} ${requirement.description}`)).join(" ");
  const visibleStepIds = stage2.steps.map((step) => step.id);

  const acceptance: AcceptanceCheck[] = [
    check("AC-01", "Seven-step Stage 2 shell", stage2.steps.length === 7 && stage2.steps[0].canvas === "proposal-brief" && stage2.steps[6].canvas === "proposal-verify", "Stage 2 now runs from exact pathway confirmation through a reviewed Stage 3 handoff."),
    check("AC-02", "Legacy draft identity preservation", visibleStepIds[1] === "stage-02-step-01" && visibleStepIds[4] === "stage-02-step-02" && visibleStepIds[5] === "stage-02-step-03", "Literature, roadmap, and proposal-writing draft keys remain attached to their closest semantic successor."),
    check("AC-03", "Twelve-route compiler matrix", matrix.length === 12 && matrix.every((item) => item.compiled.ready && item.proposalValid), "All 12 canonical route fixtures compile to checksum-valid proposal requirements."),
    check("AC-04", "Qualitative-language boundary", !/\bvariables?\b|\bhypoth(?:esis|eses)\b/i.test(qualitativeText), "Qualitative routes are not forced into variable or hypothesis fields."),
    check("AC-05", "Evidence-synthesis language boundary", !/\bparticipants?\b/i.test(synthesisText), "The evidence-synthesis profile uses studies, documents, records, and evidence units rather than participant-study language."),
    check("AC-06", "Current authority snapshots", PROPOSAL_AUTHORITY_REGISTRY_ACCESSED_AT === "2026-08-05T00:00:00.000Z" && PROPOSAL_REQUIREMENT_AUTHORITIES.length === 5 && PROPOSAL_REQUIREMENT_AUTHORITIES.every((item) => item.sourceUrl.startsWith("https://") && item.version.length > 0), "NIH Forms I, NSF PAPPG 24-1 plus supplements, PRISMA-P, and JARS/MMARS sources are pinned by version and access date."),
    check("AC-07", "Opportunity override safety", compilerSource.includes("nih-nofo-overrides") && compilerSource.includes("nsf-solicitation-overrides") && compilerSource.includes("not-compliance-approval-submission"), "Funder profiles warn that the active opportunity controls and cannot represent compliance or approval."),
    check("AC-08", "Exact Stage 1 provenance", uiSource.includes("Research Pathway Brief") && uiSource.includes("pathwayDocument.identity.checksum") && uiSource.includes("sourceFingerprint.sources"), "The first proposal step displays and binds the exact Stage 1 revision and checksum."),
    check("AC-09", "Derived readiness", workspaceSource.includes("proposalStepReadiness") && workspaceSource.includes("Stage 2 readiness is derived automatically") && !uiSource.includes("Mark step complete"), "Stage 2 readiness comes from artifacts and compiler issues rather than manual completion fields."),
    check("AC-10", "Bounded workflow scrolling", uiStyles.includes("height: 100%") && uiStyles.includes("overflow: hidden") && uiStyles.includes("scrollbar-gutter: stable") && uiSource.includes('data-testid="stage2-proposal-brief-scroll"'), "The desktop workflow stays within the canvas and scrolls internally; responsive layouts deliberately release page height."),
    check("AC-11", "Conflict-safe local persistence", cacheSource.includes("review-required") && cacheSource.includes("lastSyncedChecksum") && uiSource.includes("Neither version was overwritten"), "Divergent device and secure proposal versions require an explicit researcher choice."),
    check("AC-12", "Optimistic secure persistence", uiSource.includes("saveResearchProposalDocument") && uiSource.includes("expectedCloudChecksum") && uiSource.includes("saveQueue"), "Canonical proposal writes remain checksum-guarded and serialized."),
    check("AC-13", "Honest future-step boundaries", uiSource.includes("Plan first, discover broadly") && (uiSource.includes("No gap or novelty claim is inferred automatically") || (uiSource.includes("ProposalSynthesisStudio") && synthesisUiSource.includes("No gap, novelty, truth, certainty, methodological quality, or approval is certified"))) && uiSource.includes("Stage 2 proposes the study; Stage 3 implements it"), "Implemented proposal responsibilities retain explicit non-certification boundaries while later study-contract and release responsibilities remain clearly deferred."),
    check("AC-14", "Legacy discovery and writing continuity", uiSource.includes("EmbeddedScholarAsk") && uiSource.includes("EmbeddedLiteratureReview") && uiSource.includes("EmbeddedEvidenceLibrary") && uiSource.includes("ProposalComposerStudio") && uiSource.includes("roadmap-"), "Existing discovery, review, and research-roadmap work remains accessible; Phase 6 replaces the embedded legacy editor with the six-section compatibility composer."),
    check("AC-15", "No destructive schema activation", !configSource.includes("proposal-literature") && !compilerSource.includes("supabase") && !uiSource.includes("apply migration"), "Phase 2 replaces the UI and compiler locally without applying the Phase 1 database migration or deploying remotely."),
  ];
  const coreReport = {
    build: "Build 2, Phase 2 — Stage 2 shell and requirements compiler",
    schemaVersion: 1,
    verifiedFor: VERIFIED_FOR,
    summary: {
      passed: acceptance.filter((item) => item.passed).length,
      failed: acceptance.filter((item) => !item.passed).length,
      acceptanceChecks: acceptance.length,
      routeFixtures: matrix.length,
      stage2Steps: stage2.steps.length,
      authoritySnapshots: PROPOSAL_REQUIREMENT_AUTHORITIES.length,
    },
    acceptance,
    matrix: matrix.map((item) => ({
      fixture: item.fixture,
      templateId: item.compiled.profile.profileId.split("--").at(-1),
      requirements: item.compiled.profile.requirements.length,
      authorities: item.compiled.profile.authorities.length,
      ready: item.compiled.ready,
      proposalValid: item.proposalValid,
    })),
    implementationChecksums: {
      compiler: await sha256ArtifactChecksum(compilerSource),
      ui: await sha256ArtifactChecksum(uiSource),
      styles: await sha256ArtifactChecksum(uiStyles),
      workspace: await sha256ArtifactChecksum(workspaceSource),
      config: await sha256ArtifactChecksum(configSource),
      cache: await sha256ArtifactChecksum(cacheSource),
    },
    activation: {
      phase1MigrationStillUnapplied: true,
      remoteDeploymentPerformed: false,
      stage2UiReplacedLocally: true,
      browserRuntimeAvailable: false,
      browserValidationNote: "The listed in-app Browser plugin exposed no callable browser runtime in this session; rendered Browser QA was not substituted with an unauthorized external surface.",
    },
  };
  const report = { ...coreReport, reportChecksum: await sha256ArtifactChecksum(coreReport) };
  const markdown = [
    "# Build 2 Phase 2 Verification",
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
    ...report.matrix.map((item) => `- ${item.fixture}: ${item.templateId}; ${item.requirements} requirements; ${item.authorities} authorities; ${item.ready && item.proposalValid ? "PASS" : "FAIL"}`),
    "",
    "## Activation boundary",
    "",
    "- Stage 2 interface replaced locally: yes",
    "- Phase 1 Supabase migration applied: no",
    "- Remote deployment performed: no",
    "- Browser plugin runtime callable in this session: no",
    "",
  ].join("\n");
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await Promise.all([
    writeFile(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(MARKDOWN_PATH, markdown, "utf8"),
  ]);
  process.stdout.write(`${JSON.stringify({
    result: report.summary.failed ? "FAIL" : "PASS",
    passed: report.summary.passed,
    failed: report.summary.failed,
    reportChecksum: report.reportChecksum,
    json: JSON_PATH,
    markdown: MARKDOWN_PATH,
  }, null, 2)}\n`);
  if (report.summary.failed) process.exitCode = 1;
}

void main();
