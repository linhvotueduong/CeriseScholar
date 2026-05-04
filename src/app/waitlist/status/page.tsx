import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getBetaAccessForUser,
  sanitizeBetaRedirect,
} from "@/lib/beta/server";
import { isApprovedBetaStatus } from "@/lib/beta/config";
import { betaWaitlistStatusLabels } from "@/types/beta";
import { signOutFromWaitlistStatus } from "./actions";

export const dynamic = "force-dynamic";

const p = {
  ink: "#1a1208",
  muted: "#7a6a5a",
  cerise: "#c0392b",
  border: "#d4cdc5",
  rule: "#e0d8d0",
  warm: "#faf7f0",
  bg: "#fefefe",
};

export default async function WaitlistStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = sanitizeBetaRedirect(params.next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/waitlist/status")}`);
  }

  const access = await getBetaAccessForUser(supabase, user);

  if (access.status === "admin_approved") {
    redirect(nextPath);
  }

  const isNotRequested = access.status === "not_requested";
  const hasAccessError = access.status === "unknown";
  const status = access.application?.status ?? (isApprovedBetaStatus(access.status) ? "approved" : "pending_review");
  const label = isNotRequested
    ? "Waitlist not completed"
    : hasAccessError
      ? "Access check needed"
      : betaWaitlistStatusLabels[status] ?? "Pending Review";
  const isApproved = status === "approved";
  const isFutureCohort = status === "future_cohort";
  const heading = isApproved
    ? "You are approved for beta access"
    : isNotRequested
      ? "This account has not finished waitlist signup"
      : hasAccessError
        ? "We could not verify beta access yet"
        : isFutureCohort
          ? "We hope to welcome you in a future cohort"
          : "Thank you for joining the waitlist";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: p.bg,
        color: p.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "680px",
          border: `1.5px solid ${p.border}`,
          borderRadius: "8px",
          background: "#fff",
          padding: "36px",
          boxShadow: "0 18px 50px rgba(26,18,8,0.08)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            color: p.ink,
            textDecoration: "none",
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            fontSize: "22px",
            marginBottom: "28px",
          }}
        >
          Cerise Scholar
        </Link>

        <p
          style={{
            color: p.cerise,
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            marginBottom: "12px",
          }}
        >
          {label}
        </p>

        <h1
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            fontSize: "clamp(36px, 7vw, 64px)",
            fontWeight: 400,
            lineHeight: 1,
            margin: "0 0 22px",
          }}
        >
          {heading}
        </h1>

        {isApproved ? (
          <p style={{ color: p.muted, fontSize: "18px", lineHeight: 1.7, marginBottom: "28px" }}>
            Your Cerise Scholar public beta access is approved. You can continue to your research workspace.
          </p>
        ) : isNotRequested ? (
          <div style={{ color: p.muted, fontSize: "17px", lineHeight: 1.75, marginBottom: "28px" }}>
            <p>
              You are signed in, but this account has not completed the Terms and Privacy agreement for the public beta
              waitlist.
            </p>
            <p>
              If this is not the account you meant to use, sign out and start the waitlist signup flow with the right
              email.
            </p>
          </div>
        ) : hasAccessError ? (
          <div style={{ color: p.muted, fontSize: "17px", lineHeight: 1.75, marginBottom: "28px" }}>
            <p>
              This account is signed in, but Cerise Scholar could not confirm a beta access record yet. This can happen
              while the waitlist database setup is still being tested.
            </p>
            <p>Sign out to use a different account, or ask the Cerise Scholar admin to check your beta access status.</p>
          </div>
        ) : isFutureCohort ? (
          <div style={{ color: p.muted, fontSize: "17px", lineHeight: 1.75, marginBottom: "28px" }}>
            <p>
              We cannot invite you into this beta cohort right now, but we still hope to see you in the future when
              Cerise Scholar scales up.
            </p>
            <p>Thank you for believing in us and in your scientific journey.</p>
          </div>
        ) : (
          <div style={{ color: p.muted, fontSize: "17px", lineHeight: 1.75, marginBottom: "28px" }}>
            <p>
              We are a small startup, and we truly appreciate your support. We will review your request and email you
              about beta access within 3-4 business days.
            </p>
            <p>
              If we cannot invite you right now, we still hope to welcome you in a future cohort as Cerise Scholar
              scales. Thank you for believing in us and in your scientific journey.
            </p>
          </div>
        )}

        <div
          style={{
            border: `1px solid ${p.rule}`,
            background: p.warm,
            borderRadius: "8px",
            padding: "16px",
            color: p.muted,
            fontSize: "14px",
            lineHeight: 1.6,
            marginBottom: "24px",
          }}
        >
          Signed in as <strong style={{ color: p.ink }}>{user.email}</strong>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          {isApproved && (
            <Link
              href={nextPath}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "44px",
                padding: "0 18px",
                borderRadius: "999px",
                background: p.ink,
                color: "#fff",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              Continue to Cerise Scholar
            </Link>
          )}
          {!isApproved && (
            <form action={signOutFromWaitlistStatus}>
              <button
                type="submit"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "44px",
                  padding: "0 18px",
                  borderRadius: "999px",
                  background: p.ink,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                Sign out and use another email
              </button>
            </form>
          )}
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "44px",
              padding: "0 18px",
              borderRadius: "999px",
              border: `1px solid ${p.border}`,
              color: p.ink,
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
