import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — Cerise Scholar",
  description: "Learn about Cerise Scholar, a free research tool for PDF reading, highlighting, literature reviews, and AI-powered academic search.",
  openGraph: {
    title: "About — Cerise Scholar",
    description: "A free research tool for PDF reading, highlighting, literature reviews, and AI-powered academic search.",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-[#DE3163]">Cerise Scholar</Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-[#DE3163] font-medium">Workspace</Link>
            <Link href="/" className="text-sm text-gray-600 hover:text-[#DE3163] font-medium">Home</Link>
            <Link href="/about" className="text-sm text-[#DE3163] font-medium">About</Link>
            <Link href="/research-guidance" className="text-sm text-gray-600 hover:text-[#DE3163] font-medium">Research Guidance</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm text-gray-600 hover:text-[#DE3163]">Log In</Link>
          <Link href="/signup" className="px-4 py-2 text-sm bg-[#DE3163] text-white rounded-lg hover:bg-[#c4294f]">Sign Up Free</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">About Cerise Scholar</h1>

        <div className="space-y-6 text-gray-600 leading-relaxed">
          <p className="text-lg">
            Cerise Scholar is a research tool designed to streamline the academic literature review process. Built for researchers, by a researcher.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">What is Cerise Scholar?</h2>
          <p>
            Cerise Scholar combines PDF reading, annotation, and literature review synthesis into one seamless workspace. Instead of juggling multiple tools, you can read your sources, highlight key passages, take notes, and organize everything into a structured literature review table — all in one place.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Key Features</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Multi-Project Workspace</strong> — Organize your research into separate projects, each with its own PDFs, highlights, and literature review.</li>
            <li><strong>PDF Viewer</strong> — Upload, read, and annotate PDFs directly in your browser with full-page scrolling and zoom.</li>
            <li><strong>Smart Highlighting</strong> — Select text, choose a color, assign it to a section of your paper, and add notes — all in one step.</li>
            <li><strong>Code System</strong> — Tag your highlights with paper sections (Abstract, Introduction, Methodology, etc.) inspired by MAXQDA.</li>
            <li><strong>Synthesized Literature Review Table</strong> — Every highlight automatically populates a structured table with document name, APA reference, section, quotes, notes, and synthesis columns.</li>
            <li><strong>Meta-Analysis Tools</strong> — Upload datasets from ICPSR, run statistical analyses, calculate effect sizes, and generate forest plots.</li>
            <li><strong>Methodology Guide</strong> — A step-by-step assistant that helps you define your hypothesis, find the right data, choose statistical tests, and draft your methodology section.</li>
            <li><strong>Text-to-Speech</strong> — Listen to your PDFs read aloud using your browser&apos;s built-in voices.</li>
            <li><strong>CSV Export</strong> — Export your literature review table for use in spreadsheets or reference managers.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Who is it for?</h2>
          <p>
            Cerise Scholar is built for academic researchers, graduate students, and anyone conducting literature reviews or meta-analyses. Whether you&apos;re writing a thesis, dissertation, or research paper, Cerise Scholar helps you stay organized and efficient.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Open Source</h2>
          <p>
            Cerise Scholar is open source and free to use. View the code on{" "}
            <a href="https://github.com/linhvotueduong/CeriseScholar" target="_blank" className="text-[#DE3163] hover:underline">
              GitHub
            </a>.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link href="/signup" className="px-6 py-3 bg-[#DE3163] text-white font-medium rounded-lg hover:bg-[#c4294f] transition-colors">
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  );
}
