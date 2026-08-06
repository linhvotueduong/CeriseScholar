"use client";

import Link from "next/link";
import { useState } from "react";
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

const tabs = ["Methodology Guide", "Data Upload", "Analyze Data", "Effect Sizes", "Results"];

const sampleStudies = [
  { id: 1, author: "Smith et al. (2023)", n: 450, d: 0.54, ci: "[0.35, 0.73]", weight: "24.3%" },
  { id: 2, author: "Johnson (2022)", n: 320, d: 0.41, ci: "[0.19, 0.63]", weight: "19.8%" },
  { id: 3, author: "Lee & Park (2024)", n: 580, d: 0.67, ci: "[0.51, 0.83]", weight: "28.1%" },
  { id: 4, author: "Chen (2023)", n: 275, d: 0.38, ci: "[0.14, 0.62]", weight: "16.2%" },
  { id: 5, author: "Rivera (2019)", n: 190, d: 0.12, ci: "[-0.16, 0.40]", weight: "11.6%" },
];

const sampleVariables = [
  { name: "career_self_efficacy", type: "Scale", items: 25, alpha: "0.89" },
  { name: "political_instability_index", type: "Scale", items: 12, alpha: "0.84" },
  { name: "economic_anxiety", type: "Scale", items: 8, alpha: "0.91" },
  { name: "age", type: "Continuous", items: 1, alpha: "—" },
  { name: "gender", type: "Categorical", items: 1, alpha: "—" },
  { name: "region_stability", type: "Ordinal", items: 1, alpha: "—" },
];

export default function MetaAnalysisPreview() {
  const fontClasses = [dmSerif.variable, dmSans.variable, playfair.variable, notoSans.variable, fredoka.variable].join(" ");
  const [activeTab, setActiveTab] = useState("Analyze Data");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

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
          <Link key={tab.n} href={tab.h} style={{ color: tab.n === "Meta Analysis" ? palette.cerise : palette.inkMuted, fontWeight: tab.n === "Meta Analysis" ? 700 : 400, borderBottom: tab.n === "Meta Analysis" ? `2px solid ${palette.cerise}` : "2px solid transparent", paddingBottom: "8px", marginBottom: "-1px", fontSize: "11px", textDecoration: "none" }}>{tab.n}</Link>
        ))}
      </div>

      {/* ═══ Meta-Analysis stepper ═══ */}
      <div
        style={{
          height: "56px", flexShrink: 0,
          display: "flex", alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
          borderBottom: `1px solid ${palette.rule}`,
          background: "#fff",
        }}
      >
        {tabs.map((tab, i) => {
          const tabIndex = tabs.indexOf(activeTab);
          const isCompleted = i < tabIndex;
          const isActive = tab === activeTab;
          const stepLabels = ["Define question", "Upload data", "Analyze", "Effect sizes", "Results"];
          return (
            <div key={tab} style={{ display: "flex", alignItems: "center" }}>
              <button
                onClick={() => setActiveTab(tab)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  background: "none", border: "none", cursor: "pointer",
                  padding: "4px",
                }}
              >
                {/* Circle: number when not done, tick when completed */}
                <span
                  style={{
                    width: "34px", height: "34px",
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: isCompleted ? "14px" : "13px", fontWeight: 700,
                    fontFamily: "var(--font-dm-sans)",
                    background: isCompleted ? palette.surfaceWarm : isActive ? palette.cerise : "transparent",
                    color: isCompleted ? palette.inkMuted : isActive ? "#fff" : palette.inkMuted,
                    border: isCompleted ? `2px solid ${palette.rule}` : isActive ? `2px solid ${palette.cerise}` : `2px solid ${palette.rule}`,
                    transition: "all 0.2s",
                  }}
                >
                  {isCompleted ? "✓" : i + 1}
                </span>
                {/* Label */}
                <span
                  style={{
                    fontSize: "13px",
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: isActive ? 700 : 400,
                    color: isCompleted ? palette.inkMuted : isActive ? palette.ink : palette.inkMuted,
                    whiteSpace: "nowrap",
                  }}
                >
                  {stepLabels[i]}
                </span>
              </button>
              {/* Connector line */}
              {i < tabs.length - 1 && (
                <div
                  style={{
                    width: "48px", height: "2px",
                    background: isCompleted ? palette.cardBorder : palette.rule,
                    margin: "0 6px",
                    transition: "background 0.2s",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ Main content: 3 columns ═══ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left toggle ── */}
        {!leftOpen && (
          <button
            onClick={() => setLeftOpen(true)}
            style={{
              width: "32px", flexShrink: 0,
              background: palette.surface, borderRight: `1px solid ${palette.rule}`,
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", color: palette.inkMuted,
              writingMode: "vertical-rl", fontFamily: "var(--font-dm-sans)",
            }}
          >
            Variables ▸
          </button>
        )}

        {/* ── Left: Variables & Data panel ── */}
        {leftOpen && <aside
          style={{
            width: "240px", minWidth: "180px", maxWidth: "400px",
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

          {/* Research Question */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "8px" }}>
              Research Question
            </div>
            <div
              style={{
                background: "#fff", border: `1.5px solid ${palette.cardBorder}`,
                borderRadius: "8px", padding: "10px 12px",
                fontSize: "12px", color: palette.ink, lineHeight: 1.5,
              }}
            >
              How does geopolitical uncertainty affect student career planning and self-efficacy?
            </div>
          </div>

          {/* Hypothesis */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "8px" }}>
              Hypothesis
            </div>
            <div
              style={{
                background: "#fff", border: `1.5px solid ${palette.cardBorder}`,
                borderRadius: "8px", padding: "10px 12px",
                fontSize: "12px", color: palette.ink, lineHeight: 1.5,
              }}
            >
              H1: Students in politically unstable regions will report significantly lower career self-efficacy scores.
            </div>
          </div>

          {/* Data file */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "8px" }}>
              Dataset
            </div>
            <div
              style={{
                background: "#fff", border: `1.5px dashed ${palette.rule}`,
                borderRadius: "8px", padding: "10px 12px",
                fontSize: "12px", color: palette.ink,
                display: "flex", alignItems: "center", gap: "8px",
              }}
            >
              <span style={{ fontSize: "16px" }}>📊</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "11px" }}>ICPSR_36421.sav</div>
                <div style={{ fontSize: "10px", color: palette.inkFaint }}>4.2 MB · 1,824 cases · 42 variables</div>
              </div>
            </div>
          </div>

          {/* Variables */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "10px" }}>
              ▼ Variables ({sampleVariables.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {sampleVariables.map((v) => (
                <div
                  key={v.name}
                  style={{
                    padding: "8px 10px", borderRadius: "6px",
                    background: "#fff", border: `1px solid ${palette.rule}`,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 600, color: palette.ink, fontFamily: "monospace" }}>
                    {v.name}
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "3px", fontSize: "10px", color: palette.inkFaint }}>
                    <span>{v.type}</span>
                    <span>·</span>
                    <span>{v.items} item{v.items > 1 ? "s" : ""}</span>
                    <span>·</span>
                    <span>α = {v.alpha}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gold stars */}
          <div style={{ position: "relative", height: "50px", marginTop: "16px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", top: "10px", left: "20px", opacity: 0.4, transform: "rotate(-12deg)" }}>
              <path d="M12 2 L14.2 9.2 L21.5 9.2 L15.6 13.6 L17.8 20.8 L12 16.4 L6.2 20.8 L8.4 13.6 L2.5 9.2 L9.8 9.2 Z" fill={palette.gold} />
            </svg>
          </div>
        </aside>}

        {/* ── Center: Analysis workspace ── */}
        <main
          style={{
            flex: 1, overflow: "auto",
            background: palette.surfaceWarm,
            padding: "32px 24px",
            position: "relative",
          }}
        >
          {/* Gold stars */}
          {[
            { top: "30px", right: "40px", size: 14, rot: 15 },
            { top: "200px", left: "30px", size: 12, rot: -10 },
            { bottom: "80px", right: "50px", size: 16, rot: 8 },
          ].map((s, i) => (
            <svg key={i} width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" style={{
              position: "absolute", top: "top" in s ? s.top : undefined, bottom: "bottom" in s ? s.bottom : undefined,
              left: "left" in s ? s.left : undefined, right: "right" in s ? s.right : undefined,
              transform: `rotate(${s.rot}deg)`, opacity: 0.4,
            }}>
              <path d="M12 2 L14.2 9.2 L21.5 9.2 L15.6 13.6 L17.8 20.8 L12 16.4 L6.2 20.8 L8.4 13.6 L2.5 9.2 L9.8 9.2 Z" fill={palette.gold} />
            </svg>
          ))}

          {/* ── Methodology Guide tab ── */}
          {activeTab === "Methodology Guide" && (
            <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", borderRadius: "12px", padding: "32px" }}>
              <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "24px", fontWeight: 400, color: palette.ink, margin: "0 0 8px" }}>Methodology Guide</h2>
              <p style={{ fontSize: "12px", color: palette.inkMuted, marginBottom: "24px" }}>Enter your research question and hypothesis. The guide will recommend appropriate statistical tests and data sources.</p>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>Research Question</label>
                <textarea defaultValue="How does geopolitical uncertainty affect student career planning and self-efficacy?" style={{ width: "100%", minHeight: "80px", border: `1.5px solid ${palette.cardBorder}`, borderRadius: "8px", padding: "12px", fontSize: "13px", fontFamily: "var(--font-dm-sans)", color: palette.ink, resize: "vertical", outline: "none" }} />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>Hypothesis</label>
                <textarea defaultValue="H1: Students in politically unstable regions will report significantly lower career self-efficacy scores." style={{ width: "100%", minHeight: "80px", border: `1.5px solid ${palette.cardBorder}`, borderRadius: "8px", padding: "12px", fontSize: "13px", fontFamily: "var(--font-dm-sans)", color: palette.ink, resize: "vertical", outline: "none" }} />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>Independent Variable</label>
                <input defaultValue="Geopolitical instability (region stability index)" style={{ width: "100%", border: `1.5px solid ${palette.cardBorder}`, borderRadius: "8px", padding: "10px 12px", fontSize: "13px", fontFamily: "var(--font-dm-sans)", color: palette.ink, outline: "none" }} />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>Dependent Variable</label>
                <input defaultValue="Career self-efficacy (CDSE scale score)" style={{ width: "100%", border: `1.5px solid ${palette.cardBorder}`, borderRadius: "8px", padding: "10px 12px", fontSize: "13px", fontFamily: "var(--font-dm-sans)", color: palette.ink, outline: "none" }} />
              </div>

              <div style={{ background: palette.surfaceWarm, border: `1px solid ${palette.rule}`, borderRadius: "10px", padding: "16px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: palette.gold, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>★ Recommended Approach</div>
                <p style={{ fontSize: "12px", color: palette.ink, lineHeight: 1.6, margin: 0 }}>Based on your variables, we recommend: <strong>Independent samples t-test</strong> (comparing two groups) or <strong>Pearson correlation</strong> (continuous relationship). For meta-analysis, collect <strong>Cohen&apos;s d</strong> effect sizes from published studies. Suggested data source: <strong>ICPSR dataset #36421</strong>.</p>
              </div>
            </div>
          )}

          {/* ── Data Upload tab ── */}
          {activeTab === "Data Upload" && (
            <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", borderRadius: "12px", padding: "32px" }}>
              <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "24px", fontWeight: 400, color: palette.ink, margin: "0 0 8px" }}>Data Upload</h2>
              <p style={{ fontSize: "12px", color: palette.inkMuted, marginBottom: "24px" }}>Upload your SPSS (.sav), CSV, or Excel dataset for analysis.</p>

              <div style={{ border: `2px dashed ${palette.rule}`, borderRadius: "12px", padding: "60px 40px", textAlign: "center", marginBottom: "24px" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>📊</div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: palette.ink }}>Drag & drop your data file here</p>
                <p style={{ fontSize: "12px", color: palette.inkMuted, marginTop: "max(8px, 1vw)" }}>Supports .sav (SPSS), .csv, .xlsx</p>
                <button style={{ marginTop: "16px", padding: "10px 24px", background: palette.cerise, color: "#fff", border: "none", borderRadius: "100px", fontSize: "12px", fontFamily: "var(--font-dm-sans)", fontWeight: 600, cursor: "pointer" }}>
                  Browse Files
                </button>
              </div>

              <div style={{ background: palette.surface, border: `1px solid ${palette.rule}`, borderRadius: "8px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "20px" }}>✅</span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: palette.ink }}>ICPSR_36421.sav</div>
                  <div style={{ fontSize: "10px", color: palette.inkFaint }}>Uploaded · 4.2 MB · 1,824 cases · 42 variables</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Analyze Data tab ── */}
          {activeTab === "Analyze Data" && <div
            style={{
              maxWidth: "800px", margin: "0 auto", width: "100%",
              background: "#fff",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              borderRadius: "12px",
              padding: "32px",
            }}
          >
            <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "24px", fontWeight: 400, color: palette.ink, margin: "0 0 8px" }}>
              Descriptive Statistics
            </h2>
            <p style={{ fontSize: "12px", color: palette.inkMuted, marginBottom: "24px" }}>
              Summary statistics for key variables in your dataset.
            </p>

            {/* Stats table */}
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: "480px", borderCollapse: "collapse", fontSize: "12px", marginBottom: "32px" }}>
              <thead>
                <tr>
                  {["Variable", "N", "Mean", "SD", "Min", "Max", "Skewness"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", borderBottom: `2px solid ${palette.rule}`, fontSize: "10px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { var: "career_self_efficacy", n: 1824, mean: "3.42", sd: "0.89", min: "1.00", max: "5.00", skew: "-0.31" },
                  { var: "political_instability", n: 1824, mean: "2.87", sd: "1.12", min: "1.00", max: "5.00", skew: "0.18" },
                  { var: "economic_anxiety", n: 1790, mean: "3.61", sd: "0.94", min: "1.00", max: "5.00", skew: "-0.45" },
                ].map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : palette.surface, borderBottom: `1px solid ${palette.rule}` }}>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 600, color: palette.ink }}>{row.var}</td>
                    <td style={{ padding: "10px 12px", color: palette.ink }}>{row.n}</td>
                    <td style={{ padding: "10px 12px", color: palette.ink, fontWeight: 600 }}>{row.mean}</td>
                    <td style={{ padding: "10px 12px", color: palette.inkMuted }}>{row.sd}</td>
                    <td style={{ padding: "10px 12px", color: palette.inkMuted }}>{row.min}</td>
                    <td style={{ padding: "10px 12px", color: palette.inkMuted }}>{row.max}</td>
                    <td style={{ padding: "10px 12px", color: palette.inkMuted }}>{row.skew}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>

            {/* Correlation matrix */}
            <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "24px", fontWeight: 400, color: palette.ink, margin: "0 0 8px" }}>
              Correlation Matrix
            </h2>
            <p style={{ fontSize: "12px", color: palette.inkMuted, marginBottom: "24px" }}>
              Pearson correlations between key variables. ** p &lt; .01, * p &lt; .05
            </p>

            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: "480px", borderCollapse: "collapse", fontSize: "12px", marginBottom: "32px" }}>
              <thead>
                <tr>
                  {["", "CSE", "PI", "EA"].map((h) => (
                    <th key={h} style={{ textAlign: "center", padding: "8px 12px", borderBottom: `2px solid ${palette.rule}`, fontSize: "10px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Career Self-Efficacy", vals: ["1.00", "-.43**", "-.51**"] },
                  { label: "Political Instability", vals: ["-.43**", "1.00", ".62**"] },
                  { label: "Economic Anxiety", vals: ["-.51**", ".62**", "1.00"] },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${palette.rule}` }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: palette.ink, fontSize: "11px" }}>{row.label}</td>
                    {row.vals.map((v, j) => (
                      <td key={j} style={{ padding: "10px 12px", textAlign: "center", color: v === "1.00" ? palette.inkFaint : v.includes("-") ? palette.cerise : "#16a34a", fontWeight: v === "1.00" ? 400 : 600 }}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table></div>

            {/* Forest plot placeholder */}
            <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "24px", fontWeight: 400, color: palette.ink, margin: "0 0 8px" }}>
              Effect Size Summary
            </h2>
            <p style={{ fontSize: "12px", color: palette.inkMuted, marginBottom: "24px" }}>
              Cohen&apos;s d effect sizes from included studies.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {sampleStudies.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 14px", borderRadius: "8px",
                    background: palette.surface, border: `1px solid ${palette.rule}`,
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 600, color: palette.ink, minWidth: "100px", flexShrink: 0 }}>{s.author}</span>
                  <span style={{ fontSize: "10px", color: palette.inkFaint, flexShrink: 0 }}>n={s.n}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: palette.ink, flexShrink: 0, marginLeft: "auto" }}>d={s.d.toFixed(2)}</span>
                </div>
              ))}

              {/* Overall effect */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px", borderRadius: "8px",
                  background: "#fff", border: `2px solid ${palette.ink}`,
                  marginTop: "4px",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 700, color: palette.ink, minWidth: "100px", flexShrink: 0 }}>Overall Effect</span>
                <span style={{ fontSize: "10px", color: palette.inkFaint, flexShrink: 0 }}>k=5</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: palette.ink, flexShrink: 0, marginLeft: "auto" }}>d=0.45</span>
              </div>
            </div>

            {/* Heterogeneity */}
            <div style={{ marginTop: "24px", padding: "16px", background: palette.surfaceWarm, borderRadius: "10px", border: `1px solid ${palette.rule}` }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: palette.gold, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
                ★ Heterogeneity Statistics
              </div>
              <div style={{ display: "flex", gap: "16px", fontSize: "12px", flexWrap: "wrap" }}>
                <div><span style={{ color: palette.inkMuted }}>Q = </span><span style={{ fontWeight: 600, color: palette.ink }}>14.82</span></div>
                <div><span style={{ color: palette.inkMuted }}>df = </span><span style={{ fontWeight: 600, color: palette.ink }}>4</span></div>
                <div><span style={{ color: palette.inkMuted }}>p = </span><span style={{ fontWeight: 600, color: palette.ink }}>.005</span></div>
                <div><span style={{ color: palette.inkMuted }}>I² = </span><span style={{ fontWeight: 700, color: palette.cerise }}>73.0%</span></div>
                <div><span style={{ color: palette.inkMuted }}>τ² = </span><span style={{ fontWeight: 600, color: palette.ink }}>.042</span></div>
              </div>
              <p style={{ fontSize: "11px", color: palette.inkMuted, marginTop: "max(8px, 1vw)", lineHeight: 1.5 }}>
                Substantial heterogeneity detected (I² = 73%). Consider examining moderator variables.
              </p>
            </div>
          </div>}

          {/* ── Effect Sizes tab ── */}
          {activeTab === "Effect Sizes" && (
            <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", borderRadius: "12px", padding: "32px" }}>
              <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "24px", fontWeight: 400, color: palette.ink, margin: "0 0 8px" }}>Effect Size Calculator</h2>
              <p style={{ fontSize: "12px", color: palette.inkMuted, marginBottom: "24px" }}>Enter effect sizes from published studies to include in your meta-analysis.</p>

              <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: "500px", borderCollapse: "collapse", fontSize: "12px", marginBottom: "24px" }}>
                <thead>
                  <tr>
                    {["Study", "N", "Cohen's d", "SE", "95% CI", "Weight"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", borderBottom: `2px solid ${palette.rule}`, fontSize: "10px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleStudies.map((s, i) => (
                    <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : palette.surface, borderBottom: `1px solid ${palette.rule}` }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: palette.ink }}>{s.author}</td>
                      <td style={{ padding: "10px 12px", color: palette.inkMuted }}>{s.n}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: palette.ink }}>{s.d.toFixed(2)}</td>
                      <td style={{ padding: "10px 12px", color: palette.inkMuted }}>{(1 / Math.sqrt(s.n)).toFixed(3)}</td>
                      <td style={{ padding: "10px 12px", color: palette.inkMuted }}>{s.ci}</td>
                      <td style={{ padding: "10px 12px", color: palette.inkMuted }}>{s.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              <button style={{ padding: "10px 20px", background: "transparent", color: palette.ink, border: `1.5px dashed ${palette.rule}`, borderRadius: "8px", fontSize: "12px", fontFamily: "var(--font-dm-sans)", fontWeight: 500, cursor: "pointer" }}>
                + Add Study
              </button>
            </div>
          )}

          {/* ── Results tab ── */}
          {activeTab === "Results" && (
            <div style={{ maxWidth: "900px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Plot selector + controls */}
              <div style={{ background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", borderRadius: "12px", padding: "24px 32px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "24px", fontWeight: 400, color: palette.ink, margin: 0 }}>Analysis Canvas</h2>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button style={{ padding: "6px 14px", fontSize: "11px", fontFamily: "var(--font-dm-sans)", fontWeight: 500, background: "transparent", color: palette.inkMuted, border: `1px solid ${palette.rule}`, borderRadius: "6px", cursor: "pointer" }}>Clear all</button>
                    <button style={{ padding: "6px 14px", fontSize: "11px", fontFamily: "var(--font-dm-sans)", fontWeight: 600, background: palette.cerise, color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Export all ↓</button>
                  </div>
                </div>
                <p style={{ fontSize: "12px", color: palette.inkMuted, margin: "0 0 16px" }}>Geopolitical stress project · 5 studies</p>

                {/* Plot type selector pills */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
                  {["Forest plot", "Funnel plot", "Bubble chart", "Baujat plot", "Radial plot", "L'Abbé plot"].map((p, i) => (
                    <button key={p} style={{
                      padding: "6px 14px", fontSize: "11px", fontFamily: "var(--font-dm-sans)", fontWeight: i === 0 ? 600 : 400,
                      background: i === 0 ? palette.ink : "transparent", color: i === 0 ? "#fff" : palette.ink,
                      border: `1px solid ${i === 0 ? palette.ink : palette.rule}`, borderRadius: "100px", cursor: "pointer",
                    }}>{p}</button>
                  ))}
                </div>

                {/* Model selector */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
                  <span style={{ fontSize: "11px", color: palette.inkMuted }}>Model:</span>
                  {["Random-effects", "Fixed-effects"].map((m, i) => (
                    <button key={m} style={{
                      padding: "4px 12px", fontSize: "11px", fontFamily: "var(--font-dm-sans)",
                      background: i === 0 ? palette.cerise : "transparent", color: i === 0 ? "#fff" : palette.ink,
                      border: `1px solid ${i === 0 ? palette.cerise : palette.rule}`, borderRadius: "100px", cursor: "pointer",
                    }}>{m}</button>
                  ))}
                </div>
              </div>

              {/* Effect size summary cards */}
              <div style={{ background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", borderRadius: "12px", padding: "24px 32px" }}>
                <h3 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "18px", fontWeight: 400, color: palette.ink, margin: "0 0 16px" }}>Effect size</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px", marginBottom: "24px" }}>
                  {[
                    { label: "Pooled d", value: "0.45", sub: "[0.28, 0.62]" },
                    { label: "I²", value: "73%", sub: "Substantial" },
                    { label: "p-value", value: "p<.001", sub: "" },
                    { label: "Q-test", value: "14.82", sub: "df=4" },
                  ].map((card) => (
                    <div key={card.label} style={{ background: palette.surface, border: `1px solid ${palette.rule}`, borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                      <div style={{ fontSize: "24px", fontWeight: 700, color: palette.ink, fontFamily: "var(--font-dm-serif)" }}>{card.value}</div>
                      <div style={{ fontSize: "10px", color: palette.inkFaint, marginTop: "4px" }}>{card.sub}</div>
                      <div style={{ fontSize: "10px", fontWeight: 600, color: palette.inkMuted, marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{card.label}</div>
                    </div>
                  ))}
                </div>

                {/* Forest plot table */}
                <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: "500px", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr>
                      {["Study", "Cohen's d", "", "[95% CI]"].map((h, i) => (
                        <th key={i} style={{ textAlign: i === 2 ? "center" : "left", padding: "8px 12px", borderBottom: `2px solid ${palette.rule}`, fontSize: "10px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleStudies.map((s) => (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${palette.rule}` }}>
                        <td style={{ padding: "12px", fontWeight: 600, color: palette.ink }}>{s.author}</td>
                        <td style={{ padding: "12px", fontWeight: 700, color: palette.ink }}>{s.d.toFixed(2)}</td>
                        <td style={{ padding: "12px", width: "200px" }}>
                          <div style={{ height: "20px", position: "relative", background: "#f5f0e8", borderRadius: "4px" }}>
                            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: palette.rule }} />
                            {/* CI whisker */}
                            <div style={{
                              position: "absolute",
                              left: `${50 + parseFloat(s.ci.split(",")[0].replace("[", "")) * 25}%`,
                              right: `${50 - parseFloat(s.ci.split(",")[1].replace("]", "").trim()) * 25}%`,
                              top: "9px", height: "2px", background: palette.ink,
                            }} />
                            {/* Diamond point */}
                            <div style={{
                              position: "absolute", left: `${50 + s.d * 25}%`, top: "5px",
                              width: "10px", height: "10px", background: palette.cerise,
                              transform: "translateX(-50%) rotate(45deg)", borderRadius: "2px",
                            }} />
                          </div>
                        </td>
                        <td style={{ padding: "12px", color: palette.inkMuted }}>{s.ci}</td>
                      </tr>
                    ))}
                    {/* Overall */}
                    <tr style={{ borderTop: `2px solid ${palette.ink}` }}>
                      <td style={{ padding: "14px 12px", fontWeight: 700, color: palette.ink, fontSize: "13px" }}>Overall (k=5)</td>
                      <td style={{ padding: "14px 12px", fontWeight: 700, color: palette.ink, fontSize: "13px" }}>0.45</td>
                      <td style={{ padding: "14px 12px" }}>
                        <div style={{ height: "20px", position: "relative", background: "#f5f0e8", borderRadius: "4px" }}>
                          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: palette.rule }} />
                          <div style={{ position: "absolute", left: `${50 + 0.45 * 25}%`, top: "3px", width: "14px", height: "14px", background: palette.ink, transform: "translateX(-50%) rotate(45deg)" }} />
                        </div>
                      </td>
                      <td style={{ padding: "14px 12px", fontWeight: 700, color: palette.ink }}>[0.28, 0.62]</td>
                    </tr>
                  </tbody>
                </table>

                </div>
                <div style={{ marginTop: "12px", display: "flex", justifyContent: "center", gap: "24px", fontSize: "10px", color: palette.inkFaint }}>
                  <span>← Favors no effect</span>
                  <span>Favors effect →</span>
                </div>
              </div>

              {/* Heterogeneity */}
              <div style={{ background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", borderRadius: "12px", padding: "24px 32px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: palette.gold, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>★ Heterogeneity &amp; Model Fit</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                  {[
                    { label: "Q", value: "14.82" },
                    { label: "df", value: "4" },
                    { label: "p", value: ".005" },
                    { label: "I²", value: "73.0%" },
                    { label: "τ²", value: ".042" },
                  ].map((s) => (
                    <div key={s.label} style={{ background: palette.surface, borderRadius: "8px", padding: "12px", textAlign: "center", border: `1px solid ${palette.rule}` }}>
                      <div style={{ fontSize: "18px", fontWeight: 700, color: s.label === "I²" ? palette.cerise : palette.ink }}>{s.value}</div>
                      <div style={{ fontSize: "10px", color: palette.inkFaint, marginTop: "4px" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: "11px", color: palette.inkMuted, lineHeight: 1.5, margin: 0 }}>
                  Substantial heterogeneity detected (I² = 73%). Consider examining moderator variables such as region, sample age, or measurement instrument.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* ── Right toggle ── */}
        {!rightOpen && (
          <button
            onClick={() => setRightOpen(true)}
            style={{
              width: "32px", flexShrink: 0,
              background: "#fff", borderLeft: `1px solid ${palette.rule}`,
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", color: palette.inkMuted,
              writingMode: "vertical-rl", fontFamily: "var(--font-dm-sans)",
            }}
          >
            ◂ Results
          </button>
        )}

        {/* ── Right: Results summary ── */}
        {rightOpen && <aside
          style={{
            width: "240px", minWidth: "180px", maxWidth: "400px",
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

          <div style={{ padding: "16px", borderBottom: `1px solid ${palette.rule}` }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Results Summary
            </div>
          </div>

          {/* Key findings */}
          <div style={{ padding: "16px", borderBottom: `1px solid ${palette.rule}` }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
              Key Findings
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "Overall Effect", value: "d = 0.45 (medium)", color: palette.ink },
                { label: "95% CI", value: "[0.28, 0.62]", color: palette.ink },
                { label: "p-value", value: "p < .001", color: "#16a34a" },
                { label: "Heterogeneity", value: "I² = 73% (high)", color: palette.cerise },
                { label: "Studies", value: "k = 5", color: palette.ink },
                { label: "Total N", value: "1,815", color: palette.ink },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: palette.inkMuted }}>{item.label}</span>
                  <span style={{ fontWeight: 600, color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: "16px", borderBottom: `1px solid ${palette.rule}`, display: "flex", flexDirection: "column", gap: "8px" }}>
            <button style={{ width: "100%", padding: "10px", background: palette.cerise, color: "#fff", border: "none", borderRadius: "8px", fontSize: "12px", fontFamily: "var(--font-dm-sans)", fontWeight: 600, cursor: "pointer" }}>
              Export to Paper Writer
            </button>
            <button style={{ width: "100%", padding: "10px", background: "transparent", color: palette.ink, border: `1.5px dashed ${palette.rule}`, borderRadius: "8px", fontSize: "12px", fontFamily: "var(--font-dm-sans)", fontWeight: 500, cursor: "pointer" }}>
              Download Results CSV
            </button>
            <button style={{ width: "100%", padding: "10px", background: "transparent", color: palette.ink, border: `1.5px dashed ${palette.rule}`, borderRadius: "8px", fontSize: "12px", fontFamily: "var(--font-dm-sans)", fontWeight: 500, cursor: "pointer" }}>
              Generate Methodology
            </button>
          </div>

          {/* Auto-generated write-up */}
          <div style={{ padding: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
              Auto-generated Write-up
            </div>
            <div style={{ fontSize: "11px", color: palette.ink, lineHeight: 1.6, background: palette.surface, borderRadius: "8px", padding: "12px", border: `1px solid ${palette.rule}` }}>
              A random-effects meta-analysis of five studies (N = 1,815) revealed a statistically significant medium effect of geopolitical uncertainty on career self-efficacy (d = 0.45, 95% CI [0.28, 0.62], p &lt; .001). Substantial heterogeneity was observed (I² = 73%, Q = 14.82, p = .005)...
            </div>
          </div>

          {/* Gold star */}
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
