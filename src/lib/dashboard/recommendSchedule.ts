import type { DashboardSectionId } from "@/lib/dashboard/deriveDashboardState";
import type { DashboardPaceMode } from "@/lib/dashboard/targetPace";

/**
 * Phase C — Today's Schedule recommendation engine (pure, deterministic).
 *
 * Turns the project's current per-section progress + the user's pace into EXACTLY
 * four recommended tasks for the day. The contract (from the v2 spec / appendix):
 *   - always exactly 4 tasks
 *   - PACE changes intensity (minutes + amount asked), never the count
 *   - tasks target the weakest (lowest-progress) sections first — the bottleneck
 *   - a deterministic `inputHash` lets callers REUSE today's run when nothing
 *     meaningful changed, instead of regenerating every load
 *
 * This file is pure and imports no React/Supabase. It is NOT wired into task
 * generation yet (that is Phase C2). See docs/dashboard-technical-appendix.md §5b.
 */

export const RECOMMENDED_TASK_COUNT = 4;

/**
 * Bump when the engine's selection/templates/weights change, so cached runs with
 * a stale hash are regenerated instead of silently reused. Included in the hash.
 */
export const RECOMMENDATION_ENGINE_VERSION = 1;

/** Fixed daily slots — pace changes what fills them, not how many. */
const SCHEDULE_SLOTS = ["09:00", "10:30", "13:00", "15:00"] as const;

export type SectionProgressInput = {
  sectionId: DashboardSectionId;
  /** 0..100, as produced by deriveDashboardState's per-section progress. */
  percent: number;
};

export type RecommendScheduleInput = {
  projectId: string;
  taskDate: string; // local day, YYYY-MM-DD
  paceMode: DashboardPaceMode;
  sections: SectionProgressInput[];
};

export type RecommendedTaskSpec = {
  scheduled_time: string;
  title: string;
  subtitle: string;
  section_id: DashboardSectionId;
  sort_order: number;
  task_weight: number;
  counts_toward_daily_target: boolean;
  origin: "recommended";
  estimated_minutes: number;
  difficulty: "easy" | "medium" | "hard";
  /** Stable per (project, date, inputHash, slot) so re-runs upsert, not duplicate. */
  generation_key: string;
};

export type ScheduleRecommendation = {
  inputHash: string;
  tasks: RecommendedTaskSpec[]; // exactly RECOMMENDED_TASK_COUNT
};

type SectionTemplate = {
  title: string;
  /** subtitle given a whole-number "amount" scaled by pace intensity. */
  subtitle: (amount: number) => string;
  /** base count of work units at low pace; scaled up by intensity. */
  baseAmount: number;
  baseMinutes: number;
  weight: number;
  difficulty: RecommendedTaskSpec["difficulty"];
};

/** One recommended-task template per section (the "what to do next here"). */
const SECTION_TEMPLATES: Record<DashboardSectionId, SectionTemplate> = {
  "meta-analysis": {
    title: "Meta-analysis setup",
    subtitle: (n) => `Map ${n} effect ${n === 1 ? "row" : "rows"} & assumptions`,
    baseAmount: 2,
    baseMinutes: 25,
    weight: 5,
    difficulty: "hard",
  },
  "literature-review": {
    title: "Literature review sprint",
    subtitle: (n) => `Add & code ${n} evidence ${n === 1 ? "row" : "rows"}`,
    baseAmount: 2,
    baseMinutes: 30,
    weight: 4,
    difficulty: "medium",
  },
  workspace: {
    title: "Source & highlight pass",
    subtitle: (n) => `Tag ${n} ${n === 1 ? "highlight" : "highlights"} into notes`,
    baseAmount: 3,
    baseMinutes: 20,
    weight: 2,
    difficulty: "easy",
  },
  upload: {
    title: "Source intake",
    subtitle: (n) => `Upload ${n} new ${n === 1 ? "source" : "sources"}`,
    baseAmount: 1,
    baseMinutes: 15,
    weight: 2,
    difficulty: "easy",
  },
  scholarask: {
    title: "Research pathway session",
    subtitle: (n) => `Explore ${n} research ${n === 1 ? "pathway" : "pathways"}`,
    baseAmount: 1,
    baseMinutes: 15,
    weight: 1,
    difficulty: "easy",
  },
  draft: {
    title: "Draft a guided section",
    subtitle: (n) => `Turn ${n} synthesis ${n === 1 ? "paragraph" : "paragraphs"} into writing`,
    baseAmount: 1,
    baseMinutes: 35,
    weight: 5,
    difficulty: "hard",
  },
  citations: {
    title: "Citation cleanup",
    subtitle: (n) => `Fix APA fields on ${n} ${n === 1 ? "reference" : "references"}`,
    baseAmount: 3,
    baseMinutes: 20,
    weight: 2,
    difficulty: "easy",
  },
  notes: {
    title: "Project check-in",
    subtitle: () => "Review your next useful move",
    baseAmount: 1,
    baseMinutes: 15,
    weight: 1,
    difficulty: "easy",
  },
};

/** Default ordering used to pad to 4 when a project has fewer sections supplied. */
const FALLBACK_ORDER: DashboardSectionId[] = [
  "literature-review",
  "workspace",
  "draft",
  "citations",
  "meta-analysis",
  "notes",
];

/** Pace -> daily intensity. Higher pace = more per task; the COUNT stays 4. */
const PACE_INTENSITY: Record<DashboardPaceMode, number> = {
  low: 1,
  moderate: 1.2,
  high: 1.4,
};

/** FNV-1a (deterministic, no clock/random) — stable across sessions. */
function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Bucket a percent to the nearest 10 so trivial changes don't churn the plan. */
function bucket(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.round(Math.max(0, Math.min(100, percent)) / 10) * 10;
}

/**
 * Pick the 4 weakest (lowest-progress) sections, padded deterministically to 4.
 * Sorts by the SAME bucketed percent the input hash uses, so a given hash always
 * maps to the same selection/order (otherwise output could change while the hash —
 * and therefore the cache key — stayed put).
 */
function pickBottleneckSections(sections: SectionProgressInput[]): DashboardSectionId[] {
  const ordered = [...sections]
    .sort(
      (a, b) =>
        bucket(a.percent) - bucket(b.percent) ||
        FALLBACK_ORDER.indexOf(a.sectionId) - FALLBACK_ORDER.indexOf(b.sectionId)
    )
    .map((section) => section.sectionId);

  const chosen: DashboardSectionId[] = [];
  for (const id of [...ordered, ...FALLBACK_ORDER]) {
    if (!chosen.includes(id)) chosen.push(id);
    if (chosen.length === RECOMMENDED_TASK_COUNT) break;
  }
  return chosen;
}

export function computeScheduleInputHash(input: RecommendScheduleInput): string {
  const sectionPart = [...input.sections]
    .sort((a, b) => a.sectionId.localeCompare(b.sectionId))
    .map((section) => `${section.sectionId}:${bucket(section.percent)}`)
    .join(",");
  return hashString(
    `v${RECOMMENDATION_ENGINE_VERSION}|${input.projectId}|${input.taskDate}|${input.paceMode}|${sectionPart}`
  );
}

export function recommendSchedule(input: RecommendScheduleInput): ScheduleRecommendation {
  const inputHash = computeScheduleInputHash(input);
  const intensity = PACE_INTENSITY[input.paceMode] ?? 1;
  const sections = pickBottleneckSections(input.sections);

  // Normalize the SELECTED templates' weights so task_weight sums to 1.0 — this is
  // each task's share of today's target, so completing all four reaches 100%.
  const weightSum = sections.reduce((sum, id) => sum + SECTION_TEMPLATES[id].weight, 0) || 1;

  const tasks: RecommendedTaskSpec[] = sections.map((sectionId, index) => {
    const template = SECTION_TEMPLATES[sectionId];
    const amount = Math.max(1, Math.round(template.baseAmount * intensity));
    const estimatedMinutes = Math.round(template.baseMinutes * intensity);

    return {
      scheduled_time: SCHEDULE_SLOTS[index] ?? "",
      title: template.title,
      subtitle: template.subtitle(amount),
      section_id: sectionId,
      sort_order: index,
      task_weight: template.weight / weightSum,
      counts_toward_daily_target: true,
      origin: "recommended",
      estimated_minutes: estimatedMinutes,
      difficulty: template.difficulty,
      generation_key: `recommended:${input.projectId}:${input.taskDate}:${inputHash}:${index}`,
    };
  });

  return { inputHash, tasks };
}
