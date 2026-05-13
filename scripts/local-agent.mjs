import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import {
  AUDIT_LOG_RELATIVE_PATH,
  buildActionPreview,
  buildAuditSchema,
  buildPersistedAuditEvent,
  buildPermissionSchema,
} from "./local-permission-contract.mjs";
import {
  CLEANUP_EXECUTE_APPROVAL_PHRASE,
  CLEANUP_EXECUTABLE_CATEGORY_IDS,
  RETRIEVAL_INDEX_APPROVAL_PHRASE,
  SOURCE_INDEX_APPROVAL_PHRASE,
  VAULT_CREATE_APPROVAL_PHRASE,
  CLEANUP_PREVIEW_CATEGORIES,
  STORAGE_USAGE_LIMITS,
  buildCleanupPreviewContract,
  buildCleanupRunContract,
  buildRetrievalIndexOptions,
  buildRetrievalIndexPreview,
  buildRetrievalIndexStatusContract,
  buildSourceGroundingOptions,
  buildSourceGroundingPreview,
  buildSourceIndexOptions,
  buildSourceIndexPreview,
  buildStorageUsageContract,
  buildInitialConfig,
  buildInitialPermissions,
  buildVaultCreationPreview,
  buildVaultPlan,
  buildVaultTemplate,
  getVaultFolderName,
} from "./local-vault-contract.mjs";
import {
  BLOCKED_OLLAMA_ENDPOINTS,
  buildOllamaSecurityStatus,
  getOllamaListenHosts,
  parsePort,
} from "./local-ollama-security.mjs";

const host = process.env.LOCAL_AGENT_HOST || "127.0.0.1";
const port = Number.parseInt(process.env.LOCAL_AGENT_PORT || "43110", 10);
const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/api").replace(/\/$/, "");
const preferredModel = process.env.OLLAMA_MODEL || "";
const maxRequestBytes = Number.parseInt(process.env.LOCAL_AGENT_MAX_REQUEST_BYTES || "1048576", 10);
const requestTimeoutMs = Number.parseInt(process.env.LOCAL_AGENT_REQUEST_TIMEOUT_MS || "30000", 10);
const allowedOrigins = new Set([
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "https://app.cerisescholar.com",
  "https://thankful-desert-03241fd0f.7.azurestaticapps.net",
  ...(process.env.LOCAL_AGENT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

const COMMON_RETRIEVAL_STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "between",
  "could",
  "does",
  "from",
  "have",
  "into",
  "more",
  "most",
  "only",
  "other",
  "should",
  "source",
  "sources",
  "than",
  "that",
  "their",
  "there",
  "these",
  "this",
  "through",
  "using",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
]);

function createSafeError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  error.safe = true;
  return error;
}

function getVaultPath(projectPath) {
  return path.join(projectPath, getVaultFolderName());
}

function getAuditLogPath(projectPath) {
  return path.join(getVaultPath(projectPath), "audit-log.jsonl");
}

async function appendAuditEvent(projectPath, eventOptions) {
  const vaultPath = getVaultPath(projectPath);
  const auditLogPath = getAuditLogPath(projectPath);
  const relativeAuditPath = toProjectRelativePath(projectPath, auditLogPath);

  if (relativeAuditPath !== AUDIT_LOG_RELATIVE_PATH) {
    throw createSafeError("Audit log path is outside the Cerise Scholar vault.", 500);
  }

  await fs.access(vaultPath);

  const event = buildPersistedAuditEvent(eventOptions);
  await fs.appendFile(auditLogPath, `${JSON.stringify(event)}\n`, {
    encoding: "utf8",
    flag: "a",
  });

  return {
    writtenToAuditLog: true,
    eventId: event.eventId,
    path: AUDIT_LOG_RELATIVE_PATH,
  };
}

function buildAuditResponse(audit) {
  return audit || {
    writtenToAuditLog: false,
    path: AUDIT_LOG_RELATIVE_PATH,
  };
}

function getCorsHeaders(request) {
  const origin = request.headers.origin;
  const safeLocalOrigin =
    origin && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin) ? origin : null;
  const allowedOrigin = allowedOrigins.has(origin) ? origin : safeLocalOrigin;

  return {
    "Access-Control-Allow-Origin": allowedOrigin || "http://127.0.0.1:3000",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function sendJson(request, response, status, body) {
  response.writeHead(status, {
    ...getCorsHeaders(request),
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body, null, 2));
}

function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > maxRequestBytes) {
        reject(new Error("Local-agent request is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Local-agent request body must be valid JSON."));
      }
    });
    request.on("error", reject);
  });
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || requestTimeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error || `Request failed with status ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getModelName(model) {
  return model?.name || model?.model || "";
}

async function getOllamaStatus() {
  const ollamaPort = parsePort(ollamaBaseUrl, 11434);

  try {
    const [versionResult, tagsResult] = await Promise.allSettled([
      fetchJson(`${ollamaBaseUrl}/version`, { method: "GET", timeoutMs: 2500 }),
      fetchJson(`${ollamaBaseUrl}/tags`, { method: "GET", timeoutMs: 2500 }),
    ]);

    if (versionResult.status === "rejected" && tagsResult.status === "rejected") {
      throw versionResult.reason || tagsResult.reason;
    }

    const models =
      tagsResult.status === "fulfilled" && Array.isArray(tagsResult.value?.models)
        ? tagsResult.value.models.map(getModelName).filter(Boolean)
        : [];
    const selectedModel = preferredModel || models[0] || "";
    const version = versionResult.status === "fulfilled" ? versionResult.value?.version || "" : "";
    const listenHosts = await getOllamaListenHosts(ollamaPort);
    const security = buildOllamaSecurityStatus({
      baseUrl: ollamaBaseUrl,
      version,
      listenHosts,
    });

    return {
      connected: true,
      ok: Boolean(selectedModel && security.ok),
      baseUrl: ollamaBaseUrl,
      version,
      selectedModel,
      availableModels: models.slice(0, 20),
      security,
      setupRequired: selectedModel
        ? security.warnings[0] || ""
        : "Install at least one Ollama model before using local AI.",
    };
  } catch (error) {
    return {
      connected: false,
      ok: false,
      baseUrl: ollamaBaseUrl,
      version: "",
      selectedModel: "",
      availableModels: [],
      security: buildOllamaSecurityStatus({
        baseUrl: ollamaBaseUrl,
        version: "",
        listenHosts: [],
      }),
      setupRequired: "Open Ollama on this laptop before using local AI.",
      error: error?.name === "AbortError" ? "Ollama did not respond." : "Ollama is not reachable.",
    };
  }
}

async function buildHealthPayload() {
  const ollama = await getOllamaStatus();
  const localAi = Boolean(ollama.ok && ollama.connected && ollama.selectedModel && ollama.security?.ok);

  return {
    ok: true,
    app: "cerise-scholar-local-agent",
    version: "0.1.0",
    mode: "ollama",
    ollama,
    capabilities: {
      localAi,
      fileRead: true,
      fileWrite: true,
      auditLog: true,
      retrievalIndex: true,
      storageUsage: true,
      cleanupPreview: true,
      cleanupExecution: true,
      commandRun: false,
    },
    safety: {
      ollamaSecurityGate: ollama.security?.ok ? "pass" : "blocked",
      blockedOllamaEndpoints: BLOCKED_OLLAMA_ENDPOINTS,
      trustedPersonalLaptopRequired: true,
      fileReadEnabled: "approval-required",
      fileReadRequiresApproval: true,
      permissionContractVersion: 1,
      fileWriteRequiresApproval: true,
      auditLogEnabled: true,
      cleanupDeletesFiles: false,
      commandRunRequiresApproval: true,
      deletesOriginalFiles: false,
      uploadsToCloud: false,
    },
    storage: {
      localVault: false,
      vaultContractVersion: 1,
      note: "Step 13 local agent can build a local retrieval index, measure vault storage, and preview cleanup. Cleanup deletion remains blocked.",
    },
    checkedAt: new Date().toISOString(),
  };
}

function normalizeMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => ({
      role: ["system", "user", "assistant"].includes(message?.role) ? message.role : "user",
      content: String(message?.content || ""),
    }))
    .filter((message) => message.content.trim());
}

async function callOllamaChat({ messages, jsonMode }) {
  const health = await buildHealthPayload();
  if (!health.capabilities.localAi) {
    const error = new Error(
      health.ollama.setupRequired || health.ollama.security?.warnings?.[0] || "Local AI is not ready."
    );
    error.status = 503;
    error.health = health;
    throw error;
  }

  const payload = {
    model: health.ollama.selectedModel,
    messages,
    stream: false,
    ...(jsonMode ? { format: "json" } : {}),
  };

  const data = await fetchJson(`${ollamaBaseUrl}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return {
    content: data?.message?.content || data?.response || "",
    model: data?.model || health.ollama.selectedModel,
  };
}

function getLastUserMessage(messages) {
  return [...messages].reverse().find((message) => message.role === "user")?.content || "";
}

function extractRetrievalTerms(text, maxQueryChars) {
  return [
    ...new Set(
      String(text || "")
        .toLowerCase()
        .slice(0, maxQueryChars)
        .match(/[a-z0-9][a-z0-9-]{2,}/g) || []
    ),
  ]
    .filter((term) => !COMMON_RETRIEVAL_STOP_WORDS.has(term))
    .slice(0, 40);
}

function normalizeSourceDocuments(rawDocuments, options) {
  return (Array.isArray(rawDocuments) ? rawDocuments : [])
    .map((document) => {
      const relativePath = String(document?.relativePath || "")
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .slice(0, 240);
      const excerpt = String(document?.excerpt || "")
        .replace(/\0/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, options.maxDocumentChars);

      return {
        id: String(document?.id || makeDocumentId(relativePath)).slice(0, 100),
        relativePath,
        extension: String(document?.extension || getSourceExtension(relativePath)).slice(0, 20),
        wordCount: Number.parseInt(document?.wordCount || "0", 10) || 0,
        bytes: Number.parseInt(document?.bytes || "0", 10) || 0,
        excerpt,
      };
    })
    .filter((document) => document.relativePath && document.excerpt);
}

function scoreSourceDocument(document, terms) {
  const haystack = `${document.relativePath} ${document.excerpt}`.toLowerCase();
  if (!terms.length) return document.excerpt.length ? 1 : 0;

  return terms.reduce((score, term) => {
    const matches = haystack.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"));
    return score + (matches?.length || 0);
  }, 0);
}

function selectGroundingDocuments({ documents, query, options }) {
  const terms = extractRetrievalTerms(query, options.maxQueryChars);
  const ranked = documents
    .map((document, index) => ({
      ...document,
      relevanceScore: scoreSourceDocument(document, terms),
      originalIndex: index,
    }))
    .sort((left, right) => {
      if (right.relevanceScore !== left.relevanceScore) return right.relevanceScore - left.relevanceScore;
      return left.originalIndex - right.originalIndex;
    });

  const selected = [];
  let contextChars = 0;

  for (const document of ranked) {
    if (selected.length >= options.maxDocuments) break;
    const numberedExcerpt = `[${selected.length + 1}] ${document.relativePath}\n${document.excerpt}`;
    if (selected.length && contextChars + numberedExcerpt.length > options.maxContextChars) continue;
    if (!selected.length && numberedExcerpt.length > options.maxContextChars) {
      selected.push({
        ...document,
        excerpt: document.excerpt.slice(0, Math.max(0, options.maxContextChars - document.relativePath.length - 10)),
      });
      break;
    }

    selected.push(document);
    contextChars += numberedExcerpt.length;
  }

  return {
    terms,
    selected,
    contextChars,
  };
}

function buildGroundingMessage(selectedDocuments) {
  const sourceBlocks = selectedDocuments
    .map(
      (document, index) =>
        `[${index + 1}] ${document.relativePath}\nWords: ${document.wordCount || "unknown"}\nExcerpt: ${document.excerpt}`
    )
    .join("\n\n");

  return {
    role: "system",
    content: [
      "Approved local source context is available for this answer.",
      "Use these excerpts before general knowledge. Cite local evidence by bracket number and relative path, for example [1: notes.md].",
      "If the excerpts do not contain enough evidence, say the approved local sources are insufficient instead of inventing details.",
      "Do not claim access to files beyond these excerpts.",
      "",
      "Approved local source excerpts:",
      sourceBlocks || "No approved local source excerpts matched the request.",
    ].join("\n"),
  };
}

async function buildSourceGroundingContext(body, messages) {
  const options = buildSourceGroundingOptions(body);
  const providedDocuments = normalizeSourceDocuments(
    body?.documents || body?.sourceIndex?.documents,
    options
  );

  let sourceMode = providedDocuments.length ? "session-index" : "";
  let indexResult = null;
  let persistedIndex = null;
  let documents = providedDocuments;

  if (!documents.length && String(body?.projectPath || "").trim()) {
    const projectPath = await validateProjectDirectory(body?.projectPath);
    persistedIndex = await loadPersistedRetrievalIndex(projectPath, {
      includeChunks: true,
      missingOk: true,
    });

    if (persistedIndex.ready) {
      documents = normalizeSourceDocuments(persistedIndex.chunks, options);
      sourceMode = "persisted-index";
    }
  }

  if (!documents.length) {
    if (body?.approvalPhrase !== SOURCE_INDEX_APPROVAL_PHRASE) {
      throw createSafeError(
        `Build the local retrieval index or type ${SOURCE_INDEX_APPROVAL_PHRASE} to read approved source files for this local AI request.`,
        403
      );
    }

    indexResult = await buildReadOnlySourceIndex(body);
    documents = normalizeSourceDocuments(indexResult.documents, options);
    sourceMode = "project-read";
  }

  const query = String(body?.query || getLastUserMessage(messages)).slice(0, options.maxQueryChars);
  const retrieval = selectGroundingDocuments({ documents, query, options });
  const groundedMessages = [
    ...messages.slice(0, 1),
    buildGroundingMessage(retrieval.selected),
    ...messages.slice(1),
  ];

  return {
    options,
    sourceMode,
    indexResult,
    persistedIndex,
    documents,
    query,
    retrieval,
    groundedMessages,
  };
}

async function handleAiChat(request, response) {
  try {
    const body = await readRequestJson(request);
    const messages = normalizeMessages(body?.messages);

    if (!messages.length) {
      sendJson(request, response, 400, {
        ok: false,
        error: "Messages are required.",
      });
      return;
    }

    const result = await callOllamaChat({
      messages,
      jsonMode: Boolean(body?.jsonMode),
    });

    sendJson(request, response, 200, {
      ok: true,
      provider: "local-agent",
      mode: "ollama",
      model: result.model,
      content: result.content,
      safety: {
        readFiles: false,
        wroteFiles: false,
        ranCommands: false,
        uploadedToCloud: false,
      },
    });
  } catch (error) {
    sendJson(request, response, error.status || 500, {
      ok: false,
      error: error.message || "Local Ollama chat request failed.",
      ...(error.health ? { health: error.health } : {}),
    });
  }
}

async function handleSourceChat(request, response) {
  try {
    const body = await readRequestJson(request);
    const messages = normalizeMessages(body?.messages);
    const preview = buildSourceGroundingPreview(body);

    if (!messages.length) {
      sendJson(request, response, 400, {
        ok: false,
        error: "Messages are required.",
      });
      return;
    }

    const grounding = await buildSourceGroundingContext(body, messages);
    const result = await callOllamaChat({
      messages: grounding.groundedMessages,
      jsonMode: Boolean(body?.jsonMode),
    });
    let audit = null;
    if (String(body?.projectPath || "").trim()) {
      const projectPath = validateProjectPath(body?.projectPath);
      await assertVaultReady(projectPath);
      audit = await appendAuditEvent(projectPath, {
        actionId: "ai.source-chat",
        actionLabel: "Run source-grounded local AI",
        requiredApprovals: [
          grounding.sourceMode === "project-read" ? "fileRead" : "",
          grounding.sourceMode === "persisted-index" ? "generatedFileWrite" : "",
          "generatedFileWrite",
        ].filter(Boolean),
        safety: {
          readsFiles: grounding.sourceMode === "project-read",
          readsSessionIndex: grounding.sourceMode === "session-index",
          readsPersistedRetrievalIndex: grounding.sourceMode === "persisted-index",
          writesGeneratedFiles: true,
          writesOriginalFiles: false,
          runsCommands: false,
          uploadsToCloud: false,
          sentContextToCloud: false,
          echoesFullProjectPath: false,
          persistsIndex: false,
          writesAuditLog: true,
        },
        metadata: {
          sourceMode: grounding.sourceMode,
          model: result.model,
          jsonMode: Boolean(body?.jsonMode),
          availableDocuments: grounding.documents.length,
          retrievedRelativePaths: grounding.retrieval.selected.map((document) => document.relativePath),
          retrievedCount: grounding.retrieval.selected.length,
          contextChars: grounding.retrieval.contextChars,
          indexStats: grounding.indexResult?.stats || null,
          persistedIndex: grounding.persistedIndex?.manifest
            ? {
                indexKind: grounding.persistedIndex.manifest.indexKind,
                generatedAt: grounding.persistedIndex.manifest.generatedAt,
                chunkCount: grounding.persistedIndex.manifest.chunkCount,
                termCount: grounding.persistedIndex.manifest.termCount,
              }
            : null,
        },
      });
    }

    sendJson(request, response, 200, {
      ok: true,
      provider: "local-agent",
      mode: "ollama-source-grounded",
      model: result.model,
      content: result.content,
      projectPathEchoed: false,
      grounding: {
        sourceMode: grounding.sourceMode,
        availableDocuments: grounding.documents.length,
        retrievedSources: grounding.retrieval.selected.map((document, index) => ({
          rank: index + 1,
          relativePath: document.relativePath,
          wordCount: document.wordCount,
          bytes: document.bytes,
          relevanceScore: document.relevanceScore,
        })),
        retrievalTerms: grounding.retrieval.terms,
        contextChars: grounding.retrieval.contextChars,
        indexStats: grounding.indexResult?.stats || null,
        persistedIndex: grounding.sourceMode === "persisted-index",
        persistedIndexManifest:
          grounding.sourceMode === "persisted-index" ? grounding.persistedIndex?.manifest || null : null,
      },
      limits: preview.limits,
      audit: buildAuditResponse(audit),
      safety: {
        readFiles: grounding.sourceMode === "project-read",
        readSessionIndex: grounding.sourceMode === "session-index",
        readPersistedRetrievalIndex: grounding.sourceMode === "persisted-index",
        wroteFiles: Boolean(audit),
        ranCommands: false,
        uploadedToCloud: false,
        sentContextToCloud: false,
        persistedIndex: false,
        projectPathEchoed: false,
        writesAuditLog: Boolean(audit),
      },
    });
  } catch (error) {
    sendJson(request, response, error.status || 500, {
      ok: false,
      action: "ai.source-chat",
      projectPathEchoed: false,
      error: error.safe ? error.message : error.message || "Local source-grounded AI request failed.",
      ...(error.health ? { health: error.health } : {}),
    });
  }
}

async function handleProjectOpen(request, response) {
  try {
    const body = await readRequestJson(request);
    sendJson(request, response, 200, buildVaultPlan(body));
  } catch (error) {
    sendJson(request, response, 400, {
      ok: false,
      error: error.message || "Could not create local vault metadata plan.",
    });
  }
}

function validateProjectPath(rawPath) {
  const projectPath = String(rawPath || "").trim();
  if (!projectPath) {
    throw createSafeError("Project folder path is required.");
  }
  if (projectPath.includes("\0")) {
    throw createSafeError("Project folder path is invalid.");
  }
  if (!path.isAbsolute(projectPath)) {
    throw createSafeError("Project folder path must be absolute.");
  }
  return projectPath;
}

async function validateProjectDirectory(rawPath) {
  const projectPath = validateProjectPath(rawPath);

  let stats;
  try {
    stats = await fs.lstat(projectPath);
  } catch {
    throw createSafeError("Project folder was not found.");
  }

  if (stats.isSymbolicLink()) {
    throw createSafeError("Project folder cannot be a symlink.");
  }
  if (!stats.isDirectory()) {
    throw createSafeError("Project path must point to a folder.");
  }

  return projectPath;
}

async function assertVaultReady(projectPath) {
  try {
    await fs.access(path.join(projectPath, getVaultFolderName(), "config.json"));
    await fs.access(path.join(projectPath, getVaultFolderName(), "permissions.json"));
  } catch {
    throw createSafeError("Create the Cerise Scholar local vault before indexing sources.", 409);
  }
}

function toProjectRelativePath(projectPath, candidatePath) {
  const relativePath = path.relative(projectPath, candidatePath);
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return "";
  }
  return relativePath.split(path.sep).join("/");
}

function toVaultRelativePath(projectPath, candidatePath) {
  const relativePath = toProjectRelativePath(projectPath, candidatePath);
  return relativePath.startsWith(`${getVaultFolderName()}/`) || relativePath === getVaultFolderName()
    ? relativePath
    : "";
}

function getRetrievalIndexPath(projectPath) {
  return path.join(getVaultPath(projectPath), "vector-index");
}

function getRetrievalIndexFilePaths(projectPath) {
  const indexPath = getRetrievalIndexPath(projectPath);
  return {
    indexPath,
    manifestPath: path.join(indexPath, "manifest.json"),
    chunksPath: path.join(indexPath, "chunks.json"),
    termsPath: path.join(indexPath, "terms.json"),
  };
}

function assertRetrievalIndexRelativePath(projectPath, filePath) {
  const relativePath = toVaultRelativePath(projectPath, filePath);
  if (!relativePath.startsWith(`${getVaultFolderName()}/vector-index/`)) {
    throw createSafeError("Retrieval index path is outside the Cerise Scholar vault.", 500);
  }
  return relativePath;
}

async function ensureRetrievalIndexDirectory(projectPath) {
  const { indexPath } = getRetrievalIndexFilePaths(projectPath);
  const relativePath = toVaultRelativePath(projectPath, indexPath);
  if (relativePath !== `${getVaultFolderName()}/vector-index`) {
    throw createSafeError("Retrieval index folder is outside the Cerise Scholar vault.", 500);
  }

  try {
    const stats = await fs.lstat(indexPath);
    if (stats.isSymbolicLink()) {
      throw createSafeError("Retrieval index folder cannot be a symlink.", 409);
    }
    if (!stats.isDirectory()) {
      throw createSafeError("Retrieval index path must be a folder.", 409);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await fs.mkdir(indexPath, { recursive: false });
  }

  return indexPath;
}

async function writeGeneratedRetrievalJson(projectPath, filePath, value) {
  const relativePath = assertRetrievalIndexRelativePath(projectPath, filePath);

  try {
    const stats = await fs.lstat(filePath);
    if (stats.isSymbolicLink()) {
      throw createSafeError(`Generated retrieval file cannot be a symlink: ${relativePath}`, 409);
    }
    if (!stats.isFile()) {
      throw createSafeError(`Generated retrieval path must be a file: ${relativePath}`, 409);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  const stats = await fs.stat(filePath);

  return {
    relativePath,
    bytes: stats.size,
    status: "written",
  };
}

async function readGeneratedRetrievalJson(projectPath, filePath, maxBytes = 8 * 1024 * 1024) {
  assertRetrievalIndexRelativePath(projectPath, filePath);

  const stats = await fs.lstat(filePath);
  if (stats.isSymbolicLink()) {
    throw createSafeError("Generated retrieval index file cannot be a symlink.", 409);
  }
  if (!stats.isFile()) {
    throw createSafeError("Generated retrieval index path must be a file.", 409);
  }
  if (stats.size > maxBytes) {
    throw createSafeError("Generated retrieval index file is larger than the local safety limit.", 413);
  }

  const raw = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    throw createSafeError("Generated retrieval index JSON is invalid. Rebuild the retrieval index.", 409);
  }
}

function createUsageBucket(id, label) {
  return {
    id,
    label,
    bytes: 0,
    files: 0,
    directories: 0,
  };
}

function getStorageBucketId(relativePath) {
  if (relativePath === ".cerise-scholar/config.json") return "config";
  if (relativePath === ".cerise-scholar/permissions.json") return "permissions";
  if (relativePath === AUDIT_LOG_RELATIVE_PATH) return "audit";
  if (relativePath === ".cerise-scholar/memory.sqlite") return "memory";
  if (relativePath.startsWith(".cerise-scholar/vector-index/")) return "vector-index";
  if (relativePath.startsWith(".cerise-scholar/cache/")) return "cache";
  if (relativePath.startsWith(".cerise-scholar/temp/")) return "temp";
  return "other";
}

function buildStorageBuckets() {
  return {
    config: createUsageBucket("config", "Config"),
    permissions: createUsageBucket("permissions", "Permissions"),
    audit: createUsageBucket("audit", "Audit Log"),
    memory: createUsageBucket("memory", "Project Memory"),
    "vector-index": createUsageBucket("vector-index", "Retrieval Indexes"),
    cache: createUsageBucket("cache", "Cache"),
    temp: createUsageBucket("temp", "Temporary Files"),
    other: createUsageBucket("other", "Other Vault Files"),
  };
}

function pushLargestFile(files, file, limit = STORAGE_USAGE_LIMITS.largestFiles) {
  files.push(file);
  files.sort((left, right) => right.bytes - left.bytes);
  files.splice(limit);
}

function recordSkipped(state, relativePath, reason) {
  state.filesSkipped += 1;
  if (state.skipped.length >= state.options.maxSkippedEntries) return;
  state.skipped.push({ relativePath: relativePath || "[project-root]", reason });
}

function shouldSkipDirectory(name, options) {
  return name.startsWith(".") || options.skippedDirectories.includes(name);
}

function getSourceExtension(fileName) {
  return path.extname(fileName).toLowerCase();
}

function isAllowedSourceFile(fileName, options) {
  return options.allowedExtensions.includes(getSourceExtension(fileName));
}

function makeDocumentId(relativePath) {
  const id = relativePath
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return id || "source";
}

function countTextWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countTextLines(text) {
  if (!text) return 0;
  return text.split(/\r\n|\r|\n/).length;
}

function buildTextExcerpt(text, maxChars) {
  return text
    .replace(/\0/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

async function indexSourceFile({ filePath, relativePath, stats, state }) {
  if (state.documents.length >= state.options.maxFiles) {
    state.limitReached = true;
    recordSkipped(state, relativePath, "file-count-limit");
    return;
  }

  if (!isAllowedSourceFile(relativePath, state.options)) {
    recordSkipped(state, relativePath, "extension-not-allowed");
    return;
  }

  if (stats.size > state.options.maxFileBytes) {
    recordSkipped(state, relativePath, "file-too-large");
    return;
  }

  if (state.bytesRead + stats.size > state.options.maxTotalBytes) {
    state.limitReached = true;
    recordSkipped(state, relativePath, "total-byte-limit");
    return;
  }

  let text;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch {
    recordSkipped(state, relativePath, "read-failed");
    return;
  }

  if (text.includes("\0")) {
    recordSkipped(state, relativePath, "binary-like-content");
    return;
  }

  const bytesRead = Buffer.byteLength(text, "utf8");
  state.bytesRead += bytesRead;
  state.documents.push({
    id: makeDocumentId(relativePath),
    relativePath,
    extension: getSourceExtension(relativePath),
    bytes: stats.size,
    bytesRead,
    wordCount: countTextWords(text),
    lineCount: countTextLines(text),
    excerpt: buildTextExcerpt(text, state.options.excerptChars),
  });
}

async function walkSourceDirectory({ projectPath, currentPath, depth, state }) {
  if (state.documents.length >= state.options.maxFiles || state.bytesRead >= state.options.maxTotalBytes) {
    state.limitReached = true;
    return;
  }

  let entries;
  try {
    entries = await fs.readdir(currentPath, { withFileTypes: true });
  } catch {
    recordSkipped(state, toProjectRelativePath(projectPath, currentPath), "directory-read-failed");
    return;
  }

  state.directoriesScanned += 1;

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (state.documents.length >= state.options.maxFiles || state.bytesRead >= state.options.maxTotalBytes) {
      state.limitReached = true;
      break;
    }

    const candidatePath = path.join(currentPath, entry.name);
    const relativePath = toProjectRelativePath(projectPath, candidatePath);
    if (!relativePath) continue;

    if (entry.isSymbolicLink()) {
      recordSkipped(state, relativePath, "symlink-skipped");
      continue;
    }

    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name, state.options)) {
        recordSkipped(state, relativePath, "directory-skipped");
        continue;
      }
      if (depth >= state.options.maxDepth) {
        recordSkipped(state, relativePath, "depth-limit");
        continue;
      }
      await walkSourceDirectory({
        projectPath,
        currentPath: candidatePath,
        depth: depth + 1,
        state,
      });
      continue;
    }

    if (!entry.isFile()) {
      recordSkipped(state, relativePath, "not-a-file");
      continue;
    }

    state.filesScanned += 1;

    let stats;
    try {
      stats = await fs.lstat(candidatePath);
    } catch {
      recordSkipped(state, relativePath, "stat-failed");
      continue;
    }

    if (stats.isSymbolicLink()) {
      recordSkipped(state, relativePath, "symlink-skipped");
      continue;
    }
    if (!stats.isFile()) {
      recordSkipped(state, relativePath, "not-a-file");
      continue;
    }

    await indexSourceFile({
      filePath: candidatePath,
      relativePath,
      stats,
      state,
    });
  }
}

async function buildReadOnlySourceIndex(body) {
  const projectPath = await validateProjectDirectory(body?.projectPath);
  await assertVaultReady(projectPath);

  const options = buildSourceIndexOptions(body);
  const state = {
    options,
    documents: [],
    skipped: [],
    filesScanned: 0,
    filesSkipped: 0,
    directoriesScanned: 0,
    bytesRead: 0,
    limitReached: false,
  };

  await walkSourceDirectory({
    projectPath,
    currentPath: projectPath,
    depth: 0,
    state,
  });

  return {
    ok: true,
    action: "projects.index",
    mode: "read-only-memory-index",
    indexedAt: new Date().toISOString(),
    projectPathEchoed: false,
    vaultRequired: true,
    vaultReady: true,
    persistedIndex: false,
    documents: state.documents,
    skipped: state.skipped,
    stats: {
      directoriesScanned: state.directoriesScanned,
      filesScanned: state.filesScanned,
      filesIndexed: state.documents.length,
      filesSkipped: state.filesSkipped,
      bytesRead: state.bytesRead,
      maxDepth: options.maxDepth,
      maxFiles: options.maxFiles,
      maxFileBytes: options.maxFileBytes,
      maxTotalBytes: options.maxTotalBytes,
      limitReached: state.limitReached,
    },
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
    },
  };
}

function tokenizeIndexedText(text, maxTermLength) {
  return (
    String(text || "")
      .toLowerCase()
      .match(/[a-z0-9][a-z0-9-]{2,}/g) || []
  )
    .map((term) => term.slice(0, maxTermLength))
    .filter((term) => term.length >= 3 && !COMMON_RETRIEVAL_STOP_WORDS.has(term));
}

function buildChunkTerms(text, options) {
  const counts = new Map();

  for (const term of tokenizeIndexedText(text, options.maxTermLength)) {
    counts.set(term, (counts.get(term) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    })
    .slice(0, options.maxTermsPerChunk)
    .map(([term, count]) => ({ term, count }));
}

function buildPersistedRetrievalIndex(indexResult, options) {
  const generatedAt = new Date().toISOString();
  const sourceDocuments = Array.isArray(indexResult.documents) ? indexResult.documents : [];
  const chunks = sourceDocuments.slice(0, options.maxChunks).map((document, index) => {
    const excerpt = buildTextExcerpt(document.excerpt || "", options.maxChunkChars);
    const terms = buildChunkTerms(`${document.relativePath} ${excerpt}`, options);

    return {
      id: `chunk-${String(index + 1).padStart(4, "0")}-${document.id || makeDocumentId(document.relativePath)}`,
      relativePath: document.relativePath,
      extension: document.extension || getSourceExtension(document.relativePath),
      sourceDocumentId: document.id || makeDocumentId(document.relativePath),
      bytes: document.bytes || 0,
      wordCount: document.wordCount || 0,
      lineCount: document.lineCount || 0,
      charCount: excerpt.length,
      excerpt,
      terms,
    };
  });

  const termMap = new Map();
  for (const chunk of chunks) {
    for (const item of chunk.terms) {
      const current = termMap.get(item.term) || {
        term: item.term,
        totalCount: 0,
        chunkCount: 0,
        chunkIds: [],
      };
      current.totalCount += item.count;
      current.chunkCount += 1;
      if (current.chunkIds.length < 30) current.chunkIds.push(chunk.id);
      termMap.set(item.term, current);
    }
  }

  const terms = [...termMap.values()].sort((left, right) => {
    if (right.totalCount !== left.totalCount) return right.totalCount - left.totalCount;
    return left.term.localeCompare(right.term);
  });

  const manifest = {
    schemaVersion: 1,
    app: "cerise-scholar",
    indexKind: "lexical-retrieval-v1",
    generatedAt,
    mode: "local-only-generated-index",
    source: {
      mode: "approved-local-files",
      filesIndexed: indexResult.stats?.filesIndexed || sourceDocuments.length,
      bytesRead: indexResult.stats?.bytesRead || 0,
    },
    chunkCount: chunks.length,
    termCount: terms.length,
    files: chunks.map((chunk) => chunk.relativePath),
    limits: {
      maxFiles: options.source.maxFiles,
      maxFileBytes: options.source.maxFileBytes,
      maxTotalBytes: options.source.maxTotalBytes,
      maxChunks: options.maxChunks,
      maxChunkChars: options.maxChunkChars,
      maxTermsPerChunk: options.maxTermsPerChunk,
    },
    sourceIndexStats: indexResult.stats,
    safety: {
      localOnly: true,
      storesSourceExcerpts: true,
      storesFullProjectPath: false,
      runsCommands: false,
      uploadsToCloud: false,
      modifiesOriginalFiles: false,
      generatedInsideVault: true,
    },
  };

  return {
    manifest,
    chunksFile: {
      schemaVersion: 1,
      app: "cerise-scholar",
      indexKind: manifest.indexKind,
      generatedAt,
      chunks,
    },
    termsFile: {
      schemaVersion: 1,
      app: "cerise-scholar",
      indexKind: manifest.indexKind,
      generatedAt,
      terms,
    },
  };
}

function sanitizeRetrievalIndexManifest(manifest) {
  if (!manifest || typeof manifest !== "object") return null;

  return {
    schemaVersion: manifest.schemaVersion === 1 ? 1 : manifest.schemaVersion,
    app: manifest.app === "cerise-scholar" ? "cerise-scholar" : "",
    indexKind: String(manifest.indexKind || "").slice(0, 80),
    generatedAt: String(manifest.generatedAt || "").slice(0, 40),
    mode: String(manifest.mode || "").slice(0, 80),
    source: {
      mode: String(manifest.source?.mode || "").slice(0, 80),
      filesIndexed: Number.parseInt(manifest.source?.filesIndexed || "0", 10) || 0,
      bytesRead: Number.parseInt(manifest.source?.bytesRead || "0", 10) || 0,
    },
    chunkCount: Number.parseInt(manifest.chunkCount || "0", 10) || 0,
    termCount: Number.parseInt(manifest.termCount || "0", 10) || 0,
    files: Array.isArray(manifest.files)
      ? manifest.files.map((item) => String(item || "").slice(0, 240)).filter(Boolean).slice(0, 50)
      : [],
    limits: {
      maxFiles: Number.parseInt(manifest.limits?.maxFiles || "0", 10) || 0,
      maxFileBytes: Number.parseInt(manifest.limits?.maxFileBytes || "0", 10) || 0,
      maxTotalBytes: Number.parseInt(manifest.limits?.maxTotalBytes || "0", 10) || 0,
      maxChunks: Number.parseInt(manifest.limits?.maxChunks || "0", 10) || 0,
      maxChunkChars: Number.parseInt(manifest.limits?.maxChunkChars || "0", 10) || 0,
      maxTermsPerChunk: Number.parseInt(manifest.limits?.maxTermsPerChunk || "0", 10) || 0,
    },
    safety: {
      localOnly: Boolean(manifest.safety?.localOnly),
      storesSourceExcerpts: Boolean(manifest.safety?.storesSourceExcerpts),
      storesFullProjectPath: false,
      runsCommands: false,
      uploadsToCloud: false,
      modifiesOriginalFiles: false,
      generatedInsideVault: true,
    },
  };
}

function assertValidRetrievalManifest(manifest) {
  if (!manifest || manifest.schemaVersion !== 1 || manifest.app !== "cerise-scholar") {
    throw createSafeError("Generated retrieval index manifest is not a Cerise Scholar index.", 409);
  }
  if (manifest.indexKind !== "lexical-retrieval-v1") {
    throw createSafeError("Generated retrieval index kind is unsupported. Rebuild the retrieval index.", 409);
  }
}

async function writePersistedRetrievalIndex(projectPath, persistedIndex) {
  await ensureRetrievalIndexDirectory(projectPath);

  const { manifestPath, chunksPath, termsPath } = getRetrievalIndexFilePaths(projectPath);
  const written = [];
  written.push(await writeGeneratedRetrievalJson(projectPath, manifestPath, persistedIndex.manifest));
  written.push(await writeGeneratedRetrievalJson(projectPath, chunksPath, persistedIndex.chunksFile));
  written.push(await writeGeneratedRetrievalJson(projectPath, termsPath, persistedIndex.termsFile));

  return {
    written,
    bytesWritten: written.reduce((total, item) => total + item.bytes, 0),
  };
}

async function loadPersistedRetrievalIndex(projectPath, { includeChunks = false, missingOk = false } = {}) {
  await assertVaultReady(projectPath);

  const { manifestPath, chunksPath } = getRetrievalIndexFilePaths(projectPath);
  let rawManifest;
  try {
    rawManifest = await readGeneratedRetrievalJson(projectPath, manifestPath);
  } catch (error) {
    if (error?.code === "ENOENT" && missingOk) {
      return {
        ready: false,
        reason: "not-built",
        manifest: null,
        chunks: [],
      };
    }
    throw error;
  }

  assertValidRetrievalManifest(rawManifest);
  const manifest = sanitizeRetrievalIndexManifest(rawManifest);

  if (!includeChunks) {
    return {
      ready: true,
      reason: "",
      manifest,
      chunks: [],
    };
  }

  let rawChunksFile;
  try {
    rawChunksFile = await readGeneratedRetrievalJson(projectPath, chunksPath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw createSafeError("Generated retrieval index is incomplete. Rebuild the retrieval index.", 409);
    }
    throw error;
  }

  const chunks = Array.isArray(rawChunksFile?.chunks) ? rawChunksFile.chunks : [];
  if (manifest.chunkCount && !chunks.length) {
    throw createSafeError("Generated retrieval index has no readable chunks. Rebuild the retrieval index.", 409);
  }

  return {
    ready: true,
    reason: "",
    manifest,
    chunks,
  };
}

async function buildRetrievalIndexStatus(body) {
  const projectPath = await validateProjectDirectory(body?.projectPath);
  await assertVaultReady(projectPath);
  const contract = buildRetrievalIndexStatusContract(body);
  const persisted = await loadPersistedRetrievalIndex(projectPath, { missingOk: true });

  return {
    ...contract,
    ready: persisted.ready,
    reason: persisted.reason,
    manifest: persisted.manifest,
    audit: buildAuditResponse(null),
  };
}

async function walkVaultStorage({ projectPath, currentPath, state }) {
  if (state.entriesScanned >= STORAGE_USAGE_LIMITS.maxEntries) {
    state.truncated = true;
    return;
  }

  let entries;
  try {
    entries = await fs.readdir(currentPath, { withFileTypes: true });
  } catch {
    state.skipped.push({
      relativePath: toVaultRelativePath(projectPath, currentPath) || getVaultFolderName(),
      reason: "directory-read-failed",
    });
    return;
  }

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (state.entriesScanned >= STORAGE_USAGE_LIMITS.maxEntries) {
      state.truncated = true;
      break;
    }

    const candidatePath = path.join(currentPath, entry.name);
    const relativePath = toVaultRelativePath(projectPath, candidatePath);
    if (!relativePath) continue;

    state.entriesScanned += 1;

    if (entry.isSymbolicLink()) {
      state.symlinksSkipped += 1;
      state.skipped.push({ relativePath, reason: "symlink-skipped" });
      continue;
    }

    let stats;
    try {
      stats = await fs.lstat(candidatePath);
    } catch {
      state.skipped.push({ relativePath, reason: "stat-failed" });
      continue;
    }

    const bucketId = getStorageBucketId(relativePath);
    const bucket = state.buckets[bucketId] || state.buckets.other;

    if (stats.isDirectory()) {
      state.directories += 1;
      bucket.directories += 1;
      await walkVaultStorage({ projectPath, currentPath: candidatePath, state });
      continue;
    }

    if (!stats.isFile()) {
      state.skipped.push({ relativePath, reason: "not-a-file" });
      continue;
    }

    state.files += 1;
    state.totalBytes += stats.size;
    bucket.files += 1;
    bucket.bytes += stats.size;
    pushLargestFile(state.largestFiles, {
      relativePath,
      bytes: stats.size,
      category: bucketId,
    });
  }
}

async function buildVaultStorageUsage(body) {
  const projectPath = await validateProjectDirectory(body?.projectPath);
  await assertVaultReady(projectPath);

  const vaultPath = getVaultPath(projectPath);
  const state = {
    checkedAt: new Date().toISOString(),
    totalBytes: 0,
    files: 0,
    directories: 0,
    entriesScanned: 0,
    symlinksSkipped: 0,
    truncated: false,
    skipped: [],
    largestFiles: [],
    buckets: buildStorageBuckets(),
  };

  await walkVaultStorage({ projectPath, currentPath: vaultPath, state });

  return {
    ok: true,
    action: "storage.usage",
    mode: "vault-metadata-only",
    checkedAt: state.checkedAt,
    projectPathEchoed: false,
    vaultPath: `${getVaultFolderName()}/`,
    totalBytes: state.totalBytes,
    files: state.files,
    directories: state.directories,
    entriesScanned: state.entriesScanned,
    symlinksSkipped: state.symlinksSkipped,
    truncated: state.truncated,
    categories: Object.values(state.buckets).filter(
      (bucket) => bucket.bytes || bucket.files || bucket.directories
    ),
    largestFiles: state.largestFiles,
    skipped: state.skipped.slice(0, 50),
    audit: buildAuditResponse(null),
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
    },
  };
}

function getCategoryBytes(usage, paths) {
  const prefixes = paths.map((item) => item.replace(/\/$/, ""));
  return (usage.categories || [])
    .filter((bucket) =>
      prefixes.some((prefix) => {
        if (prefix === ".cerise-scholar/cache") return bucket.id === "cache";
        if (prefix === ".cerise-scholar/temp") return bucket.id === "temp";
        if (prefix === ".cerise-scholar/vector-index") return bucket.id === "vector-index";
        if (prefix === ".cerise-scholar/memory.sqlite") return bucket.id === "memory";
        return false;
      })
    )
    .reduce((total, bucket) => total + bucket.bytes, 0);
}

function buildCleanupPlanFromUsage(usage) {
  const categories = CLEANUP_PREVIEW_CATEGORIES.map((category) => ({
    ...category,
    estimatedBytes: getCategoryBytes(usage, category.paths),
    willDeleteNow: false,
  }));

  return {
    ok: true,
    action: "storage.cleanup-preview",
    mode: "preview-only",
    projectPathEchoed: false,
    deletionEnabled: false,
    estimatedReclaimableBytes: categories
      .filter((category) => category.action !== "ask-before-deleting")
      .reduce((total, category) => total + category.estimatedBytes, 0),
    categories,
    neverDeleteAutomatically: buildCleanupPreviewContract().neverDeleteAutomatically,
    usage,
    audit: buildAuditResponse(null),
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
    },
  };
}

function getCleanupCategory(categoryId) {
  return CLEANUP_PREVIEW_CATEGORIES.find((category) => category.id === categoryId) || null;
}

function normalizeCleanupCategoryIds(rawIds) {
  const ids = Array.isArray(rawIds)
    ? rawIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  const selected = ids.length ? ids : CLEANUP_EXECUTABLE_CATEGORY_IDS;

  return [...new Set(selected)].filter((id) => CLEANUP_EXECUTABLE_CATEGORY_IDS.includes(id));
}

function getCleanupTarget(projectPath, rawRelativePath) {
  const relativePath = String(rawRelativePath || "")
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
  const allowedTargets = new Set([
    `${getVaultFolderName()}/cache`,
    `${getVaultFolderName()}/temp`,
    `${getVaultFolderName()}/vector-index`,
  ]);

  if (!allowedTargets.has(relativePath)) {
    throw createSafeError(`Cleanup target is not allowed: ${relativePath || "[empty]"}`, 400);
  }

  const absolutePath = path.join(projectPath, ...relativePath.split("/"));
  const verifiedRelativePath = toProjectRelativePath(projectPath, absolutePath);
  if (verifiedRelativePath !== relativePath) {
    throw createSafeError("Cleanup target is outside the selected project vault.", 500);
  }

  return {
    relativePath,
    absolutePath,
  };
}

function recordCleanupSkipped(state, relativePath, reason) {
  state.skippedCount += 1;
  if (state.skipped.length >= 60) return;
  state.skipped.push({
    relativePath,
    reason,
  });
}

function pushDeletedRelativePath(state, relativePath) {
  if (state.deletedRelativePaths.length >= 60) return;
  state.deletedRelativePaths.push(relativePath);
}

async function deleteGeneratedTree({ projectPath, currentPath, rootRelativePath, state }) {
  if (state.entriesScanned >= STORAGE_USAGE_LIMITS.maxEntries) {
    state.truncated = true;
    recordCleanupSkipped(state, rootRelativePath, "entry-limit");
    return;
  }

  let stats;
  try {
    stats = await fs.lstat(currentPath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      state.missingCount += 1;
      return;
    }
    recordCleanupSkipped(state, rootRelativePath, "stat-failed");
    return;
  }

  const relativePath = toProjectRelativePath(projectPath, currentPath);
  if (!relativePath || (relativePath !== rootRelativePath && !relativePath.startsWith(`${rootRelativePath}/`))) {
    throw createSafeError("Cleanup attempted to leave the approved generated-data folder.", 500);
  }

  state.entriesScanned += 1;

  if (stats.isSymbolicLink()) {
    state.symlinksSkipped += 1;
    recordCleanupSkipped(state, relativePath, "symlink-skipped");
    return;
  }

  if (stats.isDirectory()) {
    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      recordCleanupSkipped(state, relativePath, "directory-read-failed");
      return;
    }

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      await deleteGeneratedTree({
        projectPath,
        currentPath: path.join(currentPath, entry.name),
        rootRelativePath,
        state,
      });
    }

    try {
      await fs.rmdir(currentPath);
      state.directoriesDeleted += 1;
      pushDeletedRelativePath(state, relativePath);
    } catch (error) {
      if (error?.code === "ENOTEMPTY") {
        recordCleanupSkipped(state, relativePath, "directory-not-empty");
        return;
      }
      if (error?.code === "ENOENT") return;
      recordCleanupSkipped(state, relativePath, "directory-delete-failed");
    }
    return;
  }

  if (!stats.isFile()) {
    recordCleanupSkipped(state, relativePath, "not-a-file");
    return;
  }

  try {
    await fs.unlink(currentPath);
    state.filesDeleted += 1;
    state.bytesDeleted += stats.size;
    pushDeletedRelativePath(state, relativePath);
  } catch {
    recordCleanupSkipped(state, relativePath, "file-delete-failed");
  }
}

async function cleanupGeneratedCategory({ projectPath, category }) {
  const state = {
    categoryId: category.id,
    label: category.label,
    paths: category.paths,
    entriesScanned: 0,
    filesDeleted: 0,
    directoriesDeleted: 0,
    bytesDeleted: 0,
    missingCount: 0,
    skippedCount: 0,
    symlinksSkipped: 0,
    truncated: false,
    deletedRelativePaths: [],
    skipped: [],
  };

  for (const rawPath of category.paths) {
    const target = getCleanupTarget(projectPath, rawPath);
    await deleteGeneratedTree({
      projectPath,
      currentPath: target.absolutePath,
      rootRelativePath: target.relativePath,
      state,
    });
  }

  return state;
}

async function runGeneratedCleanup(body) {
  const projectPath = await validateProjectDirectory(body?.projectPath);
  await assertVaultReady(projectPath);

  const beforeUsage = await buildVaultStorageUsage(body);
  const contract = buildCleanupRunContract(body);
  const selectedCategoryIds = normalizeCleanupCategoryIds(body?.categoryIds);
  if (!selectedCategoryIds.length) {
    throw createSafeError("Select at least one generated cleanup category.", 400);
  }

  const selectedCategories = selectedCategoryIds.map(getCleanupCategory).filter(Boolean);
  const deleted = [];

  for (const category of selectedCategories) {
    deleted.push(await cleanupGeneratedCategory({ projectPath, category }));
  }

  const afterUsage = await buildVaultStorageUsage(body);
  const estimatedBytesBefore = selectedCategories.reduce(
    (total, category) => total + getCategoryBytes(beforeUsage, category.paths),
    0
  );
  const bytesDeleted = deleted.reduce((total, category) => total + category.bytesDeleted, 0);

  return {
    ok: true,
    action: "storage.cleanup",
    mode: "generated-data-cleanup",
    cleanedAt: new Date().toISOString(),
    projectPathEchoed: false,
    approvalPhraseAccepted: true,
    deletionEnabled: true,
    selectedCategoryIds,
    blockedCategoryIds: contract.blockedCategoryIds,
    plannedDeletes: contract.plannedDeletes,
    estimatedBytesBefore,
    bytesDeleted,
    beforeTotalBytes: beforeUsage.totalBytes,
    afterTotalBytes: afterUsage.totalBytes,
    deleted,
    afterUsage,
    audit: buildAuditResponse(null),
    safety: {
      readsVaultMetadata: true,
      readsOriginalFiles: false,
      readsFileContents: false,
      writesGeneratedFiles: true,
      writesOriginalFiles: false,
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
    },
  };
}

async function writeJsonIfMissing(filePath, value) {
  try {
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    return "created";
  } catch (error) {
    if (error?.code === "EEXIST") {
      return "exists";
    }
    throw error;
  }
}

async function handleVaultCreate(request, response) {
  try {
    const body = await readRequestJson(request);
    const preview = buildVaultCreationPreview(body);

    if (body?.approvalPhrase !== VAULT_CREATE_APPROVAL_PHRASE) {
      sendJson(request, response, 403, {
        ok: false,
        error: `Type ${VAULT_CREATE_APPROVAL_PHRASE} to create the local Cerise Scholar vault.`,
        preview,
      });
      return;
    }

    const projectPath = validateProjectPath(body?.projectPath);
    const vaultPath = path.join(projectPath, getVaultFolderName());
    const now = new Date().toISOString();

    let directoryStatus = "created";
    try {
      await fs.mkdir(vaultPath, { recursive: false });
    } catch (error) {
      if (error?.code === "EEXIST") {
        directoryStatus = "exists";
      } else {
        throw error;
      }
    }

    const configStatus = await writeJsonIfMissing(
      path.join(vaultPath, "config.json"),
      buildInitialConfig({ ...body, now })
    );
    const permissionsStatus = await writeJsonIfMissing(
      path.join(vaultPath, "permissions.json"),
      buildInitialPermissions({ ...body, now })
    );
    const audit = await appendAuditEvent(projectPath, {
      actionId: "projects.create-vault",
      actionLabel: "Create Cerise Scholar local vault",
      requiredApprovals: ["folderSelection", "generatedFileWrite"],
      safety: {
        readsFiles: false,
        writesGeneratedFiles: true,
        writesOriginalFiles: false,
        createsDirectories: true,
        runsCommands: false,
        uploadsToCloud: false,
        echoesFullProjectPath: false,
        writesAuditLog: true,
      },
      metadata: {
        created: [
          { path: ".cerise-scholar/", status: directoryStatus },
          { path: ".cerise-scholar/config.json", status: configStatus },
          { path: ".cerise-scholar/permissions.json", status: permissionsStatus },
        ],
        skippedUntilLater: preview.skippedUntilLater,
      },
      timestamp: now,
    });

    sendJson(request, response, 200, {
      ok: true,
      action: "projects.create-vault",
      mode: "created",
      projectPathEchoed: false,
      vaultReady: true,
      created: [
        { path: ".cerise-scholar/", status: directoryStatus },
        { path: ".cerise-scholar/config.json", status: configStatus },
        { path: ".cerise-scholar/permissions.json", status: permissionsStatus },
      ],
      skippedUntilLater: preview.skippedUntilLater,
      audit,
      safety: {
        readsFiles: false,
        writesFiles: true,
        createsDirectories: true,
        runsCommands: false,
        uploadsToCloud: false,
        echoesFullProjectPath: false,
        overwritesExistingFiles: false,
        deletesFiles: false,
        writesAuditLog: true,
      },
    });
  } catch (error) {
    sendJson(request, response, error.status || 400, {
      ok: false,
      error: error.safe ? error.message : "Could not create Cerise Scholar local vault.",
    });
  }
}

async function handleProjectIndex(request, response) {
  try {
    const body = await readRequestJson(request);
    const preview = buildSourceIndexPreview(body);

    if (body?.approvalPhrase !== SOURCE_INDEX_APPROVAL_PHRASE) {
      sendJson(request, response, 403, {
        ok: false,
        error: `Type ${SOURCE_INDEX_APPROVAL_PHRASE} to read and index approved source files.`,
        preview,
      });
      return;
    }

    const projectPath = validateProjectPath(body?.projectPath);
    const result = await buildReadOnlySourceIndex(body);
    const audit = await appendAuditEvent(projectPath, {
      actionId: "projects.index",
      actionLabel: "Read approved source index",
      requiredApprovals: ["fileRead", "generatedFileWrite"],
      safety: {
        readsFiles: true,
        writesGeneratedFiles: true,
        writesOriginalFiles: false,
        createsDirectories: false,
        runsCommands: false,
        uploadsToCloud: false,
        echoesFullProjectPath: false,
        followsSymlinks: false,
        readsHiddenDirectories: false,
        readsVaultInternals: false,
        persistsIndex: false,
        writesAuditLog: true,
      },
      metadata: {
        stats: result.stats,
        indexedRelativePaths: result.documents.map((document) => document.relativePath),
        skipped: result.skipped.map((item) => ({
          relativePath: item.relativePath,
          reason: item.reason,
        })),
      },
      timestamp: result.indexedAt,
    });

    sendJson(request, response, 200, {
      ...result,
      approvalPhraseAccepted: true,
      limits: preview.limits,
      allowedExtensions: preview.allowedExtensions,
      audit,
      safety: {
        ...result.safety,
        writesFiles: true,
        writesAuditLog: true,
      },
    });
  } catch (error) {
    sendJson(request, response, error.status || 400, {
      ok: false,
      action: "projects.index",
      projectPathEchoed: false,
      error: error.safe ? error.message : "Could not build the read-only local source index.",
    });
  }
}

async function handleBuildRetrievalIndex(request, response) {
  try {
    const body = await readRequestJson(request);
    const preview = buildRetrievalIndexPreview(body);

    if (body?.approvalPhrase !== RETRIEVAL_INDEX_APPROVAL_PHRASE) {
      sendJson(request, response, 403, {
        ok: false,
        error: `Type ${RETRIEVAL_INDEX_APPROVAL_PHRASE} to build the local retrieval index.`,
        preview,
      });
      return;
    }

    const projectPath = validateProjectPath(body?.projectPath);
    const options = buildRetrievalIndexOptions(body);
    const indexResult = await buildReadOnlySourceIndex(body);
    const persistedIndex = buildPersistedRetrievalIndex(indexResult, options);
    const writeResult = await writePersistedRetrievalIndex(projectPath, persistedIndex);
    const manifest = sanitizeRetrievalIndexManifest(persistedIndex.manifest);
    const audit = await appendAuditEvent(projectPath, {
      actionId: "projects.build-retrieval-index",
      actionLabel: "Build local retrieval index",
      requiredApprovals: ["fileRead", "generatedFileWrite"],
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
        writesAuditLog: true,
      },
      metadata: {
        indexKind: manifest.indexKind,
        generatedAt: manifest.generatedAt,
        chunkCount: manifest.chunkCount,
        termCount: manifest.termCount,
        filesIndexed: manifest.source.filesIndexed,
        bytesRead: manifest.source.bytesRead,
        bytesWritten: writeResult.bytesWritten,
        writtenRelativePaths: writeResult.written.map((item) => item.relativePath),
        indexedRelativePaths: manifest.files,
        skipped: indexResult.skipped.map((item) => ({
          relativePath: item.relativePath,
          reason: item.reason,
        })),
        sourceIndexStats: indexResult.stats,
      },
      timestamp: manifest.generatedAt,
    });

    sendJson(request, response, 200, {
      ok: true,
      action: "projects.build-retrieval-index",
      mode: "local-only-generated-index",
      approvalPhraseAccepted: true,
      projectPathEchoed: false,
      indexFolder: `${getVaultFolderName()}/vector-index/`,
      manifest,
      written: writeResult.written,
      bytesWritten: writeResult.bytesWritten,
      sourceIndexStats: indexResult.stats,
      skipped: indexResult.skipped,
      audit,
      safety: {
        ...preview.safety,
        writesFiles: true,
        writesAuditLog: true,
      },
    });
  } catch (error) {
    sendJson(request, response, error.status || 400, {
      ok: false,
      action: "projects.build-retrieval-index",
      projectPathEchoed: false,
      error: error.safe ? error.message : "Could not build the local retrieval index.",
    });
  }
}

async function handleRetrievalIndexStatus(request, response) {
  try {
    const body = await readRequestJson(request);
    const status = await buildRetrievalIndexStatus(body);
    sendJson(request, response, 200, status);
  } catch (error) {
    sendJson(request, response, error.status || 400, {
      ok: false,
      action: "projects.retrieval-index.status",
      projectPathEchoed: false,
      error: error.safe ? error.message : "Could not read the local retrieval index status.",
    });
  }
}

async function handleStorageUsage(request, response, url) {
  try {
    const body =
      request.method === "GET"
        ? { projectPath: url.searchParams.get("projectPath") || "" }
        : await readRequestJson(request);
    const contract = buildStorageUsageContract(body);
    const projectPath = validateProjectPath(body?.projectPath);
    const usage = await buildVaultStorageUsage(body);
    const audit = await appendAuditEvent(projectPath, {
      actionId: "storage.usage",
      actionLabel: "Measure Cerise Scholar vault storage",
      requiredApprovals: ["generatedFileWrite"],
      safety: {
        readsVaultMetadata: true,
        readsOriginalFiles: false,
        readsFileContents: false,
        writesGeneratedFiles: true,
        writesOriginalFiles: false,
        runsCommands: false,
        uploadsToCloud: false,
        deletesFiles: false,
        echoesFullProjectPath: false,
        followsSymlinks: false,
        writesAuditLog: true,
      },
      metadata: {
        totalBytes: usage.totalBytes,
        files: usage.files,
        directories: usage.directories,
        categories: usage.categories.map((category) => ({
          id: category.id,
          bytes: category.bytes,
          files: category.files,
          directories: category.directories,
        })),
        truncated: usage.truncated,
      },
      timestamp: usage.checkedAt,
    });

    sendJson(request, response, 200, {
      ...usage,
      limits: contract.limits,
      audit,
      safety: {
        ...usage.safety,
        writesFiles: true,
        writesAuditLog: true,
        measurementBeforeAuditAppend: true,
      },
    });
  } catch (error) {
    sendJson(request, response, error.status || 400, {
      ok: false,
      action: "storage.usage",
      projectPathEchoed: false,
      error: error.safe ? error.message : "Could not measure Cerise Scholar vault storage.",
    });
  }
}

async function handleCleanupPreview(request, response) {
  try {
    const body = await readRequestJson(request);
    const projectPath = validateProjectPath(body?.projectPath);
    const usage = await buildVaultStorageUsage(body);
    const preview = buildCleanupPlanFromUsage(usage);
    const audit = await appendAuditEvent(projectPath, {
      actionId: "storage.cleanup-preview",
      actionLabel: "Preview Cerise Scholar vault cleanup",
      requiredApprovals: ["generatedFileWrite"],
      safety: {
        readsVaultMetadata: true,
        readsOriginalFiles: false,
        readsFileContents: false,
        writesGeneratedFiles: true,
        writesOriginalFiles: false,
        runsCommands: false,
        uploadsToCloud: false,
        deletesFiles: false,
        echoesFullProjectPath: false,
        previewOnly: true,
        writesAuditLog: true,
      },
      metadata: {
        totalBytes: usage.totalBytes,
        estimatedReclaimableBytes: preview.estimatedReclaimableBytes,
        categories: preview.categories.map((category) => ({
          id: category.id,
          estimatedBytes: category.estimatedBytes,
          action: category.action,
        })),
      },
    });

    sendJson(request, response, 200, {
      ...preview,
      audit,
      safety: {
        ...preview.safety,
        writesFiles: true,
        writesAuditLog: true,
      },
    });
  } catch (error) {
    sendJson(request, response, error.status || 400, {
      ok: false,
      action: "storage.cleanup-preview",
      projectPathEchoed: false,
      error: error.safe ? error.message : "Could not preview Cerise Scholar vault cleanup.",
    });
  }
}

async function handleCleanupRun(request, response) {
  try {
    const body = await readRequestJson(request);
    const contract = buildCleanupRunContract(body);

    if (body?.approvalPhrase !== CLEANUP_EXECUTE_APPROVAL_PHRASE) {
      sendJson(request, response, 403, {
        ok: false,
        error: `Type ${CLEANUP_EXECUTE_APPROVAL_PHRASE} to delete selected generated Cerise Scholar data.`,
        preview: contract,
      });
      return;
    }

    const projectPath = validateProjectPath(body?.projectPath);
    const result = await runGeneratedCleanup(body);
    const audit = await appendAuditEvent(projectPath, {
      actionId: "storage.cleanup",
      actionLabel: "Delete selected generated cleanup data",
      requiredApprovals: ["generatedFileWrite"],
      safety: {
        readsVaultMetadata: true,
        readsOriginalFiles: false,
        readsFileContents: false,
        writesGeneratedFiles: true,
        writesOriginalFiles: false,
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
        writesAuditLog: true,
      },
      metadata: {
        selectedCategoryIds: result.selectedCategoryIds,
        blockedCategoryIds: result.blockedCategoryIds,
        plannedDeletes: result.plannedDeletes,
        estimatedBytesBefore: result.estimatedBytesBefore,
        bytesDeleted: result.bytesDeleted,
        beforeTotalBytes: result.beforeTotalBytes,
        afterTotalBytes: result.afterTotalBytes,
        deleted: result.deleted.map((category) => ({
          categoryId: category.categoryId,
          filesDeleted: category.filesDeleted,
          directoriesDeleted: category.directoriesDeleted,
          bytesDeleted: category.bytesDeleted,
          skippedCount: category.skippedCount,
          symlinksSkipped: category.symlinksSkipped,
          truncated: category.truncated,
          deletedRelativePaths: category.deletedRelativePaths,
          skipped: category.skipped,
        })),
      },
      timestamp: result.cleanedAt,
    });

    sendJson(request, response, 200, {
      ...result,
      audit,
      safety: {
        ...result.safety,
        writesFiles: true,
        writesAuditLog: true,
      },
    });
  } catch (error) {
    sendJson(request, response, error.status || 400, {
      ok: false,
      action: "storage.cleanup",
      projectPathEchoed: false,
      error: error.safe ? error.message : "Could not run generated-data cleanup.",
    });
  }
}

async function handleActionPreview(request, response) {
  try {
    const body = await readRequestJson(request);
    sendJson(request, response, 200, buildActionPreview(body));
  } catch (error) {
    sendJson(request, response, 400, {
      ok: false,
      error: error.message || "Could not create action permission preview.",
    });
  }
}

async function handleActionRun(request, response) {
  try {
    const body = await readRequestJson(request);
    sendJson(request, response, 403, {
      ...buildActionPreview(body),
      ok: false,
      error: "Action execution is blocked in Step 6. Review the permission preview only.",
    });
  } catch (error) {
    sendJson(request, response, 400, {
      ok: false,
      error: error.message || "Could not create blocked action preview.",
    });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, getCorsHeaders(request));
    response.end();
    return;
  }

  if (BLOCKED_OLLAMA_ENDPOINTS.some((blockedPath) => url.pathname === blockedPath || url.pathname.startsWith(`${blockedPath}/`))) {
    sendJson(request, response, 403, {
      ok: false,
      error:
        "Cerise Scholar Local Agent does not proxy model creation, blob upload, or push endpoints. Use only approved local chat/model-readiness flows.",
      blockedEndpoint: url.pathname,
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    const payload = await buildHealthPayload();
    sendJson(request, response, 200, payload);
    return;
  }

  if (request.method === "POST" && url.pathname === "/ai/chat") {
    await handleAiChat(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/ai/source-chat") {
    await handleSourceChat(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/projects/vault-template") {
    sendJson(request, response, 200, {
      ok: true,
      template: buildVaultTemplate(),
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/projects/open") {
    await handleProjectOpen(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/projects/create-vault") {
    await handleVaultCreate(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/projects/index") {
    await handleProjectIndex(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/projects/build-retrieval-index") {
    await handleBuildRetrievalIndex(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/projects/retrieval-index/status") {
    await handleRetrievalIndexStatus(request, response);
    return;
  }

  if ((request.method === "GET" || request.method === "POST") && url.pathname === "/storage/usage") {
    await handleStorageUsage(request, response, url);
    return;
  }

  if (request.method === "POST" && url.pathname === "/storage/cleanup-preview") {
    await handleCleanupPreview(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/storage/cleanup") {
    await handleCleanupRun(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/permissions/schema") {
    sendJson(request, response, 200, buildPermissionSchema());
    return;
  }

  if (request.method === "GET" && url.pathname === "/audit/schema") {
    sendJson(request, response, 200, buildAuditSchema());
    return;
  }

  if (request.method === "POST" && url.pathname === "/actions/preview") {
    await handleActionPreview(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/actions/run") {
    await handleActionRun(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/") {
    sendJson(request, response, 200, {
      ok: true,
      app: "cerise-scholar-local-agent",
      mode: "ollama",
      endpoints: [
        "/health",
        "/ai/chat",
        "/ai/source-chat",
        "/projects/vault-template",
        "/projects/open",
        "/projects/create-vault",
        "/projects/index",
        "/projects/build-retrieval-index",
        "/projects/retrieval-index/status",
        "/storage/usage",
        "/storage/cleanup-preview",
        "/storage/cleanup",
        "/permissions/schema",
        "/audit/schema",
        "/actions/preview",
        "/actions/run",
      ],
    });
    return;
  }

  sendJson(request, response, 404, {
    ok: false,
    error: "Local-agent endpoint not found.",
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Cerise Scholar Local Agent could not start: ${host}:${port} is already in use.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Cerise Scholar Local Agent listening on http://${host}:${port}`);
  console.log(`Ollama base URL: ${ollamaBaseUrl}`);
  console.log(`Model: ${preferredModel || "first installed Ollama model"}`);
});
