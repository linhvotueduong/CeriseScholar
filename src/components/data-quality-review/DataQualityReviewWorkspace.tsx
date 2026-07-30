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
  verifyPreparedAnalysisPackage,
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
import {
  MAX_DERIVED_PACKAGE_BYTES,
  buildDataQualityRecordExport,
  createDataQualityReviewDocument,
  isDataQualityReviewReady,
  markDataQualityReviewed,
  readDataQualityReviewDocument,
  runDataQualityReview,
  updateDataQualityAssessment,
  verifyDataQualityRecordExport,
  writeDataQualityReviewDocument,
  type DataQualityDisposition,
  type DataQualityFinding,
  type DataQualityFindingReview,
  type DataQualityReport,
  type DataQualityReviewDocument,
  type DataQualityVariableProfile,
} from "@/lib/research/dataQualityReview";
import type { ExperimentRelease } from "@/lib/research/experimentRelease";
import {
  fetchExperimentReleases,
  readLocalExperimentReleases,
  verifiedExperimentReleases,
} from "@/lib/research/experimentReleasePersistence";
import styles from "./DataQualityReviewWorkspace.module.css";

interface DataQualityReviewWorkspaceProps {
  projectId: string;
  projectName: string;
}

const DISPOSITION_OPTIONS: ReadonlyArray<{
  value: DataQualityDisposition;
  label: string;
}> = [
  { value: "not-reviewed", label: "Select a decision" },
  { value: "accepted-as-described", label: "Accept and document" },
  { value: "addressed-in-preparation", label: "Addressed in preparation" },
  { value: "requires-sensitivity-review", label: "Carry into sensitivity review" },
  { value: "not-applicable", label: "Not applicable" },
];

function supportsQualityReview(release: ExperimentRelease): boolean {
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
    .filter(supportsQualityReview)
    .sort((left, right) => right.releaseNumber - left.releaseNumber);
}

function safeExportName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "cerise-data-quality";
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

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(value > 0 && value < 0.01 ? 2 : 1)}%`;
}

function statusLabel(document: DataQualityReviewDocument | null): string {
  if (!document) return "Preparation required";
  if (document.readiness.status === "needs-source") return "Derived package required";
  if (document.readiness.status === "needs-assessment") return "Decisions required";
  if (document.readiness.status === "needs-review") return "Confirmation required";
  if (document.readiness.status === "needs-export") return "Export required";
  return "Ready";
}

function numericProfile(profile: DataQualityVariableProfile): string {
  if (!profile.numericSummary) return "Not a consistently numeric field";
  const summary = profile.numericSummary;
  const spread = summary.sampleStandardDeviation === null
    ? "SD unavailable"
    : `SD ${summary.sampleStandardDeviation}`;
  return `Mean ${summary.mean} · ${spread} · Median ${summary.median} · ${summary.minimum}–${summary.maximum}`;
}

function findingTone(finding: DataQualityFinding): string {
  return finding.severity === "review" ? "Review required" : "Document context";
}

function GateItem({ complete, label }: { complete: boolean; label: string }) {
  return (
    <li className={complete ? styles.gateComplete : ""}>
      <span>{complete ? <AppIcon name="check-square" /> : null}</span>
      {label}
    </li>
  );
}

async function parseJsonFile(file: File): Promise<unknown> {
  if (file.size <= 0 || file.size > MAX_DERIVED_PACKAGE_BYTES) {
    throw new Error(
      `The Phase 8.3 package is empty or exceeds ${readableBytes(MAX_DERIVED_PACKAGE_BYTES)}.`,
    );
  }
  try {
    const bytes = await file.arrayBuffer();
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("The Phase 8.3 package is not valid UTF-8 JSON.");
  }
}

export default function DataQualityReviewWorkspace({
  projectId,
  projectName,
}: DataQualityReviewWorkspaceProps) {
  const [releases, setReleases] = useState<ExperimentRelease[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [plan, setPlan] = useState<AnalysisPlanDocument | null>(null);
  const [preparation, setPreparation] = useState<DataPreparationDocument | null>(null);
  const [document, setDocument] = useState<DataQualityReviewDocument | null>(null);
  const [report, setReport] = useState<DataQualityReport | null>(null);
  const [activeFindingId, setActiveFindingId] = useState("");
  const [preparedName, setPreparedName] = useState("");
  const [preparedSize, setPreparedSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const preparedInput = useRef<HTMLInputElement>(null);
  const preparedEnvelope = useRef<unknown>(null);
  const preparedPackage = useRef<DataPreparationPackage | null>(null);

  const selectedRelease = useMemo(
    () => releases.find((release) => release.releaseId === selectedReleaseId) ?? null,
    [releases, selectedReleaseId],
  );
  const activeFinding = useMemo(
    () => report?.findings.find((finding) => finding.id === activeFindingId)
      ?? report?.findings[0]
      ?? null,
    [activeFindingId, report],
  );
  const activeReview = useMemo(
    () => document?.reviews.find((review) => review.findingId === activeFinding?.id)
      ?? null,
    [activeFinding, document],
  );

  const clearSourceMemory = useCallback(() => {
    preparedEnvelope.current = null;
    preparedPackage.current = null;
    setPreparedName("");
    setPreparedSize(0);
    setReport(null);
    setActiveFindingId("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const candidates = readLocalExperimentReleases(window.localStorage, projectId);
      const local = (await verifiedExperimentReleases(candidates, projectId))
        .filter(supportsQualityReview);
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
      setDocument(null);
      return;
    }
    const nextPlan = readAnalysisPlanDocument(window.localStorage, selectedRelease);
    const audit = readDataIntakeAuditReceipt(window.localStorage, selectedRelease);
    const nextPreparation = audit && isDataIntakeAuditReady(audit)
      ? readDataPreparationDocument(window.localStorage, selectedRelease, audit)
      : null;
    const existing = nextPlan
      && nextPreparation
      && nextPlan.readiness.status === "ready"
      && isDataPreparationReady(nextPreparation)
      ? readDataQualityReviewDocument(
        window.localStorage,
        selectedRelease,
        nextPlan,
        nextPreparation,
      )
      : null;
    const created = !existing
      && nextPlan
      && nextPreparation
      && nextPlan.readiness.status === "ready"
      && isDataPreparationReady(nextPreparation)
      ? createDataQualityReviewDocument(
        selectedRelease,
        nextPlan,
        nextPreparation,
      )
      : null;
    const nextDocument = existing ?? created;
    if (nextDocument && nextPlan && nextPreparation) {
      writeDataQualityReviewDocument(
        window.localStorage,
        selectedRelease,
        nextPlan,
        nextPreparation,
        nextDocument,
      );
    }
    setPlan(nextPlan);
    setPreparation(nextPreparation);
    setDocument(nextDocument);
  }, [clearSourceMemory, selectedRelease]);

  const saveDocument = useCallback((next: DataQualityReviewDocument) => {
    if (!selectedRelease || !plan || !preparation) return;
    const saved = writeDataQualityReviewDocument(
      window.localStorage,
      selectedRelease,
      plan,
      preparation,
      next,
    );
    setDocument(saved);
  }, [plan, preparation, selectedRelease]);

  const handlePreparedFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedRelease || !plan || !preparation) return;
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      const parsed = await parseJsonFile(file);
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
      setReport(null);
      setActiveFindingId("");
      setNotice(
        "The exact Phase 8.3 package was verified in this tab. Participant rows were not persisted.",
      );
    } catch (cause) {
      clearSourceMemory();
      setError(cause instanceof Error ? cause.message : "The derived package could not be verified.");
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
      || !preparedEnvelope.current
    ) {
      setError("Select the exact Phase 8.3 derived package before running quality checks.");
      return;
    }
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      const run = await runDataQualityReview(
        document,
        preparedEnvelope.current,
        selectedRelease,
        plan,
        preparation,
      );
      preparedPackage.current = run.preparedPackage;
      saveDocument(run.document);
      setReport(run.report);
      setActiveFindingId(run.report.findings[0]?.id ?? "");
      setNotice(
        "Aggregate profiles were recomputed. Review cues require researcher decisions; no row was changed or excluded.",
      );
    } catch (cause) {
      setReport(null);
      setError(cause instanceof Error ? cause.message : "The quality checks could not run.");
    } finally {
      setProcessing(false);
    }
  };

  const persistAssessment = useCallback((
    changes: {
      reviews?: DataQualityFindingReview[];
      overallConclusion?: string;
      remainingLimitations?: string;
    },
  ) => {
    if (!document || !selectedRelease || !plan || !preparation || !document.lastRun) return;
    try {
      saveDocument(updateDataQualityAssessment(
        document,
        changes,
        selectedRelease,
        plan,
        preparation,
      ));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The quality decision could not be saved.");
    }
  }, [document, plan, preparation, saveDocument, selectedRelease]);

  const updateActiveReview = useCallback((
    updater: (review: DataQualityFindingReview) => DataQualityFindingReview,
  ) => {
    if (!document || !activeReview) return;
    persistAssessment({
      reviews: document.reviews.map((review) => (
        review.findingId === activeReview.findingId ? updater(review) : review
      )),
    });
  }, [activeReview, document, persistAssessment]);

  const confirmReview = () => {
    if (!document || !selectedRelease || !plan || !preparation || !report) {
      setError("Run and inspect the aggregate checks in this tab before confirming review.");
      return;
    }
    try {
      saveDocument(markDataQualityReviewed(
        document,
        selectedRelease,
        plan,
        preparation,
      ));
      setError("");
      setNotice("The complete quality review is confirmed. Aggregate export is enabled.");
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
      || !preparedPackage.current
      || !preparedEnvelope.current
    ) {
      setError("Re-select the exact Phase 8.3 package before exporting the quality record.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      const built = await buildDataQualityRecordExport(
        document,
        preparedPackage.current,
        selectedRelease,
        plan,
        preparation,
      );
      await verifyDataQualityRecordExport(
        built.export,
        preparedEnvelope.current,
        built.document,
        selectedRelease,
        plan,
        preparation,
      );
      saveDocument(built.document);
      downloadJson(
        `${safeExportName(projectName)}-data-quality-record-v${selectedRelease.releaseNumber}.json`,
        built.export,
      );
      setNotice(
        "The aggregate quality record was rebuilt, independently verified, and downloaded without participant rows or participant-level value lists.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The quality record could not be exported.");
    } finally {
      setProcessing(false);
    }
  };

  const chainReady = Boolean(
    selectedRelease
    && plan?.readiness.status === "ready"
    && preparation
    && isDataPreparationReady(preparation),
  );
  const sourceLoaded = Boolean(preparedPackage.current);
  const decisionsComplete = Boolean(
    document?.lastRun
    && document.readiness.status !== "needs-source"
    && document.readiness.status !== "needs-assessment",
  );
  const reviewComplete = Boolean(document?.reviewedAt);
  const exportComplete = Boolean(document?.exportedAt);
  const ready = isDataQualityReviewReady(document);

  if (loading) {
    return (
      <main className={styles.loading}>
        <span />
        Loading the verified preparation chain…
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
            <small>Data-Quality Review Studio</small>
          </div>
        </div>
        <div className={styles.projectContext}>
          <span>{projectName}</span>
          <strong>{statusLabel(document)}</strong>
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Phase 8.7B · Local descriptive review</p>
          <h1>Understand the derived dataset before interpreting primary analyses</h1>
          <p>
            Recompute bounded completeness, type, distribution, condition, and trial
            summaries from the exact Phase 8.3 package, then record what every cue
            means for the planned analysis.
          </p>
        </div>
        <div className={styles.heroBoundary}>
          <AppIcon name="shield" />
          <div>
            <strong>No automatic cleaning. No AI. No cloud analysis.</strong>
            <span>Participant rows stay in memory and are never shown or exported.</span>
          </div>
        </div>
      </section>

      <section className={styles.provenanceStrip} aria-label="Verified quality-review provenance">
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
          <span>Preparation receipt</span>
          <strong>{preparation?.readiness.status === "ready" ? "Reviewed" : "Required"}</strong>
          <small>{preparation?.lastRun ? shortChecksum(preparation.lastRun.packageChecksum) : "Phase 8.3 required"}</small>
        </div>
        <div>
          <span>Aggregate record</span>
          <strong>{ready ? "Verified" : "Pending"}</strong>
          <small>{document?.exportedAt ? formatDate(document.exportedAt) : "Separate from the Phase 8.6 archive"}</small>
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
          <section className={styles.railCard}>
            <div className={styles.railHeading}>
              <span>01</span>
              <div>
                <strong>Exact local source</strong>
                <small>Phase 8.3 derived package</small>
              </div>
            </div>
            <label>
              Release
              <select
                onChange={(event) => setSelectedReleaseId(event.target.value)}
                value={selectedReleaseId}
              >
                {releases.length === 0 ? <option value="">No analysis release</option> : null}
                {releases.map((release) => (
                  <option key={release.releaseId} value={release.releaseId}>
                    Release v{release.releaseNumber}
                  </option>
                ))}
              </select>
            </label>
            <input
              accept="application/json,.json"
              className={styles.hiddenInput}
              onChange={handlePreparedFile}
              ref={preparedInput}
              type="file"
            />
            <button
              className={styles.sourceButton}
              disabled={!chainReady || processing}
              onClick={() => preparedInput.current?.click()}
              type="button"
            >
              <AppIcon name="upload" />
              Select Phase 8.3 package
            </button>
            <div className={sourceLoaded ? styles.sourceReady : styles.sourceEmpty}>
              <strong>{preparedName || "No package selected"}</strong>
              <span>{preparedName ? `${readableBytes(preparedSize)} · verified` : "JSON stays in this tab"}</span>
            </div>
            <button
              className={styles.primaryButton}
              disabled={!sourceLoaded || processing || !document}
              onClick={runChecks}
              type="button"
            >
              {processing ? "Checking…" : "Run aggregate review"}
            </button>
          </section>

          <section className={styles.railCard}>
            <div className={styles.railHeading}>
              <span>02</span>
              <div>
                <strong>Completion gate</strong>
                <small>{statusLabel(document)}</small>
              </div>
            </div>
            <ul className={styles.gateList}>
              <GateItem complete={chainReady} label="Reviewed Phase 8.3 chain" />
              <GateItem complete={sourceLoaded} label="Exact package in memory" />
              <GateItem complete={decisionsComplete} label="Every finding dispositioned" />
              <GateItem complete={reviewComplete} label="Complete review confirmed" />
              <GateItem complete={exportComplete} label="Aggregate record verified" />
            </ul>
          </section>

          <section className={styles.privacyCard}>
            <AppIcon name="lock" />
            <div>
              <strong>Memory-only participant boundary</strong>
              <p>
                Browser storage contains only checksums, finding decisions, notes,
                and timestamps. It never receives response or trial rows.
              </p>
            </div>
          </section>
        </aside>

        <div className={styles.reviewCanvas}>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Aggregate snapshot</p>
                <h2>Coverage after reproducible preparation</h2>
              </div>
              <span>{report ? `${report.findings.length} review item(s)` : "Run required"}</span>
            </div>
            <div className={styles.metricGrid}>
              <div>
                <span>Response rows</span>
                <strong>{report?.summary.responseRows ?? document?.lastRun?.responseRows ?? "—"}</strong>
                <small>{report ? `${report.summary.completeRows} complete across profiled variables` : "Exact package required"}</small>
              </div>
              <div>
                <span>Profiled variables</span>
                <strong>{report?.summary.responseVariables ?? document?.lastRun?.variableCount ?? "—"}</strong>
                <small>{report ? `${report.summary.totalMissingCells} missing cells` : "No participant values stored"}</small>
              </div>
              <div>
                <span>Trial rows</span>
                <strong>{report?.summary.trialRows ?? document?.lastRun?.trialRows ?? "—"}</strong>
                <small>{report ? `${report.summary.productionTrialRows} production · ${report.summary.practiceTrialRows} practice` : "Aggregate only"}</small>
              </div>
              <div>
                <span>Explicit exclusions</span>
                <strong>{report?.summary.preparation.excludedRows ?? preparation?.lastRun?.excludedRows ?? "—"}</strong>
                <small>Inherited from reviewed Phase 8.3 operations</small>
              </div>
            </div>
            {report?.summary.reactionTimeSummary ? (
              <div className={styles.inlineSummary}>
                <strong>Positive browser-measured reaction times</strong>
                <span>
                  n={report.summary.reactionTimeSummary.count} · median {report.summary.reactionTimeSummary.median} ms ·
                  IQR {report.summary.reactionTimeSummary.firstQuartile}–{report.summary.reactionTimeSummary.thirdQuartile} ms
                </span>
              </div>
            ) : null}
            {report ? (
              <div className={styles.inlineSummary}>
                <strong>Checksummed inclusion ledger</strong>
                <span>
                  {report.summary.inclusionLedger.includedRows} included ·
                  {" "}{report.summary.inclusionLedger.excludedRows} excluded ·
                  {" "}{report.summary.inclusionLedger.exclusionRuleCounts.length} exclusion rule(s)
                </span>
              </div>
            ) : null}
            {report && report.summary.behavioral.sessionsProfiled > 0 ? (
              <div className={styles.inlineSummary}>
                <strong>Included-population behavioral checks</strong>
                <span>
                  Attention {report.summary.behavioral.attentionChecksCorrect}/
                  {report.summary.behavioral.attentionChecksExpected} correct ·
                  {" "}{report.summary.behavioral.sessionsWithFocusLoss} session(s) with focus loss ·
                  {" "}scored accuracy{" "}
                  {report.summary.behavioral.scoredAccuracyRate === null
                    ? "not available"
                    : formatPercent(report.summary.behavioral.scoredAccuracyRate)}
                </span>
              </div>
            ) : null}
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Descriptive profiles</p>
                <h2>Variables without participant-level previews</h2>
              </div>
              <span>Values and labels are withheld</span>
            </div>
            {report ? (
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Variable</th>
                      <th>Role</th>
                      <th>Observed</th>
                      <th>Missing</th>
                      <th>Distinct</th>
                      <th>Numeric summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.variables.map((profile) => (
                      <tr key={profile.name}>
                        <td>
                          <strong>{profile.name}</strong>
                          <small>{profile.source} · {profile.responseType}</small>
                        </td>
                        <td>{profile.roles.join(", ") || "derived / unassigned"}</td>
                        <td>{profile.observedCount}/{profile.totalCount}</td>
                        <td>{profile.missingCount} · {formatPercent(profile.missingRate)}</td>
                        <td>{profile.distinctCount}</td>
                        <td>{numericProfile(profile)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <AppIcon name="workflow" />
                <h3>Select the exact derived package</h3>
                <p>
                  Cerise will show only bounded counts and numeric summaries. It will
                  not render session IDs, response values, category labels, or trial values.
                </p>
              </div>
            )}
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Researcher decisions</p>
                <h2>Classify every deterministic review cue</h2>
              </div>
              <span>
                {document?.reviews.filter((review) => review.acknowledged).length ?? 0}/
                {document?.reviews.length ?? 0} acknowledged
              </span>
            </div>
            {report && activeFinding && activeReview ? (
              <div className={styles.findingGrid}>
                <nav aria-label="Data-quality findings" className={styles.findingList}>
                  {report.findings.map((finding, index) => {
                    const review = document?.reviews.find((item) => item.findingId === finding.id);
                    return (
                      <button
                        className={finding.id === activeFinding.id ? styles.findingActive : ""}
                        key={finding.id}
                        onClick={() => setActiveFindingId(finding.id)}
                        type="button"
                      >
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <div>
                          <strong>{finding.title}</strong>
                          <small>{review?.acknowledged ? "Decision recorded" : findingTone(finding)}</small>
                        </div>
                      </button>
                    );
                  })}
                </nav>
                <div className={styles.findingEditor}>
                  <div className={styles.findingHeader}>
                    <div>
                      <span className={activeFinding.severity === "review" ? styles.reviewBadge : styles.infoBadge}>
                        {findingTone(activeFinding)}
                      </span>
                      <h3>{activeFinding.title}</h3>
                    </div>
                    <small>{activeFinding.category}</small>
                  </div>
                  <p>{activeFinding.detail}</p>
                  <div className={styles.findingMetrics}>
                    {activeFinding.metrics.map((item) => (
                      <div key={item.id}>
                        <span>{item.label}</span>
                        <strong>{item.value}{item.denominator === null ? "" : ` / ${item.denominator}`}</strong>
                      </div>
                    ))}
                  </div>
                  <label>
                    Researcher disposition
                    <select
                      onChange={(event) => updateActiveReview((review) => ({
                        ...review,
                        disposition: event.target.value as DataQualityDisposition,
                      }))}
                      value={activeReview.disposition}
                    >
                      {DISPOSITION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Decision note
                    <textarea
                      maxLength={500}
                      onChange={(event) => updateActiveReview((review) => ({
                        ...review,
                        note: event.target.value,
                      }))}
                      placeholder="Explain why this cue is acceptable, already addressed, not applicable, or must be carried into sensitivity analysis."
                      rows={5}
                      value={activeReview.note}
                    />
                  </label>
                  <label className={styles.checkLabel}>
                    <input
                      checked={activeReview.acknowledged}
                      onChange={(event) => updateActiveReview((review) => ({
                        ...review,
                        acknowledged: event.target.checked,
                      }))}
                      type="checkbox"
                    />
                    <span>
                      I reviewed this aggregate cue and understand that Cerise did not
                      correct, exclude, or infer a scientific decision from it.
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <AppIcon name="target" />
                <h3>Finding decisions appear after the deterministic run</h3>
                <p>Every review cue must receive a disposition, explanation, and acknowledgment.</p>
              </div>
            )}
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Study-level conclusion</p>
                <h2>State what the descriptive review supports—and what remains unresolved</h2>
              </div>
            </div>
            <div className={styles.conclusionGrid}>
              <label>
                Overall data-quality conclusion
                <textarea
                  disabled={!document?.lastRun}
                  maxLength={1000}
                  onChange={(event) => persistAssessment({ overallConclusion: event.target.value })}
                  placeholder="Describe whether the derived dataset is suitable for the planned analysis and identify the material caveats."
                  rows={5}
                  value={document?.overallConclusion ?? ""}
                />
              </label>
              <label>
                Remaining limitations
                <textarea
                  disabled={!document?.lastRun}
                  maxLength={1000}
                  onChange={(event) => persistAssessment({ remainingLimitations: event.target.value })}
                  placeholder="Record unresolved missingness, measurement, representativeness, timing, dependence, or other limits."
                  rows={5}
                  value={document?.remainingLimitations ?? ""}
                />
              </label>
            </div>
            <div className={styles.reviewActions}>
              <button
                disabled={!report || document?.readiness.status !== "needs-review" || processing}
                onClick={confirmReview}
                type="button"
              >
                Confirm complete review
              </button>
              <button
                className={styles.exportButton}
                disabled={!report || document?.readiness.status !== "needs-export" || processing}
                onClick={exportRecord}
                type="button"
              >
                Export verified aggregate record
              </button>
            </div>
            <p className={styles.boundaryNote}>
              Completion documents a reviewed descriptive process. It does not establish
              that missingness is ignorable, exclusions are justified, timing is certified,
              the sample is representative, or any statistical conclusion is valid.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
