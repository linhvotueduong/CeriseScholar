import type { DashboardActivityEvent, DashboardSectionId, DashboardTask } from "@/lib/dashboard/deriveDashboardState";

/**
 * Stage 1 of "personalized AI data analysis" — the deterministic BEHAVIOR
 * PROFILE (docs: see the mission this file ships under). Pure, no I/O: takes
 * the same activity-event / task-history shapes already fetched by
 * useDashboardState and reduces them to a small set of honest, clamped
 * signals that recommendSchedule.ts can optionally use to personalize the
 * daily plan, and that a later stage-2 AI-guidance job can read back out of
 * `ai_behavior_insights.profile` (migration 028) for transparency.
 *
 * Every field is null/empty-friendly: a brand-new user with little or no
 * history gets `lowConfidence: true` and mostly null/empty fields rather than
 * a confident-looking but statistically meaningless number.
 */

/** How far back we look, even if the caller hands us more history than this. */
export const PROFILE_WINDOW_DAYS = 30;

/** Below this many distinct days of history, the profile is low-confidence. */
export const MIN_SAMPLE_DAYS_FOR_CONFIDENCE = 7;

/** Below this many ISSUED recommended tasks, completion-rate math is too noisy to trust. */
export const MIN_ISSUED_TASKS_FOR_CONFIDENCE = 5;

/** A single difficulty bucket needs at least this many issued tasks before we report a rate for it. */
export const MIN_ISSUED_TASKS_PER_DIFFICULTY = 2;

/** A section needs at least this many issued recommended tasks before it's eligible as "avoided". */
export const MIN_ISSUED_TASKS_FOR_AVOIDANCE = 2;

/** Real-activity-per-issued-task ratio below which a needed section counts as avoided. */
export const AVOIDANCE_RATIO_THRESHOLD = 0.5;

export type TaskDifficulty = "easy" | "medium" | "hard";

export type BehaviorProfile = {
  /** Distinct calendar days of history actually observed, capped at PROFILE_WINDOW_DAYS. */
  sampleDays: number;
  /** completed / issued recommended tasks over the window; null when < MIN_ISSUED_TASKS_FOR_CONFIDENCE issued. */
  taskCompletionRate: number | null;
  /** Same ratio, split by task difficulty; a difficulty is omitted until it has enough samples. */
  completionRateByDifficulty: Partial<Record<TaskDifficulty, number>>;
  /** Section ids ranked by real (weighted) activity, most active first. Empty when no mappable activity. */
  activeSections: DashboardSectionId[];
  /** The readiness-relevant section the recommender keeps surfacing as needed but the user rarely touches. Null when no section qualifies. */
  avoidedSection: DashboardSectionId | null;
  workRhythm: {
    /** Distinct active days per 7-day week, extrapolated from the observed window. 0..7. */
    activeDaysPerWeek: number;
    /**
     * Longest gap (days) between consecutive active days, ALSO comparing the most
     * recent active day to `now` — so a user who is currently dormant shows a large
     * gap immediately, even if their history otherwise has no big gaps. This lets
     * recommendSchedule.ts use this single field both as a rhythm descriptor and as
     * the "haven't been back in a while" re-entry trigger.
     */
    longestGapDays: number;
  };
  /** 0 (linear: same section day after day) .. 1 (hops sections every active day). */
  jumperScore: number;
  /** Completed tasks (any origin) per distinct active day; null when no active days observed. */
  tasksPerActiveDay: number | null;
  /** True when sampleDays < MIN_SAMPLE_DAYS_FOR_CONFIDENCE or issued recommended tasks < MIN_ISSUED_TASKS_FOR_CONFIDENCE — callers should not personalize on a low-confidence profile. */
  lowConfidence: boolean;
};

export type ComputeBehaviorProfileInput = {
  activityEvents: DashboardActivityEvent[];
  /** dashboard_tasks rows over roughly the last PROFILE_WINDOW_DAYS days. */
  taskHistory: DashboardTask[];
  now: Date;
};

const VALID_SECTION_IDS: ReadonlySet<DashboardSectionId> = new Set([
  "meta-analysis",
  "literature-review",
  "workspace",
  "upload",
  "scholarask",
  "draft",
  "citations",
  "notes",
]);

/** Readiness-relevant sections — same real research areas the schedule engine recommends into. */
const READINESS_SECTIONS: DashboardSectionId[] = [
  "meta-analysis",
  "literature-review",
  "workspace",
  "draft",
  "citations",
];

/**
 * Maps a MEANINGFUL activity event type to the section it happened in when the
 * event itself didn't carry a valid section_id. Intentionally mirrors
 * deriveDashboardState's CURRENT_SECTION_BY_EVENT_TYPE (kept as an independent,
 * duplicated copy here so this module stays pure/import-light — no runtime
 * dependency on deriveDashboardState.ts, only its types).
 */
const SECTION_BY_EVENT_TYPE: Partial<Record<string, DashboardSectionId>> = {
  source_uploaded: "workspace",
  highlight_created: "workspace",
  note_created: "workspace",
  source_review_finished: "workspace",
  literature_row_saved: "literature-review",
  research_query_submitted: "scholarask",
  paper_draft_saved: "draft",
  meta_analysis_updated: "meta-analysis",
  research_pathway_saved: "notes",
};

function isValidSectionId(value: string): value is DashboardSectionId {
  return VALID_SECTION_IDS.has(value as DashboardSectionId);
}

function sectionForEvent(event: DashboardActivityEvent): DashboardSectionId | null {
  if (event.section_id && isValidSectionId(event.section_id)) return event.section_id;
  return SECTION_BY_EVENT_TYPE[event.event_type] ?? null;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function safeTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/** Local calendar day key (YYYY-MM-DD) — history is bucketed by local day like the rest of the dashboard. */
function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round(Math.abs(db - da) / (24 * 60 * 60 * 1000));
}

function emptyProfileBase(): Omit<BehaviorProfile, "sampleDays" | "lowConfidence"> {
  return {
    taskCompletionRate: null,
    completionRateByDifficulty: {},
    activeSections: [],
    avoidedSection: null,
    workRhythm: { activeDaysPerWeek: 0, longestGapDays: 0 },
    jumperScore: 0,
    tasksPerActiveDay: null,
  };
}

export function computeBehaviorProfile(input: ComputeBehaviorProfileInput): BehaviorProfile {
  const now = input.now instanceof Date && Number.isFinite(input.now.getTime()) ? input.now : new Date();
  const nowMs = now.getTime();
  const windowStartMs = nowMs - PROFILE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const nowDayKey = dayKey(now);

  const events = (input.activityEvents ?? []).filter((event) => {
    const t = safeTime(event?.created_at ?? "");
    return Number.isFinite(t) && t >= windowStartMs && t <= nowMs;
  });

  const tasks = (input.taskHistory ?? []).filter((task) => {
    if (!task || task.deleted_at) return false;
    const t = safeTime(task.task_date ? `${task.task_date}T00:00:00.000Z` : task.created_at ?? "");
    return Number.isFinite(t) && t >= windowStartMs && t <= nowMs + 24 * 60 * 60 * 1000;
  });

  // --- sampleDays: distinct calendar days with ANY signal (activity or task row) ---
  const activeDayKeys = new Set<string>();
  for (const event of events) {
    const t = safeTime(event.created_at);
    if (Number.isFinite(t)) activeDayKeys.add(dayKey(new Date(t)));
  }
  for (const task of tasks) {
    if (task.task_date) activeDayKeys.add(task.task_date);
  }
  const sampleDays = Math.min(PROFILE_WINDOW_DAYS, activeDayKeys.size);

  if (activeDayKeys.size === 0 && tasks.length === 0) {
    return {
      sampleDays: 0,
      ...emptyProfileBase(),
      lowConfidence: true,
    };
  }

  // --- task completion rate (recommended/issued tasks only) ---
  const issuedRecommended = tasks.filter((task) => (task.origin ?? "recommended") === "recommended");
  const issuedCount = issuedRecommended.length;
  const completedRecommended = issuedRecommended.filter((task) => task.status === "completed");
  const taskCompletionRate =
    issuedCount >= MIN_ISSUED_TASKS_FOR_CONFIDENCE ? clamp01(completedRecommended.length / issuedCount) : null;

  const completionRateByDifficulty: Partial<Record<TaskDifficulty, number>> = {};
  (["easy", "medium", "hard"] as const).forEach((difficulty) => {
    const inBucket = issuedRecommended.filter((task) => task.difficulty === difficulty);
    if (inBucket.length >= MIN_ISSUED_TASKS_PER_DIFFICULTY) {
      const completed = inBucket.filter((task) => task.status === "completed").length;
      completionRateByDifficulty[difficulty] = clamp01(completed / inBucket.length);
    }
  });

  // --- section activity ranking ---
  const ACTIVITY_EVENT_WEIGHT = 1;
  const sectionActivity = new Map<DashboardSectionId, number>();
  for (const event of events) {
    const section = sectionForEvent(event);
    if (!section) continue;
    sectionActivity.set(section, (sectionActivity.get(section) ?? 0) + ACTIVITY_EVENT_WEIGHT);
  }
  const activeSections = [...sectionActivity.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id);

  // --- avoided section: readiness-relevant section that keeps getting issued but is barely touched ---
  const sectionIssued = new Map<DashboardSectionId, number>();
  for (const task of issuedRecommended) {
    const id = task.section_id;
    if (isValidSectionId(id)) sectionIssued.set(id, (sectionIssued.get(id) ?? 0) + 1);
  }
  let avoidedSection: DashboardSectionId | null = null;
  let lowestRatio = Infinity;
  for (const section of READINESS_SECTIONS) {
    const issued = sectionIssued.get(section) ?? 0;
    if (issued < MIN_ISSUED_TASKS_FOR_AVOIDANCE) continue;
    const activity = sectionActivity.get(section) ?? 0;
    const ratio = activity / issued;
    if (ratio < AVOIDANCE_RATIO_THRESHOLD && ratio < lowestRatio) {
      lowestRatio = ratio;
      avoidedSection = section;
    }
  }

  // --- work rhythm: active-days-per-week + longest gap (including the gap to `now`) ---
  const sortedDayKeys = [...activeDayKeys].sort();
  let longestGapDays = 0;
  for (let i = 1; i < sortedDayKeys.length; i += 1) {
    longestGapDays = Math.max(longestGapDays, daysBetween(sortedDayKeys[i - 1], sortedDayKeys[i]));
  }
  if (sortedDayKeys.length > 0) {
    const mostRecent = sortedDayKeys[sortedDayKeys.length - 1];
    longestGapDays = Math.max(longestGapDays, daysBetween(mostRecent, nowDayKey));
  }
  const activeDaysPerWeek =
    sampleDays > 0 ? Math.round(((activeDayKeys.size / sampleDays) * 7) * 10) / 10 : 0;

  // --- jumper score: how often the day-to-day PRIMARY section changes ---
  const eventsByDay = new Map<string, DashboardSectionId[]>();
  for (const event of events) {
    const section = sectionForEvent(event);
    if (!section) continue;
    const t = safeTime(event.created_at);
    if (!Number.isFinite(t)) continue;
    const key = dayKey(new Date(t));
    const list = eventsByDay.get(key) ?? [];
    list.push(section);
    eventsByDay.set(key, list);
  }
  const primarySectionByDay: string[] = [];
  for (const key of [...eventsByDay.keys()].sort()) {
    const sections = eventsByDay.get(key)!;
    const counts = new Map<DashboardSectionId, number>();
    for (const section of sections) counts.set(section, (counts.get(section) ?? 0) + 1);
    let best: DashboardSectionId = sections[0];
    let bestCount = 0;
    for (const [section, count] of counts) {
      if (count > bestCount || (count === bestCount && section.localeCompare(best) < 0)) {
        best = section;
        bestCount = count;
      }
    }
    primarySectionByDay.push(best);
  }
  let jumperScore = 0;
  if (primarySectionByDay.length >= 2) {
    let switches = 0;
    for (let i = 1; i < primarySectionByDay.length; i += 1) {
      if (primarySectionByDay[i] !== primarySectionByDay[i - 1]) switches += 1;
    }
    jumperScore = clamp01(switches / (primarySectionByDay.length - 1));
  }

  // --- tasks per active day (any origin, completed) ---
  const completedAnyOrigin = tasks.filter((task) => task.status === "completed");
  const tasksPerActiveDay = activeDayKeys.size > 0 ? Math.round((completedAnyOrigin.length / activeDayKeys.size) * 100) / 100 : null;

  const lowConfidence = sampleDays < MIN_SAMPLE_DAYS_FOR_CONFIDENCE || issuedCount < MIN_ISSUED_TASKS_FOR_CONFIDENCE;

  return {
    sampleDays,
    taskCompletionRate,
    completionRateByDifficulty,
    activeSections,
    avoidedSection,
    workRhythm: { activeDaysPerWeek, longestGapDays },
    jumperScore,
    tasksPerActiveDay,
    lowConfidence,
  };
}
