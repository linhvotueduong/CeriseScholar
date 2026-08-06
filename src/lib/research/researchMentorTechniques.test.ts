import assert from "node:assert/strict";
import test from "node:test";
import { createMentorContextEnvelope, createMentorProjectMemory } from "./mentorContextEnvelope";
import { createResearchMentorContext, parseResearchMentorResponse } from "./researchMentor";
import {
  RESEARCH_MENTOR_TECHNIQUE_FAMILIES,
  RESEARCH_MENTOR_TECHNIQUES,
  createResearchMentorTechniqueRun,
  defaultResearchMentorTechniqueSourceIds,
  normalizeAndVerifyResearchMentorTechniqueRun,
  reviewResearchMentorTechniqueApplication,
  validateResearchMentorTechniqueResponse,
} from "./researchMentorTechniques";
import { createResearchPathwayDocument } from "./researchPathwayDocument";
import type { ResearchPathDraft } from "./researchPathDraft";

const NOW = "2026-08-04T12:00:00.000Z";

function draft(): ResearchPathDraft {
  return { steps: {
    "stage-01-capture-concern": { completed: false, checks: {}, fields: { "idea-0-text": "Students use generative AI while drafting and may engage differently with revision.", "idea-0-affected": "Undergraduate writers", "idea-0-status": "promising" } },
    "stage-01-shape-problems": { completed: false, checks: {}, fields: { "frame-0-id": "frame-a", "frame-0-title": "AI-supported revision", "frame-0-situation": "Writing support is changing how students revise drafts.", "frame-0-uncertainty": "Which learning processes change, for whom, and under which assessment conditions?", "frame-0-status": "selected" } },
    "stage-01-explore-baseline": { completed: false, checks: {}, fields: {} },
    "stage-01-develop-questions": { completed: false, checks: {}, fields: {} },
    "stage-01-choose-pathway": { completed: false, checks: {}, fields: {} },
  } };
}

async function fixtures() {
  const projectId = "phase6-techniques";
  const source = draft();
  const document = await createResearchPathwayDocument({ projectId, draft: source, now: NOW });
  const context = await createResearchMentorContext({ projectId, activeStepId: "stage-01-shape-problems", draft: source, document });
  const projectContext = await createMentorContextEnvelope({
    projectId,
    location: { stage: 1, stageId: "stage-01", stageTitle: "Pathway", stepId: context.activeStepId, stepTitle: "Shape Candidate Problems" },
    memory: await createMentorProjectMemory({ projectId, updatedAt: NOW }),
    activeContextItems: context.activeItems.map((item) => ({ id: item.id, kind: item.kind, status: item.status, summary: JSON.stringify(item.fields) })),
    pathwayRoute: context.route,
    generatedAt: NOW,
  });
  const sourceItemIds = defaultResearchMentorTechniqueSourceIds(context, 2);
  const run = await createResearchMentorTechniqueRun({ context, techniqueId: "topic-to-problem-shaper", sourceItemIds, permissionGranted: true });
  return { context, projectContext, run };
}

function techniqueJson(sourceItemIds: string[]) {
  return JSON.stringify({
    summary: "Three brainstorming lenses are available; no pathway change has been made.",
    reflectiveQuestion: "Which difference is worth examining without discarding your original wording?",
    suggestions: [
      { id: "learning-process", kind: "canvas-option", title: "Learning-process lens", rationale: "Focuses on revision practices.", uncertainty: "The process change has not been established.", sourceItemIds, observationIds: [], distinctiveLens: "Revision process rather than outcome", epistemicStatus: "brainstorming-not-evidence", evidenceIds: [], targetCollection: "problems", targetField: "uncertainty", proposedText: "How might AI-supported drafting alter the revision processes students use?", action: "create-alternative" },
      { id: "equity-access", kind: "canvas-option", title: "Equity and access lens", rationale: "Focuses on differences in access and use.", uncertainty: "Access differences need evidence.", sourceItemIds, observationIds: [], distinctiveLens: "Unequal access and use", epistemicStatus: "uncertain-needs-evidence", evidenceIds: [], targetCollection: "problems", targetField: "uncertainty", proposedText: "How might access to AI writing support shape differences in students’ revision opportunities?", action: "create-alternative" },
      { id: "assessment-design", kind: "canvas-option", title: "Assessment-design lens", rationale: "Focuses on the fit between tasks and intended learning.", uncertainty: "Assessment effects need checking.", sourceItemIds, observationIds: [], distinctiveLens: "Assessment conditions and intended learning", epistemicStatus: "brainstorming-not-evidence", evidenceIds: [], targetCollection: "problems", targetField: "uncertainty", proposedText: "Under which assessment conditions does AI-supported revision align or conflict with intended writing practice?", action: "create-alternative" },
    ],
  });
}

test("registry exposes all fifteen scholarly techniques across five researcher-need families", () => {
  assert.equal(RESEARCH_MENTOR_TECHNIQUES.length, 15);
  assert.deepEqual([...new Set(RESEARCH_MENTOR_TECHNIQUES.map((item) => item.family))], [...RESEARCH_MENTOR_TECHNIQUE_FAMILIES]);
  assert.ok(RESEARCH_MENTOR_TECHNIQUES.every((item) => item.prompt && item.purpose && item.recommendedStepIds.length > 0));
  assert.equal(RESEARCH_MENTOR_TECHNIQUES.filter((item) => item.minimumOptions === 3).length, 14);
});

test("technique run preserves exact researcher excerpts and fails without explicit expansion permission", async () => {
  const { context, run } = await fixtures();
  assert.ok(run.sourceExcerpts.length >= 1);
  assert.ok(run.sourceExcerpts.every((excerpt) => context.activeItems.some((item) => item.id === excerpt.itemId && Object.values(item.fields).flat().includes(excerpt.text))));
  assert.match(run.faithfulMirror, /not added a direction, claim, or evidence/i);
  await assert.rejects(() => createResearchMentorTechniqueRun({ context, techniqueId: "topic-to-problem-shaper", sourceItemIds: [run.sourceExcerpts[0].itemId], permissionGranted: false }), /grant permission/i);
});

test("technique run is checksum-bound to the current pathway and cannot be tampered", async () => {
  const { context, run } = await fixtures();
  assert.deepEqual(await normalizeAndVerifyResearchMentorTechniqueRun(run, context), run);
  assert.equal(await normalizeAndVerifyResearchMentorTechniqueRun({ ...run, faithfulMirror: "Changed silently" }, context), null);
  assert.equal(await normalizeAndVerifyResearchMentorTechniqueRun({ ...run, sourceExcerpts: [{ ...run.sourceExcerpts[0], text: "Invented source" }] }, context), null);
});

test("divergent technique accepts three distinct traceable options and rejects missing provenance", async () => {
  const { context, projectContext, run } = await fixtures();
  const ids = run.sourceExcerpts.map((item) => item.itemId);
  const parsed = parseResearchMentorResponse(techniqueJson(ids), context, projectContext);
  const valid = validateResearchMentorTechniqueResponse(parsed, run, projectContext);
  assert.equal(valid.valid, true);
  assert.equal(valid.suggestions.length, 3);
  const forged = parseResearchMentorResponse(techniqueJson(["forged-source"]), context, projectContext);
  const rejected = validateResearchMentorTechniqueResponse(forged, run, projectContext);
  assert.equal(rejected.valid, false);
  assert.ok(rejected.issues.some((issue) => issue.includes("missing-selected-source-provenance")));
});

test("divergence validation rejects three relabeled copies of the same option", async () => {
  const { context, projectContext, run } = await fixtures();
  const sourceItemIds = run.sourceExcerpts.map((item) => item.itemId);
  const repeated = JSON.stringify({ summary: "Options", reflectiveQuestion: "Which?", suggestions: [1, 2, 3].map((index) => ({ id: `copy-${index}`, kind: "canvas-option", title: `Copy ${index}`, rationale: "Same rationale", uncertainty: "Needs checking", sourceItemIds, observationIds: [], distinctiveLens: "Same lens", epistemicStatus: "brainstorming-not-evidence", evidenceIds: [], targetCollection: "problems", targetField: "uncertainty", proposedText: "How might AI-supported drafting alter student revision?", action: "create-alternative" })) });
  const parsed = parseResearchMentorResponse(repeated, context, projectContext);
  const rejected = validateResearchMentorTechniqueResponse(parsed, run, projectContext);
  assert.equal(rejected.valid, false);
  assert.ok(rejected.issues.some((issue) => issue.startsWith("insufficient-divergence")));
});

test("evidence-backed label fails closed without an exact researcher-approved evidence id", async () => {
  const { context, projectContext, run } = await fixtures();
  const parsed = parseResearchMentorResponse(techniqueJson(run.sourceExcerpts.map((item) => item.itemId)).replaceAll("brainstorming-not-evidence", "supported-by-approved-evidence"), context, projectContext);
  assert.ok(parsed.rejectedSuggestions.some((item) => item.reason === "unsupported-evidence-status"));
  assert.equal(validateResearchMentorTechniqueResponse(parsed, run, projectContext).valid, false);
});

test("applying a technique option requires a researcher edit or explicit rationale", async () => {
  const { context, projectContext, run } = await fixtures();
  const parsed = parseResearchMentorResponse(techniqueJson(run.sourceExcerpts.map((item) => item.itemId)), context, projectContext);
  const suggestion = parsed.suggestions[0];
  assert.equal(suggestion.kind, "canvas-option");
  if (suggestion.kind !== "canvas-option") return;
  assert.equal(reviewResearchMentorTechniqueApplication(suggestion, suggestion.proposedText, "").allowed, false);
  assert.equal(reviewResearchMentorTechniqueApplication(suggestion, `${suggestion.proposedText} In first-year courses.`, "").allowed, true);
  assert.equal(reviewResearchMentorTechniqueApplication(suggestion, suggestion.proposedText, "This lens matches the process I want to examine.").allowed, true);
});
