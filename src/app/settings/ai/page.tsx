"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConnectKeyForm from "@/components/ai/ConnectKeyForm";
import WelcomeAiPopup from "@/components/ai/WelcomeAiPopup";
import SettingsPanel from "@/components/app-ui/SettingsPanel";
import Spinner from "@/components/ui/Spinner";
import { PAID_MODEL_OPTIONS } from "@/lib/ai/preferredModels";

const DEFAULT_PREMIUM_MODEL = PAID_MODEL_OPTIONS[0]?.id ?? "qwen/qwen3-32b";

type ApiSource = "openrouter" | "provider";

type KeyStatus = {
  connected: boolean;
  provider?: string;
  last4?: string;
  preferredModel?: string | null;
};

type UsageStatus = {
  used: number;
  usedThisMonthTotal: number;
  allowance: number | null;
};

type UsageGuardrails = {
  apiSource: ApiSource;
  monthlyCreditAlertCents: number;
  dailyRequestAlert: number;
  premiumRequestAlert: number;
  unusualSpikeAlert: boolean;
  alertEmail: boolean;
  alertPortal: boolean;
  autoPausePremium: boolean;
};

type GuardrailUsage = {
  dailyRequests: number;
  monthlyPremiumRequests: number;
};

type RoutingRow = {
  product: string;
  source: string;
  model: string;
  freeRouting: string;
  style: string;
  status: string;
};

const providerOptions = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
];

const defaultGuardrails: UsageGuardrails = {
  apiSource: "openrouter",
  monthlyCreditAlertCents: 1000,
  dailyRequestAlert: 100,
  premiumRequestAlert: 50,
  unusualSpikeAlert: true,
  alertEmail: true,
  alertPortal: true,
  autoPausePremium: false,
};

function maskOpenRouterKey(last4?: string) {
  return last4 ? `sk-or-.....${last4}` : "Not connected";
}

function modelLabel(modelId: string | null | undefined) {
  const model = PAID_MODEL_OPTIONS.find((option) => option.id === modelId);
  return model?.label ?? "Qwen3 32B";
}

export default function AiSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<KeyStatus>({ connected: false });
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [guardrails, setGuardrails] = useState<UsageGuardrails>(defaultGuardrails);
  const [guardrailUsage, setGuardrailUsage] = useState<GuardrailUsage | null>(null);
  const [activeSource, setActiveSource] = useState<ApiSource>("openrouter");
  const [savingModel, setSavingModel] = useState(false);
  const [savingGuardrails, setSavingGuardrails] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [hasAutoOpenedGuide, setHasAutoOpenedGuide] = useState(false);
  const [, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedPremiumModel = status.preferredModel ?? DEFAULT_PREMIUM_MODEL;

  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/usage", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as Partial<UsageStatus>;
      if (res.ok) {
        setUsage({
          used: typeof data.used === "number" ? data.used : 0,
          usedThisMonthTotal: typeof data.usedThisMonthTotal === "number" ? data.usedThisMonthTotal : 0,
          allowance: typeof data.allowance === "number" ? data.allowance : null,
        });
      }
    } catch {
      // Usage is supportive only; leave it unset if the endpoint is unavailable.
    }
  }, []);

  const loadKeyStatus = useCallback(async (): Promise<KeyStatus | null> => {
    void loadUsage();
    try {
      const res = await fetch("/api/ai/key", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as KeyStatus & { error?: string };
      if (!res.ok) return null;
      setStatus(data);
      if (data.connected) setActiveSource("openrouter");
      return data;
    } catch {
      return null;
    }
  }, [loadUsage]);

  const loadGuardrails = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/guardrails", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        guardrails?: UsageGuardrails;
        usage?: GuardrailUsage;
      };
      if (!res.ok) return;
      if (data.guardrails) {
        setGuardrails(data.guardrails);
        setActiveSource(data.guardrails.apiSource);
      }
      if (data.usage) setGuardrailUsage(data.usage);
    } catch {
      // Guardrails are supportive preferences; the rest of Settings can still render.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [data] = await Promise.all([loadKeyStatus(), loadGuardrails()]);
      if (cancelled) return;
      setLoading(false);
      if (!hasAutoOpenedGuide && !data?.connected) {
        setHasAutoOpenedGuide(true);
        setShowSetupGuide(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only auto-open.
  }, [loadGuardrails, loadKeyStatus]);

  const routingRows = useMemo<RoutingRow[]>(() => {
    if (activeSource === "provider") {
      return [
        {
          product: "Cerise Scholar",
          source: "Own API",
          model: "Not configured",
          freeRouting: "Not applicable",
          style: "Available after key connection",
          status: "Connect key first",
        },
        {
          product: "Guidance",
          source: "Own API",
          model: "Not configured",
          freeRouting: "Not applicable",
          style: "Available after key connection",
          status: "Connect key first",
        },
        {
          product: "ScholarAsk",
          source: "Own API",
          model: "Not configured",
          freeRouting: "Not applicable",
          style: "Available after key connection",
          status: "Connect key first",
        },
      ];
    }

    return [
      {
        product: "Cerise Scholar",
        source: "OpenRouter",
        model: modelLabel(selectedPremiumModel),
        freeRouting: "Auto by Cerise",
        style: "Balanced quality and cost",
        status: status.connected ? "Active" : "Key pending",
      },
      {
        product: "Guidance",
        source: "OpenRouter",
        model: modelLabel(selectedPremiumModel),
        freeRouting: "Auto by Cerise",
        style: "Fast draft support",
        status: status.connected ? "Active" : "Key pending",
      },
      {
        product: "Projects",
        source: "OpenRouter",
        model: modelLabel(selectedPremiumModel),
        freeRouting: "Auto by Cerise",
        style: "Balanced quality and cost",
        status: status.connected ? "Active" : "Key pending",
      },
      {
        product: "ScholarAsk",
        source: "OpenRouter",
        model: modelLabel(selectedPremiumModel),
        freeRouting: "Auto by Cerise",
        style: "Source-backed research support",
        status: status.connected ? "Active" : "Key pending",
      },
    ];
  }, [activeSource, selectedPremiumModel, status.connected]);

  const handleCloseSetupGuide = useCallback(() => {
    setShowSetupGuide(false);
    void loadKeyStatus();
  }, [loadKeyStatus]);

  async function handleModelChange(value: string) {
    setSavingModel(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/ai/key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredModel: value }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Saving the premium model preference failed. Please try again.");
        return;
      }
      setStatus((current) => ({ ...current, preferredModel: value }));
      setMessage("Premium model preference saved.");
    } catch {
      setError("Saving the premium model preference failed. Please check your connection and try again.");
    } finally {
      setSavingModel(false);
    }
  }

  async function handleTestConnection() {
    setTestingKey(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/ai/key", { method: "PUT" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "OpenRouter rejected the stored key. Reconnect it and try again.");
        return;
      }
      setStatus((current) => ({ ...current, connected: true }));
    } catch {
      setError("Testing the key failed. Please check your connection and try again.");
    } finally {
      setTestingKey(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/ai/key", { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Disconnect failed. Please try again.");
        return;
      }
      setStatus({ connected: false });
      setConfirmingDisconnect(false);
      setMessage("OpenRouter key disconnected. API setup is pending.");
      void loadUsage();
    } catch {
      setError("Disconnect failed. Please check your connection and try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSaveGuardrails() {
    setSavingGuardrails(true);
    setMessage("");
    setError("");
    const nextGuardrails = { ...guardrails, apiSource: activeSource };
    try {
      const res = await fetch("/api/ai/guardrails", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextGuardrails),
      });
      const data = (await res.json().catch(() => ({}))) as {
        guardrails?: UsageGuardrails;
        usage?: GuardrailUsage;
        error?: string;
      };
      if (!res.ok || !data.guardrails) {
        setError(data.error || "Saving usage guardrails failed. Please try again.");
        return;
      }
      setGuardrails(data.guardrails);
      if (data.usage) setGuardrailUsage(data.usage);
      setMessage("Usage guardrails saved.");
    } catch {
      setError("Saving usage guardrails failed. Please check your connection and try again.");
    } finally {
      setSavingGuardrails(false);
    }
  }

  return (
    <>
      <SettingsPanel
        className="overflow-hidden px-4 pb-4 pt-4"
        description="Choose how Cerise Scholar accesses AI models and manages routing."
        title="API key"
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid min-w-0 gap-2.5">
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              <button
                aria-pressed={activeSource === "openrouter"}
                className={`grid min-w-0 grid-cols-[18px_minmax(0,1fr)] gap-3 rounded-[8px] border px-4 py-3 text-left transition ${
                  activeSource === "openrouter"
                    ? "border-[#c9a46f] bg-[#fffaf3] shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
                    : "border-[#d6dbe1] bg-white hover:border-[#9aa4b2]"
                }`}
                onClick={() => setActiveSource("openrouter")}
                type="button"
              >
                <span
                  className={`mt-1 grid h-4 w-4 place-items-center rounded-full border ${
                    activeSource === "openrouter" ? "border-[#b6844e]" : "border-[#d6dbe1]"
                  }`}
                  aria-hidden="true"
                >
                  {activeSource === "openrouter" && <span className="h-2 w-2 rounded-full bg-[#b6844e]" />}
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h3 className="min-w-0 text-[13px] font-black leading-5 text-[#111111]">Use OpenRouter API Key</h3>
                      {!status.connected && (
                        <span className="shrink-0 rounded-full bg-[#f3eadf] px-2 py-0.5 text-[10px] font-black text-[#9a6b3f]">
                          Recommended
                        </span>
                      )}
                    </div>
                    {status.connected && (
                      <span className="shrink-0 rounded-full bg-[#f2f3f5] px-2.5 py-1 text-[10px] font-black leading-none text-[#667085]">
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-[#4f5967]">
                    Test with free daily limits, then add credit for full Cerise usage. Cerise manages free models and includes routing.
                  </p>
                </div>
              </button>

              <button
                aria-pressed={activeSource === "provider"}
                className={`grid min-w-0 grid-cols-[18px_minmax(0,1fr)] gap-3 rounded-[8px] border px-4 py-3 text-left transition ${
                  activeSource === "provider"
                    ? "border-[#c9a46f] bg-[#fffaf3] shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
                    : "border-[#d6dbe1] bg-white hover:border-[#9aa4b2]"
                }`}
                onClick={() => setActiveSource("provider")}
                type="button"
              >
                <span
                  className={`mt-1 grid h-4 w-4 place-items-center rounded-full border ${
                    activeSource === "provider" ? "border-[#b6844e]" : "border-[#d6dbe1]"
                  }`}
                  aria-hidden="true"
                >
                  {activeSource === "provider" && <span className="h-2 w-2 rounded-full bg-[#b6844e]" />}
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <h3 className="min-w-0 text-[13px] font-black leading-5 text-[#111111]">Use Your Own API Key</h3>
                    <span className="shrink-0 rounded-full bg-[#f2f3f5] px-2.5 py-1 text-[10px] font-black leading-none text-[#667085]">
                      Configure
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-[#4f5967]">
                    Connect a supported provider key. Cerise manages routing for you.
                  </p>
                </div>
              </button>
            </div>

            <div className="rounded-[8px] border border-[#d6dbe1] bg-[#fafbfc] px-3 py-2 text-[11px] font-semibold leading-4 text-[#4f5967]">
              Cerise handles routing for all products so the best available model is used for each task. Product routing lives here, not in the setup popup.
            </div>

            {activeSource === "openrouter" ? (
              <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(220px,0.75fr)_minmax(240px,0.9fr)_minmax(0,1.35fr)]">
                <section className="flex h-[268px] min-w-0 flex-col overflow-hidden rounded-[8px] border border-[#d6dbe1] bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-black leading-5 text-[#111111]">API Key</h3>
                      <p className="text-[10px] font-semibold leading-3.5 text-[#4f5967]">Your OpenRouter key is stored securely.</p>
                    </div>
                  </div>

                  {status.connected ? (
                    <div className="mt-2.5">
                      <label className="text-[10px] font-black text-[#111111]" htmlFor="connected-key">
                        OpenRouter API key
                      </label>
                      <div className="mt-1 grid gap-1.5">
                        <input
                          className="h-9 min-w-0 rounded-[8px] border border-[#d6dbe1] bg-[#f8fafc] px-3 font-mono text-[12px] font-bold text-[#111111]"
                          id="connected-key"
                          readOnly
                          value={maskOpenRouterKey(status.last4)}
                        />
                        <button
                          className="h-8 rounded-[8px] border border-[#d6dbe1] bg-white px-3 text-[10px] font-black text-[#111111] transition hover:bg-[#f3f4f6] disabled:opacity-60"
                          disabled={testingKey}
                          onClick={() => void handleTestConnection()}
                          type="button"
                        >
                          {testingKey ? "Testing..." : "Test connection"}
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-black text-green-700">Connected</p>
                        {confirmingDisconnect ? (
                          <div className="flex items-center gap-2">
                            <button
                              className="h-7 rounded-[8px] bg-[#c0392b] px-3 text-[9px] font-black text-white disabled:opacity-60"
                              disabled={disconnecting}
                              onClick={() => void handleDisconnect()}
                              type="button"
                            >
                              {disconnecting ? "..." : "Disconnect"}
                            </button>
                            <button
                              className="text-[9px] font-black text-[#697386] hover:text-[#111111]"
                              disabled={disconnecting}
                              onClick={() => setConfirmingDisconnect(false)}
                              type="button"
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            className="h-7 rounded-[8px] border border-[#d6dbe1] bg-white px-3 text-[10px] font-black text-[#111111] transition hover:bg-[#f3f4f6]"
                            onClick={() => setConfirmingDisconnect(true)}
                            type="button"
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <ConnectKeyForm
                        preferredModel={DEFAULT_PREMIUM_MODEL}
                        onConnected={(last4) => {
                          setStatus({ connected: true, provider: "openrouter", last4, preferredModel: DEFAULT_PREMIUM_MODEL });
                          setMessage("OpenRouter key connected.");
                          setError("");
                          void loadUsage();
                        }}
                      />
                    </div>
                  )}

                  <div className="mt-auto rounded-[8px] bg-[#f7f2ec] px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 text-[10px] font-semibold leading-4 text-[#111111]">
                        <span className="font-black">Full Cerise products</span>
                        <br />
                        Add $10 credit to unlock.
                      </p>
                      <a
                        className="grid h-8 shrink-0 place-items-center rounded-[8px] bg-[#dfcfbd] px-4 text-[10px] font-black leading-none text-[#3a2b1f] no-underline transition hover:bg-[#d4bfa8]"
                        href="https://openrouter.ai/credits"
                        rel="noreferrer"
                        target="_blank"
                      >
                        Unlock
                      </a>
                    </div>
                  </div>
                </section>

                <UsageMeterCard guardrails={guardrails} guardrailUsage={guardrailUsage} usage={usage} />

                <section className="flex h-[268px] min-w-0 flex-col overflow-hidden rounded-[8px] border border-[#d6dbe1] bg-white p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-black leading-5 text-[#111111]">Product Routing</h3>
                      <p className="text-[10px] font-semibold leading-3.5 text-[#4f5967]">See which models Cerise uses for each product.</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#f3f4f6] px-2 py-1 text-[9px] font-black text-[#697386]">
                      Auto-optimized
                    </span>
                  </div>

                  <div className="mt-2">
                    <label className="text-[10px] font-black text-[#111111]" htmlFor="premium-model">
                      Premium model preference
                    </label>
                    <select
                      className="mt-1 h-7 w-full rounded-[8px] border border-[#d6dbe1] bg-white px-2 text-[10px] font-semibold text-[#111111] outline-none focus:border-[#111111] disabled:opacity-60"
                      disabled={!status.connected || savingModel}
                      id="premium-model"
                      onChange={(event) => void handleModelChange(event.target.value)}
                      value={selectedPremiumModel}
                    >
                      {PAID_MODEL_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <RoutingTable rows={routingRows} />
                </section>
              </div>
            ) : (
              <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
                <section className="min-w-0 self-start rounded-[8px] border border-[#d6dbe1] bg-white p-4">
                  <h3 className="text-[17px] font-black leading-6 text-[#111111]">Your own provider key</h3>
                  <p className="mt-1 text-[12px] font-semibold leading-5 text-[#4f5967]">
                    This path is for provider billing through OpenAI, Anthropic, or another supported provider. Cerise should only accept these keys once provider routing is implemented.
                  </p>
                  <label className="mt-4 block text-[12px] font-black text-[#111111]" htmlFor="provider">
                    Provider
                  </label>
                  <select
                    className="mt-2 h-10 w-full rounded-[8px] border border-[#d6dbe1] bg-[#f8fafc] px-3 text-[13px] font-semibold text-[#697386]"
                    disabled
                    id="provider"
                    value="openai"
                  >
                    {providerOptions.map((provider) => (
                      <option key={provider.value} value={provider.value}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                  <label className="mt-4 block text-[12px] font-black text-[#111111]" htmlFor="provider-api-key">
                    API key
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-[8px] border border-[#d6dbe1] bg-[#f8fafc] px-3 text-[13px] text-[#697386]"
                    disabled
                    id="provider-api-key"
                    placeholder="Provider-key connection is not enabled yet"
                  />
                  <p className="mt-4 rounded-[8px] bg-[#f8fafc] px-3 py-2 text-[12px] font-semibold leading-5 text-[#4f5967]">
                    Usage is billed through your provider. Cerise can track requests sent through a connected key after this backend path exists.
                  </p>
                </section>

                <section className="flex h-[268px] min-w-0 flex-col overflow-hidden rounded-[8px] border border-[#d6dbe1] bg-white p-3">
                  <h3 className="text-[17px] font-black leading-6 text-[#111111]">Provider routing</h3>
                  <p className="mt-1 text-[12px] font-semibold leading-5 text-[#4f5967]">
                    Routing options are disabled until a supported provider key is connected.
                  </p>
                  <RoutingTable rows={routingRows} />
                </section>
              </div>
            )}

            <UsageGuardrailsSection
              activeSource={activeSource}
              guardrails={guardrails}
              saving={savingGuardrails}
              usage={guardrailUsage}
              onChange={(next) => setGuardrails((current) => ({ ...current, ...next }))}
              onSave={() => void handleSaveGuardrails()}
            />

            {error && (
              <div className="rounded-[8px] border border-[#d6dbe1] bg-white px-3 py-2.5">
                <p className="text-[12px] font-semibold text-red-600" role="alert">
                  {error}
                </p>
              </div>
            )}

    <section className="flex flex-col gap-2 rounded-[8px] border border-[#d6dbe1] bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <h3 className="text-[13px] font-black text-[#111111]">Need help choosing?</h3>
                <p className="text-[11px] font-semibold text-[#4f5967]">Open the setup guide.</p>
              </div>
              <button
                className="h-8 rounded-[8px] border border-[#d6dbe1] bg-white px-3 text-[11px] font-black text-[#111111] transition hover:bg-[#f3f4f6]"
                onClick={() => setShowSetupGuide(true)}
                type="button"
              >
                View setup guide
              </button>
            </section>
          </div>
        )}
      </SettingsPanel>

      {showSetupGuide && <WelcomeAiPopup forceOpen onRequestClose={handleCloseSetupGuide} />}
    </>
  );
}

function UsageMeterCard({
  guardrails,
  guardrailUsage,
  usage,
}: {
  guardrails: UsageGuardrails;
  guardrailUsage: GuardrailUsage | null;
  usage: UsageStatus | null;
}) {
  const monthlyRequests = usage?.usedThisMonthTotal ?? 0;
  const dailyRequests = guardrailUsage?.dailyRequests ?? 0;
  const monthlyReference = Math.max(guardrails.dailyRequestAlert * 30, 1);
  const usagePercent = Math.min(100, Math.round((monthlyRequests / monthlyReference) * 100));
  const remainingRequests = Math.max(0, monthlyReference - monthlyRequests);
  const freeTestLimit = 50;
  const freeTestUsed = Math.min(dailyRequests, freeTestLimit);
  const isHigh = dailyRequests >= guardrails.dailyRequestAlert || usagePercent >= 90;
  const isWatch = !isHigh && (dailyRequests >= guardrails.dailyRequestAlert * 0.8 || usagePercent >= 70);
  const statusCopy = isHigh
    ? "High usage speed: close to your alert limit. Consider pausing premium requests."
    : isWatch
      ? "Usage pace is elevated today. Keep an eye on request activity."
      : "Healthy usage speed. No suggestion yet.";
  const donutStyle = {
    background: `conic-gradient(#111111 ${usagePercent * 3.6}deg, #eee3d6 0deg)`,
  };

  return (
    <section className="flex h-[268px] min-w-0 flex-col overflow-hidden rounded-[8px] border border-[#d6dbe1] bg-white p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] font-black leading-5 text-[#111111]">Usage Meter</h3>
          <p className="text-[10px] font-semibold leading-3.5 text-[#4f5967]">Track your API usage and credits.</p>
        </div>
        <a
          className="h-7 shrink-0 rounded-[8px] border border-[#d6dbe1] bg-white px-2.5 pt-1.5 text-[10px] font-black leading-none text-[#111111] no-underline transition hover:bg-[#f3f4f6]"
          href="https://openrouter.ai/credits"
          rel="noreferrer"
          target="_blank"
        >
          View details
        </a>
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col rounded-[8px] border border-[#e5e7eb] bg-white p-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-black text-[#111111]">This Month</p>
          <p className="text-[9px] font-semibold text-[#697386]">Resets monthly</p>
        </div>

        <div className="mt-2 grid min-h-0 grid-cols-[116px_minmax(0,1fr)] items-center gap-3">
          <div className="relative grid h-[108px] w-[108px] place-items-center rounded-full" style={donutStyle} aria-label={`Monthly request pace ${usagePercent}%`}>
            <div className="grid h-[86px] w-[86px] place-items-center rounded-full bg-white text-center">
              <p className="text-[15px] font-black leading-none text-[#111111]">{usagePercent}%</p>
              <p className="mt-0.5 text-[8px] font-semibold leading-3 text-[#697386]">of alert pace</p>
            </div>
          </div>

          <div className="grid min-w-0 gap-1.5 text-[10px]">
            <MeterLegendRow color="#111111" label="Used" value={`${monthlyRequests}`} />
            <MeterLegendRow color="#eee3d6" label="Remaining" value={`${remainingRequests}`} />
            <MeterLegendRow color="#d6dbe1" label="Monthly alert" value={`${monthlyReference}`} />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 rounded-[8px] bg-[#f8fafc] px-2 py-1.5 text-[#4f5967]">
          <p className="min-w-0 text-[9px] font-black leading-3.5">
            Free test limit: {freeTestUsed} / {freeTestLimit} uses today
            <br />
            {statusCopy}
          </p>
          <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-[#9aa4b2] text-[10px] font-black text-[#697386]">i</span>
        </div>
      </div>
    </section>
  );
}

function MeterLegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#eef1f4] pb-1 last:border-b-0 last:pb-0">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate font-semibold text-[#4f5967]">{label}</span>
      <span className="font-black text-[#111111]">{value}</span>
    </div>
  );
}

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function UsageGuardrailsSection({
  activeSource,
  guardrails,
  onChange,
  onSave,
  saving,
  usage,
}: {
  activeSource: ApiSource;
  guardrails: UsageGuardrails;
  onChange: (next: Partial<UsageGuardrails>) => void;
  onSave: () => void;
  saving: boolean;
  usage: GuardrailUsage | null;
}) {
  const isOpenRouter = activeSource === "openrouter";
  const alertDeliveryLabel =
    guardrails.alertEmail && guardrails.alertPortal
      ? "Email and Cerise Portal"
      : guardrails.alertEmail
        ? "Email only"
        : guardrails.alertPortal
          ? "Cerise Portal only"
          : "No alerts";

  return (
    <section className="min-w-0 rounded-[8px] border border-[#d6dbe1] bg-white p-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <h3 className="text-[15px] font-black leading-5 text-[#111111]">Usage Guardrails</h3>
            <p className="text-[11px] font-semibold leading-4 text-[#4f5967]">
              {isOpenRouter ? `OpenRouter billing final · credit alert ${formatCurrency(guardrails.monthlyCreditAlertCents)}` : "Request-count alerts; provider billing requires provider data"}
            </p>
          </div>
          <p className="mt-0.5 max-w-4xl text-[11px] font-semibold leading-4 text-[#697386]">
            {isOpenRouter
              ? "Set limits and alerts for API activity."
              : "Set request-count alerts for connected provider usage."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <p className="rounded-[8px] border border-[#e5e7eb] bg-[#f8fafc] px-3 py-1.5 text-[11px] font-semibold text-[#4f5967]">
            {usage?.dailyRequests ?? 0} today · {usage?.monthlyPremiumRequests ?? 0} premium
          </p>
          <button
            className="h-8 rounded-[8px] bg-black px-3 text-[11px] font-black text-white transition hover:bg-[#1f2933] disabled:opacity-60"
            disabled={saving}
            onClick={onSave}
            type="button"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="mt-2.5 grid min-w-0 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <GuardrailSelect
          description={isOpenRouter ? "Notify when monitored credit usage reaches" : "Provider billing is not estimated here"}
          label="Credit alert"
          value={String(guardrails.monthlyCreditAlertCents)}
          onChange={(value) => onChange({ monthlyCreditAlertCents: Number(value) })}
          options={[
            { value: "500", label: "$5.00" },
            { value: "1000", label: "$10.00" },
            { value: "2500", label: "$25.00" },
            { value: "5000", label: "$50.00" },
          ]}
        />
        <GuardrailSelect
          description="Alert me after"
          label="Daily request alert"
          value={String(guardrails.dailyRequestAlert)}
          onChange={(value) => onChange({ dailyRequestAlert: Number(value) })}
          options={[
            { value: "25", label: "25 requests/day" },
            { value: "50", label: "50 requests/day" },
            { value: "100", label: "100 requests/day" },
            { value: "250", label: "250 requests/day" },
            { value: "500", label: "500 requests/day" },
          ]}
        />
        <GuardrailSelect
          description="Premium-model alert"
          label="Premium usage"
          value={String(guardrails.premiumRequestAlert)}
          onChange={(value) => onChange({ premiumRequestAlert: Number(value) })}
          options={[
            { value: "10", label: "10 premium/month" },
            { value: "25", label: "25 premium/month" },
            { value: "50", label: "50 premium/month" },
            { value: "100", label: "100 premium/month" },
            { value: "250", label: "250 premium/month" },
          ]}
        />
        <GuardrailToggle
          checked={guardrails.unusualSpikeAlert}
          description="Warn if usage is much higher than normal"
          label="Unusual activity"
          onChange={(checked) => onChange({ unusualSpikeAlert: checked })}
        />
        <GuardrailDeliveryControl
          alertDeliveryLabel={alertDeliveryLabel}
          alertEmail={guardrails.alertEmail}
          alertPortal={guardrails.alertPortal}
          onChange={onChange}
        />
        <GuardrailToggle
          checked={guardrails.autoPausePremium}
          description="Temporarily stop premium requests at the request limits"
          label="Auto-pause premium"
          onChange={(checked) => onChange({ autoPausePremium: checked })}
        />
      </div>

    </section>
  );
}

function GuardrailSelect({
  description,
  label,
  onChange,
  options,
  value,
}: {
  description: string;
  label: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  value: string;
}) {
  return (
    <label className="block min-w-0 rounded-[8px] border border-[#e5e7eb] bg-[#fafbfc] p-2">
      <span className="text-[11px] font-black text-[#111111]">{label}</span>
      <span className="mt-0.5 block min-h-6 text-[10px] font-semibold leading-3.5 text-[#697386]">{description}</span>
      <select
        className="mt-1.5 h-8 w-full rounded-[8px] border border-[#d6dbe1] bg-white px-2 text-[11px] font-semibold text-[#111111] outline-none focus:border-[#111111]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function GuardrailToggle({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="min-w-0 rounded-[8px] border border-[#e5e7eb] bg-[#fafbfc] p-2">
      <p className="text-[11px] font-black text-[#111111]">{label}</p>
      <p className="mt-0.5 min-h-6 text-[10px] font-semibold leading-3.5 text-[#697386]">{description}</p>
      <button
        aria-pressed={checked}
        className={`mt-1.5 inline-flex h-5 w-9 items-center rounded-full p-0.5 transition ${
          checked ? "justify-end bg-black" : "justify-start bg-[#d6dbe1]"
        }`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
      </button>
      <span className="ml-1.5 text-[11px] font-semibold text-[#4f5967]">{checked ? "On" : "Off"}</span>
    </div>
  );
}

function GuardrailDeliveryControl({
  alertDeliveryLabel,
  alertEmail,
  alertPortal,
  onChange,
}: {
  alertDeliveryLabel: string;
  alertEmail: boolean;
  alertPortal: boolean;
  onChange: (next: Partial<UsageGuardrails>) => void;
}) {
  return (
    <div className="min-w-0 rounded-[8px] border border-[#e5e7eb] bg-[#fafbfc] p-2">
      <p className="text-[11px] font-black text-[#111111]">Alert delivery</p>
      <p className="mt-0.5 min-h-6 truncate text-[10px] font-semibold leading-3.5 text-[#697386]">{alertDeliveryLabel}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <label className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#111111]">
          <input
            checked={alertEmail}
            className="h-3 w-3 accent-black"
            onChange={(event) => onChange({ alertEmail: event.target.checked })}
            type="checkbox"
          />
          Email
        </label>
        <label className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#111111]">
          <input
            checked={alertPortal}
            className="h-3 w-3 accent-black"
            onChange={(event) => onChange({ alertPortal: event.target.checked })}
            type="checkbox"
          />
          Portal
        </label>
      </div>
    </div>
  );
}

function RoutingTable({ rows }: { rows: RoutingRow[] }) {
  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[8px] border border-[#d6dbe1]">
      <div className="hidden grid-cols-[1fr_0.68fr_0.78fr_0.8fr_0.9fr_0.62fr] bg-[#f8fafc] text-[8px] font-black uppercase leading-3 text-[#697386] min-[1180px]:grid">
        <span className="px-1.5 py-1.5">Product</span>
        <span className="px-1.5 py-1.5">Source</span>
        <span className="px-1.5 py-1.5">Model</span>
        <span className="px-1.5 py-1.5">Free</span>
        <span className="px-1.5 py-1.5">Style</span>
        <span className="px-1.5 py-1.5">Status</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {rows.map((row) => (
          <div
            className="grid gap-0.5 border-t border-[#e5e7eb] px-2 py-1.5 text-[10px] text-[#111111] first:border-t-0 min-[1180px]:grid-cols-[1fr_0.68fr_0.78fr_0.8fr_0.9fr_0.62fr] min-[1180px]:gap-0 min-[1180px]:px-0 min-[1180px]:py-0"
            key={`${row.product}-${row.source}`}
          >
            <span className="font-black leading-3.5 min-[1180px]:px-1.5 min-[1180px]:py-1.5">{row.product}</span>
            <span className="text-[#4f5967] min-[1180px]:px-1.5 min-[1180px]:py-1.5">{row.source}</span>
            <span className="text-[#4f5967] min-[1180px]:px-1.5 min-[1180px]:py-1.5">{row.model}</span>
            <span className="text-[#4f5967] min-[1180px]:px-1.5 min-[1180px]:py-1.5">{row.freeRouting}</span>
            <span className="text-[#4f5967] min-[1180px]:px-1.5 min-[1180px]:py-1.5">{row.style}</span>
            <span className="pt-0.5 min-[1180px]:px-1.5 min-[1180px]:py-1.5">
              <span className="rounded-full bg-[#f3f4f6] px-1.5 py-0.5 text-[8px] font-black text-[#697386]">{row.status}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
