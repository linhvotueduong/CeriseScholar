import type { MetaAnalysis } from "@/types/meta-analysis";
import type { DashboardActivityEvent, DashboardSourceData, DashboardTask } from "@/lib/dashboard/deriveDashboardState";
import { getLocalDay } from "@/lib/dashboard/localDay";

type BuildDemoDashboardSourceDataParams = {
  userId: string;
  projectId: string;
  now?: Date;
};

function isoDaysAgo(now: Date, daysAgo: number, hour = 10, minute = 0) {
  const next = new Date(now);
  next.setDate(now.getDate() - daysAgo);
  next.setHours(hour, minute, 0, 0);
  return next.toISOString();
}

function demoId(prefix: string, index: number) {
  return `demo-${prefix}-${String(index).padStart(2, "0")}`;
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasProjectDashboardData(data: DashboardSourceData) {
  return (
    data.pdfs.length > 0 ||
    data.highlights.length > 0 ||
    data.annotations.length > 0 ||
    data.literatureEntries.length > 0 ||
    data.codes.length > 0 ||
    data.paperSections.some((section) => hasText(section.content)) ||
    hasText(data.metaAnalysis?.research_question)
  );
}

function hasUserTaskSignal(tasks: DashboardTask[]) {
  return tasks.some((task) => task.completed_at || task.generation_key.startsWith("manual:"));
}

function hasUserActivitySignal(events: DashboardActivityEvent[]) {
  return events.some((event) => !event.id.startsWith("demo-") && event.event_type !== "project_opened");
}

export function hasMeaningfulDashboardSourceData(data: DashboardSourceData) {
  return hasProjectDashboardData(data) || data.courseProgress.length > 0 || data.courseNotes.length > 0;
}

// Continue Learning shows real data whenever ANY real course row exists (the catalog is
// global, so a real published catalog counts even with 0 watched lessons). Only a totally
// empty catalog gets demo/fallback data — and only that case earns the "Sample" tag.
function hasRealCourseData(data: DashboardSourceData) {
  return (
    data.courseModules.length > 0 ||
    data.courseVideos.length > 0 ||
    data.courseProgress.length > 0 ||
    data.courseNotes.length > 0
  );
}

/**
 * Per-source breakdown of which dashboard data is sample/demo (vs the user's real
 * work). Drives the "Sample data" badge + per-card sample tags. `research` is true
 * only when the project has no real research data at all (full demo).
 */
export type DashboardDemoState = {
  usingDemo: boolean;
  research: boolean;
  schedule: boolean; // tasks (Today's Schedule)
  activity: boolean; // activity events (Activity Log / Recent Changes)
  learning: boolean; // course catalog/progress (Continue Learning)
};

export function applyDemoDashboardFallback(
  data: DashboardSourceData,
  params: BuildDemoDashboardSourceDataParams
): { data: DashboardSourceData; usingDemo: boolean; demo: DashboardDemoState } {
  const demo = buildDemoDashboardSourceData(params);

  if (hasProjectDashboardData(data)) {
    // Real research data wins — only the schedule + activity may be sample, and only
    // when BOTH lack a real signal (unchanged behavior). Research is never demo here.
    const needsDashboardDemo = !hasUserTaskSignal(data.tasks) && !hasUserActivitySignal(data.activityEvents);
    const state: DashboardDemoState = {
      usingDemo: needsDashboardDemo,
      research: false,
      schedule: needsDashboardDemo,
      activity: needsDashboardDemo,
      // Real research project keeps its real (global) course data — never demo here.
      learning: false,
    };
    return {
      // When the schedule/activity are sample, drop the real activityFeed so the
      // Activity Log shows the demo events that match its "Sample" tag.
      data: needsDashboardDemo
        ? { ...data, tasks: demo.tasks, activityEvents: demo.activityEvents, activityFeed: undefined }
        : data,
      usingDemo: state.usingDemo,
      demo: state,
    };
  }

  // No real research data -> full demo for research; tasks/activity stay real only if
  // they carry a real signal (real-data-wins per source).
  const scheduleDemo = !hasUserTaskSignal(data.tasks);
  const activityDemo = !hasUserActivitySignal(data.activityEvents);
  return {
    data: {
      ...demo,
      courseModules: data.courseModules.length ? data.courseModules : demo.courseModules,
      courseVideos: data.courseVideos.length ? data.courseVideos : demo.courseVideos,
      courseProgress: data.courseProgress.length ? data.courseProgress : demo.courseProgress,
      courseNotes: data.courseNotes.length ? data.courseNotes : demo.courseNotes,
      tasks: scheduleDemo ? demo.tasks : data.tasks,
      activityEvents: activityDemo ? demo.activityEvents : data.activityEvents,
    },
    usingDemo: true,
    demo: {
      usingDemo: true,
      research: true,
      schedule: scheduleDemo,
      activity: activityDemo,
      // Tagged only when the real catalog was empty and demo course data was substituted.
      learning: !hasRealCourseData(data),
    },
  };
}

export function buildDemoDashboardSourceData({
  userId,
  projectId,
  now = new Date(),
}: BuildDemoDashboardSourceDataParams): DashboardSourceData {
  const taskDate = getLocalDay(now);
  const createdAt = isoDaysAgo(now, 10, 9, 0);
  const pdfs = Array.from({ length: 6 }, (_, index) => ({
    id: demoId("pdf", index + 1),
    user_id: userId,
    project_id: projectId,
    display_name: `Synthetic source ${index + 1}`,
    page_count: 12 + index * 3,
    ocr_status: "completed",
    created_at: isoDaysAgo(now, 10 - index, 9 + (index % 4), 15),
    updated_at: isoDaysAgo(now, 9 - index, 14, 20),
  }));

  const codes = ["Introduction", "Theory", "Method", "Results", "Discussion"].map((name, index) => ({
    id: demoId("code", index + 1),
    user_id: userId,
    project_id: projectId,
    name,
    sort_order: index,
    created_at: createdAt,
  }));

  const highlights = Array.from({ length: 24 }, (_, index) => {
    const pdf = pdfs[index % pdfs.length];
    const code = codes[index % codes.length];
    return {
      id: demoId("highlight", index + 1),
      user_id: userId,
      pdf_id: pdf.id,
      page_number: (index % 9) + 1,
      highlighted_text: `Synthetic evidence highlight ${index + 1}`,
      color: "#FFD700",
      rects: [],
      code_id: code.id,
      created_at: isoDaysAgo(now, Math.floor(index / 3), 9 + (index % 5), 10),
    };
  });

  const annotations = highlights.slice(0, 12).map((highlight, index) => ({
    id: demoId("annotation", index + 1),
    user_id: userId,
    pdf_id: highlight.pdf_id,
    highlight_id: highlight.id,
    page_number: highlight.page_number,
    content: `Synthetic note ${index + 1}`,
    position_x: 0,
    position_y: 0,
    created_at: isoDaysAgo(now, Math.floor(index / 2), 11, 30),
    updated_at: isoDaysAgo(now, Math.floor(index / 2), 11, 45),
  }));

  const literatureEntries = Array.from({ length: 18 }, (_, index) => {
    const pdf = pdfs[index % pdfs.length];
    const highlight = highlights[index];
    const code = codes[index % codes.length];
    const hasSynthesis = index < 10;
    const hasApa = index < 15;
    const hasMetadata = index < 14;
    return {
      id: demoId("lit", index + 1),
      user_id: userId,
      pdf_id: pdf.id,
      highlight_id: highlight.id,
      source: pdf.display_name,
      authors: hasMetadata ? `Scholar ${index + 1}` : "",
      year: hasMetadata ? String(2020 + (index % 5)) : "",
      page_number: highlight.page_number,
      highlighted_text: highlight.highlighted_text,
      theme_category: code.name,
      user_notes: index < 13 ? `Synthetic research note ${index + 1}` : "",
      code_name: code.name,
      apa_reference: hasApa ? `Scholar ${index + 1}. (${2020 + (index % 5)}). Synthetic source ${index + 1}.` : "",
      synthesis_paragraph: hasSynthesis ? `Synthetic synthesis paragraph ${index + 1} connecting evidence across sources.` : "",
      date_added: isoDaysAgo(now, Math.floor(index / 3), 12, index % 2 ? 20 : 5),
    };
  });

  const longDraft =
    "This synthetic draft section connects source evidence, method context, and a clear claim so the dashboard can measure meaningful writing progress without storing private research text.";
  const paperSections = [
    ["abstract", ""],
    ["introduction", `${longDraft} ${longDraft}`],
    ["literature_review", `${longDraft} ${longDraft}`],
    ["methodology", longDraft],
    ["results", ""],
    ["discussion", "Synthetic discussion note."],
    ["conclusion", ""],
    ["references", ""],
  ].map(([sectionKey, content], index) => ({
    id: demoId("paper-section", index + 1),
    user_id: userId,
    project_id: projectId,
    section_key: sectionKey,
    content,
    updated_at: isoDaysAgo(now, Math.max(0, index - 1), 15, 0),
  }));

  const metaAnalysis: MetaAnalysis = {
    id: "demo-meta-analysis",
    project_id: projectId,
    user_id: userId,
    research_question: "How do synthetic uncertainty signals relate to research progress?",
    hypothesis: "Higher synthetic structure is associated with steadier research progress.",
    hypothesis_type: "correlation",
    column_mapping: {
      study: "study",
      n: "sample_size",
      effect: "effect_size",
      se: "standard_error",
      moderator: "study_context",
    },
    canvas_blocks: [{ id: "demo-forest-plot", type: "forest", config: { demo: true } }],
    created_at: createdAt,
    updated_at: isoDaysAgo(now, 1, 16, 10),
  };

  const courseModules = Array.from({ length: 4 }, (_, index) => ({
    id: demoId("course-module", index + 1),
    title: ["Evidence synthesis", "Source mapping", "Draft planning", "Citation cleanup"][index],
    module_order: index + 1,
    is_published: true,
  }));

  const courseVideos = Array.from({ length: 15 }, (_, index) => ({
    id: demoId("course-video", index + 1),
    module_id: courseModules[index % courseModules.length].id,
    title: `Synthetic lesson ${index + 1}`,
    video_order: index + 1,
    duration_minutes: 9 + (index % 5),
  }));

  const courseProgress = courseVideos.slice(0, 11).map((video, index) => ({
    id: demoId("course-progress", index + 1),
    user_id: userId,
    video_id: video.id,
    watched_at: isoDaysAgo(now, Math.floor(index / 2), 18, 15),
  }));

  const courseNotes = courseVideos.slice(0, 8).map((video, index) => ({
    id: demoId("course-note", index + 1),
    user_id: userId,
    video_id: video.id,
    content: `Synthetic course note ${index + 1}`,
    updated_at: isoDaysAgo(now, Math.floor(index / 2), 18, 35),
  }));

  const tasks: DashboardTask[] = [
    ["09:00", "Literature review sprint", "Rows 13-26", "literature-review", "completed"],
    ["10:30", "Evidence connection", "Synthesis table", "literature-review", "pending"],
    ["13:00", "Source note cleanup", "Add notes & tags", "workspace", "pending"],
    ["15:00", "Project check-in", "Review next steps", "notes", "pending"],
  ].map(([scheduledTime, title, subtitle, sectionId, status], index) => ({
    id: demoId("task", index + 1),
    user_id: userId,
    project_id: projectId,
    task_date: taskDate,
    scheduled_time: scheduledTime,
    title,
    subtitle,
    section_id: sectionId,
    status: status as DashboardTask["status"],
    sort_order: index,
    generation_key: `demo:${projectId}:${taskDate}:${index + 1}`,
    deleted_at: null,
    completed_at: status === "completed" ? isoDaysAgo(now, 0, 9, 45) : null,
    created_at: isoDaysAgo(now, 0, 8, 0),
    updated_at: status === "completed" ? isoDaysAgo(now, 0, 9, 45) : isoDaysAgo(now, 0, 8, 0),
  }));

  const eventSeed: Array<[DashboardActivityEvent["event_type"], string, string, number, number]> = [
    ["project_opened", "Opened project dashboard", "workspace", 0, 8],
    ["dashboard_task_completed", "Literature review sprint", "literature-review", 0, 9],
    ["literature_row_saved", "Saved evidence row from source", "literature-review", 0, 10],
    ["highlight_created", "Highlighted claim in source viewer", "workspace", 1, 11],
    ["note_created", "Saved citation-ready source note", "workspace", 1, 12],
    ["meta_analysis_updated", "Updated effect-size plan", "meta-analysis", 2, 14],
    ["paper_draft_saved", "Saved introduction draft section", "draft", 2, 15],
    ["research_focus_opened", "Opened literature-review", "literature-review", 3, 10],
    ["source_uploaded", "Uploaded evidence paper", "workspace", 4, 9],
    ["literature_row_saved", "Saved synthesis comparison row", "literature-review", 5, 13],
    ["dashboard_schedule_updated", "Updated research checkpoint", "notes", 6, 16],
    ["project_opened", "Opened project dashboard", "workspace", 7, 9],
    ["highlight_created", "Captured method detail from source", "workspace", 8, 11],
    ["paper_draft_saved", "Saved methodology draft section", "draft", 9, 14],
  ];

  const activityEvents = eventSeed.map(([eventType, label, sectionId, daysAgo, hour], index) => ({
    id: demoId("activity", index + 1),
    user_id: userId,
    project_id: projectId,
    event_type: eventType,
    section_id: sectionId,
    label,
    created_at: isoDaysAgo(now, daysAgo, hour, 10),
  }));

  return {
    pdfs,
    highlights,
    annotations,
    literatureEntries,
    paperSections,
    metaAnalysis,
    codes,
    courseModules,
    courseVideos,
    courseProgress,
    courseNotes,
    tasks,
    activityEvents,
  };
}
