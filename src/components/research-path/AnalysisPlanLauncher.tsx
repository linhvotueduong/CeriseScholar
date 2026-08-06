"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  readAnalysisPlanDocument,
  type AnalysisPlanDocument,
} from "@/lib/research/analysisPlan";
import type { ExperimentRelease } from "@/lib/research/experimentRelease";
import {
  fetchExperimentReleases,
  readLocalExperimentReleases,
  verifiedExperimentReleases,
} from "@/lib/research/experimentReleasePersistence";
import styles from "./ResearchPathWorkspace.module.css";

interface AnalysisPlanLauncherProps {
  onReadyChange: (ready: boolean) => void;
  projectId: string;
}

function supportsAnalysisPlan(release: ExperimentRelease): boolean {
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
    .filter(supportsAnalysisPlan)
    .sort((left, right) => right.releaseNumber - left.releaseNumber);
}

export default function AnalysisPlanLauncher({
  onReadyChange,
  projectId,
}: AnalysisPlanLauncherProps) {
  const [release, setRelease] = useState<ExperimentRelease | null>(null);
  const [plan, setPlan] = useState<AnalysisPlanDocument | null>(null);
  const mounted = useRef(true);

  const refreshStatus = useCallback(() => {
    void (async () => {
      const candidates = readLocalExperimentReleases(window.localStorage, projectId);
      const local = (await verifiedExperimentReleases(candidates, projectId))
        .filter(supportsAnalysisPlan);
      let releases = local;
      try {
        releases = mergeReleases(await fetchExperimentReleases(projectId), local);
      } catch {
        // Verified local releases remain a safe fallback.
      }
      if (!mounted.current) return;
      const latest = releases[0] ?? null;
      setRelease(latest);
      setPlan(latest ? readAnalysisPlanDocument(window.localStorage, latest) : null);
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

  const ready = plan?.readiness.status === "ready";
  const variableIssues = useMemo(
    () => plan?.readiness.issues.filter((issue) => issue.scope === "variable").length ?? 0,
    [plan],
  );

  useEffect(() => {
    onReadyChange(ready);
  }, [onReadyChange, ready]);

  return (
    <div className={styles.experimentLauncher}>
      <section className={styles.experimentLauncherHero}>
        <div className={styles.experimentLauncherIcon} aria-hidden="true">
          <AppIcon name="sliders" />
        </div>
        <div>
          <p className={styles.eyebrow}>Phase 8.1 · Analysis Plan</p>
          <h2>Finalize the plan against one immutable experimental release</h2>
          <p>
            Classify each research question, define its estimand, map only frozen variables,
            and record exclusions, missingness, transformations, multiplicity, and sensitivity
            analyses before Phase 8.2 data intake.
          </p>
        </div>
        <Link
          className={styles.experimentLaunchButton}
          href={`/analysis-plan/${projectId}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {plan ? "Continue Analysis Plan" : "Open Analysis Plan"}
          <AppIcon name="external-link" />
        </Link>
      </section>

      <section className={styles.experimentStatusGrid} aria-label="Analysis Plan status">
        <div>
          <span>Frozen source</span>
          <strong>{release ? `Release v${release.releaseNumber}` : "Not available"}</strong>
          <small>{release ? "Verified immutable release" : "Freeze a format-v5 release first"}</small>
        </div>
        <div>
          <span>Research questions</span>
          <strong>{plan?.researchQuestions.length ?? 0} mapped</strong>
          <small>Wording remains frozen</small>
        </div>
        <div>
          <span>Variable roles</span>
          <strong>{plan?.variables.length ?? 0} variables</strong>
          <small>{variableIssues} role decision{variableIssues === 1 ? "" : "s"} unresolved</small>
        </div>
        <div className={ready ? styles.experimentStatusReady : styles.experimentStatusBlocked}>
          <span>Completion gate</span>
          <strong>
            {!release
              ? "Release required"
              : !plan
                ? "Plan not started"
                : ready
                  ? "Ready"
                  : `${plan.readiness.issues.length} decision${plan.readiness.issues.length === 1 ? "" : "s"} unresolved`}
          </strong>
          <small>
            {plan
              ? `${plan.readiness.completedDecisions}/${plan.readiness.totalDecisions} required decisions`
              : "No participant data is opened"}
          </small>
        </div>
      </section>

      <div className={styles.experimentPrivacyNote}>
        <AppIcon name="shield" />
        <div>
          <strong>This step stores planning metadata, never participant responses.</strong>
          <p>
            A ready draft is not a preregistration or validity certification. The frozen source
            release remains unchanged and Phase 8.2 will verify data identity separately.
          </p>
        </div>
      </div>
    </div>
  );
}
