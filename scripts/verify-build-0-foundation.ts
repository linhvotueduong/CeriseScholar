import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createResearchArtifactIdentity,
  sha256ArtifactChecksum,
  type ResearchArtifactReference,
} from "../src/lib/research/artifactIdentity";
import {
  CERISE_RESEARCH_ARTIFACT_GRAPH,
  validateResearchArtifactGraph,
} from "../src/lib/research/researchArtifactGraph";
import {
  RESEARCH_ARTIFACT_DEFINITIONS,
  validateResearchArtifactRegistry,
} from "../src/lib/research/researchArtifactRegistry";
import {
  PROJECT_ROUTE_VERIFICATION_FIXTURES,
  compileProjectRouteProfile,
} from "../src/lib/research/projectRouteProfile";
import { evaluateResearchArtifactLifecycle } from "../src/lib/research/researchArtifactLifecycle";
import {
  createLivingResearchRecord,
  createResearchKnowledgeEntry,
} from "../src/lib/research/livingResearchRecord";
import {
  exportLegacyPaperSections,
  importLegacyPaperSections,
} from "../src/lib/research/canonicalManuscript";
import {
  applyWritingPatch,
  createWritingPatch,
} from "../src/lib/research/writingPatch";
import { createResearchDecisionRecord } from "../src/lib/research/researchDecisionLedger";
import {
  collectResearchAssetPublicationIssues,
  createResearchAssetRecord,
} from "../src/lib/research/researchAssetRegistry";
import {
  compilePublicationTemplateRegistry,
  pinPublicationTemplate,
  verifyPublicationTemplatePin,
} from "../src/lib/research/publicationTemplateRegistry";
import {
  indexResearchArtifact,
  inspectResearchFoundation,
} from "../src/lib/research/researchFoundation";

const VERIFIED_FOR = "2026-08-03";
const NOW = "2026-08-03T12:00:00.000Z";
const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");
const JSON_PATH = path.join(OUTPUT_DIRECTORY, "build-0-foundation-verification.json");
const MARKDOWN_PATH = path.join(OUTPUT_DIRECTORY, "build-0-foundation-verification.md");

interface AcceptanceCheck {
  id: string;
  label: string;
  passed: boolean;
  evidence: string;
}

function reference(identity: Awaited<ReturnType<typeof createResearchArtifactIdentity>>): ResearchArtifactReference {
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
  const routes = await Promise.all(PROJECT_ROUTE_VERIFICATION_FIXTURES.map(async (fixture) => ({
    fixture,
    profile: await compileProjectRouteProfile(fixture.input),
  })));
  const secondRoutePass = await Promise.all(PROJECT_ROUTE_VERIFICATION_FIXTURES.map((fixture) => compileProjectRouteProfile(fixture.input)));
  const templates = await compilePublicationTemplateRegistry();
  const migration = await readFile(path.join(process.cwd(), "supabase/migrations/20260803090000_build0_research_foundation.sql"), "utf8");

  const oldDesign = await createResearchArtifactIdentity({ artifactKind: "study-design", artifactId: "verify-design", artifactSchemaVersion: 1, payload: { design: "survey" } });
  const currentDesign = await createResearchArtifactIdentity({ artifactKind: "study-design", artifactId: "verify-design", artifactSchemaVersion: 1, payload: { design: "randomized" } });
  const contract = await createResearchArtifactIdentity({ artifactKind: "analysis-contract", artifactId: "verify-contract", artifactSchemaVersion: 1, payload: { method: "model" }, sources: [reference(oldDesign)] });
  const candidate = await createResearchArtifactIdentity({ artifactKind: "pilot-candidate", artifactId: "verify-candidate", artifactSchemaVersion: 1, payload: { frozen: true }, sources: [reference(contract)] });
  const indexRecords = [currentDesign, contract, candidate].map((identity) => indexResearchArtifact({ projectId: "verify-project", userId: "verify-user", identity, storageLocator: `domain:${identity.artifactId}`, createdAt: NOW }));
  const lifecycle = evaluateResearchArtifactLifecycle(indexRecords, CERISE_RESEARCH_ARTIFACT_GRAPH);

  const planned = await createResearchKnowledgeEntry({ id: "verify-planned", projectId: "verify-project", stage: 3, stepId: "plan-participants", kind: "method-detail", title: "Planned sample", body: "Target 120 participants.", timing: "planned", author: "researcher", sourceReferences: [reference(currentDesign)], manuscriptTargets: ["methods"], createdAt: NOW });
  const actual = await createResearchKnowledgeEntry({ id: "verify-actual", projectId: "verify-project", stage: 5, stepId: "collect-evidence", kind: "method-detail", title: "Actual sample", body: "Collection closed at 113 participants.", timing: "actual", author: "researcher", sourceReferences: [reference(currentDesign)], manuscriptTargets: ["methods", "results"], createdAt: "2026-08-04T12:00:00.000Z" });
  const reconciled = await createResearchKnowledgeEntry({ id: "verify-reconciled", projectId: "verify-project", stage: 7, stepId: "interpret-and-compose", kind: "writing-note", title: "Reconcile sample", body: "Report both target and achieved sample.", timing: "reconciled", author: "researcher", sourceReferences: [reference(currentDesign)], manuscriptTargets: ["methods", "results"], reconcilesEntryIds: [planned.id, actual.id], createdAt: "2026-08-05T12:00:00.000Z" });
  const livingRecord = await createLivingResearchRecord("verify-project", [planned, actual, reconciled]);

  const legacyRows = [
    { section_key: "introduction", content: "  Legacy introduction\nkept exactly.  ", updated_at: NOW },
    { section_key: "results", content: "Result A.\n\nResult B.", updated_at: NOW },
  ];
  const manuscript = await importLegacyPaperSections("verify-project", "Verification manuscript", legacyRows, NOW);
  const roundTrip = new Map(exportLegacyPaperSections(manuscript).map((row) => [row.section_key, row.content]));
  const patch = await createWritingPatch({
    id: "verify-patch",
    projectId: "verify-project",
    baseManuscriptChecksum: manuscript.identity.checksum,
    summary: "Verified review-before-apply patch.",
    proposer: "ai-assistant",
    operations: [{ id: "verify-replace", kind: "replace-node", sectionId: "results", nodeId: "legacy-results", node: { id: "verified-results", kind: "paragraph", text: "Verified results.", level: null, referenceIds: [], sourceKnowledgeEntryIds: [actual.id], sourceAssetIds: [] } }],
    sourceReferences: [reference(currentDesign)],
    proposedAt: NOW,
  });
  const updatedManuscript = await applyWritingPatch(manuscript, patch, [{ operationId: "verify-replace", decision: "accept", reason: "Matches the verified result source." }], NOW);
  let stalePatchRejected = false;
  try {
    await applyWritingPatch(updatedManuscript, patch, [{ operationId: "verify-replace", decision: "accept", reason: "Retry." }], NOW);
  } catch {
    stalePatchRejected = true;
  }

  const decision = await createResearchDecisionRecord({ id: "verify-decision", projectId: "verify-project", domain: "manuscript", suggestionId: patch.id, suggestionKind: "writing-patch", suggestionSummary: patch.summary, action: "applied", decisionReason: "Researcher accepted the source-bound wording.", decidedAt: NOW, baseArtifact: reference(await createResearchArtifactIdentity({ artifactKind: "canonical-manuscript", artifactId: "verify-manuscript", artifactSchemaVersion: 1, payload: { revision: 1 } })), suggestionChecksum: patch.checksum, resultingArtifact: reference(updatedManuscript.identity), servedModel: "verification-model" });
  const analysisSource = await createResearchArtifactIdentity({ artifactKind: "analysis-results", artifactId: "verify-results", artifactSchemaVersion: 1, payload: { aggregate: true } });
  const verifiedAsset = await createResearchAssetRecord({ id: "verify-figure", projectId: "verify-project", kind: "figure", origin: "analysis", title: "Verified aggregate result", caption: "Aggregate result by condition.", altText: "Two bars compare the aggregate conditions.", storageLocator: "research-assets/verify-project/figure.svg", contentChecksum: analysisSource.checksum, sourceReferences: [reference(analysisSource)], citationKeys: [], rights: { status: "owned", license: "", attribution: "Created from project aggregate results.", evidenceLocator: "" }, reviewStatus: "verified" });
  const literatureAsset = await createResearchAssetRecord({ id: "verify-literature-figure", projectId: "verify-project", kind: "image", origin: "literature", title: "Literature figure", caption: "External figure.", altText: "External figure awaiting review.", storageLocator: "research-assets/verify-project/literature.png", contentChecksum: analysisSource.checksum, sourceReferences: [reference(analysisSource)], citationKeys: [], rights: { status: "permission-required", license: "", attribution: "", evidenceLocator: "" }, reviewStatus: "draft" });
  const templatePin = pinPublicationTemplate("verify-project", templates[0], NOW);
  const inspection = inspectResearchFoundation();

  const routeChecksums = routes.map(({ profile }) => profile.identity.checksum);
  const secondRouteChecksums = secondRoutePass.map((profile) => profile.identity.checksum);
  const tableNames = ["research_artifact_index", "project_route_profiles", "research_knowledge_entries", "manuscript_documents", "research_decision_events", "research_asset_records", "project_template_pins"];
  const acceptance: AcceptanceCheck[] = [
    check("AC-01", "Legacy preservation", !/DROP TABLE public\.paper_sections|DELETE FROM public\.paper_sections/.test(migration), "The additive migration does not delete or rewrite paper_sections."),
    check("AC-02", "Route differences", new Set(routeChecksums).size === 12 && routes[0].profile.capabilities.includes("responsive-browser-study") && routes[1].profile.capabilities.includes("lab-device-rehearsal"), "All 12 route fixtures differ and activate setting-specific capabilities."),
    check("AC-03", "Checksum lineage", indexRecords[1].sourceReferences[0]?.checksum === oldDesign.checksum && !("payload" in indexRecords[1]), "The index contains source checksums and no editable domain payload."),
    check("AC-04", "Stale dependency propagation", lifecycle.some((item) => item.artifactKind === "analysis-contract" && item.status === "stale") && lifecycle.some((item) => item.artifactKind === "pilot-candidate" && item.status === "stale"), "A changed design marks its contract and downstream candidate stale."),
    check("AC-05", "Preserved history", updatedManuscript.revisionHistory.some((item) => item.previousChecksum === manuscript.identity.checksum), "The prior immutable manuscript checksum remains in revision history."),
    check("AC-06", "Continuous knowledge", livingRecord.entries.length === 3 && livingRecord.identity.sourceFingerprint.sources.length > 0, "Stage 3, 5, and 7 knowledge entries coexist with source provenance."),
    check("AC-07", "Planned versus actual", livingRecord.entries.some((item) => item.timing === "planned") && livingRecord.entries.some((item) => item.timing === "actual") && livingRecord.entries.some((item) => item.timing === "reconciled"), "Planned, actual, and reconciled facts remain distinct."),
    check("AC-08", "Lossless manuscript migration", legacyRows.every((row) => roundTrip.get(row.section_key) === row.content), "Legacy section strings round-trip without whitespace or content loss."),
    check("AC-09", "Stale patch rejection", stalePatchRejected, "A patch cannot be re-applied after its base manuscript checksum changes."),
    check("AC-10", "AI accountability", decision.promptStored === false && decision.chatTranscriptStored === false && decision.decisionReason.length > 0, "The ledger stores the researcher decision and checksums, not prompts or chat transcripts."),
    check("AC-11", "Figure provenance", verifiedAsset.sourceReferences[0]?.checksum === analysisSource.checksum && collectResearchAssetPublicationIssues(verifiedAsset).length === 0, "The verified figure is source-bound, captioned, accessible, and reviewed."),
    check("AC-12", "Rights fail closed", collectResearchAssetPublicationIssues(literatureAsset).includes("rights-not-cleared"), "An external figure requiring permission cannot become publication-ready."),
    check("AC-13", "Template stability", verifyPublicationTemplatePin(templatePin, await compilePublicationTemplateRegistry()), "A pinned template resolves only to its exact version checksum."),
    check("AC-14", "Owner isolation", tableNames.every((name) => migration.includes(`ALTER TABLE public.${name} ENABLE ROW LEVEL SECURITY`) && migration.includes(`'${name}'`)) && migration.includes("table_name || '_owner_select'") && migration.includes("projects.user_id = (SELECT auth.uid())"), "All seven tables enable RLS and receive owner/project policies."),
    check("AC-15", "Privacy boundary", Object.values(inspection.privacyBoundary).every((value) => value === false) && RESEARCH_ARTIFACT_DEFINITIONS.every((item) => item.participantRowsAllowed === false), "Participant rows, recordings, receipts, signatures, and uploaded contents are excluded."),
    check("AC-16", "Deterministic foundation", JSON.stringify(routeChecksums) === JSON.stringify(secondRouteChecksums) && validateResearchArtifactRegistry().length === 0 && validateResearchArtifactGraph(CERISE_RESEARCH_ARTIFACT_GRAPH).length === 0, "Two independent compiler passes produce identical checksums; registry and graph validate."),
  ];

  const routeMatrix = routes.map(({ fixture, profile }) => ({
    id: fixture.id,
    label: fixture.label,
    checksum: profile.identity.checksum,
    capabilities: profile.capabilities,
    requiredSteps: profile.applicability.filter((item) => item.status === "required").map((item) => `${item.stage}:${item.stepId}`),
    notApplicableSteps: profile.applicability.filter((item) => item.status === "not-applicable").map((item) => `${item.stage}:${item.stepId}`),
  }));
  const coreReport = {
    build: "Build 0 — Cross-stage foundations",
    schemaVersion: 1,
    verifiedFor: VERIFIED_FOR,
    summary: {
      passed: acceptance.filter((item) => item.passed).length,
      failed: acceptance.filter((item) => !item.passed).length,
      artifactKinds: RESEARCH_ARTIFACT_DEFINITIONS.length,
      graphDependencies: CERISE_RESEARCH_ARTIFACT_GRAPH.dependencies.length,
      routeFixtures: routeMatrix.length,
      templateProfiles: templates.length,
      persistenceTables: tableNames.length,
    },
    acceptance,
    routeMatrix,
    exclusions: ["participant rows", "recordings", "consent receipts", "signatures", "uploaded file contents", "automatic AI application", "publication acceptance claims"],
  };
  const report = { ...coreReport, reportChecksum: await sha256ArtifactChecksum(coreReport) };
  const markdown = [
    "# Build 0 Foundation Verification",
    "",
    `Verified for: ${report.verifiedFor}`,
    "",
    `Result: **${report.summary.passed}/${report.acceptance.length} acceptance checks passed**`,
    "",
    `Report checksum: \`${report.reportChecksum}\``,
    "",
    "## Foundation inventory",
    "",
    `- ${report.summary.artifactKinds} registered artifact families across Stages 1–8`,
    `- ${report.summary.graphDependencies} reasoned dependency edges`,
    `- ${report.summary.routeFixtures} route verification fixtures`,
    `- ${report.summary.templateProfiles} versioned template foundations`,
    `- ${report.summary.persistenceTables} additive owner-isolated persistence tables`,
    "",
    "## Acceptance checks",
    "",
    ...report.acceptance.map((item) => `- ${item.passed ? "PASS" : "FAIL"} — **${item.id}: ${item.label}** — ${item.evidence}`),
    "",
    "## Route matrix",
    "",
    "| Fixture | Required steps | Not applicable | Capabilities |",
    "| --- | ---: | ---: | ---: |",
    ...report.routeMatrix.map((item) => `| ${item.label} | ${item.requiredSteps.length} | ${item.notApplicableSteps.length} | ${item.capabilities.length} |`),
    "",
    "## Enforced exclusions",
    "",
    ...report.exclusions.map((item) => `- ${item}`),
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
