"use client";

// Shared paste-your-OpenRouter-key logic — used by both the welcome popup
// (WelcomeAiPopup, which builds its own layout around the `useConnectKey`
// hook below) and the Settings → AI page (which renders the default
// `ConnectKeyForm` component as-is). See docs/byok-intake-design.md §1a/§1b.
// The key is sent to POST /api/ai/key exactly once and the input is cleared
// on success; nothing is stored client-side.

import { useCallback, useState } from "react";
import Spinner from "@/components/ui/Spinner";

type ConnectResult = { ok: true; last4: string } | { ok: false };

/**
 * Owns the key/connecting/error/connected state and the two network calls
 * (POST to connect, then an optional best-effort PATCH to save a preferred
 * model). Both `ConnectKeyForm` (Settings' card layout) and `WelcomeAiPopup`
 * (its own mockup-driven layout) call this instead of duplicating fetch
 * logic — only the JSX around it differs.
 *
 * `connect` takes the preferred model at call time (rather than binding it
 * up front) so a caller like the popup — where the selected model can change
 * while the key field is still being typed into — always saves whatever is
 * currently selected.
 */
export function useConnectKey() {
  const [key, setKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);

  const connect = useCallback(
    async (preferredModel?: string | null): Promise<ConnectResult> => {
      if (!key.trim() || connecting) return { ok: false };
      setConnecting(true);
      setError("");

      try {
        const res = await fetch("/api/ai/key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: key.trim() }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          connected?: boolean;
          last4?: string;
          error?: string;
        };

        if (!res.ok || !data.connected) {
          setError(data.error || "Connecting the key failed. Please try again.");
          return { ok: false };
        }

        // Best-effort: the key IS connected at this point regardless of
        // whether this save succeeds, so a failure here doesn't block
        // success — it would just leave the default model chain in place.
        if (preferredModel) {
          try {
            await fetch("/api/ai/key", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ preferredModel }),
            });
          } catch {
            // Ignored — see comment above.
          }
        }

        setKey("");
        setConnected(true);
        return { ok: true, last4: data.last4 || "" };
      } catch {
        setError("Connecting the key failed. Please check your connection and try again.");
        return { ok: false };
      } finally {
        setConnecting(false);
      }
    },
    [key, connecting]
  );

  return { key, setKey, connecting, error, setError, connected, connect };
}

export default function ConnectKeyForm({
  onConnected,
  preferredModel,
}: {
  /** Called after a successful connect, with the key's last 4 characters. */
  onConnected?: (last4: string) => void;
  /** Optional model to save as the preferred model once the key connects. */
  preferredModel?: string | null;
}) {
  const { key, setKey, connecting, error, setError, connected, connect } = useConnectKey();

  async function handleConnect() {
    const result = await connect(preferredModel);
    if (result.ok) onConnected?.(result.last4);
  }

  if (connected) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700" role="status">
        Connected — unlimited AI ✓
      </p>
    );
  }

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleConnect();
        }}
      >
        <input
          type="password"
          value={key}
          onChange={(event) => {
            setKey(event.target.value);
            if (error) setError("");
          }}
          placeholder="sk-or-..."
          autoComplete="off"
          spellCheck={false}
          aria-label="Your OpenRouter API key"
          disabled={connecting}
          className="w-full rounded-xl border border-[#e8d8c6] bg-white px-4 py-3 text-sm text-[#17120d] outline-none placeholder:text-[#a89a88] focus:border-[#8f6132] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!key.trim() || connecting}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#8f6132] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#7a5229] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {connecting ? (
            <>
              <Spinner size="sm" />
              Checking with OpenRouter...
            </>
          ) : (
            "Connect key"
          )}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-sm leading-5 text-red-600" role="alert">
          {error}
        </p>
      )}

      <a
        href="https://openrouter.ai/keys"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-sm font-semibold text-[#8f6132] underline-offset-4 hover:underline"
      >
        Get a free key at openrouter.ai ↗
      </a>
    </div>
  );
}
