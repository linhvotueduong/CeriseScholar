import type { CSSProperties } from "react";
import { AppIcon, type AppIconName } from "@/components/app-shell/AppIcons";
import { cn } from "@/lib/utils/cn";

const sections: Array<{
  icon: AppIconName;
  label: string;
  progress: number;
  tone: "rose" | "blue" | "amber" | "green" | "purple";
}> = [
  { icon: "target", label: "Meta-analysis", progress: 72, tone: "rose" },
  { icon: "file", label: "Literature Review Table", progress: 58, tone: "blue" },
  { icon: "folder", label: "Workspace", progress: 41, tone: "amber" },
  { icon: "edit", label: "Paper Draft", progress: 22, tone: "rose" },
  { icon: "book-open", label: "Citations", progress: 80, tone: "green" },
  { icon: "list", label: "Notes", progress: 34, tone: "purple" },
];

const stats = [
  ["26", "Papers loaded"],
  ["18", "Coded so far"],
  ["8", "Remaining"],
  ["14", "Highlights"],
];

export default function DashboardResearchBridgeBlock({ className }: { className?: string }) {
  return (
    <section className={cn("dashboard-research-bridge-block", className)}>
      <div className="drb-header">
        <div className="drb-left-heading">
          <h2>Research Sections</h2>
          <button type="button">Today v</button>
        </div>
        <h2>Section Details</h2>
      </div>

      <div className="drb-body">
        <div className="drb-left">
          {sections.map((section, index) => (
            <button
              className={cn("drb-row", index === 0 && "drb-row-active", `drb-row-${section.tone}`)}
              key={section.label}
              type="button"
            >
              <span className="drb-row-main">
                <span className="drb-row-icon">
                  <AppIcon className="h-5 w-5" name={section.icon} />
                </span>
                <span>{section.label}</span>
              </span>
              <span className="drb-row-progress">{section.progress}%</span>
            </button>
          ))}
        </div>

        <div className="drb-right">
          <div className="drb-detail-panel" style={{ "--drb-progress": "72%" } as CSSProperties}>
            <div className="drb-detail-heading">
              <h3>Meta-analysis</h3>
              <span>In progress</span>
            </div>

            <div className="drb-progress-line">
              <p>Progress</p>
              <div className="drb-progress-track">
                <div />
              </div>
              <strong>72%</strong>
            </div>

            <div className="drb-next-step">
              <p>Next step</p>
              <strong>Review model assumptions before adding another analytics chart.</strong>
            </div>

            <div className="drb-stats">
              {stats.map(([value, label]) => (
                <div key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
