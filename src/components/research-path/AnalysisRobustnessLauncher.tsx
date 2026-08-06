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
  isAnalysisRobustnessReady,
  readAnalysisRobustnessDocument,
  type AnalysisRobustnessDocument,
} from "@/lib/research/analysisRobustness";
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

interface AnalysisRobustnessLauncherProps {
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

export default function AnalysisRobustnessLauncher({
  onReadyChange,
  projectId,
}: AnalysisRobustnessLauncherProps) {
  const [release, setRelease] = useState<ExperimentRelease | null>(null);
  const [plan, setPlan] = useState<AnalysisPlanDocument | null>(null);
  const [preparation, setPreparation] = useState<DataPreparationDocument | null>(null);
  const [execution, setExecution] = useState<AnalysisExecutionDocument | null>(null);
  const [document, setDocument] = useState<AnalysisRobustnessDocument | null>(null);
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
      const nextExecution = latest
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
      const nextDocument = latest
        && nextPlan
        && nextPreparation
        && nextExecution
        && isAnalysisExecutionReady(nextExecution)
        ? readAnalysisRobustnessDocument(
          window.localStorage,
          latest,
          nextPlan,
          nextPreparation,
          nextExecution,
        )
        : null;

      setRelease(latest);
      setPlan(nextPlan);
      setPreparation(nextPreparation);
      setExecution(nextExecution);
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

  const ready = isAnalysisRobustnessReady(document);
  const sourcesReady = Boolean(
    preparation
    && isDataPreparationReady(preparation)
    && execution
    && isAnalysisExecutionReady(execution),
  );
  const reviewedCount = document?.reviews.filter((review) => review.acknowledged).length ?? 0;
  const reviewTotal = document?.reviews.length ?? 0;

  useEffect(() => {
    onReadyChange(ready);
  }, [onReadyChange, ready]);

  return (
    <div className={styles.experimentLauncher}>
      <section className={styles.experimentLauncherHero}>
        <div className={styles.experimentLauncherIcon} aria-hidden="true">
          <AppIcon name="target" />
        </div>
        <div>
          <p className={styles.eyebrow}>Phase 8.7A · Reviewed Robustness and Sensitivity</p>
          <h2>Challenge primary estimates with bounded, method-specific checks</h2>
          <p>
            Re-select the exact Phase 8.3 derived-data package and Phase 8.4
            aggregate-results package, independently reproduce each primary
            estimate, review deterministic alternatives and influence ranges,
            then export an aggregate-only robustness record.
          </p>
        </div>
        <Link
          className={styles.experimentLaunchButton}
          href={`/analysis-robustness/${projectId}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {document ? "Continue Robustness Review" : "Open Robustness Workspace"}
          <AppIcon name="external-link" />
        </Link>
      </section>

      <section className={styles.experimentStatusGrid} aria-label="Robustness review status">
        <div>
          <span>Frozen source</span>
          <strong>{release ? `Release v${release.releaseNumber}` : "Not available"}</strong>
          <small>{plan?.readiness.status === "ready" ? "Analysis plan ready" : "Phase 8.1 required"}</small>
        </div>
        <div className={sourcesReady ? styles.experimentStatusReady : styles.experimentStatusBlocked}>
          <span>Exact inputs</span>
          <strong>{sourcesReady ? "Ready to re-select" : "Required"}</strong>
          <small>Verified Phase 8.3 and Phase 8.4 exports are required</small>
        </div>
        <div>
          <span>Assessments</span>
          <strong>{document ? `${reviewedCount}/${reviewTotal} acknowledged` : "Not started"}</strong>
          <small>Conclusion impact and remaining limits stay researcher-authored</small>
        </div>
        <div className={ready ? styles.experimentStatusReady : styles.experimentStatusBlocked}>
          <span>Completion gate</span>
          <strong>
            {ready
              ? "Ready"
              : document?.readiness.status === "needs-export"
                ? "Export required"
                : document?.readiness.status === "needs-review"
                  ? "Confirmation required"
                  : document?.readiness.status === "needs-assessment"
                    ? "Assessment required"
                    : "Exact inputs required"}
          </strong>
          <small>Requires a verified aggregate robustness record</small>
        </div>
      </section>

      <div className={styles.experimentPrivacyNote}>
        <AppIcon name="lock" />
        <div>
          <strong>Participant rows remain in the active tab only.</strong>
          <p>
            The launcher stores only bounded provenance, researcher reviews,
            timestamps, checksums, and the export receipt. No participant row is
            uploaded, placed in browser storage, or included in the exported record.
          </p>
        </div>
      </div>
    </div>
  );
}
