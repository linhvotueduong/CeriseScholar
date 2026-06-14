"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logDashboardActivity } from "@/lib/dashboard/activity";
import {
  buildDefaultDashboardTasks,
  deriveDashboardState,
  type DashboardDerivedState,
  type DashboardSourceData,
  type DashboardTask,
} from "@/lib/dashboard/deriveDashboardState";
import { applyDemoDashboardFallback, buildDemoDashboardSourceData } from "@/lib/dashboard/demoDashboardData";
import { getLocalDay } from "@/lib/dashboard/localDay";
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
      const existingKeys = new Set(existingTasks.map((task) => task.generation_key));
      const defaultTasks = buildDefaultDashboardTasks(userId, project.id, taskDate).filter((task) => !existingKeys.has(task.generation_key));

      if (defaultTasks.length > 0) {
        const { error: insertError } = await supabase.from("dashboard_tasks").insert(defaultTasks);
        if (!insertError) setPersistenceReady(true);
      } else if (existingTasks.length > 0) {
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
        taskDate
      ),
    [agentReady, ollamaReady, project, safetyReady, sourceData, taskDate]
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

  return {
    data: derived,
    loading,
    error,
    persistenceReady,
    refetch,
    completeTask,
    updateTask,
    deleteTask,
    addTask,
  };
}
