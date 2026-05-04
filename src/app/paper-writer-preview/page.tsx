/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState } from "react";
import { DM_Serif_Display, DM_Sans, Playfair_Display, Noto_Sans, Fredoka } from "@/lib/localFonts";
import HEDGEHOG from "@/lib/hedgehog";

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

const sections = [
  { id: "abstract", label: "Abstract", icon: "1" },
  { id: "introduction", label: "Introduction", icon: "2" },
  { id: "literature", label: "Literature Review", icon: "3" },
  { id: "methodology", label: "Methodology", icon: "4" },
  { id: "results", label: "Results", icon: "5" },
  { id: "discussion", label: "Discussion", icon: "6" },
  { id: "conclusion", label: "Conclusion", icon: "7" },
  { id: "references", label: "References", icon: "8" },
];

const sampleContent: Record<string, { title: string; guidance: string; imported: string[]; body: string }> = {
  abstract: {
    title: "Abstract",
    guidance: "Write a 150-300 word summary of your entire paper. Include your research question, methodology, key findings, and conclusions. Write this section LAST after completing all other sections.",
    imported: [],
    body: "",
  },
  introduction: {
    title: "Introduction",
    guidance: "Introduce your topic, provide context, and state your research question and hypothesis. End with a brief overview of your paper's structure.",
    imported: [
      "\"Geopolitical uncertainty has been shown to significantly impact career decision-making...\" — Smith et al. (2023)",
    ],
    body: "The relationship between geopolitical instability and student career planning has emerged as a critical area of study in recent years. As global political landscapes shift with increasing frequency, university students face unprecedented uncertainty in their career trajectories...",
  },
  literature: {
    title: "Literature Review",
    guidance: "Synthesize existing research on your topic. Group sources by theme, not by individual paper. Show how your research fills a gap in the existing literature.",
    imported: [
      "\"Geopolitical uncertainty has been shown to significantly impact career decision-making...\" — Smith et al. (2023)",
      "\"Students in regions with higher political instability scored 23% lower on the CDSE scale...\" — Lee & Park (2024)",
      "\"The mediating role of perceived economic threat suggests that geopolitical effects are not direct...\" — Chen (2023)",
    ],
    body: "Multiple studies converge on the finding that geopolitical instability creates measurable anxiety in student career planning (Smith, 2023; Johnson, 2022). While Lee & Park (2024) found a medium effect size (d=0.67), this contrasts with Rivera (2019) who reported null results, suggesting moderating variables may be at play...",
  },
  methodology: {
    title: "Methodology",
    guidance: "Describe your research design, participants, instruments, procedures, and analysis methods. Be specific enough that another researcher could replicate your study.",
    imported: [
      "\"A mixed-methods approach combining survey data (n=450) with semi-structured interviews (n=32)...\" — Johnson (2022)",
    ],
    body: "",
  },
  results: {
    title: "Results",
    guidance: "Present your findings objectively without interpretation. Include statistics, effect sizes, confidence intervals, and visualizations where appropriate.",
    imported: [],
    body: "",
  },
  discussion: {
    title: "Discussion",
    guidance: "Interpret your results in context of the existing literature. Address whether your hypothesis was supported. Discuss limitations and suggest future research.",
    imported: [],
    body: "",
  },
  conclusion: {
    title: "Conclusion",
    guidance: "Summarize your key findings and their implications. Restate your research question and how your study contributes to the field.",
    imported: [],
    body: "",
  },
  references: {
    title: "References",
    guidance: "List all sources cited in your paper in APA format. These are auto-imported from your Literature Review Table.",
    imported: [
      "Chen, W. (2023). Mediating pathways between geopolitics and career planning. Journal of Vocational Behavior, 140, 103-118.",
      "Johnson, R. (2022). Career decision-making under uncertainty. International Journal of Career Studies, 18(2), 45-67.",
      "Lee, S. & Park, H. (2024). Political instability and career self-efficacy. Asian Journal of Education, 12(1), 89-104.",
      "Smith, J., Johnson, R., & Lee, K. (2023). Effects of geopolitical uncertainty on student career planning. Journal of Educational Research, 45(3), 112-128.",
    ],
    body: "",
  },
};

export default function PaperWriterPreview() {
  const fontClasses = [dmSerif.variable, dmSans.variable, playfair.variable, notoSans.variable, fredoka.variable].join(" ");
  const [activeSection, setActiveSection] = useState("literature");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const content = sampleContent[activeSection];

  return (
    <div
      className={fontClasses}
      style={{
        background: palette.bg, color: palette.ink,
        fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
        height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >
      {/* ═══ Primary Navbar — pill style ═══ */}
      <div style={{ padding: "12px 24px 0", flexShrink: 0, position: "relative" }}>
        {/* Mascot outside navbar pill, anchored to pill's left edge */}
        <img
          src={HEDGEHOG.hedgehog04RedPen}
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
          style={{
            maxWidth: "1100px", margin: "0 auto",
            height: "48px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 28px",
            background: "#ffffff",
            borderRadius: "100px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link href="/" style={{ fontFamily: "var(--font-playfair)", fontSize: "15px", color: palette.ink, textDecoration: "none" }}>
              Cerise Scholar
            </Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "20px", fontFamily: "var(--font-noto)", fontSize: "11px" }}>
            <Link href="/" className="hover:opacity-70" style={{ color: palette.ink, textDecoration: "none" }}>Home</Link>
            <div className="group" style={{ position: "relative" }}><span className="hover:opacity-70 cursor-pointer" style={{ color: palette.ink }}>About</span><div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200" style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: "8px", background: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", padding: "8px", minWidth: "170px", zIndex: 200 }}><Link href="/about/features" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: palette.ink, textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>Features</Link><Link href="/about/mission" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: palette.ink, textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>Mission</Link><Link href="/about/privacy-security" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: palette.ink, textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>Privacy & Security</Link></div></div>
            <Link href="/research-guidance" className="hover:opacity-70" style={{ color: palette.ink, textDecoration: "none" }}>Research Guide</Link>
            <Link href="/projects-preview" className="hover:opacity-70" style={{ color: palette.ink, textDecoration: "none" }}>Projects</Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link href="/login" className="hover:opacity-70" style={{ fontFamily: "var(--font-noto)", fontSize: "11px", color: palette.ink, textDecoration: "none" }}>Log In</Link>
            <Link href="/signup" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 16px", fontFamily: "var(--font-noto)", fontSize: "11px", fontWeight: 600, background: palette.ink, color: "#fff", borderRadius: "100px", textDecoration: "none" }}>
              Sign Up Free
            </Link>
          </div>
        </nav>
      </div>

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
        <Link href="/projects-preview" style={{ color: palette.inkMuted, textDecoration: "none", fontSize: "11px" }}>
          ← Projects&nbsp;&nbsp;&nbsp;Geopolitical
        </Link>
        <div style={{ flex: 1 }} />
        {[{n:"ScholarAsk",h:"/scholar-ask-preview"},{n:"Workspace",h:"/workspace-preview"},{n:"Meta Analysis",h:"/meta-analysis-preview"},{n:"Lit Review",h:"/lit-review-preview"},{n:"Paper Writer",h:"/paper-writer-preview"}].map((tab) => (
          <Link key={tab.n} href={tab.h} style={{ color: tab.n === "Paper Writer" ? palette.cerise : palette.inkMuted, fontWeight: tab.n === "Paper Writer" ? 700 : 400, borderBottom: tab.n === "Paper Writer" ? `2px solid ${palette.cerise}` : "2px solid transparent", paddingBottom: "8px", marginBottom: "-1px", fontSize: "11px", textDecoration: "none" }}>{tab.n}</Link>
        ))}
      </div>

      {/* ═══ Main content: sidebar + editor + imported panel ═══ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left toggle button (visible when panel closed) ── */}
        {!leftOpen && (
          <button
            onClick={() => setLeftOpen(true)}
            style={{
              width: "32px", flexShrink: 0,
              background: palette.surface,
              borderRight: `1px solid ${palette.rule}`,
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", color: palette.inkMuted,
              writingMode: "vertical-rl",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            Sections ▸
          </button>
        )}

        {/* ── Left: Section navigator (resizable + closeable) ── */}
        {leftOpen && <aside
          style={{
            width: "200px", minWidth: "140px", maxWidth: "300px",
            flexShrink: 0,
            background: palette.surface,
            borderRight: `1px solid ${palette.rule}`,
            overflowY: "auto",
            padding: "16px",
            resize: "horizontal",
            overflow: "auto",
            position: "relative",
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setLeftOpen(false)}
            style={{
              position: "absolute", top: "8px", right: "8px",
              background: "none", border: "none", cursor: "pointer",
              fontSize: "16px", color: palette.inkFaint, lineHeight: 1,
              width: "24px", height: "24px",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "4px",
            }}
            className="hover:bg-[#e0d8d0]"
          >
            ✕
          </button>
          <div style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "12px" }}>
            Paper Sections
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {sections.map((s) => {
              const isActive = s.id === activeSection;
              const hasContent = sampleContent[s.id].body || sampleContent[s.id].imported.length > 0;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: isActive ? "#fff" : "transparent",
                    border: isActive ? `1.5px solid ${palette.cardBorder}` : "1.5px solid transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "var(--font-dm-sans)",
                    width: "100%",
                  }}
                >
                  <span
                    style={{
                      width: "24px", height: "24px",
                      borderRadius: "6px",
                      background: isActive ? palette.cerise : hasContent ? palette.gold : palette.rule,
                      color: isActive || hasContent ? "#fff" : palette.inkMuted,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", fontWeight: 700, flexShrink: 0,
                    }}
                  >
                    {s.icon}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: isActive ? 600 : 400, color: isActive ? palette.ink : palette.inkMuted }}>
                    {s.label}
                  </span>
                  {hasContent && !isActive && (
                    <span style={{ marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%", background: palette.gold }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Progress */}
          <div style={{ marginTop: "24px", padding: "12px", background: "#fff", borderRadius: "8px", border: `1px solid ${palette.rule}` }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
              Progress
            </div>
            <div style={{ height: "6px", background: palette.rule, borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: "37.5%", background: palette.gold, borderRadius: "3px" }} />
            </div>
            <div style={{ fontSize: "10px", color: palette.inkMuted, marginTop: "6px" }}>
              3 of 8 sections started
            </div>
          </div>

          {/* Gold stars */}
          <div style={{ position: "relative", height: "60px", marginTop: "16px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", top: "10px", left: "20px", opacity: 0.4, transform: "rotate(-12deg)" }}>
              <path d="M12 2 L14.2 9.2 L21.5 9.2 L15.6 13.6 L17.8 20.8 L12 16.4 L6.2 20.8 L8.4 13.6 L2.5 9.2 L9.8 9.2 Z" fill={palette.gold} />
            </svg>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", top: "30px", right: "16px", opacity: 0.35, transform: "rotate(15deg)" }}>
              <path d="M12 2 L14.2 9.2 L21.5 9.2 L15.6 13.6 L17.8 20.8 L12 16.4 L6.2 20.8 L8.4 13.6 L2.5 9.2 L9.8 9.2 Z" fill={palette.gold} />
            </svg>
          </div>
        </aside>}

        {/* ── Center: Editor ── */}
        <main
          style={{
            flex: 1, overflow: "auto",
            background: palette.surfaceWarm,
            display: "flex", justifyContent: "center",
            padding: "32px 24px",
            position: "relative",
          }}
        >
          {/* Gold stars in margins */}
          {[
            { top: "40px", left: "30px", size: 14, rot: -10 },
            { top: "200px", right: "40px", size: 12, rot: 18 },
            { bottom: "100px", left: "50px", size: 10, rot: 8 },
            { bottom: "200px", right: "30px", size: 16, rot: -15 },
          ].map((s, i) => (
            <svg key={i} width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" style={{
              position: "absolute", top: "top" in s ? s.top : undefined, bottom: "bottom" in s ? s.bottom : undefined,
              left: "left" in s ? s.left : undefined, right: "right" in s ? s.right : undefined,
              transform: `rotate(${s.rot}deg)`, opacity: 0.4,
            }}>
              <path d="M12 2 L14.2 9.2 L21.5 9.2 L15.6 13.6 L17.8 20.8 L12 16.4 L6.2 20.8 L8.4 13.6 L2.5 9.2 L9.8 9.2 Z" fill={palette.gold} />
            </svg>
          ))}

          {/* Paper */}
          <div
            style={{
              width: "100%", maxWidth: "100%",
              background: "#fff",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              borderRadius: "2px",
              padding: "32px 28px",
              minHeight: "800px",
            }}
          >
            {/* Section title */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <span
                style={{
                  width: "28px", height: "28px", borderRadius: "6px",
                  background: palette.cerise, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 700, flexShrink: 0,
                }}
              >
                {sections.find((s) => s.id === activeSection)?.icon}
              </span>
              <h1 style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", fontSize: "28px", fontWeight: 400, color: palette.ink, margin: 0 }}>
                {content.title}
              </h1>
            </div>

            {/* Guidance box */}
            <div
              style={{
                background: palette.surfaceWarm,
                border: `1px solid ${palette.rule}`,
                borderRadius: "10px",
                padding: "14px 18px",
                marginBottom: "28px",
              }}
            >
              <div style={{ fontSize: "10px", fontWeight: 700, color: palette.gold, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
                ★ Writing guidance
              </div>
              <p style={{ fontSize: "12px", color: palette.inkMuted, lineHeight: 1.6, margin: 0 }}>
                {content.guidance}
              </p>
            </div>

            {/* Imported highlights */}
            {content.imported.length > 0 && (
              <div style={{ marginBottom: "28px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
                  Auto-imported highlights ({content.imported.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {content.imported.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#fef9c3",
                        borderLeft: `3px solid ${palette.gold}`,
                        borderRadius: "0 6px 6px 0",
                        padding: "10px 14px",
                        fontSize: "11px",
                        color: palette.ink,
                        lineHeight: 1.5,
                        fontStyle: activeSection === "references" ? "normal" : "italic",
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Editor area */}
            {content.body ? (
              <div style={{ fontSize: "14px", color: palette.ink, lineHeight: 1.8 }}>
                {content.body}
              </div>
            ) : (
              <div
                style={{
                  border: `1.5px dashed ${palette.rule}`,
                  borderRadius: "8px",
                  padding: "40px",
                  textAlign: "center",
                  minHeight: "200px",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: "12px",
                }}
              >
                <div style={{ fontSize: "13px", color: palette.inkFaint }}>
                  Start writing your {content.title.toLowerCase()} here...
                </div>
                <div style={{ fontSize: "11px", color: palette.inkFaint }}>
                  Click to begin typing, or use the imported highlights above as a starting point.
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ── Right toggle button (visible when panel closed) ── */}
        {!rightOpen && (
          <button
            onClick={() => setRightOpen(true)}
            style={{
              width: "32px", flexShrink: 0,
              background: "#fff",
              borderLeft: `1px solid ${palette.rule}`,
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", color: palette.inkMuted,
              writingMode: "vertical-rl",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            ◂ Tools
          </button>
        )}

        {/* ── Right: Tools panel (resizable + closeable) ── */}
        {rightOpen && <aside
          style={{
            width: "200px", minWidth: "140px", maxWidth: "300px",
            flexShrink: 0,
            borderLeft: `1px solid ${palette.rule}`,
            background: "#fff",
            overflowY: "auto",
            display: "flex", flexDirection: "column",
            resize: "horizontal",
            overflow: "auto",
            direction: "rtl",
            position: "relative",
          }}
        >
          <div style={{ direction: "ltr" }}>
          {/* Close button */}
          <button
            onClick={() => setRightOpen(false)}
            style={{
              position: "absolute", top: "8px", right: "8px",
              background: "none", border: "none", cursor: "pointer",
              fontSize: "16px", color: palette.inkFaint, lineHeight: 1,
              width: "24px", height: "24px",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "4px", zIndex: 5,
            }}
            className="hover:bg-[#e0d8d0]"
          >
            ✕
          </button>

          {/* Section info */}
          <div style={{ padding: "16px", borderBottom: `1px solid ${palette.rule}` }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Writing Tools
            </div>
          </div>

          {/* Word count */}
          <div style={{ padding: "16px", borderBottom: `1px solid ${palette.rule}` }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
              Word count
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: palette.inkMuted }}>This section</span>
              <span style={{ color: palette.ink, fontWeight: 600 }}>{content.body ? content.body.split(" ").length : 0}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "4px" }}>
              <span style={{ color: palette.inkMuted }}>Total paper</span>
              <span style={{ color: palette.ink, fontWeight: 600 }}>487</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: "16px", borderBottom: `1px solid ${palette.rule}`, display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              style={{
                width: "100%", padding: "10px",
                background: palette.cerise, color: "#fff",
                border: "none", borderRadius: "8px",
                fontSize: "12px", fontFamily: "var(--font-dm-sans)", fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Import from Lit Review
            </button>
            <button
              style={{
                width: "100%", padding: "10px",
                background: "transparent", color: palette.ink,
                border: `1.5px dashed ${palette.rule}`, borderRadius: "8px",
                fontSize: "12px", fontFamily: "var(--font-dm-sans)", fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Import from Meta-Analysis
            </button>
            <button
              style={{
                width: "100%", padding: "10px",
                background: "transparent", color: palette.ink,
                border: `1.5px dashed ${palette.rule}`, borderRadius: "8px",
                fontSize: "12px", fontFamily: "var(--font-dm-sans)", fontWeight: 500,
                cursor: "pointer",
              }}
            >
              AI Writing Assistant
            </button>
          </div>

          {/* APA citations for this section */}
          <div style={{ padding: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
              Citations in this section
            </div>
            {activeSection === "literature" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {["Smith (2023)", "Johnson (2022)", "Lee & Park (2024)", "Chen (2023)", "Rivera (2019)"].map((cite) => (
                  <div
                    key={cite}
                    style={{
                      fontSize: "11px", color: palette.ink,
                      padding: "6px 10px", borderRadius: "6px",
                      background: palette.surface,
                      border: `1px solid ${palette.rule}`,
                    }}
                  >
                    {cite}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "11px", color: palette.inkFaint, fontStyle: "italic" }}>
                No citations yet. Start writing to add references.
              </div>
            )}
          </div>

          {/* Gold stars */}
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative", height: "40px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", bottom: "16px", right: "20px", opacity: 0.4, transform: "rotate(10deg)" }}>
              <path d="M12 2 L14.2 9.2 L21.5 9.2 L15.6 13.6 L17.8 20.8 L12 16.4 L6.2 20.8 L8.4 13.6 L2.5 9.2 L9.8 9.2 Z" fill={palette.gold} />
            </svg>
          </div>
          </div>
        </aside>}
      </div>
    </div>
  );
}
