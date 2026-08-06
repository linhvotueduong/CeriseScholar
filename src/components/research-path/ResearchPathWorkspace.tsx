"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import { createClient } from "@/lib/supabase/client";
import {
  RESEARCH_PATH_STAGES,
  RESEARCH_PATH_STEPS,
  type ResearchPathStage,
  type ResearchPathStep,
} from "@/lib/research/researchPathConfig";
import {
  EMPTY_RESEARCH_PATH_DRAFT,
  readStepDraft,
  type ResearchPathDraft,
  type StepDraft,
} from "@/lib/research/researchPathDraft";
import {
  readResearchPathStoredDocument,
  researchPathStorageKey,
  writeResearchPathStoredDocument,
} from "@/lib/research/researchPathStorage";
import {
  RESEARCH_PATHWAY_CACHE_VERSION,
  readResearchPathwayCache,
  writeResearchPathwayCache,
} from "@/lib/research/researchPathwayCache";
import {
  createResearchPathwayDocument,
  rebaseResearchPathwayDocument,
  researchPathwayDocumentToDraft,
  researchPathwayDocumentsHaveSameContent,
  type LegacyProjectPathwayFields,
  type ResearchPathwayDocument,
} from "@/lib/research/researchPathwayDocument";
import {
  fetchResearchPathwayCloudState,
  saveResearchPathwayDocument,
} from "@/lib/research/researchPathwayPersistence";
import {
  reconcileResearchPathwaySources,
  type ResearchPathwayReconciliation,
} from "@/lib/research/researchPathwayReconciliation";
import {
  assessResearchPathwayReadiness,
} from "@/lib/research/researchPathwayBrief";
import type { ResearchStageNumber } from "@/lib/research/researchArtifactRegistry";
import { notifyMentorContextChanged } from "@/lib/research/mentorContextEnvelope";
import type { ResearchSupportBreakpoint, ResearchSupportBreakpointKind } from "@/lib/research/researchSupportOpportunity";
import { RESEARCH_MENTOR_MODES, type ResearchMentorMode } from "@/lib/research/researchMentor";
import {
  canCompleteStudyStep,
  createStudyDesignDocument,
  type StudyDesignDocument,
} from "@/lib/research/studyDesign";
import { fetchStudyDesign, upsertStudyDesign } from "@/lib/research/studyDesignPersistence";
import { readProposalHandoffCache } from "@/lib/research/proposalHandoffCache";
import type { ProposalHandoffPackage } from "@/lib/research/proposalHandoffPhase7";
import { readProposalReviewCache } from "@/lib/research/proposalReviewCache";
import type { ReviewedProposalBaselinePackage } from "@/lib/research/proposalReviewPhase9";
import { readResearchProposalCache } from "@/lib/research/researchProposalCache";
import { readProjectEvidenceAssessmentCache } from "@/lib/research/projectEvidenceAssessmentCache";
import styles from "./ResearchPathWorkspace.module.css";

const Stage2ProposalStudio = dynamic(
  () => import("./Stage2ProposalStudio"),
  { loading: () => <ToolLoading label="Research Proposal" />, ssr: false },
);
const Stage3StudyPlanner = dynamic(
  () => import("./Stage3StudyPlanner"),
  { loading: () => <ToolLoading label="Study Design" />, ssr: false },
);
const ExperimentStudioLauncher = dynamic(
  () => import("./ExperimentStudioLauncher"),
  { loading: () => <ToolLoading label="Experimental Studio" />, ssr: false },
);
const ConsentWorkspace = dynamic(
  () => import("./ConsentWorkspace"),
  { loading: () => <ToolLoading label="Consent and Participant Rights" />, ssr: false },
);
const ResearchMentorPanel = dynamic(
  () => import("./ResearchMentorPanel"),
  { ssr: false },
);
const AnalysisPlanLauncher = dynamic(
  () => import("./AnalysisPlanLauncher"),
  { loading: () => <ToolLoading label="Analysis Plan" />, ssr: false },
);
const DataIntakeAuditLauncher = dynamic(
  () => import("./DataIntakeAuditLauncher"),
  { loading: () => <ToolLoading label="Data Intake & Audit" />, ssr: false },
);
const DataPreparationLauncher = dynamic(
  () => import("./DataPreparationLauncher"),
  { loading: () => <ToolLoading label="Reproducible Preparation" />, ssr: false },
);
const DataQualityReviewLauncher = dynamic(
  () => import("./DataQualityReviewLauncher"),
  { loading: () => <ToolLoading label="Data-Quality Review" />, ssr: false },
);
const AnalysisExecutionLauncher = dynamic(
  () => import("./AnalysisExecutionLauncher"),
  { loading: () => <ToolLoading label="Analysis Execution" />, ssr: false },
);
const AnalysisRobustnessLauncher = dynamic(
  () => import("./AnalysisRobustnessLauncher"),
  { loading: () => <ToolLoading label="Robustness and Sensitivity" />, ssr: false },
);
const AnalysisResultsLauncher = dynamic(
  () => import("./AnalysisResultsLauncher"),
  { loading: () => <ToolLoading label="Results and Interpretation" />, ssr: false },
);
const AnalysisReviewerLauncher = dynamic(
  () => import("./AnalysisReviewerLauncher"),
  { loading: () => <ToolLoading label="AI Analysis Reviewer" />, ssr: false },
);
const QualitativeAnalysisLauncher = dynamic(
  () => import("./QualitativeAnalysisLauncher"),
  { loading: () => <ToolLoading label="Qualitative & Mixed-Methods Analysis" />, ssr: false },
);
const ReproducibilityPackageLauncher = dynamic(
  () => import("./ReproducibilityPackageLauncher"),
  { loading: () => <ToolLoading label="Reproducibility Package" />, ssr: false },
);
const Stage1ResearchFramingStudio = dynamic(
  () => import("./Stage1ResearchFramingStudio"),
  { loading: () => <ToolLoading label="Research Framing Studio" />, ssr: false },
);

interface ResearchPathWorkspaceProps {
  projectId: string;
  projectName: string;
}

const PROBLEM_ROWS = Array.from({ length: 6 }, (_, index) => index);
const RAW_QUESTION_ROWS = Array.from({ length: 7 }, (_, index) => index);
const KEY_QUESTION_ROWS = Array.from({ length: 4 }, (_, index) => index);

function ToolLoading({ label }: { label: string }) {
  return (
    <div className={styles.toolLoading} role="status">
      <span />
      Loading {label}…
    </div>
  );
}

function stageCompletion(
  stage: ResearchPathStage,
  draft: ResearchPathDraft,
  pathway: ResearchPathwayDocument | null,
  proposalReadiness: Readonly<Record<string, boolean>>,
) {
  const readiness = stage.id === "stage-01" && pathway ? assessResearchPathwayReadiness(pathway) : null;
  const complete = stage.steps.filter((step) => (
    readiness?.steps.find((item) => item.stepId === step.id)?.status === "ready"
    || (stage.id === "stage-02" && proposalReadiness[step.id] === true)
    || (!readiness && stage.id !== "stage-02" && readStepDraft(draft, step.id).completed)
  )).length;
  return { complete, total: stage.steps.length };
}

function ProblemCanvas({
  stepDraft,
  updateField,
}: {
  stepDraft: StepDraft;
  updateField: (key: string, value: string) => void;
}) {
  return (
    <div className={styles.problemCanvas}>
      <div className={styles.tableScroller}>
        <table className={styles.problemTable}>
          <thead>
            <tr>
              <th>Situation</th>
              <th>Consequences</th>
              <th>Recommended response</th>
            </tr>
          </thead>
          <tbody>
            {PROBLEM_ROWS.map((row) => (
              <tr key={row}>
                {(["situation", "consequence", "response"] as const).map((column) => {
                  const key = `problem-${row}-${column}`;
                  return (
                    <td key={column}>
                      <textarea
                        aria-label={`${column} row ${row + 1}`}
                        onChange={(event) => updateField(key, event.target.value)}
                        placeholder={row === 0 ? "Add a concise observation…" : ""}
                        rows={2}
                        value={stepDraft.fields[key] ?? ""}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label className={styles.outputField}>
        <span>Identified problem</span>
        <textarea
          onChange={(event) => updateField("identified-problem", event.target.value)}
          placeholder="Synthesize the pattern above into one clear problem statement."
          rows={3}
          value={stepDraft.fields["identified-problem"] ?? ""}
        />
      </label>
    </div>
  );
}

const BASELINE_TOOLS = [
  {
    id: "scholarask",
    label: "ScholarAsk",
    title: "Discover and interrogate the literature",
    description: "Search real academic sources, test the problem against published evidence, and save the strongest papers.",
    cta: "Open ScholarAsk",
  },
  {
    id: "workspace",
    label: "Workspace",
    title: "Read, highlight, and code source material",
    description: "Upload or open a paper, capture excerpts, and organize observations around the needs and gaps you are finding.",
    cta: "Open document workspace",
  },
  {
    id: "evidence",
    label: "Evidence Library",
    title: "Review the evidence you have saved",
    description: "Compare saved ScholarAsk articles and decide which sources truly support the emerging baseline.",
    cta: "Open Evidence Library",
  },
] as const;

function BaselineCanvas({
  projectId,
  stepDraft,
  updateField,
}: {
  projectId: string;
  stepDraft: StepDraft;
  updateField: (key: string, value: string) => void;
}) {
  const [activeTool, setActiveTool] = useState<(typeof BASELINE_TOOLS)[number]["id"]>("scholarask");
  const tool = BASELINE_TOOLS.find((item) => item.id === activeTool) ?? BASELINE_TOOLS[0];
  const href =
    tool.id === "scholarask"
      ? `/dashboard/project/${projectId}/scholar-ask`
      : tool.id === "workspace"
        ? `/dashboard/upload?project=${projectId}`
        : "/evidence-library";

  return (
    <div className={styles.baselineCanvas}>
      <div className={styles.toolTabs} role="tablist" aria-label="Baseline research tools">
        {BASELINE_TOOLS.map((item) => (
          <button
            aria-selected={item.id === activeTool}
            className={item.id === activeTool ? styles.toolTabActive : styles.toolTab}
            key={item.id}
            onClick={() => setActiveTool(item.id)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className={styles.toolPreview}>
        <div className={styles.toolPreviewCopy}>
          <p className={styles.eyebrow}>{tool.label}</p>
          <h3>{tool.title}</h3>
          <p>{tool.description}</p>
          <Link className={styles.darkButton} href={href}>
            {tool.cta}
            <AppIcon name="arrow-up-right" />
          </Link>
        </div>
        <div className={styles.toolPreviewNotes}>
          <label>
            Needs found
            <textarea
              onChange={(event) => updateField(`${tool.id}-needs`, event.target.value)}
              placeholder="What do people, systems, or the field need?"
              rows={4}
              value={stepDraft.fields[`${tool.id}-needs`] ?? ""}
            />
          </label>
          <label>
            Evidence gaps
            <textarea
              onChange={(event) => updateField(`${tool.id}-gaps`, event.target.value)}
              placeholder="What is missing, uncertain, contradictory, or weakly supported?"
              rows={4}
              value={stepDraft.fields[`${tool.id}-gaps`] ?? ""}
            />
          </label>
        </div>
      </section>

      <label className={styles.outputField}>
        <span>Baseline synthesis</span>
        <textarea
          onChange={(event) => updateField("baseline-synthesis", event.target.value)}
          placeholder="Summarize the current situation, established evidence, needs, and most important gap."
          rows={4}
          value={stepDraft.fields["baseline-synthesis"] ?? ""}
        />
      </label>
    </div>
  );
}

function QuestionsCanvas({
  stepDraft,
  updateField,
}: {
  stepDraft: StepDraft;
  updateField: (key: string, value: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"key" | "raw">("raw");
  return (
    <div className={styles.questionsCanvas}>
      <div className={styles.toolTabs} role="tablist" aria-label="Research question development">
        <button
          aria-selected={activeTab === "raw"}
          className={activeTab === "raw" ? styles.toolTabActive : styles.toolTab}
          onClick={() => setActiveTab("raw")}
          role="tab"
          type="button"
        >
          Raw Questions
        </button>
        <button
          aria-selected={activeTab === "key"}
          className={activeTab === "key" ? styles.toolTabActive : styles.toolTab}
          onClick={() => setActiveTab("key")}
          role="tab"
          type="button"
        >
          Key Questions
        </button>
      </div>

      {activeTab === "raw" ? (
        <div className={styles.linedSheet}>
          <h3>Raw questions</h3>
          {RAW_QUESTION_ROWS.map((row) => (
            <input
              aria-label={`Raw research question ${row + 1}`}
              key={row}
              onChange={(event) => updateField(`raw-question-${row}`, event.target.value)}
              placeholder={row === 0 ? "Write freely—refinement comes next…" : ""}
              value={stepDraft.fields[`raw-question-${row}`] ?? ""}
            />
          ))}
        </div>
      ) : (
        <div className={styles.keyQuestionTable}>
          <div className={styles.keyQuestionHeader}>Key Questions</div>
          {KEY_QUESTION_ROWS.map((row) => (
            <label key={row}>
              <span>RQ{row + 1}</span>
              <textarea
                aria-label={`Key research question ${row + 1}`}
                onChange={(event) => updateField(`key-question-${row}`, event.target.value)}
                placeholder={row === 0 ? "Refine a question that directly addresses the identified need or gap." : ""}
                rows={2}
                value={stepDraft.fields[`key-question-${row}`] ?? ""}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const BACKCASTING_FIELDS = [
  ["vision", "Vision definition", "What does a successful future state look like?"],
  ["baseline", "Baseline description", "What conditions, constraints, and gaps define the current state?"],
  ["concepts", "Concept generation", "What possible interventions or research directions could bridge the gap?"],
  ["roadmap", "Roadmap definition", "Which path should be pursued, in what order, and why?"],
] as const;

function BackcastingCanvas({
  stepDraft,
  updateField,
}: {
  stepDraft: StepDraft;
  updateField: (key: string, value: string) => void;
}) {
  return (
    <div className={styles.backcastingCanvas}>
      <div className={styles.backcastingGrid}>
        {BACKCASTING_FIELDS.map(([key, label, placeholder]) => (
          <label key={key}>
            <span>{label}</span>
            <textarea
              onChange={(event) => updateField(`backcasting-${key}`, event.target.value)}
              placeholder={placeholder}
              rows={6}
              value={stepDraft.fields[`backcasting-${key}`] ?? ""}
            />
          </label>
        ))}
      </div>
      <div className={styles.backcastingFlow} aria-label="Backcasting sequence">
        <span>Vision</span>
        <AppIcon name="arrow-right" />
        <span>Baseline</span>
        <AppIcon name="arrow-right" />
        <span>Concepts</span>
        <AppIcon name="arrow-right" />
        <strong>Research roadmap</strong>
      </div>
    </div>
  );
}

function GuidedCanvas({
  step,
  stepDraft,
  updateCheck,
  updateField,
}: {
  step: ResearchPathStep;
  stepDraft: StepDraft;
  updateCheck: (key: string, value: boolean) => void;
  updateField: (key: string, value: string) => void;
}) {
  return (
    <div className={styles.guidedCanvas}>
      <div className={styles.guidedFields}>
        {step.prompts.map((prompt, index) => (
          <label key={prompt}>
            <span>{prompt}</span>
            <textarea
              onChange={(event) => updateField(`prompt-${index}`, event.target.value)}
              placeholder="Record the current decision, supporting evidence, and rationale…"
              rows={7}
              value={stepDraft.fields[`prompt-${index}`] ?? ""}
            />
          </label>
        ))}
      </div>
      <fieldset className={styles.checklist}>
        <legend>Completion check</legend>
        {step.checklist.map((item, index) => (
          <label key={item}>
            <input
              checked={Boolean(stepDraft.checks[`check-${index}`])}
              onChange={(event) => updateCheck(`check-${index}`, event.target.checked)}
              type="checkbox"
            />
            <span>{item}</span>
          </label>
        ))}
      </fieldset>
      <label className={styles.outputField}>
        <span>Decision and handoff notes</span>
        <textarea
          onChange={(event) => updateField("handoff-notes", event.target.value)}
          placeholder="Capture unresolved questions, dependencies, and what the next step needs to know."
          rows={4}
          value={stepDraft.fields["handoff-notes"] ?? ""}
        />
      </label>
    </div>
  );
}

export default function ResearchPathWorkspace({ projectId, projectName }: ResearchPathWorkspaceProps) {
  const [activeStageId, setActiveStageId] = useState(RESEARCH_PATH_STAGES[0].id);
  const [activeStepId, setActiveStepId] = useState(RESEARCH_PATH_STAGES[0].steps[0].id);
  const [draft, setDraft] = useState<ResearchPathDraft>(EMPTY_RESEARCH_PATH_DRAFT);
  const [studyDesign, setStudyDesign] = useState<StudyDesignDocument>(() => (
    createStudyDesignDocument(projectId, EMPTY_RESEARCH_PATH_DRAFT)
  ));
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState("Loading draft…");
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [pathwayReady, setPathwayReady] = useState(false);
  const [pathwayViewDocument, setPathwayViewDocument] = useState<ResearchPathwayDocument | null>(null);
  const [pathwayPreviousDocument, setPathwayPreviousDocument] = useState<ResearchPathwayDocument | null>(null);
  const [pathwayConflict, setPathwayConflict] = useState<ResearchPathwayReconciliation | null>(null);
  const [proposalStepReadiness, setProposalStepReadiness] = useState<Record<string, boolean>>({});
  const [proposalHandoff, setProposalHandoff] = useState<ProposalHandoffPackage | null>(null);
  const [reviewedProposalBaseline, setReviewedProposalBaseline] = useState<ReviewedProposalBaselinePackage | null>(null);
  const [proposalSourceChecksum, setProposalSourceChecksum] = useState<string | null>(null);
  const [evidenceSourceKeys, setEvidenceSourceKeys] = useState<string[]>([]);
  const [handoffSourcesLoaded, setHandoffSourcesLoaded] = useState(false);
  const [experimentStudioReady, setExperimentStudioReady] = useState(false);
  const [consentReady, setConsentReady] = useState(false);
  const [analysisPlanReady, setAnalysisPlanReady] = useState(false);
  const [dataIntakeReady, setDataIntakeReady] = useState(false);
  const [dataPreparationReady, setDataPreparationReady] = useState(false);
  const [dataQualityReviewReady, setDataQualityReviewReady] = useState(false);
  const [analysisExecutionReady, setAnalysisExecutionReady] = useState(false);
  const [analysisRobustnessReady, setAnalysisRobustnessReady] = useState(false);
  const [analysisResultsReady, setAnalysisResultsReady] = useState(false);
  const [analysisReviewerReady, setAnalysisReviewerReady] = useState(false);
  const [qualitativeAnalysisReady, setQualitativeAnalysisReady] = useState(false);
  const [reproducibilityPackageReady, setReproducibilityPackageReady] = useState(false);
  const [researchMentorOpen, setResearchMentorOpen] = useState(false);
  const [mentorLaunchRequest, setMentorLaunchRequest] = useState<{ id: string; mode: ResearchMentorMode } | null>(null);
  const [stage1EditSession, setStage1EditSession] = useState(() => ({ count: 0, lastEditedAt: Date.now() }));
  const [researchSupportBreakpoint, setResearchSupportBreakpoint] = useState<ResearchSupportBreakpoint>(() => ({
    sequence: 1,
    kind: "project-return",
    stepId: RESEARCH_PATH_STAGES[0].steps[0].id,
    at: Date.now(),
  }));
  const saveTimer = useRef<number | null>(null);
  const cloudSaveTimer = useRef<number | null>(null);
  const pathwaySaveTimer = useRef<number | null>(null);
  const pathwayDocument = useRef<ResearchPathwayDocument | null>(null);
  const pathwayExpectedCloudChecksum = useRef<ResearchPathwayDocument["identity"]["checksum"] | null>(null);
  const pathwayCloudAvailable = useRef(true);
  const pathwayConflictRef = useRef<ResearchPathwayReconciliation | null>(null);
  const pathwaySaveQueue = useRef<Promise<void>>(Promise.resolve());
  const pathwayDraftGeneration = useRef(0);
  const studyDirty = useRef(false);

  useEffect(() => {
    setProposalStepReadiness((current) => current["stage-02-confirm-brief"] === false
      ? current
      : { ...current, "stage-02-confirm-brief": false });
  }, [pathwayViewDocument?.identity.checksum]);

  useEffect(() => {
    let cancelled = false;
    setHandoffSourcesLoaded(false);
    void Promise.all([
      readProposalHandoffCache(window.localStorage, projectId),
      readProposalReviewCache(window.localStorage, projectId),
      readResearchProposalCache(window.localStorage, projectId),
      readProjectEvidenceAssessmentCache(window.localStorage, projectId),
    ]).then(([handoffCache, reviewCache, proposalCache, evidenceCache]) => {
      if (cancelled) return;
      setProposalHandoff(handoffCache?.package ?? null);
      setReviewedProposalBaseline(reviewCache?.baseline ?? null);
      setProposalSourceChecksum(proposalCache?.document.identity.checksum ?? null);
      setEvidenceSourceKeys((evidenceCache?.entries ?? []).map((entry) => `${entry.assessment.assessmentId}:${entry.assessment.identity.checksum}:${entry.assessment.identity.sourceFingerprint.sources[0]?.checksum ?? "missing-source"}`).sort());
      setHandoffSourcesLoaded(true);
    });
    return () => { cancelled = true; };
  }, [activeStageId, activeStepId, projectId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mentor") !== "journey") return;
    const requestedMode = params.get("mentorMode");
    const mode = RESEARCH_MENTOR_MODES.includes(requestedMode as ResearchMentorMode)
      ? requestedMode as ResearchMentorMode
      : "reflect";
    setActiveStageId("stage-01");
    setActiveStepId("stage-01-capture-concern");
    setMentorLaunchRequest({ id: `${window.location.pathname}${window.location.search}`, mode });
  }, []);

  const activeStage = useMemo(
    () => RESEARCH_PATH_STAGES.find((stage) => stage.id === activeStageId) ?? RESEARCH_PATH_STAGES[0],
    [activeStageId],
  );
  const activeStep = useMemo(
    () => activeStage.steps.find((step) => step.id === activeStepId) ?? activeStage.steps[0],
    [activeStage, activeStepId],
  );
  const activeDraft = readStepDraft(draft, activeStep.id);
  const pathwayReadiness = useMemo(
    () => pathwayViewDocument ? assessResearchPathwayReadiness(pathwayViewDocument) : null,
    [pathwayViewDocument],
  );
  const activePathwayStepReadiness = pathwayReadiness?.steps.find((item) => item.stepId === activeStep.id) ?? null;
  const activeStepComplete = activeStage.id === "stage-01"
    ? activePathwayStepReadiness?.status === "ready"
    : activeStage.id === "stage-02"
      ? proposalStepReadiness[activeStep.id] === true
    : activeDraft.completed;
  const proposalHandoffCurrent = useMemo(() => {
    if (!handoffSourcesLoaded || !proposalHandoff || !proposalSourceChecksum || !pathwayViewDocument) return false;
    if (proposalHandoff.proposalReference.checksum !== proposalSourceChecksum || proposalHandoff.pathwayReference.checksum !== pathwayViewDocument.identity.checksum) return false;
    const frozenEvidence = proposalHandoff.evidenceManifest.map((item) => `${item.assessmentId}:${item.assessmentChecksum}:${item.evidenceSourceReference.checksum}`).sort();
    return JSON.stringify(frozenEvidence) === JSON.stringify(evidenceSourceKeys);
  }, [evidenceSourceKeys, handoffSourcesLoaded, pathwayViewDocument, proposalHandoff, proposalSourceChecksum]);
  const reviewedProposalBaselineCurrent = Boolean(
    proposalHandoffCurrent
    && proposalHandoff
    && reviewedProposalBaseline
    && reviewedProposalBaseline.handoffReference.checksum === proposalHandoff.identity.checksum
    && reviewedProposalBaseline.proposalReference.checksum === proposalHandoff.proposalReference.checksum
  );
  const isStudyPlanningStep = activeStage.id === "stage-03" && [
    "study-design",
    "study-measures",
    "study-participants",
  ].includes(activeStep.canvas);
  const isExperimentStudioStep =
    activeStage.id === "stage-03" && activeStep.canvas === "experiment-studio-launcher";
  const isConsentStep =
    activeStage.id === "stage-03" && activeStep.canvas === "consent-workspace";
  const isAnalysisPlanStep =
    activeStage.id === "stage-06" && activeStep.canvas === "analysis-plan-launcher";
  const isDataIntakeStep =
    activeStage.id === "stage-06" && activeStep.canvas === "data-intake-audit-launcher";
  const isDataPreparationStep =
    activeStage.id === "stage-06" && activeStep.canvas === "data-preparation-launcher";
  const isDataQualityReviewStep =
    activeStage.id === "stage-06" && activeStep.canvas === "data-quality-review-launcher";
  const isAnalysisExecutionStep =
    activeStage.id === "stage-06" && activeStep.canvas === "analysis-execution-launcher";
  const isAnalysisRobustnessStep =
    activeStage.id === "stage-06" && activeStep.canvas === "analysis-robustness-launcher";
  const isAnalysisResultsStep =
    activeStage.id === "stage-06" && activeStep.canvas === "analysis-results-launcher";
  const isAnalysisReviewerStep =
    activeStage.id === "stage-06" && activeStep.canvas === "analysis-reviewer-launcher";
  const isQualitativeAnalysisStep =
    activeStage.id === "stage-06" && activeStep.canvas === "qualitative-analysis-launcher";
  const isReproducibilityPackageStep =
    activeStage.id === "stage-08"
    && activeStep.canvas === "reproducibility-package-launcher";
  const activeIndex = RESEARCH_PATH_STEPS.findIndex((step) => step.id === activeStep.id);
  const previousStep = activeIndex > 0 ? RESEARCH_PATH_STEPS[activeIndex - 1] : null;
  const nextStep = activeIndex < RESEARCH_PATH_STEPS.length - 1 ? RESEARCH_PATH_STEPS[activeIndex + 1] : null;

  const updatePathwayConflict = useCallback((conflict: ResearchPathwayReconciliation | null) => {
    pathwayConflictRef.current = conflict;
    setPathwayConflict(conflict);
  }, []);

  const queuePathwaySave = useCallback((userId: string, document: ResearchPathwayDocument) => {
    if (!pathwayCloudAvailable.current) return;
    pathwaySaveQueue.current = pathwaySaveQueue.current.then(async () => {
      if (pathwayConflictRef.current) return;
      const expectedChecksum = pathwayExpectedCloudChecksum.current;
      const result = await saveResearchPathwayDocument(createClient(), userId, document, expectedChecksum);
      if (result.status === "saved") {
        pathwayExpectedCloudChecksum.current = result.document.identity.checksum;
        const savedVersionIsStillCurrent = pathwayDocument.current?.identity.checksum === document.identity.checksum;
        if (savedVersionIsStillCurrent) {
          pathwayDocument.current = result.document;
          setPathwayViewDocument(result.document);
          writeResearchPathwayCache(window.localStorage, {
            document: result.document,
            lastSyncedChecksum: result.document.identity.checksum,
            dirty: false,
          });
        }
        setSaveState(result.compatibilityWarnings.length > 0
          ? "Saved securely; compatibility sync needs retry"
          : "Saved securely");
        return;
      }
      if (result.status === "conflict" && result.current) {
        pathwayExpectedCloudChecksum.current = result.currentStoredChecksum;
        const localDocument = pathwayDocument.current ?? document;
        const conflict = reconcileResearchPathwaySources({
          cloud: result.current,
          cache: {
            version: RESEARCH_PATHWAY_CACHE_VERSION,
            projectId,
            document: localDocument,
            lastSyncedChecksum: expectedChecksum,
            dirty: true,
            cachedAt: new Date().toISOString(),
          },
          migratedDevice: null,
        });
        if (conflict.kind === "cloud-current") {
          setPathwayPreviousDocument(pathwayDocument.current);
          pathwayDocument.current = result.current;
          setPathwayViewDocument(result.current);
          pathwayExpectedCloudChecksum.current = result.current.identity.checksum;
          writeResearchPathwayCache(window.localStorage, {
            document: result.current,
            lastSyncedChecksum: result.current.identity.checksum,
            dirty: false,
          });
          setSaveState("Saved securely");
          return;
        }
        updatePathwayConflict(conflict.kind === "review-required" ? conflict : {
          ...conflict,
          kind: "review-required",
          selected: null,
          differences: {
            problemFrames: { cloud: result.current.problemFrames.length, device: localDocument.problemFrames.length },
            baselineEntries: { cloud: result.current.baselineEntries.length, device: localDocument.baselineEntries.length },
            questionCandidates: { cloud: result.current.questionCandidates.length, device: localDocument.questionCandidates.length },
            cloudMainQuestion: result.current.decision.mainQuestion,
            deviceMainQuestion: localDocument.decision.mainQuestion,
          },
        });
        setSaveState("Choose which Stage 1 version to keep");
        return;
      }
      if (result.status === "unavailable" && /42P01|PGRST205|research_pathway_documents/i.test(result.reason)) {
        pathwayCloudAvailable.current = false;
      }
      setSaveState("Saved on this device");
    }).catch(() => {
      setSaveState("Saved on this device");
    });
  }, [projectId, updatePathwayConflict]);

  useEffect(() => {
    let cancelled = false;
    let storedPathway = EMPTY_RESEARCH_PATH_DRAFT;
    let storedStudy = createStudyDesignDocument(projectId, EMPTY_RESEARCH_PATH_DRAFT);
    let migrationSource: "workspace-v1" | "workspace-v2" | null = null;

    try {
      const stored = readResearchPathStoredDocument(window.localStorage, projectId);
      storedPathway = stored.pathway;
      storedStudy = stored.studyDesign;
      migrationSource = window.localStorage.getItem(researchPathStorageKey(projectId, 2))
        ? "workspace-v2"
        : window.localStorage.getItem(researchPathStorageKey(projectId, 1))
          ? "workspace-v1"
          : null;
      setDraft(stored.pathway);
      setStudyDesign(stored.studyDesign);
    } catch {
      setSaveState("Draft storage unavailable");
    } finally {
      setHydrated(true);
      setSaveState("Saved on this device");
    }

    async function loadCloudState() {
      const cache = await readResearchPathwayCache(window.localStorage, projectId);
      let userId: string | null = null;
      let cloudPathway: ResearchPathwayDocument | null = null;
      let cloudStoredChecksum: ResearchPathwayDocument["identity"]["checksum"] | null = null;
      let cloudNeedsUpgrade = false;
      let legacyProject: LegacyProjectPathwayFields | null = null;

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !cancelled) {
          userId = user.id;
          setCloudUserId(user.id);
          const [cloudStudy, cloudState] = await Promise.all([
            fetchStudyDesign(supabase, user.id, projectId, storedPathway),
            fetchResearchPathwayCloudState(supabase, user.id, projectId),
          ]);
          if (cancelled) return;
          cloudPathway = cloudState.canonical;
          cloudStoredChecksum = cloudState.canonicalStoredChecksum;
          cloudNeedsUpgrade = cloudState.canonicalNeedsUpgrade;
          legacyProject = cloudState.legacyProject;
          pathwayCloudAvailable.current = cloudState.canonicalAvailable;

          if (cloudStudy) {
            const cloudTime = Date.parse(cloudStudy.updatedAt);
            const localTime = Date.parse(storedStudy.updatedAt);
            if (Number.isFinite(cloudTime) && cloudTime >= localTime) {
              setStudyDesign(cloudStudy);
            } else {
              studyDirty.current = true;
            }
          }
        }
      } catch {
        // The canonical device cache remains available when auth or Supabase is offline.
      }

      if (cancelled) return;
      const migratedDevice = await createResearchPathwayDocument({
        projectId,
        draft: storedPathway,
        legacyProject,
        previous: cache?.document ?? null,
        migrationSources: migrationSource ? [migrationSource] : [],
      });
      const reconciliation = reconcileResearchPathwaySources({
        cloud: cloudPathway,
        cache,
        migratedDevice,
      });

      pathwayExpectedCloudChecksum.current = cloudStoredChecksum ?? reconciliation.expectedCloudChecksum;
      if (reconciliation.kind === "review-required") {
        const device = reconciliation.device ?? migratedDevice;
        pathwayDocument.current = device;
        setPathwayViewDocument(device);
        writeResearchPathwayCache(window.localStorage, {
          document: device,
          lastSyncedChecksum: cache?.lastSyncedChecksum ?? null,
          dirty: true,
        });
        updatePathwayConflict(reconciliation);
        setSaveState("Choose which Stage 1 version to keep");
      } else if (reconciliation.selected) {
        const selected = reconciliation.selected;
        const dirty = reconciliation.kind === "device-current" || reconciliation.kind === "device-unsynced" || cloudNeedsUpgrade;
        const secured = reconciliation.kind === "cloud-current";
        pathwayDocument.current = selected;
        setPathwayViewDocument(selected);
        if (cloudPathway && cloudPathway.identity.checksum !== selected.identity.checksum) setPathwayPreviousDocument(cloudPathway);
        setDraft(researchPathwayDocumentToDraft(selected, storedPathway));
        writeResearchPathwayCache(window.localStorage, {
          document: selected,
          lastSyncedChecksum: secured ? cloudStoredChecksum ?? selected.identity.checksum : cache?.lastSyncedChecksum ?? null,
          dirty,
        });
        if (dirty && userId && pathwayCloudAvailable.current) queuePathwaySave(userId, selected);
        else setSaveState(secured && userId ? "Saved securely" : "Saved on this device");
      }
      setPathwayReady(true);
      setCloudReady(true);
    }

    void loadCloudState().catch(() => {
      if (!cancelled) {
        setPathwayReady(true);
        setCloudReady(true);
        setSaveState("Saved on this device");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, queuePathwaySave, updatePathwayConflict]);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        writeResearchPathStoredDocument(window.localStorage, projectId, draft, studyDesign);
        if (!cloudUserId) setSaveState("Saved on this device");
      } catch {
        setSaveState("Draft could not be saved");
      }
    }, 350);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [cloudUserId, draft, hydrated, projectId, studyDesign]);

  useEffect(() => {
    if (!hydrated || !pathwayReady || pathwayConflict || !pathwayDocument.current) return;
    if (pathwaySaveTimer.current) window.clearTimeout(pathwaySaveTimer.current);
    const generation = ++pathwayDraftGeneration.current;
    pathwaySaveTimer.current = window.setTimeout(() => {
      void createResearchPathwayDocument({
        projectId,
        draft,
        previous: pathwayDocument.current,
        migrationSources: ["canonical"],
      }).then((nextDocument) => {
        if (generation !== pathwayDraftGeneration.current || !pathwayDocument.current) return;
        if (researchPathwayDocumentsHaveSameContent(nextDocument, pathwayDocument.current)) return;
        setPathwayPreviousDocument(pathwayDocument.current);
        pathwayDocument.current = nextDocument;
        setPathwayViewDocument(nextDocument);
        writeResearchPathwayCache(window.localStorage, {
          document: nextDocument,
          lastSyncedChecksum: pathwayExpectedCloudChecksum.current,
          dirty: true,
        });
        if (cloudUserId && pathwayCloudAvailable.current) {
          setSaveState("Saving securely…");
          queuePathwaySave(cloudUserId, nextDocument);
        } else {
          setSaveState("Saved on this device");
        }
      }).catch(() => setSaveState("Draft could not be saved"));
    }, 650);
    return () => {
      if (pathwaySaveTimer.current) window.clearTimeout(pathwaySaveTimer.current);
    };
  }, [cloudUserId, draft, hydrated, pathwayConflict, pathwayReady, projectId, queuePathwaySave]);

  useEffect(() => {
    if (!cloudReady || !cloudUserId || !studyDirty.current) return;
    if (cloudSaveTimer.current) window.clearTimeout(cloudSaveTimer.current);
    setSaveState("Saving securely…");

    cloudSaveTimer.current = window.setTimeout(() => {
      void upsertStudyDesign(createClient(), cloudUserId, studyDesign).then((saved) => {
        if (saved) {
          studyDirty.current = false;
          setSaveState("Saved securely");
          notifyMentorContextChanged();
        } else {
          setSaveState("Saved on this device");
          notifyMentorContextChanged();
        }
      });
    }, 700);

    return () => {
      if (cloudSaveTimer.current) window.clearTimeout(cloudSaveTimer.current);
    };
  }, [cloudReady, cloudUserId, studyDesign]);

  const updateStepDraft = useCallback((stepId: string, updater: (current: StepDraft) => StepDraft) => {
    setDraft((current) => ({
      ...current,
      steps: {
        ...current.steps,
        [stepId]: updater(readStepDraft(current, stepId)),
      },
    }));
  }, []);

  const updateField = useCallback(
    (key: string, value: string) => {
      if (activeStep.id.startsWith("stage-01-")) {
        setStage1EditSession((current) => ({ count: current.count + 1, lastEditedAt: Date.now() }));
      }
      updateStepDraft(activeStep.id, (current) => ({
        ...current,
        fields: { ...current.fields, [key]: value },
      }));
    },
    [activeStep.id, updateStepDraft],
  );

  const mutateFields = useCallback(
    (updater: (fields: Record<string, string>) => Record<string, string>) => {
      if (activeStep.id.startsWith("stage-01-")) {
        setStage1EditSession((current) => ({ count: current.count + 1, lastEditedAt: Date.now() }));
      }
      updateStepDraft(activeStep.id, (current) => ({
        ...current,
        fields: updater(current.fields),
      }));
    },
    [activeStep.id, updateStepDraft],
  );

  useEffect(() => {
    setStage1EditSession({ count: 0, lastEditedAt: Date.now() });
  }, [activeStep.id]);

  const updateCheck = useCallback(
    (key: string, value: boolean) => {
      updateStepDraft(activeStep.id, (current) => ({
        ...current,
        checks: { ...current.checks, [key]: value },
      }));
    },
    [activeStep.id, updateStepDraft],
  );

  const updateStudyDesign = useCallback((updater: (current: StudyDesignDocument) => StudyDesignDocument) => {
    studyDirty.current = true;
    setStudyDesign((current) => updater(current));
  }, []);

  const useSecurePathwayVersion = useCallback(() => {
    const secureDocument = pathwayConflict?.cloud;
    if (!secureDocument) return;
    setPathwayPreviousDocument(pathwayDocument.current);
    pathwayDocument.current = secureDocument;
    setPathwayViewDocument(secureDocument);
    pathwayExpectedCloudChecksum.current = secureDocument.identity.checksum;
    setDraft((current) => researchPathwayDocumentToDraft(secureDocument, current));
    writeResearchPathwayCache(window.localStorage, {
      document: secureDocument,
      lastSyncedChecksum: secureDocument.identity.checksum,
      dirty: false,
    });
    updatePathwayConflict(null);
    setSaveState("Saved securely");
  }, [pathwayConflict, updatePathwayConflict]);

  const useDevicePathwayVersion = useCallback(() => {
    const deviceDocument = pathwayConflict?.device;
    const secureDocument = pathwayConflict?.cloud;
    if (!deviceDocument || !secureDocument) return;
    void rebaseResearchPathwayDocument(deviceDocument, secureDocument).then((rebased) => {
      pathwayDocument.current = rebased;
      setPathwayPreviousDocument(secureDocument);
      setPathwayViewDocument(rebased);
      pathwayExpectedCloudChecksum.current = secureDocument.identity.checksum;
      setDraft((current) => researchPathwayDocumentToDraft(rebased, current));
      writeResearchPathwayCache(window.localStorage, {
        document: rebased,
        lastSyncedChecksum: secureDocument.identity.checksum,
        dirty: true,
      });
      updatePathwayConflict(null);
      if (cloudUserId && pathwayCloudAvailable.current) {
        setSaveState("Saving securely…");
        queuePathwaySave(cloudUserId, rebased);
      } else {
        setSaveState("Saved on this device");
      }
    }).catch(() => setSaveState("Stage 1 version could not be selected"));
  }, [cloudUserId, pathwayConflict, queuePathwaySave, updatePathwayConflict]);

  const noteResearchSupportBreakpoint = useCallback((kind: ResearchSupportBreakpointKind, stepId: string) => {
    setResearchSupportBreakpoint((current) => ({ sequence: current.sequence + 1, kind, stepId, at: Date.now() }));
  }, []);

  const openStep = useCallback((stage: ResearchPathStage, step: ResearchPathStep) => {
    if (stage.id === "stage-01") noteResearchSupportBreakpoint("step-navigation", step.id);
    setActiveStageId(stage.id);
    setActiveStepId(step.id);
  }, [noteResearchSupportBreakpoint]);

  const updateActiveProposalReadiness = useCallback((ready: boolean) => {
    if (!activeStep.id.startsWith("stage-02-")) return;
    setProposalStepReadiness((current) => current[activeStep.id] === ready
      ? current
      : { ...current, [activeStep.id]: ready });
  }, [activeStep.id]);

  const updateProposalSource = useCallback((proposal: { identity: { checksum: string } } | null) => {
    setProposalSourceChecksum(proposal?.identity.checksum ?? null);
  }, []);

  const openFlatStep = useCallback((step: ResearchPathStep | null) => {
    if (!step) return;
    const stage = RESEARCH_PATH_STAGES.find((item) => item.id === step.id.slice(0, 8));
    if (stage) openStep(stage, step);
  }, [openStep]);

  const selectStage = useCallback((stage: ResearchPathStage) => {
    const firstIncomplete = stage.steps.find((step) => (
      stage.id === "stage-01"
        ? pathwayReadiness?.steps.find((item) => item.stepId === step.id)?.status !== "ready"
        : stage.id === "stage-02"
          ? proposalStepReadiness[step.id] !== true
        : !readStepDraft(draft, step.id).completed
    )) ?? stage.steps[0];
    openStep(stage, firstIncomplete);
  }, [draft, openStep, pathwayReadiness, proposalStepReadiness]);

  const toggleComplete = useCallback(() => {
    if (activeStage.id === "stage-01") {
      if (!activeStepComplete) setSaveState("Resolve the derived readiness items shown in this step");
      else setSaveState("Stage 1 readiness is derived automatically");
      return;
    }
    if (activeStage.id === "stage-02") {
      setSaveState(activeStepComplete
        ? "Stage 2 readiness is derived automatically"
        : "Resolve the artifact and review items shown in this proposal step");
      return;
    }
    if (
      activeStage.id === "stage-03"
      && !activeDraft.completed
      && isStudyPlanningStep
      && (!proposalHandoffCurrent || !reviewedProposalBaselineCurrent)
    ) {
      setSaveState("Create the current deterministic handoff and researcher-reviewed proposal baseline before completing Stage 3 planning");
      return;
    }
    if (
      activeStage.id === "stage-03"
      && !activeDraft.completed
      && isStudyPlanningStep
      && !canCompleteStudyStep(studyDesign.spec, activeStep.id)
    ) {
      setSaveState("Finish the required study decisions first");
      return;
    }
    if (
      activeStage.id === "stage-03"
      && !activeDraft.completed
      && isExperimentStudioStep
      && !experimentStudioReady
    ) {
      setSaveState("Resolve Experimental Studio errors before completing this step");
      return;
    }
    if (
      activeStage.id === "stage-03"
      && !activeDraft.completed
      && isConsentStep
      && !consentReady
    ) {
      setSaveState("Resolve consent authority, study-fact, and human-review issues before completing this step");
      return;
    }
    if (
      activeStage.id === "stage-06"
      && !activeDraft.completed
      && isAnalysisPlanStep
      && !analysisPlanReady
    ) {
      setSaveState("Complete the required analysis-plan decisions first");
      return;
    }
    if (
      activeStage.id === "stage-06"
      && !activeDraft.completed
      && isDataIntakeStep
      && !dataIntakeReady
    ) {
      setSaveState("Verify and review the data-intake audit first");
      return;
    }
    if (
      activeStage.id === "stage-06"
      && !activeDraft.completed
      && isDataPreparationStep
      && !dataPreparationReady
    ) {
      setSaveState("Review and export the reproducible preparation package first");
      return;
    }
    if (
      activeStage.id === "stage-06"
      && !activeDraft.completed
      && isDataQualityReviewStep
      && !dataQualityReviewReady
    ) {
      setSaveState("Review and export the aggregate data-quality record first");
      return;
    }
    if (
      activeStage.id === "stage-06"
      && !activeDraft.completed
      && isAnalysisExecutionStep
      && !analysisExecutionReady
    ) {
      setSaveState("Review and export the aggregate analysis results first");
      return;
    }
    if (
      activeStage.id === "stage-06"
      && !activeDraft.completed
      && isAnalysisRobustnessStep
      && !analysisRobustnessReady
    ) {
      setSaveState("Review and export the aggregate robustness record first");
      return;
    }
    if (
      activeStage.id === "stage-06"
      && !activeDraft.completed
      && isAnalysisResultsStep
      && !analysisResultsReady
    ) {
      setSaveState("Review and export the aggregate Results Record first");
      return;
    }
    if (
      activeStage.id === "stage-06"
      && !activeDraft.completed
      && isAnalysisReviewerStep
      && !analysisReviewerReady
    ) {
      setSaveState("Review, decide, and export the aggregate AI decision ledger first");
      return;
    }
    if (
      activeStage.id === "stage-06"
      && !activeDraft.completed
      && isQualitativeAnalysisStep
      && !qualitativeAnalysisReady
    ) {
      setSaveState("Review and export the qualitative-lane record first");
      return;
    }
    if (
      activeStage.id === "stage-08"
      && !activeDraft.completed
      && isReproducibilityPackageStep
      && !reproducibilityPackageReady
    ) {
      setSaveState("Build, verify, and export the reproducibility package locally first");
      return;
    }
    updateStepDraft(activeStep.id, (current) => ({ ...current, completed: !current.completed }));
  }, [
    activeDraft.completed,
    activeStepComplete,
    activeStage.id,
    activeStep.id,
    analysisExecutionReady,
    analysisRobustnessReady,
    analysisResultsReady,
    analysisReviewerReady,
    analysisPlanReady,
    dataIntakeReady,
    dataPreparationReady,
    dataQualityReviewReady,
    consentReady,
    experimentStudioReady,
    isAnalysisPlanStep,
    isAnalysisExecutionStep,
    isAnalysisRobustnessStep,
    isAnalysisResultsStep,
    isAnalysisReviewerStep,
    isQualitativeAnalysisStep,
    isReproducibilityPackageStep,
    isDataIntakeStep,
    isDataPreparationStep,
    isDataQualityReviewStep,
    isExperimentStudioStep,
    isConsentStep,
    isStudyPlanningStep,
    proposalHandoffCurrent,
    reviewedProposalBaselineCurrent,
    qualitativeAnalysisReady,
    reproducibilityPackageReady,
    studyDesign.spec,
    updateStepDraft,
  ]);

  return (
    <div className={`${styles.workspace} ${researchMentorOpen ? "researchMentorOpen" : ""}`}>
      <div className={styles.contextBar}>
        <Link href="/projects">
          <AppIcon name="arrow-left" />
          Projects
        </Link>
        <span className={styles.projectName}>{projectName}</span>
        <span className={styles.saveState} aria-live="polite">
          <AppIcon name="save" />
          {saveState}
        </span>
      </div>

      <div className={styles.researchShell}>
        <aside className={styles.stageRail}>
          <Image
            alt="An eight-level academic research journey"
            className={styles.journeyIllustration}
            height={420}
            priority
            src="/assets/research-path/research-journey-tower.jpg"
            width={315}
          />

          <nav aria-label="Research stages" className={styles.stageNavigation}>
            {RESEARCH_PATH_STAGES.map((stage) => {
              const active = stage.id === activeStage.id;
              const progress = stageCompletion(stage, draft, pathwayViewDocument, proposalStepReadiness);
              return (
                <section className={active ? styles.stageActive : styles.stageCompact} key={stage.id}>
                  <button
                    aria-expanded={active}
                    className={styles.stageButton}
                    onClick={() => selectStage(stage)}
                    type="button"
                  >
                    <span>{String(stage.number).padStart(2, "0")}</span>
                    <strong>{stage.title}</strong>
                    <small>{progress.complete}/{progress.total}</small>
                  </button>
                  {active ? (
                    <div className={styles.activeStageContent}>
                      <p>{stage.description}</p>
                      <ol>
                        {stage.steps.map((step) => {
                          const stepActive = step.id === activeStep.id;
                          const complete = stage.id === "stage-01"
                            ? pathwayReadiness?.steps.find((item) => item.stepId === step.id)?.status === "ready"
                            : stage.id === "stage-02"
                              ? proposalStepReadiness[step.id] === true
                            : readStepDraft(draft, step.id).completed;
                          return (
                            <li className={stepActive ? styles.stepActive : undefined} key={step.id}>
                              <button onClick={() => openStep(stage, step)} type="button">
                                <span>{String(step.number).padStart(2, "0")}</span>
                                <strong>{step.shortTitle}</strong>
                                {complete ? <AppIcon name="check-square" /> : null}
                              </button>
                              {stepActive ? <p>{step.description}</p> : null}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </nav>
        </aside>

        <main className={`${styles.workArea} ${pathwayConflict ? styles.workAreaWithConflict : ""} ${researchMentorOpen ? styles.workAreaMentorOpen : ""}`}>
          <header className={styles.stepHeader}>
            <div>
              <p className={styles.eyebrow}>Stage {String(activeStage.number).padStart(2, "0")} · Step {String(activeStep.number).padStart(2, "0")}</p>
              <h1>{activeStep.title}</h1>
              <p>{activeStep.description}</p>
            </div>
            <span className={activeStepComplete ? styles.completedBadge : styles.progressBadge}>
              {activeStepComplete ? "Ready" : "In progress"}
            </span>
          </header>

          {pathwayConflict?.kind === "review-required" ? (
            <section aria-labelledby="pathway-conflict-title" className={styles.pathwayConflict} role="alert">
              <div>
                <p className={styles.eyebrow}>Stage 1 version review</p>
                <h2 id="pathway-conflict-title">Two saved versions need your choice</h2>
                <p>
                  Cerise Scholar found different Stage 1 work on this device and in secure storage.
                  Neither version has been overwritten. Choose the one that should become current.
                </p>
                {pathwayConflict.differences ? (
                  <dl className={styles.pathwayConflictComparison}>
                    <div>
                      <dt>Secure version</dt>
                      <dd>{pathwayConflict.differences.cloudMainQuestion || "No main question yet"}</dd>
                      <small>{pathwayConflict.differences.questionCandidates.cloud} question candidates</small>
                    </div>
                    <div>
                      <dt>This device</dt>
                      <dd>{pathwayConflict.differences.deviceMainQuestion || "No main question yet"}</dd>
                      <small>{pathwayConflict.differences.questionCandidates.device} question candidates</small>
                    </div>
                  </dl>
                ) : null}
              </div>
              <div className={styles.pathwayConflictActions}>
                <button onClick={useSecurePathwayVersion} type="button">Use secure version</button>
                <button className={styles.pathwayConflictPrimary} onClick={useDevicePathwayVersion} type="button">
                  Use this device’s version
                </button>
              </div>
            </section>
          ) : null}

          <section
            className={styles.canvas}
            onBlurCapture={(event) => {
              if (activeStage.id !== "stage-01") return;
              const target = event.target;
              if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
                noteResearchSupportBreakpoint("field-blur", activeStep.id);
              }
            }}
          >
            {activeStage.id === "stage-01" && activeStep.canvas === "research-framing" ? (
              <Stage1ResearchFramingStudio
                activeStepId={activeStep.id}
                document={pathwayViewDocument}
                mutateFields={mutateFields}
                pathwayDraft={draft}
                previousDocument={pathwayPreviousDocument}
                projectId={projectId}
                stepDraft={activeDraft}
                updateField={updateField}
              />
            ) : null}
            {activeStage.id === "stage-02" ? (
              <Stage2ProposalStudio
                cloudUserId={cloudUserId}
                onBaselineChange={setReviewedProposalBaseline}
                onHandoffChange={setProposalHandoff}
                onProposalChange={updateProposalSource}
                onReadyChange={updateActiveProposalReadiness}
                onStatusChange={setSaveState}
                pathwayDocument={pathwayViewDocument}
                pathwayDraft={draft}
                projectId={projectId}
                projectName={projectName}
                step={activeStep}
                stepDraft={activeDraft}
                updateField={updateField}
              />
            ) : null}
            {isStudyPlanningStep ? (
              <Stage3StudyPlanner
                pathwayDraft={draft}
                proposalHandoff={proposalHandoff}
                proposalHandoffCurrent={proposalHandoffCurrent}
                reviewedProposalBaseline={reviewedProposalBaseline}
                reviewedProposalBaselineCurrent={reviewedProposalBaselineCurrent}
                step={activeStep}
                studyDesign={studyDesign}
                updateStudyDesign={updateStudyDesign}
              />
            ) : null}
            {isExperimentStudioStep ? (
              <ExperimentStudioLauncher
                onReadyChange={setExperimentStudioReady}
                projectId={projectId}
                projectName={projectName}
                studyDesign={studyDesign}
              />
            ) : null}
            {isConsentStep ? (
              <ConsentWorkspace
                onReadyChange={setConsentReady}
                projectId={projectId}
                studyDesign={studyDesign}
              />
            ) : null}
            {isAnalysisPlanStep ? (
              <AnalysisPlanLauncher
                onReadyChange={setAnalysisPlanReady}
                projectId={projectId}
              />
            ) : null}
            {isDataIntakeStep ? (
              <DataIntakeAuditLauncher
                onReadyChange={setDataIntakeReady}
                projectId={projectId}
              />
            ) : null}
            {isDataPreparationStep ? (
              <DataPreparationLauncher
                onReadyChange={setDataPreparationReady}
                projectId={projectId}
              />
            ) : null}
            {isDataQualityReviewStep ? (
              <DataQualityReviewLauncher
                onReadyChange={setDataQualityReviewReady}
                projectId={projectId}
              />
            ) : null}
            {isAnalysisExecutionStep ? (
              <AnalysisExecutionLauncher
                onReadyChange={setAnalysisExecutionReady}
                projectId={projectId}
              />
            ) : null}
            {isAnalysisRobustnessStep ? (
              <AnalysisRobustnessLauncher
                onReadyChange={setAnalysisRobustnessReady}
                projectId={projectId}
              />
            ) : null}
            {isAnalysisResultsStep ? (
              <AnalysisResultsLauncher
                onReadyChange={setAnalysisResultsReady}
                projectId={projectId}
              />
            ) : null}
            {isAnalysisReviewerStep ? (
              <AnalysisReviewerLauncher
                onReadyChange={setAnalysisReviewerReady}
                projectId={projectId}
              />
            ) : null}
            {isQualitativeAnalysisStep ? (
              <QualitativeAnalysisLauncher
                onReadyChange={setQualitativeAnalysisReady}
                projectId={projectId}
              />
            ) : null}
            {isReproducibilityPackageStep ? (
              <ReproducibilityPackageLauncher
                onReadyChange={setReproducibilityPackageReady}
                projectId={projectId}
              />
            ) : null}
            {activeStage.id !== "stage-02" && activeStep.canvas === "problem" ? <ProblemCanvas stepDraft={activeDraft} updateField={updateField} /> : null}
            {activeStage.id !== "stage-02" && activeStep.canvas === "baseline" ? <BaselineCanvas projectId={projectId} stepDraft={activeDraft} updateField={updateField} /> : null}
            {activeStage.id !== "stage-02" && activeStep.canvas === "questions" ? <QuestionsCanvas stepDraft={activeDraft} updateField={updateField} /> : null}
            {activeStage.id !== "stage-02" && activeStep.canvas === "backcasting" ? <BackcastingCanvas stepDraft={activeDraft} updateField={updateField} /> : null}
            {activeStage.id !== "stage-02" && activeStep.canvas === "guided" ? (
              <GuidedCanvas step={activeStep} stepDraft={activeDraft} updateCheck={updateCheck} updateField={updateField} />
            ) : null}
          </section>

          <ResearchMentorPanel
            key={projectId}
            activeStageId={activeStage.id}
            activeStageNumber={activeStage.number as ResearchStageNumber}
            activeStageTitle={activeStage.title}
            activeStepId={activeStep.id}
            activeStepTitle={activeStep.title}
            cloudUserId={cloudUserId}
            document={pathwayViewDocument}
            draft={draft}
            editCount={stage1EditSession.count}
            lastEditedAt={stage1EditSession.lastEditedAt}
            launchRequest={mentorLaunchRequest}
            mutateFields={activeStage.id === "stage-01" ? mutateFields : undefined}
            onOpenChange={setResearchMentorOpen}
            onStatusChange={setSaveState}
            projectId={projectId}
            supportBreakpoint={researchSupportBreakpoint}
          />

          <footer className={styles.stepFooter}>
            <div className={styles.deliverable}>
              <span>Stage deliverable</span>
              <strong>{activeStage.deliverable}</strong>
            </div>
            <div className={styles.footerActions}>
              <button disabled={!previousStep} onClick={() => openFlatStep(previousStep)} type="button">
                <AppIcon name="arrow-left" />
                Previous
              </button>
              <button className={styles.completeButton} onClick={toggleComplete} type="button">
                <AppIcon name="check-square" />
                {activeStage.id === "stage-01" || activeStage.id === "stage-02"
                  ? activeStepComplete ? "Readiness derived" : "View readiness"
                  : activeDraft.completed ? "Mark incomplete" : "Mark step complete"}
              </button>
              <button disabled={!nextStep} onClick={() => openFlatStep(nextStep)} type="button">
                Next
                <AppIcon name="arrow-right" />
              </button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
