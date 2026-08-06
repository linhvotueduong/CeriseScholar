import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createResearchArtifactIdentity,
  type ResearchArtifactReference,
} from "./artifactIdentity";
import {
  CERISE_RESEARCH_ARTIFACT_GRAPH,
  validateResearchArtifactGraph,
} from "./researchArtifactGraph";
import {
  RESEARCH_ARTIFACT_DEFINITIONS,
  validateResearchArtifactRegistry,
} from "./researchArtifactRegistry";
import {
  PROJECT_ROUTE_VERIFICATION_FIXTURES,
  compileProjectRouteProfile,
} from "./projectRouteProfile";
import {
  evaluateResearchArtifactLifecycle,
} from "./researchArtifactLifecycle";
import {
  appendResearchKnowledgeEntry,
  createLivingResearchRecord,
  createResearchKnowledgeEntry,
  selectCurrentResearchKnowledge,
} from "./livingResearchRecord";
import {
  exportLegacyPaperSections,
  importLegacyPaperSections,
  verifyCanonicalManuscript,
} from "./canonicalManuscript";
import {
  applyWritingPatch,
  createWritingPatch,
} from "./writingPatch";
import {
  createResearchDecisionRecord,
  verifyResearchDecisionRecord,
} from "./researchDecisionLedger";
import {
  collectResearchAssetPublicationIssues,
  createResearchAssetRecord,
  verifyResearchAssetRecord,
} from "./researchAssetRegistry";
import {
  compilePublicationTemplateRegistry,
  pinPublicationTemplate,
  validatePublicationTemplateRegistry,
  verifyPublicationTemplatePin,
} from "./publicationTemplateRegistry";
import {
  compileResearchFoundationBlueprint,
  indexResearchArtifact,
  inspectResearchFoundation,
} from "./researchFoundation";

const NOW = "2026-08-03T12:00:00.000Z";
const USER_ID = "user-0001";

function reference(identity: Awaited<ReturnType<typeof createResearchArtifactIdentity>>): ResearchArtifactReference {
  return {
    artifactKind: identity.artifactKind,
    artifactId: identity.artifactId,
    schemaVersion: identity.artifactSchemaVersion,
    checksum: identity.checksum,
  };
}

test("Build 0 registry covers all eight stages without duplicating domain payload ownership", () => {
  assert.deepEqual(validateResearchArtifactRegistry(), []);
  assert.deepEqual([...new Set(RESEARCH_ARTIFACT_DEFINITIONS.map((item) => item.stage))].sort(), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(RESEARCH_ARTIFACT_DEFINITIONS.every((item) => item.indexStoresPayload === false));
  assert.ok(RESEARCH_ARTIFACT_DEFINITIONS.every((item) => item.participantRowsAllowed === false));
});

test("the complete cross-stage dependency graph is acyclic and reasoned", () => {
  assert.deepEqual(validateResearchArtifactGraph(CERISE_RESEARCH_ARTIFACT_GRAPH), []);
  assert.ok(CERISE_RESEARCH_ARTIFACT_GRAPH.dependencies.length > 50);
  assert.ok(CERISE_RESEARCH_ARTIFACT_GRAPH.dependencies.every((edge) => edge.reason.length > 20));
});

test("all 12 route fixtures compile and produce distinct user workflows", async () => {
  const routes = await Promise.all(PROJECT_ROUTE_VERIFICATION_FIXTURES.map((fixture) => compileProjectRouteProfile(fixture.input)));
  assert.equal(routes.length, 12);
  assert.equal(new Set(routes.map((route) => route.identity.checksum)).size, 12);
  const online = routes[0];
  const laboratory = routes[1];
  const review = routes[8];
  assert.ok(online.capabilities.includes("responsive-browser-study"));
  assert.ok(!online.capabilities.includes("lab-device-rehearsal"));
  assert.ok(laboratory.capabilities.includes("lab-device-rehearsal"));
  assert.equal(review.applicability.find((item) => item.stepId === "plan-participants")?.status, "not-applicable");
  assert.equal(review.applicability.find((item) => item.stepId === "import-evidence")?.status, "required");
});

test("route compilation is deterministic for the same researcher-confirmed input", async () => {
  const input = PROJECT_ROUTE_VERIFICATION_FIXTURES[2].input;
  const [first, second] = await Promise.all([compileProjectRouteProfile(input), compileProjectRouteProfile(input)]);
  assert.equal(first.identity.checksum, second.identity.checksum);
  assert.deepEqual(first.applicability, second.applicability);
});

test("artifact index records contain identity and lineage but not an editable payload", async () => {
  const source = await createResearchArtifactIdentity({ artifactKind: "research-proposal", artifactId: "proposal-1", artifactSchemaVersion: 1, payload: { question: "Q" } });
  const derived = await createResearchArtifactIdentity({ artifactKind: "study-design", artifactId: "design-1", artifactSchemaVersion: 1, payload: { design: "survey" }, sources: [reference(source)] });
  const indexed = indexResearchArtifact({ projectId: "project-1", userId: USER_ID, identity: derived, storageLocator: "study_designs:project-1", createdAt: NOW });
  assert.equal(indexed.sourceReferences[0].checksum, source.checksum);
  assert.ok(!("payload" in indexed));
});

test("source checksum changes mark direct and downstream artifacts stale", async () => {
  const oldDesign = await createResearchArtifactIdentity({ artifactKind: "study-design", artifactId: "design-1", artifactSchemaVersion: 1, payload: { design: "survey" } });
  const newDesign = await createResearchArtifactIdentity({ artifactKind: "study-design", artifactId: "design-1", artifactSchemaVersion: 1, payload: { design: "randomized" } });
  const contract = await createResearchArtifactIdentity({ artifactKind: "analysis-contract", artifactId: "contract-1", artifactSchemaVersion: 1, payload: { method: "t-test" }, sources: [reference(oldDesign)] });
  const candidate = await createResearchArtifactIdentity({ artifactKind: "pilot-candidate", artifactId: "candidate-1", artifactSchemaVersion: 1, payload: { frozen: true }, sources: [reference(contract)] });
  const records = [newDesign, contract, candidate].map((identity) => indexResearchArtifact({ projectId: "project-1", userId: USER_ID, identity, storageLocator: `domain:${identity.artifactId}`, createdAt: NOW }));
  const findings = evaluateResearchArtifactLifecycle(records, CERISE_RESEARCH_ARTIFACT_GRAPH);
  assert.equal(findings.find((item) => item.artifactKind === "analysis-contract")?.status, "stale");
  assert.equal(findings.find((item) => item.artifactKind === "pilot-candidate")?.status, "stale");
});

test("Living Research Record preserves planned, actual, and reconciled knowledge", async () => {
  const source = await createResearchArtifactIdentity({ artifactKind: "study-design", artifactId: "design-1", artifactSchemaVersion: 1, payload: { design: "survey" } });
  const planned = await createResearchKnowledgeEntry({ id: "planned-sample", projectId: "project-1", stage: 3, stepId: "plan-participants", kind: "method-detail", title: "Planned sample", body: "Recruit 120 adult participants.", timing: "planned", author: "researcher", sourceReferences: [reference(source)], manuscriptTargets: ["methods"], createdAt: NOW });
  const actual = await createResearchKnowledgeEntry({ id: "actual-sample", projectId: "project-1", stage: 5, stepId: "collect-evidence", kind: "method-detail", title: "Actual sample", body: "Recruitment closed at 113 participants.", timing: "actual", author: "researcher", sourceReferences: [reference(source)], manuscriptTargets: ["methods", "results"], createdAt: "2026-08-04T12:00:00.000Z" });
  const reconciled = await createResearchKnowledgeEntry({ id: "reconciled-sample", projectId: "project-1", stage: 7, stepId: "interpret-and-compose", kind: "writing-note", title: "Report planned and actual sample", body: "State both the target and achieved sample with the documented stopping point.", timing: "reconciled", author: "researcher", sourceReferences: [reference(source)], manuscriptTargets: ["methods", "results"], reconcilesEntryIds: [planned.id, actual.id], createdAt: "2026-08-05T12:00:00.000Z" });
  const record = await createLivingResearchRecord("project-1", [planned, actual, reconciled]);
  assert.equal(record.entries.length, 3);
  assert.equal(selectCurrentResearchKnowledge(record, "methods").length, 3);
  assert.equal(record.participantDataIncluded, false);
});

test("Living Research Record preserves old and new source revisions without a conflicting current fingerprint", async () => {
  const oldSource = await createResearchArtifactIdentity({ artifactKind: "study-design", artifactId: "design-history", artifactSchemaVersion: 1, payload: { revision: 1 } });
  const newSource = await createResearchArtifactIdentity({ artifactKind: "study-design", artifactId: "design-history", artifactSchemaVersion: 1, payload: { revision: 2 } });
  const oldEntry = await createResearchKnowledgeEntry({ id: "old-design-note", projectId: "project-1", stage: 3, stepId: "select-design", kind: "decision", title: "Initial design", body: "The first design revision used a survey.", timing: "planned", author: "researcher", sourceReferences: [reference(oldSource)], manuscriptTargets: ["methods"], createdAt: NOW });
  const newEntry = await createResearchKnowledgeEntry({ id: "new-design-note", projectId: "project-1", stage: 3, stepId: "select-design", kind: "decision", title: "Revised design", body: "The revised design uses random assignment.", timing: "reconciled", author: "researcher", sourceReferences: [reference(newSource)], manuscriptTargets: ["methods"], supersedesEntryId: oldEntry.id, createdAt: "2026-08-04T12:00:00.000Z" });
  const history = await appendResearchKnowledgeEntry([oldEntry], newEntry);
  const record = await createLivingResearchRecord("project-1", history);
  assert.equal(record.entries.find((entry) => entry.id === oldEntry.id)?.state, "superseded");
  assert.equal(record.identity.sourceFingerprint.sources.length, 1);
  assert.equal(record.identity.sourceFingerprint.sources[0].checksum, newSource.checksum);
});

test("legacy paper sections import and export without changing content", async () => {
  const legacy = [
    { section_key: "introduction", content: "  Exact legacy text\nwith spacing.  ", updated_at: NOW },
    { section_key: "results", content: "Result A.\n\nResult B.", updated_at: NOW },
  ];
  const manuscript = await importLegacyPaperSections("project-1", "Study", legacy, NOW);
  assert.equal(await verifyCanonicalManuscript(manuscript), true);
  const exported = new Map(exportLegacyPaperSections(manuscript).map((item) => [item.section_key, item.content]));
  assert.equal(exported.get("introduction"), legacy[0].content);
  assert.equal(exported.get("results"), legacy[1].content);
});

test("writing patches require explicit review and reject a stale manuscript base", async () => {
  const manuscript = await importLegacyPaperSections("project-1", "Study", [{ section_key: "discussion", content: "Current interpretation.", updated_at: NOW }], NOW);
  const patch = await createWritingPatch({
    id: "patch-1",
    projectId: "project-1",
    baseManuscriptChecksum: manuscript.identity.checksum,
    summary: "Clarify the bounded interpretation.",
    proposer: "ai-assistant",
    operations: [{ id: "replace-discussion", kind: "replace-node", sectionId: "discussion", nodeId: "legacy-discussion", node: { id: "discussion-reviewed", kind: "paragraph", text: "Reviewed interpretation.", level: null, referenceIds: [], sourceKnowledgeEntryIds: [], sourceAssetIds: [] } }],
    sourceReferences: [],
    proposedAt: NOW,
  });
  await assert.rejects(() => applyWritingPatch(manuscript, patch, [], NOW), /explicit decision/);
  const updated = await applyWritingPatch(manuscript, patch, [{ operationId: "replace-discussion", decision: "accept", reason: "Matches the verified interpretation record." }], NOW);
  assert.equal(updated.revision, 2);
  await assert.rejects(() => applyWritingPatch(updated, patch, [{ operationId: "replace-discussion", decision: "accept", reason: "Retry" }], NOW), /stale/);
  const tampered = { ...patch, summary: "Mutated after checksum." };
  await assert.rejects(() => applyWritingPatch(manuscript, tampered, [{ operationId: "replace-discussion", decision: "accept", reason: "Retry" }], NOW), /checksum/);
});

test("unified AI decision records omit prompts and chat transcripts", async () => {
  const base = await createResearchArtifactIdentity({ artifactKind: "canonical-manuscript", artifactId: "manuscript-1", artifactSchemaVersion: 1, payload: { revision: 1 } });
  const decision = await createResearchDecisionRecord({ id: "decision-1", projectId: "project-1", domain: "manuscript", suggestionId: "suggestion-1", suggestionKind: "writing-patch", suggestionSummary: "Clarify one claim.", action: "applied-after-edit", decisionReason: "The edited wording matches the verified source.", decidedAt: NOW, baseArtifact: reference(base), suggestionChecksum: base.checksum, resultingArtifact: null, servedModel: "test-model" });
  assert.equal(await verifyResearchDecisionRecord(decision), true);
  assert.equal(decision.promptStored, false);
  assert.equal(decision.chatTranscriptStored, false);
  assert.ok(!("prompt" in decision));
});

test("research assets carry provenance, accessibility, and rights checks", async () => {
  const source = await createResearchArtifactIdentity({ artifactKind: "analysis-results", artifactId: "results-1", artifactSchemaVersion: 1, payload: { aggregate: true } });
  const asset = await createResearchAssetRecord({ id: "figure-1", projectId: "project-1", kind: "figure", origin: "analysis", title: "Primary outcome", caption: "Mean outcome by condition.", altText: "Two bars show the intervention mean above control.", storageLocator: "research-assets/project-1/figure-1.svg", contentChecksum: source.checksum, sourceReferences: [reference(source)], citationKeys: [], rights: { status: "owned", license: "", attribution: "Created from project aggregate results.", evidenceLocator: "" }, reviewStatus: "verified" });
  assert.equal(await verifyResearchAssetRecord(asset), true);
  assert.deepEqual(collectResearchAssetPublicationIssues(asset), []);
  assert.equal(asset.participantDataIncluded, false);
});

test("literature-origin assets fail closed when rights or citation metadata is missing", async () => {
  const source = await createResearchArtifactIdentity({ artifactKind: "evidence-library", artifactId: "evidence-1", artifactSchemaVersion: 1, payload: { source: true } });
  const asset = await createResearchAssetRecord({ id: "external-figure", projectId: "project-1", kind: "image", origin: "literature", title: "External figure", caption: "Adapted figure.", altText: "Figure details pending.", storageLocator: "research-assets/project-1/external.png", contentChecksum: source.checksum, sourceReferences: [reference(source)], citationKeys: [], rights: { status: "permission-required", license: "", attribution: "", evidenceLocator: "" }, reviewStatus: "draft" });
  assert.deepEqual(collectResearchAssetPublicationIssues(asset), ["asset-review-required", "literature-citation-required", "rights-not-cleared"]);
});

test("template registry versions and pins are checksum stable", async () => {
  const [first, second] = await Promise.all([compilePublicationTemplateRegistry(), compilePublicationTemplateRegistry()]);
  assert.deepEqual(validatePublicationTemplateRegistry(first), []);
  assert.deepEqual(first.map((item) => item.checksum), second.map((item) => item.checksum));
  const pin = pinPublicationTemplate("project-1", first[0], NOW);
  assert.equal(verifyPublicationTemplatePin(pin, second), true);
  assert.equal(verifyPublicationTemplatePin({ ...pin, templateVersion: 99 }, second), false);
});

test("the foundation migration creates seven owner-isolated RLS tables and preserves paper_sections", async () => {
  const sql = await readFile(new URL("../../../supabase/migrations/20260803090000_build0_research_foundation.sql", import.meta.url), "utf8");
  const tableNames = ["research_artifact_index", "project_route_profiles", "research_knowledge_entries", "manuscript_documents", "research_decision_events", "research_asset_records", "project_template_pins"];
  for (const table of tableNames) {
    assert.match(sql, new RegExp(`CREATE TABLE public\\.${table}`));
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
  }
  assert.match(sql, /projects\.user_id = \(SELECT auth\.uid\(\)\)/);
  assert.doesNotMatch(sql, /DROP TABLE public\.paper_sections|DELETE FROM public\.paper_sections/);
});

test("foundation inspector exposes project health without participant data", () => {
  const inspection = inspectResearchFoundation({ routeProfile: {}, artifactIndex: [{ lifecycle_status: "current" }, { lifecycle_status: "stale" }], knowledgeEntries: [{ id: 1 }], manuscript: {}, decisionEvents: [{ id: 1 }], assets: [{ id: 1 }], templatePins: [{ id: 1 }] });
  assert.equal(inspection.project.indexedArtifacts, 2);
  assert.equal(inspection.project.staleArtifacts, 1);
  assert.deepEqual(inspection.privacyBoundary, { participantRowsStored: false, recordingsStored: false, consentReceiptsStored: false, uploadedFileContentsStored: false });
});

test("a complete Build 0 blueprint is ready only when route, registry, graph, and templates validate", async () => {
  const blueprint = await compileResearchFoundationBlueprint(PROJECT_ROUTE_VERIFICATION_FIXTURES[0].input);
  assert.equal(blueprint.ready, true);
  assert.deepEqual(blueprint.registryIssues, []);
  assert.deepEqual(blueprint.graphIssues, []);
  assert.deepEqual(blueprint.templateIssues, []);
});
