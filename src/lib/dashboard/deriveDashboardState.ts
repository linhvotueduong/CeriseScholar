import type { Project } from "@/types/project";
import type { MetaAnalysis } from "@/types/meta-analysis";
import { getLocalDay, isSameLocalDay } from "@/lib/dashboard/localDay";

export type DashboardSectionId =
  | "meta-analysis"
  | "literature-review"
  | "workspace"
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

export type DashboardDerivedState = {
  activeSectionId: DashboardSectionId;
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
  };
  todayTaskLabels: string[];
  localSetup: {
    readyCount: number;
    totalCount: number;
    percent: number;
    summary: string;
    checks: Array<[string, boolean]>;
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
    recommended: string;
    health: Array<{ label: string; value: string; tone: "green" | "amber" | "purple" }>;
    watchPoint: string;
    estimatedTime: string;
  };
  continueLearning: {
    lesson: string;
    body: string;
    progress: number;
    stats: Array<[string, string, string]>;
  };
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

function relativeTime(value?: string) {
  if (!value) return "Not opened yet";
  const delta = Date.now() - new Date(value).getTime();
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

const TODAY_TARGET_ACTIVITY_EXCLUSIONS = new Set([
  "project_opened",
  "research_focus_opened",
  "dashboard_schedule_updated",
  "dashboard_task_completed",
]);

const TODAY_TARGET_WORK_UNIT_GOAL = 10;

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

const RECENT_CHANGE_EXCLUSIONS = new Set(["project_opened", "research_focus_opened"]);

const RECENT_CHANGE_FALLBACKS = [
  { title: "Saved source from ScholarAsk", subtitle: "ScholarAsk • Evidence Library", time: "1h ago" },
  { title: "Updated literature review row", subtitle: "Literature Review Table", time: "2h ago" },
  { title: "Mapped synthesis assumptions", subtitle: "Meta-analysis • Synthesis Workspace", time: "5h ago" },
  { title: "Saved citation-linked draft note", subtitle: "Paper Draft • Citations", time: "22h ago" },
];

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

export function deriveDashboardState(
  project: Project,
  data: DashboardSourceData,
  localSetup: LocalSetupInput,
  taskDate = getLocalDay()
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
  const draftProgress = pct(
    Math.min(60, draftSections.length * 8) +
      Math.min(25, meaningfulDraftSections.length * 6) +
      Math.min(15, synthesisRows * 2)
  );
  const citationsProgress = pct(
    Math.min(60, apaReady * 5) +
      Math.min(25, citationMetadata * 4) +
      (litCount && apaReady >= Math.max(1, Math.round(litCount * 0.8)) ? 15 : 0)
  );
  const ceriseReadiness = pct(
    (project ? 25 : 0) +
      (workspaceProgress > 0 ? 25 : 0) +
      (literatureProgress > 0 ? 25 : 0) +
      (localSetup.agentReady || localSetup.ollamaReady ? 25 : 0)
  );
  const totalProgress = pct(
    workspaceProgress * 0.15 +
      literatureProgress * 0.25 +
      metaProgress * 0.2 +
      draftProgress * 0.25 +
      citationsProgress * 0.1 +
      ceriseReadiness * 0.05
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
  const todayActivityUnits = data.activityEvents
    .filter((event) => isSameLocalDay(event.created_at, taskDate) && !TODAY_TARGET_ACTIVITY_EXCLUSIONS.has(event.event_type))
    .reduce((sum, event) => sum + activityWeight(event), 0);
  const weeklyActivity = pct((thisWeek / 45) * 100);
  const weeklyDelta = pct(previousWeek ? ((thisWeek - previousWeek) / previousWeek) * 100 : thisWeek ? 8 : 0);
  const target = Math.max(6, Math.min(18, Math.round((100 - totalProgress) / 8)));
  // Today's Target counts ONLY tasks flagged counts_toward_daily_target (manual tasks
  // are excluded unless opted in) and weights each by task_weight when present —
  // recommended tasks carry normalized weights (sum 1.0); legacy/weightless tasks
  // weight equally, matching the old count-based behavior.
  const dailyTargetTasks = todayTasks.filter((task) => task.counts_toward_daily_target !== false);
  const taskTargetWeight = (task: DashboardTask) =>
    typeof task.task_weight === "number" && Number.isFinite(task.task_weight) ? task.task_weight : 1;
  const totalTaskWeight = dailyTargetTasks.reduce((sum, task) => sum + taskTargetWeight(task), 0);
  const completedTaskWeight = dailyTargetTasks
    .filter((task) => task.status === "completed")
    .reduce((sum, task) => sum + taskTargetWeight(task), 0);
  const taskCompletionFraction = totalTaskWeight > 0 ? completedTaskWeight / totalTaskWeight : 0;
  // Completing all counting tasks fills the daily work-unit goal; activity adds on top.
  const todayWorkUnits = taskCompletionFraction * TODAY_TARGET_WORK_UNIT_GOAL + todayActivityUnits;
  const todayDone = Math.min(target, Math.round((todayWorkUnits / TODAY_TARGET_WORK_UNIT_GOAL) * target));
  const litRowsLeft = Math.max(0, literatureTargetRows - litCount);
  const plannedLiteratureRows = Math.max(1, Math.min(4, litRowsLeft || 2));
  const plannedHighlights = Math.max(1, Math.min(3, Math.max(0, pdfCount * 2 - highlightCount) || 3));
  const lastActivity = data.activityEvents[0]?.created_at ?? project.updated_at;
  const recentChanges = data.activityEvents
    .filter((event) => !RECENT_CHANGE_EXCLUSIONS.has(event.event_type))
    .slice(0, 4)
    .map((event) => ({
      title: recentChangeTitle(event),
      subtitle: recentChangeSubtitle(event),
      time: relativeTime(event.created_at),
    }));

  return {
    activeSectionId: metaProgress >= literatureProgress ? "meta-analysis" : "literature-review",
    currentProject: {
      title: project.name,
      tag: litCount > 0 ? "Literature sprint" : "Project setup",
      currentSection: metaProgress >= literatureProgress ? "Meta-analysis" : "Literature Review Table",
      lastOpened: relativeTime(lastActivity),
    },
    todayTarget: {
      target,
      done: todayDone,
      remaining: Math.max(0, target - todayDone),
    },
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
    analytics: {
      weeklyActivity,
      weeklyDelta,
      weeklySeries,
      totalProgress,
      totalDelta: Math.max(0, Math.min(20, completedToday + Math.round(thisWeek / 3))),
    },
    recentChanges: [...recentChanges, ...RECENT_CHANGE_FALLBACKS].slice(0, 4),
    researchSections: [
      {
        id: "meta-analysis",
        label: "Meta-analysis",
        percent: metaProgress,
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
        percent: literatureProgress,
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
        percent: workspaceProgress,
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
        percent: draftProgress,
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
        percent: citationsProgress,
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
    researchFocus: {
      recommended:
        metaProgress >= literatureProgress
          ? "Review model assumptions before adding another analytics chart."
          : "Complete literature rows before moving into another synthesis step.",
      health: [
        { label: "Evidence balance", value: literatureProgress >= 45 ? "Good" : "Needs work", tone: literatureProgress >= 45 ? "green" : "amber" },
        { label: "Citation coverage", value: citationsProgress >= 70 ? "Good" : "Needs work", tone: citationsProgress >= 70 ? "green" : "amber" },
        { label: "Theme clarity", value: codedRows >= 3 ? "Strong" : "Build up", tone: codedRows >= 3 ? "green" : "amber" },
        { label: "Draft readiness", value: draftProgress >= 60 ? "Ready" : "In progress", tone: draftProgress >= 60 ? "green" : "purple" },
      ],
      watchPoint: noteRows > 2 ? `Notes in ${Math.min(noteRows, 9)} rows.` : "Notes in 3 papers.",
      estimatedTime: `${readyCount === readyChecks.length ? "25-35" : "10-15"} min`,
    },
    continueLearning: {
      lesson: "Evidence synthesis",
      body: "Learn how to code and connect evidence across studies, identify patterns, and build a strong synthesis table.",
      progress: data.courseVideos.length ? pct((data.courseProgress.length / data.courseVideos.length) * 100) : 68,
      stats: [
        [String(data.courseModules.length), "Modules", "completed"],
        [String(data.courseProgress.length), "Lessons", "done"],
        [String(data.courseNotes.length), "Notes", "created"],
        [String(Math.max(0, data.courseVideos.length - data.courseProgress.length)), "Lessons", "remaining"],
      ],
    },
    scheduleTasks: todayTasks,
  };
}
