"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logDashboardActivity } from "@/lib/dashboard/activity";
import { getLocalDay } from "@/lib/dashboard/localDay";
import type { DashboardTask } from "@/lib/dashboard/deriveDashboardState";

// Page-local hook for /dashboard/schedule. Mirrors the fetch/insert/complete
// patterns in src/hooks/useDashboardState.ts (read-only reference — not
// imported from, since that hook is scoped to a single project + "today").
// This hook instead spans a whole visible week and one-or-many projects.

function startOfWeek(date: Date) {
  // Monday-start week. getDay(): 0=Sun..6=Sat.
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() + diffToMonday);
  return monday;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + amount);
  return next;
}

export type WeekDay = {
  dateKey: string;
  date: Date;
  label: string;
  dayNumber: string;
  isToday: boolean;
};

type UseScheduleTasksParams = {
  userId?: string | null;
  projectIds: string[];
  /** Which project new tasks should be inserted against. */
  defaultProjectId?: string | null;
  anchorDate: Date;
};

export function useWeekDays(anchorDate: Date): { weekStart: Date; days: WeekDay[] } {
  return useMemo(() => {
    const weekStart = startOfWeek(anchorDate);
    const todayKey = getLocalDay(new Date());
    const days: WeekDay[] = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      const dateKey = getLocalDay(date);
      return {
        dateKey,
        date,
        label: date.toLocaleDateString(undefined, { weekday: "short" }),
        dayNumber: String(date.getDate()),
        isToday: dateKey === todayKey,
      };
    });
    return { weekStart, days };
  }, [anchorDate]);
}

export function useScheduleTasks({ userId, projectIds, defaultProjectId, anchorDate }: UseScheduleTasksParams) {
  const { weekStart, days } = useWeekDays(anchorDate);
  const weekStartKey = days[0]?.dateKey ?? getLocalDay(weekStart);
  const weekEndKey = days[6]?.dateKey ?? weekStartKey;

  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable key so the effect only re-runs when the actual project set changes,
  // not on every new array identity.
  const projectIdsKey = projectIds.join(",");

  const refetch = useCallback(async () => {
    if (!userId || projectIds.length === 0) {
      setTasks([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("dashboard_tasks")
      .select("*")
      .in("project_id", projectIds)
      .is("deleted_at", null)
      .gte("task_date", weekStartKey)
      .lte("task_date", weekEndKey)
      .order("task_date", { ascending: true })
      .order("sort_order", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setTasks([]);
    } else {
      setTasks((data as DashboardTask[]) ?? []);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, projectIdsKey, weekStartKey, weekEndKey]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const completeTask = useCallback(
    async (taskId: string) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task) return;

      const completed = task.status !== "completed";
      const completedAt = completed ? new Date().toISOString() : null;
      const updatedAt = new Date().toISOString();

      setTasks((current) =>
        current.map((item) =>
          item.id === taskId
            ? { ...item, status: completed ? "completed" : "pending", completed_at: completedAt, updated_at: updatedAt }
            : item
        )
      );

      if (!userId) return;

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
    },
    [tasks, userId]
  );

  const addTask = useCallback(
    async (title: string, dayKey: string) => {
      const trimmed = title.trim();
      if (!trimmed || !userId) return;
      const projectId = defaultProjectId ?? projectIds[0];
      if (!projectId) return;

      const sameDay = tasks.filter((task) => task.task_date === dayKey);
      const nextOrder = sameDay.length;
      const generationKey = `manual:${crypto.randomUUID()}`;

      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("dashboard_tasks")
        .insert({
          user_id: userId,
          project_id: projectId,
          task_date: dayKey,
          scheduled_time: "",
          title: trimmed,
          subtitle: "",
          section_id: "",
          status: "pending",
          sort_order: nextOrder,
          generation_key: generationKey,
          origin: "manual",
          counts_toward_daily_target: false,
        })
        .select()
        .single();

      if (!insertError && data) {
        const inserted = data as DashboardTask;
        setTasks((current) => [...current, inserted]);
        await logDashboardActivity({
          projectId,
          eventType: "dashboard_schedule_updated",
          label: trimmed,
        });
      } else if (insertError) {
        setError(insertError.message);
      }
      void refetch();
    },
    [defaultProjectId, projectIds, refetch, tasks, userId]
  );

  return {
    weekStart,
    days,
    tasks,
    loading,
    error,
    completeTask,
    addTask,
    refetch,
  };
}
