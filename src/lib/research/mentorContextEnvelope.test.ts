import assert from "node:assert/strict";
import test from "node:test";
import { sha256ArtifactChecksum } from "./artifactIdentity";
import { createResearchKnowledgeEntry } from "./livingResearchRecord";
import {
  appendLocalMentorInsight,
  createMentorContextEnvelope,
  createMentorProjectMemory,
  loadLocalMentorInsights,
  loadMentorProjectMemory,
  mentorContextIsCurrent,
  normalizeAndVerifyMentorContextEnvelope,
  removeMentorProjectMemoryItem,
  saveMentorProjectMemory,
  upsertMentorProjectMemoryItem,
} from "./mentorContextEnvelope";

const NOW = "2026-08-04T12:00:00.000Z";

function storage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

async function evidence(projectId: string, id = "evidence-one") {
  return createResearchKnowledgeEntry({
    id,
    projectId,
    stage: 2,
    stepId: "stage-02-step-01",
    kind: "evidence",
    title: "Reviewed source",
    body: "The researcher approved this bounded evidence summary.",
    timing: "actual",
    author: "researcher",
    createdAt: NOW,
  });
}

async function envelope(projectId = "project-a") {
  let memory = await createMentorProjectMemory({ projectId, updatedAt: NOW });
  memory = await upsertMentorProjectMemoryItem(memory, { id: "preference-one", kind: "preference", text: "Keep suggestions concise and show tradeoffs.", now: NOW });
  memory = await upsertMentorProjectMemoryItem(memory, { id: "question-one", kind: "open-question", text: "Which measure best matches the construct?", now: NOW });
  const checksum = await sha256ArtifactChecksum({ study: "one" });
  return createMentorContextEnvelope({
    projectId,
    location: { stage: 3, stageId: "stage-03", stageTitle: "Design and Build the Study", stepId: "stage-03-step-04", stepTitle: "Build the Experiment or Survey" },
    memory,
    selectedText: "Compare this selected statement without changing it.",
    foundation: {
      routeProfile: { projectId, intent: "primary-data", methodFamily: "quantitative", setting: "laboratory", assignment: "randomized", audience: "adult", dataSensitivity: "deidentified", specialProcedures: [], confirmation: "researcher-confirmed" },
      artifactIndex: [{ project_id: projectId, artifact_kind: "experiment-studio", artifact_id: "study-one", checksum, lifecycle_status: "current", source_references: [] }],
      knowledgeEntries: [await evidence(projectId)],
      manuscript: null,
      decisionEvents: [],
      assets: [],
      templatePins: [],
    },
    generatedAt: NOW,
  });
}

test("cross-stage envelope is bounded, checksum-bound, and contains explicit privacy exclusions", async () => {
  const built = await envelope();
  assert.equal(built.location.stage, 3);
  assert.equal(built.capability.allowsCanvasAlternatives, false);
  assert.equal(built.approvedEvidence.length, 1);
  assert.equal(built.preferences.length, 1);
  assert.equal(built.unresolvedUncertainties.length, 1);
  assert.equal(built.participantDataIncluded, false);
  assert.equal(built.signaturesIncluded, false);
  assert.equal(built.recordingsIncluded, false);
  assert.equal(built.rawDatasetRowsIncluded, false);
  assert.equal(built.chatTranscriptStored, false);
  assert.ok(await normalizeAndVerifyMentorContextEnvelope(built));
  assert.equal(await normalizeAndVerifyMentorContextEnvelope({ ...built, projectId: "project-b" }), null);
});

test("foundation inputs cannot cross projects and unverified evidence is excluded", async () => {
  const memory = await createMentorProjectMemory({ projectId: "project-a", updatedAt: NOW });
  const checksum = await sha256ArtifactChecksum({ artifact: true });
  const built = await createMentorContextEnvelope({
    projectId: "project-a",
    location: { stage: 2, stageId: "stage-02", stageTitle: "Research Proposal", stepId: "stage-02-step-01", stepTitle: "Literature Review" },
    memory,
    foundation: {
      routeProfile: { projectId: "project-b", methodFamily: "qualitative" },
      artifactIndex: [{ project_id: "project-b", artifact_kind: "research-proposal", artifact_id: "foreign", checksum, lifecycle_status: "current", source_references: [] }],
      knowledgeEntries: [await evidence("project-b", "foreign-evidence"), { ...(await evidence("project-a", "tampered")), body: "Changed after checksum" }],
      manuscript: { participantRows: [{ name: "Excluded Person" }] },
      decisionEvents: [],
      assets: [{ rawRecording: "excluded" }],
      templatePins: [],
    },
    generatedAt: NOW,
  });
  assert.equal(built.route.source, "unavailable");
  assert.equal(built.artifacts.length, 0);
  assert.equal(built.approvedEvidence.length, 0);
  assert.doesNotMatch(JSON.stringify(built), /Excluded Person|rawRecording|participantRows/);
});

test("semantic context changes make an in-flight response stale while refresh time alone does not", async () => {
  const first = await envelope();
  const later = await createMentorContextEnvelope({
    projectId: first.projectId,
    location: first.location,
    memory: await createMentorProjectMemory({ projectId: first.projectId, items: [...first.preferences, ...first.unresolvedUncertainties], revision: first.memoryRevision, updatedAt: NOW }),
    selectedText: first.selectedText,
    pathwayRoute: first.route,
    activeContextItems: first.activeContextItems,
    workStateNotes: first.workStateNotes,
    generatedAt: "2026-08-04T12:05:00.000Z",
  });
  assert.notEqual(first.contentChecksum, later.contentChecksum, "foundation availability is a meaningful context change");
  assert.equal(mentorContextIsCurrent(first.contentChecksum, first), true);
  assert.equal(mentorContextIsCurrent(first.contentChecksum, later), false);

  const same = { ...first, generatedAt: "2026-08-04T12:10:00.000Z" };
  assert.equal(first.contentChecksum, same.contentChecksum);
});

test("project memory is explicit, correctable, removable, checksum-verified, and project-scoped", async () => {
  const device = storage();
  let memory = await createMentorProjectMemory({ projectId: "project-a", updatedAt: NOW });
  memory = await upsertMentorProjectMemoryItem(memory, { id: "preference", kind: "preference", text: "Use tables for comparisons.", now: NOW });
  saveMentorProjectMemory(device, memory);
  const loaded = await loadMentorProjectMemory(device, "project-a");
  assert.equal(loaded.items[0].text, "Use tables for comparisons.");
  const corrected = await upsertMentorProjectMemoryItem(loaded, { id: "preference", kind: "preference", text: "Use prose unless a table adds clarity.", now: "2026-08-04T12:01:00.000Z" });
  assert.equal(corrected.items[0].text, "Use prose unless a table adds clarity.");
  const removed = await removeMentorProjectMemoryItem(corrected, "preference", "2026-08-04T12:02:00.000Z");
  assert.equal(removed.items.length, 0);
  assert.equal((await loadMentorProjectMemory(device, "project-b")).items.length, 0);
  device.setItem("cerise:research-mentor-memory:v1:project-a", JSON.stringify({ ...memory, revision: 99 }));
  assert.equal((await loadMentorProjectMemory(device, "project-a")).items.length, 0);
});

test("reviewed insights are stored without chat transcripts and never cross project keys", async () => {
  const device = storage();
  const entry = await evidence("project-a", "saved-insight");
  appendLocalMentorInsight(device, "project-a", entry);
  assert.equal(loadLocalMentorInsights(device, "project-a").length, 1);
  assert.equal(loadLocalMentorInsights(device, "project-b").length, 0);
  assert.throws(() => appendLocalMentorInsight(device, "project-b", entry), /cross projects/);
  assert.doesNotMatch(JSON.stringify(loadLocalMentorInsights(device, "project-a")), /chatTranscript|prompt/);
});

test("selected text and memory redact direct identifiers before entering context", async () => {
  let memory = await createMentorProjectMemory({ projectId: "privacy-project", updatedAt: NOW });
  memory = await upsertMentorProjectMemoryItem(memory, { id: "question", kind: "open-question", text: "Should I contact Dr. Jane Researcher at jane@example.org?", now: NOW });
  const built = await createMentorContextEnvelope({
    projectId: "privacy-project",
    location: { stage: 1, stageId: "stage-01", stageTitle: "Pathway", stepId: "stage-01-capture-concern", stepTitle: "Capture the Concern" },
    memory,
    selectedText: "Call 212-555-0112 about IRB-2045.",
    generatedAt: NOW,
  });
  assert.doesNotMatch(JSON.stringify(built), /Jane Researcher|jane@example\.org|212-555-0112|IRB-2045/);
  assert.match(JSON.stringify(built), /REDACTED/);
});
