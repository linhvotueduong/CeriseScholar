// Pure, deterministic helpers that turn the raw rows fetched by
// useResearchDeskData into the view-models the Research Desk cards render.
// Nothing here calls the network or an AI model — every value is derived
// directly from real rows so the page never shows fabricated numbers.

import type { AppIconName } from "@/components/app-shell/AppIcons";
import type { Project } from "@/types/project";
import { isMeaningfulLabel, isMeaningfulText } from "@/lib/dashboard/meaningfulWork";
import {
  computeAdjustedTargets,
  DEFAULT_PROJECT_SCOPE,
  DEFAULT_PROJECT_TYPE,
  PROJECT_TYPE_MODELS,
  type ProjectType,
  type ResearchCounts,
  type SectionScores,
} from "@/lib/dashboard/todayTargetModel";
import { computeSectionProgress } from "@/lib/dashboard/sectionProgress";
import type { BehaviorProfile } from "@/lib/dashboard/behaviorProfile";

export type ProjectTabId = "literature-review" | "meta-analysis" | "workspace" | "draft" | "citations";

export type PdfRow = {
  id: string;
  project_id: string;
  display_name: string;
  ocr_status: string | null;
  created_at: string;
  updated_at: string;
};

export type HighlightRow = { id: string; pdf_id: string; created_at: string };
export type AnnotationRow = { id: string; pdf_id: string; created_at: string };

export type LiteratureRow = {
  id: string;
  pdf_id: string | null;
  highlight_id: string | null;
  project_id: string | null;
  source: string;
  authors: string;
  year: string;
  theme_category: string;
  user_notes: string;
  code_name: string;
  apa_reference: string | null;
  synthesis_paragraph: string | null;
  date_added: string;
};

export type PaperSectionRow = {
  id: string;
  project_id: string;
  section_key: string;
  content: string;
  updated_at: string;
};

export type MetaAnalysisRow = {
  id: string;
  project_id: string;
  research_question: string;
  hypothesis: string;
  hypothesis_type: string | null;
  canvas_blocks: unknown[] | null;
  column_mapping: Record<string, unknown> | null;
  updated_at: string;
};

/** One row from `dashboard_project_settings` — just enough to pick the same
 * project-type-aware section weights/targets/caps the dashboard uses. Scope
 * (quality/complexity/expected sources) is intentionally NOT read here — it
 * only nudges numeric targets by a modest multiplier, so defaulting it keeps
 * this fetch minimal while project TYPE (which section is even relevant, e.g.
 * meta-analysis) still matches the dashboard exactly. */
export type ProjectSettingsRow = { project_id: string; project_type: string | null };

/** One row from `ai_behavior_insights` for "today" — the same cached Stage 2
 * guidance + Stage 1 profile snapshot the dashboard reads (migration 028). */
export type BehaviorInsightRow = {
  project_id: string | null;
  profile: BehaviorProfile;
  guidance: string | null;
  focus_section: string | null;
};

export type ActivityEventRow = {
  id: string;
  project_id: string;
  event_type: string;
  section_id: string;
  label: string;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Portfolio-wide stats (Overview/stats row)
// ---------------------------------------------------------------------------

export type PortfolioStat = {
  detail: string;
  icon: AppIconName;
  label: string;
  value: number;
};

export function buildPortfolioStats(data: {
  pdfs: PdfRow[];
  highlights: HighlightRow[];
  literatureEntries: LiteratureRow[];
  paperSections: PaperSectionRow[];
  metaAnalyses: MetaAnalysisRow[];
}): PortfolioStat[] {
  const sectionsWithContent = data.paperSections.filter((section) => section.content?.trim()).length;
  const metaWithQuestion = data.metaAnalyses.filter((meta) => meta.research_question?.trim()).length;

  return [
    {
      icon: "file",
      label: "Sources",
      value: data.pdfs.length,
      detail: data.pdfs.length ? "PDFs in your library" : "Upload your first source",
    },
    {
      icon: "list",
      label: "Highlights",
      value: data.highlights.length,
      detail: data.highlights.length ? "Passages you've marked" : "Highlight a passage to start",
    },
    {
      icon: "book",
      label: "Literature rows",
      value: data.literatureEntries.length,
      detail: data.literatureEntries.length ? "Extracted evidence rows" : "No rows added yet",
    },
    {
      icon: "edit",
      label: "Paper sections",
      value: sectionsWithContent,
      detail: sectionsWithContent ? "Sections with content" : "No sections drafted yet",
    },
    {
      icon: "workflow",
      label: "Meta-analyses",
      value: metaWithQuestion,
      detail: metaWithQuestion ? "With a research question set" : "No research question yet",
    },
  ];
}

// ---------------------------------------------------------------------------
// Per-project phase (drives the Projects card badge + progress bar)
// ---------------------------------------------------------------------------

export type ProjectPhase = {
  badgeClass: "warm" | "green" | "blue" | "neutral";
  label: string;
  progressPercent: number;
};

// Exported so other consumers of the same rows (e.g. assistantContext.ts's
// research-assistant snapshot builder) can scope to one project without
// duplicating this one-line filter.
export function scopedBy<T extends { project_id: string | null }>(rows: T[], projectId: string) {
  return rows.filter((row) => row.project_id === projectId);
}

export function computeProjectPhase(input: {
  pdfs: PdfRow[];
  literatureEntries: LiteratureRow[];
  metaAnalysis: MetaAnalysisRow | null;
  paperSections: PaperSectionRow[];
}): ProjectPhase {
  const hasSources = input.pdfs.length > 0;
  const hasLitRows = input.literatureEntries.length > 0;
  const hasQuestion = Boolean(input.metaAnalysis?.research_question?.trim());
  const hasDraftContent = input.paperSections.some((section) => section.content?.trim());

  const progressPercent =
    (hasSources ? 25 : 0) + (hasLitRows ? 25 : 0) + (hasQuestion ? 25 : 0) + (hasDraftContent ? 25 : 0);

  if (hasDraftContent) return { label: "Drafting", badgeClass: "blue", progressPercent };
  if (hasQuestion) return { label: "Meta-analysis", badgeClass: "green", progressPercent };
  if (hasLitRows) return { label: "Literature review", badgeClass: "warm", progressPercent };
  if (hasSources) return { label: "Getting started", badgeClass: "neutral", progressPercent };
  return { label: "No sources yet", badgeClass: "neutral", progressPercent };
}

// ---------------------------------------------------------------------------
// Section-progress engine parity (same engine the dashboard uses)
// ---------------------------------------------------------------------------
// The Project Overview card used to compute its own simpler per-tab progress
// rules. It now runs on the SAME capped section-progress model
// (src/lib/dashboard/sectionProgress.ts + todayTargetModel.ts) as the
// dashboard's Research Sections card / Today's Target, so one project shows
// one consistent story everywhere. The ResearchCounts assembly below
// intentionally mirrors (duplicates, not imports) the meaningful-work-gated
// counts block in deriveDashboardState.ts — that file also folds in
// dashboard-only concerns (task history, an AI quality evaluator) this pure
// portfolio-wide helper doesn't have inputs for; the gates themselves
// (isMeaningfulText/isMeaningfulLabel) ARE the shared, imported source of truth.

function nonEmpty(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isProjectType(value: unknown): value is ProjectType {
  return typeof value === "string" && value in PROJECT_TYPE_MODELS;
}

/** Real, meaningful-gated research counts for one project — feeds computeSectionProgress. */
export function computeResearchCountsForProject(
  projectId: string,
  data: {
    pdfs: PdfRow[];
    highlights: HighlightRow[];
    literatureEntries: LiteratureRow[];
    paperSections: PaperSectionRow[];
    metaAnalyses: MetaAnalysisRow[];
  }
): ResearchCounts {
  const pdfs = scopedBy(data.pdfs, projectId);
  const pdfIds = new Set(pdfs.map((pdf) => pdf.id));
  const highlights = data.highlights.filter((row) => pdfIds.has(row.pdf_id));
  const litRows = scopedBy(data.literatureEntries, projectId);
  const paperSections = scopedBy(data.paperSections, projectId);
  const meta = data.metaAnalyses.find((row) => row.project_id === projectId) ?? null;

  const sourceLinked = (row: LiteratureRow) => nonEmpty(row.pdf_id) || nonEmpty(row.highlight_id) || nonEmpty(row.source);
  const meaningfulNoteRows = litRows.filter((row) => sourceLinked(row) && isMeaningfulText(row.user_notes));
  const meaningfulSynthesisRows = litRows.filter((row) => isMeaningfulText(row.synthesis_paragraph));
  const meaningfulCodedRows = litRows.filter(
    (row) => isMeaningfulLabel(row.code_name) && isMeaningfulLabel(row.theme_category)
  );
  const evidenceFieldRows = litRows.filter(
    (row) =>
      isMeaningfulText(row.user_notes) ||
      isMeaningfulText(row.synthesis_paragraph) ||
      (isMeaningfulLabel(row.code_name) && isMeaningfulLabel(row.theme_category))
  );
  const themeCount = new Set(litRows.filter((row) => isMeaningfulLabel(row.theme_category)).map((row) => row.theme_category))
    .size;
  const referenceRows = litRows.filter((row) => isMeaningfulLabel(row.source) || nonEmpty(row.authors));
  const referencesWithMetadata = litRows.filter(
    (row) => nonEmpty(row.authors) && nonEmpty(row.year) && (isMeaningfulLabel(row.source) || nonEmpty(row.apa_reference))
  ).length;
  const engagedPdfIds = new Set(
    [...highlights.map((row) => row.pdf_id), ...meaningfulNoteRows.map((row) => row.pdf_id)].filter(Boolean)
  );
  const meaningfulNotes = meaningfulNoteRows.length;
  const rowsWithCitationLinks = litRows.filter((row) => nonEmpty(row.apa_reference) || nonEmpty(row.highlight_id)).length;
  const apaReady = litRows.filter((row) => nonEmpty(row.apa_reference)).length;
  const draftSections = paperSections.filter((section) => nonEmpty(section.content));
  const meaningfulDraftSections = paperSections.filter((section) => String(section.content ?? "").trim().length > 120);
  const mappingCount = Object.keys(meta?.column_mapping ?? {}).filter((key) =>
    nonEmpty((meta?.column_mapping as Record<string, unknown> | null)?.[key])
  ).length;
  const canvasCount = Array.isArray(meta?.canvas_blocks) ? meta!.canvas_blocks!.length : 0;

  return {
    uploadedSources: pdfs.length,
    engagedSources: engagedPdfIds.size,
    literatureRows: litRows.length,
    codedRows: meaningfulCodedRows.length,
    rowsWithNotes: meaningfulNotes,
    rowsWithEvidenceFields: evidenceFieldRows.length,
    rowsWithCitationLinks,
    synthesisUnits: meaningfulSynthesisRows.length,
    highlights: highlights.length,
    notes: meaningfulNotes,
    themeCount,
    outlineSections: paperSections.length,
    draftSections: draftSections.length,
    meaningfulLengthSections: meaningfulDraftSections.length,
    evidenceSupportedSections: meaningfulSynthesisRows.length > 0 ? meaningfulDraftSections.length : 0,
    citedSections: apaReady > 0 ? meaningfulDraftSections.length : 0,
    revisedSections: meaningfulDraftSections.length,
    referencesCount: referenceRows.length,
    citationsWithMetadata: referencesWithMetadata,
    apaReadyReferences: apaReady,
    referencesLinkedToRows: Math.min(referencesWithMetadata, meaningfulNoteRows.length + meaningfulSynthesisRows.length),
    duplicateIssues: 0,
    metaQuestionSet: nonEmpty(meta?.research_question),
    metaHypothesisSet: nonEmpty(meta?.hypothesis),
    metaTestSelected: nonEmpty(meta?.hypothesis_type),
    effectsMapped: mappingCount + canvasCount,
    forestPlotReady: canvasCount > 0,
  };
}

export type ProjectSectionEngine = {
  counts: ResearchCounts;
  metaRelevant: boolean;
  scores: SectionScores;
};

/**
 * The SAME section-progress engine the dashboard's Today's Target / Research
 * Sections card runs on, scoped to one project. `settings` (this project's
 * `dashboard_project_settings` row, if any) picks the real project-type
 * weights/targets; falling back to the same default the dashboard falls back
 * to when no settings row exists yet.
 */
export function computeProjectSectionEngine(
  projectId: string,
  data: {
    pdfs: PdfRow[];
    highlights: HighlightRow[];
    literatureEntries: LiteratureRow[];
    paperSections: PaperSectionRow[];
    metaAnalyses: MetaAnalysisRow[];
  },
  settings?: ProjectSettingsRow | null
): ProjectSectionEngine {
  const projectType: ProjectType = isProjectType(settings?.project_type)
    ? (settings!.project_type as ProjectType)
    : DEFAULT_PROJECT_TYPE;
  const weights = (PROJECT_TYPE_MODELS[projectType] ?? PROJECT_TYPE_MODELS[DEFAULT_PROJECT_TYPE]).weights;
  const metaRelevant = weights.metaAnalysis > 0;
  const targets = computeAdjustedTargets(projectType, DEFAULT_PROJECT_SCOPE);
  const counts = computeResearchCountsForProject(projectId, data);
  const scores = computeSectionProgress(counts, targets, { metaRelevant });
  return { counts, metaRelevant, scores };
}

// Honest, cap-tier-aware next-step copy — mirrors the SAME milestone ladder
// sectionProgress.ts uses to cap each section's score, so the copy a user
// reads always matches the % they see (never a step that's already done, never
// a step ahead of what's actually unlocked).
function literatureReviewNextStep(c: ResearchCounts): string {
  if (c.uploadedSources === 0) return "Upload your first source to start your literature review.";
  if (c.literatureRows === 0) return "Add your first literature review row from a highlighted PDF.";
  if (c.rowsWithNotes === 0 && c.rowsWithEvidenceFields === 0) return "Add synthesis notes or codes to your literature review rows.";
  if (c.codedRows === 0) return "Code your literature review rows by theme.";
  if (c.synthesisUnits === 0) return "Write a synthesis paragraph connecting your coded rows.";
  if (c.apaReadyReferences === 0) return "Add APA-ready references to your literature review rows.";
  return "Your literature review is synthesis- and citation-ready — keep refining.";
}

function workspaceNextStep(c: ResearchCounts): string {
  if (c.uploadedSources === 0) return "Upload your first source to start your workspace.";
  if (c.highlights === 0 && c.notes === 0) return "Highlight passages in your PDFs to start building evidence.";
  if (c.notes === 0) return "Add notes to your highlights.";
  if (c.codedRows === 0 && c.themeCount === 0) return "Code your notes into themes.";
  if (c.synthesisUnits === 0) return "Synthesize your coded evidence into a paragraph.";
  if (c.evidenceSupportedSections === 0) return "Use your synthesis in a paper draft section.";
  return "Your workspace evidence is coded and synthesized — keep organizing.";
}

function draftNextStep(c: ResearchCounts): string {
  if (c.outlineSections === 0 && c.draftSections === 0) return "Start your first paper section in the paper writer.";
  if (c.meaningfulLengthSections === 0) return "Write real content in your started section(s).";
  if (c.evidenceSupportedSections === 0) return "Support your draft paragraphs with synthesized evidence.";
  if (c.citedSections === 0) return "Add citations to your evidence-supported section(s).";
  return "Your draft sections are evidence-linked and cited — keep refining.";
}

function citationsNextStep(c: ResearchCounts): string {
  if (c.referencesCount === 0) return "Add literature review rows to start tracking citations.";
  if (c.citationsWithMetadata === 0) return "Add author and year metadata to your references.";
  if (c.apaReadyReferences === 0) return "Add full APA references for your sources.";
  if (c.referencesLinkedToRows === 0) return "Link your APA references to evidence rows.";
  if (c.citedSections === 0) return "Use your citation-ready references in the paper draft.";
  return "All literature rows have citation-ready references.";
}

function metaAnalysisNextStep(c: ResearchCounts, metaRelevant: boolean): string {
  if (!metaRelevant) return "Meta-analysis isn't part of this project's current plan.";
  if (!c.metaQuestionSet) return "Set your research question to start the meta-analysis.";
  if (!c.metaTestSelected) return "Select a hypothesis/test type for your research question.";
  if (c.effectsMapped === 0) return "Map your first effects/columns for the meta-analysis.";
  if (!c.forestPlotReady) return "Add plot blocks to prepare your forest plot.";
  return "Your meta-analysis is mapped and forest-plot-ready — keep reviewing.";
}

// ---------------------------------------------------------------------------
// Project Overview card (per project, per tab)
// ---------------------------------------------------------------------------

export type OverviewMetric = { icon: AppIconName; label: string; value: string };

export type ProjectOverview = {
  body: string;
  ctaHref: string;
  ctaLabel: string;
  metrics: OverviewMetric[];
  nextStep: string;
  phase: string;
  progress: number;
};

const TAB_BODY: Record<ProjectTabId, string> = {
  "literature-review":
    "Use Cerise Literature Review to extract themes, evidence rows, and source notes from included papers.",
  "meta-analysis":
    "Use Cerise Meta-analysis to define the question, select effects, map studies, and prepare forest-plot outputs.",
  workspace: "Use Cerise Workspace to keep project files, notes, PDFs, and local source context organized in one place.",
  draft: "Use Cerise Paper Writer to turn coded evidence into guided manuscript sections with APA-ready structure.",
  citations: "Use Cerise Citations to check references, citation coverage, and source-note readiness before writing.",
};

export function buildProjectOverviews(
  projectId: string,
  data: {
    pdfs: PdfRow[];
    highlights: HighlightRow[];
    annotations: AnnotationRow[];
    literatureEntries: LiteratureRow[];
    paperSections: PaperSectionRow[];
    metaAnalyses: MetaAnalysisRow[];
  },
  settings?: ProjectSettingsRow | null
): Record<ProjectTabId, ProjectOverview> {
  const pdfs = scopedBy(data.pdfs, projectId);
  const pdfIds = new Set(pdfs.map((pdf) => pdf.id));
  const highlights = data.highlights.filter((row) => pdfIds.has(row.pdf_id));
  const annotations = data.annotations.filter((row) => pdfIds.has(row.pdf_id));
  const litRows = scopedBy(data.literatureEntries, projectId);
  const paperSections = scopedBy(data.paperSections, projectId);
  const metaAnalysis = data.metaAnalyses.find((meta) => meta.project_id === projectId) ?? null;

  // Same section-progress engine the dashboard runs on (sectionProgress.ts +
  // todayTargetModel.ts) — drives every tab's `progress` % and `nextStep` text
  // below so the Project Overview card and the dashboard tell one consistent
  // story about this project.
  const engine = computeProjectSectionEngine(projectId, data, settings);
  const pct = (score: number) => Math.round(Math.max(0, Math.min(1, score)) * 100);

  const withNotes = litRows.filter((row) => row.user_notes?.trim()).length;
  const citationReady = litRows.filter((row) => row.apa_reference?.trim()).length;
  const needsCitationReview = litRows.length - citationReady;
  const distinctPapersReviewed = new Set(litRows.map((row) => row.pdf_id).filter(Boolean)).size;
  const sectionsWithContent = paperSections.filter((section) => section.content?.trim()).length;
  const ocrReady = pdfs.filter((pdf) => pdf.ocr_status === "completed").length;
  const canvasBlockCount = metaAnalysis?.canvas_blocks?.length ?? 0;
  const columnsMapped = Object.keys(metaAnalysis?.column_mapping ?? {}).length;

  const literatureReview: ProjectOverview = {
    body: TAB_BODY["literature-review"],
    ctaHref: `/dashboard/project/${projectId}/literature-review`,
    ctaLabel: "Open literature review →",
    metrics: [
      { icon: "file", label: "Papers reviewed", value: String(distinctPapersReviewed) },
      { icon: "list", label: "Evidence rows", value: String(litRows.length) },
      { icon: "clock", label: "With notes", value: String(withNotes) },
      { icon: "book", label: "Citation-ready", value: String(citationReady) },
    ],
    nextStep: literatureReviewNextStep(engine.counts),
    phase: "Literature Review",
    progress: pct(engine.scores.literatureReviewScore),
  };

  const metaAnalysisTab: ProjectOverview = {
    body: TAB_BODY["meta-analysis"],
    ctaHref: `/dashboard/project/${projectId}/meta-analysis`,
    ctaLabel: "Open meta-analysis →",
    metrics: [
      { icon: "target", label: "Question set", value: metaAnalysis?.research_question?.trim() ? "1" : "0" },
      { icon: "check-square", label: "Hypothesis set", value: metaAnalysis?.hypothesis?.trim() ? "1" : "0" },
      { icon: "workflow", label: "Plot blocks", value: String(canvasBlockCount) },
      { icon: "workflow", label: "Columns mapped", value: String(columnsMapped) },
    ],
    nextStep: metaAnalysisNextStep(engine.counts, engine.metaRelevant),
    phase: "Meta-analysis",
    progress: pct(engine.scores.metaAnalysisScore),
  };

  const workspace: ProjectOverview = {
    body: TAB_BODY.workspace,
    ctaHref: `/dashboard/project/${projectId}`,
    ctaLabel: "Open workspace →",
    metrics: [
      { icon: "file", label: "Sources", value: String(pdfs.length) },
      { icon: "list", label: "Highlights", value: String(highlights.length) },
      { icon: "folder", label: "Sticky notes", value: String(annotations.length) },
      { icon: "shield", label: "OCR-ready sources", value: String(ocrReady) },
    ],
    nextStep: workspaceNextStep(engine.counts),
    phase: "Workspace",
    progress: pct(engine.scores.workspaceSynthesisScore),
  };

  const draft: ProjectOverview = {
    body: TAB_BODY.draft,
    ctaHref: `/dashboard/project/${projectId}/paper-writer`,
    ctaLabel: "Open paper writer →",
    metrics: [
      { icon: "edit", label: "Sections with content", value: String(sectionsWithContent) },
      { icon: "list", label: "Sections started", value: String(paperSections.length) },
      { icon: "book-open", label: "Literature rows", value: String(litRows.length) },
      { icon: "clock", label: "Highlights", value: String(highlights.length) },
    ],
    nextStep: draftNextStep(engine.counts),
    phase: "Paper Draft",
    progress: pct(engine.scores.paperDraftScore),
  };

  const citations: ProjectOverview = {
    body: TAB_BODY.citations,
    ctaHref: `/dashboard/project/${projectId}/literature-review`,
    ctaLabel: "Review citations →",
    metrics: [
      { icon: "book", label: "Sources saved", value: String(pdfs.length) },
      { icon: "check-square", label: "Citation-ready", value: String(citationReady) },
      { icon: "alert", label: "Needs review", value: String(Math.max(needsCitationReview, 0)) },
      { icon: "upload", label: "Evidence rows", value: String(litRows.length) },
    ],
    nextStep: citationsNextStep(engine.counts),
    phase: "Citations",
    progress: pct(engine.scores.citationScore),
  };

  return {
    "literature-review": literatureReview,
    "meta-analysis": metaAnalysisTab,
    workspace,
    draft,
    citations,
  };
}

// ---------------------------------------------------------------------------
// Synthesis funnel card
// ---------------------------------------------------------------------------

export type FunnelData = {
  activeStage: "meta-analysis" | "draft" | null;
  blockerText: string;
  coded: number;
  loaded: number;
  nextMoveText: string;
  openRows: number;
  readyPercent: number;
};

export function buildFunnelData(
  projectId: string,
  data: {
    pdfs: PdfRow[];
    highlights: HighlightRow[];
    literatureEntries: LiteratureRow[];
    metaAnalyses: MetaAnalysisRow[];
    paperSections: PaperSectionRow[];
  },
  literatureNextStep: string
): FunnelData {
  const pdfs = scopedBy(data.pdfs, projectId);
  const pdfIds = new Set(pdfs.map((pdf) => pdf.id));
  const highlights = data.highlights.filter((row) => pdfIds.has(row.pdf_id));
  const litRows = scopedBy(data.literatureEntries, projectId);
  const metaAnalysis = data.metaAnalyses.find((meta) => meta.project_id === projectId) ?? null;
  const paperSections = scopedBy(data.paperSections, projectId);

  const loaded = pdfs.length;
  const coded = litRows.length;
  const openRows = Math.max(highlights.length - litRows.length, 0);
  const readyPercent = loaded === 0 ? 0 : Math.round((coded / loaded) * 100);

  const hasDraftContent = paperSections.some((section) => section.content?.trim());
  const activeStage: FunnelData["activeStage"] = hasDraftContent
    ? "draft"
    : metaAnalysis?.research_question?.trim()
      ? "meta-analysis"
      : null;

  const blockerText =
    loaded === 0
      ? "No sources uploaded yet."
      : coded === 0
        ? "No literature review rows yet."
        : openRows > 0
          ? `${openRows} highlight(s) not yet turned into review rows.`
          : "None — you're caught up.";

  return {
    activeStage,
    blockerText,
    coded,
    loaded,
    nextMoveText: literatureNextStep,
    openRows,
    readyPercent,
  };
}

// ---------------------------------------------------------------------------
// Next steps card
// ---------------------------------------------------------------------------

export type NextStep = { href?: string; id: string; title: string };

export function buildNextSteps(data: {
  highlights: HighlightRow[];
  literatureEntries: LiteratureRow[];
  metaAnalyses: MetaAnalysisRow[];
  paperSections: PaperSectionRow[];
  pdfs: PdfRow[];
}): NextStep[] {
  const steps: NextStep[] = [];
  const sectionsWithContent = data.paperSections.filter((section) => section.content?.trim()).length;
  const metaWithQuestion = data.metaAnalyses.filter((meta) => meta.research_question?.trim()).length;
  const missingCitations = data.literatureEntries.filter((row) => !row.apa_reference?.trim()).length;
  const unreviewedHighlights = Math.max(data.highlights.length - data.literatureEntries.length, 0);

  if (data.pdfs.length === 0) {
    steps.push({ id: "upload", title: "Upload your first source", href: "/dashboard/upload" });
  }
  if (data.pdfs.length > 0 && data.highlights.length === 0) {
    steps.push({ id: "highlight", title: "Highlight key passages in your sources" });
  }
  if (unreviewedHighlights > 0) {
    steps.push({
      id: "review-highlights",
      title: `Add notes to your ${unreviewedHighlights} unreviewed highlight(s)`,
    });
  }
  if (data.literatureEntries.length > 0 && sectionsWithContent === 0) {
    steps.push({ id: "start-synthesis", title: "Start synthesis: draft your first paper section" });
  }
  if (data.literatureEntries.length > 0 && metaWithQuestion === 0) {
    steps.push({ id: "meta-question", title: "Set a research question for your meta-analysis" });
  }
  if (missingCitations > 0) {
    steps.push({ id: "citations", title: `Add citations for ${missingCitations} literature row(s)` });
  }
  if (steps.length === 0) {
    steps.push({ id: "caught-up", title: "You're all caught up — nice work!" });
  }

  return steps.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Recent changes card
// ---------------------------------------------------------------------------

const EVENT_LABELS: Record<string, string> = {
  source_uploaded: "Uploaded a source",
  literature_row_saved: "Saved a literature review row",
  highlight_created: "Created a highlight",
  note_created: "Added a note",
  meta_analysis_updated: "Updated meta-analysis",
  paper_draft_saved: "Saved a paper draft section",
  dashboard_task_completed: "Completed a task",
  dashboard_schedule_updated: "Updated your schedule",
};

export function humanizeEventType(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType.replace(/_/g, " ");
}

export type RecentChange = { detail: string; id: string; time: string; title: string };

export function buildRecentChanges(events: ActivityEventRow[], projects: Project[]): RecentChange[] {
  const nameById = new Map(projects.map((project) => [project.id, project.name]));
  return events.slice(0, 8).map((event) => ({
    id: event.id,
    title: event.label?.trim() || humanizeEventType(event.event_type),
    detail: nameById.get(event.project_id) ?? "",
    time: formatRelativeTime(event.created_at),
  }));
}
