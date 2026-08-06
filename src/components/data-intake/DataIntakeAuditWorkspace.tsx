"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";
import { AppIcon, type AppIconName } from "@/components/app-shell/AppIcons";
import {
  MAX_DATA_INTAKE_FILE_BYTES,
  MAX_DATA_INTAKE_TOTAL_BYTES,
  auditDataIntakeBundle,
  isDataIntakeAuditReady,
  markDataIntakeAuditReviewed,
  readDataIntakeAuditReceipt,
  writeDataIntakeAuditReceipt,
  type DataIntakeAuditReceipt,
  type DataIntakeIssue,
  type DataIntakeSourceFile,
} from "@/lib/research/dataIntakeAudit";
import { readAnalysisPlanDocument, type AnalysisPlanDocument } from "@/lib/research/analysisPlan";
import type { ExperimentRelease } from "@/lib/research/experimentRelease";
import {
  fetchExperimentReleases,
  readLocalExperimentReleases,
  verifiedExperimentReleases,
} from "@/lib/research/experimentReleasePersistence";
import styles from "./DataIntakeAuditWorkspace.module.css";

interface DataIntakeAuditWorkspaceProps {
  projectId: string;
  projectName: string;
}

type AuditTab = "overview" | "schema" | "missingness" | "conditions" | "issues";
type RequiredFileRole = DataIntakeSourceFile["role"];

interface ParsedFile {
  file: File;
  value: unknown;
  source: DataIntakeSourceFile;
}

const DIRECTORY_INPUT_PROPS = {
  directory: "",
  webkitdirectory: "",
} as unknown as InputHTMLAttributes<HTMLInputElement>;

const REQUIRED_FILES: ReadonlyArray<{
  role: RequiredFileRole;
  label: string;
}> = [
  { role: "release", label: "release.json" },
  { role: "codebook", label: "codebook.json" },
  { role: "analysis-contract", label: "analysis-contract.json" },
  { role: "production", label: "production/responses.json" },
  { role: "pilot", label: "pilot/responses.json" },
];

const TABS: ReadonlyArray<{ id: AuditTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "schema", label: "Schema" },
  { id: "missingness", label: "Missingness" },
  { id: "conditions", label: "Conditions" },
  { id: "issues", label: "Issues" },
];

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

function pathSegments(file: File): string[] {
  const relative = file.webkitRelativePath || file.name;
  return relative.replaceAll("\\", "/").split("/").filter(Boolean);
}

function roleForFile(file: File): RequiredFileRole | null {
  const segments = pathSegments(file);
  const name = segments.at(-1)?.toLocaleLowerCase() ?? "";
  const parent = segments.at(-2)?.toLocaleLowerCase() ?? "";
  if (name === "responses.json" && parent === "production") return "production";
  if (name === "responses.json" && parent === "pilot") return "pilot";
  if (name === "release.json") return "release";
  if (name === "codebook.json") return "codebook";
  if (name === "analysis-contract.json") return "analysis-contract";
  return null;
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function parseSelectedFile(file: File, role: RequiredFileRole): Promise<ParsedFile> {
  if (file.size <= 0 || file.size > MAX_DATA_INTAKE_FILE_BYTES) {
    throw new Error(`${file.name} is empty or exceeds the 16 MB Phase 8.2 file limit.`);
  }
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
  } catch {
    throw new Error(`${file.name} is not valid UTF-8 JSON.`);
  }
  return {
    file,
    value,
    source: {
      role,
      name: file.webkitRelativePath || file.name,
      byteSize: file.size,
      checksum: `sha256:${toHex(digest)}`,
    },
  };
}

async function parseExportFolder(files: FileList): Promise<Record<RequiredFileRole, ParsedFile>> {
  const matches = new Map<RequiredFileRole, File[]>();
  for (const file of Array.from(files)) {
    const role = roleForFile(file);
    if (!role) continue;
    matches.set(role, [...(matches.get(role) ?? []), file]);
  }
  for (const required of REQUIRED_FILES) {
    const candidates = matches.get(required.role) ?? [];
    if (candidates.length !== 1) {
      throw new Error(
        candidates.length === 0
          ? `The export folder is missing ${required.label}.`
          : `The selected folder contains more than one ${required.label}.`,
      );
    }
  }
  const selected = REQUIRED_FILES.map(({ role }) => ({
    role,
    file: (matches.get(role) ?? [])[0],
  }));
  if (selected.reduce((sum, item) => sum + item.file.size, 0) > MAX_DATA_INTAKE_TOTAL_BYTES) {
    throw new Error("The five required JSON files exceed the 36 MB Phase 8.2 intake limit.");
  }
  const parsed = await Promise.all(selected.map(({ file, role }) => parseSelectedFile(file, role)));
  return Object.fromEntries(parsed.map((item) => [item.source.role, item])) as Record<
    RequiredFileRole,
    ParsedFile
  >;
}

function formatDate(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(parsed));
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(value > 0 && value < 0.01 ? 2 : 1)}%`;
}

function safeExportName(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || "cerise-data-intake";
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.click();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function issueTone(item: DataIntakeIssue): string {
  if (item.severity === "blocking") return styles.issueBlocking;
  if (item.severity === "review") return styles.issueReview;
  return styles.issueInformation;
}

function GateItem({
  complete,
  label,
}: {
  complete: boolean;
  label: string;
}) {
  return (
    <li className={complete ? styles.gateComplete : styles.gateIncomplete}>
      <span><AppIcon name={complete ? "check-square" : "alert"} /></span>
      {label}
    </li>
  );
}

function StatCard({
  label,
  value,
  detail,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "success" | "review" | "blue";
  icon: AppIconName;
}) {
  return (
    <article className={`${styles.statCard} ${styles[`stat${tone}`]}`}>
      <span className={styles.statIcon}><AppIcon name={icon} /></span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

export default function DataIntakeAuditWorkspace({
  projectId,
  projectName,
}: DataIntakeAuditWorkspaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [releases, setReleases] = useState<ExperimentRelease[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [plan, setPlan] = useState<AnalysisPlanDocument | null>(null);
  const [receipt, setReceipt] = useState<DataIntakeAuditReceipt | null>(null);
  const [activeTab, setActiveTab] = useState<AuditTab>("overview");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selectedRelease = useMemo(
    () => releases.find((release) => release.releaseId === selectedReleaseId) ?? releases[0] ?? null,
    [releases, selectedReleaseId],
  );

  const refreshReceipt = useCallback((release: ExperimentRelease | null) => {
    if (!release) {
      setPlan(null);
      setReceipt(null);
      return;
    }
    setPlan(readAnalysisPlanDocument(window.localStorage, release));
    setReceipt(readDataIntakeAuditReceipt(window.localStorage, release));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const candidates = readLocalExperimentReleases(window.localStorage, projectId);
      const local = (await verifiedExperimentReleases(candidates, projectId))
        .filter(supportsDataIntake);
      let merged = local;
      try {
        merged = mergeReleases(await fetchExperimentReleases(projectId), local);
      } catch {
        // Verified local releases keep Phase 8.2 usable while the cloud is unavailable.
      }
      if (cancelled) return;
      setReleases(merged);
      setSelectedReleaseId((current) => (
        merged.some((release) => release.releaseId === current)
          ? current
          : merged[0]?.releaseId ?? ""
      ));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    refreshReceipt(selectedRelease);
  }, [refreshReceipt, selectedRelease]);

  useEffect(() => {
    const refresh = () => refreshReceipt(selectedRelease);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refreshReceipt, selectedRelease]);

  const handleFolder = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    event.target.value = "";
    if (!files || files.length === 0 || !selectedRelease) return;
    setImporting(true);
    setError("");
    setNotice("");
    try {
      const parsed = await parseExportFolder(files);
      const currentPlan = readAnalysisPlanDocument(window.localStorage, selectedRelease);
      const audited = await auditDataIntakeBundle({
        release: parsed.release.value,
        codebook: parsed.codebook.value,
        analysisContract: parsed["analysis-contract"].value,
        production: parsed.production.value,
        pilot: parsed.pilot.value,
        sourceFiles: REQUIRED_FILES.map(({ role }) => parsed[role].source),
      }, selectedRelease, currentPlan);
      const saved = writeDataIntakeAuditReceipt(
        window.localStorage,
        selectedRelease,
        audited,
      );
      setPlan(currentPlan);
      setReceipt(saved);
      setActiveTab("overview");
      setNotice(
        saved.status === "blocked"
          ? "The export was audited, but blocking issues must be resolved."
          : "Local audit complete. Participant rows were discarded after aggregation.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The export folder could not be audited.");
    } finally {
      setImporting(false);
    }
  };

  const confirmReview = () => {
    if (!receipt || !selectedRelease) return;
    setError("");
    try {
      const reviewed = markDataIntakeAuditReviewed(receipt, selectedRelease);
      const saved = writeDataIntakeAuditReceipt(
        window.localStorage,
        selectedRelease,
        reviewed,
      );
      setReceipt(saved);
      setNotice("Audit review confirmed. Stage 6 can now use this aggregate receipt.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The audit review could not be confirmed.");
    }
  };

  const exportReceipt = () => {
    if (!receipt || !selectedRelease) return;
    downloadJson(
      `${safeExportName(projectName)}-data-intake-audit-v${selectedRelease.releaseNumber}.json`,
      {
        exportType: "cerise-data-intake-audit-receipt",
        exportBoundary:
          "Editable local aggregate; not preregistration, certification, or statistical output.",
        receipt,
      },
    );
  };

  const ready = isDataIntakeAuditReady(receipt);
  const planReady = plan?.readiness.status === "ready";
  const reviewIssues = receipt?.issues.filter((item) => item.severity === "review") ?? [];
  const blockingIssues = receipt?.issues.filter((item) => item.severity === "blocking") ?? [];

  if (loading) {
    return (
      <main className={styles.centeredState}>
        <span className={styles.loadingMark} />
        <strong>Loading frozen releases…</strong>
      </main>
    );
  }

  return (
    <main className={styles.intakeApp}>
      <header className={styles.topBar}>
        <Link className={styles.brand} href="/projects">Cerise Scholar</Link>
        <Link className={styles.returnLink} href={`/projects/${projectId}/research-path`}>
          <AppIcon name="arrow-left" />
          Research Path
        </Link>
        <span className={styles.projectTitle}>{projectName}</span>
        <div className={styles.topActions}>
          <span className={styles.localBadge}>
            <AppIcon name="lock" />
            Raw rows are discarded locally
          </span>
          <button disabled={!receipt} onClick={exportReceipt} type="button">
            <AppIcon name="save" />
            Export receipt
          </button>
        </div>
      </header>

      <section className={styles.contextBar}>
        <div>
          <strong>Data Intake &amp; Audit</strong>
          <span>Phase 8.2 · before transformation or statistics</span>
        </div>
        <div className={styles.releaseContext}>
          <AppIcon name="shield" />
          <select
            aria-label="Selected frozen release"
            onChange={(event) => setSelectedReleaseId(event.target.value)}
            value={selectedRelease?.releaseId ?? ""}
          >
            {releases.map((release) => (
              <option key={release.releaseId} value={release.releaseId}>
                Release v{release.releaseNumber}
              </option>
            ))}
          </select>
          {selectedRelease ? <code>{selectedRelease.checksum.slice(0, 20)}…</code> : null}
        </div>
      </section>

      {!selectedRelease ? (
        <section className={styles.emptyRelease}>
          <AppIcon name="lock" />
          <h1>A Phase 8 release is required</h1>
          <p>
            Freeze and verify an Experimental Studio release that contains the Phase 8
            analysis contract, then return here.
          </p>
          <Link href={`/experimental-studio/${projectId}`}>Open Experimental Studio</Link>
        </section>
      ) : (
        <div className={styles.workspace}>
          <aside className={styles.workflowRail}>
            <span className={styles.railLabel}>Intake workflow</span>
            <ol>
              {[
                ["Add export", Boolean(receipt), "Import the Local Research Host folder", "upload"],
                ["Verify identity", Boolean(receipt?.identity.releaseVerified && receipt.identity.contractMatched), "Match release and contract checksums", "shield"],
                ["Separate cohorts", Boolean(receipt?.cohortSeparation.productionModeVerified && receipt.cohortSeparation.pilotModeVerified), "Keep pilot outside production", "users"],
                ["Validate schema", Boolean(receipt && blockingIssues.length === 0), "Compare fields with the codebook", "list"],
                ["Review quality", Boolean(receipt?.reviewedAt), "Inspect bounded aggregate findings", "search"],
                ["Audit receipt", ready, "Handoff to reproducible preparation", "file"],
              ].map(([label, complete, description, icon], index) => (
                <li className={complete ? styles.workflowComplete : ""} key={String(label)}>
                  <span className={styles.workflowNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <AppIcon name={icon as AppIconName} />
                  <div>
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </div>
                  <span className={styles.workflowState}>
                    {complete ? <AppIcon name="check-square" /> : null}
                  </span>
                </li>
              ))}
            </ol>
            <div className={styles.railPrivacy}>
              <AppIcon name="lock" />
              <strong>Local aggregation only</strong>
              <p>
                Cerise does not upload, save, display, or send participant values to AI.
              </p>
            </div>
          </aside>

          <section className={styles.auditCanvas}>
            <header className={styles.hero}>
              <p>Phase 8.2 · Data Intake &amp; Audit</p>
              <h1>Verify the dataset before analysis</h1>
              <span>
                Match a Local Research Host export to its frozen release, prove pilot
                separation, inspect schema and missingness, and create a read-only aggregate
                receipt before Phase 8.3.
              </span>
            </header>

            <div className={styles.importPanel}>
              <div>
                <span className={styles.importIcon}><AppIcon name="folder" /></span>
                <div>
                  <strong>{receipt ? "Imported export bundle" : "Add Local Research Host export"}</strong>
                  <p>
                    Select the complete export folder containing the frozen metadata and
                    separate production and pilot response files.
                  </p>
                </div>
              </div>
              <button
                disabled={importing || !planReady}
                onClick={() => inputRef.current?.click()}
                type="button"
              >
                <AppIcon name={receipt ? "refresh" : "upload"} />
                {importing ? "Auditing locally…" : receipt ? "Replace export" : "Choose export folder"}
              </button>
              <input
                {...DIRECTORY_INPUT_PROPS}
                aria-label="Choose Local Research Host export folder"
                hidden
                multiple
                onChange={handleFolder}
                ref={inputRef}
                type="file"
              />
            </div>

            {!planReady ? (
              <div className={styles.planWarning}>
                <AppIcon name="alert" />
                <div>
                  <strong>Complete Phase 8.1 before opening participant data.</strong>
                  <p>
                    The selected release does not yet have a ready local Analysis Plan.
                    Data import remains disabled so the plan snapshot can precede this
                    device-reported access event.
                  </p>
                </div>
                <Link href={`/analysis-plan/${projectId}`} target="_blank">
                  Open Analysis Plan
                  <AppIcon name="external-link" />
                </Link>
              </div>
            ) : null}

            {error ? <div className={styles.errorNotice} role="alert"><AppIcon name="alert" />{error}</div> : null}
            {notice ? <div className={styles.successNotice} role="status"><AppIcon name="shield" />{notice}</div> : null}

            {receipt ? (
              <>
                <section className={styles.fileStrip} aria-label="Audited source files">
                  <div className={styles.fileStripHeading}>
                    <div>
                      <strong>Required export files</strong>
                      <span>Checksums and sizes only—no participant values are retained.</span>
                    </div>
                    <span>{formatDate(receipt.auditedAt)}</span>
                  </div>
                  <div className={styles.fileGrid}>
                    {receipt.sourceFiles.map((file) => (
                      <article key={file.role}>
                        <AppIcon name="file" />
                        <div>
                          <strong>{file.name.split("/").slice(-2).join("/")}</strong>
                          <span>{formatBytes(file.byteSize)}</span>
                        </div>
                        <AppIcon name="check-square" />
                      </article>
                    ))}
                  </div>
                </section>

                <section className={styles.statsGrid}>
                  <StatCard
                    detail={receipt.identity.contractMatched ? "Contract matched" : "Contract mismatch"}
                    icon="shield"
                    label="Identity"
                    tone={receipt.status === "blocked" ? "review" : "success"}
                    value={receipt.identity.releaseVerified ? "Verified" : "Blocked"}
                  />
                  <StatCard
                    detail="Completed production sessions"
                    icon="users"
                    label="Production"
                    tone="success"
                    value={String(receipt.modes.production.completed)}
                  />
                  <StatCard
                    detail="Isolated and excluded"
                    icon="user"
                    label="Pilot"
                    tone="blue"
                    value={String(receipt.modes.pilot.total)}
                  />
                  <StatCard
                    detail={`${receipt.schema.unexpectedVariables.length} unexpected field(s)`}
                    icon="list"
                    label="Schema"
                    tone={receipt.schema.unexpectedVariables.length > 0 ? "review" : "success"}
                    value={receipt.schema.unexpectedVariables.length > 0 ? "Review" : "Matched"}
                  />
                </section>

                <section className={styles.reportPanel}>
                  <nav aria-label="Audit report sections">
                    {TABS.map((tab) => (
                      <button
                        className={activeTab === tab.id ? styles.tabSelected : ""}
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        type="button"
                      >
                        {tab.label}
                        {tab.id === "issues" && receipt.issues.length > 0
                          ? <span>{receipt.issues.length}</span>
                          : null}
                      </button>
                    ))}
                  </nav>
                  <div className={styles.reportBody}>
                    {activeTab === "overview" ? (
                      <table>
                        <thead><tr><th>Check</th><th>Result</th><th>Status</th></tr></thead>
                        <tbody>
                          <tr>
                            <td>Release and contract identity</td>
                            <td>Release v{receipt.releaseNumber} · independently checksummed</td>
                            <td><span className={receipt.identity.contractMatched ? styles.pass : styles.blocked}>{receipt.identity.contractMatched ? "Pass" : "Blocked"}</span></td>
                          </tr>
                          <tr>
                            <td>Pilot separation</td>
                            <td>{receipt.modes.pilot.total} pilot session(s) kept outside production</td>
                            <td><span className={receipt.cohortSeparation.crossModeDuplicateSessions === 0 ? styles.pass : styles.blocked}>{receipt.cohortSeparation.crossModeDuplicateSessions === 0 ? "Pass" : "Blocked"}</span></td>
                          </tr>
                          <tr>
                            <td>Expected variables</td>
                            <td>{receipt.schema.observedVariables.filter((name) => receipt.schema.expectedVariables.includes(name)).length} / {receipt.schema.expectedVariables.length} observed</td>
                            <td><span className={receipt.schema.neverObservedVariables.length === 0 ? styles.pass : styles.review}>{receipt.schema.neverObservedVariables.length === 0 ? "Pass" : "Review"}</span></td>
                          </tr>
                          <tr>
                            <td>Unexpected response fields</td>
                            <td>{receipt.schema.unexpectedVariables.length}</td>
                            <td><span className={receipt.schema.unexpectedVariables.length === 0 ? styles.pass : styles.review}>{receipt.schema.unexpectedVariables.length === 0 ? "Pass" : "Review"}</span></td>
                          </tr>
                          <tr>
                            <td>Duplicate session IDs</td>
                            <td>{receipt.quality.duplicateSessionIds + receipt.cohortSeparation.crossModeDuplicateSessions}</td>
                            <td><span className={receipt.quality.duplicateSessionIds === 0 && receipt.cohortSeparation.crossModeDuplicateSessions === 0 ? styles.pass : styles.blocked}>{receipt.quality.duplicateSessionIds === 0 && receipt.cohortSeparation.crossModeDuplicateSessions === 0 ? "Pass" : "Blocked"}</span></td>
                          </tr>
                          <tr>
                            <td>Missing planned primary outcome</td>
                            <td>{formatRate(receipt.quality.primaryOutcomeMissingRate)} ({receipt.quality.primaryOutcomeMissingCount} of {receipt.quality.primaryOutcomeCompletedCount})</td>
                            <td><span className={receipt.quality.primaryOutcomeMissingCount === 0 ? styles.pass : styles.review}>{receipt.quality.primaryOutcomeMissingCount === 0 ? "Pass" : "Review"}</span></td>
                          </tr>
                        </tbody>
                      </table>
                    ) : null}
                    {activeTab === "schema" ? (
                      <table>
                        <thead><tr><th>Frozen variable</th><th>Required</th><th>Observed</th></tr></thead>
                        <tbody>
                          {receipt.variables.map((variable) => (
                            <tr key={variable.name}>
                              <td><code>{variable.name}</code></td>
                              <td>{variable.required ? "Yes" : "No"}</td>
                              <td><span className={receipt.schema.observedVariables.includes(variable.name) ? styles.pass : styles.review}>{receipt.schema.observedVariables.includes(variable.name) ? "Observed" : "Never observed"}</span></td>
                            </tr>
                          ))}
                          {receipt.schema.unexpectedVariables.map((name) => (
                            <tr key={name}>
                              <td><code>{name}</code></td>
                              <td>Not declared</td>
                              <td><span className={styles.review}>Unexpected</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                    {activeTab === "missingness" ? (
                      <table>
                        <thead><tr><th>Variable</th><th>Missing</th><th>Rate</th></tr></thead>
                        <tbody>
                          {receipt.variables.map((variable) => (
                            <tr key={variable.name}>
                              <td><code>{variable.name}</code>{variable.required ? <small>Required</small> : null}</td>
                              <td>{variable.missingCount} / {variable.completedProductionCount}</td>
                              <td><span className={variable.missingCount === 0 ? styles.pass : styles.review}>{formatRate(variable.missingRate)}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                    {activeTab === "conditions" ? (
                      <table>
                        <thead><tr><th>Frozen condition</th><th>ID</th><th>Completed production</th></tr></thead>
                        <tbody>
                          {receipt.conditions.map((condition) => (
                            <tr key={condition.id}>
                              <td>{condition.name}</td>
                              <td><code>{condition.id}</code></td>
                              <td>{condition.completedProductionCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                    {activeTab === "issues" ? (
                      <div className={styles.issueList}>
                        {receipt.issues.length === 0 ? (
                          <div className={styles.noIssues}>
                            <AppIcon name="shield" />
                            <strong>No structural audit issue was detected.</strong>
                            <p>This does not certify scientific validity or data quality.</p>
                          </div>
                        ) : receipt.issues.map((item) => (
                          <article className={issueTone(item)} key={item.id}>
                            <AppIcon name={item.severity === "information" ? "help" : "alert"} />
                            <div>
                              <span>{item.severity} · {item.category}</span>
                              <strong>{item.message}</strong>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              </>
            ) : planReady ? (
              <section className={styles.emptyAudit}>
                <AppIcon name="upload" />
                <h2>Select one complete Local Research Host export folder</h2>
                <p>
                  Phase 8.2 reads five JSON files, verifies their checksums and schema,
                  computes aggregate findings in this browser, then discards participant rows.
                </p>
                <ul>
                  {REQUIRED_FILES.map((file) => <li key={file.role}>{file.label}</li>)}
                </ul>
              </section>
            ) : null}
          </section>

          <aside className={styles.gateRail}>
            <span className={styles.gateLabel}>Intake gate</span>
            <h2>{ready ? "Ready for Phase 8.3" : "Review before preparation"}</h2>
            <ul>
              <GateItem complete={Boolean(planReady)} label="Analysis Plan ready" />
              <GateItem complete={Boolean(receipt?.identity.releaseVerified)} label="Release verified" />
              <GateItem complete={Boolean(receipt?.identity.contractMatched && receipt?.identity.codebookMatched)} label="Contract and codebook matched" />
              <GateItem complete={Boolean(receipt?.cohortSeparation.productionModeVerified && receipt?.cohortSeparation.pilotModeVerified && receipt?.cohortSeparation.crossModeDuplicateSessions === 0)} label="Pilot isolated from production" />
              <GateItem complete={Boolean(receipt && blockingIssues.length === 0)} label="Schema has no blocking issue" />
              <GateItem complete={Boolean(receipt?.reviewedAt)} label="Researcher reviewed findings" />
            </ul>

            {receipt ? (
              <div className={blockingIssues.length > 0 ? styles.gateBlock : reviewIssues.length > 0 ? styles.gateReview : styles.gatePass}>
                <AppIcon name={blockingIssues.length > 0 ? "alert" : "shield"} />
                <div>
                  <strong>
                    {blockingIssues.length > 0
                      ? `${blockingIssues.length} blocking issue(s)`
                      : reviewIssues.length > 0
                        ? `${reviewIssues.length} finding(s) need review`
                        : "Structural checks passed"}
                  </strong>
                  <p>
                    {blockingIssues.length > 0
                      ? "Replace or correct the Local Host export before proceeding."
                      : "Confirmation records review; it does not certify validity."}
                  </p>
                </div>
              </div>
            ) : null}

            <button
              className={styles.confirmButton}
              disabled={!receipt || receipt.status === "blocked" || Boolean(receipt.reviewedAt)}
              onClick={confirmReview}
              type="button"
            >
              <AppIcon name="check-square" />
              {receipt?.reviewedAt ? "Audit review confirmed" : "Confirm audit review"}
            </button>
            <button
              className={styles.exportButton}
              disabled={!receipt}
              onClick={exportReceipt}
              type="button"
            >
              <AppIcon name="save" />
              Export audit receipt
            </button>

            <div className={styles.memoryBoundary}>
              <AppIcon name="lock" />
              <div>
                <strong>No raw response storage</strong>
                <p>
                  Participant rows are parsed locally for aggregate counts and then discarded.
                  Only this bounded audit receipt is saved on the device.
                </p>
              </div>
            </div>
            {receipt ? (
              <dl className={styles.provenance}>
                <div><dt>Plan snapshot</dt><dd>{formatDate(receipt.analysisPlan.updatedAt)}</dd></div>
                <div><dt>Local access event</dt><dd>{formatDate(receipt.dataAccessEvent.observedAt)}</dd></div>
                <div><dt>Declaration</dt><dd>{receipt.analysisPlan.dataAccessDeclaration.replaceAll("-", " ")}</dd></div>
              </dl>
            ) : null}
          </aside>
        </div>
      )}
    </main>
  );
}
