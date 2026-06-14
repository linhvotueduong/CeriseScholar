"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full space-y-5">
        <div className="rounded-[8px] border border-[#e0d8d0] bg-[#faf7f0] px-4 py-4 text-sm leading-6 text-[#5f5248]">
          <p className="font-bold text-[#1a1208]">Check your email</p>
          <p className="mt-1">
            If an account exists for <span className="font-semibold">{email}</span>, we&apos;ve sent a
            link to reset your password. The link opens a page where you can choose a new password.
          </p>
        </div>
        <p className="text-center text-sm text-[#7a6a5a]">
          <Link href="/login" className="font-semibold text-[#1a1208] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="forgot-email" className="mb-2 block text-sm font-semibold text-[#5f5248]">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-4 py-3 text-sm text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
            placeholder="you@example.com"
          />
        </div>

        <p className="rounded-[8px] border border-[#e0d8d0] bg-[#faf7f0] px-3 py-3 text-xs leading-5 text-[#7a6a5a]">
          Enter the email you signed up with and we&apos;ll send you a secure link to set a new password.
        </p>

        {error && (
          <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="min-h-12 w-full rounded-[8px] bg-[#1a1208] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
        >
          {loading ? "Sending link..." : "Send reset link"}
        </button>

        <p className="text-center text-sm text-[#7a6a5a]">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-[#1a1208] hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
