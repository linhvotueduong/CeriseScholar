// Snapshot builder for the Research Assistant chat card on /research-desk
// (src/app/api/ai/route.ts task "research_assistant"). Pure and client-safe —
// compacts what useResearchDeskData + researchDeskDerive.ts already compute
// into a small JSON object the model can ground its answers in. Nothing here
// calls the network or invents a number: every field is either copied
// straight from a derive-function result or a simple count.
//
// Kept intentionally small (~a few KB, well under the route's 8KB hard cap)
// so a chat turn's request body stays light.

import type { ResearchDeskSourceData } from "@/hooks/useResearchDeskData";
import type { EvidenceLibraryRow } from "./evidenceLibrary";
import {
  buildFunnelData,
  buildNextSteps,
  buildPortfolioStats,
  buildProjectOverviews,
  buildRecentChanges,
  computeProjectPhase,
  scopedBy,
  type ProjectTabId,
} from "./researchDeskDerive";

const PROJECT_TABS: ProjectTabId[] = ["literature-review", "meta-analysis", "workspace", "draft", "citations"];

type FocusProjectTabs = Record<
  ProjectTabId,
  { metrics: Array<{ label: string; value: string }>; nextStep: string; phase: string; progress: number }
>;

type FocusProject = {
  name: string;
  funnel: {
    blockerText: string;
    coded: number;
    loaded: number;
    nextMoveText: string;
    openRows: number;
    readyPercent: number;
  };
  tabs: FocusProjectTabs;
};

/**
 * Compact read-out of Stage 1's deterministic BehaviorProfile + Stage 2's
 * cached guidance (ai_behavior_insights, migration 028) for the focus
 * project's TODAY row — only the handful of fields useful for a chat answer,
 * kept well under the route's size cap. Absent when no insight has been
 * generated yet today (fail-open, same as everywhere else this cache is read).
 */
export type AssistantBehaviorSummary = {
  activeDaysPerWeek: number;
  avoidedSection: string | null;
  completionRate: number | null;
  guidance: string;
  jumperScore: number;
  longestGapDays: number;
};

export type AssistantContextSnapshot = {
  generatedAt: string;
  projects: Array<{ name: string; phase: string; progressPercent: number }>;
  stats: Array<{ label: string; value: number }>;
  focusProject: FocusProject | null;
  behaviorSummary: AssistantBehaviorSummary | null;
  nextSteps: string[];
  recentActivity: string[];
  evidenceLibrary: { caveatsFlagged: number; scholarAsk: number; total: number; upload: number };
};

/**
 * Build the JSON snapshot sent to /api/ai as `context` for task
 * "research_assistant". `evidenceRows` comes from the same useEvidenceLibrary
 * hook the Evidence Library card/subpage use — pass `[]` if it hasn't loaded
 * yet rather than blocking the chat on it.
 */
export function buildAssistantContext(
  data: ResearchDeskSourceData,
  evidenceRows: EvidenceLibraryRow[]
): AssistantContextSnapshot {
  const projects = data.projects.map((project) => {
    const pdfs = scopedBy(data.pdfs, project.id);
    const literatureEntries = scopedBy(data.literatureEntries, project.id);
    const paperSections = scopedBy(data.paperSections, project.id);
    const metaAnalysis = data.metaAnalyses.find((meta) => meta.project_id === project.id) ?? null;
    const phase = computeProjectPhase({ pdfs, literatureEntries, metaAnalysis, paperSections });
    return { name: project.name, phase: phase.label, progressPercent: phase.progressPercent };
  });

  const stats = buildPortfolioStats(data).map((stat) => ({ label: stat.label, value: stat.value }));

  const focusProjectRow = data.projects[0] ?? null;
  let focusProject: FocusProject | null = null;

  if (focusProjectRow) {
    const overviews = buildProjectOverviews(focusProjectRow.id, data);
    const funnel = buildFunnelData(focusProjectRow.id, data, overviews["literature-review"].nextStep);

    const tabs = PROJECT_TABS.reduce<FocusProjectTabs>((acc, tabId) => {
      const overview = overviews[tabId];
      acc[tabId] = {
        phase: overview.phase,
        progress: overview.progress,
        metrics: overview.metrics.map((metric) => ({ label: metric.label, value: metric.value })),
        nextStep: overview.nextStep,
      };
      return acc;
    }, {} as FocusProjectTabs);

    focusProject = {
      name: focusProjectRow.name,
      tabs,
      funnel: {
        loaded: funnel.loaded,
        coded: funnel.coded,
        openRows: funnel.openRows,
        readyPercent: funnel.readyPercent,
        blockerText: funnel.blockerText,
        nextMoveText: funnel.nextMoveText,
      },
    };
  }

  // Today's cached Stage 2 guidance for the focus project, if any — read
  // straight from the SAME `ai_behavior_insights.profile` JSON the dashboard
  // caches (never recomputed here), so the assistant can discuss it honestly
  // without a second behavior-profile calculation.
  const focusInsight = focusProjectRow
    ? data.todayInsights.find((row) => row.project_id === focusProjectRow.id) ?? null
    : null;
  const behaviorSummary: AssistantBehaviorSummary | null =
    focusInsight?.guidance && focusInsight.profile
      ? {
          completionRate: focusInsight.profile.taskCompletionRate,
          activeDaysPerWeek: focusInsight.profile.workRhythm.activeDaysPerWeek,
          longestGapDays: focusInsight.profile.workRhythm.longestGapDays,
          avoidedSection: focusInsight.profile.avoidedSection,
          jumperScore: focusInsight.profile.jumperScore,
          guidance: focusInsight.guidance,
        }
      : null;

  const nextSteps = buildNextSteps(data).map((step) => step.title);
  const recentActivity = buildRecentChanges(data.activityEvents, data.projects)
    .slice(0, 5)
    .map((change) => change.title);

  const evidenceLibrary = {
    total: evidenceRows.length,
    scholarAsk: evidenceRows.filter((row) => row.source === "scholarask").length,
    upload: evidenceRows.filter((row) => row.source === "upload").length,
    caveatsFlagged: evidenceRows.filter((row) => row.caveat?.trim()).length,
  };

  return {
    generatedAt: new Date().toISOString(),
    projects,
    stats,
    focusProject,
    behaviorSummary,
    nextSteps,
    recentActivity,
    evidenceLibrary,
  };
}
