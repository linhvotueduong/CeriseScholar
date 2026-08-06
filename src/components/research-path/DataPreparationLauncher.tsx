"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  isDataIntakeAuditReady,
  readDataIntakeAuditReceipt,
  type DataIntakeAuditReceipt,
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

interface DataPreparationLauncherProps {
  onReadyChange: (ready: boolean) => void;
  projectId: string;
}

function supportsPreparation(release: ExperimentRelease): boolean {
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
    .filter(supportsPreparation)
    .sort((left, right) => right.releaseNumber - left.releaseNumber);
}

export default function DataPreparationLauncher({
  onReadyChange,
  projectId,
}: DataPreparationLauncherProps) {
  const [release, setRelease] = useState<ExperimentRelease | null>(null);
  const [audit, setAudit] = useState<DataIntakeAuditReceipt | null>(null);
  const [document, setDocument] = useState<DataPreparationDocument | null>(null);
  const mounted = useRef(true);

  const refreshStatus = useCallback(() => {
    void (async () => {
      const candidates = readLocalExperimentReleases(window.localStorage, projectId);
      const local = (await verifiedExperimentReleases(candidates, projectId))
        .filter(supportsPreparation);
      let releases = local;
      try {
        releases = mergeReleases(await fetchExperimentReleases(projectId), local);
      } catch {
        // Verified local releases remain a safe fallback.
      }
      if (!mounted.current) return;
      const latest = releases[0] ?? null;
      const receipt = latest
        ? readDataIntakeAuditReceipt(window.localStorage, latest)
        : null;
      const preparation = latest && receipt && isDataIntakeAuditReady(receipt)
        ? readDataPreparationDocument(window.localStorage, latest, receipt)
        : null;
      setRelease(latest);
      setAudit(receipt);
      setDocument(preparation);
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

  const ready = isDataPreparationReady(document);
  const auditReady = isDataIntakeAuditReady(audit);

  useEffect(() => {
    onReadyChange(ready);
  }, [onReadyChange, ready]);

  return (
    <div className={styles.experimentLauncher}>
      <section className={styles.experimentLauncherHero}>
        <div className={styles.experimentLauncherIcon} aria-hidden="true">
          <AppIcon name="workflow" />
        </div>
        <div>
          <p className={styles.eyebrow}>Phase 8.3 · Reproducible Preparation</p>
          <h2>Prepare a derived dataset without overwriting the raw evidence</h2>
          <p>
            Re-verify the audited Local Host export, apply ordered declarative
            transformations and exclusions, review aggregate effects, and export a
            checksummed local package. Participant rows never enter browser storage or AI.
          </p>
        </div>
        <Link
          className={styles.experimentLaunchButton}
          href={`/data-preparation/${projectId}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {document ? "Continue Preparation" : "Open Preparation"}
          <AppIcon name="external-link" />
        </Link>
      </section>

      <section className={styles.experimentStatusGrid} aria-label="Data preparation status">
        <div>
          <span>Frozen source</span>
          <strong>{release ? `Release v${release.releaseNumber}` : "Not available"}</strong>
          <small>{release ? "Immutable release selected" : "Freeze a format-v5 release first"}</small>
        </div>
        <div className={auditReady ? styles.experimentStatusReady : styles.experimentStatusBlocked}>
          <span>Data Intake</span>
          <strong>{auditReady ? "Ready" : "Required"}</strong>
          <small>Phase 8.2 must be reviewed first</small>
        </div>
        <div>
          <span>Operation log</span>
          <strong>{document ? `${document.operations.length} recorded` : "Not started"}</strong>
          <small>No arbitrary code or formulas</small>
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
                  : "Source required"}
          </strong>
          <small>Derived package hands off to Phase 8.4</small>
        </div>
      </section>

      <div className={styles.experimentPrivacyNote}>
        <AppIcon name="lock" />
        <div>
          <strong>Raw rows are memory-only and the source export is never changed.</strong>
          <p>
            Cerise persists only operation metadata, integrity checksums, aggregate counts,
            and review/export events. Passing this gate is not statistical analysis or a
            validity certification.
          </p>
        </div>
      </div>
    </div>
  );
}
