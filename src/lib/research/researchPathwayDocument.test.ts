import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createResearchDecisionRecord, verifyResearchDecisionRecord } from "./researchDecisionLedger";
import { readResearchPathwayCache, writeResearchPathwayCache } from "./researchPathwayCache";
import {
  createResearchPathwayDocument,
  legacyProjectFieldsFromResearchPathway,
  normalizeResearchPathwayDocument,
  rebaseResearchPathwayDocument,
  researchPathwayDocumentToDraft,
  researchPathwayDocumentsHaveSameContent,
  verifyResearchPathwayDocument,
  type LegacyProjectPathwayFields,
} from "./researchPathwayDocument";
import { reconcileResearchPathwaySources } from "./researchPathwayReconciliation";
import { readStepDraft, type ResearchPathDraft } from "./researchPathDraft";

const PROJECT_ID = "c10c1578-193f-48ae-a61e-5988c129d1ce";
const NOW = "2026-08-03T12:00:00.000Z";

const LEGACY_PROJECT: LegacyProjectPathwayFields = {
  researchQuestion: "How does guided reflection affect first-year researchers?",
  researchApproach: "Mixed methods",
  researchHypothesis: "Guided reflection improves problem framing.",
  updatedAt: "2026-08-02T12:00:00.000Z",
};

function legacyDraft(question = "How does guided reflection affect first-year researchers?"): ResearchPathDraft {
  return {
    steps: {
      "stage-01-step-01": {
        completed: true,
        checks: { "check-0": true },
        fields: {
          "problem-0-situation": "Early researchers collect promising ideas.",
          "problem-0-consequence": "The ideas remain too broad to study.",
          "problem-0-response": "Support deliberate problem framing.",
          "identified-problem": "Promising ideas are not becoming bounded research problems.",
          "legacy-free-note": "Preserve this exact legacy note.",
        },
      },
      "stage-01-step-02": {
        completed: false,
        checks: {},
        fields: {
          "scholarask-needs": "Researchers need structured prompts.",
          "scholarask-gaps": "Effects on problem framing remain uncertain.",
          "baseline-synthesis": "The literature supports scaffolding, with a framing gap.",
        },
      },
      "stage-01-step-03": {
        completed: false,
        checks: {},
        fields: {
          "raw-question-0": "What makes an idea researchable?",
          "key-question-0": question,
        },
      },
      "stage-01-step-04": {
        completed: false,
        checks: {},
        fields: {
          "backcasting-vision": "Researchers leave with a bounded problem.",
          "backcasting-baseline": "Ideas are currently broad.",
          "backcasting-concepts": "Reflection and evidence prompts.",
          "backcasting-roadmap": "Prototype, pilot, and evaluate.",
        },
      },
      "stage-02-step-01": {
        completed: true,
        checks: { "check-0": true },
        fields: { "proposal-note": "Stage 2 must remain untouched." },
      },
    },
  };
}

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

test("canonical Stage 1 migration preserves mapped fields, unmapped notes, project columns, and non-Stage-1 draft work", async () => {
  const original = legacyDraft();
  const document = await createResearchPathwayDocument({
    projectId: PROJECT_ID,
    draft: original,
    legacyProject: LEGACY_PROJECT,
    migrationSources: ["workspace-v2"],
    now: NOW,
  });

  assert.equal(await verifyResearchPathwayDocument(document), true);
  assert.deepEqual(document.migration.sources, ["project-columns", "workspace-v2"]);
  assert.equal(document.participantDataIncluded, false);
  assert.equal(document.unmappedLegacyFields[0]?.fields["legacy-free-note"], "Preserve this exact legacy note.");
  assert.deepEqual(legacyProjectFieldsFromResearchPathway(document), {
    researchQuestion: LEGACY_PROJECT.researchQuestion,
    researchApproach: LEGACY_PROJECT.researchApproach,
    researchHypothesis: LEGACY_PROJECT.researchHypothesis,
    updatedAt: NOW,
  });

  const restored = researchPathwayDocumentToDraft(document, original);
  assert.equal(readStepDraft(restored, "stage-01-step-01").fields["problem-0-situation"], "Early researchers collect promising ideas.");
  assert.equal(readStepDraft(restored, "stage-01-step-01").fields["legacy-free-note"], "Preserve this exact legacy note.");
  assert.equal(readStepDraft(restored, "stage-02-step-01").fields["proposal-note"], "Stage 2 must remain untouched.");
});

test("installing a canonical choice clears deleted mapped fields without clearing unknown legacy fields", async () => {
  const original = legacyDraft();
  const emptied = legacyDraft();
  delete emptied.steps["stage-01-step-01"].fields["problem-0-situation"];
  delete emptied.steps["stage-01-step-01"].fields["problem-0-consequence"];
  delete emptied.steps["stage-01-step-01"].fields["problem-0-response"];
  const document = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: emptied, now: NOW });
  const restored = researchPathwayDocumentToDraft(document, original);
  assert.equal(readStepDraft(restored, "stage-01-step-01").fields["problem-0-situation"], undefined);
  assert.equal(readStepDraft(restored, "stage-01-step-01").fields["legacy-free-note"], "Preserve this exact legacy note.");
});

test("checksum validation rejects payload tampering and duplicate stable IDs", async () => {
  const document = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: legacyDraft(), now: NOW });
  const tampered = structuredClone(document);
  tampered.decision.mainQuestion = "A silently changed question";
  assert.equal(await normalizeResearchPathwayDocument(tampered, PROJECT_ID), null);

  const duplicate = structuredClone(document);
  duplicate.questionCandidates.push({ ...duplicate.questionCandidates[0] });
  assert.equal(await normalizeResearchPathwayDocument(duplicate, PROJECT_ID), null);
});

test("rebasing a chosen device version advances revision while content comparison ignores revision metadata", async () => {
  const cloud = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: legacyDraft("Cloud question"), now: NOW });
  const device = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: legacyDraft("Device question"), now: "2026-08-03T13:00:00.000Z" });
  const rebased = await rebaseResearchPathwayDocument(device, cloud, "2026-08-03T14:00:00.000Z");
  assert.equal(rebased.revision, cloud.revision + 1);
  assert.equal(rebased.decision.mainQuestion, "Device question");
  assert.equal(researchPathwayDocumentsHaveSameContent(rebased, device), true);
  assert.equal(await verifyResearchPathwayDocument(rebased), true);
});

test("canonical cache round-trips only checksum-valid documents and rejects a modified cache payload", async () => {
  const storage = new MemoryStorage();
  const document = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: legacyDraft(), now: NOW });
  writeResearchPathwayCache(storage, { document, lastSyncedChecksum: document.identity.checksum, dirty: false, cachedAt: NOW });
  assert.equal((await readResearchPathwayCache(storage, PROJECT_ID))?.document.identity.checksum, document.identity.checksum);

  const key = `cerise-canonical-pathway:${PROJECT_ID}:v1`;
  const modified = JSON.parse(storage.getItem(key) ?? "{}") as { document: { decision: { mainQuestion: string } } };
  modified.document.decision.mainQuestion = "Modified outside the checksum";
  storage.setItem(key, JSON.stringify(modified));
  assert.equal(await readResearchPathwayCache(storage, PROJECT_ID), null);
});

test("reconciliation distinguishes current, unsynced, and genuinely conflicting device work", async () => {
  const cloud = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: legacyDraft("Cloud question"), now: NOW });
  const same = await rebaseResearchPathwayDocument(cloud, cloud, "2026-08-03T13:00:00.000Z");
  const device = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: legacyDraft("Device question"), now: "2026-08-03T13:00:00.000Z" });
  const cacheBase = {
    version: 1 as const,
    projectId: PROJECT_ID,
    lastSyncedChecksum: cloud.identity.checksum,
    dirty: true,
    cachedAt: NOW,
  };

  assert.equal(reconcileResearchPathwaySources({ cloud, cache: { ...cacheBase, document: same, dirty: false }, migratedDevice: same }).kind, "cloud-current");
  assert.equal(reconcileResearchPathwaySources({ cloud, cache: { ...cacheBase, document: device }, migratedDevice: device }).kind, "device-unsynced");
  assert.equal(reconcileResearchPathwaySources({ cloud, cache: { ...cacheBase, document: device, lastSyncedChecksum: null }, migratedDevice: device }).kind, "review-required");
  assert.equal(reconcileResearchPathwaySources({ cloud: null, cache: null, migratedDevice: device }).kind, "device-current");
});

test("a compatibility workspace edit is not hidden behind an older canonical device cache", async () => {
  const cached = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: legacyDraft("Cached question"), now: NOW });
  const refreshed = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: legacyDraft("New workspace question"), previous: cached, now: "2026-08-03T13:00:00.000Z" });
  const result = reconcileResearchPathwaySources({
    cloud: cached,
    cache: { version: 1, projectId: PROJECT_ID, document: cached, lastSyncedChecksum: cached.identity.checksum, dirty: false, cachedAt: NOW },
    migratedDevice: refreshed,
  });
  assert.equal(result.kind, "device-unsynced");
  assert.equal(result.selected?.decision.mainQuestion, "New workspace question");
});

test("Build 1 migration is additive, append-only, owner-isolated, and excludes participant data", async () => {
  const sql = await readFile(new URL("../../../supabase/migrations/20260803185913_build1_phase1_research_pathway.sql", import.meta.url), "utf8");
  for (const table of ["research_pathway_documents", "research_pathway_revisions"]) {
    assert.match(sql, new RegExp(`CREATE TABLE public\\.${table}`));
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
    assert.match(sql, new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM anon`));
  }
  assert.match(sql, /projects\.user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(sql, /AFTER INSERT OR UPDATE ON public\.research_pathway_documents/);
  assert.match(sql, /participantDataIncluded/);
  assert.match(sql, /'pathway', 'consent'/);
  assert.doesNotMatch(sql, /DROP TABLE public\.projects|DROP COLUMN research_(question|approach|hypothesis)|DELETE FROM public\.projects/);
  assert.doesNotMatch(sql, /GRANT (UPDATE|DELETE).*research_pathway_revisions/);
});

test("the unified review ledger accepts checksum-bound pathway decisions without storing prompts or chat", async () => {
  const document = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: legacyDraft(), now: NOW });
  const decision = await createResearchDecisionRecord({
    id: "pathway-choice-1",
    projectId: PROJECT_ID,
    domain: "pathway",
    suggestionId: "frame-suggestion-1",
    suggestionKind: "problem-frame",
    suggestionSummary: "Narrow the problem to first-year researchers.",
    action: "applied-after-edit",
    decisionReason: "The researcher chose the population and edited the wording.",
    decidedAt: NOW,
    baseArtifact: {
      artifactKind: document.identity.artifactKind,
      artifactId: document.identity.artifactId,
      schemaVersion: document.identity.artifactSchemaVersion,
      checksum: document.identity.checksum,
    },
    suggestionChecksum: document.identity.checksum,
    resultingArtifact: null,
    servedModel: "verification-model",
  });
  assert.equal(await verifyResearchDecisionRecord(decision), true);
  assert.equal(decision.promptStored, false);
  assert.equal(decision.chatTranscriptStored, false);
});
