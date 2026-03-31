import Link from "next/link";

const steps = [
  {
    number: 1,
    title: "Brainstorm Your Research Topic",
    color: "#EF4444",
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
  },
  {
    number: 2,
    title: "Find & Read Your Sources",
    color: "#F97316",
    description: "Now you need to build a foundation of knowledge. Search for existing research papers related to your topic, read them, and collect the important information.",
    tasks: [
      "Use ScholarAsk to search for papers related to your topic",
      "Download relevant PDFs from the search results or from databases like ICPSR, Google Scholar, JSTOR",
      "Create a project in the Workspace for your research",
      "Upload your PDFs to the project",
      "Read each PDF carefully — highlight key passages that are relevant to your research question",
      "Add notes explaining WHY each highlight matters to your research",
      "Assign each highlight to a section of your paper using the Code System (Introduction, Literature Review, Methodology, etc.)",
    ],
    tips: [
      "Start with review papers or meta-analyses — they summarize many studies at once",
      "Look at the references in papers you find — they often lead to more relevant sources",
      "Aim for at least 15-30 sources for a strong literature review",
      "Highlight both findings that SUPPORT and CONTRADICT your hypothesis",
      "Your notes should explain the significance, not just summarize — ask 'So what?'",
    ],
    ceriseTool: "ScholarAsk → Workspace (PDF viewer with highlighting, notes, and Code System)",
  },
  {
    number: 3,
    title: "Analyze Your Data",
    color: "#22C55E",
    description: "If your research involves quantitative data (surveys, experiments, datasets), use the Meta-Analysis tools to test your hypothesis statistically.",
    tasks: [
      "Go to the Meta-Analysis page in your project",
      "Start with the Methodology Guide — enter your research question and hypothesis",
      "Follow the guide's data source suggestions to find the right ICPSR dataset",
      "Download the SPSS format from ICPSR and upload the .sav file",
      "Use the Analyze Data tab: run descriptive statistics, correlations, or t-tests",
      "For meta-analysis: enter effect sizes from published studies in the Effect Size Calculator",
      "Review the forest plot and heterogeneity statistics",
      "Save the auto-generated methodology write-up as a starting point",
    ],
    tips: [
      "Let the Methodology Guide recommend which statistical tests to use — don't guess",
      "Always report effect sizes (Cohen's d, Hedges' g), not just p-values",
      "If I² is high (>75%), your studies have very different results — investigate why",
      "Check your data's normality before choosing parametric vs non-parametric tests",
      "Include confidence intervals in your results — they're more informative than p-values alone",
    ],
    ceriseTool: "Meta-Analysis (Methodology Guide → Data Upload → Analyze Data → Effect Sizes → Forest Plot)",
  },
  {
    number: 4,
    title: "Build Your Literature Review",
    color: "#3B82F6",
    description: "This is where everything comes together. Your highlights and notes from Step 2 have automatically populated the Literature Review Table. Now synthesize them into coherent arguments.",
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
      "A synthesis paragraph should combine 2-4 sources around one theme — don't just summarize one paper per paragraph",
      "Use phrases like 'Similarly, [Author] found...' or 'In contrast, [Author] argued...' to connect sources",
      "The APA Reference column saves you time when building your reference list",
      "Filter by section to write one part of your paper at a time",
      "Your synthesis paragraphs become the first draft of your literature review",
    ],
    ceriseTool: "Literature Review Table (filter by section → write synthesis paragraphs → export CSV)",
  },
  {
    number: 5,
    title: "Write Your Research Paper",
    color: "#8B5CF6",
    description: "With your literature review synthesized and your data analyzed, you now have all the building blocks to write your complete research paper.",
    tasks: [
      "Use your synthesis paragraphs from the Lit Review Table as the foundation for your Literature Review section",
      "Copy the auto-generated methodology write-up from the Meta-Analysis page as a starting point for your Methodology section",
      "Report your statistical results with effect sizes, confidence intervals, and visualizations",
      "Write your Introduction using the highlights you tagged with the 'Introduction' code",
      "Write your Discussion by interpreting your results in context of the literature you reviewed",
      "Write your Abstract last — summarize the entire paper in 150-300 words",
      "Build your References list from the APA Reference column in the Lit Review Table",
    ],
    tips: [
      "Follow this structure: Abstract → Introduction → Literature Review → Methodology → Results → Discussion → Conclusion → References",
      "Each section should flow logically into the next",
      "Your Introduction should end with your research question and hypothesis",
      "Your Discussion should address whether your hypothesis was supported or not",
      "Always cite your sources — use the APA references from your Lit Review Table",
      "Have someone else read your paper before submitting — fresh eyes catch mistakes",
    ],
    ceriseTool: "All tools combined: Workspace highlights → Lit Review synthesis → Meta-Analysis results → Final paper",
  },
];

export default function ResearchGuidancePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-[#DE3163]">Cerise Scholar</Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-[#DE3163] font-medium">Workspace</Link>
            <Link href="/" className="text-sm text-gray-600 hover:text-[#DE3163] font-medium">Home</Link>
            <Link href="/about" className="text-sm text-gray-600 hover:text-[#DE3163] font-medium">About</Link>
            <Link href="/research-guidance" className="text-sm text-[#DE3163] font-medium">Research Guidance</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm text-gray-600 hover:text-[#DE3163]">Log In</Link>
          <Link href="/signup" className="px-4 py-2 text-sm bg-[#DE3163] text-white rounded-lg hover:bg-[#c4294f]">Sign Up Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-12 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Research Guidance
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          New to research? Follow this step-by-step guide to go from a blank page to a complete research paper using Cerise Scholar.
        </p>
      </section>

      {/* Steps */}
      <section className="px-6 pb-20 max-w-4xl mx-auto">
        <div className="space-y-12">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              {/* Step number + title */}
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                  style={{ backgroundColor: step.color }}
                >
                  {step.number}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{step.title}</h2>
                  <p className="text-gray-500 mt-1">{step.description}</p>
                </div>
              </div>

              <div className="ml-16 space-y-4">
                {/* Cerise Scholar tool */}
                {step.ceriseTool && (
                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                    <p className="text-sm text-[#DE3163] font-medium">
                      Cerise Scholar tool: {step.ceriseTool}
                    </p>
                  </div>
                )}

                {/* Tasks checklist */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">What to do:</h3>
                  <ul className="space-y-2">
                    {step.tasks.map((task, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-gray-300 mt-0.5 shrink-0">&#9634;</span>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tips */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <h3 className="font-semibold text-amber-800 mb-3">Tips:</h3>
                  <ul className="space-y-2">
                    {step.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                        <span className="mt-0.5 shrink-0">&#128161;</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-[#DE3163] rounded-xl p-10">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to start your research?</h2>
          <p className="text-pink-100 mb-6">Create a free account and follow the steps above.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard" className="px-6 py-3 bg-white text-[#DE3163] font-medium rounded-lg hover:bg-pink-50 transition-colors">
              Go to Workspace
            </Link>
            <Link href="/signup" className="px-6 py-3 border border-white text-white font-medium rounded-lg hover:bg-[#c4294f] transition-colors">
              Sign Up Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
