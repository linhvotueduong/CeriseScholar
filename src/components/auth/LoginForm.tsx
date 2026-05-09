"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import GoogleButton from "./GoogleButton";

const DEVICE_NOTICE =
  "For the full Cerise Scholar research experience, use the laptop where your files, storage, and local AI agent are set up. Mobile sign-in is available for review and lighter workspace access.";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full space-y-5">
      <GoogleButton label="Continue with Google" />

      <div className="flex items-center gap-3 text-xs font-medium text-[#9a8a7a]">
        <span className="h-px flex-1 bg-[#e0d8d0]" />
        <span>or continue with email</span>
        <span className="h-px flex-1 bg-[#e0d8d0]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#5f5248]">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-4 py-3 text-sm text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#5f5248]">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-4 py-3 text-sm text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
          placeholder="••••••••"
        />
      </div>

      <p className="rounded-[8px] border border-[#e0d8d0] bg-[#faf7f0] px-3 py-3 text-xs leading-5 text-[#7a6a5a]">
        {DEVICE_NOTICE}
      </p>

      {error && (
        <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="min-h-12 w-full rounded-[8px] bg-[#1a1208] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm text-[#7a6a5a]">
        New to Cerise Scholar?{" "}
        <Link href="/signup" className="font-semibold text-[#1a1208] hover:underline">
          Create your account
        </Link>
      </p>
    </form>
    </div>
  );
}
