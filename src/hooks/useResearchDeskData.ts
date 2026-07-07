"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types/project";
import { getLocalDay } from "@/lib/dashboard/localDay";
import type { DashboardTask } from "@/lib/dashboard/deriveDashboardState";
import type {
  ActivityEventRow,
  AnnotationRow,
  BehaviorInsightRow,
  HighlightRow,
  LiteratureRow,
  MetaAnalysisRow,
  PaperSectionRow,
  PdfRow,
  ProjectSettingsRow,
} from "@/lib/research/researchDeskDerive";

// Client-fetch hook for the Research Desk portfolio home. Mirrors the
// fail-open, per-query style of useDashboardState: every query is scoped to
// the signed-in user (RLS already enforces this, the .eq is for clarity) and
// falls back to an empty array on any error so a broken query never crashes
// the page or shows fabricated data — it just shows an honest empty state.

export type ResearchDeskSourceData = {
  activityEvents: ActivityEventRow[];
  annotations: AnnotationRow[];
  highlights: HighlightRow[];
  literatureEntries: LiteratureRow[];
  metaAnalyses: MetaAnalysisRow[];
  paperSections: PaperSectionRow[];
  pdfs: PdfRow[];
  projects: Project[];
  // Project-type settings (dashboard_project_settings) — read so the Project
  // Overview card's section-progress engine (researchDeskDerive.ts) uses the
  // SAME per-project weights/targets the dashboard's Today's Target does.
  projectSettings: ProjectSettingsRow[];
  // Today's dashboard_tasks across ALL of this user's projects (bounded to
  // today, unlike useDashboardState's 30-day window) — feeds the Project
  // Overview card's "Today's tasks" panel.
  todayTasks: DashboardTask[];
  // Today's cached ai_behavior_insights rows (Stage 2 daily guidance, migration
  // 028) across all projects — fail-open, empty when nothing has been
  // generated yet today for any project.
  todayInsights: BehaviorInsightRow[];
};

function blankSourceData(): ResearchDeskSourceData {
  return {
    projects: [],
    pdfs: [],
    highlights: [],
    annotations: [],
    literatureEntries: [],
    paperSections: [],
    metaAnalyses: [],
    activityEvents: [],
    projectSettings: [],
    todayTasks: [],
    todayInsights: [],
  };
}

async function safeSelect<T>(query: PromiseLike<{ data: unknown; error: unknown }>, fallback: T): Promise<T> {
  const { data, error } = await query;
  if (error || !data) return fallback;
  return data as T;
}

export function useResearchDeskData(userId: string | null | undefined) {
  const [data, setData] = useState<ResearchDeskSourceData>(() => blankSourceData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setData(blankSourceData());
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const todayKey = getLocalDay();

      const [
        projects,
        pdfs,
        highlights,
        annotations,
        literatureEntries,
        paperSections,
        metaAnalyses,
        activityEvents,
        projectSettings,
        todayTasks,
        todayInsights,
      ] = await Promise.all([
          safeSelect<Project[]>(
            supabase.from("projects").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
            []
          ),
          safeSelect<PdfRow[]>(
            supabase
              .from("pdfs")
              .select("id, project_id, display_name, ocr_status, created_at, updated_at")
              .eq("user_id", userId),
            []
          ),
          safeSelect<HighlightRow[]>(
            supabase.from("highlights").select("id, pdf_id, created_at").eq("user_id", userId),
            []
          ),
          safeSelect<AnnotationRow[]>(
            supabase.from("annotations").select("id, pdf_id, created_at").eq("user_id", userId),
            []
          ),
          safeSelect<LiteratureRow[]>(
            supabase
              .from("literature_review_entries")
              .select(
                "id, pdf_id, highlight_id, project_id, source, authors, year, theme_category, user_notes, code_name, apa_reference, synthesis_paragraph, date_added"
              )
              .eq("user_id", userId)
              .order("date_added", { ascending: false }),
            []
          ),
          safeSelect<PaperSectionRow[]>(
            supabase
              .from("paper_sections")
              .select("id, project_id, section_key, content, updated_at")
              .eq("user_id", userId),
            []
          ),
          safeSelect<MetaAnalysisRow[]>(
            supabase
              .from("meta_analyses")
              .select("id, project_id, research_question, hypothesis, hypothesis_type, canvas_blocks, column_mapping, updated_at")
              .eq("user_id", userId),
            []
          ),
          safeSelect<ActivityEventRow[]>(
            supabase
              .from("dashboard_activity_events")
              .select("id, project_id, event_type, section_id, label, created_at")
              .eq("user_id", userId)
              .neq("event_type", "project_opened")
              .neq("event_type", "research_focus_opened")
              .neq("event_type", "dashboard_loaded")
              .order("created_at", { ascending: false })
              .limit(8),
            []
          ),
          // Same project-type-aware settings the dashboard's Today's Target
          // reads (src/lib/dashboard/projectSettings.ts) — read here (not via
          // that module, which is scoped to one project) so the Project
          // Overview card's section-progress engine picks the same weights.
          safeSelect<ProjectSettingsRow[]>(
            supabase.from("dashboard_project_settings").select("project_id, project_type").eq("user_id", userId),
            []
          ),
          // Today only (not useDashboardState's 30-day window) — feeds the
          // Project Overview card's "Today's tasks" panel for whichever
          // project is currently selected.
          safeSelect<DashboardTask[]>(
            supabase
              .from("dashboard_tasks")
              .select("*")
              .eq("user_id", userId)
              .eq("task_date", todayKey)
              .is("deleted_at", null)
              .order("sort_order", { ascending: true }),
            []
          ),
          // Today's cached Stage 2 guidance (migration 028), fail-open.
          safeSelect<BehaviorInsightRow[]>(
            supabase
              .from("ai_behavior_insights")
              .select("project_id, profile, guidance, focus_section")
              .eq("user_id", userId)
              .eq("day", todayKey),
            []
          ),
        ]);

      setData({
        projects,
        pdfs,
        highlights,
        annotations,
        literatureEntries,
        paperSections,
        metaAnalyses,
        activityEvents,
        projectSettings,
        todayTasks,
        todayInsights,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Research Desk data could not load.");
      setData(blankSourceData());
    } finally {
      setLoading(false);
    }
  }, [userId]);

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

  return { data, loading, error, refetch };
}
