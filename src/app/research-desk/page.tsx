"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/app-shell/AppShell";
import { AppIcon } from "@/components/app-shell/AppIcons";
import Spinner from "@/components/ui/Spinner";
import { useUser } from "@/hooks/useUser";
import { useResearchDeskData, type ResearchDeskSourceData } from "@/hooks/useResearchDeskData";
import { useEvidenceLibrary } from "@/hooks/useEvidenceLibrary";
import type { EvidenceLibraryRow } from "@/lib/research/evidenceLibrary";
import { buildAssistantContext } from "@/lib/research/assistantContext";
import { readApiResponse } from "@/lib/utils/readApiResponse";
import {
  buildFunnelData,
  buildNextSteps,
  buildPortfolioStats,
  buildProjectOverviews,
  buildRecentChanges,
  computeProjectPhase,
  formatRelativeTime,
  type FunnelData,
  type NextStep,
  type ProjectOverview,
  type ProjectPhase,
  type ProjectTabId,
  type RecentChange,
} from "@/lib/research/researchDeskDerive";
import type { DashboardTask } from "@/lib/dashboard/deriveDashboardState";
import type { Project } from "@/types/project";
import styles from "./page.module.css";

const projectTabs: Array<{ id: ProjectTabId; label: string }> = [
  { id: "literature-review", label: "Literature Review" },
  { id: "meta-analysis", label: "Meta-analysis" },
  { id: "workspace", label: "Workspace" },
  { id: "draft", label: "Draft" },
  { id: "citations", label: "Citations" },
];

function scopedProjectRows<T extends { project_id: string | null }>(rows: T[], projectId: string) {
  return rows.filter((row) => row.project_id === projectId);
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

function SelectedProjectShape() {
  return (
    <svg
      aria-hidden="true"
      className={styles.selectedProjectShape}
      preserveAspectRatio="none"
      viewBox="0 0 344 96"
    >
      <path d="M18 0 H286 C299 0 307 7 307 20 V26 C307 34 312 38 323 38 H331 C339 38 344 43 344 48 C344 53 339 58 331 58 H323 C312 58 307 62 307 70 V76 C307 89 299 96 286 96 H18 C7 96 0 89 0 76 V20 C0 7 7 0 18 0 Z" />
    </svg>
  );
}

function badgeClassName(phase: ProjectPhase["badgeClass"]) {
  if (phase === "warm") return styles.warmBadge;
  if (phase === "green") return styles.greenBadge;
  if (phase === "blue") return styles.blueBadge;
  return styles.neutralBadge;
}

function ProjectsCard({
  data,
  onSelectProject,
  projects,
  selectedProjectId,
}: {
  data: ResearchDeskSourceData;
  onSelectProject: (project: Project) => void;
  projects: Project[];
  selectedProjectId: string;
}) {
  const router = useRouter();

  return (
    <article className={styles.projectsZone}>
      <div className={styles.cardHeader}>
        <h2>Projects</h2>
        <button className={styles.miniButton} onClick={() => router.push("/dashboard")} type="button">
          + New
        </button>
      </div>

      <div className={styles.projectList}>
        {projects.map((project) => {
          const active = project.id === selectedProjectId;
          const litRows = scopedProjectRows(data.literatureEntries, project.id);
          const pdfs = scopedProjectRows(data.pdfs, project.id);
          const paperSections = scopedProjectRows(data.paperSections, project.id);
          const metaAnalysis = data.metaAnalyses.find((meta) => meta.project_id === project.id) ?? null;
          const phase = computeProjectPhase({ pdfs, literatureEntries: litRows, metaAnalysis, paperSections });
          const meta = `Updated ${formatRelativeTime(project.updated_at)} · ${litRows.length} rows · ${pdfs.length} papers`;

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
                <span className={styles.projectTitle}>{project.name}</span>
                <span className={`${styles.projectBadge} ${badgeClassName(phase.badgeClass)}`}>{phase.label}</span>
                <span className={styles.projectMeta}>{meta}</span>
                <ProjectProgress progress={phase.progressPercent} />
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
              <span className={styles.projectTitle}>{project.name}</span>
              <span className={`${styles.projectBadge} ${badgeClassName(phase.badgeClass)}`}>{phase.label}</span>
              <span className={styles.projectMeta}>{meta}</span>
              <ProjectProgress progress={phase.progressPercent} />
            </button>
          );
        })}
      </div>
    </article>
  );
}

function ProjectOverviewCard({
  activeTab,
  guidance,
  onTabChange,
  overview,
  project,
  todayTasks,
}: {
  activeTab: ProjectTabId;
  guidance: string | null;
  onTabChange: (tab: ProjectTabId) => void;
  overview: ProjectOverview;
  project: Project;
  todayTasks: DashboardTask[];
}) {
  const router = useRouter();
  const visibleTasks = todayTasks.slice(0, 4);

  return (
    <article className={styles.overviewZone}>
      <div className={styles.overviewHeader}>
        <h2>Project Overview</h2>
        <span className={styles.projectSelectButton}>
          {project.name}
          <AppIcon name="chevron-down" />
        </span>
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
            <button onClick={() => router.push(overview.ctaHref)} type="button">
              {overview.ctaLabel}
            </button>
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

        <div className={styles.overviewTasksPanel}>
          <div className={styles.overviewTasksHeader}>
            <span>Today&apos;s tasks</span>
            <Link href="/dashboard/schedule">See today&apos;s plan →</Link>
          </div>

          {guidance ? (
            <p className={styles.overviewGuidance}>
              <span className={styles.overviewGuidanceLabel}>Personalized — from your recent activity</span>
              <span className={styles.overviewGuidanceText}>{guidance}</span>
            </p>
          ) : null}

          {visibleTasks.length === 0 ? (
            <p className={styles.railEmptyText}>
              No tasks generated yet today — open your dashboard to get today&apos;s plan.
            </p>
          ) : (
            <ul className={styles.overviewTaskList}>
              {visibleTasks.map((task) => {
                const done = task.status === "completed";
                return (
                  <li className={done ? `${styles.overviewTaskItem} ${styles.overviewTaskDone}` : styles.overviewTaskItem} key={task.id}>
                    <span aria-hidden="true" className={styles.overviewTaskTick}>
                      {done ? "✓" : ""}
                    </span>
                    {task.title}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </article>
  );
}

function SynthesisFunnelCard({ funnel }: { funnel: FunnelData }) {
  return (
    <article className={styles.funnelZone}>
      <div className={styles.funnelHeader}>
        <h2>Synthesis Funnel</h2>
        <p>Where progress narrows before drafting</p>
        <span>
          <i />
          {funnel.readyPercent}% coded
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
            <strong>{funnel.loaded}</strong>
            Loaded
          </span>
          <span>
            <strong>{funnel.coded}</strong>
            Coded
          </span>
          <span>
            <strong>{funnel.openRows}</strong>
            Open rows
          </span>
          <span className={funnel.activeStage === "meta-analysis" ? styles.activeFunnelLabel : undefined}>
            Meta-analysis
          </span>
          <span className={funnel.activeStage === "draft" ? styles.activeFunnelLabel : undefined}>Draft</span>
        </div>
      </div>

      <section className={styles.funnelAlert}>
        <div className={styles.alertTop}>
          <span>!</span>
          <p>
            <strong>Main blocker:</strong> {funnel.blockerText}
          </p>
        </div>
        <div className={styles.alertDivider} />
        <p className={styles.alertNext}>
          <strong>Next move:</strong> {funnel.nextMoveText}
        </p>
      </section>
    </article>
  );
}

const EVIDENCE_TABS: Array<{ id: "all" | "scholarask" | "upload"; label: string }> = [
  { id: "all", label: "Recent" },
  { id: "scholarask", label: "ScholarAsk" },
  { id: "upload", label: "Upload" },
];

function EvidenceLibraryRowActions({
  onDelete,
  onRetry,
  retrying,
  row,
}: {
  onDelete: () => void;
  onRetry: () => void;
  retrying: boolean;
  row: EvidenceLibraryRow;
}) {
  return (
    <span className={styles.evidenceRowActions}>
      {row.status === "failed" && row.pdf_id ? (
        <button className={styles.evidenceRetryButton} disabled={retrying} onClick={onRetry} type="button">
          {retrying ? "Retrying…" : "Retry"}
        </button>
      ) : null}
      <button aria-label={`Remove ${row.title} from your Evidence Library`} className={styles.evidenceDeleteButton} onClick={onDelete} type="button">
        ×
      </button>
    </span>
  );
}

function EvidenceCell({ row }: { row: EvidenceLibraryRow }) {
  if (row.status === "pending") return <span className={styles.evidencePending}>Analyzing…</span>;
  if (row.status === "failed") return <span className={styles.evidenceFailed}>Analysis unavailable</span>;
  return <>{row.evidence?.trim() || "—"}</>;
}

function EvidenceLibraryCard({
  loading,
  removeRow,
  retryRow,
  rows,
}: {
  loading: boolean;
  removeRow: (id: string) => Promise<boolean>;
  retryRow: (row: EvidenceLibraryRow) => Promise<{ error?: string; ok: boolean }>;
  rows: EvidenceLibraryRow[];
}) {
  const [filter, setFilter] = useState<"all" | "scholarask" | "upload">("all");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const visibleRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((row) => row.source === filter);
  }, [rows, filter]);

  async function handleRetry(row: EvidenceLibraryRow) {
    setRetryingId(row.id);
    await retryRow(row);
    setRetryingId(null);
  }

  return (
    <article className={styles.evidenceZone}>
      <div className={styles.evidenceHeader}>
        <div className={styles.evidenceTitleRow}>
          <h2>Evidence Library</h2>
        </div>
        <Link href="/research-desk/evidence-library">View full library →</Link>
      </div>

      <p className={styles.evidenceNote}>
        <span aria-hidden="true">ⓘ</span>
        Recent shows both ScholarAsk and Upload items — distinguish them by the Source column.
      </p>

      <nav className={styles.evidenceTabs} aria-label="Evidence library views">
        {EVIDENCE_TABS.map((tab) => (
          <button
            className={filter === tab.id ? styles.activeEvidenceTab : undefined}
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {!loading && visibleRows.length === 0 ? (
        <p className={styles.railEmptyText}>
          {filter === "all"
            ? "No evidence yet. Save a source from ScholarAsk or upload a PDF to see it here."
            : filter === "scholarask"
              ? "Nothing saved from ScholarAsk yet."
              : "No uploaded sources analyzed yet."}
        </p>
      ) : (
        <div className={styles.evidenceTableWrap}>
          <table className={`${styles.evidenceTable} ${styles.evidenceTableFixedRows}`}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Source</th>
                <th>Evidence</th>
                <th>Caveat</th>
                <th>Added</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>{row.doc_type || "—"}</td>
                  <td>
                    <span className={row.source === "scholarask" ? styles.scholarSource : styles.uploadSource}>
                      {row.source === "scholarask" ? "ScholarAsk" : "Upload"}
                    </span>
                  </td>
                  <td>
                    <EvidenceCell row={row} />
                  </td>
                  <td>{row.status === "ready" ? row.caveat?.trim() || "—" : "—"}</td>
                  <td>{formatRelativeTime(row.created_at)}</td>
                  <td>
                    <EvidenceLibraryRowActions
                      onDelete={() => void removeRow(row.id)}
                      onRetry={() => void handleRetry(row)}
                      retrying={retryingId === row.id}
                      row={row}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function UpcomingNextStepsCard({ steps }: { steps: NextStep[] }) {
  return (
    <article className={styles.focusRailCard}>
      <div className={styles.railCardHeader}>
        <h2>Next Steps</h2>
      </div>
      <div className={styles.focusList}>
        {steps.map((step) =>
          step.href ? (
            <Link className={styles.focusItem} href={step.href} key={step.id}>
              <strong>{step.title}</strong>
            </Link>
          ) : (
            <div className={styles.focusItem} key={step.id}>
              <strong>{step.title}</strong>
            </div>
          )
        )}
      </div>
      <Link className={`${styles.railLinkButton} ${styles.focusRailLink}`} href="/dashboard/schedule">
        View all tasks
        <AppIcon name="arrow-right" />
      </Link>
    </article>
  );
}

function RecentChangesCard({ changes }: { changes: RecentChange[] }) {
  return (
    <article className={styles.changesRailCard}>
      <div className={styles.railCardHeader}>
        <h2>Recent Changes</h2>
      </div>
      {changes.length === 0 ? (
        <p className={styles.railEmptyText}>No recent changes yet — start uploading sources or reviewing literature.</p>
      ) : (
        <div className={styles.changeList}>
          {changes.map((change) => (
            <div className={styles.changeItem} key={change.id}>
              <span>
                <strong>{change.title}</strong>
                {change.detail ? <small>{change.detail}</small> : null}
              </span>
              <time>{change.time}</time>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function QuickNotesCard({ mostRecentProjectId }: { mostRecentProjectId: string | null }) {
  return (
    <article className={styles.notesRailCard}>
      <h2>Quick Notes</h2>
      <p className={styles.railEmptyText}>
        Quick notes live inside each project&apos;s workspace, right alongside your PDFs and highlights.
      </p>
      {mostRecentProjectId ? (
        <Link className={styles.railLinkButton} href={`/dashboard/project/${mostRecentProjectId}`}>
          Open project workspace
          <AppIcon name="arrow-right" />
        </Link>
      ) : null}
    </article>
  );
}

type AssistantMessage = {
  content: string;
  kind?: "allowance" | "error";
  role: "assistant" | "user";
};

const ASSISTANT_STARTER_CHIPS = [
  "How is my research going?",
  "What should I do next?",
  "What does the synthesis funnel mean?",
];

function ResearchAssistantCard({
  data,
  evidenceRows,
  mostRecentProjectId,
}: {
  data: ResearchDeskSourceData;
  evidenceRows: EvidenceLibraryRow[];
  mostRecentProjectId: string | null;
}) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [lastHistory, setLastHistory] = useState<Array<{ content: string; role: string }>>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function runQuestion(question: string, history: Array<{ content: string; role: string }>) {
    setLoading(true);
    try {
      const context = buildAssistantContext(data, evidenceRows);
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "research_assistant", question, context, history }),
      });
      const payload = await readApiResponse<{ content?: string; error?: string }>(res);

      if (!res.ok || payload.error) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: payload.error || "Something went wrong. Please try again.",
            kind: res.status === 429 ? "allowance" : "error",
          },
        ]);
      } else {
        setMessages((current) => [...current, { role: "assistant", content: payload.content || "" }]);
      }
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "Couldn't reach the assistant — check your connection.", kind: "error" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSend(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const history = messages.slice(-6).map((message) => ({ role: message.role, content: message.content }));
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setInput("");
    setLastQuestion(trimmed);
    setLastHistory(history);
    void runQuestion(trimmed, history);
  }

  function handleRetry() {
    if (!lastQuestion) return;
    setMessages((current) => (current[current.length - 1]?.role === "assistant" ? current.slice(0, -1) : current));
    void runQuestion(lastQuestion, lastHistory);
  }

  const lastMessage = messages[messages.length - 1];

  return (
    <article className={styles.assistantRailCard}>
      <h2>Research Assistant</h2>

      {messages.length === 0 ? (
        <div className={styles.assistantActions}>
          {ASSISTANT_STARTER_CHIPS.map((chip) => (
            <button key={chip} onClick={() => handleSend(chip)} type="button">
              {chip}
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.assistantMessages} ref={listRef}>
          {messages.map((message, index) => (
            <div
              className={
                message.role === "user"
                  ? styles.assistantMessageUser
                  : message.kind
                    ? styles.assistantMessageAlert
                    : styles.assistantMessageBot
              }
              key={index}
            >
              {message.content}
              {message.kind === "allowance" ? (
                <Link className={styles.assistantInlineLink} href="/settings/ai">
                  Settings → AI
                </Link>
              ) : null}
            </div>
          ))}
          {loading ? (
            <div className={styles.assistantMessageBot}>
              <span className={styles.assistantLoadingDots}>
                <i />
                <i />
                <i />
              </span>
            </div>
          ) : null}
          {!loading && lastMessage?.kind === "error" ? (
            <button className={styles.assistantRetryButton} onClick={handleRetry} type="button">
              Retry
            </button>
          ) : null}
        </div>
      )}

      <form
        className={styles.assistantInput}
        onSubmit={(event) => {
          event.preventDefault();
          handleSend(input);
        }}
      >
        <input
          disabled={loading}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about your research…"
          value={input}
        />
        <button aria-label="Send" disabled={loading || !input.trim()} type="submit">
          <AppIcon name="arrow-right" />
        </button>
      </form>

      <p className={styles.assistantFooterNote}>
        Answers use your live portal data · Paper questions →{" "}
        {mostRecentProjectId ? (
          <Link href={`/dashboard/project/${mostRecentProjectId}/scholar-ask`}>ScholarAsk</Link>
        ) : (
          "ScholarAsk"
        )}
      </p>
    </article>
  );
}

function ResearchDeskFoundation({ data, userId }: { data: ResearchDeskSourceData; userId: string | null | undefined }) {
  const { projects } = data;
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<ProjectTabId>("literature-review");

  // Lifted here (rather than inside EvidenceLibraryCard) so the Research
  // Assistant card's snapshot can include real evidence-library counts
  // without mounting a second copy of the same Supabase query.
  const evidenceLibrary = useEvidenceLibrary(userId);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];

  const focusSettings = useMemo(
    () => (selectedProject ? data.projectSettings.find((row) => row.project_id === selectedProject.id) ?? null : null),
    [selectedProject, data.projectSettings]
  );

  const overviews = useMemo(
    () => (selectedProject ? buildProjectOverviews(selectedProject.id, data, focusSettings) : null),
    [selectedProject, data, focusSettings]
  );

  // Today's dashboard_tasks + cached Stage 2 guidance for whichever project is
  // currently focused (Project Overview card's "Today's tasks" panel) — same
  // real data the dashboard's schedule/insight cards read, just scoped down to
  // this one project client-side.
  const focusTodayTasks = useMemo(
    () => (selectedProject ? data.todayTasks.filter((task) => task.project_id === selectedProject.id) : []),
    [selectedProject, data.todayTasks]
  );
  const focusGuidance = useMemo(
    () => (selectedProject ? data.todayInsights.find((row) => row.project_id === selectedProject.id)?.guidance ?? null : null),
    [selectedProject, data.todayInsights]
  );

  const funnel = useMemo(
    () =>
      selectedProject && overviews
        ? buildFunnelData(selectedProject.id, data, overviews["literature-review"].nextStep)
        : null,
    [selectedProject, overviews, data]
  );

  const stats = useMemo(() => buildPortfolioStats(data), [data]);
  const nextSteps = useMemo(() => buildNextSteps(data), [data]);
  const recentChanges = useMemo(() => buildRecentChanges(data.activityEvents, projects), [data.activityEvents, projects]);

  const mostRecentProjectId = projects[0]?.id ?? null;
  const router = useRouter();

  if (!selectedProject || !overviews || !funnel) return null;

  return (
    <div className={styles.foundationCanvas}>
      <header className={styles.foundationHeader}>
        <div>
          <p className={styles.headerEyebrow}>Project</p>
          <h1>Research Desk</h1>
          <p className={styles.headerSubtitle}>
            Your research workspace for projects, evidence, and next steps.
          </p>
        </div>
        <div className={styles.foundationActions}>
          <button className={styles.singleAction} onClick={() => router.push("/dashboard")} type="button">
            <AppIcon name="plus" />
            New project
          </button>
        </div>
      </header>

      <section className={styles.deskBodyGrid}>
        <div className={styles.leftWorkspace}>
          <section className={styles.statsRow}>
            {stats.map((stat) => (
              <article className={styles.statCard} key={stat.label}>
                <span className={styles.statIconCircle}>
                  <AppIcon name={stat.icon} />
                </span>
                <div>
                  <h2>{stat.label}</h2>
                  <strong>{stat.value}</strong>
                  <p>{stat.detail}</p>
                </div>
              </article>
            ))}
          </section>
          <div className={styles.topWorkGrid}>
            <ProjectsCard
              data={data}
              onSelectProject={(project) => {
                setSelectedProjectId(project.id);
              }}
              projects={projects}
              selectedProjectId={selectedProject.id}
            />
            <ProjectOverviewCard
              activeTab={activeTab}
              guidance={focusGuidance}
              onTabChange={setActiveTab}
              overview={overviews[activeTab]}
              project={selectedProject}
              todayTasks={focusTodayTasks}
            />
            <SynthesisFunnelCard funnel={funnel} />
          </div>
          <EvidenceLibraryCard
            loading={evidenceLibrary.loading}
            removeRow={evidenceLibrary.removeRow}
            retryRow={evidenceLibrary.retryRow}
            rows={evidenceLibrary.rows}
          />
        </div>
        <aside className={styles.rightRailZone}>
          <UpcomingNextStepsCard steps={nextSteps} />
          <RecentChangesCard changes={recentChanges} />
          <QuickNotesCard mostRecentProjectId={mostRecentProjectId} />
          <ResearchAssistantCard
            data={data}
            evidenceRows={evidenceLibrary.rows}
            mostRecentProjectId={mostRecentProjectId}
          />
        </aside>
      </section>
    </div>
  );
}

function ResearchDeskEmptyState({ message, title }: { message: string; title: string }) {
  return (
    <div className={styles.foundationCanvas}>
      <header className={styles.foundationHeader}>
        <div>
          <p className={styles.headerEyebrow}>Project</p>
          <h1>Research Desk</h1>
          <p className={styles.headerSubtitle}>
            Your research workspace for projects, evidence, and next steps.
          </p>
        </div>
      </header>
      <div className={styles.emptyState}>
        <h2>{title}</h2>
        <p>{message}</p>
        <Link className={styles.emptyStateAction} href="/dashboard">
          Go to your Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function ResearchDeskPage() {
  const { user, loading: userLoading } = useUser();
  const { data, loading: dataLoading } = useResearchDeskData(user?.id);

  let body: ReactNode;

  // Only show the full-screen spinner on the very first load (no data yet).
  // A later background refetch (e.g. on window focus) keeps showing the
  // last-known data instead of blanking the page — derived directly from
  // props/state so no extra effect or ref is needed.
  if (userLoading || (dataLoading && data.projects.length === 0)) {
    body = (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  } else if (!user) {
    body = (
      <ResearchDeskEmptyState
        message="Sign in and create a project on your Dashboard to start building your Research Desk."
        title="Sign in to see your Research Desk"
      />
    );
  } else if (data.projects.length === 0) {
    body = (
      <ResearchDeskEmptyState
        message="Create your first project on your Dashboard — your projects, evidence, and next steps will show up here."
        title="No projects yet"
      />
    );
  } else {
    body = <ResearchDeskFoundation data={data} userId={user?.id} />;
  }

  return (
    <AppShell contentClassName={styles.researchDeskMain}>
      <div className={styles.researchDeskViewport} aria-label="Research Desk">
        <div className={styles.researchDeskStage}>{body}</div>
      </div>
    </AppShell>
  );
}
