"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logDashboardActivity } from "@/lib/dashboard/activity";
import { monthStartUtcIso } from "@/lib/ai/allowance";
import {
  deriveDashboardState,
  type DashboardDerivedState,
  type DashboardSectionId,
  type DashboardSourceData,
  type DashboardTask,
} from "@/lib/dashboard/deriveDashboardState";
import {
  applyDemoDashboardFallback,
  buildDemoDashboardSourceData,
  type DashboardDemoState,
} from "@/lib/dashboard/demoDashboardData";
import { getLocalDay } from "@/lib/dashboard/localDay";
import { recommendSchedule } from "@/lib/dashboard/recommendSchedule";
import { computeBehaviorProfile } from "@/lib/dashboard/behaviorProfile";
import {
  submitProgressFeedback,
  upsertAiEvaluation,
  type ProgressFeedbackDetails,
  type ProgressFeedbackVerdict,
  type SectionScoreSnapshot,
} from "@/lib/dashboard/aiEvaluationStore";
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

// Sections the schedule engine may recommend work on (excludes the "notes"/Cerise
// support tile, which is help links, not a research work area).
const RECOMMENDABLE_SECTIONS = new Set<DashboardSectionId>([
  "meta-analysis",
  "literature-review",
  "workspace",
  "draft",
  "citations",
]);

// Stage 1 personalization (behaviorProfile.ts) needs real history, not just today —
// widen the dashboard_tasks read to this many days back. Today-specific logic (the
// once-per-day auto-seed gate, the schedule card's tasks) still derives its own
// today-only slice from this wider set below; nothing that reads "today" changes.
const BEHAVIOR_HISTORY_WINDOW_DAYS = 30;

export function useDashboardState({
  project,
  userId,
}: UseDashboardStateParams) {
  const taskDate = useMemo(() => getLocalDay(), []);
  const [sourceData, setSourceData] = useState<DashboardSourceData>(() => blankSourceData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [persistenceReady, setPersistenceReady] = useState(false);
  // The (project + user) the current data was resolved for. While it differs from the
  // current project/user, the dashboard is stale/loading — so we never render the
  // previous project's (or pre-auth demo) content as if it were the real one.
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const currentKey = `${project.id}:${userId ?? ""}`;
  // Which sources are sample/demo (drives the "Sample data" badge + per-card tags).
  const [demoState, setDemoState] = useState<DashboardDemoState>({
    usingDemo: false,
    research: false,
    schedule: false,
    activity: false,
    learning: false,
  });
  // Today's Target settings (UI-local shape). Seeded with the demo/preview default
  // ("high" pace); for real users it is replaced by the persisted row in refetch.
  const [targetSettings, setTargetSettings] = useState<DashboardTargetSettings>(() =>
    getDefaultDashboardTargetSettings()
  );
  // The full persisted shape last seen/written, so saves never wipe fields the
  // modal can't edit yet (skipped_dates, manual_target_date).
  const persistedSettingsRef = useRef<PersistedDashboardTargetSettings | null>(null);
  // Dedupe AI-evaluation writes: only persist when the snapshot actually changes.
  const lastEvaluationHashRef = useRef<string>("");

  const refetch = useCallback(async () => {
    const settleKey = `${project.id}:${userId ?? ""}`;
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
      setDemoState({ usingDemo: true, research: true, schedule: true, activity: true, learning: true });
      setSettledKey(settleKey);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      const pdfs = await safeSelect<Array<Record<string, unknown>>>(
        supabase
          .from("pdfs")
          .select("id, user_id, project_id, display_name, page_count, ocr_status, finished_at, created_at, updated_at")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false }),
        []
      );
      const pdfIds = pdfs.map((pdf) => String(pdf.id)).filter(Boolean);

      // Usage-speed-health boundaries (docs/ai-usage-card-states.md) — computed
      // once so the "today" and "prior 7 days" queries below agree on the same
      // UTC day boundary.
      const usageNow = new Date();
      const usageDayStartIso = new Date(
        Date.UTC(usageNow.getUTCFullYear(), usageNow.getUTCMonth(), usageNow.getUTCDate())
      ).toISOString();
      const usagePriorWeekStartIso = new Date(
        Date.parse(usageDayStartIso) - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const [
        highlights,
        annotations,
        literatureEntries,
        paperSections,
        metaAnalysisRows,
        codes,
        courseModules,
        courseVideos,
        courseProgress,
        courseNotes,
        aiKeySettingsRow,
        aiUsageCountResult,
        aiUsageTodayCountResult,
        aiUsagePriorWeekCountResult,
        aiGuardrailsRow,
      ] = await Promise.all([
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
            supabase.from("course_modules").select("*").eq("is_published", true),
            []
          ),
          safeSelect<Array<Record<string, unknown>>>(
            supabase.from("course_videos").select("*"),
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
          // AI usage-meter feed (docs/ai-usage-card-spec.md §Data contract) — both
          // RLS-owner-safe: `key_last4` only (never the ciphertext) via maybeSingle,
          // and a head-only count of this month's usage events (no rows fetched).
          safeSelect<{ key_last4: string | null } | null>(
            supabase.from("user_ai_settings").select("key_last4").eq("user_id", userId).maybeSingle(),
            null
          ),
          supabase
            .from("ai_usage_events")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", monthStartUtcIso(new Date())),
          // Usage-speed-health: today's count (any lane) and the prior-7-day
          // count (any lane, excluding today) feed the pace engine's
          // usedToday/priorDailyAverage inputs (docs/ai-usage-card-states.md).
          supabase
            .from("ai_usage_events")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", usageDayStartIso),
          supabase
            .from("ai_usage_events")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", usagePriorWeekStartIso)
            .lt("created_at", usageDayStartIso),
          safeSelect<{ unusual_spike_alert: boolean | null } | null>(
            supabase.from("ai_usage_guardrails").select("unusual_spike_alert").eq("user_id", userId).maybeSingle(),
            null
          ),
        ]);

      const aiKeyLast4 = aiKeySettingsRow?.key_last4 ?? null;
      const aiUsageCountThisMonth = aiUsageCountResult.error ? 0 : aiUsageCountResult.count ?? 0;
      const aiUsageCountToday = aiUsageTodayCountResult.error ? 0 : aiUsageTodayCountResult.count ?? 0;
      const aiUsagePriorDailyAverage = aiUsagePriorWeekCountResult.error
        ? 0
        : (aiUsagePriorWeekCountResult.count ?? 0) / 7;
      const aiSpikeAlertEnabled = aiGuardrailsRow?.unusual_spike_alert ?? true;

      // Widened to ~30 days (not just today) so Stage 1 personalization
      // (behaviorProfile.ts) has real history to compute a completion rate, work
      // rhythm, etc. from. Every existing "today only" behavior below (the
      // once-per-day auto-seed gate, the schedule card's tasks) derives its own
      // today-only slice from this wider set, so nothing that reads "today" changes.
      const historyStartDate = getLocalDay(new Date(Date.now() - BEHAVIOR_HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000));
      const taskHistory = await safeSelect<DashboardTask[]>(
        supabase
          .from("dashboard_tasks")
          .select("*")
          .eq("project_id", project.id)
          .gte("task_date", historyStartDate)
          .order("sort_order", { ascending: true }),
        []
      );
      const existingTasks = taskHistory.filter((task) => task.task_date === taskDate);

      // Moved up (was fetched later, after the recommendation seed) so Stage 1's
      // behavior profile — which recommendSchedule below can personalize with —
      // has real activity to read. Reused as-is for the final source data.
      const activityEvents = await safeSelect<Array<DashboardSourceData["activityEvents"][number]>>(
        supabase
          .from("dashboard_activity_events")
          .select("*")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false })
          .limit(60),
        []
      );

      // Stage 2's cached daily guidance row (migration 028). Read fail-open: a
      // missing/errored row just means "no AI insight yet today," never a blocking
      // error. No job writes this table yet — Stage 2 (a later agent) is the producer.
      const aiInsightRow = await safeSelect<{ guidance: string | null; focus_section: string | null } | null>(
        supabase
          .from("ai_behavior_insights")
          .select("guidance, focus_section")
          .eq("user_id", userId)
          .eq("project_id", project.id)
          .eq("day", taskDate)
          .maybeSingle(),
        null
      );

      // Stage 1 personalization profile (behaviorProfile.ts) — pure/deterministic,
      // computed from the real history above. Fed into recommendSchedule below and
      // also exposed on derived state for Stage 2 to read/store.
      const behaviorProfile = computeBehaviorProfile({ activityEvents, taskHistory, now: new Date() });

      // Stage 2 trigger: today's daily AI insight is generated lazily, at most
      // once per project per day. If no cached row exists yet AND the profile is
      // confident enough to say something honest and non-generic, fire a
      // background request to /api/ai (task "behavior_insight"). Guarded by a
      // same-day localStorage flag so a failed attempt doesn't retry until
      // tomorrow (the server-side cache is the source of truth; this flag only
      // prevents hammering the endpoint on repeat loads/errors). This NEVER
      // blocks or throws into the dashboard's own load — every failure mode is
      // swallowed.
      if (!aiInsightRow && !behaviorProfile.lowConfidence) {
        try {
          const attemptKey = `cerise_insight_attempt_${project.id}_${taskDate}`;
          if (typeof window !== "undefined" && !window.localStorage.getItem(attemptKey)) {
            window.localStorage.setItem(attemptKey, "1");
            void (async () => {
              try {
                const res = await fetch("/api/ai", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    task: "behavior_insight",
                    projectId: project.id,
                    projectName: project.name,
                    profile: behaviorProfile,
                  }),
                });
                if (!res.ok) return;
                const payload = (await res.json()) as { guidance?: string; focus_section?: string };
                if (payload?.guidance) {
                  setSourceData((current) => ({
                    ...current,
                    aiInsight: { guidance: payload.guidance ?? null, focusSection: payload.focus_section ?? null },
                  }));
                }
              } catch {
                // Fire-and-forget: a failed background insight request must never
                // surface to the user or block the dashboard.
              }
            })();
          }
        } catch {
          // localStorage can throw in some private-browsing contexts (or be
          // unavailable during SSR) — never let that affect the dashboard load.
        }
      }

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
        aiKeyLast4,
        aiUsageCountThisMonth,
        aiUsageCountToday,
        aiUsagePriorDailyAverage,
        aiSpikeAlertEnabled,
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
          taskDate
        )
          .researchSections.filter((section) => RECOMMENDABLE_SECTIONS.has(section.id))
          .map((section) => ({ sectionId: section.id, percent: section.percent }));

        const recommendation = recommendSchedule({
          projectId: project.id,
          taskDate,
          paceMode: persisted.paceMode,
          sections: sectionProgress,
          profile: behaviorProfile,
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
      // Dedicated Activity Log feed: exclude page-load noise at the DB level so real
      // meaningful events are found even when recent rows are dominated by opens.
      // Chained neq (robust) instead of not-in, and a generous limit so older real
      // events are not lost behind many recent opens.
      const activityFeed = await safeSelect<Array<DashboardSourceData["activityEvents"][number]>>(
        supabase
          .from("dashboard_activity_events")
          .select("*")
          .eq("project_id", project.id)
          .neq("event_type", "project_opened")
          .neq("event_type", "research_focus_opened")
          .neq("event_type", "dashboard_loaded")
          .order("created_at", { ascending: false })
          .limit(40),
        []
      );

      const realSourceData: DashboardSourceData = {
        ...realSourceBase,
        tasks,
        activityEvents,
        activityFeed,
        behaviorProfile,
        aiInsight: aiInsightRow
          ? { guidance: aiInsightRow.guidance, focusSection: aiInsightRow.focus_section }
          : null,
      };
      const nextSource = applyDemoDashboardFallback(realSourceData, {
        userId,
        projectId: project.id,
      });

      if (nextSource.usingDemo) {
        setPersistenceReady(false);
      }
      setDemoState(nextSource.demo);

      setSourceData(nextSource.data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Dashboard data could not load.");
      setPersistenceReady(false);
      setDemoState({ usingDemo: true, research: true, schedule: true, activity: true, learning: true });
      setSourceData((current) =>
        current.tasks.length
          ? current
          : buildDemoDashboardSourceData({
              userId: userId ?? project.user_id ?? "demo-user",
              projectId: project.id,
            })
      );
    } finally {
      setSettledKey(settleKey);
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
        taskDate,
        {
          // The unified Today's Target model reads the live settings (pace, deadline,
          // work weekdays, skipped dates, manual override). Convert the current UI
          // settings to the persisted shape, merging the ref for fields the modal can't
          // edit yet (skipped_dates, manual_target_date).
          settings: uiToPersistedSettings(targetSettings, persistedSettingsRef.current),
          projectStartDate: new Date(project.created_at),
          today: new Date(),
          hasPersistedTarget: persistedSettingsRef.current !== null,
        }
      ),
    [project, sourceData, targetSettings, taskDate]
  );

  // Section percents the evaluator produced (research sections only), for storage/feedback.
  const sectionScoreSnapshot = useMemo<SectionScoreSnapshot>(() => {
    const snapshot: SectionScoreSnapshot = {};
    for (const section of derived.researchSections) {
      if (section.id !== "notes") snapshot[section.id] = section.percent;
    }
    return snapshot;
  }, [derived.researchSections]);

  // Persist the latest evaluator snapshot per project (deduped). Calibration storage
  // only — never changes what the dashboard shows. Demo/unauth never writes.
  useEffect(() => {
    if (!userId || project.user_id === "fixture" || !persistenceReady) return;
    const hash = JSON.stringify({ s: derived.aiSignals, p: sectionScoreSnapshot });
    if (hash === lastEvaluationHashRef.current) return;
    lastEvaluationHashRef.current = hash;
    void upsertAiEvaluation(createClient(), userId, project.id, derived.aiSignals, sectionScoreSnapshot);
  }, [derived.aiSignals, sectionScoreSnapshot, persistenceReady, project.id, project.user_id, userId]);

  const submitSectionFeedback = useCallback(
    async (sectionId: string, verdict: ProgressFeedbackVerdict, details?: ProgressFeedbackDetails) => {
      if (!userId || project.user_id === "fixture") return;
      const evaluatedPercent = sectionScoreSnapshot[sectionId] ?? null;
      await submitProgressFeedback(createClient(), userId, project.id, sectionId, verdict, evaluatedPercent, details);
    },
    [project.id, project.user_id, sectionScoreSnapshot, userId]
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
    // True until the resolved data matches the current project/user. While stale, the
    // page shows a neutral loading state so the previous project's data or pre-auth demo
    // content is never flashed as the real dashboard. (Focus refetches are NOT stale.)
    stale: settledKey !== currentKey,
    error,
    persistenceReady,
    usingDemo: demoState.usingDemo,
    demoCards: { schedule: demoState.schedule, activity: demoState.activity, research: demoState.research, learning: demoState.learning },
    targetSettings,
    refetch,
    completeTask,
    updateTask,
    deleteTask,
    addTask,
    saveTargetSettings,
    submitSectionFeedback,
  };
}
