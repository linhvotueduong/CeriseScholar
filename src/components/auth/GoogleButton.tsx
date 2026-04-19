"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setError(null);
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
    // On success, Supabase navigates to Google — no further action needed here.
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-edge bg-paper text-ink text-sm font-medium rounded-[4px] hover:border-ink disabled:opacity-50 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.92v2.33A9 9 0 009 18z"/>
          <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 013.68 9c0-.6.1-1.18.29-1.72V4.95H.92A9 9 0 000 9c0 1.45.35 2.82.92 4.05l3.05-2.33z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.92 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z"/>
        </svg>
        <span>{loading ? "Redirecting…" : label}</span>
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
