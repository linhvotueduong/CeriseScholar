import type { DashboardPaceMode } from "@/lib/dashboard/targetPace";

/**
 * Today's Target — unified formula model (Step 1: types + pure helper + tests).
 *
 * One model produces EVERY Today's Target number so they can never disagree:
 *   daily target %, workdays left, expected finish, done today, remaining today,
 *   ring progress, and status all derive from the same inputs.
 *
 * The pipeline (from the master workflow):
 *   projectType + scope        -> adjustedWorkUnits      (how much total work exists)
 *   deadline/default + pace     -> paceTargetDate         (how fast to finish)
 *   real progress               -> remainingWorkUnits     (how much is left)
 *   remaining / activeDaysLeft  -> dailyWorkUnitsNeeded    -> dailyTargetPercent
 *   today's 4 task weights      -> doneTodayPercent / ring (how much of today is done)
 *
 * This file is PURE and deterministic: all dates are injected (no clock reads), so
 * it is fully testable. It is NOT wired into the card yet — see todayTargetModel.test.ts.
 */

// ---------------------------------------------------------------------------
// Project types
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

export type ProjectTypeDefault = {
  /** Default goal length in calendar days when the user sets no deadline. */
  defaultDays: number;
  /** Baseline total work for a typical project of this type, before scope. */
  defaultWorkUnits: number;
};

/** Per-type defaults (from the master workflow's project-type table). */
export const PROJECT_TYPE_DEFAULTS: Record<ProjectType, ProjectTypeDefault> = {
  "class-paper": { defaultDays: 14, defaultWorkUnits: 60 },
  "short-research-brief": { defaultDays: 7, defaultWorkUnits: 45 },
  "literature-review": { defaultDays: 30, defaultWorkUnits: 100 },
  "thesis-chapter": { defaultDays: 60, defaultWorkUnits: 220 },
  "dissertation-section": { defaultDays: 90, defaultWorkUnits: 320 },
  "meta-analysis": { defaultDays: 90, defaultWorkUnits: 320 },
  "grant-proposal": { defaultDays: 21, defaultWorkUnits: 120 },
  "professional-research-brief": { defaultDays: 14, defaultWorkUnits: 90 },
  "publication-manuscript": { defaultDays: 120, defaultWorkUnits: 420 },
  "personal-research-project": { defaultDays: 30, defaultWorkUnits: 100 },
};

/** Fallback when a project has no chosen type yet (no project_type column exists). */
export const DEFAULT_PROJECT_TYPE: ProjectType = "personal-research-project";

/** Pace -> finish-pressure multiplier (lower = finish earlier). */
export const PACE_MULTIPLIERS: Record<DashboardPaceMode, number> = {
  low: 1.0,
  moderate: 0.9,
  high: 0.8,
};

/**
 * Most work units a user at each pace is expected to sustain per day. Used ONLY to
 * judge whether a deadline is achievable / flag "at risk" — it never silently caps
 * the displayed daily target (an impossible deadline must read as risk, not calm).
 * Tunable.
 */
export const MAX_DAILY_WORK_UNITS_BY_PACE: Record<DashboardPaceMode, number> = {
  low: 8,
  moderate: 12,
  high: 18,
};

// ---------------------------------------------------------------------------
// Scope + completed-work inputs
// ---------------------------------------------------------------------------

/** Each multiplier defaults to 1.0; product scales the baseline work units. */
export type ScopeMultipliers = {
  sources?: number;
  pages?: number;
  complexity?: number;
  quality?: number;
};

/** Counts of real user work, converted to work units via WORK_UNIT_WEIGHTS. */
export type CompletedWorkInputs = {
  uploadedSources?: number;
  highlights?: number;
  literatureRows?: number;
  notes?: number;
  syntheses?: number;
  draftSections?: number;
  citations?: number;
  metaAnalysisItems?: number;
  completedResearchTasks?: number;
};

/** Work-unit value of each kind of completed work (aligned with ACTIVITY_WEIGHTS). */
export const WORK_UNIT_WEIGHTS: Required<Record<keyof CompletedWorkInputs, number>> = {
  uploadedSources: 4,
  highlights: 2,
  literatureRows: 4,
  notes: 2,
  syntheses: 5,
  draftSections: 5,
  citations: 2,
  metaAnalysisItems: 5,
  completedResearchTasks: 3,
};

export function computeScopeMultiplier(scope: ScopeMultipliers = {}): number {
  const m = (value: number | undefined) => (typeof value === "number" && value > 0 ? value : 1);
  return m(scope.sources) * m(scope.pages) * m(scope.complexity) * m(scope.quality);
}

export function computeCompletedWorkUnits(inputs: CompletedWorkInputs = {}): number {
  return (Object.keys(WORK_UNIT_WEIGHTS) as Array<keyof CompletedWorkInputs>).reduce((sum, key) => {
    const count = inputs[key];
    return sum + (typeof count === "number" && count > 0 ? count : 0) * WORK_UNIT_WEIGHTS[key];
  }, 0);
}

// ---------------------------------------------------------------------------
// Model input / output
// ---------------------------------------------------------------------------

export type TodayTargetStatus =
  | "complete"
  | "deadline_at_risk"
  | "at_risk"
  | "on_track"
  | "in_progress";

export type TodayTargetModelInput = {
  projectType: ProjectType;
  scope?: ScopeMultipliers;
  /** Completed real work, in work units (see computeCompletedWorkUnits). */
  completedWorkUnits: number;
  projectStartDate: Date;
  today: Date;
  /** User-chosen deadline; when absent the project type's default length is used. */
  userDeadline?: Date | null;
  paceMode: DashboardPaceMode;
  /** 0=Sun..6=Sat; days the user works. */
  workWeekdays: number[];
  /** ISO YYYY-MM-DD dates the user skips. */
  skippedDates?: string[];
  /** Sum of completed counting task weights / total, for the selected day (0..1). */
  completedTaskWeightToday: number;
  /** Optional manual daily-target % override for the selected date. */
  manualTargetPercent?: number | null;
};

export type TodayTargetModel = {
  adjustedWorkUnits: number;
  completedWorkUnits: number;
  remainingWorkUnits: number;
  projectProgressPercent: number; // 0..100
  baseGoalDays: number;
  paceTargetDays: number;
  paceTargetDate: string; // ISO YYYY-MM-DD
  deadlineDate: string | null; // ISO, user deadline if any
  activeDaysLeft: number; // workdays remaining (>= 0)
  dailyWorkUnitsNeeded: number;
  dailyTargetPercent: number; // display (ceil, or manual override)
  doneTodayPercent: number;
  remainingTodayPercent: number;
  ringProgress: number; // 0..1
  deadlineAchievable: boolean;
  status: TodayTargetStatus;
  expectedFinishLabel: string;
  deadlineLabel: string | null;
};

// ---------------------------------------------------------------------------
// Date helpers (local, pure)
// ---------------------------------------------------------------------------

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
  // Guard against runaway loops on absurd inputs.
  for (let guard = 0; cursor.getTime() <= last.getTime() && guard < 5000; guard += 1) {
    if (workSet.has(cursor.getDay()) && !skipSet.has(toISODate(cursor))) count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}

// ---------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function computeTodayTargetModel(input: TodayTargetModelInput): TodayTargetModel {
  const defaults = PROJECT_TYPE_DEFAULTS[input.projectType] ?? PROJECT_TYPE_DEFAULTS[DEFAULT_PROJECT_TYPE];

  // 1-2. Size the project.
  const scopeMultiplier = computeScopeMultiplier(input.scope);
  const adjustedWorkUnits = Math.max(1, Math.round(defaults.defaultWorkUnits * scopeMultiplier));
  const completedWorkUnits = clamp(input.completedWorkUnits, 0, adjustedWorkUnits);
  const remainingWorkUnits = Math.max(0, adjustedWorkUnits - completedWorkUnits);
  const projectProgressPercent = (completedWorkUnits / adjustedWorkUnits) * 100;

  // 3. Deadline + pace -> expected finish date.
  const baseGoalDays =
    input.userDeadline != null
      ? Math.max(1, calendarDaysBetween(input.projectStartDate, input.userDeadline))
      : defaults.defaultDays;
  const paceMultiplier = PACE_MULTIPLIERS[input.paceMode] ?? 1;
  const paceTargetDays = Math.max(1, Math.ceil(baseGoalDays * paceMultiplier));
  const paceTargetDateObj = addDays(input.projectStartDate, paceTargetDays);
  const deadlineDate = input.userDeadline != null ? toISODate(input.userDeadline) : null;
  const deadlineLabel = input.userDeadline != null ? formatDateLabel(input.userDeadline) : null;
  const expectedFinishLabel = formatDateLabel(paceTargetDateObj);

  // 5. Workdays left and daily need.
  const activeDaysLeft = countActiveWorkdays(
    input.today,
    paceTargetDateObj,
    input.workWeekdays,
    input.skippedDates
  );
  const safeDaysLeft = Math.max(1, activeDaysLeft); // avoid divide-by-zero / Infinity
  const dailyWorkUnitsNeeded = remainingWorkUnits / safeDaysLeft;
  const rawDailyTargetPercent = (dailyWorkUnitsNeeded / adjustedWorkUnits) * 100;

  const completedTaskWeight = clamp(input.completedTaskWeightToday, 0, 1);

  // Project complete short-circuit: no target, ring full.
  if (projectProgressPercent >= 100) {
    return {
      adjustedWorkUnits,
      completedWorkUnits,
      remainingWorkUnits: 0,
      projectProgressPercent: 100,
      baseGoalDays,
      paceTargetDays,
      paceTargetDate: toISODate(paceTargetDateObj),
      deadlineDate,
      activeDaysLeft,
      dailyWorkUnitsNeeded: 0,
      dailyTargetPercent: 0,
      doneTodayPercent: 0,
      remainingTodayPercent: 0,
      ringProgress: 1,
      deadlineAchievable: true,
      status: "complete",
      expectedFinishLabel,
      deadlineLabel,
    };
  }

  // Daily target % — manual override wins for the selected date, else ceil(raw).
  // We never cap the displayed value: an impossible deadline shows the honest high
  // number AND a risk status (deadlineAchievable drives that), not a calm capped one.
  const dailyTargetPercent =
    input.manualTargetPercent != null && Number.isFinite(input.manualTargetPercent)
      ? Math.max(0, input.manualTargetPercent)
      : Math.max(1, Math.ceil(rawDailyTargetPercent));

  const deadlineAchievable =
    activeDaysLeft > 0 && dailyWorkUnitsNeeded <= MAX_DAILY_WORK_UNITS_BY_PACE[input.paceMode];

  // 6-7. Today's tasks drive done/remaining/ring.
  const doneTodayPercent = dailyTargetPercent * completedTaskWeight;
  const remainingTodayPercent = Math.max(dailyTargetPercent - doneTodayPercent, 0);
  const ringProgress = dailyTargetPercent > 0 ? clamp(doneTodayPercent / dailyTargetPercent, 0, 1) : 1;

  // 8. Status.
  let status: TodayTargetStatus;
  if (activeDaysLeft <= 0) {
    status = "deadline_at_risk";
  } else if (!deadlineAchievable) {
    status = "at_risk";
  } else if (doneTodayPercent >= dailyTargetPercent) {
    status = "on_track";
  } else {
    status = "in_progress";
  }

  return {
    adjustedWorkUnits,
    completedWorkUnits,
    remainingWorkUnits,
    projectProgressPercent,
    baseGoalDays,
    paceTargetDays,
    paceTargetDate: toISODate(paceTargetDateObj),
    deadlineDate,
    activeDaysLeft,
    dailyWorkUnitsNeeded,
    dailyTargetPercent,
    doneTodayPercent,
    remainingTodayPercent,
    ringProgress,
    deadlineAchievable,
    status,
    expectedFinishLabel,
    deadlineLabel,
  };
}
