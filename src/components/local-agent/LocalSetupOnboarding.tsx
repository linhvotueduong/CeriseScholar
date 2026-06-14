"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocalAgentStatus } from "@/hooks/useLocalAgentStatus";
import { useUser } from "@/hooks/useUser";
import {
  LOCAL_AGENT_BASE_URL,
  LOCAL_SETUP_DISMISSED_STORAGE_KEY,
  LOCAL_SETUP_EMAIL_REQUEST_STORAGE_KEY,
  LOCAL_SETUP_EMAIL_SENT_STORAGE_KEY,
  LOCAL_SETUP_PROMPT_STORAGE_KEY,
  LOCAL_SETUP_READY_STORAGE_KEY,
  sendLocalSetupReadyEmail,
} from "@/lib/local-agent/client";

const setupEstimate = {
  minMinutes: 8,
  maxMinutes: 15,
  pollSeconds: 15,
};

type FinishedConfettiPiece = {
  color: string;
  height?: number;
  kind?: "star";
  left: string;
  rotate: string;
  size?: number;
  top: string;
  width?: number;
};

const finishedConfetti: FinishedConfettiPiece[] = [
  { color: "#f3c747", kind: "star", left: "7%", rotate: "-12deg", size: 18, top: "8%" },
  { color: "#e05d9f", kind: "star", left: "89%", rotate: "18deg", size: 17, top: "14%" },
  { color: "#f3c747", height: 18, left: "18%", rotate: "-18deg", top: "-3%", width: 5 },
  { color: "#c0392b", height: 12, left: "30%", rotate: "28deg", top: "1%", width: 5 },
  { color: "#4f8a10", height: 13, left: "41%", rotate: "-28deg", top: "5%", width: 5 },
  { color: "#f3c747", height: 20, left: "53%", rotate: "8deg", top: "-7%", width: 5 },
  { color: "#e05d9f", height: 13, left: "69%", rotate: "22deg", top: "0%", width: 5 },
  { color: "#4f8a10", height: 14, left: "82%", rotate: "-24deg", top: "5%", width: 5 },
  { color: "#f3c747", height: 10, left: "-1%", rotate: "18deg", top: "31%", width: 10 },
  { color: "#e05d9f", height: 11, left: "98%", rotate: "-14deg", top: "34%", width: 11 },
  { color: "#c0392b", height: 13, left: "76%", rotate: "36deg", top: "43%", width: 5 },
  { color: "#f3c747", height: 12, left: "22%", rotate: "-34deg", top: "48%", width: 5 },
  { color: "#f3c747", kind: "star", left: "2%", rotate: "15deg", size: 16, top: "72%" },
  { color: "#e05d9f", kind: "star", left: "92%", rotate: "-10deg", size: 18, top: "73%" },
];

function readPromptRequested() {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage.getItem(LOCAL_SETUP_PROMPT_STORAGE_KEY));
  } catch {
    return false;
  }
}

function readDismissed() {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage.getItem(LOCAL_SETUP_DISMISSED_STORAGE_KEY));
  } catch {
    return false;
  }
}

function formatSetupTimeLeft(seconds: number) {
  const clampedSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(clampedSeconds / 60);
  const remainingSeconds = clampedSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")} left`;
}

export default function LocalSetupOnboarding() {
  const { user } = useUser();
  const localAgent = useLocalAgentStatus();
  const [open, setOpen] = useState(false);
  const [setupMode, setSetupMode] = useState<"choice" | "setup">("choice");
  const [, setNextCheckIn] = useState(setupEstimate.pollSeconds);
  const [setupElapsedSeconds, setSetupElapsedSeconds] = useState(0);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [readyEmailAttempted, setReadyEmailAttempted] = useState(false);

  const ready = localAgent.canUseLocalAi;

  const statusCopy = useMemo(() => {
    if (localAgent.hostedAiBypass) {
      return {
        eyebrow: "Hosted AI enabled",
        title: "AI agents are ready for this account",
        body: "This beta account can use hosted AI agents without setting up the Cerise Scholar Local Agent on this laptop.",
      };
    }

    if (ready) {
      return {
        eyebrow: "Laptop AI ready",
        title: "Your local setup is ready",
        body: `Cerise Scholar found the Local Agent and ${localAgent.health?.ollama?.selectedModel || "your local model"}. AI-heavy research features can run on this trusted laptop now.`,
      };
    }

    if (localAgent.mobile) {
      return {
        eyebrow: "Laptop required",
        title: "Use your laptop for AI-heavy setup",
        body: "Mobile sign-in is available for lighter review. Local files, vault setup, and Ollama-backed AI need the laptop where your workspace will live.",
      };
    }

    if (localAgent.ui.status === "needs-ollama") {
      return {
        eyebrow: "Almost there",
        title: "Ollama still needs setup",
        body: "Cerise Scholar can see the Local Agent, but the local model is not ready yet. Open Ollama or finish the model download, then keep this page open while we check again.",
      };
    }

    if (localAgent.ui.status === "security-blocked") {
      return {
        eyebrow: "Safety check",
        title: "Ollama needs a safety check",
        body: localAgent.ui.detail,
      };
    }

    return {
      eyebrow: "Laptop setup",
      title: "Choose how you want to start",
      body: "Cerise Scholar is ready for your account. The full private research workflow needs the Local Agent and Ollama on a personal or trusted laptop.",
    };
  }, [localAgent.health?.ollama?.selectedModel, localAgent.hostedAiBypass, localAgent.mobile, localAgent.ui.detail, localAgent.ui.status, ready]);

  useEffect(() => {
    if (!user) return;
    if (localAgent.hostedAiBypass) {
      try {
        window.localStorage.removeItem(LOCAL_SETUP_PROMPT_STORAGE_KEY);
      } catch {
        // The hosted bypass still works even if local storage is unavailable.
      }
      setOpen(false);
      return;
    }
    if (readDismissed()) return;

    if (readPromptRequested() || !ready) {
      setOpen(true);
    }
  }, [localAgent.hostedAiBypass, ready, user]);

  useEffect(() => {
    if (!open || ready) return;

    const tick = window.setInterval(() => {
      setSetupElapsedSeconds((current) => current + 1);
      setNextCheckIn((current) => {
        if (current <= 1) {
          void localAgent.checkNow();
          return setupEstimate.pollSeconds;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(tick);
  }, [localAgent, open, ready]);

  useEffect(() => {
    if (setupMode === "setup" && !ready) return;
    setSetupElapsedSeconds(0);
    setNextCheckIn(setupEstimate.pollSeconds);
  }, [ready, setupMode]);

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(LOCAL_SETUP_READY_STORAGE_KEY, new Date().toISOString());
    } catch {
      // Readiness can still be shown in this session.
    }
  }, [ready]);

  useEffect(() => {
    if (!ready || !user || readyEmailAttempted || typeof window === "undefined") return;

    let requestedAt = "";
    let sentAt = "";
    try {
      requestedAt = window.localStorage.getItem(LOCAL_SETUP_EMAIL_REQUEST_STORAGE_KEY) || "";
      sentAt = window.localStorage.getItem(LOCAL_SETUP_EMAIL_SENT_STORAGE_KEY) || "";
    } catch {
      return;
    }

    if (!requestedAt || sentAt) return;

    setReadyEmailAttempted(true);
    void sendLocalSetupReadyEmail().then((result) => {
      if (result.status === "sent" || result.status === "already_sent") {
        const deliveredAt = result.sentAt || new Date().toISOString();
        try {
          window.localStorage.setItem(LOCAL_SETUP_EMAIL_SENT_STORAGE_KEY, deliveredAt);
        } catch {
          // The metadata update is still the durable record.
        }
        setEmailMessage("Cerise Scholar sent the setup-ready email.");
        return;
      }

      if (result.status === "not_configured") {
        setEmailMessage(
          "Your reminder preference is saved. Email delivery is not connected yet, so Cerise Scholar will keep showing readiness here."
        );
        return;
      }

      if (result.status !== "no_request") {
        setEmailMessage("Your setup is ready, but the email reminder could not be sent yet.");
      }
    });
  }, [ready, readyEmailAttempted, user]);

  function closeForNow() {
    try {
      window.localStorage.setItem(LOCAL_SETUP_DISMISSED_STORAGE_KEY, new Date().toISOString());
      window.localStorage.removeItem(LOCAL_SETUP_PROMPT_STORAGE_KEY);
    } catch {
      // Closing the modal should still work if storage is unavailable.
    }
    setOpen(false);
  }

  async function saveEmailRequest() {
    if (!user) return;

    setSavingEmail(true);
    setEmailMessage("");

    try {
      const requestedAt = new Date().toISOString();
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          local_setup_email_when_ready_requested_at: requestedAt,
          local_setup_email_when_ready_status: "requested",
        },
      });
      window.localStorage.setItem(LOCAL_SETUP_EMAIL_REQUEST_STORAGE_KEY, requestedAt);
      window.localStorage.removeItem(LOCAL_SETUP_EMAIL_SENT_STORAGE_KEY);
      setEmailMessage(
        "Saved. If email delivery is connected when setup finishes, Cerise Scholar will send a gentle ready note. This page will keep checking while the laptop stays open."
      );
    } catch {
      setEmailMessage("I could not save that preference yet. You can keep this page open and Cerise Scholar will continue checking here.");
    } finally {
      setSavingEmail(false);
    }
  }

  if (!open || !user) return null;

  const localAgentHost = LOCAL_AGENT_BASE_URL.replace(/^https?:\/\//, "");
  const estimatedSetupSeconds = setupEstimate.minMinutes * 60;
  const timedSetupProgress = Math.min(100, Math.round((setupElapsedSeconds / estimatedSetupSeconds) * 100));
  const setupProgress = ready
    ? 100
    : setupMode === "setup"
      ? timedSetupProgress
      : 0;
  const setupProgressLabel = ready ? "100%" : `${setupProgress}%`;
  const setupSecondsLeft =
    ready
      ? 0
      : setupMode === "setup"
        ? estimatedSetupSeconds - setupElapsedSeconds
        : estimatedSetupSeconds;
  const setupTimeLabel = formatSetupTimeLeft(setupSecondsLeft);
  const primaryActionLabel = ready ? "Get Started!" : setupMode === "setup" ? "Check setup" : "Get Started!";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1a1208]/65 px-4 py-6 backdrop-blur-sm">
      <section
        aria-labelledby="local-setup-title"
        aria-modal="true"
        role="dialog"
        className="relative max-h-[88vh] w-full max-w-[480px] overflow-visible rounded-[24px] border border-[#d4cdc5] bg-white px-6 py-6 shadow-[0_24px_70px_rgba(26,18,8,0.26)] sm:px-7 sm:py-6"
      >
        {ready && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-[-26px] z-10 overflow-hidden rounded-[28px]">
            {finishedConfetti.map((piece, index) =>
              piece.kind === "star" ? (
                <span
                  className="cerise-finished-confetti absolute block opacity-80"
                  key={`${piece.left}-${piece.top}`}
                  style={{
                    animationDelay: `${index * 65}ms`,
                    color: piece.color,
                    fontSize: piece.size,
                    left: piece.left,
                    lineHeight: 1,
                    top: piece.top,
                    transform: `rotate(${piece.rotate})`,
                  }}
                >
                  ★
                </span>
              ) : (
                <span
                  className="cerise-finished-confetti absolute block rounded-full opacity-80"
                  key={`${piece.left}-${piece.top}`}
                  style={{
                    animationDelay: `${index * 65}ms`,
                    backgroundColor: piece.color,
                    height: piece.height,
                    left: piece.left,
                    top: piece.top,
                    transform: `rotate(${piece.rotate})`,
                    width: piece.width,
                  }}
                />
              )
            )}
          </div>
        )}

        <button
          type="button"
          onClick={closeForNow}
          aria-label="Close laptop setup"
          className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center text-[#7a6a5a] transition-colors hover:text-[#1a1208]"
        >
          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
            <path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </button>

        <div className="relative z-20 grid gap-4 sm:grid-cols-[minmax(0,1fr)_104px] sm:items-start">
          <div className="pr-7 sm:pr-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c0392b]">{statusCopy.eyebrow}</p>
            <h2
              id="local-setup-title"
              className="mt-2 font-display text-[25px] font-normal leading-[1.08] tracking-normal text-[#1a1208] sm:text-[27px]"
            >
              {statusCopy.title}
            </h2>
            <p className="mt-3 max-w-[280px] text-xs leading-6 text-[#6f6255]">{statusCopy.body}</p>
          </div>

          <div className="flex justify-center sm:justify-end">
            <Image
              alt="Cerise Scholar hedgehog pressing the start button"
              className="h-[92px] w-auto object-contain drop-shadow-[0_10px_18px_rgba(26,18,8,0.10)] sm:h-[96px]"
              height={512}
              priority
              src="/assets/hedgehogs/hedgehog01Start.png"
              width={436}
            />
          </div>
        </div>

        {!ready ? (
          <div className="relative z-20 mt-4 rounded-[18px] bg-[#f5f2ee] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold text-[#1a1208]">Setup check</p>
              <div className="flex gap-2">
                <p className="rounded-full bg-white px-4 py-2 text-[11px] font-bold leading-none text-[#1a1208]">
                  {setupTimeLabel}
                </p>
                <p className="rounded-full bg-white px-4 py-2 text-[11px] font-bold leading-none text-[#1a1208]">
                  {setupProgressLabel}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#dfd7cf]">
              <div
                className="h-full rounded-full bg-[#c0392b] transition-[width] duration-500"
                style={{ width: setupProgressLabel }}
              />
            </div>
            <p className="mt-4 text-xs leading-6 text-[#6f6255]">
              Keep this laptop open while Cerise Scholar checks the Local Agent and Ollama.
            </p>
          </div>
        ) : (
          <div className="relative z-20 mt-4 rounded-[18px] bg-[#f5f2ee] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold text-[#1a1208]">Setup Finished</p>
              <div className="flex gap-2">
                <p className="rounded-full bg-white px-4 py-2 text-[11px] font-bold leading-none text-[#1a1208]">
                  {setupTimeLabel}
                </p>
                <p className="rounded-full bg-white px-4 py-2 text-[11px] font-bold leading-none text-[#1a1208]">
                  {setupProgressLabel}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#dfd7cf]">
              <div className="h-full rounded-full bg-[#4f8a10]" style={{ width: setupProgressLabel }} />
            </div>
            <p className="mt-4 text-xs leading-6 text-[#6f6255]">
              Local agent: {localAgentHost}. Ready on this laptop. Your AI-heavy research work can stay on this device.
            </p>
          </div>
        )}

        <div className="relative z-20 mt-5">
          <p className="text-xs font-bold text-[#6f6255]">Use a trusted laptop</p>
          <p className="mt-1 max-w-[385px] text-xs leading-5 text-[#7a6a5a]">
            For this beta, full AI-heavy features are for a personal or trusted laptop, not a shared/public desktop.
          </p>
        </div>

        {setupMode === "setup" && !ready && (
          <div className="relative z-20 mt-4 grid gap-3 rounded-[16px] border border-[#e0d8d0] bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-bold text-[#1a1208]">Next step</p>
              <p className="mt-1 text-[11px] leading-5 text-[#6f6255]">
                Download Ollama from the official site, then return here to check setup.
              </p>
            </div>
            <a
              href="https://ollama.com/download"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 items-center justify-center rounded-full bg-[#1a1208] px-4 text-xs font-bold text-white no-underline"
            >
              Download Ollama
            </a>
          </div>
        )}

        {!ready && (
          <div className="relative z-20 mt-4">
            <button
              type="button"
              onClick={() => void saveEmailRequest()}
              disabled={savingEmail}
              className="text-xs font-bold text-[#c0392b] underline-offset-4 hover:underline disabled:opacity-60"
            >
              {savingEmail ? "Saving reminder..." : "Email me when setup is ready"}
            </button>
            {emailMessage && <p className="mt-2 text-xs leading-5 text-[#7a6a5a]">{emailMessage}</p>}
          </div>
        )}

        <div className="relative z-20 mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeForNow}
            className="min-h-10 min-w-[118px] rounded-full bg-[#f0ebe7] px-6 text-sm font-bold text-[#7a6a5a] transition-colors hover:bg-[#e6ded7]"
          >
            Later
          </button>

          {!ready && setupMode === "choice" ? (
            <button
              type="button"
              onClick={() => setSetupMode("setup")}
              className="min-h-10 min-w-[140px] rounded-full bg-[#c0392b] px-6 text-sm font-bold text-white transition-colors hover:bg-[#a83228]"
            >
              {primaryActionLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={ready ? closeForNow : () => void localAgent.checkNow()}
              className="min-h-10 min-w-[140px] rounded-full bg-[#c0392b] px-6 text-sm font-bold text-white transition-colors hover:bg-[#a83228]"
            >
              {primaryActionLabel}
            </button>
          )}
        </div>

        <style jsx>{`
          .cerise-finished-confetti {
            animation: ceriseFinishedConfetti 3600ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          @keyframes ceriseFinishedConfetti {
            0% {
              opacity: 0;
              translate: 0 12px;
              scale: 0.2;
            }
            18% {
              opacity: 0.9;
              scale: 1;
            }
            64% {
              opacity: 0.85;
            }
            100% {
              opacity: 0.45;
              translate: 0 34px;
              scale: 0.78;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .cerise-finished-confetti {
              animation: none;
              opacity: 0.35;
            }
          }
        `}</style>
      </section>
    </div>
  );
}
