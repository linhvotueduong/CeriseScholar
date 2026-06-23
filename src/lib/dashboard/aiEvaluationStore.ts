import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiQualitySignals } from "@/lib/dashboard/sectionProgress";

/**
 * Data layer for AI-evaluation storage + user progress feedback (migration 019).
 *
 * Two separate concerns, kept apart on purpose:
 *  - dashboard_ai_evaluations: the latest deterministic evaluator snapshot per
 *    user+project (upserted). This is what the dashboard already shows.
 *  - dashboard_progress_feedback: append-only "Too high / About right / Too low"
 *    labels. Feedback NEVER overwrites progress — it is calibration data for later
 *    tuning; the evaluator remains the source of truth.
 *
 * All writes degrade gracefully (try/catch) so the dashboard never breaks if the
 * tables are not applied yet. RLS scopes every row to its owner.
 */

export type ProgressFeedbackVerdict = "too_high" | "about_right" | "too_low";
export type ProgressFeedbackDetails = {
  suggestedPercent?: number | null;
  explanation?: string | null;
};

const VERDICTS: ProgressFeedbackVerdict[] = ["too_high", "about_right", "too_low"];

export function isProgressFeedbackVerdict(value: unknown): value is ProgressFeedbackVerdict {
  return typeof value === "string" && (VERDICTS as string[]).includes(value);
}

/** Per-section displayed percents at evaluation time, e.g. { "literature-review": 6 }. */
export type SectionScoreSnapshot = Record<string, number>;

/** Upsert the latest evaluator snapshot for a project (one row per user+project). */
export async function upsertAiEvaluation(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  signals: AiQualitySignals,
  sectionScores: SectionScoreSnapshot
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("dashboard_ai_evaluations").upsert(
      {
        user_id: userId,
        project_id: projectId,
        signals,
        section_scores: sectionScores,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,project_id" }
    );
    return { error: error ? error.message : null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "ai evaluation save failed" };
  }
}

/**
 * Append a user feedback row for a section's progress estimate. Stores the percent
 * shown at the time so the label can be calibrated against it later. Never mutates
 * the evaluation or the displayed progress.
 */
export async function submitProgressFeedback(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  sectionId: string,
  verdict: ProgressFeedbackVerdict,
  evaluatedPercent: number | null,
  details: ProgressFeedbackDetails = {}
): Promise<{ error: string | null }> {
  try {
    const baseRow = {
      user_id: userId,
      project_id: projectId,
      section_id: sectionId,
      verdict,
      evaluated_percent: evaluatedPercent,
    };
    const nextRow = {
      ...baseRow,
      suggested_percent: details.suggestedPercent ?? null,
      explanation: details.explanation?.trim() || null,
    };
    const { error } = await supabase.from("dashboard_progress_feedback").insert(nextRow);
    if (error && /suggested_percent|explanation|column/i.test(error.message)) {
      const fallback = await supabase.from("dashboard_progress_feedback").insert(baseRow);
      return { error: fallback.error ? fallback.error.message : null };
    }
    return { error: error ? error.message : null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "feedback save failed" };
  }
}
