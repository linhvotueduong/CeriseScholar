"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  isAnalysisExecutionReady,
  readAnalysisExecutionDocument,
  type AnalysisExecutionDocument,
} from "@/lib/research/analysisExecution";
import {
  MAX_RESULTS_RECORD_PACKAGE_BYTES,
  isAnalysisInterpretationReady,
  readAnalysisInterpretationDocument,
  verifyResultsRecordExport,
  type AnalysisInterpretationDocument,
  type ResultsRecordExport,
} from "@/lib/research/analysisResults";
import {
  readAnalysisPlanDocument,
  type AnalysisPlanDocument,
} from "@/lib/research/analysisPlan";
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
import {
  MAX_REPRODUCIBILITY_ARCHIVE_BYTES,
  REPRODUCIBILITY_ARCHIVE_CONTENTS,
  buildReproducibilityArchive,
  captureReproducibilityEnvironment,
  createReproducibilityPackageDocument,
  isReproducibilityPackageReady,
  markReproducibilityPackageExported,
  markReproducibilityPackageReviewed,
  readReproducibilityPackageDocument,
  recordReproducibilityBuild,
  updateReproducibilityPackageDocument,
  verifyReproducibilityArchive,
  writeReproducibilityPackageDocument,
  type ReproducibilityArchiveVerification,
  type ReproducibilityManifest,
  type ReproducibilityPackageDocument,
  type RestrictedMaterialReference,
  type RestrictedMaterialStatus,
} from "@/lib/research/reproducibilityPackage";
import styles from "./ReproducibilityPackageWorkspace.module.css";

interface ReproducibilityPackageWorkspaceProps {
  projectId: string;
  projectName: string;
}

type MaterialKey = keyof ReproducibilityPackageDocument["restrictedMaterials"];

const MATERIALS: Array<{
  key: MaterialKey;
  label: string;
  description: string;
}> = [
  {
    key: "participantData",
    label: "Participant and derived data",
    description: "Response and trial rows remain outside the archive.",
  },
  {
    key: "rawMedia",
    label: "Raw audio and video",
    description: "Media stays in researcher-controlled local storage.",
  },
  {
    key: "combinedSqlite",
    label: "Combined SQLite database",
    description: "The Local Research Host database is never embedded.",
  },
];

const STATUS_OPTIONS: Array<{ value: RestrictedMaterialStatus; label: string }> = [
  { value: "not-declared", label: "Choose a reference decision" },
  { value: "referenced-outside-archive", label: "Reference outside archive" },
  { value: "not-referenced", label: "Omit without a location reference" },
  { value: "not-collected", label: "Not collected" },
];

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

function safeExportName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "cerise-research";
}

function downloadTar(filename: string, bytes: Uint8Array) {
  const blob = new Blob([bytes as BlobPart], { type: "application/x-tar" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function readableBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 ** 2)).toFixed(1)} MB`;
}

function shortChecksum(value: string): string {
  return value ? `${value.slice(0, 22)}…` : "Not available";
}

function formatTimestamp(value: string): string {
  if (!value) return "Not yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not yet"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function statusLabel(document: ReproducibilityPackageDocument | null): string {
  if (!document) return "Import Results Record";
  switch (document.readiness.status) {
    case "needs-context":
      return "Context required";
    case "needs-review":
      return "Review required";
    case "needs-build":
      return "Build required";
    case "needs-export":
      return "Export required";
    case "ready":
      return "Ready";
  }
}

export default function ReproducibilityPackageWorkspace({
  projectId,
  projectName,
}: ReproducibilityPackageWorkspaceProps) {
  const [releases, setReleases] = useState<ExperimentRelease[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [plan, setPlan] = useState<AnalysisPlanDocument | null>(null);
  const [audit, setAudit] = useState<DataIntakeAuditReceipt | null>(null);
  const [preparation, setPreparation] = useState<DataPreparationDocument | null>(null);
  const [execution, setExecution] = useState<AnalysisExecutionDocument | null>(null);
  const [interpretation, setInterpretation] =
    useState<AnalysisInterpretationDocument | null>(null);
  const [document, setDocument] = useState<ReproducibilityPackageDocument | null>(null);
  const [sourceLoaded, setSourceLoaded] = useState(false);
  const [sourceFilename, setSourceFilename] = useState("");
  const [sourceBytes, setSourceBytes] = useState(0);
  const [manifest, setManifest] = useState<ReproducibilityManifest | null>(null);
  const [verification, setVerification] =
    useState<ReproducibilityArchiveVerification | null>(null);
  const [externalVerification, setExternalVerification] =
    useState<ReproducibilityArchiveVerification | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sourceInput = useRef<HTMLInputElement>(null);
  const archiveInput = useRef<HTMLInputElement>(null);
  const resultsRecord = useRef<ResultsRecordExport | null>(null);
  const archiveBytes = useRef<Uint8Array | null>(null);

  const selectedRelease = useMemo(
    () => releases.find((release) => release.releaseId === selectedReleaseId) ?? null,
    [releases, selectedReleaseId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const localCandidates = readLocalExperimentReleases(window.localStorage, projectId);
      const local = (await verifiedExperimentReleases(localCandidates, projectId))
        .filter(supportsAnalysis);
      let next = local;
      try {
        next = mergeReleases(await fetchExperimentReleases(projectId), local);
      } catch {
        // Verified local releases remain the safe offline fallback.
      }
      if (cancelled) return;
      setReleases(next);
      setSelectedReleaseId((current) => (
        next.some((release) => release.releaseId === current)
          ? current
          : next[0]?.releaseId ?? ""
      ));
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    resultsRecord.current = null;
    archiveBytes.current = null;
    setSourceLoaded(false);
    setSourceFilename("");
    setSourceBytes(0);
    setManifest(null);
    setVerification(null);
    setExternalVerification(null);
    setError("");
    setNotice("");
    if (!selectedRelease) {
      setPlan(null);
      setAudit(null);
      setPreparation(null);
      setExecution(null);
      setInterpretation(null);
      setDocument(null);
      return;
    }
    const nextPlan = readAnalysisPlanDocument(window.localStorage, selectedRelease);
    const nextAudit = readDataIntakeAuditReceipt(window.localStorage, selectedRelease);
    const nextPreparation = nextAudit
      ? readDataPreparationDocument(window.localStorage, selectedRelease, nextAudit)
      : null;
    const nextExecution = nextPlan && nextPreparation
      ? readAnalysisExecutionDocument(
        window.localStorage,
        selectedRelease,
        nextPlan,
        nextPreparation,
      )
      : null;
    const nextInterpretation = nextPlan && nextPreparation && nextExecution
      ? readAnalysisInterpretationDocument(
        window.localStorage,
        selectedRelease,
        nextPlan,
        nextPreparation,
        nextExecution,
      )
      : null;
    const nextDocument = nextPlan
      && nextAudit
      && nextPreparation
      && nextExecution
      && nextInterpretation
      ? readReproducibilityPackageDocument(
        window.localStorage,
        selectedRelease,
        nextPlan,
        nextAudit,
        nextPreparation,
        nextExecution,
        nextInterpretation,
      )
      : null;
    setPlan(nextPlan);
    setAudit(nextAudit);
    setPreparation(nextPreparation);
    setExecution(nextExecution);
    setInterpretation(nextInterpretation);
    setDocument(nextDocument);
  }, [selectedRelease]);

  const prerequisiteIssue = useMemo(() => {
    if (!selectedRelease) return "Create a Phase 8 release with a frozen analysis contract first.";
    if (plan?.readiness.status !== "ready") return "Complete the Phase 8.1 Analysis Plan.";
    if (!isDataIntakeAuditReady(audit)) return "Review the Phase 8.2 aggregate intake audit.";
    if (!isDataPreparationReady(preparation)) return "Review and export Phase 8.3 preparation.";
    if (!isAnalysisExecutionReady(execution)) return "Review and export Phase 8.4 analysis.";
    if (!isAnalysisInterpretationReady(interpretation)) {
      return "Review and export the Phase 8.5 Results Record.";
    }
    return "";
  }, [audit, execution, interpretation, plan, preparation, selectedRelease]);

  const persist = useCallback((
    next: ReproducibilityPackageDocument,
  ): ReproducibilityPackageDocument => {
    if (
      !selectedRelease
      || !plan
      || !audit
      || !preparation
      || !execution
      || !interpretation
    ) throw new Error("The release-bound reproducibility chain is unavailable.");
    const saved = writeReproducibilityPackageDocument(
      window.localStorage,
      selectedRelease,
      plan,
      audit,
      preparation,
      execution,
      interpretation,
      next,
    );
    setDocument(saved);
    return saved;
  }, [audit, execution, interpretation, plan, preparation, selectedRelease]);

  const handleResultsRecord = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (
      !file
      || !selectedRelease
      || !plan
      || !audit
      || !preparation
      || !execution
      || !interpretation
    ) return;
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      if (file.size <= 0 || file.size > MAX_RESULTS_RECORD_PACKAGE_BYTES) {
        throw new Error("The selected JSON is empty or exceeds the 12 MB Results Record limit.");
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(
          await file.arrayBuffer(),
        ));
      } catch {
        throw new Error("The selected file is not valid UTF-8 JSON.");
      }
      const verified = await verifyResultsRecordExport(
        parsed,
        selectedRelease,
        plan,
        preparation,
        execution,
        interpretation,
      );
      const existing = readReproducibilityPackageDocument(
        window.localStorage,
        selectedRelease,
        plan,
        audit,
        preparation,
        execution,
        interpretation,
      );
      const next = existing?.source.resultsRecordChecksum
        === verified.package.integrity.packageChecksum
        ? existing
        : createReproducibilityPackageDocument(
          projectName,
          selectedRelease,
          plan,
          audit,
          preparation,
          execution,
          interpretation,
          verified,
          captureReproducibilityEnvironment(),
        );
      if (!next) throw new Error("The Results Record could not initialize Phase 8.6.");
      const saved = persist(next);
      resultsRecord.current = verified;
      archiveBytes.current = null;
      setDocument(saved);
      setSourceLoaded(true);
      setSourceFilename(file.name.slice(0, 200));
      setSourceBytes(file.size);
      setManifest(null);
      setVerification(null);
      setNotice(
        "The exact Phase 8.5 Results Record and complete local provenance chain were verified.",
      );
    } catch (cause) {
      resultsRecord.current = null;
      archiveBytes.current = null;
      setSourceLoaded(false);
      setSourceFilename("");
      setSourceBytes(0);
      setManifest(null);
      setVerification(null);
      setError(cause instanceof Error ? cause.message : "The Results Record could not be verified.");
    } finally {
      setProcessing(false);
    }
  };

  const updateDocument = useCallback((
    changes: Parameters<typeof updateReproducibilityPackageDocument>[1],
  ) => {
    if (
      !document
      || !selectedRelease
      || !plan
      || !audit
      || !preparation
      || !execution
      || !interpretation
      || !sourceLoaded
    ) return;
    try {
      const next = updateReproducibilityPackageDocument(
        document,
        changes,
        selectedRelease,
        plan,
        audit,
        preparation,
        execution,
        interpretation,
      );
      archiveBytes.current = null;
      setManifest(null);
      setVerification(null);
      setNotice("");
      setError("");
      persist(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The archive record could not be saved.");
    }
  }, [
    audit,
    document,
    execution,
    interpretation,
    persist,
    plan,
    preparation,
    selectedRelease,
    sourceLoaded,
  ]);

  const updateReference = (
    key: MaterialKey,
    changes: Partial<RestrictedMaterialReference>,
  ) => {
    if (!document) return;
    updateDocument({
      restrictedMaterials: {
        ...document.restrictedMaterials,
        [key]: {
          ...document.restrictedMaterials[key],
          ...changes,
        },
      },
    });
  };

  const confirmReview = () => {
    if (
      !document
      || !selectedRelease
      || !plan
      || !audit
      || !preparation
      || !execution
      || !interpretation
      || !sourceLoaded
    ) return;
    try {
      persist(markReproducibilityPackageReviewed(
        document,
        selectedRelease,
        plan,
        audit,
        preparation,
        execution,
        interpretation,
      ));
      setNotice("Archive contents, exclusions, references, and boundaries reviewed.");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The archive review could not be confirmed.");
    }
  };

  const buildArchive = async () => {
    if (
      !document
      || !selectedRelease
      || !plan
      || !audit
      || !preparation
      || !execution
      || !interpretation
      || !resultsRecord.current
    ) {
      setError("Re-select the exact Phase 8.5 Results Record before building.");
      return;
    }
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      const built = await buildReproducibilityArchive({
        document,
        release: selectedRelease,
        plan,
        audit,
        preparation,
        execution,
        interpretation,
        resultsRecord: resultsRecord.current,
      });
      const saved = recordReproducibilityBuild(
        document,
        built.verification,
        selectedRelease,
        plan,
        audit,
        preparation,
        execution,
        interpretation,
      );
      archiveBytes.current = built.archive;
      setManifest(built.manifest);
      setVerification(built.verification);
      persist(saved);
      setNotice("The deterministic TAR was built, parsed again, and every checksum passed.");
    } catch (cause) {
      archiveBytes.current = null;
      setManifest(null);
      setVerification(null);
      setError(cause instanceof Error ? cause.message : "The archive could not be built.");
    } finally {
      setProcessing(false);
    }
  };

  const exportArchive = async () => {
    if (
      !document
      || !selectedRelease
      || !plan
      || !audit
      || !preparation
      || !execution
      || !interpretation
      || !resultsRecord.current
      || !document.lastBuild
    ) {
      setError("Build and verify the exact archive before export.");
      return;
    }
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      let bytes = archiveBytes.current;
      let currentVerification = verification;
      let currentManifest = manifest;
      if (!bytes || currentVerification?.archiveChecksum !== document.lastBuild.archiveChecksum) {
        const rebuilt = await buildReproducibilityArchive({
          document,
          release: selectedRelease,
          plan,
          audit,
          preparation,
          execution,
          interpretation,
          resultsRecord: resultsRecord.current,
        });
        bytes = rebuilt.archive;
        currentVerification = rebuilt.verification;
        currentManifest = rebuilt.manifest;
      }
      if (currentVerification.archiveChecksum !== document.lastBuild.archiveChecksum) {
        throw new Error("The rebuilt archive differs from the reviewed archive receipt.");
      }
      downloadTar(
        `${safeExportName(projectName)}-reproducibility-v${selectedRelease.releaseNumber}.tar`,
        bytes,
      );
      const saved = markReproducibilityPackageExported(
        document,
        currentVerification.archiveChecksum,
        selectedRelease,
        plan,
        audit,
        preparation,
        execution,
        interpretation,
      );
      archiveBytes.current = bytes;
      setVerification(currentVerification);
      setManifest(currentManifest);
      persist(saved);
      setNotice("Reproducibility archive exported locally. Nothing was uploaded.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The archive could not be exported.");
    } finally {
      setProcessing(false);
    }
  };

  const verifyExistingArchive = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      if (file.size <= 0 || file.size > MAX_REPRODUCIBILITY_ARCHIVE_BYTES) {
        throw new Error("The selected TAR is empty or exceeds the 24 MB archive limit.");
      }
      const verified = await verifyReproducibilityArchive(
        new Uint8Array(await file.arrayBuffer()),
        document
          ? {
              projectId: document.projectId,
              releaseId: document.releaseId,
              releaseChecksum: document.releaseChecksum,
              resultsRecordChecksum: document.source.resultsRecordChecksum,
            }
          : undefined,
      );
      setExternalVerification(verified);
      setNotice(
        `Verified ${file.name.slice(0, 200)}: ${verified.fileCount} files and all checksums passed.`,
      );
    } catch (cause) {
      setExternalVerification(null);
      setError(cause instanceof Error ? cause.message : "The TAR could not be verified.");
    } finally {
      setProcessing(false);
    }
  };

  const reviewReady = document?.readiness.status === "needs-review";
  const buildReady = document?.readiness.status === "needs-build";
  const ready = isReproducibilityPackageReady(document);
  const exportReady = document?.readiness.status === "needs-export"
    || (ready && sourceLoaded);
  const currentVerification = verification ?? externalVerification;

  return (
    <main className={styles.workspace}>
      <header className={styles.topbar}>
        <div className={styles.brandRow}>
          <Link className={styles.brand} href="/projects">Cerise Scholar</Link>
          <Link className={styles.returnLink} href={`/projects/${projectId}/research-path`}>
            <AppIcon name="arrow-left" /> Back to Research Path
          </Link>
          <span className={styles.projectName}>{projectName}</span>
        </div>
        <div className={styles.topActions}>
          <span className={styles.localBadge}><AppIcon name="lock" /> Local archive only</span>
          <button
            className={styles.secondaryButton}
            onClick={() => sourceInput.current?.click()}
            type="button"
          >
            <AppIcon name="upload" /> Re-select Results Record
          </button>
        </div>
      </header>

      <div className={styles.contextBar}>
        <div>
          <span className={styles.contextIcon}><AppIcon name="folder" /></span>
          <strong>Reproducibility Package</strong>
          <span>Evidence chain · file manifest · verification report</span>
        </div>
        <div>
          <label htmlFor="reproducibility-release">Frozen release</label>
          <select
            id="reproducibility-release"
            onChange={(event) => setSelectedReleaseId(event.target.value)}
            value={selectedReleaseId}
          >
            {releases.length === 0 ? <option value="">No eligible release</option> : null}
            {releases.map((release) => (
              <option key={release.releaseId} value={release.releaseId}>
                Release v{release.releaseNumber}
              </option>
            ))}
          </select>
          <code>{selectedRelease ? shortChecksum(selectedRelease.checksum) : "No release"}</code>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.workflowRail}>
          <span className={styles.railLabel}>Package workflow</span>
          <ol>
            {[
              ["01", "Verify Results Record", Boolean(sourceLoaded)],
              ["02", "Declare external materials", Boolean(document && document.readiness.status !== "needs-context")],
              ["03", "Review and build archive", Boolean(document?.lastBuild)],
              ["04", "Export and preserve", ready],
            ].map(([number, label, complete]) => (
              <li className={complete ? styles.completeStep : ""} key={String(number)}>
                <span>{number}</span>
                <AppIcon name={complete ? "check-square" : "file"} />
                <strong>{label}</strong>
              </li>
            ))}
          </ol>
          <div className={styles.boundaryCard}>
            <AppIcon name="lock" />
            <strong>Always excluded</strong>
            <ul>
              <li>Participant and derived rows</li>
              <li>Raw audio and video</li>
              <li>Combined SQLite database</li>
              <li>API keys and AI prompts</li>
            </ul>
          </div>
        </aside>

        <section className={styles.content}>
          <div className={styles.hero}>
            <p>Phase 8.6 · Reproducibility Package</p>
            <h1>Preserve the analysis record without copying restricted data</h1>
            <span>
              Assemble a deterministic, checksummed local archive that maps the
              frozen contract through aggregate results and interpretation while
              keeping participant data in researcher-controlled storage.
            </span>
          </div>

          <section className={styles.importCard}>
            <div className={styles.importIcon}><AppIcon name={sourceLoaded ? "shield" : "upload"} /></div>
            <div>
              <strong>
                {sourceLoaded
                  ? "Phase 8.5 Results Record verified"
                  : "Import the exact Phase 8.5 Results Record"}
              </strong>
              <p>
                {sourceLoaded
                  ? `${sourceFilename} · ${readableBytes(sourceBytes)}`
                  : "Cerise verifies the release, contract, plan, preparation, analysis, interpretation, and Results Record checksums."}
              </p>
            </div>
            <button
              disabled={Boolean(prerequisiteIssue) || processing}
              onClick={() => sourceInput.current?.click()}
              type="button"
            >
              <AppIcon name={sourceLoaded ? "refresh" : "upload"} />
              {processing ? "Working…" : sourceLoaded ? "Replace record" : "Choose Results Record"}
            </button>
            <input
              accept="application/json,.json"
              aria-label="Choose the exported Phase 8.5 Results Record"
              hidden
              onChange={handleResultsRecord}
              ref={sourceInput}
              type="file"
            />
          </section>

          {prerequisiteIssue ? (
            <div className={styles.errorNotice} role="alert">
              <AppIcon name="alert" />
              <div><strong>Phase 8.6 is waiting for its local prerequisites.</strong><p>{prerequisiteIssue}</p></div>
            </div>
          ) : null}
          {error ? <div className={styles.errorNotice} role="alert"><AppIcon name="alert" />{error}</div> : null}
          {notice ? <div className={styles.successNotice} role="status"><AppIcon name="shield" />{notice}</div> : null}

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span>Deterministic file set</span>
                <h2>Archive contents</h2>
              </div>
              <span className={styles.countBadge}>{REPRODUCIBILITY_ARCHIVE_CONTENTS.length + 1} files</span>
            </div>
            <p className={styles.panelIntro}>
              Each non-manifest file receives a raw-byte SHA-256 checksum.
              The TAR is parsed and verified again before export is enabled.
            </p>
            <div className={styles.fileGrid}>
              <article>
                <div><AppIcon name="file" /><strong>manifest.json</strong></div>
                <p>Identity, content roles, privacy declarations, and file checksums.</p>
              </article>
              {REPRODUCIBILITY_ARCHIVE_CONTENTS.map((item) => (
                <article key={item.path}>
                  <div><AppIcon name="file" /><strong>{item.path}</strong></div>
                  <p>{item.label}</p>
                </article>
              ))}
            </div>
          </section>

          {document ? (
            <>
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span>Environment provenance</span>
                    <h2>Version and execution context</h2>
                  </div>
                  <span className={styles.contextBadge}>Archive build ≠ analysis execution</span>
                </div>
                <div className={styles.environmentGrid}>
                  <div><span>Captured browser</span><strong>{document.environment.userAgent}</strong></div>
                  <div><span>Platform</span><strong>{document.environment.platform || "Not reported"}</strong></div>
                  <div><span>Viewport</span><strong>{document.environment.viewportWidth} × {document.environment.viewportHeight}</strong></div>
                  <div><span>Time zone</span><strong>{document.environment.timeZone || "Not reported"}</strong></div>
                </div>
                <label className={styles.field}>
                  <span>Phase 8.4 execution environment notes</span>
                  <textarea
                    disabled={!sourceLoaded}
                    maxLength={2000}
                    onChange={(event) => updateDocument({
                      executionEnvironmentNotes: event.target.value,
                    })}
                    placeholder="Record the browser, device, operating system, or state that the execution environment was not recorded."
                    rows={4}
                    value={document.executionEnvironmentNotes}
                  />
                </label>
                <p className={styles.helperText}>
                  Cerise records the current archive-build browser automatically.
                  Phase 8.4 did not capture a complete execution environment snapshot,
                  so that distinction remains explicit in the package.
                </p>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span>Restricted materials</span>
                    <h2>Reference without embedding</h2>
                  </div>
                  <span className={styles.contextBadge}>Researcher-controlled locations</span>
                </div>
                <p className={styles.panelIntro}>
                  A reference is descriptive metadata only. Cerise does not open,
                  copy, validate, or upload the referenced location.
                </p>
                <div className={styles.materialStack}>
                  {MATERIALS.map((material) => {
                    const reference = document.restrictedMaterials[material.key];
                    return (
                      <article className={styles.materialCard} key={material.key}>
                        <div className={styles.materialHeading}>
                          <div><AppIcon name="lock" /></div>
                          <div><strong>{material.label}</strong><p>{material.description}</p></div>
                        </div>
                        <label className={styles.field}>
                          <span>{material.label} decision</span>
                          <select
                            aria-label={`${material.label} decision`}
                            disabled={!sourceLoaded}
                            onChange={(event) => updateReference(material.key, {
                              status: event.target.value as RestrictedMaterialStatus,
                              reference: "",
                              accessConditions: "",
                            })}
                            value={reference.status}
                          >
                            {STATUS_OPTIONS
                              .filter((option) => (
                                option.value !== "not-collected" || material.key === "rawMedia"
                              ))
                              .map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        {reference.status === "referenced-outside-archive" ? (
                          <div className={styles.referenceFields}>
                            <label className={styles.field}>
                              <span>Researcher-controlled reference</span>
                              <input
                                disabled={!sourceLoaded}
                                maxLength={2000}
                                onChange={(event) => updateReference(material.key, {
                                  reference: event.target.value,
                                })}
                                placeholder="For example: encrypted project vault / restricted data collection"
                                value={reference.reference}
                              />
                            </label>
                            <label className={styles.field}>
                              <span>Access conditions</span>
                              <input
                                disabled={!sourceLoaded}
                                maxLength={2000}
                                onChange={(event) => updateReference(material.key, {
                                  accessConditions: event.target.value,
                                })}
                                placeholder="Who may access it, under which approval or policy?"
                                value={reference.accessConditions}
                              />
                            </label>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span>Researcher review</span>
                    <h2>Confirm scope and scientific boundary</h2>
                  </div>
                  <span className={styles.contextBadge}>No automatic preservation</span>
                </div>
                <label className={styles.field}>
                  <span>Archive review notes</span>
                  <textarea
                    disabled={!sourceLoaded}
                    maxLength={2000}
                    onChange={(event) => updateDocument({ reviewNotes: event.target.value })}
                    placeholder="Optional notes about archive contents, omissions, references, or preservation decisions."
                    rows={4}
                    value={document.reviewNotes}
                  />
                </label>
                <label className={styles.confirmation}>
                  <input
                    checked={document.researcherConfirmed}
                    disabled={!sourceLoaded}
                    onChange={(event) => updateDocument({
                      researcherConfirmed: event.target.checked,
                    })}
                    type="checkbox"
                  />
                  <span>
                    I reviewed the manifest contents and external-material decisions.
                    I understand that checksum verification is not proof of authorship,
                    scientific reproducibility, validity, ethics approval, or publication readiness.
                  </span>
                </label>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span>Independent verification</span>
                    <h2>Build receipt and archive checker</h2>
                  </div>
                  <button
                    className={styles.inlineButton}
                    disabled={processing}
                    onClick={() => archiveInput.current?.click()}
                    type="button"
                  >
                    <AppIcon name="shield" /> Verify an exported TAR
                  </button>
                  <input
                    accept=".tar,application/x-tar"
                    aria-label="Choose a Phase 8.6 TAR to verify"
                    hidden
                    onChange={verifyExistingArchive}
                    ref={archiveInput}
                    type="file"
                  />
                </div>
                {currentVerification ? (
                  <div className={styles.verificationCard}>
                    <div className={styles.verificationSummary}>
                      <span><AppIcon name="shield" /></span>
                      <div>
                        <strong>Archive verification passed</strong>
                        <p>
                          {currentVerification.fileCount} files · {readableBytes(currentVerification.archiveBytes)}
                        </p>
                      </div>
                      <code>{shortChecksum(currentVerification.archiveChecksum)}</code>
                    </div>
                    <ul>
                      {currentVerification.checks.map((check) => (
                        <li key={check.id}><AppIcon name="check-square" /><span><strong>{check.id}</strong>{check.detail}</span></li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className={styles.emptyVerification}>
                    <AppIcon name="shield" />
                    <div>
                      <strong>No archive verified in this tab yet</strong>
                      <p>Build the current package or re-select an exported TAR to check it independently.</p>
                    </div>
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className={styles.emptyState}>
              <AppIcon name="folder" />
              <h2>Verify the Results Record to begin</h2>
              <p>
                Phase 8.6 creates its local record only after the complete
                Phase 8.0–8.5 chain passes.
              </p>
            </section>
          )}
        </section>

        <aside className={styles.gateRail}>
          <span className={styles.railLabel}>Reproducibility gate</span>
          <h2>{ready ? "Ready for preservation" : "Complete the local archive"}</h2>
          <p>
            Finalize only after the exact Results Record, external references,
            review, deterministic build, and local export are recorded.
          </p>
          <ul className={styles.gateList}>
            <li className={sourceLoaded || document ? styles.gateComplete : ""}>
              <AppIcon name="check-square" /> Results Record provenance verified
            </li>
            <li className={document && document.readiness.status !== "needs-context" ? styles.gateComplete : ""}>
              <AppIcon name="check-square" /> External-material decisions complete
            </li>
            <li className={document?.reviewedAt ? styles.gateComplete : ""}>
              <AppIcon name="check-square" /> Researcher review confirmed
            </li>
            <li className={document?.lastBuild ? styles.gateComplete : ""}>
              <AppIcon name="check-square" /> Archive built and verified
            </li>
            <li className={ready ? styles.gateComplete : ""}>
              <AppIcon name="check-square" /> TAR exported locally
            </li>
          </ul>

          {document?.readiness.issues.length ? (
            <details className={styles.issueDisclosure}>
              <summary>{document.readiness.issues.length} item(s) remain</summary>
              <ul>{document.readiness.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
            </details>
          ) : null}

          <button
            className={styles.reviewButton}
            disabled={!reviewReady || processing || !sourceLoaded}
            onClick={confirmReview}
            type="button"
          >
            <AppIcon name="check-square" />
            {document?.reviewedAt ? "Review confirmed" : "Confirm archive review"}
          </button>
          <button
            className={styles.buildButton}
            disabled={!buildReady || processing || !sourceLoaded}
            onClick={() => { void buildArchive(); }}
            type="button"
          >
            <AppIcon name="workflow" />
            {processing ? "Building and verifying…" : "Build and verify TAR"}
          </button>
          <button
            className={styles.exportButton}
            disabled={!exportReady || processing || !sourceLoaded}
            onClick={() => { void exportArchive(); }}
            type="button"
          >
            <AppIcon name="save" />
            {ready ? "Export TAR again" : "Export reproducibility TAR"}
          </button>

          <div className={styles.privacyCard}>
            <AppIcon name="lock" />
            <div>
              <strong>No restricted data enters the TAR</strong>
              <p>Only metadata, aggregate output, interpretation, checksums, and bounded references are packaged.</p>
            </div>
          </div>

          <dl className={styles.receipt}>
            <div><dt>Status</dt><dd>{statusLabel(document)}</dd></div>
            <div><dt>Results Record</dt><dd>{document ? shortChecksum(document.source.resultsRecordChecksum) : "Not yet"}</dd></div>
            <div><dt>Review</dt><dd>{formatTimestamp(document?.reviewedAt ?? "")}</dd></div>
            <div><dt>Build</dt><dd>{document?.lastBuild ? readableBytes(document.lastBuild.archiveBytes) : "Not yet"}</dd></div>
            <div><dt>Export</dt><dd>{formatTimestamp(document?.exportedAt ?? "")}</dd></div>
            <div><dt>Upload</dt><dd>Never automatic</dd></div>
          </dl>

          <div className={styles.warningCard}>
            <AppIcon name="help" />
            <p>
              This archive is not a digital signature, trusted timestamp,
              scientific-reproducibility result, validity certification, or submission package.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
