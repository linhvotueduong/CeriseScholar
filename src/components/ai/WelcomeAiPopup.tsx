"use client";

// Post-signup welcome popup — matches the founder's v3 (monochrome) mockup:
// a Landing view with two comparison cards (free vs. paid), and two detail
// "setup" views (Free / Paid) that each host the actual connect-key flow.
// Shown ONCE per browser — the localStorage flag below is set on ANY
// dismissal (Skip, Continue-with-empty-key, Escape, X close, or a
// successful connect), from any of the three views.
//
// Design language: monochrome minimal — "black" maps to the app's ink
// (#1a1208) against paper-white surfaces, a small letterspaced eyebrow, one
// bold clean headline, hairline dividers, and full-width rounded-full pill
// CTAs. No decorative icons anywhere; the only glyphs are functional (X
// close, eye show/hide, a tiny lock next to the "stays encrypted"
// microcopy). Arrows (→ / ↗) are plain text inside button/link labels.
//
// v3 drops the "← Back" link that earlier versions had between the header
// and the subtitle — the Free API / Paid API pill toggle plus the X close
// are the only navigation the mockup uses, so there is no way back to the
// landing view once you've picked a tab (closing and reopening the popup
// isn't possible either in the default, prop-less usage, since the
// localStorage flag is sticky — this is intentional per the mockup, not an
// oversight).
//
// Manual reopen (optional `forceOpen`/`onRequestClose` props): Settings → AI
// has a "View setup guide" button that mounts this component with
// `forceOpen` set, so a user can revisit the popup on demand. In that mode
// visibility is fully driven by `forceOpen` instead of the localStorage
// flag, and every dismissal path calls `onRequestClose()` instead of
// writing the flag — a manual viewing must not consume the one-time
// auto-show for someone who hasn't seen it yet, nor re-arm it for someone
// who has. See the prop-level comment below for the exact contract.
//
// The Free view has no model picker or provider selector at all — it always
// connects with no preferredModel, so the server's default free-first chain
// picks (and rotates through) a model on the user's behalf. Only the Paid
// view exposes a model dropdown, pre-selected to the cheapest/top-ranked
// paid model. Settings → AI keeps the full grouped dropdown for users who
// want to pick a specific model later.
//
// The API-key connect flow (POST + optional PATCH) is shared with the
// Settings → AI page via the `useConnectKey` hook exported from
// ConnectKeyForm.tsx — only the layout here is custom, per the mockup.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useConnectKey } from "@/components/ai/ConnectKeyForm";
import { PAID_MODEL_OPTIONS } from "@/lib/ai/preferredModels";

export const AI_WELCOME_SEEN_STORAGE_KEY = "cerise_ai_welcome_seen";

type View = "landing" | "free" | "paid";
type Tone = "light" | "dark";

// Display-only pricing for the paid model rows — the model IDs/labels
// themselves come from the shared allowlist (preferredModels.ts) so the
// dropdown and the rows never disagree on what a model is called. Priced
// per 1M input tokens (NOT per 1K — OpenRouter, like the rest of the
// industry, quotes per-million; a per-1K figure would be a 1000x error).
const PAID_MODEL_PRICING: Record<string, { price: string; bestValue?: boolean }> = {
  "qwen/qwen3-32b": { price: "~$0.08 / 1M tokens", bestValue: true },
  "openai/gpt-5-mini": { price: "~$0.25 / 1M tokens" },
  "anthropic/claude-haiku-4.5": { price: "~$1.00 / 1M tokens" },
  "mistralai/mistral-small-2603": { price: "~$0.15 / 1M tokens" },
};

// Short, muted one-liners naming each paid model's specific edge — answers
// "what's each paid model's advantage?" right on the row, next to the price.
const PAID_MODEL_TAGS: Record<string, string> = {
  "qwen/qwen3-32b": "Best value · sharp formatting",
  "openai/gpt-5-mini": "Most consistent strict formatting",
  "anthropic/claude-haiku-4.5": "Best writing quality",
  "mistralai/mistral-small-2603": "Strict EU data privacy",
};

const PAID_MODEL_ROWS = PAID_MODEL_OPTIONS.map((option) => ({
  ...option,
  ...PAID_MODEL_PRICING[option.id],
  tag: PAID_MODEL_TAGS[option.id],
}));

// Numbered step content for the "how to get your key" panels. Plain data
// (no icons) — rendered by <StepsList>, which supplies the numeral.
const FREE_STEPS: ReactNode[] = [
  <>
    Create a free account at{" "}
    <a
      href="https://openrouter.ai"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-[#8f6132] underline-offset-4 hover:underline"
    >
      openrouter.ai ↗
    </a>
  </>,
  <>
    Go to{" "}
    <a
      href="https://openrouter.ai/keys"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-[#8f6132] underline-offset-4 hover:underline"
    >
      Keys → Create Key ↗
    </a>
  </>,
  <>Copy the key — it&apos;s shown only once. Save it somewhere safe.</>,
  <>When asked for a payment method, choose &ldquo;I&apos;ll do this later&rdquo; (free models don&apos;t need a card).</>,
  <>Optional: add $10 credits once to raise free-model limits from 50/day to 1,000/day.</>,
];

// The Paid view's 4 steps are plain (no links) — the link line with
// openrouter.ai/keys and /credits is rendered separately, right below them.
const PAID_STEPS: ReactNode[] = [
  <>Add your API key below.</>,
  <>Choose a model on the right.</>,
  <>We&apos;ll verify your key.</>,
  <>Start using premium models.</>,
];

function hasSeenWelcome() {
  try {
    return window.localStorage.getItem(AI_WELCOME_SEEN_STORAGE_KEY) === "1";
  } catch {
    // If localStorage is unavailable, never show — an unclosable-on-refresh
    // popup would be worse than not showing a one-time welcome.
    return true;
  }
}

// Open eye when the key is visible (click to hide); slashed eye when masked
// (click to reveal) — the usual show/hide-password convention.
function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path
        d="M2 10s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5S2 10 2 10Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      {!visible && <path d="M3 3l14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />}
    </svg>
  );
}

// Tiny functional lock glyph — used only next to the "stays encrypted"
// microcopy on the Free setup view, per the founder's icon-minimalism note.
function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none">
      <rect x="3.5" y="7" width="9" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// Plain numbered steps — muted numeral, regular text, generous leading, no
// boxes around the list. `tone` swaps the palette for the Paid view's dark
// panel vs. the Free view's paper-white card.
function StepsList({ steps, tone = "light" }: { steps: ReactNode[]; tone?: Tone }) {
  const numeralClass = tone === "dark" ? "font-bold text-white/55" : "font-bold text-[#8f6132]";
  const bodyClass = tone === "dark" ? "text-white/80" : "text-[#4a4238]";
  return (
    <ol className="space-y-3 text-xs leading-6">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-2">
          <span className={numeralClass}>{index + 1}.</span>
          <span className={bodyClass}>{step}</span>
        </li>
      ))}
    </ol>
  );
}

// Plain stacked text lines — no bullets, no icons, generous spacing. Used
// for the three comparison points on each Landing-view card.
function PlainLines({ lines, tone }: { lines: string[]; tone: Tone }) {
  return (
    <div className={`space-y-3 text-sm leading-relaxed ${tone === "dark" ? "text-white/80" : "text-[#4a4238]"}`}>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

// Shared password-style key field with a show/hide toggle. `tone` switches
// between the paper-white styling (Free view) and the dark-panel styling
// (Paid view) called out in the v3 mockup.
function KeyField({
  id,
  value,
  onChange,
  placeholder,
  showKey,
  onToggleShow,
  disabled,
  tone,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  showKey: boolean;
  onToggleShow: () => void;
  disabled: boolean;
  tone: Tone;
}) {
  const fieldClass =
    tone === "dark"
      ? "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 pr-11 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/50 disabled:opacity-60"
      : "w-full rounded-xl border border-[#e8d8c6] bg-white px-4 py-3 pr-11 text-sm text-[#17120d] outline-none placeholder:text-[#a89a88] focus:border-[#8f6132] disabled:opacity-60";
  const eyeClass =
    tone === "dark"
      ? "absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/60 transition-colors hover:text-white"
      : "absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#7a6a5a] transition-colors hover:text-[#1a1208]";

  return (
    <div className="relative">
      <input
        id={id}
        type={showKey ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-label="Your OpenRouter API key"
        disabled={disabled}
        className={fieldClass}
      />
      <button
        type="button"
        onClick={onToggleShow}
        aria-label={showKey ? "Hide API key" : "Show API key"}
        className={eyeClass}
      >
        <EyeIcon visible={showKey} />
      </button>
    </div>
  );
}

const ENCRYPTION_FOOTER_LINE = "Your API key is encrypted — never stored in plain text, never shared.";

type WelcomeAiPopupProps = {
  // When provided (even as `false`), visibility is fully controlled by this
  // prop instead of the localStorage "seen" flag — the popup shows exactly
  // when `forceOpen` is true, and flips open/closed as the prop changes
  // (e.g. reopening on a later false→true transition, or a fresh mount).
  // Used by the "View setup guide" manual-reopen button on Settings → AI.
  forceOpen?: boolean;
  // Called on every dismissal path while `forceOpen` is set: X close,
  // Escape, "Skip for now", empty-key Continue, and after a successful
  // connect's ~1.2s success state. Not called in the default (prop-less)
  // mode, which manages its own open/closed state instead.
  onRequestClose?: () => void;
};

export default function WelcomeAiPopup({ forceOpen, onRequestClose }: WelcomeAiPopupProps) {
  // Forced (manual) mode is on whenever `forceOpen` is passed at all — even
  // `forceOpen={false}` opts into prop-controlled visibility, per the
  // "fully controlled by it" contract above.
  const isForced = forceOpen !== undefined;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("landing");
  // Only the Paid view exposes a model picker — the Free view always uses
  // the server's default free-first chain (no choice to make).
  const [paidModel, setPaidModel] = useState(PAID_MODEL_OPTIONS[0].id);
  const [showKey, setShowKey] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const { key, setKey, connecting, error, setError, connected, connect } = useConnectKey();

  useEffect(() => {
    // Forced mode never consults (or needs) the one-time localStorage flag —
    // visibility comes entirely from the `forceOpen` prop instead.
    if (isForced) return;
    // Open on the next tick (not synchronously in the effect body) — checks the
    // one-time flag after hydration, so the server and first client render agree.
    let openTimer: number | null = null;
    if (!hasSeenWelcome()) {
      openTimer = window.setTimeout(() => setOpen(true), 0);
    }
    return () => {
      if (openTimer !== null) window.clearTimeout(openTimer);
    };
  }, [isForced]);

  // Clears any pending post-success close timer on unmount, regardless of mode.
  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const close = useCallback(() => {
    if (isForced) {
      // Manual viewing must not consume the one-time auto-show for a user
      // who hasn't seen it yet, and must not re-arm anything for a user who
      // has — so the seen-flag is never touched here.
      onRequestClose?.();
      return;
    }
    try {
      window.localStorage.setItem(AI_WELCOME_SEEN_STORAGE_KEY, "1");
    } catch {
      // Closing still works for this session even if the flag can't persist.
    }
    setOpen(false);
  }, [isForced, onRequestClose]);

  const visible = isForced ? !!forceOpen : open;

  useEffect(() => {
    if (!visible) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, close]);

  async function handleContinue() {
    // Empty key = same as Skip, per the mockup ("if key field empty →
    // behaves like Skip").
    if (!key.trim()) {
      close();
      return;
    }
    // Free view: no preferredModel is sent — the server's default free-first
    // chain picks (and rotates through) the model. Paid view: send the
    // selected model so it's saved as the user's preference.
    const result = await connect(view === "paid" ? paidModel : undefined);
    if (result.ok) {
      // Let the green "Connected — unlimited AI ✓" state land, then close.
      closeTimerRef.current = window.setTimeout(close, 1200);
    }
    // On failure, `error` is already set by the hook and rendered inline —
    // the modal stays open.
  }

  if (!visible) return null;

  const connectedBanner = (
    <p
      className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700"
      role="status"
    >
      Connected — unlimited AI ✓
    </p>
  );

  const footerLeftText =
    view === "paid"
      ? "The recommended models are based on quality and reliability — no sponsorship involved."
      : ENCRYPTION_FOOTER_LINE;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1a1208]/65 px-4 py-6 backdrop-blur-sm">
      <section
        aria-labelledby="ai-welcome-title"
        aria-modal="true"
        role="dialog"
        className="relative flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-y-auto rounded-[24px] border border-[#e8d8c6] bg-white px-6 py-6 shadow-[0_24px_70px_rgba(26,18,8,0.26)] sm:px-8 sm:py-7"
      >
        {/* Header — shared across all three views. The X sits above the
            Free/Paid pill toggle, both right-aligned; the title (which
            changes per view) sits on the left. */}
        <div className="flex items-start justify-between gap-4">
          <h2 id="ai-welcome-title" className="leading-tight text-[#1a1208]">
            <span className="block text-[11px] font-normal uppercase tracking-[0.22em] text-[#8f6132]">
              Power your research
            </span>
            <span className="font-display mt-2 block text-2xl font-bold sm:text-[28px]">
              {view === "paid" ? "By your own API key" : "Connect your own API key"}
            </span>
          </h2>
          <div className="flex shrink-0 flex-col items-end gap-3">
            <button
              type="button"
              onClick={close}
              aria-label="Close welcome"
              className="flex h-7 w-7 items-center justify-center text-[#7a6a5a] transition-colors hover:text-[#1a1208]"
            >
              <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
                <path
                  d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.8"
                />
              </svg>
            </button>
            <div role="group" aria-label="AI provider options" className="flex gap-1 rounded-full bg-[#f6efe4] p-1">
              <button
                type="button"
                aria-pressed={view === "free"}
                onClick={() => setView("free")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors sm:text-sm ${
                  view === "free" ? "bg-white text-[#17120d] shadow-sm" : "text-[#7a6a5a] hover:text-[#17120d]"
                }`}
              >
                Free API
              </button>
              <button
                type="button"
                aria-pressed={view === "paid"}
                onClick={() => setView("paid")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors sm:text-sm ${
                  view === "paid" ? "bg-white text-[#17120d] shadow-sm" : "text-[#7a6a5a] hover:text-[#17120d]"
                }`}
              >
                Paid API
              </button>
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#4a4238]">
          {view === "landing" &&
            "Bring your own key to unlock models. You pay the provider directly. Skipping keeps you on Cerise's built-in free AI."}
          {view === "free" && "Use free models from OpenRouter — no card required."}
          {view === "paid" && "Use your own paid key for stronger models."}
        </p>

        {/* VIEW 1 — Landing: two comparison cards, light (free) + dark (paid) */}
        {view === "landing" && (
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex h-full flex-col rounded-xl border border-[#e8d8c6] bg-white p-5">
              <p className="font-display text-xl font-bold text-[#1a1208]">OpenRouter</p>
              <p className="mt-1 text-sm text-[#7a6a5a]">Access free open models</p>
              <div className="mt-4 border-t border-[#efe3d3]" />
              <div className="mt-4 flex-1">
                <PlainLines
                  tone="light"
                  lines={["Best for getting started", "No card required · free daily limits", "Cerise picks the best free model"]}
                />
              </div>
              <button
                type="button"
                onClick={() => setView("free")}
                aria-label="Free setup suggestion"
                className="mt-5 w-full rounded-full bg-[#1a1208] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-black"
              >
                Free setup suggestion
              </button>
            </div>

            <div className="flex h-full flex-col rounded-xl bg-[#1a1208] p-5 text-white">
              <p className="font-display text-xl font-bold">OpenRouter + premium models</p>
              <p className="mt-1 text-sm text-white/70">Access premium models with more control</p>
              <div className="mt-4 border-t border-white/15" />
              <div className="mt-4 flex-1">
                <PlainLines
                  tone="dark"
                  lines={["No daily caps — pay per use", "More reliable at peak times", "Stronger writing quality"]}
                />
              </div>
              <button
                type="button"
                onClick={() => setView("paid")}
                aria-label="Paid setup suggestion"
                className="mt-5 w-full rounded-full bg-white px-5 py-3 text-sm font-bold text-[#1a1208] transition-colors hover:bg-[#f2ece2]"
              >
                Paid setup suggestion
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2 — Free setup: key form (left) + how-to steps (right) */}
        {view === "free" && (
          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col rounded-xl border border-[#e8d8c6] bg-white p-5">
              <p className="font-display text-lg font-bold text-[#1a1208]">Start with free models</p>
              <p className="mt-2 text-sm leading-relaxed text-[#4a4238]">
                Paste your OpenRouter API key to unlock hundreds of free, open models.
              </p>
              <div className="mt-4 border-t border-[#e8d8c6]" />

              {connected ? (
                <div className="mt-4">{connectedBanner}</div>
              ) : (
                <>
                  <div className="mt-4">
                    <label className="text-xs font-bold text-[#7a6a5a]" htmlFor="ai-welcome-key-input-free">
                      API Key
                    </label>
                    <div className="mt-1.5">
                      <KeyField
                        id="ai-welcome-key-input-free"
                        value={key}
                        onChange={(value) => {
                          setKey(value);
                          if (error) setError("");
                        }}
                        placeholder="Paste your API key here"
                        showKey={showKey}
                        onToggleShow={() => setShowKey((current) => !current)}
                        disabled={connecting}
                        tone="light"
                      />
                    </div>
                  </div>

                  <p className="mt-3 flex items-center gap-1.5 text-xs leading-5 text-[#7a6a5a]">
                    <LockIcon />
                    Your key stays encrypted on your account.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#7a6a5a]">
                    Free models share daily limits and can be busy at peak — premium removes both.
                  </p>

                  {error && (
                    <p className="mt-3 text-sm leading-5 text-red-600" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleContinue()}
                    disabled={connecting}
                    aria-label="Connect free key"
                    className="mt-5 w-full rounded-full bg-[#1a1208] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {connecting ? "Connecting..." : "Connect free key →"}
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-col">
              <p className="text-xs font-bold uppercase tracking-wide text-[#8f6132]">How to get your key</p>
              <div className="mt-3">
                <StepsList steps={FREE_STEPS} tone="light" />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3 — Paid setup: one full-width dark panel, two columns + form */}
        {view === "paid" && (
          <div className="mt-5 rounded-xl bg-[#1a1208] p-5 text-white sm:p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p className="font-display text-lg font-bold">Unlock premium models</p>
                <p className="mt-1 text-sm text-white/70">More power, more control.</p>
                <div className="mt-4">
                  <StepsList steps={PAID_STEPS} tone="dark" />
                </div>
                <p className="mt-4 text-[11px] leading-5 text-white/50">
                  Need a key? Create one at{" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-white/80 underline-offset-4 hover:underline"
                  >
                    openrouter.ai/keys ↗
                  </a>{" "}
                  then{" "}
                  <a
                    href="https://openrouter.ai/credits"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-white/80 underline-offset-4 hover:underline"
                  >
                    add credits ↗
                  </a>
                </p>
              </div>

              <div>
                <p className="font-display text-lg font-bold">Recommended models</p>
                <p className="mt-1 text-sm text-white/70">
                  All models run every Cerise feature — pricier ones add polish and reliability.
                </p>
                <div className="mt-4 space-y-2">
                  {PAID_MODEL_ROWS.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2.5"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">
                          {row.label}
                          {row.bestValue && (
                            <span className="ml-1.5 rounded-full border border-[#c9a227]/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#e4c869]">
                              Our pick
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 text-[11px] text-white/70">{row.tag}</span>
                      </div>
                      <span className="whitespace-nowrap text-xs text-white/60">{row.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-white/15 pt-5">
              {connected ? (
                connectedBanner
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold text-white/70" htmlFor="ai-welcome-provider-select">
                        Provider
                      </label>
                      <select
                        id="ai-welcome-provider-select"
                        value="openrouter"
                        disabled
                        aria-label="AI provider"
                        className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/60 outline-none"
                      >
                        <option value="openrouter">OpenRouter</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-white/70" htmlFor="ai-welcome-model-select">
                        Model
                      </label>
                      <select
                        id="ai-welcome-model-select"
                        value={paidModel}
                        onChange={(event) => setPaidModel(event.target.value)}
                        disabled={connecting}
                        aria-label="Model"
                        className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:border-white/50 disabled:opacity-60"
                      >
                        {PAID_MODEL_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id} className="text-[#1a1208]">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs font-bold text-white/70" htmlFor="ai-welcome-key-input-paid">
                      API key
                    </label>
                    <div className="mt-1.5">
                      <KeyField
                        id="ai-welcome-key-input-paid"
                        value={key}
                        onChange={(value) => {
                          setKey(value);
                          if (error) setError("");
                        }}
                        placeholder="sk-or-v1-…"
                        showKey={showKey}
                        onToggleShow={() => setShowKey((current) => !current)}
                        disabled={connecting}
                        tone="dark"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="mt-3 text-sm leading-5 text-red-300" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleContinue()}
                    disabled={connecting}
                    aria-label="Connect paid key"
                    className="mt-5 w-full rounded-full bg-white px-5 py-3 text-sm font-bold text-[#1a1208] transition-colors hover:bg-[#f2ece2] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {connecting ? "Connecting..." : "Connect paid key →"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer — shared across all three views; left line is view-specific */}
        <div className="mt-6 flex flex-col gap-3 border-t border-[#efe3d3] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[11px] leading-5 text-[#7a6a5a]">{footerLeftText}</p>
          <button
            type="button"
            onClick={close}
            aria-label="Skip for now"
            className="text-left text-xs font-semibold text-[#7a6a5a] underline-offset-4 transition-colors hover:text-[#1a1208] hover:underline sm:text-right"
          >
            Skip for now →
          </button>
        </div>
      </section>
    </div>
  );
}
