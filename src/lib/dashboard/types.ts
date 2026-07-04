import type {
  DashboardSectionData,
  DashboardSectionId,
  DashboardTask,
} from "@/lib/dashboard/deriveDashboardState";
import type { DashboardPaceMode } from "@/lib/dashboard/targetPace";
import {
  DEFAULT_PROJECT_SCOPE,
  DEFAULT_PROJECT_TYPE,
  type ProjectScope,
  type ProjectType,
} from "@/lib/dashboard/todayTargetModel";

/**
 * Dashboard foundation types (Phase A).
 *
 * These describe the NEW `DashboardSnapshot` shape — every card wrapped in a
 * `CardState<T>` so the UI can later show honest "real / empty / demo / upcoming"
 * states. Nothing here is wired into the UI yet: the snapshot is built ALONGSIDE
 * the existing `DashboardDerivedState` (see `buildDashboardSnapshot.ts`) and cards
 * switch over one at a time in later phases. See `docs/dashboard-technical-appendix.md`.
 */

/** A score in the inclusive range 0..1. */
export type Score01 = number;

/** Every card declares which kind of value it is showing. */
export type DataState = "real" | "empty" | "demo" | "upcoming" | "stale" | "error";

/**
 * Uniform wrapper for every card. `data` is ALWAYS present — for empty/error/upcoming
 * states it holds a deterministic fallback payload so the UI never crashes or shows fiction.
 */
export type CardState<T> = {
  dataState: DataState;
  data: T;
  /** Human-facing note for empty/upcoming/stale/error (e.g. "Add your first source"). */
  message?: string;
  /** For AI-influenced cards only (Greeting). Pure-formula cards omit it / use 1. */
  confidence?: Score01;
  lastComputedAt: string; // ISO
};

/** Helper builders keep dataState handling consistent. */
export const realCard = <T>(data: T, at: string): CardState<T> => ({
  dataState: "real",
  data,
  lastComputedAt: at,
});
export const emptyCard = <T>(data: T, at: string, message?: string): CardState<T> => ({
  dataState: "empty",
  data,
  message,
  lastComputedAt: at,
});
export const demoCard = <T>(data: T, at: string): CardState<T> => ({
  dataState: "demo",
  data,
  lastComputedAt: at,
});

// ---------------------------------------------------------------------------
// Per-card payload types (from the spec's "State contract" lines)
// ---------------------------------------------------------------------------

export type GreetingState = {
  line1: string;
  line2: string;
  bestMove: string;
  avoidMove?: string;
};

export type CurrentProjectState = {
  projectId: string;
  projectName: string;
  phaseBadge: string;
  currentSection: string;
  lastActivityAt: string | null;
  isPinned: boolean;
};

export type TodayTargetStatus = "on_track" | "behind" | "deadline_at_risk" | "complete";

export type TodayTargetState = {
  dailyTargetPercent: number;
  doneTodayPercent: number;
  remainingTodayPercent: number;
  ringProgress: Score01;
  deadlineAchievable: boolean;
  status: TodayTargetStatus;
  daysLeft: number;
  expectedFinishLabel: string;
};

export type ActivityLogItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  eventType: string;
};

export type ActivityLogState = {
  items: ActivityLogItem[];
};

export type LocalSetupState = {
  readyCount: number;
  readyPercent: number;
  checks: Array<{ label: string; ready: boolean }>;
  deviceScoped: true;
  lastCheckedAt: string | null;
};

export type CalendarDay = {
  day: string;
  isToday: boolean;
  isSelected: boolean;
  hasTasks: boolean;
  hasCheckpoint: boolean;
  inMonth: boolean;
};

export type ScheduleState = {
  selectedDate: string;
  calendarDays: CalendarDay[];
  recommendedTasks: DashboardTask[];
  manualTasks: DashboardTask[];
  deviceLaneTasks: DashboardTask[];
};

export type HealthTone = "green" | "amber" | "purple" | "red";

export type SectionsState = {
  selectedSection: DashboardSectionId;
  sections: DashboardSectionData[];
  bottleneck: string[];
  nextStep: string[];
  route: string;
};

export type ResearchFocusState = {
  recommendation: string;
  readinessSummary: string;
  healthRows: Array<{ label: string; value: string; tone: HealthTone }>;
  watchPoint: string;
  estimatedMinutesRange: [number, number];
  currentStatus: string;
  nextBestMove: string;
  startNextMoveRoute: string;
};

export type ContinueLearningPace = "on_pace" | "behind" | "ahead" | "no_deadline";

export type ContinueLearningState = {
  courseStatus: "published" | "upcoming";
  currentLesson: string;
  modulesCompleted: number;
  lessonsDone: number;
  notesCreated: number;
  earnedBadges: number;
  progressPercent: number;
  pace: ContinueLearningPace;
};

export type CeriseSupportState = {
  requestSupportRoute: string;
  helpCenterRoute: string;
  currentContext?: string;
};

// ---------------------------------------------------------------------------
// The aggregate snapshot (NEW)
// ---------------------------------------------------------------------------

export type DashboardSnapshot = {
  projectId: string;
  computedAt: string; // ISO
  usingDemo: boolean; // true if ANY card is demo (drives the Phase-4 "Sample data" badge)
  projectProgress01: Score01; // keystone, computed once and shared
  cards: {
    greeting: CardState<GreetingState>;
    currentProject: CardState<CurrentProjectState>;
    todayTarget: CardState<TodayTargetState>;
    schedule: CardState<ScheduleState>; // Today's Plan + Today's Schedule
    activityLog: CardState<ActivityLogState>;
    localSetup: CardState<LocalSetupState>;
    sections: CardState<SectionsState>; // Research Sections + Section Details
    researchFocus: CardState<ResearchFocusState>;
    continueLearning: CardState<ContinueLearningState>;
    support: CardState<CeriseSupportState>;
  };
};

// ---------------------------------------------------------------------------
// Persisted Today's Target settings (settled 2026-06-16)
//
// This is the canonical persisted/code-default shape that Phase B wires into
// `dashboard_project_settings` (migration 016). It differs from the UI-local
// `DashboardTargetSettings` in two settled ways:
//   1. pace default is "moderate" (the UI/demo seed may keep "high").
//   2. work days are stored as a WEEKDAY ARRAY (0=Sun..6=Sat), not a count.
// ---------------------------------------------------------------------------

export type PersistedDashboardTargetSettings = {
  deadlineDate: string; // <-> target_completion_date
  paceMode: DashboardPaceMode; // <-> pace; persisted/code default "moderate"
  workWeekdays: number[]; // <-> work_weekdays; 0=Sun..6=Sat; default [1,2,3,4,5]
  skippedDates: string[]; // <-> skipped_dates
  dailyWorkGoalMinutes: number; // <-> preferred_daily_minutes
  manualTargetDate: string | null; // <-> manual_target_date
  manualTargetPercent: number | null; // <-> manual_target_percent
  projectType: ProjectType; // <-> project_type (migration 018)
  scope: ProjectScope; // <-> project_scope JSONB (migration 018)
};

/** Real/persisted default pace (NOT the demo/preview seed, which may be "high"). */
export const DEFAULT_PERSISTED_PACE_MODE: DashboardPaceMode = "moderate";

/** Default work week: Mon–Fri. 0=Sun..6=Sat. */
export const DEFAULT_WORK_WEEKDAYS: number[] = [1, 2, 3, 4, 5];

/**
 * Canonical persisted defaults for a brand-new project's target settings.
 * Caller supplies the deadline (kept here as a string so this stays pure /
 * free of `Date.now()`).
 */
export function getDefaultPersistedDashboardTargetSettings(
  deadlineDate: string,
  dailyWorkGoalMinutes = 90
): PersistedDashboardTargetSettings {
  return {
    deadlineDate,
    paceMode: DEFAULT_PERSISTED_PACE_MODE,
    workWeekdays: [...DEFAULT_WORK_WEEKDAYS],
    skippedDates: [],
    dailyWorkGoalMinutes,
    manualTargetDate: null,
    manualTargetPercent: null,
    projectType: DEFAULT_PROJECT_TYPE,
    scope: { ...DEFAULT_PROJECT_SCOPE },
  };
}
