"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app-shell/AppShell";
import { AppIcon } from "@/components/app-shell/AppIcons";
import type { AppIconName } from "@/components/app-shell/AppIcons";
import styles from "./page.module.css";

type ProjectTabId = "literature-review" | "meta-analysis" | "workspace" | "draft" | "citations";

type ProjectOverview = {
  body: string;
  cta: string;
  metrics: Array<{ icon: AppIconName; label: string; value: string }>;
  nextStep: string;
  phase: string;
  progress: number;
};

type ResearchProject = {
  activeTab: ProjectTabId;
  badge: string;
  id: string;
  meta: string;
  overviews: Record<ProjectTabId, ProjectOverview>;
  progress: number;
  title: string;
};

const stats: Array<{
  detail: string;
  icon: AppIconName;
  label: string;
  success?: boolean;
  value: string;
}> = [
  { icon: "folder", label: "Active projects", value: "4", detail: "Across all topics" },
  { icon: "file", label: "Papers & PDFs", value: "128", detail: "In your library" },
  { icon: "list", label: "Literature rows", value: "312", detail: "Extracted evidence" },
  { icon: "edit", label: "Draft sections", value: "22", detail: "In progress" },
  { icon: "workflow", label: "Weekly pace", value: "On track", detail: "Great momentum", success: true },
];

const projectTabs: Array<{ id: ProjectTabId; label: string }> = [
  { id: "literature-review", label: "Literature Review" },
  { id: "meta-analysis", label: "Meta-analysis" },
  { id: "workspace", label: "Workspace" },
  { id: "draft", label: "Draft" },
  { id: "citations", label: "Citations" },
];

const productOverviews: Record<ProjectTabId, ProjectOverview> = {
  "literature-review": {
    body: "Use Cerise Literature Review to extract themes, evidence rows, and source notes from included papers.",
    cta: "Continue literature review →",
    metrics: [
      { icon: "file", label: "Papers reviewed", value: "26" },
      { icon: "list", label: "Evidence rows", value: "18" },
      { icon: "clock", label: "Rows remaining", value: "8" },
      { icon: "book", label: "Total rows", value: "312" },
    ],
    nextStep: "Finish reviewing rows 19-26, then connect evidence into the synthesis table.",
    phase: "Literature Review",
    progress: 72,
  },
  "meta-analysis": {
    body: "Use Cerise Meta-analysis to define the question, select effects, map studies, and prepare forest-plot outputs.",
    cta: "Open meta-analysis →",
    metrics: [
      { icon: "target", label: "Question set", value: "1" },
      { icon: "check-square", label: "Effects selected", value: "8" },
      { icon: "workflow", label: "Studies mapped", value: "18" },
      { icon: "workflow", label: "Forest plots", value: "0" },
    ],
    nextStep: "Review model assumptions before adding the next analytic chart.",
    phase: "Meta-analysis",
    progress: 46,
  },
  workspace: {
    body: "Use Cerise Workspace to keep project files, notes, PDFs, and local source context organized in one place.",
    cta: "Open workspace →",
    metrics: [
      { icon: "folder", label: "Folders linked", value: "4" },
      { icon: "file", label: "Files indexed", value: "128" },
      { icon: "list", label: "Notes created", value: "42" },
      { icon: "shield", label: "Local checks", value: "4/4" },
    ],
    nextStep: "Clean up uncategorized source notes and keep the active folder ready for drafting.",
    phase: "Workspace",
    progress: 64,
  },
  draft: {
    body: "Use Cerise Paper Writer to turn coded evidence into guided manuscript sections with APA-ready structure.",
    cta: "Open paper writer →",
    metrics: [
      { icon: "edit", label: "Sections drafted", value: "5" },
      { icon: "list", label: "Claims supported", value: "14" },
      { icon: "book-open", label: "References ready", value: "22" },
      { icon: "clock", label: "Sections left", value: "3" },
    ],
    nextStep: "Draft the methods section from checked assumptions and citation-ready notes.",
    phase: "Paper Draft",
    progress: 38,
  },
  citations: {
    body: "Use Cerise Citations to check references, citation coverage, and source-note readiness before writing.",
    cta: "Review citations →",
    metrics: [
      { icon: "book", label: "Sources saved", value: "26" },
      { icon: "check-square", label: "Citation-ready", value: "19" },
      { icon: "alert", label: "Needs review", value: "7" },
      { icon: "upload", label: "Export format", value: "RIS" },
    ],
    nextStep: "Resolve missing metadata and mark reviewed source notes as citation-ready.",
    phase: "Citations",
    progress: 73,
  },
};

const projects: ResearchProject[] = [
  {
    activeTab: "literature-review",
    badge: "In progress",
    id: "environmental-uncertainty",
    meta: "Updated 2h ago · 312 rows · 26 papers",
    overviews: productOverviews,
    progress: 72,
    title: "Environmental Uncertainty & Career Procrastination",
  },
  {
    activeTab: "meta-analysis",
    badge: "Literature review",
    id: "ai-disruption",
    meta: "Updated 1d ago · 184 rows · 18 papers",
    overviews: {
      ...productOverviews,
      "literature-review": {
        ...productOverviews["literature-review"],
        metrics: [
          { icon: "file", label: "Papers reviewed", value: "18" },
          { icon: "list", label: "Evidence rows", value: "94" },
          { icon: "clock", label: "Rows remaining", value: "12" },
          { icon: "book", label: "Total rows", value: "184" },
        ],
        nextStep: "Connect AI delay themes before moving more evidence into the draft.",
        progress: 41,
      },
      "meta-analysis": {
        ...productOverviews["meta-analysis"],
        body: "Use Cerise Meta-analysis to compare academic-delay effects across AI disruption and learning-behavior studies.",
        metrics: [
          { icon: "target", label: "Question set", value: "1" },
          { icon: "check-square", label: "Effects selected", value: "6" },
          { icon: "workflow", label: "Studies mapped", value: "12" },
          { icon: "workflow", label: "Forest plots", value: "1" },
        ],
        nextStep: "Check heterogeneity notes before exporting the next forest plot.",
        progress: 58,
      },
    },
    progress: 41,
    title: "AI Disruption & Academic Delay",
  },
  {
    activeTab: "workspace",
    badge: "Data extraction",
    id: "io-psychology-source-control",
    meta: "Updated 2d ago · 128 rows · 12 papers",
    overviews: {
      ...productOverviews,
      workspace: {
        ...productOverviews.workspace,
        body: "Use Cerise Workspace to validate local folders, source files, and extraction notes for the DLA source-control project.",
        metrics: [
          { icon: "folder", label: "Folders linked", value: "3" },
          { icon: "file", label: "Files indexed", value: "42" },
          { icon: "list", label: "Notes created", value: "31" },
          { icon: "shield", label: "Local checks", value: "4/4" },
        ],
        nextStep: "Tag source-control papers and reconcile duplicated source notes.",
        progress: 56,
      },
    },
    progress: 56,
    title: "I/O Psychology DLA Source Control",
  },
  {
    activeTab: "draft",
    badge: "Drafting",
    id: "literature-review-foundations",
    meta: "Updated 3d ago · 96 rows · 9 papers",
    overviews: {
      ...productOverviews,
      draft: {
        ...productOverviews.draft,
        body: "Use Cerise Paper Writer to turn course-library foundations into draft sections and reusable writing guidance.",
        metrics: [
          { icon: "edit", label: "Sections drafted", value: "4" },
          { icon: "list", label: "Claims supported", value: "12" },
          { icon: "book-open", label: "References ready", value: "9" },
          { icon: "clock", label: "Sections left", value: "2" },
        ],
        nextStep: "Polish the literature review foundation notes into a reusable methods draft.",
        progress: 68,
      },
    },
    progress: 68,
    title: "Literature Review Foundations",
  },
];

const evidenceItems = [
  {
    added: "Today, 10:28 AM",
    notes: "Key coping strategies",
    source: "ScholarAsk",
    title: "Environmental uncertainty and career decision-making...",
    type: "Journal Article",
  },
  {
    added: "Yesterday, 4:18 PM",
    notes: "Effect sizes extracted",
    source: "ScholarAsk",
    title: "Procrastination in career planning: A meta-analytic review",
    type: "Journal Article",
  },
  {
    added: "Yesterday, 9:04 AM",
    notes: "Industry trends",
    source: "Upload",
    title: "Future of work and AI disruption (2024 report)",
    type: "Report",
  },
  {
    added: "May 17, 2025",
    notes: "Theoretical framework",
    source: "ScholarAsk",
    title: "Motivation and self-regulation in students",
    type: "Journal Article",
  },
  {
    added: "May 16, 2025",
    notes: "Sampling criteria",
    source: "Upload",
    title: "Career uncertainty and academic delay indicators",
    type: "Working Paper",
  },
];

const upcomingNextSteps = [
  {
    due: "Today",
    title: "Finish reviewing rows 19-26",
  },
  {
    due: "May 22",
    title: "Build synthesis table connections",
  },
  {
    due: "May 24",
    title: "Draft methods section",
  },
  {
    due: "May 26",
    title: "Check citation-ready source notes",
  },
  {
    due: "May 28",
    title: "Review assumptions before meta-analysis",
  },
];

const recentChanges = [
  {
    detail: "From ScholarArk",
    time: "1h ago",
    title: "Imported 3 papers",
  },
  {
    detail: "Environmental Uncertainty...",
    time: "2h ago",
    title: "Extracted 22 evidence rows",
  },
  {
    detail: "Model assumptions review",
    time: "5h ago",
    title: "Updated assumptions",
  },
  {
    detail: "Results discussion",
    time: "Yesterday",
    title: "Edited synthesis section",
  },
];

const quickNotes = [
  {
    note: "Check APA 7th edition updates before manuscript window",
    time: "08:45",
  },
  {
    note: "Ask team about inter-rater reliability plan.",
    time: "08:45",
  },
];

const assistantActions = [
  "Summarize my latest papers",
  "Suggest themes from my evidence",
  "Check for gaps in my review",
];

function SelectedProjectShape() {
  return (
    <svg
      aria-hidden="true"
      className={styles.selectedProjectShape}
      preserveAspectRatio="none"
      viewBox="0 0 344 96"
    >
      <path
        d="M18 0 H286 C299 0 307 7 307 20 V26 C307 34 312 38 323 38 H331 C339 38 344 43 344 48 C344 53 339 58 331 58 H323 C312 58 307 62 307 70 V76 C307 89 299 96 286 96 H18 C7 96 0 89 0 76 V20 C0 7 7 0 18 0 Z"
      />
    </svg>
  );
}

function ProjectProgress({ progress }: { progress: number }) {
  return (
    <div className={styles.projectProgressLine}>
      <span className={styles.projectProgressTrack}>
        <span className={styles.projectProgressFill} style={{ width: `${progress}%` }} />
      </span>
      <strong>{progress}%</strong>
    </div>
  );
}

function ProjectsCard({
  onSelectProject,
  selectedProjectId,
}: {
  onSelectProject: (project: ResearchProject) => void;
  selectedProjectId: string;
}) {
  return (
    <article className={styles.projectsZone}>
      <div className={styles.cardHeader}>
        <h2>Projects</h2>
        <button className={styles.miniButton} type="button">
          + New
        </button>
      </div>

      <div className={styles.projectList}>
        {projects.map((project) => {
          const active = project.id === selectedProjectId;

          return active ? (
            <button
              aria-pressed="true"
              className={styles.selectedProjectCard}
              key={project.id}
              onClick={() => onSelectProject(project)}
              type="button"
            >
              <SelectedProjectShape />
              <span className={styles.selectedProjectContent}>
                <span className={styles.projectTitle}>{project.title}</span>
                <span className={`${styles.projectBadge} ${styles.warmBadge}`}>{project.badge}</span>
                <span className={styles.projectMeta}>{project.meta}</span>
                <ProjectProgress progress={project.progress} />
              </span>
            </button>
          ) : (
            <button
              aria-pressed="false"
              className={styles.projectCard}
              key={project.id}
              onClick={() => onSelectProject(project)}
              type="button"
            >
              <span className={styles.projectTitle}>{project.title}</span>
              <span
                className={`${styles.projectBadge} ${
                  project.badge === "Data extraction"
                    ? styles.greenBadge
                    : project.badge === "Drafting"
                      ? styles.blueBadge
                      : styles.neutralBadge
                }`}
              >
                {project.badge}
              </span>
              <span className={styles.projectMeta}>{project.meta}</span>
              <ProjectProgress progress={project.progress} />
            </button>
          );
        })}
      </div>

      <button className={styles.archiveButton} type="button">
        View archived projects
      </button>
    </article>
  );
}

function ProjectOverviewCard({
  activeTab,
  onTabChange,
  project,
}: {
  activeTab: ProjectTabId;
  onTabChange: (tab: ProjectTabId) => void;
  project: ResearchProject;
}) {
  const overview = project.overviews[activeTab];

  return (
    <article className={styles.overviewZone}>
      <div className={styles.overviewHeader}>
        <h2>Project Overview</h2>
        <button className={styles.projectSelectButton} type="button">
          {project.title}
          <AppIcon name="chevron-down" />
        </button>
      </div>

      <nav className={styles.overviewTabs} aria-label="Project sections">
        {projectTabs.map((tab) => (
          <button
            className={tab.id === activeTab ? styles.activeTab : undefined}
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className={styles.overviewPanel}>
        <div className={styles.overviewMain}>
          <div className={styles.phaseBlock}>
            <p>Current phase</p>
            <h3>{overview.phase}</h3>
            <span>{overview.body}</span>
          </div>
          <div className={styles.nextBlock}>
            <p>Next step</p>
            <span>{overview.nextStep}</span>
            <button type="button">{overview.cta}</button>
          </div>
        </div>

        <div className={styles.overviewMetrics}>
          {overview.metrics.map((metric) => (
            <div className={styles.metricCell} key={metric.label}>
              <AppIcon name={metric.icon} />
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>

        <div className={styles.overviewProgress}>
          <span>
            <i style={{ width: `${overview.progress}%` }} />
          </span>
          <strong>{overview.progress}% complete</strong>
        </div>
      </section>
    </article>
  );
}

function SynthesisFunnelCard() {
  return (
    <article className={styles.funnelZone}>
      <div className={styles.funnelHeader}>
        <h2>Synthesis Funnel</h2>
        <p>Where progress narrows before drafting</p>
        <span>
          <i />
          72% ready
        </span>
      </div>

      <div className={styles.funnelGraphic}>
        <svg aria-label="Synthesis Funnel progress" role="img" viewBox="0 0 293 162">
          <defs>
            <linearGradient id="funnelGradient" x1="0" x2="1" y1="0.5" y2="0.5">
              <stop offset="0" stopColor="#f5a8b6" stopOpacity="0.66" />
              <stop offset="0.48" stopColor="#dfbddc" stopOpacity="0.58" />
              <stop offset="1" stopColor="#b8c8f5" stopOpacity="0.5" />
            </linearGradient>
            <filter id="softFunnelBlur" x="-8%" y="-35%" width="116%" height="155%">
              <feGaussianBlur stdDeviation="0.35" />
            </filter>
          </defs>

          <g>
            <path
              className={styles.funnelShape}
              d="M0 43 C28 44 44 62 72 64 C101 66 113 76 141 77 C170 78 178 87 205 88 C231 89 247 83 293 84 L293 91 C248 92 229 96 205 95 C178 94 170 103 141 104 C113 105 101 116 72 118 C44 120 28 137 0 138 Z"
              filter="url(#softFunnelBlur)"
            />

            {[22, 88, 154, 220, 267].map((x, index) => (
              <g className={styles.funnelGuide} key={x}>
                <line x1={x} x2={x} y1="37" y2={index === 3 ? 141 : 134} />
                <circle cx={x} cy={134} r="3" />
              </g>
            ))}

            <g className={styles.assumptionMarker}>
              <line x1="220" x2="220" y1="74" y2="134" />
              <circle cx="220" cy="72" r="12" />
              <circle cx="220" cy="72" r="5" />
            </g>

            <g className={styles.lockNode}>
              <circle cx="267" cy="84" r="15" />
              <path d="M262 84h10v8h-10z" />
              <path d="M264 84v-3.2a3 3 0 0 1 6 0V84" />
            </g>
          </g>
        </svg>

        <div className={styles.funnelLabels}>
          <span>
            <strong>26</strong>
            Loaded
          </span>
          <span>
            <strong>18</strong>
            Coded
          </span>
          <span>
            <strong>8</strong>
            Open rows
          </span>
          <span className={styles.activeFunnelLabel}>
            Assumptions
            <br />
            review
          </span>
          <span>
            Draft
            <br />
            paused
          </span>
        </div>
      </div>

      <section className={styles.funnelAlert}>
        <div className={styles.alertTop}>
          <span>!</span>
          <p>
            <strong>Main blocker:</strong> Model assumptions need review.
          </p>
        </div>
        <div className={styles.alertDivider} />
        <p className={styles.alertNext}>
          <strong>Next move:</strong> Review assumptions before adding another analytics chart.
        </p>
      </section>
    </article>
  );
}

function EvidenceLibraryCard() {
  return (
    <article className={styles.evidenceZone}>
      <div className={styles.evidenceHeader}>
        <div className={styles.evidenceTitleRow}>
          <h2>Evidence Library</h2>
          <span className={styles.sourceToggle}>
            <span>ScholarAsk</span>
            <span>Upload</span>
          </span>
        </div>
        <a href="/research-desk">
          View all library →
        </a>
      </div>

      <p className={styles.evidenceNote}>
        <span aria-hidden="true">ⓘ</span>
        Recent shows both ScholarAsk and Upload items — distinguish them by the Source column.
      </p>

      <nav className={styles.evidenceTabs} aria-label="Evidence library views">
        <button className={styles.activeEvidenceTab} type="button">
          Recent
        </button>
        <button type="button">ScholarAsk</button>
        <button type="button">Upload</button>
      </nav>

      <div className={styles.evidenceTableWrap}>
        <table className={styles.evidenceTable}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Source</th>
              <th>Added</th>
              <th>Notes / Status</th>
              <th aria-label="Saved" />
            </tr>
          </thead>
          <tbody>
            {evidenceItems.map((item) => (
              <tr key={item.title}>
                <td>{item.title}</td>
                <td>{item.type}</td>
                <td>
                  <span className={item.source === "ScholarAsk" ? styles.scholarSource : styles.uploadSource}>
                    {item.source}
                  </span>
                </td>
                <td>{item.added}</td>
                <td>{item.notes}</td>
                <td>
                  <svg aria-hidden="true" className={styles.bookmarkIcon} viewBox="0 0 12 14">
                    <path d="M2.2 1.4h7.6v10.9L6 10.1l-3.8 2.2z" />
                  </svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function UpcomingNextStepsCard() {
  return (
    <article className={styles.focusRailCard}>
      <div className={styles.railCardHeader}>
        <h2>Upcoming & Next Steps</h2>
      </div>
      <div className={styles.focusList}>
        {upcomingNextSteps.map((item) => (
          <div className={styles.focusItem} key={item.title}>
            <strong>{item.title}</strong>
            <span>{item.due}</span>
          </div>
        ))}
      </div>
      <Link className={`${styles.railLinkButton} ${styles.focusRailLink}`} href="/dashboard/schedule">
        View all tasks
        <AppIcon name="arrow-right" />
      </Link>
    </article>
  );
}

function RecentChangesCard() {
  return (
    <article className={styles.changesRailCard}>
      <div className={styles.railCardHeader}>
        <h2>Recent Changes</h2>
      </div>
      <div className={styles.changeList}>
        {recentChanges.map((change) => (
          <div className={styles.changeItem} key={change.title}>
            <span>
              <strong>{change.title}</strong>
              <small>{change.detail}</small>
            </span>
            <time>{change.time}</time>
          </div>
        ))}
      </div>
    </article>
  );
}

function QuickNotesCard() {
  return (
    <article className={styles.notesRailCard}>
      <h2>Quick note</h2>
      <div className={styles.quickNoteList}>
        {quickNotes.map((note) => (
          <div className={styles.quickNoteItem} key={note.note}>
            <strong>{note.note}</strong>
            <time>{note.time}</time>
          </div>
        ))}
      </div>
      <label className={styles.quickNoteComposer}>
        <span className="sr-only">Add a quick note</span>
        <input placeholder="Add a quick note..." type="text" />
        <button aria-label="Send quick note" type="button">
          <AppIcon name="send" />
        </button>
      </label>
    </article>
  );
}

function ResearchAssistantCard() {
  return (
    <article className={styles.assistantRailCard}>
      <h2>Research Assistant</h2>
      <p>
        <strong>Hi Tue Linh 👋</strong>
        <span>Ask me anything about your project, papers, or next steps.</span>
      </p>
      <div className={styles.assistantActions}>
        {assistantActions.map((action) => (
          <button key={action} type="button">
            <AppIcon name="target" />
            {action}
          </button>
        ))}
      </div>
      <label className={styles.assistantInput}>
        <span className="sr-only">Ask Research Assistant</span>
        <input placeholder="Ask anything..." type="text" />
        <AppIcon name="arrow-right" />
      </label>
    </article>
  );
}

function ResearchDeskFoundation() {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0].id);
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const [activeTab, setActiveTab] = useState<ProjectTabId>(selectedProject.activeTab);

  function handleSelectProject(project: ResearchProject) {
    setSelectedProjectId(project.id);
    setActiveTab(project.activeTab);
  }

  return (
    <div className={styles.foundationCanvas}>
      <header className={styles.foundationHeader}>
        <div>
          <p className={styles.headerEyebrow}>Project</p>
          <h1>Research Desk</h1>
          <p className={styles.headerSubtitle}>
            Your local-first research workspace for projects, evidence, and next steps.
          </p>
        </div>
        <div className={styles.foundationActions}>
          <button className={styles.secondaryAction} type="button">
            <AppIcon name="upload" />
            Export report
          </button>
          <button className={styles.darkAction} type="button">
            <AppIcon name="settings" />
            Report settings
          </button>
        </div>
      </header>

      <section className={styles.deskBodyGrid}>
        <div className={styles.leftWorkspace}>
          <section className={styles.statsRow}>
            {stats.map((stat) => (
              <article className={styles.statCard} key={stat.label}>
                <span className={stat.success ? styles.successIconCircle : styles.statIconCircle}>
                  <AppIcon name={stat.icon} />
                </span>
                <div>
                  <h2>{stat.label}</h2>
                  <strong className={stat.success ? styles.successText : undefined}>{stat.value}</strong>
                  <p>{stat.detail}</p>
                </div>
              </article>
            ))}
          </section>
          <div className={styles.topWorkGrid}>
            <ProjectsCard onSelectProject={handleSelectProject} selectedProjectId={selectedProject.id} />
            <ProjectOverviewCard activeTab={activeTab} onTabChange={setActiveTab} project={selectedProject} />
            <SynthesisFunnelCard />
          </div>
          <EvidenceLibraryCard />
        </div>
        <aside className={styles.rightRailZone}>
          <UpcomingNextStepsCard />
          <RecentChangesCard />
          <QuickNotesCard />
          <ResearchAssistantCard />
        </aside>
      </section>
    </div>
  );
}

export default function ResearchDeskPage() {
  return (
    <AppShell contentClassName={styles.researchDeskMain}>
      <div className={styles.researchDeskViewport} aria-label="Research Desk">
        <div className={styles.researchDeskStage}>
          <ResearchDeskFoundation />
        </div>
      </div>
    </AppShell>
  );
}
