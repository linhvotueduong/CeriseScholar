export const dashboardSections = [
  {
    id: "meta-analysis",
    label: "Meta-analysis",
    progress: 72,
    tone: "rose" as const,
    title: "Meta-analysis",
    status: "In progress",
    nextStep: "Review model assumptions before adding another analytics chart.",
    stats: [
      ["Papers loaded", "26"],
      ["Coded so far", "18"],
      ["Remaining", "8"],
      ["Highlights", "14"],
    ],
  },
  {
    id: "literature-review",
    label: "Literature Review Table",
    progress: 58,
    tone: "blue" as const,
    title: "Literature Review",
    status: "In progress",
    nextStep: "Finish reviewing rows 19-26, then connect evidence into the synthesis table.",
    stats: [
      ["Papers reviewed", "26"],
      ["Evidence rows", "18"],
      ["Rows remaining", "8"],
      ["Total rows", "312"],
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    progress: 41,
    tone: "amber" as const,
    title: "Workspace",
    status: "Collecting",
    nextStep: "Group source notes by method, result, and theory before drafting.",
    stats: [
      ["Files", "18"],
      ["Notes", "42"],
      ["Drafts", "3"],
      ["Tasks", "5"],
    ],
  },
  {
    id: "draft",
    label: "Paper Draft",
    progress: 22,
    tone: "rose" as const,
    title: "Paper Draft",
    status: "Early draft",
    nextStep: "Move the strongest evidence row into the introduction outline.",
    stats: [
      ["Sections", "3"],
      ["Open comments", "8"],
      ["Citations", "12"],
      ["Next pass", "Today"],
    ],
  },
  {
    id: "citations",
    label: "Citations",
    progress: 80,
    tone: "green" as const,
    title: "Citations",
    status: "Healthy",
    nextStep: "Check missing pages before exporting the reference list.",
    stats: [
      ["References", "42"],
      ["Checked", "34"],
      ["Missing data", "4"],
      ["Duplicates", "1"],
    ],
  },
  {
    id: "notes",
    label: "Notes",
    progress: 34,
    tone: "purple" as const,
    title: "Notes",
    status: "Organizing",
    nextStep: "Attach loose notes to the matching source rows.",
    stats: [
      ["Notes", "42"],
      ["Linked", "18"],
      ["Loose", "24"],
      ["Priority", "6"],
    ],
  },
];

export const dashboardSchedule = [
  ["09:00", "Literature review sprint", "Rows 13-26", "blue" as const],
  ["09:30", "Source verification", "Check quality & credibility", "blue" as const],
  ["11:00", "Course module review", "Lesson 8: Evidence synthesis", "amber" as const],
  ["15:00", "Project check-in", "Review next steps", "rose" as const],
];

export const dashboardSupportLinks = [
  ["Request support", "/help/contact"],
  ["Open Help Center", "/help"],
];

export const dashboardContinueLearning = {
  lesson: "Evidence synthesis",
  body: "Finish the comparison notes, review the exemplar texts, then continue to citation mapping.",
  progress: 68,
  stats: [
    ["Modules completed", "4"],
    ["Lessons done", "12"],
    ["Notes created", "8"],
    ["Lessons remaining", "3"],
  ],
};
