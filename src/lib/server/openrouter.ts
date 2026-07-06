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
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
  error?: {
    message?: string;
    code?: string | number;
  };
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// OpenRouter app-attribution headers — identify Cerise Scholar so usage shows up
// under our app on the OpenRouter dashboard. See docs/ai-engine-selection.md.
const APP_REFERER = "https://app.cerisescholar.com";
const APP_TITLE = "Cerise Scholar";

export class OpenRouterError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
  }
}

function extractOpenRouterContent(data: OpenRouterResponse | null): string {
  return data?.choices?.[0]?.message?.content || "";
}

export async function callOpenRouterChat({
  messages,
  models,
  apiKey,
  route = "generic",
  timeoutMs = 55000,
  temperature = 0.3,
  maxTokens = 700,
}: OpenRouterChatOptions): Promise<string> {
  if (!apiKey) {
    throw new OpenRouterError("AI not configured", 500);
  }
  if (!models.length) {
    throw new OpenRouterError("AI not configured", 500);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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
        bodyPrefix: text.slice(0, 160),
      });
      // 429 here is the shared FREE pool being saturated upstream — a normal,
      // transient condition, not a fault. Say so instead of echoing raw
      // provider text like "Provider returned error".
      if (res.status === 429) {
        throw new OpenRouterError("Free AI models are busy right now — please retry in a moment.", 429);
      }
      throw new OpenRouterError(
        data?.error?.message || "AI service error. Please try again.",
        res.status >= 500 ? 502 : res.status
      );
    }

    const content = extractOpenRouterContent(data);
    if (!content.trim()) {
      console.error("OpenRouter empty response", {
        route,
        contentType,
        durationMs: Date.now() - startedAt,
        bodyPrefix: text.slice(0, 160),
      });
      throw new OpenRouterError("AI returned an empty response. Please try again.", 502);
    }

    return content;
  } catch (err) {
    if (err instanceof OpenRouterError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new OpenRouterError("AI took too long. Try a shorter request.", 504);
    }
    console.error("OpenRouter request failed", {
      route,
      durationMs: Date.now() - startedAt,
      message: err instanceof Error ? err.message : String(err),
    });
    throw new OpenRouterError("AI service is temporarily unavailable. Please try again.", 502);
  } finally {
    clearTimeout(timeout);
  }
}
