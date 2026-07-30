"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  MAX_ANALYSIS_RESULTS_BYTES,
  isAnalysisExecutionReady,
  readAnalysisExecutionDocument,
  type AnalysisExecutionDocument,
  type AnalysisMethodResult,
  type AnalysisResultsPackage,
} from "@/lib/research/analysisExecution";
import {
  MAX_RESULTS_TEXT,
  RESULTS_RECORD_EXPORT_BOUNDARY,
  RESULTS_RECORD_EXPORT_TYPE,
  buildResultsRecordPackage,
  createAnalysisInterpretationDocument,
  isAnalysisInterpretationReady,
  markAnalysisInterpretationExported,
  markAnalysisInterpretationReviewed,
  readAnalysisInterpretationDocument,
  resultIntervalDomain,
  updateAnalysisInterpretation,
  verifyAnalysisResultsPackage,
  writeAnalysisInterpretationDocument,
  type AnalysisInterpretationDocument,
  type ResultsClaimStrength,
  type ResultsDivergenceRecord,
  type ResultsQuestionRecord,
  type ResultsRobustnessStatus,
} from "@/lib/research/analysisResults";
import {
  MAX_RESULTS_ASSISTANT_PROMPT,
  createAnalysisResultsAssistantContext,
  type AnalysisResultsAssistantResponse,
} from "@/lib/research/analysisResultsAssistant";
import {
  readAnalysisPlanDocument,
  type AnalysisPlanDocument,
} from "@/lib/research/analysisPlan";
import {
  isDataIntakeAuditReady,
  readDataIntakeAuditReceipt,
} from "@/lib/research/dataIntakeAudit";
import {
  isDataPreparationReady,
  readDataPreparationDocument,
  type DataPreparationDocument,
} from "@/lib/research/dataPreparation";
import type { ExperimentRelease } from "@/lib/research/experimentRelease";
import {
  fetchExperimentReleases,
  readLocalExperimentReleases,
  verifiedExperimentReleases,
} from "@/lib/research/experimentReleasePersistence";
import styles from "./AnalysisResultsWorkspace.module.css";

interface AnalysisResultsWorkspaceProps {
  projectId: string;
  projectName: string;
}

const CLAIM_STRENGTH_OPTIONS: ReadonlyArray<{
  value: ResultsClaimStrength;
  label: string;
}> = [
  { value: "not-selected", label: "Select claim strength" },
  { value: "descriptive", label: "Descriptive" },
  { value: "associational", label: "Associational" },
  { value: "comparative", label: "Group comparison" },
  { value: "predictive", label: "Predictive" },
  {
    value: "causal-requires-external-justification",
    label: "Causal · external design justification required",
  },
];

const ROBUSTNESS_OPTIONS: ReadonlyArray<{
  value: ResultsRobustnessStatus;
  label: string;
}> = [
  { value: "not-declared", label: "Select status" },
  { value: "not-performed", label: "Not performed" },
  { value: "performed-outside-cerise", label: "Performed outside Cerise" },
  {
    value: "not-applicable-with-rationale",
    label: "Not applicable · rationale recorded",
  },
];

function supportsAnalysisResults(release: ExperimentRelease): boolean {
  return Boolean(
    release.manifest.analysisContract
    && release.manifest.analysisContractChecksum
    && release.manifest.analysisContractSchemaVersion,
  );
}

function mergeReleases(cloud: ExperimentRelease[], local: ExperimentRelease[]) {
  return [...cloud, ...local.filter((item) => (
    !cloud.some((cloudRelease) => cloudRelease.releaseId === item.releaseId)
  ))]
    .filter(supportsAnalysisResults)
    .sort((left, right) => right.releaseNumber - left.releaseNumber);
}

function safeExportName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "cerise-results";
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function readableBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 ** 2)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  if (!value) return "Not yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not yet"
    : new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
}

function statusLabel(document: AnalysisInterpretationDocument | null): string {
  if (!document) return "Import results";
  if (document.readiness.status === "needs-interpretation") return "Interpretation required";
  if (document.readiness.status === "needs-review") return "Review required";
  if (document.readiness.status === "needs-export") return "Export required";
  return "Ready";
}

function intervalStyle(
  result: AnalysisMethodResult,
  allResults: AnalysisMethodResult[],
): CSSProperties {
  const { minimum, maximum } = resultIntervalDomain(allResults);
  const range = maximum - minimum;
  const position = (value: number) => (
    `${Math.max(0, Math.min(100, ((value - minimum) / range) * 100))}%`
  );
  return {
    "--result-low": position(result.interval.lower),
    "--result-high": position(result.interval.upper),
    "--result-point": position(result.primaryEstimate.value),
    "--result-zero": position(0),
  } as CSSProperties;
}

function GateItem({ complete, label }: { complete: boolean; label: string }) {
  return (
    <li className={complete ? styles.gateComplete : ""}>
      <span>{complete ? <AppIcon name="check-square" /> : null}</span>
      {label}
    </li>
  );
}

export default function AnalysisResultsWorkspace({
  projectId,
  projectName,
}: AnalysisResultsWorkspaceProps) {
  const [releases, setReleases] = useState<ExperimentRelease[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [plan, setPlan] = useState<AnalysisPlanDocument | null>(null);
  const [preparation, setPreparation] = useState<DataPreparationDocument | null>(null);
  const [execution, setExecution] = useState<AnalysisExecutionDocument | null>(null);
  const [document, setDocument] = useState<AnalysisInterpretationDocument | null>(null);
  const [results, setResults] = useState<AnalysisMethodResult[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState("");
  const [sourceLoaded, setSourceLoaded] = useState(false);
  const [sourceFilename, setSourceFilename] = useState("");
  const [sourceByteSize, setSourceByteSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [assistantPrompt, setAssistantPrompt] = useState(
    "Review my interpretation for overclaiming, explain the interval carefully, and suggest bounded wording.",
  );
  const [assistantReview, setAssistantReview] = useState<
    (AnalysisResultsAssistantResponse & { servedModel?: string }) | null
  >(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const sourcePackage = useRef<AnalysisResultsPackage | null>(null);

  const selectedRelease = useMemo(
    () => releases.find((release) => release.releaseId === selectedReleaseId) ?? null,
    [releases, selectedReleaseId],
  );
  const activeRecord = useMemo(
    () => document?.researchQuestions.find(
      (question) => question.researchQuestionId === activeQuestionId,
    ) ?? document?.researchQuestions[0] ?? null,
    [activeQuestionId, document],
  );
  const activePlanQuestion = useMemo(
    () => plan?.researchQuestions.find(
      (question) => question.id === activeRecord?.researchQuestionId,
    ) ?? null,
    [activeRecord, plan],
  );
  const activeResults = useMemo(
    () => results.filter((result) => (
      result.researchQuestionId === activeRecord?.researchQuestionId
    )),
    [activeRecord, results],
  );

  useEffect(() => {
    setAssistantReview(null);
    setAssistantError("");
  }, [activeQuestionId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const candidates = readLocalExperimentReleases(window.localStorage, projectId);
      const local = (await verifiedExperimentReleases(candidates, projectId))
        .filter(supportsAnalysisResults);
      let available = local;
      try {
        available = mergeReleases(await fetchExperimentReleases(projectId), local);
      } catch {
        // Verified local releases remain the safe offline fallback.
      }
      if (cancelled) return;
      setReleases(available);
      setSelectedReleaseId((current) => (
        available.some((release) => release.releaseId === current)
          ? current
          : available[0]?.releaseId ?? ""
      ));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!selectedRelease) {
      setPlan(null);
      setPreparation(null);
      setExecution(null);
      setDocument(null);
      return;
    }
    const nextPlan = readAnalysisPlanDocument(window.localStorage, selectedRelease);
    const audit = readDataIntakeAuditReceipt(window.localStorage, selectedRelease);
    const nextPreparation = audit && isDataIntakeAuditReady(audit)
      ? readDataPreparationDocument(window.localStorage, selectedRelease, audit)
      : null;
    const nextExecution = nextPlan
      && nextPreparation
      && nextPlan.readiness.status === "ready"
      && isDataPreparationReady(nextPreparation)
      ? readAnalysisExecutionDocument(
        window.localStorage,
        selectedRelease,
        nextPlan,
        nextPreparation,
      )
      : null;
    const nextDocument = nextPlan
      && nextPreparation
      && nextExecution
      && isAnalysisExecutionReady(nextExecution)
      ? readAnalysisInterpretationDocument(
        window.localStorage,
        selectedRelease,
        nextPlan,
        nextPreparation,
        nextExecution,
      )
      : null;
    setPlan(nextPlan);
    setPreparation(nextPreparation);
    setExecution(nextExecution);
    setDocument(nextDocument);
    setActiveQuestionId(nextDocument?.researchQuestions[0]?.researchQuestionId ?? "");
    sourcePackage.current = null;
    setResults([]);
    setSourceLoaded(false);
    setSourceFilename("");
    setSourceByteSize(0);
    setError("");
    setNotice("");
  }, [selectedRelease]);

  const persistChanges = useCallback((
    changes: Partial<Pick<
      AnalysisInterpretationDocument,
      | "researchQuestions"
      | "studyLimitations"
      | "boundaryConditions"
      | "unexpectedFindings"
      | "noUnexpectedFindingsConfirmed"
      | "divergences"
    >>,
  ) => {
    if (!document || !selectedRelease || !plan || !preparation || !execution) return;
    try {
      const updated = updateAnalysisInterpretation(
        document,
        changes,
        selectedRelease,
        plan,
        preparation,
        execution,
      );
      const saved = writeAnalysisInterpretationDocument(
        window.localStorage,
        selectedRelease,
        plan,
        preparation,
        execution,
        updated,
      );
      setDocument(saved);
      setError("");
      setNotice("Interpretation record saved on this device.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The interpretation could not be saved.");
    }
  }, [document, execution, plan, preparation, selectedRelease]);

  const updateActiveRecord = useCallback((
    updater: (current: ResultsQuestionRecord) => ResultsQuestionRecord,
  ) => {
    if (!document || !activeRecord || !sourceLoaded) return;
    persistChanges({
      researchQuestions: document.researchQuestions.map((question) => (
        question.id === activeRecord.id ? updater(question) : question
      )),
    });
  }, [activeRecord, document, persistChanges, sourceLoaded]);

  const handlePackage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedRelease || !plan || !preparation || !execution) return;
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      if (file.size <= 0 || file.size > MAX_ANALYSIS_RESULTS_BYTES) {
        throw new Error("The selected JSON is empty or exceeds the 8 MB aggregate-results limit.");
      }
      const buffer = await file.arrayBuffer();
      let parsed: unknown;
      try {
        parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
      } catch {
        throw new Error("The selected file is not valid UTF-8 JSON.");
      }
      const verified = await verifyAnalysisResultsPackage(
        parsed,
        selectedRelease,
        plan,
        preparation,
        execution,
      );
      const existing = readAnalysisInterpretationDocument(
        window.localStorage,
        selectedRelease,
        plan,
        preparation,
        execution,
      );
      const nextDocument = existing ?? createAnalysisInterpretationDocument(
        selectedRelease,
        plan,
        preparation,
        execution,
        verified,
      );
      if (!nextDocument) {
        throw new Error("The verified results could not initialize the interpretation record.");
      }
      const saved = writeAnalysisInterpretationDocument(
        window.localStorage,
        selectedRelease,
        plan,
        preparation,
        execution,
        nextDocument,
      );
      sourcePackage.current = verified;
      setDocument(saved);
      setResults(verified.results);
      setSourceLoaded(true);
      setSourceFilename(file.name.slice(0, 200));
      setSourceByteSize(file.size);
      setActiveQuestionId((current) => (
        saved.researchQuestions.some((question) => question.researchQuestionId === current)
          ? current
          : saved.researchQuestions[0]?.researchQuestionId ?? ""
      ));
      setNotice(
        "Aggregate results verified locally. The package declares that it contains no participant rows.",
      );
    } catch (cause) {
      sourcePackage.current = null;
      setResults([]);
      setSourceLoaded(false);
      setSourceFilename("");
      setSourceByteSize(0);
      setError(cause instanceof Error ? cause.message : "The results package could not be verified.");
    } finally {
      setProcessing(false);
    }
  };

  const confirmReview = () => {
    if (!document || !selectedRelease || !plan || !preparation || !execution || !sourceLoaded) {
      setError("Re-select and verify the Phase 8.4 package before confirming review.");
      return;
    }
    try {
      const reviewed = markAnalysisInterpretationReviewed(
        document,
        selectedRelease,
        plan,
        preparation,
        execution,
      );
      const saved = writeAnalysisInterpretationDocument(
        window.localStorage,
        selectedRelease,
        plan,
        preparation,
        execution,
        reviewed,
      );
      setDocument(saved);
      setError("");
      setNotice("Interpretation, limitations, outputs, and divergence review confirmed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review could not be confirmed.");
    }
  };

  const exportResultsRecord = async () => {
    if (
      !document
      || !selectedRelease
      || !plan
      || !preparation
      || !execution
      || !sourcePackage.current
    ) {
      setError("Re-select the exact verified Phase 8.4 results package before export.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      const exportedAt = new Date().toISOString();
      const exported = markAnalysisInterpretationExported(
        document,
        selectedRelease,
        plan,
        preparation,
        execution,
        exportedAt,
      );
      const recordPackage = await buildResultsRecordPackage({
        document: exported,
        resultsPackage: sourcePackage.current,
        createdAt: exportedAt,
      });
      const saved = writeAnalysisInterpretationDocument(
        window.localStorage,
        selectedRelease,
        plan,
        preparation,
        execution,
        exported,
      );
      downloadJson(
        `${safeExportName(projectName)}-results-record-v${selectedRelease.releaseNumber}.json`,
        {
          exportType: RESULTS_RECORD_EXPORT_TYPE,
          exportBoundary: RESULTS_RECORD_EXPORT_BOUNDARY,
          exportedAt,
          package: recordPackage,
        },
      );
      setDocument(saved);
      setNotice("Aggregate Results Record exported. It contains no participant rows.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The Results Record could not be exported.");
    } finally {
      setProcessing(false);
    }
  };

  const addDivergence = () => {
    if (!document || !activeRecord || !sourceLoaded) return;
    const divergence: ResultsDivergenceRecord = {
      id: `divergence-${Date.now().toString(36)}`,
      researchQuestionId: activeRecord.researchQuestionId,
      source: "researcher-authored",
      summary: "",
      rationale: "",
      impact: "",
      acknowledged: false,
    };
    persistChanges({ divergences: [...document.divergences, divergence] });
  };

  const requestAssistantReview = async () => {
    const activeResult = activeResults[0];
    if (
      !sourceLoaded
      || !sourcePackage.current
      || !activeResult
      || !activeRecord
      || !activePlanQuestion
      || !selectedRelease
      || !assistantPrompt.trim()
    ) {
      setAssistantError("Verify an aggregate result and enter a review request first.");
      return;
    }
    setAssistantLoading(true);
    setAssistantError("");
    setAssistantReview(null);
    try {
      const context = createAnalysisResultsAssistantContext(
        selectedRelease.releaseId,
        sourcePackage.current.integrity.resultChecksum,
        activePlanQuestion,
        activeResult,
        activeRecord,
      );
      const response = await fetch("/api/ai/analysis-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          prompt: assistantPrompt,
          context,
        }),
      });
      const body = await response.json().catch(() => null) as (
        AnalysisResultsAssistantResponse & { error?: string; servedModel?: string }
      ) | null;
      if (!response.ok || !body) {
        throw new Error(body?.error || "The interpretation assistant could not complete this request.");
      }
      setAssistantReview(body);
    } catch (cause) {
      setAssistantError(
        cause instanceof Error
          ? cause.message
          : "The interpretation assistant could not complete this request.",
      );
    } finally {
      setAssistantLoading(false);
    }
  };

  const applyAssistantSuggestion = () => {
    if (!assistantReview?.suggestion) return;
    const suggestion = assistantReview.suggestion;
    updateActiveRecord((current) => ({
      ...current,
      directAnswer: suggestion.directAnswer,
      statisticalMeaning: suggestion.statisticalMeaning,
      practicalMeaning: suggestion.practicalMeaning,
      claim: suggestion.claim,
      claimStrength: suggestion.claimStrength,
      limitations: suggestion.limitations,
      researcherConfirmed: false,
      tableApproved: false,
      figureApproved: false,
    }));
    setNotice("AI wording copied into the editable draft. Re-review every field and output before approval.");
  };

  const updateDivergence = (
    id: string,
    updater: (current: ResultsDivergenceRecord) => ResultsDivergenceRecord,
  ) => {
    if (!document || !sourceLoaded) return;
    persistChanges({
      divergences: document.divergences.map((item) => (
        item.id === id ? updater(item) : item
      )),
    });
  };

  const removeDivergence = (id: string) => {
    if (!document || !sourceLoaded) return;
    const divergence = document.divergences.find((item) => item.id === id);
    if (divergence?.source !== "researcher-authored") return;
    persistChanges({
      divergences: document.divergences.filter((item) => item.id !== id),
    });
  };

  const ready = isAnalysisInterpretationReady(document);
  const contentComplete = Boolean(
    document && document.readiness.status !== "needs-interpretation",
  );
  const reviewComplete = Boolean(document?.reviewedAt);
  const exportComplete = Boolean(document?.exportedAt);
  const activeDivergences = document?.divergences.filter(
    (item) => item.researchQuestionId === activeRecord?.researchQuestionId,
  ) ?? [];

  if (loading) {
    return (
      <main className={styles.centeredState}>
        <span className={styles.loadingMark} />
        <strong>Loading Results and Interpretation…</strong>
      </main>
    );
  }

  return (
    <main className={styles.resultsApp}>
      <header className={styles.topBar}>
        <Link className={styles.brand} href="/projects">Cerise Scholar</Link>
        <Link className={styles.returnLink} href={`/projects/${projectId}/research-path`}>
          <AppIcon name="arrow-left" />
          Back to Research Path
        </Link>
        <span className={styles.projectTitle}>{projectName}</span>
        <div className={styles.topActions}>
          <span className={styles.localBadge}><AppIcon name="lock" />Aggregate only</span>
          <button onClick={() => fileInput.current?.click()} type="button">
            <AppIcon name="upload" />
            Re-select results
          </button>
        </div>
      </header>

      <section className={styles.contextBar}>
        <div>
          <span className={styles.contextIcon}><AppIcon name="research" /></span>
          <strong>Results and Interpretation</strong>
          <span>Evidence-linked claims · reviewed outputs</span>
        </div>
        <div className={styles.releaseContext}>
          <AppIcon name="shield" />
          <select
            aria-label="Select frozen release"
            onChange={(event) => setSelectedReleaseId(event.target.value)}
            value={selectedRelease?.releaseId ?? ""}
          >
            {releases.map((release) => (
              <option key={release.releaseId} value={release.releaseId}>
                Release v{release.releaseNumber}
              </option>
            ))}
          </select>
          {selectedRelease ? <code>{selectedRelease.checksum.slice(0, 20)}…</code> : null}
        </div>
      </section>

      {!selectedRelease ? (
        <section className={styles.emptyState}>
          <AppIcon name="lock" />
          <h1>A Phase 8 release is required</h1>
          <p>Freeze a verified format-v5 release before creating a Results Record.</p>
          <Link href={`/experimental-studio/${projectId}`}>Open Experimental Studio</Link>
        </section>
      ) : !plan || plan.readiness.status !== "ready" ? (
        <section className={styles.emptyState}>
          <AppIcon name="sliders" />
          <h1>Finalize the analysis plan first</h1>
          <p>Phase 8.5 preserves the frozen research questions and planning decisions.</p>
          <Link href={`/analysis-plan/${projectId}`}>Open Analysis Plan</Link>
        </section>
      ) : !preparation || !isDataPreparationReady(preparation) ? (
        <section className={styles.emptyState}>
          <AppIcon name="workflow" />
          <h1>Complete reproducible preparation first</h1>
          <p>The exact Phase 8.3 preparation receipt is part of the required checksum chain.</p>
          <Link href={`/data-preparation/${projectId}`}>Open Reproducible Preparation</Link>
        </section>
      ) : !execution || !isAnalysisExecutionReady(execution) ? (
        <section className={styles.emptyState}>
          <AppIcon name="research" />
          <h1>Review and export the primary analysis first</h1>
          <p>Phase 8.5 accepts only the ready aggregate package produced by Phase 8.4.</p>
          <Link href={`/analysis-execution/${projectId}`}>Open Analysis Execution</Link>
        </section>
      ) : (
        <div className={styles.workspace}>
          <aside className={styles.workflowRail}>
            <span className={styles.railLabel}>Results workflow</span>
            <ol className={styles.workflowList}>
              {[
                ["shield", "Verify aggregate package", sourceLoaded],
                ["research", "Answer each research question", contentComplete],
                ["target", "Review claims and limits", reviewComplete],
                ["save", "Export Results Record", exportComplete],
              ].map(([icon, label, complete], index) => (
                <li
                  className={complete ? styles.workflowComplete : ""}
                  key={String(label)}
                >
                  <span className={styles.workflowNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <AppIcon name={icon as "shield" | "research" | "target" | "save"} />
                  <div><strong>{String(label)}</strong></div>
                  <span>{complete ? <AppIcon name="check-square" /> : null}</span>
                </li>
              ))}
            </ol>

            <span className={styles.railLabel}>Research questions</span>
            <div className={styles.questionList}>
              {document?.researchQuestions.map((question) => (
                <button
                  className={
                    question.researchQuestionId === activeRecord?.researchQuestionId
                      ? styles.questionActive
                      : ""
                  }
                  key={question.id}
                  onClick={() => setActiveQuestionId(question.researchQuestionId)}
                  type="button"
                >
                  <span>{question.designation}</span>
                  <strong>{question.researchQuestionId}</strong>
                  <small>{question.linkedResultIds.length} result(s)</small>
                </button>
              ))}
            </div>

            <div className={styles.boundaryCard}>
              <AppIcon name="lock" />
              <strong>Phase 8.5 boundary</strong>
              <ul>
                <li>Aggregate results only</li>
                <li>No participant rows or media</li>
                <li>No new analyses or p-values</li>
                <li>No automatic causal claims</li>
              </ul>
            </div>
          </aside>

          <section className={styles.resultsCanvas}>
            <header className={styles.hero}>
              <p>Phase 8.5 · Results and Interpretation</p>
              <h1>Turn reviewed aggregate results into defensible answers</h1>
              <span>
                Link each claim to the exact Phase 8.4 output, distinguish statistical
                from practical meaning, record limits and robustness evidence, and
                approve stable tables and confidence-interval figures.
              </span>
            </header>

            <section className={sourceLoaded ? styles.sourceVerified : styles.sourcePanel}>
              <span className={styles.sourceIcon}>
                <AppIcon name={sourceLoaded ? "shield" : "upload"} />
              </span>
              <div>
                <strong>
                  {sourceLoaded
                    ? "Aggregate results package verified"
                    : "Import the Phase 8.4 aggregate results package"}
                </strong>
                <p>
                  {sourceLoaded
                    ? `${results.length} aggregate result(s) · ${sourceFilename} (${readableBytes(sourceByteSize)})`
                    : "Cerise independently verifies the release, contract, plan, preparation, result, and whole-package checksums."}
                </p>
              </div>
              <button
                disabled={processing}
                onClick={() => fileInput.current?.click()}
                type="button"
              >
                <AppIcon name={sourceLoaded ? "refresh" : "upload"} />
                {processing
                  ? "Verifying locally…"
                  : sourceLoaded
                    ? "Replace package"
                    : "Choose results JSON"}
              </button>
              <input
                accept="application/json,.json"
                aria-label="Choose the exported Phase 8.4 aggregate results package"
                hidden
                onChange={handlePackage}
                ref={fileInput}
                type="file"
              />
            </section>

            {error ? (
              <div className={styles.errorNotice} role="alert">
                <AppIcon name="alert" />{error}
              </div>
            ) : null}
            {notice ? (
              <div className={styles.successNotice} role="status">
                <AppIcon name="shield" />{notice}
              </div>
            ) : null}

            {!sourceLoaded && document ? (
              <div className={styles.memoryNotice}>
                <AppIcon name="lock" />
                <div>
                  <strong>Your bounded interpretation record is available.</strong>
                  <p>
                    Re-select the exact Phase 8.4 package to restore aggregate
                    evidence, edit the record, confirm review, or export.
                  </p>
                </div>
              </div>
            ) : null}

            {activeRecord && activePlanQuestion ? (
              <>
                <section className={styles.questionHeader}>
                  <div>
                    <span>{activeRecord.designation} research question</span>
                    <h2>{activeRecord.researchQuestionId}</h2>
                    <p>{activeRecord.researchQuestion}</p>
                  </div>
                  <dl>
                    <div><dt>Planned method</dt><dd>{activePlanQuestion.plannedMethod}</dd></div>
                    <div><dt>Effect target</dt><dd>{activePlanQuestion.effectSize}</dd></div>
                    <div><dt>Unit</dt><dd>{activePlanQuestion.unitOfAnalysis}</dd></div>
                  </dl>
                </section>

                <section className={styles.evidenceSection}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span>Reviewed aggregate evidence</span>
                      <h2>Estimates and diagnostics</h2>
                    </div>
                    {sourcePackage.current ? (
                      <code>{sourcePackage.current.integrity.resultChecksum.slice(0, 24)}…</code>
                    ) : null}
                  </div>
                  {activeResults.length > 0 ? (
                    <div className={styles.resultCards}>
                      {activeResults.map((result) => (
                        <article className={styles.resultCard} key={result.analysisId}>
                          <div className={styles.resultTitle}>
                            <div>
                              <span>{result.methodLabel}</span>
                              <strong>{result.primaryEstimate.label}</strong>
                            </div>
                            <strong>{result.primaryEstimate.formatted}</strong>
                          </div>
                          <div className={styles.metricStrip}>
                            <div><span>Complete N</span><strong>{result.completeSampleSize}</strong></div>
                            <div>
                              <span>{Math.round(result.interval.level * 100)}% interval</span>
                              <strong>[{result.interval.lower}, {result.interval.upper}]</strong>
                            </div>
                            <div>
                              <span>Missing / invalid</span>
                              <strong>{result.excludedMissingOrInvalid}</strong>
                            </div>
                            <div>
                              <span>Plan</span>
                              <strong>{result.planAlignment === "aligned" ? "Aligned" : "Deviation"}</strong>
                            </div>
                          </div>
                          <div
                            className={styles.intervalPlot}
                            style={intervalStyle(result, activeResults)}
                          >
                            <span className={styles.zeroLine} />
                            <span className={styles.intervalLine} />
                            <span className={styles.estimatePoint} />
                          </div>
                          <div className={styles.intervalLabels}>
                            <span>{result.interval.lower}</span>
                            <strong>{result.primaryEstimate.formatted}</strong>
                            <span>{result.interval.upper}</span>
                          </div>
                          <div className={styles.diagnosticSummary}>
                            {result.diagnostics.map((diagnostic) => (
                              <div key={diagnostic.id}>
                                <AppIcon
                                  name={diagnostic.severity === "pass" ? "check-square" : "alert"}
                                />
                                <div>
                                  <strong>{diagnostic.label}</strong>
                                  <p>{diagnostic.detail}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.noResult}>
                      <AppIcon name="alert" />
                      <p>No Phase 8.4 result was executed for this non-primary question.</p>
                    </div>
                  )}
                </section>

                <section className={styles.interpretationSection}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span>Researcher-authored record</span>
                      <h2>Answer, meaning, and claim boundary</h2>
                    </div>
                    <span className={styles.autosaveBadge}>Bounded local autosave</span>
                  </div>

                  <div className={styles.formGrid}>
                    <label className={styles.fullField}>
                      <span>Direct answer to the research question</span>
                      <textarea
                        disabled={!sourceLoaded}
                        maxLength={MAX_RESULTS_TEXT}
                        onChange={(event) => updateActiveRecord((current) => ({
                          ...current,
                          directAnswer: event.target.value,
                        }))}
                        placeholder="State what the reviewed aggregate result supports, in plain language."
                        rows={4}
                        value={activeRecord.directAnswer}
                      />
                    </label>
                    <label>
                      <span>Statistical meaning</span>
                      <textarea
                        disabled={!sourceLoaded}
                        maxLength={MAX_RESULTS_TEXT}
                        onChange={(event) => updateActiveRecord((current) => ({
                          ...current,
                          statisticalMeaning: event.target.value,
                        }))}
                        placeholder="Interpret the estimate, interval, sample size, and missingness without inventing a p-value."
                        rows={5}
                        value={activeRecord.statisticalMeaning}
                      />
                    </label>
                    <label>
                      <span>Practical meaning</span>
                      <textarea
                        disabled={!sourceLoaded}
                        maxLength={MAX_RESULTS_TEXT}
                        onChange={(event) => updateActiveRecord((current) => ({
                          ...current,
                          practicalMeaning: event.target.value,
                        }))}
                        placeholder="Explain the scale, relevance, and real-world boundary of the estimate."
                        rows={5}
                        value={activeRecord.practicalMeaning}
                      />
                    </label>
                    <label className={styles.fullField}>
                      <span>Evidence-backed claim</span>
                      <textarea
                        disabled={!sourceLoaded}
                        maxLength={MAX_RESULTS_TEXT}
                        onChange={(event) => updateActiveRecord((current) => ({
                          ...current,
                          claim: event.target.value,
                        }))}
                        placeholder="Write one claim that does not exceed the design or aggregate evidence."
                        rows={3}
                        value={activeRecord.claim}
                      />
                    </label>
                    <label>
                      <span>Claim strength</span>
                      <select
                        disabled={!sourceLoaded}
                        onChange={(event) => updateActiveRecord((current) => ({
                          ...current,
                          claimStrength: event.target.value as ResultsClaimStrength,
                        }))}
                        value={activeRecord.claimStrength}
                      >
                        {CLAIM_STRENGTH_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Unexpected finding for this question</span>
                      <textarea
                        disabled={!sourceLoaded}
                        maxLength={MAX_RESULTS_TEXT}
                        onChange={(event) => updateActiveRecord((current) => ({
                          ...current,
                          unexpectedFinding: event.target.value,
                        }))}
                        placeholder="Optional: record an unexpected pattern without hiding or overinterpreting it."
                        rows={3}
                        value={activeRecord.unexpectedFinding}
                      />
                    </label>
                    {activeRecord.claimStrength === "causal-requires-external-justification" ? (
                      <label className={styles.fullField}>
                        <span>Required external causal-design justification</span>
                        <textarea
                          disabled={!sourceLoaded}
                          maxLength={MAX_RESULTS_TEXT}
                          onChange={(event) => updateActiveRecord((current) => ({
                            ...current,
                            causalJustification: event.target.value,
                          }))}
                          placeholder="Explain the design, assignment, assumptions, and external review supporting causal language. Phase 8.4 does not establish this."
                          rows={4}
                          value={activeRecord.causalJustification}
                        />
                      </label>
                    ) : null}
                    <label className={styles.fullField}>
                      <span>Question-specific limitations</span>
                      <textarea
                        disabled={!sourceLoaded}
                        maxLength={MAX_RESULTS_TEXT}
                        onChange={(event) => updateActiveRecord((current) => ({
                          ...current,
                          limitations: event.target.value,
                        }))}
                        placeholder="Record material design, measurement, sampling, missingness, model, and generalization limits."
                        rows={4}
                        value={activeRecord.limitations}
                      />
                    </label>
                  </div>
                </section>

                <section className={styles.assistantSection}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span>Optional researcher-side AI</span>
                      <h2>Review aggregate interpretation wording</h2>
                    </div>
                    <span className={styles.aiBadge}>OpenRouter BYOK</span>
                  </div>
                  <div className={styles.assistantBoundary}>
                    <AppIcon name="lock" />
                    <p>
                      Only this active aggregate result, frozen planning context,
                      and your current draft are sent. Participant rows, other
                      research questions, media, API keys, and local files are excluded.
                      Suggestions cannot alter the statistical output.
                    </p>
                  </div>
                  <label className={styles.assistantPrompt}>
                    <span>Review request</span>
                    <textarea
                      disabled={!sourceLoaded || activeResults.length === 0 || assistantLoading}
                      maxLength={MAX_RESULTS_ASSISTANT_PROMPT}
                      onChange={(event) => setAssistantPrompt(event.target.value)}
                      rows={3}
                      value={assistantPrompt}
                    />
                  </label>
                  <div className={styles.assistantActions}>
                    <button
                      disabled={
                        !sourceLoaded
                        || activeResults.length === 0
                        || assistantLoading
                        || !assistantPrompt.trim()
                      }
                      onClick={() => void requestAssistantReview()}
                      type="button"
                    >
                      <AppIcon name="lightbulb" />
                      {assistantLoading ? "Reviewing aggregate output…" : "Ask AI to review wording"}
                    </button>
                    <Link href="/settings/ai">Open API key settings</Link>
                  </div>
                  {assistantError ? (
                    <div className={styles.assistantError} role="alert">
                      <AppIcon name="alert" />{assistantError}
                    </div>
                  ) : null}
                  {assistantReview ? (
                    <div className={styles.assistantResponse}>
                      <header>
                        <div>
                          <span>Reviewable suggestion</span>
                          <strong>{assistantReview.servedModel || "OpenRouter model"}</strong>
                        </div>
                        {assistantReview.suggestion ? (
                          <button onClick={applyAssistantSuggestion} type="button">
                            Use as editable draft
                          </button>
                        ) : null}
                      </header>
                      <p>{assistantReview.reply}</p>
                      {assistantReview.suggestion ? (
                        <div className={styles.suggestionGrid}>
                          <article>
                            <span>Suggested claim</span>
                            <p>{assistantReview.suggestion.claim}</p>
                            <small>{assistantReview.suggestion.claimStrength}</small>
                          </article>
                          <article>
                            <span>Suggested limitations</span>
                            <p>{assistantReview.suggestion.limitations}</p>
                          </article>
                          {assistantReview.suggestion.overclaimWarnings.length > 0 ? (
                            <article>
                              <span>Overclaim warnings</span>
                              <ul>
                                {assistantReview.suggestion.overclaimWarnings.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </article>
                          ) : null}
                          {assistantReview.suggestion.reviewQuestions.length > 0 ? (
                            <article>
                              <span>Questions before applying</span>
                              <ul>
                                {assistantReview.suggestion.reviewQuestions.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </article>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                <section className={styles.robustnessSection}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span>Robustness and diagnostics</span>
                      <h2>Record what was actually reviewed</h2>
                    </div>
                    <span className={styles.manualBadge}>Researcher-authored only</span>
                  </div>
                  <div className={styles.boundaryBanner}>
                    <AppIcon name="alert" />
                    <p>
                      Phase 8.5 does not run sensitivity, reliability, robustness,
                      or triangulation analyses. Record external evidence only when
                      it was actually performed; “not performed” remains an explicit limitation.
                    </p>
                  </div>
                  {activePlanQuestion.sensitivityAnalyses.length > 0 ? (
                    <div className={styles.plannedChecks}>
                      <strong>Frozen sensitivity plan</strong>
                      <ul>
                        {activePlanQuestion.sensitivityAnalyses.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className={styles.formGrid}>
                    <label>
                      <span>Robustness / sensitivity status</span>
                      <select
                        disabled={!sourceLoaded}
                        onChange={(event) => updateActiveRecord((current) => ({
                          ...current,
                          robustnessStatus: event.target.value as ResultsRobustnessStatus,
                        }))}
                        value={activeRecord.robustnessStatus}
                      >
                        {ROBUSTNESS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Evidence or rationale</span>
                      <textarea
                        disabled={!sourceLoaded}
                        maxLength={MAX_RESULTS_TEXT}
                        onChange={(event) => updateActiveRecord((current) => ({
                          ...current,
                          robustnessEvidence: event.target.value,
                        }))}
                        placeholder="Identify the external analysis record and conclusion, or explain what was not performed and why."
                        rows={4}
                        value={activeRecord.robustnessEvidence}
                      />
                    </label>
                  </div>
                  {activeRecord.diagnosticResponses.length > 0 ? (
                    <div className={styles.advisoryResponses}>
                      <strong>Phase 8.4 advisory responses</strong>
                      {activeRecord.diagnosticResponses.map((diagnostic) => (
                        <label key={diagnostic.diagnosticId}>
                          <span>{diagnostic.label}</span>
                          <textarea
                            disabled={!sourceLoaded}
                            maxLength={MAX_RESULTS_TEXT}
                            onChange={(event) => updateActiveRecord((current) => ({
                              ...current,
                              diagnosticResponses: current.diagnosticResponses.map((item) => (
                                item.diagnosticId === diagnostic.diagnosticId
                                  ? { ...item, note: event.target.value }
                                  : item
                              )),
                            }))}
                            placeholder="Record what was checked, what remains uncertain, and how it limits the claim."
                            rows={3}
                            value={diagnostic.note}
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.noAdvisory}>No Phase 8.4 advisory diagnostic was recorded.</p>
                  )}
                </section>

                <section className={styles.outputsSection}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span>Stable aggregate outputs</span>
                      <h2>Table and confidence-interval figure</h2>
                    </div>
                  </div>
                  <div className={styles.outputGrid}>
                    <article className={styles.tableCard}>
                      <label>
                        <span>Table title</span>
                        <input
                          disabled={!sourceLoaded}
                          maxLength={500}
                          onChange={(event) => updateActiveRecord((current) => ({
                            ...current,
                            tableTitle: event.target.value,
                          }))}
                          value={activeRecord.tableTitle}
                        />
                      </label>
                      <div className={styles.tableWrap}>
                        <table>
                          <thead>
                            <tr>
                              <th>Method</th>
                              <th>N</th>
                              <th>Estimate</th>
                              <th>Interval</th>
                              <th>Missing</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeResults.map((result) => (
                              <tr key={result.analysisId}>
                                <td>{result.methodLabel}</td>
                                <td>{result.completeSampleSize}</td>
                                <td>{result.primaryEstimate.formatted}</td>
                                <td>[{result.interval.lower}, {result.interval.upper}]</td>
                                <td>{result.excludedMissingOrInvalid}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <label>
                        <span>Approved table caption</span>
                        <textarea
                          disabled={!sourceLoaded}
                          maxLength={MAX_RESULTS_TEXT}
                          onChange={(event) => updateActiveRecord((current) => ({
                            ...current,
                            tableCaption: event.target.value,
                          }))}
                          rows={3}
                          value={activeRecord.tableCaption}
                        />
                      </label>
                      <label className={styles.approvalCheck}>
                        <input
                          checked={activeRecord.tableApproved}
                          disabled={!sourceLoaded}
                          onChange={(event) => updateActiveRecord((current) => ({
                            ...current,
                            tableApproved: event.target.checked,
                          }))}
                          type="checkbox"
                        />
                        <span>I reviewed the values, title, and caption.</span>
                      </label>
                    </article>

                    <article className={styles.figureCard}>
                      <label>
                        <span>Figure title</span>
                        <input
                          disabled={!sourceLoaded}
                          maxLength={500}
                          onChange={(event) => updateActiveRecord((current) => ({
                            ...current,
                            figureTitle: event.target.value,
                          }))}
                          value={activeRecord.figureTitle}
                        />
                      </label>
                      <div className={styles.figurePreview}>
                        {activeResults.map((result) => (
                          <div className={styles.figureRow} key={result.analysisId}>
                            <span>{result.primaryEstimate.label}</span>
                            <div
                              className={styles.figureTrack}
                              style={intervalStyle(result, activeResults)}
                            >
                              <span className={styles.zeroLine} />
                              <span className={styles.intervalLine} />
                              <span className={styles.estimatePoint} />
                            </div>
                            <strong>{result.primaryEstimate.formatted}</strong>
                          </div>
                        ))}
                      </div>
                      <label>
                        <span>Approved figure caption</span>
                        <textarea
                          disabled={!sourceLoaded}
                          maxLength={MAX_RESULTS_TEXT}
                          onChange={(event) => updateActiveRecord((current) => ({
                            ...current,
                            figureCaption: event.target.value,
                          }))}
                          rows={3}
                          value={activeRecord.figureCaption}
                        />
                      </label>
                      <label className={styles.approvalCheck}>
                        <input
                          checked={activeRecord.figureApproved}
                          disabled={!sourceLoaded}
                          onChange={(event) => updateActiveRecord((current) => ({
                            ...current,
                            figureApproved: event.target.checked,
                          }))}
                          type="checkbox"
                        />
                        <span>I reviewed the scale, title, interval, and caption.</span>
                      </label>
                    </article>
                  </div>
                  <label className={styles.confirmationCheck}>
                    <input
                      checked={activeRecord.researcherConfirmed}
                      disabled={!sourceLoaded}
                      onChange={(event) => updateActiveRecord((current) => ({
                        ...current,
                        researcherConfirmed: event.target.checked,
                      }))}
                      type="checkbox"
                    />
                    <span>
                      I confirm that this question record reflects my interpretation
                      of the reviewed aggregate output and does not overstate the evidence.
                    </span>
                  </label>
                </section>

                <section className={styles.divergenceSection}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span>Frozen-plan divergence register</span>
                      <h2>Record departures and their impact</h2>
                    </div>
                    <button disabled={!sourceLoaded} onClick={addDivergence} type="button">
                      <AppIcon name="plus" />Add divergence
                    </button>
                  </div>
                  {activeDivergences.length > 0 ? (
                    <div className={styles.divergenceList}>
                      {activeDivergences.map((divergence) => (
                        <article key={divergence.id}>
                          <header>
                            <span>{divergence.source === "phase-8-4-execution" ? "Phase 8.4" : "Researcher record"}</span>
                            {divergence.source === "researcher-authored" ? (
                              <button
                                aria-label="Remove divergence"
                                disabled={!sourceLoaded}
                                onClick={() => removeDivergence(divergence.id)}
                                type="button"
                              >
                                <AppIcon name="trash" />
                              </button>
                            ) : null}
                          </header>
                          <label>
                            <span>Summary</span>
                            <textarea
                              disabled={!sourceLoaded}
                              maxLength={MAX_RESULTS_TEXT}
                              onChange={(event) => updateDivergence(divergence.id, (current) => ({
                                ...current,
                                summary: event.target.value,
                              }))}
                              rows={2}
                              value={divergence.summary}
                            />
                          </label>
                          <label>
                            <span>Rationale</span>
                            <textarea
                              disabled={!sourceLoaded}
                              maxLength={MAX_RESULTS_TEXT}
                              onChange={(event) => updateDivergence(divergence.id, (current) => ({
                                ...current,
                                rationale: event.target.value,
                              }))}
                              rows={3}
                              value={divergence.rationale}
                            />
                          </label>
                          <label>
                            <span>Impact on interpretation</span>
                            <textarea
                              disabled={!sourceLoaded}
                              maxLength={MAX_RESULTS_TEXT}
                              onChange={(event) => updateDivergence(divergence.id, (current) => ({
                                ...current,
                                impact: event.target.value,
                              }))}
                              rows={3}
                              value={divergence.impact}
                            />
                          </label>
                          <label className={styles.approvalCheck}>
                            <input
                              checked={divergence.acknowledged}
                              disabled={!sourceLoaded}
                              onChange={(event) => updateDivergence(divergence.id, (current) => ({
                                ...current,
                                acknowledged: event.target.checked,
                              }))}
                              type="checkbox"
                            />
                            <span>This divergence and its impact are acknowledged.</span>
                          </label>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.noDivergence}>
                      <AppIcon name="check-square" />
                      <p>No Phase 8.4 deviation is recorded for this research question.</p>
                    </div>
                  )}
                </section>

                <section className={styles.globalSection}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span>Study-level interpretation</span>
                      <h2>Limitations, boundaries, and unexpected findings</h2>
                    </div>
                  </div>
                  <div className={styles.formGrid}>
                    <label>
                      <span>Study-level limitations</span>
                      <textarea
                        disabled={!sourceLoaded}
                        maxLength={MAX_RESULTS_TEXT}
                        onChange={(event) => persistChanges({
                          studyLimitations: event.target.value,
                        })}
                        placeholder="Summarize the limitations that apply across research questions."
                        rows={5}
                        value={document?.studyLimitations ?? ""}
                      />
                    </label>
                    <label>
                      <span>Boundary conditions</span>
                      <textarea
                        disabled={!sourceLoaded}
                        maxLength={MAX_RESULTS_TEXT}
                        onChange={(event) => persistChanges({
                          boundaryConditions: event.target.value,
                        })}
                        placeholder="State where, for whom, and under which conditions the interpretation may apply."
                        rows={5}
                        value={document?.boundaryConditions ?? ""}
                      />
                    </label>
                    <label className={styles.fullField}>
                      <span>Unexpected findings across the study</span>
                      <textarea
                        disabled={!sourceLoaded || Boolean(document?.noUnexpectedFindingsConfirmed)}
                        maxLength={MAX_RESULTS_TEXT}
                        onChange={(event) => persistChanges({
                          unexpectedFindings: event.target.value,
                        })}
                        placeholder="Record unexpected findings, or use the confirmation below when none were identified."
                        rows={4}
                        value={document?.unexpectedFindings ?? ""}
                      />
                    </label>
                    <label className={`${styles.approvalCheck} ${styles.fullField}`}>
                      <input
                        checked={document?.noUnexpectedFindingsConfirmed ?? false}
                        disabled={!sourceLoaded || Boolean(document?.unexpectedFindings.trim())}
                        onChange={(event) => persistChanges({
                          noUnexpectedFindingsConfirmed: event.target.checked,
                        })}
                        type="checkbox"
                      />
                      <span>I reviewed the aggregate outputs and identified no unexpected finding to record.</span>
                    </label>
                  </div>
                </section>
              </>
            ) : (
              <section className={styles.noDocument}>
                <AppIcon name="upload" />
                <h2>Verify the Phase 8.4 package to begin</h2>
                <p>
                  The interpretation document is created only after the complete
                  aggregate provenance chain passes.
                </p>
              </section>
            )}
          </section>

          <aside className={styles.gateRail}>
            <span className={styles.gateLabel}>Results Record gate</span>
            <h2>{ready ? "Ready for Stage 7" : "Complete the interpretation"}</h2>
            <p className={styles.gateIntro}>
              Finalize only after checking every linked estimate, diagnostic,
              claim, limitation, divergence, table, and figure.
            </p>
            <ul className={styles.gateList}>
              <GateItem complete={sourceLoaded} label="Aggregate provenance verified" />
              <GateItem complete={contentComplete} label="Required RQ records complete" />
              <GateItem complete={reviewComplete} label="Researcher review confirmed" />
              <GateItem complete={exportComplete} label="Results Record exported" />
            </ul>

            {document?.readiness.issues.length ? (
              <details className={styles.issueDisclosure}>
                <summary>{document.readiness.issues.length} item(s) remain</summary>
                <ul>
                  {document.readiness.issues.slice(0, 12).map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </details>
            ) : null}

            <button
              className={styles.reviewButton}
              disabled={!sourceLoaded || !contentComplete || reviewComplete}
              onClick={confirmReview}
              type="button"
            >
              <AppIcon name="check-square" />
              {reviewComplete ? "Review confirmed" : "Confirm interpretation review"}
            </button>
            <button
              className={styles.exportButton}
              disabled={!sourceLoaded || !reviewComplete || processing}
              onClick={() => void exportResultsRecord()}
              type="button"
            >
              <AppIcon name="save" />
              {processing
                ? "Preparing record…"
                : exportComplete
                  ? "Export Results Record again"
                  : "Export Results Record"}
            </button>

            <div className={styles.privacyBoundary}>
              <AppIcon name="lock" />
              <div>
                <strong>No participant rows enter Phase 8.5</strong>
                <p>
                  Only verified aggregate outputs, bounded researcher-authored
                  interpretation, checksums, and timestamps are persisted.
                </p>
              </div>
            </div>

            <dl className={styles.provenance}>
              <div><dt>Status</dt><dd>{statusLabel(document)}</dd></div>
              <div><dt>Plan snapshot</dt><dd>{formatDate(plan.updatedAt)}</dd></div>
              <div><dt>Analysis run</dt><dd>{formatDate(execution.lastRun?.runAt ?? "")}</dd></div>
              <div><dt>Review</dt><dd>{formatDate(document?.reviewedAt ?? "")}</dd></div>
              <div><dt>Export</dt><dd>{formatDate(document?.exportedAt ?? "")}</dd></div>
              <div><dt>Participant rows</dt><dd>Rejected</dd></div>
            </dl>

            <div className={styles.scopeNote}>
              <AppIcon name="help" />
              <p>
                This Results Record is not scientific-validity, causal-inference,
                reproducibility, ethics, or publication certification.
              </p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
