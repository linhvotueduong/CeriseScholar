import assert from "node:assert/strict";
import test from "node:test";
import { createCompletedExperimentReleaseReview, createExperimentRelease } from "./experimentRelease";
import { buildExperimentHostBundle } from "./experimentHostBundle";
import { createExperimentStudioDocument } from "./experimentStudio";
import {
  createAnalysisPlanDocument,
  normalizeAnalysisPlanDocument,
  type AnalysisPlanDocument,
} from "./analysisPlan";
import { createStudyDesignDocument } from "./studyDesign";
import { EMPTY_RESEARCH_PATH_DRAFT } from "./researchPathDraft";
import {
  auditDataIntakeBundle,
  dataIntakeAuditStorageKey,
  isDataIntakeAuditReady,
  markDataIntakeAuditReviewed,
  readDataIntakeAuditReceipt,
  writeDataIntakeAuditReceipt,
} from "./dataIntakeAudit";
import { sha256Checksum, type ExperimentRelease } from "./experimentRelease";

async function fixture(): Promise<{
  release: ExperimentRelease;
  codebook: unknown;
  plan: AnalysisPlanDocument;
}> {
  const studio = createExperimentStudioDocument("project-intake-audit");
  const design = createStudyDesignDocument("project-intake-audit", EMPTY_RESEARCH_PATH_DRAFT);
  design.spec.researchQuestions[0] = {
    ...design.spec.researchQuestions[0],
    id: "rq-primary",
    question: "Does the intervention change the primary response?",
    hypothesis: "The intervention changes the primary response.",
    construct: "Primary response",
    constructRole: "outcome",
    operationalDefinition: "Response captured in the experimental studio",
    measure: studio.blocks[3].variableName,
    expectedDirection: "Higher",
  };
  design.spec.participants.targetPopulation = "Eligible adults";
  const release = await createExperimentRelease({
    releaseId: "release-intake-audit",
    releaseNumber: 2,
    createdAt: "2026-07-28T20:00:00.000Z",
    releaseNotes: "Phase 8.2 intake fixture",
    studio,
    studyDesign: design,
    review: createCompletedExperimentReleaseReview(),
  });
  const host = await buildExperimentHostBundle(release, {
    createdAt: "2026-07-28T20:30:00.000Z",
    executionMode: "production",
  });
  const plan = createAnalysisPlanDocument(release, "2026-07-28T21:00:00.000Z");
  assert.ok(plan);
  plan.dataAccessDeclaration = "not-accessed";
  for (const question of plan.researchQuestions) {
    question.designation = "primary";
    question.estimand.population = "Eligible adults";
    question.estimand.outcome = "Primary response";
    question.outcomeVariables = [plan.variables[0].name];
    question.unitOfAnalysis = "participant";
    question.plannedMethod = "Linear model";
    question.missingDataStrategy = "Report missingness and use complete cases.";
    question.multiplicityStrategy = "One primary question; no adjustment.";
  }
  for (const variable of plan.variables) {
    variable.roles = variable.name === plan.variables[0].name
      ? ["outcome"]
      : ["administrative"];
  }
  const normalized = normalizeAnalysisPlanDocument(plan, release);
  assert.ok(normalized);
  assert.equal(normalized.readiness.status, "ready");
  return { release, codebook: host.bundle.codebook, plan: normalized };
}

function session(
  release: ExperimentRelease,
  mode: "production" | "pilot",
  id: string,
  responseNames: string[],
) {
  return {
    checkpointVersion: 4,
    checkpointSequence: 2,
    idempotencyKey: `${id}:2`,
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    sessionId: id,
    status: "completed",
    currentIndex: 4,
    condition: release.studio.conditions[0],
    responses: Object.fromEntries(responseNames.map((name) => [name, "6"])),
    audioResponses: {},
    videoResponses: {},
    timings: [],
    events: [],
    history: [],
    trials: [],
    trialOrder: [],
    startedAt: "2026-07-28T21:10:00.000Z",
    updatedAt: "2026-07-28T21:12:00.000Z",
    executionMode: mode,
  };
}

async function sourceFiles() {
  const roles = [
    ["release", "release.json"],
    ["codebook", "codebook.json"],
    ["analysis-contract", "analysis-contract.json"],
    ["production", "production/responses.json"],
    ["pilot", "pilot/responses.json"],
  ] as const;
  return Promise.all(roles.map(async ([role, name]) => ({
    role,
    name,
    byteSize: 200,
    checksum: await sha256Checksum({ role, name }),
  })));
}

test("audits a release-bound production and pilot export without retaining participant values", async () => {
  const { release, codebook, plan } = await fixture();
  const responseNames = plan.variables.map((variable) => variable.name);
  const receipt = await auditDataIntakeBundle({
    release,
    codebook,
    analysisContract: release.manifest.analysisContract,
    production: {
      releaseId: release.releaseId,
      releaseChecksum: release.checksum,
      executionMode: "production",
      exportedAt: "2026-07-28T22:00:00.000Z",
      sessions: [session(release, "production", "session-production", responseNames)],
    },
    pilot: {
      releaseId: release.releaseId,
      releaseChecksum: release.checksum,
      executionMode: "pilot",
      exportedAt: "2026-07-28T22:00:00.000Z",
      sessions: [session(release, "pilot", "session-pilot", responseNames)],
    },
    sourceFiles: await sourceFiles(),
  }, release, plan, "2026-07-28T22:10:00.000Z");

  assert.equal(receipt.status, "pass", JSON.stringify(receipt.issues));
  assert.equal(receipt.modes.production.completed, 1);
  assert.equal(receipt.modes.pilot.completed, 1);
  assert.equal(receipt.cohortSeparation.crossModeDuplicateSessions, 0);
  assert.equal(receipt.quality.primaryOutcomeMissingRate, 0);
  assert.equal(receipt.rawDataRetention, "discarded-after-local-aggregation");
  assert.doesNotMatch(JSON.stringify(receipt), /session-production|session-pilot|"6"/);
});

test("blocks identity drift and cross-mode duplicate sessions", async () => {
  const { release, codebook, plan } = await fixture();
  const responseNames = plan.variables.map((variable) => variable.name);
  const duplicate = session(release, "production", "session-duplicate", responseNames);
  const pilotDuplicate = {
    ...duplicate,
    executionMode: "pilot",
  };
  const receipt = await auditDataIntakeBundle({
    release,
    codebook,
    analysisContract: { ...release.manifest.analysisContract, dataAccessDeclaration: "changed" },
    production: {
      releaseId: release.releaseId,
      releaseChecksum: release.checksum,
      executionMode: "production",
      exportedAt: "2026-07-28T22:00:00.000Z",
      sessions: [duplicate],
    },
    pilot: {
      releaseId: release.releaseId,
      releaseChecksum: release.checksum,
      executionMode: "pilot",
      exportedAt: "2026-07-28T22:00:00.000Z",
      sessions: [pilotDuplicate],
    },
    sourceFiles: await sourceFiles(),
  }, release, plan);

  assert.equal(receipt.status, "blocked");
  assert.equal(receipt.identity.contractMatched, false);
  assert.equal(receipt.cohortSeparation.crossModeDuplicateSessions, 1);
  assert.throws(() => markDataIntakeAuditReviewed(receipt, release));
});

test("surfaces schema and missingness findings for explicit review", async () => {
  const { release, codebook, plan } = await fixture();
  const productionSession = session(
    release,
    "production",
    "session-review",
    plan.variables.map((variable) => variable.name),
  );
  productionSession.responses = { unexpected_field: "value" };
  const receipt = await auditDataIntakeBundle({
    release,
    codebook,
    analysisContract: release.manifest.analysisContract,
    production: {
      releaseId: release.releaseId,
      releaseChecksum: release.checksum,
      executionMode: "production",
      exportedAt: "2026-07-28T22:00:00.000Z",
      sessions: [productionSession],
    },
    pilot: {
      releaseId: release.releaseId,
      releaseChecksum: release.checksum,
      executionMode: "pilot",
      exportedAt: "2026-07-28T22:00:00.000Z",
      sessions: [],
    },
    sourceFiles: await sourceFiles(),
  }, release, plan);

  assert.equal(receipt.status, "review");
  assert.deepEqual(receipt.schema.unexpectedVariables, ["unexpected_field"]);
  assert.equal(receipt.quality.primaryOutcomeMissingRate, 1);
  const reviewed = markDataIntakeAuditReviewed(
    receipt,
    release,
    "2026-07-28T22:20:00.000Z",
  );
  assert.equal(isDataIntakeAuditReady(reviewed), true);
});

test("persists only a bounded aggregate receipt and rejects malformed storage", async () => {
  const { release, codebook, plan } = await fixture();
  const responseNames = plan.variables.map((variable) => variable.name);
  const receipt = await auditDataIntakeBundle({
    release,
    codebook,
    analysisContract: release.manifest.analysisContract,
    production: {
      releaseId: release.releaseId,
      releaseChecksum: release.checksum,
      executionMode: "production",
      exportedAt: "2026-07-28T22:00:00.000Z",
      sessions: [session(release, "production", "session-storage", responseNames)],
    },
    pilot: {
      releaseId: release.releaseId,
      releaseChecksum: release.checksum,
      executionMode: "pilot",
      exportedAt: "2026-07-28T22:00:00.000Z",
      sessions: [],
    },
    sourceFiles: await sourceFiles(),
  }, release, plan);
  const reviewed = markDataIntakeAuditReviewed(receipt, release);
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };

  writeDataIntakeAuditReceipt(storage, release, reviewed);
  assert.deepEqual(readDataIntakeAuditReceipt(storage, release), reviewed);
  const stored = values.get(dataIntakeAuditStorageKey(release.projectId, release.releaseId));
  assert.ok(stored);
  assert.doesNotMatch(stored, /session-storage/);
  values.set(dataIntakeAuditStorageKey(release.projectId, release.releaseId), "{bad-json");
  assert.equal(readDataIntakeAuditReceipt(storage, release), null);
});
