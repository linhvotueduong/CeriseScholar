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
  ANALYSIS_CONFIDENCE_LEVELS,
  ANALYSIS_METHOD_REGISTRY,
  MAX_DERIVED_PACKAGE_BYTES,
  analysisSpecificationAlignment,
  buildAnalysisResultsPackage,
  createAnalysisExecutionDocument,
  isAnalysisExecutionReady,
  markAnalysisExecutionExported,
  markAnalysisExecutionReviewed,
  readAnalysisExecutionDocument,
  updateAnalysisSpecifications,
  verifyPreparedAnalysisPackage,
  writeAnalysisExecutionDocument,
  type AnalysisExecutionDocument,
  type AnalysisExecutionSpecification,
  type AnalysisMethodId,
  type AnalysisMethodResult,
  type AnalysisResultsPackage,
} from "@/lib/research/analysisExecution";
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
  type DataPreparationPackage,
} from "@/lib/research/dataPreparation";
import type { ExperimentRelease } from "@/lib/research/experimentRelease";
import {
  fetchExperimentReleases,
  readLocalExperimentReleases,
  verifiedExperimentReleases,
} from "@/lib/research/experimentReleasePersistence";
import styles from "./AnalysisExecutionWorkspace.module.css";

interface AnalysisExecutionWorkspaceProps {
  projectId: string;
  projectName: string;
}

function supportsAnalysisExecution(release: ExperimentRelease): boolean {
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
    .filter(supportsAnalysisExecution)
    .sort((left, right) => right.releaseNumber - left.releaseNumber);
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

function safeExportName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "cerise-analysis";
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

function methodForSpecification(specification: AnalysisExecutionSpecification | null) {
  return specification?.methodId === "not-selected"
    ? null
    : ANALYSIS_METHOD_REGISTRY.find((method) => method.id === specification?.methodId) ?? null;
}

function GateItem({ complete, label }: { complete: boolean; label: string }) {
  return (
    <li className={complete ? styles.gateComplete : ""}>
      <span>{complete ? <AppIcon name="check-square" /> : null}</span>
      {label}
    </li>
  );
}

function statusLabel(document: AnalysisExecutionDocument | null): string {
  if (!document) return "Not started";
  if (document.readiness.status === "needs-configuration") return "Configure methods";
  if (document.readiness.status === "needs-run") return "Run required";
  if (document.readiness.status === "needs-review") return "Review required";
  if (document.readiness.status === "needs-export") return "Export required";
  return "Ready";
}

function resultIntervalStyle(result: AnalysisMethodResult): CSSProperties {
  const estimate = result.primaryEstimate.value;
  const minimum = Math.min(result.interval.lower, estimate, 0);
  const maximum = Math.max(result.interval.upper, estimate, 0);
  const range = Math.max(maximum - minimum, Number.EPSILON);
  const lower = ((result.interval.lower - minimum) / range) * 100;
  const upper = ((result.interval.upper - minimum) / range) * 100;
  const point = ((estimate - minimum) / range) * 100;
  const zero = ((0 - minimum) / range) * 100;
  return {
    "--interval-left": `${Math.max(0, Math.min(100, lower))}%`,
    "--interval-width": `${Math.max(1, Math.min(100, upper) - Math.max(0, lower))}%`,
    "--interval-point": `${Math.max(0, Math.min(100, point))}%`,
    "--interval-zero": `${Math.max(0, Math.min(100, zero))}%`,
  } as CSSProperties;
}

export default function AnalysisExecutionWorkspace({
  projectId,
  projectName,
}: AnalysisExecutionWorkspaceProps) {
  const [releases, setReleases] = useState<ExperimentRelease[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [plan, setPlan] = useState<AnalysisPlanDocument | null>(null);
  const [preparation, setPreparation] = useState<DataPreparationDocument | null>(null);
  const [document, setDocument] = useState<AnalysisExecutionDocument | null>(null);
  const [sourceLoaded, setSourceLoaded] = useState(false);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [sourceFilename, setSourceFilename] = useState("");
  const [sourceByteSize, setSourceByteSize] = useState(0);
  const [results, setResults] = useState<AnalysisMethodResult[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const preparedPackage = useRef<DataPreparationPackage | null>(null);
  const resultsPackage = useRef<AnalysisResultsPackage | null>(null);

  const selectedRelease = useMemo(
    () => releases.find((release) => release.releaseId === selectedReleaseId) ?? null,
    [releases, selectedReleaseId],
  );
  const activeSpecification = useMemo(
    () => document?.specifications.find(
      (specification) => specification.researchQuestionId === activeQuestionId,
    ) ?? document?.specifications[0] ?? null,
    [activeQuestionId, document],
  );
  const activeQuestion = useMemo(
    () => plan?.researchQuestions.find(
      (question) => question.id === activeSpecification?.researchQuestionId,
    ) ?? plan?.researchQuestions[0] ?? null,
    [activeSpecification, plan],
  );
  const activeResult = useMemo(
    () => results.find(
      (result) => result.researchQuestionId === activeSpecification?.researchQuestionId,
    ) ?? results[0] ?? null,
    [activeSpecification, results],
  );
  const selectedMethod = methodForSpecification(activeSpecification);
  const alignment = useMemo(
    () => activeSpecification && activeQuestion
      ? analysisSpecificationAlignment(activeSpecification, activeQuestion)
      : null,
    [activeQuestion, activeSpecification],
  );
  const variableOptions = useMemo(() => {
    const planColumns = plan?.variables.map((variable) => variable.name) ?? [];
    return [...new Set([...planColumns, ...sourceColumns])]
      .filter((name) => ![
        "_cerise_session_id",
        "_cerise_started_at",
        "_cerise_updated_at",
      ].includes(name))
      .sort((left, right) => left.localeCompare(right));
  }, [plan, sourceColumns]);

  const resetMemoryResults = useCallback(() => {
    resultsPackage.current = null;
    setResults([]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const candidates = readLocalExperimentReleases(window.localStorage, projectId);
      const local = (await verifiedExperimentReleases(candidates, projectId))
        .filter(supportsAnalysisExecution);
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
      setDocument(null);
      return;
    }
    const nextPlan = readAnalysisPlanDocument(window.localStorage, selectedRelease);
    const audit = readDataIntakeAuditReceipt(window.localStorage, selectedRelease);
    const nextPreparation = audit && isDataIntakeAuditReady(audit)
      ? readDataPreparationDocument(window.localStorage, selectedRelease, audit)
      : null;
    const nextDocument = nextPlan
      && nextPlan.readiness.status === "ready"
      && nextPreparation
      && isDataPreparationReady(nextPreparation)
      ? readAnalysisExecutionDocument(
        window.localStorage,
        selectedRelease,
        nextPlan,
        nextPreparation,
      ) ?? createAnalysisExecutionDocument(selectedRelease, nextPlan, nextPreparation)
      : null;
    setPlan(nextPlan);
    setPreparation(nextPreparation);
    setDocument(nextDocument);
    setActiveQuestionId(nextDocument?.specifications[0]?.researchQuestionId ?? "");
    preparedPackage.current = null;
    setSourceLoaded(false);
    setSourceColumns([]);
    setSourceFilename("");
    setSourceByteSize(0);
    resetMemoryResults();
    setError("");
    setNotice("");
  }, [resetMemoryResults, selectedRelease]);

  const persistSpecifications = useCallback((
    specifications: AnalysisExecutionSpecification[],
  ) => {
    if (!document || !selectedRelease || !plan || !preparation) return;
    try {
      const updated = updateAnalysisSpecifications(
        document,
        specifications,
        selectedRelease,
        plan,
        preparation,
      );
      const saved = writeAnalysisExecutionDocument(
        window.localStorage,
        selectedRelease,
        plan,
        preparation,
        updated,
      );
      setDocument(saved);
      resetMemoryResults();
      setError("");
      setNotice("Analysis configuration saved on this device. Re-run to refresh results.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The configuration could not be saved.");
    }
  }, [document, plan, preparation, resetMemoryResults, selectedRelease]);

  const updateActiveSpecification = useCallback((
    updater: (current: AnalysisExecutionSpecification) => AnalysisExecutionSpecification,
  ) => {
    if (!document || !activeSpecification) return;
    persistSpecifications(document.specifications.map((specification) => (
      specification.id === activeSpecification.id ? updater(specification) : specification
    )));
  }, [activeSpecification, document, persistSpecifications]);

  const selectMethod = (methodId: AnalysisMethodId) => {
    const method = ANALYSIS_METHOD_REGISTRY.find((item) => item.id === methodId);
    updateActiveSpecification((current) => ({
      ...current,
      methodId,
      predictorVariable: method?.requiresPredictor
        ? current.predictorVariable || activeQuestion?.predictorVariables[0] || ""
        : "",
    }));
  };

  const handlePackage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedRelease || !plan || !preparation || !document) return;
    setError("");
    setNotice("");
    setProcessing(true);
    try {
      if (file.size <= 0 || file.size > MAX_DERIVED_PACKAGE_BYTES) {
        throw new Error("The selected JSON is empty or exceeds the 36 MB local analysis limit.");
      }
      const buffer = await file.arrayBuffer();
      let parsed: unknown;
      try {
        parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
      } catch {
        throw new Error("The selected file is not valid UTF-8 JSON.");
      }
      const verified = await verifyPreparedAnalysisPackage(
        parsed,
        selectedRelease,
        plan,
        preparation,
      );
      preparedPackage.current = verified;
      setSourceLoaded(true);
      setSourceColumns(verified.responseColumns);
      setSourceFilename(file.name.slice(0, 200));
      setSourceByteSize(file.size);
      resetMemoryResults();
      setNotice(
        "Derived package verified locally. Participant rows are held only in this tab’s memory.",
      );
    } catch (cause) {
      preparedPackage.current = null;
      setSourceLoaded(false);
      setSourceColumns([]);
      setSourceFilename("");
      setSourceByteSize(0);
      setError(cause instanceof Error ? cause.message : "The package could not be verified.");
    } finally {
      setProcessing(false);
    }
  };

  const runAnalyses = async () => {
    if (!document || !selectedRelease || !plan || !preparation || !preparedPackage.current) {
      setError("Import and verify the current Phase 8.3 package first.");
      return;
    }
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      const built = await buildAnalysisResultsPackage({
        document,
        preparedPackage: preparedPackage.current,
        release: selectedRelease,
        plan,
        preparation,
      });
      const saved = writeAnalysisExecutionDocument(
        window.localStorage,
        selectedRelease,
        plan,
        preparation,
        built.document,
      );
      resultsPackage.current = built.package;
      setResults(built.package.results);
      setDocument(saved);
      setNotice(
        `${built.package.results.length} configured analysis result(s) computed locally. Review every estimate and diagnostic before export.`,
      );
    } catch (cause) {
      resultsPackage.current = null;
      setResults([]);
      setError(cause instanceof Error ? cause.message : "The analyses could not be run.");
    } finally {
      setProcessing(false);
    }
  };

  const confirmReview = () => {
    if (!document || !selectedRelease || !plan || !preparation || !resultsPackage.current) return;
    try {
      const reviewed = markAnalysisExecutionReviewed(
        document,
        selectedRelease,
        plan,
        preparation,
      );
      const saved = writeAnalysisExecutionDocument(
        window.localStorage,
        selectedRelease,
        plan,
        preparation,
        reviewed,
      );
      setDocument(saved);
      setError("");
      setNotice("Estimate, interval, assumption, and diagnostic review confirmed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review could not be confirmed.");
    }
  };

  const exportResults = () => {
    if (
      !document
      || !selectedRelease
      || !plan
      || !preparation
      || !resultsPackage.current
    ) return;
    try {
      const exportedAt = new Date().toISOString();
      const exported = markAnalysisExecutionExported(
        document,
        selectedRelease,
        plan,
        preparation,
        exportedAt,
      );
      const saved = writeAnalysisExecutionDocument(
        window.localStorage,
        selectedRelease,
        plan,
        preparation,
        exported,
      );
      downloadJson(
        `${safeExportName(projectName)}-analysis-results-v${selectedRelease.releaseNumber}.json`,
        {
          exportType: "cerise-analysis-results-package",
          exportBoundary:
            "Aggregate statistical output may remain sensitive. Store only in an approved location.",
          exportedAt,
          package: resultsPackage.current,
        },
      );
      setDocument(saved);
      setError("");
      setNotice("Aggregate results package exported. It contains no participant rows.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The results package could not be exported.");
    }
  };

  const ready = isAnalysisExecutionReady(document);
  const configurationReady = Boolean(
    document && document.readiness.status !== "needs-configuration",
  );
  const reviewReady = Boolean(document?.reviewedAt);
  const exportReady = Boolean(document?.exportedAt);
  const requiredPrimary = activeQuestion?.designation === "primary";

  if (loading) {
    return (
      <main className={styles.centeredState}>
        <span className={styles.loadingMark} />
        <strong>Loading local analysis execution…</strong>
      </main>
    );
  }

  return (
    <main className={styles.analysisApp}>
      <header className={styles.topBar}>
        <Link className={styles.brand} href="/projects">Cerise Scholar</Link>
        <Link className={styles.returnLink} href={`/projects/${projectId}/research-path`}>
          <AppIcon name="arrow-left" />
          Back to Research Path
        </Link>
        <span className={styles.projectTitle}>{projectName}</span>
        <div className={styles.topActions}>
          <span className={styles.localBadge}><AppIcon name="lock" />Local analysis</span>
          <button onClick={() => fileInput.current?.click()} type="button">
            <AppIcon name="upload" />
            Re-select package
          </button>
        </div>
      </header>

      <section className={styles.contextBar}>
        <div>
          <span className={styles.contextIcon}><AppIcon name="research" /></span>
          <strong>Analysis Execution</strong>
          <span>Reviewed registry · aggregate outputs</span>
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
          <p>Freeze a verified format-v5 release before running release-bound analysis.</p>
          <Link href={`/experimental-studio/${projectId}`}>Open Experimental Studio</Link>
        </section>
      ) : !plan || plan.readiness.status !== "ready" ? (
        <section className={styles.emptyState}>
          <AppIcon name="sliders" />
          <h1>Finalize the analysis plan first</h1>
          <p>Phase 8.4 runs only against the ready local plan for this frozen release.</p>
          <Link href={`/analysis-plan/${projectId}`}>Open Analysis Plan</Link>
        </section>
      ) : !preparation || !isDataPreparationReady(preparation) || !document ? (
        <section className={styles.emptyState}>
          <AppIcon name="workflow" />
          <h1>Export the reproducible derived package first</h1>
          <p>Phase 8.3 must be reviewed and exported before local statistical execution.</p>
          <Link href={`/data-preparation/${projectId}`}>Open Reproducible Preparation</Link>
        </section>
      ) : (
        <div className={styles.workspace}>
          <aside className={styles.workflowRail}>
            <span className={styles.railLabel}>Analysis workflow</span>
            <ol>
              {[
                ["Verify package", sourceLoaded, "Match Phase 8.3 integrity", "shield"],
                ["Configure methods", configurationReady, "Map the frozen plan", "sliders"],
                ["Run locally", Boolean(document.lastRun), "Execute the reviewed registry", "play"],
                ["Review diagnostics", reviewReady, "Confirm assumptions and limits", "search"],
                ["Export results", exportReady, "Create the aggregate package", "save"],
              ].map(([label, complete, description, icon], index) => (
                <li
                  className={[
                    complete ? styles.workflowComplete : "",
                    !complete && (
                      (index === 0 && !sourceLoaded)
                      || (index === 1 && sourceLoaded && !configurationReady)
                      || (index === 2 && sourceLoaded && configurationReady && !document.lastRun)
                      || (index === 3 && document.lastRun && !reviewReady)
                      || (index === 4 && reviewReady && !exportReady)
                    ) ? styles.workflowActive : "",
                  ].filter(Boolean).join(" ")}
                  key={String(label)}
                >
                  <span className={styles.workflowNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <AppIcon name={icon as "shield" | "sliders" | "play" | "search" | "save"} />
                  <div><strong>{label}</strong><small>{description}</small></div>
                  <span className={styles.workflowState}>
                    {complete ? <AppIcon name="check-square" /> : null}
                  </span>
                </li>
              ))}
            </ol>
            <div className={styles.boundaryCard}>
              <AppIcon name="lock" />
              <strong>Execution boundaries</strong>
              <ul>
                <li>Rows stay in memory only</li>
                <li>No remote or arbitrary code</li>
                <li>No participant data sent to AI</li>
                <li>No silent method substitution</li>
              </ul>
            </div>
          </aside>

          <section className={styles.analysisCanvas}>
            <header className={styles.hero}>
              <p>Phase 8.4 · Analysis Execution</p>
              <h1>Run a reviewed analysis against the frozen plan</h1>
              <span>
                Verify the derived package, map each research question to a bounded
                method, and inspect estimates, intervals, assumptions, and diagnostics
                before exporting aggregate results.
              </span>
            </header>

            <section className={sourceLoaded ? styles.sourceVerified : styles.sourcePanel}>
              <span className={styles.sourceIcon}>
                <AppIcon name={sourceLoaded ? "shield" : "upload"} />
              </span>
              <div>
                <strong>{sourceLoaded ? "Derived package verified" : "Import the Phase 8.3 derived package"}</strong>
                <p>
                  {sourceLoaded && preparedPackage.current
                    ? `${preparedPackage.current.responses.length} completed record(s) · ${preparedPackage.current.responseColumns.length} response column(s) · ${sourceFilename} (${readableBytes(sourceByteSize)})`
                    : "Cerise verifies release, plan, preparation, response, trial, and whole-package checksums before execution."}
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
                    : "Choose derived JSON"}
              </button>
              <input
                accept="application/json,.json"
                aria-label="Choose the exported Phase 8.3 derived data package"
                hidden
                onChange={handlePackage}
                ref={fileInput}
                type="file"
              />
            </section>

            {error ? <div className={styles.errorNotice} role="alert"><AppIcon name="alert" />{error}</div> : null}
            {notice ? <div className={styles.successNotice} role="status"><AppIcon name="shield" />{notice}</div> : null}

            <div className={styles.configurationGrid}>
              <section className={styles.methodCard}>
                <div className={styles.cardHeading}>
                  <div>
                    <span>Method registry</span>
                    <h2>Configure the active research question</h2>
                  </div>
                  {activeQuestion ? (
                    <label className={styles.includeToggle}>
                      <input
                        checked={activeSpecification?.enabled ?? false}
                        disabled={requiredPrimary}
                        onChange={(event) => updateActiveSpecification((current) => ({
                          ...current,
                          enabled: event.target.checked,
                        }))}
                        type="checkbox"
                      />
                      {requiredPrimary ? "Primary · required" : "Include"}
                    </label>
                  ) : null}
                </div>

                <div className={styles.methodTabs} role="list" aria-label="Reviewed analysis methods">
                  {ANALYSIS_METHOD_REGISTRY.map((method) => (
                    <button
                      aria-pressed={activeSpecification?.methodId === method.id}
                      className={activeSpecification?.methodId === method.id ? styles.methodActive : ""}
                      key={method.id}
                      onClick={() => selectMethod(method.id)}
                      type="button"
                    >
                      {method.shortLabel}
                    </button>
                  ))}
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.fullField}>
                    <span>Research question</span>
                    <select
                      onChange={(event) => setActiveQuestionId(event.target.value)}
                      value={activeSpecification?.researchQuestionId ?? ""}
                    >
                      {plan.researchQuestions.map((question) => (
                        <option key={question.id} value={question.id}>
                          {question.id}: {question.question}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Outcome variable</span>
                    <select
                      onChange={(event) => updateActiveSpecification((current) => ({
                        ...current,
                        outcomeVariable: event.target.value,
                      }))}
                      value={activeSpecification?.outcomeVariable ?? ""}
                    >
                      <option value="">Select outcome</option>
                      {variableOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>{activeSpecification?.methodId === "two-group-mean-difference" ? "Group variable" : "Predictor variable"}</span>
                    <select
                      disabled={!selectedMethod?.requiresPredictor}
                      onChange={(event) => updateActiveSpecification((current) => ({
                        ...current,
                        predictorVariable: event.target.value,
                      }))}
                      value={activeSpecification?.predictorVariable ?? ""}
                    >
                      <option value="">
                        {selectedMethod?.requiresPredictor ? "Select predictor" : "Not used"}
                      </option>
                      {variableOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Confidence level</span>
                    <select
                      onChange={(event) => updateActiveSpecification((current) => ({
                        ...current,
                        confidenceLevel: Number(event.target.value) as 0.9 | 0.95 | 0.99,
                      }))}
                      value={activeSpecification?.confidenceLevel ?? 0.95}
                    >
                      {ANALYSIS_CONFIDENCE_LEVELS.map((level) => (
                        <option key={level} value={level}>{Math.round(level * 100)}%</option>
                      ))}
                    </select>
                  </label>
                  {alignment && !alignment.aligned ? (
                    <label className={styles.fullField}>
                      <span>Required deviation rationale</span>
                      <textarea
                        maxLength={1_000}
                        onChange={(event) => updateActiveSpecification((current) => ({
                          ...current,
                          deviationRationale: event.target.value,
                        }))}
                        placeholder="Explain why the executed method or variables differ from the frozen plan."
                        rows={3}
                        value={activeSpecification?.deviationRationale ?? ""}
                      />
                    </label>
                  ) : null}
                </div>

                <div className={styles.methodSummary}>
                  <AppIcon name="research" />
                  <div>
                    <strong>{selectedMethod?.label ?? "Select a reviewed method"}</strong>
                    <p>{selectedMethod?.description ?? "Cerise will not infer a method from ambiguous plan wording."}</p>
                    {selectedMethod ? (
                      <small>
                        Effect: {selectedMethod.effectSize} · Interval: {selectedMethod.confidenceInterval}
                      </small>
                    ) : null}
                  </div>
                </div>

                <button
                  className={styles.runButton}
                  disabled={processing || !sourceLoaded || !configurationReady}
                  onClick={() => void runAnalyses()}
                  type="button"
                >
                  <AppIcon name="play" />
                  {processing ? "Running locally…" : "Run configured analyses locally"}
                </button>
              </section>

              <section className={styles.planCard}>
                <div className={styles.cardHeading}>
                  <div><span>Frozen plan</span><h2>Release-bound decisions</h2></div>
                  <span className={alignment?.aligned ? styles.alignedBadge : styles.deviationBadge}>
                    {alignment?.aligned ? "Mapped" : "Deviation"}
                  </span>
                </div>
                {activeQuestion ? (
                  <>
                    <dl>
                      <div><dt>Designation</dt><dd>{activeQuestion.designation}</dd></div>
                      <div><dt>Planned method</dt><dd>{activeQuestion.plannedMethod || "Unspecified"}</dd></div>
                      <div><dt>Outcome</dt><dd>{activeQuestion.outcomeVariables.join(", ") || "Unmapped"}</dd></div>
                      <div><dt>Predictor</dt><dd>{activeQuestion.predictorVariables.join(", ") || "Unmapped"}</dd></div>
                      <div><dt>Unit of analysis</dt><dd>{activeQuestion.unitOfAnalysis}</dd></div>
                      <div><dt>Missing data</dt><dd>{activeQuestion.missingDataStrategy}</dd></div>
                    </dl>
                    {alignment && !alignment.aligned ? (
                      <div className={styles.alignmentIssues}>
                        <AppIcon name="alert" />
                        <div>
                          <strong>Execution differs from the frozen plan</strong>
                          <ul>{alignment.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.alignmentPass}>
                        <AppIcon name="check-square" />
                        Method and variables map to the frozen plan.
                      </div>
                    )}
                  </>
                ) : null}
              </section>
            </div>

            <section className={styles.resultsSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span>Aggregate results</span>
                  <h2>{activeResult ? activeResult.methodLabel : "Run the configured analyses"}</h2>
                </div>
                {document.lastRun ? <code>{document.lastRun.resultChecksum.slice(0, 24)}…</code> : null}
              </div>

              {activeResult ? (
                <>
                  <div className={styles.metricGrid}>
                    {[
                      { label: "Complete N", value: String(activeResult.completeSampleSize) },
                      {
                        label: activeResult.primaryEstimate.label,
                        value: activeResult.primaryEstimate.formatted,
                      },
                      {
                        label: `${Math.round(activeResult.interval.level * 100)}% interval`,
                        value: `[${activeResult.interval.lower}, ${activeResult.interval.upper}]`,
                      },
                      {
                        label: "Missing / invalid",
                        value: String(activeResult.excludedMissingOrInvalid),
                      },
                    ].map((metric) => (
                      <article key={metric.label}>
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                      </article>
                    ))}
                  </div>

                  <div className={styles.resultDetailGrid}>
                    <article className={styles.effectCard}>
                      <div className={styles.subheading}>
                        <span>Effect and interval</span>
                        <strong>{activeResult.primaryEstimate.label}</strong>
                      </div>
                      <div className={styles.intervalPlot} style={resultIntervalStyle(activeResult)}>
                        <span className={styles.zeroLine} />
                        <span className={styles.intervalLine} />
                        <span className={styles.estimatePoint} />
                      </div>
                      <div className={styles.intervalLabels}>
                        <span>{activeResult.interval.lower}</span>
                        <strong>{activeResult.primaryEstimate.formatted}</strong>
                        <span>{activeResult.interval.upper}</span>
                      </div>
                      <p>{activeResult.interval.method}</p>
                      <dl className={styles.resultMetrics}>
                        {activeResult.metrics.slice(0, 5).map((metric) => (
                          <div key={metric.id}><dt>{metric.label}</dt><dd>{metric.formatted}</dd></div>
                        ))}
                      </dl>
                    </article>

                    <article className={styles.diagnosticsCard}>
                      <div className={styles.subheading}>
                        <span>Diagnostics</span>
                        <strong>Researcher review required</strong>
                      </div>
                      <div className={styles.diagnosticTable}>
                        {activeResult.diagnostics.map((diagnostic) => (
                          <div key={diagnostic.id}>
                            <span className={styles[`diagnostic_${diagnostic.severity}`]}>
                              {diagnostic.severity === "pass"
                                ? <AppIcon name="check-square" />
                                : <AppIcon name="alert" />}
                            </span>
                            <strong>{diagnostic.label}</strong>
                            <p>{diagnostic.detail}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>

                  <details className={styles.assumptionDisclosure}>
                    <summary>Assumptions and computation notes</summary>
                    <div>
                      <section>
                        <strong>Method assumptions</strong>
                        <ul>{activeResult.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
                      </section>
                      <section>
                        <strong>Computation notes</strong>
                        <ul>{activeResult.computationNotes.map((item) => <li key={item}>{item}</li>)}</ul>
                      </section>
                    </div>
                  </details>
                </>
              ) : (
                <div className={styles.emptyResults}>
                  <AppIcon name="research" />
                  <div>
                    <strong>No aggregate result is in memory.</strong>
                    <p>
                      Import the verified derived package and run the current registry
                      configuration. Results are not restored from browser storage.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </section>

          <aside className={styles.gateRail}>
            <span className={styles.gateLabel}>Analysis gate</span>
            <h2>{ready ? "Ready for Phase 8.5" : "Review before export"}</h2>
            <p className={styles.gateIntro}>
              Confirm the current local run only after checking every estimate,
              interval, assumption, and diagnostic.
            </p>
            <ul className={styles.gateList}>
              <GateItem complete={sourceLoaded} label="Source integrity verified" />
              <GateItem complete={configurationReady} label="Frozen plan mapped or deviation recorded" />
              <GateItem complete={Boolean(document.lastRun)} label="Configured analyses run locally" />
              <GateItem complete={reviewReady} label="Assumptions and diagnostics reviewed" />
              <GateItem complete={exportReady} label="Aggregate results exported" />
            </ul>

            <button
              className={styles.reviewButton}
              disabled={!document.lastRun || !resultsPackage.current || reviewReady}
              onClick={confirmReview}
              type="button"
            >
              <AppIcon name="check-square" />
              {reviewReady ? "Review confirmed" : "Confirm analysis review"}
            </button>
            <button
              className={styles.exportButton}
              disabled={!reviewReady || !resultsPackage.current}
              onClick={exportResults}
              type="button"
            >
              <AppIcon name="save" />
              {exportReady ? "Export results again" : "Export results package"}
            </button>

            <div className={styles.privacyBoundary}>
              <AppIcon name="lock" />
              <div>
                <strong>All methods run in this tab</strong>
                <p>
                  Participant rows never enter browser storage, Supabase, Azure,
                  OpenAI, OpenRouter, logs, or the exported results package.
                </p>
              </div>
            </div>

            <dl className={styles.provenance}>
              <div><dt>Status</dt><dd>{statusLabel(document)}</dd></div>
              <div><dt>Plan snapshot</dt><dd>{formatDate(plan.updatedAt)}</dd></div>
              <div><dt>Prepared</dt><dd>{formatDate(preparation.lastRun?.preparedAt ?? "")}</dd></div>
              <div><dt>Last run</dt><dd>{formatDate(document.lastRun?.runAt ?? "")}</dd></div>
              <div><dt>Methods</dt><dd>{document.lastRun?.analysisCount ?? 0} executed</dd></div>
              <div><dt>Participant rows</dt><dd>Not persisted</dd></div>
            </dl>

            <div className={styles.scopeNote}>
              <AppIcon name="help" />
              <p>
                Phase 8.4 is a bounded local registry, not general statistical
                software, preregistration, or scientific-validity certification.
              </p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
