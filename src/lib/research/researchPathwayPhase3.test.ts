import assert from "node:assert/strict";
import test from "node:test";
import {
  createResearchPathwayDocument,
  researchPathwayDocumentToDraft,
  verifyResearchPathwayDocument,
} from "./researchPathwayDocument";
import { assessResearchPathwayReadiness } from "./researchPathwayBrief";
import { selectedResearchQuestionsFromDraft } from "./researchPathwayPhase2Model";
import {
  PHASE3_MAXIMUM_ROWS,
  addResearchPathwayRow,
  archiveResearchPathwayRow,
  moveResearchPathwayRow,
  removeEmptyResearchPathwayRow,
  researchPathwayArchiveProtectionReason,
  researchPathwayRowRoster,
  restoreResearchPathwayRow,
} from "./researchPathwayPhase3Rows";
import type { ResearchPathDraft } from "./researchPathDraft";

const NOW = "2026-08-04T03:00:00.000Z";

test("dynamic rosters begin with the Phase 2 canvases and stay bounded", () => {
  assert.deepEqual(researchPathwayRowRoster({}, "ideas").active, ["0", "1", "2", "3"]);
  assert.deepEqual(researchPathwayRowRoster({}, "questions").active, ["0", "1", "2", "3", "4", "5"]);
  let fields: Record<string, string> = {};
  for (let index = 0; index < PHASE3_MAXIMUM_ROWS + 10; index += 1) fields = addResearchPathwayRow(fields, "ideas").fields;
  const roster = researchPathwayRowRoster(fields, "ideas");
  assert.equal(roster.active.length, PHASE3_MAXIMUM_ROWS);
  assert.equal(addResearchPathwayRow(fields, "ideas").slot, null);
});

test("row order changes without renumbering stable item identities", () => {
  let fields: Record<string, string> = { "frame-0-id": "stable-frame-a", "frame-1-id": "stable-frame-b" };
  fields = moveResearchPathwayRow(fields, "problems", "1", -1);
  assert.deepEqual(researchPathwayRowRoster(fields, "problems").active.slice(0, 2), ["1", "0"]);
  assert.equal(fields["frame-0-id"], "stable-frame-a");
  assert.equal(fields["frame-1-id"], "stable-frame-b");
});

test("populated rows archive and restore while selected rows fail closed", () => {
  let fields: Record<string, string> = { "question-0-text": "A selected question", "question-0-status": "selected", "question-1-text": "A promising alternative", "question-1-status": "promising" };
  assert.deepEqual(archiveResearchPathwayRow(fields, "questions", "0"), fields);
  fields = archiveResearchPathwayRow(fields, "questions", "1");
  assert.ok(researchPathwayRowRoster(fields, "questions").archived.includes("1"));
  assert.equal(fields["question-1-text"], "A promising alternative");
  assert.equal(fields["question-1-status"], "parked");
  fields = restoreResearchPathwayRow(fields, "questions", "1");
  assert.ok(researchPathwayRowRoster(fields, "questions").active.includes("1"));
  assert.equal(fields["question-1-text"], "A promising alternative");
  assert.equal(fields["question-1-status"], "exploring");
});

test("only genuinely empty rows can be physically removed", () => {
  const populated = { "idea-0-text": "Keep me", "idea-1-text": "" };
  assert.deepEqual(removeEmptyResearchPathwayRow(populated, "ideas", "0"), populated);
  const removed = removeEmptyResearchPathwayRow(populated, "ideas", "1");
  assert.ok(!researchPathwayRowRoster(removed, "ideas").active.includes("1"));
  assert.equal(removed["idea-0-text"], "Keep me");
});

test("selected and dependency-linked rows explain why archive is blocked", () => {
  const draft: ResearchPathDraft = { steps: {
    "stage-01-shape-problems": { completed: false, checks: {}, fields: { "frame-0-id": "frame-a", "frame-0-title": "Linked frame", "frame-0-status": "promising" } },
    "stage-01-explore-baseline": { completed: false, checks: {}, fields: { "baseline-0-id": "baseline-a", "baseline-0-known": "Known", "baseline-0-linked-frames": "frame-a", "baseline-0-status": "promising" } },
    "stage-01-develop-questions": { completed: false, checks: {}, fields: { "question-0-text": "Selected", "question-0-status": "selected", "question-0-linked-baseline": "baseline-a" } },
  } };
  assert.match(researchPathwayArchiveProtectionReason("problems", "0", draft) ?? "", /links/);
  assert.match(researchPathwayArchiveProtectionReason("baseline", "0", draft) ?? "", /question/);
  assert.match(researchPathwayArchiveProtectionReason("questions", "0", draft) ?? "", /selected status/);
});

test("more than six questions compile, round-trip, and hand off in exact active order", async () => {
  let questionFields: Record<string, string> = {};
  for (let index = 0; index < 3; index += 1) questionFields = addResearchPathwayRow(questionFields, "questions").fields;
  const slots = researchPathwayRowRoster(questionFields, "questions").active;
  slots.forEach((slot, index) => {
    questionFields[`question-${slot}-text`] = `Dynamic question ${index + 1}`;
    questionFields[`question-${slot}-status`] = "selected";
  });
  questionFields = moveResearchPathwayRow(questionFields, "questions", slots.at(-1)!, -1);
  const expected = researchPathwayRowRoster(questionFields, "questions").active.map((slot) => questionFields[`question-${slot}-text`]);
  const draft: ResearchPathDraft = { steps: {
    "stage-01-capture-concern": { completed: false, checks: {}, fields: {} },
    "stage-01-shape-problems": { completed: false, checks: {}, fields: {} },
    "stage-01-explore-baseline": { completed: false, checks: {}, fields: {} },
    "stage-01-develop-questions": { completed: false, checks: {}, fields: questionFields },
    "stage-01-choose-pathway": { completed: false, checks: {}, fields: {} },
  } };
  assert.deepEqual(selectedResearchQuestionsFromDraft(draft), expected);
  const document = await createResearchPathwayDocument({ projectId: "phase3-dynamic-questions", draft, now: NOW });
  assert.equal(document.questionCandidates.length, expected.length);
  assert.ok(await verifyResearchPathwayDocument(document));
  const restored = researchPathwayDocumentToDraft(document);
  assert.deepEqual(selectedResearchQuestionsFromDraft(restored), expected);
});

test("archived populated rows remain checksum-bound across canonical projection", async () => {
  let fields: Record<string, string> = {
    "frame-0-id": "kept-frame",
    "frame-0-title": "A frame worth keeping",
    "frame-0-situation": "A documented situation",
    "frame-0-status": "promising",
  };
  fields = addResearchPathwayRow(fields, "problems").fields;
  fields = archiveResearchPathwayRow(fields, "problems", "0");
  const draft: ResearchPathDraft = { steps: { "stage-01-shape-problems": { completed: false, checks: {}, fields } } };
  const document = await createResearchPathwayDocument({ projectId: "phase3-archive-roundtrip", draft, now: NOW });
  const archived = document.problemFrames.find((item) => item.id === "kept-frame");
  assert.equal(archived?.status, "parked");
  const restored = researchPathwayDocumentToDraft(document);
  const restoredFields = restored.steps["stage-01-shape-problems"].fields;
  const restoredRoster = researchPathwayRowRoster(restoredFields, "problems");
  assert.equal(restoredRoster.archived.length, 1);
  assert.equal(restoredFields[`frame-${restoredRoster.archived[0]}-title`], "A frame worth keeping");
});

test("archived ideas and baseline entries cannot satisfy active readiness", async () => {
  let ideaFields: Record<string, string> = { "idea-0-text": "Archived concern", "idea-0-affected": "A context", "idea-0-status": "promising" };
  ideaFields = archiveResearchPathwayRow(ideaFields, "ideas", "0");
  let baselineFields: Record<string, string> = { "baseline-0-known": "Known", "baseline-0-missing": "Missing", "baseline-0-status": "promising" };
  baselineFields = archiveResearchPathwayRow(baselineFields, "baseline", "0");
  const document = await createResearchPathwayDocument({
    projectId: "phase3-archived-readiness",
    now: NOW,
    draft: { steps: {
      "stage-01-capture-concern": { completed: false, checks: {}, fields: ideaFields },
      "stage-01-explore-baseline": { completed: false, checks: {}, fields: baselineFields },
    } },
  });
  const readiness = assessResearchPathwayReadiness(document);
  assert.equal(readiness.steps[0].completed, 0);
  assert.equal(readiness.steps[2].completed, 0);
});

test("malformed roster metadata is normalized to a safe active canvas", () => {
  const fields = {
    "__phase3-ideas-active": "not-json",
    "__phase3-ideas-archived": JSON.stringify(["../escape", "p3-1", "p3-1"]),
  };
  const roster = researchPathwayRowRoster(fields, "ideas");
  assert.deepEqual(roster.active, ["0"]);
  assert.deepEqual(roster.archived, ["p3-1"]);
});
