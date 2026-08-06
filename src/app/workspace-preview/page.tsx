"use client";

import Link from "next/link";
import { DM_Serif_Display, DM_Sans, Playfair_Display, Noto_Sans, Fredoka } from "next/font/google";
import PublicMarketingNavbar from "@/components/layout/PublicMarketingNavbar";

const dmSerif = DM_Serif_Display({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-dm-serif", display: "swap" });
const dmSans = DM_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const playfair = Playfair_Display({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const notoSans = Noto_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-noto", display: "swap" });
const fredoka = Fredoka({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-fredoka", display: "swap" });

const palette = {
  bg: "#fefefe",
  surface: "#fdfcfa",
  surfaceWarm: "#faf7f0",
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  inkFaint: "#9a8a7a",
  cerise: "#c0392b",
  rule: "#e0d8d0",
  cardBorder: "#d4cdc5",
  gold: "#c8a84b",
};

const documents = [
  { name: "Smith_2023_GeoPolitical.pdf", size: "2.4 MB" },
  { name: "Johnson_2022_Career.pdf", size: "1.8 MB" },
  { name: "Lee_Park_2024_Uncertainty.pdf", size: "3.1 MB" },
  { name: "Chen_2023_Students.pdf", size: "1.2 MB" },
];

const codes = [
  { name: "Abstract", color: "#f87171" },
  { name: "Abstraction", color: "#a78bfa" },
  { name: "Literature Review", color: "#34d399" },
  { name: "Methodology", color: "#60a5fa" },
  { name: "Results", color: "#f59e0b" },
  { name: "Discussion", color: "#f472b6" },
  { name: "Conclusion", color: "#fb923c" },
];

export default function WorkspacePreview() {
  const fontClasses = [dmSerif.variable, dmSans.variable, playfair.variable, notoSans.variable, fredoka.variable].join(" ");

  return (
    <div
      className={fontClasses}
      style={{
        background: palette.bg, color: palette.ink,
        fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
        height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >
      {/* ═══ Primary Navbar — shared public pill ═══ */}
      <PublicMarketingNavbar />

      {/* ═══ Sub-nav tabs ═══ */}
      <div
        style={{
          height: "40px", flexShrink: 0,
          display: "flex", alignItems: "center",
          padding: "0 32px", gap: "28px",
          borderBottom: `1px solid ${palette.rule}`,
          marginTop: "max(8px, 1vw)",
          fontFamily: "var(--font-noto)", fontSize: "12px",
        }}
      >
        <Link href="/projects" style={{ color: palette.inkMuted, textDecoration: "none", fontSize: "11px" }}>
          ← Projects&nbsp;&nbsp;&nbsp;Geopolitical
        </Link>
        <div style={{ flex: 1 }} />
        {[{n:"ScholarAsk",h:"/scholar-ask-preview"},{n:"Workspace",h:"/workspace-preview"},{n:"Meta Analysis",h:"/meta-analysis-preview"},{n:"Lit Review",h:"/lit-review-preview"},{n:"Paper Writer",h:"/paper-writer-preview"}].map((tab) => (
          <Link key={tab.n} href={tab.h} style={{ color: tab.n === "Workspace" ? palette.cerise : palette.inkMuted, fontWeight: tab.n === "Workspace" ? 700 : 400, borderBottom: tab.n === "Workspace" ? `2px solid ${palette.cerise}` : "2px solid transparent", paddingBottom: "8px", marginBottom: "-1px", fontSize: "11px", textDecoration: "none" }}>{tab.n}</Link>
        ))}
      </div>

      {/* ═══ Toolbar ═══ */}
      <div
        style={{
          height: "40px", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: `1px solid ${palette.rule}`,
          background: "#fff",
          fontSize: "12px",
        }}
      >
        {/* Left: pagination */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: palette.inkMuted }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: palette.ink, fontSize: "12px", fontFamily: "var(--font-dm-sans)" }}>Prev</button>
          <span style={{ color: palette.inkFaint }}>·</span>
          <span style={{ color: palette.ink, fontWeight: 600 }}>1 / 177</span>
          <span style={{ color: palette.inkFaint }}>·</span>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: palette.ink, fontSize: "12px", fontFamily: "var(--font-dm-sans)" }}>Next</button>
          <span style={{ color: palette.inkFaint }}>·</span>
          <input type="text" placeholder="Go to" style={{ width: "48px", height: "24px", border: `1px solid ${palette.rule}`, borderRadius: "4px", padding: "0 6px", fontSize: "11px", fontFamily: "var(--font-dm-sans)", outline: "none" }} />
          <button style={{ background: palette.ink, color: "#fff", border: "none", borderRadius: "4px", padding: "3px 10px", fontSize: "11px", fontFamily: "var(--font-dm-sans)", fontWeight: 600, cursor: "pointer" }}>Go</button>
        </div>

        {/* Center: tool pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {["Highlight", "Read Page", "Read Selection", "AI Chat"].map((tool, i) => (
            <button
              key={tool}
              style={{
                background: i === 0 ? palette.cerise : "transparent",
                color: i === 0 ? "#fff" : palette.ink,
                border: i === 0 ? `1px solid ${palette.cerise}` : `1px solid ${palette.rule}`,
                borderRadius: "100px", padding: "4px 14px",
                fontSize: "12px", fontFamily: "var(--font-dm-sans)", fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {tool}
            </button>
          ))}
        </div>

        {/* Right: zoom */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", color: palette.inkMuted }}>−</span>
          <span style={{ fontSize: "12px", fontWeight: 600, color: palette.ink }}>100%</span>
          <span style={{ fontSize: "11px", color: palette.inkMuted }}>+</span>
        </div>
      </div>

      {/* ═══ Main content: 3 columns ═══ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left Sidebar ── */}
        <aside
          style={{
            width: "220px", flexShrink: 0,
            background: palette.surface,
            borderRight: `1px solid ${palette.rule}`,
            overflowY: "auto",
            padding: "16px",
            display: "flex", flexDirection: "column", gap: "20px",
          }}
        >
          {/* Documents */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "10px" }}>
              ▼ Documents
            </div>
            <button
              style={{
                width: "100%", padding: "8px",
                border: `1.5px dashed ${palette.rule}`, borderRadius: "8px",
                background: "transparent", color: palette.inkMuted,
                fontSize: "12px", fontFamily: "var(--font-dm-sans)", fontWeight: 500,
                cursor: "pointer", marginBottom: "10px",
              }}
            >
              + Upload PDF
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {documents.map((doc, i) => (
                <div
                  key={doc.name}
                  style={{
                    padding: "8px 10px", borderRadius: "8px",
                    background: i === 0 ? "#fff" : "transparent",
                    border: i === 0 ? `1.5px solid ${palette.cardBorder}` : "1.5px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: i === 0 ? 600 : 400, color: palette.ink, lineHeight: 1.3 }}>
                    {doc.name}
                  </div>
                  <div style={{ fontSize: "10px", color: palette.inkFaint, marginTop: "2px" }}>
                    {doc.size}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Code System */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "10px" }}>
              ▼ Code System
            </div>
            <button
              style={{
                width: "100%", padding: "8px",
                border: `1.5px dashed ${palette.rule}`, borderRadius: "8px",
                background: "transparent", color: palette.inkMuted,
                fontSize: "12px", fontFamily: "var(--font-dm-sans)", fontWeight: 500,
                cursor: "pointer", marginBottom: "10px",
              }}
            >
              + Add Code
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {codes.map((code) => (
                <div
                  key={code.name}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "5px 8px", borderRadius: "6px", cursor: "pointer",
                    fontSize: "12px", color: palette.ink,
                  }}
                >
                  <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: code.color, flexShrink: 0 }} />
                  {code.name}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── PDF Viewer (center) ── */}
        <main
          style={{
            flex: 1, overflow: "auto",
            background: palette.surfaceWarm,
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "32px 24px",
            position: "relative",
          }}
        >
          {/* Gold star decorations */}
          {[
            { top: "60px", left: "40px", size: 16, rot: -12 },
            { top: "140px", right: "50px", size: 14, rot: 20 },
            { top: "320px", left: "30px", size: 12, rot: 8 },
            { top: "480px", right: "35px", size: 18, rot: -8 },
            { top: "620px", left: "55px", size: 10, rot: 15 },
            { top: "220px", right: "60px", size: 13, rot: -20 },
          ].map((s, i) => (
            <svg
              key={i}
              width={s.size}
              height={s.size}
              viewBox="0 0 24 24"
              fill="none"
              style={{
                position: "absolute",
                top: s.top,
                left: "left" in s ? s.left : undefined,
                right: "right" in s ? s.right : undefined,
                transform: `rotate(${s.rot}deg)`,
                opacity: 0.45,
              }}
            >
              <path d="M12 2 L14.2 9.2 L21.5 9.2 L15.6 13.6 L17.8 20.8 L12 16.4 L6.2 20.8 L8.4 13.6 L2.5 9.2 L9.8 9.2 Z" fill={palette.gold} />
            </svg>
          ))}

          {/* PDF pages */}
          {[1, 2, 3].map((pageNum) => (
            <div key={pageNum} style={{ marginBottom: "24px", width: "100%", maxWidth: "680px" }}>
              <div
                style={{
                  background: "#fff",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  borderRadius: "2px",
                  width: "100%",
                  aspectRatio: "8.5 / 11",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}
              >
                {pageNum === 1 && (
                  <div style={{ textAlign: "center", padding: "60px 40px" }}>
                    <div style={{ fontSize: "11px", color: palette.inkFaint, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                      S T A R S
                    </div>
                    <div style={{ fontSize: "11px", color: palette.inkMuted, marginTop: "4px" }}>
                      University of Central Florida
                    </div>
                    <div style={{ fontSize: "11px", color: palette.inkMuted }}>
                      Electronic Theses and Dissertations, 2004-2019
                    </div>
                    <div style={{ fontSize: "11px", color: palette.inkMuted, marginTop: "max(8px, 1vw)" }}>2011</div>
                    <div
                      style={{
                        fontFamily: "var(--font-dm-serif)",
                        fontSize: "16px", fontWeight: 400,
                        color: palette.ink, lineHeight: 1.4,
                        marginTop: "20px", maxWidth: "400px", marginLeft: "auto", marginRight: "auto",
                      }}
                    >
                      The Effects Of Delay Of Gratification On The Academic Achievement, Substance Abuse, And Violent Behavior Of Middle-school Students
                    </div>
                    <div style={{ fontSize: "11px", color: palette.inkMuted, marginTop: "12px" }}>
                      University of Central Florida
                    </div>
                    <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "12px", fontSize: "8px", color: palette.cerise }}>
                      <span>Home</span><span>About</span><span>Research Guide</span><span>Projects</span>
                    </div>
                  </div>
                )}
                {pageNum > 1 && (
                  <div style={{ padding: "40px", width: "100%" }}>
                    {[...Array(14)].map((_, j) => (
                      <div
                        key={j}
                        style={{
                          height: "6px",
                          background: j === 5 ? "#fde68a" : palette.rule,
                          borderRadius: "3px",
                          width: j === 13 ? "55%" : j === 9 ? "80%" : "100%",
                          marginBottom: "10px",
                          opacity: j === 5 ? 1 : 0.35,
                        }}
                      />
                    ))}
                    {pageNum === 2 && (
                      <div
                        style={{
                          background: "#fef9c3",
                          borderLeft: `3px solid ${palette.gold}`,
                          padding: "8px 12px",
                          borderRadius: "0 6px 6px 0",
                          fontSize: "10px",
                          color: palette.ink,
                          marginTop: "16px",
                          lineHeight: 1.5,
                        }}
                      >
                        &quot;This study examined the effects of geopolitical uncertainty on career decision-making among undergraduate students...&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center", fontSize: "11px", color: palette.inkFaint, marginTop: "max(8px, 1vw)" }}>
                Page {pageNum}
              </div>
            </div>
          ))}
        </main>

        {/* ── Right Highlights Panel ── */}
        <aside
          style={{
            width: "240px", flexShrink: 0,
            borderLeft: `1px solid ${palette.rule}`,
            background: "#fff",
            overflowY: "auto",
            display: "flex", flexDirection: "column",
          }}
        >
          {/* Header */}
          <div style={{ padding: "16px", borderBottom: `1px solid ${palette.rule}` }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Highlights (1)
            </div>
          </div>

          {/* Tabs */}
          <div style={{ padding: "0 16px", borderBottom: `1px solid ${palette.rule}` }}>
            <div style={{ display: "flex", gap: "0" }}>
              {["All Pages", "This Page"].map((tab, i) => (
                <span
                  key={tab}
                  style={{
                    padding: "10px 14px 8px",
                    fontSize: "12px",
                    fontFamily: "var(--font-dm-sans)",
                    color: i === 0 ? palette.cerise : palette.inkMuted,
                    fontWeight: i === 0 ? 600 : 400,
                    borderBottom: i === 0 ? `2px solid ${palette.cerise}` : "2px solid transparent",
                    cursor: "pointer",
                    marginBottom: "-1px",
                  }}
                >
                  {tab}
                </span>
              ))}
            </div>
          </div>

          {/* Highlight entry */}
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: palette.ink, fontWeight: 500 }}>Page 4</span>
                <span style={{ fontSize: "11px", color: palette.inkFaint }}>▼</span>
              </div>
              <span style={{ fontSize: "11px", color: palette.inkFaint, cursor: "pointer" }}>×</span>
            </div>
            <p style={{ fontSize: "12px", color: palette.ink, lineHeight: 1.5, margin: "0 0 8px", fontStyle: "italic" }}>
              &quot;This study examined the effects&quot;
            </p>
            <div
              style={{
                background: "#fef9c3",
                borderRadius: "4px",
                padding: "6px 10px",
                fontSize: "11px",
                color: palette.ink,
                marginBottom: "8px",
              }}
            >
              Ni
            </div>
            <div style={{ fontSize: "10px", color: palette.inkFaint }}>
              3/21/2088, 6:30:00 PM
            </div>
          </div>

          {/* Gold stars in panel */}
          <div style={{ flex: 1, position: "relative" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", bottom: "80px", right: "20px", opacity: 0.4, transform: "rotate(12deg)" }}>
              <path d="M12 2 L14.2 9.2 L21.5 9.2 L15.6 13.6 L17.8 20.8 L12 16.4 L6.2 20.8 L8.4 13.6 L2.5 9.2 L9.8 9.2 Z" fill={palette.gold} />
            </svg>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", bottom: "120px", left: "16px", opacity: 0.35, transform: "rotate(-8deg)" }}>
              <path d="M12 2 L14.2 9.2 L21.5 9.2 L15.6 13.6 L17.8 20.8 L12 16.4 L6.2 20.8 L8.4 13.6 L2.5 9.2 L9.8 9.2 Z" fill={palette.gold} />
            </svg>
          </div>

          {/* Empty state */}
          <div style={{ padding: "16px", textAlign: "center" }}>
            <p style={{ fontSize: "11px", color: palette.inkFaint, lineHeight: 1.5 }}>
              Select text in the PDF and click &quot;Highlight&quot; to add more highlights.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
