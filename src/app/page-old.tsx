import Link from "next/link";

const stages = [
  { title: "Sources finding",          desc: "Upload PDFs or search ScholarAsk to collect the papers that anchor your review." },
  { title: "Knowledge transformation", desc: "Highlight passages and turn raw reading into structured, reusable notes." },
  { title: "Synthesis perspective",    desc: "See every highlight side-by-side in a literature review table you control." },
  { title: "Meta-analysis",            desc: "Pull in datasets, run comparisons, and quantify findings across sources." },
  { title: "Paper writer",             desc: "Draft your paper section-by-section with your notes and citations already in place." },
];

const features = [
  { title: "PDF viewer",               desc: "Upload and read research PDFs in the browser with OCR for scanned documents." },
  { title: "Smart highlighting",       desc: "Select a section, assign a code, and add notes. Every highlight is saved with context." },
  { title: "Literature review table",  desc: "Highlights auto-populate a structured table with source, author, year, theme, and notes." },
  { title: "ScholarAsk AI",            desc: "Ask research questions and get professor-level answers with OpenAlex citations." },
  { title: "Text-to-speech",           desc: "Listen to PDFs with AI voices. Hover any paragraph for instant playback." },
  { title: "Paper writer",             desc: "Write section by section, with auto-imported highlights and writing guidance." },
];

const pillars = [
  { title: "End-to-end workflow",  desc: "From sources through paper drafting — every step in one place." },
  { title: "Auto-populated",       desc: "Highlights move directly into your review table. No copy-paste." },
  { title: "Free, no limits",      desc: "No paywalls, no usage caps. Sign up and start today." },
  { title: "Cites real sources",   desc: "ScholarAsk pulls from OpenAlex — no hallucinated citations." },
];

const faqs = [
  { q: "Is Cerise Scholar free to use?", a: "Yes. Every feature is free with no credit card required." },
  { q: "What file types can I upload?", a: "PDFs are fully supported, including scanned PDFs (automatic OCR)." },
  { q: "How does the literature review table work?", a: "Every highlight becomes a structured row with source, author, year, section, theme, and your notes. Edit any cell and export as CSV." },
  { q: "Where does ScholarAsk get its papers from?", a: "ScholarAsk uses OpenAlex, an open catalog of academic papers. Every answer is grounded in real references." },
  { q: "Is my research data private?", a: "Yes. PDFs, highlights, and notes are scoped to your account with row-level security. Never shared, never used to train AI models.", open: true },
  { q: "Can I use Cerise Scholar for meta-analysis?", a: "Yes. Each project has a meta-analysis workspace for importing datasets (including ICPSR), coding variables, and running analyses." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Top utility bar */}
      <div className="w-full bg-paper-soft border-b border-rule text-center text-xs py-2 text-ink-faint">
        All research workflows, in one place.
      </div>

      {/* Navigation */}
      <nav className="max-w-6xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center px-6 py-4">
        <Link href="/" className="font-display text-xl font-bold text-secondary tracking-tight">
          Cerise Scholar
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-ink justify-self-center">
          <Link href="/about" className="hover:text-secondary transition-colors">About</Link>
          <Link href="/research-guidance" className="hover:text-secondary transition-colors">Research guide</Link>
          <Link href="/dashboard" className="hover:text-secondary transition-colors">Projects</Link>
        </div>
        <div className="flex items-center gap-3 justify-self-end">
          <Link href="/login" className="text-sm text-ink-muted hover:text-ink transition-colors">Log in</Link>
          <Link href="/signup" className="px-4 py-2 text-sm bg-primary text-paper rounded-[4px] hover:bg-black transition-colors">
            Sign up free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-20 text-center">
        <h1 className="font-display text-5xl md:text-6xl font-semibold tracking-tight text-ink leading-[1.05]">
          Read. Highlight. <span className="text-secondary">Review.</span>
        </h1>
        <p className="mt-6 text-base text-ink-muted max-w-xl mx-auto leading-relaxed">
          The research tool that turns your PDF reading into a structured literature review. Highlight a passage and it instantly becomes a searchable, exportable source.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link href="/signup" className="px-5 py-2.5 bg-primary text-paper text-sm font-medium rounded-[4px] hover:bg-black transition-colors">
            Get started free
          </Link>
          <Link href="#how" className="px-5 py-2.5 border border-edge text-ink text-sm font-medium rounded-[4px] hover:border-ink transition-colors">
            See how it works
          </Link>
        </div>
        <div className="mt-8 flex gap-6 justify-center text-xs text-ink-faint">
          <span>Free to use</span>
          <span>·</span>
          <span>No credit card required</span>
          <span>·</span>
          <span>Built for researchers</span>
        </div>
      </section>

      {/* From question to paper */}
      <section className="border-t border-rule">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-ink-faint mb-2">From question to paper</p>
          <p className="text-ink-muted text-sm mb-10 max-w-xl">
            Five stages, one continuous workflow. Each tool hands off to the next.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stages.map((s, i) => (
              <div key={s.title} className="bg-paper-soft border border-rule rounded-[8px] p-4 hover:border-edge transition-colors">
                <div className="font-mono text-xs text-secondary mb-2">0{i + 1}</div>
                <div className="font-display text-sm font-semibold text-ink mb-2">{s.title}</div>
                <div className="text-xs text-ink-muted leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* See it in action */}
      <section id="how" className="border-t border-rule">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-ink-faint mb-2">See it in action</p>
          <p className="text-ink-muted text-sm mb-8 max-w-xl">
            Read, highlight, and annotate — all in one place. Highlights auto-populate your literature review table instantly.
          </p>
          <div className="bg-paper border border-edge rounded-[12px] p-4 md:p-6 shadow-[0_6px_16px_rgba(17,24,39,0.06)]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              <span className="ml-3 text-xs font-mono text-ink-faint">cerisescholar.app/projects/literature-review</span>
            </div>
            <div className="grid md:grid-cols-[200px_1fr] gap-4">
              <div className="bg-paper-soft border border-rule rounded-[8px] p-3 text-xs text-ink-muted">
                <div className="text-[10px] font-mono uppercase tracking-wider text-ink-faint mb-2">Documents</div>
                <div className="space-y-2">
                  <div className="text-ink">Smith et al. 2023</div>
                  <div>Johnson 2022</div>
                  <div>Lee &amp; Park 2024</div>
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-ink-faint mt-5 mb-2">AI tools</div>
                <div>ScholarAsk</div>
                <div>Text-to-speech</div>
              </div>
              <div className="bg-paper-soft border border-rule rounded-[8px] p-4">
                <div className="flex gap-4 text-xs border-b border-rule pb-2 mb-3">
                  <span className="text-secondary border-b-2 border-secondary pb-2 -mb-[9px]">Highlights</span>
                  <span className="text-ink-faint">Notes</span>
                  <span className="text-ink-faint">Read aloud</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="bg-secondary-soft border-l-2 border-secondary rounded-[4px] px-3 py-2 text-ink">
                    Highlights added to literature review table automatically
                  </div>
                  <div className="h-2 bg-rule rounded-full w-11/12" />
                  <div className="h-2 bg-rule rounded-full w-10/12" />
                  <div className="h-2 bg-rule rounded-full w-9/12" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-rule">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-display text-2xl font-semibold text-ink mb-2">Everything you need for research</h2>
          <p className="text-ink-muted text-sm mb-10 max-w-xl">
            From reading to writing, every tool is purpose-built for academic workflows.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-paper-soft border border-rule rounded-[8px] p-5 hover:border-edge transition-colors">
                <div className="w-8 h-8 rounded-[8px] bg-secondary-soft mb-3" />
                <div className="font-display text-sm font-semibold text-ink mb-2">{f.title}</div>
                <div className="text-xs text-ink-muted leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built differently */}
      <section className="border-t border-rule">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-display text-2xl font-semibold text-ink mb-2">Built differently, for researchers</h2>
          <p className="text-ink-muted text-sm mb-10 max-w-xl">
            Not another note-taking app. Cerise Scholar is designed around how academic research actually works.
          </p>
          <div className="grid md:grid-cols-4 gap-4">
            {pillars.map((p) => (
              <div key={p.title} className="bg-paper-soft border border-rule rounded-[8px] p-5">
                <div className="w-7 h-7 rounded-[8px] bg-secondary-soft mb-3" />
                <div className="font-display text-sm font-semibold text-ink mb-2">{p.title}</div>
                <div className="text-xs text-ink-muted leading-relaxed">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-rule">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-ink-faint mb-2">FAQ</p>
          <h2 className="font-display text-2xl font-semibold text-ink mb-2">Common questions</h2>
          <p className="text-ink-muted text-sm mb-10">Everything you need to know before getting started.</p>
          <div>
            {faqs.map((item) => (
              <details key={item.q} open={item.open} className="group border-b border-rule py-4">
                <summary className="flex justify-between items-center cursor-pointer list-none text-sm text-ink hover:text-primary">
                  <span>{item.q}</span>
                  <span className="text-ink-faint group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                </summary>
                <p className="mt-3 text-sm text-ink-muted leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-rule bg-paper-soft">
        <div className="max-w-xl mx-auto px-6 py-20 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink mb-2">Start your literature review today</h2>
          <p className="text-ink-muted text-sm mb-6">Free to use. No credit card required. Built for researchers.</p>
          <Link href="/signup" className="inline-block px-6 py-2.5 bg-primary text-paper text-sm font-medium rounded-[4px] hover:bg-black transition-colors">
            Create free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-rule">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-ink-faint">
            <span>Cerise Scholar — built for researchers</span>
          </div>
          <div className="flex gap-5 text-xs text-ink-faint">
            <Link href="/login" className="hover:text-ink">Log in</Link>
            <Link href="/signup" className="hover:text-ink">Sign up</Link>
            <Link href="/about" className="hover:text-ink">About</Link>
            <Link href="/research-guidance" className="hover:text-ink">Research guide</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
