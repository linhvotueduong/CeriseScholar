import { readStepDraft, type ResearchPathDraft } from "./researchPathDraft";
import {
  researchPathwayRowItemId,
  researchPathwayRowRoster,
} from "./researchPathwayPhase3Rows";
import type {
  AssignmentStrategy,
  DataSensitivity,
  MethodFamily,
  ParticipantAudience,
  ResearchIntent,
  ResearchSetting,
  SpecialProcedure,
} from "./projectRouteProfile";

export const PHASE2_STAGE_1_STEP_IDS = [
  "stage-01-capture-concern",
  "stage-01-shape-problems",
  "stage-01-explore-baseline",
  "stage-01-develop-questions",
  "stage-01-choose-pathway",
] as const;

export const LEGACY_STAGE_1_STEP_IDS = [
  "stage-01-step-01",
  "stage-01-step-02",
  "stage-01-step-03",
  "stage-01-step-04",
] as const;

export const PHASE2_IDEA_ROWS = 4;
export const PHASE2_PARKING_ROWS = 3;
export const PHASE2_PROBLEM_ROWS = 4;
export const PHASE2_BASELINE_ROWS = 4;
export const PHASE2_QUESTION_ROWS = 6;
export { isPhase3ResearchPathwayField } from "./researchPathwayPhase3Rows";

export type ResearchPathwayItemOrigin =
  | "researcher"
  | "legacy-workspace"
  | "legacy-project"
  | "system-migration";
export type ResearchPathwayItemStatus = "exploring" | "promising" | "selected" | "parked" | "rejected";
export type ResearchIdeaKind = "observation" | "experience" | "curiosity" | "contradiction" | "importance" | "other";
export type ResearchQuestionFamily =
  | "descriptive"
  | "exploratory"
  | "interpretive"
  | "comparative"
  | "explanatory"
  | "evaluative"
  | "predictive"
  | "design-oriented"
  | "evidence-synthesis"
  | "methodological";
export type ResearchEvidenceState = "known" | "contested" | "missing" | "assumed";
export type ResearchBaselineSource =
  | "scholarask"
  | "workspace"
  | "evidence-library"
  | "literature"
  | "dataset"
  | "documents"
  | "field-observation"
  | "other";
export type ResearchCriterionRating = "unrated" | "low" | "medium" | "high";
export type PathwayConfidence = "unrated" | "low" | "medium" | "high";
export type BackcastingChoice = "undecided" | "use" | "not-use";

export interface ResearchIdeaSpark {
  id: string;
  text: string;
  kind: ResearchIdeaKind;
  affectedContext: string;
  whyItMatters: string;
  status: ResearchPathwayItemStatus;
  origin: ResearchPathwayItemOrigin;
}

export interface CandidateProblemFrame {
  id: string;
  title: string;
  situation: string;
  affected: string;
  consequence: string;
  uncertainty: string;
  observedBasis: string;
  assumptions: string;
  interpretation: string;
  alternativeExplanations: string;
  proposedResponse: string;
  status: ResearchPathwayItemStatus;
  origin: ResearchPathwayItemOrigin;
  legacyRowIndex: number | null;
}

export interface ResearchBaselineEntry {
  id: string;
  surface: ResearchBaselineSource;
  known: string;
  contested: string;
  missing: string;
  assumed: string;
  needs: string;
  gaps: string;
  searchTerms: string;
  adjacentDisciplines: string;
  missingVoices: string;
  linkedProblemFrameIds: string[];
  evidenceReferenceIds: string[];
  status: ResearchPathwayItemStatus;
  origin: ResearchPathwayItemOrigin;
}

export interface ResearchQuestionScope {
  populationOrSource: string;
  setting: string;
  constructOrPhenomenon: string;
  timeframe: string;
  comparison: string;
  evidenceAccess: string;
}

export interface ResearchQuestionCriteria {
  significance: ResearchCriterionRating;
  researcherInterest: ResearchCriterionRating;
  feasibility: ResearchCriterionRating;
  ethics: ResearchCriterionRating;
  evidenceAccess: ResearchCriterionRating;
  contribution: ResearchCriterionRating;
}

export interface ResearchQuestionCandidate {
  id: string;
  text: string;
  family: ResearchQuestionFamily | null;
  status: ResearchPathwayItemStatus;
  origin: ResearchPathwayItemOrigin;
  linkedProblemFrameIds: string[];
  linkedBaselineEntryIds: string[];
  scope: ResearchQuestionScope;
  methodologicalImplications: string[];
  embeddedAssumptions: string[];
  criteria: ResearchQuestionCriteria;
  comparisonNotes: string;
  legacyCollection: "raw" | "key" | "project" | null;
  legacyRowIndex: number | null;
}

export interface ResearchPathwayRouteDecision {
  intent: ResearchIntent | null;
  methodFamily: MethodFamily | null;
  assignment: AssignmentStrategy | "undetermined" | null;
  setting: ResearchSetting | "undetermined" | null;
  audience: ParticipantAudience | "undetermined" | null;
  dataSensitivity: DataSensitivity | "undetermined" | null;
  possibleSpecialProcedures: SpecialProcedure[];
  confidence: PathwayConfidence;
  backcastingChoice: BackcastingChoice;
}

export interface ResearchPathwayDecision {
  identifiedProblem: string;
  baselineSynthesis: string;
  mainQuestion: string;
  researchApproach: string;
  workingHypothesis: string;
  selectedProblemFrameIds: string[];
  selectedQuestionIds: string[];
  rationale: string;
  unresolvedQuestions: string[];
  route: ResearchPathwayRouteDecision;
  backcasting: {
    vision: string;
    baseline: string;
    concepts: string;
    roadmap: string;
  };
}

export interface Phase2DraftProjection {
  ideas: ResearchIdeaSpark[];
  parkingLot: ResearchIdeaSpark[];
  problemFrames: CandidateProblemFrame[];
  baselineEntries: ResearchBaselineEntry[];
  questionCandidates: ResearchQuestionCandidate[];
  decision: ResearchPathwayDecision;
  representedIds: {
    ideas: string[];
    parkingLot: string[];
    problemFrames: string[];
    baselineEntries: string[];
    questionCandidates: string[];
  };
  hasPhase2Fields: boolean;
}

export const RESEARCH_QUESTION_FAMILIES: readonly ResearchQuestionFamily[] = [
  "descriptive", "exploratory", "interpretive", "comparative", "explanatory",
  "evaluative", "predictive", "design-oriented", "evidence-synthesis", "methodological",
];
export const RESEARCH_PATHWAY_ITEM_STATUSES: readonly ResearchPathwayItemStatus[] = [
  "exploring", "promising", "selected", "parked", "rejected",
];
export const RESEARCH_IDEA_KINDS: readonly ResearchIdeaKind[] = [
  "observation", "experience", "curiosity", "contradiction", "importance", "other",
];
export const RESEARCH_BASELINE_SOURCES: readonly ResearchBaselineSource[] = [
  "scholarask", "workspace", "evidence-library", "literature", "dataset", "documents", "field-observation", "other",
];
export const RESEARCH_CRITERION_RATINGS: readonly ResearchCriterionRating[] = ["unrated", "low", "medium", "high"];

function clean(value: unknown, maximum = 20_000): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maximum)
    : "";
}

function token(value: unknown, fallback: string): string {
  const candidate = clean(value, 160);
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(candidate) ? candidate : fallback;
}

function list(value: unknown): string[] {
  return [...new Set(clean(value).split(/[,\n]/).map((item) => item.trim()).filter(Boolean))].sort().slice(0, 500);
}

function hasAny(fields: Record<string, string>, prefix: string): boolean {
  return Object.entries(fields).some(([key, value]) => key.startsWith(prefix) && value.trim().length > 0);
}

function itemStatus(value: unknown, fallback: ResearchPathwayItemStatus = "exploring"): ResearchPathwayItemStatus {
  return RESEARCH_PATHWAY_ITEM_STATUSES.includes(value as ResearchPathwayItemStatus)
    ? value as ResearchPathwayItemStatus
    : fallback;
}

function rating(value: unknown): ResearchCriterionRating {
  return RESEARCH_CRITERION_RATINGS.includes(value as ResearchCriterionRating)
    ? value as ResearchCriterionRating
    : "unrated";
}

function emptyScope(): ResearchQuestionScope {
  return { populationOrSource: "", setting: "", constructOrPhenomenon: "", timeframe: "", comparison: "", evidenceAccess: "" };
}

function emptyCriteria(): ResearchQuestionCriteria {
  return { significance: "unrated", researcherInterest: "unrated", feasibility: "unrated", ethics: "unrated", evidenceAccess: "unrated", contribution: "unrated" };
}

export function emptyResearchPathwayDecision(): ResearchPathwayDecision {
  return {
    identifiedProblem: "",
    baselineSynthesis: "",
    mainQuestion: "",
    researchApproach: "",
    workingHypothesis: "",
    selectedProblemFrameIds: [],
    selectedQuestionIds: [],
    rationale: "",
    unresolvedQuestions: [],
    route: {
      intent: null,
      methodFamily: null,
      assignment: null,
      setting: null,
      audience: null,
      dataSensitivity: null,
      possibleSpecialProcedures: [],
      confidence: "unrated",
      backcastingChoice: "undecided",
    },
    backcasting: { vision: "", baseline: "", concepts: "", roadmap: "" },
  };
}

export function readPhase2PathwayDraft(draft: ResearchPathDraft): Phase2DraftProjection {
  const concern = readStepDraft(draft, PHASE2_STAGE_1_STEP_IDS[0]).fields;
  const problems = readStepDraft(draft, PHASE2_STAGE_1_STEP_IDS[1]).fields;
  const baseline = readStepDraft(draft, PHASE2_STAGE_1_STEP_IDS[2]).fields;
  const questions = readStepDraft(draft, PHASE2_STAGE_1_STEP_IDS[3]).fields;
  const choice = readStepDraft(draft, PHASE2_STAGE_1_STEP_IDS[4]).fields;
  const hasPhase2Fields = PHASE2_STAGE_1_STEP_IDS.some((stepId) => Object.keys(readStepDraft(draft, stepId).fields).length > 0);

  const ideas: ResearchIdeaSpark[] = [];
  if (clean(concern["concern-narrative"])) {
    ideas.push({
      id: "concern-narrative",
      text: clean(concern["concern-narrative"]),
      kind: "other",
      affectedContext: clean(concern["concern-affected"]),
      whyItMatters: clean(concern["concern-matters"]),
      status: "promising",
      origin: "researcher",
    });
  }
  const ideaIds: string[] = [];
  const ideaRoster = researchPathwayRowRoster(concern, "ideas");
  const archivedIdeas = new Set(ideaRoster.archived);
  for (const slot of [...ideaRoster.active, ...ideaRoster.archived]) {
    const id = token(concern[`idea-${slot}-id`], researchPathwayRowItemId("ideas", slot, concern));
    ideaIds.push(id);
    const text = clean(concern[`idea-${slot}-text`]);
    if (!text) continue;
    const kind = RESEARCH_IDEA_KINDS.includes(concern[`idea-${slot}-kind`] as ResearchIdeaKind)
      ? concern[`idea-${slot}-kind`] as ResearchIdeaKind
      : "other";
    ideas.push({ id, text, kind, affectedContext: clean(concern[`idea-${slot}-affected`]), whyItMatters: "", status: archivedIdeas.has(slot) ? "parked" : itemStatus(concern[`idea-${slot}-status`]), origin: "researcher" });
  }

  const parkingLot: ResearchIdeaSpark[] = [];
  const parkingIds: string[] = [];
  const parkingRoster = researchPathwayRowRoster(concern, "parking");
  const archivedParking = new Set(parkingRoster.archived);
  for (const slot of [...parkingRoster.active, ...parkingRoster.archived]) {
    const id = token(concern[`parking-${slot}-id`], researchPathwayRowItemId("parking", slot, concern));
    parkingIds.push(id);
    const text = clean(concern[`parking-${slot}-text`]);
    if (text) parkingLot.push({ id, text, kind: "other", affectedContext: "", whyItMatters: "", status: archivedParking.has(slot) ? "rejected" : "parked", origin: "researcher" });
  }

  const problemFrames: CandidateProblemFrame[] = [];
  const problemIds: string[] = [];
  const problemRoster = researchPathwayRowRoster(problems, "problems");
  const archivedProblems = new Set(problemRoster.archived);
  for (const slot of [...problemRoster.active, ...problemRoster.archived]) {
    const id = token(problems[`frame-${slot}-id`], researchPathwayRowItemId("problems", slot, problems));
    problemIds.push(id);
    const values = ["title", "situation", "affected", "consequence", "uncertainty", "observed", "assumptions", "interpretation", "alternatives"]
      .map((key) => clean(problems[`frame-${slot}-${key}`]));
    if (!values.some(Boolean)) continue;
    problemFrames.push({
      id,
      title: values[0],
      situation: values[1],
      affected: values[2],
      consequence: values[3],
      uncertainty: values[4],
      observedBasis: values[5],
      assumptions: values[6],
      interpretation: values[7],
      alternativeExplanations: values[8],
      proposedResponse: "",
      status: archivedProblems.has(slot) ? "parked" : itemStatus(problems[`frame-${slot}-status`]),
      origin: "researcher",
      legacyRowIndex: null,
    });
  }

  const baselineEntries: ResearchBaselineEntry[] = [];
  const baselineIds: string[] = [];
  const baselineRoster = researchPathwayRowRoster(baseline, "baseline");
  const archivedBaseline = new Set(baselineRoster.archived);
  for (const slot of [...baselineRoster.active, ...baselineRoster.archived]) {
    const id = token(baseline[`baseline-${slot}-id`], researchPathwayRowItemId("baseline", slot, baseline));
    baselineIds.push(id);
    const values = ["known", "contested", "missing", "assumed", "search-terms", "adjacent", "missing-voices"]
      .map((key) => clean(baseline[`baseline-${slot}-${key}`]));
    if (!values.some(Boolean)) continue;
    const surface = RESEARCH_BASELINE_SOURCES.includes(baseline[`baseline-${slot}-source`] as ResearchBaselineSource)
      ? baseline[`baseline-${slot}-source`] as ResearchBaselineSource
      : "other";
    baselineEntries.push({
      id,
      surface,
      known: values[0],
      contested: values[1],
      missing: values[2],
      assumed: values[3],
      needs: "",
      gaps: values[2],
      searchTerms: values[4],
      adjacentDisciplines: values[5],
      missingVoices: values[6],
      linkedProblemFrameIds: list(baseline[`baseline-${slot}-linked-frames`]),
      evidenceReferenceIds: list(baseline[`baseline-${slot}-evidence-refs`]),
      status: archivedBaseline.has(slot) ? "parked" : itemStatus(baseline[`baseline-${slot}-status`]),
      origin: "researcher",
    });
  }

  const questionCandidates: ResearchQuestionCandidate[] = [];
  const questionIds: string[] = [];
  const questionRoster = researchPathwayRowRoster(questions, "questions");
  const archivedQuestions = new Set(questionRoster.archived);
  for (const slot of [...questionRoster.active, ...questionRoster.archived]) {
    const id = token(questions[`question-${slot}-id`], researchPathwayRowItemId("questions", slot, questions));
    questionIds.push(id);
    const text = clean(questions[`question-${slot}-text`]);
    if (!text) continue;
    const family = RESEARCH_QUESTION_FAMILIES.includes(questions[`question-${slot}-family`] as ResearchQuestionFamily)
      ? questions[`question-${slot}-family`] as ResearchQuestionFamily
      : null;
    questionCandidates.push({
      id,
      text,
      family,
      status: archivedQuestions.has(slot) ? "parked" : itemStatus(questions[`question-${slot}-status`]),
      origin: "researcher",
      linkedProblemFrameIds: list(questions[`question-${slot}-linked-frames`]),
      linkedBaselineEntryIds: list(questions[`question-${slot}-linked-baseline`]),
      scope: {
        populationOrSource: clean(questions[`question-${slot}-scope-population`]),
        setting: clean(questions[`question-${slot}-scope-setting`]),
        constructOrPhenomenon: clean(questions[`question-${slot}-scope-construct`]),
        timeframe: clean(questions[`question-${slot}-scope-timeframe`]),
        comparison: clean(questions[`question-${slot}-scope-comparison`]),
        evidenceAccess: clean(questions[`question-${slot}-scope-evidence`]),
      },
      methodologicalImplications: list(questions[`question-${slot}-implications`]),
      embeddedAssumptions: list(questions[`question-${slot}-assumptions`]),
      criteria: {
        significance: rating(questions[`question-${slot}-criterion-significance`]),
        researcherInterest: rating(questions[`question-${slot}-criterion-interest`]),
        feasibility: rating(questions[`question-${slot}-criterion-feasibility`]),
        ethics: rating(questions[`question-${slot}-criterion-ethics`]),
        evidenceAccess: rating(questions[`question-${slot}-criterion-evidence`]),
        contribution: rating(questions[`question-${slot}-criterion-contribution`]),
      },
      comparisonNotes: clean(questions[`question-${slot}-comparison-notes`]),
      legacyCollection: null,
      legacyRowIndex: null,
    });
  }

  const selectedFrames = problemFrames.filter((item) => item.status === "selected");
  const selectedQuestions = questionCandidates.filter((item) => item.status === "selected");
  const intent = ["primary-data", "secondary-data", "evidence-synthesis"].includes(choice["route-intent"])
    ? choice["route-intent"] as ResearchIntent
    : null;
  const methodFamily = ["quantitative", "qualitative", "mixed-methods", "evidence-synthesis"].includes(choice["route-method"])
    ? choice["route-method"] as MethodFamily
    : null;
  const assignment = ["randomized", "non-randomized", "none", "undetermined"].includes(choice["route-assignment"])
    ? choice["route-assignment"] as ResearchPathwayRouteDecision["assignment"]
    : null;
  const setting = ["online-home", "laboratory", "field", "telephone", "import-only", "not-applicable", "undetermined"].includes(choice["route-setting"])
    ? choice["route-setting"] as ResearchPathwayRouteDecision["setting"]
    : null;
  const audience = ["adult", "minor", "capacity-limited", "not-participant", "undetermined"].includes(choice["route-audience"])
    ? choice["route-audience"] as ResearchPathwayRouteDecision["audience"]
    : null;
  const sensitivity = ["public", "deidentified", "restricted", "identifiable", "undetermined"].includes(choice["route-sensitivity"])
    ? choice["route-sensitivity"] as ResearchPathwayRouteDecision["dataSensitivity"]
    : null;
  const confidence = ["low", "medium", "high"].includes(choice["route-confidence"])
    ? choice["route-confidence"] as PathwayConfidence
    : "unrated";
  const backcastingChoice = ["use", "not-use"].includes(choice["backcasting-choice"])
    ? choice["backcasting-choice"] as BackcastingChoice
    : "undecided";

  const routeLabel = [methodFamily, intent, setting && setting !== "undetermined" ? setting : null].filter(Boolean).join(" · ");
  const decision: ResearchPathwayDecision = {
    ...emptyResearchPathwayDecision(),
    identifiedProblem: selectedFrames[0]?.uncertainty || selectedFrames[0]?.title || "",
    baselineSynthesis: clean(baseline["baseline-synthesis"]),
    mainQuestion: selectedQuestions[0]?.text || "",
    researchApproach: routeLabel,
    selectedProblemFrameIds: selectedFrames.map((item) => item.id),
    selectedQuestionIds: selectedQuestions.map((item) => item.id),
    rationale: clean(choice["pathway-rationale"]),
    unresolvedQuestions: list(choice["pathway-uncertainties"]),
    route: {
      intent,
      methodFamily,
      assignment,
      setting,
      audience,
      dataSensitivity: sensitivity,
      possibleSpecialProcedures: list(choice["route-special-procedures"]).filter((item): item is SpecialProcedure => (
        ["recording", "deception", "specimen", "genetic", "longitudinal", "reconsent"].includes(item)
      )),
      confidence,
      backcastingChoice,
    },
    backcasting: {
      vision: clean(choice["backcasting-vision"]),
      baseline: clean(choice["backcasting-baseline"]),
      concepts: clean(choice["backcasting-concepts"]),
      roadmap: clean(choice["backcasting-roadmap"]),
    },
  };

  return {
    ideas,
    parkingLot,
    problemFrames,
    baselineEntries,
    questionCandidates,
    decision,
    representedIds: {
      ideas: ["concern-narrative", ...ideaIds],
      parkingLot: parkingIds,
      problemFrames: problemIds,
      baselineEntries: baselineIds,
      questionCandidates: questionIds,
    },
    hasPhase2Fields: hasPhase2Fields || hasAny(concern, "concern-") || hasAny(choice, "route-"),
  };
}

export function phase2MappedFieldKeys(): Map<string, Set<string>> {
  const mapped = new Map<string, Set<string>>(PHASE2_STAGE_1_STEP_IDS.map((stepId) => [stepId, new Set<string>()]));
  const concern = mapped.get(PHASE2_STAGE_1_STEP_IDS[0])!;
  ["concern-narrative", "concern-affected", "concern-matters"].forEach((key) => concern.add(key));
  for (let index = 0; index < PHASE2_IDEA_ROWS; index += 1) {
    ["id", "kind", "text", "affected", "status"].forEach((key) => concern.add(`idea-${index}-${key}`));
  }
  for (let index = 0; index < PHASE2_PARKING_ROWS; index += 1) ["id", "text"].forEach((key) => concern.add(`parking-${index}-${key}`));

  const problem = mapped.get(PHASE2_STAGE_1_STEP_IDS[1])!;
  for (let index = 0; index < PHASE2_PROBLEM_ROWS; index += 1) {
    ["id", "title", "situation", "affected", "consequence", "uncertainty", "observed", "assumptions", "interpretation", "alternatives", "status"]
      .forEach((key) => problem.add(`frame-${index}-${key}`));
  }

  const baseline = mapped.get(PHASE2_STAGE_1_STEP_IDS[2])!;
  baseline.add("baseline-synthesis");
  for (let index = 0; index < PHASE2_BASELINE_ROWS; index += 1) {
    ["id", "source", "known", "contested", "missing", "assumed", "search-terms", "adjacent", "missing-voices", "linked-frames", "evidence-refs", "status"]
      .forEach((key) => baseline.add(`baseline-${index}-${key}`));
  }

  const question = mapped.get(PHASE2_STAGE_1_STEP_IDS[3])!;
  for (let index = 0; index < PHASE2_QUESTION_ROWS; index += 1) {
    ["id", "text", "family", "status", "linked-frames", "linked-baseline", "scope-population", "scope-setting", "scope-construct", "scope-timeframe", "scope-comparison", "scope-evidence", "implications", "assumptions", "criterion-significance", "criterion-interest", "criterion-feasibility", "criterion-ethics", "criterion-evidence", "criterion-contribution", "comparison-notes"]
      .forEach((key) => question.add(`question-${index}-${key}`));
  }

  const choice = mapped.get(PHASE2_STAGE_1_STEP_IDS[4])!;
  ["pathway-rationale", "pathway-uncertainties", "route-intent", "route-method", "route-assignment", "route-setting", "route-audience", "route-sensitivity", "route-special-procedures", "route-confidence", "backcasting-choice", "backcasting-vision", "backcasting-baseline", "backcasting-concepts", "backcasting-roadmap"]
    .forEach((key) => choice.add(key));
  return mapped;
}

export function emptyQuestionScope(): ResearchQuestionScope {
  return emptyScope();
}

export function emptyQuestionCriteria(): ResearchQuestionCriteria {
  return emptyCriteria();
}

/** Exact Stage 1 → downstream question handoff, with a legacy fallback during migration. */
export function selectedResearchQuestionsFromDraft(draft: ResearchPathDraft, limit = 40): string[] {
  const fields = readStepDraft(draft, PHASE2_STAGE_1_STEP_IDS[3]).fields;
  const roster = researchPathwayRowRoster(fields, "questions");
  const selected = roster.active.map((slot) => ({
    text: clean(fields[`question-${slot}-text`]),
    status: fields[`question-${slot}-status`],
  })).filter((item) => item.text && item.status === "selected").map((item) => item.text);
  if (selected.length) return selected.slice(0, limit);
  const legacy = readStepDraft(draft, LEGACY_STAGE_1_STEP_IDS[2]).fields;
  return Array.from({ length: limit }, (_, index) => clean(legacy[`key-question-${index}`])).filter(Boolean);
}
