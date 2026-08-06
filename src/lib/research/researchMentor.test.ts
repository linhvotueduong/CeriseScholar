import assert from "node:assert/strict";
import test from "node:test";
import { createResearchPathwayDocument } from "./researchPathwayDocument";
import type { ResearchPathDraft } from "./researchPathDraft";
import {
  appendLocalResearchMentorDecision,
  applyResearchMentorCanvasSuggestion,
  createResearchMentorContext,
  deriveResearchMentorObservations,
  normalizeAndVerifyResearchMentorContext,
  normalizeResearchMentorRequest,
  parseResearchMentorResponse,
  redactResearchMentorText,
  researchMentorDecisionStorageKey,
} from "./researchMentor";
import { createMentorContextEnvelope, createMentorProjectMemory } from "./mentorContextEnvelope";

const NOW = "2026-08-04T12:00:00.000Z";

function draft(): ResearchPathDraft {
  return { steps: {
    "stage-01-capture-concern": { completed: false, checks: {}, fields: { "idea-0-text": "Researchers struggle to frame broad ideas", "idea-0-affected": "Early-career researchers", "idea-0-status": "promising" } },
    "stage-01-shape-problems": { completed: false, checks: {}, fields: { "frame-0-id": "frame-a", "frame-0-title": "Broad framing", "frame-0-situation": "", "frame-0-uncertainty": "", "frame-0-status": "selected" } },
    "stage-01-explore-baseline": { completed: false, checks: {}, fields: {} },
    "stage-01-develop-questions": { completed: false, checks: {}, fields: {} },
    "stage-01-choose-pathway": { completed: false, checks: {}, fields: {} },
  } };
}

async function context() {
  const document = await createResearchPathwayDocument({ projectId: "mentor-project", draft: draft(), now: NOW });
  return createResearchMentorContext({ projectId: "mentor-project", activeStepId: "stage-01-shape-problems", draft: draft(), document, idleSeconds: 180, editCount: 3 });
}

test("deterministic observations describe work state without diagnosing the researcher", async () => {
  const document = await createResearchPathwayDocument({ projectId: "mentor-observations", draft: draft(), now: NOW });
  const observations = deriveResearchMentorObservations(document, "stage-01-shape-problems", { idleSeconds: 180, editCount: 3 });
  assert.ok(observations.some((item) => item.id.includes("selected-frame-bounds")));
  assert.ok(observations.some((item) => item.id === "unfinished-editing-pause"));
  assert.ok(observations.every((item) => item.claim === "work-state-observation-not-mental-state-diagnosis"));
  assert.doesNotMatch(JSON.stringify(observations), /depressed|anxious|lazy|unmotivated/i);
});

test("context is current, bounded, redacted, checksum-valid, and contains no participant or chat data", async () => {
  const source = draft();
  source.steps["stage-01-shape-problems"].fields["frame-0-situation"] = "Contact Dr. Jane Researcher at jane@example.org or 212-555-0112";
  const document = await createResearchPathwayDocument({ projectId: "mentor-redaction", draft: source, now: NOW });
  const built = await createResearchMentorContext({ projectId: "mentor-redaction", activeStepId: "stage-01-shape-problems", draft: source, document });
  assert.match(JSON.stringify(built), /\[EMAIL REDACTED\]/);
  assert.match(JSON.stringify(built), /\[PHONE REDACTED\]/);
  assert.match(JSON.stringify(built), /\[NAME REDACTED\]/);
  assert.equal(built.participantDataIncluded, false);
  assert.equal(built.chatTranscriptStored, false);
  assert.ok(await normalizeAndVerifyResearchMentorContext(built));
  assert.equal(await normalizeAndVerifyResearchMentorContext({ ...built, activeStepId: "stage-01-develop-questions" }), null);
});

test("content binding ignores document bookkeeping but changes with pathway content", async () => {
  const source = draft();
  const firstDocument = await createResearchPathwayDocument({ projectId: "mentor-staleness", draft: source, now: NOW });
  const first = await createResearchMentorContext({ projectId: "mentor-staleness", activeStepId: "stage-01-shape-problems", draft: source, document: firstDocument });
  const laterDocument = await createResearchPathwayDocument({ projectId: "mentor-staleness", draft: source, previous: firstDocument, now: "2026-08-04T12:05:00.000Z" });
  const later = await createResearchMentorContext({ projectId: "mentor-staleness", activeStepId: "stage-01-shape-problems", draft: source, document: laterDocument });
  assert.equal(first.pathwayContentChecksum, later.pathwayContentChecksum);

  const changed = structuredClone(source);
  changed.steps["stage-01-shape-problems"].fields["frame-0-situation"] = "A newly documented situation";
  const changedContext = await createResearchMentorContext({ projectId: "mentor-staleness", activeStepId: "stage-01-shape-problems", draft: changed, document: laterDocument });
  assert.notEqual(first.pathwayContentChecksum, changedContext.pathwayContentChecksum);
  assert.equal(await normalizeAndVerifyResearchMentorContext({ ...first, pathwayContentChecksum: changedContext.pathwayContentChecksum }), null);
});

test("ignored observations disappear without mutating the research pathway", async () => {
  const document = await createResearchPathwayDocument({ projectId: "mentor-ignore", draft: draft(), now: NOW });
  const initial = await createResearchMentorContext({ projectId: "mentor-ignore", activeStepId: "stage-01-shape-problems", draft: draft(), document });
  const ignoredId = initial.observations[0].id;
  const ignored = await createResearchMentorContext({ projectId: "mentor-ignore", activeStepId: "stage-01-shape-problems", draft: draft(), document, ignoredObservationIds: [ignoredId] });
  assert.ok(!ignored.observations.some((item) => item.id === ignoredId));
  assert.ok(ignored.ignoredObservationIds.includes(ignoredId));
  assert.equal(document.identity.checksum, (await createResearchPathwayDocument({ projectId: "mentor-ignore", draft: draft(), now: NOW })).identity.checksum);
});

test("request normalization keeps only bounded ephemeral turns", async () => {
  const built = await context();
  const normalized = normalizeResearchMentorRequest({ projectId: "mentor-project", mode: "reflect", prompt: "Help me compare these frames", context: built, turns: Array.from({ length: 10 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: `turn ${index}` })) });
  assert.ok(normalized);
  assert.equal(normalized?.turns.length, 6);
  assert.equal(normalized?.turns[0].content, "turn 4");
  assert.equal(normalizeResearchMentorRequest({ projectId: "mentor-project", mode: "invalid", prompt: "Help", context: built }), null);
});

test("parser keeps only current-step reviewable canvas options and known provenance", async () => {
  const built = await context();
  const observationId = built.observations[0].id;
  const itemId = built.activeItems.find((item) => item.kind === "problem-frame")?.id ?? "";
  const parsed = parseResearchMentorResponse(JSON.stringify({
    summary: "Two alternatives may help comparison.",
    reflectiveQuestion: "Which uncertainty matters most to this project?",
    suggestions: [
      { id: "safe-frame", kind: "canvas-option", title: "Frame an observable situation", rationale: "It separates the situation from its interpretation.", uncertainty: "The researcher must confirm that this wording reflects the project.", observationIds: [observationId, "forged"], sourceItemIds: [itemId, "forged"], targetCollection: "problems", targetField: "situation", proposedText: "Researchers repeatedly revise a broad problem statement without settling its boundaries.", action: "create-alternative" },
      { id: "wrong-step", kind: "canvas-option", title: "Invent a question", rationale: "Wrong target.", uncertainty: "Unknown.", observationIds: [], sourceItemIds: [], targetCollection: "questions", targetField: "text", proposedText: "A question", action: "create-alternative" },
      { id: "unsafe", kind: "next-step", title: "Validated pathway", rationale: "This is definitively novel.", uncertainty: "None", observationIds: [], sourceItemIds: [], recommendation: "Proceed." },
    ],
  }), built);
  assert.equal(parsed.suggestions.length, 1);
  assert.equal(parsed.suggestions[0].id, "safe-frame");
  assert.deepEqual(parsed.suggestions[0].observationIds, [observationId]);
  assert.deepEqual(parsed.suggestions[0].sourceItemIds, [itemId]);
  assert.equal(parsed.rejectedSuggestions.length, 2);
});

test("reviewed canvas options create a new exploring alternative and never overwrite current work", async () => {
  const built = await context();
  const parsed = parseResearchMentorResponse(JSON.stringify({
    summary: "One alternative is available.", reflectiveQuestion: "Does this reflect the observed situation?", suggestions: [{
      id: "alternative-situation", kind: "canvas-option", title: "Alternative situation", rationale: "It gives the frame an observable boundary.", uncertainty: "The researcher must verify it.", observationIds: [], sourceItemIds: [], targetCollection: "problems", targetField: "situation", proposedText: "Researchers revise the scope repeatedly.", action: "create-alternative",
    }],
  }), built);
  const suggestion = parsed.suggestions[0];
  assert.equal(suggestion.kind, "canvas-option");
  if (suggestion.kind !== "canvas-option") return;
  const original = { "frame-0-title": "Keep the original", "frame-0-situation": "Original situation" };
  const applied = applyResearchMentorCanvasSuggestion(original, built.activeStepId, suggestion);
  assert.ok(applied.slot);
  assert.equal(applied.fields["frame-0-situation"], "Original situation");
  assert.equal(applied.fields[`frame-${applied.slot}-situation`], "Researchers revise the scope repeatedly.");
  assert.equal(applied.fields[`frame-${applied.slot}-status`], "exploring");
  assert.equal(applyResearchMentorCanvasSuggestion(original, "stage-01-develop-questions", suggestion).slot, null);
});

test("malformed model output fails closed", async () => {
  const parsed = parseResearchMentorResponse("not-json", await context());
  assert.equal(parsed.suggestions.length, 0);
  assert.equal(parsed.rejectedSuggestions[0].reason, "invalid-json");
});

test("later-stage mentor responses are advisory only even when the model returns a canvas option", async () => {
  const projectContext = await createMentorContextEnvelope({
    projectId: "mentor-later-stage",
    location: { stage: 3, stageId: "stage-03", stageTitle: "Design and Build the Study", stepId: "stage-03-step-01", stepTitle: "Select the Study Design" },
    memory: await createMentorProjectMemory({ projectId: "mentor-later-stage", updatedAt: NOW }),
    generatedAt: NOW,
  });
  const parsed = parseResearchMentorResponse(JSON.stringify({
    summary: "Review these bounded options.",
    reflectiveQuestion: "Which tradeoff needs researcher judgment?",
    suggestions: [
      { id: "forged-canvas", kind: "canvas-option", title: "Change design", rationale: "A model tried to edit the study.", uncertainty: "Researcher review is required.", observationIds: [], sourceItemIds: [], targetCollection: "problems", targetField: "situation", proposedText: "Overwrite the design.", action: "create-alternative" },
      { id: "safe-next", kind: "next-step", title: "Compare design limits", rationale: "The route is not enough to establish method fit.", uncertainty: "The researcher must verify the tradeoff.", observationIds: [], sourceItemIds: [], recommendation: "Record one strength and one limitation for each candidate design." },
    ],
  }), null, projectContext);
  assert.equal(parsed.suggestions.length, 1);
  assert.equal(parsed.suggestions[0].id, "safe-next");
  assert.ok(parsed.rejectedSuggestions.some((item) => item.reason === "invalid-canvas-target"));
});

test("redaction counts direct identifiers without storing their values", () => {
  const summary = { email: 0, phone: 0, address: 0, namedPerson: 0, institutionalIdentifier: 0 };
  const result = redactResearchMentorText("Email person@example.com about IRB-2045 at 100 Main Street.", summary);
  assert.doesNotMatch(result, /person@example\.com|IRB-2045|100 Main Street/);
  assert.deepEqual(summary, { email: 1, phone: 0, address: 1, namedPerson: 0, institutionalIdentifier: 1 });
});

test("local fallback ledger is project-scoped and bounded", () => {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
  for (let index = 0; index < 205; index += 1) appendLocalResearchMentorDecision(storage, "mentor-project", { projectId: "mentor-project", domain: "pathway", id: `decision-${index}` });
  const stored = JSON.parse(storage.getItem(researchMentorDecisionStorageKey("mentor-project")) ?? "[]") as unknown[];
  assert.equal(stored.length, 200);
  assert.equal((stored[0] as { id: string }).id, "decision-5");
});
