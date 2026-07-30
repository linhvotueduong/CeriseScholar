"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  isAnalysisReviewerReady,
  readAnalysisReviewerDocument,
  type AnalysisReviewerDocument,
} from "@/lib/research/analysisReviewer";
import {
  isAnalysisExecutionReady,
  readAnalysisExecutionDocument,
} from "@/lib/research/analysisExecution";
import {
  readAnalysisPlanDocument,
  type AnalysisPlanDocument,
} from "@/lib/research/analysisPlan";
import {
  isAnalysisInterpretationReady,
  readAnalysisInterpretationDocument,
  type AnalysisInterpretationDocument,
} from "@/lib/research/analysisResults";
import {
  isAnalysisRobustnessReady,
  readAnalysisRobustnessDocument,
  type AnalysisRobustnessDocument,
} from "@/lib/research/analysisRobustness";
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

interface AnalysisReviewerLauncherProps {
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

export default function AnalysisReviewerLauncher({
  onReadyChange,
  projectId,
}: AnalysisReviewerLauncherProps) {
  const [release, setRelease] = useState<ExperimentRelease | null>(null);
  const [plan, setPlan] = useState<AnalysisPlanDocument | null>(null);
  const [interpretation, setInterpretation] =
    useState<AnalysisInterpretationDocument | null>(null);
  const [robustness, setRobustness] = useState<AnalysisRobustnessDocument | null>(null);
  const [document, setDocument] = useState<AnalysisReviewerDocument | null>(null);
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
      const nextInterpretation = latest
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
      const nextRobustness = latest
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
      const nextDocument = latest
        && nextPlan
        && nextPreparation
        && nextExecution
        && nextInterpretation
        && nextRobustness
        && isAnalysisInterpretationReady(nextInterpretation)
        && isAnalysisRobustnessReady(nextRobustness)
        ? readAnalysisReviewerDocument(window.localStorage, {
          release: latest,
          plan: nextPlan,
          preparation: nextPreparation,
          execution: nextExecution,
          interpretation: nextInterpretation,
          robustness: nextRobustness,
        })
        : null;

      setRelease(latest);
      setPlan(nextPlan);
      setInterpretation(nextInterpretation);
      setRobustness(nextRobustness);
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

  const ready = isAnalysisReviewerReady(document);
  const deterministicReady = Boolean(
    interpretation
    && isAnalysisInterpretationReady(interpretation)
    && robustness
    && isAnalysisRobustnessReady(robustness),
  );
  const reviewedQuestions = new Set(
    document?.batches.map((batch) => batch.researchQuestionId) ?? [],
  ).size;
  const pending = document?.suggestions.filter(
    (suggestion) => suggestion.decision === "pending",
  ).length ?? 0;

  useEffect(() => {
    onReadyChange(ready);
  }, [onReadyChange, ready]);

  return (
    <div className={styles.experimentLauncher}>
      <section className={styles.experimentLauncherHero}>
        <div className={styles.experimentLauncherIcon} aria-hidden="true">
          <AppIcon name="lightbulb" />
        </div>
        <div>
          <p className={styles.eyebrow}>Phase 8.8 · AI Analysis Reviewer</p>
          <h2>Review frozen aggregate findings through a researcher-controlled AI boundary</h2>
          <p>
            Reconnect the verified Results and Robustness Records, review every
            executed research question, decide each bounded AI suggestion with a
            rationale, and export an aggregate-only decision ledger.
          </p>
        </div>
        <Link
          className={styles.experimentLaunchButton}
          href={`/analysis-review/${projectId}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {document ? "Continue AI Review" : "Open AI Reviewer"}
          <AppIcon name="external-link" />
        </Link>
      </section>

      <section className={styles.experimentStatusGrid} aria-label="AI Analysis Reviewer status">
        <div>
          <span>Frozen source</span>
          <strong>{release ? `Release v${release.releaseNumber}` : "Not available"}</strong>
          <small>{plan?.readiness.status === "ready" ? "Analysis plan ready" : "Phase 8.1 required"}</small>
        </div>
        <div className={deterministicReady ? styles.experimentStatusReady : styles.experimentStatusBlocked}>
          <span>Deterministic records</span>
          <strong>{deterministicReady ? "Ready to re-select" : "Required"}</strong>
          <small>Exported Phase 8.5 and Phase 8.7A records are required</small>
        </div>
        <div>
          <span>Decision ledger</span>
          <strong>
            {document
              ? `${reviewedQuestions}/${document.reviewScope.length} RQs · ${pending} pending`
              : "Not started"}
          </strong>
          <small>Accepted advice never changes upstream records</small>
        </div>
        <div className={ready ? styles.experimentStatusReady : styles.experimentStatusBlocked}>
          <span>Completion gate</span>
          <strong>
            {ready
              ? "Ready"
              : document?.readiness.status === "needs-export"
                ? "Export required"
                : document?.readiness.status === "needs-confirmation"
                  ? "Confirmation required"
                  : document?.readiness.status === "needs-decisions"
                    ? "Decisions required"
                    : "Review required"}
          </strong>
          <small>Requires a researcher-confirmed aggregate review export</small>
        </div>
      </section>

      <div className={styles.experimentPrivacyNote}>
        <AppIcon name="lock" />
        <div>
          <strong>AI sees one bounded aggregate research-question context at a time.</strong>
          <p>
            Participant rows, identifiers, response values, media, local files,
            API-key material, and arbitrary code are excluded. AI cannot certify
            scientific validity or silently change an analysis decision.
          </p>
        </div>
      </div>
    </div>
  );
}
