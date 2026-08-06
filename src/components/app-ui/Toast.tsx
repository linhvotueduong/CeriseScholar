"use client";

/**
 * Lightweight corner toast (docs/research-readiness-checklist-model.md §7.1:
 * "the founder's small pop up reminder at the right corner"). No new deps, no
 * context provider — a tiny module-level pub/sub so any client component can
 * call `showToast(...)` and any mounted `<ToastViewport />` renders it. Mount
 * `<ToastViewport />` once near the surfaces that call `showToast` (currently
 * the PDF viewer, for the per-source Finish button's moment-of-completion
 * nudges).
 */

import { useEffect, useState } from "react";

export type ToastAction = {
  label: string;
  onAction: () => void;
};

export type ToastPayload = {
  message: string;
  /** Optional secondary line (e.g. the "recommended: review its rows" nudge). */
  detail?: string;
  action?: ToastAction;
  /** ms before auto-dismiss. Default 6000. */
  durationMs?: number;
};

type ToastEntry = ToastPayload & { id: number };
type Listener = (toast: ToastEntry) => void;

const listeners = new Set<Listener>();
let nextId = 0;

export function showToast(payload: ToastPayload) {
  const toast: ToastEntry = { id: ++nextId, ...payload };
  listeners.forEach((listener) => listener(toast));
}

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  useEffect(() => {
    const listener: Listener = (toast) => {
      setToasts((current) => [...current, toast]);
      const duration = toast.durationMs ?? 6000;
      window.setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== toast.id));
      }, duration);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[999] flex w-full max-w-[300px] flex-col items-end gap-2"
      style={{ pointerEvents: "none" }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          style={{
            pointerEvents: "auto",
            width: "100%",
            background: "#fbf6ef",
            border: "1px solid #e5e1dc",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(17,17,17,0.12)",
            padding: "10px 14px",
          }}
        >
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#111111" }}>{toast.message}</p>
          {toast.detail && (
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#625a52" }}>{toast.detail}</p>
          )}
          {toast.action && (
            <button
              onClick={() => setToasts((current) => {
                toast.action?.onAction();
                return current.filter((t) => t.id !== toast.id);
              })}
              style={{
                marginTop: "6px",
                background: "none",
                border: "none",
                padding: 0,
                fontSize: "11px",
                fontWeight: 700,
                color: "#8f6132",
                cursor: "pointer",
              }}
              type="button"
            >
              {toast.action.label} →
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
