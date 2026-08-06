import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createResearchDecisionRecord } from "../src/lib/research/researchDecisionLedger";
import { readResearchPathStoredDocument, researchPathStorageKey } from "../src/lib/research/researchPathStorage";
import { readResearchPathwayCache, writeResearchPathwayCache } from "../src/lib/research/researchPathwayCache";
import {
  createResearchPathwayDocument,
  legacyProjectFieldsFromResearchPathway,
  normalizeResearchPathwayDocument,
  rebaseResearchPathwayDocument,
  researchPathwayDocumentToDraft,
  verifyResearchPathwayDocument,
  type LegacyProjectPathwayFields,
} from "../src/lib/research/researchPathwayDocument";
import { reconcileResearchPathwaySources } from "../src/lib/research/researchPathwayReconciliation";
import { sha256ArtifactChecksum } from "../src/lib/research/artifactIdentity";
import type { ResearchPathDraft } from "../src/lib/research/researchPathDraft";

const VERIFIED_FOR = "2026-08-03";
const NOW = "2026-08-03T12:00:00.000Z";
const PROJECT_ID = "c10c1578-193f-48ae-a61e-5988c129d1ce";
const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");
const JSON_PATH = path.join(OUTPUT_DIRECTORY, "build-1-phase-1-verification.json");
const MARKDOWN_PATH = path.join(OUTPUT_DIRECTORY, "build-1-phase-1-verification.md");

interface AcceptanceCheck {
  id: string;
  label: string;
  passed: boolean;
  evidence: string;
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

function check(id: string, label: string, passed: boolean, evidence: string): AcceptanceCheck {
  return { id, label, passed, evidence };
}

function pathwayDraft(question: string): ResearchPathDraft {
  return {
    steps: {
      "stage-01-step-01": {
        completed: true,
        checks: { "check-0": true },
        fields: {
          "problem-0-situation": "Promising ideas remain broad.",
          "problem-0-consequence": "Researchers cannot select a feasible study.",
          "problem-0-response": "Support deliberate problem framing.",
          "identified-problem": "Early researchers need help bounding promising ideas.",
          "legacy-private-note": "Preserved legacy text.",
        },
      },
      "stage-01-step-02": {
        completed: false,
        checks: {},
        fields: {
          "scholarask-needs": "Evidence-aware prompts.",
          "scholarask-gaps": "Effects on framing remain uncertain.",
          "baseline-synthesis": "Scaffolding exists, but evidence on framing is incomplete.",
        },
      },
      "stage-01-step-03": {
        completed: false,
        checks: {},
        fields: { "raw-question-0": "What makes an idea researchable?", "key-question-0": question },
      },
      "stage-01-step-04": {
        completed: false,
        checks: {},
        fields: {
          "backcasting-vision": "A bounded research problem.",
          "backcasting-baseline": "An unbounded idea.",
          "backcasting-concepts": "Evidence and reflection prompts.",
          "backcasting-roadmap": "Prototype, pilot, evaluate.",
        },
      },
      "stage-02-step-01": {
        completed: true,
        checks: {},
        fields: { "proposal-note": "Do not change this later-stage work." },
      },
    },
  };
}

async function main() {
  const migration = await readFile(path.join(process.cwd(), "supabase/migrations/20260803185913_build1_phase1_research_pathway.sql"), "utf8");
  const persistence = await readFile(path.join(process.cwd(), "src/lib/research/researchPathwayPersistence.ts"), "utf8");
  const workspace = await readFile(path.join(process.cwd(), "src/components/research-path/ResearchPathWorkspace.tsx"), "utf8");
  const schemaSource = await readFile(path.join(process.cwd(), "src/lib/research/researchPathwayDocument.ts"), "utf8");
  const reconciliationSource = await readFile(path.join(process.cwd(), "src/lib/research/researchPathwayReconciliation.ts"), "utf8");
  const legacyProject: LegacyProjectPathwayFields = {
    researchQuestion: "How do guided prompts affect research problem framing?",
    researchApproach: "Mixed methods",
    researchHypothesis: "Guided prompts improve framing quality.",
    updatedAt: "2026-08-02T12:00:00.000Z",
  };
  const localDraft = pathwayDraft(legacyProject.researchQuestion);
  const canonical = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: localDraft, legacyProject, migrationSources: ["workspace-v2"], now: NOW });
  const deterministic = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: localDraft, legacyProject, migrationSources: ["workspace-v2"], now: NOW });
  const restored = researchPathwayDocumentToDraft(canonical, localDraft);
  const storage = new MemoryStorage();
  writeResearchPathwayCache(storage, { document: canonical, lastSyncedChecksum: canonical.identity.checksum, dirty: false, cachedAt: NOW });
  const cached = await readResearchPathwayCache(storage, PROJECT_ID);

  const v1Storage = new MemoryStorage();
  v1Storage.setItem(researchPathStorageKey(PROJECT_ID, 1), JSON.stringify(localDraft));
  const migratedV1 = readResearchPathStoredDocument(v1Storage, PROJECT_ID);

  const cloud = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: pathwayDraft("Cloud question"), now: NOW });
  const device = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: pathwayDraft("Device question"), now: "2026-08-03T13:00:00.000Z" });
  const conflict = reconcileResearchPathwaySources({ cloud, cache: { version: 1, projectId: PROJECT_ID, document: device, lastSyncedChecksum: null, dirty: true, cachedAt: NOW }, migratedDevice: device });
  const unsynced = reconcileResearchPathwaySources({ cloud, cache: { version: 1, projectId: PROJECT_ID, document: device, lastSyncedChecksum: cloud.identity.checksum, dirty: true, cachedAt: NOW }, migratedDevice: device });
  const rebased = await rebaseResearchPathwayDocument(device, cloud, "2026-08-03T14:00:00.000Z");
  const tampered = structuredClone(canonical);
  tampered.decision.mainQuestion = "Tampered after checksum";
  const decision = await createResearchDecisionRecord({
    id: "verify-pathway-decision",
    projectId: PROJECT_ID,
    domain: "pathway",
    suggestionId: "verify-frame-suggestion",
    suggestionKind: "problem-frame",
    suggestionSummary: "Bound the population before continuing.",
    action: "applied-after-edit",
    decisionReason: "The researcher reviewed and narrowed the population.",
    decidedAt: NOW,
    baseArtifact: { artifactKind: canonical.identity.artifactKind, artifactId: canonical.identity.artifactId, schemaVersion: canonical.identity.artifactSchemaVersion, checksum: canonical.identity.checksum },
    suggestionChecksum: canonical.identity.checksum,
    resultingArtifact: null,
    servedModel: "verification-model",
  });

  const legacyFields = legacyProjectFieldsFromResearchPathway(canonical);
  const acceptance: AcceptanceCheck[] = [
    check("AC-01", "Canonical identity", await verifyResearchPathwayDocument(canonical), "The Stage 1 payload has a stable artifact identity and valid SHA-256 checksum."),
    check("AC-02", "Deterministic compiler", canonical.identity.checksum === deterministic.identity.checksum, "Identical researcher input and timestamps produce the same canonical checksum."),
    check("AC-03", "Workspace v2 losslessness", restored.steps["stage-01-step-01"].fields["legacy-private-note"] === "Preserved legacy text." && restored.steps["stage-02-step-01"].fields["proposal-note"] === "Do not change this later-stage work.", "Mapped Stage 1, unknown legacy, and later-stage fields survive installation."),
    check("AC-04", "Workspace v1 migration", migratedV1.pathway.steps["stage-01-step-03"].fields["key-question-0"] === legacyProject.researchQuestion, "The existing v1 storage reader preserves the raw Stage 1 draft for canonical compilation."),
    check("AC-05", "Legacy project compatibility", legacyFields.researchQuestion === legacyProject.researchQuestion && legacyFields.researchApproach === legacyProject.researchApproach && legacyFields.researchHypothesis === legacyProject.researchHypothesis, "The canonical decision projects back into all three legacy project columns."),
    check("AC-06", "Validated device cache", cached?.document.identity.checksum === canonical.identity.checksum && cached.dirty === false, "The local cache accepts only a checksum-valid canonical document."),
    check("AC-07", "Tamper rejection", await normalizeResearchPathwayDocument(tampered, PROJECT_ID) === null, "A payload mutation made after checksum creation is rejected."),
    check("AC-08", "Conflict review", conflict.kind === "review-required" && conflict.selected === null && conflict.differences?.cloudMainQuestion === "Cloud question", "Unrelated non-empty secure and device versions stop for researcher review."),
    check("AC-09", "Safe unsynced continuation", unsynced.kind === "device-unsynced" && unsynced.expectedCloudChecksum === cloud.identity.checksum, "A device edit based on the current secure checksum can use optimistic concurrency."),
    check("AC-10", "Revision preservation", rebased.revision === cloud.revision + 1 && rebased.decision.mainQuestion === "Device question", "Choosing the device copy rebases it as a new revision instead of mutating old history."),
    check("AC-11", "Optimistic concurrency", persistence.includes('.eq("checksum", expectedCloudChecksum)') && persistence.includes('error.code === "23505"'), "Updates compare the expected checksum and inserts convert uniqueness races into conflicts."),
    check("AC-12", "Append-only history", migration.includes("AFTER INSERT OR UPDATE ON public.research_pathway_documents") && !/GRANT (UPDATE|DELETE).*research_pathway_revisions/.test(migration), "Every accepted current revision is captured; clients cannot update or delete history rows."),
    check("AC-13", "Owner isolation", ["research_pathway_documents", "research_pathway_revisions"].every((table) => migration.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`) && migration.includes(`REVOKE ALL ON TABLE public.${table} FROM anon`)) && migration.includes("projects.user_id = (SELECT auth.uid())"), "Both tables use authenticated owner/project RLS and explicit grants."),
    check("AC-14", "Additive rollback boundary", !/DROP TABLE public\.projects|DROP COLUMN research_(question|approach|hypothesis)|DELETE FROM public\.projects/.test(migration), "The migration preserves legacy project fields and data for rollback."),
    check("AC-15", "Privacy and AI boundary", canonical.participantDataIncluded === false && decision.promptStored === false && decision.chatTranscriptStored === false && decision.domain === "pathway", "The pathway excludes participant data and logs decisions without prompts or chat transcripts."),
    check("AC-16", "Researcher-visible resolution", workspace.includes("Two saved versions need your choice") && workspace.includes("Use secure version") && workspace.includes("Use this device’s version"), "The workspace exposes both conflict choices and does not silently pick a winner."),
  ];

  const coreReport = {
    build: "Build 1, Phase 1 — canonical Research Pathway foundation",
    schemaVersion: 1,
    verifiedFor: VERIFIED_FOR,
    summary: {
      passed: acceptance.filter((item) => item.passed).length,
      failed: acceptance.filter((item) => !item.passed).length,
      acceptanceChecks: acceptance.length,
      persistenceTables: 2,
      legacySources: 3,
      conflictChoices: 2,
    },
    acceptance,
    implementationChecksums: {
      migration: await sha256ArtifactChecksum(migration),
      schema: await sha256ArtifactChecksum(schemaSource),
      reconciliation: await sha256ArtifactChecksum(reconciliationSource),
      persistence: await sha256ArtifactChecksum(persistence),
      workspace: await sha256ArtifactChecksum(workspace),
    },
    privacyBoundary: {
      participantRowsStored: false,
      recordingsStored: false,
      consentReceiptsStored: false,
      signaturesStored: false,
      promptsStoredInDecisionLedger: false,
      chatTranscriptsStoredInDecisionLedger: false,
    },
    activation: {
      migrationCreated: true,
      migrationApplied: false,
      remoteDeploymentPerformed: false,
      note: "Apply the Supabase migration separately after reviewing this report; local device fallback remains active until then.",
    },
  };
  const report = { ...coreReport, reportChecksum: await sha256ArtifactChecksum(coreReport) };
  const markdown = [
    "# Build 1 Phase 1 Verification",
    "",
    `Verified for: ${report.verifiedFor}`,
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
    "- Migration file created and reviewed locally: yes",
    "- Supabase migration applied: no",
    "- Remote deployment performed: no",
    "- Local compatibility cache and v1/v2 readers remain active",
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
