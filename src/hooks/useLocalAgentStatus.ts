"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchLocalAgentHealth,
  getLocalAgentUiState,
  isProbablyMobileDevice,
  type LocalAgentHealth,
} from "@/lib/local-agent/client";
import { canUseHostedAiBypass, HOSTED_AI_BYPASS_DETAIL } from "@/lib/ai/hostedBypass";
import { useUser } from "@/hooks/useUser";

export function useLocalAgentStatus() {
  const { user, loading: userLoading } = useUser();
  const [health, setHealth] = useState<LocalAgentHealth | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [mobile, setMobile] = useState(false);
  const hostedAiBypass = canUseHostedAiBypass(user?.email);

  const checkNow = useCallback(async () => {
    if (hostedAiBypass) {
      setHealth(null);
      setError("");
      setMobile(false);
      setChecking(false);
      return;
    }

    setChecking(true);
    setError("");
    setMobile(isProbablyMobileDevice());

    try {
      const nextHealth = await fetchLocalAgentHealth();
      setHealth(nextHealth);
    } catch (nextError) {
      setHealth(null);
      setError(
        nextError instanceof Error && nextError.name === "AbortError"
          ? "Cerise Scholar Local Agent did not respond yet."
          : "Cerise Scholar Local Agent is not running or has not allowed browser access."
      );
    } finally {
      setChecking(false);
    }
  }, [hostedAiBypass]);

  useEffect(() => {
    if (userLoading) return;
    void checkNow();
  }, [checkNow, userLoading]);

  const ui = useMemo(() => {
    if (hostedAiBypass) {
      return {
        status: "connected" as const,
        label: "Hosted AI enabled",
        detail: HOSTED_AI_BYPASS_DETAIL,
        canUseLocalAi: true,
      };
    }

    return getLocalAgentUiState(health, checking, mobile, error);
  }, [health, checking, mobile, error, hostedAiBypass]);

  return {
    health,
    checking,
    error,
    mobile,
    ui,
    canUseLocalAi: ui.canUseLocalAi,
    hostedAiBypass,
    checkNow,
  };
}
