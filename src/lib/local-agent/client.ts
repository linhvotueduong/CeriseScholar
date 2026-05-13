"use client";

export const LOCAL_AGENT_BASE_URL = (
  process.env.NEXT_PUBLIC_LOCAL_AGENT_BASE_URL || "http://127.0.0.1:43110"
).replace(/\/$/, "");

export const LOCAL_AGENT_REQUIRED_MESSAGE =
  "This feature runs on your laptop because your private project files and AI agent stay on that device. Open Cerise Scholar from the laptop where the Cerise Scholar Local Agent is installed.";

export const LOCAL_AI_UNAVAILABLE_MESSAGE =
  "Cerise Scholar Local Agent is connected, but Ollama/local AI is not ready yet. Open Ollama on this laptop, then check again.";

export const VAULT_CREATE_APPROVAL_PHRASE = "CREATE_CERISE_SCHOLAR_VAULT";
export const SOURCE_INDEX_APPROVAL_PHRASE = "READ_CERISE_SCHOLAR_SOURCES";
export const RETRIEVAL_INDEX_APPROVAL_PHRASE = "BUILD_CERISE_SCHOLAR_RETRIEVAL_INDEX";
export const CLEANUP_EXECUTE_APPROVAL_PHRASE = "CLEAN_CERISE_SCHOLAR_GENERATED_DATA";
export const LOCAL_SETUP_PROMPT_STORAGE_KEY = "cerise_local_setup_prompt";
export const LOCAL_SETUP_DISMISSED_STORAGE_KEY = "cerise_local_setup_prompt_dismissed_at";
export const LOCAL_SETUP_EMAIL_REQUEST_STORAGE_KEY = "cerise_local_setup_email_requested_at";
export const LOCAL_SETUP_EMAIL_SENT_STORAGE_KEY = "cerise_local_setup_email_sent_at";
export const LOCAL_SETUP_READY_STORAGE_KEY = "cerise_local_setup_ready_at";

export type LocalAgentHealth = {
  ok?: boolean;
  app?: string;
  mode?: string;
  version?: string;
  capabilities?: {
    localAi?: boolean;
    fileSystem?: boolean;
    vaults?: boolean;
    sourceIndexing?: boolean;
    cleanup?: boolean;
  };
  ollama?: {
    connected?: boolean;
    ok?: boolean;
    version?: string;
    selectedModel?: string;
    availableModels?: string[];
    models?: string[];
    setupRequired?: string;
    security?: {
      ok?: boolean;
      minSafeVersion?: string;
      versionSafe?: boolean;
      localhostOnly?: boolean;
      usingLoopbackUrl?: boolean;
      listenHosts?: string[];
      blockedEndpoints?: string[];
      trustedPersonalLaptopRequired?: boolean;
      warnings?: string[];
    };
    error?: string;
  };
  safety?: {
    ollamaSecurityGate?: string;
    blockedOllamaEndpoints?: string[];
    trustedPersonalLaptopRequired?: boolean;
  };
  error?: string;
};

export type LocalAgentStatus = "checking" | "connected" | "needs-ollama" | "security-blocked" | "not-connected";

export type LocalAgentUiState = {
  status: LocalAgentStatus;
  label: string;
  detail: string;
  canUseLocalAi: boolean;
};

export type LocalSetupReadyEmailStatus =
  | "sent"
  | "already_sent"
  | "not_configured"
  | "no_request"
  | "send_failed"
  | "unauthorized";

export type LocalSetupReadyEmailResult = {
  ok: boolean;
  status: LocalSetupReadyEmailStatus;
  sentAt?: string;
  reason?: string;
  error?: string;
};

export type LocalAgentChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LocalAgentChatOptions = {
  messages: LocalAgentChatMessage[];
  query?: string;
  timeoutMs?: number;
};

export type LocalVaultAction =
  | "open"
  | "create-vault"
  | "index"
  | "build-retrieval-index"
  | "retrieval-index-status"
  | "storage-usage"
  | "cleanup-preview"
  | "cleanup";

export type LocalVaultActionPayload = {
  projectPath: string;
  approvalPhrase?: string;
  categoryIds?: string[];
};

export type LocalVaultActionResult = {
  ok?: boolean;
  action?: string;
  mode?: string;
  error?: string;
  preview?: unknown;
  safety?: Record<string, unknown>;
  audit?: {
    writtenToAuditLog?: boolean;
    path?: string;
  };
  created?: { path?: string; status?: string }[];
  plannedWrites?: string[];
  plannedReads?: string[];
  allowedExtensions?: string[];
  skippedDirectories?: string[];
  limits?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  sourceIndexStats?: Record<string, unknown>;
  manifest?: Record<string, unknown>;
  written?: { path?: string; relativePath?: string; bytes?: number }[];
  totalBytes?: number;
  estimatedReclaimableBytes?: number;
  files?: number;
  directories?: number;
  categories?: {
    id?: string;
    label?: string;
    bytes?: number;
    estimatedBytes?: number;
    files?: number;
    directories?: number;
    action?: string;
  }[];
};

export function isProbablyMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

export function requestLocalSetupPrompt(reason = "signup") {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LOCAL_SETUP_PROMPT_STORAGE_KEY,
      JSON.stringify({
        reason,
        requestedAt: new Date().toISOString(),
      })
    );
    window.localStorage.removeItem(LOCAL_SETUP_DISMISSED_STORAGE_KEY);
  } catch {
    // If localStorage is unavailable, the dashboard status card still explains setup.
  }
}

export async function fetchLocalAgentHealth(timeoutMs = 1800): Promise<LocalAgentHealth> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${LOCAL_AGENT_BASE_URL}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as LocalAgentHealth;
    if (!response.ok) {
      return { ok: false, error: data.error || `Local agent returned ${response.status}` };
    }
    return data;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function sendLocalSetupReadyEmail(timeoutMs = 15000): Promise<LocalSetupReadyEmailResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("/api/local-setup/ready-email", {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => ({}))) as Partial<LocalSetupReadyEmailResult>;
    return {
      ok: response.ok && data.ok !== false,
      status: (data.status || (response.ok ? "sent" : "send_failed")) as LocalSetupReadyEmailStatus,
      sentAt: data.sentAt,
      reason: data.reason,
      error: data.error,
    };
  } catch (error) {
    return {
      ok: false,
      status: "send_failed",
      error:
        error instanceof Error && error.name === "AbortError"
          ? "Setup-ready email request took too long."
          : error instanceof Error
            ? error.message
            : "Setup-ready email request failed.",
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function callLocalAgentChat({
  messages,
  query,
  timeoutMs = 45000,
}: LocalAgentChatOptions): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${LOCAL_AGENT_BASE_URL}/ai/chat`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages, query }),
      cache: "no-store",
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => ({}))) as {
      content?: string;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error || LOCAL_AI_UNAVAILABLE_MESSAGE);
    }

    const content = data.content?.trim();
    if (!content) {
      throw new Error("Cerise Scholar Local Agent returned an empty response. Try again.");
    }

    return content;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Cerise Scholar Local Agent took too long. Try a shorter request.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function callLocalVaultAction(
  action: LocalVaultAction,
  payload: LocalVaultActionPayload,
  timeoutMs = 30000
): Promise<LocalVaultActionResult> {
  const endpointByAction: Record<LocalVaultAction, string> = {
    open: "/projects/open",
    "create-vault": "/projects/create-vault",
    index: "/projects/index",
    "build-retrieval-index": "/projects/build-retrieval-index",
    "retrieval-index-status": "/projects/retrieval-index/status",
    "storage-usage": "/storage/usage",
    "cleanup-preview": "/storage/cleanup-preview",
    cleanup: "/storage/cleanup",
  };

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${LOCAL_AGENT_BASE_URL}${endpointByAction[action]}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as LocalVaultActionResult;

    if (!response.ok) {
      return {
        ...data,
        ok: false,
        error: data.error || `Local Agent returned ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error && error.name === "AbortError"
          ? "Cerise Scholar Local Agent took too long to respond."
          : error instanceof Error
            ? error.message
            : "Cerise Scholar Local Agent is not reachable.",
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function getLocalAgentUiState(
  health: LocalAgentHealth | null,
  checking: boolean,
  mobile: boolean,
  error = ""
): LocalAgentUiState {
  if (checking) {
    return {
      status: "checking",
      label: "Checking laptop agent",
      detail: "Checking for Cerise Scholar Local Agent on this device.",
      canUseLocalAi: false,
    };
  }

  if (mobile) {
    return {
      status: "not-connected",
      label: "Laptop required",
      detail: LOCAL_AGENT_REQUIRED_MESSAGE,
      canUseLocalAi: false,
    };
  }

  if (!health?.ok) {
    return {
      status: "not-connected",
      label: "Local Agent not connected",
      detail: error || health?.error || LOCAL_AGENT_REQUIRED_MESSAGE,
      canUseLocalAi: false,
    };
  }

  const ollamaReady = Boolean(health.ollama?.ok ?? health.ollama?.connected);
  const securityOk = health.ollama?.security?.ok !== false;

  if (health.ollama?.connected && !securityOk) {
    return {
      status: "security-blocked",
      label: "Ollama safety check",
      detail:
        health.ollama.security?.warnings?.[0] ||
        "Update Ollama and make sure it is only reachable from this personal laptop before using local AI.",
      canUseLocalAi: false,
    };
  }

  if (!health.capabilities?.localAi || !ollamaReady) {
    return {
      status: "needs-ollama",
      label: "Needs Ollama",
      detail: health.ollama?.setupRequired || health.ollama?.error || LOCAL_AI_UNAVAILABLE_MESSAGE,
      canUseLocalAi: false,
    };
  }

  return {
    status: "connected",
    label: "Local Agent connected",
    detail: `Ollama is ready${health.ollama?.selectedModel ? ` with ${health.ollama.selectedModel}` : ""}.`,
    canUseLocalAi: true,
  };
}
