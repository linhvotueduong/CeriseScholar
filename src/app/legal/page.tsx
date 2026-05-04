import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell, { legalPalette as p } from "@/app/legal/LegalPageShell";
import { legalDocumentList } from "@/app/legal/content";

export const metadata: Metadata = {
  title: "Legal — Cerise Scholar",
  description: "Cerise Scholar terms, privacy, AI data use, beta participation, and privacy/security information.",
};

export default function LegalIndexPage() {
  return (
    <LegalPageShell
      active="index"
      title="Legal, Privacy, And AI Data Use"
      summary="A clear home for the policies that govern Cerise Scholar accounts, research uploads, AI-assisted tools, beta access, privacy, and security practices."
    >
      <div
        className="legal-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "18px",
        }}
      >
        {legalDocumentList.map((doc) => (
          <Link
            key={doc.key}
            href={doc.href}
            style={{
              minHeight: "190px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "24px",
              padding: "28px",
              borderRadius: "8px",
              border: `1.5px solid ${p.border}`,
              background: p.surface,
              color: p.ink,
              textDecoration: "none",
            }}
          >
            <span style={{ color: p.cerise, fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Version {doc.version}
            </span>
            <span>
              <strong
                style={{
                  display: "block",
                  marginBottom: "10px",
                  fontFamily: "var(--font-display), 'DM Serif Display', Georgia, serif",
                  fontSize: "28px",
                  fontWeight: 400,
                }}
              >
                {doc.shortTitle}
              </strong>
              <span style={{ display: "block", color: p.muted, fontSize: "14px", lineHeight: 1.65 }}>
                {doc.summary}
              </span>
            </span>
            <span style={{ color: p.cerise, fontSize: "13px", fontWeight: 600 }}>Read {doc.shortTitle} -&gt;</span>
          </Link>
        ))}
      </div>
    </LegalPageShell>
  );
}
