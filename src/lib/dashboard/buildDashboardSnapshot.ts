import type { Project } from "@/types/project";
import type {
  DashboardDerivedState,
  DashboardSourceData,
} from "@/lib/dashboard/deriveDashboardState";
import {
  demoCard,
  realCard,
  type CardState,
  type DashboardSnapshot,
  type PersistedDashboardTargetSettings,
  type Score01,
  type TodayTargetStatus,
} from "@/lib/dashboard/types";

/**
 * Phase A: build a `DashboardSnapshot` ALONGSIDE the existing `DashboardDerivedState`.
 *
 * This is a pure, deterministic mapping from the already-derived state + raw source
 * data into the new card-wrapped snapshot shape. It is intentionally NOT wired into
 * the UI yet — the dashboard still renders entirely from `DashboardDerivedState`.
 * Later phases compute each card's real `dataState`, replace placeholder routes, and
 * switch the components over one card at a time. See `docs/dashboard-technical-appendix.md`.
 *
 * `now` is injected (not read from the clock) so the mapping stays pure and testable.
 */
export type BuildDashboardSnapshotInput = {
  project: Project;
  data: DashboardSourceData;
  derived: DashboardDerivedState;
  settings: PersistedDashboardTargetSettings;
  now: Date;
  /** True when the derived state was filled with demo data (Phase 4 refines per-card). */
  usingDemo?: boolean;
  taskDate?: string;
};

/** Placeholder routes — real destinations are wired in Phases D/E/F. */
const ROUTE_PLACEHOLDER = "/dashboard";
const HELP_ROUTE = "/help";

function clamp01(value: number): Score01 {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function toInt(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Parse derived `estimatedTime` like "25-35 min" into a [min, max] minute range. */
function parseMinutesRange(label: string): [number, number] {
  const match = label.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match) return [Number(match[1]), Number(match[2])];
  const single = label.match(/(\d+)/);
  if (single) return [Number(single[1]), Number(single[1])];
  return [10, 15];
}

export function buildDashboardSnapshot(input: BuildDashboardSnapshotInput): DashboardSnapshot {
  const { project, data, derived, now, usingDemo = false } = input;
  const computedAt = now.toISOString();

  // Foundation default: every card inherits the snapshot-level demo flag. Per-card
  // real/empty/upcoming refinement arrives in Phases D–G; this keeps Phase A honest
  // without inventing per-card emptiness logic that doesn't exist yet.
  const card = <T>(value: T): CardState<T> => (usingDemo ? demoCard(value, computedAt) : realCard(value, computedAt));

  const projectProgress01 = clamp01(derived.analytics.totalProgress / 100);
  const lastActivityAt = data.activityEvents[0]?.created_at ?? project.updated_at ?? null;

  // Today's Target — every number comes from the SAME unified model on `derived`.
  const tt = derived.todayTargetModel;
  const todayTargetStatus: TodayTargetStatus =
    tt.status === "at_risk" ? "deadline_at_risk" : tt.status === "in_progress" ? "behind" : tt.status;

  const activeSection = derived.researchSections.find((section) => section.id === derived.activeSectionId);

  return {
    projectId: project.id,
    computedAt,
    usingDemo,
    projectProgress01,
    cards: {
      greeting: card({
        // Deterministic foundation copy; Phase H replaces line1/line2 with AI wording.
        line1: "Welcome back",
        line2: `Continue ${project.name}`,
        bestMove: derived.researchFocus.recommended,
      }),
      currentProject: card({
        projectId: project.id,
        projectName: project.name,
        phaseBadge: derived.currentProject.tag,
        currentSection: derived.currentProject.currentSection,
        lastActivityAt,
        isPinned: false,
      }),
      todayTarget: card({
        dailyTargetPercent: tt.dailyTargetPercent,
        doneTodayPercent: tt.doneTodayPercent,
        remainingTodayPercent: tt.remainingTodayPercent,
        ringProgress: clamp01(tt.ringProgress),
        deadlineAchievable: tt.deadlineAchievable,
        status: todayTargetStatus,
        daysLeft: tt.activeDaysLeft,
        expectedFinishLabel: tt.expectedFinishLabel,
      }),
      schedule: card({
        selectedDate: input.taskDate ?? "",
        calendarDays: [], // calendar engine is Phase C
        recommendedTasks: derived.scheduleTasks,
        manualTasks: [],
        deviceLaneTasks: [],
      }),
      activityLog: card({
        items: derived.recentChanges.map((change, index) => ({
          id: `activity-${index}`,
          title: change.title,
          subtitle: change.subtitle,
          time: change.time,
          eventType: "", // populated from real events in Phase F
        })),
      }),
      localSetup: card({
        readyCount: derived.localSetup.readyCount,
        readyPercent: derived.localSetup.percent,
        checks: derived.localSetup.checks.map(([label, ready]) => ({ label, ready })),
        deviceScoped: true,
        lastCheckedAt: null,
      }),
      sections: card({
        selectedSection: derived.activeSectionId,
        sections: derived.researchSections,
        bottleneck: activeSection?.bottleneck ?? [],
        nextStep: activeSection?.next ?? [],
        route: ROUTE_PLACEHOLDER,
      }),
      researchFocus: card({
        recommendation: derived.researchFocus.recommended,
        healthRows: derived.researchFocus.health,
        watchPoint: derived.researchFocus.watchPoint,
        estimatedMinutesRange: parseMinutesRange(derived.researchFocus.estimatedTime),
        startNextMoveRoute: ROUTE_PLACEHOLDER,
      }),
      continueLearning: card({
        courseStatus: "published", // published/upcoming detection is Phase G
        currentLesson: derived.continueLearning.lesson,
        modulesCompleted: toInt(derived.continueLearning.stats[0]?.[0]),
        lessonsDone: toInt(derived.continueLearning.stats[1]?.[0]),
        notesCreated: toInt(derived.continueLearning.stats[2]?.[0]),
        lessonsRemaining: toInt(derived.continueLearning.stats[3]?.[0]),
        progressPercent: derived.continueLearning.progress,
        pace: "no_deadline",
      }),
      support: card({
        requestSupportRoute: HELP_ROUTE,
        helpCenterRoute: HELP_ROUTE,
      }),
    },
  };
}
