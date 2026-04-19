"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import GoogleButton from "./GoogleButton";

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="text-4xl">📧</div>
        <h2 className="text-xl font-semibold text-gray-800">Check your email</h2>
        <p className="text-gray-600">
          We sent a confirmation link to <strong>{email}</strong>. Click the link in the email to activate your account.
        </p>
        <Link href="/login" className="text-[#1a1208] hover:underline font-medium text-sm">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <GoogleButton label="Sign up with Google" />

      <div className="flex items-center gap-3 text-xs text-ink-faint">
        <span className="flex-1 h-px bg-rule" />
        <span>or sign up with email</span>
        <span className="flex-1 h-px bg-rule" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a1208] focus:border-transparent"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a1208] focus:border-transparent"
          placeholder="At least 8 characters"
        />
      </div>

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-[#1a1208] text-white font-medium rounded-xl hover:bg-[#0d0a04] disabled:opacity-50 transition-colors"
      >
        {loading ? "Creating account..." : "Sign Up"}
      </button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="text-[#1a1208] hover:underline font-medium">
          Log In
        </Link>
      </p>
    </form>
    </div>
  );
}
