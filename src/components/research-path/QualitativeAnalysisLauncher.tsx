"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  isQualitativeAnalysisReady,
  readQualitativeAnalysisDocument,
  type QualitativeAnalysisDocument,
} from "@/lib/research/qualitativeAnalysis";
import styles from "./ResearchPathWorkspace.module.css";

interface QualitativeAnalysisLauncherProps {
  onReadyChange: (ready: boolean) => void;
  projectId: string;
}

export default function QualitativeAnalysisLauncher({
  onReadyChange,
  projectId,
}: QualitativeAnalysisLauncherProps) {
  const [document, setDocument] = useState<QualitativeAnalysisDocument | null>(null);

  const refreshStatus = useCallback(() => {
    setDocument(readQualitativeAnalysisDocument(window.localStorage, projectId));
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

  const ready = isQualitativeAnalysisReady(document);
  const mode = document?.mode ?? "not-selected";
  const reviewedSegments = document?.segments.filter(
    (segment) => (
      segment.codeIds.length > 0
      && segment.quotationUse !== "not-reviewed"
      && segment.redactionStatus !== "not-reviewed"
    ),
  ).length ?? 0;

  useEffect(() => {
    onReadyChange(ready);
  }, [onReadyChange, ready]);

  return (
    <div className={styles.experimentLauncher}>
      <section className={styles.experimentLauncherHero}>
        <div className={styles.experimentLauncherIcon} aria-hidden="true">
          <AppIcon name="book-open" />
        </div>
        <div>
          <p className={styles.eyebrow}>Phase 8.9 · Qualitative & Mixed Methods</p>
          <h2>Code local transcripts and build evidence-grounded themes in a separate lane</h2>
          <p>
            Preserve codebook versions, memos, negative-case checks, safe
            quotation decisions, triangulation, and mixed-method joint displays
            without sending raw transcripts or media to cloud or AI services.
          </p>
        </div>
        <Link
          className={styles.experimentLaunchButton}
          href={`/qualitative-analysis/${projectId}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {document ? "Continue Qualitative Analysis" : "Open Qualitative Lane"}
          <AppIcon name="external-link" />
        </Link>
      </section>

      <section className={styles.experimentStatusGrid} aria-label="Qualitative analysis status">
        <div>
          <span>Lane decision</span>
          <strong>{mode === "not-selected" ? "Not selected" : mode.replace("-", " ")}</strong>
          <small>Qualitative, mixed methods, or a documented not-applicable decision</small>
        </div>
        <div>
          <span>Local evidence</span>
          <strong>{document ? `${document.sources.length} source(s) · ${document.segments.length} segment(s)` : "Not started"}</strong>
          <small>{reviewedSegments} segment(s) coded and quotation-reviewed</small>
        </div>
        <div>
          <span>Analytic record</span>
          <strong>{document ? `${document.codebookVersions.length} codebook version(s) · ${document.themes.length} theme(s)` : "Not started"}</strong>
          <small>Memos, negative cases, matrices, and triangulation remain researcher-authored</small>
        </div>
        <div className={ready ? styles.experimentStatusReady : styles.experimentStatusBlocked}>
          <span>Completion gate</span>
          <strong>{ready ? "Ready" : document?.readiness.status.replaceAll("-", " ") ?? "Workspace required"}</strong>
          <small>Requires researcher confirmation and a checksummed local export</small>
        </div>
      </section>

      <div className={styles.experimentPrivacyNote}>
        <AppIcon name="lock" />
        <div>
          <strong>No automatic transcription, emotion, face, personality, or behavioral inference.</strong>
          <p>
            Transcript text stays in the active tab. Browser storage and the
            export retain source identity, offsets, checksums, researcher
            decisions, and approved reporting excerpts—not raw transcripts or media.
          </p>
        </div>
      </div>
    </div>
  );
}
