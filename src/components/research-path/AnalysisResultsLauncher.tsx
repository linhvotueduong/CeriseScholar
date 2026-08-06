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
  isAnalysisInterpretationReady,
  readAnalysisInterpretationDocument,
  type AnalysisInterpretationDocument,
} from "@/lib/research/analysisResults";
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
} from "@/lib/research/dataPreparation";
import type { ExperimentRelease } from "@/lib/research/experimentRelease";
import {
  fetchExperimentReleases,
  readLocalExperimentReleases,
  verifiedExperimentReleases,
} from "@/lib/research/experimentReleasePersistence";
import styles from "./ResearchPathWorkspace.module.css";

interface AnalysisResultsLauncherProps {
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

export default function AnalysisResultsLauncher({
  onReadyChange,
  projectId,
}: AnalysisResultsLauncherProps) {
  const [release, setRelease] = useState<ExperimentRelease | null>(null);
  const [plan, setPlan] = useState<AnalysisPlanDocument | null>(null);
  const [execution, setExecution] = useState<AnalysisExecutionDocument | null>(null);
  const [document, setDocument] = useState<AnalysisInterpretationDocument | null>(null);
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
        ? readAnalysisInterpretationDocument(
          window.localStorage,
          latest,
          nextPlan,
          nextPreparation,
          nextExecution,
        )
        : null;

      setRelease(latest);
      setPlan(nextPlan);
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

  const ready = isAnalysisInterpretationReady(document);
  const executionReady = isAnalysisExecutionReady(execution);

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
          <p className={styles.eyebrow}>Phase 8.5 · Results and Interpretation</p>
          <h2>Build an evidence-linked Results Record from reviewed aggregate outputs</h2>
          <p>
            Verify the Phase 8.4 package, answer each primary research question,
            distinguish statistical from practical meaning, record limits and
            actual robustness evidence, and approve stable tables and figures.
          </p>
        </div>
        <Link
          className={styles.experimentLaunchButton}
          href={`/analysis-results/${projectId}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {document ? "Continue Results Record" : "Open Results Workspace"}
          <AppIcon name="external-link" />
        </Link>
      </section>

      <section className={styles.experimentStatusGrid} aria-label="Results Record status">
        <div>
          <span>Frozen source</span>
          <strong>{release ? `Release v${release.releaseNumber}` : "Not available"}</strong>
          <small>{plan?.readiness.status === "ready" ? "Analysis plan ready" : "Phase 8.1 required"}</small>
        </div>
        <div className={executionReady ? styles.experimentStatusReady : styles.experimentStatusBlocked}>
          <span>Aggregate analysis</span>
          <strong>{executionReady ? "Ready" : "Required"}</strong>
          <small>Phase 8.4 must be reviewed and exported</small>
        </div>
        <div>
          <span>RQ records</span>
          <strong>
            {document
              ? `${document.researchQuestions.filter((item) => item.researcherConfirmed).length}/${document.researchQuestions.length} confirmed`
              : "Not started"}
          </strong>
          <small>Claims remain researcher-authored and reviewable</small>
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
                  : "Interpretation required"}
          </strong>
          <small>Hands aggregate findings to Stage 7</small>
        </div>
      </section>

      <div className={styles.experimentPrivacyNote}>
        <AppIcon name="lock" />
        <div>
          <strong>Phase 8.5 rejects participant rows and does not run new analyses.</strong>
          <p>
            The workspace stores bounded interpretation, provenance, checksums,
            and review/export timestamps. Robustness evidence is researcher-authored
            and never inferred from the primary analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
