export interface PaperSection {
  id: string;
  user_id: string;
  project_id: string;
  section_key: string;
  content: string;
  updated_at: string;
}

export const PAPER_SECTIONS = [
  "abstract",
  "introduction",
  "literature_review",
  "methodology",
  "results",
  "discussion",
  "conclusion",
  "references",
] as const;

export type PaperSectionKey = (typeof PAPER_SECTIONS)[number];

export const SECTION_LABELS: Record<PaperSectionKey, string> = {
  abstract: "Abstract",
  introduction: "Introduction",
  literature_review: "Literature Review",
  methodology: "Methodology",
  results: "Results",
  discussion: "Discussion",
  conclusion: "Conclusion",
  references: "References",
};

export const SECTION_GUIDANCE: Record<PaperSectionKey, { description: string; tips: string[] }> = {
  abstract: {
    description:
      "A concise summary of your entire paper (150-300 words). Write this LAST, after all other sections are complete.",
    tips: [
      "State the research problem and your hypothesis in 1-2 sentences",
      "Briefly describe your methodology (what data, what tests)",
      "Summarize your key findings with specific numbers (effect sizes, p-values)",
      "End with the main implication or conclusion",
      "Do NOT include citations in the abstract",
    ],
  },
  introduction: {
    description:
      "Sets the stage for your research. Introduce the topic, explain why it matters, and end with your research question and hypothesis.",
    tips: [
      "Start broad (the general topic area) and narrow down to your specific question",
      "Use your highlights tagged with the 'Introduction' code as building blocks",
      "Explain the GAP in existing research that your study addresses",
      "End the introduction with your specific research question and hypothesis",
      "Example: 'This study examines whether [IV] affects [DV] among [population].'",
    ],
  },
  literature_review: {
    description:
      "Synthesize existing research on your topic. This is NOT a list of summaries - it's an argument built from multiple sources.",
    tips: [
      "Use the 'Sync Materials' button below to import your synthesis paragraphs from the Lit Review Table",
      "Organize by THEME, not by source (don't write one paragraph per paper)",
      "Each paragraph should combine 2-4 sources around one idea",
      "Use transition phrases: 'Similarly...', 'In contrast...', 'Building on this...'",
      "End by identifying the gap your study fills",
      "Every claim must have a citation — use your APA references",
    ],
  },
  methodology: {
    description:
      "Explain exactly HOW you conducted your research so someone could replicate it.",
    tips: [
      "If you used the Meta-Analysis tools, copy your auto-generated methodology write-up as a starting point",
      "Include: research design, participants/data source, variables, instruments/measures, procedure, analysis method",
      "Name the specific statistical tests you used (e.g., independent samples t-test, Pearson correlation)",
      "Describe your dataset: where it came from (e.g., ICPSR), sample size, time period",
      "Explain how you operationalized (measured) each variable",
    ],
  },
  results: {
    description:
      "Present your findings objectively, without interpretation. Report the numbers.",
    tips: [
      "Report descriptive statistics first (means, standard deviations, sample sizes)",
      "Then report inferential statistics (t-values, p-values, effect sizes, confidence intervals)",
      "Use exact format: t(df) = X.XX, p = .XXX, d = X.XX",
      "State whether each hypothesis was supported or not supported",
      "Reference your tables and figures if you have them",
      "Do NOT explain WHY the results occurred — save that for Discussion",
    ],
  },
  discussion: {
    description:
      "Interpret your results in the context of existing research. What do your findings mean?",
    tips: [
      "Start by restating your main finding in plain language",
      "Compare your results to the studies in your literature review — do they agree or disagree?",
      "Explain possible reasons for your findings",
      "Acknowledge limitations (sample size, data source, methodology constraints)",
      "Suggest directions for future research",
      "Discuss practical implications — why does this matter in the real world?",
    ],
  },
  conclusion: {
    description:
      "A brief final section that wraps up your paper. Restate the key takeaway.",
    tips: [
      "Summarize your main finding in 2-3 sentences",
      "Restate the significance — why should readers care?",
      "End with a forward-looking statement about the field or a call to action",
      "Keep it short — typically 1-2 paragraphs",
      "Do NOT introduce new information or citations here",
    ],
  },
  references: {
    description:
      "A complete list of every source you cited in the paper, formatted in APA 7th edition style.",
    tips: [
      "Use the 'Sync Materials' button to import APA references from your Lit Review Table",
      "Every in-text citation must have a matching reference, and vice versa",
      "APA format: Author, A. A. (Year). Title of article. Journal Name, Volume(Issue), pages. DOI",
      "List references in alphabetical order by first author's last name",
      "Use hanging indent format (first line flush left, subsequent lines indented)",
    ],
  },
};
