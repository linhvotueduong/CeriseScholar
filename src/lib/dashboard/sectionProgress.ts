import type { ResearchCounts, SectionScores, SectionTargets } from "@/lib/dashboard/todayTargetModel";

/**
 * Research Sections progress — research-quality measurement, not activity counting.
 *
 *   sectionProgress = min(deterministicCoverage, milestoneCap) * aiQualityMultiplier
 *
 * The `counts` passed in are already MEANINGFUL-gated upstream (placeholder/test text
 * and unlinked notes are filtered out; unread uploads are intake-only). On top of that:
 *   - COVERAGE measures useful work vs the project's expected deliverable.
 *   - MILESTONE CAPS keep a section low until the harder deliverable work exists.
 *   - the AI QUALITY layer (optional, bounded) may LOWER shallow work; it never invents
 *     progress or raises empty/test work.
 *
 * Scores are 0..1; the card shows them as 0-100% and they feed the 1000-point model.
 */

/**
 * Structured AI quality signals (the evaluator returns these, NOT raw percentages).
 * All optional — the deterministic model is complete without them.
 */
export type AiQualitySignals = {
  isPlaceholder?: boolean;
  sourceGrounded?: number; // 0..1
  noteMeaningfulness?: number;
  evidenceSpecificity?: number;
  codeUsefulness?: number;
  synthesisReadiness?: number;
  citationReadiness?: number;
  confidence?: number;
  reasons?: string[];
};

export type SectionProgressOptions = {
  metaRelevant: boolean;
  signals?: AiQualitySignals;
};

/** AI may reduce a section by at most (1 - AI_QUALITY_FLOOR); it can never raise it. */
const AI_QUALITY_FLOOR = 0.4;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function cover(count: number, denominator: number): number {
  return clamp01(count / Math.max(denominator, 1));
}

/** AI quality multiplier for a section (bounded). Placeholder work caps at the floor. */
function aiMultiplier(signals: AiQualitySignals | undefined, relevant: number | undefined): number {
  if (!signals) return 1;
  if (signals.isPlaceholder) return AI_QUALITY_FLOOR;
  return relevant == null ? 1 : Math.max(AI_QUALITY_FLOOR, Math.min(1, relevant));
}

/** Layers -> final section score: min(coverage, milestone cap) then AI multiplier. */
function combine(rawCoverage: number, milestoneCap: number, multiplier: number): number {
  return clamp01(Math.min(clamp01(rawCoverage), clamp01(milestoneCap)) * multiplier);
}

// --- Literature Review -------------------------------------------------------

function literatureReview(c: ResearchCounts, t: SectionTargets, s?: AiQualitySignals): number {
  const rawCoverage =
    0.05 * cover(c.uploadedSources, t.sourcesTarget) + // intake only
    0.2 * cover(c.literatureRows, t.literatureRowsTarget) +
    0.2 * cover(c.rowsWithNotes, t.literatureRowsTarget) + // meaningful notes
    0.15 * cover(c.rowsWithEvidenceFields, t.literatureRowsTarget) +
    0.15 * cover(c.codedRows, t.literatureRowsTarget) +
    0.2 * cover(c.synthesisUnits, t.synthesisUnitsTarget) +
    0.05 * cover(c.rowsWithCitationLinks, t.literatureRowsTarget);

  let cap = 1;
  if (c.uploadedSources === 0) cap = 0;
  else if (c.literatureRows === 0) cap = 0.05; // sources only
  else if (c.rowsWithNotes === 0 && c.rowsWithEvidenceFields === 0) cap = 0.15; // rows without meaningful notes
  else if (c.codedRows === 0) cap = 0.3; // evidence fields but not coded
  else if (c.synthesisUnits === 0) cap = 0.5; // coded across themes but no synthesis
  else if (c.apaReadyReferences === 0) cap = 0.75; // synthesis but not review/citation-ready

  return combine(rawCoverage, cap, aiMultiplier(s, s?.evidenceSpecificity ?? s?.noteMeaningfulness));
}

// --- Workspace / Synthesis ---------------------------------------------------

function workspaceSynthesis(c: ResearchCounts, t: SectionTargets, s?: AiQualitySignals): number {
  const rawCoverage =
    0.05 * cover(c.uploadedSources, t.sourcesTarget) + // intake only
    0.1 * cover(c.highlights, Math.max(t.sourcesTarget * 2, 1)) +
    0.25 * cover(c.notes, t.notesTarget) + // meaningful notes
    0.25 * cover(c.codedRows, Math.max(Math.round(t.literatureRowsTarget * 0.4), 1)) +
    0.3 * cover(c.synthesisUnits, t.synthesisUnitsTarget) +
    0.05 * cover(c.themeCount, Math.max(Math.ceil(t.sourcesTarget / 5), 1));

  let cap = 1;
  if (c.uploadedSources === 0) cap = 0;
  else if (c.highlights === 0 && c.notes === 0) cap = 0.05; // uploaded only
  else if (c.notes === 0) cap = 0.15; // highlights only
  else if (c.codedRows === 0 && c.themeCount === 0) cap = 0.25; // notes but no codes/themes
  else if (c.synthesisUnits === 0) cap = 0.4; // codes/themes but no synthesis
  else if (c.evidenceSupportedSections === 0) cap = 0.7; // synthesis but not used downstream

  return combine(rawCoverage, cap, aiMultiplier(s, s?.noteMeaningfulness));
}

// --- Paper Draft -------------------------------------------------------------

function paperDraft(c: ResearchCounts, t: SectionTargets, s?: AiQualitySignals): number {
  const rawCoverage =
    0.1 * cover(c.outlineSections, t.draftSectionsTarget) +
    0.25 * cover(c.draftSections, t.draftSectionsTarget) +
    0.15 * cover(c.meaningfulLengthSections, t.draftSectionsTarget) +
    0.25 * cover(c.evidenceSupportedSections, t.draftSectionsTarget) +
    0.15 * cover(c.citedSections, t.draftSectionsTarget) +
    0.1 * cover(c.revisedSections, t.draftSectionsTarget);

  let cap = 1;
  if (c.outlineSections === 0 && c.draftSections === 0) cap = 0; // no real text
  else if (c.meaningfulLengthSections === 0) cap = 0.15; // outline only
  else if (c.evidenceSupportedSections === 0) cap = 0.3; // paragraphs without evidence
  else if (c.citedSections === 0) cap = 0.7; // evidence-linked but not citation-supported

  return combine(rawCoverage, cap, aiMultiplier(s, s?.synthesisReadiness));
}

// --- Citations / References --------------------------------------------------
// Literature rows are NOT completed citations: real readiness needs metadata,
// APA/reference readiness, and links to evidence/draft claims.

function citations(c: ResearchCounts, t: SectionTargets, s?: AiQualitySignals): number {
  const duplicateCleanup =
    c.referencesCount > 0 ? clamp01(1 - c.duplicateIssues / Math.max(c.referencesCount, 1)) : 0;
  const rawCoverage =
    0.1 * cover(c.referencesCount, t.citationsTarget) +
    0.3 * cover(c.citationsWithMetadata, t.citationsTarget) +
    0.3 * cover(c.apaReadyReferences, t.citationsTarget) +
    0.25 * cover(c.referencesLinkedToRows, t.citationsTarget) +
    0.05 * duplicateCleanup;

  let cap = 1;
  if (c.referencesCount === 0) cap = 0; // no metadata
  else if (c.citationsWithMetadata === 0) cap = 0.05; // title/source only
  else if (c.apaReadyReferences === 0) cap = 0.35; // author/year/title but not APA-ready
  else if (c.referencesLinkedToRows === 0) cap = 0.6; // APA but not linked to evidence
  else if (c.citedSections === 0) cap = 0.75; // linked but not used in draft

  return combine(rawCoverage, cap, aiMultiplier(s, s?.citationReadiness));
}

// --- Meta-analysis / Analysis ------------------------------------------------

function metaAnalysis(c: ResearchCounts, t: SectionTargets, metaRelevant: boolean): number {
  if (!metaRelevant) return 0;
  const rawCoverage =
    0.15 * (c.metaQuestionSet ? 1 : 0) +
    0.15 * (c.metaHypothesisSet ? 1 : 0) +
    0.2 * (c.metaTestSelected ? 1 : 0) +
    0.3 * cover(c.effectsMapped, t.metaItemsTarget) +
    0.2 * (c.forestPlotReady ? 1 : 0);

  let cap = 1;
  if (!c.metaQuestionSet) cap = 0.15;
  else if (!c.metaTestSelected) cap = 0.4;
  else if (c.effectsMapped === 0) cap = 0.55;
  else if (!c.forestPlotReady) cap = 0.8;

  return combine(rawCoverage, cap, 1);
}

/** Compute all five section scores (0..1) via the four-layer model. */
export function computeSectionProgress(
  counts: ResearchCounts,
  targets: SectionTargets,
  opts: SectionProgressOptions
): SectionScores {
  const s = opts.signals;
  return {
    literatureReviewScore: literatureReview(counts, targets, s),
    workspaceSynthesisScore: workspaceSynthesis(counts, targets, s),
    paperDraftScore: paperDraft(counts, targets, s),
    citationScore: citations(counts, targets, s),
    metaAnalysisScore: metaAnalysis(counts, targets, opts.metaRelevant),
  };
}
