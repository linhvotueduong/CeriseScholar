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
import PublicMarketingNavbar from "@/components/layout/PublicMarketingNavbar";
import PublicMarketingFooter from "@/components/layout/PublicMarketingFooter";
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
  {
    q: "I'm not sure what my research question is yet. Is that okay?",
    a: "Yes. Start with a rough idea, a class topic, or one paper you are curious about, and Cerise helps turn it into a clearer research path.",
    open: true,
  },
  {
    q: "Where should I start?",
    a: "ScholarAsk is usually a gentle first step: it helps you explore a topic, find source-backed directions, and see what to read next.",
  },
  {
    q: "Do I have to follow one exact workflow?",
    a: "No. Read the Guidance, then choose the Pipeline Cart steps that fit your project instead of moving through every tool in order.",
  },
  {
    q: "What happens after I find sources?",
    a: "Cerise helps reading become highlights, notes, literature review tables, synthesis patterns, and writing support that stays connected to your sources.",
  },
  {
    q: "What does Meta-Analysis help with?",
    a: "It helps you look across studies, notice patterns in methods and findings, and decide what the evidence can safely support.",
  },
  {
    q: "Is Cerise an essay generator?",
    a: "No. Cerise is here to support your thinking before and during writing, with sources, notes, analysis, and structure close by.",
  },
  {
    q: "Where do my private files and chats stay?",
    a: "You stay in control. Cerise Scholar handles project materials through its hosted workspace, and you decide what to upload or include in AI prompts.",
  },
  {
    q: "Do I need to install anything?",
    a: "No desktop helper is required. AI is included by default, and you can connect your own OpenRouter key in Settings > AI.",
  },
  {
    q: "Can I use it on mobile?",
    a: "Yes, for lighter review, notes, and account access. The full research workflow is still best on the laptop where your files live.",
  },
  {
    q: "Can I try it for free?",
    a: "Yes. Cerise Scholar is free during public beta, with no credit card needed.",
  },
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
      <PublicMarketingNavbar fixed />

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
        <div
          className="grid gap-12 md:grid-cols-[0.85fr_1.15fr] md:items-start"
          style={{ maxWidth: V(1040), margin: "0 auto", padding: `${V(86)} ${V(52)}` }}
        >
          <div>
            <p style={{ fontFamily: "var(--font-roboto)", fontSize: V(14.9), fontWeight: 700, color: palette.cerise, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
              FAQ
            </p>
            <h2 style={{ fontFamily: "var(--font-roboto)", fontSize: V(34), fontWeight: 700, color: palette.ink, margin: `${V(10)} 0 ${V(20)}`, lineHeight: 1.08 }}>
              Any questions?
              <br />
              We got you.
            </h2>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(12.5), color: palette.inkMuted, lineHeight: 1.7, maxWidth: V(320), margin: 0 }}>
              You do not need a perfect research plan to begin. Cerise helps you start with what you have, then organize the path as your project becomes clearer.
            </p>
            <Link href="/help" className="inline-flex items-center gap-2 no-underline hover:opacity-70" style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(12), fontWeight: 700, color: palette.cerise, marginTop: V(28) }}>
              More FAQs <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div style={{ borderTop: `1.5px solid ${palette.rule}` }}>
            {faqs.map((item) => (
              <details key={item.q} open={item.open} className="group" style={{ borderBottom: `1.5px solid ${palette.rule}`, padding: `${V(16)} 0` }}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6" style={{ fontFamily: "var(--font-noto)", fontSize: V(12), fontWeight: 700, color: palette.ink }}>
                  <span>{item.q}</span>
                  <span className="leading-none transition-transform group-open:rotate-45" style={{ color: palette.ink, fontSize: V(14) }}>+</span>
                </summary>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: V(11.2), color: palette.inkMuted, lineHeight: 1.65, margin: `${V(10)} ${V(34)} 0 0` }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <PublicMarketingFooter />

      </div>
    </div>
  );
}
