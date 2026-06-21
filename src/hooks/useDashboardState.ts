"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logDashboardActivity } from "@/lib/dashboard/activity";
import {
  deriveDashboardState,
  type DashboardDerivedState,
  type DashboardSectionId,
  type DashboardSourceData,
  type DashboardTask,
} from "@/lib/dashboard/deriveDashboardState";
import { applyDemoDashboardFallback, buildDemoDashboardSourceData } from "@/lib/dashboard/demoDashboardData";
import { getLocalDay } from "@/lib/dashboard/localDay";
import { recommendSchedule } from "@/lib/dashboard/recommendSchedule";
import {
  getDefaultDashboardTargetSettings,
  type DashboardTargetSettings,
} from "@/lib/dashboard/targetPace";
import {
  fetchPersistedTargetSettings,
  getDefaultPersistedDashboardTargetSettings,
  persistedToUiSettings,
  uiToPersistedSettings,
  upsertPersistedTargetSettings,
} from "@/lib/dashboard/projectSettings";
import type { PersistedDashboardTargetSettings } from "@/lib/dashboard/types";
import type { Project } from "@/types/project";
import type { MetaAnalysis } from "@/types/meta-analysis";

type UseDashboardStateParams = {
  project: Project;
  userId?: string | null;
  agentReady: boolean;
  ollamaReady: boolean;
  safetyReady: boolean;
};

type TaskUpdate = Partial<Pick<DashboardTask, "scheduled_time" | "title" | "subtitle" | "section_id" | "sort_order">>;

function blankSourceData(): DashboardSourceData {
  return {
    pdfs: [],
    highlights: [],
    annotations: [],
    literatureEntries: [],
    paperSections: [],
    metaAnalysis: null,
    codes: [],
    courseModules: [],
    courseVideos: [],
    courseProgress: [],
    courseNotes: [],
    tasks: [],
    activityEvents: [],
  };
}

async function safeSelect<T>(query: PromiseLike<{ data: unknown; error: unknown }>, fallback: T): Promise<T> {
  const { data, error } = await query;
  if (error || !data) return fallback;
  return data as T;
}

// Neutral local-setup for the schedule's section-progress read only. The five
// research sections below don't depend on local-agent status, so this keeps the
// recommendation independent of agent/ollama/folder readiness.
const NEUTRAL_LOCAL_SETUP = { agentReady: false, ollamaReady: false, safetyReady: false };

// Sections the schedule engine may recommend work on (excludes the "notes"/Cerise
// support tile, which is help links, not a research work area).
const RECOMMENDABLE_SECTIONS = new Set<DashboardSectionId>([
  "meta-analysis",
  "literature-review",
  "workspace",
  "draft",
  "citations",
]);

export function useDashboardState({
  project,
  userId,
  agentReady,
  ollamaReady,
  safetyReady,
}: UseDashboardStateParams) {
  const taskDate = useMemo(() => getLocalDay(), []);
  const [sourceData, setSourceData] = useState<DashboardSourceData>(() => blankSourceData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [persistenceReady, setPersistenceReady] = useState(false);
  // Today's Target settings (UI-local shape). Seeded with the demo/preview default
  // ("high" pace); for real users it is replaced by the persisted row in refetch.
  const [targetSettings, setTargetSettings] = useState<DashboardTargetSettings>(() =>
    getDefaultDashboardTargetSettings()
  );
  // The full persisted shape last seen/written, so saves never wipe fields the
  // modal can't edit yet (skipped_dates, manual_target_date).
  const persistedSettingsRef = useRef<PersistedDashboardTargetSettings | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPersistenceReady(false);

    if (!userId || project.user_id === "fixture") {
      setSourceData(
        buildDemoDashboardSourceData({
          userId: userId ?? project.user_id ?? "demo-user",
          projectId: project.id,
        })
      );
      // Demo/preview: keep the tuned seed settings; never persist.
      persistedSettingsRef.current = null;
      setTargetSettings(getDefaultDashboardTargetSettings());
      setPersistenceReady(false);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      const pdfs = await safeSelect<Array<Record<string, unknown>>>(
        supabase
          .from("pdfs")
          .select("id, user_id, project_id, display_name, page_count, ocr_status, created_at, updated_at")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false }),
        []
      );
      const pdfIds = pdfs.map((pdf) => String(pdf.id)).filter(Boolean);

      const [highlights, annotations, literatureEntries, paperSections, metaAnalysisRows, codes, courseModules, courseVideos, courseProgress, courseNotes] =
        await Promise.all([
          pdfIds.length
            ? safeSelect<Array<Record<string, unknown>>>(
                supabase.from("highlights").select("id, pdf_id, code_id, created_at").in("pdf_id", pdfIds),
                []
              )
            : Promise.resolve([]),
          pdfIds.length
            ? safeSelect<Array<Record<string, unknown>>>(
                supabase.from("annotations").select("id, pdf_id, highlight_id, created_at, updated_at").in("pdf_id", pdfIds),
                []
              )
            : Promise.resolve([]),
          safeSelect<Array<Record<string, unknown>>>(
            supabase
              .from("literature_review_entries")
              .select("id, pdf_id, highlight_id, source, authors, year, theme_category, user_notes, code_name, apa_reference, synthesis_paragraph, date_added")
              .eq("project_id", project.id)
              .order("date_added", { ascending: false }),
            []
          ),
          safeSelect<Array<Record<string, unknown>>>(
            supabase.from("paper_sections").select("id, section_key, content, updated_at").eq("project_id", project.id),
            []
          ),
          safeSelect<MetaAnalysis[]>(
            supabase.from("meta_analyses").select("*").eq("project_id", project.id).limit(1),
            []
          ),
          safeSelect<Array<Record<string, unknown>>>(
            supabase.from("codes").select("id, name, sort_order, project_id, created_at").eq("project_id", project.id),
            []
          ),
          safeSelect<Array<Record<string, unknown>>>(
            supabase.from("course_modules").select("id, title, module_order, is_published").eq("is_published", true),
            []
          ),
          safeSelect<Array<Record<string, unknown>>>(
            supabase.from("course_videos").select("id, module_id, title, video_order"),
            []
          ),
          safeSelect<Array<Record<string, unknown>>>(
            supabase.from("course_progress").select("id, video_id, watched_at").eq("user_id", userId),
            []
          ),
          safeSelect<Array<Record<string, unknown>>>(
            supabase.from("course_notes").select("id, video_id, updated_at").eq("user_id", userId),
            []
          ),
        ]);

      const existingTasks = await safeSelect<DashboardTask[]>(
        supabase
          .from("dashboard_tasks")
          .select("*")
          .eq("project_id", project.id)
          .eq("task_date", taskDate)
          .order("sort_order", { ascending: true }),
        []
      );

      // Everything in the source data except tasks/activity (which load below). Used
      // both for the schedule's section-progress read and the final source data.
      const realSourceBase = {
        pdfs,
        highlights,
        annotations,
        literatureEntries,
        paperSections,
        metaAnalysis: metaAnalysisRows[0] ?? null,
        codes,
        courseModules,
        courseVideos,
        courseProgress,
        courseNotes,
      };

      // Load Today's Target settings first — pace drives the schedule's intensity.
      const fallbackDeadline = getDefaultDashboardTargetSettings().deadlineDate;
      const persisted =
        (await fetchPersistedTargetSettings(supabase, project.id, fallbackDeadline)) ??
        getDefaultPersistedDashboardTargetSettings(fallbackDeadline);
      persistedSettingsRef.current = persisted;
      setTargetSettings(persistedToUiSettings(persisted));

      // Seed today's recommended schedule ONCE per day. Recommendations target the
      // weakest research sections (same per-section progress the dashboard shows) and
      // pace sets intensity. We only seed when no auto-generated tasks exist for today,
      // so saved tasks, completion checkmarks, and manual tasks are never disturbed.
      const hasAutoTasksToday = existingTasks.some(
        (task) => !task.deleted_at && !task.generation_key.startsWith("manual:")
      );

      if (!hasAutoTasksToday) {
        const sectionProgress = deriveDashboardState(
          project,
          { ...realSourceBase, tasks: existingTasks, activityEvents: [] },
          NEUTRAL_LOCAL_SETUP,
          taskDate
        )
          .researchSections.filter((section) => RECOMMENDABLE_SECTIONS.has(section.id))
          .map((section) => ({ sectionId: section.id, percent: section.percent }));

        const recommendation = recommendSchedule({
          projectId: project.id,
          taskDate,
          paceMode: persisted.paceMode,
          sections: sectionProgress,
        });
        const runId = crypto.randomUUID();
        const recommendedRows = recommendation.tasks.map((spec) => ({
          user_id: userId,
          project_id: project.id,
          task_date: taskDate,
          scheduled_time: spec.scheduled_time,
          title: spec.title,
          subtitle: spec.subtitle,
          section_id: spec.section_id,
          status: "pending" as const,
          sort_order: spec.sort_order,
          generation_key: spec.generation_key,
          origin: spec.origin,
          task_weight: spec.task_weight,
          counts_toward_daily_target: spec.counts_toward_daily_target,
          estimated_minutes: spec.estimated_minutes,
          difficulty: spec.difficulty,
          input_hash: recommendation.inputHash,
          recommendation_run_id: runId,
        }));

        const { error: insertError } = await supabase.from("dashboard_tasks").insert(recommendedRows);
        if (!insertError) setPersistenceReady(true);
      } else {
        setPersistenceReady(true);
      }

      const tasks = await safeSelect<DashboardTask[]>(
        supabase
          .from("dashboard_tasks")
          .select("*")
          .eq("project_id", project.id)
          .eq("task_date", taskDate)
          .order("sort_order", { ascending: true }),
        existingTasks
      );
      const activityEvents = await safeSelect<Array<DashboardSourceData["activityEvents"][number]>>(
        supabase
          .from("dashboard_activity_events")
          .select("*")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false })
          .limit(60),
        []
      );

      const realSourceData: DashboardSourceData = {
        ...realSourceBase,
        tasks,
        activityEvents,
      };
      const nextSource = applyDemoDashboardFallback(realSourceData, {
        userId,
        projectId: project.id,
      });

      if (nextSource.usingDemo) {
        setPersistenceReady(false);
      }

      setSourceData(nextSource.data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Dashboard data could not load.");
      setPersistenceReady(false);
      setSourceData((current) =>
        current.tasks.length
          ? current
          : buildDemoDashboardSourceData({
              userId: userId ?? project.user_id ?? "demo-user",
              projectId: project.id,
            })
      );
    } finally {
      setLoading(false);
    }
  }, [project, taskDate, userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const onFocus = () => void refetch();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refetch]);

  const derived = useMemo<DashboardDerivedState>(
    () =>
      deriveDashboardState(
        project,
        sourceData,
        {
          agentReady,
          ollamaReady,
          safetyReady,
        },
        taskDate,
        {
          // The unified Today's Target model reads the live settings (pace, deadline,
          // work weekdays, skipped dates, manual override). Convert the current UI
          // settings to the persisted shape, merging the ref for fields the modal can't
          // edit yet (skipped_dates, manual_target_date).
          settings: uiToPersistedSettings(targetSettings, persistedSettingsRef.current),
          projectStartDate: new Date(project.created_at),
          today: new Date(),
        }
      ),
    [agentReady, ollamaReady, project, safetyReady, sourceData, targetSettings, taskDate]
  );

  const completeTask = useCallback(
    async (taskId: string) => {
      const task = sourceData.tasks.find((item) => item.id === taskId);
      if (!task) return;

      const completed = task.status !== "completed";
      const completedAt = completed ? new Date().toISOString() : null;
      const updatedAt = new Date().toISOString();
      setSourceData((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === taskId
            ? { ...item, status: completed ? "completed" : "pending", completed_at: completedAt, updated_at: updatedAt }
            : item
        ),
      }));

      if (!userId || !persistenceReady) return;

      const supabase = createClient();
      await supabase
        .from("dashboard_tasks")
        .update({
          status: completed ? "completed" : "pending",
          completed_at: completedAt,
          updated_at: updatedAt,
        })
        .eq("id", taskId);

      if (completed) {
        await logDashboardActivity({
          projectId: task.project_id,
          eventType: "dashboard_task_completed",
          sectionId: task.section_id,
          label: task.title,
        });
      }
      void refetch();
    },
    [persistenceReady, refetch, sourceData.tasks, userId]
  );

  const updateTask = useCallback(
    async (taskId: string, fields: TaskUpdate) => {
      const updatedAt = new Date().toISOString();
      setSourceData((current) => ({
        ...current,
        tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, ...fields, updated_at: updatedAt } : task)),
      }));

      if (!userId || !persistenceReady) return;

      const supabase = createClient();
      await supabase.from("dashboard_tasks").update({ ...fields, updated_at: updatedAt }).eq("id", taskId);
      await logDashboardActivity({
        projectId: project.id,
        eventType: "dashboard_schedule_updated",
        sectionId: fields.section_id,
        label: fields.title,
      });
      void refetch();
    },
    [persistenceReady, project.id, refetch, userId]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const deletedAt = new Date().toISOString();
      setSourceData((current) => ({
        ...current,
        tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, deleted_at: deletedAt, updated_at: deletedAt } : task)),
      }));

      if (!userId || !persistenceReady) return;

      const supabase = createClient();
      await supabase.from("dashboard_tasks").update({ deleted_at: deletedAt, updated_at: deletedAt }).eq("id", taskId);
      await logDashboardActivity({ projectId: project.id, eventType: "dashboard_schedule_updated", label: "Deleted schedule task" });
      void refetch();
    },
    [persistenceReady, project.id, refetch, userId]
  );

  const addTask = useCallback(
    async () => {
      const nextOrder = sourceData.tasks.filter((task) => !task.deleted_at).length;
      const title = "Research checkpoint";
      const now = new Date().toISOString();
      const generationKey = `manual:${crypto.randomUUID()}`;

      if (!userId || !persistenceReady) {
        const localTask: DashboardTask = {
          id: `local-${generationKey}`,
          user_id: userId ?? project.user_id ?? "local",
          project_id: project.id,
          task_date: taskDate,
          scheduled_time: "",
          title,
          subtitle: "Review next useful move",
          section_id: derived.activeSectionId,
          status: "pending",
          sort_order: nextOrder,
          generation_key: generationKey,
          deleted_at: null,
          completed_at: null,
          created_at: now,
          updated_at: now,
          origin: "manual",
          // Manual tasks do NOT count toward the daily target unless the user opts in.
          counts_toward_daily_target: false,
        };
        setSourceData((current) => ({ ...current, tasks: [...current.tasks, localTask] }));
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from("dashboard_tasks")
        .insert({
          user_id: userId,
          project_id: project.id,
          task_date: taskDate,
          scheduled_time: "",
          title,
          subtitle: "Review next useful move",
          section_id: derived.activeSectionId,
          status: "pending",
          sort_order: nextOrder,
          generation_key: generationKey,
          origin: "manual",
          // Manual tasks do NOT count toward the daily target unless the user opts in.
          counts_toward_daily_target: false,
        })
        .select()
        .single();

      if (data) {
        setSourceData((current) => ({ ...current, tasks: [...current.tasks, data as DashboardTask] }));
        await logDashboardActivity({ projectId: project.id, eventType: "dashboard_schedule_updated", label: title });
        void refetch();
      }
    },
    [derived.activeSectionId, persistenceReady, project.id, project.user_id, refetch, sourceData.tasks, taskDate, userId]
  );

  const saveTargetSettings = useCallback(
    async (next: DashboardTargetSettings) => {
      // Optimistic: update the visible settings immediately.
      setTargetSettings(next);

      const base =
        persistedSettingsRef.current ??
        getDefaultPersistedDashboardTargetSettings(
          next.deadlineDate || getDefaultDashboardTargetSettings().deadlineDate
        );
      const persisted = uiToPersistedSettings(next, base);
      persistedSettingsRef.current = persisted;

      // Demo/preview never persists.
      if (!userId || project.user_id === "fixture") return;

      const supabase = createClient();
      await upsertPersistedTargetSettings(supabase, userId, project.id, persisted);
    },
    [project.id, project.user_id, userId]
  );

  return {
    data: derived,
    loading,
    error,
    persistenceReady,
    targetSettings,
    refetch,
    completeTask,
    updateTask,
    deleteTask,
    addTask,
    saveTargetSettings,
  };
}
