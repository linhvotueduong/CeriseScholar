type OllamaMessage = {
  role: string;
  content: string;
};

type OllamaChatOptions = {
  messages: OllamaMessage[];
  route: string;
  timeoutMs?: number;
  temperature?: number;
  numPredict?: number;
};

const OLLAMA_API_URL = "https://ollama.com/api/chat";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "kimi-k2.5";

export class OllamaError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "OllamaError";
    this.status = status;
  }
}

export function assertOllamaConfigured() {
  if (!OLLAMA_API_KEY) {
    throw new OllamaError("AI not configured", 500);
  }
}

export async function callOllamaChat({
  messages,
  route,
  timeoutMs = 25000,
  temperature = 0.2,
  numPredict = 700,
}: OllamaChatOptions): Promise<string> {
  assertOllamaConfigured();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const res = await fetch(OLLAMA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: {
          temperature,
          num_predict: numPredict,
        },
      }),
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    let data: { message?: { content?: string }; error?: string } | null = null;

    if (contentType.includes("application/json") && text) {
      try {
        data = JSON.parse(text) as { message?: { content?: string }; error?: string };
      } catch {
        data = null;
      }
    }

    if (!res.ok) {
      console.error("Ollama upstream error", {
        route,
        status: res.status,
        contentType,
        durationMs: Date.now() - startedAt,
        bodyPrefix: text.slice(0, 160),
      });
      throw new OllamaError(data?.error || "AI service error. Please try again.", 502);
    }

    const content = data?.message?.content || "";
    if (!content.trim()) {
      console.error("Ollama empty response", {
        route,
        contentType,
        durationMs: Date.now() - startedAt,
        bodyPrefix: text.slice(0, 160),
      });
      throw new OllamaError("AI returned an empty response. Please try again.", 502);
    }

    return content;
  } catch (err) {
    if (err instanceof OllamaError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new OllamaError("AI took too long. Try a shorter request.", 504);
    }
    console.error("Ollama request failed", {
      route,
      durationMs: Date.now() - startedAt,
      message: err instanceof Error ? err.message : String(err),
    });
    throw new OllamaError("AI service is temporarily unavailable. Please try again.", 502);
  } finally {
    clearTimeout(timeout);
  }
}
