/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState } from "react";
import { DM_Serif_Display, DM_Sans, Playfair_Display, Noto_Sans, Fredoka } from "next/font/google";
import HEDGEHOG from "@/lib/hedgehog";
import PublicMarketingNavbar from "@/components/layout/PublicMarketingNavbar";
import PublicMarketingFooter from "@/components/layout/PublicMarketingFooter";

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

const projects = [
  {
    id: 1,
    name: "Geopolitical Uncertainty & Career Planning",
    description: "Investigating how geopolitical instability affects student career self-efficacy and decision-making across politically volatile regions.",
    papers: 4,
    highlights: 23,
    lastEdited: "2 hours ago",
    progress: 65,
    color: "#c0392b",
  },
  {
    id: 2,
    name: "AI in Higher Education",
    description: "Exploring the impact of generative AI tools on academic integrity, learning outcomes, and pedagogical approaches in universities.",
    papers: 7,
    highlights: 41,
    lastEdited: "Yesterday",
    progress: 40,
    color: "#c8a84b",
  },
  {
    id: 3,
    name: "Mental Health & Remote Learning",
    description: "A meta-analysis of post-pandemic remote learning effects on undergraduate student mental health and academic performance.",
    papers: 12,
    highlights: 67,
    lastEdited: "3 days ago",
    progress: 85,
    color: "#34d399",
  },
  {
    id: 4,
    name: "Climate Anxiety Among Youth",
    description: "Studying the relationship between climate change awareness, eco-anxiety, and pro-environmental behavior in Gen Z students.",
    papers: 2,
    highlights: 8,
    lastEdited: "1 week ago",
    progress: 15,
    color: "#60a5fa",
  },
];

/* Stars */
const stars = [
  { top: "8%", left: "5%", size: 7, op: 0.3, rot: -8 },
  { top: "15%", right: "8%", size: 9, op: 0.4, rot: 12 },
  { top: "30%", left: "3%", size: 6, op: 0.35, rot: -5 },
  { top: "50%", right: "5%", size: 8, op: 0.3, rot: 10 },
  { top: "70%", left: "6%", size: 10, op: 0.4, rot: -12 },
  { top: "85%", right: "4%", size: 6, op: 0.35, rot: 8 },
];

export default function ProjectsPreview() {
  const fontClasses = [dmSerif.variable, dmSans.variable, playfair.variable, notoSans.variable, fredoka.variable].join(" ");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={fontClasses}
      style={{
        background: palette.bg, color: palette.ink,
        fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
        minHeight: "100vh",
      }}
    >
      {/* ═══ Navbar ═══ */}
      <PublicMarketingNavbar />

      {/* ═══ Content ═══ */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 32px 80px", position: "relative" }}>

        {/* Gold stars */}
        {stars.map((s, i) => (
          <svg key={i} width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" style={{ position: "absolute", top: s.top, left: "left" in s ? s.left : undefined, right: "right" in s ? s.right : undefined, opacity: s.op, transform: `rotate(${s.rot}deg)` }}>
            <path d="M12 2 L14.2 9.2 L21.5 9.2 L15.6 13.6 L17.8 20.8 L12 16.4 L6.2 20.8 L8.4 13.6 L2.5 9.2 L9.8 9.2 Z" fill={palette.gold} />
          </svg>
        ))}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "36px", fontWeight: 400, color: palette.ink, margin: "0 0 8px" }}>
              Your Projects
            </h1>
            <p style={{ fontSize: "14px", color: palette.inkMuted, margin: 0 }}>
              {projects.length} research projects · {projects.reduce((a, p) => a + p.papers, 0)} papers uploaded
            </p>
          </div>
          <button
            style={{
              padding: "12px 24px", borderRadius: "50px",
              background: palette.cerise, color: "#fff", border: "none",
              fontFamily: "var(--font-fredoka)", fontSize: "13px", fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + New Project
          </button>
        </div>

        {/* Search + filter */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              style={{
                width: "100%", padding: "12px 16px", border: `1.5px solid ${palette.cardBorder}`,
                borderRadius: "10px", fontSize: "13px", fontFamily: "var(--font-dm-sans)",
                color: palette.ink, outline: "none", background: "#fff",
              }}
            />
          </div>
          <select style={{ padding: "10px 16px", border: `1.5px solid ${palette.cardBorder}`, borderRadius: "10px", fontSize: "12px", fontFamily: "var(--font-dm-sans)", color: palette.ink, background: "#fff", outline: "none" }}>
            <option>All Projects</option>
            <option>Recent</option>
            <option>Most Papers</option>
          </select>
        </div>

        {/* Project cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filtered.map((project) => (
            <div
              key={project.id}
              className="transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "#fff",
                border: `1.5px solid ${palette.cardBorder}`,
                borderRadius: "16px",
                padding: "28px 32px",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Color accent bar */}
              <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: project.color, borderRadius: "4px 0 0 4px" }} />

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "24px" }}>
                <div style={{ flex: 1 }}>
                  {/* Project name */}
                  <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "20px", fontWeight: 400, color: palette.ink, margin: "0 0 8px", lineHeight: 1.3 }}>
                    {project.name}
                  </h2>

                  {/* Description */}
                  <p style={{ fontSize: "13px", color: palette.inkMuted, lineHeight: 1.6, margin: "0 0 16px", maxWidth: "600px" }}>
                    {project.description}
                  </p>

                  {/* Stats row */}
                  <div style={{ display: "flex", gap: "20px", fontSize: "12px", color: palette.inkFaint }}>
                    <span>{project.papers} papers</span>
                    <span>{project.highlights} highlights</span>
                    <span>Edited {project.lastEdited}</span>
                  </div>
                </div>

                {/* Right side: progress + action */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px", flexShrink: 0 }}>
                  {/* Progress circle */}
                  <div style={{ position: "relative", width: "48px", height: "48px" }}>
                    <svg width="48" height="48" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="20" fill="none" stroke={palette.rule} strokeWidth="3" />
                      <circle
                        cx="24" cy="24" r="20" fill="none"
                        stroke={project.color} strokeWidth="3"
                        strokeDasharray={`${2 * Math.PI * 20}`}
                        strokeDashoffset={`${2 * Math.PI * 20 * (1 - project.progress / 100)}`}
                        strokeLinecap="round"
                        transform="rotate(-90 24 24)"
                      />
                    </svg>
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: palette.ink }}>
                      {project.progress}%
                    </span>
                  </div>

                  {/* Open button */}
                  <button
                    style={{
                      padding: "6px 16px", borderRadius: "100px",
                      border: `1.5px solid ${palette.cardBorder}`, background: "transparent",
                      fontFamily: "var(--font-dm-sans)", fontSize: "11px", fontWeight: 600,
                      color: palette.ink, cursor: "pointer",
                    }}
                    className="hover:bg-[#faf7f0]"
                  >
                    Open →
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: "16px", height: "4px", background: palette.rule, borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${project.progress}%`, background: project.color, borderRadius: "2px", transition: "width 0.3s" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Empty state if no results */}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <img src={HEDGEHOG.hedgehog09Notepad} alt="" style={{ width: "100px", height: "auto", opacity: 0.5, marginBottom: "16px" }} />
            <p style={{ fontSize: "14px", color: palette.inkMuted }}>No projects match &quot;{searchQuery}&quot;</p>
          </div>
        )}

        {/* Quick links footer */}
        <div style={{ marginTop: "48px", display: "flex", gap: "16px", justifyContent: "center" }}>
          <Link
            href="/research-guidance"
            className="hover:underline"
            style={{ fontSize: "13px", color: palette.inkMuted, textDecoration: "none" }}
          >
            Research Guidance
          </Link>
          <span style={{ color: palette.rule }}>·</span>
          <Link
            href="/about"
            className="hover:underline"
            style={{ fontSize: "13px", color: palette.inkMuted, textDecoration: "none" }}
          >
            About Cerise Scholar
          </Link>
          <span style={{ color: palette.rule }}>·</span>
          <Link
            href="/"
            className="hover:underline"
            style={{ fontSize: "13px", color: palette.inkMuted, textDecoration: "none" }}
          >
            Home
          </Link>
        </div>
      </div>

      <PublicMarketingFooter />
    </div>
  );
}
