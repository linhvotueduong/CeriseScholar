import http from "node:http";
import {
  buildActionPreview,
  buildAuditSchema,
  buildPermissionSchema,
} from "./local-permission-contract.mjs";
import {
  BLOCKED_OLLAMA_ENDPOINTS,
  MIN_SAFE_OLLAMA_VERSION,
} from "./local-ollama-security.mjs";
import {
  CLEANUP_EXECUTE_APPROVAL_PHRASE,
  RETRIEVAL_INDEX_APPROVAL_PHRASE,
  SOURCE_INDEX_APPROVAL_PHRASE,
  VAULT_CREATE_APPROVAL_PHRASE,
  buildCleanupPreviewContract,
  buildCleanupRunContract,
  buildRetrievalIndexPreview,
  buildRetrievalIndexStatusContract,
  buildSourceGroundingPreview,
  buildSourceIndexPreview,
  buildStorageUsageContract,
  buildVaultCreationPreview,
  buildVaultPlan,
  buildVaultTemplate,
} from "./local-vault-contract.mjs";

const host = process.env.LOCAL_AGENT_HOST || "127.0.0.1";
const port = Number.parseInt(process.env.LOCAL_AGENT_PORT || "43110", 10);
const maxRequestBytes = Number.parseInt(process.env.MOCK_AGENT_MAX_REQUEST_BYTES || "1048576", 10);
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

function readBoolean(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  return !["0", "false", "no", "off"].includes(raw.toLowerCase());
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
        reject(new Error("Mock local-agent request is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Mock local-agent request body must be valid JSON."));
      }
    });
    request.on("error", reject);
  });
}

function buildHealthPayload() {
  const ok = readBoolean("MOCK_AGENT_OK", true);
  const ollamaConnected = readBoolean("MOCK_OLLAMA_CONNECTED", true);
  const ollamaVersion = process.env.MOCK_OLLAMA_VERSION || "0.23.2";
  const versionSafe = readBoolean("MOCK_OLLAMA_VERSION_SAFE", true);
  const localhostOnly = readBoolean("MOCK_OLLAMA_LOCALHOST_ONLY", true);
  const securityOk = readBoolean("MOCK_OLLAMA_SECURITY_OK", versionSafe && localhostOnly);
  const localAi = readBoolean("MOCK_LOCAL_AI", true) && securityOk;

  return {
    ok,
    app: "cerise-scholar-local-agent",
    version: "0.1.0-mock",
    mode: "mock",
    ollama: {
      connected: ollamaConnected,
      baseUrl: process.env.MOCK_OLLAMA_BASE_URL || "http://localhost:11434/api",
      ok: ollamaConnected && localAi,
      version: ollamaVersion,
      selectedModel: process.env.MOCK_OLLAMA_MODEL || "llama3.2:1b",
      availableModels: [process.env.MOCK_OLLAMA_MODEL || "llama3.2:1b"],
      setupRequired: securityOk ? "" : "Ollama security check must pass before using local AI.",
      security: {
        ok: securityOk,
        minSafeVersion: MIN_SAFE_OLLAMA_VERSION,
        versionSafe,
        localhostOnly,
        usingLoopbackUrl: true,
        listenHosts: localhostOnly ? ["127.0.0.1"] : ["0.0.0.0"],
        blockedEndpoints: BLOCKED_OLLAMA_ENDPOINTS,
        trustedPersonalLaptopRequired: true,
        warnings: securityOk
          ? []
          : ["Ollama must be updated and restricted to localhost before using local AI."],
      },
    },
    capabilities: {
      localAi,
      fileRead: readBoolean("MOCK_FILE_READ", false),
      fileWrite: readBoolean("MOCK_FILE_WRITE", false),
      auditLog: false,
      retrievalIndex: false,
      storageUsage: false,
      cleanupPreview: false,
      commandRun: readBoolean("MOCK_COMMAND_RUN", false),
    },
    safety: {
      ollamaSecurityGate: securityOk ? "pass" : "blocked",
      blockedOllamaEndpoints: BLOCKED_OLLAMA_ENDPOINTS,
      trustedPersonalLaptopRequired: true,
      permissionContractVersion: 1,
      fileWriteRequiresApproval: true,
      auditLogEnabled: false,
      commandRunRequiresApproval: true,
      deletesOriginalFiles: false,
    },
    storage: {
      localVault: false,
      vaultContractVersion: 1,
      note: "Mock agent only. No local files are read, indexed, or written.",
    },
    checkedAt: new Date().toISOString(),
  };
}

function getMessageText(messages, role) {
  return (messages || [])
    .filter((message) => message?.role === role)
    .map((message) => message.content || "")
    .join("\n");
}

function buildMockContent(body) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const systemText = getMessageText(messages, "system").toLowerCase();
  const userText = getMessageText(messages, "user");

  if (body?.jsonMode && systemText.includes("academic research analyst")) {
    return JSON.stringify({
      citations: [
        {
          reference: "Cerise Scholar Local Agent Mock. (2026). Local-first AI routing verification.",
          summary:
            "This mock citation confirms the browser routed the claim-check request to the local agent endpoint instead of the cloud AI route.",
        },
      ],
      strength: "Mixed Evidence",
      strengthReason:
        "This is a deterministic mock response for workflow testing. It does not verify external literature yet.",
      commentary: [
        "Local-first provider routing is working.",
        "No private files were read, written, uploaded, or sent to a cloud model.",
        `Received prompt preview: ${userText.slice(0, 160) || "No user prompt provided."}`,
      ],
      followups: [
        "Connect the real local agent to Ollama for live evidence review.",
        "Add local source retrieval before using this for final academic judgment.",
      ],
    });
  }

  if (body?.jsonMode && systemText.includes("synthesis engine")) {
    return JSON.stringify({
      overview:
        "This is a mock local synthesis generated by the Cerise Scholar Local Agent test server. It confirms the selected sources reached the local provider route without using cloud AI. Replace this mock response with Ollama-backed synthesis in the real local agent step.",
      gaps:
        "The mock agent cannot evaluate real methodological gaps yet. The next implementation step is to connect this route to Ollama and then add local retrieval over approved project files.",
      framework:
        "Use a local-first research workflow: approved source access, scoped retrieval, structured synthesis, user review, and logged local actions.",
      bibliography: [
        "Cerise Scholar Local Agent Mock. (2026). Local-first synthesis routing verification.",
      ],
    });
  }

  return [
    "Mock Cerise Scholar Local Agent response.",
    "The synthesis follow-up request reached the local `/ai/chat` provider route.",
    "No Ollama call or file access happened in mock mode.",
    userText ? `Prompt preview: ${userText.slice(0, 220)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function getSourceDocuments(body) {
  return Array.isArray(body?.documents)
    ? body.documents
    : Array.isArray(body?.sourceIndex?.documents)
      ? body.sourceIndex.documents
      : [];
}

function buildMockSourceGroundedContent(body) {
  const documents = getSourceDocuments(body);
  const sourceNames = documents
    .map((document) => document?.relativePath)
    .filter(Boolean)
    .slice(0, 5);
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const systemText = getMessageText(messages, "system").toLowerCase();

  if (body?.jsonMode && systemText.includes("academic research analyst")) {
    return JSON.stringify({
      citations: sourceNames.map((relativePath, index) => ({
        reference: `[${index + 1}: ${relativePath}]`,
        summary: "Mock source-grounded citation from the approved session index.",
      })),
      strength: "Mixed Evidence",
      strengthReason:
        "Mock mode confirms source-grounded routing, but it does not read laptop files or call Ollama.",
      commentary: [
        "The request used the local source-grounded route.",
        "Mock mode used provided session-index excerpts only.",
        "No project files were read, written, uploaded, or sent to cloud AI.",
      ],
      followups: ["Run the real local agent with Ollama for live source-grounded analysis."],
    });
  }

  if (body?.jsonMode && systemText.includes("synthesis engine")) {
    return JSON.stringify({
      overview: `Mock source-grounded synthesis routed through the local agent. Sources: ${sourceNames.join(", ") || "none"}.`,
      gaps: "Mock mode cannot evaluate real evidence quality. Use the real local agent for Ollama-backed synthesis.",
      framework: "Local-first source grounding: approved session index, temporary retrieval context, Ollama response, no cloud upload.",
      bibliography: sourceNames.map((relativePath, index) => `[${index + 1}: ${relativePath}]`),
    });
  }

  return [
    "Mock Cerise Scholar source-grounded response.",
    sourceNames.length ? `Session-index sources: ${sourceNames.join(", ")}` : "No session-index sources were provided.",
    "No laptop files were read, written, uploaded, or sent to cloud AI.",
  ].join("\n\n");
}

async function handleAiChat(request, response) {
  const health = buildHealthPayload();
  if (!health.ok || !health.ollama.connected || !health.capabilities.localAi) {
    sendJson(request, response, 503, {
      ok: false,
      error: "Mock local AI is not ready.",
      health,
    });
    return;
  }

  try {
    const body = await readRequestJson(request);
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length) {
      sendJson(request, response, 400, {
        ok: false,
        error: "Messages are required.",
      });
      return;
    }

    sendJson(request, response, 200, {
      ok: true,
      provider: "local-agent",
      mode: "mock",
      model: "cerise-scholar-mock-local-ai",
      content: buildMockContent(body),
      safety: {
        readFiles: false,
        wroteFiles: false,
        ranCommands: false,
        uploadedToCloud: false,
      },
    });
  } catch (error) {
    sendJson(request, response, 400, {
      ok: false,
      error: error.message || "Mock local-agent chat request failed.",
    });
  }
}

async function handleSourceChat(request, response) {
  const health = buildHealthPayload();
  if (!health.ok || !health.ollama.connected || !health.capabilities.localAi) {
    sendJson(request, response, 503, {
      ok: false,
      error: "Mock local AI is not ready.",
      health,
    });
    return;
  }

  try {
    const body = await readRequestJson(request);
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const documents = getSourceDocuments(body);

    if (!messages.length) {
      sendJson(request, response, 400, {
        ok: false,
        error: "Messages are required.",
      });
      return;
    }

    if (!documents.length) {
      sendJson(request, response, 501, {
        ok: false,
        error: "Mock local agent does not read laptop project files for source-grounded AI. Provide a session source index or use npm run local-agent.",
        preview: buildSourceGroundingPreview(body),
        audit: {
          writtenToAuditLog: false,
          path: ".cerise-scholar/audit-log.jsonl",
        },
        safety: {
          readFiles: false,
          wroteFiles: false,
          ranCommands: false,
          uploadedToCloud: false,
          projectPathEchoed: false,
          writesAuditLog: false,
        },
      });
      return;
    }

    sendJson(request, response, 200, {
      ok: true,
      provider: "local-agent",
      mode: "mock-source-grounded",
      model: "cerise-scholar-mock-local-ai",
      content: buildMockSourceGroundedContent(body),
      projectPathEchoed: false,
      grounding: {
        sourceMode: "session-index",
        availableDocuments: documents.length,
        retrievedSources: documents.slice(0, 5).map((document, index) => ({
          rank: index + 1,
          relativePath: document.relativePath,
          wordCount: document.wordCount || 0,
          relevanceScore: 1,
        })),
        persistedIndex: false,
      },
      audit: {
        writtenToAuditLog: false,
        path: ".cerise-scholar/audit-log.jsonl",
      },
      safety: {
        readFiles: false,
        readSessionIndex: true,
        wroteFiles: false,
        ranCommands: false,
        uploadedToCloud: false,
        sentContextToCloud: false,
        projectPathEchoed: false,
        writesAuditLog: false,
      },
    });
  } catch (error) {
    sendJson(request, response, 400, {
      ok: false,
      error: error.message || "Mock local-agent source chat request failed.",
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
      error: error.message || "Could not create mock local vault metadata plan.",
    });
  }
}

async function handleVaultCreate(request, response) {
  try {
    const body = await readRequestJson(request);
    sendJson(request, response, 501, {
      ok: false,
      error: "Mock local agent does not create local vault files. Use npm run local-agent for the guarded real write path.",
      approvalPhraseRequired: VAULT_CREATE_APPROVAL_PHRASE,
      audit: {
        writtenToAuditLog: false,
        path: ".cerise-scholar/audit-log.jsonl",
      },
      preview: buildVaultCreationPreview(body),
    });
  } catch (error) {
    sendJson(request, response, 400, {
      ok: false,
      error: error.message || "Could not create mock vault write preview.",
    });
  }
}

async function handleProjectIndex(request, response) {
  try {
    const body = await readRequestJson(request);
    sendJson(request, response, 501, {
      ok: false,
      error: "Mock local agent does not read laptop project files. Use npm run local-agent for the guarded read-only indexing path.",
      approvalPhraseRequired: SOURCE_INDEX_APPROVAL_PHRASE,
      audit: {
        writtenToAuditLog: false,
        path: ".cerise-scholar/audit-log.jsonl",
      },
      preview: buildSourceIndexPreview(body),
      safety: {
        readsFiles: false,
        writesFiles: false,
        runsCommands: false,
        uploadsToCloud: false,
        projectPathEchoed: false,
        writesAuditLog: false,
      },
    });
  } catch (error) {
    sendJson(request, response, 400, {
      ok: false,
      error: error.message || "Could not create mock source-index preview.",
    });
  }
}

async function handleBuildRetrievalIndex(request, response) {
  try {
    const body = await readRequestJson(request);
    sendJson(request, response, 501, {
      ok: false,
      error: "Mock local agent does not read laptop files or build retrieval indexes. Use npm run local-agent for the guarded local-only index path.",
      approvalPhraseRequired: RETRIEVAL_INDEX_APPROVAL_PHRASE,
      audit: {
        writtenToAuditLog: false,
        path: ".cerise-scholar/audit-log.jsonl",
      },
      preview: buildRetrievalIndexPreview(body),
      safety: {
        readsFiles: false,
        writesFiles: false,
        createsDirectories: false,
        runsCommands: false,
        uploadsToCloud: false,
        projectPathEchoed: false,
        persistsIndex: false,
        writesAuditLog: false,
      },
    });
  } catch (error) {
    sendJson(request, response, 400, {
      ok: false,
      error: error.message || "Could not create mock retrieval-index preview.",
    });
  }
}

async function handleRetrievalIndexStatus(request, response) {
  try {
    const body = await readRequestJson(request);
    sendJson(request, response, 501, {
      ok: false,
      error: "Mock local agent does not inspect laptop vault retrieval indexes. Use npm run local-agent for real retrieval index status.",
      preview: buildRetrievalIndexStatusContract(body),
      audit: {
        writtenToAuditLog: false,
        path: ".cerise-scholar/audit-log.jsonl",
      },
      safety: {
        readsVaultMetadata: false,
        readsOriginalFiles: false,
        readsFileContents: false,
        writesFiles: false,
        runsCommands: false,
        uploadsToCloud: false,
        projectPathEchoed: false,
      },
    });
  } catch (error) {
    sendJson(request, response, 400, {
      ok: false,
      error: error.message || "Could not create mock retrieval-index status preview.",
    });
  }
}

async function handleStorageUsage(request, response) {
  try {
    const body = request.method === "GET" ? {} : await readRequestJson(request);
    sendJson(request, response, 501, {
      ok: false,
      error: "Mock local agent does not measure laptop vault storage. Use npm run local-agent for real storage usage.",
      preview: buildStorageUsageContract(body),
      audit: {
        writtenToAuditLog: false,
        path: ".cerise-scholar/audit-log.jsonl",
      },
      safety: {
        readsVaultMetadata: false,
        readsOriginalFiles: false,
        readsFileContents: false,
        writesFiles: false,
        runsCommands: false,
        uploadsToCloud: false,
        deletesFiles: false,
        projectPathEchoed: false,
      },
    });
  } catch (error) {
    sendJson(request, response, 400, {
      ok: false,
      error: error.message || "Could not create mock storage usage preview.",
    });
  }
}

async function handleCleanupPreview(request, response) {
  try {
    const body = await readRequestJson(request);
    sendJson(request, response, 501, {
      ok: false,
      error: "Mock local agent does not inspect laptop vault storage for cleanup. Use npm run local-agent for real cleanup preview.",
      preview: buildCleanupPreviewContract(body),
      audit: {
        writtenToAuditLog: false,
        path: ".cerise-scholar/audit-log.jsonl",
      },
      safety: {
        readsVaultMetadata: false,
        readsOriginalFiles: false,
        readsFileContents: false,
        writesFiles: false,
        runsCommands: false,
        uploadsToCloud: false,
        deletesFiles: false,
        projectPathEchoed: false,
        previewOnly: true,
      },
    });
  } catch (error) {
    sendJson(request, response, 400, {
      ok: false,
      error: error.message || "Could not create mock cleanup preview.",
    });
  }
}

async function handleCleanupRun(request, response) {
  try {
    const body = await readRequestJson(request);
    sendJson(request, response, 501, {
      ok: false,
      error: "Mock local agent does not delete generated laptop vault data. Use npm run local-agent for the guarded cleanup execution path.",
      approvalPhraseRequired: CLEANUP_EXECUTE_APPROVAL_PHRASE,
      preview: buildCleanupRunContract(body),
      audit: {
        writtenToAuditLog: false,
        path: ".cerise-scholar/audit-log.jsonl",
      },
      safety: {
        readsVaultMetadata: false,
        readsOriginalFiles: false,
        readsFileContents: false,
        writesFiles: false,
        runsCommands: false,
        uploadsToCloud: false,
        deletesFiles: false,
        deletesOriginalFiles: false,
        projectPathEchoed: false,
      },
    });
  } catch (error) {
    sendJson(request, response, 400, {
      ok: false,
      error: error.message || "Could not create blocked mock cleanup preview.",
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
      error: error.message || "Could not create mock action permission preview.",
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
      error: error.message || "Could not create blocked mock action preview.",
    });
  }
}

const server = http.createServer((request, response) => {
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
    const payload = buildHealthPayload();
    sendJson(request, response, payload.ok ? 200 : 503, payload);
    return;
  }

  if (request.method === "POST" && url.pathname === "/ai/chat") {
    handleAiChat(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/ai/source-chat") {
    handleSourceChat(request, response);
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
    handleProjectOpen(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/projects/create-vault") {
    handleVaultCreate(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/projects/index") {
    handleProjectIndex(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/projects/build-retrieval-index") {
    handleBuildRetrievalIndex(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/projects/retrieval-index/status") {
    handleRetrievalIndexStatus(request, response);
    return;
  }

  if ((request.method === "GET" || request.method === "POST") && url.pathname === "/storage/usage") {
    handleStorageUsage(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/storage/cleanup-preview") {
    handleCleanupPreview(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/storage/cleanup") {
    handleCleanupRun(request, response);
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
    handleActionPreview(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/actions/run") {
    handleActionRun(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/") {
    sendJson(request, response, 200, {
      ok: true,
      app: "cerise-scholar-local-agent",
      mode: "mock",
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
    error: "Mock local-agent endpoint not found.",
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Cerise Scholar mock local agent could not start: ${host}:${port} is already in use.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Cerise Scholar mock local agent listening on http://${host}:${port}`);
  console.log(`Health endpoint: http://${host}:${port}/health`);
  console.log("Set MOCK_OLLAMA_CONNECTED=false to test the Needs Ollama state.");
});
