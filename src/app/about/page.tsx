/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { DM_Serif_Display, DM_Sans, Playfair_Display, Noto_Sans, Fredoka } from "next/font/google";
import HEDGEHOG from "@/lib/hedgehog";

export const metadata: Metadata = {
  title: "About — Cerise Scholar",
  description: "Learn about Cerise Scholar — our features and mission.",
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

export default function AboutLanding() {
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

      {/* ── About landing ── */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "100px 32px", textAlign: "center" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: p.cerise, margin: "0 0 20px" }}>ABOUT</p>
        <h1 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 400, lineHeight: 1.1, margin: "0 0 24px" }}>
          Get to know <span style={{ fontStyle: "italic", color: p.cerise }}>Cerise Scholar</span>
        </h1>
        <p style={{ fontSize: "clamp(14px, 1.1vw, 16px)", color: p.muted, lineHeight: 1.7, maxWidth: "480px", margin: "0 auto 60px" }}>
          Explore what we built and why we built it.
        </p>

        {/* Two cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", maxWidth: "700px", margin: "0 auto" }}>
          {/* Features card */}
          <Link href="/about/features" className="hover:shadow-lg transition-shadow" style={{ textDecoration: "none", color: p.ink, background: "#fff", border: `1.5px solid ${p.border}`, borderRadius: "20px", padding: "40px 32px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <img src={HEDGEHOG.hedgehog05Laptop} alt="" style={{ width: "100px", height: "100px", objectFit: "contain", marginBottom: "20px" }} />
            <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "clamp(22px, 1.8vw, 28px)", fontWeight: 400, margin: "0 0 12px" }}>
              Features
            </h2>
            <p style={{ fontSize: "13px", color: p.muted, lineHeight: 1.6, margin: "0 0 20px" }}>
              8 research tools, one workspace. See how everything connects.
            </p>
            <span style={{ fontSize: "13px", fontWeight: 600, color: p.cerise }}>Explore features →</span>
          </Link>

          {/* Mission card */}
          <Link href="/about/mission" className="hover:shadow-lg transition-shadow" style={{ textDecoration: "none", color: "#fff", background: p.ink, borderRadius: "20px", padding: "40px 32px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <img src={HEDGEHOG.hedgehog06Clasped} alt="" style={{ width: "100px", height: "100px", objectFit: "contain", marginBottom: "20px" }} />
            <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "clamp(22px, 1.8vw, 28px)", fontWeight: 400, margin: "0 0 12px" }}>
              Mission
            </h2>
            <p style={{ fontSize: "13px", opacity: 0.7, lineHeight: 1.6, margin: "0 0 20px" }}>
              Built for the quiet ones with big questions. Meet StarPine and Cerise.
            </p>
            <span style={{ fontSize: "13px", fontWeight: 600, color: p.gold }}>Read our story →</span>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "#f5f2ec", borderTop: `1px solid ${p.rule}` }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 48px 24px" }}>
          <div style={{ borderTop: `1px solid ${p.rule}`, paddingTop: "20px", paddingBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", color: p.faint }}>© 2025 Cerise Scholar · All rights reserved</span>
            <span style={{ fontSize: "11px", color: p.faint }}>Built for researchers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
