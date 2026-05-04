import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import LegalPageShell, { legalPalette as p } from "@/app/legal/LegalPageShell";
import { legalDocumentList, legalDocuments } from "@/app/legal/content";
import { acceptLegalConsent, signOutFromConsent } from "@/app/legal/consent/actions";
import { createClient } from "@/lib/supabase/server";
import {
  getRequiredLegalDocuments,
  hasRequiredLegalConsent,
  isLegalConsentRequired,
  sanitizeLegalRedirect,
} from "@/lib/legal/consent";

export const metadata: Metadata = {
  title: "Limited Beta Agreement — Cerise Scholar",
  description: "Required first-login agreement for Cerise Scholar limited public beta access.",
};

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = sanitizeLegalRedirect(params.next);
  const consentRequired = isLegalConsentRequired();
  const requiredDocuments = getRequiredLegalDocuments();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const consent = user ? await hasRequiredLegalConsent(supabase, user.id) : { hasConsent: false };

  if (consentRequired && user && consent.hasConsent && params.next) {
    redirect(nextPath);
  }

  return (
    <LegalPageShell
      active="consent"
      title="Limited Beta Agreement"
      summary="A calm first-login step confirming the current Terms of Service, Privacy Policy, AI Data Use Notice, and Beta Participation Terms before entering the app."
      eyebrow="Account Access"
    >
      <div
        className="legal-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 280px",
          gap: "32px",
          alignItems: "start",
        }}
      >
        <article
          style={{
            background: p.surface,
            border: `1.5px solid ${p.border}`,
            borderRadius: "8px",
            padding: "32px",
          }}
        >
          {consentRequired && user && !consent.hasConsent && (
            <div
              style={{
                border: `1.5px solid ${p.cerise}`,
                background: "#fff7f5",
                borderRadius: "8px",
                padding: "22px",
                marginBottom: "30px",
              }}
            >
              <h2
                style={{
                  margin: "0 0 10px",
                  fontFamily: "var(--font-display), 'DM Serif Display', Georgia, serif",
                  fontSize: "26px",
                  fontWeight: 400,
                }}
              >
                Agreement Required To Continue
              </h2>
              <p style={{ color: p.muted, lineHeight: 1.7, margin: "0 0 16px", fontSize: "14px" }}>
                Cerise Scholar is in limited public beta. We do not sell your personal data, research files, prompts,
                notes, uploaded files, or academic work. AI features may process selected research context to provide
                app features.
              </p>
              {params.error === "required" && (
                <p style={{ color: p.cerise, margin: "0 0 12px", fontSize: "13px", fontWeight: 600 }}>
                  Please check the consent box before continuing.
                </p>
              )}
              {params.error === "save" && (
                <p style={{ color: p.cerise, margin: "0 0 12px", fontSize: "13px", fontWeight: 600 }}>
                  Consent could not be saved. Please try again or sign out.
                </p>
              )}
              <form action={acceptLegalConsent} style={{ display: "grid", gap: "16px" }}>
                <input type="hidden" name="next" value={nextPath} />
                <label
                  style={{
                    display: "grid",
                    gridTemplateColumns: "18px 1fr",
                    gap: "12px",
                    alignItems: "start",
                    color: p.ink,
                    fontSize: "13px",
                    lineHeight: 1.6,
                  }}
                >
                  <input name="accepted" type="checkbox" required style={{ marginTop: "4px" }} />
                  <span>
                    By continuing, I agree to the{" "}
                    <Link href="/terms" style={{ color: p.cerise }}>
                      Terms of Service
                    </Link>
                    ,{" "}
                    <Link href="/privacy" style={{ color: p.cerise }}>
                      Privacy Policy
                    </Link>
                    ,{" "}
                    <Link href="/ai-data-use" style={{ color: p.cerise }}>
                      AI Data Use Notice
                    </Link>
                    , and{" "}
                    <Link href="/beta-terms" style={{ color: p.cerise }}>
                      Beta Participation Terms
                    </Link>
                    .
                  </span>
                </label>
                <button
                  type="submit"
                  style={{
                    width: "fit-content",
                    border: "none",
                    borderRadius: "999px",
                    background: p.ink,
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 700,
                    padding: "12px 22px",
                  }}
                >
                  Agree And Continue
                </button>
              </form>
            </div>
          )}

          {user && (!consentRequired || consent.hasConsent) && (
            <div
              style={{
                border: `1px solid ${p.rule}`,
                background: p.warm,
                borderRadius: "8px",
                padding: "18px",
                marginBottom: "30px",
              }}
            >
              <p style={{ margin: 0, color: p.muted, fontSize: "13px", lineHeight: 1.6 }}>
                {consentRequired
                  ? "Your account has accepted the current legal consent versions."
                  : "The legal consent gate is currently disabled. These pages remain available for review."}
              </p>
            </div>
          )}

          {!user && (
            <div
              style={{
                border: `1px solid ${p.rule}`,
                background: p.warm,
                borderRadius: "8px",
                padding: "18px",
                marginBottom: "30px",
              }}
            >
              <p style={{ margin: "0 0 12px", color: p.muted, fontSize: "13px", lineHeight: 1.6 }}>
                Sign in to accept this consent for your account. You can still read the notice below without signing in.
              </p>
              <Link href={`/login?next=${encodeURIComponent(nextPath)}`} style={{ color: p.cerise, fontSize: "13px", fontWeight: 700 }}>
                Log in to continue
              </Link>
            </div>
          )}

          <section style={{ padding: "0 0 28px", borderBottom: `1px solid ${p.rule}`, marginBottom: "28px" }}>
            <h2
              style={{
                margin: "0 0 12px",
                fontFamily: "var(--font-display), 'DM Serif Display', Georgia, serif",
                fontSize: "26px",
                fontWeight: 400,
              }}
            >
              What this agreement records
            </h2>
            <p style={{ margin: "12px 0 0", color: p.muted, lineHeight: 1.75, fontSize: "14px" }}>
              When the gate is enabled, Cerise Scholar records that your account accepted the current version and hash
              for each required legal document. This creates an audit-friendly record without changing your existing
              project data, uploaded files, or account content.
            </p>
            <div style={{ display: "grid", gap: "10px", marginTop: "18px" }}>
              {requiredDocuments.map((document) => (
                <Link
                  key={document.slug}
                  href={legalDocuments[document.slug].href}
                  style={{
                    border: `1px solid ${p.rule}`,
                    borderRadius: "8px",
                    color: p.ink,
                    display: "grid",
                    gap: "4px",
                    padding: "14px 16px",
                    textDecoration: "none",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 700 }}>{document.title}</span>
                  <span style={{ color: p.faint, fontSize: "12px" }}>
                    Version {document.version}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {legalDocumentList.map((document) => (
            <section key={document.key} style={{ padding: "0 0 28px", borderBottom: `1px solid ${p.rule}`, marginBottom: "28px" }}>
              <h2
                style={{
                  margin: "0 0 12px",
                  fontFamily: "var(--font-display), 'DM Serif Display', Georgia, serif",
                  fontSize: "26px",
                  fontWeight: 400,
                }}
              >
                {document.title}
              </h2>
              <p style={{ margin: "12px 0 0", color: p.muted, lineHeight: 1.75, fontSize: "14px" }}>
                {document.summary}
              </p>
              <Link href={document.href} style={{ color: p.cerise, display: "inline-block", fontSize: "13px", fontWeight: 700, marginTop: "12px" }}>
                Read {document.shortTitle}
              </Link>
            </section>
          ))}
        </article>

        <aside
          style={{
            background: p.warm,
            border: `1px solid ${p.rule}`,
            borderRadius: "8px",
            padding: "18px",
            position: "sticky",
            top: "18px",
          }}
        >
          <p style={{ margin: "0 0 12px", color: p.ink, fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Account
          </p>
          <p style={{ margin: "0 0 16px", color: p.muted, fontSize: "13px", lineHeight: 1.6 }}>
            {user ? user.email : "Not signed in"}
          </p>
          {user && (
            <form action={signOutFromConsent}>
              <button
                type="submit"
                style={{
                  width: "100%",
                  border: `1px solid ${p.border}`,
                  borderRadius: "999px",
                  background: p.surface,
                  color: p.ink,
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "10px 14px",
                }}
              >
                Sign Out
              </button>
            </form>
          )}
        </aside>
      </div>
    </LegalPageShell>
  );
}
