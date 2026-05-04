import Link from "next/link";
import { legalDocumentList, type LegalDocument } from "@/app/legal/content";
import LegalPageShell, { legalPalette as p } from "@/app/legal/LegalPageShell";

export default function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <LegalPageShell
      active={document.key}
      title={document.title}
      summary={document.summary}
      eyebrow={`Version ${document.version} · Effective ${document.effectiveDate}`}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 220px",
          gap: "32px",
          alignItems: "start",
        }}
        className="legal-grid"
      >
        <article
          style={{
            background: p.surface,
            border: `1.5px solid ${p.border}`,
            borderRadius: "8px",
            padding: "32px",
          }}
        >
          {document.sections.map((section) => (
            <section key={section.heading} style={{ padding: "0 0 28px", borderBottom: `1px solid ${p.rule}`, marginBottom: "28px" }}>
              <h2
                style={{
                  margin: "0 0 12px",
                  fontFamily: "var(--font-display), 'DM Serif Display', Georgia, serif",
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
          <p style={{ margin: 0, color: p.faint, fontSize: "12px", lineHeight: 1.6 }}>
            This page is product policy information, not legal advice. Contact{" "}
            <a href="mailto:cerisescholar@gmail.com" style={{ color: p.cerise }}>
              cerisescholar@gmail.com
            </a>{" "}
            with privacy, security, or account questions.
          </p>
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
          <p
            style={{
              margin: "0 0 12px",
              color: p.ink,
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Legal
          </p>
          <div style={{ display: "grid", gap: "10px", fontSize: "13px" }}>
            <Link href="/legal" style={{ color: p.muted, textDecoration: "none" }}>
              Overview
            </Link>
            {legalDocumentList.map((doc) => (
              <Link
                key={doc.key}
                href={doc.href}
                style={{ color: document.key === doc.key ? p.cerise : p.muted, textDecoration: "none" }}
              >
                {doc.shortTitle}
              </Link>
            ))}
            <Link href="/about/privacy-security" style={{ color: p.muted, textDecoration: "none" }}>
              Privacy & Security
            </Link>
          </div>
        </aside>
      </div>
    </LegalPageShell>
  );
}
