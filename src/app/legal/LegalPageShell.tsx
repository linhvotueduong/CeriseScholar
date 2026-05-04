import Link from "next/link";
import type { ReactNode } from "react";
import type { LegalDocumentKey } from "@/types/legal";
import { legalDocumentList } from "@/app/legal/content";

const p = {
  bg: "#fefefe",
  warm: "#faf7f0",
  surface: "#ffffff",
  ink: "#1a1208",
  muted: "#7a6a5a",
  faint: "#9a8a7a",
  cerise: "#c0392b",
  rule: "#e0d8d0",
  border: "#d4cdc5",
};

export default function LegalPageShell({
  active,
  eyebrow = "Legal",
  title,
  summary,
  children,
}: {
  active?: LegalDocumentKey | "index" | "consent" | "privacy-security";
  eyebrow?: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: p.bg, color: p.ink }}>
      <style>{`
        .legal-shell a:focus-visible,
        .legal-shell button:focus-visible,
        .legal-shell input:focus-visible {
          outline: 2px solid ${p.cerise};
          outline-offset: 3px;
        }

        @media (max-width: 760px) {
          .legal-nav {
            align-items: flex-start !important;
            border-radius: 16px !important;
            flex-direction: column !important;
            height: auto !important;
            gap: 14px !important;
            padding: 18px !important;
          }

          .legal-nav-links,
          .legal-grid,
          .legal-footer {
            grid-template-columns: 1fr !important;
          }

          .legal-nav-links {
            grid-auto-flow: row !important;
          }

          .legal-header {
            padding-top: 64px !important;
          }
        }
      `}</style>

      <div className="legal-shell">
        <div style={{ padding: "12px 24px 0" }}>
          <nav
            className="legal-nav"
            style={{
              maxWidth: "1100px",
              margin: "0 auto",
              minHeight: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 28px",
              background: p.surface,
              borderRadius: "100px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <Link
              href="/"
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                fontSize: "15px",
                color: p.ink,
                textDecoration: "none",
              }}
            >
              Cerise Scholar
            </Link>
            <div
              className="legal-nav-links"
              style={{
                display: "grid",
                gridAutoFlow: "column",
                gap: "16px",
                alignItems: "center",
                fontFamily: "var(--font-noto), 'Noto Sans', sans-serif",
                fontSize: "11px",
              }}
            >
              <Link href="/legal" style={{ color: active === "index" ? p.cerise : p.ink, textDecoration: "none" }}>
                Legal
              </Link>
              {legalDocumentList.map((doc) => (
                <Link
                  key={doc.key}
                  href={doc.href}
                  style={{ color: active === doc.key ? p.cerise : p.ink, textDecoration: "none" }}
                >
                  {doc.shortTitle}
                </Link>
              ))}
              <Link
                href="/about/privacy-security"
                style={{ color: active === "privacy-security" ? p.cerise : p.ink, textDecoration: "none" }}
              >
                Security
              </Link>
              <Link href="/login" style={{ color: p.ink, textDecoration: "none" }}>
                Log In
              </Link>
            </div>
          </nav>
        </div>

        <header
          className="legal-header"
          style={{ maxWidth: "920px", margin: "0 auto", padding: "96px 32px 48px", textAlign: "center" }}
        >
          <p
            style={{
              margin: "0 0 18px",
              color: p.cerise,
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </p>
          <h1
            style={{
              margin: "0 auto",
              maxWidth: "760px",
              fontFamily: "var(--font-display), 'DM Serif Display', Georgia, serif",
              fontSize: "clamp(36px, 5vw, 60px)",
              fontWeight: 400,
              lineHeight: 1.05,
            }}
          >
            {title}
          </h1>
          <p style={{ margin: "22px auto 0", maxWidth: "660px", color: p.muted, lineHeight: 1.7, fontSize: "15px" }}>
            {summary}
          </p>
        </header>

        <main style={{ maxWidth: "980px", margin: "0 auto", padding: "0 32px 80px" }}>{children}</main>

        <footer style={{ background: p.warm, borderTop: `1px solid ${p.rule}` }}>
          <div
            className="legal-footer"
            style={{
              maxWidth: "1100px",
              margin: "0 auto",
              padding: "32px 48px",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "20px",
              alignItems: "center",
            }}
          >
            <span style={{ color: p.faint, fontSize: "11px" }}>
              (c) 2026 Cerise Scholar. Legal pages versioned for safer account access.
            </span>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "11px" }}>
              {legalDocumentList.map((doc) => (
                <Link key={doc.key} href={doc.href} style={{ color: p.faint, textDecoration: "none" }}>
                  {doc.shortTitle}
                </Link>
              ))}
              <Link href="/about/privacy-security" style={{ color: p.faint, textDecoration: "none" }}>
                Security
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export const legalPalette = p;
