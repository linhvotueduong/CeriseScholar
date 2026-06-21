import type { DashboardPaceMode } from "@/lib/dashboard/targetPace";
import { computeSectionProgress, type AiQualitySignals } from "@/lib/dashboard/sectionProgress";

/**
 * Today's Target — unified 1000-point work-point model.
 *
 * INTERNAL precision: a project is measured on a 1000-point scale (1000 = 100%).
 * The UI always DISPLAYS normal 0-100% (completedPercent = completedPoints / 10).
 * "1000% dedication" is motivational copy only — never shown as a completion value.
 *
 * Sizing is project-type-aware: each type sets which sections matter (weights that
 * sum to 1000), the target counts inside each section, and the default deadline.
 * Scope (quality/complexity/expected sources/pages, meta required) adjusts the
 * section TARGETS and deadline pressure — it never changes the 1000-point total.
 *
 * Cerise Scholar readiness is intentionally NOT a completion section — it can affect
 * recommendation confidence elsewhere, but must never make a project look more complete.
 *
 * Pure and deterministic (dates injected). See todayTargetModel.test.ts.
 */

export const TOTAL_PROJECT_POINTS = 1000;

// ---------------------------------------------------------------------------
// Project types, weights, targets
// ---------------------------------------------------------------------------

export type ProjectType =
  | "class-paper"
  | "short-research-brief"
  | "literature-review"
  | "thesis-chapter"
  | "dissertation-section"
  | "meta-analysis"
  | "grant-proposal"
  | "professional-research-brief"
  | "publication-manuscript"
  | "personal-research-project";

export const DEFAULT_PROJECT_TYPE: ProjectType = "personal-research-project";

/** Human labels for the Target Settings project-type control. */
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  "class-paper": "Class paper",
  "short-research-brief": "Short research brief",
  "literature-review": "Literature review",
  "thesis-chapter": "Thesis chapter",
  "dissertation-section": "Dissertation section",
  "meta-analysis": "Meta-analysis",
  "grant-proposal": "Grant / proposal",
  "professional-research-brief": "Professional research brief",
  "publication-manuscript": "Publication manuscript",
  "personal-research-project": "Personal research project",
};

export const PROJECT_TYPE_ORDER: ProjectType[] = [
  "class-paper",
  "short-research-brief",
  "literature-review",
  "thesis-chapter",
  "dissertation-section",
  "meta-analysis",
  "grant-proposal",
  "professional-research-brief",
  "publication-manuscript",
  "personal-research-project",
];

/** Section point budgets — MUST sum to 1000 per type. metaAnalysis 0 = not relevant. */
export type SectionWeights = {
  metaAnalysis: number;
  literatureReview: number;
  workspaceSynthesis: number;
  paperDraft: number;
  citations: number;
};

export type SectionTargets = {
  sourcesTarget: number;
  literatureRowsTarget: number;
  notesTarget: number;
  synthesisUnitsTarget: number;
  draftSectionsTarget: number;
  citationsTarget: number;
  metaItemsTarget: number;
};

export type ProjectTypeModel = {
  defaultDays: number;
  weights: SectionWeights;
  targets: SectionTargets;
};

export const PROJECT_TYPE_MODELS: Record<ProjectType, ProjectTypeModel> = {
  "class-paper": {
    defaultDays: 14,
    weights: { literatureReview: 250, workspaceSynthesis: 150, paperDraft: 400, citations: 200, metaAnalysis: 0 },
    targets: { sourcesTarget: 8, literatureRowsTarget: 12, notesTarget: 8, synthesisUnitsTarget: 4, draftSectionsTarget: 4, citationsTarget: 8, metaItemsTarget: 0 },
  },
  "short-research-brief": {
    defaultDays: 7,
    weights: { literatureReview: 200, workspaceSynthesis: 250, paperDraft: 350, citations: 200, metaAnalysis: 0 },
    targets: { sourcesTarget: 6, literatureRowsTarget: 8, notesTarget: 6, synthesisUnitsTarget: 4, draftSectionsTarget: 3, citationsTarget: 6, metaItemsTarget: 0 },
  },
  "literature-review": {
    defaultDays: 30,
    weights: { literatureReview: 400, workspaceSynthesis: 250, paperDraft: 150, citations: 200, metaAnalysis: 0 },
    targets: { sourcesTarget: 25, literatureRowsTarget: 40, notesTarget: 25, synthesisUnitsTarget: 10, draftSectionsTarget: 3, citationsTarget: 25, metaItemsTarget: 0 },
  },
  "thesis-chapter": {
    defaultDays: 60,
    weights: { literatureReview: 300, workspaceSynthesis: 200, paperDraft: 300, citations: 200, metaAnalysis: 0 },
    targets: { sourcesTarget: 50, literatureRowsTarget: 70, notesTarget: 40, synthesisUnitsTarget: 15, draftSectionsTarget: 6, citationsTarget: 50, metaItemsTarget: 0 },
  },
  "dissertation-section": {
    defaultDays: 90,
    weights: { literatureReview: 300, workspaceSynthesis: 250, paperDraft: 250, citations: 200, metaAnalysis: 0 },
    targets: { sourcesTarget: 80, literatureRowsTarget: 120, notesTarget: 70, synthesisUnitsTarget: 25, draftSectionsTarget: 8, citationsTarget: 80, metaItemsTarget: 0 },
  },
  "meta-analysis": {
    defaultDays: 90,
    weights: { metaAnalysis: 350, literatureReview: 300, workspaceSynthesis: 150, paperDraft: 100, citations: 100 },
    targets: { sourcesTarget: 60, literatureRowsTarget: 80, notesTarget: 40, synthesisUnitsTarget: 12, draftSectionsTarget: 4, citationsTarget: 60, metaItemsTarget: 20 },
  },
  "grant-proposal": {
    defaultDays: 21,
    weights: { literatureReview: 200, workspaceSynthesis: 250, paperDraft: 350, citations: 200, metaAnalysis: 0 },
    targets: { sourcesTarget: 15, literatureRowsTarget: 20, notesTarget: 12, synthesisUnitsTarget: 8, draftSectionsTarget: 6, citationsTarget: 15, metaItemsTarget: 0 },
  },
  "professional-research-brief": {
    defaultDays: 14,
    weights: { literatureReview: 250, workspaceSynthesis: 300, paperDraft: 300, citations: 150, metaAnalysis: 0 },
    targets: { sourcesTarget: 12, literatureRowsTarget: 18, notesTarget: 12, synthesisUnitsTarget: 8, draftSectionsTarget: 4, citationsTarget: 12, metaItemsTarget: 0 },
  },
  "publication-manuscript": {
    defaultDays: 120,
    weights: { literatureReview: 250, workspaceSynthesis: 200, paperDraft: 300, citations: 200, metaAnalysis: 50 },
    targets: { sourcesTarget: 100, literatureRowsTarget: 140, notesTarget: 80, synthesisUnitsTarget: 30, draftSectionsTarget: 10, citationsTarget: 100, metaItemsTarget: 5 },
  },
  "personal-research-project": {
    defaultDays: 30,
    weights: { literatureReview: 250, workspaceSynthesis: 300, paperDraft: 250, citations: 150, metaAnalysis: 50 },
    targets: { sourcesTarget: 20, literatureRowsTarget: 25, notesTarget: 20, synthesisUnitsTarget: 10, draftSectionsTarget: 4, citationsTarget: 15, metaItemsTarget: 3 },
  },
};

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

export type ProjectQuality = "school" | "professional" | "publication";
export type ProjectComplexity = "simple" | "standard" | "complex";

export type ProjectScope = {
  expectedSources: number | null;
  expectedPagesOrSections: number | null;
  quality: ProjectQuality;
  complexity: ProjectComplexity;
  metaAnalysisRequired: boolean;
};

export const DEFAULT_PROJECT_SCOPE: ProjectScope = {
  expectedSources: null,
  expectedPagesOrSections: null,
  quality: "professional",
  complexity: "standard",
  metaAnalysisRequired: false,
};

const QUALITY_MULTIPLIERS: Record<ProjectQuality, number> = {
  school: 0.85,
  professional: 1.0,
  publication: 1.25,
};

const COMPLEXITY_MULTIPLIERS: Record<ProjectComplexity, number> = {
  simple: 0.85,
  standard: 1.0,
  complex: 1.25,
};

/** Pace -> finish-pressure multiplier (lower = finish earlier). */
export const PACE_MULTIPLIERS: Record<DashboardPaceMode, number> = {
  low: 1.0,
  moderate: 0.9,
  high: 0.8,
};

/** Most work points a user at each pace is expected to sustain per day (= % x 10). */
export const MAX_DAILY_POINTS_BY_PACE: Record<DashboardPaceMode, number> = {
  low: 80,
  moderate: 120,
  high: 180,
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/** Adjust the section targets for scope. Total project points stay 1000. */
export function computeAdjustedTargets(projectType: ProjectType, scope: ProjectScope): SectionTargets {
  const base = (PROJECT_TYPE_MODELS[projectType] ?? PROJECT_TYPE_MODELS[DEFAULT_PROJECT_TYPE]).targets;
  const quality = QUALITY_MULTIPLIERS[scope.quality] ?? 1;
  const complexity = COMPLEXITY_MULTIPLIERS[scope.complexity] ?? 1;
  const source =
    scope.expectedSources != null && base.sourcesTarget > 0
      ? clamp(scope.expectedSources / base.sourcesTarget, 0.6, 1.8)
      : 1;
  const page =
    scope.expectedPagesOrSections != null && base.draftSectionsTarget > 0
      ? clamp(scope.expectedPagesOrSections / base.draftSectionsTarget, 0.7, 1.6)
      : 1;
  const metaRelevant = scope.metaAnalysisRequired || projectType === "meta-analysis";

  return {
    sourcesTarget: Math.max(1, Math.round(base.sourcesTarget * source * quality)),
    literatureRowsTarget: Math.max(1, Math.round(base.literatureRowsTarget * source * complexity)),
    notesTarget: Math.max(1, Math.round(base.notesTarget * source * quality)),
    synthesisUnitsTarget: Math.max(1, Math.round(base.synthesisUnitsTarget * complexity * quality)),
    draftSectionsTarget: Math.max(1, Math.round(base.draftSectionsTarget * page * quality)),
    citationsTarget: Math.max(1, Math.round(base.citationsTarget * source * quality)),
    metaItemsTarget: metaRelevant ? Math.max(0, Math.round(base.metaItemsTarget * complexity * quality)) : 0,
  };
}

// ---------------------------------------------------------------------------
// Research counts -> section scores -> completed points
// ---------------------------------------------------------------------------

/**
 * Real research counts that feed the capped section-progress model. Some fields are
 * best-available proxies (revised / evidence-supported / cited sections, reference
 * links) until richer signals exist. See sectionProgress.ts for the scoring + caps.
 */
export type ResearchCounts = {
  // Sources — uploadedSources is intake (activity); engagedSources have real evidence.
  uploadedSources: number;
  engagedSources: number;
  // Literature Review (meaningful-gated)
  literatureRows: number;
  codedRows: number;
  rowsWithNotes: number; // rows with MEANINGFUL, source-linked notes
  rowsWithEvidenceFields: number; // rows with any usable evidence (note/synthesis/code+theme)
  rowsWithCitationLinks: number;
  synthesisUnits: number; // MEANINGFUL synthesis paragraphs
  // Workspace / Synthesis (meaningful-gated)
  highlights: number;
  notes: number; // MEANINGFUL, source-linked notes
  themeCount: number;
  // Paper Draft
  outlineSections: number;
  draftSections: number;
  meaningfulLengthSections: number;
  evidenceSupportedSections: number;
  citedSections: number;
  revisedSections: number;
  // Citations
  referencesCount: number;
  citationsWithMetadata: number;
  apaReadyReferences: number;
  referencesLinkedToRows: number;
  duplicateIssues: number;
  // Meta-analysis
  metaQuestionSet: boolean;
  metaHypothesisSet: boolean;
  metaTestSelected: boolean;
  effectsMapped: number;
  forestPlotReady: boolean;
};

export type SectionScores = {
  metaAnalysisScore: number;
  literatureReviewScore: number;
  workspaceSynthesisScore: number;
  paperDraftScore: number;
  citationScore: number;
};

/** All-zero research counts — useful for previews/tests before data loads. */
export const EMPTY_RESEARCH_COUNTS: ResearchCounts = {
  uploadedSources: 0,
  engagedSources: 0,
  literatureRows: 0,
  codedRows: 0,
  rowsWithNotes: 0,
  rowsWithEvidenceFields: 0,
  rowsWithCitationLinks: 0,
  synthesisUnits: 0,
  highlights: 0,
  notes: 0,
  themeCount: 0,
  outlineSections: 0,
  draftSections: 0,
  meaningfulLengthSections: 0,
  evidenceSupportedSections: 0,
  citedSections: 0,
  revisedSections: 0,
  referencesCount: 0,
  citationsWithMetadata: 0,
  apaReadyReferences: 0,
  referencesLinkedToRows: 0,
  duplicateIssues: 0,
  metaQuestionSet: false,
  metaHypothesisSet: false,
  metaTestSelected: false,
  effectsMapped: 0,
  forestPlotReady: false,
};

/** completedPoints = sum(sectionScore x sectionWeight), clamped to [0, 1000]. */
export function computeCompletedPoints(scores: SectionScores, weights: SectionWeights): number {
  const points =
    scores.metaAnalysisScore * weights.metaAnalysis +
    scores.literatureReviewScore * weights.literatureReview +
    scores.workspaceSynthesisScore * weights.workspaceSynthesis +
    scores.paperDraftScore * weights.paperDraft +
    scores.citationScore * weights.citations;
  return clamp(points, 0, TOTAL_PROJECT_POINTS);
}

// ---------------------------------------------------------------------------
// Today's Target model
// ---------------------------------------------------------------------------

export type TodayTargetStatus =
  | "complete"
  | "deadline_at_risk"
  | "at_risk"
  | "on_track"
  | "in_progress";

export type TodayTargetModelInput = {
  projectType: ProjectType;
  scope: ProjectScope;
  counts: ResearchCounts;
  projectStartDate: Date;
  today: Date;
  userDeadline?: Date | null;
  paceMode: DashboardPaceMode;
  workWeekdays: number[];
  skippedDates?: string[];
  /** Sum of completed counting task weights / total, for the selected day (0..1). */
  completedTaskWeightToday: number;
  /** Optional manual daily-target % override for the selected date. */
  manualTargetPercent?: number | null;
  /** Optional bounded AI quality signals — may cap section progress, never invent it. */
  aiSignals?: AiQualitySignals;
};

export type TodayTargetModel = {
  totalPoints: number; // 1000
  completedPoints: number;
  remainingPoints: number;
  projectProgressPercent: number; // 0..100 (completedPoints / 10)
  sectionScores: SectionScores;
  adjustedTargets: SectionTargets;
  weights: SectionWeights;
  baseGoalDays: number;
  paceTargetDays: number;
  paceTargetDate: string; // ISO YYYY-MM-DD
  deadlineDate: string | null;
  activeDaysLeft: number;
  dailyTargetPoints: number;
  dailyTargetPercent: number; // display 0..100 (ceil of points/10, or manual override)
  doneTodayPercent: number;
  remainingTodayPercent: number;
  ringProgress: number; // 0..1
  deadlineAchievable: boolean;
  status: TodayTargetStatus;
  expectedFinishLabel: string;
  deadlineLabel: string | null;
};

// --- Date helpers (local, pure) ---------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function addDays(date: Date, days: number): Date {
  const next = startOfLocalDay(date);
  next.setDate(next.getDate() + days);
  return next;
}
function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / MS_PER_DAY);
}
function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

/** Count workdays in [today, end] inclusive, honoring work weekdays and skipped dates. */
export function countActiveWorkdays(
  today: Date,
  end: Date,
  workWeekdays: number[],
  skippedDates: string[] = []
): number {
  const workSet = new Set(workWeekdays);
  const skipSet = new Set(skippedDates);
  let cursor = startOfLocalDay(today);
  const last = startOfLocalDay(end);
  let count = 0;
  for (let guard = 0; cursor.getTime() <= last.getTime() && guard < 5000; guard += 1) {
    if (workSet.has(cursor.getDay()) && !skipSet.has(toISODate(cursor))) count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}

export function computeTodayTargetModel(input: TodayTargetModelInput): TodayTargetModel {
  const typeModel = PROJECT_TYPE_MODELS[input.projectType] ?? PROJECT_TYPE_MODELS[DEFAULT_PROJECT_TYPE];
  const weights = typeModel.weights;
  const adjustedTargets = computeAdjustedTargets(input.projectType, input.scope);
  const metaRelevant =
    weights.metaAnalysis > 0 || input.scope.metaAnalysisRequired || input.projectType === "meta-analysis";
  const sectionScores = computeSectionProgress(input.counts, adjustedTargets, {
    metaRelevant,
    signals: input.aiSignals,
  });
  const completedPoints = computeCompletedPoints(sectionScores, weights);
  const remainingPoints = Math.max(0, TOTAL_PROJECT_POINTS - completedPoints);
  const projectProgressPercent = completedPoints / 10;

  const baseGoalDays =
    input.userDeadline != null
      ? Math.max(1, calendarDaysBetween(input.projectStartDate, input.userDeadline))
      : Math.max(1, typeModel.defaultDays);
  const paceMultiplier = PACE_MULTIPLIERS[input.paceMode] ?? 1;
  const paceTargetDays = Math.max(1, Math.ceil(baseGoalDays * paceMultiplier));
  const paceTargetDateObj = addDays(input.projectStartDate, paceTargetDays);
  const deadlineDate = input.userDeadline != null ? toISODate(input.userDeadline) : null;
  const deadlineLabel = input.userDeadline != null ? formatDateLabel(input.userDeadline) : null;
  const expectedFinishLabel = formatDateLabel(paceTargetDateObj);

  const activeDaysLeft = countActiveWorkdays(input.today, paceTargetDateObj, input.workWeekdays, input.skippedDates);
  const completedTaskWeight = clamp(input.completedTaskWeightToday, 0, 1);

  const base = {
    totalPoints: TOTAL_PROJECT_POINTS,
    completedPoints,
    remainingPoints,
    projectProgressPercent,
    sectionScores,
    adjustedTargets,
    weights,
    baseGoalDays,
    paceTargetDays,
    paceTargetDate: toISODate(paceTargetDateObj),
    deadlineDate,
    activeDaysLeft,
    expectedFinishLabel,
    deadlineLabel,
  };

  // Project complete: no target, ring full.
  if (completedPoints >= TOTAL_PROJECT_POINTS) {
    return {
      ...base,
      remainingPoints: 0,
      projectProgressPercent: 100,
      dailyTargetPoints: 0,
      dailyTargetPercent: 0,
      doneTodayPercent: 0,
      remainingTodayPercent: 0,
      ringProgress: 1,
      deadlineAchievable: true,
      status: "complete",
    };
  }

  const safeDaysLeft = Math.max(1, activeDaysLeft); // avoid /0
  const dailyTargetPoints = remainingPoints / safeDaysLeft;
  // Today's 4 tasks divide dailyTargetPoints; completedTaskWeight is the share done.
  const completedTodayPoints = completedTaskWeight * dailyTargetPoints;

  const dailyTargetPercent =
    input.manualTargetPercent != null && Number.isFinite(input.manualTargetPercent)
      ? Math.max(0, input.manualTargetPercent)
      : Math.max(1, Math.ceil(dailyTargetPoints / 10));
  const doneTodayPercent = completedTodayPoints / 10;
  const remainingTodayPercent = Math.max(dailyTargetPoints - completedTodayPoints, 0) / 10;
  const ringProgress = dailyTargetPoints > 0 ? clamp(completedTodayPoints / dailyTargetPoints, 0, 1) : 1;

  const deadlineAchievable = activeDaysLeft > 0 && dailyTargetPoints <= MAX_DAILY_POINTS_BY_PACE[input.paceMode];

  let status: TodayTargetStatus;
  if (activeDaysLeft <= 0) {
    status = "deadline_at_risk";
  } else if (!deadlineAchievable) {
    status = "at_risk";
  } else if (completedTodayPoints >= dailyTargetPoints) {
    status = "on_track";
  } else {
    status = "in_progress";
  }

  return {
    ...base,
    dailyTargetPoints,
    dailyTargetPercent,
    doneTodayPercent,
    remainingTodayPercent,
    ringProgress,
    deadlineAchievable,
    status,
  };
}
