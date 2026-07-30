import assert from "node:assert/strict";
import test from "node:test";
import type { AnalysisMethodResult } from "./analysisExecution";
import type { AnalysisPlanResearchQuestion } from "./analysisPlan";
import type { ResultsQuestionRecord } from "./analysisResults";
import {
  createAnalysisResultsAssistantContext,
  normalizeAnalysisResultsAssistantRequest,
  parseAnalysisResultsAssistantResponse,
} from "./analysisResultsAssistant";

function fixtures() {
  const question = {
    id: "rq-1",
    question: "Is predictor score associated with outcome score?",
    designation: "primary",
    plannedMethod: "Simple linear regression",
    effectSize: "Unstandardized slope",
    unitOfAnalysis: "participant",
    sensitivityAnalyses: ["Repeat with a justified quality exclusion."],
  } as AnalysisPlanResearchQuestion;
  const result = {
    analysisId: "analysis-rq-1",
    researchQuestionId: "rq-1",
    methodLabel: "Simple linear regression",
    outcomeVariable: "outcome_score",
    predictorVariable: "predictor_score",
    planAlignment: "aligned",
    completeSampleSize: 40,
    excludedMissingOrInvalid: 2,
    primaryEstimate: {
      label: "Unstandardized slope",
      value: 1.25,
      formatted: "1.25",
    },
    interval: {
      level: 0.95,
      lower: 0.6,
      upper: 1.9,
      method: "Student-t interval",
    },
    metrics: [{ label: "R²", value: 0.42, formatted: "0.42" }],
    diagnostics: [{
      severity: "advisory",
      label: "Independence requires review",
      detail: "Cerise cannot infer independence.",
    }],
    assumptions: ["Independent observations"],
    computationNotes: ["Complete pairs"],
  } as AnalysisMethodResult;
  const record = {
    directAnswer: "",
    statisticalMeaning: "",
    practicalMeaning: "",
    claim: "",
    claimStrength: "not-selected",
    limitations: "",
    robustnessStatus: "not-performed",
    robustnessEvidence: "No sensitivity analysis was run.",
  } as ResultsQuestionRecord;
  return { question, result, record };
}

test("assistant context contains aggregate evidence and no participant row fields", () => {
  const { question, result, record } = fixtures();
  const context = createAnalysisResultsAssistantContext(
    "release-1",
    `sha256:${"a".repeat(64)}`,
    question,
    result,
    record,
  );
  const request = normalizeAnalysisResultsAssistantRequest({
    projectId: "project-1<script>",
    prompt: "Review my interpretation.",
    context: {
      ...context,
      participantRows: [{ sessionId: "participant-1" }],
    },
  });
  assert.ok(request);
  assert.equal(request.projectId, "project-1script");
  const serialized = JSON.stringify(request);
  assert.doesNotMatch(serialized, /participantRows/);
  assert.doesNotMatch(serialized, /sessionId/);
  assert.match(serialized, /Unstandardized slope/);
});

test("assistant response keeps only bounded non-causal interpretation suggestions", () => {
  const parsed = parseAnalysisResultsAssistantResponse(JSON.stringify({
    reply: "The draft should remain associational.",
    suggestion: {
      directAnswer: "Higher predictor scores were associated with higher outcome scores.",
      statisticalMeaning: "The slope was 1.25 with a 95% interval from 0.60 to 1.90.",
      practicalMeaning: "One predictor unit corresponded to an estimated 1.25 outcome units.",
      claim: "Predictor score was positively associated with outcome score.",
      claimStrength: "associational",
      limitations: "The unadjusted model does not establish causality.",
      overclaimWarnings: ["Do not use causal language."],
      reviewQuestions: ["Does the unit-of-analysis record support independence?"],
      estimate: 999,
      pValue: 0.0001,
    },
  }));
  assert.ok(parsed.suggestion);
  assert.equal(parsed.suggestion.claimStrength, "associational");
  assert.equal("estimate" in parsed.suggestion, false);
  assert.equal("pValue" in parsed.suggestion, false);

  const causal = parseAnalysisResultsAssistantResponse(JSON.stringify({
    reply: "Causal wording is not available through this assistant.",
    suggestion: {
      directAnswer: "The intervention caused improvement.",
      statisticalMeaning: "The estimate was positive.",
      practicalMeaning: "The effect was meaningful.",
      claim: "The intervention caused the result.",
      claimStrength: "causal-requires-external-justification",
      limitations: "None.",
    },
  }));
  assert.equal(causal.suggestion, null);
});
