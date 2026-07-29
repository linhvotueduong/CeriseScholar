"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
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
import styles from "./ResearchPathWorkspace.module.css";

interface AnalysisExecutionLauncherProps {
  onReadyChange: (ready: boolean) => void;
  projectId: string;
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

export default function AnalysisExecutionLauncher({
  onReadyChange,
  projectId,
}: AnalysisExecutionLauncherProps) {
  const [release, setRelease] = useState<ExperimentRelease | null>(null);
  const [plan, setPlan] = useState<AnalysisPlanDocument | null>(null);
  const [preparation, setPreparation] = useState<DataPreparationDocument | null>(null);
  const [document, setDocument] = useState<AnalysisExecutionDocument | null>(null);
  const mounted = useRef(true);

  const refreshStatus = useCallback(() => {
    void (async () => {
      const candidates = readLocalExperimentReleases(window.localStorage, projectId);
      const local = (await verifiedExperimentReleases(candidates, projectId))
        .filter(supportsAnalysis);
      let releases = local;
      try {
        releases = mergeReleases(await fetchExperimentReleases(projectId), local);
      } catch {
        // Verified local releases remain the safe offline fallback.
      }
      if (!mounted.current) return;

      const latest = releases[0] ?? null;
      const nextPlan = latest
        ? readAnalysisPlanDocument(window.localStorage, latest)
        : null;
      const audit = latest
        ? readDataIntakeAuditReceipt(window.localStorage, latest)
        : null;
      const nextPreparation = latest && audit && isDataIntakeAuditReady(audit)
        ? readDataPreparationDocument(window.localStorage, latest, audit)
        : null;
      const nextDocument = latest
        && nextPlan?.readiness.status === "ready"
        && nextPreparation
        && isDataPreparationReady(nextPreparation)
        ? readAnalysisExecutionDocument(
          window.localStorage,
          latest,
          nextPlan,
          nextPreparation,
        )
        : null;

      setRelease(latest);
      setPlan(nextPlan);
      setPreparation(nextPreparation);
      setDocument(nextDocument);
    })();
  }, [projectId]);

  useEffect(() => {
    mounted.current = true;
    const initialRefresh = window.setTimeout(refreshStatus, 0);
    window.addEventListener("focus", refreshStatus);
    window.addEventListener("storage", refreshStatus);
    return () => {
      mounted.current = false;
      window.clearTimeout(initialRefresh);
      window.removeEventListener("focus", refreshStatus);
      window.removeEventListener("storage", refreshStatus);
    };
  }, [refreshStatus]);

  const ready = isAnalysisExecutionReady(document);
  const preparationReady = isDataPreparationReady(preparation);

  useEffect(() => {
    onReadyChange(ready);
  }, [onReadyChange, ready]);

  return (
    <div className={styles.experimentLauncher}>
      <section className={styles.experimentLauncherHero}>
        <div className={styles.experimentLauncherIcon} aria-hidden="true">
          <AppIcon name="research" />
        </div>
        <div>
          <p className={styles.eyebrow}>Phase 8.4 · Analysis Execution</p>
          <h2>Run a reviewed statistical method against the frozen analysis plan</h2>
          <p>
            Verify the Phase 8.3 package, configure a bounded method for each
            research question, inspect effect sizes, confidence intervals,
            assumptions, and diagnostics, then export aggregate results.
          </p>
        </div>
        <Link
          className={styles.experimentLaunchButton}
          href={`/analysis-execution/${projectId}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {document ? "Continue Analysis" : "Open Analysis"}
          <AppIcon name="external-link" />
        </Link>
      </section>

      <section className={styles.experimentStatusGrid} aria-label="Analysis execution status">
        <div>
          <span>Frozen source</span>
          <strong>{release ? `Release v${release.releaseNumber}` : "Not available"}</strong>
          <small>{plan?.readiness.status === "ready" ? "Analysis plan ready" : "Phase 8.1 required"}</small>
        </div>
        <div className={preparationReady ? styles.experimentStatusReady : styles.experimentStatusBlocked}>
          <span>Prepared package</span>
          <strong>{preparationReady ? "Ready" : "Required"}</strong>
          <small>Phase 8.3 must be reviewed and exported</small>
        </div>
        <div>
          <span>Reviewed methods</span>
          <strong>{document?.lastRun ? `${document.lastRun.analysisCount} executed` : "Not run"}</strong>
          <small>No arbitrary code or remote execution</small>
        </div>
        <div className={ready ? styles.experimentStatusReady : styles.experimentStatusBlocked}>
          <span>Completion gate</span>
          <strong>
            {ready
              ? "Ready"
              : document?.readiness.status === "needs-export"
                ? "Export required"
                : document?.readiness.status === "needs-review"
                  ? "Review required"
                  : document?.readiness.status === "needs-run"
                    ? "Run required"
                    : "Configuration required"}
          </strong>
          <small>Aggregate results hand off to Phase 8.5</small>
        </div>
      </section>

      <div className={styles.experimentPrivacyNote}>
        <AppIcon name="lock" />
        <div>
          <strong>Participant rows are analyzed only in memory and never uploaded.</strong>
          <p>
            Cerise persists bounded configuration, checksums, and review/export
            receipts. The current registry is not general statistical software,
            preregistration, or scientific-validity certification.
          </p>
        </div>
      </div>
    </div>
  );
}
