export const helpCategories = [
  {
    slug: "getting-started",
    title: "Getting Started",
    body: "Set up your account, explore the basics, and start your first research project.",
    tone: "rose" as const,
  },
  {
    slug: "local-agent-setup",
    title: "Local Agent & Setup",
    body: "Learn about the Local Agent, Ollama, trusted folders, and local system checks.",
    tone: "blue" as const,
  },
  {
    slug: "privacy-protection",
    title: "Privacy & Protection",
    body: "Understand what stays on your laptop, what syncs, and hosted services.",
    tone: "green" as const,
  },
  {
    slug: "account-access",
    title: "Account & Access",
    body: "Manage sign-in, Google login, beta access, and trusted laptop settings.",
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
      "Create an account, open Cerise Scholar on a trusted laptop, then use Dashboard or Research Desk to create a project and add materials. Local AI checks will appear when the Local Agent and Ollama are ready.",
  },
  {
    category: "Local Agent",
    question: "What does the Cerise Scholar Local Agent do?",
    answer:
      "The Local Agent runs on your trusted laptop and helps Cerise Scholar connect to selected folders, local indexes, and local AI tools for source-file workflows.",
  },
  {
    category: "Local AI",
    question: "Can Cerise Scholar install Ollama for me?",
    answer:
      "Cerise can guide you to the official Ollama download and check whether it is ready. A browser page cannot silently install a desktop app or bypass macOS approval prompts.",
  },
  {
    category: "Privacy",
    question: "Do my research files stay on my laptop?",
    answer:
      "Private source-file work is designed for the trusted laptop flow. Hosted services still support login, help, policy pages, and selected app records.",
  },
  {
    category: "Account",
    question: "How do I connect or change my research folder?",
    answer:
      "Use Settings > Local Setup to review folder status. You can change, pause, or remove folder access from your trusted laptop flow.",
  },
  {
    category: "Beta Access",
    question: "What features are available during public beta?",
    answer:
      "Dashboard, Research Desk, Course Library, help, support, and local setup checks are available. Some analytics and settings persistence remain display-only until later backend work.",
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
      "Open Dashboard, check the current project, then confirm whether Local Setup is ready. If you are starting fresh, create one research project and add only the sources that belong to that topic.",
  },
  {
    category: "Local Setup",
    question: "Why does Cerise Scholar care about a trusted laptop?",
    answer:
      "Private source-file workflows work best on a device you control. A trusted laptop lets Cerise Scholar keep research folders, local indexes, local AI checks, and draft support connected without treating every file like a cloud upload.",
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
    category: "Local AI",
    question: "What should I check if local AI is not ready?",
    answer:
      "Review Settings > Local Setup for the Local Agent, Ollama or selected local provider, research folder, knowledge base, file index, and safety checks. Fix the item marked incomplete before using private local workflows.",
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
      "Set up your account, understand the laptop-first workflow, and create your first research project.",
    updated: "May 13, 2026",
    category: "Getting Started",
    previewLabel: "Quick start checklist",
    previewTitle: "Follow these steps to get set up and running.",
    previewItems: [
      "Create or sign in",
      "Check Local Setup",
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
        heading: "Understand the laptop-first setup",
        body: "Cerise Scholar is designed around a trusted laptop. Account access, reading, help pages, and lighter app features may work from the browser, but private source-file workflows are meant to happen from the device where your research folder, local workspace, Local Agent, and local AI tools live.",
      },
      {
        heading: "Check Local Setup",
        body: "Go to Settings > Local Setup to confirm your local environment is ready. The main checks are Local Agent, Ollama or selected local provider, Research Folder, Knowledge Base, File Index, and Safety. If a check is not ready, follow the on-screen guidance before starting private source-file workflows.",
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
        body: "The Dashboard shows your most recent project, current phase, next action, today's tasks, local setup readiness, and learning progress. Use it as the starting point when you are unsure what to do next.",
      },
      {
        heading: "Where to get help",
        body: "Use Help Center articles for setup and workflow questions. Use Contact Us for account access, bugs, setup problems, or confusing pages. Do not send private source files, passwords, datasets, or auth codes in support messages.",
      },
    ],
    related: ["local-agent-setup", "research-workflow", "account-access"],
  },
  "local-agent-setup": {
    title: "Local Agent & Setup",
    intro:
      "Learn how the Local Agent connects Cerise Scholar to your trusted laptop, local tools, research folder, and safety checks.",
    updated: "May 13, 2026",
    category: "Local Agent & Setup",
    previewLabel: "Guide summary",
    previewTitle: "What local setup needs before private source-file work starts.",
    previewItems: [
      "What the Local Agent does",
      "Why local setup matters",
      "What stays local",
      "Local Setup checks",
      "Connect a research folder",
      "Ollama or local AI readiness",
      "Troubleshooting readiness",
      "Best practices",
      "Where to go next",
    ],
    sections: [
      {
        heading: "What the Local Agent does",
        body: "The Local Agent is a lightweight helper that runs on your trusted laptop. It helps Cerise Scholar connect to selected local folders, local indexes, and local AI tools for source-file workflows. It should only work with folders and tools you explicitly choose.",
      },
      {
        heading: "Why local setup matters",
        body: "Cerise Scholar is designed for research work that may involve private papers, notes, drafts, or source files. Local setup helps keep that work tied to your own device instead of treating every research file like a cloud upload.",
      },
      {
        heading: "What stays local",
        body: "Your PDFs, drafts, notes, local indexes, source folders, and local AI outputs are intended to stay on your trusted device unless you choose a hosted feature that clearly states what information is used.",
      },
      {
        heading: "Local Setup checks",
        body: "The Local Setup page checks whether your research environment is ready. The expected checks are Local Agent running, Ollama or selected local provider available, Research Folder connected, Knowledge Base available, File Index up to date, and Safety check configured.",
      },
      {
        heading: "Connect a research folder",
        body: "Choose a research folder that you control and understand. You can change, pause, or remove folder access later. Do not connect shared, public, borrowed, school-lab, cafe, library, or employer-controlled folders unless you have permission and understand the privacy risk.",
      },
      {
        heading: "Ollama or local AI readiness",
        body: "Ollama or another selected local provider may support private research help. If local AI is unavailable, Cerise should show that status clearly and explain what still needs attention. Some setup steps may happen outside Cerise, so review installers and permissions carefully.",
      },
      {
        heading: "Troubleshooting readiness",
        body: "Common blockers include Local Agent not connected, Ollama unavailable, research folder missing, permissions blocked, file index outdated, or safety check failed. Open Settings > Local Setup to see which item needs attention.",
      },
      {
        heading: "Best practices",
        body: "Use a trusted laptop, keep the Local Agent updated, review folder access regularly, avoid shared computers, and do not send private research files to support. If you are unsure whether a device is appropriate for private research work, do not connect your source folder yet.",
      },
      {
        heading: "Where to go next",
        body: "After Local Setup is ready, return to Dashboard or Research Desk. For privacy questions, read Privacy & Protection. For account questions, read Account & Access. For bugs or setup issues, use Contact Us.",
      },
    ],
    related: ["privacy-protection", "getting-started", "research-workflow"],
  },
  "privacy-protection": {
    title: "Privacy & Protection in Cerise Scholar",
    intro:
      "Understand what stays on your laptop, what may sync, and how Cerise Scholar protects private research workflows.",
    updated: "May 13, 2026",
    category: "Privacy & Protection",
    previewLabel: "Privacy at a glance",
    previewTitle: "The privacy boundaries Cerise should make clear before you work.",
    previewItems: [
      "Local by default",
      "Sync only where stated",
      "You control folder access",
      "Hosted features are labeled",
      "Security checks matter",
    ],
    sections: [
      {
        heading: "Local by default",
        body: "Cerise Scholar is designed so private source-file work can stay tied to your trusted laptop. Research folders, local indexes, private notes, local drafts, and local AI outputs should remain on your device unless you choose a hosted feature that clearly says otherwise.",
      },
      {
        heading: "What stays on your laptop",
        body: "Private PDFs, drafts, notes, source folders, local indexes, and private research outputs are intended to remain local. Cerise should not upload private source files by default or silently use them for hosted processing.",
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
        heading: "Research folder access and permissions",
        body: "You choose which folders Cerise can access. You can review, change, pause, or remove access in Settings. Folder access should remain user controlled and should never expand silently to unrelated folders.",
      },
      {
        heading: "No private files in support",
        body: "Support requests should include the page, device, and result. Do not send passwords, source files, datasets, auth codes, private notes, sensitive documents, or full research folders in support messages.",
      },
      {
        heading: "How to review your privacy setup",
        body: "Go to Settings > Privacy & Security to review data controls, sync behavior, folder access, and security actions. Go to Settings > Local Setup to review local readiness and connected services.",
      },
      {
        heading: "Good privacy habits",
        body: "Use a trusted laptop, avoid shared accounts, review connected folders, keep research files organized, and do not paste sensitive data into support messages. If you are unsure about a file, do not upload or share it.",
      },
      {
        heading: "Where to go next",
        body: "Read the Privacy Policy for the full policy. Read Local Agent & Setup for local setup details. Use Contact Us if you need help understanding a privacy or setup issue.",
      },
    ],
    related: ["local-agent-setup", "account-access", "research-workflow"],
  },
  "account-access": {
    title: "Account & Access",
    intro: "Manage sign-in, Google login, beta access, trusted laptops, and account settings.",
    updated: "May 13, 2026",
    category: "Account & Access",
    previewLabel: "Access checklist",
    previewTitle: "Check the account details that usually explain access problems.",
    previewItems: [
      "Create or sign in",
      "Confirm your email",
      "Use Google login correctly",
      "Review trusted device settings",
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
        heading: "Trusted devices and account security",
        body: "A trusted laptop may need its own Local Agent and folder setup before advanced local features work. Account sign-in does not automatically mean every device is ready for private source-file workflows.",
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
        body: "Common issues include using the wrong Google account, beta invite email mismatch, unverified email, missing beta access, or trying to use local features from a laptop that has not completed Local Setup.",
      },
      {
        heading: "Where to go next",
        body: "Read Getting Started for the first-use flow. Read Local Agent & Setup for trusted laptop readiness. Read Privacy & Protection for privacy boundaries. Use Contact Us for account access issues.",
      },
    ],
    related: ["getting-started", "local-agent-setup", "privacy-protection"],
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
    related: ["getting-started", "privacy-protection", "local-agent-setup"],
  },
} satisfies Record<string, HelpArticle>;

export type HelpArticleSlug = keyof typeof helpArticles;
