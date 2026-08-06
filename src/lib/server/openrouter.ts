type OpenRouterMessage = {
  role: string;
  content: string;
};

type OpenRouterChatOptions = {
  messages: OpenRouterMessage[];
  models: string[];
  apiKey: string;
  route?: string;
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

type OpenRouterResponse = {
  model?: string;
  choices?: Array<{
    message?: { content?: string };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: {
    message?: string;
    code?: string | number;
  };
};

export type OpenRouterUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type OpenRouterChatResult = {
  content: string;
  // The model that actually served the request — with a `models` fallback
  // array, this can differ from `models[0]` when the primary was busy/down.
  servedModel: string;
  usage: OpenRouterUsage;
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// OpenRouter app-attribution headers — identify Cerise Scholar so usage shows up
// under our app on the OpenRouter dashboard. See docs/ai-engine-selection.md.
const APP_REFERER = "https://app.cerisescholar.com";
const APP_TITLE = "Cerise Scholar";

export class OpenRouterError extends Error {
  status: number;
  code: "cancelled" | "provider-busy" | "provider-timeout" | "temporarily-unavailable" | "unknown";
  retryable: boolean;

  constructor(
    message: string,
    status = 500,
    options: { code?: OpenRouterError["code"]; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
    this.code = options.code ?? "unknown";
    this.retryable = options.retryable === true;
  }
}

function extractOpenRouterContent(data: OpenRouterResponse | null): string {
  return data?.choices?.[0]?.message?.content || "";
}

function extractOpenRouterUsage(data: OpenRouterResponse | null): OpenRouterUsage {
  return {
    inputTokens: data?.usage?.prompt_tokens || 0,
    outputTokens: data?.usage?.completion_tokens || 0,
  };
}

export async function callOpenRouterChat({
  messages,
  models,
  apiKey,
  route = "generic",
  timeoutMs = 55000,
  temperature = 0.3,
  maxTokens = 700,
  signal,
}: OpenRouterChatOptions): Promise<OpenRouterChatResult> {
  if (!apiKey) {
    throw new OpenRouterError("AI not configured", 500);
  }
  if (!models.length) {
    throw new OpenRouterError("AI not configured", 500);
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener("abort", abortFromCaller, { once: true });
  if (signal?.aborted) controller.abort();
  const startedAt = Date.now();

  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": APP_REFERER,
        "X-Title": APP_TITLE,
      },
      body: JSON.stringify({
        // OpenRouter's native fallback: tries models[0] first, then falls through
        // the rest of the array on error/rate-limit — no separate "model" field needed.
        models,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    let data: OpenRouterResponse | null = null;

    if (contentType.includes("application/json") && text) {
      try {
        data = JSON.parse(text) as OpenRouterResponse;
      } catch {
        data = null;
      }
    }

    if (!res.ok) {
      console.error("OpenRouter upstream error", {
        route,
        status: res.status,
        contentType,
        durationMs: Date.now() - startedAt,
      });
      // 429 here is the shared FREE pool being saturated upstream — a normal,
      // transient condition, not a fault. Say so instead of echoing raw
      // provider text like "Provider returned error".
      if (res.status === 429) {
        throw new OpenRouterError("Free AI models are busy right now — please retry in a moment.", 429, { code: "provider-busy", retryable: true });
      }
      if (res.status === 401 || res.status === 403) {
        throw new OpenRouterError("The AI provider credentials were rejected. Check Settings → AI.", res.status, { code: "unknown", retryable: false });
      }
      throw new OpenRouterError("The AI provider could not complete this request.", res.status >= 500 ? 502 : res.status, {
        code: res.status >= 500 ? "temporarily-unavailable" : "unknown",
        retryable: res.status >= 500,
      });
    }

    const content = extractOpenRouterContent(data);
    if (!content.trim()) {
      console.error("OpenRouter empty response", {
        route,
        contentType,
        durationMs: Date.now() - startedAt,
      });
      throw new OpenRouterError("AI returned an empty response. Please try again.", 502, { code: "temporarily-unavailable", retryable: true });
    }

    return {
      content,
      servedModel: data?.model || "",
      usage: extractOpenRouterUsage(data),
    };
  } catch (err) {
    if (err instanceof OpenRouterError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      if (signal?.aborted && !timedOut) {
        throw new OpenRouterError("The AI request was cancelled. No project change was made.", 499, { code: "cancelled", retryable: false });
      }
      throw new OpenRouterError("AI took too long. Try a shorter request.", 504, { code: "provider-timeout", retryable: true });
    }
    console.error("OpenRouter request failed", {
      route,
      durationMs: Date.now() - startedAt,
      message: err instanceof Error ? err.message : String(err),
    });
    throw new OpenRouterError("AI service is temporarily unavailable. Please try again.", 502, { code: "temporarily-unavailable", retryable: true });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}
