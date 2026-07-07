"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useUser } from "@/hooks/useUser";
import Spinner from "@/components/ui/Spinner";

const accountLinks = [
  { href: "/help", label: "Help Center", body: "Setup notes, privacy answers, and beta FAQs." },
  { href: "/help/contact", label: "Contact support", body: "Send a setup question, bug report, or feature request." },
  { href: "/help/privacy", label: "Privacy Policy", body: "See how your account, files, and AI requests are handled in the cloud." },
  { href: "/help/terms", label: "Terms of Use", body: "Review public beta account responsibilities." },
];

export default function AccountPage() {
  const { user, loading } = useUser();
  const { displayName, initials } = useProfile("Cerise Scholar member");
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-16 text-center">
        <h1 className="font-display text-[36px] font-normal text-[#1a1208]">Sign in to view your account</h1>
        <p className="mt-3 text-sm leading-6 text-[#7a6a5a]">
          Your account area is available after login.
        </p>
        <Link
          className="mt-6 inline-flex h-10 items-center rounded-full bg-[#1a1208] px-5 text-sm font-black text-white no-underline"
          href="/login"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const betaStatus = getBetaStatus(user);
  const providerLabel = getProviderLabel(user);

  return (
    <div className="mx-auto max-w-[980px] px-4 py-8 pb-20 sm:px-6 lg:px-8">
      <header className="border-b border-[#e0d8d0] pb-7">
        <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">Account</p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-[38px] font-normal leading-tight tracking-normal text-[#1a1208] sm:text-[46px]">
              Your Cerise profile
            </h1>
            <p className="mt-3 max-w-[620px] text-sm leading-6 text-[#7a6a5a]">
              Keep a clear view of your beta account, AI access, and the support paths that
              help Cerise stay gentle with your research work.
            </p>
          </div>

          <button
            className="inline-flex h-10 w-fit items-center rounded-full border border-[#d4cdc5] bg-white px-5 text-sm font-black text-[#1a1208] transition hover:bg-[#faf7f0]"
            onClick={handleSignOut}
            type="button"
          >
            Sign Out
          </button>
        </div>
      </header>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card title="Profile identity" eyebrow="Signed in as">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1a1208] text-base font-black uppercase text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-[#1a1208]">{displayName}</h2>
              <p className="mt-1 truncate text-sm text-[#7a6a5a]">{user.email}</p>
              <div className="mt-4 grid gap-2 text-sm">
                <DetailRow label="Login method" value={providerLabel} />
                <DetailRow label="Member since" value={formatDate(user.created_at)} />
                <DetailRow label="Last sign-in" value={formatDate(user.last_sign_in_at)} />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Beta access" eyebrow="Public beta">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-[#1a1208]">{betaStatus.title}</p>
              <p className="mt-2 text-sm leading-6 text-[#7a6a5a]">{betaStatus.body}</p>
            </div>
            <span className="shrink-0 rounded-full border border-[#f0d3cc] bg-[#fff5f2] px-3 py-1 text-[11px] font-black text-[#c0392b]">
              Beta
            </span>
          </div>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card title="AI access" eyebrow="OpenRouter">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-6 text-[#7a6a5a]">
              Cerise Scholar now runs AI through OpenRouter. Connect an OpenRouter key for
              limited testing, then add credit when you are ready for fuller product usage.
            </p>
            <Link
              className="inline-flex h-9 shrink-0 items-center rounded-full border border-[#d4cdc5] bg-white px-4 text-xs font-black text-[#1a1208] no-underline transition hover:bg-[#faf7f0]"
              href="/settings/ai"
            >
              Manage AI
            </Link>
          </div>

          <div className="mt-4 divide-y divide-[#eee6dd]">
            <ConnectionRow
              body="OpenRouter setup starts with limited testing before credit is added."
              label="OpenRouter setup"
              status="Settings"
              tone="ready"
            />
            <ConnectionRow
              body="Provider-key routing for OpenAI or Anthropic belongs in Settings once backend support is available."
              label="Your own provider"
              status="Optional"
              tone="quiet"
            />
            <ConnectionRow
              body="Private source files are stored in Supabase-backed project workflows rather than a laptop vault."
              label="Source files"
              status="Cloud-only"
              tone="quiet"
            />
            <ConnectionRow
              body="Usage is counted server-side so Cerise can show request history and protect test limits."
              label="Metering"
              status="Active"
              tone="ready"
            />
          </div>
        </Card>

        <Card title="Privacy and files" eyebrow="Cloud boundary">
          <p className="text-sm leading-6 text-[#7a6a5a]">
            Your account, project records, and selected research materials are handled through the
            hosted app and Supabase-backed storage. AI requests use the included OpenRouter lane
            or your connected key.
          </p>
          <div className="mt-5 grid gap-2 text-sm">
            <DetailRow label="Private source files" value="Handled through hosted project workflows" />
            <DetailRow label="AI provider" value="OpenRouter" />
            <DetailRow label="Hosted account data" value="Managed through Supabase authentication" />
          </div>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]" id="settings">
        <Card title="Account settings" eyebrow="Quick links">
          <div className="divide-y divide-[#eee6dd]">
            {accountLinks.map((item) => (
              <Link
                className="grid gap-1 py-3 text-[#1a1208] no-underline transition hover:opacity-75"
                href={item.href}
                key={item.href}
              >
                <span className="text-sm font-black">{item.label}</span>
                <span className="text-xs leading-5 text-[#7a6a5a]">{item.body}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Need a hand?" eyebrow="Support">
          <p className="text-sm leading-6 text-[#7a6a5a]">
            If something feels stuck, send the page you were on, your device type, and the message
            Cerise showed you.
          </p>
          <Link
            className="mt-5 inline-flex h-9 items-center rounded-full bg-[#1a1208] px-4 text-xs font-black text-white no-underline transition hover:opacity-90"
            href="/help/contact?type=help"
          >
            Request support
          </Link>
        </Card>
      </section>
    </div>
  );
}

function Card({
  children,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <article className="rounded-[8px] border border-[#d4cdc5] bg-white p-5 shadow-[0_10px_30px_rgba(26,18,8,0.045)]">
      <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">{eyebrow}</p>
      <h2 className="mt-2 text-base font-black tracking-normal text-[#1a1208]">{title}</h2>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-t border-[#eee6dd] pt-2 sm:grid-cols-[150px_1fr] sm:gap-3">
      <span className="text-[11px] font-black uppercase tracking-normal text-[#9a8a7a]">{label}</span>
      <span className="min-w-0 break-words text-sm font-semibold text-[#1a1208]">{value}</span>
    </div>
  );
}

function ConnectionRow({
  body,
  label,
  status,
  tone,
}: {
  body: string;
  label: string;
  status: string;
  tone: "ready" | "attention" | "quiet";
}) {
  return (
    <div className="grid gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black text-[#1a1208]">{label}</span>
        <StatusPill tone={tone}>{status}</StatusPill>
      </div>
      <p className="text-xs leading-5 text-[#7a6a5a]">{body}</p>
    </div>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ready" | "attention" | "quiet";
}) {
  const styles = {
    ready: "border-[#cfe0c6] bg-[#f1f8ed] text-[#3f6f2c]",
    attention: "border-[#efd8a5] bg-[#fff8e8] text-[#9a6a1f]",
    quiet: "border-[#e0d8d0] bg-[#faf7f0] text-[#7a6a5a]",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${styles[tone]}`}>
      {children}
    </span>
  );
}

function getBetaStatus(user: User) {
  const source = readMetadataString(user.user_metadata?.beta_signup_source);

  if (source === "public_laptop_beta") {
    return {
      title: "Public laptop beta tester",
      body: "Your account is part of the public beta. The deeper research workflow now runs through Cerise Scholar's hosted AI and project workspace.",
    };
  }

  return {
    title: "Cerise Scholar beta account",
    body: "Your account can access the beta app. Research AI setup now starts with an OpenRouter key and can expand with OpenRouter credit.",
  };
}

function getProviderLabel(user: User) {
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.length > 0) {
    return providers.map(formatProvider).join(", ");
  }

  return formatProvider(readMetadataString(user.app_metadata?.provider) || "email");
}

function formatProvider(provider: string) {
  if (provider === "google") return "Google";
  if (provider === "email") return "Email";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function formatDate(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function readMetadataString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
