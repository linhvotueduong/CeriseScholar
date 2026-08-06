/* eslint-disable @next/next/no-img-element */
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

const quickActions = ["Explore topics", "Find experts", "Literature review", "Compare theories"];

const sampleResults = [
  {
    title: "Effects of geopolitical uncertainty on student career planning",
    authors: "Smith, J., Johnson, R., & Lee, K.", year: 2023,
    journal: "Journal of Educational Research", citations: 45, relevance: 98,
    abstract: "This study examined the effects of geopolitical uncertainty on career decision-making among undergraduate students in politically volatile regions.",
  },
  {
    title: "Career decision-making under uncertainty: A mixed-methods approach",
    authors: "Johnson, R.", year: 2022,
    journal: "International Journal of Career Studies", citations: 32, relevance: 91,
    abstract: "A comprehensive study combining survey data with semi-structured interviews to explore how uncertainty shapes career trajectories among young adults.",
  },
  {
    title: "Political instability and career self-efficacy among Asian university students",
    authors: "Lee, S. & Park, H.", year: 2024,
    journal: "Asian Journal of Education", citations: 12, relevance: 87,
    abstract: "Students in regions with higher political instability scored 23% lower on the Career Decision Self-Efficacy scale (p < .001, d = 0.67).",
  },
  {
    title: "Mediating pathways between geopolitics and career planning",
    authors: "Chen, W.", year: 2023,
    journal: "Journal of Vocational Behavior", citations: 28, relevance: 82,
    abstract: "The mediating role of perceived economic threat suggests that geopolitical effects on career planning are not direct but operate through economic anxiety.",
  },
];

/* ── Decorative stars (fixed positions, no Math.random) ── */
const stars = [
  { top: "6%", left: "8%", size: 7, op: 0.35, rot: -8 },
  { top: "10%", left: "18%", size: 9, op: 0.45, rot: 12 },
  { top: "4%", left: "35%", size: 5, op: 0.3, rot: -15 },
  { top: "14%", left: "6%", size: 11, op: 0.5, rot: 5 },
  { top: "3%", right: "28%", size: 8, op: 0.4, rot: -10 },
  { top: "8%", right: "12%", size: 6, op: 0.35, rot: 18 },
  { top: "22%", left: "4%", size: 12, op: 0.45, rot: -5 },
  { top: "28%", left: "14%", size: 7, op: 0.3, rot: 8 },
  { top: "12%", right: "6%", size: 9, op: 0.4, rot: -12 },
  { top: "32%", right: "10%", size: 7, op: 0.35, rot: 15 },
  { top: "45%", left: "6%", size: 6, op: 0.3, rot: -8 },
  { top: "50%", left: "12%", size: 8, op: 0.4, rot: 10 },
  { top: "55%", right: "14%", size: 10, op: 0.45, rot: -6 },
  { top: "65%", left: "10%", size: 7, op: 0.35, rot: 12 },
  { top: "70%", right: "8%", size: 6, op: 0.3, rot: -10 },
  { top: "40%", right: "4%", size: 12, op: 0.5, rot: 8 },
  { top: "18%", left: "28%", size: 6, op: 0.3, rot: -15 },
  { top: "38%", right: "22%", size: 7, op: 0.35, rot: 5 },
];

export default function ScholarAskPreview() {
  const fontClasses = [dmSerif.variable, dmSans.variable, playfair.variable, notoSans.variable, fredoka.variable].join(" ");
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);

  return (
    <div
      className={fontClasses}
      style={{
        background: palette.bg, color: palette.ink,
        fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
        height: "100vh", display: "flex", flexDirection: "column",
      }}
    >
      {/* ═══ Primary Navbar — shared public pill ═══ */}
      <PublicMarketingNavbar />

      {/* ═══ Sub-nav ═══ */}
      <div style={{ height: "40px", flexShrink: 0, display: "flex", alignItems: "center", padding: "0 32px", gap: "28px", borderBottom: `1px solid ${palette.rule}`, marginTop: "max(8px, 1vw)", fontFamily: "var(--font-noto)", fontSize: "12px" }}>
        <Link href="/projects" style={{ color: palette.inkMuted, textDecoration: "none", fontSize: "11px" }}>← Projects&nbsp;&nbsp;&nbsp;Geopolitical</Link>
        <div style={{ flex: 1 }} />
        {[{n:"ScholarAsk",h:"/scholar-ask-preview"},{n:"Workspace",h:"/workspace-preview"},{n:"Meta Analysis",h:"/meta-analysis-preview"},{n:"Lit Review",h:"/lit-review-preview"},{n:"Paper Writer",h:"/paper-writer-preview"}].map((tab) => (
          <Link key={tab.n} href={tab.h} style={{ color: tab.n === "ScholarAsk" ? palette.cerise : palette.inkMuted, fontWeight: tab.n === "ScholarAsk" ? 700 : 400, borderBottom: tab.n === "ScholarAsk" ? `2px solid ${palette.cerise}` : "2px solid transparent", paddingBottom: "8px", marginBottom: "-1px", fontSize: "11px", textDecoration: "none" }}>{tab.n}</Link>
        ))}
      </div>

      {/* ═══ Main ═══ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left sidebar */}
        {!leftOpen && (
          <button onClick={() => setLeftOpen(true)} style={{ width: "32px", flexShrink: 0, background: palette.surface, borderRight: `1px solid ${palette.rule}`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: palette.inkMuted, writingMode: "vertical-rl", fontFamily: "var(--font-dm-sans)" }}>History ▸</button>
        )}
        {leftOpen && <aside style={{ width: "220px", minWidth: "160px", maxWidth: "350px", flexShrink: 0, background: palette.surface, borderRight: `1px solid ${palette.rule}`, overflowY: "auto", padding: "16px", resize: "horizontal", overflow: "auto", position: "relative" }}>
          <button onClick={() => { setQuery(""); setHasSearched(false); }} style={{ width: "100%", padding: "10px", background: palette.cerise, color: "#fff", border: "none", borderRadius: "8px", fontSize: "12px", fontFamily: "var(--font-dm-sans)", fontWeight: 600, cursor: "pointer", marginBottom: "16px" }}>+ New Research</button>
          <div style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "10px" }}>Recent Searches</div>
          {["How does geopolitical uncertainty affect career planning?", "Student career self-efficacy measurement scales", "Meta-analysis methodology for education research"].map((search, i) => (
            <div key={i} onClick={() => { setQuery(search); setHasSearched(true); }} style={{ padding: "10px 12px", borderRadius: "8px", background: i === 0 ? "#fff" : "transparent", border: i === 0 ? `1.5px solid ${palette.cardBorder}` : "1.5px solid transparent", cursor: "pointer", marginBottom: "4px", fontSize: "12px", color: palette.ink, lineHeight: 1.4 }}>{search}</div>
          ))}
        </aside>}

        {/* ═══ Center content ═══ */}
        {!hasSearched ? (
          /* ── Landing view ── */
          <div style={{ flex: 1, background: palette.bg, position: "relative", display: "flex", flexDirection: "column" }}>

            {/* Background layer: stars + constellations + bulb — all inside one absolute container */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {/* Stars */}
              {stars.map((s, i) => (
                <svg key={`s${i}`} width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" style={{ position: "absolute", top: s.top, left: "left" in s ? s.left : undefined, right: "right" in s ? s.right : undefined, opacity: s.op, transform: `rotate(${s.rot}deg)` }}>
                  <path d="M12 2 L14.2 9.2 L21.5 9.2 L15.6 13.6 L17.8 20.8 L12 16.4 L6.2 20.8 L8.4 13.6 L2.5 9.2 L9.8 9.2 Z" fill={palette.gold} />
                </svg>
              ))}

              {/* Sparkle crosses */}
              {[{ top: "7%", left: "22%", size: 14 }, { top: "20%", right: "20%", size: 12 }, { top: "48%", left: "16%", size: 10 }, { top: "60%", right: "16%", size: 16 }].map((s, i) => (
                <svg key={`c${i}`} width={s.size} height={s.size} viewBox="0 0 14 14" fill="none" style={{ position: "absolute", top: s.top, left: "left" in s ? s.left : undefined, right: "right" in s ? s.right : undefined, opacity: 0.3 }}>
                  <path d="M7 1 L8 6 L13 7 L8 8 L7 13 L6 8 L1 7 L6 6 Z" fill={palette.inkFaint} />
                </svg>
              ))}

              {/* Constellations */}
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" style={{ position: "absolute", top: "10%", right: "8%", opacity: 0.25 }}>
                <circle cx="20" cy="15" r="3" fill={palette.inkFaint} /><circle cx="55" cy="10" r="2.5" fill={palette.inkFaint} /><circle cx="65" cy="40" r="3" fill={palette.inkFaint} /><circle cx="40" cy="55" r="2" fill={palette.cerise} opacity="0.6" />
                <line x1="20" y1="15" x2="55" y2="10" stroke={palette.inkFaint} strokeWidth="0.8" /><line x1="55" y1="10" x2="65" y2="40" stroke={palette.inkFaint} strokeWidth="0.8" /><line x1="65" y1="40" x2="40" y2="55" stroke={palette.inkFaint} strokeWidth="0.8" />
              </svg>
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none" style={{ position: "absolute", bottom: "20%", right: "10%", opacity: 0.2 }}>
                <circle cx="10" cy="20" r="2.5" fill={palette.inkFaint} /><circle cx="40" cy="10" r="2" fill={palette.inkFaint} /><circle cx="50" cy="35" r="3" fill={palette.inkFaint} />
                <line x1="10" y1="20" x2="40" y2="10" stroke={palette.inkFaint} strokeWidth="0.8" /><line x1="40" y1="10" x2="50" y2="35" stroke={palette.inkFaint} strokeWidth="0.8" />
              </svg>
              <svg width="50" height="70" viewBox="0 0 50 70" fill="none" style={{ position: "absolute", top: "40%", left: "5%", opacity: 0.2 }}>
                <circle cx="15" cy="10" r="2" fill={palette.inkFaint} /><circle cx="35" cy="30" r="2.5" fill={palette.inkFaint} /><circle cx="10" cy="55" r="3" fill={palette.cerise} opacity="0.5" />
                <line x1="15" y1="10" x2="35" y2="30" stroke={palette.inkFaint} strokeWidth="0.8" /><line x1="35" y1="30" x2="10" y2="55" stroke={palette.inkFaint} strokeWidth="0.8" />
              </svg>

              {/* Bulb — positioned from bottom, glass meets search box */}
              <img
                src="/assets/characters/lightbulb2_nobg.png"
                alt=""
                style={{
                  position: "absolute",
                  bottom: "max(100px, 15vh)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "320px",
                  height: "auto",
                  opacity: 0.92,
                }}
              />
            </div>

            {/* Content layer — on top of background */}
            <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", marginBottom: "max(280px, 35vh)" }}>
              <h1 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 400, color: palette.ink, textAlign: "center", lineHeight: 1.2, margin: "0 0 4px" }}>
                Ask anything.
              </h1>
              <h1 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 400, color: palette.ink, textAlign: "center", lineHeight: 1.2, margin: 0 }}>
                Discover <em>everything</em>
              </h1>
              <p style={{ fontSize: "16px", color: palette.inkMuted, marginTop: "10px", textAlign: "center" }}>
                Powered by OpenAlex and AI synthesis
              </p>

              {/* Search box */}
              <div style={{ marginTop: "32px", width: "100%", maxWidth: "620px" }}>
                <div style={{ background: "rgba(255,255,255,0.92)", border: `1px solid ${palette.cardBorder}`, borderRadius: "10px", padding: "0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "visible" }}>
                  <input
                    type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="What would you like to learn more about?"
                    onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) setHasSearched(true); }}
                    style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: "14px", fontFamily: "var(--font-dm-sans)", color: palette.ink, padding: "16px 18px 8px" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px 12px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "30px", height: "17px", borderRadius: "9px", background: palette.rule, position: "relative", cursor: "pointer" }}>
                        <div style={{ position: "absolute", left: "2px", top: "2px", width: "13px", height: "13px", borderRadius: "50%", background: "#fff" }} />
                      </div>
                      <span style={{ fontSize: "13px", color: palette.ink, fontWeight: 500 }}>Deep research</span>
                    </div>
                    <button onClick={() => { if (query.trim()) setHasSearched(true); }} style={{ width: "34px", height: "34px", borderRadius: "8px", background: palette.inkMuted, color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "16px" }}>→</button>
                  </div>
                </div>
              </div>

              {/* Suggestion chips — plain text */}
              <div style={{ display: "flex", gap: "24px", marginTop: "20px", flexWrap: "wrap", justifyContent: "center" }}>
                {quickActions.map((action) => (
                  <button key={action} onClick={() => { setQuery(action); setHasSearched(true); }} className="hover:underline" style={{ padding: 0, background: "none", color: palette.inkMuted, border: "none", fontSize: "13px", fontFamily: "var(--font-dm-sans)", cursor: "pointer" }}>{action}</button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── Results view ── */
          <main style={{ flex: 1, overflow: "auto", background: "#fff" }}>
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 24px" }}>
              {/* Compact search bar */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ background: palette.surface, border: `1.5px solid ${palette.cardBorder}`, borderRadius: "12px", padding: "4px", display: "flex", alignItems: "center" }}>
                  <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, border: "none", outline: "none", padding: "10px 16px", fontSize: "13px", fontFamily: "var(--font-dm-sans)", color: palette.ink, background: "transparent" }} />
                  <button onClick={() => { if (query.trim()) setHasSearched(true); }} style={{ width: "32px", height: "32px", borderRadius: "8px", background: palette.cerise, color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>→</button>
                </div>
              </div>

              {/* AI synthesis */}
              <div style={{ background: palette.surfaceWarm, border: `1px solid ${palette.rule}`, borderRadius: "12px", padding: "20px 24px", marginBottom: "28px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: palette.gold, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>★ AI Synthesis</div>
                <p style={{ fontSize: "13px", color: palette.ink, lineHeight: 1.7, margin: 0 }}>
                  Research consistently shows that geopolitical uncertainty negatively impacts student career planning. <strong>Smith et al. (2023)</strong> found significant correlations between political instability and career indecision. <strong>Lee & Park (2024)</strong> reported a medium effect size (d=0.67). However, <strong>Chen (2023)</strong> suggests this relationship is mediated by economic anxiety rather than being a direct effect.
                </p>
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  {["Copy", "Save to Notes", "Export to Paper Writer"].map((a) => (
                    <button key={a} style={{ padding: "5px 12px", fontSize: "10px", fontFamily: "var(--font-dm-sans)", fontWeight: 600, background: "transparent", color: palette.ink, border: `1px solid ${palette.rule}`, borderRadius: "100px", cursor: "pointer" }}>{a}</button>
                  ))}
                </div>
              </div>

              {/* Results */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em" }}>Sources ({sampleResults.length})</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  {["Relevance", "Year", "Citations"].map((sort, i) => (
                    <button key={sort} style={{ padding: "4px 12px", fontSize: "10px", background: i === 0 ? palette.cerise : "transparent", color: i === 0 ? "#fff" : palette.inkMuted, border: `1px solid ${i === 0 ? palette.cerise : palette.rule}`, borderRadius: "100px", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontWeight: 600 }}>{sort}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {sampleResults.map((r, i) => (
                  <div key={i} style={{ background: "#fff", border: `1.5px solid ${palette.cardBorder}`, borderRadius: "12px", padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "16px", fontWeight: 400, color: palette.ink, margin: "0 0 6px", lineHeight: 1.3 }}>{r.title}</h3>
                        <div style={{ fontSize: "11px", color: palette.inkMuted, marginBottom: "4px" }}>{r.authors} · {r.year} · {r.journal}</div>
                        <div style={{ display: "flex", gap: "12px", fontSize: "10px", color: palette.inkFaint, marginBottom: "10px" }}>
                          <span>{r.citations} citations</span><span>{r.relevance}% relevant</span>
                        </div>
                        <p style={{ fontSize: "12px", color: palette.inkMuted, lineHeight: 1.6, margin: 0 }}>{r.abstract}</p>
                      </div>
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: palette.surfaceWarm, border: `2px solid ${r.relevance > 90 ? palette.cerise : palette.gold}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: palette.ink }}>{r.relevance}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px", borderTop: `1px solid ${palette.rule}`, paddingTop: "12px" }}>
                      <button style={{ padding: "5px 14px", fontSize: "10px", fontFamily: "var(--font-dm-sans)", fontWeight: 600, background: palette.cerise, color: "#fff", border: "none", borderRadius: "100px", cursor: "pointer" }}>Add to Project</button>
                      <button style={{ padding: "5px 14px", fontSize: "10px", fontFamily: "var(--font-dm-sans)", fontWeight: 600, background: "transparent", color: palette.ink, border: `1px solid ${palette.rule}`, borderRadius: "100px", cursor: "pointer" }}>View PDF</button>
                      <button style={{ padding: "5px 14px", fontSize: "10px", fontFamily: "var(--font-dm-sans)", fontWeight: 600, background: "transparent", color: palette.ink, border: `1px solid ${palette.rule}`, borderRadius: "100px", cursor: "pointer" }}>Cite</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: "center", marginTop: "24px" }}>
                <button style={{ padding: "12px 32px", borderRadius: "100px", border: `1.5px dashed ${palette.rule}`, background: "transparent", color: palette.inkMuted, fontSize: "12px", fontFamily: "var(--font-dm-sans)", fontWeight: 500, cursor: "pointer" }}>Load more results...</button>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
