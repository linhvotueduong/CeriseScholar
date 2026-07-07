import type { Project } from "@/types/project";
import type { MetaAnalysis } from "@/types/meta-analysis";
import { getLocalDay, isSameLocalDay } from "@/lib/dashboard/localDay";
import { isMeaningfulLabel, isMeaningfulText } from "@/lib/dashboard/meaningfulWork";
import { evaluateResearchQuality, type ResearchTextSample } from "@/lib/dashboard/aiQualityEvaluator";
import type { AiQualitySignals } from "@/lib/dashboard/sectionProgress";
import {
  computeTodayTargetModel,
  DEFAULT_PROJECT_SCOPE,
  DEFAULT_PROJECT_TYPE,
  type ProjectScope,
  type ProjectType,
  type ResearchCounts,
  type SectionScores,
  type TodayTargetModel,
} from "@/lib/dashboard/todayTargetModel";
import {
  DASHBOARD_PACE_OPTIONS,
  type DashboardPaceMode,
  type DashboardTargetPaceSummary,
  type DashboardTargetSettings,
} from "@/lib/dashboard/targetPace";
import { computeResearchReadiness, isGenuineApa } from "@/lib/dashboard/researchReadiness";
import { DEFAULT_CODES } from "@/types/code";
import { INCLUDED_MONTHLY_ALLOWANCE } from "@/lib/ai/allowance";

export type DashboardSectionId =
  | "meta-analysis"
  | "literature-review"
  | "workspace"
  | "upload"
  | "scholarask"
  | "draft"
  | "citations"
  | "notes";

export type DashboardTaskStatus = "pending" | "completed";

export type DashboardTaskOrigin = "default" | "recommended" | "manual";

export type DashboardTask = {
  id: string;
  user_id: string;
  project_id: string;
  task_date: string;
  scheduled_time: string;
  title: string;
  subtitle: string;
  section_id: DashboardSectionId | string;
  status: DashboardTaskStatus;
  sort_order: number;
  generation_key: string;
  deleted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Recommendation-engine metadata (migration 017). Optional so existing rows and
  // the demo/fixture tasks remain valid without them.
  origin?: DashboardTaskOrigin | string | null;
  task_weight?: number | null;
  counts_toward_daily_target?: boolean | null;
  estimated_minutes?: number | null;
  difficulty?: "easy" | "medium" | "hard" | string | null;
  input_hash?: string | null;
  recommendation_run_id?: string | null;
};

export type DashboardActivityEvent = {
  id: string;
  user_id: string;
  project_id: string;
  event_type: string;
  section_id: string;
  label: string;
  created_at: string;
};

export type DashboardSourceData = {
  pdfs: Array<Record<string, unknown>>;
  highlights: Array<Record<string, unknown>>;
  annotations: Array<Record<string, unknown>>;
  literatureEntries: Array<Record<string, unknown>>;
  paperSections: Array<Record<string, unknown>>;
  metaAnalysis: MetaAnalysis | null;
  codes: Array<Record<string, unknown>>;
  courseModules: Array<Record<string, unknown>>;
  courseVideos: Array<Record<string, unknown>>;
  courseProgress: Array<Record<string, unknown>>;
  courseNotes: Array<Record<string, unknown>>;
  tasks: DashboardTask[];
  activityEvents: DashboardActivityEvent[];
  /**
   * Meaningful activity events for the Activity Log, fetched separately with page-load
   * noise (project_opened/research_focus_opened) excluded at the DB level — so real
   * events surface even when recent rows are dominated by opens. Falls back to
   * activityEvents when absent (e.g. demo).
   */
  activityFeed?: DashboardActivityEvent[];
  /**
   * Last 4 characters of the user's connected OpenRouter key (from
   * `user_ai_settings.key_last4`), or null/undefined when no key is connected —
   * drives `aiUsage.lane` (docs/ai-usage-card-spec.md §Data contract). Optional so
   * demo/fixture source data (which never sets it) still derives the sane
   * "default lane, no key" fallback.
   */
  aiKeyLast4?: string | null;
  /**
   * Count of this user's `ai_usage_events` rows since the start of the current UTC
   * calendar month (any lane) — drives `aiUsage.usedThisMonth`. Optional for the
   * same demo/fixture reason as `aiKeyLast4`.
   */
  aiUsageCountThisMonth?: number;
};

export type DashboardSectionData = {
  id: DashboardSectionId;
  label: string;
  percent: number;
  badgeLabel?: string;
  stats: Array<[string, string]>;
  bottleneckLabel: string;
  bottleneck: string[];
  nextLabel: string;
  next: string[];
  activity?: Array<["chart" | "file" | "folder" | "edit" | "quote" | "clipboard", string, string]>;
  button: string;
};

export type GreetingTimeOfDay = "morning" | "afternoon" | "evening";

export type DashboardDerivedState = {
  activeSectionId: DashboardSectionId;
  /** Deterministic greeting: time-of-day + the real "useful move today" line. */
  greeting: { timeOfDay: GreetingTimeOfDay; focusLine: string };
  currentProject: {
    title: string;
    tag: string;
    currentSection: string;
    lastOpened: string;
  };
  todayTarget: {
    target: number;
    done: number;
    remaining: number;
    /** doneToday / dailyTarget (0..1), precise — for the card ring, not rounded display. */
    ringProgress: number;
  };
  /** Pace/finish summary for the card — derived from the SAME todayTargetModel. */
  todayTargetSummary: DashboardTargetPaceSummary;
  /** The full unified Today's Target model (single source for every target number). */
  todayTargetModel: TodayTargetModel;
  /** Raw research counts — lets the Target Settings preview recompute the SAME model. */
  researchCounts: ResearchCounts;
  /** Deterministic AI quality signals used for this snapshot (for storage/calibration). */
  aiSignals: AiQualitySignals;
  /** Weighted completion fraction of today's counting tasks (0..1). */
  todayTaskCompletion: number;
  todayTaskLabels: string[];
  localSetup: {
    readyCount: number;
    totalCount: number;
    percent: number;
    summary: string;
    checks: Array<[string, boolean]>;
  };
  /**
   * AI usage-meter data for the dashboard card (docs/ai-usage-card-spec.md
   * §Data contract) — Codex repaints the card that currently reads `localSetup`
   * to use this instead. `localSetup` stays populated during the transition.
   */
  aiUsage: {
    lane: "default" | "byok";
    usedThisMonth: number;
    allowance: number | null;
    keyLast4: string | null;
  };
  analytics: {
    weeklyActivity: number;
    weeklyDelta: number;
    weeklySeries: number[];
    totalProgress: number;
    totalDelta: number;
  };
  recentChanges: Array<{
    title: string;
    subtitle: string;
    time: string;
  }>;
  researchSections: DashboardSectionData[];
  researchFocus: {
    /** The real next move's target section — "Start next move" routes here. */
    bottleneckSection: DashboardSectionId;
    recommended: string;
    readinessSummary: string;
    health: Array<{ label: string; value: string; tone: "green" | "amber" | "purple" | "red" }>;
    watchPoint: string;
    estimatedTime: string;
    currentStatus: string;
    nextBestMove: string;
  };
  continueLearning: ContinueLearningResult;
  scheduleTasks: DashboardTask[];
};

type LocalSetupInput = {
  agentReady: boolean;
  ollamaReady: boolean;
  folderReady?: boolean;
  safetyReady: boolean;
};

const DEFAULT_TASKS = [
  {
    key: "literature-review-sprint",
    scheduled_time: "09:00",
    title: "Literature review sprint",
    subtitle: "Rows 13-26",
    section_id: "literature-review",
  },
  {
    key: "evidence-connection",
    scheduled_time: "10:30",
    title: "Evidence connection",
    subtitle: "Synthesis table",
    section_id: "literature-review",
  },
  {
    key: "source-note-cleanup",
    scheduled_time: "13:00",
    title: "Source note cleanup",
    subtitle: "Add notes & tags",
    section_id: "workspace",
  },
  {
    key: "project-check-in",
    scheduled_time: "15:00",
    title: "Project check-in",
    subtitle: "Review next steps",
    section_id: "notes",
  },
] as const;

function pct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function nonEmpty(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueCount(rows: Array<Record<string, unknown>>, key: string) {
  return new Set(rows.map((row) => row[key]).filter(Boolean)).size;
}

function relativeTime(value?: string, now: number = Date.now()) {
  if (!value) return "Not opened yet";
  const delta = now - new Date(value).getTime();
  if (!Number.isFinite(delta) || delta < 0) return "Recently";
  const minutes = Math.floor(delta / 60000);
  if (minutes < 60) return minutes <= 1 ? "Just now" : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

const ACTIVITY_WEIGHTS: Record<string, number> = {
  project_opened: 1,
  research_focus_opened: 1,
  dashboard_schedule_updated: 1,
  highlight_created: 2,
  note_created: 2,
  dashboard_task_completed: 3,
  source_uploaded: 4,
  literature_row_saved: 4,
  meta_analysis_updated: 5,
  paper_draft_saved: 5,
};

function activityWeight(event: DashboardActivityEvent) {
  return ACTIVITY_WEIGHTS[event.event_type] ?? 1;
}

function activityUnits(events: DashboardActivityEvent[], daysBack: number, offsetDays = 0) {
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() - offsetDays);
  const start = new Date(end);
  start.setDate(end.getDate() - daysBack);
  return events.reduce((sum, event) => {
    const created = new Date(event.created_at);
    if (created < start || created > end) return sum;
    return sum + activityWeight(event);
  }, 0);
}

function activityUnitSeries(events: DashboardActivityEvent[], days = 7) {
  const now = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (days - index - 1));
    const day = getLocalDay(date);
    return events
      .filter((event) => isSameLocalDay(event.created_at, day))
      .reduce((sum, event) => sum + activityWeight(event), 0);
  });
}

// Page-load noise excluded from the Activity Log (also filtered at the DB query).
const RECENT_CHANGE_EXCLUSIONS = new Set(["project_opened", "research_focus_opened", "dashboard_loaded"]);

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

/**
 * Build the Activity Log from real events: drop page-load noise, dedupe repeated
 * same-type events into 30-minute buckets, and keep the most recent 4. Returns an
 * empty array when there is no meaningful activity (the UI shows an honest empty
 * state — never fake rows).
 */
export function buildRecentChanges(
  events: DashboardActivityEvent[],
  now: number = Date.now()
): Array<{ title: string; subtitle: string; time: string }> {
  const meaningful = events
    .filter((event) => !RECENT_CHANGE_EXCLUSIONS.has(event.event_type))
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const seen = new Set<string>();
  const deduped: DashboardActivityEvent[] = [];
  for (const event of meaningful) {
    const bucket = Math.floor(new Date(event.created_at).getTime() / THIRTY_MINUTES_MS);
    const key = `${event.event_type}:${bucket}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(event);
    if (deduped.length === 4) break;
  }

  return deduped.map((event) => ({
    title: recentChangeTitle(event),
    subtitle: recentChangeSubtitle(event),
    time: relativeTime(event.created_at, now),
  }));
}

/** Deterministic greeting: time-of-day + the supplied "useful move today" line. */
export function buildGreeting(now: Date, focusLine: string): { timeOfDay: GreetingTimeOfDay; focusLine: string } {
  const hour = now.getHours();
  const timeOfDay: GreetingTimeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return { timeOfDay, focusLine };
}

export type ResearchFocusInput = {
  scores: SectionScores;
  /** Literature rows that carry a code or theme — drives "Theme clarity". */
  codedRows: number;
  /** Literature rows that carry the user's own notes — drives a watch point. */
  noteRows: number;
  paceMode: DashboardPaceMode;
};

export type ResearchFocusResult = {
  bottleneckSection: DashboardSectionId;
  recommended: string;
  readinessSummary: string;
  health: Array<{ label: string; value: string; tone: "green" | "amber" | "purple" | "red" }>;
  watchPoint: string;
  estimatedTime: string;
  currentStatus: string;
  nextBestMove: string;
};

// A stage must reach GATE before the next stage in the pipeline is even considered
// (you can't sensibly "polish citations" before there's a draft); below GOOD a stage
// still counts as a bottleneck candidate.
const RESEARCH_GATE = 0.4;
const RESEARCH_GOOD = 0.7;

/**
 * Deterministic, local Research Readiness — the real bottleneck + next move, health,
 * current status, and readiness summary, all from the formula section scores. Takes NO schedule/task
 * input by design: the "schedule back-edge" stays removed (the card never reads the plan).
 */
export function computeResearchFocus(input: ResearchFocusInput): ResearchFocusResult {
  const { scores, codedRows, noteRows, paceMode } = input;
  const lit = scores.literatureReviewScore;
  const meta = scores.metaAnalysisScore;
  const synth = scores.workspaceSynthesisScore;
  const draft = scores.paperDraftScore;
  const cite = scores.citationScore;

  // How big a chunk to suggest, by pace. At pace "low" (qty "1") nouns read as singular.
  const qty = paceMode === "high" ? "3–4" : paceMode === "low" ? "1" : "2–3";
  const unit = (singular: string, plural: string) => (qty === "1" ? singular : plural);

  // Research pipeline in deliverable order, each gated by its prerequisite. The bottleneck
  // is the weakest UNLOCKED stage (earliest on ties); gating keeps draft/citations from
  // being recommended before there is evidence/synthesis to support them.
  const stages: Array<{ id: DashboardSectionId; score: number; unlocked: boolean; move: string }> = [
    {
      id: "literature-review",
      score: lit,
      unlocked: true,
      move: `Add ${qty} literature ${unit("row", "rows")} with codes to build your evidence base.`,
    },
    {
      id: "meta-analysis",
      score: meta,
      unlocked: lit >= RESEARCH_GATE,
      move: `Add ${qty} effect ${unit("size", "sizes")} with sample sizes to firm up the meta-analysis.`,
    },
    {
      id: "workspace",
      score: synth,
      unlocked: lit >= RESEARCH_GATE,
      move: `Turn your strongest evidence into ${qty} synthesis ${unit("paragraph", "paragraphs")} in the workspace.`,
    },
    {
      id: "draft",
      score: draft,
      unlocked: lit >= RESEARCH_GATE && synth >= RESEARCH_GATE,
      move: `Draft ${qty} ${unit("paragraph", "paragraphs")} from your synthesis — write it up, don't gather more.`,
    },
    {
      id: "citations",
      score: cite,
      unlocked: draft >= RESEARCH_GATE,
      move: `Link ${qty} ${unit("citation", "citations")} to claims in your draft to close coverage gaps.`,
    },
  ];

  const unlocked = stages.filter((stage) => stage.unlocked);
  let bottleneck = unlocked[0];
  for (const stage of unlocked) {
    if (stage.score < bottleneck.score) bottleneck = stage;
  }
  const allStrong = unlocked.every((stage) => stage.score >= RESEARCH_GOOD);

  const recommended = allStrong
    ? "Every section is in good shape — tighten your weakest claims and keep the draft moving."
    : bottleneck.move;

  const anyResearchStarted = lit > 0 || meta > 0 || synth > 0 || draft > 0 || cite > 0 || codedRows > 0 || noteRows > 0;
  const readiness = (() => {
    if (!anyResearchStarted) {
      return {
        summary: "You haven’t started building your research yet. Let’s take the first step.",
        currentStatus: "No research started",
        nextBestMove: "Define topic and goal",
      };
    }
    if (lit === 0 && meta === 0 && synth === 0 && draft === 0 && cite === 0) {
      return {
        summary: "You have a topic, but no evidence base yet. Start gathering initial sources.",
        currentStatus: "Topic defined",
        nextBestMove: "Add first sources",
      };
    }
    if (lit > 0 && codedRows === 0 && synth === 0) {
      return {
        summary: "Sources are collected, but they have not been reviewed or annotated yet.",
        currentStatus: "Sources collected",
        nextBestMove: "Review and annotate sources",
      };
    }
    if (allStrong) {
      return {
        summary: "Your research is organized, supported, and ready to be packaged into a final output.",
        currentStatus: "Ready to export",
        nextBestMove: "Generate final report",
      };
    }
    if (lit >= RESEARCH_GOOD && cite >= RESEARCH_GOOD && codedRows >= 3 && synth >= RESEARCH_GOOD) {
      return {
        summary: "Your research base is strong enough to begin connecting findings into a clear synthesis.",
        currentStatus: "Ready for synthesis",
        nextBestMove: "Start synthesizing findings",
      };
    }
    if (draft > 0) {
      return {
        summary: "A draft is taking shape, but some sections still need stronger research support.",
        currentStatus: "Draft in progress",
        nextBestMove: "Fill evidence gaps",
      };
    }
    if (codedRows < 3 && noteRows > codedRows) {
      return {
        summary: "You have sources and notes, but your central direction is still too scattered.",
        currentStatus: "Direction unclear",
        nextBestMove: "Group notes into themes",
      };
    }
    if (cite < lit - 0.25) {
      return {
        summary: "Your ideas are developing well, but too many claims still lack direct support.",
        currentStatus: "Claims need support",
        nextBestMove: "Link claims to evidence",
      };
    }
    if (lit >= RESEARCH_GATE && (meta < RESEARCH_GATE || synth < RESEARCH_GATE)) {
      return {
        summary: "You have useful material, but your evidence is uneven across perspectives or source types.",
        currentStatus: "Evidence is uneven",
        nextBestMove: "Add missing perspectives",
      };
    }
    return {
      summary: "Your theme is forming, but evidence and citations still need more support.",
      currentStatus: "Building foundation",
      nextBestMove: "Strengthen weak claims",
    };
  })();

  // Watch point: the most pressing real risk, else a calm note. Never an invented count.
  let watchPoint: string;
  if (lit < RESEARCH_GATE) {
    watchPoint = "Your evidence base is thin — add a few literature rows first.";
  } else if (cite < lit - 0.25) {
    watchPoint = "Citations are lagging your evidence — link sources to your claims.";
  } else if (noteRows > codedRows + 2) {
    watchPoint = "You have notes that aren't coded into themes yet.";
  } else if (draft < synth - 0.25) {
    watchPoint = "Synthesis is ahead of your draft — start writing it up.";
  } else {
    watchPoint = "Nothing urgent — keep building your strongest section.";
  }

  // Time estimate from how far the bottleneck sits below "good", nudged by pace. Tied to
  // research work — NOT to local-agent setup readiness.
  const gap = Math.max(0, RESEARCH_GOOD - bottleneck.score);
  let lo = gap >= 0.5 ? 30 : gap >= 0.25 ? 20 : 10;
  let hi = gap >= 0.5 ? 45 : gap >= 0.25 ? 30 : 20;
  if (paceMode === "high") {
    lo += 5;
    hi += 10;
  } else if (paceMode === "low") {
    lo = Math.max(5, lo - 5);
    hi = Math.max(lo + 5, hi - 10);
  }

  return {
    bottleneckSection: bottleneck.id,
    recommended,
    readinessSummary: readiness.summary,
    health: [
      { label: "Source balance", value: lit >= 0.7 ? "Strong" : lit > 0 ? "In progress" : "Not started", tone: lit >= 0.7 ? "green" : lit > 0 ? "purple" : "purple" },
      { label: "Claim support", value: cite >= 0.7 ? "Strong" : cite > 0 ? "In progress" : "Not started", tone: cite >= 0.7 ? "green" : cite > 0 ? "purple" : "purple" },
      { label: "Theme clarity", value: codedRows >= 3 ? "Strong" : codedRows > 0 || noteRows > 0 ? "In progress" : "Not started", tone: codedRows >= 3 ? "green" : codedRows > 0 || noteRows > 0 ? "purple" : "purple" },
      {
        label: "Synthesis readiness",
        value: synth >= 0.7 ? "Ready" : synth > 0 ? "Needs work" : anyResearchStarted ? "Not ready" : "Not started",
        tone: synth >= 0.7 ? "green" : synth > 0 ? "amber" : anyResearchStarted ? "red" : "purple",
      },
    ],
    watchPoint,
    estimatedTime: `${lo}-${hi} min`,
    currentStatus: readiness.currentStatus,
    nextBestMove: readiness.nextBestMove,
  };
}

export type LearningStatus = "no_catalog" | "not_started" | "in_progress" | "complete" | "coming_soon";

export type ContinueLearningResult = {
  status: LearningStatus;
  statusLabel: string;
  statusTone: "green" | "amber" | "neutral";
  lesson: string;
  lessonNumber: string;
  lessonTitle: string;
  sectionLabel: string;
  moduleLabel: string;
  outputLabel: string;
  body: string;
  progress: number;
  stats: Array<[string, string, string]>;
};

export type ContinueLearningInput = {
  modules: Array<Record<string, unknown>>;
  videos: Array<Record<string, unknown>>;
  progress: Array<Record<string, unknown>>;
  notes: Array<Record<string, unknown>>;
};

/**
 * Deterministic, local Continue Learning from the real course catalog + the user's watched
 * lessons and notes. Progress, "remaining", and module completion count PUBLISHED lessons
 * only; lessons in not-yet-published modules are "coming soon" and never count toward
 * progress. Honest empty/not-started states — the Sample tag is decided upstream and only
 * applies to demo/fallback data, never to a real catalog a user simply hasn't started.
 */
export function computeContinueLearning(input: ContinueLearningInput): ContinueLearningResult {
  const str = (value: unknown) => (typeof value === "string" ? value : "");
  const num = (value: unknown) => (typeof value === "number" ? value : 0);

  // The query already filters is_published; guard anyway so an unpublished row never leaks.
  const publishedModules = input.modules.filter((module) => module.is_published !== false);
  const publishedModuleIds = new Set(publishedModules.map((module) => str(module.id)).filter(Boolean));
  const moduleOrder = new Map(publishedModules.map((module) => [str(module.id), num(module.module_order)]));

  const isPublishedVideo = (video: Record<string, unknown>) => publishedModuleIds.has(str(video.module_id));
  const publishedVideos = input.videos.filter(isPublishedVideo);
  const upcomingVideos = input.videos.filter((video) => !isPublishedVideo(video));

  const watched = new Set(input.progress.map((row) => str(row.video_id)).filter(Boolean));
  const watchedCount = publishedVideos.filter((video) => watched.has(str(video.id))).length;
  const publishedCount = publishedVideos.length;
  const upcomingCount = upcomingVideos.length;
  const remaining = Math.max(0, publishedCount - watchedCount);
  const notesCount = input.notes.length;

  // A module is "completed" only when it has published lessons and every one is watched.
  const modulesCompleted = publishedModules.filter((module) => {
    const lessons = publishedVideos.filter((video) => str(video.module_id) === str(module.id));
    return lessons.length > 0 && lessons.every((video) => watched.has(str(video.id)));
  }).length;

  const progress = publishedCount > 0 ? Math.round((watchedCount / publishedCount) * 100) : 0;

  // Next published lesson in (module order, lesson order).
  const ordered = [...publishedVideos].sort((a, b) => {
    const orderA = moduleOrder.get(str(a.module_id)) ?? 0;
    const orderB = moduleOrder.get(str(b.module_id)) ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return num(a.video_order) - num(b.video_order);
  });
  const nextVideo = ordered.find((video) => !watched.has(str(video.id)));
  const nextTitle = str(nextVideo?.title) || "Untitled lesson";
  const nextModule = publishedModules.find((module) => str(module.id) === str(nextVideo?.module_id));
  const nextModuleOrder = moduleOrder.get(str(nextVideo?.module_id)) ?? num(nextModule?.module_order);
  const moduleNumber = str(nextModule?.module_number) || str(nextModule?.moduleNumber) || (nextModuleOrder > 0 ? String(nextModuleOrder) : "");
  const moduleTitle = str(nextModule?.title) || "Course content";
  const sectionNumber =
    str(nextVideo?.section_number) ||
    str(nextVideo?.sectionNumber) ||
    (moduleNumber ? `${moduleNumber}.1` : "");
  const sectionTitle = str(nextVideo?.section_title) || str(nextVideo?.sectionTitle) || moduleTitle;
  const lessonNumber =
    str(nextVideo?.lesson_number) ||
    str(nextVideo?.lessonNumber) ||
    (sectionNumber && num(nextVideo?.video_order) > 0 ? `${sectionNumber}.${num(nextVideo?.video_order)}` : "");
  const currentModuleLabel = moduleNumber ? `Module ${moduleNumber} — ${moduleTitle}` : `Module — ${moduleTitle}`;
  const currentSectionLabel = sectionNumber ? `Section ${sectionNumber} — ${sectionTitle}` : `Section — ${sectionTitle}`;
  const outputText =
    str(nextVideo?.student_output) ||
    str(nextVideo?.studentOutput) ||
    str(nextVideo?.lesson_output) ||
    str(nextVideo?.lessonOutput) ||
    str(nextVideo?.final_output) ||
    str(nextVideo?.finalOutput) ||
    str(nextVideo?.artifact_label) ||
    str(nextVideo?.artifactLabel) ||
    "Save this lesson artifact";
  const currentOutputLabel = `Output — ${outputText}`;

  let status: LearningStatus;
  if (publishedCount === 0) status = upcomingCount > 0 ? "coming_soon" : "no_catalog";
  else if (watchedCount === 0) status = "not_started";
  else if (remaining > 0) status = "in_progress";
  else status = "complete";

  let lesson = "—";
  let lessonNumberLabel = "";
  let lessonTitle = "—";
  let sectionLabel = "Section — Course content";
  let moduleLabel = "Module — Course content";
  let outputLabel = "Output — Course artifact";
  let body = "";
  let statusLabel = "Coming soon";
  let statusTone: "green" | "amber" | "neutral" = "neutral";
  switch (status) {
    case "no_catalog":
      lesson = "No lessons available yet";
      lessonTitle = lesson;
      sectionLabel = "Section — No lessons available yet";
      moduleLabel = "Module — Course content";
      outputLabel = "Output — Course artifact";
      body = "Courses are coming soon — check back later.";
      break;
    case "coming_soon":
      lesson = "New lessons coming soon";
      lessonTitle = lesson;
      sectionLabel = "Section — New lessons coming soon";
      moduleLabel = "Module — Course content";
      outputLabel = "Output — Course artifact";
      body = "New modules are on the way — lessons will appear here once they're published.";
      break;
    case "not_started":
      lesson = nextTitle;
      lessonNumberLabel = lessonNumber;
      lessonTitle = nextTitle;
      sectionLabel = currentSectionLabel;
      moduleLabel = currentModuleLabel;
      outputLabel = currentOutputLabel;
      body = `${publishedCount} ${publishedCount === 1 ? "lesson" : "lessons"} available. Start with “${nextTitle}”.`;
      statusLabel = "Not started";
      statusTone = "amber";
      break;
    case "in_progress":
      lesson = nextTitle;
      lessonNumberLabel = lessonNumber;
      lessonTitle = nextTitle;
      sectionLabel = currentSectionLabel;
      moduleLabel = currentModuleLabel;
      outputLabel = currentOutputLabel;
      body = `${watchedCount} of ${publishedCount} lessons complete. Next up: “${nextTitle}”.`;
      statusLabel = "In progress";
      statusTone = "green";
      break;
    case "complete":
      lesson = upcomingCount > 0 ? "You're caught up" : "You're all caught up";
      lessonTitle = lesson;
      sectionLabel = "Section — Published lessons complete";
      moduleLabel = "Module — Course content";
      outputLabel = "Output — Course artifacts complete";
      body =
        upcomingCount > 0
          ? "You're caught up. New lessons are coming soon."
          : "You've completed every published lesson. Nice work.";
      statusLabel = "Complete";
      statusTone = "green";
      break;
  }

  // Badges are earned when a published module is fully completed.
  const earnedBadges: [string, string, string] = [String(modulesCompleted), "Earned badges", "earned"];

  return {
    status,
    statusLabel,
    statusTone,
    lesson,
    lessonNumber: lessonNumberLabel,
    lessonTitle,
    sectionLabel,
    moduleLabel,
    outputLabel,
    body,
    progress,
    stats: [
      [String(modulesCompleted), "Modules", "completed"],
      [String(watchedCount), "Lessons", "done"],
      [String(notesCount), "Notes", "created"],
      earnedBadges,
    ],
  };
}

function recentChangeTitle(event: DashboardActivityEvent) {
  const label = event.label.trim();

  switch (event.event_type) {
    case "source_uploaded":
      return "Added source to Evidence Library";
    case "literature_row_saved":
      return "Updated Literature Review Table";
    case "meta_analysis_updated":
      return "Mapped synthesis assumptions";
    case "paper_draft_saved":
      return "Saved Paper Draft section";
    case "highlight_created":
      return "Captured source highlight";
    case "note_created":
      return "Saved source note";
    case "dashboard_task_completed":
      return label ? `Completed ${label.toLowerCase()}` : "Completed research checkpoint";
    case "dashboard_schedule_updated":
      return "Updated research schedule";
    default:
      return label || event.event_type.replaceAll("_", " ");
  }
}

function recentChangeSubtitle(event: DashboardActivityEvent) {
  switch (event.event_type) {
    case "source_uploaded":
      return "Evidence Library • Project sources";
    case "literature_row_saved":
      return "Literature Review Table";
    case "meta_analysis_updated":
      return "Meta-analysis • Synthesis Workspace";
    case "paper_draft_saved":
      return "Paper Draft • Writing workspace";
    case "highlight_created":
      return "Source Viewer • Evidence highlights";
    case "note_created":
      return "Workspace Notes • Source notes";
    case "dashboard_task_completed":
      return "Dashboard Tasks • Today";
    case "dashboard_schedule_updated":
      return "Schedule • Research plan";
    default:
      break;
  }

  switch (event.section_id) {
    case "literature-review":
      return "Literature Review Table";
    case "meta-analysis":
      return "Meta-analysis • Synthesis Workspace";
    case "workspace":
      return "ScholarAsk • Evidence Library";
    case "draft":
      return "Paper Draft • Citations";
    default:
      return event.label || "Cerise Scholar";
  }
}

export function buildDefaultDashboardTasks(userId: string, projectId: string, taskDate = getLocalDay()) {
  return DEFAULT_TASKS.map((task, index) => ({
    user_id: userId,
    project_id: projectId,
    task_date: taskDate,
    scheduled_time: task.scheduled_time,
    title: task.title,
    subtitle: task.subtitle,
    section_id: task.section_id,
    status: "pending" as const,
    sort_order: index,
    generation_key: `default:${projectId}:${taskDate}:${task.key}`,
  }));
}

/** Persisted settings the unified Today's Target model needs (subset of the row). */
export type TodayTargetSettingsInput = {
  paceMode: DashboardPaceMode;
  deadlineDate: string;
  workWeekdays: number[];
  skippedDates: string[];
  dailyWorkGoalMinutes: number;
  manualTargetPercent: number | null;
  projectType: ProjectType;
  scope: ProjectScope;
};

export type TodayTargetContext = {
  settings: TodayTargetSettingsInput;
  projectStartDate: Date;
  today: Date;
  /** True when the user has a persisted Today's Target row (drives the "target set" check). */
  hasPersistedTarget?: boolean;
};

const DEFAULT_TARGET_SETTINGS: TodayTargetSettingsInput = {
  paceMode: "moderate",
  deadlineDate: "",
  workWeekdays: [1, 2, 3, 4, 5],
  skippedDates: [],
  dailyWorkGoalMinutes: 90,
  manualTargetPercent: null,
  projectType: DEFAULT_PROJECT_TYPE,
  scope: { ...DEFAULT_PROJECT_SCOPE },
};

function parseLocalDate(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/** "work days per week" count -> sorted weekday array (Mon-first), matching projectSettings. */
function countToWeekdaysLocal(count: number): number[] {
  const n = Math.max(1, Math.min(7, Math.round(count) || 5));
  return [1, 2, 3, 4, 5, 6, 0].slice(0, n).sort((a, b) => a - b);
}

function targetStatusLabel(status: TodayTargetModel["status"]): string {
  switch (status) {
    case "complete":
      return "Project complete";
    case "deadline_at_risk":
      return "Deadline at risk";
    case "at_risk":
      return "At risk";
    case "on_track":
      return "On track";
    default:
      return "In progress";
  }
}

/** Build the card's pace/finish summary from the unified model (same source). */
export function todayTargetModelToPaceSummary(
  model: TodayTargetModel,
  paceMode: DashboardPaceMode
): DashboardTargetPaceSummary {
  const pace = DASHBOARD_PACE_OPTIONS.find((option) => option.mode === paceMode) ?? DASHBOARD_PACE_OPTIONS[0];
  return {
    deadlineLabel: model.deadlineLabel ?? "Not set",
    daysLeft: model.activeDaysLeft,
    expectedFinishDate: model.paceTargetDate,
    expectedFinishLabel: model.expectedFinishLabel,
    paceDescription: pace.description,
    paceLabel: pace.label,
    paceMultiplier: pace.multiplier,
    statusLabel: targetStatusLabel(model.status),
  };
}

/**
 * Compute the unified Today's Target model from the UI-local settings shape. Used by
 * the Target Settings preview so the modal and the main card read the EXACT same model
 * for the same settings (count<->weekday and deadline string<->Date are converted here).
 */
export function computeTodayTargetFromUiSettings(
  ui: DashboardTargetSettings,
  counts: ResearchCounts,
  projectStartDate: Date,
  today: Date,
  completedTaskWeightToday: number,
  base?: { skippedDates?: string[] }
): TodayTargetModel {
  const manualPercent = ui.manualOverride ? Number(ui.manualTargetPercent) : NaN;
  return computeTodayTargetModel({
    projectType: ui.projectType,
    scope: ui.scope,
    counts,
    projectStartDate,
    today,
    userDeadline: parseLocalDate(ui.deadlineDate),
    paceMode: ui.paceMode,
    workWeekdays: countToWeekdaysLocal(ui.workDaysPerWeek),
    skippedDates: base?.skippedDates ?? [],
    completedTaskWeightToday,
    manualTargetPercent: Number.isFinite(manualPercent) ? manualPercent : null,
  });
}

export function deriveDashboardState(
  project: Project,
  data: DashboardSourceData,
  localSetup: LocalSetupInput,
  taskDate = getLocalDay(),
  targetContext?: TodayTargetContext
): DashboardDerivedState {
  const pdfCount = data.pdfs.length;
  const highlightCount = data.highlights.length;
  const annotationCount = data.annotations.length;
  const codeCount = data.codes.length;
  const litCount = data.literatureEntries.length;
  const litSources = uniqueCount(data.literatureEntries, "source") || uniqueCount(data.literatureEntries, "pdf_id");
  const codedRows = data.literatureEntries.filter((entry) => nonEmpty(entry.code_name) || nonEmpty(entry.theme_category)).length;
  const synthesisRows = data.literatureEntries.filter((entry) => nonEmpty(entry.synthesis_paragraph)).length;
  const noteRows = data.literatureEntries.filter((entry) => nonEmpty(entry.user_notes)).length;
  const apaReady = data.literatureEntries.filter((entry) => nonEmpty(entry.apa_reference)).length;
  const citationMetadata = data.literatureEntries.filter((entry) => nonEmpty(entry.authors) && nonEmpty(entry.year)).length;
  const draftSections = data.paperSections.filter((section) => nonEmpty(section.content));
  const meaningfulDraftSections = data.paperSections.filter((section) => String(section.content ?? "").trim().length > 120);
  const meta = data.metaAnalysis;
  const mappingCount = Object.keys(meta?.column_mapping ?? {}).filter((key) => nonEmpty((meta?.column_mapping as Record<string, unknown>)?.[key])).length;
  const canvasCount = Array.isArray(meta?.canvas_blocks) ? meta.canvas_blocks.length : 0;
  const todayTasks = data.tasks
    .filter((task) => task.task_date === taskDate && !task.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order);
  const completedToday = todayTasks.filter((task) => task.status === "completed").length;
  const literatureTargetRows = Math.max(12, litCount + Math.min(8, Math.max(2, pdfCount + 2)));

  const workspaceProgress = pct(
    (pdfCount ? 25 : 0) +
      Math.min(25, highlightCount * 3) +
      Math.min(25, (annotationCount + noteRows) * 4) +
      Math.min(25, codeCount * 5)
  );
  const literatureProgress = pct(
    (litSources ? 25 : 0) +
      Math.min(25, litCount * 2.5) +
      Math.min(25, codedRows * 4) +
      Math.min(25, synthesisRows * 8)
  );
  const metaProgress = pct(
    (nonEmpty(meta?.research_question) ? 20 : 0) +
      (nonEmpty(meta?.hypothesis) ? 20 : 0) +
      (nonEmpty(meta?.hypothesis_type) ? 15 : 0) +
      Math.min(20, mappingCount * 4) +
      Math.min(25, canvasCount * 25)
  );
  // Cerise readiness is a SEPARATE readiness signal (Ready / Learning / Needs setup),
  // not research completion — it never feeds the project progress / completion model.
  const ceriseReadiness = pct(
    (project ? 25 : 0) +
      (workspaceProgress > 0 ? 25 : 0) +
      (literatureProgress > 0 ? 25 : 0) +
      (localSetup.agentReady || localSetup.ollamaReady ? 25 : 0)
  );
  const readyChecks = [
    ["Agent", localSetup.agentReady],
    ["Ollama", localSetup.ollamaReady],
    ["Folder", localSetup.folderReady ?? localSetup.agentReady],
    ["Safety", localSetup.safetyReady],
  ] as Array<[string, boolean]>;
  const readyCount = readyChecks.filter(([, ready]) => ready).length;
  const thisWeek = activityUnits(data.activityEvents, 7);
  const previousWeek = activityUnits(data.activityEvents, 7, 7);
  const weeklySeries = activityUnitSeries(data.activityEvents);
  const weeklyActivity = pct((thisWeek / 45) * 100);
  const weeklyDelta = pct(previousWeek ? ((thisWeek - previousWeek) / previousWeek) * 100 : thisWeek ? 8 : 0);

  // --- Today's Target: ONE unified model drives every number ----------------
  // Only tasks flagged counts_toward_daily_target count (manual tasks excluded unless
  // opted in), weighted by task_weight (recommended weights sum to 1.0; legacy tasks
  // weight equally). This weighted completion fraction feeds the model's done/ring.
  const dailyTargetTasks = todayTasks.filter((task) => task.counts_toward_daily_target !== false);
  const taskTargetWeight = (task: DashboardTask) =>
    typeof task.task_weight === "number" && Number.isFinite(task.task_weight) ? task.task_weight : 1;
  const totalTaskWeight = dailyTargetTasks.reduce((sum, task) => sum + taskTargetWeight(task), 0);
  const completedTaskWeight = dailyTargetTasks
    .filter((task) => task.status === "completed")
    .reduce((sum, task) => sum + taskTargetWeight(task), 0);
  const taskCompletionFraction = totalTaskWeight > 0 ? completedTaskWeight / totalTaskWeight : 0;

  const targetSettings = targetContext?.settings ?? DEFAULT_TARGET_SETTINGS;

  // Real research counts -> the capped section-progress model scores each section
  // against the project type's targets. Some fields are best-available proxies (rows
  // with citation links, evidence-supported / cited / revised sections) until richer
  // signals exist; milestone caps stop early actions from overinflating progress.
  // MEANINGFUL-WORK GATE: count only research evidence that is real, not placeholder/
  // test text and not raw activity. A note counts when it has meaningful text AND is
  // source-linked; a code/theme when it is a real label; synthesis when it reads like
  // a real paragraph; a reference when it has real metadata.
  const sourceLinked = (entry: Record<string, unknown>) =>
    nonEmpty(entry.pdf_id) || nonEmpty(entry.highlight_id) || nonEmpty(entry.source);
  const meaningfulNoteRows = data.literatureEntries.filter(
    (entry) => sourceLinked(entry) && isMeaningfulText(entry.user_notes)
  );
  const meaningfulSynthesisRows = data.literatureEntries.filter((entry) => isMeaningfulText(entry.synthesis_paragraph));
  const meaningfulCodedRows = data.literatureEntries.filter(
    (entry) => isMeaningfulLabel(entry.code_name) && isMeaningfulLabel(entry.theme_category)
  );
  const evidenceFieldRows = data.literatureEntries.filter(
    (entry) =>
      isMeaningfulText(entry.user_notes) ||
      isMeaningfulText(entry.synthesis_paragraph) ||
      (isMeaningfulLabel(entry.code_name) && isMeaningfulLabel(entry.theme_category))
  );
  const themeCount = new Set(
    data.literatureEntries.filter((entry) => isMeaningfulLabel(entry.theme_category)).map((entry) => entry.theme_category)
  ).size;
  // A reference needs at least a real source/title; metadata needs author + year too.
  const referenceRows = data.literatureEntries.filter((entry) => isMeaningfulLabel(entry.source) || nonEmpty(entry.authors));
  const referencesWithMetadata = data.literatureEntries.filter(
    (entry) => nonEmpty(entry.authors) && nonEmpty(entry.year) && (isMeaningfulLabel(entry.source) || nonEmpty(entry.apa_reference))
  ).length;
  // A source is "engaged" (vs intake-only) when it has linked highlights or real evidence.
  const engagedPdfIds = new Set(
    [
      ...data.highlights.map((highlight) => highlight.pdf_id),
      ...meaningfulNoteRows.map((entry) => entry.pdf_id),
    ].filter(Boolean)
  );
  // Meaningful notes include source highlights/annotations only insofar as they are real.
  const meaningfulNotes = meaningfulNoteRows.length;
  const rowsWithCitationLinks = data.literatureEntries.filter(
    (entry) => nonEmpty(entry.apa_reference) || nonEmpty(entry.highlight_id)
  ).length;

  const researchCounts: ResearchCounts = {
    uploadedSources: pdfCount,
    engagedSources: engagedPdfIds.size,
    literatureRows: litCount,
    codedRows: meaningfulCodedRows.length,
    rowsWithNotes: meaningfulNotes,
    rowsWithEvidenceFields: evidenceFieldRows.length,
    rowsWithCitationLinks,
    synthesisUnits: meaningfulSynthesisRows.length,
    highlights: highlightCount,
    notes: meaningfulNotes,
    themeCount,
    outlineSections: data.paperSections.length,
    draftSections: draftSections.length,
    meaningfulLengthSections: meaningfulDraftSections.length,
    evidenceSupportedSections: meaningfulSynthesisRows.length > 0 ? meaningfulDraftSections.length : 0,
    citedSections: apaReady > 0 ? meaningfulDraftSections.length : 0,
    revisedSections: meaningfulDraftSections.length,
    referencesCount: referenceRows.length,
    citationsWithMetadata: referencesWithMetadata,
    apaReadyReferences: apaReady,
    referencesLinkedToRows: Math.min(referencesWithMetadata, meaningfulNoteRows.length + meaningfulSynthesisRows.length),
    duplicateIssues: 0,
    metaQuestionSet: nonEmpty(meta?.research_question),
    metaHypothesisSet: nonEmpty(meta?.hypothesis),
    metaTestSelected: nonEmpty(meta?.hypothesis_type),
    effectsMapped: mappingCount + canvasCount,
    forestPlotReady: canvasCount > 0,
  };
  // AI quality evaluator (deterministic): score the meaningful note/synthesis text so
  // longer fake text (e.g. "this is a test note") lowers section progress via the
  // aiQualityMultiplier. It can only reduce shallow/placeholder work, never inflate.
  const qualitySamples: ResearchTextSample[] = [
    ...meaningfulNoteRows.map((entry) => ({
      text: String(entry.user_notes ?? ""),
      kind: "note" as const,
      sourceLinked: sourceLinked(entry),
    })),
    ...meaningfulSynthesisRows.map((entry) => ({
      text: String(entry.synthesis_paragraph ?? ""),
      kind: "synthesis" as const,
      sourceLinked: true,
    })),
  ];
  const aiSignals = evaluateResearchQuality(qualitySamples);

  const todayTargetModel = computeTodayTargetModel({
    projectType: targetSettings.projectType,
    scope: targetSettings.scope,
    counts: researchCounts,
    projectStartDate: targetContext?.projectStartDate ?? new Date(project.created_at),
    today: targetContext?.today ?? new Date(),
    userDeadline: parseLocalDate(targetSettings.deadlineDate),
    paceMode: targetSettings.paceMode,
    workWeekdays: targetSettings.workWeekdays,
    skippedDates: targetSettings.skippedDates,
    completedTaskWeightToday: taskCompletionFraction,
    manualTargetPercent: targetSettings.manualTargetPercent,
    aiSignals,
  });
  const todayTargetSummary = todayTargetModelToPaceSummary(todayTargetModel, targetSettings.paceMode);
  const targetDisplay = todayTargetModel.dailyTargetPercent;
  const doneDisplay = Math.round(todayTargetModel.doneTodayPercent);
  const remainingDisplay = Math.max(0, targetDisplay - doneDisplay);

  // Research Sections card percents come from the SAME capped section-progress model
  // (0..1 -> 0-100%), so the card, the analytics total, and Today's Target all agree.
  const sectionScores = todayTargetModel.sectionScores;
  const sectionPercents = {
    metaAnalysis: pct(sectionScores.metaAnalysisScore * 100),
    literatureReview: pct(sectionScores.literatureReviewScore * 100),
    workspaceSynthesis: pct(sectionScores.workspaceSynthesisScore * 100),
    paperDraft: pct(sectionScores.paperDraftScore * 100),
    citations: pct(sectionScores.citationScore * 100),
  };
  const activeSectionId: DashboardSectionId =
    sectionScores.metaAnalysisScore >= sectionScores.literatureReviewScore ? "meta-analysis" : "literature-review";

  const litRowsLeft = Math.max(0, literatureTargetRows - litCount);
  const plannedLiteratureRows = Math.max(1, Math.min(4, litRowsLeft || 2));
  const plannedHighlights = Math.max(1, Math.min(3, Math.max(0, pdfCount * 2 - highlightCount) || 3));
  const now = targetContext?.today ?? new Date();
  const lastActivity = data.activityEvents[0]?.created_at ?? project.updated_at;
  // Research Readiness — the connected micro-check model of the whole research journey.
  // The card (summary, health, status, next move) and its "Start next move" routing are all
  // driven by this single model. computeResearchFocus is retained only for the legacy
  // watchPoint/estimatedTime fields still read by the dashboard snapshot.
  // Readiness signals v2.4 (docs/research-readiness-checklist-model.md). Auto-behavior
  // gates are applied HERE so the pure helper only ever sees honest counts: default codes
  // excluded, stub apa_reference filtered by shape, ripeness proxied by insight work until
  // the per-source Finish button ships (then sources.finished carries the real signal).
  const genuineApaRows = data.literatureEntries.filter((entry) => isGenuineApa(String(entry.apa_reference ?? ""))).length;
  const ripeSynthesizedRows = meaningfulNoteRows.filter((entry) => isMeaningfulText(entry.synthesis_paragraph)).length;
  const defaultCodeNames = new Set(DEFAULT_CODES.map((code) => code.name.toLowerCase()));
  const userCodes = data.codes.filter((code) => {
    const name = String(code.name ?? "").trim();
    return name.length > 0 && !defaultCodeNames.has(name.toLowerCase());
  }).length;
  const themedRows = data.literatureEntries.filter((entry) => isMeaningfulLabel(entry.code_name)).length;
  const codedHighlights = data.highlights.filter((highlight) => nonEmpty(highlight.code_id)).length;
  const ocrFailed = data.pdfs.filter((pdf) => String(pdf.ocr_status ?? "") === "failed").length;
  const sectionByKey = (key: string) => data.paperSections.find((section) => String(section.section_key ?? "") === key);
  const meaningfulSection = (key: string) => isMeaningfulText(sectionByKey(key)?.content);
  const readiness = computeResearchReadiness({
    now: now.getTime(),
    titleText: project.name ?? "",
    topicText: project.description ?? "",
    pathwayText: null, // Research Pathway home not shipped yet (checklist model §6.3)
    settings: {
      hasTargetDate: !!targetSettings.deadlineDate,
      hasPace: targetContext?.hasPersistedTarget ?? false,
      hasProjectModel: targetContext?.hasPersistedTarget ?? false,
      expectedSources: targetSettings.scope?.expectedSources ?? null,
    },
    sources: {
      total: pdfCount,
      ocrFailed,
      finished: null, // Finish button not shipped yet (§7)
      insightSources: new Set(meaningfulNoteRows.map((entry) => entry.pdf_id).filter(Boolean)).size,
    },
    highlights: highlightCount,
    meaningfulNotes,
    userCodes,
    themedRows,
    codedHighlightFraction: data.highlights.length > 0 ? codedHighlights / data.highlights.length : 0,
    rows: {
      total: litCount,
      insightful: meaningfulNoteRows.length,
      genuineApa: genuineApaRows,
      synthesized: meaningfulSynthesisRows.length,
      ripe: meaningfulNoteRows.length,
      ripeSynthesized: ripeSynthesizedRows,
    },
    draft: {
      litSection: meaningfulSection("literature_review"),
      coreSections: ["introduction", "methodology", "results", "discussion"].filter(meaningfulSection).length,
      referencesSynced: nonEmpty(sectionByKey("references")?.content),
      abstract: meaningfulSection("abstract"),
      conclusion: meaningfulSection("conclusion"),
    },
    meta: {
      exists: !!meta,
      question: nonEmpty(meta?.research_question),
      hypothesis: nonEmpty(meta?.hypothesis),
      typeSet: nonEmpty(meta?.hypothesis_type),
      mapped: !!meta?.column_mapping && Object.keys(meta.column_mapping).length > 0,
      results: Array.isArray(meta?.canvas_blocks) && meta.canvas_blocks.length > 0,
      requiredByScope: targetSettings.scope?.metaAnalysisRequired ?? false,
    },
    journeyEvents: data.activityEvents.filter((event) => event.event_type === "research_query_submitted").length,
    synthQuality: aiSignals.synthesisReadiness ?? 0,
    recentEvents: data.activityEvents.slice(0, 50).map((event) => ({
      type: event.event_type,
      at: Date.parse(event.created_at),
    })),
  });
  // AI usage-meter data (docs/ai-usage-card-spec.md §Data contract). A connected key
  // (aiKeyLast4 truthy) puts the user on the unlimited BYOK lane; otherwise they're on
  // the Included/default lane with the shared monthly allowance. Both source fields are
  // optional and absent on demo/fixture data, so this naturally falls back to
  // { lane: "default", usedThisMonth: 0, allowance: INCLUDED_MONTHLY_ALLOWANCE, keyLast4: null }.
  const aiUsageLane: "default" | "byok" = data.aiKeyLast4 ? "byok" : "default";
  const aiUsage = {
    lane: aiUsageLane,
    usedThisMonth: data.aiUsageCountThisMonth ?? 0,
    allowance: aiUsageLane === "default" ? INCLUDED_MONTHLY_ALLOWANCE : null,
    keyLast4: data.aiKeyLast4 ?? null,
  };

  const legacyFocus = computeResearchFocus({
    scores: sectionScores,
    codedRows,
    noteRows,
    paceMode: targetSettings.paceMode,
  });
  const researchFocus = {
    bottleneckSection: readiness.nextMoveSectionId,
    recommended: readiness.nextBestMove,
    readinessSummary: readiness.readinessSummary,
    health: readiness.healthRows,
    watchPoint: legacyFocus.watchPoint,
    estimatedTime: legacyFocus.estimatedTime,
    currentStatus: readiness.currentStatus,
    nextBestMove: readiness.nextBestMove,
  };
  // Activity Log from the dedicated meaningful feed when it has rows; otherwise fall
  // back to activityEvents (filtered in-code by buildRecentChanges). Using a length
  // check (not ??) so an empty/failed feed query still falls through. Empty result =>
  // honest empty state, never fake rows.
  const activityForLog =
    data.activityFeed && data.activityFeed.length > 0 ? data.activityFeed : data.activityEvents;
  const recentChanges = buildRecentChanges(activityForLog, now.getTime());
  const greeting = buildGreeting(now, researchFocus.recommended);

  return {
    activeSectionId,
    greeting,
    currentProject: {
      title: project.name,
      tag: litCount > 0 ? "Literature sprint" : "Project setup",
      currentSection: activeSectionId === "meta-analysis" ? "Meta-analysis" : "Literature Review Table",
      lastOpened: relativeTime(lastActivity),
    },
    todayTarget: {
      target: targetDisplay,
      done: doneDisplay,
      remaining: remainingDisplay,
      ringProgress: todayTargetModel.ringProgress,
    },
    todayTargetSummary,
    todayTargetModel,
    researchCounts,
    aiSignals,
    todayTaskCompletion: taskCompletionFraction,
    todayTaskLabels: [
      `${plannedLiteratureRows} literature ${plannedLiteratureRows === 1 ? "row" : "rows"}`,
      `${plannedHighlights} ${plannedHighlights === 1 ? "highlight" : "highlights"}`,
      "1 synthesis paragraph",
    ],
    localSetup: {
      readyCount,
      totalCount: readyChecks.length,
      percent: pct((readyCount / readyChecks.length) * 100),
      summary: readyCount === readyChecks.length ? "Local agent and folder access are connected." : "Finish local setup before private source-file workflows.",
      checks: readyChecks,
    },
    aiUsage,
    analytics: {
      weeklyActivity,
      weeklyDelta,
      weeklySeries,
      totalProgress: pct(todayTargetModel.projectProgressPercent),
      totalDelta: Math.max(0, Math.min(20, completedToday + Math.round(thisWeek / 3))),
    },
    recentChanges,
    researchSections: [
      {
        id: "meta-analysis",
        label: "Meta-analysis",
        percent: sectionPercents.metaAnalysis,
        stats: [
          [nonEmpty(meta?.research_question) ? "1" : "0", "Question set"],
          [nonEmpty(meta?.hypothesis_type) ? "1" : "0", "Test selected"],
          [String(mappingCount), "Effects mapped"],
          [String(canvasCount), "Forest plot"],
        ],
        bottleneckLabel: "Bottleneck",
        bottleneck:
          metaProgress >= 70
            ? ["The hypothesis is ready, but effect sizes need checking.", "Confirm entries before interpreting the forest plot."]
            : ["Set the research question, hypothesis, and effect fields.", "Then Cerise can suggest the right meta-analysis output."],
        nextLabel: "Next step",
        next: [metaProgress >= 70 ? "Review effect sizes, heterogeneity, and the APA result." : "Open Meta-analysis and complete the setup steps."],
        button: "Open meta-analysis",
      },
      {
        id: "literature-review",
        label: "Literature Review Table",
        percent: sectionPercents.literatureReview,
        stats: [
          [String(litSources || pdfCount), "Sources"],
          [String(litCount), "Evidence rows"],
          [String(synthesisRows), "Syntheses"],
          [String(litRowsLeft), "Rows left"],
        ],
        bottleneckLabel: "Bottleneck",
        bottleneck:
          synthesisRows < Math.max(1, Math.round(litCount / 3))
            ? ["Some rows still need notes and synthesis paragraphs.", "Use highlights and insights before exporting the table."]
            : ["The table has useful evidence rows ready for writing.", "Move strongest synthesis paragraphs into the draft."],
        nextLabel: "Next step",
        next: ["Filter by section, then write the next synthesis paragraph."],
        button: "Open table",
      },
      {
        id: "workspace",
        label: "Workspace",
        percent: sectionPercents.workspaceSynthesis,
        stats: [
          [String(pdfCount), "PDFs"],
          [String(highlightCount), "Highlights"],
          [String(annotationCount + noteRows), "Notes"],
          [String(codeCount), "Codes"],
        ],
        bottleneckLabel: "What's next",
        bottleneck:
          pdfCount === 0
            ? ["Add sources for the current project before deeper work.", "Keep source files in the approved local-first workflow when possible."]
            : ["A few highlights still need notes and section codes.", "Tag evidence before moving it into review and draft work."],
        nextLabel: "Recent activity",
        next: [],
        activity: data.activityEvents.slice(0, 3).map((event) => ["folder", event.label || event.event_type.replaceAll("_", " "), relativeTime(event.created_at)]),
        button: "Open workspace",
      },
      {
        id: "draft",
        label: "Paper Draft",
        percent: sectionPercents.paperDraft,
        stats: [
          [String(data.paperSections.length), "Sections"],
          [String(draftSections.length), "With drafts"],
          [String(synthesisRows), "Imported cites"],
          [draftSections.length ? "1" : "0", "Active editor"],
        ],
        bottleneckLabel: "Bottleneck",
        bottleneck:
          draftSections.length === 0
            ? ["The draft needs imported evidence before writing.", "Use section guidance, source snippets, and APA references."]
            : ["The active section needs a cleaner evidence-to-claim pass.", "Use table paragraphs and citations as building blocks."],
        nextLabel: "Next step",
        next: ["Open Paper Writer and draft the next guided section."],
        button: "Open draft",
      },
      {
        id: "citations",
        label: "Citations",
        percent: sectionPercents.citations,
        stats: [
          [String(litCount), "References"],
          [String(apaReady), "APA ready"],
          [String(Math.max(0, litCount - citationMetadata)), "Missing data"],
          ["0", "Duplicate"],
        ],
        bottleneckLabel: "Bottleneck",
        bottleneck:
          apaReady < litCount
            ? ["Several APA references still need missing pages or metadata.", "Clean citations before building the final reference list."]
            : ["Your saved references are ready for draft mapping.", "Check each cited claim before the final export."],
        nextLabel: "Next step",
        next: ["Review APA fields, then map citations to draft claims."],
        button: "Open citations",
      },
      {
        id: "notes",
        label: "Cerise Scholar",
        percent: ceriseReadiness,
        badgeLabel: ceriseReadiness >= 50 ? "Ready" : "Setup",
        stats: [
          ["8", "Pathways"],
          ["12", "Stuck fixes"],
          ["5", "Guides"],
          [todayTasks.length ? "1" : "0", "Next move"],
        ],
        bottleneckLabel: "Research support",
        bottleneck: [
          "Find the right research pathway when the project feels stuck.",
          "Use guided solutions for methods, sources, synthesis, or writing.",
        ],
        nextLabel: "Next step",
        next: ["Open Cerise Scholar for pathway guidance and stuck-point help."],
        button: "Open Cerise Scholar",
      },
    ],
    researchFocus,
    continueLearning: computeContinueLearning({
      modules: data.courseModules,
      videos: data.courseVideos,
      progress: data.courseProgress,
      notes: data.courseNotes,
    }),
    scheduleTasks: todayTasks,
  };
}
