"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
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
import {
  isDataQualityReviewReady,
  readDataQualityReviewDocument,
  type DataQualityReviewDocument,
} from "@/lib/research/dataQualityReview";
import type { ExperimentRelease } from "@/lib/research/experimentRelease";
import {
  fetchExperimentReleases,
  readLocalExperimentReleases,
  verifiedExperimentReleases,
} from "@/lib/research/experimentReleasePersistence";
import styles from "./ResearchPathWorkspace.module.css";

interface DataQualityReviewLauncherProps {
  onReadyChange: (ready: boolean) => void;
  projectId: string;
}

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

export default function DataQualityReviewLauncher({
  onReadyChange,
  projectId,
}: DataQualityReviewLauncherProps) {
  const [release, setRelease] = useState<ExperimentRelease | null>(null);
  const [plan, setPlan] = useState<AnalysisPlanDocument | null>(null);
  const [preparation, setPreparation] = useState<DataPreparationDocument | null>(null);
  const [document, setDocument] = useState<DataQualityReviewDocument | null>(null);
  const mounted = useRef(true);

  const refreshStatus = useCallback(() => {
    void (async () => {
      const candidates = readLocalExperimentReleases(window.localStorage, projectId);
      const local = (await verifiedExperimentReleases(candidates, projectId))
        .filter(supportsQualityReview);
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
        ? readDataQualityReviewDocument(
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

  const ready = isDataQualityReviewReady(document);
  const preparationReady = isDataPreparationReady(preparation);
  const acknowledged = document?.reviews.filter((review) => review.acknowledged).length ?? 0;
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
          <p className={styles.eyebrow}>Phase 8.7B · Data-Quality and Descriptive Review</p>
          <h2>Review aggregate completeness and distributions before primary analysis</h2>
          <p>
            Re-select the exact Phase 8.3 package, compute bounded aggregate
            profiles, classify every review cue, and export a verified record
            without persisting or displaying participant values.
          </p>
        </div>
        <Link
          className={styles.experimentLaunchButton}
          href={`/data-quality-review/${projectId}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {document ? "Continue Quality Review" : "Open Quality Workspace"}
          <AppIcon name="external-link" />
        </Link>
      </section>

      <section className={styles.experimentStatusGrid} aria-label="Data-quality review status">
        <div>
          <span>Frozen source</span>
          <strong>{release ? `Release v${release.releaseNumber}` : "Not available"}</strong>
          <small>{plan?.readiness.status === "ready" ? "Analysis plan ready" : "Phase 8.1 required"}</small>
        </div>
        <div className={preparationReady ? styles.experimentStatusReady : styles.experimentStatusBlocked}>
          <span>Derived package</span>
          <strong>{preparationReady ? "Ready to re-select" : "Required"}</strong>
          <small>Reviewed Phase 8.3 export is the only participant-data input</small>
        </div>
        <div>
          <span>Finding decisions</span>
          <strong>{document?.lastRun ? `${acknowledged}/${reviewTotal} acknowledged` : "Not started"}</strong>
          <small>Decisions and limitations remain researcher-authored</small>
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
                    ? "Decisions required"
                    : "Exact source required"}
          </strong>
          <small>Requires an independently verified aggregate quality record</small>
        </div>
      </section>

      <div className={styles.experimentPrivacyNote}>
        <AppIcon name="lock" />
        <div>
          <strong>No automatic corrections, exclusions, thresholds, or AI.</strong>
          <p>
            Participant rows stay in the active workspace tab. Browser storage and
            the exported record contain bounded aggregates, provenance, researcher
            decisions, and checksums only.
          </p>
        </div>
      </div>
    </div>
  );
}
