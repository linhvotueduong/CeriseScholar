"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { agreementDocuments, type AgreementKey } from "@/lib/legal/agreements";
import Link from "next/link";
import GoogleButton from "./GoogleButton";

const PUBLIC_SIGNUPS_ENABLED = process.env.NEXT_PUBLIC_SIGNUPS_ENABLED !== "false";
const PENDING_GOOGLE_PROFILE_KEY = "cerise_pending_google_signup_profile";
const DEVICE_NOTICE =
  "For the full Cerise Scholar research experience, use the laptop where your files, storage, and local AI agent are set up. Mobile sign-in is available for review and lighter workspace access.";

type PendingSignupAction = "email" | "google" | null;

type SignupProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
};

const emptySignupProfile: SignupProfile = {
  firstName: "",
  lastName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateProvince: "",
  postalCode: "",
  country: "",
};

export default function SignupForm() {
  const [profile, setProfile] = useState<SignupProfile>(emptySignupProfile);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobileEmailOpen, setMobileEmailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [emailUpdatesOptIn, setEmailUpdatesOptIn] = useState(false);
  const [expandedAgreement, setExpandedAgreement] = useState<AgreementKey | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingSignupAction>(null);
  const [pendingGoogleStart, setPendingGoogleStart] = useState<(() => Promise<void>) | null>(null);
  const router = useRouter();

  const expandedDocument = expandedAgreement ? agreementDocuments[expandedAgreement] : null;
  const requiredProfileComplete = [
    profile.firstName,
    profile.lastName,
    profile.phone,
    profile.addressLine1,
    profile.city,
    profile.stateProvince,
    profile.postalCode,
    profile.country,
  ].every((value) => value.trim().length > 0);
  const canContinueFromDetails = requiredProfileComplete && ageConfirmed;

  function updateProfileField(field: keyof SignupProfile, value: string) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function getProfileMetadata() {
    const trimmedProfile = Object.fromEntries(
      Object.entries(profile).map(([key, value]) => [key, value.trim()]),
    ) as SignupProfile;
    const fullName = `${trimmedProfile.firstName} ${trimmedProfile.lastName}`.trim();

    return {
      first_name: trimmedProfile.firstName,
      last_name: trimmedProfile.lastName,
      full_name: fullName,
      phone: trimmedProfile.phone,
      address: {
        line1: trimmedProfile.addressLine1,
        line2: trimmedProfile.addressLine2,
        city: trimmedProfile.city,
        state_province: trimmedProfile.stateProvince,
        postal_code: trimmedProfile.postalCode,
        country: trimmedProfile.country,
      },
      beta_signup_source: "public_laptop_beta",
      age_confirmed: ageConfirmed,
      age_confirmed_at: ageConfirmed ? new Date().toISOString() : null,
      email_updates_opt_in: emailUpdatesOptIn,
      email_updates_opt_in_at: emailUpdatesOptIn ? new Date().toISOString() : null,
      terms_accepted_at: new Date().toISOString(),
      terms_version: agreementDocuments.terms.updated,
      privacy_version: agreementDocuments.privacy.updated,
    };
  }

  function openDetails(action: Exclude<PendingSignupAction, null>) {
    setError(null);
    setPendingAction(action);
    setExpandedAgreement(null);
    setAgeConfirmed(false);
    setEmailUpdatesOptIn(false);
    setDetailsOpen(true);
  }

  async function submitEmailSignup() {
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: getProfileMetadata(),
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    openDetails("email");
  }

  function handleDetailsCancel() {
    if (loading) {
      return;
    }

    setDetailsOpen(false);
    setPendingAction(null);
    setPendingGoogleStart(null);
    setExpandedAgreement(null);
    setAgeConfirmed(false);
    setEmailUpdatesOptIn(false);
  }

  async function handleDetailsAccept() {
    if (!canContinueFromDetails || !pendingAction) {
      return;
    }

    setDetailsOpen(false);

    if (pendingAction === "email") {
      await submitEmailSignup();
      setPendingAction(null);
      return;
    }

    const startGoogle = pendingGoogleStart;
    setPendingAction(null);
    setPendingGoogleStart(null);
    if (startGoogle) {
      window.localStorage.setItem(PENDING_GOOGLE_PROFILE_KEY, JSON.stringify(getProfileMetadata()));
      await startGoogle();
    }
  }

  if (!PUBLIC_SIGNUPS_ENABLED) {
    return (
      <div className="w-full space-y-4 rounded-[8px] border border-[#d4cdc5] bg-[#faf7f0] p-5 text-center">
        <h2 className="text-xl font-semibold text-[#1a1208]">
          New account creation is paused for a moment
        </h2>
        <p className="text-sm leading-6 text-[#6f6255]">
          Existing accounts can still sign in. Cerise Scholar may briefly pause new signups when we
          need to protect the beta, perform maintenance, or review unusual activity.
        </p>
        <Link
          href="/login"
          className="block min-h-12 w-full rounded-[8px] bg-[#1a1208] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full space-y-4 rounded-[8px] border border-[#d4cdc5] bg-white p-6 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c0392b]">
          Public laptop beta
        </p>
        <h2 className="text-2xl font-semibold text-[#1a1208]">Confirm your email</h2>
        <p className="text-sm leading-6 text-[#7a6a5a]">
          We sent a confirmation link to <strong>{email}</strong>. If email confirmation is enabled
          for this beta, click the link to activate your account.
        </p>
        <Link href="/login" className="text-sm font-medium text-[#1a1208] hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div className="space-y-2 md:hidden">
        <GoogleButton
          compact
          label="Continue with Google"
          onBeforeStart={(startGoogle) => {
            setPendingGoogleStart(() => startGoogle);
            openDetails("google");
            return false;
          }}
        />

        {!mobileEmailOpen ? (
          <>
            <button
              type="button"
              onClick={() => setMobileEmailOpen(true)}
              className="min-h-9 w-full rounded-[8px] bg-[#f0ece8] px-3 py-1.5 text-[10.5px] font-bold text-[#1a1208] transition-colors hover:bg-[#e8e2dc]"
            >
              Continue with Email
            </button>
            <p className="px-3 pt-1.5 text-center text-[8.8px] leading-[1.45] text-[#9a8a7a]">
              Start your account here. The deeper research tools will meet you on the trusted
              laptop where your files and local AI live.
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setMobileEmailOpen(false);
                setError(null);
              }}
              className="text-xs font-semibold text-[#7a6a5a] hover:text-[#1a1208]"
            >
              Back to sign-up choices
            </button>

            <div>
              <label
                htmlFor="mobile-signup-email"
                className="mb-1.5 block text-[12px] font-semibold text-[#5f5248]"
              >
                Email
              </label>
              <input
                id="mobile-signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="min-h-10 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-3 py-2 text-[12px] text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="mobile-signup-password"
                className="mb-1.5 block text-[12px] font-semibold text-[#5f5248]"
              >
                Password
              </label>
              <input
                id="mobile-signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="min-h-10 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-3 py-2 text-[12px] text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
                placeholder="At least 8 characters"
              />
            </div>

            {error && (
              <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-10 w-full rounded-[10px] bg-[#1a1208] px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Next"}
            </button>
          </form>
        )}

        <p className="text-center text-[11px] leading-4 text-[#7a6a5a]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#1a1208] hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <div className="hidden space-y-5 md:block">
        <GoogleButton
          label="Continue with Google"
          onBeforeStart={(startGoogle) => {
            setPendingGoogleStart(() => startGoogle);
            openDetails("google");
            return false;
          }}
        />

        <div className="flex items-center gap-3 text-xs font-medium text-[#9a8a7a]">
          <span className="h-px flex-1 bg-[#e0d8d0]" />
          <span>or create your account with email</span>
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
            autoComplete="email"
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
            autoComplete="new-password"
            className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-4 py-3 text-sm text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
            placeholder="At least 8 characters"
          />
          <p className="mt-2 text-xs leading-5 text-[#8a7a6b]">
            Your password is handled by secure authentication and is not saved as profile data.
          </p>
        </div>

        <p className="rounded-[8px] border border-[#e0d8d0] bg-white px-3 py-3 text-xs leading-5 text-[#7a6a5a]">
          {DEVICE_NOTICE}
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
          {loading ? "Creating account..." : "Continue"}
        </button>

        <p className="text-center text-sm text-[#7a6a5a]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#1a1208] hover:underline">
            Sign in
          </Link>
        </p>
        </form>
      </div>

      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1208]/45 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-details-title"
            className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[16px] border border-[#d4cdc5] bg-white shadow-2xl"
          >
            <div className="relative border-b border-[#e0d8d0] bg-[#fbf7f0] px-5 py-4 pr-14">
              <button
                type="button"
                onClick={handleDetailsCancel}
                disabled={loading}
                aria-label="Close account details"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[#e0d8d0] bg-white text-[#7a6a5a] shadow-[0_6px_16px_rgba(26,18,8,0.08)] transition-colors hover:border-[#cfc4b8] hover:bg-[#fbf7f0] hover:text-[#1a1208] disabled:opacity-50"
              >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                  <path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                </svg>
              </button>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c0392b]">
                Cerise Scholar public laptop beta
              </p>
              <h2 id="signup-details-title" className="mt-2 text-xl font-semibold text-[#1a1208]">
                Finish your account details
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6f6255]">
                Add your profile details to continue creating your Cerise Scholar account.
              </p>
            </div>

            <div className="max-h-[calc(92vh-132px)] space-y-5 overflow-y-auto p-5">
              <section className="space-y-3">
                <p className="text-sm font-semibold text-[#5f5248]">Name</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => updateProfileField("firstName", e.target.value)}
                    required
                    autoComplete="given-name"
                    className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-4 py-3 text-sm text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
                    placeholder="First name"
                    aria-label="First name"
                  />
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => updateProfileField("lastName", e.target.value)}
                    required
                    autoComplete="family-name"
                    className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-4 py-3 text-sm text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
                    placeholder="Last name"
                    aria-label="Last name"
                  />
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#5f5248]">
                    Account email
                  </label>
                  <input
                    type="email"
                    value={pendingAction === "email" ? email : "Provided by Google after sign-in"}
                    readOnly
                    className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#faf7f0] px-4 py-3 text-sm text-[#6f6255]"
                    aria-label="Account email"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#5f5248]">
                    Mobile number
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => updateProfileField("phone", e.target.value)}
                    required
                    autoComplete="tel"
                    className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-4 py-3 text-sm text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
                    placeholder="(000) 000-0000"
                    aria-label="Mobile number"
                  />
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-sm font-semibold text-[#5f5248]">Address</p>
                <input
                  type="text"
                  value={profile.addressLine1}
                  onChange={(e) => updateProfileField("addressLine1", e.target.value)}
                  required
                  autoComplete="address-line1"
                  className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-4 py-3 text-sm text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
                  placeholder="Street address"
                  aria-label="Street address"
                />
                <input
                  type="text"
                  value={profile.addressLine2}
                  onChange={(e) => updateProfileField("addressLine2", e.target.value)}
                  autoComplete="address-line2"
                  className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-4 py-3 text-sm text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
                  placeholder="Apartment, suite, unit"
                  aria-label="Apartment, suite, unit"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => updateProfileField("city", e.target.value)}
                    required
                    autoComplete="address-level2"
                    className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-4 py-3 text-sm text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
                    placeholder="City"
                    aria-label="City"
                  />
                  <input
                    type="text"
                    value={profile.stateProvince}
                    onChange={(e) => updateProfileField("stateProvince", e.target.value)}
                    required
                    autoComplete="address-level1"
                    className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-4 py-3 text-sm text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
                    placeholder="State / Province"
                    aria-label="State or province"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={profile.postalCode}
                    onChange={(e) => updateProfileField("postalCode", e.target.value)}
                    required
                    autoComplete="postal-code"
                    className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-4 py-3 text-sm text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
                    placeholder="Postal / ZIP code"
                    aria-label="Postal or ZIP code"
                  />
                  <input
                    type="text"
                    value={profile.country}
                    onChange={(e) => updateProfileField("country", e.target.value)}
                    required
                    autoComplete="country-name"
                    className="min-h-12 w-full rounded-[8px] border border-[#d4cdc5] bg-[#fefefe] px-4 py-3 text-sm text-[#1a1208] shadow-[inset_0_1px_0_rgba(26,18,8,0.03)] transition-colors placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/15"
                    placeholder="Country"
                    aria-label="Country"
                  />
                </div>
              </section>

              <p className="rounded-[8px] border border-[#e0d8d0] bg-white px-3 py-3 text-xs leading-5 text-[#7a6a5a]">
                {DEVICE_NOTICE}
              </p>

              <div className="space-y-3">
                <label className="flex gap-3 text-sm leading-6 text-[#5f5248]">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    className="mt-1 h-4 w-4 flex-shrink-0 rounded border-[#d4cdc5]"
                  />
                  <span>
                    Yes, I am 18 years old or older. <span className="text-[#c0392b]">*</span>
                  </span>
                </label>

                <label className="flex gap-3 text-sm leading-6 text-[#5f5248]">
                  <input
                    type="checkbox"
                    checked={emailUpdatesOptIn}
                    onChange={(e) => setEmailUpdatesOptIn(e.target.checked)}
                    className="mt-1 h-4 w-4 flex-shrink-0 rounded border-[#d4cdc5]"
                  />
                  <span>
                    I agree to receive Cerise Scholar news, product updates, beta announcements, and
                    research workflow tips by email.
                  </span>
                </label>
              </div>

              {expandedDocument && (
                <article className="rounded-[8px] border border-[#e0d8d0] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eee6dc] pb-3">
                    <h3 className="text-lg font-semibold text-[#1a1208]">
                      {expandedDocument.title}
                    </h3>
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-medium text-[#9a8a7a]">
                        Updated {expandedDocument.updated}
                      </p>
                      <Link
                        className="text-xs font-semibold text-[#1a1208] underline underline-offset-2"
                        href={`/help/${expandedAgreement}`}
                      >
                        Open full page
                      </Link>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#6f6255]">{expandedDocument.intro}</p>
                  <div className="mt-4 space-y-4">
                    {expandedDocument.sections.map((section) => (
                      <section key={section.heading}>
                        <h4 className="text-sm font-semibold text-[#1a1208]">{section.heading}</h4>
                        <div className="mt-1 space-y-2">
                          {(Array.isArray(section.body) ? section.body : [section.body]).map((paragraph) => (
                            <p className="text-sm leading-6 text-[#6f6255]" key={paragraph}>
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </article>
              )}

              <div className="border-t border-[#e0d8d0] pt-4">
                <p className="text-center text-xs leading-5 text-[#7a6a5a]">
                  By creating an account, you agree to our{" "}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedAgreement((current) => (current === "terms" ? null : "terms"))
                    }
                    className="font-semibold text-[#1a1208] underline underline-offset-2"
                    aria-expanded={expandedAgreement === "terms"}
                  >
                    Terms of Use
                  </button>{" "}
                  and have read and acknowledge the{" "}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedAgreement((current) => (current === "privacy" ? null : "privacy"))
                    }
                    className="font-semibold text-[#1a1208] underline underline-offset-2"
                    aria-expanded={expandedAgreement === "privacy"}
                  >
                    Privacy Policy
                  </button>
                  .
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleDetailsAccept}
                  disabled={!canContinueFromDetails || loading}
                  className="min-h-12 w-full rounded-[8px] bg-[#1a1208] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:order-1"
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
