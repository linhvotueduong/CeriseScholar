export const researchDeskProjects = [
  {
    id: "environmental-uncertainty",
    title: "Environmental Uncertainty & Career Procrastination",
    status: "In progress",
    meta: "Updated 2h ago - 312 rows - 26 papers",
    progress: 72,
    tone: "attention" as const,
  },
  {
    id: "ai-disruption",
    title: "AI Disruption & Academic Delay",
    status: "Literature review",
    meta: "Updated 1d ago - 184 rows - 18 papers",
    progress: 41,
    tone: "neutral" as const,
  },
  {
    id: "source-control",
    title: "I/O Psychology DLA Source Control",
    status: "Data extraction",
    meta: "Updated 2d ago - 128 rows - 12 papers",
    progress: 56,
    tone: "success" as const,
  },
  {
    id: "foundations",
    title: "Literature Review Foundations",
    status: "Drafting",
    meta: "Updated 3d ago - 96 rows - 9 papers",
    progress: 68,
    tone: "blue" as const,
  },
];

export const researchDeskSections: Array<
  [label: string, progress: number, tone: "rose" | "blue" | "amber" | "green" | "purple" | "neutral"]
> = [
  ["Meta-analysis", 72, "rose" as const],
  ["Literature Review Table", 58, "blue" as const],
  ["Workspace", 41, "amber" as const],
  ["Paper Draft", 22, "rose" as const],
  ["Citations", 80, "green" as const],
  ["Notes", 34, "purple" as const],
];

export const researchDeskTabs = [
  {
    id: "literature-review",
    label: "Literature Review",
    phase: "Literature Review",
    description: "You are extracting themes, evidence rows, and source notes from included papers.",
    nextStep: "Finish reviewing rows 19-26, then connect evidence into the synthesis table.",
    button: "Continue literature review",
    stats: [
      ["Papers reviewed", "26"],
      ["Evidence rows", "18"],
      ["Rows remaining", "8"],
      ["Total rows", "312"],
    ],
    progress: 72,
  },
  {
    id: "meta-analysis",
    label: "Meta-analysis",
    phase: "Meta-analysis",
    description: "You are checking effect sizes and model assumptions before adding charts.",
    nextStep: "Review heterogeneity notes before running another comparison.",
    button: "Open meta-analysis",
    stats: [
      ["Studies ready", "18"],
      ["Effects coded", "24"],
      ["Needs check", "6"],
      ["Models", "3"],
    ],
    progress: 72,
  },
  {
    id: "workspace",
    label: "Workspace",
    phase: "Workspace",
    description: "You are organizing project files, source notes, and local materials.",
    nextStep: "Group loose notes by theme and source type.",
    button: "Open workspace",
    stats: [
      ["Files", "26"],
      ["Notes", "42"],
      ["Folders", "5"],
      ["Open tasks", "8"],
    ],
    progress: 41,
  },
  {
    id: "draft",
    label: "Draft",
    phase: "Draft",
    description: "You are turning evidence rows into paper sections.",
    nextStep: "Draft the methods paragraph from the verified source notes.",
    button: "Open draft",
    stats: [
      ["Sections", "4"],
      ["Drafted", "1"],
      ["Comments", "8"],
      ["Citations", "18"],
    ],
    progress: 22,
  },
  {
    id: "citations",
    label: "Citations",
    phase: "Citations",
    description: "You are checking source metadata and citation completeness.",
    nextStep: "Resolve missing page ranges before exporting.",
    button: "Review citations",
    stats: [
      ["References", "42"],
      ["Checked", "34"],
      ["Missing", "4"],
      ["Duplicates", "1"],
    ],
    progress: 80,
  },
];

export const evidenceRows = [
  ["Environmental uncertainty and career decision-making...", "Journal Article", "Today, 10:24 AM", "Key: coping strategies"],
  ["Procrastination in career planning: A meta-analytic review", "Journal Article", "Yesterday, 4:18 PM", "Effect sizes extracted"],
  ["Future of work and AI disruption (2024 report)", "Report", "Yesterday, 11:02 AM", "Industry trends"],
  ["Motivation and self-regulation in students", "Journal Article", "May 18, 2026", "Theoretical framework"],
  ["Measurement invariance in I/O psychology scales", "Journal Article", "May 17, 2026", "Scale validation"],
];

export const researchNextSteps = [
  ["Finish reviewing rows 19-26", "Today"],
  ["Build synthesis table connections", "May 22"],
  ["Draft methods section", "May 24"],
];
