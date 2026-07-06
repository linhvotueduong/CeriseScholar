"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchLocalAgentHealth,
  getLocalAgentUiState,
  isProbablyMobileDevice,
  type LocalAgentHealth,
} from "@/lib/local-agent/client";
import { useUser } from "@/hooks/useUser";

export function useLocalAgentStatus() {
  const { loading: userLoading } = useUser();
  const [health, setHealth] = useState<LocalAgentHealth | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [mobile, setMobile] = useState(false);

  const checkNow = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (userLoading) return;
    void checkNow();
  }, [checkNow, userLoading]);

  const ui = useMemo(
    () => getLocalAgentUiState(health, checking, mobile, error),
    [health, checking, mobile, error]
  );

  return {
    health,
    checking,
    error,
    mobile,
    ui,
    canUseLocalAi: ui.canUseLocalAi,
    hostedAiBypass: false,
    checkNow,
  };
}
