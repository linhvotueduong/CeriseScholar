import { AppIcon } from "@/components/app-shell/AppIcons";
import { cn } from "@/lib/utils/cn";

type ProjectTone = "success" | "attention" | "blue" | "neutral";

type ResearchProject = {
  id: string;
  title: string;
  status: string;
  meta: string;
  progress: number;
  tone: ProjectTone;
};

type ResearchTab = {
  id: string;
  label: string;
  phase: string;
  description: string;
  nextStep: string;
  button: string;
  stats: string[][];
  progress: number;
};

const projectStatusToneClass: Record<ProjectTone, string> = {
  success: "bg-[#eef8ed] text-[#23651d]",
  attention: "bg-[#fff8e8] text-[#8a5b10]",
  blue: "bg-[#eef4ff] text-[#2457a6]",
  neutral: "bg-[#f3f1ee] text-[#4f4842]",
};

export default function ResearchProjectsOverviewCard({
  activeTab,
  className,
  onProjectChange,
  onTabChange,
  phase,
  projects,
  selectedProject,
  tabs,
}: {
  activeTab: string;
  className?: string;
  onProjectChange: (projectId: string) => void;
  onTabChange: (tabId: string) => void;
  phase: ResearchTab;
  projects: ResearchProject[];
  selectedProject: ResearchProject;
  tabs: ResearchTab[];
}) {
  return (
    <section className={cn("research-projects-overview", className)}>
      <article className="research-projects-card">
        <div className="research-projects-header">
          <h2>Projects</h2>
          <button type="button">+ New</button>
        </div>

        <div className="research-projects-list">
          {projects.map((project) => {
            const active = project.id === selectedProject.id;

            return (
              <button
                className={cn("research-project-row", active && "research-project-row-active")}
                key={project.id}
                onClick={() => onProjectChange(project.id)}
                type="button"
              >
                <span className="research-project-row-top">
                  <span className="research-project-title">{project.title}</span>
                  <span className={cn("research-project-status", projectStatusToneClass[project.tone])}>
                    {project.status}
                  </span>
                </span>
                <span className="research-project-meta">{project.meta}</span>
                <span className="research-project-progress">
                  <span>
                    <span style={{ width: `${project.progress}%` }} />
                  </span>
                  <strong>{project.progress}%</strong>
                </span>
              </button>
            );
          })}
        </div>

        <button className="research-archive-button" type="button">
          View archived projects
        </button>
      </article>

      <article className="research-overview-card">
        <div className="research-overview-header">
          <h2>Project Overview</h2>
          <select
            aria-label="Selected project"
            onChange={(event) => onProjectChange(event.target.value)}
            value={selectedProject.id}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </div>

        <div className="research-overview-tabs">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? "active" : undefined}
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="research-overview-surface">
          <div className="research-overview-columns">
            <div>
              <p className="research-overview-kicker">Current phase</p>
              <h3>{phase.phase}</h3>
              <p className="research-overview-copy">{phase.description}</p>
            </div>
            <div className="research-overview-next">
              <p className="research-overview-kicker">Next step</p>
              <p className="research-overview-copy">{phase.nextStep}</p>
              <button type="button">{phase.button} -&gt;</button>
            </div>
          </div>

          <div className="research-overview-stats">
            {phase.stats.map(([label, value], index) => (
              <div key={label}>
                <AppIcon
                  className="h-4 w-4 text-[#625a52]"
                  name={index === 0 ? "file" : index === 1 ? "list" : index === 2 ? "clock" : "book"}
                />
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="research-overview-progress">
            <span>
              <span style={{ width: `${phase.progress}%` }} />
            </span>
            <strong>{phase.progress}% complete</strong>
          </div>
        </div>
      </article>
    </section>
  );
}
