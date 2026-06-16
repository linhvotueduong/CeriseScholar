import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardPaceMode, DashboardTargetSettings } from "@/lib/dashboard/targetPace";
import {
  DEFAULT_WORK_WEEKDAYS,
  getDefaultPersistedDashboardTargetSettings,
  type PersistedDashboardTargetSettings,
} from "@/lib/dashboard/types";

/**
 * Data layer for `dashboard_project_settings` — the per-user/per-project home for
 * the "Today's Target" pacing settings (deadline, pace, work days, daily goal).
 *
 * The table exists from migration 013 (current_section_id, preferred_daily_minutes,
 * target_completion_date); migration 016 adds pace/work_weekdays/skipped_dates/manual.
 * RLS guarantees a user only ever reads/writes their own rows.
 *
 * Three shapes, one boundary:
 *   - DB row              (snake_case columns, arrays, nullable)
 *   - PersistedDashboardTargetSettings (the canonical app shape; weekday ARRAY)
 *   - DashboardTargetSettings          (the UI-local modal shape; weekday COUNT)
 * Phase B keeps the existing modal (a "work days per week" count) and converts
 * count <-> weekday array here, so storage stays array-backed without a UI redesign.
 */

const PACE_MODES: DashboardPaceMode[] = ["low", "moderate", "high"];

/** Weekday order used to turn a count into a Mon-first weekday set. 0=Sun..6=Sat. */
const WEEKDAY_FILL_ORDER = [1, 2, 3, 4, 5, 6, 0];

type DashboardProjectSettingsRow = {
  id: string;
  user_id: string;
  project_id: string;
  current_section_id: string | null;
  preferred_daily_minutes: number | null;
  target_completion_date: string | null;
  pace: string | null;
  work_weekdays: number[] | null;
  skipped_dates: string[] | null;
  manual_target_date: string | null;
  manual_target_percent: number | null;
  created_at: string;
  updated_at: string;
};

function isPaceMode(value: unknown): value is DashboardPaceMode {
  return typeof value === "string" && PACE_MODES.includes(value as DashboardPaceMode);
}

function clampCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_WORK_WEEKDAYS.length;
  return Math.max(1, Math.min(7, Math.round(value)));
}

/** A "work days per week" count -> a sorted weekday array (Mon-first fill). */
export function countToWeekdays(count: number): number[] {
  return WEEKDAY_FILL_ORDER.slice(0, clampCount(count)).sort((a, b) => a - b);
}

/** A weekday array -> the "work days per week" count the UI select shows. */
export function weekdaysToCount(weekdays: number[]): number {
  return clampCount(weekdays.length || DEFAULT_WORK_WEEKDAYS.length);
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

// --- DB row <-> PersistedDashboardTargetSettings -----------------------------

function rowToPersisted(
  row: DashboardProjectSettingsRow,
  fallbackDeadline: string
): PersistedDashboardTargetSettings {
  return {
    deadlineDate: row.target_completion_date ?? fallbackDeadline,
    paceMode: isPaceMode(row.pace) ? row.pace : "moderate",
    workWeekdays:
      row.work_weekdays && row.work_weekdays.length > 0 ? row.work_weekdays : [...DEFAULT_WORK_WEEKDAYS],
    skippedDates: row.skipped_dates ?? [],
    dailyWorkGoalMinutes: row.preferred_daily_minutes ?? 90,
    manualTargetDate: row.manual_target_date ?? null,
    manualTargetPercent: row.manual_target_percent ?? null,
  };
}

// --- PersistedDashboardTargetSettings <-> UI modal shape ---------------------

export function persistedToUiSettings(
  persisted: PersistedDashboardTargetSettings
): DashboardTargetSettings {
  return {
    deadlineDate: persisted.deadlineDate,
    paceMode: persisted.paceMode,
    workDaysPerWeek: weekdaysToCount(persisted.workWeekdays),
    dailyWorkGoalMinutes: persisted.dailyWorkGoalMinutes,
    manualOverride: persisted.manualTargetPercent != null,
    manualTargetPercent: persisted.manualTargetPercent != null ? String(persisted.manualTargetPercent) : "",
  };
}

/**
 * Convert the UI modal settings back to the persisted shape. `base` carries the
 * fields the modal cannot edit yet (skipped_dates, manual_target_date) so a save
 * never wipes them.
 */
export function uiToPersistedSettings(
  ui: DashboardTargetSettings,
  base?: PersistedDashboardTargetSettings | null
): PersistedDashboardTargetSettings {
  const manualPercent = ui.manualOverride ? toNumberOrNull(ui.manualTargetPercent) : null;
  return {
    deadlineDate: ui.deadlineDate,
    paceMode: ui.paceMode,
    workWeekdays: countToWeekdays(ui.workDaysPerWeek),
    skippedDates: base?.skippedDates ?? [],
    dailyWorkGoalMinutes: ui.dailyWorkGoalMinutes,
    manualTargetDate: manualPercent != null ? base?.manualTargetDate ?? null : null,
    manualTargetPercent: manualPercent,
  };
}

// --- Reads / writes ----------------------------------------------------------

/**
 * Reads this user's settings row for a project (RLS-scoped). Returns null when no
 * row exists yet OR on any error (e.g. migration 016 not yet applied) so callers
 * can fall back to defaults and the dashboard never breaks.
 */
export async function fetchPersistedTargetSettings(
  supabase: SupabaseClient,
  projectId: string,
  fallbackDeadline: string
): Promise<PersistedDashboardTargetSettings | null> {
  try {
    const { data, error } = await supabase
      .from("dashboard_project_settings")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error || !data) return null;
    return rowToPersisted(data as DashboardProjectSettingsRow, fallbackDeadline);
  } catch {
    return null;
  }
}

/**
 * Upserts the user's settings row (one per user+project, enforced by the table's
 * UNIQUE(user_id, project_id)). Returns the error message, if any, without throwing.
 */
export async function upsertPersistedTargetSettings(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  settings: PersistedDashboardTargetSettings
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("dashboard_project_settings").upsert(
      {
        user_id: userId,
        project_id: projectId,
        pace: settings.paceMode,
        work_weekdays: settings.workWeekdays,
        skipped_dates: settings.skippedDates,
        preferred_daily_minutes: settings.dailyWorkGoalMinutes,
        target_completion_date: settings.deadlineDate || null,
        manual_target_date: settings.manualTargetDate,
        manual_target_percent: settings.manualTargetPercent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,project_id" }
    );
    return { error: error ? error.message : null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "settings save failed" };
  }
}

/** Re-export for callers that want the canonical persisted default in one place. */
export { getDefaultPersistedDashboardTargetSettings };
