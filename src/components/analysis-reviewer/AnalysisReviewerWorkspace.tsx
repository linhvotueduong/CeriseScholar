"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  ANALYSIS_REVIEW_EXPORT_BOUNDARY,
  ANALYSIS_REVIEW_EXPORT_TYPE,
  buildAnalysisReviewExport,
  createAnalysisReviewerDocument,
  decideAnalysisReviewerSuggestion,
  isAnalysisReviewerReady,
  markAnalysisReviewerReviewed,
  readAnalysisReviewerDocument,
  recordAnalysisReviewerBatch,
  updateAnalysisReviewerNarrative,
  writeAnalysisReviewerDocument,
  type AnalysisReviewerDependencies,
  type AnalysisReviewerDocument,
  type AnalysisReviewerSuggestionRecord,
} from "@/lib/research/analysisReviewer";
import {
  MAX_ANALYSIS_REVIEWER_PROMPT,
  createAnalysisReviewerContext,
  type AnalysisReviewerResponse,
} from "@/lib/research/analysisReviewerAssistant";
import {
  isAnalysisExecutionReady,
  readAnalysisExecutionDocument,
  type AnalysisExecutionDocument,
} from "@/lib/research/analysisExecution";
import {
  readAnalysisPlanDocument,
  type AnalysisPlanDocument,
} from "@/lib/research/analysisPlan";
import {
  MAX_RESULTS_RECORD_PACKAGE_BYTES,
  isAnalysisInterpretationReady,
  readAnalysisInterpretationDocument,
  verifyResultsRecordExport,
  type AnalysisInterpretationDocument,
  type ResultsRecordExport,
} from "@/lib/research/analysisResults";
import {
  MAX_ROBUSTNESS_RECORD_BYTES,
  isAnalysisRobustnessReady,
  readAnalysisRobustnessDocument,
  verifyAggregateRobustnessRecordExport,
  type AnalysisRobustnessDocument,
  type RobustnessRecordPackage,
} from "@/lib/research/analysisRobustness";
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
import styles from "./AnalysisReviewerWorkspace.module.css";

interface AnalysisReviewerWorkspaceProps {
  projectId: string;
  projectName: string;
}

interface ReviewerApiResponse extends AnalysisReviewerResponse {
  error?: string;
  generatedAt?: string;
  requestChecksum?: string;
  servedModel?: string;
}

function supportsAnalysis(release: ExperimentRelease): boolean {
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
    .filter(supportsAnalysis)
    .sort((left, right) => right.releaseNumber - left.releaseNumber);
}

function safeExportName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "cerise-analysis-review";
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

function formatDate(value: string): string {
  if (!value) return "Not yet";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Not yet"
    : new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
}

function statusLabel(document: AnalysisReviewerDocument | null): string {
  if (!document) return "Verify records";
  if (document.readiness.status === "needs-review") return "Review required";
  if (document.readiness.status === "needs-decisions") return "Decisions required";
  if (document.readiness.status === "needs-confirmation") return "Confirmation required";
  if (document.readiness.status === "needs-export") return "Export required";
  return "Ready";
}

function categoryLabel(value: AnalysisReviewerSuggestionRecord["category"]): string {
  return value.split("-").map((word) => (
    word === "rq" ? "RQ" : `${word.charAt(0).toUpperCase()}${word.slice(1)}`
  )).join(" ");
}

function GateItem({ complete, label }: { complete: boolean; label: string }) {
  return (
    <li className={complete ? styles.complete : ""}>
      <span>{complete ? <AppIcon name="check-square" /> : null}</span>
      {label}
    </li>
  );
}

export default function AnalysisReviewerWorkspace({
  projectId,
  projectName,
}: AnalysisReviewerWorkspaceProps) {
  const [releases, setReleases] = useState<ExperimentRelease[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [plan, setPlan] = useState<AnalysisPlanDocument | null>(null);
  const [preparation, setPreparation] = useState<DataPreparationDocument | null>(null);
  const [execution, setExecution] = useState<AnalysisExecutionDocument | null>(null);
  const [interpretation, setInterpretation] =
    useState<AnalysisInterpretationDocument | null>(null);
  const [robustness, setRobustness] = useState<AnalysisRobustnessDocument | null>(null);
  const [reviewDocument, setReviewDocument] = useState<AnalysisReviewerDocument | null>(null);
  const [resultsRecord, setResultsRecord] = useState<ResultsRecordExport | null>(null);
  const [robustnessRecord, setRobustnessRecord] =
    useState<RobustnessRecordPackage | null>(null);
  const [resultsFilename, setResultsFilename] = useState("");
  const [robustnessFilename, setRobustnessFilename] = useState("");
  const [activeQuestionId, setActiveQuestionId] = useState("");
  const [prompt, setPrompt] = useState(
    "Review alignment, diagnostics, robustness, overclaiming, and the most useful next decision. Draft wording only when it is supported by the cited aggregate evidence.",
  );
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const resultsInput = useRef<HTMLInputElement>(null);
  const robustnessInput = useRef<HTMLInputElement>(null);

  const selectedRelease = useMemo(
    () => releases.find((release) => release.releaseId === selectedReleaseId) ?? null,
    [releases, selectedReleaseId],
  );
  const dependencies = useMemo<AnalysisReviewerDependencies | null>(() => (
    selectedRelease && plan && preparation && execution && interpretation && robustness
      ? {
          release: selectedRelease,
          plan,
          preparation,
          execution,
          interpretation,
          robustness,
        }
      : null
  ), [execution, interpretation, plan, preparation, robustness, selectedRelease]);
  const activeQuestion = useMemo(
    () => plan?.researchQuestions.find((item) => item.id === activeQuestionId) ?? null,
    [activeQuestionId, plan],
  );
  const activeBatches = useMemo(
    () => reviewDocument?.batches.filter(
      (batch) => batch.researchQuestionId === activeQuestionId,
    ) ?? [],
    [activeQuestionId, reviewDocument],
  );
  const activeSuggestions = useMemo(
    () => reviewDocument?.suggestions.filter(
      (suggestion) => suggestion.researchQuestionId === activeQuestionId,
    ) ?? [],
    [activeQuestionId, reviewDocument],
  );
  const evidenceLabels = useMemo(() => {
    if (!plan || !resultsRecord || !robustnessRecord || !activeQuestionId) {
      return new Map<string, string>();
    }
    const context = createAnalysisReviewerContext(
      plan,
      resultsRecord.package,
      robustnessRecord,
      activeQuestionId,
    );
    return new Map(context?.evidenceIndex.map((item) => [item.id, item.label]) ?? []);
  }, [activeQuestionId, plan, resultsRecord, robustnessRecord]);
  const activeResult = useMemo(
    () => resultsRecord?.package.aggregateAnalysis.results.find(
      (item) => item.researchQuestionId === activeQuestionId,
    ) ?? null,
    [activeQuestionId, resultsRecord],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const candidates = readLocalExperimentReleases(window.localStorage, projectId);
      const local = (await verifiedExperimentReleases(candidates, projectId))
        .filter(supportsAnalysis);
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
      setInterpretation(null);
      setRobustness(null);
      setReviewDocument(null);
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
    const nextInterpretation = nextPlan
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
    const nextRobustness = nextPlan
      && nextPreparation
      && nextExecution
      && isAnalysisExecutionReady(nextExecution)
      ? readAnalysisRobustnessDocument(
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
    setInterpretation(nextInterpretation);
    setRobustness(nextRobustness);
    setResultsRecord(null);
    setRobustnessRecord(null);
    setResultsFilename("");
    setRobustnessFilename("");
    setDecisionNotes({});
    setError("");
    setNotice("");
    if (
      nextPlan
      && nextPreparation
      && nextExecution
      && nextInterpretation
      && nextRobustness
      && isAnalysisInterpretationReady(nextInterpretation)
      && isAnalysisRobustnessReady(nextRobustness)
    ) {
      const nextDependencies = {
        release: selectedRelease,
        plan: nextPlan,
        preparation: nextPreparation,
        execution: nextExecution,
        interpretation: nextInterpretation,
        robustness: nextRobustness,
      };
      const stored = readAnalysisReviewerDocument(
        window.localStorage,
        nextDependencies,
      );
      setReviewDocument(stored);
      setActiveQuestionId(
        stored?.reviewScope[0]
        ?? nextPlan.researchQuestions.find((question) => (
          nextInterpretation.researchQuestions.some((record) => (
            record.researchQuestionId === question.id && record.linkedResultIds.length > 0
          ))
        ))?.id
        ?? "",
      );
    } else {
      setReviewDocument(null);
      setActiveQuestionId("");
    }
  }, [selectedRelease]);

  useEffect(() => {
    if (!dependencies || !resultsRecord || !robustnessRecord) return;
    const existing = readAnalysisReviewerDocument(window.localStorage, dependencies);
    const next = existing
      && existing.source.resultsRecordChecksum
        === resultsRecord.package.integrity.packageChecksum
      && existing.source.robustnessRecordChecksum
        === robustnessRecord.integrity.packageChecksum
      ? existing
      : createAnalysisReviewerDocument(
        dependencies,
        resultsRecord.package,
        robustnessRecord,
      );
    if (!next) {
      setError("The two aggregate records do not describe the same frozen analysis.");
      return;
    }
    try {
      const saved = writeAnalysisReviewerDocument(
        window.localStorage,
        dependencies,
        next,
      );
      setReviewDocument(saved);
      setActiveQuestionId((current) => (
        saved.reviewScope.includes(current) ? current : saved.reviewScope[0] ?? ""
      ));
      setNotice(
        "Both aggregate records are verified. Participant rows and local source files remain excluded.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review document could not be initialized.");
    }
  }, [dependencies, resultsRecord, robustnessRecord]);

  const saveDocument = useCallback((next: AnalysisReviewerDocument) => {
    if (!dependencies) return;
    const saved = writeAnalysisReviewerDocument(
      window.localStorage,
      dependencies,
      next,
    );
    setReviewDocument(saved);
  }, [dependencies]);

  const readJsonFile = async (file: File, maximum: number): Promise<unknown> => {
    if (file.size <= 0 || file.size > maximum) {
      throw new Error("The selected JSON is empty or exceeds its bounded aggregate-record limit.");
    }
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()),
      );
    } catch {
      throw new Error("The selected file is not valid UTF-8 JSON.");
    }
  };

  const handleResultsRecord = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !dependencies) return;
    setProcessing(true);
    setError("");
    try {
      const parsed = await readJsonFile(file, MAX_RESULTS_RECORD_PACKAGE_BYTES);
      const verified = await verifyResultsRecordExport(
        parsed,
        dependencies.release,
        dependencies.plan,
        dependencies.preparation,
        dependencies.execution,
        dependencies.interpretation,
      );
      setResultsRecord(verified);
      setResultsFilename(file.name.slice(0, 200));
      setNotice("Phase 8.5 Results Record verified.");
    } catch (cause) {
      setResultsRecord(null);
      setResultsFilename("");
      setError(cause instanceof Error ? cause.message : "The Results Record could not be verified.");
    } finally {
      setProcessing(false);
    }
  };

  const handleRobustnessRecord = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !dependencies) return;
    setProcessing(true);
    setError("");
    try {
      const parsed = await readJsonFile(file, MAX_ROBUSTNESS_RECORD_BYTES);
      const verified = await verifyAggregateRobustnessRecordExport(
        parsed,
        dependencies.robustness,
        dependencies.release,
        dependencies.plan,
        dependencies.preparation,
        dependencies.execution,
      );
      setRobustnessRecord(verified);
      setRobustnessFilename(file.name.slice(0, 200));
      setNotice("Phase 8.7A aggregate Robustness Record verified.");
    } catch (cause) {
      setRobustnessRecord(null);
      setRobustnessFilename("");
      setError(cause instanceof Error ? cause.message : "The Robustness Record could not be verified.");
    } finally {
      setProcessing(false);
    }
  };

  const requestReview = async () => {
    if (
      !dependencies
      || !reviewDocument
      || !resultsRecord
      || !robustnessRecord
      || !activeQuestionId
      || !prompt.trim()
    ) {
      setError("Verify both aggregate records and select a research question first.");
      return;
    }
    const context = createAnalysisReviewerContext(
      dependencies.plan,
      resultsRecord.package,
      robustnessRecord,
      activeQuestionId,
    );
    if (!context) {
      setError("The selected research question does not have a complete aggregate review context.");
      return;
    }
    setAssistantLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/ai/analysis-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, prompt, context }),
      });
      const body = await response.json().catch(() => null) as ReviewerApiResponse | null;
      if (
        !response.ok
        || !body
        || !body.generatedAt
        || !body.requestChecksum
      ) {
        throw new Error(body?.error || "The AI Analysis Reviewer could not complete this request.");
      }
      const next = await recordAnalysisReviewerBatch(
        reviewDocument,
        body,
        activeQuestionId,
        body.servedModel ?? "OpenRouter model",
        body.requestChecksum,
        dependencies,
        body.generatedAt,
      );
      saveDocument(next);
      setNotice(
        body.suggestions.length > 0
          ? "Aggregate AI review recorded. Accept or decline every suggestion with your rationale."
          : "Aggregate AI review recorded with no structured suggestions; review the summary and continue.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The AI review request failed.");
    } finally {
      setAssistantLoading(false);
    }
  };

  const decideSuggestion = (
    suggestion: AnalysisReviewerSuggestionRecord,
    decision: "accepted" | "declined",
  ) => {
    if (!reviewDocument || !dependencies) return;
    try {
      const next = decideAnalysisReviewerSuggestion(
        reviewDocument,
        suggestion.id,
        decision,
        decisionNotes[suggestion.id] ?? "",
        dependencies,
      );
      saveDocument(next);
      setDecisionNotes((current) => ({ ...current, [suggestion.id]: "" }));
      setError("");
      setNotice(
        decision === "accepted"
          ? "Suggestion accepted into the decision ledger. No upstream record was changed."
          : "Suggestion declined and the rationale was preserved in the decision ledger.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The decision could not be saved.");
    }
  };

  const updateNarrative = (
    field: "researcherConclusion" | "remainingLimitations",
    value: string,
  ) => {
    if (!reviewDocument || !dependencies) return;
    try {
      const next = updateAnalysisReviewerNarrative(
        reviewDocument,
        {
          researcherConclusion: field === "researcherConclusion"
            ? value
            : reviewDocument.researcherConclusion,
          remainingLimitations: field === "remainingLimitations"
            ? value
            : reviewDocument.remainingLimitations,
        },
        dependencies,
      );
      saveDocument(next);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review conclusion could not be saved.");
    }
  };

  const confirmReview = () => {
    if (!reviewDocument || !dependencies || !resultsRecord || !robustnessRecord) {
      setError("Re-select and verify both aggregate records before confirming review.");
      return;
    }
    try {
      saveDocument(markAnalysisReviewerReviewed(reviewDocument, dependencies));
      setError("");
      setNotice("Researcher review confirmed. The AI did not certify or alter the analysis.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review could not be confirmed.");
    }
  };

  const exportReview = async () => {
    if (!reviewDocument || !dependencies || !resultsRecord || !robustnessRecord) {
      setError("Re-select and verify both aggregate records before export.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      const result = await buildAnalysisReviewExport(reviewDocument, dependencies);
      saveDocument(result.document);
      downloadJson(
        `${safeExportName(projectName)}-ai-analysis-review-v${dependencies.release.releaseNumber}.json`,
        result.export,
      );
      setNotice("Aggregate AI review and decision ledger exported. It contains no participant rows.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The AI review could not be exported.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.centered}>
        <div className={styles.spinner} />
        <p>Loading the aggregate analysis-review boundary…</p>
      </main>
    );
  }

  const recordsReady = Boolean(resultsRecord && robustnessRecord);
  const ready = isAnalysisReviewerReady(reviewDocument);
  const reviewedQuestions = new Set(
    reviewDocument?.batches.map((batch) => batch.researchQuestionId) ?? [],
  ).size;
  const pendingSuggestions = reviewDocument?.suggestions.filter(
    (suggestion) => suggestion.decision === "pending",
  ).length ?? 0;
  const acceptedSuggestions = reviewDocument?.suggestions.filter(
    (suggestion) => suggestion.decision === "accepted",
  ).length ?? 0;

  return (
    <main className={styles.app}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/dashboard">Cerise Scholar</Link>
        <Link className={styles.returnLink} href={`/research-path/${projectId}`}>
          <AppIcon name="arrow-left" />
          Research Path
        </Link>
        <span className={styles.projectName}>{projectName}</span>
        <span className={styles.localBadge}>
          <AppIcon name="lock" />
          Aggregate evidence only
        </span>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Phase 8.8 · AI Analysis Reviewer</p>
          <h1>Challenge the analysis without giving AI the study data</h1>
          <p>
            Review plan alignment, diagnostics, robustness, claims, result wording,
            and figure choices from verified aggregate records. Every suggestion
            remains advisory and requires an explicit researcher decision.
          </p>
        </div>
        <div className={styles.heroBoundary}>
          <AppIcon name="lock" />
          <div>
            <strong>No participant rows. No autonomous analysis.</strong>
            <span>
              AI cannot change hypotheses, exclusions, methods, estimates,
              interpretations, or upstream checksums.
            </span>
          </div>
        </div>
      </section>

      <section className={styles.contextBar}>
        <div>
          <span>Frozen release</span>
          <select
            aria-label="Frozen analysis release"
            onChange={(event) => setSelectedReleaseId(event.target.value)}
            value={selectedReleaseId}
          >
            {releases.map((release) => (
              <option key={release.releaseId} value={release.releaseId}>
                Release v{release.releaseNumber}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span>Status</span>
          <strong>{statusLabel(reviewDocument)}</strong>
        </div>
        <div>
          <span>Reviewed questions</span>
          <strong>{reviewedQuestions}/{reviewDocument?.reviewScope.length ?? 0}</strong>
        </div>
        <div>
          <span>Decision ledger</span>
          <strong>{acceptedSuggestions} accepted · {pendingSuggestions} pending</strong>
        </div>
      </section>

      <div className={styles.workspace}>
        <aside className={styles.workflowRail}>
          <span className={styles.railLabel}>Review workflow</span>
          <ol>
            {[
              ["Verify Results Record", Boolean(resultsRecord)],
              ["Verify Robustness Record", Boolean(robustnessRecord)],
              ["Review each RQ", Boolean(
                reviewDocument
                && reviewedQuestions === reviewDocument.reviewScope.length,
              )],
              ["Decide every suggestion", Boolean(reviewDocument && pendingSuggestions === 0)],
              ["Confirm researcher review", Boolean(reviewDocument?.reviewedAt)],
              ["Export decision ledger", Boolean(reviewDocument?.exportedAt)],
            ].map(([label, complete], index) => (
              <li className={complete ? styles.workflowComplete : ""} key={String(label)}>
                <span>{index + 1}</span>
                <p>{label}</p>
                {complete ? <AppIcon name="check-square" /> : null}
              </li>
            ))}
          </ol>

          <span className={styles.railLabel}>Research questions</span>
          <div className={styles.questionList}>
            {reviewDocument?.reviewScope.map((questionId, index) => {
              const question = plan?.researchQuestions.find((item) => item.id === questionId);
              const reviewed = reviewDocument.batches.some(
                (batch) => batch.researchQuestionId === questionId,
              );
              return (
                <button
                  className={questionId === activeQuestionId ? styles.questionActive : ""}
                  key={questionId}
                  onClick={() => setActiveQuestionId(questionId)}
                  type="button"
                >
                  <span>RQ{index + 1}</span>
                  <p>{question?.question || questionId}</p>
                  {reviewed ? <AppIcon name="check-square" /> : null}
                </button>
              );
            })}
          </div>

          <div className={styles.boundaryCard}>
            <AppIcon name="shield" />
            <strong>Human decision boundary</strong>
            <p>
              “Accepted” means accepted for researcher consideration. It never
              rewrites a frozen or reviewed analysis artifact.
            </p>
          </div>
        </aside>

        <section className={styles.main}>
          <section className={styles.sourceCard}>
            <div className={styles.sectionHeading}>
              <div>
                <span>Verified aggregate inputs</span>
                <h2>Reconnect the exact reviewed records</h2>
              </div>
              <small>Required after reload</small>
            </div>
            <div className={styles.sourceGrid}>
              <article className={resultsRecord ? styles.sourceReady : ""}>
                <div className={styles.sourceIcon}><AppIcon name="file" /></div>
                <div>
                  <strong>Phase 8.5 Results Record</strong>
                  <p>{resultsFilename || "Frozen results, interpretation, tables, and figures"}</p>
                </div>
                <button
                  disabled={!dependencies || processing}
                  onClick={() => resultsInput.current?.click()}
                  type="button"
                >
                  {resultsRecord ? "Replace" : "Select JSON"}
                </button>
                <input
                  accept="application/json,.json"
                  hidden
                  onChange={(event) => void handleResultsRecord(event)}
                  ref={resultsInput}
                  type="file"
                />
              </article>
              <article className={robustnessRecord ? styles.sourceReady : ""}>
                <div className={styles.sourceIcon}><AppIcon name="target" /></div>
                <div>
                  <strong>Phase 8.7A Robustness Record</strong>
                  <p>{robustnessFilename || "Primary comparisons, alternatives, and researcher review"}</p>
                </div>
                <button
                  disabled={!dependencies || processing}
                  onClick={() => robustnessInput.current?.click()}
                  type="button"
                >
                  {robustnessRecord ? "Replace" : "Select JSON"}
                </button>
                <input
                  accept="application/json,.json"
                  hidden
                  onChange={(event) => void handleRobustnessRecord(event)}
                  ref={robustnessInput}
                  type="file"
                />
              </article>
            </div>
            <p className={styles.sourceBoundary}>
              <AppIcon name="lock" />
              Files are parsed and verified in this tab. Only the active
              question’s bounded planning context and aggregate evidence may be sent.
            </p>
          </section>

          {error ? <div className={styles.error} role="alert">{error}</div> : null}
          {notice ? <div className={styles.notice} role="status">{notice}</div> : null}

          {!dependencies ? (
            <section className={styles.emptyState}>
              <AppIcon name="lock" />
              <h2>Complete the deterministic workflow first</h2>
              <p>
                Phase 8.8 requires ready, exported Phase 8.5 and Phase 8.7A local
                receipts for the same immutable release.
              </p>
            </section>
          ) : !recordsReady ? (
            <section className={styles.emptyState}>
              <AppIcon name="upload" />
              <h2>Verify both aggregate records</h2>
              <p>
                The reviewer remains locked until the Results Record and
                Robustness Record pass their provenance and checksum checks.
              </p>
            </section>
          ) : activeQuestion && reviewDocument ? (
            <>
              <section className={styles.questionHeader}>
                <div>
                  <span>{activeQuestion.designation} research question</span>
                  <h2>{activeQuestion.question}</h2>
                  <p>{activeQuestion.plannedMethod} · {activeQuestion.effectSize}</p>
                </div>
                {activeResult ? (
                  <div className={styles.estimateCard}>
                    <span>Reviewed aggregate estimate</span>
                    <strong>{activeResult.primaryEstimate.formatted}</strong>
                    <small>
                      {Math.round(activeResult.interval.level * 100)}% interval{" "}
                      {activeResult.interval.lower.toLocaleString()} to{" "}
                      {activeResult.interval.upper.toLocaleString()} · N={activeResult.completeSampleSize}
                    </small>
                  </div>
                ) : null}
              </section>

              <section className={styles.requestCard}>
                <div className={styles.sectionHeading}>
                  <div>
                    <span>OpenRouter BYOK · aggregate only</span>
                    <h2>Request a bounded reviewer pass</h2>
                  </div>
                  <Link href="/settings/ai">API key settings</Link>
                </div>
                <label>
                  <span>Reviewer focus</span>
                  <textarea
                    disabled={assistantLoading}
                    maxLength={MAX_ANALYSIS_REVIEWER_PROMPT}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={4}
                    value={prompt}
                  />
                </label>
                <div className={styles.requestActions}>
                  <p>
                    Evidence references are constrained to the verified plan,
                    aggregate result, diagnostics, interpretation, divergences,
                    and robustness record shown for this RQ.
                  </p>
                  <button
                    disabled={assistantLoading || !prompt.trim()}
                    onClick={() => void requestReview()}
                    type="button"
                  >
                    <AppIcon name="lightbulb" />
                    {assistantLoading ? "Reviewing aggregate evidence…" : "Run AI review"}
                  </button>
                </div>
              </section>

              <section className={styles.ledgerSection}>
                <div className={styles.sectionHeading}>
                  <div>
                    <span>Auditable decision ledger</span>
                    <h2>Researcher decisions for this question</h2>
                  </div>
                  <small>{activeBatches.length} review pass(es)</small>
                </div>

                {activeBatches.length === 0 ? (
                  <div className={styles.noSuggestions}>
                    Run the reviewer once for this question. AI use never replaces
                    the deterministic checks or researcher judgment.
                  </div>
                ) : (
                  activeBatches.map((batch) => (
                    <article className={styles.batchCard} key={batch.id}>
                      <header>
                        <div>
                          <span>{formatDate(batch.generatedAt)}</span>
                          <strong>{batch.servedModel}</strong>
                        </div>
                        <code>{batch.responseChecksum.slice(0, 24)}…</code>
                      </header>
                      <p>{batch.summary}</p>
                    </article>
                  ))
                )}

                <div className={styles.suggestionList}>
                  {activeSuggestions.map((suggestion) => (
                    <article
                      className={`${styles.suggestionCard} ${styles[`priority_${suggestion.priority}`]}`}
                      key={suggestion.id}
                    >
                      <header>
                        <div>
                          <span>{categoryLabel(suggestion.category)}</span>
                          <h3>{suggestion.title}</h3>
                        </div>
                        <strong>{suggestion.priority}</strong>
                      </header>
                      <div className={styles.suggestionBody}>
                        <div>
                          <span>Observation</span>
                          <p>{suggestion.observation}</p>
                        </div>
                        <div>
                          <span>Reviewer recommendation</span>
                          <p>{suggestion.recommendation}</p>
                        </div>
                        <div>
                          <span>Boundary</span>
                          <p>{suggestion.limitation}</p>
                        </div>
                      </div>
                      <div className={styles.evidenceRefs}>
                        {suggestion.evidenceReferences.map((reference) => (
                          <span key={reference}>
                            {evidenceLabels.get(reference) || reference}
                          </span>
                        ))}
                      </div>
                      {suggestion.decision === "pending" ? (
                        <div className={styles.decisionBox}>
                          <label>
                            <span>Researcher rationale</span>
                            <textarea
                              maxLength={4_000}
                              onChange={(event) => setDecisionNotes((current) => ({
                                ...current,
                                [suggestion.id]: event.target.value.slice(0, 4_000),
                              }))}
                              placeholder="Explain why this suggestion should or should not guide later researcher work."
                              rows={3}
                              value={decisionNotes[suggestion.id] ?? ""}
                            />
                          </label>
                          <div>
                            <button
                              onClick={() => decideSuggestion(suggestion, "declined")}
                              type="button"
                            >
                              Decline
                            </button>
                            <button
                              className={styles.acceptButton}
                              onClick={() => decideSuggestion(suggestion, "accepted")}
                              type="button"
                            >
                              Accept into ledger
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.decidedBox}>
                          <strong>{suggestion.decision}</strong>
                          <p>{suggestion.researcherRationale}</p>
                          <span>{formatDate(suggestion.decidedAt)}</span>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>

              <section className={styles.conclusionCard}>
                <div className={styles.sectionHeading}>
                  <div>
                    <span>Researcher-owned conclusion</span>
                    <h2>Close the AI review without overstating it</h2>
                  </div>
                </div>
                <div className={styles.conclusionGrid}>
                  <label>
                    <span>Overall conclusion from the review</span>
                    <textarea
                      maxLength={4_000}
                      onChange={(event) => updateNarrative(
                        "researcherConclusion",
                        event.target.value,
                      )}
                      placeholder="State which suggestions matter and what, if anything, the researcher will do next."
                      rows={5}
                      value={reviewDocument.researcherConclusion}
                    />
                  </label>
                  <label>
                    <span>Limitations that remain</span>
                    <textarea
                      maxLength={4_000}
                      onChange={(event) => updateNarrative(
                        "remainingLimitations",
                        event.target.value,
                      )}
                      placeholder="State what the AI review, aggregate evidence, and current method registry still cannot establish."
                      rows={5}
                      value={reviewDocument.remainingLimitations}
                    />
                  </label>
                </div>
              </section>
            </>
          ) : null}
        </section>

        <aside className={styles.gateRail}>
          <span className={styles.railLabel}>Completion gate</span>
          <div className={styles.statusPill}>{statusLabel(reviewDocument)}</div>
          <ul>
            <GateItem complete={Boolean(resultsRecord)} label="Results Record verified" />
            <GateItem complete={Boolean(robustnessRecord)} label="Robustness Record verified" />
            <GateItem
              complete={Boolean(
                reviewDocument
                && reviewedQuestions === reviewDocument.reviewScope.length,
              )}
              label="Every executed RQ reviewed"
            />
            <GateItem
              complete={Boolean(reviewDocument && pendingSuggestions === 0)}
              label="Every suggestion decided"
            />
            <GateItem
              complete={Boolean(
                reviewDocument?.researcherConclusion
                && reviewDocument.remainingLimitations,
              )}
              label="Researcher conclusion recorded"
            />
            <GateItem complete={Boolean(reviewDocument?.reviewedAt)} label="Review confirmed" />
            <GateItem complete={Boolean(reviewDocument?.exportedAt)} label="Ledger exported" />
          </ul>

          {reviewDocument?.readiness.issues.length ? (
            <details className={styles.issues}>
              <summary>{reviewDocument.readiness.issues.length} item(s) remain</summary>
              <ul>
                {reviewDocument.readiness.issues.map((issue) => <li key={issue}>{issue}</li>)}
              </ul>
            </details>
          ) : null}

          <button
            className={styles.confirmButton}
            disabled={
              !recordsReady
              || !reviewDocument
              || reviewDocument.readiness.status !== "needs-confirmation"
            }
            onClick={confirmReview}
            type="button"
          >
            <AppIcon name="check-square" />
            Confirm researcher review
          </button>
          <button
            className={styles.exportButton}
            disabled={
              processing
              || !recordsReady
              || reviewDocument?.readiness.status !== "needs-export"
            }
            onClick={() => void exportReview()}
            type="button"
          >
            <AppIcon name="download" />
            Export decision ledger
          </button>

          <div className={styles.exportBoundary}>
            <strong>{ready ? "Export verified locally" : "Advisory workflow"}</strong>
            <p>
              The export records AI suggestions, researcher decisions, source
              checksums, and explicit boundaries. It includes no participant rows.
            </p>
            {reviewDocument?.lastExportChecksum ? (
              <code>{reviewDocument.lastExportChecksum}</code>
            ) : null}
          </div>
        </aside>
      </div>

      <footer className={styles.footer}>
        <span>{ANALYSIS_REVIEW_EXPORT_TYPE}</span>
        <span>{ANALYSIS_REVIEW_EXPORT_BOUNDARY}</span>
      </footer>
    </main>
  );
}
