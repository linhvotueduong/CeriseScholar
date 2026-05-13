"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GoogleButton({
  compact = false,
  label = "Continue with Google",
  onBeforeStart,
}: {
  compact?: boolean;
  label?: string;
  onBeforeStart?: (startGoogle: () => Promise<void>) => boolean | void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setError(null);

    const startGoogle = async () => {
      setLoading(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      }
      // On success, Supabase navigates to Google - no further action needed here.
    };

    const shouldContinue = onBeforeStart?.(startGoogle);
    if (shouldContinue === false) {
      return;
    }

    await startGoogle();
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className={`relative flex w-full items-center justify-center rounded-[8px] border border-[#d4cdc5] bg-white text-[#1a1208] transition-colors hover:border-[#1a1208] disabled:opacity-50 ${
          compact ? "min-h-9 gap-2 px-3 py-1.5 text-[10.5px] font-bold" : "min-h-12 gap-3 px-4 py-3 text-sm font-semibold"
        }`}
      >
        <svg
          className={`absolute top-1/2 -translate-y-1/2 ${compact ? "left-[calc(50%-5.7rem)]" : "left-[calc(50%-7rem)]"}`}
          width={compact ? "14" : "18"}
          height={compact ? "14" : "18"}
          viewBox="0 0 18 18"
          aria-hidden="true"
        >
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.92v2.33A9 9 0 009 18z"/>
          <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 013.68 9c0-.6.1-1.18.29-1.72V4.95H.92A9 9 0 000 9c0 1.45.35 2.82.92 4.05l3.05-2.33z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.92 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z"/>
        </svg>
        <span className="block w-full text-center">{loading ? "Redirecting..." : label}</span>
      </button>
      {error && <p className="mt-2 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
