import { createClient } from "@/lib/supabase/client";

export type DashboardActivityType =
  | "project_opened"
  | "source_uploaded"
  | "literature_row_saved"
  | "highlight_created"
  | "note_created"
  | "meta_analysis_updated"
  | "paper_draft_saved"
  | "dashboard_task_completed"
  | "dashboard_schedule_updated"
  | "research_focus_opened";

type LogDashboardActivityParams = {
  projectId?: string | null;
  eventType: DashboardActivityType;
  sectionId?: string;
  label?: string;
};

function sanitizeActivityLabel(label: string | undefined) {
  if (!label) return "";
  return label.replace(/\s+/g, " ").trim().slice(0, 120);
}

export async function logDashboardActivity({
  projectId,
  eventType,
  sectionId = "",
  label = "",
}: LogDashboardActivityParams) {
  if (!projectId || projectId === "environmental-uncertainty") return;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("dashboard_activity_events").insert({
      user_id: user.id,
      project_id: projectId,
      event_type: eventType,
      section_id: sectionId,
      label: sanitizeActivityLabel(label),
    });
  } catch {
    // Activity logging should never interrupt the workspace UI.
  }
}
