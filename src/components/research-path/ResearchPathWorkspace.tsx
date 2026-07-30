"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
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
  writeResearchPathStoredDocument,
} from "@/lib/research/researchPathStorage";
import {
  canCompleteStudyStep,
  createStudyDesignDocument,
  type StudyDesignDocument,
} from "@/lib/research/studyDesign";
import { fetchStudyDesign, upsertStudyDesign } from "@/lib/research/studyDesignPersistence";
import styles from "./ResearchPathWorkspace.module.css";

const EmbeddedScholarAsk = dynamic(
  () =>
    import("@/app/dashboard/project/[projectId]/scholar-ask/page").then(
      (module) => module.default as ComponentType<{ embedded?: boolean; projectId?: string }>,
    ),
  { loading: () => <ToolLoading label="ScholarAsk" />, ssr: false },
);
const EmbeddedLiteratureReview = dynamic(
  () => import("@/components/literature-review/LiteratureReviewWorkspace").then((module) => module.LiteratureReviewWorkspace),
  { loading: () => <ToolLoading label="Literature Review" />, ssr: false },
);
const EmbeddedEvidenceLibrary = dynamic(
  () => import("@/components/evidence-library/EvidenceLibraryWorkspace").then((module) => module.EvidenceLibraryEmbedded),
  { loading: () => <ToolLoading label="Evidence Library" />, ssr: false },
);
const EmbeddedPaperWriter = dynamic(
  () => import("@/components/paper-writer/PaperWriterWorkspace").then((module) => module.PaperWriterWorkspace),
  { loading: () => <ToolLoading label="Paper Writer" />, ssr: false },
);
const EmbeddedProjectWorkspace = dynamic(
  () => import("@/components/workspace/ProjectDocumentWorkspace"),
  { loading: () => <ToolLoading label="Workspace" />, ssr: false },
);
const Stage3StudyPlanner = dynamic(
  () => import("./Stage3StudyPlanner"),
  { loading: () => <ToolLoading label="Study Design" />, ssr: false },
);
const ExperimentStudioLauncher = dynamic(
  () => import("./ExperimentStudioLauncher"),
  { loading: () => <ToolLoading label="Experimental Studio" />, ssr: false },
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
const ReproducibilityPackageLauncher = dynamic(
  () => import("./ReproducibilityPackageLauncher"),
  { loading: () => <ToolLoading label="Reproducibility Package" />, ssr: false },
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

function stageCompletion(stage: ResearchPathStage, draft: ResearchPathDraft) {
  const complete = stage.steps.filter((step) => readStepDraft(draft, step.id).completed).length;
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

const PROPOSAL_LITERATURE_TOOL_TABS = [
  ["workspace", "Workspace"],
  ["scholarask", "ScholarAsk"],
  ["literature-review", "Lit Review"],
  ["evidence-library", "Evidence Library"],
] as const;

const PROPOSAL_WRITING_TOOL_TABS = [
  ["paper-writer", "Paper Writer"],
] as const;

type ProposalToolId = "workspace" | "scholarask" | "literature-review" | "evidence-library" | "paper-writer";

const ROADMAP_ROWS = Array.from({ length: 4 }, (_, index) => index);

function ProposalRoadmapsCanvas({
  pathwayDraft,
  stepDraft,
  updateField,
}: {
  pathwayDraft: ResearchPathDraft;
  stepDraft: StepDraft;
  updateField: (key: string, value: string) => void;
}) {
  const [activeQuestion, setActiveQuestion] = useState(0);
  const questionDraft = readStepDraft(pathwayDraft, "stage-01-step-03");
  const inheritedQuestion = questionDraft.fields[`key-question-${activeQuestion}`] ?? "";
  const questionKey = `roadmap-${activeQuestion}-question`;
  const currentQuestion = stepDraft.fields[questionKey] ?? inheritedQuestion;

  return (
    <div className={styles.roadmapCanvas}>
      <div className={styles.roadmapQuestionTabs} role="tablist" aria-label="Research question roadmaps">
        {KEY_QUESTION_ROWS.map((question) => {
          const savedQuestion = stepDraft.fields[`roadmap-${question}-question`]
            ?? questionDraft.fields[`key-question-${question}`]
            ?? "";
          return (
            <button
              aria-selected={question === activeQuestion}
              className={question === activeQuestion ? styles.roadmapQuestionActive : undefined}
              key={question}
              onClick={() => setActiveQuestion(question)}
              role="tab"
              type="button"
            >
              <span>RQ{question + 1}</span>
              <small>{savedQuestion || "Add research question"}</small>
            </button>
          );
        })}
      </div>

      <label className={styles.roadmapQuestionField}>
        <span>Research question</span>
        <textarea
          onChange={(event) => updateField(questionKey, event.target.value)}
          placeholder={`Define RQ${activeQuestion + 1}`}
          rows={2}
          value={currentQuestion}
        />
      </label>

      <div className={styles.tableScroller}>
        <table className={styles.roadmapTable}>
          <thead>
            <tr>
              <th>Theme</th>
              <th>Short-term tasks</th>
              <th>Medium-term tasks</th>
              <th>Long-term tasks</th>
            </tr>
          </thead>
          <tbody>
            {ROADMAP_ROWS.map((row) => (
              <tr key={row}>
                {(["theme", "short", "medium", "long"] as const).map((column) => {
                  const key = `roadmap-${activeQuestion}-${row}-${column}`;
                  return (
                    <td key={column}>
                      <textarea
                        aria-label={`RQ${activeQuestion + 1} ${column} row ${row + 1}`}
                        onChange={(event) => updateField(key, event.target.value)}
                        placeholder={row === 0 ? (column === "theme" ? "Theme or workstream" : `${column}-term action`) : ""}
                        rows={3}
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

      <label className={styles.roadmapVision}>
        <span>Vision for RQ{activeQuestion + 1}</span>
        <textarea
          onChange={(event) => updateField(`roadmap-${activeQuestion}-vision`, event.target.value)}
          placeholder="Describe the future state this research question helps make possible."
          rows={4}
          value={stepDraft.fields[`roadmap-${activeQuestion}-vision`] ?? ""}
        />
      </label>
    </div>
  );
}

function ResearchProposalCanvas({
  pathwayDraft,
  projectId,
  step,
  stepDraft,
  updateField,
}: {
  pathwayDraft: ResearchPathDraft;
  projectId: string;
  step: ResearchPathStep;
  stepDraft: StepDraft;
  updateField: (key: string, value: string) => void;
}) {
  const isWritingStep = step.canvas === "proposal-paper";
  const isLiteratureStep = step.canvas === "proposal-literature";
  const isRoadmapStep = step.canvas === "proposal-roadmaps";
  const toolTabs = isWritingStep ? PROPOSAL_WRITING_TOOL_TABS : PROPOSAL_LITERATURE_TOOL_TABS;
  const [activeTool, setActiveTool] = useState<ProposalToolId>(
    isWritingStep ? "paper-writer" : "workspace",
  );

  return (
    <div className={`${styles.proposalStudio} ${isLiteratureStep ? styles.proposalStudioImmersive : ""} ${isRoadmapStep ? styles.proposalStudioDirect : ""}`}>
      {!isRoadmapStep ? (
        <div className={styles.proposalToolTabs} role="tablist" aria-label="Research proposal tools">
          {toolTabs.map(([id, label]) => (
            <button
              aria-selected={id === activeTool}
              className={id === activeTool ? styles.proposalToolTabActive : styles.proposalToolTab}
              key={id}
              onClick={() => setActiveTool(id)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      <div className={activeTool === "workspace" ? styles.proposalWorkspace : styles.embeddedTool}>
        {activeTool === "workspace" && step.canvas === "proposal-literature" ? (
          <EmbeddedProjectWorkspace projectId={projectId} />
        ) : null}
        {activeTool === "workspace" && step.canvas === "proposal-roadmaps" ? (
          <ProposalRoadmapsCanvas pathwayDraft={pathwayDraft} stepDraft={stepDraft} updateField={updateField} />
        ) : null}
        {activeTool === "scholarask" ? <EmbeddedScholarAsk embedded projectId={projectId} /> : null}
        {activeTool === "literature-review" ? <EmbeddedLiteratureReview embedded projectId={projectId} /> : null}
        {activeTool === "evidence-library" ? <EmbeddedEvidenceLibrary embedded /> : null}
        {activeTool === "paper-writer" ? <EmbeddedPaperWriter embedded mode="proposal" projectId={projectId} /> : null}
      </div>
      {activeTool !== "workspace" && !isWritingStep && step.canvas !== "proposal-literature" ? (
        <button className={styles.returnToProposal} onClick={() => setActiveTool("workspace")} type="button">
          <AppIcon name="arrow-left" />
          Return to this proposal step
        </button>
      ) : null}
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
  const [experimentStudioReady, setExperimentStudioReady] = useState(false);
  const [analysisPlanReady, setAnalysisPlanReady] = useState(false);
  const [dataIntakeReady, setDataIntakeReady] = useState(false);
  const [dataPreparationReady, setDataPreparationReady] = useState(false);
  const [dataQualityReviewReady, setDataQualityReviewReady] = useState(false);
  const [analysisExecutionReady, setAnalysisExecutionReady] = useState(false);
  const [analysisRobustnessReady, setAnalysisRobustnessReady] = useState(false);
  const [analysisResultsReady, setAnalysisResultsReady] = useState(false);
  const [analysisReviewerReady, setAnalysisReviewerReady] = useState(false);
  const [reproducibilityPackageReady, setReproducibilityPackageReady] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const cloudSaveTimer = useRef<number | null>(null);
  const studyDirty = useRef(false);

  const activeStage = useMemo(
    () => RESEARCH_PATH_STAGES.find((stage) => stage.id === activeStageId) ?? RESEARCH_PATH_STAGES[0],
    [activeStageId],
  );
  const activeStep = useMemo(
    () => activeStage.steps.find((step) => step.id === activeStepId) ?? activeStage.steps[0],
    [activeStage, activeStepId],
  );
  const activeDraft = readStepDraft(draft, activeStep.id);
  const isImmersiveLiteratureStep =
    activeStage.id === "stage-02" && activeStep.canvas === "proposal-literature";
  const isStudyPlanningStep = activeStage.id === "stage-03" && [
    "study-design",
    "study-measures",
    "study-participants",
  ].includes(activeStep.canvas);
  const isExperimentStudioStep =
    activeStage.id === "stage-03" && activeStep.canvas === "experiment-studio-launcher";
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
  const isReproducibilityPackageStep =
    activeStage.id === "stage-08"
    && activeStep.canvas === "reproducibility-package-launcher";
  const activeIndex = RESEARCH_PATH_STEPS.findIndex((step) => step.id === activeStep.id);
  const previousStep = activeIndex > 0 ? RESEARCH_PATH_STEPS[activeIndex - 1] : null;
  const nextStep = activeIndex < RESEARCH_PATH_STEPS.length - 1 ? RESEARCH_PATH_STEPS[activeIndex + 1] : null;

  useEffect(() => {
    let cancelled = false;
    let storedPathway = EMPTY_RESEARCH_PATH_DRAFT;
    let storedStudy = createStudyDesignDocument(projectId, EMPTY_RESEARCH_PATH_DRAFT);

    try {
      const stored = readResearchPathStoredDocument(window.localStorage, projectId);
      storedPathway = stored.pathway;
      storedStudy = stored.studyDesign;
      setDraft(stored.pathway);
      setStudyDesign(stored.studyDesign);
    } catch {
      setSaveState("Draft storage unavailable");
    } finally {
      setHydrated(true);
      setSaveState("Saved on this device");
    }

    async function loadCloudStudy() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const cloudStudy = await fetchStudyDesign(supabase, user.id, projectId, storedPathway);
        if (cancelled) return;
        setCloudUserId(user.id);

        if (cloudStudy) {
          const cloudTime = Date.parse(cloudStudy.updatedAt);
          const localTime = Date.parse(storedStudy.updatedAt);
          if (Number.isFinite(cloudTime) && cloudTime >= localTime) {
            setStudyDesign(cloudStudy);
            setSaveState("Saved securely");
          } else {
            studyDirty.current = true;
          }
        }
      } catch {
        // Local versioned storage remains available when auth or Supabase is offline.
      } finally {
        if (!cancelled) setCloudReady(true);
      }
    }

    void loadCloudStudy();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!hydrated) return;
    setSaveState("Saving…");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        writeResearchPathStoredDocument(window.localStorage, projectId, draft, studyDesign);
        setSaveState("Saved on this device");
      } catch {
        setSaveState("Draft could not be saved");
      }
    }, 350);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [draft, hydrated, projectId, studyDesign]);

  useEffect(() => {
    if (!cloudReady || !cloudUserId || !studyDirty.current) return;
    if (cloudSaveTimer.current) window.clearTimeout(cloudSaveTimer.current);
    setSaveState("Saving securely…");

    cloudSaveTimer.current = window.setTimeout(() => {
      void upsertStudyDesign(createClient(), cloudUserId, studyDesign).then((saved) => {
        if (saved) {
          studyDirty.current = false;
          setSaveState("Saved securely");
        } else {
          setSaveState("Saved on this device");
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
      updateStepDraft(activeStep.id, (current) => ({
        ...current,
        fields: { ...current.fields, [key]: value },
      }));
    },
    [activeStep.id, updateStepDraft],
  );

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

  const openStep = useCallback((stage: ResearchPathStage, step: ResearchPathStep) => {
    setActiveStageId(stage.id);
    setActiveStepId(step.id);
  }, []);

  const openFlatStep = useCallback((step: ResearchPathStep | null) => {
    if (!step) return;
    const stage = RESEARCH_PATH_STAGES.find((item) => item.id === step.id.slice(0, 8));
    if (stage) openStep(stage, step);
  }, [openStep]);

  const selectStage = useCallback((stage: ResearchPathStage) => {
    const firstIncomplete = stage.steps.find((step) => !readStepDraft(draft, step.id).completed) ?? stage.steps[0];
    openStep(stage, firstIncomplete);
  }, [draft, openStep]);

  const toggleComplete = useCallback(() => {
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
    experimentStudioReady,
    isAnalysisPlanStep,
    isAnalysisExecutionStep,
    isAnalysisRobustnessStep,
    isAnalysisResultsStep,
    isAnalysisReviewerStep,
    isReproducibilityPackageStep,
    isDataIntakeStep,
    isDataPreparationStep,
    isDataQualityReviewStep,
    isExperimentStudioStep,
    isStudyPlanningStep,
    reproducibilityPackageReady,
    studyDesign.spec,
    updateStepDraft,
  ]);

  return (
    <div className={styles.workspace}>
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
              const progress = stageCompletion(stage, draft);
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
                          const complete = readStepDraft(draft, step.id).completed;
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

        <main className={`${styles.workArea} ${isImmersiveLiteratureStep ? styles.workAreaImmersive : ""}`}>
          {!isImmersiveLiteratureStep ? (
            <header className={styles.stepHeader}>
              <div>
                <p className={styles.eyebrow}>Stage {String(activeStage.number).padStart(2, "0")} · Step {String(activeStep.number).padStart(2, "0")}</p>
                <h1>{activeStep.title}</h1>
                <p>{activeStep.description}</p>
              </div>
              <span className={activeDraft.completed ? styles.completedBadge : styles.progressBadge}>
                {activeDraft.completed ? "Complete" : "In progress"}
              </span>
            </header>
          ) : null}

          <section className={styles.canvas}>
            {activeStage.id === "stage-02" ? (
              <ResearchProposalCanvas
                key={activeStep.id}
                pathwayDraft={draft}
                projectId={projectId}
                step={activeStep}
                stepDraft={activeDraft}
                updateField={updateField}
              />
            ) : null}
            {isStudyPlanningStep ? (
              <Stage3StudyPlanner
                pathwayDraft={draft}
                step={activeStep}
                studyDesign={studyDesign}
                updateStudyDesign={updateStudyDesign}
              />
            ) : null}
            {isExperimentStudioStep ? (
              <ExperimentStudioLauncher
                onReadyChange={setExperimentStudioReady}
                projectId={projectId}
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

          {!isImmersiveLiteratureStep ? (
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
                  {activeDraft.completed ? "Mark incomplete" : "Mark step complete"}
                </button>
                <button disabled={!nextStep} onClick={() => openFlatStep(nextStep)} type="button">
                  Next
                  <AppIcon name="arrow-right" />
                </button>
              </div>
            </footer>
          ) : null}
        </main>
      </div>
    </div>
  );
}
