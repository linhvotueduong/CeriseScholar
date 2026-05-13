import type { Metadata } from "next";
import Link from "next/link";
import {
  DM_Serif_Display,
  DM_Sans,
  Playfair_Display,
  Noto_Sans,
  Fredoka,
} from "next/font/google";
import HEDGEHOG from "@/lib/hedgehog";
import StepFolders from "../../components/StepFolders";

export const metadata: Metadata = {
  title: "Research Guidance — Cerise Scholar",
  description: "Step-by-step guide for new researchers: from brainstorming a topic to writing your final paper. Free academic research guidance.",
};

const dmSerif = DM_Serif_Display({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-dm-serif", display: "swap" });
const dmSans = DM_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const playfair = Playfair_Display({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const notoSans = Noto_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-noto", display: "swap" });
const fredoka = Fredoka({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-fredoka", display: "swap" });

const palette = {
  bg: "#fefefe",
  surface: "#faf7f0",
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  cerise: "#c0392b",
  rule: "#e0d8d0",
  cardBorder: "#d4cdc5",
  gold: "#d4a843",
};

const steps = [
  {
    number: 1,
    title: "Brainstorm Your Research Topic",
    description: "Every great research paper starts with a question. Think about what fascinates you, what problems you see in the world, or what gaps exist in current knowledge.",
    tasks: [
      "Identify a broad area of interest (e.g., student mental health, technology impact, geopolitical effects)",
      "Narrow it down to a specific question (e.g., 'How does geopolitical uncertainty affect student career planning?')",
      "Write a preliminary hypothesis — what do you think the answer is?",
      "Identify your Independent Variable (what causes the effect) and Dependent Variable (what you're measuring)",
    ],
    tips: [
      "Your topic should be specific enough to research but broad enough to find sources",
      "Check if there's enough existing literature — you need sources to build on",
      "Make sure your hypothesis is testable — can you measure the variables?",
    ],
    ceriseTool: null,
    links: [] as { label: string; href: string }[],
  },
  {
    number: 2,
    title: "Find & Read Your Sources",
    description: "Now you need to build a foundation of knowledge. Search for existing research papers, read them, and collect the important information.",
    tasks: [
      "Use ScholarAsk to search for papers related to your topic",
      "Download relevant PDFs from search results or databases like ICPSR, Google Scholar, JSTOR",
      "Create a project in the Workspace for your research",
      "Upload your PDFs to the project",
      "Read each PDF carefully — highlight key passages relevant to your research question",
      "Add notes explaining WHY each highlight matters to your research",
      "Assign each highlight to a section using the Code System (Introduction, Literature Review, Methodology, etc.)",
    ],
    tips: [
      "Start with review papers or meta-analyses — they summarize many studies at once",
      "Look at the references in papers you find — they often lead to more relevant sources",
      "Aim for at least 15-30 sources for a strong literature review",
      "Highlight both findings that SUPPORT and CONTRADICT your hypothesis",
    ],
    ceriseTool: "ScholarAsk → Workspace (PDF viewer with highlighting, notes, and Code System)",
    links: [
      { label: "Open Workspace", href: "/dashboard" },
      { label: "What is ScholarAsk?", href: "/about" },
    ],
  },
  {
    number: 3,
    title: "Analyze Your Data",
    description: "If your research involves quantitative data (surveys, experiments, datasets), use the Meta-Analysis tools to test your hypothesis statistically.",
    tasks: [
      "Go to the Meta-Analysis page in your project",
      "Start with the Methodology Guide — enter your research question and hypothesis",
      "Follow the guide's data source suggestions to find the right ICPSR dataset",
      "Download the SPSS format from ICPSR and upload the .sav file",
      "Use the Analyze Data tab: run descriptive statistics, correlations, or t-tests",
      "For meta-analysis: enter effect sizes from published studies in the Effect Size Calculator",
      "Review the forest plot and heterogeneity statistics",
    ],
    tips: [
      "Let the Methodology Guide recommend which statistical tests to use — don't guess",
      "Always report effect sizes (Cohen's d, Hedges' g), not just p-values",
      "If I² is high (>75%), your studies have very different results — investigate why",
      "Include confidence intervals in your results — they're more informative than p-values alone",
    ],
    ceriseTool: "Meta-Analysis (Methodology Guide → Data Upload → Analyze Data → Effect Sizes → Forest Plot)",
    links: [
      { label: "Open Workspace", href: "/dashboard" },
      { label: "ICPSR Data", href: "https://www.icpsr.umich.edu/" },
    ],
  },
  {
    number: 4,
    title: "Build Your Literature Review",
    description: "This is where everything comes together. Your highlights and notes from Step 2 have automatically populated the Literature Review Table.",
    tasks: [
      "Open the Literature Review Table for your project",
      "Filter by Section/Code to see all highlights for each part of your paper",
      "Review the 'Quotes from Sources' column — these are your evidence",
      "Review the 'My Insights / Notes' column — these are your analysis",
      "Write the 'Synthesis Paragraph' column — connect multiple sources into one argument",
      "Look for patterns: do multiple sources agree? disagree? complement each other?",
      "Export the table as CSV to use as an outline for your paper",
    ],
    tips: [
      "A synthesis paragraph should combine 2-4 sources around one theme",
      "Use phrases like 'Similarly, [Author] found...' or 'In contrast, [Author] argued...'",
      "Filter by section to write one part of your paper at a time",
      "Your synthesis paragraphs become the first draft of your literature review",
    ],
    ceriseTool: "Literature Review Table (filter by section → write synthesis paragraphs → export CSV)",
    links: [{ label: "Open Workspace", href: "/dashboard" }],
  },
  {
    number: 5,
    title: "Write Your Research Paper",
    description: "With your literature review synthesized and your data analyzed, you now have all the building blocks to write your complete research paper.",
    tasks: [
      "Use your synthesis paragraphs from the Lit Review Table as the foundation for your Literature Review section",
      "Copy the auto-generated methodology write-up from Meta-Analysis as a starting point",
      "Report your statistical results with effect sizes, confidence intervals, and visualizations",
      "Write your Introduction using the highlights you tagged with the 'Introduction' code",
      "Write your Discussion by interpreting your results in context of the literature",
      "Write your Abstract last — summarize the entire paper in 150-300 words",
      "Build your References list from the APA Reference column in the Lit Review Table",
    ],
    tips: [
      "Follow: Abstract → Introduction → Literature Review → Methodology → Results → Discussion → Conclusion → References",
      "Each section should flow logically into the next",
      "Your Introduction should end with your research question and hypothesis",
      "Always cite your sources — use the APA references from your Lit Review Table",
    ],
    ceriseTool: "All tools combined: Workspace highlights → Lit Review synthesis → Meta-Analysis results → Final paper",
    links: [{ label: "Open Workspace", href: "/dashboard" }],
  },
];

export default function ResearchGuidancePage() {
  const fontClasses = [dmSerif.variable, dmSans.variable, playfair.variable, notoSans.variable, fredoka.variable].join(" ");

  return (
    <div className={`${fontClasses} min-h-screen`} style={{ background: palette.bg, color: palette.ink }}>

      {/* ── Navbar ── */}
      <div style={{ padding: "12px 24px 0", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HEDGEHOG.hedgehog09Notepad} alt="" className="pointer-events-none hidden lg:block" style={{ position: "absolute", left: "calc(50% - 550px - 60px)", top: "8px", height: "52px", width: "auto", objectFit: "contain", zIndex: 10 }} />
        <nav style={{ maxWidth: "1100px", margin: "0 auto", height: "48px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", background: "#ffffff", borderRadius: "100px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <Link href="/" style={{ fontFamily: "var(--font-playfair)", fontSize: "15px", color: palette.ink, textDecoration: "none" }}>Cerise Scholar</Link>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", fontFamily: "var(--font-noto)", fontSize: "11px" }}>
            <Link href="/" className="hover:opacity-70" style={{ color: palette.ink, textDecoration: "none" }}>Home</Link>
            <div className="group" style={{ position: "relative" }}><span className="hover:opacity-70 cursor-pointer" style={{ color: palette.ink }}>About</span><div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200" style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: "8px", background: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", padding: "8px", minWidth: "120px", zIndex: 200 }}><Link href="/about/features" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: palette.ink, textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>Features</Link><Link href="/about/mission" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: palette.ink, textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>Mission</Link></div></div>
            <Link href="/research-guidance" style={{ color: palette.cerise, textDecoration: "none", fontWeight: 600 }}>Research Guide</Link>
            <Link href="/projects-preview" className="hover:opacity-70" style={{ color: palette.ink, textDecoration: "none" }}>Projects</Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link href="/login" className="hover:opacity-70" style={{ fontFamily: "var(--font-noto)", fontSize: "11px", color: palette.ink, textDecoration: "none" }}>Log In</Link>
            <Link href="/signup" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 16px", fontFamily: "var(--font-noto)", fontSize: "11px", fontWeight: 600, background: palette.ink, color: "#fff", borderRadius: "100px", textDecoration: "none" }}>Sign Up Free</Link>
          </div>
        </nav>
      </div>

      {/* ── Hero ── */}
      <section style={{ paddingTop: "48px", paddingBottom: "60px", maxWidth: "900px", margin: "0 auto", textAlign: "center", padding: "48px 32px 60px" }}>
        <h1 style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", fontSize: "48px", fontWeight: 400, color: palette.ink, lineHeight: 1.1, margin: 0 }}>
          From blank page to <span style={{ fontStyle: "italic" }}>finished paper</span>
        </h1>
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "16px", color: palette.inkMuted, marginTop: "20px", maxWidth: "600px", marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          New to research? Follow this step-by-step guide to go from brainstorming a topic to writing your complete research paper using Cerise Scholar.
        </p>
      </section>

      {/* ── Steps — Stacked File Folders ── */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "0 32px 80px" }}>
        <StepFolders steps={steps} hedgehog={HEDGEHOG} />

        {/* ── CTA ── */}
        <div
          style={{
            marginTop: "64px",
            background: palette.surface,
            border: `1.5px solid ${palette.cardBorder}`,
            borderRadius: "16px",
            padding: "60px 40px",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", fontSize: "32px", fontWeight: 400, color: palette.ink, margin: 0 }}>
            Ready to start your <span style={{ fontStyle: "italic" }}>research?</span>
          </h2>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: palette.inkMuted, marginTop: "12px" }}>
            Create a free account and follow the steps above.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "28px", alignItems: "center" }}>
            <Link
              href="/projects-preview"
              className="transition-colors hover:bg-[#1a1208] hover:text-white"
              style={{
                padding: "14px 36px", borderRadius: "50px",
                border: "2px solid #37312d", background: "transparent",
                fontFamily: "var(--font-fredoka)", fontSize: "13px", fontWeight: 600,
                color: palette.ink, textDecoration: "none",
              }}
            >
              Go to Workspace
            </Link>
            <span style={{ fontFamily: "var(--font-fredoka)", fontSize: "12px", fontWeight: 500, color: palette.ink }}>OR</span>
            <Link
              href="/signup"
              className="transition-colors hover:bg-[#1a1208] hover:text-white"
              style={{
                padding: "14px 36px", borderRadius: "50px",
                border: "2px solid #37312d", background: "transparent",
                fontFamily: "var(--font-fredoka)", fontSize: "13px", fontWeight: 600,
                color: palette.ink, textDecoration: "none",
              }}
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "#f5f2ec", borderTop: "1px solid #e0d8d0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 48px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1.5fr", gap: "40px", marginBottom: "32px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={HEDGEHOG.hedgehog03Standing} alt="" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "15px", color: palette.ink }}>Cerise Scholar</span>
              </div>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: "#8a7a6a", lineHeight: 1.6, maxWidth: "220px" }}>The research companion for reading, highlighting, reviewing, and writing.</p>
            </div>
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
            <div>
              <p style={{ fontFamily: "var(--font-noto)", fontSize: "11px", fontWeight: 700, color: palette.ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>Company</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontFamily: "var(--font-dm-sans)", fontSize: "12px" }}>
                <Link href="/about" style={{ color: "#8a7a6a", textDecoration: "none" }} className="hover:opacity-70">About</Link>
                <Link href="/research-guidance" style={{ color: "#8a7a6a", textDecoration: "none" }} className="hover:opacity-70">Research Guide</Link>
                <Link href="/projects-preview" style={{ color: "#8a7a6a", textDecoration: "none" }} className="hover:opacity-70">Projects</Link>
                <a href="https://github.com/linhvotueduong/CeriseScholar" target="_blank" style={{ color: "#8a7a6a", textDecoration: "none" }} className="hover:opacity-70">GitHub ↗</a>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-noto)", fontSize: "11px", fontWeight: 700, color: palette.ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>Newsletter</p>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: "#8a7a6a", lineHeight: 1.6, marginBottom: "14px" }}>Receive product updates, research tips, and early access.</p>
              <div style={{ display: "flex", gap: "6px" }}>
                <input type="email" placeholder="Enter your email..." style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #d4cdc5", borderRadius: "100px", fontSize: "12px", fontFamily: "var(--font-dm-sans)", color: palette.ink, outline: "none", background: "#fff" }} />
                <button style={{ width: "40px", height: "40px", borderRadius: "50%", background: palette.ink, color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "16px", flexShrink: 0 }}>→</button>
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #e0d8d0", paddingTop: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: "#a09080" }}>© 2025 Cerise Scholar · All rights reserved</span>
            <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: "#a09080" }}>Built for researchers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
