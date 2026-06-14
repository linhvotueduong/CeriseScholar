"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "checking" | "ready" | "invalid" | "saving" | "done";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Establish the recovery session from the link the user clicked.
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function init() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorDescription = url.searchParams.get("error_description");

      if (errorDescription) {
        if (active) {
          setError(errorDescription);
          setStatus("invalid");
        }
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (active) {
            setError(error.message);
            setStatus("invalid");
          }
          return;
        }
        // Drop the code from the address bar so a refresh can't re-run it.
        window.history.replaceState({}, "", "/auth/reset-password");
      }

      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setStatus(data.user ? "ready" : "invalid");
    }

    void init();

    // Some email clients deliver the recovery token in the URL hash; the
    // browser client parses it and fires this event.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session?.user) {
        setStatus("ready");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Please use a password of at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setStatus("saving");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setStatus("ready");
      return;
    }

    setStatus("done");
  }

  if (status === "checking") {
    return (
      <div className="w-full">
        <p className="text-sm text-[#7a6a5a]">Checking your reset link…</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="w-full space-y-5">
        <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">
          <p className="font-bold">This reset link isn&apos;t valid</p>
          <p className="mt-1">
            {error || "It may have expired or already been used. Please request a new one."}
          </p>
        </div>
        <p className="text-center text-sm text-[#7a6a5a]">
          <Link href="/forgot-password" className="font-semibold text-[#1a1208] hover:underline">
            Request a new reset link
          </Link>
        </p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="w-full space-y-5">
        <div className="rounded-[8px] border border-[#e0d8d0] bg-[#faf7f0] px-4 py-4 text-sm leading-6 text-[#5f5248]">
          <p className="font-bold text-[#1a1208]">Password updated</p>
          <p className="mt-1">Your new password is saved. You can now use it to sign in.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            router.push("/dashboard");
            router.refresh();
          }}
          className="min-h-12 w-full rounded-[8px] bg-[#1a1208] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black"
        >
          Continue to your dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-[#5f5248]">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-4 py-3 text-sm text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-[#5f5248]">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-4 py-3 text-sm text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
            placeholder="Re-enter your new password"
          />
        </div>

        {error && (
          <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "saving"}
          className="min-h-12 w-full rounded-[8px] bg-[#1a1208] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
        >
          {status === "saving" ? "Saving..." : "Save new password"}
        </button>
      </form>
    </div>
  );
}
