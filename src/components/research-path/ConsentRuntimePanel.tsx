"use client";

import { useEffect, useMemo, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  bindConsentRuntimeToStudio,
  buildConsentRuntimeArtifact,
  collectConsentRuntimeIssues,
  consentRuntimeArtifactMatchesReference,
  participantConsentCopy,
  type ConsentRuntimeArtifact,
} from "@/lib/research/consentRuntime";
import { buildExperimentRunnerPackage } from "@/lib/research/experimentRunnerPackage";
import type { ExperimentStudioDocument } from "@/lib/research/experimentStudio";
import type { ConsentPhase5Document } from "@/lib/research/consentPhase5";
import styles from "./ConsentRuntimePanel.module.css";

interface ConsentRuntimePanelProps {
  protocol: ConsentPhase5Document;
  sourceFingerprint: ConsentPhase5Document["sourceFingerprint"];
  studio: ExperimentStudioDocument;
  onBind: (artifact: ConsentRuntimeArtifact) => Promise<void>;
}

function shortChecksum(value: string): string {
  return `${value.slice(0, 16)}…${value.slice(-7)}`;
}

export default function ConsentRuntimePanel({
  protocol,
  sourceFingerprint,
  studio,
  onBind,
}: ConsentRuntimePanelProps) {
  const [artifact, setArtifact] = useState<ConsentRuntimeArtifact | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const issues = useMemo(
    () => collectConsentRuntimeIssues(protocol, sourceFingerprint),
    [protocol, sourceFingerprint],
  );

  useEffect(() => {
    let cancelled = false;
    setArtifact(null);
    if (issues.length > 0) return () => { cancelled = true; };
    void buildConsentRuntimeArtifact(protocol, sourceFingerprint)
      .then((next) => { if (!cancelled) setArtifact(next); })
      .catch((error: unknown) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "The runtime artifact could not be compiled.");
      });
    return () => { cancelled = true; };
  }, [issues.length, protocol, sourceFingerprint]);

  const boundBlock = studio.blocks.find((block) => block.type === "consent-form");
  const bindingCurrent = consentRuntimeArtifactMatchesReference(artifact, boundBlock?.consentForm);

  async function bind() {
    if (!artifact || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await onBind(artifact);
      setMessage("The reviewed adult consent artifact is now the first runnable screen. This binding is not IRB approval or a signature process.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Consent could not be bound to the study.");
    } finally {
      setBusy(false);
    }
  }

  async function preview() {
    if (!artifact || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const bound = bindingCurrent ? studio : await bindConsentRuntimeToStudio(studio, artifact);
      const runner = buildExperimentRunnerPackage(bound, {
        consentRuntimeArtifact: artifact,
        executionMode: "pilot",
      });
      setPreviewHtml(runner.html);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The participant runtime preview could not be created.");
    } finally {
      setBusy(false);
    }
  }

  function downloadCopy() {
    if (!artifact) return;
    const url = URL.createObjectURL(new Blob([participantConsentCopy(artifact)], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = artifact.participantCopy.filename;
    anchor.rel = "noopener";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  return (
    <section className={styles.panel} aria-labelledby="consent-runtime-title">
      <header className={styles.header}>
        <div>
          <span>Phase 10 · Participant execution boundary</span>
          <h2 id="consent-runtime-title">Bind reviewed consent to the runnable study</h2>
          <p>
            Adult English self-consent only. Cerise records a local acknowledgement decision—not a signature,
            identity proof, capacity finding, approval, or legal determination.
          </p>
        </div>
        <div className={bindingCurrent ? styles.bound : styles.unbound}>
          <AppIcon name={bindingCurrent ? "check-square" : "shield"} />
          {bindingCurrent ? "Exact artifact bound" : "Not bound"}
        </div>
      </header>

      {issues.length > 0 ? (
        <div className={styles.issues} role="status">
          <strong>Runtime remains locked</strong>
          <p>Authoring and export remain available. Resolve these boundaries before participant execution:</p>
          <ul>
            {issues.map((issue) => <li key={issue.code}>{issue.message}</li>)}
          </ul>
        </div>
      ) : artifact ? (
        <div className={styles.body}>
          <div className={styles.identity}>
            <span>Exact participant artifact</span>
            <h3>{artifact.form.title}</h3>
            <dl>
              <div><dt>Audience</dt><dd>Adult participant</dd></div>
              <div><dt>Language</dt><dd>{artifact.form.language}</dd></div>
              <div><dt>Documentation</dt><dd>{artifact.documentation.method.replaceAll("-", " ")}</dd></div>
              <div><dt>Separate decisions</dt><dd>{artifact.decisions.length}</dd></div>
              <div><dt>Form checksum</dt><dd><code title={artifact.form.checksum}>{shortChecksum(artifact.form.checksum)}</code></dd></div>
              <div><dt>Artifact checksum</dt><dd><code title={artifact.artifactChecksum}>{shortChecksum(artifact.artifactChecksum)}</code></dd></div>
            </dl>
          </div>

          <div className={styles.flow}>
            <h3>Participant flow enforced by the runner</h3>
            <ol>
              <li><span>1</span><div><strong>Review</strong><p>Key information, full sections, contacts, copy, and print access.</p></div></li>
              <li><span>2</span><div><strong>Decide separately</strong><p>Main participation, recording, optional research, and recontact are never preselected.</p></div></li>
              <li><span>3</span><div><strong>Correct and confirm</strong><p>The participant reviews every choice before the local receipt is created.</p></div></li>
              <li><span>4</span><div><strong>Begin or end safely</strong><p>Assignment and study logging begin only after acceptance; refusal retains no study payload.</p></div></li>
            </ol>
          </div>

          <aside className={styles.boundary}>
            <h3>Withdrawal boundary shown at runtime</h3>
            <p>{artifact.withdrawal.method}</p>
            <p>{artifact.withdrawal.dataBoundary}</p>
            <small>
              The current provisional local session is scrubbed on withdrawal. The reviewed wording governs what
              may already be committed, de-identified, distributed, or otherwise outside that session.
            </small>
          </aside>
        </div>
      ) : (
        <div className={styles.loading} role="status">Compiling the checksum-bound participant artifact…</div>
      )}

      <footer className={styles.actions}>
        <p aria-live="polite">{message || "Binding changes the runnable draft and invalidates any earlier frozen Studio release."}</p>
        <div>
          <button disabled={!artifact || busy} onClick={downloadCopy} type="button">
            <AppIcon name="download" /> Participant copy
          </button>
          <button disabled={!artifact || busy} onClick={() => void preview()} type="button">
            <AppIcon name="play" /> Rehearse runtime
          </button>
          <button className={styles.primary} disabled={!artifact || busy || bindingCurrent} onClick={() => void bind()} type="button">
            <AppIcon name="workflow" /> {busy ? "Working…" : bindingCurrent ? "Artifact bound" : "Bind reviewed consent to study"}
          </button>
        </div>
      </footer>

      {previewHtml ? (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Participant consent runtime rehearsal">
          <div className={styles.modalCard}>
            <header>
              <div><strong>Participant consent rehearsal</strong><span>Pilot fixture · no response is sent to Cerise</span></div>
              <button onClick={() => setPreviewHtml("")} type="button">Close</button>
            </header>
            <iframe sandbox="allow-downloads allow-scripts allow-modals" srcDoc={previewHtml} title="Participant consent runtime rehearsal" />
          </div>
        </div>
      ) : null}
    </section>
  );
}
