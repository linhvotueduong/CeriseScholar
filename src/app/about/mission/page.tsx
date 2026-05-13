/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { DM_Serif_Display, DM_Sans, Playfair_Display, Noto_Sans, Fredoka } from "next/font/google";
import HEDGEHOG from "@/lib/hedgehog";

export const metadata: Metadata = {
  title: "Mission — Cerise Scholar",
  description: "Built for the quiet ones with big questions. Meet StarPine and Cerise — the heart of Cerise Scholar.",
};

const dmSerif = DM_Serif_Display({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-dm-serif", display: "swap" });
const dmSans = DM_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const playfair = Playfair_Display({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const notoSans = Noto_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-noto", display: "swap" });
const fredoka = Fredoka({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-fredoka", display: "swap" });

const V = (px: number) => `calc(${px} / 1460 * 100vw)`;

const p = {
  bg: "#fefefe", surface: "#fdfcfa", warm: "#faf7f0",
  ink: "#1a1208", muted: "#7a6a5a", faint: "#9a8a7a", body: "#5a4a3a",
  cerise: "#c0392b", rule: "#e0d8d0", border: "#d4cdc5", gold: "#c8a84b",
  coral: "#e89a6f",
};

export default function MissionPage() {
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

      {/* ═══ HERO — split layout with circle ═══ */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 40px 50px", display: "flex", alignItems: "center", gap: "40px" }}>
        {/* Left: text */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: p.cerise, margin: "0 0 16px" }}>OUR MISSION</p>
          <h1 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "clamp(28px, 3vw, 38px)", fontWeight: 400, lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            Built for the<br />
            <span style={{ fontStyle: "italic", color: p.cerise }}>quiet ones</span><br />
            with big<br />
            questions.
          </h1>
          <p style={{ fontSize: "14px", lineHeight: 1.65, color: p.muted, maxWidth: "320px", margin: 0 }}>
            Cerise Scholar is a research companion for every scholar who has ever felt alone with an idea worth chasing.
          </p>
        </div>

        {/* Right: circle visual */}
        <div style={{ flex: "0 0 auto", position: "relative" }}>
          <div style={{ width: "min(280px, 22vw)", height: "min(280px, 22vw)", borderRadius: "50%", background: p.warm, border: `2px solid ${p.rule}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <img src={HEDGEHOG.hedgehog10Magnifier} alt="Cerise" style={{ width: "65%", objectFit: "contain" }} />
          </div>
          {/* StarPine badge */}
          <div style={{ position: "absolute", bottom: "-6px", left: "-12px", width: "min(80px, 6vw)", height: "min(80px, 6vw)", borderRadius: "50%", background: "#fff", border: `5px solid ${p.warm}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <img src={HEDGEHOG.hedgehog06Clasped} alt="StarPine" style={{ width: "65%", objectFit: "contain" }} />
          </div>
        </div>
      </section>

      {/* ═══ TWO CHARACTERS — compact cards ═══ */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: `${V(40)} 32px ${V(60)}` }}>
        <div style={{ textAlign: "center", marginBottom: V(40) }}>
          <p style={{ fontSize: V(9), fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: p.cerise, margin: `0 0 ${V(12)}` }}>TWO CHARACTERS. ONE MISSION.</p>
          <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: V(28), fontWeight: 400, lineHeight: 1.15, margin: 0 }}>
            Every great idea starts small and spiky.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: V(20) }}>
          {/* StarPine */}
          <div style={{ background: "#fff", border: `1.5px solid ${p.rule}`, borderRadius: V(16), padding: V(28), display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div style={{ width: V(120), height: V(120), borderRadius: "50%", background: "linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: V(16), border: `1px solid ${p.rule}` }}>
              <img src={HEDGEHOG.hedgehog06Clasped} alt="StarPine" style={{ width: "70%", objectFit: "contain" }} />
            </div>
            <p style={{ fontSize: V(8), fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: p.cerise, margin: `0 0 ${V(10)}` }}>STARPINE</p>
            <h3 style={{ fontFamily: "var(--font-dm-serif)", fontSize: V(20), fontWeight: 400, lineHeight: 1.15, margin: `0 0 ${V(10)}` }}>
              Every spine, <span style={{ fontStyle: "italic", color: p.cerise }}>a star.</span>
            </h3>
            <p style={{ fontSize: V(10), lineHeight: 1.65, color: p.body, maxWidth: "340px", margin: `0 0 ${V(12)}` }}>
              A porcupine who refused to hide what made her difficult. Every struggle a researcher carries is a spine she turned into light.
            </p>
            <p style={{ fontSize: V(8), letterSpacing: "0.1em", color: p.faint, margin: 0 }}>SYMBOL OF THE SCHOLAR</p>
          </div>

          {/* Cerise */}
          <div style={{ background: "#fff", border: `1.5px solid ${p.rule}`, borderRadius: V(16), padding: V(28), display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div style={{ width: V(120), height: V(120), borderRadius: "50%", background: "linear-gradient(135deg, #fce4ec 0%, #fff3e0 100%)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: V(16), border: `1px solid ${p.rule}` }}>
              <img src={HEDGEHOG.hedgehog10Magnifier} alt="Cerise" style={{ width: "70%", objectFit: "contain" }} />
            </div>
            <p style={{ fontSize: V(8), fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: p.cerise, margin: `0 0 ${V(10)}` }}>CERISE</p>
            <h3 style={{ fontFamily: "var(--font-dm-serif)", fontSize: V(20), fontWeight: 400, lineHeight: 1.15, margin: `0 0 ${V(10)}` }}>
              Small outside. <span style={{ fontStyle: "italic", color: p.cerise }}>Entire world within.</span>
            </h3>
            <p style={{ fontSize: V(10), lineHeight: 1.65, color: p.body, maxWidth: "340px", margin: `0 0 ${V(12)}` }}>
              A cherry whose mind is open. Inside, scientists work at their benches, instruments turn, light moves through every chamber.
            </p>
            <p style={{ fontSize: V(8), letterSpacing: "0.1em", color: p.faint, margin: 0 }}>SYMBOL OF THE PRODUCT</p>
          </div>
        </div>
      </section>

      {/* ═══ THREE PRINCIPLES ═══ */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 32px" }}>
        {/* Header — two columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "40px", marginBottom: "48px", alignItems: "end" }}>
          <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "clamp(22px, 2.2vw, 28px)", fontWeight: 400, lineHeight: 1.05, margin: 0 }}>
            What we<br /><span style={{ fontStyle: "italic" }}>believe.</span>
          </h2>
          <p style={{ fontSize: "12px", lineHeight: 1.7, color: p.body, margin: 0 }}>
            Three ideas that shape every design choice, every feature, every line of code we write.
          </p>
        </div>

        {/* Three columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "32px" }}>
          {[
            { num: "01", title: "Research should never teach you to stop.", body: "Every friction we remove is a friction that once made a scholar quietly give up. We design against that." },
            { num: "02", title: "You bring the mind. We bring the memory.", body: "Remember what you highlighted Monday when you're writing Friday. Keep the thread no matter how long the work." },
            { num: "03", title: "Knowledge is not a product. It is a path.", body: "Every function flows into the next. Questions become sources, sources become insight, insight becomes a paper." },
          ].map((pr) => (
            <div key={pr.num} style={{ borderTop: `1.5px solid ${p.ink}`, paddingTop: "20px" }}>
              <p style={{ fontSize: "11px", letterSpacing: "0.12em", color: p.faint, margin: "0 0 14px" }}>{pr.num}</p>
              <h4 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "clamp(14px, 1.4vw, 17px)", fontWeight: 400, lineHeight: 1.25, margin: "0 0 10px", color: p.ink }}>{pr.title}</h4>
              <p style={{ fontSize: "12px", lineHeight: 1.7, color: p.body, margin: 0 }}>{pr.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CLOSING — CTA card ═══ */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 32px 64px" }}>
        <div style={{
          background: p.surface,
          border: `1.5px solid ${p.border}`,
          borderRadius: "16px",
          padding: "60px 40px",
          textAlign: "center",
        }}>
          <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "clamp(28px, 3vw, 38px)", fontWeight: 400, color: p.ink, margin: "0 0 12px" }}>
            Not answers. <span style={{ fontStyle: "italic", color: p.cerise }}>Vision.</span>
          </h2>
          <p style={{ fontSize: "14px", color: p.muted, maxWidth: "480px", margin: "0 auto" }}>
            Cerise Scholar walks alongside scholars as they build — brightening the world, little by little, with the ideas only they could bring.
          </p>
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
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "36px 48px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1.5fr", gap: "32px", marginBottom: "24px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <img src={HEDGEHOG.hedgehog03Standing} alt="" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "14px", color: p.ink }}>Cerise Scholar</span>
              </div>
              <p style={{ fontSize: "11px", color: p.muted, lineHeight: 1.6, maxWidth: "200px" }}>The research companion for reading, highlighting, reviewing, and writing.</p>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-noto)", fontSize: "10px", fontWeight: 700, color: p.ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>Product</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px" }}>
                <Link href="/scholar-ask-preview" style={{ color: p.muted, textDecoration: "none" }}>ScholarAsk</Link>
                <Link href="/workspace-preview" style={{ color: p.muted, textDecoration: "none" }}>Workspace</Link>
                <Link href="/lit-review-preview" style={{ color: p.muted, textDecoration: "none" }}>Literature Review</Link>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-noto)", fontSize: "10px", fontWeight: 700, color: p.ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>Company</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px" }}>
                <Link href="/about/features" style={{ color: p.muted, textDecoration: "none" }}>Features</Link>
                <Link href="/about/mission" style={{ color: p.muted, textDecoration: "none" }}>Mission</Link>
                <Link href="/research-guidance" style={{ color: p.muted, textDecoration: "none" }}>Research Guide</Link>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-noto)", fontSize: "10px", fontWeight: 700, color: p.ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>Newsletter</p>
              <p style={{ fontSize: "11px", color: p.muted, lineHeight: 1.6, marginBottom: "10px" }}>Product updates and research tips.</p>
              <div style={{ display: "flex", gap: "6px" }}>
                <input type="email" placeholder="Enter your email..." style={{ flex: 1, padding: "8px 12px", border: `1.5px solid ${p.border}`, borderRadius: "100px", fontSize: "11px", fontFamily: "var(--font-dm-sans)", color: p.ink, outline: "none", background: "#fff" }} />
                <button style={{ width: "34px", height: "34px", borderRadius: "50%", background: p.ink, color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "14px", flexShrink: 0 }}>→</button>
              </div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${p.rule}`, paddingTop: "16px", paddingBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "10px", color: p.faint }}>© 2025 Cerise Scholar · All rights reserved</span>
            <span style={{ fontSize: "10px", color: p.faint }}>Built for researchers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
