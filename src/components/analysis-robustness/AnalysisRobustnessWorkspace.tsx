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
  MAX_ANALYSIS_RESULTS_BYTES,
  MAX_DERIVED_PACKAGE_BYTES,
  isAnalysisExecutionReady,
  readAnalysisExecutionDocument,
  verifyPreparedAnalysisPackage,
  type AnalysisExecutionDocument,
  type AnalysisResultsPackage,
} from "@/lib/research/analysisExecution";
import {
  buildRobustnessRecordExport,
  createAnalysisRobustnessDocument,
  isAnalysisRobustnessReady,
  markAnalysisRobustnessReviewed,
  readAnalysisRobustnessDocument,
  runAnalysisRobustness,
  updateAnalysisRobustnessAssessment,
  verifyRobustnessRecordExport,
  writeAnalysisRobustnessDocument,
  type AnalysisRobustnessDocument,
  type RobustnessAnalysisResult,
  type RobustnessAnalysisReview,
  type RobustnessConclusionImpact,
} from "@/lib/research/analysisRobustness";
import { verifyAnalysisResultsPackage } from "@/lib/research/analysisResults";
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
import styles from "./AnalysisRobustnessWorkspace.module.css";

interface AnalysisRobustnessWorkspaceProps {
  projectId: string;
  projectName: string;
}

const IMPACT_OPTIONS: ReadonlyArray<{
  value: RobustnessConclusionImpact;
  label: string;
}> = [
  { value: "not-reviewed", label: "Select impact" },
  { value: "unchanged", label: "Conclusion unchanged" },
  { value: "weakened", label: "Conclusion weakened" },
  { value: "strengthened", label: "Conclusion strengthened" },
  { value: "changed", label: "Conclusion changed" },
  { value: "inconclusive", label: "Impact remains inconclusive" },
];

function supportsRobustness(release: ExperimentRelease): boolean {
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
    .filter(supportsRobustness)
    .sort((left, right) => right.releaseNumber - left.releaseNumber);
}

function safeExportName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "cerise-robustness";
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

function shortChecksum(value: string): string {
  return value ? `${value.slice(0, 15)}…${value.slice(-8)}` : "Not available";
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

function statusLabel(document: AnalysisRobustnessDocument | null): string {
  if (!document) return "Primary analysis required";
  if (document.readiness.status === "needs-source") return "Source packages required";
  if (document.readiness.status === "needs-assessment") return "Assessment required";
  if (document.readiness.status === "needs-review") return "Confirmation required";
  if (document.readiness.status === "needs-export") return "Export required";
  return "Ready";
}

function comparisonLabel(result: RobustnessAnalysisResult): string {
  if (result.comparisonStatus === "direction-different") return "Direction differs";
  if (result.comparisonStatus === "interval-boundary-different") return "Interval boundary differs";
  if (result.comparisonStatus === "not-estimable") return "Not estimable";
  if (result.comparisonStatus === "interval-boundary-consistent") return "Interval boundary consistent";
  return "Direction consistent";
}

function GateItem({ complete, label }: { complete: boolean; label: string }) {
  return (
    <li className={complete ? styles.gateComplete : ""}>
      <span>{complete ? <AppIcon name="check-square" /> : null}</span>
      {label}
    </li>
  );
}

async function parseJsonFile(file: File, maximum: number, label: string): Promise<unknown> {
  if (file.size <= 0 || file.size > maximum) {
    throw new Error(`${label} is empty or exceeds the ${readableBytes(maximum)} limit.`);
  }
  try {
    const bytes = await file.arrayBuffer();
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${label} is not valid UTF-8 JSON.`);
  }
}

export default function AnalysisRobustnessWorkspace({
  projectId,
  projectName,
}: AnalysisRobustnessWorkspaceProps) {
  const [releases, setReleases] = useState<ExperimentRelease[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [plan, setPlan] = useState<AnalysisPlanDocument | null>(null);
  const [preparation, setPreparation] = useState<DataPreparationDocument | null>(null);
  const [execution, setExecution] = useState<AnalysisExecutionDocument | null>(null);
  const [document, setDocument] = useState<AnalysisRobustnessDocument | null>(null);
  const [analyses, setAnalyses] = useState<RobustnessAnalysisResult[]>([]);
  const [activeAnalysisId, setActiveAnalysisId] = useState("");
  const [preparedName, setPreparedName] = useState("");
  const [preparedSize, setPreparedSize] = useState(0);
  const [resultsName, setResultsName] = useState("");
  const [resultsSize, setResultsSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const preparedInput = useRef<HTMLInputElement>(null);
  const resultsInput = useRef<HTMLInputElement>(null);
  const preparedEnvelope = useRef<unknown>(null);
  const resultsEnvelope = useRef<unknown>(null);
  const preparedPackage = useRef<DataPreparationPackage | null>(null);
  const resultsPackage = useRef<AnalysisResultsPackage | null>(null);

  const selectedRelease = useMemo(
    () => releases.find((release) => release.releaseId === selectedReleaseId) ?? null,
    [releases, selectedReleaseId],
  );
  const activeAnalysis = useMemo(
    () => analyses.find((analysis) => analysis.analysisId === activeAnalysisId)
      ?? analyses[0]
      ?? null,
    [activeAnalysisId, analyses],
  );
  const activeReview = useMemo(
    () => document?.reviews.find((review) => review.analysisId === activeAnalysis?.analysisId)
      ?? null,
    [activeAnalysis, document],
  );

  const clearSourceMemory = useCallback(() => {
    preparedEnvelope.current = null;
    resultsEnvelope.current = null;
    preparedPackage.current = null;
    resultsPackage.current = null;
    setPreparedName("");
    setPreparedSize(0);
    setResultsName("");
    setResultsSize(0);
    setAnalyses([]);
    setActiveAnalysisId("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const candidates = readLocalExperimentReleases(window.localStorage, projectId);
      const local = (await verifiedExperimentReleases(candidates, projectId))
        .filter(supportsRobustness);
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
    clearSourceMemory();
    setError("");
    setNotice("");
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
    const existing = nextPlan
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
    const created = !existing
      && nextPlan
      && nextPreparation
      && nextExecution
      && isAnalysisExecutionReady(nextExecution)
      ? createAnalysisRobustnessDocument(
        selectedRelease,
        nextPlan,
        nextPreparation,
        nextExecution,
      )
      : null;
    const nextDocument = existing ?? created;
    if (nextDocument && nextPlan && nextPreparation && nextExecution) {
      writeAnalysisRobustnessDocument(
        window.localStorage,
        selectedRelease,
        nextPlan,
        nextPreparation,
        nextExecution,
        nextDocument,
      );
    }
    setPlan(nextPlan);
    setPreparation(nextPreparation);
    setExecution(nextExecution);
    setDocument(nextDocument);
  }, [clearSourceMemory, selectedRelease]);

  const saveDocument = useCallback((next: AnalysisRobustnessDocument) => {
    if (!selectedRelease || !plan || !preparation || !execution) return;
    const saved = writeAnalysisRobustnessDocument(
      window.localStorage,
      selectedRelease,
      plan,
      preparation,
      execution,
      next,
    );
    setDocument(saved);
  }, [execution, plan, preparation, selectedRelease]);

  const handlePreparedFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedRelease || !plan || !preparation) return;
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      const parsed = await parseJsonFile(
        file,
        MAX_DERIVED_PACKAGE_BYTES,
        "The Phase 8.3 derived package",
      );
      const verified = await verifyPreparedAnalysisPackage(
        parsed,
        selectedRelease,
        plan,
        preparation,
      );
      preparedEnvelope.current = parsed;
      preparedPackage.current = verified;
      setPreparedName(file.name.slice(0, 200));
      setPreparedSize(file.size);
      setAnalyses([]);
      setNotice("Phase 8.3 derived package verified in this tab. Participant rows were not persisted.");
    } catch (cause) {
      preparedEnvelope.current = null;
      preparedPackage.current = null;
      setPreparedName("");
      setPreparedSize(0);
      setAnalyses([]);
      setError(cause instanceof Error ? cause.message : "The derived package could not be verified.");
    } finally {
      setProcessing(false);
    }
  };

  const handleResultsFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedRelease || !plan || !preparation || !execution) return;
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      const parsed = await parseJsonFile(
        file,
        MAX_ANALYSIS_RESULTS_BYTES,
        "The Phase 8.4 aggregate-results package",
      );
      const verified = await verifyAnalysisResultsPackage(
        parsed,
        selectedRelease,
        plan,
        preparation,
        execution,
      );
      resultsEnvelope.current = parsed;
      resultsPackage.current = verified;
      setResultsName(file.name.slice(0, 200));
      setResultsSize(file.size);
      setAnalyses([]);
      setNotice("Phase 8.4 aggregate-results package verified against the local execution receipt.");
    } catch (cause) {
      resultsEnvelope.current = null;
      resultsPackage.current = null;
      setResultsName("");
      setResultsSize(0);
      setAnalyses([]);
      setError(cause instanceof Error ? cause.message : "The aggregate results could not be verified.");
    } finally {
      setProcessing(false);
    }
  };

  const runChecks = async () => {
    if (
      !document
      || !selectedRelease
      || !plan
      || !preparation
      || !execution
      || !preparedEnvelope.current
      || !resultsEnvelope.current
    ) {
      setError("Select both exact source packages before running the robustness registry.");
      return;
    }
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      const run = await runAnalysisRobustness(
        document,
        preparedEnvelope.current,
        resultsEnvelope.current,
        selectedRelease,
        plan,
        preparation,
        execution,
      );
      preparedPackage.current = run.preparedPackage;
      resultsPackage.current = run.resultsPackage;
      saveDocument(run.document);
      setAnalyses(run.analyses);
      setActiveAnalysisId(run.analyses[0]?.analysisId ?? "");
      setNotice(
        "Primary estimates matched the derived rows. Bounded aggregate comparisons are ready for researcher judgment.",
      );
    } catch (cause) {
      setAnalyses([]);
      setError(cause instanceof Error ? cause.message : "The robustness checks could not run.");
    } finally {
      setProcessing(false);
    }
  };

  const persistAssessment = useCallback((
    changes: {
      reviews?: RobustnessAnalysisReview[];
      overallConclusion?: string;
      unperformedChecks?: string;
    },
  ) => {
    if (!document || !selectedRelease || !plan || !preparation || !execution || analyses.length === 0) {
      return;
    }
    try {
      const updated = updateAnalysisRobustnessAssessment(
        document,
        changes,
        selectedRelease,
        plan,
        preparation,
        execution,
      );
      saveDocument(updated);
      setError("");
      setNotice("Robustness assessment saved on this device.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The assessment could not be saved.");
    }
  }, [analyses.length, document, execution, plan, preparation, saveDocument, selectedRelease]);

  const updateActiveReview = useCallback((
    updater: (review: RobustnessAnalysisReview) => RobustnessAnalysisReview,
  ) => {
    if (!document || !activeReview) return;
    persistAssessment({
      reviews: document.reviews.map((review) => (
        review.analysisId === activeReview.analysisId ? updater(review) : review
      )),
    });
  }, [activeReview, document, persistAssessment]);

  const confirmReview = () => {
    if (
      !document
      || !selectedRelease
      || !plan
      || !preparation
      || !execution
      || analyses.length === 0
    ) {
      setError("Run and inspect the bounded checks in this tab before confirming review.");
      return;
    }
    try {
      const reviewed = markAnalysisRobustnessReviewed(
        document,
        selectedRelease,
        plan,
        preparation,
        execution,
      );
      saveDocument(reviewed);
      setError("");
      setNotice("Complete robustness assessment confirmed. Aggregate export is enabled.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review could not be confirmed.");
    }
  };

  const exportRecord = async () => {
    if (
      !document
      || !selectedRelease
      || !plan
      || !preparation
      || !execution
      || !preparedPackage.current
      || !resultsPackage.current
      || !preparedEnvelope.current
      || !resultsEnvelope.current
    ) {
      setError("Re-select both exact source packages before exporting the robustness record.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      const built = await buildRobustnessRecordExport(
        document,
        preparedPackage.current,
        resultsPackage.current,
        selectedRelease,
        plan,
        preparation,
        execution,
      );
      await verifyRobustnessRecordExport(
        built.export,
        preparedEnvelope.current,
        resultsEnvelope.current,
        built.document,
        selectedRelease,
        plan,
        preparation,
        execution,
      );
      saveDocument(built.document);
      downloadJson(
        `${safeExportName(projectName)}-robustness-record-v${selectedRelease.releaseNumber}.json`,
        built.export,
      );
      setNotice(
        "Aggregate robustness record rebuilt, independently verified, and downloaded. It contains no participant rows.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The robustness record could not be exported.");
    } finally {
      setProcessing(false);
    }
  };

  const sourcesLoaded = Boolean(preparedPackage.current && resultsPackage.current);
  const chainReady = Boolean(
    selectedRelease
    && plan?.readiness.status === "ready"
    && preparation
    && isDataPreparationReady(preparation)
    && execution
    && isAnalysisExecutionReady(execution),
  );
  const assessmentsComplete = Boolean(
    document
    && document.readiness.status !== "needs-source"
    && document.readiness.status !== "needs-assessment",
  );
  const reviewComplete = Boolean(document?.reviewedAt);
  const exportComplete = Boolean(document?.exportedAt);
  const ready = isAnalysisRobustnessReady(document);

  if (loading) {
    return (
      <main className={styles.loading}>
        <span />
        Loading the verified analysis chain…
      </main>
    );
  }

  return (
    <main className={styles.workspace}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <Link href={`/dashboard/project/${projectId}`} aria-label="Return to Research Path">
            <AppIcon name="arrow-left" />
          </Link>
          <span className={styles.brandMark}>CS</span>
          <div>
            <strong>Cerise Scholar</strong>
            <small>Reviewed Robustness Studio</small>
          </div>
        </div>
        <div className={styles.projectContext}>
          <span>{projectName}</span>
          <strong>{statusLabel(document)}</strong>
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Phase 8.7A · Local deterministic review</p>
          <h1>Challenge the primary estimate without silently changing the analysis</h1>
          <p>
            Recompute the reviewed estimate from the exact derived rows, compare a
            method-specific robust alternative, inspect leave-one-out influence,
            and record what the checks do—and do not—change.
          </p>
        </div>
        <div className={styles.heroBoundary}>
          <AppIcon name="shield" />
          <div>
            <strong>No automatic exclusion. No AI. No cloud analysis.</strong>
            <span>Participant rows live only in this tab and disappear when it closes.</span>
          </div>
        </div>
      </section>

      <section className={styles.provenanceStrip} aria-label="Verified analysis provenance">
        <div>
          <span>Frozen release</span>
          <strong>{selectedRelease ? `Release v${selectedRelease.releaseNumber}` : "Unavailable"}</strong>
          <small>{selectedRelease ? shortChecksum(selectedRelease.checksum) : "Phase 8.0 required"}</small>
        </div>
        <div>
          <span>Analysis plan</span>
          <strong>{plan?.readiness.status === "ready" ? "Ready" : "Required"}</strong>
          <small>{plan ? formatDate(plan.updatedAt) : "Phase 8.1 required"}</small>
        </div>
        <div>
          <span>Prepared source</span>
          <strong>{preparation?.readiness.status === "ready" ? "Reviewed" : "Required"}</strong>
          <small>{preparation?.lastRun ? shortChecksum(preparation.lastRun.packageChecksum) : "Phase 8.3 required"}</small>
        </div>
        <div>
          <span>Primary analysis</span>
          <strong>{execution?.readiness.status === "ready" ? "Reviewed" : "Required"}</strong>
          <small>{execution?.lastRun ? `${execution.lastRun.analysisCount} aggregate result(s)` : "Phase 8.4 required"}</small>
        </div>
      </section>

      {error ? (
        <div className={styles.error} role="alert">
          <AppIcon name="alert" />
          <span>{error}</span>
          <button onClick={() => setError("")} type="button">Dismiss</button>
        </div>
      ) : null}
      {notice ? (
        <div className={styles.notice} role="status">
          <AppIcon name="check-square" />
          <span>{notice}</span>
        </div>
      ) : null}

      <div className={styles.studioGrid}>
        <aside className={styles.workflowRail}>
          <div className={styles.railHeading}>
            <span>01</span>
            <div>
              <strong>Source chain</strong>
              <small>Exact local packages</small>
            </div>
          </div>
          <label className={styles.releaseSelect}>
            <span>Immutable release</span>
            <select
              onChange={(event) => setSelectedReleaseId(event.target.value)}
              value={selectedReleaseId}
            >
              {releases.length === 0 ? <option value="">No verified release</option> : null}
              {releases.map((release) => (
                <option key={release.releaseId} value={release.releaseId}>
                  Release v{release.releaseNumber}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.fileSummary}>
            <div className={preparedName ? styles.fileReady : ""}>
              <span><AppIcon name={preparedName ? "check-square" : "file"} /></span>
              <div>
                <strong>Phase 8.3 data</strong>
                <small>{preparedName || "Not selected"}</small>
                {preparedSize ? <em>{readableBytes(preparedSize)}</em> : null}
              </div>
            </div>
            <div className={resultsName ? styles.fileReady : ""}>
              <span><AppIcon name={resultsName ? "check-square" : "file"} /></span>
              <div>
                <strong>Phase 8.4 results</strong>
                <small>{resultsName || "Not selected"}</small>
                {resultsSize ? <em>{readableBytes(resultsSize)}</em> : null}
              </div>
            </div>
          </div>

          <div className={styles.railHeading}>
            <span>02</span>
            <div>
              <strong>Analysis checks</strong>
              <small>{analyses.length ? `${analyses.length} ready for review` : "Run required"}</small>
            </div>
          </div>
          <nav className={styles.analysisNav} aria-label="Robustness analyses">
            {document?.reviews.map((review, index) => {
              const analysis = analyses.find((item) => item.analysisId === review.analysisId);
              return (
                <button
                  aria-current={activeAnalysis?.analysisId === review.analysisId ? "step" : undefined}
                  className={activeAnalysis?.analysisId === review.analysisId ? styles.analysisNavActive : ""}
                  disabled={!analysis}
                  key={review.analysisId}
                  onClick={() => setActiveAnalysisId(review.analysisId)}
                  type="button"
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{review.researchQuestionId}</strong>
                    <small>{analysis ? comparisonLabel(analysis) : "Awaiting source"}</small>
                  </div>
                  {review.acknowledged ? <AppIcon name="check-square" /> : null}
                </button>
              );
            })}
          </nav>

          <div className={styles.railBoundary}>
            <AppIcon name="lock" />
            <p>
              Browser storage keeps only bounded reviews, provenance, checksums,
              and timestamps—not derived rows or aggregate check payloads.
            </p>
          </div>
        </aside>

        <section className={styles.analysisCanvas}>
          <div className={styles.canvasHeader}>
            <div>
              <p className={styles.eyebrow}>Deterministic evidence</p>
              <h2>{activeAnalysis ? activeAnalysis.researchQuestionId : "Verify both source packages"}</h2>
              <p>
                {activeAnalysis
                  ? activeAnalysis.researchQuestion
                  : "Both files are independently verified before any calculation is shown."}
              </p>
            </div>
            {activeAnalysis ? (
              <span className={activeAnalysis.requiresAttention ? styles.attentionBadge : styles.reviewBadge}>
                {activeAnalysis.requiresAttention ? "Attention required" : "Review comparison"}
              </span>
            ) : null}
          </div>

          {!activeAnalysis ? (
            <div className={styles.sourcePanel}>
              <div className={styles.sourceIntro}>
                <span><AppIcon name="workflow" /></span>
                <div>
                  <h3>Re-select the exact reviewed inputs</h3>
                  <p>
                    Phase 8.7A needs participant-level derived rows to recompute and
                    challenge the primary estimate. They remain only in this tab.
                  </p>
                </div>
              </div>
              <div className={styles.uploadGrid}>
                <button
                  disabled={!chainReady || processing}
                  onClick={() => preparedInput.current?.click()}
                  type="button"
                >
                  <span><AppIcon name="upload" /></span>
                  <strong>{preparedName ? "Replace Phase 8.3 package" : "Select Phase 8.3 package"}</strong>
                  <small>Potentially identifying local derived data · max 36 MB</small>
                </button>
                <button
                  disabled={!chainReady || processing}
                  onClick={() => resultsInput.current?.click()}
                  type="button"
                >
                  <span><AppIcon name="upload" /></span>
                  <strong>{resultsName ? "Replace Phase 8.4 package" : "Select Phase 8.4 package"}</strong>
                  <small>Aggregate statistical output · max 8 MB</small>
                </button>
              </div>
              <input
                accept=".json,application/json"
                hidden
                onChange={handlePreparedFile}
                ref={preparedInput}
                type="file"
              />
              <input
                accept=".json,application/json"
                hidden
                onChange={handleResultsFile}
                ref={resultsInput}
                type="file"
              />
              <button
                className={styles.runButton}
                disabled={!sourcesLoaded || processing}
                onClick={runChecks}
                type="button"
              >
                <AppIcon name="play" />
                {processing ? "Verifying and recomputing…" : "Run bounded robustness checks"}
              </button>
              {!chainReady ? (
                <div className={styles.blockedNote}>
                  <AppIcon name="alert" />
                  Complete and export the Phase 8.1, 8.3, and 8.4 records for one verified release first.
                </div>
              ) : null}
            </div>
          ) : (
            <div className={styles.resultStack}>
              <article className={styles.primaryCard}>
                <div>
                  <span>Reviewed primary estimate</span>
                  <strong>{activeAnalysis.primaryEstimate.formatted}</strong>
                  <small>{activeAnalysis.primaryEstimate.label}</small>
                </div>
                <dl>
                  <div>
                    <dt>Method</dt>
                    <dd>{activeAnalysis.methodLabel}</dd>
                  </div>
                  <div>
                    <dt>Complete n</dt>
                    <dd>{activeAnalysis.completeSampleSize.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>{Math.round(activeAnalysis.primaryEstimate.interval.level * 100)}% interval</dt>
                    <dd>
                      {activeAnalysis.primaryEstimate.interval.lower} to{" "}
                      {activeAnalysis.primaryEstimate.interval.upper}
                    </dd>
                  </div>
                </dl>
              </article>

              <section className={styles.comparisonSection}>
                <div className={styles.sectionTitle}>
                  <div>
                    <span>Method-specific comparison</span>
                    <h3>{comparisonLabel(activeAnalysis)}</h3>
                  </div>
                  <p>{activeAnalysis.comparisonNote}</p>
                </div>
                <div className={styles.alternativeGrid}>
                  {activeAnalysis.alternatives.map((alternative) => (
                    <article key={alternative.id}>
                      <span>{alternative.label}</span>
                      <strong>{alternative.formatted}</strong>
                      {alternative.interval ? (
                        <small>
                          {Math.round(alternative.interval.level * 100)}% interval:{" "}
                          {alternative.interval.lower} to {alternative.interval.upper}
                        </small>
                      ) : null}
                      <p>{alternative.method}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className={styles.influenceSection}>
                <div className={styles.sectionTitle}>
                  <div>
                    <span>Influence screen</span>
                    <h3>Leave-one-out estimate range</h3>
                  </div>
                  <p>
                    This screen omits one complete observation at a time in memory.
                    It never deletes or identifies a row.
                  </p>
                </div>
                {activeAnalysis.influence ? (
                  <div className={styles.influenceGrid}>
                    <div>
                      <span>Minimum</span>
                      <strong>{activeAnalysis.influence.minimumEstimate}</strong>
                    </div>
                    <div>
                      <span>Maximum</span>
                      <strong>{activeAnalysis.influence.maximumEstimate}</strong>
                    </div>
                    <div>
                      <span>Largest change</span>
                      <strong>{activeAnalysis.influence.maximumAbsoluteChange}</strong>
                    </div>
                    <div>
                      <span>Direction changed</span>
                      <strong>{activeAnalysis.influence.directionChanged ? "Yes" : "No"}</strong>
                    </div>
                    <p>{activeAnalysis.influence.method}</p>
                  </div>
                ) : (
                  <p className={styles.notEstimable}>
                    A bounded leave-one-out range is not estimable for this sample.
                  </p>
                )}
              </section>

              <div className={styles.evidenceColumns}>
                <section>
                  <h3>What was checked</h3>
                  <ul>
                    {activeAnalysis.diagnostics.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
                <section>
                  <h3>What remains outside this check</h3>
                  <ul>
                    {activeAnalysis.limitations.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
              </div>
            </div>
          )}
        </section>

        <aside className={styles.reviewRail}>
          <div className={styles.reviewHeader}>
            <span><AppIcon name="edit" /></span>
            <div>
              <p className={styles.eyebrow}>Researcher judgment</p>
              <h2>Assessment record</h2>
            </div>
          </div>

          {activeReview && activeAnalysis ? (
            <div className={styles.reviewForm}>
              <label>
                <span>Effect on the primary conclusion</span>
                <select
                  onChange={(event) => updateActiveReview((review) => ({
                    ...review,
                    conclusionImpact: event.target.value as RobustnessConclusionImpact,
                    acknowledged: false,
                  }))}
                  value={activeReview.conclusionImpact}
                >
                  {IMPACT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Interpret the comparison</span>
                <textarea
                  maxLength={4000}
                  onChange={(event) => updateActiveReview((review) => ({
                    ...review,
                    interpretation: event.target.value,
                    acknowledged: false,
                  }))}
                  placeholder="Explain whether the alternative and influence checks change, weaken, or preserve the conclusion—and why."
                  rows={6}
                  value={activeReview.interpretation}
                />
              </label>
              <label>
                <span>Remaining limitations</span>
                <textarea
                  maxLength={4000}
                  onChange={(event) => updateActiveReview((review) => ({
                    ...review,
                    limitations: event.target.value,
                    acknowledged: false,
                  }))}
                  placeholder="Name assumptions and relevant checks that this registry did not address."
                  rows={5}
                  value={activeReview.limitations}
                />
              </label>
              <label className={styles.confirmCheck}>
                <input
                  checked={activeReview.acknowledged}
                  onChange={(event) => updateActiveReview((review) => ({
                    ...review,
                    acknowledged: event.target.checked,
                  }))}
                  type="checkbox"
                />
                <span>
                  I reviewed the aggregate comparison and will not treat it as
                  automatic scientific approval.
                </span>
              </label>
            </div>
          ) : (
            <div className={styles.reviewEmpty}>
              <AppIcon name="sliders" />
              <p>Run the verified checks to unlock the assessment record.</p>
            </div>
          )}

          <div className={styles.studyAssessment}>
            <label>
              <span>Overall robustness conclusion</span>
              <textarea
                disabled={!activeAnalysis}
                maxLength={4000}
                onChange={(event) => persistAssessment({ overallConclusion: event.target.value })}
                placeholder="Synthesize what the bounded checks imply across the reviewed analyses."
                rows={5}
                value={document?.overallConclusion ?? ""}
              />
            </label>
            <label>
              <span>Relevant checks not performed</span>
              <textarea
                disabled={!activeAnalysis}
                maxLength={4000}
                onChange={(event) => persistAssessment({ unperformedChecks: event.target.value })}
                placeholder="Record missing-data alternatives, clustering, scoring, multiplicity, reliability, or other checks that remain outside this registry."
                rows={5}
                value={document?.unperformedChecks ?? ""}
              />
            </label>
          </div>

          <section className={styles.completionGate}>
            <div>
              <p className={styles.eyebrow}>Completion gate</p>
              <h3>{ready ? "Robustness record ready" : statusLabel(document)}</h3>
            </div>
            <ul>
              <GateItem complete={chainReady} label="Release and Phase 8.1–8.4 chain ready" />
              <GateItem complete={analyses.length > 0} label="Exact packages verified and checks run" />
              <GateItem complete={assessmentsComplete} label="Every result assessed with limitations" />
              <GateItem complete={reviewComplete} label="Complete assessment confirmed" />
              <GateItem complete={exportComplete} label="Aggregate record exported" />
            </ul>
            {document?.readiness.issues[0] ? (
              <p className={styles.gateIssue}>{document.readiness.issues[0]}</p>
            ) : null}
            <button
              className={styles.confirmButton}
              disabled={!document || document.readiness.status !== "needs-review" || processing}
              onClick={confirmReview}
              type="button"
            >
              <AppIcon name="check-square" />
              Confirm complete review
            </button>
            <button
              className={styles.exportButton}
              disabled={!document || document.readiness.status !== "needs-export" || processing}
              onClick={() => { void exportRecord(); }}
              type="button"
            >
              <AppIcon name="file" />
              Export robustness record
            </button>
            {document?.exportedAt ? (
              <small>Last exported {formatDate(document.exportedAt)}</small>
            ) : null}
          </section>
        </aside>
      </div>

      <footer className={styles.footer}>
        <div>
          <AppIcon name="shield" />
          <p>
            Passing this gate means Cerise matched the source chain, recomputed
            the primary estimates, and the researcher reviewed bounded advisory
            comparisons. It is not proof of robustness, validity, reproducibility,
            causal identification, or publication readiness.
          </p>
        </div>
        <span>Local tab · no migration · no new service cost</span>
      </footer>
    </main>
  );
}
