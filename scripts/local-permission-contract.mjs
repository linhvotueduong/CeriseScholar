const SCHEMA_VERSION = 1;
export const AUDIT_LOG_RELATIVE_PATH = ".cerise-scholar/audit-log.jsonl";

const REDACTED_AUDIT_KEYS = new Set([
  "approvalPhrase",
  "content",
  "excerpt",
  "messages",
  "prompt",
  "projectPath",
  "raw",
  "sourceIndex",
  "text",
]);

const PERMISSION_SCOPES = [
  {
    id: "folderSelection",
    label: "Folder Selection",
    risk: "low",
    requiredWhen: "The user links a laptop folder to a Cerise Scholar project.",
    step6Status: "preview-only",
  },
  {
    id: "fileRead",
    label: "Read Project Files",
    risk: "medium",
    requiredWhen: "An action needs to inspect approved source files or folders.",
    step6Status: "blocked-until-user-approval-flow",
  },
  {
    id: "generatedFileWrite",
    label: "Write Cerise Scholar Files",
    risk: "medium",
    requiredWhen: "An action needs to create or update generated files inside `.cerise-scholar/`.",
    step6Status: "blocked-until-user-approval-flow",
  },
  {
    id: "originalFileWrite",
    label: "Modify Original Files",
    risk: "high",
    requiredWhen: "An action would edit user-created files outside `.cerise-scholar/`.",
    step6Status: "blocked-in-mvp",
  },
  {
    id: "commandRun",
    label: "Run Commands",
    risk: "high",
    requiredWhen: "An action would run shell commands or external processes.",
    step6Status: "blocked-in-mvp",
  },
  {
    id: "networkAccess",
    label: "Network Access",
    risk: "high",
    requiredWhen: "An action would call a non-local network service.",
    step6Status: "blocked-unless-explicitly-enabled-later",
  },
  {
    id: "cloudUpload",
    label: "Cloud Upload",
    risk: "high",
    requiredWhen: "An action would send private project content to Cerise Scholar cloud or third-party AI.",
    step6Status: "blocked-by-default",
  },
  {
    id: "deleteOriginalFiles",
    label: "Delete Original Files",
    risk: "critical",
    requiredWhen: "An action would delete user-created files outside `.cerise-scholar/`.",
    step6Status: "blocked-in-mvp",
  },
];

function sanitizeId(raw, fallback) {
  const value = String(raw || "")
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, "-")
    .slice(0, 80);
  return value || fallback;
}

function sanitizeText(raw, fallback, maxLength = 180) {
  const value = String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
  return value || fallback;
}

function toArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function makeAuditEventId() {
  return `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeAuditString(raw, maxLength = 240) {
  return String(raw || "")
    .replace(/\0/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeAuditKey(raw) {
  return String(raw || "")
    .replace(/[^a-zA-Z0-9._:-]/g, "_")
    .slice(0, 80);
}

function sanitizeAuditValue(value, depth = 0) {
  if (depth > 4) return "[depth-limit]";
  if (value == null) return value;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return sanitizeAuditString(value);
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitizeAuditValue(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !REDACTED_AUDIT_KEYS.has(key))
        .map(([key, item]) => [sanitizeAuditKey(key), sanitizeAuditValue(item, depth + 1)])
    );
  }
  return sanitizeAuditString(value);
}

function buildAuditEvent({ action, requiredApprovals, blockedReasons, safety }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    eventId: "preview-only",
    timestamp: new Date().toISOString(),
    mode: "metadata-only",
    action: {
      id: action.id,
      label: action.label,
      projectId: action.projectId,
    },
    requiredApprovals,
    blockedReasons,
    safety,
    persistence: {
      writtenToAuditLog: false,
      futurePath: ".cerise-scholar/audit-log.jsonl",
      note: "Step 6 previews the audit event shape only. It does not write to disk.",
    },
  };
}

export function buildPermissionSchema() {
  return {
    ok: true,
    schemaVersion: SCHEMA_VERSION,
    mode: "metadata-only",
    scopes: PERMISSION_SCOPES,
    defaults: {
      fileReadApproved: false,
      generatedFileWriteApproved: false,
      originalFileWriteApproved: false,
      commandRunApproved: false,
      networkAccessApproved: false,
      cloudUploadApproved: false,
      deleteOriginalFilesApproved: false,
    },
    step6Safety: {
      readsFiles: false,
      writesFiles: false,
      createsDirectories: false,
      runsCommands: false,
      uploadsToCloud: false,
      persistsApprovals: false,
      writesAuditLog: false,
    },
  };
}

export function buildAuditSchema() {
  return {
    ok: true,
    schemaVersion: SCHEMA_VERSION,
    mode: "append-only",
    path: AUDIT_LOG_RELATIVE_PATH,
    fields: [
      "schemaVersion",
      "eventId",
      "timestamp",
      "app",
      "action",
      "requiredApprovals",
      "safety",
      "metadata",
      "redaction",
      "persistence",
    ],
    step11Safety: {
      writesAuditLog: true,
      createsAuditFile: true,
      appendOnly: true,
      rawSourceContentLogged: false,
      promptsLogged: false,
      approvalPhrasesLogged: false,
      fullProjectPathLogged: false,
      note: "Step 11 persists redacted metadata events only inside the Cerise Scholar vault.",
    },
  };
}

export function buildPersistedAuditEvent({
  actionId,
  actionLabel,
  requiredApprovals = [],
  safety = {},
  metadata = {},
  timestamp = new Date().toISOString(),
} = {}) {
  const action = {
    id: sanitizeId(actionId, "unspecified-action"),
    label: sanitizeText(actionLabel || actionId, "Unspecified local action"),
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    eventId: makeAuditEventId(),
    timestamp,
    app: "cerise-scholar",
    action,
    requiredApprovals: unique(requiredApprovals),
    safety: {
      readsFiles: false,
      writesGeneratedFiles: true,
      writesOriginalFiles: false,
      runsCommands: false,
      uploadsToCloud: false,
      echoesFullProjectPath: false,
      logsRawSourceContent: false,
      logsPrompts: false,
      logsApprovalPhrases: false,
      ...sanitizeAuditValue(safety),
    },
    metadata: sanitizeAuditValue(metadata),
    redaction: {
      fullProjectPathLogged: false,
      rawSourceContentLogged: false,
      promptsLogged: false,
      approvalPhrasesLogged: false,
      sourceExcerptsLogged: false,
    },
    persistence: {
      writtenToAuditLog: true,
      path: AUDIT_LOG_RELATIVE_PATH,
      mode: "append-only-jsonl",
    },
  };
}

export function buildActionPreview(payload = {}) {
  const action = {
    id: sanitizeId(payload.action || payload.actionId, "unspecified-action"),
    label: sanitizeText(payload.label || payload.action, "Unspecified local action"),
    projectId: sanitizeId(payload.projectId, "pending-local-project"),
  };
  const readScopes = toArray(payload.readScopes);
  const writeScopes = toArray(payload.writeScopes);
  const writesGeneratedFiles = Boolean(payload.writesGeneratedFiles || writeScopes.length);
  const modifiesOriginalFiles = Boolean(payload.modifiesOriginalFiles);
  const runsCommands = Boolean(payload.runsCommands);
  const networkAccess = Boolean(payload.networkAccess);
  const cloudUpload = Boolean(payload.cloudUpload);
  const deletesOriginalFiles = Boolean(payload.deletesOriginalFiles);
  const usesOllama = Boolean(payload.usesOllama);
  const readsFiles = Boolean(payload.readsFiles || readScopes.length);

  const requiredApprovals = unique([
    readsFiles ? "fileRead" : "",
    writesGeneratedFiles ? "generatedFileWrite" : "",
    modifiesOriginalFiles ? "originalFileWrite" : "",
    runsCommands ? "commandRun" : "",
    networkAccess ? "networkAccess" : "",
    cloudUpload ? "cloudUpload" : "",
    deletesOriginalFiles ? "deleteOriginalFiles" : "",
  ]);

  const blockedReasons = unique([
    "Step 6 is preview-only. The local agent will not execute actions yet.",
    modifiesOriginalFiles ? "Modifying original user files is blocked in MVP." : "",
    runsCommands ? "Command execution is blocked in MVP." : "",
    cloudUpload ? "Cloud upload is blocked by default for private project content." : "",
    deletesOriginalFiles ? "Deleting original user files is blocked in MVP." : "",
  ]);

  const safety = {
    readsFiles: false,
    writesFiles: false,
    createsDirectories: false,
    runsCommands: false,
    uploadsToCloud: false,
    persistsApprovals: false,
    writesAuditLog: false,
    requestedReadsFiles: readsFiles,
    requestedWritesGeneratedFiles: writesGeneratedFiles,
    requestedModifiesOriginalFiles: modifiesOriginalFiles,
    requestedRunsCommands: runsCommands,
    requestedNetworkAccess: networkAccess,
    requestedCloudUpload: cloudUpload,
    requestedDeletesOriginalFiles: deletesOriginalFiles,
    requestedUsesOllama: usesOllama,
  };

  return {
    ok: true,
    schemaVersion: SCHEMA_VERSION,
    mode: "metadata-only",
    action,
    readScopes,
    writeScopes,
    requiredApprovals,
    requiresApproval: requiredApprovals.length > 0,
    canRunNow: false,
    blockedReasons,
    safety,
    auditPreview: buildAuditEvent({ action, requiredApprovals, blockedReasons, safety }),
  };
}
