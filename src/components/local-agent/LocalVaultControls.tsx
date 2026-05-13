"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocalAgentStatus } from "@/hooks/useLocalAgentStatus";
import LaptopRequiredMobileSheet from "@/components/mobile/LaptopRequiredMobileSheet";
import {
  callLocalVaultAction,
  CLEANUP_EXECUTE_APPROVAL_PHRASE,
  LOCAL_AGENT_REQUIRED_MESSAGE,
  RETRIEVAL_INDEX_APPROVAL_PHRASE,
  SOURCE_INDEX_APPROVAL_PHRASE,
  VAULT_CREATE_APPROVAL_PHRASE,
  type LocalVaultAction,
  type LocalVaultActionResult,
} from "@/lib/local-agent/client";

const pathStorageKey = "cerise_local_project_path";

const actions: {
  id: LocalVaultAction;
  label: string;
  phrase?: string;
  intent: string;
  timeoutMs?: number;
}[] = [
  {
    id: "open",
    label: "Preview vault plan",
    intent: "Shows planned local vault files. Does not read, write, or delete files.",
  },
  {
    id: "create-vault",
    label: "Create local vault",
    phrase: VAULT_CREATE_APPROVAL_PHRASE,
    intent: "Creates .cerise-scholar plus initial config and permissions files.",
  },
  {
    id: "index",
    label: "Read source summary",
    phrase: SOURCE_INDEX_APPROVAL_PHRASE,
    intent: "Reads approved source files and returns a local-only summary. No cloud upload.",
    timeoutMs: 45000,
  },
  {
    id: "build-retrieval-index",
    label: "Build retrieval index",
    phrase: RETRIEVAL_INDEX_APPROVAL_PHRASE,
    intent: "Reads approved source files and writes generated index files inside the vault.",
    timeoutMs: 60000,
  },
  {
    id: "storage-usage",
    label: "Measure vault storage",
    intent: "Measures generated vault data. Does not read original file contents.",
  },
  {
    id: "cleanup-preview",
    label: "Preview cleanup",
    intent: "Estimates generated data that could be removed. Deletes nothing.",
  },
  {
    id: "cleanup",
    label: "Delete generated cleanup data",
    phrase: CLEANUP_EXECUTE_APPROVAL_PHRASE,
    intent: "Deletes only generated cleanup-safe vault data after exact approval.",
    timeoutMs: 45000,
  },
];

export default function LocalVaultControls({ compact = false }: { compact?: boolean }) {
  const { ui, mobile, checking } = useLocalAgentStatus();
  const [projectPath, setProjectPath] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(pathStorageKey) || "";
    } catch {
      return "";
    }
  });
  const [approvalPhrases, setApprovalPhrases] = useState<Record<string, string>>({});
  const [busyAction, setBusyAction] = useState<LocalVaultAction | null>(null);
  const [result, setResult] = useState<LocalVaultActionResult | null>(null);
  const [laptopRequiredOpen, setLaptopRequiredOpen] = useState(false);

  useEffect(() => {
    try {
      if (projectPath.trim()) localStorage.setItem(pathStorageKey, projectPath.trim());
    } catch {
      // Ignore localStorage errors. The user can paste the path again.
    }
  }, [projectPath]);

  const disabledReason = useMemo(() => {
    if (checking) return "Checking the laptop Local Agent first.";
    if (mobile) return LOCAL_AGENT_REQUIRED_MESSAGE;
    if (ui.status === "not-connected") return ui.detail;
    if (!projectPath.trim()) return "Paste the laptop project folder path before running a vault action.";
    return "";
  }, [checking, mobile, projectPath, ui.detail, ui.status]);

  async function runAction(action: (typeof actions)[number]) {
    if (disabledReason) {
      if (mobile) {
        setLaptopRequiredOpen(true);
      }
      setResult({ ok: false, error: disabledReason });
      return;
    }

    const approvalPhrase = action.phrase ? approvalPhrases[action.id] || "" : undefined;
    setBusyAction(action.id);
    setResult(null);

    const nextResult = await callLocalVaultAction(
      action.id,
      {
        projectPath: projectPath.trim(),
        approvalPhrase,
      },
      action.timeoutMs
    );

    setResult(nextResult);
    setBusyAction(null);
  }

  return (
    <>
      <section
        aria-label="Cerise Scholar local vault controls"
        style={{
          border: "1px solid #e0d8d0",
          borderRadius: "12px",
          background: "#fff",
          padding: compact ? "10px 14px" : "14px 16px",
        }}
      >
        <details>
          <summary
            style={{
              cursor: "pointer",
              color: "#1a1208",
              fontSize: "13px",
              fontWeight: 800,
            }}
          >
            Local vault controls
          </summary>

          <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
          <label style={{ display: "grid", gap: "5px" }}>
            <span style={{ color: "#7a6a5a", fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}>
              Laptop project folder path
            </span>
            <input
              value={projectPath}
              onChange={(event) => setProjectPath(event.target.value)}
              placeholder="/Users/you/Documents/My Research Project"
              style={{
                width: "100%",
                border: "1px solid #d4cdc5",
                borderRadius: "8px",
                color: "#1a1208",
                fontSize: "12px",
                padding: "9px 10px",
              }}
            />
          </label>

          <div style={{ display: "grid", gap: "10px" }}>
            {actions.map((action) => {
              const disabled = Boolean(disabledReason) || busyAction !== null;
              return (
                <div
                  key={action.id}
                  style={{
                    border: "1px solid #eee6dd",
                    borderRadius: "10px",
                    padding: "10px",
                    display: "grid",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => void runAction(action)}
                      disabled={disabled}
                      style={{
                        border: "1px solid #d4cdc5",
                        borderRadius: "999px",
                        background: disabled ? "#f5f1ea" : "#1a1208",
                        color: disabled ? "#9a8a7a" : "#fff",
                        cursor: disabled ? "default" : "pointer",
                        fontSize: "12px",
                        fontWeight: 800,
                        padding: "8px 12px",
                      }}
                    >
                      {busyAction === action.id ? "Working..." : action.label}
                    </button>
                    <span style={{ color: "#7a6a5a", fontSize: "12px", lineHeight: 1.45 }}>{action.intent}</span>
                  </div>

                  {action.phrase && (
                    <label style={{ display: "grid", gap: "5px" }}>
                      <span style={{ color: "#9a8a7a", fontSize: "11px" }}>
                        Type exact approval phrase: <code>{action.phrase}</code>
                      </span>
                      <input
                        value={approvalPhrases[action.id] || ""}
                        onChange={(event) =>
                          setApprovalPhrases((current) => ({
                            ...current,
                            [action.id]: event.target.value,
                          }))
                        }
                        placeholder={action.phrase}
                        style={{
                          border: "1px solid #d4cdc5",
                          borderRadius: "8px",
                          color: "#1a1208",
                          fontSize: "12px",
                          padding: "8px 10px",
                        }}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          {disabledReason && (
            <p style={{ color: "#9a6a1f", fontSize: "12px", lineHeight: 1.45, margin: 0 }}>
              {disabledReason}
            </p>
          )}

          {result && <VaultResult result={result} />}
          </div>
        </details>
      </section>
      <LaptopRequiredMobileSheet
        open={laptopRequiredOpen}
        onClose={() => setLaptopRequiredOpen(false)}
        title="Use your laptop for local vaults"
        body="Local vault actions read or prepare files inside your project folder, so Cerise Scholar only runs them from a personal or trusted laptop during this beta."
        primaryLabel="I’ll use my laptop"
      />
    </>
  );
}

function VaultResult({ result }: { result: LocalVaultActionResult }) {
  const details = summarizeResult(result);

  return (
    <div
      aria-live="polite"
      style={{
        border: `1px solid ${result.ok ? "#9fbe8a" : "#d8b36f"}`,
        borderRadius: "10px",
        background: result.ok ? "#f1f8ed" : "#fff8e8",
        padding: "10px",
        display: "grid",
        gap: "8px",
      }}
    >
      <strong style={{ color: "#1a1208", fontSize: "13px" }}>
        {result.ok ? "Local Agent response" : "Local Agent needs attention"}
      </strong>
      {result.error && <p style={{ color: "#7a4a22", fontSize: "12px", margin: 0 }}>{result.error}</p>}
      {details.length > 0 && (
        <ul style={{ color: "#5a4a3a", fontSize: "12px", lineHeight: 1.5, margin: 0, paddingLeft: "18px" }}>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function summarizeResult(result: LocalVaultActionResult) {
  const details: string[] = [];

  if (result.action) details.push(`Action: ${result.action}`);
  if (result.mode) details.push(`Mode: ${result.mode}`);
  if (typeof result.totalBytes === "number") details.push(`Vault usage: ${formatBytes(result.totalBytes)}`);
  if (typeof result.estimatedReclaimableBytes === "number") {
    details.push(`Estimated cleanup savings: ${formatBytes(result.estimatedReclaimableBytes)}`);
  }
  if (result.created?.length) {
    details.push(`Created/checked: ${result.created.map((item) => `${item.path} ${item.status || ""}`).join(", ")}`);
  }
  if (result.plannedWrites?.length) details.push(`Planned writes: ${result.plannedWrites.join(", ")}`);
  if (result.plannedReads?.length) details.push(`Planned reads: ${result.plannedReads.join("; ")}`);
  if (result.allowedExtensions?.length) details.push(`Allowed source types: ${result.allowedExtensions.join(", ")}`);
  if (result.manifest?.chunkCount) details.push(`Retrieval chunks: ${String(result.manifest.chunkCount)}`);
  if (result.stats?.filesIndexed) details.push(`Files indexed: ${String(result.stats.filesIndexed)}`);
  if (result.sourceIndexStats?.filesIndexed) {
    details.push(`Files indexed: ${String(result.sourceIndexStats.filesIndexed)}`);
  }
  if (result.audit?.path) {
    details.push(
      result.audit.writtenToAuditLog
        ? `Audit written to ${result.audit.path}`
        : `Audit preview path: ${result.audit.path}`
    );
  }

  return details;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}
