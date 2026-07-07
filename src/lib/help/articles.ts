export const helpCategories = [
  {
    slug: "getting-started",
    title: "Getting Started",
    body: "Set up your account, explore the basics, and start your first research project.",
    tone: "rose" as const,
  },
  {
    slug: "ai-setup",
    title: "AI Setup",
    body: "Learn how included AI, your own OpenRouter key, and usage metering work.",
    tone: "blue" as const,
  },
  {
    slug: "privacy-protection",
    title: "Privacy & Protection",
    body: "Understand hosted storage, AI processing, account data, and support boundaries.",
    tone: "green" as const,
  },
  {
    slug: "account-access",
    title: "Account & Access",
    body: "Manage sign-in, Google login, beta access, AI settings, and account preferences.",
    tone: "purple" as const,
  },
  {
    slug: "research-workflow",
    title: "Research Workflow",
    body: "Work with projects, sources, notes, citations, and course materials effectively.",
    tone: "amber" as const,
  },
];

export const popularQuestions = [
  {
    category: "Getting Started",
    question: "How do I start using Cerise Scholar?",
    answer:
      "Create an account, then use Dashboard or Research Desk to create a project and add materials. AI is included by default, and you can connect your own OpenRouter key in Settings > AI.",
  },
  {
    category: "AI Setup",
    question: "How does Cerise Scholar AI work?",
    answer:
      "Cerise Scholar routes AI through OpenRouter. An OpenRouter key gives limited testing first, and adding OpenRouter credit unlocks fuller Cerise usage.",
  },
  {
    category: "AI Setup",
    question: "Can I use my own AI key?",
    answer:
      "Yes. Open Settings > AI, paste an OpenRouter API key, and connect it. The app validates the key, encrypts it server-side, and stores only the encrypted value plus the last four characters.",
  },
  {
    category: "Privacy",
    question: "Where are my research files handled?",
    answer:
      "Research files and project records are handled through Cerise Scholar's hosted app and Supabase-backed project workflows. Support requests should still avoid private files, datasets, passwords, or auth codes.",
  },
  {
    category: "Account",
    question: "How do I change my AI plan?",
    answer:
      "Use Settings > AI to choose OpenRouter or a supported provider path, connect or disconnect your OpenRouter key, and review monthly usage.",
  },
  {
    category: "Beta Access",
    question: "What features are available during public beta?",
    answer:
      "Dashboard, Research Desk, Course Library, help, support, included AI, own-key AI, and usage metering are available. Some analytics and settings persistence may continue to evolve during beta.",
  },
  {
    category: "Research Workflow",
    question: "How do I keep notes, citations, and evidence connected?",
    answer:
      "Start from a project, then keep papers, evidence rows, source notes, citations, and draft sections tied to that project. This helps Cerise Scholar preserve the path from reading to synthesis and writing.",
  },
  {
    category: "Course Library",
    question: "Can course materials support my research projects?",
    answer:
      "Yes. Course materials can help you practice literature review, source verification, citation mapping, and methods work before you apply those skills inside active research projects.",
  },
];

export const allHelpQuestions = [
  ...popularQuestions,
  {
    category: "Getting Started",
    question: "What should I do first after signing in?",
    answer:
      "Open Dashboard, check the current project, then create one research project if you are starting fresh. Add only the sources that belong to that topic so your evidence stays clean.",
  },
  {
    category: "AI Setup",
    question: "What is the included AI allowance?",
    answer:
      "OpenRouter allows limited testing before credit is added. Settings > AI explains when adding OpenRouter credit unlocks fuller Cerise usage.",
  },
  {
    category: "Research Workflow",
    question: "When should I use Research Desk instead of Dashboard?",
    answer:
      "Use Dashboard to see your current status and next move. Use Research Desk when you are actively working with projects, papers, evidence rows, synthesis steps, citations, and draft preparation.",
  },
  {
    category: "Research Workflow",
    question: "How do I move from reading papers into synthesis?",
    answer:
      "Start by turning source notes into evidence rows. Then group repeated findings, compare methods and limitations, and use the synthesis table to shape claims before drafting a section.",
  },
  {
    category: "Citations",
    question: "Can Cerise Scholar help me prepare citation-ready notes?",
    answer:
      "Yes. Keep each claim connected to its source, evidence row, and context. Cerise Scholar can help organize citation-ready notes so draft sections do not become detached from the papers behind them.",
  },
  {
    category: "Course Library",
    question: "What is the Course Library for?",
    answer:
      "Course Library helps you practice research skills such as evidence synthesis, source verification, citation mapping, methods review, and meta-analysis preparation alongside your active projects.",
  },
  {
    category: "Account",
    question: "What if my beta invite or login email does not match?",
    answer:
      "Try signing in with the same email connected to your invite or Cerise Scholar account. If access still looks wrong, contact support with the email you used and the page where the issue appears.",
  },
  {
    category: "Privacy",
    question: "Should I send private papers or datasets to support?",
    answer:
      "No. Support messages should describe the page, device, setup status, and error. Do not send passwords, private source files, datasets, auth codes, or full research folders.",
  },
  {
    category: "AI Setup",
    question: "What should I check if AI is not answering?",
    answer:
      "Open Settings > AI and confirm your included lane or own key is active. If you connected your own key, verify the key still works in your OpenRouter account, then try the request again.",
  },
  {
    category: "Support",
    question: "What is the best way to ask for help?",
    answer:
      "Tell us what you were trying to do, which page you were on, what happened, and what you expected instead. A clear report helps us guide you without needing private research materials.",
  },
];

type HelpArticle = {
  title: string;
  intro: string;
  updated: string;
  category: string;
  previewLabel: string;
  previewTitle: string;
  previewItems: string[];
  sections: Array<{ heading: string; body: string }>;
  related: string[];
};

export const helpArticles = {
  "getting-started": {
    title: "Getting Started with Cerise Scholar",
    intro:
      "Set up your account, understand the hosted research workflow, and create your first research project.",
    updated: "May 13, 2026",
    category: "Getting Started",
    previewLabel: "Quick start checklist",
    previewTitle: "Follow these steps to get set up and running.",
    previewItems: [
      "Create or sign in",
      "Review AI setup",
      "Create your first project",
      "Add papers or notes",
      "Continue from Dashboard",
    ],
    sections: [
      {
        heading: "What Cerise Scholar is for",
        body: "Cerise Scholar helps you organize research projects, papers, notes, literature review rows, citations, course materials, and writing steps in one workspace. It is built for students and early researchers who need a calm place to move from source material to synthesis and draft work without losing track of evidence.",
      },
      {
        heading: "Create or sign in to your account",
        body: "Create a Cerise Scholar account or sign in if you already have one. After signing in, check that your email, profile, and beta access are correct. If you received beta access through a specific email address, use that same email when signing in.",
      },
      {
        heading: "Understand the hosted research workspace",
        body: "Cerise Scholar now runs as a hosted research workspace. Account access, project materials, help pages, and AI features work through the browser, with AI routed through the included OpenRouter lane or your connected key.",
      },
      {
        heading: "Review AI setup",
        body: "Go to Settings > AI to connect an OpenRouter key, review usage, and choose a premium model preference. Limited testing works first; adding OpenRouter credit unlocks fuller Cerise usage.",
      },
      {
        heading: "Create your first research project",
        body: "Start with one research question, paper topic, course assignment, or thesis idea. Give the project a clear title, add a short description, and keep one active project selected while you work. This helps Cerise keep your sources, notes, evidence rows, citations, and draft sections connected.",
      },
      {
        heading: "Add research materials",
        body: "Add PDFs, readings, links, course notes, article references, or datasets that belong to the project. Use notes and literature review rows to record claims, methods, findings, limitations, and source context. Avoid mixing unrelated sources into the same project.",
      },
      {
        heading: "Continue from the Dashboard",
        body: "The Dashboard shows your most recent project, current phase, next action, today's tasks, AI usage, and learning progress. Use it as the starting point when you are unsure what to do next.",
      },
      {
        heading: "Where to get help",
        body: "Use Help Center articles for setup and workflow questions. Use Contact Us for account access, bugs, setup problems, or confusing pages. Do not send private source files, passwords, datasets, or auth codes in support messages.",
      },
    ],
    related: ["ai-setup", "research-workflow", "account-access"],
  },
  "ai-setup": {
    title: "AI Setup",
    intro:
      "Learn how included AI, your own OpenRouter key, and monthly usage metering work in Cerise Scholar.",
    updated: "July 7, 2026",
    category: "AI Setup",
    previewLabel: "Guide summary",
    previewTitle: "How Cerise Scholar decides which AI lane serves your request.",
    previewItems: [
      "Limited testing",
      "Your own key",
      "Usage meters",
      "Preferred model",
      "Troubleshooting",
      "Where to go next",
    ],
    sections: [
      {
        heading: "Limited testing",
        body: "OpenRouter setup starts with limited testing. Cerise Scholar shows usage in Settings > AI and explains when adding OpenRouter credit unlocks fuller product usage.",
      },
      {
        heading: "Your own OpenRouter key",
        body: "If you connect your own OpenRouter key in Settings > AI, your AI requests run through your OpenRouter account. The app validates the key, encrypts it with a server-held secret, and stores only the encrypted key plus its last four characters for display.",
      },
      {
        heading: "Usage meters",
        body: "Every AI answer is counted with its lane, feature, token estimate, and served model. Own-key users are not limited by Cerise Scholar's included allowance, but their usage is still counted so the app can show an honest monthly meter.",
      },
      {
        heading: "Preferred model",
        body: "Settings > AI lets you keep the default free-first model chain or choose a preferred model. Premium models may cost more on your OpenRouter account.",
      },
      {
        heading: "Troubleshooting",
        body: "If AI is not answering, check Settings > AI first. Included-lane users may be at the fair-use limit; own-key users should confirm their OpenRouter key is valid, funded if needed, and allowed to call the selected model.",
      },
      {
        heading: "Where to go next",
        body: "After AI is ready, open a project and use ScholarAsk for a real research question. For privacy questions, read Privacy & Protection. For account questions, read Account & Access. For bugs or setup issues, use Contact Us.",
      },
    ],
    related: ["privacy-protection", "getting-started", "research-workflow"],
  },
  "privacy-protection": {
    title: "Privacy & Protection in Cerise Scholar",
    intro:
      "Understand hosted storage, AI processing, account data, and support boundaries.",
    updated: "July 7, 2026",
    category: "Privacy & Protection",
    previewLabel: "Privacy at a glance",
    previewTitle: "The privacy boundaries Cerise should make clear before you work.",
    previewItems: [
      "Hosted project workspace",
      "AI provider boundary",
      "Support boundaries",
      "Account controls",
      "Good privacy habits",
    ],
    sections: [
      {
        heading: "Hosted project workspace",
        body: "Cerise Scholar stores project records and selected research materials through the hosted app and Supabase-backed workflows so your work can move with your account.",
      },
      {
        heading: "AI provider boundary",
        body: "AI requests use OpenRouter through the included lane or your connected key. Do not include material in a prompt unless you are comfortable using it for the requested AI workflow.",
      },
      {
        heading: "What may sync",
        body: "Some lightweight information may sync so the app works across sessions and devices. This can include account information, selected preferences, learning progress, saved settings, and non-sensitive metadata needed for app features.",
      },
      {
        heading: "Hosted features and cloud processing",
        body: "Some optional features may use hosted services for login, support, source discovery, selected AI features, or account functions. When a feature uses hosted processing, the app should make that clear before you continue.",
      },
      {
        heading: "Account and AI controls",
        body: "Use Settings to review account preferences, privacy choices, and AI setup. You can disconnect your OpenRouter key from Settings > AI if you no longer want own-key usage.",
      },
      {
        heading: "No private files in support",
        body: "Support requests should include the page, device, and result. Do not send passwords, source files, datasets, auth codes, private notes, sensitive documents, or full research folders in support messages.",
      },
      {
        heading: "How to review your privacy setup",
        body: "Go to Settings > Privacy & Security to review data controls, sync behavior, and security actions. Go to Settings > AI to review AI lane, own-key status, and usage.",
      },
      {
        heading: "Good privacy habits",
        body: "Avoid shared accounts, keep research files organized, review what you upload or paste into AI prompts, and do not send sensitive data in support messages.",
      },
      {
        heading: "Where to go next",
        body: "Read the Privacy Policy for the full policy. Read AI Setup for AI lane details. Use Contact Us if you need help understanding a privacy or setup issue.",
      },
    ],
    related: ["ai-setup", "account-access", "research-workflow"],
  },
  "account-access": {
    title: "Account & Access",
    intro: "Manage sign-in, Google login, beta access, AI setup, and account settings.",
    updated: "May 13, 2026",
    category: "Account & Access",
    previewLabel: "Access checklist",
    previewTitle: "Check the account details that usually explain access problems.",
    previewItems: [
      "Create or sign in",
      "Confirm your email",
      "Use Google login correctly",
      "Review AI settings",
      "Fix common access issues",
    ],
    sections: [
      {
        heading: "Create or sign in to your account",
        body: "You can create a Cerise Scholar account using your email address or sign in if you already have one. After signing in, you should be taken to your Dashboard.",
      },
      {
        heading: "Google login and matching email addresses",
        body: "Google sign-in is a fast and secure way to access Cerise Scholar. To avoid access issues, use the same email address connected to your Cerise Scholar account or beta invite.",
      },
      {
        heading: "Beta access and invite requirements",
        body: "Some features may require beta access or an invite. If you received an invite code, use it during sign-up or in Settings > Account if supported. If your invite is missing or does not work, contact support.",
      },
      {
        heading: "AI settings and account security",
        body: "Settings > AI shows whether you are using included AI or your own OpenRouter key. Keep your account secure and disconnect keys you no longer want Cerise Scholar to use.",
      },
      {
        heading: "Account profile and preferences",
        body: "Use Settings > Account to update your profile, display name, email, language, timezone, connected accounts, and account preferences.",
      },
      {
        heading: "Connected accounts",
        body: "Connected accounts may support sign-in, learning features, or future integrations. Only connect accounts you trust and review permissions before approving.",
      },
      {
        heading: "Active sessions and account security",
        body: "Review active sessions when available. If you notice an unfamiliar device, sign out of that session and update your login method if needed.",
      },
      {
        heading: "Common sign-in issues",
        body: "Common issues include using the wrong Google account, beta invite email mismatch, unverified email, missing beta access, or browser sessions that need to be refreshed after sign-in.",
      },
      {
        heading: "Where to go next",
        body: "Read Getting Started for the first-use flow. Read AI Setup for AI lane details. Read Privacy & Protection for privacy boundaries. Use Contact Us for account access issues.",
      },
    ],
    related: ["getting-started", "ai-setup", "privacy-protection"],
  },
  "research-workflow": {
    title: "Research Workflow in Cerise Scholar",
    intro:
      "Learn how to move from project idea to sources, notes, literature review rows, synthesis, citations, and draft sections.",
    updated: "May 13, 2026",
    category: "Research Workflow",
    previewLabel: "Workflow strip",
    previewTitle: "Project -> Sources -> Notes -> Literature Review Table -> Synthesis -> Draft -> Citations",
    previewItems: [
      "Project",
      "Sources",
      "Notes",
      "Literature Review Table",
      "Synthesis",
      "Draft",
      "Citations",
    ],
    sections: [
      {
        heading: "Start with a research project",
        body: "A project keeps your research question, source materials, notes, evidence rows, citations, and draft sections connected. Start one project per paper, assignment, thesis idea, or research question.",
      },
      {
        heading: "Add sources and materials",
        body: "Add PDFs, readings, source links, course notes, datasets, and article references that belong to the selected project. Keep unrelated materials out of the project so your evidence stays clean.",
      },
      {
        heading: "Turn sources into notes",
        body: "Use notes to capture claims, quotes, variables, methods, findings, limitations, and source context. Notes should help you remember why a source matters, not just summarize the article.",
      },
      {
        heading: "Build the literature review table",
        body: "Convert source notes into evidence rows. A good literature review table helps compare studies, identify themes, track methods, notice gaps, and prepare synthesis.",
      },
      {
        heading: "Move into synthesis",
        body: "Use evidence rows to develop claims, mechanisms, comparisons, and section-level arguments. Synthesis is where the project moves from collecting information to explaining what the evidence means.",
      },
      {
        heading: "Manage citations and references",
        body: "Keep citations connected to source context. Before drafting, review whether each claim has evidence and whether each source is properly tied to the project.",
      },
      {
        heading: "Draft and review your paper",
        body: "Move from synthesis into draft sections. Review evidence, citations, gaps, and unclear claims before exporting or submitting work.",
      },
      {
        heading: "Use Course Library alongside research",
        body: "Course Library supports skill-building, such as evidence synthesis, citation mapping, and methods review. Course progress should support research work without replacing project-level evidence tracking.",
      },
      {
        heading: "Workflow best practices",
        body: "Keep one active project selected, make next steps specific, avoid opening unrelated tools, keep notes linked to sources, and review citations before writing final claims.",
      },
      {
        heading: "Where to go next",
        body: "Use Research Desk for project work, Course Library for skill support, Getting Started for setup, and Contact Us if something in the workflow is confusing.",
      },
    ],
    related: ["getting-started", "privacy-protection", "ai-setup"],
  },
} satisfies Record<string, HelpArticle>;

export type HelpArticleSlug = keyof typeof helpArticles;
