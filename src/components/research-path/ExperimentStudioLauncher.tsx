"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  collectExperimentVariables,
  experimentStudioStorageKey,
  isExperimentStudioReady,
  readExperimentStudioDocument,
  validateExperimentStudio,
  type ExperimentStudioDocument,
} from "@/lib/research/experimentStudio";
import styles from "./ResearchPathWorkspace.module.css";

interface ExperimentStudioLauncherProps {
  onReadyChange: (ready: boolean) => void;
  projectId: string;
}

interface StudioStatus {
  document: ExperimentStudioDocument | null;
  exists: boolean;
}

export default function ExperimentStudioLauncher({
  onReadyChange,
  projectId,
}: ExperimentStudioLauncherProps) {
  const [status, setStatus] = useState<StudioStatus>({ document: null, exists: false });

  const refreshStatus = useCallback(() => {
    try {
      const exists = Boolean(window.localStorage.getItem(experimentStudioStorageKey(projectId)));
      const document = exists
        ? readExperimentStudioDocument(window.localStorage, projectId)
        : null;
      setStatus({ document, exists });
    } catch {
      setStatus({ document: null, exists: false });
    }
  }, [projectId]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(refreshStatus, 0);
    window.addEventListener("focus", refreshStatus);
    window.addEventListener("storage", refreshStatus);
    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("focus", refreshStatus);
      window.removeEventListener("storage", refreshStatus);
    };
  }, [refreshStatus]);

  const issues = useMemo(
    () => status.document ? validateExperimentStudio(status.document) : [],
    [status.document],
  );
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.length - errors;
  const variables = status.document ? collectExperimentVariables(status.document).length : 0;
  const ready = Boolean(status.exists && status.document && isExperimentStudioReady(status.document));

  useEffect(() => {
    onReadyChange(ready);
  }, [onReadyChange, ready]);

  return (
    <div className={styles.experimentLauncher}>
      <section className={styles.experimentLauncherHero}>
        <div className={styles.experimentLauncherIcon} aria-hidden="true">
          <AppIcon name="laptop" />
        </div>
        <div>
          <p className={styles.eyebrow}>Phase 3 · Experimental Studio</p>
          <h2>Build, rehearse, and package the study in a dedicated workspace</h2>
          <p>
            Design participant screens, conditions, randomized assignment, response branches, timing settings, and analysis-ready variables, then package one offline local runner.
            The studio opens in a separate browser tab and stays connected to this research project without turning Cerise Scholar into a participant-hosting service.
          </p>
        </div>
        <Link
          className={styles.experimentLaunchButton}
          href={`/experimental-studio/${projectId}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {status.exists ? "Continue in Experimental Studio" : "Open Experimental Studio"}
          <AppIcon name="external-link" />
        </Link>
      </section>

      <section className={styles.experimentStatusGrid} aria-label="Experimental Studio status">
        <div>
          <span>Study specification</span>
          <strong>{status.exists ? "Version 2 draft" : "Not started"}</strong>
          <small>Saved separately from participant responses</small>
        </div>
        <div>
          <span>Study flow</span>
          <strong>{status.document?.blocks.length ?? 0} blocks</strong>
          <small>Participant-facing screens</small>
        </div>
        <div>
          <span>Logic and variables</span>
          <strong>{status.document?.conditions.length ?? 0} condition{status.document?.conditions.length === 1 ? "" : "s"} · {variables} variable{variables === 1 ? "" : "s"}</strong>
          <small>{status.document?.branchRules.length ?? 0} response-based branch{status.document?.branchRules.length === 1 ? "" : "es"}</small>
        </div>
        <div className={!status.exists || errors > 0 ? styles.experimentStatusBlocked : styles.experimentStatusReady}>
          <span>Completion gate</span>
          <strong>{!status.exists ? "Open studio to begin" : errors > 0 ? `${errors} required fix${errors === 1 ? "" : "es"}` : "Ready"}</strong>
          <small>{warnings} warning{warnings === 1 ? "" : "s"} to review</small>
        </div>
      </section>

      <div className={styles.experimentPrivacyNote}>
        <AppIcon name="shield" />
        <div>
          <strong>The studio stores the study design, not research responses.</strong>
          <p>Rehearsal data is discarded, and the Phase 4 runner stays offline until a participant explicitly downloads local JSON or CSV results.</p>
        </div>
      </div>
    </div>
  );
}
