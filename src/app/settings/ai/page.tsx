"use client";

// Settings → AI — the permanent home for the two AI lanes (replaces the old
// Local Setup page in the nav). See docs/byok-intake-design.md §1b.
// "Included — free" (default lane, fair-use allowance) vs "Your own key —
// unlimited" (BYOK). Only last4 + preference ever reach this page; the key
// itself stays encrypted server-side.

import { useCallback, useEffect, useState } from "react";
import ConnectKeyForm from "@/components/ai/ConnectKeyForm";
import WelcomeAiPopup from "@/components/ai/WelcomeAiPopup";
import SettingsPanel from "@/components/app-ui/SettingsPanel";
import Spinner from "@/components/ui/Spinner";
import { FREE_MODEL_OPTIONS, PAID_MODEL_OPTIONS } from "@/lib/ai/preferredModels";

const DEFAULT_CHAIN_VALUE = "";

type KeyStatus = {
  connected: boolean;
  last4?: string;
  preferredModel?: string | null;
};

// Shape of GET /api/ai/usage (docs/ai-usage-card-spec.md §Data contract) — only the
// fields this page renders are kept; `lane` is read from the key-status fetch instead
// since it decides which card renders (connected vs not).
type UsageStatus = {
  used: number;
  usedThisMonthTotal: number;
  allowance: number | null;
};

// Meter tone thresholds/colors (docs/ai-usage-card-spec.md): amber once usage exists,
// red-ish once the allowance is fully used.
const METER_AMBER = "#b6844e";
const METER_RED = "#c85f56";
const NEAR_LIMIT_THRESHOLD = 0.8;

export default function AiSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<KeyStatus>({ connected: false });
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [savingModel, setSavingModel] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  // Manual "View setup guide" reopen — mounts WelcomeAiPopup in forced mode
  // (see its forceOpen/onRequestClose props) so a user can revisit the
  // setup flow without touching the one-time localStorage welcome flag.
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  // Guards the auto-open below so it only ever fires once per page visit —
  // closing the guide must not bring it back until the page is re-mounted
  // (e.g. navigating away and back). The manual button is unaffected.
  const [hasAutoOpenedGuide, setHasAutoOpenedGuide] = useState(false);

  // Usage meter fetch — separate from key status since a failure here should never
  // block the "Included"/"Your own key" view from rendering. Kept out of the
  // try/catch below so a usage-endpoint hiccup can't mark the key-status fetch failed.
  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/usage", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as Partial<UsageStatus> & { error?: string };
      if (res.ok) {
        setUsage({
          used: typeof data.used === "number" ? data.used : 0,
          usedThisMonthTotal: typeof data.usedThisMonthTotal === "number" ? data.usedThisMonthTotal : 0,
          allowance: typeof data.allowance === "number" ? data.allowance : null,
        });
      }
    } catch {
      // Leave usage unset — the meter just won't render until the next refresh works.
    }
  }, []);

  // Pulled out of the mount effect so a successful connect from the manual
  // setup-guide view can refresh this page's key status afterwards, without
  // waiting for a full page reload. Also refreshes the usage meter (GET
  // /api/ai/usage) on every call so the two numbers never drift apart.
  const loadKeyStatus = useCallback(async (): Promise<KeyStatus | null> => {
    void loadUsage();
    try {
      const res = await fetch("/api/ai/key", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as KeyStatus & { error?: string };
      if (res.ok) {
        setStatus(data);
        return data;
      }
      return null;
    } catch {
      // Leave the "Included" view — the card below explains the default lane.
      return null;
    }
  }, [loadUsage]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await loadKeyStatus();
      if (cancelled) return;
      setLoading(false);
      // Auto-open the setup guide once per page visit for users with no key
      // connected yet — never for already-connected users. This only ever
      // runs from this mount effect, so it can't refire later on this same
      // page visit even after the user closes the popup.
      if (!hasAutoOpenedGuide && !data?.connected) {
        setHasAutoOpenedGuide(true);
        setShowSetupGuide(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: intentionally not re-running on hasAutoOpenedGuide changes.
  }, [loadKeyStatus]);

  const handleCloseSetupGuide = useCallback(() => {
    setShowSetupGuide(false);
    // Refresh status so a key connected from the manual guide view shows up
    // immediately (e.g. after a successful connect) without a manual reload.
    void loadKeyStatus();
  }, [loadKeyStatus]);

  async function handleModelChange(value: string) {
    const preferredModel = value === DEFAULT_CHAIN_VALUE ? null : value;
    setSavingModel(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/ai/key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredModel }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Saving the model choice failed. Please try again.");
        return;
      }
      setStatus((current) => ({ ...current, preferredModel }));
      setMessage("Model choice saved.");
    } catch {
      setError("Saving the model choice failed. Please check your connection and try again.");
    } finally {
      setSavingModel(false);
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
      setMessage("Key disconnected. You're back on the Included AI.");
    } catch {
      setError("Disconnect failed. Please check your connection and try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  // Meter math for the "Included — free" card — fraction of the allowance used
  // (capped at 1 for the bar width), and whether the near-limit CTA should show.
  const usageFraction =
    usage && usage.allowance ? Math.min(1, usage.used / usage.allowance) : 0;
  const usageNearLimit = usageFraction >= NEAR_LIMIT_THRESHOLD;
  const usageAtLimit = usageFraction >= 1;

  return (
    <>
      <SettingsPanel
        title="AI"
        description="Choose how your AI runs: included for free, or unlimited with your own key."
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowSetupGuide(true)}
                className="rounded-xl border border-[#e0cdb8] bg-white px-4 py-2 text-sm font-bold text-[#17120d] transition-colors hover:bg-[#f6efe4]"
              >
                View setup guide
              </button>
            </div>

            {/* Your AI plan */}
            <section className="rounded-xl border border-[#e8d8c6] bg-[#fbf6ef] p-5">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#8f6132]">Your AI plan</p>

              {status.connected ? (
                <>
                  <h3 className="mt-2 text-lg font-bold text-[#17120d]">Your own key — unlimited</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#4a4238]">
                    Every AI answer runs on your own OpenRouter account, with no allowance from us.
                  </p>
                  <p className="mt-3 inline-block rounded-full bg-[#f6efe4] px-3 py-1 font-mono text-sm font-bold text-[#8f6132]">
                    sk-or-••••{status.last4}
                  </p>
                  {usage && (
                    <p className="mt-2 text-sm font-semibold text-[#4a4238]">
                      <span className="font-mono font-bold text-[#17120d]">{usage.usedThisMonthTotal}</span> AI
                      requests this month · unlimited
                    </p>
                  )}

                  <div className="mt-4 max-w-md">
                    <label className="text-sm font-bold text-[#17120d]" htmlFor="preferred-model">
                      Preferred model
                    </label>
                    <select
                      id="preferred-model"
                      value={status.preferredModel ?? DEFAULT_CHAIN_VALUE}
                      onChange={(event) => void handleModelChange(event.target.value)}
                      disabled={savingModel}
                      className="mt-2 w-full rounded-xl border border-[#e8d8c6] bg-white px-4 py-3 text-sm text-[#17120d] outline-none focus:border-[#8f6132] disabled:opacity-60"
                    >
                      <option value={DEFAULT_CHAIN_VALUE}>Default — free model first, cheap fallback</option>
                      <optgroup label="Free models">
                        {FREE_MODEL_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Paid models">
                        {PAID_MODEL_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <p className="mt-2 text-xs leading-5 text-[#7a6a5a]">
                      Premium models cost more on your OpenRouter account. The default keeps things free-first.
                    </p>
                  </div>

                  <div className="mt-5">
                    {confirmingDisconnect ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm font-semibold text-[#4a4238]">
                          Disconnect this key? You&apos;ll switch back to the Included AI.
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleDisconnect()}
                          disabled={disconnecting}
                          className="rounded-xl bg-[#c0392b] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#a83228] disabled:opacity-60"
                        >
                          {disconnecting ? "Disconnecting..." : "Yes, disconnect"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDisconnect(false)}
                          disabled={disconnecting}
                          className="text-sm font-bold text-[#7a6a5a] underline-offset-4 hover:underline"
                        >
                          Keep my key
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingDisconnect(true)}
                        className="rounded-xl border border-[#e0cdb8] bg-white px-4 py-2 text-sm font-bold text-[#17120d] transition-colors hover:bg-[#f6efe4]"
                      >
                        Disconnect key
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="mt-2 text-lg font-bold text-[#17120d]">Included — free</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#4a4238]">
                    AI is included with your account at no cost, with a fair-use monthly allowance so it
                    stays free for everyone. No setup needed — it&apos;s already working.
                  </p>
                  {usage && usage.allowance !== null && (
                    <div className="mt-4 max-w-md">
                      <p className="text-sm font-semibold text-[#4a4238]">
                        <span className="font-mono font-bold text-[#17120d]">{usage.used}</span> of{" "}
                        <span className="font-mono font-bold text-[#17120d]">{usage.allowance}</span> requests
                        this month
                      </p>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e8d8c6]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${usageFraction * 100}%`,
                            backgroundColor: usageAtLimit ? METER_RED : METER_AMBER,
                          }}
                        />
                      </div>
                      {usageNearLimit && (
                        <p className="mt-2 text-xs font-semibold text-[#8f6132]">
                          Connect your own key for unlimited — takes 2 minutes.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {message && (
                <p className="mt-3 text-sm font-semibold text-green-700" role="status">
                  {message}
                </p>
              )}
              {error && (
                <p className="mt-3 text-sm leading-5 text-red-600" role="alert">
                  {error}
                </p>
              )}
            </section>

            {/* Connect a key (only while not connected) */}
            {!status.connected && (
              <section className="rounded-xl border border-[#e8d8c6] bg-white p-5">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#8f6132]">
                  Want unlimited?
                </p>
                <h3 className="mt-2 text-lg font-bold text-[#17120d]">Connect your own key</h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#4a4238]">
                  Paste an OpenRouter API key to remove the allowance and choose your own models —
                  free or premium, billed to your OpenRouter account. Takes about 2 minutes.
                </p>
                <div className="mt-4 max-w-md">
                  <ConnectKeyForm
                    onConnected={(last4) => {
                      setStatus({ connected: true, last4, preferredModel: null });
                      setMessage("");
                      setError("");
                    }}
                  />
                </div>
              </section>
            )}
          </div>
        )}
      </SettingsPanel>

      {showSetupGuide && <WelcomeAiPopup forceOpen onRequestClose={handleCloseSetupGuide} />}
    </>
  );
}
