"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Spinner from "@/components/ui/Spinner";
import { useConnectKey } from "@/components/ai/ConnectKeyForm";
import { PAID_MODEL_OPTIONS } from "@/lib/ai/preferredModels";

export const AI_WELCOME_SEEN_STORAGE_KEY = "cerise_ai_welcome_seen";

type View = "choice" | "openrouter" | "provider";

type WelcomeAiPopupProps = {
  forceOpen?: boolean;
  onRequestClose?: () => void;
};

function hasSeenWelcome() {
  try {
    return window.localStorage.getItem(AI_WELCOME_SEEN_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(AI_WELCOME_SEEN_STORAGE_KEY, "1");
  } catch {
    // Closing still works for this session if storage is unavailable.
  }
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M2 10s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5S2 10 2 10Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      {!visible && <path d="M3 3l14 14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />}
    </svg>
  );
}

function KeyField({
  disabled,
  onChange,
  onToggleShow,
  showKey,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  onToggleShow: () => void;
  showKey: boolean;
  value: string;
}) {
  return (
    <div className="relative">
      <input
        aria-label="OpenRouter API key"
        autoComplete="off"
        className="h-14 w-full rounded-[8px] border border-[#d6dbe1] bg-white px-5 pr-12 text-base text-[#111111] outline-none transition placeholder:text-[#7d8794] focus:border-[#111111] disabled:opacity-60"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste your OpenRouter API key here"
        spellCheck={false}
        type={showKey ? "text" : "password"}
        value={value}
      />
      <button
        aria-label={showKey ? "Hide API key" : "Show API key"}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#697386] transition hover:text-[#111111]"
        onClick={onToggleShow}
        type="button"
      >
        <EyeIcon visible={showKey} />
      </button>
    </div>
  );
}

function ChoiceCard({
  body,
  button,
  lines,
  onClick,
  title,
}: {
  body: string;
  button: string;
  lines: string[];
  onClick: () => void;
  title: string;
}) {
  return (
    <article className="flex min-h-[410px] flex-col rounded-[12px] border border-[#d6dbe1] bg-white p-8">
      <h3 className="text-[28px] font-black leading-tight text-[#050505]">{title}</h3>
      <p className="mt-5 text-lg leading-7 text-[#4f5967]">{body}</p>
      <div className="mt-9 flex-1 divide-y divide-[#d6dbe1] text-base font-semibold text-[#111111]">
        {lines.map((line) => (
          <p className="py-4 first:pt-0" key={line}>
            {line}
          </p>
        ))}
      </div>
      <button
        className="mt-7 h-16 rounded-[8px] bg-black px-6 text-xl font-black text-white transition hover:bg-[#1f2933]"
        onClick={onClick}
        type="button"
      >
        {button}
      </button>
    </article>
  );
}

function Steps() {
  const steps = [
    "Create your OpenRouter account.",
    "Generate your API key.",
    "Paste the key into Cerise and test limited usage.",
    "Add $10 credit when you want full Cerise usage.",
  ];

  return (
    <div className="rounded-[12px] border border-[#d6dbe1] bg-white p-8">
      <h3 className="text-[26px] font-black text-[#050505]">How OpenRouter setup works</h3>
      <ol className="mt-9 divide-y divide-[#d6dbe1]">
        {steps.map((step, index) => (
          <li className="flex items-center gap-7 py-7 first:pt-0 last:pb-0" key={step}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eef0f3] text-xl font-black text-[#111111]">
              {index + 1}
            </span>
            <span className="text-xl font-semibold leading-7 text-[#111111]">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function WelcomeAiPopup({ forceOpen, onRequestClose }: WelcomeAiPopupProps) {
  const isForced = forceOpen !== undefined;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("choice");
  const [showKey, setShowKey] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const { key, setKey, connecting, error, setError, connected, connect } = useConnectKey();
  const qwenDefault = PAID_MODEL_OPTIONS[0]?.id ?? null;

  useEffect(() => {
    if (isForced) return;
    let openTimer: number | null = null;
    if (!hasSeenWelcome()) {
      openTimer = window.setTimeout(() => setOpen(true), 0);
    }
    return () => {
      if (openTimer !== null) window.clearTimeout(openTimer);
    };
  }, [isForced]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const close = useCallback(() => {
    if (isForced) {
      onRequestClose?.();
      return;
    }
    markSeen();
    setOpen(false);
  }, [isForced, onRequestClose]);

  const skip = useCallback(() => {
    close();
    if (!isForced) setShowReminder(true);
  }, [close, isForced]);

  const visible = isForced ? !!forceOpen : open;

  useEffect(() => {
    if (!visible) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, close]);

  async function handleOpenRouterConnect() {
    if (!key.trim()) {
      skip();
      return;
    }

    const result = await connect(qwenDefault);
    if (result.ok) {
      closeTimerRef.current = window.setTimeout(close, 900);
    }
  }

  function reopenFromReminder() {
    setShowReminder(false);
    setView("choice");
    setOpen(true);
  }

  return (
    <>
      {visible && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#f2f4f7]/90 px-4 py-6 backdrop-blur-md">
          <section
            aria-labelledby="ai-welcome-title"
            aria-modal="true"
            className="relative flex max-h-[92vh] w-full max-w-[1120px] flex-col overflow-y-auto rounded-[20px] border border-[#d6dbe1] bg-white px-8 py-9 shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:px-12"
            role="dialog"
          >
            <button
              aria-label="Close setup"
              className="absolute right-6 top-5 text-sm font-bold text-[#697386] transition hover:text-[#111111]"
              onClick={close}
              type="button"
            >
              Close
            </button>

            <header className="mx-auto max-w-[920px] text-center">
              <p className="text-base font-bold uppercase tracking-[0.2em] text-[#697386]">Power your research</p>
              <h2
                className="mt-5 text-[44px] font-black leading-none tracking-normal text-[#050505] sm:text-[56px]"
                id="ai-welcome-title"
              >
                {view === "openrouter" ? "Connect your OpenRouter API key" : "Connect your own API key"}
              </h2>
              <p className="mt-6 text-xl leading-8 text-[#697386]">
                {view === "choice"
                  ? "Choose how you want Cerise to access AI models. You can adjust routing later in Settings."
                  : view === "openrouter"
                    ? "Use OpenRouter to test Cerise first, then add credit later to unlock full usage."
                    : "Use a key from your own provider. Cerise will handle orchestration across products automatically."}
              </p>
            </header>

            {view === "choice" && (
              <>
                <div className="mx-auto mt-10 grid w-full max-w-[960px] gap-8 md:grid-cols-2">
                  <ChoiceCard
                    body="Use OpenRouter to test Cerise first, then add credit when you are ready for full usage."
                    button="OpenRouter setup"
                    lines={[
                      "Limited testing first",
                      "Add $10 credit to unlock full Cerise usage",
                      "Qwen3 32B is the default premium model",
                      "Cerise manages model orchestration automatically",
                    ]}
                    onClick={() => setView("openrouter")}
                    title="OpenRouter API key"
                  />
                  <ChoiceCard
                    body="Connect a key from your own provider, such as OpenAI or Anthropic. Cerise handles orchestration across products."
                    button="Your own API key setup"
                    lines={[
                      "Use your own provider billing",
                      "Works with supported models like GPT-5 Mini or Claude Haiku",
                      "Cerise routes models across products automatically",
                      "Routing can be adjusted later in Settings",
                    ]}
                    onClick={() => setView("provider")}
                    title="Your own API key"
                  />
                </div>
                <footer className="mx-auto mt-9 flex w-full max-w-[960px] items-center justify-between border-t border-[#d6dbe1] pt-6">
                  <p className="text-base font-semibold text-[#697386]">You can change or add API keys anytime in Settings.</p>
                  <button className="text-base font-black text-[#697386] transition hover:text-[#111111]" onClick={skip} type="button">
                    Skip for now
                  </button>
                </footer>
              </>
            )}

            {view === "openrouter" && (
              <>
                <div className="mx-auto mt-10 grid w-full max-w-[960px] gap-8 md:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[12px] border border-[#d6dbe1] bg-white p-8">
                    <h3 className="text-[28px] font-black text-[#050505]">API key</h3>
                    <div className="mt-6">
                      <KeyField
                        disabled={connecting}
                        onChange={(value) => {
                          setKey(value);
                          if (error) setError("");
                        }}
                        onToggleShow={() => setShowKey((current) => !current)}
                        showKey={showKey}
                        value={key}
                      />
                    </div>
                    <h4 className="mt-9 text-xl font-black text-[#050505]">What this setup gives you</h4>
                    <ul className="mt-5 list-disc space-y-3 pl-6 text-lg leading-7 text-[#697386]">
                      <li>About 50 free OpenRouter test uses per day</li>
                      <li>Cerise Scholar may use that up faster because research tasks are heavier</li>
                      <li>Cerise handles orchestration automatically</li>
                      <li>No manual free-model routing here</li>
                    </ul>
                    <p className="mt-6 rounded-[8px] bg-[#f3f4f6] px-5 py-4 text-lg font-semibold leading-7 text-[#1f2933]">
                      Add $10 credit later to unlock full Cerise products and raise OpenRouter usage to about 1,000/day.
                    </p>
                    {connected ? (
                      <p className="mt-6 rounded-[8px] border border-green-200 bg-green-50 px-5 py-4 text-base font-black text-green-700">
                        Connected. Your OpenRouter key is ready.
                      </p>
                    ) : (
                      <>
                        {error && (
                          <p className="mt-4 text-sm font-semibold leading-5 text-red-600" role="alert">
                            {error}
                          </p>
                        )}
                        <button
                          className="mt-6 flex h-16 w-full items-center justify-center gap-3 rounded-[8px] bg-black px-6 text-xl font-black text-white transition hover:bg-[#1f2933] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={connecting}
                          onClick={() => void handleOpenRouterConnect()}
                          type="button"
                        >
                          {connecting ? (
                            <>
                              <Spinner size="sm" />
                              Checking key...
                            </>
                          ) : (
                            "Continue with OpenRouter"
                          )}
                        </button>
                      </>
                    )}
                  </div>
                  <Steps />
                </div>
                <footer className="mx-auto mt-9 flex w-full max-w-[960px] items-center justify-between border-t border-[#d6dbe1] pt-6">
                  <button className="text-base font-black text-[#697386] transition hover:text-[#111111]" onClick={() => setView("choice")} type="button">
                    Back
                  </button>
                  <p className="text-base font-semibold text-[#697386]">
                    $10 credit can last around 10-11 months for normal usage.
                  </p>
                </footer>
              </>
            )}

            {view === "provider" && (
              <>
                <div className="mx-auto mt-10 grid w-full max-w-[960px] gap-8 md:grid-cols-[0.95fr_1.05fr]">
                  <aside className="rounded-[12px] bg-[#1f2732] p-8 text-white">
                    <h3 className="text-[28px] font-black">Use your own provider</h3>
                    <p className="mt-5 text-lg font-semibold leading-8 text-white/85">
                      Buy the key directly from your provider, then connect it to Cerise. Cerise will use supported
                      models from that provider and route them across products for you.
                    </p>
                    <div className="my-9 border-t border-white/20" />
                    <p className="text-lg font-black">This path is best if you want:</p>
                    <ul className="mt-5 list-disc space-y-3 pl-5 text-lg leading-7 text-white/85">
                      <li>Your own provider billing</li>
                      <li>Supported models like GPT-5 Mini or Claude Haiku</li>
                      <li>Automatic orchestration across Cerise products</li>
                    </ul>
                  </aside>
                  <div className="rounded-[12px] border border-[#d6dbe1] bg-white p-8">
                    <label className="text-lg font-semibold text-[#111111]" htmlFor="provider-select">
                      Provider
                    </label>
                    <select
                      className="mt-4 h-16 w-full rounded-[8px] border border-[#d6dbe1] bg-white px-5 text-xl font-semibold text-[#111111]"
                      disabled
                      id="provider-select"
                      value="openai"
                    >
                      <option value="openai">OpenAI</option>
                    </select>
                    <label className="mt-9 block text-lg font-semibold text-[#111111]" htmlFor="provider-key">
                      API key
                    </label>
                    <input
                      className="mt-4 h-16 w-full rounded-[8px] border border-[#d6dbe1] bg-[#f8fafc] px-5 text-lg text-[#697386]"
                      disabled
                      id="provider-key"
                      placeholder="Available after provider-key backend support"
                    />
                    <p className="mt-5 text-base leading-7 text-[#697386]">
                      Provider-key routing needs backend support before Cerise can safely validate or store these keys.
                      Use OpenRouter for the current working setup.
                    </p>
                    <button
                      className="mt-8 h-16 w-full cursor-not-allowed rounded-[8px] bg-[#cfd5dd] px-6 text-xl font-black text-white"
                      disabled
                      type="button"
                    >
                      Provider key setup coming soon
                    </button>
                  </div>
                </div>
                <footer className="mx-auto mt-9 flex w-full max-w-[960px] items-center justify-between border-t border-[#d6dbe1] pt-6">
                  <button className="text-base font-black text-[#697386] transition hover:text-[#111111]" onClick={() => setView("choice")} type="button">
                    Back
                  </button>
                  <p className="text-base font-semibold text-[#697386]">
                    You can adjust orchestration preferences later in Settings.
                  </p>
                </footer>
              </>
            )}
          </section>
        </div>
      )}

      {showReminder && (
        <div className="fixed bottom-6 right-6 z-[90] w-[min(360px,calc(100vw-32px))] rounded-[16px] border border-[#d6dbe1] bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-md">
          <p className="text-base font-black text-[#111111]">Your API key setup is still pending.</p>
          <p className="mt-2 text-sm leading-6 text-[#697386]">
            Connect a key when you are ready to start using Cerise products.
          </p>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button className="text-sm font-black text-[#697386] transition hover:text-[#111111]" onClick={() => setShowReminder(false)} type="button">
              Maybe later
            </button>
            <button className="rounded-[8px] bg-black px-4 py-2 text-sm font-black text-white" onClick={reopenFromReminder} type="button">
              Set up now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
