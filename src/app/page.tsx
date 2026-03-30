import Link from "next/link";

const features = [
  {
    title: "PDF Viewer",
    description:
      "Upload and read your research PDFs directly in the browser with smooth page navigation and zoom.",
    icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z",
  },
  {
    title: "Smart Highlighting",
    description:
      "Select and highlight key passages with a single click. Add notes and comments to any highlight.",
    icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
  },
  {
    title: "Literature Review Table",
    description:
      "Every highlight auto-populates a structured table with source, author, year, theme, and your notes.",
    icon: "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  },
  {
    title: "OCR Processing",
    description:
      "Scanned PDFs are automatically OCR'd so you can select, highlight, and search text in any document.",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    title: "Text-to-Speech",
    description:
      "Listen to your PDFs read aloud. Choose from multiple voices and adjust speed to your preference.",
    icon: "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z",
  },
  {
    title: "CSV Export",
    description:
      "Export your entire literature review as a CSV file, ready for spreadsheets or reference managers.",
    icon: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-xl font-bold text-[#DE3163]">Cerise Scholar</span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm text-gray-600 hover:text-[#DE3163] transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-sm bg-[#DE3163] text-white rounded-lg hover:bg-[#c4294f] transition-colors"
          >
            Sign Up Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-24 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
          Read. Highlight.{" "}
          <span className="text-[#DE3163]">Review.</span>
        </h1>
        <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          The research tool that turns your PDF reading into a structured
          literature review. Highlight a passage and it instantly becomes a
          searchable, exportable source in your review table.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-3 bg-[#DE3163] text-white font-medium rounded-lg hover:bg-[#c4294f] transition-colors text-lg"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:border-[#DE3163] hover:text-[#DE3163] transition-colors text-lg"
          >
            Log In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Everything you need for research
          </h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            From reading to reviewing, Cerise Scholar streamlines your entire
            literature review workflow.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-[#DE3163] hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-[#DE3163]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={feature.icon}
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          How it works
        </h2>
        <div className="space-y-8">
          {[
            {
              step: "1",
              title: "Upload your PDF",
              desc: "Drag and drop any research paper, article, or document. Scanned PDFs get OCR'd automatically.",
            },
            {
              step: "2",
              title: "Read and highlight",
              desc: "Read your document in the browser. Toggle highlight mode and select the passages that matter.",
            },
            {
              step: "3",
              title: "Review and export",
              desc: "Your highlights instantly appear in a structured table. Add authors, themes, and notes. Export as CSV.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-[#DE3163] text-white flex items-center justify-center font-bold text-lg shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  {item.title}
                </h3>
                <p className="text-gray-500 mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 bg-[#DE3163]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Start your literature review today
          </h2>
          <p className="text-pink-100 mb-8">
            Free to use. No credit card required.
          </p>
          <Link
            href="/signup"
            className="px-8 py-3 bg-white text-[#DE3163] font-medium rounded-lg hover:bg-pink-50 transition-colors text-lg inline-block"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Cerise Scholar &mdash; Built for researchers
          </span>
          <div className="flex gap-4 text-sm text-gray-400">
            <Link href="/login" className="hover:text-[#DE3163]">
              Log In
            </Link>
            <Link href="/signup" className="hover:text-[#DE3163]">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
