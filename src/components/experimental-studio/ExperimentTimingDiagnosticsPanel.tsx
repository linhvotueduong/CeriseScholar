"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  EXPERIMENT_TIMING_DIAGNOSTIC_LIMITATION,
  experimentTimingDiagnosticCsv,
  readExperimentTimingDiagnosticReports,
  runExperimentTimingDiagnostic,
  writeExperimentTimingDiagnosticReport,
  type ExperimentTimingDiagnosticReport,
  type ExperimentTimingDiagnosticSummary,
} from "@/lib/research/experimentTimingDiagnostics";
import styles from "./ExperimentTimingDiagnosticsPanel.module.css";

interface ExperimentTimingDiagnosticsPanelProps {
  projectId: string;
  frozenSummary: ExperimentTimingDiagnosticSummary | null;
  onSummaryChange: (summary: ExperimentTimingDiagnosticSummary) => void;
}

const STATUS_LABELS: Record<ExperimentTimingDiagnosticSummary["status"], string> = {
  stable: "No instability detected",
  review: "Review recommended",
  interrupted: "Run interrupted",
};

function formatMilliseconds(value: number): string {
  if (value === 0) return "Not observed";
  if (value < 0.01) return `${value.toFixed(3)} ms`;
  if (value < 1) return `${value.toFixed(2)} ms`;
  return `${value.toFixed(1)} ms`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(value < 0.01 ? 1 : 0)}%`;
}

function downloadText(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function reportFilename(report: ExperimentTimingDiagnosticReport, extension: "json" | "csv"): string {
  const timestamp = report.recordedAt.replaceAll(":", "-").replaceAll(".", "-");
  return `cerise-timing-diagnostic-${timestamp}.${extension}`;
}

export default function ExperimentTimingDiagnosticsPanel({
  projectId,
  frozenSummary,
  onSummaryChange,
}: ExperimentTimingDiagnosticsPanelProps) {
  const [reports, setReports] = useState<ExperimentTimingDiagnosticReport[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const stored = readExperimentTimingDiagnosticReports(window.localStorage, projectId);
    setReports(stored);
    setSelectedId(stored[0]?.diagnosticId ?? "");
    return () => controllerRef.current?.abort();
  }, [projectId]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.diagnosticId === selectedId) ?? reports[0] ?? null,
    [reports, selectedId],
  );
  const displayedSummary = selectedReport ?? frozenSummary;

  const startDiagnostic = async () => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setRunning(true);
    setProgress(0);
    setMessage("");
    try {
      const report = await runExperimentTimingDiagnostic({
        projectId,
        signal: controller.signal,
        onProgress: setProgress,
      });
      let nextReports = [report];
      let detailedReportSaved = true;
      try {
        nextReports = writeExperimentTimingDiagnosticReport(window.localStorage, report);
      } catch {
        detailedReportSaved = false;
      }
      setReports(nextReports);
      setSelectedId(report.diagnosticId);
      onSummaryChange(report);
      setProgress(1);
      setMessage(
        !detailedReportSaved
          ? "The aggregate was attached to this study, but this browser could not retain the detailed local report. Export it before leaving."
          : report.status === "stable"
          ? "The current run found no instability above Cerise’s engineering review thresholds."
          : "The current run needs review before you rely on browser-measured timing.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The timing check could not finish.");
    } finally {
      controllerRef.current = null;
      setRunning(false);
    }
  };

  return (
    <main className={styles.workspace}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Phase 6.2 · local diagnostic</span>
          <h1>Browser timing diagnostics</h1>
          <p>
            Check clock resolution, frame pacing, and timer drift on a representative device before
            freezing a behavioral study.
          </p>
        </div>
        <div className={styles.heroActions}>
          {running ? (
            <button className={styles.secondaryButton} onClick={() => controllerRef.current?.abort()} type="button">
              Cancel check
            </button>
          ) : null}
          <button className={styles.primaryButton} disabled={running} onClick={() => void startDiagnostic()} type="button">
            <AppIcon name={running ? "clock" : "play"} />
            {running ? "Checking this browser…" : "Run browser check"}
          </button>
        </div>
      </header>

      {running ? (
        <section aria-live="polite" className={styles.progressCard}>
          <div><strong>Keep this tab visible and focused</strong><span>{Math.round(progress * 100)}%</span></div>
          <progress max={1} value={progress} />
          <p>The bounded check takes about two seconds and does not collect participant data.</p>
        </section>
      ) : null}

      {message ? <p aria-live="polite" className={styles.message}>{message}</p> : null}

      <section className={styles.boundaryCard}>
        <AppIcon name="shield" />
        <div>
          <strong>Detailed reports stay on this device</strong>
          <p>
            Cerise saves only the latest aggregate status with the study so a frozen release can identify
            its benchmark. User agent, device context, and raw samples remain in local browser storage or
            in files you export.
          </p>
        </div>
      </section>

      {displayedSummary ? (
        <>
          <section className={styles.summaryHeader}>
            <div>
              <span className={`${styles.status} ${styles[displayedSummary.status]}`}>
                {STATUS_LABELS[displayedSummary.status]}
              </span>
              <h2>Latest selected check</h2>
              <p>
                {new Date(displayedSummary.recordedAt).toLocaleString()} · Engine {displayedSummary.engineVersion}
              </p>
            </div>
            {selectedReport ? (
              <div className={styles.exportActions}>
                <button
                  onClick={() => downloadText(
                    reportFilename(selectedReport, "json"),
                    JSON.stringify(selectedReport, null, 2),
                    "application/json",
                  )}
                  type="button"
                >
                  Export JSON
                </button>
                <button
                  onClick={() => downloadText(
                    reportFilename(selectedReport, "csv"),
                    experimentTimingDiagnosticCsv(selectedReport),
                    "text/csv;charset=utf-8",
                  )}
                  type="button"
                >
                  Export CSV
                </button>
              </div>
            ) : (
              <span className={styles.aggregateOnly}>Aggregate saved with study</span>
            )}
          </section>

          <section aria-label="Timing diagnostic metrics" className={styles.metrics}>
            <article>
              <span>Browser clock resolution</span>
              <strong>{formatMilliseconds(displayedSummary.performanceNowResolutionMs)}</strong>
              <small>Smallest positive performance.now() increment</small>
            </article>
            <article>
              <span>Animation-frame interval</span>
              <strong>{formatMilliseconds(displayedSummary.animationFrameMedianMs)}</strong>
              <small>
                Median · p95 {formatMilliseconds(displayedSummary.animationFrameP95Ms)}
              </small>
            </article>
            <article>
              <span>Frame pacing flagged</span>
              <strong>{formatPercent(displayedSummary.animationFrameJankRate)}</strong>
              <small>{displayedSummary.animationFrameSampleCount} browser frames observed</small>
            </article>
            <article>
              <span>Timer drift</span>
              <strong>{formatMilliseconds(displayedSummary.timeoutMedianDriftMs)}</strong>
              <small>
                Median · p95 {formatMilliseconds(displayedSummary.timeoutP95DriftMs)}
              </small>
            </article>
          </section>

          {selectedReport?.reviewNotes.length ? (
            <section className={styles.reviewCard}>
              <h3>Review notes</h3>
              <ul>{selectedReport.reviewNotes.map((note) => <li key={note}>{note}</li>)}</ul>
            </section>
          ) : displayedSummary.status === "stable" ? (
            <section className={styles.stableCard}>
              <AppIcon name="check-square" />
              <p>
                No instability crossed the engineering thresholds in this short run. This is not a
                scientific validity certificate; repeat it on every planned browser and device class.
              </p>
            </section>
          ) : null}
        </>
      ) : (
        <section className={styles.emptyState}>
          <AppIcon name="clock" />
          <h2>No representative-device check yet</h2>
          <p>Run the diagnostic before releasing a study that depends on exposure duration or reaction time.</p>
        </section>
      )}

      {reports.length > 1 ? (
        <section className={styles.history}>
          <h2>Reports stored on this device</h2>
          <div className={styles.historyList}>
            {reports.map((report) => (
              <button
                aria-current={selectedReport?.diagnosticId === report.diagnosticId ? "true" : undefined}
                key={report.diagnosticId}
                onClick={() => setSelectedId(report.diagnosticId)}
                type="button"
              >
                <span className={`${styles.historyDot} ${styles[report.status]}`} />
                <strong>{STATUS_LABELS[report.status]}</strong>
                <small>{new Date(report.recordedAt).toLocaleString()}</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.limitations}>
        <h2>Interpretation boundary</h2>
        <p>{EXPERIMENT_TIMING_DIAGNOSTIC_LIMITATION}</p>
        <ul>
          <li>Run this check on each browser, operating system, and device class in the sampling plan.</li>
          <li>Repeat it under realistic CPU load and with the actual study assets preloaded.</li>
          <li>Use external hardware validation before making physical-onset or certified timing claims.</li>
        </ul>
      </section>
    </main>
  );
}
