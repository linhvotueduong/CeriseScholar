/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { DM_Serif_Display, DM_Sans, Playfair_Display, Noto_Sans, Fredoka } from "next/font/google";
import HEDGEHOG from "@/lib/hedgehog";

export const metadata: Metadata = {
  title: "Features — Cerise Scholar",
  description: "Discover the 8 research tools inside Cerise Scholar — from PDF reading to paper writing.",
};

const dmSerif = DM_Serif_Display({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-dm-serif", display: "swap" });
const dmSans = DM_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const playfair = Playfair_Display({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const notoSans = Noto_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-noto", display: "swap" });
const fredoka = Fredoka({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-fredoka", display: "swap" });

const p = {
  bg: "#fefefe", surface: "#fdfcfa", warm: "#faf7f0",
  ink: "#1a1208", muted: "#7a6a5a", faint: "#9a8a7a",
  cerise: "#c0392b", rule: "#e0d8d0", border: "#d4cdc5", gold: "#c8a84b",
};

const stats = [
  { value: "100%", label: "Free forever" },
  { value: "8", label: "Research tools" },
  { value: "∞", label: "No usage limits" },
  { value: "0", label: "Hallucinated citations" },
];

const timeline = [
  { step: 1, title: "Brainstorm", desc: "Ask ScholarAsk your research question", img: HEDGEHOG.hedgehog06Clasped },
  { step: 2, title: "Read & Highlight", desc: "Upload PDFs, mark key passages", img: HEDGEHOG.hedgehog05Laptop },
  { step: 3, title: "Synthesize", desc: "Auto-populated literature review table", img: HEDGEHOG.hedgehog11LitBook },
  { step: 4, title: "Analyze", desc: "Run meta-analysis and statistics", img: HEDGEHOG.hedgehog10Magnifier },
  { step: 5, title: "Write", desc: "Draft your paper section by section", img: HEDGEHOG.hedgehog04RedPen },
];

export default function FeaturesPage() {
  const fc = [dmSerif.variable, dmSans.variable, playfair.variable, notoSans.variable, fredoka.variable].join(" ");

  return (
    <div className={`${fc} min-h-screen`} style={{ background: p.bg, color: p.ink, fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif" }}>

      {/* ── Navbar ── */}
      <div style={{ padding: "12px 24px 0", position: "relative" }}>
        <img src={HEDGEHOG.hedgehog03Standing} alt="" className="pointer-events-none hidden lg:block" style={{ position: "absolute", left: "calc(50% - 550px - 60px)", top: "8px", height: "52px", width: "auto", objectFit: "contain", zIndex: 10 }} />
        <nav style={{ maxWidth: "1100px", margin: "0 auto", height: "48px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", background: "#fff", borderRadius: "100px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <Link href="/" style={{ fontFamily: "var(--font-playfair)", fontSize: "15px", color: p.ink, textDecoration: "none" }}>Cerise Scholar</Link>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", fontFamily: "var(--font-noto)", fontSize: "11px" }}>
            <Link href="/" className="hover:opacity-70" style={{ color: p.ink, textDecoration: "none" }}>Home</Link>
            <div className="group" style={{ position: "relative" }}><span className="cursor-pointer" style={{ color: p.cerise, fontWeight: 600 }}>About</span><div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200" style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: "8px", background: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", padding: "8px", minWidth: "120px", zIndex: 200 }}><Link href="/about/features" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: p.ink, textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>Features</Link><Link href="/about/mission" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: p.ink, textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>Mission</Link></div></div>
            <Link href="/research-guidance" className="hover:opacity-70" style={{ color: p.ink, textDecoration: "none" }}>Research Guide</Link>
            <Link href="/projects-preview" className="hover:opacity-70" style={{ color: p.ink, textDecoration: "none" }}>Projects</Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link href="/login" className="hover:opacity-70" style={{ fontFamily: "var(--font-noto)", fontSize: "11px", color: p.ink, textDecoration: "none" }}>Log In</Link>
            <Link href="/signup" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 16px", fontFamily: "var(--font-noto)", fontSize: "11px", fontWeight: 600, background: p.ink, color: "#fff", borderRadius: "100px", textDecoration: "none" }}>Sign Up Free</Link>
          </div>
        </nav>
      </div>

      {/* ── Hero ── */}
      <section style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center", padding: "48px 32px 0" }}>
        <h1 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "clamp(32px, 3vw, 44px)", fontWeight: 400, color: p.ink, lineHeight: 1.1, margin: 0 }}>
          Research, <span style={{ fontStyle: "italic" }}>reimagined.</span>
        </h1>
        <p style={{ fontSize: "clamp(14px, 1.1vw, 16px)", color: p.muted, marginTop: "16px", lineHeight: 1.7, maxWidth: "520px", marginLeft: "auto", marginRight: "auto" }}>
          One warm, well-lit workspace where reading, highlighting, reviewing, analyzing, and writing all live together.
        </p>
      </section>

      {/* ── Timeline ── */}
      <section style={{ padding: "40px 0 40px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 32px" }}>
          <div style={{ display: "flex", gap: "0", alignItems: "flex-start", justifyContent: "center" }}>
            {timeline.map((t, i) => (
              <div key={t.step} style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "140px", textAlign: "center" }}>
                  <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#fff", border: `2px solid ${p.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                    <img src={t.img} alt="" style={{ width: "60px", height: "60px", objectFit: "contain" }} />
                  </div>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: p.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Step {t.step}</span>
                  <span style={{ fontFamily: "var(--font-noto)", fontSize: "13px", fontWeight: 700, color: p.ink }}>{t.title}</span>
                  <span style={{ fontSize: "11px", color: p.muted, marginTop: "4px", lineHeight: 1.4 }}>{t.desc}</span>
                </div>
                {i < timeline.length - 1 && (
                  <div style={{ width: "40px", height: "2px", background: p.border, marginTop: "40px", flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bento Grid ── */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "0 32px 56px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "auto", gap: "16px" }}>
          {/* Mission card */}
          <div style={{ gridColumn: "span 2", gridRow: "span 2", background: p.warm, border: `1.5px solid ${p.border}`, borderRadius: "16px", padding: "36px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontFamily: "var(--font-noto)", fontSize: "10px", fontWeight: 700, color: p.cerise, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "12px" }}>Our Mission</p>
              <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "clamp(20px, 1.8vw, 26px)", fontWeight: 400, color: p.ink, lineHeight: 1.2, margin: "0 0 16px" }}>
                Make academic research accessible, organized, and <span style={{ fontStyle: "italic" }}>enjoyable</span>.
              </h2>
              <p style={{ fontSize: "13px", color: p.muted, lineHeight: 1.7 }}>
                Cerise Scholar combines PDF reading, annotation, and literature review synthesis into one seamless workspace. No more juggling tabs, copying between tools, or losing track of your sources.
              </p>
            </div>
            <img src={HEDGEHOG.hedgehog05Laptop} alt="" style={{ width: "120px", height: "auto", objectFit: "contain", alignSelf: "flex-end", marginTop: "16px" }} />
          </div>

          {/* Stat cards */}
          {stats.map((s) => (
            <div key={s.label} style={{ background: "#fff", border: `1.5px solid ${p.border}`, borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-dm-serif)", fontSize: "36px", fontWeight: 400, color: p.ink, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "11px", color: p.faint, marginTop: "8px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
            </div>
          ))}

          {/* Built for researchers */}
          <div style={{ gridColumn: "span 2", background: "#fff", border: `1.5px solid ${p.border}`, borderRadius: "16px", padding: "32px", display: "flex", gap: "24px", alignItems: "center" }}>
            <img src={HEDGEHOG.hedgehog11LitBook} alt="" style={{ width: "90px", height: "auto", objectFit: "contain", flexShrink: 0 }} />
            <div>
              <h3 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "20px", fontWeight: 400, color: p.ink, margin: "0 0 8px" }}>Built for researchers</h3>
              <p style={{ fontSize: "12px", color: p.muted, lineHeight: 1.6, margin: 0 }}>
                Graduate students, academics, and anyone writing a thesis, dissertation, or research paper. From first-time researchers to seasoned professors.
              </p>
            </div>
          </div>

          {/* 8 tools */}
          <div style={{ gridColumn: "span 2", background: p.warm, border: `1.5px solid ${p.border}`, borderRadius: "16px", padding: "32px" }}>
            <h3 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "20px", fontWeight: 400, color: p.ink, margin: "0 0 16px" }}>8 tools, one workspace</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                { icon: "📄", name: "PDF Viewer + OCR" }, { icon: "🖍", name: "Smart Highlighting" },
                { icon: "📊", name: "Lit Review Table" }, { icon: "🔍", name: "ScholarAsk AI" },
                { icon: "📈", name: "Meta-Analysis" }, { icon: "✍️", name: "Paper Writer" },
                { icon: "🎧", name: "Text-to-Speech" }, { icon: "🏷", name: "Code System" },
              ].map((f) => (
                <div key={f.name} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "#fff", borderRadius: "8px", border: `1px solid ${p.rule}` }}>
                  <span style={{ fontSize: "16px" }}>{f.icon}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: p.ink }}>{f.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mascot */}
          <div style={{ background: "#fff", border: `1.5px solid ${p.border}`, borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <img src={HEDGEHOG.hedgehog06Clasped} alt="" style={{ width: "80px", height: "auto", objectFit: "contain" }} />
            <p style={{ fontSize: "11px", color: p.muted, marginTop: "8px", textAlign: "center", lineHeight: 1.4 }}>Meet our mascot!</p>
          </div>

          {/* Open source */}
          <div style={{ background: "#fff", border: `1.5px solid ${p.border}`, borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🌐</div>
            <h3 style={{ fontFamily: "var(--font-noto)", fontSize: "13px", fontWeight: 700, color: p.ink, margin: "0 0 6px" }}>Open Source</h3>
            <p style={{ fontSize: "11px", color: p.muted, lineHeight: 1.4, margin: "0 0 12px" }}>Free forever. View on GitHub.</p>
            <a href="https://github.com/linhvotueduong/CeriseScholar" target="_blank" style={{ fontSize: "11px", color: p.cerise, fontWeight: 600, textDecoration: "none" }}>GitHub →</a>
          </div>

          {/* Real citations */}
          <div style={{ gridColumn: "span 2", background: p.cerise, color: "#fff", borderRadius: "16px", padding: "32px", display: "flex", gap: "24px", alignItems: "center" }}>
            <div style={{ fontSize: "48px", flexShrink: 0 }}>🎯</div>
            <div>
              <h3 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "20px", fontWeight: 400, margin: "0 0 8px" }}>Real citations only</h3>
              <p style={{ fontSize: "13px", lineHeight: 1.6, margin: 0, opacity: 0.9 }}>
                ScholarAsk pulls from OpenAlex — an open catalog of 250M+ academic papers. Every answer is grounded in real, verifiable references. Zero hallucinations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 32px 64px" }}>
        <div style={{
          background: p.surface,
          border: `1.5px solid ${p.border}`,
          borderRadius: "16px",
          padding: "60px 40px",
          textAlign: "center",
        }}>
          <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "clamp(28px, 3vw, 38px)", fontWeight: 400, color: p.ink, margin: "0 0 12px" }}>
            Ready to <span style={{ fontStyle: "italic" }}>begin?</span>
          </h2>
          <p style={{ fontSize: "14px", color: p.muted }}>Free to use. No credit card. Built for researchers.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "28px", alignItems: "center" }}>
            <Link
              href="/projects-preview"
              className="transition-colors hover:bg-[#1a1208] hover:text-white"
              style={{
                padding: "14px 36px", borderRadius: "50px",
                border: `1px solid ${p.border}`, background: "transparent",
                fontFamily: "var(--font-fredoka)", fontSize: "13px", fontWeight: 600,
                color: p.ink, textDecoration: "none",
              }}
            >
              Go to Workspace
            </Link>
            <span style={{ fontFamily: "var(--font-fredoka)", fontSize: "12px", fontWeight: 500, color: p.ink }}>OR</span>
            <Link
              href="/signup"
              className="transition-colors hover:bg-[#1a1208] hover:text-white"
              style={{
                padding: "14px 36px", borderRadius: "50px",
                border: `1px solid ${p.border}`, background: "transparent",
                fontFamily: "var(--font-fredoka)", fontSize: "13px", fontWeight: 600,
                color: p.ink, textDecoration: "none",
              }}
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "#f5f2ec", borderTop: `1px solid ${p.rule}` }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 48px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1.5fr", gap: "40px", marginBottom: "32px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <img src={HEDGEHOG.hedgehog03Standing} alt="" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "15px", color: p.ink }}>Cerise Scholar</span>
              </div>
              <p style={{ fontSize: "12px", color: p.muted, lineHeight: 1.6, maxWidth: "220px" }}>The research companion for reading, highlighting, reviewing, and writing.</p>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-noto)", fontSize: "11px", fontWeight: 700, color: p.ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>Product</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
                <Link href="/scholar-ask-preview" style={{ color: p.muted, textDecoration: "none" }}>ScholarAsk</Link>
                <Link href="/workspace-preview" style={{ color: p.muted, textDecoration: "none" }}>Workspace</Link>
                <Link href="/lit-review-preview" style={{ color: p.muted, textDecoration: "none" }}>Literature Review</Link>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-noto)", fontSize: "11px", fontWeight: 700, color: p.ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>Company</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
                <Link href="/about/features" style={{ color: p.muted, textDecoration: "none" }}>Features</Link>
                <Link href="/about/mission" style={{ color: p.muted, textDecoration: "none" }}>Mission</Link>
                <Link href="/research-guidance" style={{ color: p.muted, textDecoration: "none" }}>Research Guide</Link>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-noto)", fontSize: "11px", fontWeight: 700, color: p.ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>Newsletter</p>
              <p style={{ fontSize: "12px", color: p.muted, lineHeight: 1.6, marginBottom: "14px" }}>Receive product updates and research tips.</p>
              <div style={{ display: "flex", gap: "6px" }}>
                <input type="email" placeholder="Enter your email..." style={{ flex: 1, padding: "10px 14px", border: `1.5px solid ${p.border}`, borderRadius: "100px", fontSize: "12px", fontFamily: "var(--font-dm-sans)", color: p.ink, outline: "none", background: "#fff" }} />
                <button style={{ width: "40px", height: "40px", borderRadius: "50%", background: p.ink, color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "16px", flexShrink: 0 }}>→</button>
              </div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${p.rule}`, paddingTop: "20px", paddingBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", color: p.faint }}>© 2025 Cerise Scholar · All rights reserved</span>
            <span style={{ fontSize: "11px", color: p.faint }}>Built for researchers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
