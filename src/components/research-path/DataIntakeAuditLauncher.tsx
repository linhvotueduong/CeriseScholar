"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  isDataIntakeAuditReady,
  readDataIntakeAuditReceipt,
  type DataIntakeAuditReceipt,
} from "@/lib/research/dataIntakeAudit";
import { readAnalysisPlanDocument } from "@/lib/research/analysisPlan";
import type { ExperimentRelease } from "@/lib/research/experimentRelease";
import {
  fetchExperimentReleases,
  readLocalExperimentReleases,
  verifiedExperimentReleases,
} from "@/lib/research/experimentReleasePersistence";
import styles from "./ResearchPathWorkspace.module.css";

interface DataIntakeAuditLauncherProps {
  onReadyChange: (ready: boolean) => void;
  projectId: string;
}

function supportsDataIntake(release: ExperimentRelease): boolean {
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
    .filter(supportsDataIntake)
    .sort((left, right) => right.releaseNumber - left.releaseNumber);
}

export default function DataIntakeAuditLauncher({
  onReadyChange,
  projectId,
}: DataIntakeAuditLauncherProps) {
  const [release, setRelease] = useState<ExperimentRelease | null>(null);
  const [receipt, setReceipt] = useState<DataIntakeAuditReceipt | null>(null);
  const [planReady, setPlanReady] = useState(false);
  const mounted = useRef(true);

  const refreshStatus = useCallback(() => {
    void (async () => {
      const candidates = readLocalExperimentReleases(window.localStorage, projectId);
      const local = (await verifiedExperimentReleases(candidates, projectId))
        .filter(supportsDataIntake);
      let releases = local;
      try {
        releases = mergeReleases(await fetchExperimentReleases(projectId), local);
      } catch {
        // Verified local releases remain a safe fallback.
      }
      if (!mounted.current) return;
      const latest = releases[0] ?? null;
      setRelease(latest);
      const plan = latest ? readAnalysisPlanDocument(window.localStorage, latest) : null;
      setPlanReady(plan?.readiness.status === "ready");
      setReceipt(latest ? readDataIntakeAuditReceipt(window.localStorage, latest) : null);
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

  const ready = isDataIntakeAuditReady(receipt);
  const blocking = receipt?.issues.filter((item) => item.severity === "blocking").length ?? 0;
  const review = receipt?.issues.filter((item) => item.severity === "review").length ?? 0;

  useEffect(() => {
    onReadyChange(ready);
  }, [onReadyChange, ready]);

  return (
    <div className={styles.experimentLauncher}>
      <section className={styles.experimentLauncherHero}>
        <div className={styles.experimentLauncherIcon} aria-hidden="true">
          <AppIcon name="shield" />
        </div>
        <div>
          <p className={styles.eyebrow}>Phase 8.2 · Data Intake &amp; Audit</p>
          <h2>Verify the Local Host export before preparing participant data</h2>
          <p>
            Match release and contract checksums, prove production/pilot separation,
            audit schema and missingness, and save only a bounded aggregate receipt.
            No participant value is retained, uploaded, or sent to AI.
          </p>
        </div>
        <Link
          className={styles.experimentLaunchButton}
          href={`/data-intake/${projectId}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {receipt ? "Continue Data Audit" : "Open Data Intake"}
          <AppIcon name="external-link" />
        </Link>
      </section>

      <section className={styles.experimentStatusGrid} aria-label="Data intake status">
        <div>
          <span>Frozen source</span>
          <strong>{release ? `Release v${release.releaseNumber}` : "Not available"}</strong>
          <small>{release ? "Verified immutable release" : "Freeze a format-v5 release first"}</small>
        </div>
        <div className={planReady ? styles.experimentStatusReady : styles.experimentStatusBlocked}>
          <span>Analysis Plan</span>
          <strong>{planReady ? "Ready" : "Required"}</strong>
          <small>Plan snapshot must precede intake</small>
        </div>
        <div>
          <span>Production / pilot</span>
          <strong>
            {receipt
              ? `${receipt.modes.production.completed} / ${receipt.modes.pilot.total}`
              : "Not audited"}
          </strong>
          <small>{receipt ? "Mode-separated session counts" : "Select the full export folder"}</small>
        </div>
        <div className={ready ? styles.experimentStatusReady : styles.experimentStatusBlocked}>
          <span>Completion gate</span>
          <strong>
            {!receipt
              ? "Audit required"
              : blocking > 0
                ? `${blocking} blocking`
                : !receipt.reviewedAt
                  ? `${review} to review`
                  : ready
                    ? "Ready"
                    : "Review required"}
          </strong>
          <small>
            {receipt?.reviewedAt
              ? "Aggregate audit receipt reviewed"
              : "No transformation or statistics yet"}
          </small>
        </div>
      </section>

      <div className={styles.experimentPrivacyNote}>
        <AppIcon name="lock" />
        <div>
          <strong>Participant rows are discarded immediately after local aggregation.</strong>
          <p>
            The saved receipt contains only provenance, counts, field names, checksums,
            missingness rates, and review issues. It is not a validity certification or
            statistical result.
          </p>
        </div>
      </div>
    </div>
  );
}
