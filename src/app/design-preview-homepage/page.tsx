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
} from "@/lib/localFonts";
import HEDGEHOG from "@/lib/hedgehog";

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
          top: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "1100px",
          height: V(53),
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
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
            fontSize: V(14.9), fontWeight: 400, color: palette.ink,
            textDecoration: "none", whiteSpace: "nowrap",
          }}
        >
          Cerise Scholar
        </Link>
        <div
          style={{
            display: "flex", gap: V(24), alignItems: "center",
            fontFamily: "var(--font-noto), 'Noto Sans', sans-serif",
            fontSize: V(9.3), color: palette.ink,
          }}
        >
          <div className="group" style={{ position: "relative" }}><span className="hover:opacity-70 cursor-pointer" style={{ color: palette.ink }}>About</span><div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200" style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: "8px", background: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", padding: "8px", minWidth: "170px", zIndex: 200 }}><Link href="/about/features" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: palette.ink, textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>Features</Link><Link href="/about/mission" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: palette.ink, textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>Mission</Link><Link href="/about/privacy-security" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: palette.ink, textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>Privacy & Security</Link></div></div>
          <Link href="/research-guidance" className="hover:opacity-70" style={{ color: palette.ink, textDecoration: "none" }}>Guidance</Link>
          <Link href="/projects-preview" className="hover:opacity-70" style={{ color: palette.ink, textDecoration: "none" }}>Projects</Link>
          <Link href="#" className="hover:opacity-70" style={{ color: palette.ink, textDecoration: "none" }}>Course</Link>
          <Link href="#" className="hover:opacity-70" style={{ color: palette.ink, textDecoration: "none" }}>Cerise Space</Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/login" className="hover:opacity-70" style={{ fontFamily: "var(--font-noto), 'Noto Sans', sans-serif", fontSize: V(9.3), color: palette.ink, textDecoration: "none" }}>
            Log In
          </Link>
          <Link
            href="/signup"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: `${V(6)} ${V(16)}`,
              fontFamily: "var(--font-noto), 'Noto Sans', sans-serif",
              fontSize: V(9.3), fontWeight: 600,
              background: palette.ink, color: "#fff",
              borderRadius: "100px", textDecoration: "none",
            }}
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* ═══════ SECTION 1 — HERO ═══════ */}
      <section style={{ position: "relative", width: "100%", minHeight: V(900), overflow: "visible", paddingTop: V(90) }}>

        {/* ── Bulb — absolute, z-index:1, spans into section 2 ── */}
        <img
          src="/assets/characters/bulb_nobg.png"
          alt="Cerise Scholar bulb"
          className="pointer-events-none select-none"
          style={{
            position: "absolute",
            left: V(586), top: V(0),
            width: V(1089),
            height: "auto",
            zIndex: 1,
          }}
        />

        {/* ── Hero text group — matches Canva: X=169 Y=433 W=476.5 H=183.5 ── */}
        <div
          style={{
            position: "absolute",
            left: V(169), top: V(433),
            width: V(476.5),
            zIndex: 2,
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
              fontWeight: 400, fontSize: V(48),
              letterSpacing: "-1px", color: "#1a1208", lineHeight: 1.1,
              margin: 0, whiteSpace: "nowrap",
            }}
          >
            AI SCHOLAR FRIEND
          </h1>

          <p
            style={{
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              fontStyle: "italic", fontWeight: 400,
              fontSize: V(14), color: palette.inkMuted,
              marginTop: V(10),
              textAlign: "center",
            }}
          >
            -All research process in one sit-
          </p>

          <div style={{ display: "flex", justifyContent: "center", marginTop: V(16) }}>
            <Link
              href="/signup"
              className="hover:bg-[#1a1208] hover:text-white transition-colors"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: V(197), height: V(60),
                fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                fontWeight: 600, fontSize: V(11),
                background: "transparent", color: "#1a1208",
                border: "2px dashed #1a1208", borderRadius: "100px",
                textDecoration: "none",
              }}
            >
              Begin Research
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 2 — ABOUT ═══════ */}
      <section style={{ position: "relative", overflow: "visible", minHeight: V(620) }}>

        {/* ── About Card ── */}
        <div
          style={{
            position: "relative",
            marginLeft: "10vw", marginTop: V(139),
            width: "min(536px, 38vw)", height: "min(583px, 42vw)",
            background: "#fff",
            border: `1.5px solid ${palette.cardBorder}`,
            borderRadius: "4px",
            display: "flex", flexDirection: "column",
            alignItems: "center", textAlign: "center",
            padding: `${V(40)} ${V(40)}`,
            zIndex: 2,
          }}
        >
          <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(8), letterSpacing: "0.25em", textTransform: "uppercase", color: "#6a5a4a", fontWeight: 500 }}>
            About
          </div>
          <div style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", fontWeight: 400, fontSize: V(24), lineHeight: 1.15, color: palette.ink, marginTop: V(16), letterSpacing: "-0.5px" }}>
            CERISE<br />SCHOLAR.
          </div>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(9), color: "#6a5a4a", fontStyle: "italic", marginTop: V(12) }}>
            - Cause of Life -
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(9), color: palette.ink, lineHeight: 1.5, marginTop: V(8) }}>
            ♦イパーフェ.<br />UI設計。
          </p>
          <div style={{ width: V(200), height: "1px", background: palette.cardBorder, marginTop: V(16) }} />
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(8.5), lineHeight: 1.7, color: "#6a5a4a", maxWidth: V(320), marginTop: V(16) }}>
            This a company in minterence are use on idot out! and exact award ans ceree aift, we are are wires of fall. Set, wee need a mary in the is it.
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(8), color: "#6a5a4a", fontWeight: 600, letterSpacing: "0.05em", marginTop: V(12) }}>
            Rev. 4 - 4.1.1.<br />and molve are same arrived,<br />most eciribed still for them.
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(9), color: "#6a5a4a", fontWeight: 700, marginTop: V(10), letterSpacing: "0.06em" }}>
            - ROAD CREST SHAPE -
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(8), color: "#6a5a4a", marginTop: V(6) }}>
            機関販 官主担備納
          </p>
          <div style={{ flex: 1 }} />
          <Link href="/about" style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(10), fontWeight: 500, color: palette.cerise, textDecoration: "none" }} className="hover:underline">
            Main...
          </Link>
        </div>

        {/* ── "Our world is growing." ── */}
        <p
          style={{
            position: "absolute",
            left: V(960), top: V(300),
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
            left: V(910), top: V(340),
            width: V(441),
            fontFamily: "var(--font-schoolbell), 'Schoolbell', cursive",
            fontSize: "max(31px, 2.4vw)", color: "#1a1208",
            fontWeight: 400, lineHeight: 1.2, margin: 0, zIndex: 2,
          }}
        >
          We are having dreams
        </p>
      </section>

      {/* ═══════ SECTION 3 — PIPELINE ═══════ */}
      <section style={{ background: "#fdfcfa", borderTop: `1px solid ${palette.rule}` }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 32px" }}>

          {/* Eyebrow + heading */}
          <p style={{ fontFamily: "var(--font-roboto), 'Roboto', sans-serif", fontSize: "15px", fontWeight: 700, color: palette.cerise, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
            THE PIPELINE
          </p>
          <h2 style={{ fontFamily: "var(--font-roboto), 'Roboto', sans-serif", fontSize: "27px", fontWeight: 700, color: palette.ink, margin: "8px 0 0", lineHeight: 1.15 }}>
            From question to paper
          </h2>
          <p style={{ fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", fontSize: "14px", color: palette.inkMuted, marginTop: "16px" }}>
            Five stages, one continuous workflow. Customize your research journey by adding your own steps to the cart.
          </p>

          {/* Cards row */}
          <div style={{ display: "flex", gap: "19px", marginTop: "48px", justifyContent: "center", flexWrap: "nowrap" }}>
            {stages.map((s, i) => (
              <div
                key={s.title}
                className="group transition-all duration-200 hover:-translate-y-1"
                style={{
                  width: "206px", minHeight: "367px",
                  background: "#fff",
                  border: `1px solid ${palette.rule}`,
                  borderRadius: "8px",
                  display: "flex", flexDirection: "column",
                  padding: "12px 12px 10px",
                  position: "relative",
                }}
              >
                {/* Step badge */}
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: palette.ink, color: "#fff",
                  fontFamily: "var(--font-noto), 'Noto Sans', sans-serif",
                  fontSize: "9px", fontWeight: 600, letterSpacing: "0.08em",
                  borderRadius: "100px",
                  padding: "4px 10px",
                  alignSelf: "flex-start",
                }}>
                  STEP {i + 1}
                </span>

                {/* Hedgehog */}
                <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                  <img src={s.img} alt={s.alt} style={{ width: "140px", height: "160px", objectFit: "contain" }} />
                </div>

                {/* Title */}
                <div style={{
                  fontFamily: "var(--font-noto), 'Noto Sans', sans-serif",
                  fontWeight: 700, fontSize: "11px", color: palette.ink, lineHeight: 1.35,
                }}>
                  {s.title}
                </div>

                {/* Description */}
                <div style={{
                  fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  fontWeight: 400, fontSize: "8px", color: palette.inkMuted, lineHeight: 1.6,
                  marginTop: "6px", flex: 1,
                }}>
                  {s.desc}
                </div>

                {/* Footer */}
                <div style={{ borderTop: `1px solid ${palette.rule}`, paddingTop: "8px", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--font-noto), 'Noto Sans', sans-serif", fontWeight: 600, fontSize: "10px", color: palette.ink }}>
                    {s.tag}
                  </span>
                  <span style={{
                    width: "24px", height: "24px",
                    borderRadius: "50%", background: palette.ink, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-bebas), 'Bebas Neue', sans-serif",
                    fontSize: "13px", lineHeight: 1,
                  }}>
                    +
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "72px", alignItems: "center" }}>
            <Link
              href="/research-guidance"
              className="transition-colors hover:bg-[#1a1208] hover:text-white"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                padding: "16px 40px",
                border: "2px solid #37312d", borderRadius: "50px",
                fontFamily: "var(--font-fredoka), 'Fredoka', sans-serif",
                fontWeight: 600, fontSize: "12px",
                color: palette.ink, background: "transparent", textDecoration: "none",
                height: "50px",
              }}
            >
              Detailed Guidance
            </Link>
            <span style={{ fontFamily: "var(--font-fredoka), 'Fredoka', sans-serif", fontSize: "12px", fontWeight: 500, color: palette.ink, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 12px" }}>OR</span>
            <Link
              href="/projects-preview"
              className="transition-colors hover:bg-[#1a1208] hover:text-white"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                padding: "16px 40px",
                border: "2px solid #37312d", borderRadius: "50px",
                fontFamily: "var(--font-fredoka), 'Fredoka', sans-serif",
                fontWeight: 600, fontSize: "12px",
                color: palette.ink, background: "transparent", textDecoration: "none",
                height: "50px",
              }}
            >
              Ready Cart
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 4 — SEE IT IN ACTION ═══════ */}
      <section style={{ borderTop: `1px solid ${palette.rule}` }}>
        <div style={{ maxWidth: V(1120), margin: "0 auto", padding: `${V(80)} ${V(170)}` }}>
          <p style={{ fontFamily: "var(--font-roboto)", fontSize: V(14.9), fontWeight: 700, color: palette.cerise, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
            LIVE DEMO
          </p>
          <h2 style={{ fontFamily: "var(--font-roboto)", fontSize: V(27.4), fontWeight: 700, color: palette.ink, margin: `${V(8)} 0 0`, lineHeight: 1.15 }}>
            See it in action
          </h2>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(13.7), color: palette.inkMuted, marginTop: V(16) }}>
            Read, highlight, and annotate — all in one place. Highlights auto-populate your literature review table instantly.
          </p>

          <div style={{
            marginTop: V(40), background: "#fff",
            border: `1.5px solid ${palette.rule}`, borderRadius: V(12),
            padding: V(24), boxShadow: "0 16px 40px rgba(26,18,8,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: V(6), marginBottom: V(16) }}>
              <span style={{ width: V(9), height: V(9), borderRadius: "50%", background: "#FF5F57" }} />
              <span style={{ width: V(9), height: V(9), borderRadius: "50%", background: "#FEBC2E" }} />
              <span style={{ width: V(9), height: V(9), borderRadius: "50%", background: "#28C840" }} />
              <span style={{ marginLeft: V(12), fontFamily: "var(--font-noto)", fontSize: V(9), color: palette.inkMuted }}>
                cerisescholar.app/projects/scholar-ask
              </span>
            </div>
            <div style={{ display: "flex", gap: V(16) }}>
              <div style={{ width: V(160), background: "#f8f5f0", border: `1px solid ${palette.rule}`, borderRadius: V(8), padding: V(12), fontSize: V(8), color: palette.inkMuted }}>
                <div style={{ fontSize: V(7), letterSpacing: "0.15em", textTransform: "uppercase", color: palette.inkMuted, marginBottom: V(8) }}>Documents</div>
                <div style={{ color: palette.ink }}>+ New Research</div>
                <div style={{ marginTop: V(10), fontSize: V(6.5) }}>the relationship between...</div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: V(40) }}>
                <p style={{ fontFamily: "var(--font-dm-serif)", fontSize: V(20), fontWeight: 400, color: palette.ink, textAlign: "center", lineHeight: 1.2 }}>
                  Ask anything.<br /><span style={{ fontWeight: 400 }}>Discover <strong>everything</strong></span>
                </p>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(9), color: palette.inkMuted, marginTop: V(6), textAlign: "center" }}>
                  Powered by OpenAlex and AI synthesis
                </p>
                <div style={{ marginTop: V(20), width: V(300), background: "#f8f5f0", border: `1px solid ${palette.rule}`, borderRadius: V(8), padding: V(12) }}>
                  <div style={{ fontSize: V(8), color: palette.inkMuted }}>What would you like to learn more about?</div>
                  <div style={{ marginTop: V(8), display: "flex", alignItems: "center", gap: V(8) }}>
                    <span style={{ fontSize: V(8), color: palette.ink }}>Deep research</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: V(16), marginTop: V(12), fontSize: V(7), color: palette.inkMuted }}>
                  <span>Explore topics</span>
                  <span>Find experts</span>
                  <span>Literature review</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: V(20), marginTop: V(50) }}>
            {pillars.map((p, i) => {
              const dotColors = ["#E05A6B", "#6B8CC7", "#F0B945", "#E05A6B"];
              return (
                <div
                  key={p.title}
                  style={{
                    background: "#fff", border: `1.5px solid ${palette.rule}`,
                    borderRadius: V(16), padding: `${V(32)} ${V(28)}`,
                    position: "relative",
                  }}
                >
                  <span style={{
                    position: "absolute", top: V(16), right: i % 2 === 0 ? "auto" : V(16), left: i % 2 === 0 ? V(16) : "auto",
                    width: V(14), height: V(14), borderRadius: "50%", background: dotColors[i], opacity: 0.7,
                  }} />
                  <div style={{ fontFamily: "var(--font-noto)", fontSize: V(14), fontWeight: 700, color: palette.ink, textAlign: "center", marginTop: V(20) }}>
                    {p.title}
                  </div>
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(11), color: palette.inkMuted, textAlign: "center", lineHeight: 1.6, marginTop: V(12), maxWidth: V(260), marginLeft: "auto", marginRight: "auto" }}>
                    {p.desc}
                  </p>
                </div>
              );
            })}
          </div>
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

      {/* ═══════ FOOTER CTA ═══════ */}
      <section style={{ borderTop: `1px solid ${palette.rule}`, background: "#faf7f0", color: palette.ink }}>
        <div style={{ maxWidth: V(1120), margin: "0 auto", padding: `${V(80)} ${V(170)}`, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: V(20) }}>
            <img src={HEDGEHOG.hedgehog03Standing} alt="Hedgehog waving" style={{ width: V(100), height: "auto", objectFit: "contain" }} />
          </div>
          <p style={{ fontFamily: "var(--font-roboto)", fontSize: V(14.9), fontWeight: 700, color: "#F0B945", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Cerise Scholar
          </p>
          <h2 style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", fontSize: V(36), fontWeight: 400, marginTop: V(12), lineHeight: 1.1 }}>
            Made Impact By Today
          </h2>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(13), color: "#7a6a5a", marginTop: V(16) }}>
            Free to use. No credit card required. Built for researchers.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: V(12), marginTop: V(32) }}>
            <Link href="/signup" style={{ padding: `${V(14)} ${V(28)}`, borderRadius: "100px", background: "#c0392b", color: "#fff", fontFamily: "var(--font-dm-sans)", fontSize: V(13), fontWeight: 600, textDecoration: "none", border: "2px dashed #F0B945" }}>
              Create free account →
            </Link>
            <Link href="/about" style={{ padding: `${V(14)} ${V(28)}`, borderRadius: "100px", background: "transparent", color: palette.ink, fontFamily: "var(--font-dm-sans)", fontSize: V(13), fontWeight: 600, textDecoration: "none", border: `2px dashed ${palette.ink}` }}>
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer style={{ background: "#faf7f0" }}>
        <div style={{ maxWidth: V(1120), margin: "0 auto", padding: `${V(24)} ${V(170)}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-playfair)", fontSize: V(11), color: "#8a7a6a" }}>Cerise Scholar — built for researchers</span>
          <div style={{ display: "flex", gap: V(20), fontFamily: "var(--font-noto)", fontSize: V(9), color: "#8a7a6a" }}>
            <Link href="/login" style={{ color: palette.inkMuted, textDecoration: "none" }} className="hover:opacity-70">Log in</Link>
            <Link href="/signup" style={{ color: palette.inkMuted, textDecoration: "none" }} className="hover:opacity-70">Sign up</Link>
            <Link href="/about" style={{ color: palette.inkMuted, textDecoration: "none" }} className="hover:opacity-70">About</Link>
            <Link href="/research-guidance" style={{ color: palette.inkMuted, textDecoration: "none" }} className="hover:opacity-70">Research guide</Link>
          </div>
        </div>
      </footer>

      </div>
    </div>
  );
}
