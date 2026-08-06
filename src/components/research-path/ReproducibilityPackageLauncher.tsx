"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  isAnalysisExecutionReady,
  readAnalysisExecutionDocument,
} from "@/lib/research/analysisExecution";
import {
  isAnalysisInterpretationReady,
  readAnalysisInterpretationDocument,
} from "@/lib/research/analysisResults";
import { readAnalysisPlanDocument } from "@/lib/research/analysisPlan";
import {
  isDataIntakeAuditReady,
  readDataIntakeAuditReceipt,
} from "@/lib/research/dataIntakeAudit";
import {
  isDataPreparationReady,
  readDataPreparationDocument,
} from "@/lib/research/dataPreparation";
import type { ExperimentRelease } from "@/lib/research/experimentRelease";
import {
  fetchExperimentReleases,
  readLocalExperimentReleases,
  verifiedExperimentReleases,
} from "@/lib/research/experimentReleasePersistence";
import {
  isReproducibilityPackageReady,
  readReproducibilityPackageDocument,
  type ReproducibilityPackageDocument,
} from "@/lib/research/reproducibilityPackage";
import styles from "./ResearchPathWorkspace.module.css";

interface ReproducibilityPackageLauncherProps {
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

export default function ReproducibilityPackageLauncher({
  onReadyChange,
  projectId,
}: ReproducibilityPackageLauncherProps) {
  const [release, setRelease] = useState<ExperimentRelease | null>(null);
  const [document, setDocument] = useState<ReproducibilityPackageDocument | null>(null);
  const [phase85Ready, setPhase85Ready] = useState(false);
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
      const plan = latest
        ? readAnalysisPlanDocument(window.localStorage, latest)
        : null;
      const audit = latest
        ? readDataIntakeAuditReceipt(window.localStorage, latest)
        : null;
      const preparation = latest && audit && isDataIntakeAuditReady(audit)
        ? readDataPreparationDocument(window.localStorage, latest, audit)
        : null;
      const execution = latest
        && plan?.readiness.status === "ready"
        && preparation
        && isDataPreparationReady(preparation)
        ? readAnalysisExecutionDocument(window.localStorage, latest, plan, preparation)
        : null;
      const interpretation = latest
        && plan
        && preparation
        && execution
        && isAnalysisExecutionReady(execution)
        ? readAnalysisInterpretationDocument(
          window.localStorage,
          latest,
          plan,
          preparation,
          execution,
        )
        : null;
      const nextDocument = latest
        && plan
        && audit
        && preparation
        && execution
        && interpretation
        && isAnalysisInterpretationReady(interpretation)
        ? readReproducibilityPackageDocument(
          window.localStorage,
          latest,
          plan,
          audit,
          preparation,
          execution,
          interpretation,
        )
        : null;

      setRelease(latest);
      setPhase85Ready(isAnalysisInterpretationReady(interpretation));
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

  const ready = isReproducibilityPackageReady(document);

  useEffect(() => {
    onReadyChange(ready);
  }, [onReadyChange, ready]);

  return (
    <div className={styles.experimentLauncher}>
      <section className={styles.experimentLauncherHero}>
        <div className={styles.experimentLauncherIcon} aria-hidden="true">
          <AppIcon name="folder" />
        </div>
        <div>
          <p className={styles.eyebrow}>Phase 8.6 · Reproducibility Package</p>
          <h2>Assemble and verify a bounded local preservation archive</h2>
          <p>
            Package the frozen contract, analysis plan, aggregate audit,
            preparation log, reviewed analysis record, results, figures,
            interpretation, versions, and file-level checksums without embedding
            participant data, media, or the combined database.
          </p>
        </div>
        <Link
          className={styles.experimentLaunchButton}
          href={`/reproducibility-package/${projectId}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {document ? "Continue Reproducibility Package" : "Open Package Workspace"}
          <AppIcon name="external-link" />
        </Link>
      </section>

      <section className={styles.experimentStatusGrid} aria-label="Reproducibility package status">
        <div>
          <span>Frozen source</span>
          <strong>{release ? `Release v${release.releaseNumber}` : "Not available"}</strong>
          <small>Release and analysis contract must pass checksums</small>
        </div>
        <div className={phase85Ready ? styles.experimentStatusReady : styles.experimentStatusBlocked}>
          <span>Results Record</span>
          <strong>{phase85Ready ? "Ready" : "Required"}</strong>
          <small>Exact Phase 8.5 JSON is verified again in the workspace</small>
        </div>
        <div>
          <span>Archive verification</span>
          <strong>{document?.lastBuild ? "Passed" : "Not built"}</strong>
          <small>Deterministic USTAR with raw-byte SHA-256 checksums</small>
        </div>
        <div className={ready ? styles.experimentStatusReady : styles.experimentStatusBlocked}>
          <span>Completion gate</span>
          <strong>
            {ready
              ? "Ready"
              : document?.readiness.status === "needs-export"
                ? "Local export required"
                : document?.readiness.status === "needs-build"
                  ? "Verified build required"
                  : document?.readiness.status === "needs-review"
                    ? "Review required"
                    : "Package context required"}
          </strong>
          <small>Records a local export; nothing is uploaded automatically</small>
        </div>
      </section>

      <div className={styles.experimentPrivacyNote}>
        <AppIcon name="lock" />
        <div>
          <strong>Phase 8.6 preserves provenance and aggregate outputs, not restricted evidence.</strong>
          <p>
            External locations are bounded researcher-authored references only.
            Checksum verification detects change but is not a signature, trusted
            timestamp, reproducibility finding, validity certificate, or submission.
          </p>
        </div>
      </div>
    </div>
  );
}
