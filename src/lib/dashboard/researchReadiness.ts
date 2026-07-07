import type { DashboardSectionId } from "@/lib/dashboard/deriveDashboardState";

/**
 * Research Readiness v2.5 — deterministic checklist model of the whole research journey.
 * Design: docs/research-readiness-checklist-model.md (founder-approved 2026-07-02).
 * Ground truth for every signal: docs/user-actions-per-surface.md.
 *
 * Three separated concerns (§5 of the design doc):
 * - What the project HAS: all micro-checks, evaluated order-independently (a ledger).
 * - Where the user IS: the macro area of their most recent activity event (status
 *   follows the user; the ladder order is only a cold-start fallback).
 * - What helps MOST next: the first unmet check of the active area; when that area is
 *   complete, a bridge to the earliest unmet area in ladder order.
 *
 * The readiness summary is the friendly WHY behind the suggested move (founder rule:
 * explain the suggestion, don't restate the command), warm in tone, and hard-capped so
 * it always fits the card's two-line summary box.
 *
 * Honesty rules (§2):
 * - Unmeasurable signals (ScholarAsk conversation content) are advisory: never done,
 *   never gate.
 * - Auto-behaviors never count as work: stub apa_reference (auto-created per row) must
 *   pass a genuine-APA shape gate; auto-inserted default codes are excluded upstream;
 *   an auto-created (empty) meta_analyses row does not activate the meta lane.
 * - Escape hatches: real work satisfies setup/pathway checks so no archetype is trapped.
 * - Moves are real product actions only — never "Add lit rows" (rows are auto-created
 *   by highlighting), "Link evidence", or "Generate report" (no export exists).
 */

export type ReadinessSurface =
  | "project_setup"
  | "scholarask"
  | "upload"
  | "workspace"
  | "literature_review"
  | "meta_analysis"
  | "draft";

const SURFACE_SECTION: Record<ReadinessSurface, DashboardSectionId> = {
  project_setup: "workspace",
  scholarask: "scholarask",
  upload: "upload",
  workspace: "workspace",
  literature_review: "literature-review",
  meta_analysis: "meta-analysis",
  draft: "draft",
};

export type MicroCheckId =
  | "plan.title"
  | "plan.target_date"
  | "plan.pace"
  | "plan.project_model"
  | "topic.described"
  | "pathway.recognized"
  | "pathway.explore" // advisory — conversation content is never persisted
  | "evidence.source_first"
  | "evidence.sources_built"
  | "evidence.ocr_ok"
  | "evidence.highlight_first"
  | "evidence.notes_captured"
  | "evidence.codes_created"
  | "evidence.highlights_coded"
  | "evidence.sources_finished"
  | "review.first_insight"
  | "review.insights_coverage"
  | "claim.apa_real"
  | "synth.first"
  | "synth.sources_covered"
  | "synth.quality"
  | "draft.lit_section"
  | "draft.core_sections"
  | "draft.references_synced"
  | "draft.abstract_conclusion"
  | "meta.defined"
  | "meta.mapped"
  | "meta.results";

type CheckMeta = {
  surface: ReadinessSurface;
  label: string;
  move: string;
  /** Friendly one-liner shown as the readiness summary: WHY this move helps now. */
  why: string;
  /** false => not backed by stored data; can never report `done: true`. */
  measurable: boolean;
};

// `move` is the SHORT (2-3 word) human action shown as "Next move". Never a raw id.
// `why` is warm and explanatory — it earns the suggestion instead of commanding it.
const CHECK_META: Record<MicroCheckId, CheckMeta> = {
  "plan.title": { surface: "project_setup", label: "Meaningful project title", move: "Name your project", why: "A clear name gives your project an identity to build on.", measurable: true },
  "plan.target_date": { surface: "project_setup", label: "Target date set", move: "Set target date", why: "A target date helps pace your work so nothing piles up.", measurable: true },
  "plan.pace": { surface: "project_setup", label: "Work pace chosen", move: "Choose work pace", why: "Picking a pace keeps your daily targets kind and doable.", measurable: true },
  "plan.project_model": { surface: "project_setup", label: "Project type picked", move: "Pick project type", why: "Your project type helps us size the journey just right.", measurable: true },
  "topic.described": { surface: "workspace", label: "Topic description added", move: "Add topic description", why: "A short topic note keeps every next step pointed one way.", measurable: true },
  "pathway.recognized": { surface: "scholarask", label: "Research pathway recognized", move: "Explore research pathways", why: "A little exploring now can save weeks of wandering later.", measurable: true },
  "pathway.explore": { surface: "scholarask", label: "Pathway angles explored", move: "Explore research pathways", why: "A little exploring now can save weeks of wandering later.", measurable: false },
  "evidence.source_first": { surface: "upload", label: "First source uploaded", move: "Upload a source", why: "Your first source starts the evidence your paper stands on.", measurable: true },
  "evidence.sources_built": { surface: "upload", label: "Source base built", move: "Add more sources", why: "A few more sources will give your review a stronger base.", measurable: true },
  "evidence.ocr_ok": { surface: "upload", label: "Sources readable", move: "Check source text", why: "A source didn't read well — a quick look keeps it usable.", measurable: true },
  "evidence.highlight_first": { surface: "workspace", label: "First highlight", move: "Highlight a passage", why: "Your first highlight turns reading into real evidence.", measurable: true },
  "evidence.notes_captured": { surface: "workspace", label: "Sticky notes captured", move: "Add sticky notes", why: "Sticky notes save your thinking while it's still fresh.", measurable: true },
  "evidence.codes_created": { surface: "workspace", label: "Codes created", move: "Create your codes", why: "A couple of codes help group your highlights into themes.", measurable: true },
  "evidence.highlights_coded": { surface: "workspace", label: "Highlights coded", move: "Code your highlights", why: "Coding highlights sorts your evidence into clear themes.", measurable: true },
  "evidence.sources_finished": { surface: "workspace", label: "Sources finish-analyzed", move: "Finish your sources", why: "Marking sources done shows you what's truly left to read.", measurable: true },
  "review.first_insight": { surface: "literature_review", label: "First row reviewed", move: "Review your rows", why: "Reviewing your first row turns quotes into your own ideas.", measurable: true },
  "review.insights_coverage": { surface: "literature_review", label: "Insights across sources", move: "Write insights", why: "A few more insights will make your evidence speak clearly.", measurable: true },
  "claim.apa_real": { surface: "literature_review", label: "References look like real APA", move: "Add APA references", why: "Real references let every claim stand up to any reader.", measurable: true },
  "synth.first": { surface: "literature_review", label: "First synthesis written", move: "Write a synthesis", why: "Your first synthesis starts weaving sources into a story.", measurable: true },
  "synth.sources_covered": { surface: "literature_review", label: "Finished sources synthesized", move: "Synthesize your sources", why: "Synthesizing each source builds your paper's backbone.", measurable: true },
  "synth.quality": { surface: "literature_review", label: "Synthesis depth", move: "Deepen your synthesis", why: "A little more depth will make your argument really shine.", measurable: true },
  "draft.lit_section": { surface: "draft", label: "Literature review section drafted", move: "Draft literature review", why: "Starting with the lit review makes the rest flow easier.", measurable: true },
  "draft.core_sections": { surface: "draft", label: "Core sections drafted", move: "Draft core sections", why: "The core sections carry your story — they come next.", measurable: true },
  "draft.references_synced": { surface: "draft", label: "References synced", move: "Sync references", why: "Syncing references saves retyping every citation by hand.", measurable: true },
  "draft.abstract_conclusion": { surface: "draft", label: "Abstract and conclusion written", move: "Write abstract last", why: "With everything drafted, the abstract almost writes itself.", measurable: true },
  "meta.defined": { surface: "meta_analysis", label: "Question and hypothesis defined", move: "Define your hypothesis", why: "A clear hypothesis makes every next step easier to pick.", measurable: true },
  "meta.mapped": { surface: "meta_analysis", label: "Data columns mapped", move: "Map your data", why: "Mapping your columns lets the stats run on real numbers.", measurable: true },
  "meta.results": { surface: "meta_analysis", label: "Result plots built", move: "Build your plots", why: "A plot or two will make your findings easy to see.", measurable: true },
};

/** Why-line for the pathway move once the Research Pathway home has shipped. */
const PATHWAY_STATE_WHY = "Jot your research question so we can guide you around it.";

export type ReadinessStageId =
  | "research_plan"
  | "research_topic"
  | "theme_clarity"
  | "evidence_base"
  | "source_review"
  | "claim_support"
  | "synthesis"
  | "paper_draft"
  | "final_review"
  | "meta_lane";

type Area = {
  id: ReadinessStageId;
  currentStatus: string;
  requires: MicroCheckId[];
};

const AREAS: Record<ReadinessStageId, Area> = {
  research_plan: {
    id: "research_plan",
    currentStatus: "Research plan",
    requires: ["plan.title", "plan.target_date", "plan.pace", "plan.project_model"],
  },
  research_topic: {
    id: "research_topic",
    currentStatus: "Research topic",
    requires: ["topic.described"],
  },
  theme_clarity: {
    id: "theme_clarity",
    currentStatus: "Theme clarity",
    requires: ["pathway.recognized"],
  },
  evidence_base: {
    id: "evidence_base",
    currentStatus: "Evidence base",
    requires: [
      "evidence.source_first",
      "evidence.sources_built",
      "evidence.ocr_ok",
      "evidence.highlight_first",
      "evidence.notes_captured",
      "evidence.codes_created",
      "evidence.highlights_coded",
      "evidence.sources_finished",
    ],
  },
  source_review: {
    id: "source_review",
    currentStatus: "Source review",
    requires: ["review.first_insight", "review.insights_coverage"],
  },
  claim_support: {
    id: "claim_support",
    currentStatus: "Claim support",
    requires: ["claim.apa_real"],
  },
  synthesis: {
    id: "synthesis",
    currentStatus: "Synthesis",
    requires: ["synth.first", "synth.sources_covered", "synth.quality"],
  },
  paper_draft: {
    id: "paper_draft",
    currentStatus: "Paper draft",
    requires: ["draft.lit_section", "draft.core_sections", "draft.references_synced", "draft.abstract_conclusion"],
  },
  final_review: {
    id: "final_review",
    currentStatus: "Draft complete",
    requires: [],
  },
  meta_lane: {
    id: "meta_lane",
    currentStatus: "Meta analysis",
    requires: ["meta.defined", "meta.mapped", "meta.results"],
  },
};

/** Main ladder order — cold-start fallback and bridge scanning. Meta is a parallel lane. */
const MAIN_LADDER: ReadinessStageId[] = [
  "research_plan",
  "research_topic",
  "theme_clarity",
  "evidence_base",
  "source_review",
  "claim_support",
  "synthesis",
  "paper_draft",
];

const TERMINAL_MOVE = {
  move: "Review full draft",
  surface: "draft" as ReadinessSurface,
  why: "Lovely work — read it end to end and enjoy how far it came.",
};

/**
 * Card constraint: the summary box fits TWO lines — its designed placeholder is 62
 * chars. Every why-line stays <= READINESS_SUMMARY_MAX so no word ever wraps to a
 * third line (founder rule, 2026-07-02). Test-enforced.
 */
export const READINESS_SUMMARY_MAX = 64;

/** Exported for the 2-line copy-budget test — not for rendering. */
export const READINESS_WHY_LINES: string[] = [
  ...(Object.values(CHECK_META) as CheckMeta[]).map((meta) => meta.why),
  PATHWAY_STATE_WHY,
  TERMINAL_MOVE.why,
];

export type ReadinessSignals = {
  /** Injected clock (ms epoch) — never Date.now() inside pure helpers. */
  now: number;
  titleText: string;
  topicText: string;
  /** null = the Research Pathway home has not shipped; "" = shipped but empty. */
  pathwayText: string | null;
  settings: {
    hasTargetDate: boolean;
    hasPace: boolean;
    hasProjectModel: boolean;
    /** The user's OWN declared source count from project_scope — thresholds scale from it. */
    expectedSources: number | null;
  };
  sources: {
    total: number;
    ocrFailed: number;
    /** null = the per-source Finish button has not shipped (hatch: insights imply finished). */
    finished: number | null;
    /** Distinct sources whose rows carry meaningful insights — the finished proxy. */
    insightSources: number;
  };
  highlights: number;
  meaningfulNotes: number;
  /** Codes the user actually made — auto-inserted defaults excluded upstream. */
  userCodes: number;
  /** Rows with a meaningful code/theme label typed on them (anyOf route for codes). */
  themedRows: number;
  codedHighlightFraction: number;
  rows: {
    total: number;
    insightful: number;
    genuineApa: number;
    synthesized: number;
    /** Rows ready for synthesis (finished sources' rows; hatch: rows with insights). */
    ripe: number;
    ripeSynthesized: number;
  };
  draft: {
    litSection: boolean;
    coreSections: number; // of intro, methodology, results, discussion (0-4)
    referencesSynced: boolean;
    abstract: boolean;
    conclusion: boolean;
  };
  meta: {
    exists: boolean;
    question: boolean;
    hypothesis: boolean;
    typeSet: boolean;
    mapped: boolean;
    results: boolean;
    requiredByScope: boolean;
  };
  /** null = the research_query_submitted event is not logged yet (pivot Phase 1). */
  journeyEvents: number | null;
  /** Deterministic evaluator score for synthesis text (0..1). */
  synthQuality: number;
  /** Recent activity events, newest first — drives status-follows-the-user. */
  recentEvents: Array<{ type: string; at: number }>;
};

export type ReadinessHealthRow = { label: string; value: string; tone: "green" | "amber" | "purple" | "red" };

export type MicroCheckResult = {
  id: MicroCheckId;
  surface: ReadinessSurface;
  label: string;
  done: boolean;
  measurable: boolean;
  sectionId: DashboardSectionId;
};

export type ResearchReadiness = {
  microChecks: MicroCheckResult[];
  readinessStageId: ReadinessStageId;
  readinessSummary: string;
  healthRows: ReadinessHealthRow[];
  currentStatus: string;
  nextBestMove: string;
  nextMoveSurface: ReadinessSurface;
  nextMoveSectionId: DashboardSectionId;
  /** Which check (and via which path: active/bridge/ladder) decided the result. */
  reason: string;
};

// Thresholds. Counts scale from the user's own declared plan (SOURCE_PLAN_RATIO of
// expectedSources) with a fallback when unset; fractions are "most of the work" gates.
const SOURCE_TARGET_FALLBACK = 5;
const SOURCE_PLAN_RATIO = 0.8;
const FINISHED_GOOD = 0.8;
const CODE_GOOD = 0.5;
const REVIEW_GOOD = 0.6;
const APA_GOOD = 0.6;
const SYNTH_GOOD = 0.6;
const QUALITY_GATE = 0.4;
const RECENCY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const PLACEHOLDER_TITLES = new Set([
  "untitled",
  "untitled project",
  "new project",
  "new research project",
  "my project",
  "my research",
  "project",
  "demo project",
  "sample project",
  "test project",
  "test",
  "research project",
]);

function isMeaningfulTitle(name: string) {
  const t = (name ?? "").trim().toLowerCase();
  if (t.length < 3) return false;
  if (t.startsWith("untitled")) return false;
  return !PLACEHOLDER_TITLES.has(t);
}

function isMeaningfulTopic(text: string) {
  return (text ?? "").trim().length >= 12;
}

/**
 * Genuine-APA shape gate: every row is BORN with a metadata stub ("Author. "Title".")
 * so non-empty can never count. A real APA reference carries an author-year "(2020)".
 */
export function isGenuineApa(text: string): boolean {
  const t = (text ?? "").trim();
  return t.length >= 20 && /\(\d{4}[a-z]?\)/.test(t);
}

export function sourceTarget(expectedSources: number | null): number {
  if (expectedSources && expectedSources > 0) return Math.max(1, Math.round(expectedSources * SOURCE_PLAN_RATIO));
  return SOURCE_TARGET_FALLBACK;
}

function hasStartedRealWork(s: ReadinessSignals) {
  return s.sources.total > 0 || s.highlights > 0 || s.rows.total > 0 || metaLaneActive(s);
}

/** Row existence never activates the lane — the row is auto-created on page visit. */
function metaLaneActive(s: ReadinessSignals) {
  const m = s.meta;
  const hasContent = m.question || m.hypothesis || m.typeSet || m.mapped || m.results;
  return (m.exists && hasContent) || m.requiredByScope;
}

function evaluateChecks(s: ReadinessSignals): Record<MicroCheckId, boolean> {
  const startedRealWork = hasStartedRealWork(s);
  const pathwayRecognized =
    (s.pathwayText !== null && isMeaningfulTopic(s.pathwayText)) ||
    (s.meta.question && s.meta.hypothesis) ||
    (s.journeyEvents ?? 0) > 0 ||
    // Escape hatch: doers who never state a pathway are recognized by their evidence.
    s.sources.total > 0 ||
    s.highlights > 0;
  const sourcesFinished =
    s.sources.finished !== null
      ? s.sources.total > 0 && s.sources.finished / s.sources.total >= FINISHED_GOOD
      : // Finish button not shipped: insight work implies the user is already reviewing.
        s.rows.insightful > 0;
  return {
    "plan.title": isMeaningfulTitle(s.titleText) || startedRealWork,
    "plan.target_date": s.settings.hasTargetDate || startedRealWork,
    "plan.pace": s.settings.hasPace || startedRealWork,
    "plan.project_model": s.settings.hasProjectModel || startedRealWork,
    "topic.described": isMeaningfulTopic(s.topicText) || s.rows.total > 0,
    "pathway.recognized": pathwayRecognized,
    "pathway.explore": false, // advisory — conversation content never persists
    "evidence.source_first": s.sources.total > 0,
    "evidence.sources_built": s.sources.total >= sourceTarget(s.settings.expectedSources),
    "evidence.ocr_ok": s.sources.total > 0 && s.sources.ocrFailed === 0,
    "evidence.highlight_first": s.highlights > 0,
    "evidence.notes_captured": s.meaningfulNotes > 0,
    "evidence.codes_created": s.userCodes >= 2 || s.themedRows > 0,
    "evidence.highlights_coded": s.highlights > 0 && s.codedHighlightFraction >= CODE_GOOD,
    "evidence.sources_finished": sourcesFinished,
    "review.first_insight": s.rows.insightful >= 1,
    "review.insights_coverage": s.rows.total > 0 && s.rows.insightful / s.rows.total >= REVIEW_GOOD,
    "claim.apa_real": s.rows.total > 0 && s.rows.genuineApa / s.rows.total >= APA_GOOD,
    "synth.first": s.rows.synthesized >= 1,
    "synth.sources_covered": s.rows.ripe > 0 && s.rows.ripeSynthesized / s.rows.ripe >= SYNTH_GOOD,
    "synth.quality": s.rows.synthesized > 0 && s.synthQuality >= QUALITY_GATE,
    "draft.lit_section": s.draft.litSection,
    "draft.core_sections": s.draft.coreSections >= 3,
    "draft.references_synced": s.draft.referencesSynced,
    "draft.abstract_conclusion": s.draft.abstract && s.draft.conclusion,
    "meta.defined": s.meta.question && s.meta.hypothesis && s.meta.typeSet,
    "meta.mapped": s.meta.mapped,
    "meta.results": s.meta.results,
  };
}

/** Event → macro area. Unknown/noise events (opens) return null and are skipped. */
function eventArea(type: string, checks: Record<MicroCheckId, boolean>): ReadinessStageId | null {
  switch (type) {
    case "source_uploaded":
    case "highlight_created":
    case "note_created":
      return "evidence_base";
    case "source_review_finished":
      return "source_review";
    case "research_query_submitted":
    case "research_pathway_saved":
      return "theme_clarity";
    case "literature_row_saved": {
      // A row save doesn't say WHICH column was edited — the ledger disambiguates:
      // point at the earliest Lit-Review area that still has work.
      const litAreas: ReadinessStageId[] = ["source_review", "claim_support", "synthesis"];
      return litAreas.find((area) => AREAS[area].requires.some((id) => !checks[id])) ?? "synthesis";
    }
    case "paper_draft_saved":
      return "paper_draft";
    case "meta_analysis_updated":
      return "meta_lane";
    default:
      return null;
  }
}

function resolveActiveArea(s: ReadinessSignals, checks: Record<MicroCheckId, boolean>): ReadinessStageId | null {
  for (const event of s.recentEvents) {
    if (!Number.isFinite(event.at) || s.now - event.at > RECENCY_WINDOW_MS) continue;
    const area = eventArea(event.type, checks);
    if (area) return area;
  }
  return null;
}

/**
 * Health rows (founder rules, 2026-07-02): the Evidence base row shows the COUNT of
 * finish-reviewed sources (never a checks fraction like "5/8", which reads as PDFs) and
 * only reads "Strong" when every source is finished and the capture checklist is done.
 * The other pillars use qualitative words, no fractions.
 */
function deriveHealthRows(checks: Record<MicroCheckId, boolean>, s: ReadinessSignals): ReadinessHealthRow[] {
  const qualitative = (label: string, ids: MicroCheckId[]): ReadinessHealthRow => {
    const done = ids.filter((id) => checks[id]).length;
    if (done === ids.length) return { label, value: "Strong", tone: "green" };
    if (done === 0) return { label, value: "Not started", tone: "purple" };
    return done / ids.length >= 0.5
      ? { label, value: "In progress", tone: "purple" }
      : { label, value: "Needs work", tone: "amber" };
  };

  const evidence: ReadinessHealthRow = (() => {
    const label = "Evidence base";
    if (s.sources.total === 0) return { label, value: "Not started", tone: "purple" as const };
    const finished = s.sources.finished ?? s.sources.insightSources;
    const captureDone = AREAS.evidence_base.requires.every((id) => checks[id]);
    if (finished >= s.sources.total && captureDone) return { label, value: "Strong", tone: "green" as const };
    if (finished === 0) return { label, value: "In progress", tone: "amber" as const };
    return { label, value: `${finished} finished`, tone: "purple" as const };
  })();

  return [
    qualitative("Plan & pathway", ["plan.title", "plan.target_date", "plan.pace", "plan.project_model", "topic.described", "pathway.recognized"]),
    evidence,
    qualitative("Claim support", [...AREAS.source_review.requires, ...AREAS.claim_support.requires]),
    qualitative("Synthesis & draft", [...AREAS.synthesis.requires, ...AREAS.paper_draft.requires]),
  ];
}

/** The pathway move adapts: "State your pathway" once the pathway home ships. */
function moveFor(id: MicroCheckId, s: ReadinessSignals): { move: string; surface: ReadinessSurface; why: string } {
  if (id === "pathway.recognized" && s.pathwayText !== null) {
    return { move: "State your pathway", surface: "workspace", why: PATHWAY_STATE_WHY };
  }
  return { move: CHECK_META[id].move, surface: CHECK_META[id].surface, why: CHECK_META[id].why };
}

export function computeResearchReadiness(signals: ReadinessSignals): ResearchReadiness {
  const checks = evaluateChecks(signals);
  const firstUnmetIn = (areaId: ReadinessStageId): MicroCheckId | null =>
    AREAS[areaId].requires.find((id) => !checks[id]) ?? null;

  const activeArea = resolveActiveArea(signals, checks);

  let stage: Area;
  let moveCheck: MicroCheckId | null = null;
  let reason: string;

  if (activeArea) {
    const unmet = firstUnmetIn(activeArea);
    if (unmet) {
      // Help them finish what they're doing — never nag about another area.
      stage = AREAS[activeArea];
      moveCheck = unmet;
      reason = `active:${unmet}`;
    } else {
      // Active area complete: keep the status they earned, bridge to the earliest gap.
      stage = AREAS[activeArea];
      const bridge = MAIN_LADDER.map(firstUnmetIn).find((id): id is MicroCheckId => id !== null) ?? null;
      if (bridge) {
        moveCheck = bridge;
        reason = `bridge:${bridge}`;
      } else {
        reason = "all_required_complete";
      }
    }
  } else {
    // Cold start / returner: the ladder — most foundational gap first. Meta never blocks.
    const fallbackArea = MAIN_LADDER.find((areaId) => firstUnmetIn(areaId) !== null);
    if (fallbackArea) {
      stage = AREAS[fallbackArea];
      moveCheck = firstUnmetIn(fallbackArea);
      reason = `ladder:${moveCheck}`;
    } else {
      stage = AREAS.final_review;
      reason = "all_required_complete";
    }
  }

  const selected = moveCheck ? moveFor(moveCheck, signals) : TERMINAL_MOVE;

  const laneActive = metaLaneActive(signals);
  const microChecks: MicroCheckResult[] = (Object.keys(CHECK_META) as MicroCheckId[])
    .filter((id) => laneActive || !id.startsWith("meta."))
    .map((id) => ({
      id,
      surface: CHECK_META[id].surface,
      label: CHECK_META[id].label,
      measurable: CHECK_META[id].measurable,
      done: CHECK_META[id].measurable ? checks[id] : false,
      sectionId: SURFACE_SECTION[CHECK_META[id].surface],
    }));

  return {
    microChecks,
    readinessStageId: stage.id,
    readinessSummary: selected.why,
    healthRows: deriveHealthRows(checks, signals),
    currentStatus: stage.currentStatus,
    nextBestMove: selected.move,
    nextMoveSurface: selected.surface,
    nextMoveSectionId: SURFACE_SECTION[selected.surface],
    reason,
  };
}
