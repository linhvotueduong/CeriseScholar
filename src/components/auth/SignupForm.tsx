"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createWaitlistConsentPayload } from "@/lib/beta/consent";
import Link from "next/link";
import GoogleButton from "./GoogleButton";

type AgreementKey = "terms" | "privacy";
type PendingSignupAction = "email" | "google" | null;

type AgreementSection = {
  heading: string;
  body: string;
};

type AgreementDocument = {
  key: AgreementKey;
  label: string;
  shortLabel: string;
  href: string;
  version: string;
  intro: string;
  sections: AgreementSection[];
};

const agreementDocuments: AgreementDocument[] = [
  {
    key: "terms",
    label: "Terms of Service",
    shortLabel: "Terms",
    href: "/terms",
    version: "2026-05-04",
    intro:
      "Cerise Scholar is a limited public beta research workspace. These terms explain waitlist access, beta benefits, monthly passes or credits, account responsibilities, AI limits, and academic responsibility.",
    sections: [
      {
        heading: "1. Public beta waitlist",
        body:
          "Your account places you on the Cerise Scholar public beta waitlist. We review access requests before opening the workspace so the first group has a steady experience.",
      },
      {
        heading: "2. Beta benefits and monthly passes",
        body:
          "Approved beta users may receive benefits such as early access to Cerise Scholar features, research workspace tools, AI-supported workflows, monthly beta passes or credits, and other capacity-based access while the service grows. Cerise Scholar hopes to move toward unlimited or much broader use in the near future as infrastructure, cost controls, and reliability scale up.",
      },
      {
        heading: "3. Account responsibilities",
        body:
          "Use your own account, keep your login safe, and do not share access in a way that creates security, abuse, or quota problems.",
      },
      {
        heading: "4. Research materials",
        body:
          "Only upload files, notes, prompts, and research content that you have the right to use. Do not upload illegal, rights-violating, or abusive content.",
      },
      {
        heading: "5. AI and academic integrity",
        body:
          "AI assistance is for research support and can be wrong. You are responsible for checking sources, final submissions, and any academic or professional decisions.",
      },
    ],
  },
  {
    key: "privacy",
    label: "Privacy Policy",
    shortLabel: "Privacy",
    href: "/privacy",
    version: "2026-05-03",
    intro:
      "The Privacy Policy explains what data Cerise Scholar collects, why it is used, how providers may help process it, and how users can ask for deletion or export.",
    sections: [
      {
        heading: "1. Information we collect",
        body:
          "This may include account details, project data, notes, highlights, uploaded files, AI prompts/context, usage and security logs, and support messages.",
      },
      {
        heading: "2. How we use it",
        body:
          "Data is used to provide your research workspace, account access, AI features, support, safety, abuse prevention, and product reliability.",
      },
      {
        heading: "3. Providers and processing",
        body:
          "Trusted services such as Supabase, Cloudflare, AI providers, and support tools may process selected data only as needed to provide the product.",
      },
      {
        heading: "4. No selling research data",
        body:
          "Cerise Scholar does not sell personal data, research files, prompts, notes, uploaded files, or academic work.",
      },
    ],
  },
];

const initialAgreementChecks: Record<AgreementKey, boolean> = {
  terms: false,
  privacy: false,
};

export default function SignupForm({ agreementRequired = true }: { agreementRequired?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [betaIntroAccepted, setBetaIntroAccepted] = useState(!agreementRequired);
  const [betaNoticeOpen, setBetaNoticeOpen] = useState(agreementRequired);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreementSubmitting, setAgreementSubmitting] = useState(false);
  const [activeAgreementKey, setActiveAgreementKey] = useState<AgreementKey>("terms");
  const [agreementChecks, setAgreementChecks] = useState(initialAgreementChecks);
  const [pendingSignupAction, setPendingSignupAction] = useState<PendingSignupAction>(null);
  const [pendingGoogleStart, setPendingGoogleStart] = useState<(() => void) | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const allAgreementChecksAccepted = agreementDocuments.every((document) => agreementChecks[document.key]);
  const activeAgreementDocument =
    agreementDocuments.find((document) => document.key === activeAgreementKey) ?? agreementDocuments[0];
  const betaNoticeActionLabel = pendingSignupAction
    ? "Continue to Terms and Privacy"
    : "Continue to waitlist signup";

  function openBetaNotice(action: PendingSignupAction) {
    setPendingSignupAction(action);
    setBetaNoticeOpen(true);
  }

  function openAgreement() {
    setAgreementChecks(initialAgreementChecks);
    setActiveAgreementKey("terms");
    setAgreementOpen(true);
  }

  function requestAgreementForAction(action: PendingSignupAction) {
    setPendingSignupAction(action);
    if (betaIntroAccepted) {
      openAgreement();
    } else {
      openBetaNotice(action);
    }
  }

  function leaveSignup() {
    setBetaNoticeOpen(false);
    setAgreementOpen(false);
    setAgreementChecks(initialAgreementChecks);
    setPendingSignupAction(null);
    setPendingGoogleStart(null);
  }

  function continueFromBetaNotice() {
    setBetaIntroAccepted(true);
    setBetaNoticeOpen(false);
    if (pendingSignupAction) {
      openAgreement();
    }
  }

  async function prepareGoogleWaitlistConsent() {
    const response = await fetch("/api/beta/oauth-consent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Could not prepare the waitlist consent step. Please try again.");
    }
  }

  async function acceptAgreement() {
    if (!allAgreementChecksAccepted) return;

    const action = pendingSignupAction;
    const startGoogle = pendingGoogleStart;
    setAgreementSubmitting(true);

    if (action === "email") {
      if (formRef.current && !formRef.current.checkValidity()) {
        setAgreementChecks(initialAgreementChecks);
        setAgreementSubmitting(false);
        setAgreementOpen(false);
        setPendingSignupAction(null);
        setPendingGoogleStart(null);
        window.setTimeout(() => formRef.current?.reportValidity(), 0);
        return;
      }

      setAgreementOpen(false);
      setPendingSignupAction(null);
      setPendingGoogleStart(null);
      setAgreementSubmitting(false);
      void submitSignup();
      return;
    }

    if (action === "google" && startGoogle) {
      try {
        await prepareGoogleWaitlistConsent();
        setAgreementOpen(false);
        setPendingSignupAction(null);
        setPendingGoogleStart(null);
        startGoogle();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not continue with Google.");
      } finally {
        setAgreementSubmitting(false);
      }
      return;
    }

    setAgreementSubmitting(false);
  }

  async function submitSignup() {
    setLoading(true);

    const supabase = createClient();
    const consentPayload = createWaitlistConsentPayload("email");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          signup_method: "email",
          cerise_waitlist_consent: consentPayload,
        },
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (agreementRequired) {
      requestAgreementForAction("email");
      return;
    }

    await submitSignup();
  }

  if (success) {
    return (
      <div className="w-full rounded-[8px] border border-[#d4cdc5] bg-white p-6 text-center shadow-sm space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c0392b]">
          Public beta waitlist
        </p>
        <h2 className="text-2xl font-semibold text-[#1a1208]">Thank you for joining the waitlist</h2>
        <p className="text-sm leading-6 text-[#7a6a5a]">
          We are a small startup, and we truly appreciate your support. We will review your request and email you about
          beta access within 3-4 business days.
        </p>
        <p className="text-sm leading-6 text-[#7a6a5a]">
          If we cannot invite you right now, we still hope to welcome you in a future cohort as Cerise Scholar scales.
          Thank you for believing in us and in your scientific journey.
        </p>
        <p className="rounded-[6px] border border-[#e0d8d0] bg-[#faf7f0] p-3 text-xs leading-5 text-[#7a6a5a]">
          If you receive an email confirmation link at <strong>{email}</strong>, please confirm it so we can connect your
          waitlist request to your account.
        </p>
        <Link href="/login" className="text-[#1a1208] hover:underline font-medium text-sm">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <GoogleButton
        label="Join waitlist with Google"
        onBeforeStart={(startGoogle) => {
          if (!agreementRequired) {
            return true;
          }

          setPendingGoogleStart(() => startGoogle);
          requestAgreementForAction("google");
          return false;
        }}
      />

      <div className="flex items-center gap-3 text-xs font-medium text-[#9a8a7a]">
        <span className="h-px flex-1 bg-[#e0d8d0]" />
        <span>or join with email</span>
        <span className="h-px flex-1 bg-[#e0d8d0]" />
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
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
            placeholder="At least 8 characters"
          />
        </div>

        {error && <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <p className="rounded-[8px] border border-[#e0d8d0] bg-[#faf7f0] px-3 py-3 text-xs leading-5 text-[#7a6a5a]">
          Signing up today creates your waitlist account. We will email you when beta access is ready. To finish your
          waitlist signup, you must accept the{" "}
          <Link href="/terms" className="text-[#1a1208] hover:underline font-medium">
            Terms of Service
          </Link>
          {" "}and{" "}
          <Link href="/privacy" className="text-[#1a1208] hover:underline font-medium">
            Privacy Policy
          </Link>
          .
        </p>

        <button
          type="button"
          onClick={() => {
            setError(null);
            if (agreementRequired) {
              if (formRef.current?.reportValidity()) {
                requestAgreementForAction("email");
              }
              return;
            }

            if (formRef.current?.reportValidity()) {
              void submitSignup();
            }
          }}
          disabled={loading}
          className="min-h-12 w-full rounded-[8px] bg-[#1a1208] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
        >
          {loading ? "Joining waitlist..." : "Join Public Beta Waitlist"}
        </button>

        <p className="text-center text-sm text-[#7a6a5a]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#1a1208] hover:underline">
            Log In
          </Link>
        </p>
      </form>

      {betaNoticeOpen && (
        <div
          aria-modal="true"
          aria-labelledby="beta-waitlist-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-3 py-4"
          role="dialog"
        >
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[10px] border border-[#d4cdc5] bg-white shadow-2xl">
            <div className="shrink-0 border-b border-[#e0d8d0] px-5 py-5 sm:px-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c0392b]">
                Cerise Scholar public beta
              </p>
              <h2 id="beta-waitlist-title" className="mt-2 text-3xl font-semibold leading-tight text-[#1a1208]">
                Join the public beta waitlist
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#7a6a5a]">
                Cerise Scholar is opening carefully with a small public beta group. Join the waitlist today, and we will
                review each request with care so we can welcome new members into a steady, reliable workspace.
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 text-sm leading-6 text-[#5f5248] sm:px-7">
              <div className="rounded-[8px] border border-[#e0d8d0] bg-[#faf7f0] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c0392b]">
                  Why we are opening carefully
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  <li>We are starting with a small first group so Cerise Scholar stays steady while we keep building and scaling up.</li>
                  <li>Some research, AI, and upload tools are still growing during this public beta phase.</li>
                  <li>Monthly passes, workspace capacity, and support may begin gently while we learn from real use.</li>
                  <li>If your request is approved, we will email you when your beta workspace is ready.</li>
                </ul>
              </div>

              <p>
                If you would like to begin your scholar journey today with us, please join the public beta waitlist
                by continuing to the Terms and Privacy agreement. After you accept, we will review your request
                with care and email you about beta access.
              </p>
            </div>

            <div className="shrink-0 flex flex-col-reverse gap-3 border-t border-[#e0d8d0] bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <Link
                className="rounded-[8px] border border-[#d4cdc5] px-4 py-2 text-center text-sm font-medium text-[#1a1208]"
                href="/"
                onClick={leaveSignup}
              >
                Not now
              </Link>
              <button
                className="rounded-[8px] bg-[#1a1208] px-4 py-2 text-sm font-medium text-white"
                onClick={continueFromBetaNotice}
                type="button"
              >
                {betaNoticeActionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {agreementOpen && (
        <div
          aria-modal="true"
          aria-labelledby="signup-agreement-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-3 py-4"
          role="dialog"
        >
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[10px] border border-[#d4cdc5] bg-white shadow-2xl">
            <div className="border-b border-[#e0d8d0] px-5 py-4 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c0392b]">
                Cerise Scholar public beta
              </p>
              <h2 id="signup-agreement-title" className="mt-2 text-2xl font-semibold text-[#1a1208]">
                Review before joining the waitlist
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#7a6a5a]">
                This creates your public beta waitlist account while we review access requests. We do not sell personal
                data, research files, prompts, notes, uploaded files, or academic work.
              </p>
            </div>

            <div
              aria-label="Agreement documents"
              className="flex gap-2 overflow-x-auto border-b border-[#e0d8d0] px-5 pt-3 sm:px-6"
              role="tablist"
            >
              {agreementDocuments.map((document) => {
                const isActive = document.key === activeAgreementKey;

                return (
                  <button
                    aria-selected={isActive}
                    className={`min-h-11 whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-[#c0392b] text-[#c0392b]"
                        : "border-transparent text-[#7a6a5a] hover:text-[#1a1208]"
                    }`}
                    key={document.key}
                    onClick={() => setActiveAgreementKey(document.key)}
                    role="tab"
                    type="button"
                  >
                    {document.shortLabel}
                  </button>
                );
              })}
            </div>

            <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[1fr_300px] lg:overflow-hidden">
              <div className="px-5 py-5 sm:px-6 lg:min-h-0 lg:overflow-y-auto">
                <div className="mb-5 rounded-[8px] border border-[#e0d8d0] bg-[#faf7f0] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c0392b]">
                    Purpose, method, and scope
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#7a6a5a]">
                    Purpose: review beta access requests, create your account, send account/access updates, and protect
                    the service from abuse. Method: process your account email, authentication provider, consent record,
                    and basic security logs through Cerise Scholar and trusted providers. Scope: no contacts, SMS, call
                    logs, calendar, precise location, microphone, or camera permissions are requested for signup.
                  </p>
                </div>

                <article className="space-y-5 text-[#1a1208]">
                  <header className="border-b border-[#e0d8d0] pb-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c0392b]">
                      Version {activeAgreementDocument.version}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold">{activeAgreementDocument.label}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#7a6a5a]">{activeAgreementDocument.intro}</p>
                    <Link
                      className="mt-3 inline-flex text-sm font-medium text-[#1a1208] underline"
                      href={activeAgreementDocument.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open full {activeAgreementDocument.label}
                    </Link>
                  </header>

                  {activeAgreementDocument.sections.map((section) => (
                    <section className="space-y-2" key={section.heading}>
                      <h4 className="text-lg font-semibold">{section.heading}</h4>
                      <p className="text-sm leading-6 text-[#5f5248]">{section.body}</p>
                    </section>
                  ))}
                </article>
              </div>

              <aside className="border-t border-[#e0d8d0] bg-[#fbf8f3] px-5 py-5 lg:border-l lg:border-t-0 sm:px-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c0392b]">
                  Required consent
                </p>
                <p className="mt-2 text-sm leading-6 text-[#7a6a5a]">
                  Confirm both documents. Nothing is checked by default, and waitlist signup stays paused until both are
                  accepted.
                </p>

                <div className="mt-4 space-y-3">
                  {agreementDocuments.map((document) => (
                    <label
                      className="grid grid-cols-[18px_1fr] gap-3 rounded-[6px] border border-[#e0d8d0] bg-white p-3 text-sm leading-6 text-[#1a1208]"
                      key={document.key}
                    >
                      <input
                        checked={agreementChecks[document.key]}
                        className="mt-1"
                        onChange={(event) =>
                          setAgreementChecks((current) => ({
                            ...current,
                            [document.key]: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      <span>
                        I agree to the{" "}
                        <Link
                          className="font-medium text-[#1a1208] underline"
                          href={document.href}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {document.label}
                        </Link>
                        .
                      </span>
                    </label>
                  ))}
                </div>
              </aside>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#e0d8d0] bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <Link
                className="rounded-[8px] border border-[#d4cdc5] px-4 py-2 text-center text-sm font-medium text-[#1a1208]"
                href="/"
                onClick={() => {
                  leaveSignup();
                }}
              >
                Not now
              </Link>
              <button
                className="rounded-[8px] bg-[#1a1208] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={!allAgreementChecksAccepted || agreementSubmitting}
                onClick={() => {
                  void acceptAgreement();
                }}
                type="button"
              >
                {agreementSubmitting ? "Preparing..." : "Agree and join waitlist"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
