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

const columns = ["Source", "Author(s)", "Year", "Section", "Quote from Source", "My Insights / Notes", "Synthesis Paragraph", "APA Reference"];

const sampleRows = [
  {
    source: "Smith_2023_GeoPolitical.pdf",
    author: "Smith, J., Johnson, R., & Lee, K.",
    year: "2023",
    section: "Literature Review",
    sectionColor: "#34d399",
    quote: "Geopolitical uncertainty has been shown to significantly impact career decision-making among university students in politically volatile regions.",
    notes: "Strong evidence supporting our hypothesis. Links uncertainty directly to career indecision — could use as opening argument in lit review.",
    synthesis: "Multiple studies (Smith 2023; Johnson 2022) converge on the finding that geopolitical instability creates measurable anxiety in student career planning...",
    apa: "Smith, J., Johnson, R., & Lee, K. (2023). Effects of geopolitical uncertainty on student career planning. Journal of Educational Research, 45(3), 112-128.",
  },
  {
    source: "Johnson_2022_Career.pdf",
    author: "Johnson, R.",
    year: "2022",
    section: "Methodology",
    sectionColor: "#60a5fa",
    quote: "A mixed-methods approach combining survey data (n=450) with semi-structured interviews (n=32) was employed to capture both breadth and depth.",
    notes: "Good methodology model for our study. Consider adopting their survey instrument (CDSE scale) for measuring career self-efficacy.",
    synthesis: "",
    apa: "Johnson, R. (2022). Career decision-making under uncertainty. International Journal of Career Studies, 18(2), 45-67.",
  },
  {
    source: "Lee_Park_2024_Uncertainty.pdf",
    author: "Lee, S. & Park, H.",
    year: "2024",
    section: "Results",
    sectionColor: "#f59e0b",
    quote: "Students in regions with higher political instability scored 23% lower on the Career Decision Self-Efficacy scale (p < .001, d = 0.67).",
    notes: "Medium-to-large effect size (d=0.67). CONTRADICTS earlier findings by Rivera (2019) who found no significant effect. Need to address this discrepancy.",
    synthesis: "While Lee & Park (2024) found a medium effect size (d=0.67), this contrasts with Rivera (2019) who reported null results, suggesting moderating variables...",
    apa: "Lee, S. & Park, H. (2024). Political instability and career self-efficacy. Asian Journal of Education, 12(1), 89-104.",
  },
  {
    source: "Chen_2023_Students.pdf",
    author: "Chen, W.",
    year: "2023",
    section: "Discussion",
    sectionColor: "#f472b6",
    quote: "The mediating role of perceived economic threat suggests that geopolitical effects on career planning are not direct but operate through economic anxiety.",
    notes: "Important mediator variable — economic anxiety. This could explain the contradictory findings between Lee & Park and Rivera.",
    synthesis: "",
    apa: "Chen, W. (2023). Mediating pathways between geopolitics and career planning. Journal of Vocational Behavior, 140, 103-118.",
  },
];

export default function LitReviewPreview() {
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
        <Link href="/projects-preview" style={{ color: palette.inkMuted, textDecoration: "none", fontSize: "11px" }}>
          ← Projects&nbsp;&nbsp;&nbsp;Geopolitical
        </Link>
        <div style={{ flex: 1 }} />
        {[{n:"ScholarAsk",h:"/scholar-ask-preview"},{n:"Workspace",h:"/workspace-preview"},{n:"Meta Analysis",h:"/meta-analysis-preview"},{n:"Lit Review",h:"/lit-review-preview"},{n:"Paper Writer",h:"/paper-writer-preview"}].map((tab) => (
          <Link key={tab.n} href={tab.h} style={{ color: tab.n === "Lit Review" ? palette.cerise : palette.inkMuted, fontWeight: tab.n === "Lit Review" ? 700 : 400, borderBottom: tab.n === "Lit Review" ? `2px solid ${palette.cerise}` : "2px solid transparent", paddingBottom: "8px", marginBottom: "-1px", fontSize: "11px", textDecoration: "none" }}>{tab.n}
          </Link>
        ))}
      </div>

      {/* ═══ Toolbar ═══ */}
      <div
        style={{
          height: "44px", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: `1px solid ${palette.rule}`,
          background: "#fff",
        }}
      >
        {/* Left: filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em" }}>Filter:</span>
          {["All Sections", "All Sources", "All Years"].map((filter) => (
            <select
              key={filter}
              defaultValue=""
              style={{
                border: `1px solid ${palette.rule}`, borderRadius: "6px",
                padding: "4px 10px", fontSize: "11px", fontFamily: "var(--font-dm-sans)",
                background: "#fff", color: palette.ink, outline: "none",
              }}
            >
              <option value="">{filter}</option>
            </select>
          ))}
        </div>

        {/* Right: actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            style={{
              background: "transparent", color: palette.ink,
              border: `1px solid ${palette.rule}`, borderRadius: "100px",
              padding: "5px 14px", fontSize: "11px",
              fontFamily: "var(--font-dm-sans)", fontWeight: 600, cursor: "pointer",
            }}
          >
            Export CSV
          </button>
          <span style={{ fontSize: "11px", color: palette.inkFaint }}>4 entries</span>
        </div>
      </div>

      {/* ═══ Table ═══ */}
      <div style={{ flex: 1, overflow: "auto", position: "relative", overflowX: "auto" }}>
        {/* Gold stars */}
        {[
          { top: "30px", left: "20px", size: 12, rot: -15 },
          { top: "80px", right: "30px", size: 14, rot: 10 },
          { bottom: "60px", left: "40px", size: 10, rot: 20 },
          { bottom: "100px", right: "50px", size: 16, rot: -8 },
        ].map((s, i) => (
          <svg
            key={i}
            width={s.size}
            height={s.size}
            viewBox="0 0 24 24"
            fill="none"
            style={{
              position: "absolute",
              top: "top" in s ? s.top : undefined,
              bottom: "bottom" in s ? s.bottom : undefined,
              left: "left" in s ? s.left : undefined,
              right: "right" in s ? s.right : undefined,
              transform: `rotate(${s.rot}deg)`,
              opacity: 0.35, zIndex: 1,
            }}
          >
            <path d="M12 2 L14.2 9.2 L21.5 9.2 L15.6 13.6 L17.8 20.8 L12 16.4 L6.2 20.8 L8.4 13.6 L2.5 9.2 L9.8 9.2 Z" fill={palette.gold} />
          </svg>
        ))}

        <table
          style={{
            minWidth: "1200px", width: "100%", borderCollapse: "collapse",
            fontFamily: "var(--font-dm-sans)", fontSize: "12px",
          }}
        >
          {/* Header */}
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  style={{
                    position: "sticky", top: 0,
                    background: palette.surface,
                    borderBottom: `2px solid ${palette.rule}`,
                    borderRight: `1px solid ${palette.rule}`,
                    padding: "10px 12px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: palette.inkFaint,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    whiteSpace: "nowrap",
                    zIndex: 2,
                    resize: "horizontal",
                    overflow: "visible",
                    minWidth: "80px",
                    maxWidth: "400px",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sampleRows.map((row, i) => (
              <tr
                key={i}
                style={{
                  background: i % 2 === 0 ? "#fff" : palette.surface,
                  borderBottom: `1px solid ${palette.rule}`,
                }}
              >
                {/* Source */}
                <td style={{ padding: "14px 12px", verticalAlign: "top", borderRight: `1px solid ${palette.rule}`, overflow: "visible", wordBreak: "break-word" as const, minWidth: "160px" }}>
                  <div style={{ fontWeight: 600, color: palette.ink, fontSize: "11px" }}>{row.source}</div>
                </td>
                {/* Author */}
                <td style={{ padding: "14px 12px", verticalAlign: "top", borderRight: `1px solid ${palette.rule}`, overflow: "visible", wordBreak: "break-word" as const, minWidth: "140px" }}>
                  <div style={{ color: palette.ink, fontSize: "11px" }}>{row.author}</div>
                </td>
                {/* Year */}
                <td style={{ padding: "14px 12px", verticalAlign: "top", borderRight: `1px solid ${palette.rule}`, overflow: "visible", wordBreak: "break-word" as const, minWidth: "50px" }}>
                  <div style={{ fontWeight: 600, color: palette.ink, fontSize: "11px" }}>{row.year}</div>
                </td>
                {/* Section */}
                <td style={{ padding: "14px 12px", verticalAlign: "top", borderRight: `1px solid ${palette.rule}`, overflow: "visible", wordBreak: "break-word" as const, minWidth: "120px" }}>
                  <span
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      background: `${row.sectionColor}18`,
                      border: `1px solid ${row.sectionColor}40`,
                      borderRadius: "100px",
                      padding: "3px 10px",
                      fontSize: "10px", fontWeight: 600, color: palette.ink,
                    }}
                  >
                    <span style={{ width: "7px", height: "7px", borderRadius: "2px", background: row.sectionColor }} />
                    {row.section}
                  </span>
                </td>
                {/* Quote */}
                <td style={{ padding: "14px 12px", verticalAlign: "top", borderRight: `1px solid ${palette.rule}`, overflow: "visible", wordBreak: "break-word" as const, minWidth: "200px", maxWidth: "260px" }}>
                  <div
                    style={{
                      background: "#fef9c3",
                      borderLeft: `3px solid ${palette.gold}`,
                      borderRadius: "0 4px 4px 0",
                      padding: "8px 10px",
                      fontSize: "11px", color: palette.ink, fontStyle: "italic",
                      lineHeight: 1.5,
                    }}
                  >
                    &quot;{row.quote}&quot;
                  </div>
                </td>
                {/* Notes */}
                <td style={{ padding: "14px 12px", verticalAlign: "top", borderRight: `1px solid ${palette.rule}`, overflow: "visible", wordBreak: "break-word" as const, minWidth: "200px", maxWidth: "240px" }}>
                  <div style={{ fontSize: "11px", color: palette.ink, lineHeight: 1.5 }}>
                    {row.notes}
                  </div>
                </td>
                {/* Synthesis */}
                <td style={{ padding: "14px 12px", verticalAlign: "top", borderRight: `1px solid ${palette.rule}`, overflow: "visible", wordBreak: "break-word" as const, minWidth: "200px", maxWidth: "260px" }}>
                  {row.synthesis ? (
                    <div style={{ fontSize: "11px", color: palette.ink, lineHeight: 1.5 }}>
                      {row.synthesis}
                    </div>
                  ) : (
                    <div style={{ fontSize: "11px", color: palette.inkFaint, fontStyle: "italic" }}>
                      Click to add synthesis...
                    </div>
                  )}
                </td>
                {/* APA */}
                <td style={{ padding: "14px 12px", verticalAlign: "top", borderRight: `1px solid ${palette.rule}`, overflow: "visible", wordBreak: "break-word" as const, minWidth: "220px", maxWidth: "280px" }}>
                  <div style={{ fontSize: "10px", color: palette.inkMuted, lineHeight: 1.5, fontFamily: "var(--font-dm-sans)" }}>
                    {row.apa}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty row hint */}
        <div style={{ textAlign: "center", padding: "40px", color: palette.inkFaint, fontSize: "12px" }}>
          Highlights from your PDFs will appear here automatically. Go to{" "}
          <Link href="/workspace-preview" style={{ color: palette.cerise, textDecoration: "none", fontWeight: 600 }}>
            Workspace
          </Link>{" "}
          to start highlighting.
        </div>
      </div>
    </div>
  );
}
