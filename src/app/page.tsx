/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  DM_Serif_Display,
  DM_Sans,
  Schoolbell,
  Playfair_Display,
  Noto_Sans,
  Roboto,
  Poppins,
  Bebas_Neue,
  Fredoka,
} from "next/font/google";
import HEDGEHOG from "@/lib/hedgehog";
import PipelineCart from "../components/PipelineCart";
import LiveDemo from "../components/LiveDemo";
import ShiftingGrid from "../components/ShiftingGrid";

/* -------- Fonts -------- */
const dmSerif = DM_Serif_Display({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-dm-serif", display: "swap" });
const dmSans = DM_Sans({ weight: ["400", "500", "600", "700"], style: ["normal", "italic"], subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const schoolbell = Schoolbell({ weight: "400", subsets: ["latin"], variable: "--font-schoolbell", display: "swap" });
const playfair = Playfair_Display({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const notoSans = Noto_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-noto", display: "swap" });
const roboto = Roboto({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-roboto", display: "swap" });
const poppins = Poppins({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-poppins", display: "swap" });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas", display: "swap" });
const fredoka = Fredoka({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-fredoka", display: "swap" });

/* -------- Scale helper: Canva 1460px → vw -------- */
const V = (px: number) => `calc(${px} / 1460 * 100vw)`;

/* -------- Palette -------- */
const palette = {
  cream: "#fefefe",
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  cerise: "#c0392b",
  rule: "#e0d8d0",
  cardBorder: "#d4cdc5",
};

/* -------- Content -------- */
const stages = [
  { title: "Brainstorm with ScholarAsk", desc: "Ask your research question. ScholarAsk surfaces relevant sources and shows you exactly how each one can contribute to your paper.", img: HEDGEHOG.hedgehog06Clasped, alt: "ScholarAsk brainstorm", tag: "ScholarAsk" },
  { title: "Analyze Sources at Workspace", desc: "Upload your PDFs to the Workspace. Highlight key passages, add notes, and tag sections as you read — all in one view.", img: HEDGEHOG.hedgehog05Laptop, alt: "Workspace analysis", tag: "Workspace" },
  { title: "Synthesize Literature Review", desc: "Upload your PDFs to the Workspace. Highlight key passages, add notes, and tag sections as you read — all in one view.", img: HEDGEHOG.hedgehog11LitBook, alt: "Literature review", tag: "Literature Review" },
  { title: "Personalized Meta-Analysis", desc: "Conduct the meta-analysis or literature review synthesis in the order of your personal preference.", img: HEDGEHOG.hedgehog10Magnifier, alt: "Meta-analysis", tag: "Meta-Analysis" },
  { title: "Write Your Paper with StarPine", desc: "Everything is ready: bring your synthesis, data, and references together and write your complete paper. Guided by StarPine every step of the way.", img: HEDGEHOG.hedgehog04RedPen, alt: "StarPine paper writer", tag: "StarPine Pen" },
];

const pillars = [
  { title: "End-to-end workflow", desc: "From finding sources to writing your paper — every step is connected." },
  { title: "Auto-populates for you", desc: "From finding sources to writing your paper — every step is connected." },
  { title: "Free, no limits", desc: "No paywalls, no credit card. Full access to every feature from day one." },
  { title: "AI that cites sources", desc: "ScholarAsk pulls real papers from OpenAlex — not hallucinated references." },
];

const faqs = [
  { q: "Is Cerise Scholar free to use?", a: "Yes. Every feature is free with no credit card required." },
  { q: "What file types can I upload?", a: "PDFs are fully supported — including scanned PDFs (automatic OCR)." },
  { q: "Where does ScholarAsk get its papers from?", a: "ScholarAsk uses OpenAlex, an open catalog of academic papers. Every answer is grounded in real references." },
  { q: "Is my research data private?", a: "Yes. PDFs, highlights, and notes are scoped to your account with row-level security. Never shared, never used to train AI models.", open: true },
  { q: "Can I use Cerise Scholar for meta-analysis?", a: "Yes. Each project has a meta-analysis workspace for importing datasets (including ICPSR), coding variables, and running analyses." },
];

/* -------- Page -------- */
export default function DesignPreviewHomepage() {
  const fontClasses = [
    dmSerif.variable, dmSans.variable, schoolbell.variable,
    playfair.variable, notoSans.variable, roboto.variable,
    poppins.variable, bebas.variable, fredoka.variable,
  ].join(" ");

  return (
    <div
      className={`${fontClasses} min-h-screen`}
      style={{ background: palette.cream, color: palette.ink }}
    >
      {/* Override globals.css h1/h2/h3 rule */}
      <style>{`
        .dph h1, .dph h2, .dph h3 { font-family: inherit !important; }
      `}</style>

      <div className="dph">

      {/* ═══════ NAVBAR — fixed pill ═══════ */}
      <nav
        style={{
          position: "fixed",
          top: "38px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "1100px",
          height: "48px",
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          background: "#ffffff",
          borderRadius: "100px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          zIndex: 100,
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            fontSize: "15px", fontWeight: 400, color: palette.ink,
            textDecoration: "none", whiteSpace: "nowrap",
          }}
        >
          Cerise Scholar
        </Link>
        <div
          style={{
            display: "flex", gap: "20px", alignItems: "center",
            fontFamily: "var(--font-noto), 'Noto Sans', sans-serif",
            fontSize: "11px", color: palette.ink,
          }}
        >
          <div className="group" style={{ position: "relative" }}>
            <span className="hover:opacity-70 cursor-pointer" style={{ color: palette.ink, textDecoration: "none" }}>About</span>
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200" style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: "8px", background: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", padding: "8px", minWidth: "120px", zIndex: 200 }}>
              <Link href="/about/features" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: palette.ink, textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>Features</Link>
              <Link href="/about/mission" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: palette.ink, textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>Mission</Link>
            </div>
          </div>
          <Link href="/research-guidance" className="hover:opacity-70" style={{ color: palette.ink, textDecoration: "none" }}>Guidance</Link>
          <Link href="/projects-preview" className="hover:opacity-70" style={{ color: palette.ink, textDecoration: "none" }}>Projects</Link>
          <Link href="#" className="hover:opacity-70" style={{ color: palette.ink, textDecoration: "none" }}>Course</Link>
          <Link href="#" className="hover:opacity-70" style={{ color: palette.ink, textDecoration: "none" }}>Cerise Space</Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/login" className="hover:opacity-70" style={{ fontFamily: "var(--font-noto), 'Noto Sans', sans-serif", fontSize: "11px", color: palette.ink, textDecoration: "none" }}>
            Log In
          </Link>
          <Link
            href="/signup"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "6px 16px",
              fontFamily: "var(--font-noto), 'Noto Sans', sans-serif",
              fontSize: "11px", fontWeight: 600,
              background: palette.ink, color: "#fff",
              borderRadius: "100px", textDecoration: "none",
            }}
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* ═══════ SECTION 1 — HERO ═══════ */}
      <section style={{ position: "relative", width: "100%", minHeight: V(900), overflow: "visible", paddingTop: "min(50px, 3.4vw)" }}>

        {/* ── Bulb — absolute, z-index:1, spans into section 2 ── */}
        <img
          src="/assets/characters/bulb_nobg.png"
          alt="Cerise Scholar bulb"
          className="pointer-events-none select-none"
          style={{
            position: "absolute",
            left: V(620), top: "min(20px, 1.4vw)",
            width: V(850),
            height: "auto",
            zIndex: 101,
            pointerEvents: "none",
          }}
        />

        {/* ── Hero text group with soft background blob ── */}
        <div
          style={{
            position: "absolute",
            left: V(95), top: V(300),
            width: V(700),
            zIndex: 2,
            textAlign: "center",
            background: "radial-gradient(ellipse at center, rgba(252,250,247,0.95) 0%, rgba(252,250,247,0.6) 55%, transparent 75%)",
            borderRadius: "50%",
            padding: `${V(50)} ${V(40)} ${V(45)}`,
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
              fontWeight: 400, letterSpacing: V(-1.5), color: "#1a1208",
              lineHeight: 1.0, margin: 0,
            }}
          >
            <span style={{ fontSize: V(64), display: "block" }}>Your AI</span>
            <span style={{ fontSize: V(64) }}><span style={{ fontStyle: "italic", color: palette.cerise }}>Scholar</span> Friend</span>
          </h1>

          <p
            style={{
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              fontWeight: 400,
              fontSize: V(16), color: "#4a3f35",
              lineHeight: 1.55,
              maxWidth: V(700),
              margin: `${V(34)} auto 0`,
            }}
          >
            From brainstorming your question to writing your paper — every step of the research process, connected in one warm workflow.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: V(16), marginTop: "max(32px, 3.5vw)" }}>
            <Link
              href="/signup"
              className="transition-all hover:opacity-90"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: V(10),
                width: V(180), height: V(50),
                fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                fontWeight: 700, fontSize: V(11),
                background: "#1a1208", color: "#fff",
                borderRadius: "100px",
                textDecoration: "none",
              }}
            >
              Begin Research <span style={{ fontSize: V(16) }}>→</span>
            </Link>
            <a
              href="#pipeline"
              className="transition-colors hover:bg-[#f5f0e8]"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: V(180), height: V(50),
                fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                fontWeight: 700, fontSize: V(11),
                background: "transparent", color: "#1a1208",
                border: "1px solid #cac0b8",
                borderRadius: "100px",
                textDecoration: "none",
              }}
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 2 — ABOUT ═══════ */}
      <section style={{ position: "relative", overflow: "visible", minHeight: V(680) }}>

        {/* ── About Card ── */}
        <div
          style={{
            position: "relative",
            marginLeft: "15vw", marginTop: V(105),
            width: "min(570px, 40vw)", height: "min(660px, 47vw)",
            background: "#fff",
            border: `1.5px solid ${palette.cardBorder}`,
            borderRadius: "4px",
            display: "flex", flexDirection: "column",
            alignItems: "center", textAlign: "center",
            padding: `${V(55)} ${V(40)} ${V(40)}`,
            zIndex: 2,
          }}
        >
          <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(9), letterSpacing: "0.25em", textTransform: "uppercase", color: "#6a5a4a", fontWeight: 500, textAlign: "center" }}>
            About
          </div>
          <div style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", fontWeight: 400, fontSize: V(26), lineHeight: 1.15, color: palette.ink, marginTop: V(16), letterSpacing: "-0.5px", textAlign: "center" }}>
            CERISE<br />SCHOLAR.
          </div>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(10), color: "#6a5a4a", fontStyle: "italic", marginTop: V(12), textAlign: "center" }}>
            - Cause of Life -
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(10), color: palette.ink, lineHeight: 1.5, marginTop: V(8), textAlign: "center" }}>
            ♦イパーフェ.<br />UI設計。
          </p>
          <div style={{ width: V(200), height: "1px", background: palette.cardBorder, marginTop: V(16) }} />
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(9), lineHeight: 1.7, color: "#6a5a4a", maxWidth: V(360), marginTop: V(16), textAlign: "center" }}>
            This a company in minterence are use on idot out! and exact award ans ceree aift, we are are wires of fall. Set, wee need a mary in the is it.
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(9), color: "#6a5a4a", fontWeight: 600, letterSpacing: "0.05em", marginTop: V(12), textAlign: "center" }}>
            Rev. 4 - 4.1.1.<br />and molve are same arrived,<br />most eciribed still for them.
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(10), color: "#6a5a4a", fontWeight: 700, marginTop: V(10), letterSpacing: "0.06em", textAlign: "center" }}>
            - ROAD CREST SHAPE -
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(9), color: "#6a5a4a", marginTop: V(6), textAlign: "center" }}>
            機関販 官主担備納
          </p>
          <div style={{ flex: 1 }} />
          <Link href="/about" style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(11), fontWeight: 500, color: palette.cerise, textDecoration: "none", textAlign: "center" }} className="hover:underline">
            Main...
          </Link>
        </div>

        {/* ── "Our world is growing." ── */}
        <p
          style={{
            position: "absolute",
            left: V(620), top: V(350),
            width: V(900),
            textAlign: "center",
            fontFamily: "var(--font-schoolbell), 'Schoolbell', cursive",
            fontSize: "max(17px, 1.3vw)", color: "#7a6a5a",
            fontWeight: 400, margin: 0, zIndex: 2,
          }}
        >
          Our world is growing.
        </p>

        {/* ── "We are having dreams" ── */}
        <p
          style={{
            position: "absolute",
            left: V(620), top: V(390),
            width: V(900),
            textAlign: "center",
            fontFamily: "var(--font-schoolbell), 'Schoolbell', cursive",
            fontSize: "max(31px, 2.4vw)", color: "#1a1208",
            fontWeight: 400, lineHeight: 1.2, margin: 0, zIndex: 2,
          }}
        >
          We are having dreams
        </p>
      </section>

      {/* ═══════ SECTION 3 — PIPELINE (interactive cart) ═══════ */}
      <PipelineCart stages={stages} />

      {/* ═══════ SECTION 4 — SEE IT IN ACTION (interactive carousel) ═══════ */}
      <LiveDemo />

      {/* ═══════ SECTION 5 — WHY CERISE SCHOLAR ═══════ */}
      <section style={{ borderTop: `1px solid ${palette.rule}` }}>
        <div style={{ maxWidth: V(1120), margin: "0 auto", padding: `${V(80)} ${V(170)}` }}>
          <p style={{ fontFamily: "var(--font-roboto)", fontSize: V(14.9), fontWeight: 700, color: palette.cerise, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
            WHY CERISE SCHOLAR
          </p>
          <h2 style={{ fontFamily: "var(--font-roboto)", fontSize: V(27.4), fontWeight: 700, color: palette.ink, margin: `${V(8)} 0 0`, lineHeight: 1.15 }}>
            Built differently, for researchers
          </h2>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(13.7), color: palette.inkMuted, marginTop: V(16) }}>
            Not just another note-taking app. Cerise Scholar is designed around how academic research actually works.
          </p>

          {/* Shape-shifting feature cards */}
          <ShiftingGrid pillars={pillars} />
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section style={{ borderTop: `1px solid ${palette.rule}`, background: "#fdfcfa" }}>
        <div style={{ maxWidth: V(800), margin: "0 auto", padding: `${V(80)} ${V(40)}` }}>
          <p style={{ fontFamily: "var(--font-roboto)", fontSize: V(14.9), fontWeight: 700, color: palette.cerise, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
            FAQ
          </p>
          <h2 style={{ fontFamily: "var(--font-roboto)", fontSize: V(27.4), fontWeight: 700, color: palette.ink, margin: `${V(8)} 0 ${V(40)}`, lineHeight: 1.15 }}>
            Common questions
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: V(12) }}>
            {faqs.map((item) => (
              <details key={item.q} open={item.open} className="group" style={{ background: "#fff", border: `1.5px solid ${palette.rule}`, borderRadius: V(12), padding: `${V(14)} ${V(18)}` }}>
                <summary className="flex justify-between items-center cursor-pointer list-none" style={{ fontFamily: "var(--font-noto)", fontSize: V(12), fontWeight: 600, color: palette.ink }}>
                  <span>{item.q}</span>
                  <span className="text-xl leading-none transition-transform group-open:rotate-45 ml-4" style={{ color: palette.cerise }}>+</span>
                </summary>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(11), color: palette.inkMuted, lineHeight: 1.6, marginTop: V(12) }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER (CTA + links combined) ═══════ */}
      <footer style={{ background: "#f5f2ec" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 48px 0" }}>

          {/* ── CTA banner card ── */}
          <div style={{
            background: "#fff", borderRadius: "20px", padding: "48px 56px",
            position: "relative", zIndex: 2,
            boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "40px",
          }}>
            {/* Left: text + button */}
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "var(--font-noto)", fontSize: "11px", color: "#8a7a6a", marginBottom: "8px" }}>Join Cerise Scholar</p>
              <h2 style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", fontSize: "28px", fontWeight: 400, color: palette.ink, margin: "0 0 12px", lineHeight: 1.2 }}>
                Start your research <span style={{ fontStyle: "italic" }}>journey today</span>
              </h2>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: "#8a7a6a", lineHeight: 1.6, maxWidth: "360px", marginBottom: "20px" }}>
                Free to use with no credit card required. Built for researchers who want a warmer, smarter workflow.
              </p>
              <Link href="/signup" style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "14px 28px", borderRadius: "100px",
                background: palette.ink, color: "#fff",
                fontFamily: "var(--font-fredoka)", fontSize: "13px", fontWeight: 600,
                textDecoration: "none",
              }}>
                Get started free ↗
              </Link>
            </div>

            {/* Right: orbital hedgehog illustration — animated */}
            <style>{`
              @media (prefers-reduced-motion: no-preference) {
                @keyframes orbitCW  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes orbitCCW { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
                .orb-inner  { animation: orbitCW  30s linear infinite; will-change: transform; }
                .orb-middle { animation: orbitCCW 50s linear infinite; will-change: transform; }
                .orb-outer  { animation: orbitCW  75s linear infinite; will-change: transform; }
                .ct-inner  { animation: orbitCCW 30s linear infinite; }
                .ct-middle { animation: orbitCW  50s linear infinite; }
                .ct-outer  { animation: orbitCCW 75s linear infinite; }
              }
            `}</style>
            <div style={{ width: "280px", height: "260px", position: "relative", flexShrink: 0, overflow: "visible" }}>
              {/* Orbital ring guides (static) */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "220px", height: "220px", borderRadius: "50%", border: "1px solid rgba(224,216,208,0.4)" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "150px", height: "150px", borderRadius: "50%", border: "1px solid rgba(224,216,208,0.35)" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "80px", height: "80px", borderRadius: "50%", border: "1px solid rgba(224,216,208,0.3)" }} />

              {/* Center: bulb icon (static) */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "56px", height: "56px", borderRadius: "50%", background: "transparent", border: "1.5px solid rgba(224,216,208,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                <span style={{ fontSize: "22px" }}>💡</span>
              </div>

              {/* ── OUTER RING (r=110px) — 75s CW — hedgehog06 + hedgehog05 ── */}
              <div className="orb-outer" style={{ position: "absolute", top: "50%", left: "50%", width: 0, height: 0 }}>
                <div style={{ position: "absolute", transform: "rotate(-45deg) translateX(110px) translateY(-17px)" }}>
                  <div className="ct-outer" style={{ width: "34px", height: "34px" }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "50%", aspectRatio: "1 / 1", overflow: "hidden", background: "#fff", border: "2px solid #e0d8d0", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(45deg)" }}>
                      <img src={HEDGEHOG.hedgehog06Clasped} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                  </div>
                </div>
                <div style={{ position: "absolute", transform: "rotate(135deg) translateX(110px) translateY(-15px)" }}>
                  <div className="ct-outer" style={{ width: "30px", height: "30px" }}>
                    <div style={{ width: "30px", height: "30px", borderRadius: "50%", aspectRatio: "1 / 1", overflow: "hidden", background: "#fff", border: "2px solid #e0d8d0", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-135deg)" }}>
                      <img src={HEDGEHOG.hedgehog05Laptop} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── MIDDLE RING (r=75px) — 50s CCW — hedgehog04 + hedgehog02 ── */}
              <div className="orb-middle" style={{ position: "absolute", top: "50%", left: "50%", width: 0, height: 0 }}>
                <div style={{ position: "absolute", transform: "rotate(210deg) translateX(75px) translateY(-14px)" }}>
                  <div className="ct-middle" style={{ width: "28px", height: "28px" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", aspectRatio: "1 / 1", overflow: "hidden", background: "#fff", border: "2px solid #e0d8d0", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-210deg)" }}>
                      <img src={HEDGEHOG.hedgehog04RedPen} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                  </div>
                </div>
                <div style={{ position: "absolute", transform: "rotate(30deg) translateX(75px) translateY(-13px)" }}>
                  <div className="ct-middle" style={{ width: "26px", height: "26px" }}>
                    <div style={{ width: "26px", height: "26px", borderRadius: "50%", aspectRatio: "1 / 1", overflow: "hidden", background: "#fff", border: "2px solid #e0d8d0", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-30deg)" }}>
                      <img src={HEDGEHOG.hedgehog02Writing} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── INNER RING (r=40px) — 30s CW — hedgehog11 (blue) + hedgehog10 (orange) ── */}
              <div className="orb-inner" style={{ position: "absolute", top: "50%", left: "50%", width: 0, height: 0 }}>
                <div style={{ position: "absolute", transform: "rotate(180deg) translateX(40px) translateY(-15px)" }}>
                  <div className="ct-inner" style={{ width: "30px", height: "30px" }}>
                    <div style={{ width: "30px", height: "30px", borderRadius: "50%", aspectRatio: "1 / 1", overflow: "hidden", background: "#dbeafe", border: "2px solid #60a5fa", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-180deg)" }}>
                      <img src={HEDGEHOG.hedgehog11LitBook} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                  </div>
                </div>
                <div style={{ position: "absolute", transform: "rotate(0deg) translateX(40px) translateY(-18px)" }}>
                  <div className="ct-inner" style={{ width: "36px", height: "36px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", aspectRatio: "1 / 1", overflow: "hidden", background: "#fef3c7", border: "2px solid #f0b945", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(0deg)" }}>
                      <img src={HEDGEHOG.hedgehog10Magnifier} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer links grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1.5fr", gap: "40px", padding: "48px 0" }}>
            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <img src={HEDGEHOG.hedgehog03Standing} alt="" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "15px", color: palette.ink }}>Cerise Scholar</span>
              </div>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: "#8a7a6a", lineHeight: 1.6, maxWidth: "220px" }}>
                The research companion for reading, highlighting, reviewing, and writing — built warmly, freely, and for you.
              </p>
            </div>

            {/* Product */}
            <div>
              <p style={{ fontFamily: "var(--font-noto)", fontSize: "11px", fontWeight: 700, color: palette.ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>Product</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontFamily: "var(--font-dm-sans)", fontSize: "12px" }}>
                <Link href="/scholar-ask-preview" style={{ color: "#8a7a6a", textDecoration: "none" }} className="hover:opacity-70">ScholarAsk</Link>
                <Link href="/workspace-preview" style={{ color: "#8a7a6a", textDecoration: "none" }} className="hover:opacity-70">Workspace</Link>
                <Link href="/lit-review-preview" style={{ color: "#8a7a6a", textDecoration: "none" }} className="hover:opacity-70">Literature Review</Link>
                <Link href="/meta-analysis-preview" style={{ color: "#8a7a6a", textDecoration: "none" }} className="hover:opacity-70">Meta-Analysis</Link>
                <Link href="/paper-writer-preview" style={{ color: "#8a7a6a", textDecoration: "none" }} className="hover:opacity-70">Paper Writer</Link>
              </div>
            </div>

            {/* Company */}
            <div>
              <p style={{ fontFamily: "var(--font-noto)", fontSize: "11px", fontWeight: 700, color: palette.ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>Company</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontFamily: "var(--font-dm-sans)", fontSize: "12px" }}>
                <Link href="/about" style={{ color: "#8a7a6a", textDecoration: "none" }} className="hover:opacity-70">About</Link>
                <Link href="/research-guidance" style={{ color: "#8a7a6a", textDecoration: "none" }} className="hover:opacity-70">Research Guide</Link>
                <Link href="/projects-preview" style={{ color: "#8a7a6a", textDecoration: "none" }} className="hover:opacity-70">Projects</Link>
                <a href="https://github.com/linhvotueduong/CeriseScholar" target="_blank" style={{ color: "#8a7a6a", textDecoration: "none" }} className="hover:opacity-70">GitHub ↗</a>
              </div>
            </div>

            {/* Newsletter */}
            <div>
              <p style={{ fontFamily: "var(--font-noto)", fontSize: "11px", fontWeight: 700, color: palette.ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>Newsletter</p>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: "#8a7a6a", lineHeight: 1.6, marginBottom: "14px" }}>
                Receive product updates, research tips, and early access.
              </p>
              <div style={{ display: "flex", gap: "6px" }}>
                <input type="email" placeholder="Enter your email..." style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #d4cdc5", borderRadius: "100px", fontSize: "12px", fontFamily: "var(--font-dm-sans)", color: palette.ink, outline: "none", background: "#fff" }} />
                <button style={{ width: "40px", height: "40px", borderRadius: "50%", background: palette.ink, color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "16px", flexShrink: 0 }}>→</button>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: "1px solid #e0d8d0", paddingTop: "20px", paddingBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: "#a09080" }}>
              © 2025 Cerise Scholar · All rights reserved · Made with Cerise Scholar
            </span>
            <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: "#a09080" }}>
              Built for researchers
            </span>
          </div>
        </div>
      </footer>

      </div>
    </div>
  );
}
