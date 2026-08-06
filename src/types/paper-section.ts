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

export const PROPOSAL_SECTIONS = [
  "proposal_background",
  "proposal_problem_statement",
  "proposal_literature_review",
  "proposal_current_study",
  "proposal_method_materials",
  "proposal_references",
] as const;

export type PaperSectionKey =
  | (typeof PAPER_SECTIONS)[number]
  | (typeof PROPOSAL_SECTIONS)[number];

export const SECTION_LABELS: Record<PaperSectionKey, string> = {
  abstract: "Abstract",
  introduction: "Introduction",
  literature_review: "Literature Review",
  methodology: "Methodology",
  results: "Results",
  discussion: "Discussion",
  conclusion: "Conclusion",
  references: "References",
  proposal_background: "Background",
  proposal_problem_statement: "Statement of the Problem",
  proposal_literature_review: "Literature Review",
  proposal_current_study: "Current Study",
  proposal_method_materials: "Method and Materials",
  proposal_references: "References",
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
  proposal_background: {
    description:
      "Establish the theoretical or conceptual background readers need before encountering the research problem.",
    tips: [
      "Introduce the field and the context that frames the proposed study",
      "Define the key concepts, terms, and boundaries used throughout the proposal",
      "Use key references to support the background rather than relying on general claims",
      "Move from broad context toward the specific problem the study addresses",
    ],
  },
  proposal_problem_statement: {
    description:
      "State the unresolved problem, show the evidence for the gap, and explain why addressing it matters.",
    tips: [
      "Name the specific unresolved problem in clear, researchable language",
      "Support the need and significance with evidence from the literature review",
      "Describe the consequences of leaving the gap unresolved",
      "Avoid proposing the solution before the problem and gap are firmly established",
    ],
  },
  proposal_literature_review: {
    description:
      "Synthesize the key literature into an evidence-backed argument that establishes what is known and what remains missing.",
    tips: [
      "Organize the review by themes and debates rather than one source at a time",
      "Compare agreements, disagreements, methods, and limitations across studies",
      "Use Sync Materials to bring in synthesis paragraphs from the Lit Review tool",
      "End with the research gap that leads directly to the proposed current study",
    ],
  },
  proposal_current_study: {
    description:
      "Present the purpose, research questions, proposed contribution, and alignment of the current study.",
    tips: [
      "State exactly what the current study will investigate and contribute",
      "List each research question consistently with the Stage 2 RQ Roadmaps",
      "Connect every question to the problem and the gap established in the literature",
      "Keep proposed claims appropriately limited before data collection begins",
    ],
  },
  proposal_method_materials: {
    description:
      "Describe the proposed research design, materials or data sources, participants, procedure, and analysis direction.",
    tips: [
      "Name the research design and explain why it can answer the research questions",
      "Describe participants, materials, datasets, instruments, or other evidence sources",
      "Outline the procedure and the analysis planned for each research question",
      "Identify access, feasibility, ethical, consent, privacy, and material constraints",
    ],
  },
  proposal_references: {
    description:
      "List every source cited in the research proposal using a consistent reference style.",
    tips: [
      "Use Sync Materials to import APA references from the Lit Review tool",
      "Ensure every in-text citation has a matching reference entry",
      "Remove duplicate references and order the list alphabetically",
      "Check DOI links, author names, publication years, and titles before submission",
    ],
  },
};
