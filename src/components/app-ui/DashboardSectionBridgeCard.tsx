import type { CSSProperties } from "react";
import { AppIcon, type AppIconName } from "@/components/app-shell/AppIcons";
import { cn } from "@/lib/utils/cn";

type DashboardSectionTone = "rose" | "blue" | "amber" | "green" | "purple" | "neutral";

type DashboardSection = {
  id: string;
  label: string;
  progress: number;
  tone: DashboardSectionTone;
  title: string;
  status: string;
  nextStep: string;
  stats: string[][];
};

const sectionIconMap: Record<string, AppIconName> = {
  "Meta-analysis": "target",
  "Literature Review Table": "workflow",
  Workspace: "folder",
  "Paper Draft": "file",
  Citations: "book-open",
  Notes: "edit",
};

const badgeToneClass: Record<DashboardSectionTone, string> = {
  rose: "bg-[#f8d4e9] text-[#9f2d62]",
  blue: "bg-[#e8f1ff] text-[#2457a6]",
  amber: "bg-[#fff2d5] text-[#8a5b10]",
  green: "bg-[#e7f5e6] text-[#23651d]",
  purple: "bg-[#f0e5ff] text-[#6840a0]",
  neutral: "bg-[#f3f1ee] text-[#4f4842]",
};

export default function DashboardSectionBridgeCard({
  activeSection,
  activeSectionId,
  className,
  onSectionChange,
  sections,
}: {
  activeSection: DashboardSection;
  activeSectionId: string;
  className?: string;
  onSectionChange: (sectionId: string) => void;
  sections: DashboardSection[];
}) {
  const progressStyle = { "--dashboard-section-progress": `${activeSection.progress}%` } as CSSProperties;

  return (
    <section className={cn("dashboard-bridge-module", className)}>
      <div className="bridge-header">
        <div className="bridge-left-title">
          <h2>Research Sections</h2>
          <button type="button">Today v</button>
        </div>
        <h2>Section Details</h2>
      </div>

      <div className="dashboard-bridge-body bridge-body">
        <div className="section-list">
          {sections.map((section) => {
            const active = section.id === activeSectionId;

            return (
              <button
                className={cn("section-row", active && "section-row-active")}
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                type="button"
              >
                <span className="section-row-main">
                  <span className="section-row-icon">
                    <AppIcon className="h-5 w-5" name={sectionIconMap[section.label] || "list"} />
                  </span>
                  <span className="section-row-label">{section.label}</span>
                </span>
                <span className={cn("section-row-badge", badgeToneClass[section.tone])}>
                  {section.progress}%
                </span>
              </button>
            );
          })}
        </div>

        <div className="section-detail" style={progressStyle}>
          <div className="section-detail-heading">
            <h3>{activeSection.title}</h3>
            <span>{activeSection.status}</span>
          </div>

          <div className="section-detail-progress">
            <p>Progress</p>
            <div className="section-detail-progress-track">
              <div />
            </div>
            <strong>{activeSection.progress}%</strong>
          </div>

          <div className="section-detail-block">
            <p>Next step</p>
            <strong>{activeSection.nextStep}</strong>
          </div>

          <div className="section-detail-stats">
            {activeSection.stats.map(([label, value]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
