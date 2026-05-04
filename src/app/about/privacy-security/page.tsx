/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { DM_Sans, DM_Serif_Display, Fredoka, Noto_Sans, Playfair_Display } from "@/lib/localFonts";
import { legalDocumentList, privacySecurityCommitment } from "@/app/legal/content";
import HEDGEHOG from "@/lib/hedgehog";

export const metadata: Metadata = {
  title: "Privacy & Security Commitment - Cerise Scholar",
  description: privacySecurityCommitment.summary,
};

const dmSerif = DM_Serif_Display({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-dm-serif", display: "swap" });
const dmSans = DM_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const playfair = Playfair_Display({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const notoSans = Noto_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-noto", display: "swap" });
const fredoka = Fredoka({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-fredoka", display: "swap" });

const p = {
  bg: "#fefefe",
  surface: "#ffffff",
  warm: "#faf7f0",
  ink: "#1a1208",
  muted: "#7a6a5a",
  faint: "#9a8a7a",
  cerise: "#c0392b",
  rule: "#e0d8d0",
  border: "#d4cdc5",
};

export default function PrivacySecurityPage() {
  const fontClasses = [dmSerif.variable, dmSans.variable, playfair.variable, notoSans.variable, fredoka.variable].join(" ");

  return (
    <div
      className={`${fontClasses} min-h-screen`}
      style={{ background: p.bg, color: p.ink, fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif" }}
    >
      <style>{`
        .trust-page a:focus-visible,
        .trust-page button:focus-visible {
          outline: 2px solid ${p.cerise};
          outline-offset: 3px;
        }

        @media (max-width: 760px) {
          .trust-nav {
            align-items: flex-start !important;
            border-radius: 16px !important;
            flex-direction: column !important;
            gap: 14px !important;
            height: auto !important;
            padding: 18px !important;
          }

          .trust-nav-links,
          .trust-footer,
          .trust-legal-links {
            grid-template-columns: 1fr !important;
          }

          .trust-nav-links {
            align-items: flex-start !important;
            gap: 12px !important;
          }

          .trust-header {
            padding-top: 72px !important;
          }
        }
      `}</style>

      <div className="trust-page">
        <div style={{ padding: "12px 24px 0", position: "relative" }}>
          <img
            src={HEDGEHOG.hedgehog03Standing}
            alt=""
            className="pointer-events-none hidden lg:block"
            style={{
              position: "absolute",
              left: "calc(50% - 550px - 60px)",
              top: "8px",
              height: "52px",
              width: "auto",
              objectFit: "contain",
              zIndex: 10,
            }}
          />
          <nav
            className="trust-nav"
            style={{
              maxWidth: "1100px",
              margin: "0 auto",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 28px",
              background: "#fff",
              borderRadius: "100px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <Link href="/" style={{ fontFamily: "var(--font-playfair)", fontSize: "15px", color: p.ink, textDecoration: "none" }}>
              Cerise Scholar
            </Link>
            <div
              className="trust-nav-links"
              style={{ display: "flex", alignItems: "center", gap: "20px", fontFamily: "var(--font-noto)", fontSize: "11px" }}
            >
              <Link href="/" className="hover:opacity-70" style={{ color: p.ink, textDecoration: "none" }}>
                Home
              </Link>
              <div className="group" style={{ position: "relative" }}>
                <span className="cursor-pointer" style={{ color: p.cerise, fontWeight: 600 }}>
                  About
                </span>
                <div
                  className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200"
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    marginTop: "8px",
                    background: "#fff",
                    borderRadius: "12px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    padding: "8px",
                    minWidth: "170px",
                    zIndex: 200,
                  }}
                >
                  <Link href="/about/features" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: p.ink, textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>
                    Features
                  </Link>
                  <Link href="/about/mission" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: p.ink, textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>
                    Mission
                  </Link>
                  <Link href="/about/privacy-security" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: p.cerise, textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>
                    Privacy & Security
                  </Link>
                </div>
              </div>
              <Link href="/research-guidance" className="hover:opacity-70" style={{ color: p.ink, textDecoration: "none" }}>
                Research Guide
              </Link>
              <Link href="/projects-preview" className="hover:opacity-70" style={{ color: p.ink, textDecoration: "none" }}>
                Projects
              </Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Link href="/login" className="hover:opacity-70" style={{ fontFamily: "var(--font-noto)", fontSize: "11px", color: p.ink, textDecoration: "none" }}>
                Log In
              </Link>
              <Link
                href="/signup"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 16px",
                  fontFamily: "var(--font-noto)",
                  fontSize: "11px",
                  fontWeight: 600,
                  background: p.ink,
                  color: "#fff",
                  borderRadius: "100px",
                  textDecoration: "none",
                }}
              >
                Sign Up Free
              </Link>
            </div>
          </nav>
        </div>

        <header
          className="trust-header"
          style={{ maxWidth: "980px", margin: "0 auto", padding: "100px 32px 58px", textAlign: "center" }}
        >
          <p
            style={{
              margin: "0 0 20px",
              color: p.cerise,
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            About Cerise Scholar
          </p>
          <h1
            style={{
              margin: "0 auto",
              maxWidth: "860px",
              fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
              fontSize: "clamp(38px, 5vw, 70px)",
              fontWeight: 400,
              lineHeight: 1.05,
            }}
          >
            {privacySecurityCommitment.title}
          </h1>
          <p style={{ margin: "24px auto 0", maxWidth: "760px", color: p.muted, lineHeight: 1.75, fontSize: "16px" }}>
            {privacySecurityCommitment.summary}
          </p>
        </header>

        <main style={{ maxWidth: "980px", margin: "0 auto", padding: "0 32px 82px" }}>
          <article
            style={{
              background: p.surface,
              border: `1.5px solid ${p.border}`,
              borderRadius: "8px",
              padding: "32px",
            }}
          >
            {privacySecurityCommitment.sections.map((section) => (
              <section
                key={section.heading}
                style={{ padding: "0 0 28px", borderBottom: `1px solid ${p.rule}`, marginBottom: "28px" }}
              >
                <h2
                  style={{
                    margin: "0 0 12px",
                    fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                    fontSize: "26px",
                    fontWeight: 400,
                  }}
                >
                  {section.heading}
                </h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} style={{ margin: "12px 0 0", color: p.muted, lineHeight: 1.75, fontSize: "14px" }}>
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}

            <div className="trust-legal-links" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px" }}>
              {legalDocumentList.map((document) => (
                <Link
                  key={document.key}
                  href={document.href}
                  style={{
                    border: `1px solid ${p.border}`,
                    borderRadius: "8px",
                    color: p.ink,
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "12px 14px",
                    textAlign: "center",
                    textDecoration: "none",
                  }}
                >
                  {document.title}
                </Link>
              ))}
            </div>
          </article>
        </main>

        <footer style={{ background: "#f5f2ec", borderTop: `1px solid ${p.rule}` }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 48px 24px" }}>
            <div
              className="trust-footer"
              style={{
                borderTop: `1px solid ${p.rule}`,
                paddingTop: "20px",
                paddingBottom: "24px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "18px",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "11px", color: p.faint }}>© 2025 Cerise Scholar · All rights reserved</span>
              <span style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "11px" }}>
                <Link href="/terms" style={{ color: p.faint, textDecoration: "none" }}>
                  Terms
                </Link>
                <Link href="/privacy" style={{ color: p.faint, textDecoration: "none" }}>
                  Privacy
                </Link>
                <Link href="/ai-data-use" style={{ color: p.faint, textDecoration: "none" }}>
                  AI Data
                </Link>
                <Link href="/beta-terms" style={{ color: p.faint, textDecoration: "none" }}>
                  Beta
                </Link>
                <Link href="/about/privacy-security" style={{ color: p.cerise, textDecoration: "none" }}>
                  Security
                </Link>
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
