import "server-only";

import { OpenRouterError } from "./openrouter";

const OPENROUTER_KEY_INFO_URL = "https://openrouter.ai/api/v1/key";

export interface OpenRouterKeyInfo {
  limitUsd: number | null;
  limitRemainingUsd: number | null;
  limitReset: string | null;
  usageUsd: number | null;
  isFreeTier: boolean;
}

function optionalFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function getOpenRouterKeyInfo(apiKey: string): Promise<OpenRouterKeyInfo> {
  const response = await fetch(OPENROUTER_KEY_INFO_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);

  if (!response) {
    throw new OpenRouterError("OpenRouter key status is temporarily unavailable.", 502);
  }
  if (response.status === 401 || response.status === 403) {
    throw new OpenRouterError("OpenRouter declined this key. Reconnect it in Settings → API key.", 401);
  }
  if (!response.ok) {
    throw new OpenRouterError("OpenRouter key status is temporarily unavailable.", 502);
  }

  const payload = await response.json().catch(() => null) as { data?: Record<string, unknown> } | null;
  const data = payload?.data ?? {};
  return {
    limitUsd: optionalFiniteNumber(data.limit),
    limitRemainingUsd: optionalFiniteNumber(data.limit_remaining),
    limitReset: typeof data.limit_reset === "string" ? data.limit_reset.slice(0, 40) : null,
    usageUsd: optionalFiniteNumber(data.usage),
    isFreeTier: data.is_free_tier === true,
  };
}

export function modelChainMayCharge(models: readonly string[]): boolean {
  return models.some((model) => !model.endsWith(":free"));
}
