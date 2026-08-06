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
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  MAX_DATA_INTAKE_FILE_BYTES,
  MAX_DATA_INTAKE_TOTAL_BYTES,
  isDataIntakeAuditReady,
  readDataIntakeAuditReceipt,
  type DataIntakeAuditReceipt,
  type DataIntakeSourceFile,
} from "@/lib/research/dataIntakeAudit";
import {
  PREPARATION_META_COLUMNS,
  PREPARATION_OPERATION_OPTIONS,
  buildDataPreparationPackage,
  createDataPreparationDocument,
  createPreparationOperation,
  isDataPreparationReady,
  markDataPreparationExported,
  markDataPreparationReviewed,
  normalizePreparationOperations,
  readDataPreparationDocument,
  updateDataPreparationOperations,
  writeDataPreparationDocument,
  type DataPreparationDocument,
  type DataPreparationPackage,
  type PreparationComparison,
  type PreparationOperation,
  type PreparationOperationType,
} from "@/lib/research/dataPreparation";
import type { ExperimentRelease } from "@/lib/research/experimentRelease";
import {
  fetchExperimentReleases,
  readLocalExperimentReleases,
  verifiedExperimentReleases,
} from "@/lib/research/experimentReleasePersistence";
import { collectExperimentVariables } from "@/lib/research/experimentStudio";
import styles from "./DataPreparationWorkspace.module.css";

interface DataPreparationWorkspaceProps {
  projectId: string;
  projectName: string;
}

type RequiredFileRole = DataIntakeSourceFile["role"];

interface ParsedFile {
  value: unknown;
  source: DataIntakeSourceFile;
}

interface MemorySource {
  production: unknown;
  sourceFiles: DataIntakeSourceFile[];
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

const COMPARISONS: ReadonlyArray<{ value: PreparationComparison; label: string }> = [
  { value: "is-missing", label: "Is missing" },
  { value: "equals", label: "Equals" },
  { value: "not-equals", label: "Does not equal" },
  { value: "less-than", label: "Is less than" },
  { value: "greater-than", label: "Is greater than" },
];

function supportsPreparation(release: ExperimentRelease): boolean {
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
    .filter(supportsPreparation)
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
    throw new Error(`${file.name} is empty or exceeds the 16 MB local file limit.`);
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
    throw new Error("The five required JSON files exceed the 36 MB local intake limit.");
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

function safeExportName(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || "cerise-prepared-data";
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

function operationLabel(type: PreparationOperationType): string {
  return PREPARATION_OPERATION_OPTIONS.find((option) => option.type === type)?.label ?? type;
}

function operationDescription(type: PreparationOperationType): string {
  return PREPARATION_OPERATION_OPTIONS.find((option) => option.type === type)?.description ?? "";
}

function updateMultiSelection(
  current: string[],
  name: string,
  checked: boolean,
): string[] {
  if (checked) return current.includes(name) ? current : [...current, name];
  return current.length > 1 ? current.filter((item) => item !== name) : current;
}

function VariableChecklist({
  available,
  selected,
  onChange,
}: {
  available: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className={styles.variableChecklist}>
      {available.map((name) => (
        <label key={name}>
          <input
            checked={selected.includes(name)}
            onChange={(event) => onChange(
              updateMultiSelection(selected, name, event.target.checked),
            )}
            type="checkbox"
          />
          <code>{name}</code>
        </label>
      ))}
    </div>
  );
}

function OperationEditor({
  availableColumns,
  index,
  operation,
  onChange,
  onMove,
  onRemove,
}: {
  availableColumns: string[];
  index: number;
  operation: PreparationOperation;
  onChange: (next: PreparationOperation) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const updateBase = (patch: Partial<PreparationOperation>) => {
    onChange({ ...operation, ...patch } as PreparationOperation);
  };
  return (
    <article className={styles.operationCard}>
      <div className={styles.operationOrder}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <div>
          <button aria-label="Move operation up" onClick={() => onMove(-1)} type="button">↑</button>
          <button aria-label="Move operation down" onClick={() => onMove(1)} type="button">↓</button>
        </div>
      </div>
      <div className={styles.operationContent}>
        <header>
          <div>
            <span className={styles.safeBadge}>Declarative</span>
            <h3>{operationLabel(operation.type)}</h3>
            <p>{operationDescription(operation.type)}</p>
          </div>
          <div className={styles.operationActions}>
            <label>
              <input
                checked={operation.enabled}
                onChange={(event) => updateBase({ enabled: event.target.checked })}
                type="checkbox"
              />
              Enabled
            </label>
            <button aria-label={`Delete ${operationLabel(operation.type)}`} onClick={onRemove} type="button">
              <AppIcon name="trash" />
            </button>
          </div>
        </header>

        <div className={styles.operationFields}>
          {(operation.type === "recode-missing"
            || operation.type === "trim-text"
            || operation.type === "coerce-number") ? (
            <label className={styles.wideField}>
              <span>Frozen or derived variables</span>
              <VariableChecklist
                available={availableColumns}
                onChange={(variableNames) => onChange({ ...operation, variableNames })}
                selected={operation.variableNames}
              />
            </label>
          ) : null}
          {operation.type === "recode-missing" ? (
            <label>
              <span>Exact missing literals</span>
              <input
                onChange={(event) => onChange({
                  ...operation,
                  missingValues: event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .slice(0, 20),
                })}
                placeholder="NA, N/A, Prefer not to answer"
                value={operation.missingValues.join(", ")}
              />
            </label>
          ) : null}
          {operation.type === "reverse-score" ? (
            <>
              <label>
                <span>Source variable</span>
                <select
                  onChange={(event) => onChange({
                    ...operation,
                    sourceVariable: event.target.value,
                  })}
                  value={operation.sourceVariable}
                >
                  {availableColumns.map((name) => <option key={name}>{name}</option>)}
                </select>
              </label>
              <label>
                <span>New derived variable</span>
                <input
                  onChange={(event) => onChange({
                    ...operation,
                    targetVariable: event.target.value,
                  })}
                  value={operation.targetVariable}
                />
              </label>
              <label>
                <span>Scale minimum</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => onChange({
                    ...operation,
                    minimum: Number(event.target.value),
                  })}
                  type="number"
                  value={operation.minimum}
                />
              </label>
              <label>
                <span>Scale maximum</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => onChange({
                    ...operation,
                    maximum: Number(event.target.value),
                  })}
                  type="number"
                  value={operation.maximum}
                />
              </label>
            </>
          ) : null}
          {operation.type === "composite-score" ? (
            <>
              <label className={styles.wideField}>
                <span>Source variables</span>
                <VariableChecklist
                  available={availableColumns}
                  onChange={(sourceVariables) => onChange({
                    ...operation,
                    sourceVariables,
                    minimumValid: Math.min(operation.minimumValid, sourceVariables.length),
                  })}
                  selected={operation.sourceVariables}
                />
              </label>
              <label>
                <span>New derived variable</span>
                <input
                  onChange={(event) => onChange({
                    ...operation,
                    targetVariable: event.target.value,
                  })}
                  value={operation.targetVariable}
                />
              </label>
              <label>
                <span>Method</span>
                <select
                  onChange={(event) => onChange({
                    ...operation,
                    method: event.target.value as "mean" | "sum",
                  })}
                  value={operation.method}
                >
                  <option value="mean">Mean of valid values</option>
                  <option value="sum">Sum of valid values</option>
                </select>
              </label>
              <label>
                <span>Minimum valid inputs</span>
                <input
                  max={operation.sourceVariables.length}
                  min={1}
                  onChange={(event) => onChange({
                    ...operation,
                    minimumValid: Number(event.target.value),
                  })}
                  type="number"
                  value={operation.minimumValid}
                />
              </label>
            </>
          ) : null}
          {operation.type === "summarize-trial-accuracy" ? (
            <>
              <label>
                <span>New derived variable</span>
                <input
                  onChange={(event) => onChange({
                    ...operation,
                    targetVariable: event.target.value,
                  })}
                  value={operation.targetVariable}
                />
              </label>
              <label>
                <span>Minimum scored trials</span>
                <input
                  min={1}
                  onChange={(event) => onChange({
                    ...operation,
                    minimumScoredTrials: Number(event.target.value),
                  })}
                  type="number"
                  value={operation.minimumScoredTrials}
                />
              </label>
              <label className={styles.checkField}>
                <input
                  checked={operation.includePractice}
                  onChange={(event) => onChange({
                    ...operation,
                    includePractice: event.target.checked,
                  })}
                  type="checkbox"
                />
                <span>Include practice trials</span>
              </label>
            </>
          ) : null}
          {operation.type === "summarize-reaction-time" ? (
            <>
              <label>
                <span>New derived variable</span>
                <input
                  onChange={(event) => onChange({
                    ...operation,
                    targetVariable: event.target.value,
                  })}
                  value={operation.targetVariable}
                />
              </label>
              <label>
                <span>Summary method</span>
                <select
                  onChange={(event) => onChange({
                    ...operation,
                    method: event.target.value as "mean" | "median",
                  })}
                  value={operation.method}
                >
                  <option value="median">Median</option>
                  <option value="mean">Mean</option>
                </select>
              </label>
              <label>
                <span>Minimum RT (ms, inclusive)</span>
                <input
                  min={0}
                  onChange={(event) => onChange({
                    ...operation,
                    minimumMilliseconds: Number(event.target.value),
                  })}
                  type="number"
                  value={operation.minimumMilliseconds}
                />
              </label>
              <label>
                <span>Maximum RT (ms, inclusive)</span>
                <input
                  max={3_600_000}
                  min={0}
                  onChange={(event) => onChange({
                    ...operation,
                    maximumMilliseconds: Number(event.target.value),
                  })}
                  type="number"
                  value={operation.maximumMilliseconds}
                />
              </label>
              <label>
                <span>Minimum eligible trials</span>
                <input
                  min={1}
                  onChange={(event) => onChange({
                    ...operation,
                    minimumValidTrials: Number(event.target.value),
                  })}
                  type="number"
                  value={operation.minimumValidTrials}
                />
              </label>
              <label className={styles.checkField}>
                <input
                  checked={operation.correctOnly}
                  onChange={(event) => onChange({
                    ...operation,
                    correctOnly: event.target.checked,
                  })}
                  type="checkbox"
                />
                <span>Correct trials only</span>
              </label>
              <label className={styles.checkField}>
                <input
                  checked={operation.excludeDeadlineExceeded}
                  onChange={(event) => onChange({
                    ...operation,
                    excludeDeadlineExceeded: event.target.checked,
                  })}
                  type="checkbox"
                />
                <span>Exclude deadline-exceeded trials</span>
              </label>
              <label className={styles.checkField}>
                <input
                  checked={operation.includePractice}
                  onChange={(event) => onChange({
                    ...operation,
                    includePractice: event.target.checked,
                  })}
                  type="checkbox"
                />
                <span>Include practice trials</span>
              </label>
            </>
          ) : null}
          {operation.type === "exclude-record" ? (
            <>
              <label>
                <span>Variable</span>
                <select
                  onChange={(event) => onChange({
                    ...operation,
                    sourceVariable: event.target.value,
                  })}
                  value={operation.sourceVariable}
                >
                  {availableColumns.map((name) => <option key={name}>{name}</option>)}
                </select>
              </label>
              <label>
                <span>Comparison</span>
                <select
                  onChange={(event) => onChange({
                    ...operation,
                    comparator: event.target.value as PreparationComparison,
                  })}
                  value={operation.comparator}
                >
                  {COMPARISONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              {operation.comparator !== "is-missing" ? (
                <label>
                  <span>Exact comparison value</span>
                  <input
                    onChange={(event) => onChange({
                      ...operation,
                      comparisonValue: event.target.value,
                    })}
                    value={operation.comparisonValue}
                  />
                </label>
              ) : null}
            </>
          ) : null}
          <label className={styles.rationaleField}>
            <span>Rationale <strong>Required</strong></span>
            <textarea
              maxLength={1_000}
              onChange={(event) => updateBase({ rationale: event.target.value })}
              placeholder="Connect this decision to the analysis plan, protocol, audit finding, or documented amendment."
              rows={2}
              value={operation.rationale}
            />
          </label>
        </div>
      </div>
    </article>
  );
}

function GateItem({ complete, label }: { complete: boolean; label: string }) {
  return (
    <li className={complete ? styles.gateComplete : styles.gateIncomplete}>
      <span><AppIcon name={complete ? "check-square" : "alert"} /></span>
      {label}
    </li>
  );
}

export default function DataPreparationWorkspace({
  projectId,
  projectName,
}: DataPreparationWorkspaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const memorySource = useRef<MemorySource | null>(null);
  const preparedPackage = useRef<DataPreparationPackage | null>(null);
  const [releases, setReleases] = useState<ExperimentRelease[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [audit, setAudit] = useState<DataIntakeAuditReceipt | null>(null);
  const [document, setDocument] = useState<DataPreparationDocument | null>(null);
  const [draftOperations, setDraftOperations] = useState<PreparationOperation[]>([]);
  const [newOperationType, setNewOperationType] =
    useState<PreparationOperationType>("recode-missing");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [sourceLoaded, setSourceLoaded] = useState(false);
  const [draftValid, setDraftValid] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedRelease = useMemo(
    () => releases.find((release) => release.releaseId === selectedReleaseId)
      ?? releases[0]
      ?? null,
    [releases, selectedReleaseId],
  );

  const sourceColumns = useMemo(() => selectedRelease ? [
    ...PREPARATION_META_COLUMNS,
    ...collectExperimentVariables(selectedRelease.studio).map((variable) => variable.name),
  ] : [], [selectedRelease]);

  const columnsBeforeOperation = useMemo(() => {
    const columns = [...sourceColumns];
    return draftOperations.map((operation) => {
      const available = [...columns];
      if (
        operation.type === "reverse-score"
        || operation.type === "composite-score"
        || operation.type === "summarize-trial-accuracy"
        || operation.type === "summarize-reaction-time"
      ) columns.push(operation.targetVariable);
      return [...new Set(available)];
    });
  }, [draftOperations, sourceColumns]);

  const refreshLocalState = useCallback((release: ExperimentRelease | null) => {
    memorySource.current = null;
    preparedPackage.current = null;
    setSourceLoaded(false);
    setError("");
    setNotice("");
    if (!release) {
      setAudit(null);
      setDocument(null);
      setDraftOperations([]);
      return;
    }
    const receipt = readDataIntakeAuditReceipt(window.localStorage, release);
    setAudit(receipt);
    if (!receipt || !isDataIntakeAuditReady(receipt)) {
      setDocument(null);
      setDraftOperations([]);
      return;
    }
    const stored = readDataPreparationDocument(window.localStorage, release, receipt)
      ?? createDataPreparationDocument(release, receipt);
    setDocument(stored);
    setDraftOperations(stored?.operations ?? []);
    setDraftValid(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const candidates = readLocalExperimentReleases(window.localStorage, projectId);
      const local = (await verifiedExperimentReleases(candidates, projectId))
        .filter(supportsPreparation);
      let merged = local;
      try {
        merged = mergeReleases(await fetchExperimentReleases(projectId), local);
      } catch {
        // Verified local releases keep preparation available while cloud state is offline.
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
    refreshLocalState(selectedRelease);
  }, [refreshLocalState, selectedRelease]);

  const persistOperations = (next: PreparationOperation[]) => {
    setDraftOperations(next);
    preparedPackage.current = null;
    setNotice("");
    if (!selectedRelease || !audit || !document) return;
    const valid = Boolean(normalizePreparationOperations(next, selectedRelease));
    setDraftValid(valid);
    if (!valid) return;
    try {
      const updated = updateDataPreparationOperations(
        document,
        next,
        selectedRelease,
        audit,
      );
      const saved = writeDataPreparationDocument(
        window.localStorage,
        selectedRelease,
        audit,
        updated,
      );
      setDocument(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The operation log could not be saved.");
    }
  };

  const updateOperation = (index: number, next: PreparationOperation) => {
    persistOperations(draftOperations.map((item, itemIndex) => (
      itemIndex === index ? next : item
    )));
  };

  const moveOperation = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= draftOperations.length) return;
    const next = [...draftOperations];
    [next[index], next[destination]] = [next[destination], next[index]];
    persistOperations(next);
  };

  const addOperation = () => {
    if (!selectedRelease) return;
    if (
      newOperationType === "composite-score"
      && collectExperimentVariables(selectedRelease.studio).length < 2
    ) {
      setError("A composite needs at least two frozen response variables.");
      return;
    }
    setError("");
    const created = createPreparationOperation(
      newOperationType,
      draftOperations.length + 1,
      selectedRelease,
    );
    if (
      created.type === "reverse-score"
      || created.type === "composite-score"
      || created.type === "summarize-trial-accuracy"
      || created.type === "summarize-reaction-time"
    ) {
      created.targetVariable = `${created.targetVariable}_${draftOperations.length + 1}`;
    }
    persistOperations([...draftOperations, created]);
  };

  const runPreparation = async (source: MemorySource) => {
    if (!selectedRelease || !audit || !document) return;
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      const current = updateDataPreparationOperations(
        document,
        draftOperations,
        selectedRelease,
        audit,
      );
      const result = await buildDataPreparationPackage({
        production: source.production,
        sourceFiles: source.sourceFiles,
        release: selectedRelease,
        auditReceipt: audit,
        document: current,
      });
      const saved = writeDataPreparationDocument(
        window.localStorage,
        selectedRelease,
        audit,
        result.document,
      );
      memorySource.current = source;
      preparedPackage.current = result.package;
      setDocument(saved);
      setSourceLoaded(true);
      setDraftValid(true);
      setNotice(
        "Derived data prepared locally. Raw rows remain only in this tab's memory and were not persisted or uploaded.",
      );
    } catch (cause) {
      memorySource.current = null;
      preparedPackage.current = null;
      setSourceLoaded(false);
      setError(cause instanceof Error ? cause.message : "The source could not be prepared.");
    } finally {
      setProcessing(false);
    }
  };

  const handleFolder = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    event.target.value = "";
    if (!files || files.length === 0) return;
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      const parsed = await parseExportFolder(files);
      const source: MemorySource = {
        production: parsed.production.value,
        sourceFiles: REQUIRED_FILES.map(({ role }) => parsed[role].source),
      };
      await runPreparation(source);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The export folder could not be read.");
      setProcessing(false);
    }
  };

  const confirmReview = () => {
    if (!document || !selectedRelease || !audit || !preparedPackage.current) return;
    try {
      const reviewed = markDataPreparationReviewed(document, selectedRelease, audit);
      const saved = writeDataPreparationDocument(
        window.localStorage,
        selectedRelease,
        audit,
        reviewed,
      );
      setDocument(saved);
      setNotice("Aggregate impact and operation provenance review confirmed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review could not be confirmed.");
    }
  };

  const exportPackage = () => {
    if (!document || !selectedRelease || !audit || !preparedPackage.current) return;
    try {
      const exportedAt = new Date().toISOString();
      const exported = markDataPreparationExported(
        document,
        selectedRelease,
        audit,
        exportedAt,
      );
      const saved = writeDataPreparationDocument(
        window.localStorage,
        selectedRelease,
        audit,
        exported,
      );
      downloadJson(
        `${safeExportName(projectName)}-prepared-data-v${selectedRelease.releaseNumber}.json`,
        {
          exportType: "cerise-derived-data-package",
          exportBoundary:
            "Potentially identifying local research data. Store only in an approved location.",
          exportedAt,
          package: preparedPackage.current,
        },
      );
      setDocument(saved);
      setNotice("Derived package exported. The raw source was not changed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The package could not be exported.");
    }
  };

  const ready = isDataPreparationReady(document);
  const auditReady = isDataIntakeAuditReady(audit);
  const operationsReady = draftValid
    && draftOperations.every((operation) => !operation.enabled || Boolean(operation.rationale.trim()));
  const run = document?.lastRun ?? null;

  if (loading) {
    return (
      <main className={styles.centeredState}>
        <span className={styles.loadingMark} />
        <strong>Loading reproducible preparation…</strong>
      </main>
    );
  }

  return (
    <main className={styles.preparationApp}>
      <header className={styles.topBar}>
        <Link className={styles.brand} href="/projects">Cerise Scholar</Link>
        <Link className={styles.returnLink} href={`/projects/${projectId}/research-path`}>
          <AppIcon name="arrow-left" />
          Back to Research Path
        </Link>
        <span className={styles.projectTitle}>{projectName}</span>
        <div className={styles.topActions}>
          <span className={styles.localBadge}><AppIcon name="lock" />Local preparation</span>
          <button onClick={() => inputRef.current?.click()} type="button">
            <AppIcon name="folder" />
            Re-select source
          </button>
        </div>
      </header>

      <section className={styles.contextBar}>
        <div>
          <strong>Reproducible Preparation</strong>
          <span>Derived data only · no raw overwrite</span>
        </div>
        <div className={styles.releaseContext}>
          <AppIcon name="shield" />
          <select
            aria-label="Select frozen release"
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
          <p>Freeze a verified format-v5 release before preparing research data.</p>
          <Link href={`/experimental-studio/${projectId}`}>Open Experimental Studio</Link>
        </section>
      ) : !auditReady || !audit ? (
        <section className={styles.emptyRelease}>
          <AppIcon name="shield" />
          <h1>Complete the data-intake audit first</h1>
          <p>
            Phase 8.3 opens only after the release-bound Phase 8.2 receipt has no
            blocking issue and its findings have been reviewed.
          </p>
          <Link href={`/data-intake/${projectId}`}>Open Data Intake &amp; Audit</Link>
        </section>
      ) : (
        <div className={styles.workspace}>
          <aside className={styles.workflowRail}>
            <span className={styles.railLabel}>Preparation workflow</span>
            <ol>
              {[
                ["Verify source", Boolean(run), "Re-select the exact audited export", "shield"],
                ["Define operations", operationsReady, "Use bounded declarative actions", "list"],
                ["Preview impact", Boolean(run), "Review aggregate effects only", "search"],
                ["Review provenance", Boolean(document?.reviewedAt), "Confirm rationale and lineage", "file"],
                ["Export package", Boolean(document?.exportedAt), "Create a derived local package", "save"],
              ].map(([label, complete, description, icon], index) => (
                <li className={complete ? styles.workflowComplete : ""} key={String(label)}>
                  <span className={styles.workflowNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <AppIcon name={icon as "shield" | "list" | "search" | "file" | "save"} />
                  <div><strong>{label}</strong><small>{description}</small></div>
                  <span className={styles.workflowState}>
                    {complete ? <AppIcon name="check-square" /> : null}
                  </span>
                </li>
              ))}
            </ol>
            <div className={styles.railPrinciples}>
              <AppIcon name="lock" />
              <strong>Guiding boundaries</strong>
              <ul>
                <li>Raw rows stay in memory only</li>
                <li>No arbitrary code or formulas</li>
                <li>No automatic outlier deletion</li>
                <li>No imputation or inferential statistics</li>
                <li>No participant data sent to AI</li>
              </ul>
            </div>
          </aside>

          <section className={styles.preparationCanvas}>
            <header className={styles.hero}>
              <p>Phase 8.3 · Reproducible Preparation</p>
              <h1>Prepare a derived dataset without changing the raw source</h1>
              <span>
                Re-select the reviewed Local Research Host export, apply an ordered
                allowlist of deterministic operations, inspect aggregate impact, and
                export a checksummed derived package for Phase 8.4.
              </span>
            </header>

            <section className={styles.sourcePanel}>
              <span className={run ? styles.sourceVerified : styles.sourcePending}>
                <AppIcon name={run ? "check-square" : "folder"} />
              </span>
              <div>
                <strong>{run ? "Audited source re-verified" : "Re-select the audited export folder"}</strong>
                <p>
                  {run
                    ? `Release v${selectedRelease.releaseNumber} · ${run.sourceCompletedRows} completed production record(s) · ${run.sourceNonCompletedRows} non-completed excluded by the fixed input boundary`
                    : "Cerise verifies all five Phase 8.2 checksums before any participant row enters preparation memory."}
                </p>
              </div>
              <button
                disabled={processing || !operationsReady}
                onClick={() => inputRef.current?.click()}
                type="button"
              >
                <AppIcon name={run ? "refresh" : "upload"} />
                {processing ? "Preparing locally…" : run ? "Replace source" : "Choose export folder"}
              </button>
              <input
                {...DIRECTORY_INPUT_PROPS}
                aria-label="Choose the reviewed Local Research Host export folder"
                hidden
                multiple
                onChange={handleFolder}
                ref={inputRef}
                type="file"
              />
            </section>

            {error ? <div className={styles.errorNotice} role="alert"><AppIcon name="alert" />{error}</div> : null}
            {notice ? <div className={styles.successNotice} role="status"><AppIcon name="shield" />{notice}</div> : null}
            {!draftValid ? (
              <div className={styles.errorNotice} role="alert">
                <AppIcon name="alert" />
                Finish the current operation fields before running preparation.
              </div>
            ) : null}

            <section className={styles.operationSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span>Ordered operation log</span>
                  <h2>Reviewable transformations and exclusions</h2>
                </div>
                <div className={styles.addOperation}>
                  <select
                    aria-label="Operation type"
                    onChange={(event) => setNewOperationType(
                      event.target.value as PreparationOperationType,
                    )}
                    value={newOperationType}
                  >
                    {PREPARATION_OPERATION_OPTIONS.map((option) => (
                      <option key={option.type} value={option.type}>{option.label}</option>
                    ))}
                  </select>
                  <button onClick={addOperation} type="button">
                    <AppIcon name="plus" />
                    Add operation
                  </button>
                </div>
              </div>

              {draftOperations.length > 0 ? (
                <div className={styles.operationList}>
                  {draftOperations.map((operation, index) => (
                    <OperationEditor
                      availableColumns={columnsBeforeOperation[index] ?? sourceColumns}
                      index={index}
                      key={operation.id}
                      onChange={(next) => updateOperation(index, next)}
                      onMove={(direction) => moveOperation(index, direction)}
                      onRemove={() => persistOperations(
                        draftOperations.filter((_, itemIndex) => itemIndex !== index),
                      )}
                      operation={operation}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.noOperations}>
                  <AppIcon name="workflow" />
                  <div>
                    <strong>No optional operation is required.</strong>
                    <p>
                      You may export a derived copy with the fixed completed-production
                      boundary only, or add explicit operations above. Cerise never invents
                      a cleaning decision.
                    </p>
                  </div>
                </div>
              )}

              {sourceLoaded ? (
                <button
                  className={styles.rerunButton}
                  disabled={processing || !operationsReady}
                  onClick={() => {
                    if (memorySource.current) void runPreparation(memorySource.current);
                  }}
                  type="button"
                >
                  <AppIcon name="refresh" />
                  Re-run current operation log
                </button>
              ) : null}
            </section>

            <section className={styles.impactSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span>Aggregate impact</span>
                  <h2>No participant-level values are shown</h2>
                </div>
                {run ? <code>{run.packageChecksum.slice(0, 24)}…</code> : null}
              </div>
              {run ? (
                <div className={styles.impactGrid}>
                  <article>
                    <span>Records</span>
                    <strong>{run.inputRows} <em>→</em> {run.outputRows}</strong>
                    <small>{run.excludedRows} excluded by explicit rules</small>
                  </article>
                  <article>
                    <span>Columns</span>
                    <strong>{run.inputColumns} <em>→</em> {run.outputColumns}</strong>
                    <small>{run.outputColumns - run.inputColumns} derived column(s)</small>
                  </article>
                  <article>
                    <span>Missing cells</span>
                    <strong>{run.inputMissingCells} <em>→</em> {run.outputMissingCells}</strong>
                    <small>Across analysis variables only</small>
                  </article>
                  <article>
                    <span>Trial rows</span>
                    <strong>{run.inputTrialRows} <em>→</em> {run.outputTrialRows}</strong>
                    <small>Removed only with excluded sessions</small>
                  </article>
                  <article>
                    <span>Inclusion ledger</span>
                    <strong>{run.sourceCompletedRows} decisions</strong>
                    <small>
                      {run.inclusionLedgerChecksum
                        ? `${run.inclusionLedgerChecksum.slice(0, 18)}…`
                        : "Available in expanded packages"}
                    </small>
                  </article>
                  <article>
                    <span>Behavioral summary</span>
                    <strong>{run.behavioralSummaryRows ?? 0} rows</strong>
                    <small>Attention, focus, accuracy, deadlines, and RT</small>
                  </article>
                </div>
              ) : (
                <div className={styles.emptyImpact}>
                  Re-select the exact audited export to compute bounded aggregate impact.
                </div>
              )}
            </section>
          </section>

          <aside className={styles.gateRail}>
            <span className={styles.gateLabel}>Preparation gate</span>
            <h2>{ready ? "Ready for Phase 8.4" : "Prepare the derived package"}</h2>
            <ul>
              <GateItem complete={auditReady} label="Phase 8.2 audit ready" />
              <GateItem complete={Boolean(run)} label="Source checksums re-verified" />
              <GateItem complete={operationsReady} label="Operations are valid and rationalized" />
              <GateItem complete={Boolean(run)} label="Deterministic operation log executed" />
              <GateItem complete={Boolean(document?.reviewedAt)} label="Aggregate impact reviewed" />
              <GateItem complete={Boolean(document?.exportedAt)} label="Derived package exported" />
            </ul>

            <button
              className={styles.reviewButton}
              disabled={!run || !preparedPackage.current || Boolean(document?.reviewedAt)}
              onClick={confirmReview}
              type="button"
            >
              <AppIcon name="check-square" />
              {document?.reviewedAt ? "Review confirmed" : "Confirm preparation review"}
            </button>
            <button
              className={styles.exportButton}
              disabled={!document?.reviewedAt || !preparedPackage.current}
              onClick={exportPackage}
              type="button"
            >
              <AppIcon name="save" />
              {document?.exportedAt ? "Export derived package again" : "Export derived package"}
            </button>

            <div className={styles.privacyBoundary}>
              <AppIcon name="lock" />
              <div>
                <strong>Raw rows stay in memory only</strong>
                <p>
                  Browser storage keeps operation metadata, checksums, counts, and review
                  events—not participant rows, trial values, ledger session IDs, or media.
                </p>
              </div>
            </div>

            <dl className={styles.provenance}>
              <div><dt>Audit reviewed</dt><dd>{formatDate(audit.reviewedAt)}</dd></div>
              <div><dt>Prepared</dt><dd>{run ? formatDate(run.preparedAt) : "Not yet"}</dd></div>
              <div><dt>Operations</dt><dd>{draftOperations.length} recorded</dd></div>
              <div><dt>Raw mutation</dt><dd>None · derived copy only</dd></div>
            </dl>
          </aside>
        </div>
      )}
    </main>
  );
}
