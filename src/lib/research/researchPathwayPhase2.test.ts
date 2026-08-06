import assert from "node:assert/strict";
import test from "node:test";
import {
  assessResearchPathwayReadiness,
  compareResearchPathwayRevisions,
  compilePathwayKnowledgeEntries,
  compileResearchPathwayBrief,
  terminologyForResearchIntent,
} from "./researchPathwayBrief";
import {
  createResearchPathwayDocument,
  researchPathwayDocumentToDraft,
} from "./researchPathwayDocument";
import { selectedResearchQuestionsFromDraft } from "./researchPathwayPhase2Model";
import type { ResearchPathDraft } from "./researchPathDraft";

const PROJECT_ID = "phase2-pathway-fixture";
const NOW = "2026-08-03T18:00:00.000Z";

function routeFields(intent: "primary-data" | "secondary-data" | "evidence-synthesis") {
  if (intent === "primary-data") return {
    "route-intent": intent,
    "route-method": "qualitative",
    "route-assignment": "none",
    "route-setting": "online-home",
    "route-audience": "adult",
    "route-sensitivity": "identifiable",
    "route-confidence": "medium",
  };
  if (intent === "secondary-data") return {
    "route-intent": intent,
    "route-method": "quantitative",
    "route-assignment": "none",
    "route-setting": "import-only",
    "route-audience": "not-participant",
    "route-sensitivity": "restricted",
    "route-confidence": "high",
  };
  return {
    "route-intent": intent,
    "route-method": "evidence-synthesis",
    "route-assignment": "none",
    "route-setting": "not-applicable",
    "route-audience": "not-participant",
    "route-sensitivity": "public",
    "route-confidence": "high",
  };
}

function readyDraft(intent: "primary-data" | "secondary-data" | "evidence-synthesis" = "primary-data"): ResearchPathDraft {
  return {
    steps: {
      "stage-01-capture-concern": {
        completed: false,
        checks: {},
        fields: {
          "concern-narrative": "Early-career researchers can identify important topics but struggle to shape a bounded problem.",
          "concern-affected": "Early-career researchers and their supervisors",
          "idea-0-text": "Problem framing may be the hidden bottleneck.",
          "idea-0-kind": "observation",
          "idea-0-affected": "Research planning",
          "idea-0-status": "promising",
        },
      },
      "stage-01-shape-problems": {
        completed: false,
        checks: {},
        fields: {
          "frame-0-title": "Ideas remain too broad",
          "frame-0-situation": "Researchers begin with meaningful but expansive concerns.",
          "frame-0-affected": "Early-career researchers",
          "frame-0-consequence": "They cannot choose a defensible study boundary.",
          "frame-0-uncertainty": "Which forms of guided framing help without displacing researcher judgment?",
          "frame-0-observed": "Drafts repeatedly broaden after initial feedback.",
          "frame-0-interpretation": "The transition from concern to problem is under-supported.",
          "frame-0-assumptions": "The difficulty is not explained only by topic knowledge.",
          "frame-0-alternatives": "Time pressure or unfamiliarity with the literature may be responsible.",
          "frame-0-status": "selected",
          "frame-1-title": "Evidence navigation is the bottleneck",
          "frame-1-situation": "Researchers face an unfamiliar literature.",
          "frame-1-affected": "Early-career researchers",
          "frame-1-consequence": "Relevant distinctions remain hidden.",
          "frame-1-uncertainty": "Would better evidence navigation improve framing?",
          "frame-1-observed": "Search terms stay broad.",
          "frame-1-interpretation": "Search and framing may be coupled.",
          "frame-1-assumptions": "The literature contains usable distinctions.",
          "frame-1-alternatives": "The topic itself may still be immature.",
          "frame-1-status": "promising",
        },
      },
      "stage-01-explore-baseline": {
        completed: false,
        checks: {},
        fields: {
          "baseline-0-source": intent === "evidence-synthesis" ? "literature" : intent === "secondary-data" ? "dataset" : "scholarask",
          "baseline-0-known": "Structured reflection can externalize assumptions.",
          "baseline-0-contested": "The ideal amount of structure remains debated.",
          "baseline-0-missing": "Effects on problem framing are not well characterized.",
          "baseline-0-linked-frames": "problem-frame-1",
          "baseline-0-evidence-refs": "evidence-1",
          "baseline-0-status": "selected",
          "baseline-synthesis": "Scaffolding is plausible, but its effect on bounded problem framing remains uncertain.",
        },
      },
      "stage-01-develop-questions": {
        completed: false,
        checks: {},
        fields: {
          "question-0-text": intent === "evidence-synthesis"
            ? "How has guided problem framing been described across research-development studies?"
            : intent === "secondary-data"
              ? "Which documented framing behaviors are associated with narrower proposal revisions in the archive?"
              : "How do early-career researchers experience guided problem framing while developing a proposal?",
          "question-0-family": intent === "evidence-synthesis" ? "evidence-synthesis" : intent === "secondary-data" ? "comparative" : "interpretive",
          "question-0-status": "selected",
          "question-0-linked-frames": "problem-frame-1",
          "question-0-linked-baseline": "baseline-entry-1",
          "question-0-scope-population": intent === "evidence-synthesis" ? "Research-development studies" : intent === "secondary-data" ? "Proposal revision archive" : "Early-career researchers",
          "question-0-scope-construct": "Guided problem framing",
          "question-0-scope-setting": intent === "primary-data" ? "Online mentoring sessions" : "Available evidence sources",
          "question-0-scope-evidence": intent === "primary-data" ? "Interview and reflection records" : "Authorized source access",
          "question-1-text": "Which kinds of structure preserve researcher ownership while improving problem boundaries?",
          "question-1-family": "exploratory",
          "question-1-status": "promising",
          "question-1-linked-frames": "problem-frame-1",
          "question-1-linked-baseline": "baseline-entry-1",
          "question-1-scope-population": "Research-development work",
          "question-1-scope-construct": "Researcher ownership and problem boundaries",
          "question-1-scope-setting": "Proposal development",
          "question-1-scope-evidence": "Accessible records or accounts",
        },
      },
      "stage-01-choose-pathway": {
        completed: false,
        checks: {},
        fields: {
          ...routeFields(intent),
          "pathway-rationale": "This pathway preserves the researcher’s concern while making the uncertainty and evidence boundary explicit.",
          "pathway-uncertainties": "Whether the framing support should be synchronous or self-guided",
          "backcasting-choice": "not-use",
        },
      },
    },
  };
}

test("the five-step pathway derives readiness and compiles an exact Stage 2 brief", async () => {
  const draft = readyDraft();
  const document = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft, now: NOW });
  const readiness = assessResearchPathwayReadiness(document);
  const brief = await compileResearchPathwayBrief(document);
  assert.equal(readiness.readyForStage2, true);
  assert.equal(readiness.steps.length, 5);
  assert.ok(brief);
  assert.deepEqual(brief?.selectedQuestions.map((item) => item.text), selectedResearchQuestionsFromDraft(draft));
  assert.equal(brief?.unresolvedUncertainties[0], "Whether the framing support should be synchronous or self-guided");
  assert.equal(brief?.source.checksum, document.identity.checksum);
});

test("qualitative pathways are not forced into variable or hypothesis fields", async () => {
  const document = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: readyDraft("primary-data"), now: NOW });
  const brief = await compileResearchPathwayBrief(document);
  assert.equal(brief?.route.methodFamily, "qualitative");
  assert.equal(document.decision.workingHypothesis, "");
  assert.ok(document.questionCandidates.every((item) => !("variable" in item) && !("hypothesis" in item)));
});

test("evidence synthesis uses evidence-base language and never enables participant workflow", async () => {
  const document = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: readyDraft("evidence-synthesis"), now: NOW });
  const brief = await compileResearchPathwayBrief(document);
  const terms = terminologyForResearchIntent("evidence-synthesis");
  assert.ok(terms.questionGuidance.includes("participant-study language does not apply"));
  assert.equal(brief?.route.audience, "not-participant");
  assert.ok(!brief?.route.capabilities.includes("participant-plan"));
  assert.equal(brief?.route.applicability.find((item) => item.stepId === "plan-participants")?.status, "not-applicable");
});

test("secondary-data pathways frame coverage and measurement without participant collection", async () => {
  const document = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: readyDraft("secondary-data"), now: NOW });
  const brief = await compileResearchPathwayBrief(document);
  const terms = terminologyForResearchIntent("secondary-data");
  assert.match(terms.baselineGuidance, /coverage and measurement/);
  assert.equal(brief?.route.setting, "import-only");
  assert.ok(brief?.route.capabilities.includes("data-use-and-rights-review"));
  assert.ok(!brief?.route.capabilities.includes("recruitment-materials"));
});

test("an earlier frame remains recoverable and the revision comparison explains the change", async () => {
  const initialDraft = readyDraft();
  const initial = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: initialDraft, now: NOW });
  const revisedDraft = researchPathwayDocumentToDraft(initial, initialDraft);
  revisedDraft.steps["stage-01-shape-problems"].fields["frame-0-title"] = "Problem framing lacks a protected thinking space";
  const revised = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: revisedDraft, previous: initial, now: "2026-08-03T19:00:00.000Z" });
  const difference = compareResearchPathwayRevisions(revised, initial);
  assert.equal(initial.problemFrames[0].title, "Ideas remain too broad");
  assert.equal(revised.problemFrames[0].title, "Problem framing lacks a protected thinking space");
  assert.deepEqual(difference.changedProblemFrameIds, ["problem-frame-1"]);
  assert.equal(difference.previousRevision, initial.revision);
});

test("Living Research Record handoff entries are checksum-bound and exclude chat or participant rows", async () => {
  const document = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft: readyDraft(), now: NOW });
  const entries = await compilePathwayKnowledgeEntries(document);
  assert.equal(entries.length, 4);
  assert.ok(entries.every((entry) => entry.sourceReferences[0]?.checksum === document.identity.checksum));
  assert.doesNotMatch(JSON.stringify(entries), /chatTranscript|participantRows|promptStored/);
});

test("the same Phase 2 input compiles deterministically", async () => {
  const [left, right] = await Promise.all([
    createResearchPathwayDocument({ projectId: PROJECT_ID, draft: readyDraft(), now: NOW }),
    createResearchPathwayDocument({ projectId: PROJECT_ID, draft: readyDraft(), now: NOW }),
  ]);
  const [leftBrief, rightBrief] = await Promise.all([compileResearchPathwayBrief(left), compileResearchPathwayBrief(right)]);
  assert.equal(left.identity.checksum, right.identity.checksum);
  assert.equal(leftBrief?.checksum, rightBrief?.checksum);
});

test("route contradictions fail readiness instead of silently changing the researcher’s choice", async () => {
  const draft = readyDraft("evidence-synthesis");
  draft.steps["stage-01-choose-pathway"].fields["route-method"] = "quantitative";
  const document = await createResearchPathwayDocument({ projectId: PROJECT_ID, draft, now: NOW });
  assert.equal(assessResearchPathwayReadiness(document).readyForStage2, false);
  assert.equal(await compileResearchPathwayBrief(document), null);
});
