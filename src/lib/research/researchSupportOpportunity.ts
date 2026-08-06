import { assessResearchPathwayReadiness } from "./researchPathwayBrief";
import type { ResearchPathwayDocument } from "./researchPathwayDocument";
import { PHASE2_STAGE_1_STEP_IDS } from "./researchPathwayPhase2Model";

export const RESEARCH_SUPPORT_SCHEMA_VERSION = 1 as const;
export const RESEARCH_SUPPORT_COOLDOWN_MS = 24 * 60 * 60 * 1_000;
export const RESEARCH_SUPPORT_CORRECTION_COOLDOWN_MS = 7 * RESEARCH_SUPPORT_COOLDOWN_MS;

export type ResearchSupportMode = "gentle" | "on-request" | "focus";
export type ResearchSupportBreakpointKind = "project-return" | "field-blur" | "save" | "step-navigation";
export type ResearchSupportSignalId =
  | "navigation-loop"
  | "multiple-open-paths"
  | "revision-loop"
  | "route-contradiction"
  | "returning-to-unfinished-work"
  | "explicit-friction-language"
  | "unfinished-pause";
export type ResearchSupportCategory =
  | "uncertain-next-action"
  | "too-many-unresolved-paths"
  | "revision-loop"
  | "contradiction-review"
  | "returning-to-unfinished-work";

export interface ResearchSupportBreakpoint {
  sequence: number;
  kind: ResearchSupportBreakpointKind;
  stepId: string;
  at: number;
}

export interface ResearchSupportSignal {
  id: ResearchSupportSignalId;
  strength: "task-relevant" | "weak";
  activityAware: boolean;
  title: string;
  detail: string;
}

export interface ResearchSupportOpportunity {
  id: string;
  category: ResearchSupportCategory;
  stepId: string;
  title: string;
  detail: string;
  suggestedPrompt: string;
  signals: ResearchSupportSignal[];
  createdAt: string;
  breakpoint: ResearchSupportBreakpointKind;
  minimumStrongSignalsMet: true;
  rawSignalHistoryIncluded: false;
  claim: "task-friction-opportunity-not-psychological-or-clinical-inference";
}

interface ResearchSupportStepSnapshot {
  pathwayChecksum: string;
  itemCount: number;
  populatedCount: number;
  totalCharacters: number;
}

export interface ResearchSupportActivityState {
  schemaVersion: typeof RESEARCH_SUPPORT_SCHEMA_VERSION;
  projectId: string;
  recentStepVisits: string[];
  revisionBreakpointsByStep: Record<string, number>;
  structuralCyclesByStep: Record<string, number>;
  lastStructuralDirectionByStep: Record<string, -1 | 0 | 1>;
  snapshotsByStep: Record<string, ResearchSupportStepSnapshot>;
  returningToUnfinishedWork: boolean;
  sessionOnly: true;
  rawContentStored: false;
  uploaded: false;
}

export interface ResearchSupportPreferences {
  schemaVersion: typeof RESEARCH_SUPPORT_SCHEMA_VERSION;
  projectId: string;
  mode: ResearchSupportMode;
  suppressedCategories: ResearchSupportCategory[];
  cooldowns: Array<{ category: ResearchSupportCategory; until: string }>;
  lastSession: {
    recordedAt: string;
    stepId: string;
    stepReady: boolean;
    pathwayChecksum: string;
  } | null;
  rawSignalHistoryStored: false;
  uploaded: false;
}

const STORAGE_PREFIX = "cerise:research-support:v1";
const PROJECT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const CATEGORY_SET = new Set<ResearchSupportCategory>([
  "uncertain-next-action",
  "too-many-unresolved-paths",
  "revision-loop",
  "contradiction-review",
  "returning-to-unfinished-work",
]);
const STEP_SET = new Set<string>(PHASE2_STAGE_1_STEP_IDS);
const EXPLICIT_FRICTION_PATTERN = /\b(?:i(?:'m| am) stuck|i(?:'m| am) overwhelmed|i (?:do not|don't) know what to do next|i can(?:not|'t) decide|not sure where to start|unsure what to do next)\b/i;

function active(status: string): boolean {
  return status !== "parked" && status !== "rejected";
}

function safeIso(value: unknown): string | null {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function stepReady(document: ResearchPathwayDocument, stepId: string): boolean {
  return assessResearchPathwayReadiness(document).steps.find((item) => item.stepId === stepId)?.status === "ready";
}

function textLength(values: readonly string[]): number {
  return values.reduce((total, value) => total + value.trim().length, 0);
}

function stepSnapshot(document: ResearchPathwayDocument, stepId: string): ResearchSupportStepSnapshot {
  if (stepId === PHASE2_STAGE_1_STEP_IDS[0]) {
    const items = document.ideas.filter((item) => active(item.status));
    return {
      pathwayChecksum: document.identity.checksum,
      itemCount: items.length,
      populatedCount: items.filter((item) => item.text.trim()).length,
      totalCharacters: textLength(items.flatMap((item) => [item.text, item.affectedContext, item.whyItMatters])),
    };
  }
  if (stepId === PHASE2_STAGE_1_STEP_IDS[1]) {
    const items = document.problemFrames.filter((item) => active(item.status));
    return {
      pathwayChecksum: document.identity.checksum,
      itemCount: items.length,
      populatedCount: items.filter((item) => item.title.trim() || item.situation.trim()).length,
      totalCharacters: textLength(items.flatMap((item) => [item.title, item.situation, item.affected, item.consequence, item.uncertainty, item.observedBasis, item.interpretation, item.assumptions, item.alternativeExplanations])),
    };
  }
  if (stepId === PHASE2_STAGE_1_STEP_IDS[2]) {
    const items = document.baselineEntries.filter((item) => active(item.status));
    return {
      pathwayChecksum: document.identity.checksum,
      itemCount: items.length,
      populatedCount: items.filter((item) => [item.known, item.contested, item.missing, item.assumed].some((value) => value.trim())).length,
      totalCharacters: textLength(items.flatMap((item) => [item.known, item.contested, item.missing, item.assumed, item.searchTerms, item.adjacentDisciplines, item.missingVoices])),
    };
  }
  if (stepId === PHASE2_STAGE_1_STEP_IDS[3]) {
    const items = document.questionCandidates.filter((item) => active(item.status));
    return {
      pathwayChecksum: document.identity.checksum,
      itemCount: items.length,
      populatedCount: items.filter((item) => item.text.trim()).length,
      totalCharacters: textLength(items.flatMap((item) => [item.text, item.scope.populationOrSource, item.scope.setting, item.scope.constructOrPhenomenon, item.scope.timeframe, item.scope.comparison, item.scope.evidenceAccess, item.comparisonNotes])),
    };
  }
  return {
    pathwayChecksum: document.identity.checksum,
    itemCount: document.decision.selectedProblemFrameIds.length + document.decision.selectedQuestionIds.length,
    populatedCount: Number(Boolean(document.decision.rationale.trim())) + document.decision.selectedQuestionIds.length,
    totalCharacters: textLength([document.decision.rationale, ...document.decision.unresolvedQuestions]),
  };
}

function allResearcherText(document: ResearchPathwayDocument): string {
  return [
    ...document.ideas.flatMap((item) => [item.text, item.affectedContext, item.whyItMatters]),
    ...document.problemFrames.flatMap((item) => [item.title, item.situation, item.affected, item.consequence, item.uncertainty, item.observedBasis, item.interpretation, item.assumptions, item.alternativeExplanations]),
    ...document.baselineEntries.flatMap((item) => [item.known, item.contested, item.missing, item.assumed, item.searchTerms, item.adjacentDisciplines, item.missingVoices]),
    ...document.questionCandidates.flatMap((item) => [item.text, item.comparisonNotes, ...Object.values(item.scope)]),
    document.decision.rationale,
    ...document.decision.unresolvedQuestions,
  ].join("\n").slice(0, 100_000);
}

function navigationLoop(recentSteps: readonly string[]): boolean {
  const recent = recentSteps.slice(-6);
  if (recent.length < 4 || new Set(recent).size < 2) return false;
  let transitions = 0;
  for (let index = 1; index < recent.length; index += 1) {
    if (recent[index] !== recent[index - 1]) transitions += 1;
  }
  const revisitCounts = new Map<string, number>();
  recent.forEach((stepId) => revisitCounts.set(stepId, (revisitCounts.get(stepId) ?? 0) + 1));
  return transitions >= 3 && [...revisitCounts.values()].some((count) => count >= 2);
}

function contentPathSignal(document: ResearchPathwayDocument, stepId: string): ResearchSupportSignal | null {
  if (stepId === PHASE2_STAGE_1_STEP_IDS[0]) {
    const ideas = document.ideas.filter((item) => active(item.status) && item.text.trim());
    if (ideas.length >= 5 && !ideas.some((item) => item.status === "promising" || item.status === "selected")) {
      return { id: "multiple-open-paths", strength: "task-relevant", activityAware: false, title: "Several idea paths remain open", detail: "Five or more active ideas are present without a promising or selected direction." };
    }
  }
  if (stepId === PHASE2_STAGE_1_STEP_IDS[1]) {
    const frames = document.problemFrames.filter((item) => active(item.status) && (item.title.trim() || item.situation.trim()));
    if (frames.length >= 3 && !frames.some((item) => item.status === "selected")) {
      return { id: "multiple-open-paths", strength: "task-relevant", activityAware: false, title: "Several problem frames remain open", detail: "Three or more developed frames are active and none is selected." };
    }
  }
  if (stepId === PHASE2_STAGE_1_STEP_IDS[2]) {
    const missing = document.baselineEntries.filter((item) => active(item.status) && item.missing.trim());
    if (missing.length >= 2 && !missing.some((item) => item.searchTerms.trim())) {
      return { id: "multiple-open-paths", strength: "task-relevant", activityAware: false, title: "Several evidence gaps remain open", detail: "Multiple missing-evidence notes are present without search language yet." };
    }
  }
  if (stepId === PHASE2_STAGE_1_STEP_IDS[3]) {
    const questions = document.questionCandidates.filter((item) => active(item.status) && item.text.trim());
    if (questions.length >= 3 && !questions.some((item) => item.status === "selected")) {
      return { id: "multiple-open-paths", strength: "task-relevant", activityAware: false, title: "Several question paths remain open", detail: "Three or more candidate questions are active and none is selected." };
    }
  }
  if (stepId === PHASE2_STAGE_1_STEP_IDS[4] && document.decision.unresolvedQuestions.filter((item) => item.trim()).length >= 2) {
    return { id: "multiple-open-paths", strength: "task-relevant", activityAware: false, title: "Several pathway decisions remain open", detail: "The provisional pathway still records multiple unresolved questions." };
  }
  return null;
}

function categoryFor(signals: readonly ResearchSupportSignal[]): ResearchSupportCategory {
  const ids = new Set(signals.map((item) => item.id));
  if (ids.has("route-contradiction")) return "contradiction-review";
  if (ids.has("revision-loop")) return "revision-loop";
  if (ids.has("multiple-open-paths")) return "too-many-unresolved-paths";
  if (ids.has("returning-to-unfinished-work")) return "returning-to-unfinished-work";
  return "uncertain-next-action";
}

const OPPORTUNITY_COPY: Readonly<Record<ResearchSupportCategory, { title: string; detail: string; prompt: string }>> = {
  "uncertain-next-action": {
    title: "Would one small next step help?",
    detail: "More than one task signal suggests that the next research move is still open. This is optional support, not a judgment about you or your work.",
    prompt: "Help me identify one small next action from the current project context without choosing the research direction for me.",
  },
  "too-many-unresolved-paths": {
    title: "Several research paths are still open",
    detail: "The current canvas and recent work pattern suggest that a comparison may be useful. Cerise will not rank a path without your criteria.",
    prompt: "Help me compare the currently open research paths using criteria I choose, without selecting one for me.",
  },
  "revision-loop": {
    title: "Would a different view of this revision help?",
    detail: "The same unfinished area has changed across several natural breakpoints. Cerise can mirror the alternatives without treating revision as failure.",
    prompt: "Mirror how this research direction has been changing and help me name the decision that remains open.",
  },
  "contradiction-review": {
    title: "A route contradiction may need review",
    detail: "A recorded route choice conflicts with another current decision, alongside a second task signal. The researcher remains responsible for resolving it.",
    prompt: "Help me inspect the current route contradiction and its tradeoffs without changing or approving the pathway.",
  },
  "returning-to-unfinished-work": {
    title: "Would a short re-entry step help?",
    detail: "This project returned to an unfinished Stage 1 decision and another task signal is also present. Cerise can summarize the open choice without inventing a problem.",
    prompt: "Help me re-enter this unfinished Stage 1 decision by summarizing what is recorded and suggesting one researcher-owned next step.",
  },
};

export function createResearchSupportActivity(projectId: string): ResearchSupportActivityState {
  if (!PROJECT_ID_PATTERN.test(projectId)) throw new Error("Research support project ID is invalid.");
  return {
    schemaVersion: RESEARCH_SUPPORT_SCHEMA_VERSION,
    projectId,
    recentStepVisits: [],
    revisionBreakpointsByStep: {},
    structuralCyclesByStep: {},
    lastStructuralDirectionByStep: {},
    snapshotsByStep: {},
    returningToUnfinishedWork: false,
    sessionOnly: true,
    rawContentStored: false,
    uploaded: false,
  };
}

export function recordResearchSupportBreakpoint(
  current: ResearchSupportActivityState,
  breakpoint: ResearchSupportBreakpoint,
  document: ResearchPathwayDocument,
  returningToUnfinishedWork = false,
): ResearchSupportActivityState {
  if (current.projectId !== document.projectId || !STEP_SET.has(breakpoint.stepId) || !Number.isSafeInteger(breakpoint.sequence) || !Number.isFinite(breakpoint.at)) return current;
  const snapshot = stepSnapshot(document, breakpoint.stepId);
  const previous = current.snapshotsByStep[breakpoint.stepId];
  const revisionBreakpointsByStep = { ...current.revisionBreakpointsByStep };
  const structuralCyclesByStep = { ...current.structuralCyclesByStep };
  const lastStructuralDirectionByStep = { ...current.lastStructuralDirectionByStep };

  if (previous && previous.pathwayChecksum !== snapshot.pathwayChecksum && (breakpoint.kind === "field-blur" || breakpoint.kind === "save")) {
    const direction = Math.sign(snapshot.itemCount - previous.itemCount) as -1 | 0 | 1;
    const substantialRewrite = direction === 0 && Math.abs(snapshot.totalCharacters - previous.totalCharacters) >= 12;
    if (substantialRewrite) revisionBreakpointsByStep[breakpoint.stepId] = Math.min(20, (revisionBreakpointsByStep[breakpoint.stepId] ?? 0) + 1);
    if (direction !== 0) {
      const lastDirection = lastStructuralDirectionByStep[breakpoint.stepId] ?? 0;
      if (lastDirection !== 0 && lastDirection !== direction) structuralCyclesByStep[breakpoint.stepId] = Math.min(20, (structuralCyclesByStep[breakpoint.stepId] ?? 0) + 1);
      lastStructuralDirectionByStep[breakpoint.stepId] = direction;
    }
  }

  const recentStepVisits = breakpoint.kind === "step-navigation" || breakpoint.kind === "project-return"
    ? [...current.recentStepVisits, breakpoint.stepId].slice(-12)
    : current.recentStepVisits;
  return {
    ...current,
    recentStepVisits,
    revisionBreakpointsByStep,
    structuralCyclesByStep,
    lastStructuralDirectionByStep,
    snapshotsByStep: { ...current.snapshotsByStep, [breakpoint.stepId]: snapshot },
    returningToUnfinishedWork: current.returningToUnfinishedWork || returningToUnfinishedWork,
  };
}

export function createResearchSupportPreferences(projectId: string): ResearchSupportPreferences {
  if (!PROJECT_ID_PATTERN.test(projectId)) throw new Error("Research support project ID is invalid.");
  return { schemaVersion: RESEARCH_SUPPORT_SCHEMA_VERSION, projectId, mode: "gentle", suppressedCategories: [], cooldowns: [], lastSession: null, rawSignalHistoryStored: false, uploaded: false };
}

export function researchSupportStorageKey(projectId: string): string {
  if (!PROJECT_ID_PATTERN.test(projectId)) throw new Error("Research support project ID is invalid.");
  return `${STORAGE_PREFIX}:${projectId}`;
}

export function loadResearchSupportPreferences(storage: Storage, projectId: string, now = Date.now()): ResearchSupportPreferences {
  const fallback = createResearchSupportPreferences(projectId);
  try {
    const value: unknown = JSON.parse(storage.getItem(researchSupportStorageKey(projectId)) ?? "null");
    if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
    const candidate = value as Partial<ResearchSupportPreferences>;
    if (candidate.schemaVersion !== RESEARCH_SUPPORT_SCHEMA_VERSION || candidate.projectId !== projectId || candidate.rawSignalHistoryStored !== false || candidate.uploaded !== false) return fallback;
    const mode = ["gentle", "on-request", "focus"].includes(String(candidate.mode)) ? candidate.mode as ResearchSupportMode : "gentle";
    const suppressedCategories = Array.isArray(candidate.suppressedCategories)
      ? [...new Set(candidate.suppressedCategories.filter((item): item is ResearchSupportCategory => CATEGORY_SET.has(item as ResearchSupportCategory)))].slice(0, CATEGORY_SET.size)
      : [];
    const cooldowns = Array.isArray(candidate.cooldowns) ? candidate.cooldowns.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const entry = item as { category?: unknown; until?: unknown };
      const until = safeIso(entry.until);
      if (!CATEGORY_SET.has(entry.category as ResearchSupportCategory) || !until || Date.parse(until) <= now) return [];
      return [{ category: entry.category as ResearchSupportCategory, until }];
    }).slice(0, CATEGORY_SET.size) : [];
    let lastSession: ResearchSupportPreferences["lastSession"] = null;
    if (candidate.lastSession && typeof candidate.lastSession === "object" && !Array.isArray(candidate.lastSession)) {
      const marker = candidate.lastSession;
      const recordedAt = safeIso(marker.recordedAt);
      if (recordedAt && STEP_SET.has(String(marker.stepId)) && typeof marker.stepReady === "boolean" && typeof marker.pathwayChecksum === "string" && marker.pathwayChecksum.length <= 160) {
        lastSession = { recordedAt, stepId: String(marker.stepId), stepReady: marker.stepReady, pathwayChecksum: marker.pathwayChecksum };
      }
    }
    return { ...fallback, mode, suppressedCategories, cooldowns, lastSession };
  } catch {
    return fallback;
  }
}

export function saveResearchSupportPreferences(storage: Storage, preferences: ResearchSupportPreferences): void {
  storage.setItem(researchSupportStorageKey(preferences.projectId), JSON.stringify(preferences));
}

export function updateResearchSupportMode(preferences: ResearchSupportPreferences, mode: ResearchSupportMode): ResearchSupportPreferences {
  return { ...preferences, mode };
}

export function cooldownResearchSupportCategory(preferences: ResearchSupportPreferences, category: ResearchSupportCategory, now = Date.now(), duration = RESEARCH_SUPPORT_COOLDOWN_MS): ResearchSupportPreferences {
  return { ...preferences, cooldowns: [...preferences.cooldowns.filter((item) => item.category !== category), { category, until: new Date(now + duration).toISOString() }] };
}

export function suppressResearchSupportCategory(preferences: ResearchSupportPreferences, category: ResearchSupportCategory): ResearchSupportPreferences {
  return { ...preferences, suppressedCategories: [...new Set([...preferences.suppressedCategories, category])], cooldowns: preferences.cooldowns.filter((item) => item.category !== category) };
}

export function restoreResearchSupportCategory(preferences: ResearchSupportPreferences, category: ResearchSupportCategory): ResearchSupportPreferences {
  return { ...preferences, suppressedCategories: preferences.suppressedCategories.filter((item) => item !== category), cooldowns: preferences.cooldowns.filter((item) => item.category !== category) };
}

export function recordResearchSupportSession(preferences: ResearchSupportPreferences, document: ResearchPathwayDocument, stepId: string, at = Date.now()): ResearchSupportPreferences {
  if (!STEP_SET.has(stepId) || preferences.projectId !== document.projectId) return preferences;
  return { ...preferences, lastSession: { recordedAt: new Date(at).toISOString(), stepId, stepReady: stepReady(document, stepId), pathwayChecksum: document.identity.checksum } };
}

export function isReturningToUnfinishedResearch(preferences: ResearchSupportPreferences, document: ResearchPathwayDocument, stepId: string, at = Date.now()): boolean {
  const marker = preferences.lastSession;
  if (!marker || marker.stepReady || !STEP_SET.has(stepId) || preferences.projectId !== document.projectId) return false;
  const elapsed = at - Date.parse(marker.recordedAt);
  return elapsed >= 15 * 60 * 1_000 && elapsed <= 120 * 24 * 60 * 60 * 1_000;
}

export function deriveResearchSupportSignals(input: {
  document: ResearchPathwayDocument;
  stepId: string;
  activity: ResearchSupportActivityState;
  idleSeconds?: number;
  editCount?: number;
}): ResearchSupportSignal[] {
  if (!STEP_SET.has(input.stepId) || input.document.projectId !== input.activity.projectId || stepReady(input.document, input.stepId)) return [];
  const signals: ResearchSupportSignal[] = [];
  const contentSignal = contentPathSignal(input.document, input.stepId);
  if (contentSignal) signals.push(contentSignal);
  if (navigationLoop(input.activity.recentStepVisits)) signals.push({ id: "navigation-loop", strength: "task-relevant", activityAware: true, title: "The same unfinished steps have been revisited", detail: "Recent navigation moved repeatedly between at least two unfinished Stage 1 steps." });
  if ((input.activity.revisionBreakpointsByStep[input.stepId] ?? 0) >= 3 || (input.activity.structuralCyclesByStep[input.stepId] ?? 0) >= 2) signals.push({ id: "revision-loop", strength: "task-relevant", activityAware: true, title: "The same area has changed several times", detail: "Several revisions or add-remove cycles occurred across separate natural breakpoints." });
  const readiness = assessResearchPathwayReadiness(input.document).steps.find((item) => item.stepId === input.stepId);
  if (readiness?.conditions.some((item) => item.id === "route-consistent" && !item.met)) signals.push({ id: "route-contradiction", strength: "task-relevant", activityAware: false, title: "Current route choices conflict", detail: "The deterministic pathway readiness check found incompatible route decisions." });
  if (input.activity.returningToUnfinishedWork) signals.push({ id: "returning-to-unfinished-work", strength: "task-relevant", activityAware: true, title: "This unfinished decision was reopened", detail: "The project returned to the same unfinished step after a separate work session." });
  if (EXPLICIT_FRICTION_PATTERN.test(allResearcherText(input.document))) signals.push({ id: "explicit-friction-language", strength: "task-relevant", activityAware: true, title: "The researcher explicitly asked for help moving forward", detail: "Researcher-authored project text contains an explicit request for help with the next decision; the wording itself is not retained in signal history." });
  if ((input.idleSeconds ?? 0) >= 120 && (input.editCount ?? 0) >= 2) signals.push({ id: "unfinished-pause", strength: "weak", activityAware: false, title: "The unfinished canvas has been quiet", detail: "A pause may be reflection. It never qualifies support by itself and does not count toward the two-signal threshold." });
  return [...new Map(signals.map((item) => [item.id, item])).values()];
}

export function deriveResearchSupportOpportunity(input: {
  document: ResearchPathwayDocument;
  stepId: string;
  activity: ResearchSupportActivityState;
  preferences: ResearchSupportPreferences;
  breakpoint: ResearchSupportBreakpoint;
  idleSeconds?: number;
  editCount?: number;
}): ResearchSupportOpportunity | null {
  if (input.preferences.mode !== "gentle" || input.breakpoint.stepId !== input.stepId || input.document.projectId !== input.preferences.projectId) return null;
  const signals = deriveResearchSupportSignals(input);
  const strong = signals.filter((item) => item.strength === "task-relevant");
  if (strong.length < 2 || !strong.some((item) => item.activityAware)) return null;
  const category = categoryFor(strong);
  if (input.preferences.suppressedCategories.includes(category)) return null;
  if (input.preferences.cooldowns.some((item) => item.category === category && Date.parse(item.until) > input.breakpoint.at)) return null;
  const copy = OPPORTUNITY_COPY[category];
  return {
    id: `support:${category}:${input.stepId}:${strong.map((item) => item.id).sort().join("+")}`,
    category,
    stepId: input.stepId,
    title: copy.title,
    detail: copy.detail,
    suggestedPrompt: copy.prompt,
    signals,
    createdAt: new Date(input.breakpoint.at).toISOString(),
    breakpoint: input.breakpoint.kind,
    minimumStrongSignalsMet: true,
    rawSignalHistoryIncluded: false,
    claim: "task-friction-opportunity-not-psychological-or-clinical-inference",
  };
}
