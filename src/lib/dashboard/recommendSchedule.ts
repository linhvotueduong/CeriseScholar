import type { DashboardSectionId } from "@/lib/dashboard/deriveDashboardState";
import type { DashboardPaceMode } from "@/lib/dashboard/targetPace";
import type { BehaviorProfile } from "@/lib/dashboard/behaviorProfile";

/**
 * Phase C — Today's Schedule recommendation engine (pure, deterministic).
 *
 * Turns the project's current per-section progress + the user's pace into EXACTLY
 * four recommended tasks for the day. The contract (from the v2 spec / appendix):
 *   - always exactly 4 tasks, UNLESS an optional behavior profile (Stage 1
 *     personalization, see `profile` below) documents a low task-completion rate,
 *     in which case it is intentionally reduced by 1 (never below 2) — see
 *     LOW_COMPLETION_RATE_THRESHOLD.
 *   - PACE changes intensity (minutes + amount asked), never the count
 *   - tasks target the weakest (lowest-progress) sections first — the bottleneck
 *   - a deterministic `inputHash` lets callers REUSE today's run when nothing
 *     meaningful changed, instead of regenerating every load
 *
 * This file is pure and imports no React/Supabase. CORRECTION 2026-07-07: it IS
 * wired into task generation — src/hooks/useDashboardState.ts imports and calls
 * recommendSchedule(). See docs/dashboard-technical-appendix.md §5b.
 *
 * PERSONALIZATION (Stage 1, optional `profile` input, backward compatible):
 * when `profile` is omitted, or present but `lowConfidence`, behavior is byte-for-byte
 * identical to the un-personalized engine. Otherwise, each documented, independent
 * adjustment may apply (see the named constants just below the imports):
 *   - low taskCompletionRate -> fewer tasks, easier weak sections preferred
 *   - high jumperScore -> ensure the plan spans a healthy variety of sections
 *   - a real avoidedSection -> kept, but moved out of the lead slot and softened
 *   - a long longestGapDays -> the lightest selected task leads, as a re-entry ramp
 */

export const RECOMMENDED_TASK_COUNT = 4;

/**
 * Bump when the engine's selection/templates/weights change, so cached runs with
 * a stale hash are regenerated instead of silently reused. Included in the hash.
 * v2: added optional behavior-profile personalization (see PERSONALIZATION_*
 * constants below) — pure additions, no behavior change when `profile` is absent.
 */
export const RECOMMENDATION_ENGINE_VERSION = 2;

// --- Personalization thresholds (Stage 1 — deterministic, documented, modest) ---
// Below this completion rate, the user is struggling to keep up: prefer easier
// weak sections and ask for one fewer task today.
const LOW_COMPLETION_RATE_THRESHOLD = 0.4;
const LOW_COMPLETION_TASK_REDUCTION = 1;
const MIN_TASK_COUNT = 2;
// Above this jumper score, the user hops between sections day-to-day; make sure
// today's plan still spans a healthy variety of sections rather than narrowing.
const JUMPER_SCORE_THRESHOLD = 0.6;
const JUMPER_MIN_DISTINCT_SECTIONS = 3;
// At/above this many days since the user was last active, ease them back in with
// the lightest selected task first, instead of front-loading the biggest one.
const REENTRY_GAP_DAYS = 4;
// How much lighter the avoided section's task becomes when it's kept but softened.
const AVOIDED_SECTION_SOFTEN_FACTOR = 0.75;
const DIFFICULTY_RANK: Record<RecommendedTaskSpec["difficulty"], number> = { easy: 0, medium: 1, hard: 2 };

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
  /**
   * Optional per-user/per-project behavior profile (behaviorProfile.ts). Backward
   * compatible: omitting it (or passing a lowConfidence one) reproduces the exact
   * un-personalized output. See PERSONALIZATION_* constants above for the rules.
   */
  profile?: BehaviorProfile;
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
 * Pick the `count` weakest (lowest-progress) sections, padded deterministically.
 * Sorts by the SAME bucketed percent the input hash uses, so a given hash always
 * maps to the same selection/order (otherwise output could change while the hash —
 * and therefore the cache key — stayed put).
 *
 * When `preferEasier` is set (low task-completion-rate personalization), ties within
 * the same weakness bucket favor the lower-difficulty section — a modest nudge, not a
 * different pipeline: the weakest section is still always first.
 */
function pickBottleneckSections(
  sections: SectionProgressInput[],
  count: number,
  preferEasier = false
): DashboardSectionId[] {
  const ordered = [...sections]
    .sort((a, b) => {
      const byBucket = bucket(a.percent) - bucket(b.percent);
      if (byBucket !== 0) return byBucket;
      if (preferEasier) {
        const byDifficulty =
          DIFFICULTY_RANK[SECTION_TEMPLATES[a.sectionId].difficulty] -
          DIFFICULTY_RANK[SECTION_TEMPLATES[b.sectionId].difficulty];
        if (byDifficulty !== 0) return byDifficulty;
      }
      return FALLBACK_ORDER.indexOf(a.sectionId) - FALLBACK_ORDER.indexOf(b.sectionId);
    })
    .map((section) => section.sectionId);

  const chosen: DashboardSectionId[] = [];
  for (const id of [...ordered, ...FALLBACK_ORDER]) {
    if (!chosen.includes(id)) chosen.push(id);
    if (chosen.length === count) break;
  }
  return chosen;
}

/**
 * jumperScore > JUMPER_SCORE_THRESHOLD: make sure today's plan spans at least
 * JUMPER_MIN_DISTINCT_SECTIONS distinct sections when the project has that many
 * available at all (pickBottleneckSections already dedupes, so this is a defensive
 * top-up, not a rewrite — it only ever ADDS sections, never removes the weakest one).
 */
function ensureSectionSpread(
  chosen: DashboardSectionId[],
  minDistinct: number,
  available: DashboardSectionId[]
): DashboardSectionId[] {
  if (chosen.length >= minDistinct) return chosen;
  const result = [...chosen];
  for (const id of [...available, ...FALLBACK_ORDER]) {
    if (result.length >= minDistinct) break;
    if (!result.includes(id)) result.push(id);
  }
  return result;
}

/**
 * avoidedSection personalization: if the profile's avoided-but-needed section landed
 * in slot 0 (the weakest pick), keep it — just move it to slot 1 instead of 1st, so
 * it's still on today's plan without leading with the thing the user avoids most.
 */
function deprioritizeAvoidedSection(
  chosen: DashboardSectionId[],
  avoidedSection: DashboardSectionId | null
): DashboardSectionId[] {
  if (!avoidedSection || chosen.length < 2 || chosen[0] !== avoidedSection) return chosen;
  const result = [...chosen];
  [result[0], result[1]] = [result[1], result[0]];
  return result;
}

/**
 * longestGapDays re-entry personalization: put the lightest (lowest estimated-minutes)
 * selected section first, so coming back after a gap starts with a small win — never
 * inventing a new task type, just reordering the existing templates. Skips the
 * avoided section as the re-entry pick (it must stay out of slot 0 per the rule above)
 * unless it's the only option.
 */
function leadWithLightestTask(
  chosen: DashboardSectionId[],
  intensity: number,
  avoidedSection: DashboardSectionId | null
): DashboardSectionId[] {
  if (chosen.length < 2) return chosen;
  const minutesFor = (id: DashboardSectionId) => SECTION_TEMPLATES[id].baseMinutes * intensity;
  const candidates = chosen.filter((id) => id !== avoidedSection);
  const pool = candidates.length > 0 ? candidates : chosen;
  let lightest = pool[0];
  for (const id of pool) {
    if (minutesFor(id) < minutesFor(lightest)) lightest = id;
  }
  if (lightest === chosen[0]) return chosen;
  return [lightest, ...chosen.filter((id) => id !== lightest)];
}

/**
 * Only the profile facts that can actually change today's output participate in the
 * hash (bucketed to booleans/ids, same "don't churn the cache on noise" philosophy as
 * `bucket()` for percents) — a low-confidence profile, or one whose flags are all off,
 * hashes identically to having no profile at all; any real personalization trigger
 * flips a bit here, which regenerates the day's recommendation via the existing
 * inputHash / generation_key reuse mechanism.
 */
function profileHashPart(profile: BehaviorProfile | undefined): string {
  if (!profile || profile.lowConfidence) return "profile:none";
  const lowCompletion = profile.taskCompletionRate !== null && profile.taskCompletionRate < LOW_COMPLETION_RATE_THRESHOLD;
  const jumper = profile.jumperScore > JUMPER_SCORE_THRESHOLD;
  const reentry = profile.workRhythm.longestGapDays >= REENTRY_GAP_DAYS;
  return `profile:${lowCompletion ? 1 : 0}${jumper ? 1 : 0}${reentry ? 1 : 0}:${profile.avoidedSection ?? "-"}`;
}

export function computeScheduleInputHash(input: RecommendScheduleInput): string {
  const sectionPart = [...input.sections]
    .sort((a, b) => a.sectionId.localeCompare(b.sectionId))
    .map((section) => `${section.sectionId}:${bucket(section.percent)}`)
    .join(",");
  return hashString(
    `v${RECOMMENDATION_ENGINE_VERSION}|${input.projectId}|${input.taskDate}|${input.paceMode}|${sectionPart}|${profileHashPart(input.profile)}`
  );
}

export function recommendSchedule(input: RecommendScheduleInput): ScheduleRecommendation {
  const inputHash = computeScheduleInputHash(input);
  const intensity = PACE_INTENSITY[input.paceMode] ?? 1;

  const profile = input.profile && !input.profile.lowConfidence ? input.profile : undefined;
  const lowCompletion = !!profile && profile.taskCompletionRate !== null && profile.taskCompletionRate < LOW_COMPLETION_RATE_THRESHOLD;
  const isJumper = !!profile && profile.jumperScore > JUMPER_SCORE_THRESHOLD;
  const needsReentry = !!profile && profile.workRhythm.longestGapDays >= REENTRY_GAP_DAYS;
  const avoidedSection = profile?.avoidedSection ?? null;

  const taskCount = lowCompletion
    ? Math.max(MIN_TASK_COUNT, RECOMMENDED_TASK_COUNT - LOW_COMPLETION_TASK_REDUCTION)
    : RECOMMENDED_TASK_COUNT;

  let sections = pickBottleneckSections(input.sections, taskCount, lowCompletion);
  if (isJumper) {
    const available = input.sections.map((section) => section.sectionId);
    sections = ensureSectionSpread(sections, Math.min(JUMPER_MIN_DISTINCT_SECTIONS, taskCount), available);
  }
  // Only "matches the weakest section" (rule as documented) triggers softening —
  // an avoidedSection present elsewhere in the plan is left completely untouched.
  const avoidedMatchesWeakest = avoidedSection !== null && sections[0] === avoidedSection;
  sections = deprioritizeAvoidedSection(sections, avoidedSection);
  if (needsReentry) {
    sections = leadWithLightestTask(sections, intensity, avoidedSection);
  }
  const softenSection = avoidedMatchesWeakest ? avoidedSection : null;

  // Normalize the SELECTED templates' weights so task_weight sums to 1.0 — this is
  // each task's share of today's target, so completing all four reaches 100%.
  const weightSum = sections.reduce((sum, id) => sum + SECTION_TEMPLATES[id].weight, 0) || 1;

  const tasks: RecommendedTaskSpec[] = sections.map((sectionId, index) => {
    const template = SECTION_TEMPLATES[sectionId];
    // Soften the avoided section's own task (never a different section's) so it's
    // easier to actually start, without inventing a new task type/template.
    const soften = sectionId === softenSection;
    const softenFactor = soften ? AVOIDED_SECTION_SOFTEN_FACTOR : 1;
    const amount = Math.max(1, Math.round(template.baseAmount * intensity * softenFactor));
    const estimatedMinutes = Math.max(5, Math.round(template.baseMinutes * intensity * softenFactor));

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
