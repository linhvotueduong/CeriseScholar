const VAULT_FOLDER = ".cerise-scholar";
const SCHEMA_VERSION = 1;
export const VAULT_CREATE_APPROVAL_PHRASE = "CREATE_CERISE_SCHOLAR_VAULT";
export const SOURCE_INDEX_APPROVAL_PHRASE = "READ_CERISE_SCHOLAR_SOURCES";
export const RETRIEVAL_INDEX_APPROVAL_PHRASE = "BUILD_CERISE_SCHOLAR_RETRIEVAL_INDEX";
export const CLEANUP_EXECUTE_APPROVAL_PHRASE = "CLEAN_CERISE_SCHOLAR_GENERATED_DATA";

export const SOURCE_INDEX_ALLOWED_EXTENSIONS = Object.freeze([
  ".bib",
  ".css",
  ".csv",
  ".html",
  ".js",
  ".json",
  ".jsonl",
  ".jsx",
  ".md",
  ".markdown",
  ".py",
  ".r",
  ".rst",
  ".scss",
  ".tex",
  ".ts",
  ".tsx",
  ".tsv",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);

export const SOURCE_INDEX_SKIPPED_DIRECTORIES = Object.freeze([
  ".cerise-scholar",
  ".git",
  ".next",
  ".vite",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

export const SOURCE_INDEX_LIMITS = Object.freeze({
  maxDepth: 4,
  maxFiles: 50,
  maxFileBytes: 256 * 1024,
  maxTotalBytes: 2 * 1024 * 1024,
  maxSkippedEntries: 60,
  excerptChars: 700,
});

export const SOURCE_GROUNDING_LIMITS = Object.freeze({
  maxDocuments: 8,
  maxContextChars: 6000,
  maxDocumentChars: 900,
  maxQueryChars: 1500,
});

export const RETRIEVAL_INDEX_LIMITS = Object.freeze({
  maxChunks: 200,
  maxChunkChars: 900,
  maxTermsPerChunk: 80,
  maxTermLength: 64,
});

export const STORAGE_USAGE_LIMITS = Object.freeze({
  maxEntries: 2000,
  largestFiles: 12,
});

export const CLEANUP_PREVIEW_CATEGORIES = Object.freeze([
  {
    id: "disposable-cache",
    label: "Disposable Cache",
    paths: [".cerise-scholar/cache/", ".cerise-scholar/temp/"],
    action: "safe-to-delete-after-confirmation",
  },
  {
    id: "retrieval-indexes",
    label: "Retrieval Indexes",
    paths: [".cerise-scholar/vector-index/"],
    action: "safe-to-rebuild-after-confirmation",
  },
  {
    id: "memory",
    label: "Project Memory",
    paths: [".cerise-scholar/memory.sqlite"],
    action: "ask-before-deleting",
  },
]);

export const CLEANUP_EXECUTABLE_CATEGORY_IDS = Object.freeze([
  "disposable-cache",
  "retrieval-indexes",
]);

function sanitizeText(raw, fallback) {
  const value = String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
  return value || fallback;
}

function sanitizeWorkspaceId(raw) {
  const value = String(raw || "").trim();
  return /^[a-zA-Z0-9_-]{6,80}$/.test(value) ? value : "";
}

function hasProjectPath(raw) {
  return Boolean(String(raw || "").trim());
}

function clampInteger(raw, fallback, min, max) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function sanitizeCategoryIds(rawIds) {
  return [
    ...new Set(
      (Array.isArray(rawIds) ? rawIds : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    ),
  ];
}

export function getVaultFolderName() {
  return VAULT_FOLDER;
}

export function buildVaultTemplate(options = {}) {
  const now = options.now || new Date().toISOString();
  const projectName = sanitizeText(options.projectName, "Untitled Cerise Scholar Project");
  const workspaceId = sanitizeWorkspaceId(options.workspaceId);

  return {
    schemaVersion: SCHEMA_VERSION,
    app: "cerise-scholar",
    generatedAt: now,
    mode: "metadata-only",
    project: {
      id: options.projectId || "pending-local-project",
      name: projectName,
      workspaceId,
    },
    vault: {
      folderName: VAULT_FOLDER,
      pathPreview: `[selected project]/${VAULT_FOLDER}`,
      files: [
        {
          path: `${VAULT_FOLDER}/config.json`,
          purpose: "Project identity, schema version, and local workspace settings.",
          status: "planned",
        },
        {
          path: `${VAULT_FOLDER}/permissions.json`,
          purpose: "User-approved read, write, command, and network scopes.",
          status: "planned",
        },
        {
          path: `${VAULT_FOLDER}/memory.sqlite`,
          purpose: "Future local project memory. Not created in Step 5.",
          status: "future",
        },
        {
          path: `${VAULT_FOLDER}/vector-index/`,
          purpose: "Generated local retrieval index. Created only after explicit Step 13 approval.",
          status: "future",
        },
        {
          path: `${VAULT_FOLDER}/cache/`,
          purpose: "Future disposable local cache. Not created in Step 5.",
          status: "future",
        },
        {
          path: `${VAULT_FOLDER}/audit-log.jsonl`,
          purpose: "Future append-only local action log. Not created in Step 5.",
          status: "future",
        },
      ],
    },
    permissions: {
      fileReadApproved: false,
      fileWriteApproved: false,
      commandRunApproved: false,
      networkAccessApproved: false,
      cloudUploadApproved: false,
      deleteOriginalFilesApproved: false,
    },
    safety: {
      readsFiles: false,
      writesFiles: false,
      createsDirectories: false,
      runsCommands: false,
      uploadsToCloud: false,
      echoesFullProjectPath: false,
      note: "Step 5 is a metadata contract only. The local agent does not inspect or change the user's project folder.",
    },
  };
}

export function buildInitialConfig(payload = {}) {
  const template = buildVaultTemplate(payload);
  return {
    schemaVersion: SCHEMA_VERSION,
    app: "cerise-scholar",
    createdAt: template.generatedAt,
    updatedAt: template.generatedAt,
    project: template.project,
    vault: {
      folderName: VAULT_FOLDER,
      createdBy: "cerise-scholar-local-agent",
      mode: "local-first",
    },
    safety: {
      originalFilesManaged: false,
      fileReadsApproved: false,
      fileWritesApproved: false,
      commandRunsApproved: false,
      cloudUploadsApproved: false,
      deleteOriginalFilesApproved: false,
    },
  };
}

export function buildInitialPermissions(payload = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    app: "cerise-scholar",
    createdAt: payload.now || new Date().toISOString(),
    approvals: {
      folderSelection: {
        approved: true,
        approvedAt: payload.now || new Date().toISOString(),
        scope: "selected-project-folder",
      },
      fileRead: { approved: false, scopes: [] },
      generatedFileWrite: {
        approved: true,
        scopes: [VAULT_FOLDER],
        note: "Step 8 only permits creating initial Cerise Scholar vault files.",
      },
      originalFileWrite: { approved: false, scopes: [] },
      commandRun: { approved: false, scopes: [] },
      networkAccess: { approved: false, scopes: [] },
      cloudUpload: { approved: false, scopes: [] },
      deleteOriginalFiles: { approved: false, scopes: [] },
    },
  };
}

export function buildVaultPlan(payload = {}) {
  const template = buildVaultTemplate(payload);
  const projectPathProvided = hasProjectPath(payload.projectPath);

  return {
    ok: true,
    action: "projects.open",
    mode: "metadata-only",
    projectPathProvided,
    projectPathEchoed: false,
    vaultReady: false,
    nextRequiredApproval: "folder-selection",
    template,
    plannedWrites: template.vault.files
      .filter((file) => file.status === "planned")
      .map((file) => file.path),
    futureWrites: template.vault.files
      .filter((file) => file.status === "future")
      .map((file) => file.path),
    safety: template.safety,
  };
}

export function buildVaultCreationPreview(payload = {}) {
  const plan = buildVaultPlan(payload);

  return {
    ...plan,
    action: "projects.create-vault",
    mode: "requires-explicit-approval",
    approvalPhraseRequired: VAULT_CREATE_APPROVAL_PHRASE,
    createsDirectories: true,
    createsFiles: true,
    plannedWrites: [
      `${VAULT_FOLDER}/`,
      `${VAULT_FOLDER}/config.json`,
      `${VAULT_FOLDER}/permissions.json`,
    ],
    skippedUntilLater: [
      `${VAULT_FOLDER}/memory.sqlite`,
      `${VAULT_FOLDER}/vector-index/`,
      `${VAULT_FOLDER}/cache/`,
      `${VAULT_FOLDER}/audit-log.jsonl`,
    ],
    safety: {
      readsFiles: false,
      writesFiles: true,
      createsDirectories: true,
      runsCommands: false,
      uploadsToCloud: false,
      echoesFullProjectPath: false,
      overwritesExistingFiles: false,
      deletesFiles: false,
      note: "Step 8 creates only the Cerise Scholar vault folder and initial metadata files after explicit approval.",
    },
  };
}

export function buildSourceIndexOptions(payload = {}) {
  const limits = payload.limits && typeof payload.limits === "object" ? payload.limits : {};

  return {
    maxDepth: clampInteger(limits.maxDepth, SOURCE_INDEX_LIMITS.maxDepth, 1, SOURCE_INDEX_LIMITS.maxDepth),
    maxFiles: clampInteger(limits.maxFiles, SOURCE_INDEX_LIMITS.maxFiles, 1, SOURCE_INDEX_LIMITS.maxFiles),
    maxFileBytes: clampInteger(
      limits.maxFileBytes,
      SOURCE_INDEX_LIMITS.maxFileBytes,
      1024,
      SOURCE_INDEX_LIMITS.maxFileBytes
    ),
    maxTotalBytes: clampInteger(
      limits.maxTotalBytes,
      SOURCE_INDEX_LIMITS.maxTotalBytes,
      1024,
      SOURCE_INDEX_LIMITS.maxTotalBytes
    ),
    maxSkippedEntries: SOURCE_INDEX_LIMITS.maxSkippedEntries,
    excerptChars: SOURCE_INDEX_LIMITS.excerptChars,
    allowedExtensions: SOURCE_INDEX_ALLOWED_EXTENSIONS,
    skippedDirectories: SOURCE_INDEX_SKIPPED_DIRECTORIES,
  };
}

export function buildSourceIndexPreview(payload = {}) {
  const options = buildSourceIndexOptions(payload);

  return {
    ok: true,
    action: "projects.index",
    mode: "requires-explicit-approval",
    approvalPhraseRequired: SOURCE_INDEX_APPROVAL_PHRASE,
    projectPathProvided: hasProjectPath(payload.projectPath),
    projectPathEchoed: false,
    requiresVault: true,
    readsFiles: true,
    writesFiles: false,
    plannedReads: [
      "Allowed text/source files inside the selected laptop project folder.",
      "Vault metadata existence check at .cerise-scholar/config.json.",
    ],
    plannedWrites: [],
    limits: {
      maxDepth: options.maxDepth,
      maxFiles: options.maxFiles,
      maxFileBytes: options.maxFileBytes,
      maxTotalBytes: options.maxTotalBytes,
    },
    allowedExtensions: options.allowedExtensions,
    skippedDirectories: options.skippedDirectories,
    safety: {
      readsFiles: true,
      writesFiles: false,
      createsDirectories: false,
      runsCommands: false,
      uploadsToCloud: false,
      echoesFullProjectPath: false,
      followsSymlinks: false,
      readsHiddenDirectories: false,
      readsVaultInternals: false,
      persistsIndex: false,
      note: "Step 9 returns an in-memory read-only source index summary after explicit approval. It does not create embeddings, write indexes, or upload project content.",
    },
  };
}

export function buildSourceGroundingOptions(payload = {}) {
  const grounding = payload.grounding && typeof payload.grounding === "object" ? payload.grounding : {};

  return {
    maxDocuments: clampInteger(
      grounding.maxDocuments,
      SOURCE_GROUNDING_LIMITS.maxDocuments,
      1,
      SOURCE_GROUNDING_LIMITS.maxDocuments
    ),
    maxContextChars: clampInteger(
      grounding.maxContextChars,
      SOURCE_GROUNDING_LIMITS.maxContextChars,
      500,
      SOURCE_GROUNDING_LIMITS.maxContextChars
    ),
    maxDocumentChars: clampInteger(
      grounding.maxDocumentChars,
      SOURCE_GROUNDING_LIMITS.maxDocumentChars,
      120,
      SOURCE_GROUNDING_LIMITS.maxDocumentChars
    ),
    maxQueryChars: SOURCE_GROUNDING_LIMITS.maxQueryChars,
  };
}

export function buildSourceGroundingPreview(payload = {}) {
  const options = buildSourceGroundingOptions(payload);
  const providedDocuments = Array.isArray(payload.documents)
    ? payload.documents.length
    : Array.isArray(payload.sourceIndex?.documents)
      ? payload.sourceIndex.documents.length
      : 0;
  const projectPathProvided = hasProjectPath(payload.projectPath);

  return {
    ok: true,
    action: "ai.source-chat",
    mode: "local-source-grounding",
    approvalPhraseRequired: providedDocuments || projectPathProvided ? "" : SOURCE_INDEX_APPROVAL_PHRASE,
    acceptsSessionIndex: true,
    acceptsPersistedRetrievalIndex: true,
    canReadProjectFilesWithApproval: true,
    providedDocuments,
    projectPathProvided,
    projectPathEchoed: false,
    readsFiles: !providedDocuments && !projectPathProvided,
    writesFiles: false,
    usesOllama: true,
    limits: options,
    safety: {
      readsFiles: !providedDocuments && !projectPathProvided,
      readsSessionIndex: Boolean(providedDocuments),
      readsPersistedRetrievalIndex: !providedDocuments && projectPathProvided,
      writesFiles: false,
      createsDirectories: false,
      runsCommands: false,
      uploadsToCloud: false,
      echoesFullProjectPath: false,
      followsSymlinks: false,
      persistsIndex: false,
      sendsContextToCloud: false,
      note: "Source grounding uses session excerpts, a persisted local retrieval index, or an explicitly approved one-time project read. It does not write memory, run commands, or upload project content.",
    },
  };
}

export function buildRetrievalIndexOptions(payload = {}) {
  const retrieval = payload.retrieval && typeof payload.retrieval === "object" ? payload.retrieval : {};

  return {
    source: buildSourceIndexOptions(payload),
    maxChunks: clampInteger(
      retrieval.maxChunks,
      RETRIEVAL_INDEX_LIMITS.maxChunks,
      1,
      RETRIEVAL_INDEX_LIMITS.maxChunks
    ),
    maxChunkChars: clampInteger(
      retrieval.maxChunkChars,
      RETRIEVAL_INDEX_LIMITS.maxChunkChars,
      120,
      RETRIEVAL_INDEX_LIMITS.maxChunkChars
    ),
    maxTermsPerChunk: clampInteger(
      retrieval.maxTermsPerChunk,
      RETRIEVAL_INDEX_LIMITS.maxTermsPerChunk,
      8,
      RETRIEVAL_INDEX_LIMITS.maxTermsPerChunk
    ),
    maxTermLength: clampInteger(
      retrieval.maxTermLength,
      RETRIEVAL_INDEX_LIMITS.maxTermLength,
      16,
      RETRIEVAL_INDEX_LIMITS.maxTermLength
    ),
    indexFolder: `${VAULT_FOLDER}/vector-index/`,
  };
}

export function buildRetrievalIndexPreview(payload = {}) {
  const options = buildRetrievalIndexOptions(payload);

  return {
    ok: true,
    action: "projects.build-retrieval-index",
    mode: "requires-explicit-approval",
    approvalPhraseRequired: RETRIEVAL_INDEX_APPROVAL_PHRASE,
    projectPathProvided: hasProjectPath(payload.projectPath),
    projectPathEchoed: false,
    requiresVault: true,
    readsFiles: true,
    writesFiles: true,
    plannedReads: [
      "Allowed text/source files inside the selected laptop project folder.",
      "Vault metadata existence check at .cerise-scholar/config.json.",
    ],
    plannedWrites: [
      `${VAULT_FOLDER}/vector-index/`,
      `${VAULT_FOLDER}/vector-index/manifest.json`,
      `${VAULT_FOLDER}/vector-index/chunks.json`,
      `${VAULT_FOLDER}/vector-index/terms.json`,
    ],
    limits: {
      maxFiles: options.source.maxFiles,
      maxFileBytes: options.source.maxFileBytes,
      maxTotalBytes: options.source.maxTotalBytes,
      maxChunks: options.maxChunks,
      maxChunkChars: options.maxChunkChars,
      maxTermsPerChunk: options.maxTermsPerChunk,
    },
    allowedExtensions: options.source.allowedExtensions,
    skippedDirectories: options.source.skippedDirectories,
    safety: {
      readsFiles: true,
      writesGeneratedFiles: true,
      writesOriginalFiles: false,
      createsDirectories: true,
      overwritesGeneratedIndex: true,
      runsCommands: false,
      uploadsToCloud: false,
      echoesFullProjectPath: false,
      followsSymlinks: false,
      readsHiddenDirectories: false,
      readsVaultInternals: false,
      persistsIndex: true,
      persistsSourceExcerptsLocally: true,
      sendsContextToCloud: false,
      note: "Step 13 persists generated retrieval chunks and token terms inside `.cerise-scholar/vector-index/` after explicit approval. It remains local-only and can be rebuilt later.",
    },
  };
}

export function buildRetrievalIndexStatusContract(payload = {}) {
  return {
    ok: true,
    action: "projects.retrieval-index.status",
    mode: "vault-generated-index-status",
    projectPathProvided: hasProjectPath(payload.projectPath),
    projectPathEchoed: false,
    vaultPath: `${VAULT_FOLDER}/`,
    indexFolder: `${VAULT_FOLDER}/vector-index/`,
    safety: {
      readsVaultMetadata: true,
      readsOriginalFiles: false,
      readsFileContents: false,
      writesFiles: false,
      createsDirectories: false,
      runsCommands: false,
      uploadsToCloud: false,
      deletesFiles: false,
      echoesFullProjectPath: false,
      followsSymlinks: false,
      note: "Retrieval index status reads generated vault metadata only. It does not inspect original project files.",
    },
  };
}

export function buildStorageUsageContract(payload = {}) {
  return {
    ok: true,
    action: "storage.usage",
    mode: "vault-metadata-only",
    projectPathProvided: hasProjectPath(payload.projectPath),
    projectPathEchoed: false,
    vaultPath: `${VAULT_FOLDER}/`,
    limits: STORAGE_USAGE_LIMITS,
    safety: {
      readsVaultMetadata: true,
      readsOriginalFiles: false,
      readsFileContents: false,
      writesFiles: false,
      createsDirectories: false,
      runsCommands: false,
      uploadsToCloud: false,
      deletesFiles: false,
      echoesFullProjectPath: false,
      followsSymlinks: false,
      note: "Storage usage measures file sizes and paths inside the Cerise Scholar vault only.",
    },
  };
}

export function buildCleanupPreviewContract(payload = {}) {
  return {
    ok: true,
    action: "storage.cleanup-preview",
    mode: "preview-only",
    projectPathProvided: hasProjectPath(payload.projectPath),
    projectPathEchoed: false,
    categories: CLEANUP_PREVIEW_CATEGORIES,
    deletionEnabled: false,
    blockedAction: "storage.cleanup",
    neverDeleteAutomatically: [
      "Original files outside .cerise-scholar/",
      ".cerise-scholar/config.json",
      ".cerise-scholar/permissions.json",
      ".cerise-scholar/audit-log.jsonl",
      "Final papers, exports, bibliographies, and user-created notes unless explicitly selected later.",
    ],
    safety: {
      readsVaultMetadata: true,
      readsOriginalFiles: false,
      readsFileContents: false,
      writesFiles: false,
      createsDirectories: false,
      runsCommands: false,
      uploadsToCloud: false,
      deletesFiles: false,
      echoesFullProjectPath: false,
      previewOnly: true,
      note: "Cleanup preview estimates reclaimable generated data but does not delete anything.",
    },
  };
}

export function buildCleanupRunContract(payload = {}) {
  const requestedCategoryIds = sanitizeCategoryIds(payload.categoryIds);
  const selectedCategoryIds = requestedCategoryIds.length
    ? requestedCategoryIds.filter((id) => CLEANUP_EXECUTABLE_CATEGORY_IDS.includes(id))
    : CLEANUP_EXECUTABLE_CATEGORY_IDS;
  const blockedCategoryIds = requestedCategoryIds.filter(
    (id) => !CLEANUP_EXECUTABLE_CATEGORY_IDS.includes(id)
  );
  const selectedCategories = CLEANUP_PREVIEW_CATEGORIES.filter((category) =>
    selectedCategoryIds.includes(category.id)
  );

  return {
    ok: true,
    action: "storage.cleanup",
    mode: "requires-explicit-cleanup-approval",
    approvalPhraseRequired: CLEANUP_EXECUTE_APPROVAL_PHRASE,
    projectPathProvided: hasProjectPath(payload.projectPath),
    projectPathEchoed: false,
    deletionEnabled: true,
    selectedCategoryIds,
    blockedCategoryIds,
    selectedCategories,
    plannedDeletes: selectedCategories.flatMap((category) => category.paths),
    neverDeleteAutomatically: buildCleanupPreviewContract(payload).neverDeleteAutomatically,
    safety: {
      readsVaultMetadata: true,
      readsOriginalFiles: false,
      readsFileContents: false,
      writesGeneratedFiles: true,
      writesOriginalFiles: false,
      createsDirectories: false,
      runsCommands: false,
      uploadsToCloud: false,
      deletesGeneratedFiles: true,
      deletesOriginalFiles: false,
      deletesConfig: false,
      deletesPermissions: false,
      deletesAuditLog: false,
      deletesMemory: false,
      echoesFullProjectPath: false,
      followsSymlinks: false,
      note: "Cleanup execution deletes only selected generated data inside `.cerise-scholar/` after explicit approval. Original files, config, permissions, audit logs, memory, final papers, and bibliographies are preserved.",
    },
  };
}
