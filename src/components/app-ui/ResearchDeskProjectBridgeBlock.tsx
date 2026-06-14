import type { CSSProperties } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import { cn } from "@/lib/utils/cn";

const projects = [
  {
    title: "Environmental Uncertainty & Career Procrastination",
    status: "In progress",
    meta: "Updated 2h ago · 312 rows · 26 papers",
    progress: 72,
    tone: "attention",
  },
  {
    title: "AI Disruption & Academic Delay",
    status: "Literature review",
    meta: "Updated 1d ago · 184 rows · 18 papers",
    progress: 41,
    tone: "neutral",
  },
  {
    title: "I/O Psychology DLA Source Control",
    status: "Data extraction",
    meta: "Updated 2d ago · 128 rows · 12 papers",
    progress: 56,
    tone: "success",
  },
  {
    title: "Literature Review Foundations",
    status: "Drafting",
    meta: "Updated 3d ago · 96 rows · 9 papers",
    progress: 68,
    tone: "blue",
  },
];

const tabs = ["Literature Review", "Meta-analysis", "Workspace", "Draft", "Citations"];

const stats = [
  ["file", "26", "Papers reviewed"],
  ["list", "18", "Evidence rows"],
  ["clock", "8", "Rows remaining"],
  ["book", "312", "Total rows"],
] as const;

export default function ResearchDeskProjectBridgeBlock({ className }: { className?: string }) {
  return (
    <section className={cn("research-desk-project-bridge-block", className)}>
      <article className="rpb-left">
        <div className="rpb-left-header">
          <h2>Projects</h2>
          <button type="button">+ New</button>
        </div>

        <div className="rpb-list">
          {projects.map((project, index) => (
            <button
              className={cn("rpb-row", index === 0 && "rpb-row-active", `rpb-row-${project.tone}`)}
              key={project.title}
              type="button"
            >
              <span className="rpb-row-top">
                <span className="rpb-title">{project.title}</span>
                <span className="rpb-status">{project.status}</span>
              </span>
              <span className="rpb-meta">{project.meta}</span>
              <span className="rpb-progress">
                <span>
                  <span style={{ width: `${project.progress}%` }} />
                </span>
                <strong>{project.progress}%</strong>
              </span>
            </button>
          ))}
        </div>

        <button className="rpb-archive" type="button">
          View archived projects
        </button>
      </article>

      <article className="rpb-right">
        <div className="rpb-detail-panel" style={{ "--rpb-progress": "72%" } as CSSProperties}>
          <div className="rpb-header">
            <h2>Project Overview</h2>
            <select aria-label="Selected project" defaultValue="Environmental Uncertainty & Career Procrastination">
              <option>Environmental Uncertainty & Career Procrastination</option>
            </select>
          </div>

          <div className="rpb-tabs">
            {tabs.map((tab, index) => (
              <button className={index === 0 ? "active" : undefined} key={tab} type="button">
                {tab}
              </button>
            ))}
          </div>

          <div className="rpb-summary">
            <div>
              <p className="rpb-kicker">Current phase</p>
              <h3>Literature Review</h3>
              <p className="rpb-copy">
                You are extracting themes, evidence rows, and source notes from included papers.
              </p>
            </div>
            <div className="rpb-next">
              <p className="rpb-kicker">Next step</p>
              <p className="rpb-copy">
                Finish reviewing rows 19–26, then connect evidence into the synthesis table.
              </p>
              <button type="button">Continue literature review -&gt;</button>
            </div>
          </div>

          <div className="rpb-stats">
            {stats.map(([icon, value, label]) => (
              <div key={label}>
                <AppIcon className="h-4 w-4 text-[#625a52]" name={icon} />
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="rpb-total-progress">
            <span>
              <span />
            </span>
            <strong>72% complete</strong>
          </div>
        </div>
      </article>
    </section>
  );
}
