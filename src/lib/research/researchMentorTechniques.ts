import { sha256ArtifactChecksum, type ResearchArtifactChecksum } from "./artifactIdentity";
import type { MentorContextEnvelope } from "./mentorContextEnvelope";
import type {
  ParsedResearchMentorResponse,
  ResearchMentorContext,
  ResearchMentorContextItem,
  ResearchMentorMode,
  ResearchMentorSuggestion,
  ResearchMentorCanvasSuggestion,
} from "./researchMentor";

export const RESEARCH_MENTOR_TECHNIQUE_SCHEMA_VERSION = 1 as const;
export const MAX_TECHNIQUE_SOURCE_EXCERPTS = 6;

export const RESEARCH_MENTOR_TECHNIQUE_FAMILIES = [
  "frame-problem",
  "explore-evidence",
  "develop-questions",
  "compare-decide",
  "plan-next-move",
] as const;

export type ResearchMentorTechniqueFamily = typeof RESEARCH_MENTOR_TECHNIQUE_FAMILIES[number];

export const RESEARCH_MENTOR_TECHNIQUE_IDS = [
  "topic-to-problem-shaper",
  "alternative-problem-frame-generator",
  "stakeholder-missing-voice-lens",
  "contradiction-boundary-finder",
  "assumption-map",
  "adjacent-literature-bridge",
  "search-vocabulary-builder",
  "research-question-family-explorer",
  "scope-mapper",
  "competing-explanation-exercise",
  "contribution-canvas",
  "feasibility-compass",
  "path-comparison",
  "smallest-next-step-planner",
  "advisor-handoff-memo",
] as const;

export type ResearchMentorTechniqueId = typeof RESEARCH_MENTOR_TECHNIQUE_IDS[number];

export interface ResearchMentorTechniqueDefinition {
  id: ResearchMentorTechniqueId;
  family: ResearchMentorTechniqueFamily;
  label: string;
  shortLabel: string;
  purpose: string;
  mode: ResearchMentorMode;
  recommendedStepIds: readonly string[];
  output: "divergent-options" | "structured-synthesis";
  minimumOptions: 1 | 3;
  prompt: string;
}

const CAPTURE = "stage-01-capture-concern";
const SHAPE = "stage-01-shape-problems";
const BASELINE = "stage-01-explore-baseline";
const QUESTIONS = "stage-01-develop-questions";
const PATHWAY = "stage-01-choose-pathway";

export const RESEARCH_MENTOR_TECHNIQUES: readonly ResearchMentorTechniqueDefinition[] = [
  { id: "topic-to-problem-shaper", family: "frame-problem", label: "Shape a researchable problem", shortLabel: "Topic to problem", purpose: "Turn a concern into bounded problem possibilities without choosing one for the researcher.", mode: "narrow", recommendedStepIds: [CAPTURE, SHAPE], output: "divergent-options", minimumOptions: 3, prompt: "Using only the selected researcher wording, offer three genuinely different researchable problem lenses. Preserve the original meaning, make the difference between lenses explicit, and add no empirical claims." },
  { id: "alternative-problem-frame-generator", family: "frame-problem", label: "Generate alternative problem frames", shortLabel: "Alternative frames", purpose: "Reframe the same concern through materially different scholarly perspectives.", mode: "compare-options", recommendedStepIds: [SHAPE], output: "divergent-options", minimumOptions: 3, prompt: "Generate three materially different problem frames from the selected items. Do not paraphrase the same frame three times and do not rank them." },
  { id: "stakeholder-missing-voice-lens", family: "frame-problem", label: "Examine stakeholders and missing voices", shortLabel: "Stakeholders and voices", purpose: "Notice whose experience, authority, or consequence may be absent from the current framing.", mode: "reflect", recommendedStepIds: [CAPTURE, SHAPE, BASELINE], output: "divergent-options", minimumOptions: 3, prompt: "Offer three different stakeholder or missing-voice lenses grounded only in the selected wording. Phrase them as possibilities to investigate, not facts about people who are not represented." },
  { id: "contradiction-boundary-finder", family: "frame-problem", label: "Find contradictions and boundary conditions", shortLabel: "Contradictions and boundaries", purpose: "Expose tensions, limits, contexts, or cases where a current frame may change.", mode: "narrow", recommendedStepIds: [SHAPE, BASELINE], output: "divergent-options", minimumOptions: 3, prompt: "Identify three distinct tensions or boundary-condition possibilities in the selected project wording. Label every inference as uncertain and do not invent supporting evidence." },
  { id: "assumption-map", family: "frame-problem", label: "Map assumptions", shortLabel: "Assumption map", purpose: "Separate observations from interpretations and assumptions that need checking.", mode: "reflect", recommendedStepIds: [CAPTURE, SHAPE, BASELINE], output: "divergent-options", minimumOptions: 3, prompt: "Surface three distinct assumptions that may underlie the selected wording. For each, explain what in the researcher text inspired it and what would need checking." },
  { id: "adjacent-literature-bridge", family: "explore-evidence", label: "Bridge to adjacent literature", shortLabel: "Adjacent literature", purpose: "Suggest neighboring concepts or disciplines as search directions without claiming literature was reviewed.", mode: "find-bridge", recommendedStepIds: [BASELINE], output: "divergent-options", minimumOptions: 3, prompt: "Propose three distinct adjacent-concept or adjacent-discipline search bridges. These are brainstorming directions only; do not invent publications, citations, or findings." },
  { id: "search-vocabulary-builder", family: "explore-evidence", label: "Build search vocabulary", shortLabel: "Search vocabulary", purpose: "Develop synonyms, contrasts, and search-language families from the researcher’s wording.", mode: "find-bridge", recommendedStepIds: [BASELINE], output: "divergent-options", minimumOptions: 3, prompt: "Create three meaningfully different search-vocabulary families grounded in the selected wording. Explain the conceptual emphasis of each family and make no claims about search results." },
  { id: "research-question-family-explorer", family: "develop-questions", label: "Explore research-question families", shortLabel: "Question families", purpose: "Compare how descriptive, interpretive, comparative, explanatory, evaluative, or other question families change the inquiry.", mode: "compare-options", recommendedStepIds: [QUESTIONS], output: "divergent-options", minimumOptions: 3, prompt: "Offer three research questions from genuinely different question families. Keep constructs and population or source faithful to the selected researcher content, and name how each family changes what can be learned." },
  { id: "scope-mapper", family: "develop-questions", label: "Map the scope", shortLabel: "Scope mapper", purpose: "Compare bounded versions across population or source, setting, construct, timeframe, comparison, and evidence access.", mode: "narrow", recommendedStepIds: [QUESTIONS], output: "divergent-options", minimumOptions: 3, prompt: "Offer three distinct scope configurations using only supplied project facts. Do not fill missing population, setting, timeframe, or comparison details with invented facts." },
  { id: "competing-explanation-exercise", family: "develop-questions", label: "Consider competing explanations", shortLabel: "Competing explanations", purpose: "Keep plausible alternative explanations visible before a causal or interpretive commitment.", mode: "compare-options", recommendedStepIds: [SHAPE, QUESTIONS], output: "divergent-options", minimumOptions: 3, prompt: "Offer three genuinely different possible explanations or interpretive accounts. Present them as hypotheses to examine, not supported findings, and tie each to selected researcher wording." },
  { id: "contribution-canvas", family: "compare-decide", label: "Clarify a possible contribution", shortLabel: "Contribution canvas", purpose: "Distinguish possible conceptual, empirical, methodological, practical, or synthesis contributions without claiming novelty.", mode: "reflect", recommendedStepIds: [QUESTIONS, PATHWAY], output: "divergent-options", minimumOptions: 3, prompt: "Offer three different possible contribution framings. Never claim novelty or importance as established; identify what evidence would be needed to support each framing." },
  { id: "feasibility-compass", family: "compare-decide", label: "Examine feasibility", shortLabel: "Feasibility compass", purpose: "Compare access, time, skills, ethics, data, recruitment, and analysis constraints without declaring a design feasible.", mode: "compare-options", recommendedStepIds: [QUESTIONS, PATHWAY], output: "divergent-options", minimumOptions: 3, prompt: "Offer three distinct feasibility lenses grounded in explicit project constraints. Do not declare the project feasible; identify unknowns the researcher must verify." },
  { id: "path-comparison", family: "compare-decide", label: "Compare provisional pathways", shortLabel: "Path comparison", purpose: "Compare tradeoffs across active directions using researcher-supplied criteria without choosing a winner.", mode: "compare-options", recommendedStepIds: [PATHWAY], output: "divergent-options", minimumOptions: 3, prompt: "Compare at least three distinct pathway possibilities or comparison lenses. Do not identify a best option unless the researcher supplied explicit criteria, and even then leave the decision to the researcher." },
  { id: "smallest-next-step-planner", family: "plan-next-move", label: "Plan the smallest next step", shortLabel: "Smallest next step", purpose: "Offer low-cost, reversible actions that preserve several lines of thought.", mode: "next-step", recommendedStepIds: [CAPTURE, SHAPE, BASELINE, QUESTIONS, PATHWAY], output: "divergent-options", minimumOptions: 3, prompt: "Offer three small, reversible next actions with different purposes. Explain what each action would clarify and do not imply that any one action is required." },
  { id: "advisor-handoff-memo", family: "plan-next-move", label: "Prepare an advisor handoff memo", shortLabel: "Advisor handoff", purpose: "Compile the researcher’s current direction, alternatives, evidence status, and questions into a reviewable memo.", mode: "reflect", recommendedStepIds: [PATHWAY], output: "structured-synthesis", minimumOptions: 1, prompt: "Draft one concise advisor handoff memo using only supplied project content. Separate current direction, preserved alternatives, evidence status, unresolved questions, and the specific feedback requested. Do not add claims or decide for the researcher." },
] as const;

const TECHNIQUE_BY_ID = new Map(RESEARCH_MENTOR_TECHNIQUES.map((item) => [item.id, item]));
const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

export interface ResearchMentorTechniqueSourceExcerpt {
  itemId: string;
  itemKind: ResearchMentorContextItem["kind"];
  field: string;
  text: string;
}

export interface ResearchMentorTechniqueRun {
  schemaVersion: typeof RESEARCH_MENTOR_TECHNIQUE_SCHEMA_VERSION;
  projectId: string;
  activeStepId: string;
  techniqueId: ResearchMentorTechniqueId;
  sourceExcerpts: ResearchMentorTechniqueSourceExcerpt[];
  faithfulMirror: string;
  permissionGranted: true;
  pathwayContentChecksum: ResearchArtifactChecksum;
  runChecksum: ResearchArtifactChecksum;
  claim: "researcher-words-first-permissioned-expansion-not-evidence-or-autonomous-direction";
}

export interface ResearchMentorTechniqueApiMetadata {
  techniqueId: ResearchMentorTechniqueId;
  techniqueLabel: string;
  runChecksum: ResearchArtifactChecksum;
  sourceExcerpts: ResearchMentorTechniqueSourceExcerpt[];
  faithfulMirror: string;
  minimumOptions: 1 | 3;
  output: ResearchMentorTechniqueDefinition["output"];
  claim: ResearchMentorTechniqueRun["claim"];
}

export interface ResearchMentorTechniqueValidation {
  valid: boolean;
  issues: string[];
  suggestions: ResearchMentorSuggestion[];
}

export interface ResearchMentorTechniqueApplicationReview {
  allowed: boolean;
  changed: boolean;
  rationale: string;
  suggestion: ResearchMentorCanvasSuggestion;
  reason: string;
}

function safeText(value: unknown, maximum = 2_000): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maximum)
    : "";
}

export function getResearchMentorTechnique(id: ResearchMentorTechniqueId): ResearchMentorTechniqueDefinition {
  const technique = TECHNIQUE_BY_ID.get(id);
  if (!technique) throw new Error("Research mentor technique is not registered.");
  return technique;
}

export function recommendedResearchMentorTechniques(activeStepId: string): ResearchMentorTechniqueDefinition[] {
  return RESEARCH_MENTOR_TECHNIQUES.filter((item) => item.recommendedStepIds.includes(activeStepId));
}

export function recommendedResearchMentorTechniqueFamily(activeStepId: string): ResearchMentorTechniqueFamily {
  return recommendedResearchMentorTechniques(activeStepId)[0]?.family ?? "frame-problem";
}

function excerptFromItem(item: ResearchMentorContextItem): ResearchMentorTechniqueSourceExcerpt | null {
  const preferredFields: Readonly<Record<ResearchMentorContextItem["kind"], readonly string[]>> = {
    idea: ["text", "whyItMatters", "affectedContext"],
    "problem-frame": ["title", "situation", "uncertainty", "consequence", "affected"],
    "baseline-entry": ["known", "contested", "missing", "assumed", "searchTerms"],
    "question-candidate": ["text", "comparisonNotes", "constructOrPhenomenon", "populationOrSource"],
  };
  for (const field of preferredFields[item.kind]) {
    const value = item.fields[field];
    const text = safeText(Array.isArray(value) ? value.join("; ") : value, 1_500);
    if (text) return { itemId: item.id, itemKind: item.kind, field, text };
  }
  return null;
}

export function defaultResearchMentorTechniqueSourceIds(context: ResearchMentorContext, maximum = 2): string[] {
  const selected = new Set([...context.selectedProblemFrameIds, ...context.selectedQuestionIds]);
  const ordered = [...context.activeItems].sort((left, right) => Number(selected.has(right.id)) - Number(selected.has(left.id)));
  return ordered.flatMap((item) => excerptFromItem(item) ? [item.id] : []).slice(0, maximum);
}

export async function createResearchMentorTechniqueRun(input: {
  context: ResearchMentorContext;
  techniqueId: ResearchMentorTechniqueId;
  sourceItemIds: readonly string[];
  permissionGranted: boolean;
}): Promise<ResearchMentorTechniqueRun> {
  getResearchMentorTechnique(input.techniqueId);
  if (!input.permissionGranted) throw new Error("The researcher must grant permission before Cerise expands their thinking.");
  const requested = new Set(input.sourceItemIds.filter((item) => TOKEN_PATTERN.test(item)).slice(0, MAX_TECHNIQUE_SOURCE_EXCERPTS));
  const sourceExcerpts = input.context.activeItems
    .filter((item) => requested.has(item.id))
    .flatMap((item) => excerptFromItem(item) ?? [])
    .slice(0, MAX_TECHNIQUE_SOURCE_EXCERPTS);
  if (!sourceExcerpts.length) throw new Error("Choose at least one researcher-authored project item before using a scholarly technique.");
  const core = {
    schemaVersion: RESEARCH_MENTOR_TECHNIQUE_SCHEMA_VERSION,
    projectId: input.context.projectId,
    activeStepId: input.context.activeStepId,
    techniqueId: input.techniqueId,
    sourceExcerpts,
    faithfulMirror: "Cerise is using only the selected excerpts below as the starting point. It has not added a direction, claim, or evidence.",
    permissionGranted: true as const,
    pathwayContentChecksum: input.context.pathwayContentChecksum,
    claim: "researcher-words-first-permissioned-expansion-not-evidence-or-autonomous-direction" as const,
  };
  return { ...core, runChecksum: await sha256ArtifactChecksum(core) };
}

export async function normalizeAndVerifyResearchMentorTechniqueRun(value: unknown, context: ResearchMentorContext): Promise<ResearchMentorTechniqueRun | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<ResearchMentorTechniqueRun>;
  if (candidate.schemaVersion !== RESEARCH_MENTOR_TECHNIQUE_SCHEMA_VERSION
    || !RESEARCH_MENTOR_TECHNIQUE_IDS.includes(candidate.techniqueId as ResearchMentorTechniqueId)
    || candidate.projectId !== context.projectId
    || candidate.activeStepId !== context.activeStepId
    || candidate.permissionGranted !== true
    || candidate.pathwayContentChecksum !== context.pathwayContentChecksum
    || candidate.claim !== "researcher-words-first-permissioned-expansion-not-evidence-or-autonomous-direction"
    || typeof candidate.runChecksum !== "string"
    || !Array.isArray(candidate.sourceExcerpts)) return null;
  let rebuilt: ResearchMentorTechniqueRun;
  try {
    rebuilt = await createResearchMentorTechniqueRun({
      context,
      techniqueId: candidate.techniqueId as ResearchMentorTechniqueId,
      sourceItemIds: candidate.sourceExcerpts.map((item) => item?.itemId ?? ""),
      permissionGranted: true,
    });
  } catch {
    return null;
  }
  return rebuilt.runChecksum === candidate.runChecksum && JSON.stringify(rebuilt) === JSON.stringify(candidate) ? rebuilt : null;
}

export function researchMentorTechniqueSystemInstructions(run: ResearchMentorTechniqueRun): string {
  const technique = getResearchMentorTechnique(run.techniqueId);
  return `\n\nStage 1 scholarly technique: ${technique.label} (${technique.id})
- The researcher has explicitly granted permission to expand from the selected excerpts.
- Preserve their original wording and cite at least one exact selected item ID in sourceItemIds for every suggestion.
- ${technique.prompt}
- Return ${technique.minimumOptions === 3 ? "exactly three materially different suggestions" : "one structured synthesis suggestion"}.
- Every suggestion must include a concise distinctiveLens, epistemicStatus, and evidenceIds.
- epistemicStatus must be brainstorming-not-evidence unless an exact researcher-approved evidence ID from the supplied context directly supports the wording. Use uncertain-needs-evidence when a possible empirical proposition needs checking.
- Never invent an empirical claim, citation, source, or evidence ID. A technique result cannot call itself evidence-backed without at least one exact approved evidence ID.
- Do not label an option best, recommended, correct, or most feasible. The researcher must edit the wording or record a rationale before any canvas option can be added.

Add these fields to every suggestion:
"distinctiveLens": "how this option differs from the others",
"epistemicStatus": "brainstorming-not-evidence|uncertain-needs-evidence|supported-by-approved-evidence",
"evidenceIds": ["exact approved evidence id only"]`;
}

function normalizedWords(value: string): Set<string> {
  const stop = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "in", "is", "it", "of", "on", "or", "that", "the", "their", "this", "to", "what", "which", "with"]);
  return new Set(value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter((item) => item.length > 2 && !stop.has(item)));
}

function suggestionContent(suggestion: ResearchMentorSuggestion): string {
  return suggestion.kind === "canvas-option" ? suggestion.proposedText : suggestion.recommendation;
}

function jaccardSimilarity(left: Set<string>, right: Set<string>): number {
  const intersection = [...left].filter((item) => right.has(item)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 1;
}

export function validateResearchMentorTechniqueResponse(
  parsed: ParsedResearchMentorResponse,
  run: ResearchMentorTechniqueRun,
  projectContext: MentorContextEnvelope,
): ResearchMentorTechniqueValidation {
  const technique = getResearchMentorTechnique(run.techniqueId);
  const sourceIds = new Set(run.sourceExcerpts.map((item) => item.itemId));
  const evidenceIds = new Set(projectContext.approvedEvidence.map((item) => item.id));
  const issues: string[] = [];
  const suggestions = parsed.suggestions.filter((suggestion) => {
    if (!suggestion.sourceItemIds.some((item) => sourceIds.has(item))) {
      issues.push(`${suggestion.id}:missing-selected-source-provenance`);
      return false;
    }
    if (!suggestion.distinctiveLens.trim()) {
      issues.push(`${suggestion.id}:missing-distinctive-lens`);
      return false;
    }
    if (suggestion.epistemicStatus === "supported-by-approved-evidence"
      && !suggestion.evidenceIds.some((item) => evidenceIds.has(item))) {
      issues.push(`${suggestion.id}:unsupported-evidence-status`);
      return false;
    }
    if (suggestion.evidenceIds.some((item) => !evidenceIds.has(item))) {
      issues.push(`${suggestion.id}:unknown-evidence-id`);
      return false;
    }
    return true;
  });
  const distinctLenses = new Set(suggestions.map((item) => item.distinctiveLens.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim()));
  const distinctOutputs = new Set(suggestions.map((item) => suggestionContent(item).toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim()));
  if (suggestions.length < technique.minimumOptions) issues.push(`insufficient-options:${suggestions.length}/${technique.minimumOptions}`);
  if (technique.minimumOptions === 3 && (distinctLenses.size < 3 || distinctOutputs.size < 3)) issues.push(`insufficient-divergence:${Math.min(distinctLenses.size, distinctOutputs.size)}/3`);
  if (technique.minimumOptions === 3) {
    const wordSets = suggestions.map((item) => normalizedWords(`${item.distinctiveLens} ${suggestionContent(item)}`));
    for (let left = 0; left < wordSets.length; left += 1) {
      for (let right = left + 1; right < wordSets.length; right += 1) {
        if (jaccardSimilarity(wordSets[left], wordSets[right]) > 0.82) issues.push(`near-duplicate-options:${left + 1}/${right + 1}`);
      }
    }
  }
  return { valid: issues.length === 0, issues, suggestions: suggestions.slice(0, technique.minimumOptions) };
}

export function researchMentorTechniqueApiMetadata(run: ResearchMentorTechniqueRun): ResearchMentorTechniqueApiMetadata {
  const technique = getResearchMentorTechnique(run.techniqueId);
  return {
    techniqueId: technique.id,
    techniqueLabel: technique.label,
    runChecksum: run.runChecksum,
    sourceExcerpts: run.sourceExcerpts,
    faithfulMirror: run.faithfulMirror,
    minimumOptions: technique.minimumOptions,
    output: technique.output,
    claim: run.claim,
  };
}

export function reviewResearchMentorTechniqueApplication(
  suggestion: ResearchMentorCanvasSuggestion,
  reviewedText: string,
  researcherRationale: string,
): ResearchMentorTechniqueApplicationReview {
  const text = safeText(reviewedText, 2_000);
  const rationale = safeText(researcherRationale, 1_000);
  const changed = text !== suggestion.proposedText.trim();
  const allowed = Boolean(text) && (changed || rationale.length >= 12);
  return {
    allowed,
    changed,
    rationale,
    suggestion: { ...suggestion, proposedText: text || suggestion.proposedText },
    reason: allowed
      ? changed
        ? "The researcher edited the proposed wording before adding it as a new alternative."
        : "The researcher recorded an explicit rationale before adding the unchanged wording as a new alternative."
      : "Edit the wording or record a short rationale before adding this technique result.",
  };
}
