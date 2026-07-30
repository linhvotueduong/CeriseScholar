import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { AnalysisPlanDocument } from "./analysisPlan";
import type { ResultsRecordPackage } from "./analysisResults";
import type { RobustnessRecordPackage } from "./analysisRobustness";
import {
  createAnalysisReviewerContext,
  normalizeAnalysisReviewerRequest,
  parseAnalysisReviewerResponse,
} from "./analysisReviewerAssistant";

const checksum = (value: string) => `sha256:${value.repeat(64).slice(0, 64)}`;

function fixtures() {
  const question = {
    id: "rq-1",
    question: "Is predictor score associated with outcome score?",
    hypothesis: "Higher predictor scores are associated with higher outcomes.",
    designation: "primary",
    estimand: {
      population: "Study participants",
      exposureOrIntervention: "Predictor score",
      comparator: "",
      outcome: "Outcome score",
      summaryMeasure: "Unstandardized slope",
      timepoint: "Post-task",
    },
    outcomeVariables: ["outcome_score"],
    predictorVariables: ["predictor_score"],
    covariateVariables: [],
    unitOfAnalysis: "participant",
    plannedMethod: "Simple linear regression",
    effectSize: "Unstandardized slope",
    missingDataStrategy: "Complete cases",
    exclusionRules: [],
    transformations: [],
    multiplicityStrategy: "One primary outcome",
    sensitivityAnalyses: ["Inspect HC3 interval and influence range."],
  };
  const specification = {
    id: "analysis-rq-1",
    researchQuestionId: "rq-1",
    enabled: true,
    methodId: "simple-linear-regression",
    outcomeVariable: "outcome_score",
    predictorVariable: "predictor_score",
    confidenceLevel: 0.95,
    deviationRationale: "",
  };
  const result = {
    analysisId: "analysis-rq-1",
    researchQuestionId: "rq-1",
    researchQuestion: question.question,
    methodId: "simple-linear-regression",
    methodLabel: "Simple linear regression",
    outcomeVariable: "outcome_score",
    predictorVariable: "predictor_score",
    planAlignment: "aligned",
    completeSampleSize: 40,
    excludedMissingOrInvalid: 2,
    primaryEstimate: {
      id: "slope",
      label: "Unstandardized slope",
      value: 1.25,
      formatted: "1.25",
    },
    metrics: [{ id: "r-squared", label: "R²", value: 0.42, formatted: "0.42" }],
    interval: {
      label: "95% confidence interval",
      level: 0.95,
      lower: 0.6,
      upper: 1.9,
      method: "Student-t interval",
    },
    diagnostics: [{
      id: "independence-review",
      severity: "advisory",
      label: "Independence requires review",
      detail: "Cerise cannot infer independence.",
    }],
    assumptions: ["Independent observations"],
    computationNotes: ["Complete pairs"],
  };
  const interpretation = {
    id: "result-rq-1",
    researchQuestionId: "rq-1",
    researchQuestion: question.question,
    designation: "primary",
    linkedResultIds: ["analysis-rq-1"],
    directAnswer: "Higher scores were associated with higher outcomes.",
    statisticalMeaning: "The slope was 1.25 with a 95% interval from 0.60 to 1.90.",
    practicalMeaning: "One predictor unit corresponded to 1.25 outcome units.",
    claim: "Predictor score was positively associated with outcome score.",
    claimStrength: "associational",
    causalJustification: "",
    limitations: "The model was unadjusted.",
    robustnessStatus: "performed-outside-cerise",
    robustnessEvidence: "See the reviewed Phase 8.7A record.",
    unexpectedFinding: "",
    diagnosticResponses: [{
      diagnosticId: "independence-review",
      label: "Independence requires review",
      severity: "advisory",
      note: "The unit of analysis was reviewed.",
    }],
    tableTitle: "Regression estimate",
    tableCaption: "Primary regression estimate.",
    figureTitle: "Slope interval",
    figureCaption: "Point estimate and interval.",
    tableApproved: true,
    figureApproved: true,
    researcherConfirmed: true,
  };
  const plan = {
    researchQuestions: [question],
  } as unknown as AnalysisPlanDocument;
  const resultsRecord = {
    releaseId: "release-1",
    aggregateAnalysis: {
      specifications: [specification],
      results: [result],
    },
    interpretation: {
      researchQuestions: [interpretation],
      divergences: [],
    },
    integrity: { packageChecksum: checksum("a") },
  } as unknown as ResultsRecordPackage;
  const robustnessRecord = {
    analyses: [{
      analysisId: "analysis-rq-1",
      researchQuestionId: "rq-1",
      researchQuestion: question.question,
      methodId: "simple-linear-regression",
      methodLabel: "Simple linear regression",
      outcomeVariable: "outcome_score",
      predictorVariable: "predictor_score",
      completeSampleSize: 40,
      primaryEstimate: {
        id: "slope",
        label: "Unstandardized slope",
        value: 1.25,
        formatted: "1.25",
        interval: {
          level: 0.95,
          lower: 0.6,
          upper: 1.9,
          method: "Student-t interval",
        },
      },
      alternatives: [{
        id: "hc3",
        label: "HC3 interval",
        estimate: 1.25,
        formatted: "1.25",
        method: "HC3",
        interval: {
          level: 0.95,
          lower: 0.55,
          upper: 1.95,
          method: "HC3 interval",
        },
      }],
      influence: null,
      comparisonStatus: "interval-boundary-consistent",
      requiresAttention: false,
      comparisonNote: "The interval conclusion was consistent.",
      diagnostics: [],
      limitations: ["HC3 does not repair confounding."],
    }],
    reviews: [{
      analysisId: "analysis-rq-1",
      researchQuestionId: "rq-1",
      conclusionImpact: "unchanged",
      interpretation: "The conclusion remained unchanged.",
      limitations: "The analysis remains unadjusted.",
      acknowledged: true,
    }],
    integrity: { packageChecksum: checksum("b") },
  } as unknown as RobustnessRecordPackage;
  return { plan, resultsRecord, robustnessRecord };
}

test("reviewer context contains bounded aggregate evidence and no participant rows", () => {
  const current = fixtures();
  const context = createAnalysisReviewerContext(
    current.plan,
    current.resultsRecord,
    current.robustnessRecord,
    "rq-1",
  );
  assert.ok(context);
  const request = normalizeAnalysisReviewerRequest({
    projectId: "project-1<script>",
    prompt: "Review the aggregate evidence.",
    context: {
      ...context,
      participantRows: [{ sessionId: "participant-1", outcome_score: 99 }],
      localFile: "/private/raw-data.json",
    },
  });
  assert.ok(request);
  assert.equal(request.projectId, "project-1script");
  const serialized = JSON.stringify(request);
  assert.doesNotMatch(serialized, /participantRows|sessionId|participant-1|localFile|raw-data/);
  assert.match(serialized, /Unstandardized slope/);
  assert.match(serialized, /robustness:analysis-rq-1/);
});

test("reviewer response keeps only supported categories and known evidence references", () => {
  const parsed = parseAnalysisReviewerResponse(JSON.stringify({
    summary: "The interpretation should remain associational.",
    suggestions: [
      {
        category: "causal-overclaim",
        priority: "important",
        title: "Keep the claim associational",
        observation: "The approved record uses an associational claim.",
        evidenceReferences: [
          "interpretation:result-rq-1",
          "invented:evidence",
        ],
        recommendation: "Retain associational wording.",
        limitation: "This review does not establish causality.",
        pValue: 0.0001,
        replacementEstimate: 999,
      },
      {
        category: "scientific-validity",
        priority: "important",
        title: "Invalid category",
        observation: "This should be removed.",
        evidenceReferences: ["interpretation:result-rq-1"],
        recommendation: "Certify the study.",
        limitation: "None.",
      },
    ],
  }), [
    "interpretation:result-rq-1",
    "result:analysis-rq-1",
  ]);
  assert.equal(parsed.suggestions.length, 1);
  assert.deepEqual(
    parsed.suggestions[0].evidenceReferences,
    ["interpretation:result-rq-1"],
  );
  assert.equal("pValue" in parsed.suggestions[0], false);
  assert.equal("replacementEstimate" in parsed.suggestions[0], false);
});

test("reviewer drops suggestions that do not cite a verified evidence id", () => {
  const parsed = parseAnalysisReviewerResponse(JSON.stringify({
    summary: "No evidence-linked suggestion was returned.",
    suggestions: [{
      category: "sensitivity-analysis",
      priority: "consider",
      title: "Run another analysis",
      observation: "No cited evidence.",
      evidenceReferences: ["unknown:item"],
      recommendation: "Try another model.",
      limitation: "This is prospective only.",
    }],
  }), ["plan:rq-1"]);
  assert.deepEqual(parsed.suggestions, []);
});

test("Phase 8.8 reference fixture retains only allowlisted evidence-linked advice", () => {
  const fixture = JSON.parse(readFileSync(
    new URL(
      "../../../docs/fixtures/phase-8.8-ai-reviewer-reference-v1.json",
      import.meta.url,
    ),
    "utf8",
  )) as {
    allowedEvidenceIds: string[];
    response: unknown;
    expected: {
      retainedSuggestionCount: number;
      retainedCategories: string[];
    };
  };
  const parsed = parseAnalysisReviewerResponse(
    JSON.stringify(fixture.response),
    fixture.allowedEvidenceIds,
  );
  assert.equal(parsed.suggestions.length, fixture.expected.retainedSuggestionCount);
  assert.deepEqual(
    parsed.suggestions.map((suggestion) => suggestion.category),
    fixture.expected.retainedCategories,
  );
  assert.doesNotMatch(JSON.stringify(parsed), /participant-row|participant-1/);
});
