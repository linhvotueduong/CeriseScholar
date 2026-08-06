import assert from "node:assert/strict";
import test from "node:test";
import {
  exportResearchJourneyArchive,
  legacyJourneyMentorHref,
  legacyResearchJourneyAdapter,
  migrateLegacyResearchJourneyConversations,
  readResearchJourneyArchive,
  researchJourneyArchiveStorageKey,
  verifyResearchJourneyArchive,
  writeResearchJourneyArchive,
} from "./researchJourneyMigration";
import { createResearchPathwayDocument } from "./researchPathwayDocument";
import { assessResearchPathwayReadiness } from "./researchPathwayBrief";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const conversations = [
  {
    id: "answer-1",
    title: "Evidence question",
    messages: [
      { role: "user", content: "What does the evidence say?" },
      { role: "assistant", content: "Evidence synthesis", mode: "research_answer" },
    ],
  },
  {
    id: "journey-1",
    title: "Narrow a question",
    messages: [
      { role: "user", content: "Help me narrow my question: broad topic" },
      { role: "assistant", content: "## Possible Research Pathways\nExact historical answer.", mode: "research_journey" },
    ],
  },
];

test("Journey migration separates legacy mentoring from active ScholarAsk evidence conversations", async () => {
  const result = await migrateLegacyResearchJourneyConversations({
    projectId: "project-1",
    conversations,
    now: "2026-08-04T12:00:00.000Z",
  });
  assert.deepEqual(result.activeConversations.map((item) => item.id), ["answer-1"]);
  assert.deepEqual(result.migratedConversationIds, ["journey-1"]);
  assert.equal(result.archive?.conversations[0].messages[1].content, "## Possible Research Pathways\nExact historical answer.");
  assert.equal(result.archive?.conversations[0].suggestedMentorMode, "narrow");
  assert.equal(result.archive?.readOnly, true);
  assert.equal(result.archive?.participantDataIncluded, false);
  assert.equal(await verifyResearchJourneyArchive(result.archive!), true);
});

test("Journey archive persistence is checksum verified and migration is idempotent", async () => {
  const storage = new MemoryStorage();
  const first = await migrateLegacyResearchJourneyConversations({ projectId: "project-1", conversations, now: "2026-08-04T12:00:00.000Z" });
  writeResearchJourneyArchive(storage, first.archive!);
  const loaded = await readResearchJourneyArchive(storage, "project-1");
  assert.equal(loaded?.checksum, first.archive?.checksum);
  const second = await migrateLegacyResearchJourneyConversations({ projectId: "project-1", conversations, existingArchive: loaded, now: "2026-08-04T12:01:00.000Z" });
  assert.equal(second.archive?.conversations.length, 1);
  assert.match(researchJourneyArchiveStorageKey("project-1"), /project-1$/);
  assert.match(exportResearchJourneyArchive(second.archive!), /Exact historical answer/);

  const parsed = JSON.parse(storage.getItem(researchJourneyArchiveStorageKey("project-1"))!);
  parsed.conversations[0].title = "Tampered";
  storage.setItem(researchJourneyArchiveStorageKey("project-1"), JSON.stringify(parsed));
  assert.equal(await readResearchJourneyArchive(storage, "project-1"), null);
});

test("legacy links and API requests resolve to registered Mentor modes without invoking Journey generation", () => {
  assert.equal(legacyJourneyMentorHref("project-1", "find-bridge"), "/dashboard/project/project-1?mentor=journey&mentorMode=find-bridge");
  assert.deepEqual(legacyResearchJourneyAdapter({ answerMode: "research_journey", journeyIntent: "map_evidence", projectId: "project-1" }), {
    legacy: true,
    mentorMode: "map-evidence",
    destination: "/dashboard/project/project-1?mentor=journey&mentorMode=map-evidence",
  });
  assert.deepEqual(legacyResearchJourneyAdapter({ answerMode: "research_answer", journeyIntent: "find_bridge", projectId: "project-1" }), { legacy: false });
});

test("historical Journey activity cannot satisfy canonical Stage 1 readiness", async () => {
  const migration = await migrateLegacyResearchJourneyConversations({ projectId: "project-1", conversations, now: "2026-08-04T12:00:00.000Z" });
  assert.equal(migration.archive?.conversations.length, 1);
  const emptyPathway = await createResearchPathwayDocument({ projectId: "project-1", now: "2026-08-04T12:00:00.000Z" });
  assert.equal(assessResearchPathwayReadiness(emptyPathway).readyForStage2, false);
});
