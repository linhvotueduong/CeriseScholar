"use client";

import { useEffect, useMemo, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import { buildExperimentCollectorPackage } from "@/lib/research/experimentCollectorPackage";
import { buildExperimentHostBundle } from "@/lib/research/experimentHostBundle";
import {
  canFreezeExperimentRelease,
  collectExperimentReleaseValidation,
  createExperimentRelease,
  experimentReleaseReviewComplete,
  type ExperimentRelease,
  type ExperimentReleaseReviewAttestations,
} from "@/lib/research/experimentRelease";
import {
  fetchExperimentReleases,
  persistExperimentRelease,
  readLocalExperimentReleases,
  verifiedExperimentReleases,
  writeLocalExperimentRelease,
} from "@/lib/research/experimentReleasePersistence";
import {
  buildExperimentRunnerPackage,
  canBuildExperimentRunnerPackage,
  experimentRunnerFilename,
  normalizeExperimentRunnerFilename,
} from "@/lib/research/experimentRunnerPackage";
import type { ExperimentStudioDocument } from "@/lib/research/experimentStudio";
import styles from "./ExperimentalStudio.module.css";

interface ExperimentPackagePanelProps {
  onDuplicateRelease: (release: ExperimentRelease) => void;
  onOpenChecks: () => void;
  studio: ExperimentStudioDocument;
}

function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  window.document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export default function ExperimentPackagePanel({
  onDuplicateRelease,
  onOpenChecks,
  studio,
}: ExperimentPackagePanelProps) {
  const suggestedFilename = useMemo(() => experimentRunnerFilename(studio.title), [studio.title]);
  const [customFilename, setCustomFilename] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [message, setMessage] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [releases, setReleases] = useState<ExperimentRelease[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [releaseBusy, setReleaseBusy] = useState(false);
  const [hostBundleBusy, setHostBundleBusy] = useState(false);
  const [releaseLocation, setReleaseLocation] = useState<"cloud" | "device" | "">("");
  const [executionMode, setExecutionMode] = useState<"pilot" | "production">("pilot");
  const [releaseReview, setReleaseReview] = useState<ExperimentReleaseReviewAttestations>({
    draftRehearsed: false,
    consentWithdrawalTested: false,
    conditionAndVariableReview: false,
    pilotDataPlanConfirmed: false,
  });
  const releaseIssues = useMemo(() => collectExperimentReleaseValidation(studio), [studio]);
  const canFreeze = useMemo(() => canFreezeExperimentRelease(studio), [studio]);
  const selectedRelease = useMemo(
    () => releases.find((release) => release.releaseId === selectedReleaseId) ?? releases[0] ?? null,
    [releases, selectedReleaseId],
  );
  const runnableStudio = selectedRelease?.studio ?? studio;
  const canPackage = Boolean(selectedRelease) && canBuildExperimentRunnerPackage(runnableStudio);
  const firstBlock = runnableStudio.blocks[0];
  const filename = customFilename ?? suggestedFilename;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const localCandidates = readLocalExperimentReleases(window.localStorage, studio.projectId);
      const local = await verifiedExperimentReleases(localCandidates, studio.projectId);
      if (cancelled) return;
      setReleases(local);
      setSelectedReleaseId((current) => current || local[0]?.releaseId || "");
      try {
        const cloud = await fetchExperimentReleases(studio.projectId);
        if (cancelled || cloud.length === 0) return;
        const merged = [...cloud, ...local.filter((localRelease) => (
          !cloud.some((cloudRelease) => cloudRelease.releaseId === localRelease.releaseId)
        ))].sort((left, right) => right.releaseNumber - left.releaseNumber);
        setReleases(merged);
        setSelectedReleaseId((current) => current || merged[0]?.releaseId || "");
        setReleaseLocation("cloud");
      } catch {
        if (!cancelled && local.length > 0) setReleaseLocation("device");
      }
    })();
    return () => { cancelled = true; };
  }, [studio.projectId]);

  async function freezeRelease() {
    if (!canFreeze || releaseBusy) return;
    setReleaseBusy(true);
    setMessage("");
    try {
      let release: ExperimentRelease;
      try {
        release = await persistExperimentRelease(studio.projectId, releaseNotes, studio, releaseReview);
        setReleaseLocation("cloud");
      } catch {
        const local = readLocalExperimentReleases(window.localStorage, studio.projectId);
        const nextNumber = Math.max(0, ...local.map((item) => item.releaseNumber)) + 1;
        release = await createExperimentRelease({
          releaseId: crypto.randomUUID(),
          releaseNumber: nextNumber,
          createdAt: new Date().toISOString(),
          releaseNotes,
          studio,
          review: releaseReview,
        });
        writeLocalExperimentRelease(window.localStorage, release);
        setReleaseLocation("device");
      }
      setReleases((current) => [
        release,
        ...current.filter((item) => item.releaseId !== release.releaseId),
      ].sort((left, right) => right.releaseNumber - left.releaseNumber));
      setSelectedReleaseId(release.releaseId);
      setReleaseNotes("");
      setReleaseReview({
        draftRehearsed: false,
        consentWithdrawalTested: false,
        conditionAndVariableReview: false,
        pilotDataPlanConfirmed: false,
      });
      setCustomFilename(experimentRunnerFilename(`${release.studio.title}-v${release.releaseNumber}`));
      setMessage(`Release v${release.releaseNumber} frozen. Published releases cannot be edited.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The release could not be created.");
    } finally {
      setReleaseBusy(false);
    }
  }

  function buildRunner() {
    if (!selectedRelease) {
      setMessage("Freeze or select a release before creating a runnable package.");
      return null;
    }
    try {
      const runner = buildExperimentRunnerPackage(selectedRelease.studio, {
        filename,
        release: selectedRelease,
        executionMode,
      });
      setCustomFilename(runner.filename);
      setMessage("");
      return runner;
    } catch {
      setMessage("Resolve the blocking study errors before creating a local runner.");
      return null;
    }
  }

  function previewRunner() {
    const runner = buildRunner();
    if (runner) setPreviewHtml(runner.html);
  }

  function downloadRunner() {
    const runner = buildRunner();
    if (!runner) return;
    downloadText(runner.filename, runner.html, runner.mimeType);
    setMessage("Local runner downloaded. No participant responses were included.");
  }

  function exportStudyJson() {
    if (!selectedRelease) {
      setMessage("Freeze or select a release before exporting its audit bundle.");
      return;
    }
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      participantResponsesIncluded: false,
      release: selectedRelease,
      codebook: selectedRelease.studio.blocks.flatMap((block) => block.variableName ? [{
        variable: block.variableName,
        sourceBlockId: block.id,
        sourceBlockTitle: block.title,
        responseType: block.responseType,
        required: block.required,
      }] : []),
      readme: "Frozen Cerise Scholar release bundle. Timing is browser-measured. Participant responses are not included.",
    }, null, 2);
    const name = normalizeExperimentRunnerFilename(filename, selectedRelease.studio.title).replace(/\.html$/i, "-release-bundle.json");
    downloadText(name, payload, "application/json;charset=utf-8");
    setMessage("Frozen release, validation report, and codebook exported without participant responses.");
  }

  function downloadCollector() {
    if (!selectedRelease) {
      setMessage("Freeze or select a release before creating a collector.");
      return;
    }
    const collector = buildExperimentCollectorPackage(selectedRelease, { executionMode });
    downloadText(collector.filename, collector.source, collector.mimeType);
    setMessage("Local Collector downloaded. Run it with Node.js 22.5 or newer; participant data will stay in local SQLite.");
  }

  async function downloadHostBundle() {
    if (!selectedRelease || hostBundleBusy) {
      if (!selectedRelease) setMessage("Freeze or select a release before creating a Local Host bundle.");
      return;
    }
    setHostBundleBusy(true);
    setMessage("");
    try {
      const built = await buildExperimentHostBundle(selectedRelease, { executionMode });
      downloadText(built.filename, built.content, built.mimeType);
      setMessage(
        "Verified Local Host bundle downloaded. Import it into Cerise Local Research Host, then start collection.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The Local Host bundle could not be created.");
    } finally {
      setHostBundleBusy(false);
    }
  }

  return (
    <main className={styles.packageWorkspace}>
      <aside className={styles.releasePanel}>
        <header>
          <h1>Release Center</h1>
          <button onClick={onOpenChecks} type="button">Open study checks</button>
        </header>
        <label className={styles.releaseNotesField}>
          <span>Release notes</span>
          <textarea
            maxLength={2_000}
            onChange={(event) => setReleaseNotes(event.target.value)}
            placeholder="What is frozen in this version, and which warnings were reviewed?"
            rows={4}
            value={releaseNotes}
          />
        </label>
        <fieldset className={styles.releaseReviewChecklist}>
          <legend>Required release review</legend>
          {([
            ["draftRehearsed", "Rehearsed the complete draft flow"],
            ["consentWithdrawalTested", "Tested consent, refusal, and withdrawal behavior"],
            ["conditionAndVariableReview", "Reviewed conditions, variables, scoring, and missing-data behavior"],
            ["pilotDataPlanConfirmed", "Confirmed pilot rows will remain tagged and excluded from production analysis"],
          ] as const).map(([key, label]) => (
            <label key={key}>
              <input
                checked={releaseReview[key]}
                onChange={(event) => setReleaseReview((current) => ({ ...current, [key]: event.target.checked }))}
                type="checkbox"
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <button
          className={styles.freezeReleaseButton}
          disabled={!canFreeze || !experimentReleaseReviewComplete(releaseReview) || releaseBusy}
          onClick={() => void freezeRelease()}
          type="button"
        >
          <AppIcon name="lock" />
          {releaseBusy ? "Freezing…" : `Freeze release v${Math.max(0, ...releases.map((item) => item.releaseNumber)) + 1}`}
        </button>
        <p className={styles.releaseLocation}>
          {releaseLocation === "cloud" ? "Owner-only release record" : releaseLocation === "device" ? "Saved on this device; cloud migration unavailable" : "No frozen release yet"}
        </p>
        {releases.length > 0 ? (
          <label className={styles.releaseSelect}>
            <span>Selected release</span>
            <select onChange={(event) => setSelectedReleaseId(event.target.value)} value={selectedRelease?.releaseId ?? ""}>
              {releases.map((release) => (
                <option key={release.releaseId} value={release.releaseId}>
                  v{release.releaseNumber} · {new Date(release.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {selectedRelease ? (
          <section className={styles.releaseIdentity}>
            <span>Integrity checksum</span>
            <code title={selectedRelease.checksum}>{selectedRelease.checksum.slice(0, 22)}…</code>
            <button onClick={() => onDuplicateRelease(selectedRelease)} type="button">Duplicate into editable draft</button>
          </section>
        ) : null}
        <ul className={styles.releaseChecks}>
          {releaseIssues.slice(0, 7).map((issue) => (
            <li className={styles[`release-${issue.level === "blocking" ? "fail" : "warning"}`]} key={issue.id}>
              <AppIcon name={issue.level === "blocking" ? "alert" : "help"} />
              <div>
                <strong>{issue.level === "blocking" ? "Blocking" : issue.level === "warning" ? "Review warning" : "Advisory"}</strong>
                <small>{issue.message}</small>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <section className={styles.runnerPanel}>
        <header>
          <h1>Run the frozen study</h1>
          <p>Use the native Local Research Host for recoverable SQLite collection on this Mac or a trusted LAN.</p>
        </header>

        <div className={styles.executionModePicker}>
          <span>Response mode</span>
          <label><input checked={executionMode === "pilot"} onChange={() => setExecutionMode("pilot")} type="radio" />Pilot</label>
          <label><input checked={executionMode === "production"} onChange={() => setExecutionMode("production")} type="radio" />Production</label>
        </div>

        <label className={styles.packageNameField}>
          <span>Package name</span>
          <input
            aria-describedby="package-name-help"
            maxLength={96}
            onBlur={() => setCustomFilename(normalizeExperimentRunnerFilename(filename, studio.title))}
            onChange={(event) => setCustomFilename(event.target.value)}
            value={filename}
          />
          <small id="package-name-help">The final filename is cleaned before download.</small>
        </label>

        <div className={styles.runnerPreviewCard} aria-label="Local runner preview">
          <div className={styles.runnerPreviewBar}>
            <span>Local study runner</span>
            <small>No network connection</small>
          </div>
          <div className={styles.runnerPreviewScreen}>
            <span>Screen 1 of {runnableStudio.blocks.length}</span>
            <h2>{firstBlock?.heading || firstBlock?.title || "Study screen"}</h2>
            <p>{firstBlock?.prompt || "Add participant-facing content in the Builder."}</p>
          </div>
          <div className={styles.runnerPreviewNavigation}>
            <button disabled type="button">Back</button>
            <button type="button">Next</button>
          </div>
        </div>

        <div className={styles.packageActions}>
          <button
            className={styles.packagePrimary}
            disabled={!canPackage || hostBundleBusy}
            onClick={() => void downloadHostBundle()}
            type="button"
          >
            <AppIcon name="laptop" />
            {hostBundleBusy ? "Preparing…" : "Local Host bundle"}
          </button>
          <button className={styles.packagePrimary} disabled={!canPackage} onClick={downloadRunner} type="button">
            <AppIcon name="upload" />
            Portable .html
          </button>
          <button disabled={!canPackage} onClick={previewRunner} type="button">
            <AppIcon name="play" />
            Preview local runner
          </button>
          <button onClick={exportStudyJson} type="button">
            <AppIcon name="file" />
            Export release bundle
          </button>
          <button disabled={!canPackage} onClick={downloadCollector} type="button">
            <AppIcon name="file" />
            Developer .mjs fallback
          </button>
        </div>
        <p className={styles.packageResponseNote}>Pilot rows are tagged. No participant responses are included in downloads created here.</p>
        {message ? <p aria-live="polite" className={styles.packageMessage}>{message}</p> : null}
      </section>

      <aside className={styles.privacyPanel}>
        <h1>Privacy and execution</h1>
        <ul className={styles.privacyRows}>
          <li><AppIcon name="globe" /><div><strong>Offline by default</strong><span>No fetch, analytics, or external scripts</span></div></li>
          <li><AppIcon name="lock" /><div><strong>Local-only responses</strong><span>Verified host bundle and recoverable SQLite checkpoints</span></div></li>
          <li><AppIcon name="file" /><div><strong>Reproducible exports</strong><span>Release, codebook, validation, JSON and formula-safe CSV</span></div></li>
          <li><AppIcon name="clock" /><div><strong>Browser-measured timing</strong><span>Never presented as certified laboratory timing</span></div></li>
        </ul>
        <section className={styles.runInstructions}>
          <h2>How to run</h2>
          <ol>
            <li><span>1</span>Download the Local Host bundle for the selected frozen release.</li>
            <li><span>2</span>Open Cerise Local Research Host and import the <code>.cerisehost</code> file.</li>
            <li><span>3</span>Choose this Mac or trusted-LAN mode, then explicitly start collection.</li>
          </ol>
        </section>
      </aside>

      {previewHtml ? (
        <div className={styles.runnerModal} role="dialog" aria-modal="true" aria-label="Local runner preview">
          <div className={styles.runnerModalCard}>
            <header>
              <div><strong>Local runner preview</strong><span>Sandboxed and disconnected from Cerise Scholar</span></div>
              <button aria-label="Close local runner preview" onClick={() => setPreviewHtml("")} type="button">Close</button>
            </header>
            <iframe
              sandbox="allow-downloads allow-scripts"
              srcDoc={previewHtml}
              title="Local study runner"
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
