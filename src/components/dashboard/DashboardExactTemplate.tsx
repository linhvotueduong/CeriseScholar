"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import type { AppIconName } from "@/components/app-shell/AppIcons";
import DashboardResearchSectionsExact from "@/components/dashboard/DashboardResearchSectionsExact";
import { dashboardContinueLearning } from "@/lib/app-data/dashboard";
import type { DashboardDerivedState, DashboardSectionId, DashboardTask } from "@/lib/dashboard/deriveDashboardState";
import type { Project } from "@/types/project";

type DashboardExactTemplateProps = {
  activeProject: Project;
  agentReady: boolean;
  creating: boolean;
  localAgentChecking: boolean;
  newDesc: string;
  newName: string;
  ollamaReady: boolean;
  onCreateProject: (event: FormEvent) => void;
  onNewDescChange: (value: string) => void;
  onNewNameChange: (value: string) => void;
  onProjectChange: (projectId: string) => void;
  onToggleCreate: () => void;
  onToggleSection: (sectionId: string) => void;
  onAddScheduleTask?: () => void;
  onCompleteTask?: (taskId: string) => void;
  onOpenResearchSection?: (sectionId: DashboardSectionId) => void;
  dashboardData?: DashboardDerivedState;
  dashboardError?: string | null;
  dashboardLoading?: boolean;
  projectOptions: Project[];
  safetyReady: boolean;
  showCreate: boolean;
  visibleSections: Set<string>;
};

const calendarDays = [
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
  "SU",
  "29",
  "30",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
  "1",
  "2",
];

const scheduleItems = [
  ["09:00", "Literature review sprint", "Rows 13-26", "edit"],
  ["10:30", "Evidence connection", "Synthesis table", "workflow"],
  ["13:00", "Source note cleanup", "Add notes & tags", "file"],
  ["15:00", "Project check-in", "Review next steps", "edit"],
] as const;

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`rounded-[12px] border border-[#e8e3dc] bg-white ${className}`}>
      {children}
    </article>
  );
}

function TodayTargetCard({ data }: { data?: DashboardDerivedState["todayTarget"] }) {
  const target = data?.target ?? 6;
  const done = data?.done ?? 3;
  const remaining = data?.remaining ?? 3;

  return (
    <Card className="h-[186px] p-[14px]">
      <p className="text-[13px] font-[850] text-[#111111]">Today&apos;s Target</p>
      <div className="mt-[18px] flex items-center gap-3">
        <span className="cerise-target-ring-shell relative flex h-[36px] w-[36px] items-center justify-center rounded-full">
          <span className="cerise-target-ring-fill absolute h-[25px] w-[25px] rounded-full" />
          <span className="cerise-target-ring-center h-[9px] w-[9px] rounded-full" />
        </span>
        <div>
          <p className="text-[20px] font-[850] leading-none text-[#b6844e]">{target}%</p>
          <p className="text-[11px] font-[750] text-[#111111]">to keep pace</p>
        </div>
      </div>
      <div className="mt-[18px] grid gap-[7px] text-[12px] text-[#111111]">
        <p>
          <strong>{done}%</strong> <span className="font-[650] text-[#59524c]">done</span>
        </p>
        <p>
          <strong>{remaining}%</strong> <span className="font-[650] text-[#59524c]">remaining</span>
        </p>
      </div>
    </Card>
  );
}

function sparklinePoints(values: number[]) {
  const series = values.length > 0 ? values : [2, 3, 3, 5, 4, 5, 5];
  const max = Math.max(1, ...series);
  const min = Math.min(...series);
  const spread = Math.max(1, max - min);
  return series.map((value, index) => {
    const x = 7 + index * (44 / Math.max(1, series.length - 1));
    const y = 39 - ((value - min) / spread) * 23;
    return { x, y };
  });
}

function WeeklyActivitySparkline({ values }: { values: number[] }) {
  const points = sparklinePoints(values);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");

  return (
    <span className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[12px] border border-[#eadcc5] bg-[#fffaf2]">
      <svg aria-hidden="true" className="h-[42px] w-[44px]" viewBox="0 0 58 48">
        <path d="M4 14H54" stroke="#eadcc5" strokeDasharray="4 6" strokeLinecap="round" strokeWidth="1.6" />
        <path d="M4 25H54" stroke="#eadcc5" strokeDasharray="4 6" strokeLinecap="round" strokeWidth="1.6" />
        <path d="M4 36H54" stroke="#eadcc5" strokeDasharray="4 6" strokeLinecap="round" strokeWidth="1.6" />
        <path d={path} fill="none" stroke="#d19a2f" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {points.map((point) => (
          <circle cx={point.x} cy={point.y} fill="#d19a2f" key={`${point.x}-${point.y}`} r="3.2" />
        ))}
      </svg>
    </span>
  );
}

function AnalyticsStack({ data }: { data?: DashboardDerivedState["analytics"] }) {
  const weeklyActivity = data?.weeklyActivity ?? 58;
  const weeklyDelta = data?.weeklyDelta ?? 5;
  const weeklySeries = data?.weeklySeries ?? [2, 3, 3, 5, 4, 5, 5];
  const totalProgress = data?.totalProgress ?? 64;
  const totalDelta = data?.totalDelta ?? 4;
  const totalProgressArc = Math.round((totalProgress / 100) * 151);

  return (
    <div className="grid h-[186px] grid-rows-[88px_88px] gap-[10px]">
      <article className="h-full rounded-[12px] border border-[#eadcc5] bg-white px-[12px] py-[10px]">
        <div className="flex h-full items-center gap-[12px]">
          <WeeklyActivitySparkline values={weeklySeries} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-[850] leading-tight text-[#111111]">Weekly activity</p>
              <span className="inline-flex h-[18px] items-center gap-[2px] rounded-full bg-[#edf4e8] px-[6px] text-[8.5px] font-[850] text-[#5f7d4d]">
                <span className="text-[10px] leading-none">↗</span>
                +{weeklyDelta}%
              </span>
            </div>
            <p className="mt-[4px] text-[17px] font-[850] leading-none text-[#151515]">{weeklyActivity}%</p>
            <p className="mt-[3px] truncate text-[9px] font-[550] text-[#6b6762]">Compared with last week</p>
          </div>
        </div>
      </article>
      <article className="h-full rounded-[12px] border border-[#eadcc5] bg-white px-[12px] py-[10px]">
        <div className="flex h-full items-center gap-[12px]">
          <span className="relative flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full">
            <svg aria-hidden="true" className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 58 58">
              <circle cx="29" cy="29" fill="none" r="24" stroke="#eadfce" strokeWidth="6" />
              <circle cx="29" cy="29" fill="none" r="24" stroke="#b6844e" strokeDasharray={`${totalProgressArc} 151`} strokeLinecap="round" strokeWidth="6" />
            </svg>
            <span className="relative text-[13px] font-[850] text-[#151515]">{totalProgress}%</span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-[850] leading-tight text-[#111111]">Total progress</p>
              <span className="inline-flex h-[18px] items-center gap-[2px] rounded-full bg-[#edf4e8] px-[6px] text-[8.5px] font-[850] text-[#5f7d4d]">
                <span className="text-[10px] leading-none">↗</span>
                +{totalDelta}%
              </span>
            </div>
            <p className="mt-[4px] text-[14px] font-[850] leading-none text-[#151515]">{totalProgress}% this week</p>
            <p className="mt-[5px] flex items-center gap-[4px] text-[9px] font-[550] text-[#6b6762]">
              <span className="flex h-[11px] w-[11px] items-center justify-center rounded-full bg-[#b6844e] text-white">
                <svg aria-hidden="true" className="h-[7px] w-[7px] fill-none stroke-current stroke-[2.4]" viewBox="0 0 12 12">
                  <path d="m2 6.2 2.4 2.4L10 3" />
                </svg>
              </span>
              On pace this week
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}

function ResearchFocusCard({
  compact = false,
  data,
  onStartNextMove,
}: {
  compact?: boolean;
  data?: DashboardDerivedState["researchFocus"];
  onStartNextMove?: () => void;
}) {
  const healthRows = (data?.health ?? [
    { label: "Evidence balance", value: "Good", tone: "green" as const },
    { label: "Citation coverage", value: "Needs work", tone: "amber" as const },
    { label: "Theme clarity", value: "Strong", tone: "green" as const },
    { label: "Draft readiness", value: "In progress", tone: "purple" as const },
  ]).map((row, index) => {
    const icon = (["shield", "file", "lightbulb", "edit"] as const)[index];
    const tone =
      row.tone === "green"
        ? ["bg-[#edf4e8] text-[#4f6f3d]", "bg-[#6f8b5b]", "bg-[#f3f0eb] text-[#6f6a64]"]
        : row.tone === "amber"
          ? ["bg-[#f6ead8] text-[#8f6132]", "bg-[#b6844e]", "bg-[#f3f0eb] text-[#6f6a64]"]
          : ["bg-[#f3f0eb] text-[#6f6a64]", "bg-[#8f8275]", "bg-[#f3f0eb] text-[#6f6a64]"];
    return [icon, row.label, row.value, tone[0], tone[1], tone[2]] as const;
  }) satisfies ReadonlyArray<readonly [AppIconName, string, string, string, string, string]>;

  return (
    <Card className={`${compact ? "h-[306px] px-[10px] pb-[9px] pt-[13px]" : "h-[318px] px-[12px] pb-[10px] pt-[17px]"} min-w-0`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className={`${compact ? "text-[13px]" : "mt-[2px] text-[14px]"} whitespace-nowrap font-[850] leading-none`}>Research Focus</h2>
        <button
          className={`${compact ? "h-[21px] px-[4px] text-[8px]" : "-mt-[8px] h-[23px] px-[5px] text-[9px]"} inline-flex shrink-0 items-center justify-center gap-[4px] rounded-[6px] border border-[#e0cdb8] bg-white font-[850] text-[#17120d]`}
          onClick={onStartNextMove}
          type="button"
        >
          <AppIcon className={`${compact ? "h-[8px] w-[8px]" : "h-[9px] w-[9px]"} text-[#6b3f16]`} name="play" />
          Start next move
        </button>
      </div>

      <div className={`${compact ? "mt-[9px] px-[9px] py-[7px]" : "mt-[12px] px-[10px] py-[8px]"} rounded-[9px] border border-[#e8d8c6] bg-[#fbf6ef]`}>
        <p className={`${compact ? "text-[9px]" : "text-[9.5px]"} font-[850] leading-none text-[#8f6132]`}>Recommended</p>
        <p className={`${compact ? "mt-[4px] text-[9.5px] leading-[1.3]" : "mt-[5px] text-[10.5px] leading-[1.35]"} font-[650] text-[#17120d]`}>
          {data?.recommended ?? "Review model assumptions before adding another analytics chart."}
        </p>
      </div>

      <h3 className={`${compact ? "mt-[10px] text-[12px]" : "mt-[11px] text-[13px]"} font-[850] leading-none`}>Health check</h3>
      <div className={`${compact ? "mt-[6px]" : "mt-[7px]"} grid`}>
        {healthRows.map(([icon, label, value, toneClass, dotClass, iconClass]) => (
          <div className={`${compact ? "h-[27px] gap-[7px]" : "h-[29px] gap-[9px]"} flex items-center border-b border-[#eeeae5]`} key={label}>
            <span className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full ${iconClass}`}>
              <AppIcon className="h-[11px] w-[11px]" name={icon} />
            </span>
            <span className={`${compact ? "text-[9.5px]" : "text-[10.5px]"} min-w-0 flex-1 truncate font-[750] text-[#17120d]`}>{label}</span>
            <span className={`${compact ? "h-[17px] px-[6px] text-[7.5px]" : "h-[18px] px-[8px] text-[8px]"} inline-flex items-center gap-[5px] rounded-full font-[800] ${toneClass}`}>
              <span className={`h-[5px] w-[5px] rounded-full ${dotClass}`} />
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className={`${compact ? "mt-[9px] gap-[6px]" : "mt-[11px] gap-[8px]"} grid grid-cols-2`}>
        <div className={`${compact ? "h-[36px] gap-[6px] px-[7px]" : "h-[39px] gap-[7px] px-[8px]"} flex items-center rounded-[9px] bg-[#fff8ef]`}>
          <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#fff0dd]">
            <AppIcon className="h-[13px] w-[13px] text-[#8f5d24]" name="search" />
          </span>
          <div className="min-w-0">
            <p className={`${compact ? "text-[9px]" : "text-[10px]"} truncate font-[850] leading-tight`}>Watch point</p>
            <p className="mt-[2px] text-[8.5px] font-[550] leading-tight text-[#17120d]">{data?.watchPoint ?? "Notes in 3 papers."}</p>
          </div>
        </div>
        <div className={`${compact ? "h-[36px] gap-[6px] px-[7px]" : "h-[39px] gap-[7px] px-[8px]"} flex items-center rounded-[9px] bg-[#f6f2eb]`}>
          <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#eee6da]">
            <AppIcon className="h-[13px] w-[13px] text-[#8f6132]" name="clock" />
          </span>
          <div className="min-w-0">
            <p className={`${compact ? "text-[10px]" : "text-[11px]"} truncate font-[850] leading-tight`}>{data?.estimatedTime ?? "25-35 min"}</p>
            <p className="mt-[2px] text-[8.5px] font-[550] leading-tight text-[#17120d]">Estimated time</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function TodayPlanCard({ compact = false, onAddTask }: { compact?: boolean; onAddTask?: () => void }) {
  return (
    <Card className={`${compact ? "h-[306px] p-[12px]" : "h-[362px] p-[16px]"} min-w-0`}>
      <div className="flex items-center justify-between">
        <h2 className={`${compact ? "text-[13px]" : "text-[14px]"} font-[850]`}>Today&apos;s Plan</h2>
        <button className="text-[14px] font-[850]" type="button">
          ...
        </button>
      </div>
      <div className={`${compact ? "mt-[14px] text-[12px]" : "mt-[17px] text-[13px]"} flex items-center justify-between font-[850]`}>
        <span>←</span>
        <span>May 2024</span>
        <span>→</span>
      </div>
      <div className={`${compact ? "mt-[13px] gap-x-[5px] gap-y-[10px] text-[10px]" : "mt-[16px] gap-x-[11px] gap-y-[13px] text-[11px]"} grid grid-cols-7 text-center font-[650] text-[#625a52]`}>
        {calendarDays.map((day, index) => (
          <span
            className={
              day === "15"
                ? `${compact ? "h-[21px] w-[21px]" : "h-[24px] w-[24px]"} flex items-center justify-center rounded-full bg-[#111111] text-white`
                : index > 6 && (day === "29" || day === "30" || day === "1" || day === "2")
                  ? "text-[#c2bbb5]"
                  : ""
            }
            key={`${day}-${index}`}
          >
            {day}
          </span>
        ))}
      </div>
      <button
        className={`${compact ? "mt-[16px] h-[31px] text-[10px]" : "mt-[22px] h-[36px] text-[12px]"} w-full rounded-[8px] border border-[#d8d3ce] font-[850]`}
        onClick={onAddTask}
        type="button"
      >
        + Add research task / checkpoint
      </button>
    </Card>
  );
}

function iconForTask(task: DashboardTask): AppIconName {
  if (task.section_id === "literature-review") return "edit";
  if (task.section_id === "workspace") return "file";
  if (task.section_id === "meta-analysis") return "workflow";
  return "edit";
}

function TodayScheduleCard({
  compact = false,
  tasks,
  onCompleteTask,
}: {
  compact?: boolean;
  tasks?: DashboardTask[];
  onCompleteTask?: (taskId: string) => void;
}) {
  const items = (tasks?.length ? tasks : scheduleItems.map(([time, title, body, icon], index) => ({
    id: `fixture-${index}`,
    scheduled_time: time,
    title,
    subtitle: body,
    section_id: icon,
    status: "pending",
  } as DashboardTask))).slice(0, 4);

  return (
    <Card className={`${compact ? "h-[306px] p-[12px]" : "h-[358px] p-[16px]"} min-w-0`}>
      <div className="flex items-center justify-between">
        <h2 className={`${compact ? "text-[13px]" : "text-[14px]"} font-[850]`}>Today&apos;s Schedule</h2>
        <button className={`${compact ? "px-2 py-1 text-[10px]" : "px-3 py-1 text-[11px]"} rounded-[8px] border border-[#d8d3ce] font-[850]`} type="button">
          All
        </button>
      </div>
      <div className={`${compact ? "mt-[12px] gap-[8px]" : "mt-[17px] gap-[10px]"} grid`}>
        {items.map((task) => (
          <div className={`${compact ? "grid-cols-[34px_1fr] gap-[7px]" : "grid-cols-[40px_1fr] gap-[9px]"} grid`} key={task.id}>
            <span className={`${compact ? "pt-[9px] text-[10px]" : "pt-[10px] text-[11px]"} font-[650] text-[#625a52]`}>{task.scheduled_time || "--"}</span>
            <button
              className={`${compact ? "min-h-[42px] gap-[7px] p-[7px]" : "min-h-[48px] gap-[10px] p-[8px]"} flex min-w-0 rounded-[8px] border border-[#eeeae5] bg-white text-left ${task.status === "completed" ? "opacity-65" : ""}`}
              onClick={() => onCompleteTask?.(task.id)}
              type="button"
            >
              <span className={`${compact ? "h-[27px] w-[27px]" : "h-[30px] w-[30px]"} flex shrink-0 items-center justify-center rounded-[7px] bg-[#f6f4f1]`}>
                <AppIcon className={`${compact ? "h-[14px] w-[14px]" : "h-[16px] w-[16px]"}`} name={iconForTask(task)} />
              </span>
              <div className="min-w-0">
                <p className={`${compact ? "text-[9.5px]" : "text-[11px]"} truncate font-[850] leading-tight`}>{task.title}</p>
                <p className={`${compact ? "mt-[2px] text-[8.5px]" : "mt-[3px] text-[10px]"} truncate font-[550] text-[#625a52]`}>{task.subtitle}</p>
              </div>
            </button>
          </div>
        ))}
      </div>
      <Link
        className={`${compact ? "mt-[11px] h-[31px] text-[10px]" : "mt-[14px] h-[35px] text-[11px]"} flex items-center justify-center rounded-[8px] border border-[#d8d3ce] font-[850] text-[#111111] no-underline`}
        href="/dashboard/schedule"
      >
        Open full schedule
      </Link>
    </Card>
  );
}

export default function DashboardExactTemplate(props: DashboardExactTemplateProps) {
  const {
    activeProject,
    agentReady,
    creating,
    localAgentChecking,
    newDesc,
    newName,
    ollamaReady,
    onCreateProject,
    onNewDescChange,
    onNewNameChange,
    onAddScheduleTask,
    onCompleteTask,
    onOpenResearchSection,
    onProjectChange,
    onToggleCreate,
    dashboardData,
    dashboardError,
    dashboardLoading,
    projectOptions,
    safetyReady,
    showCreate,
  } = props;
  const currentProject = dashboardData?.currentProject;
  const localSetup = dashboardData?.localSetup;
  const continueLearning = dashboardData?.continueLearning;
  const todayTasks = (dashboardData?.todayTaskLabels?.length
    ? dashboardData.todayTaskLabels
    : ["2 literature rows", "3 highlights", "1 synthesis paragraph"]).slice(0, 3);

  return (
    <div className="dashboard-exact-template w-full max-w-[1428px] font-sans text-[#111111]">
      <span className="sr-only">
        Current live project: {activeProject.name}. Project count: {projectOptions.length}. Agent status:
        {agentReady ? "ready" : localAgentChecking ? "checking" : "not ready"}. Ollama:
        {ollamaReady ? "ready" : "not ready"}. Safety: {safetyReady ? "ready" : "review"}.
        Dashboard data: {dashboardLoading ? "loading" : "loaded"}.
      </span>
      <div className="dashboard-exact-hero mb-[20px] flex items-end justify-between gap-6">
        <div className="pl-[6px]">
          <p className="mb-[8px] text-[12px] font-[850] text-[#a87f4f]">Dashboard</p>
          <h1 className="text-[31px] font-[850] leading-none tracking-[-0.03em]">Good Morning Cerise!</h1>
          <p className="mt-[11px] max-w-[555px] text-[13px] font-[500] leading-[1.42] text-[#3b342e]">
            Your main research project is waiting at the synthesis step. The useful move today is to
            turn existing evidence into writing, not open another analytics chart.
          </p>
        </div>
        <div className="grid w-[282px] translate-y-[10px] grid-cols-[168px_104px] gap-[10px] pb-[2px]">
          <Link
            className="inline-flex h-[39px] items-center justify-center whitespace-nowrap rounded-[9px] border border-[#d8d3ce] bg-white px-[12px] text-[11px] font-[800] text-[#111111] no-underline"
            href="/research-desk"
          >
            Open Research Desk
          </Link>
          <button
            className="h-[39px] whitespace-nowrap rounded-[9px] bg-[#111111] px-[10px] text-[11px] font-[800] text-white"
            onClick={onToggleCreate}
            type="button"
          >
            {showCreate ? "Close" : "+ New project"}
          </button>
        </div>
      </div>

      {showCreate ? (
        <form
          className="mb-3 grid gap-3 rounded-[12px] border border-[#e5e1dc] bg-white p-3 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={onCreateProject}
        >
          <input
            className="h-10 rounded-[8px] border border-[#d8d3ce] px-3 text-[13px]"
            onChange={(event) => onNewNameChange(event.target.value)}
            placeholder="Project name"
            required
            value={newName}
          />
          <input
            className="h-10 rounded-[8px] border border-[#d8d3ce] px-3 text-[13px]"
            onChange={(event) => onNewDescChange(event.target.value)}
            placeholder="Description"
            value={newDesc}
          />
          <button
            className="h-10 rounded-[8px] bg-[#111111] px-5 text-[13px] font-[800] text-white disabled:opacity-60"
            disabled={creating}
            type="submit"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
      ) : null}

      {dashboardError ? (
        <div className="mb-3 rounded-[10px] border border-[#e8d8c6] bg-[#fbf6ef] px-3 py-2 text-[12px] font-[700] text-[#8f6132]">
          Dashboard data is using safe fallback values. {dashboardError}
        </div>
      ) : null}

        <div className="dashboard-exact-grid grid grid-cols-1 gap-[22px] 2xl:grid-cols-[minmax(0,1124px)_282px]">
        <div className="min-w-0">
          <section className="dashboard-exact-top grid grid-cols-[210px_184px_180px_290px_220px] gap-[10px]">
            <Card className="h-[186px] p-[14px]">
              <p className="text-[13px] font-[850]">Current project</p>
              <div className="relative mt-[10px] flex h-[36px] items-center rounded-[8px] border border-[#e5e1dc] bg-white px-2.5 text-[10px] font-[850]">
                <select
                  aria-label="Current project"
                  className="h-full w-full appearance-none bg-transparent pr-5 font-[850] text-[#111111] !outline-none ring-0 focus:!outline-none focus:ring-0 focus-visible:!outline-none focus-visible:ring-0"
                  onChange={(event) => onProjectChange(event.target.value)}
                  value={activeProject.id}
                >
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <AppIcon className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 shrink-0" name="chevron-down" />
              </div>
      <p className="mt-[9px] inline-flex rounded-full bg-[#f6efe4] px-2 py-1 text-[9px] font-[850] text-[#8f6132]">
        {currentProject?.tag ?? "Literature sprint"}
      </p>
              <p className="mt-[10px] text-[11px] font-[600] text-[#625a52]">Current section</p>
              <p className="text-[13px] font-[850]">{currentProject?.currentSection ?? "Meta-analysis"}</p>
              <p className="mt-[5px] text-[11px] text-[#625a52]">{currentProject?.lastOpened ?? "Last opened 2h ago"}</p>
            </Card>

            <TodayTargetCard data={dashboardData?.todayTarget} />

            <Card className="h-[186px] p-[14px]">
              <p className="text-[13px] font-[850]">Today&apos;s Tasks</p>
              <div className="mt-[23px] grid gap-[15px] text-[12px] font-[800]">
                {todayTasks.map((task, index) => (
                  <div className="flex min-w-0 items-center gap-[10px]" key={`${task}-${index}`}>
                    <span className="flex h-[13px] w-[13px] items-center justify-center rounded-[3px] bg-[#b6844e]">
                      <svg aria-hidden="true" className="h-[9px] w-[9px] fill-none stroke-white stroke-[2.4]" viewBox="0 0 12 12">
                        <path d="m2 6.2 2.4 2.4L10 3" />
                      </svg>
                    </span>
                    <span className="min-w-0 leading-[1.18]">{task}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="h-[186px] p-[14px]">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[13px] font-[850] leading-tight">Local Setup</p>
                <span className="rounded-full bg-[#f6efe4] px-2.5 py-1 text-[10px] font-[850] leading-none text-[#8e6837]">{localSetup?.percent ?? 92}% ready</span>
              </div>
              <div className="mt-[16px] grid grid-cols-[minmax(0,1fr)_112px] gap-[14px]">
                <div className="min-w-0">
                  <p className="text-[18px] font-[850] leading-none">{localSetup?.readyCount ?? 4}/{localSetup?.totalCount ?? 4}</p>
                  <p className="mt-[4px] text-[11px] font-[650] text-[#625a52]">checks ready</p>
                  <div className="mt-[13px] h-[6px] rounded-full bg-[#e8e5e1]">
                    <div className="h-full rounded-full bg-[#d6ad6f]" style={{ width: `${localSetup?.percent ?? 92}%` }} />
                  </div>
                  <p className="mt-[9px] text-[10px] font-[650] text-[#625a52]">{localSetup?.summary ?? "Local agent and folder access are connected."}</p>
                </div>
                <div className="grid gap-[6px] text-[9px]">
                  {(localSetup?.checks ?? [["Agent", agentReady], ["Ollama", ollamaReady], ["Folder", agentReady], ["Safety", safetyReady]]).map(([label, ready]) => (
                    <div className="flex h-[24px] items-center justify-between rounded-[6px] bg-[#fbfaf7] px-[7px]" key={label}>
                      <span className="font-[650] text-[#625a52]">{label}</span>
                      <span className={`font-[850] ${ready ? "text-[#5f7d4d]" : "text-[#a87f4f]"}`}>{ready ? "Yes" : "Soon"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <AnalyticsStack data={dashboardData?.analytics} />
          </section>

          <section className="mt-[16px] grid grid-cols-1 gap-[14px] 2xl:grid-cols-[820px_290px]">
            <DashboardResearchSectionsExact onOpenSection={onOpenResearchSection} sections={dashboardData?.researchSections} />
            <div className="hidden 2xl:block">
              <ResearchFocusCard data={dashboardData?.researchFocus} onStartNextMove={() => onOpenResearchSection?.(dashboardData?.activeSectionId ?? "meta-analysis")} />
            </div>
          </section>

          <section className="mt-[14px] grid grid-cols-3 gap-[10px] 2xl:hidden">
            <ResearchFocusCard compact data={dashboardData?.researchFocus} onStartNextMove={() => onOpenResearchSection?.(dashboardData?.activeSectionId ?? "meta-analysis")} />
            <TodayPlanCard compact onAddTask={onAddScheduleTask} />
            <TodayScheduleCard compact onCompleteTask={onCompleteTask} tasks={dashboardData?.scheduleTasks} />
          </section>

          <section className="mt-[14px] grid grid-cols-[minmax(0,1fr)_220px] gap-[10px] 2xl:grid-cols-[820px_290px] 2xl:gap-[14px]">
            <Card className="h-[200px] p-[14px]">
              <div className="flex items-center gap-[18px]">
                <h2 className="shrink-0 text-[14px] font-[850] leading-none">Continue Learning</h2>
                <div className="h-px flex-1 bg-[#eeeae5]" />
              </div>

              <div className="mt-[13px] grid grid-cols-[104px_minmax(220px,1fr)_188px] gap-[12px] 2xl:grid-cols-[142px_minmax(0,1fr)_238px] 2xl:gap-[18px]">
                <div className="relative h-[104px] w-[104px] overflow-hidden rounded-[12px] bg-[#f2eadb] 2xl:h-[126px] 2xl:w-[126px]">
                  <Image
                    alt=""
                    className="object-contain p-[17px] 2xl:p-[20px]"
                    fill
                    sizes="126px"
                    src="/assets/hedgehogs/hedgehog11LitBook.png"
                  />
                </div>

                <div className="min-w-0 pt-[4px] 2xl:pt-[8px]">
                  <p className="text-[12.5px] font-[850] leading-[1.18] 2xl:text-[13px]">Current lesson - {continueLearning?.lesson ?? dashboardContinueLearning.lesson}</p>
                  <p className="mt-[7px] max-w-[330px] text-[10px] font-[550] leading-[1.4] text-[#3f3933] 2xl:mt-[9px] 2xl:max-w-[350px] 2xl:text-[10.5px] 2xl:leading-[1.42]">
                    {continueLearning?.body ?? "Learn how to code and connect evidence across studies, identify patterns, and build a strong synthesis table."}
                  </p>
                  <div className="mt-[8px] flex gap-[7px] 2xl:mt-[10px] 2xl:gap-[8px]">
                    <Link
                      className="inline-flex h-[30px] items-center gap-[7px] whitespace-nowrap rounded-[6px] bg-[#111111] px-[12px] text-[9.5px] font-[850] text-white no-underline 2xl:h-[31px] 2xl:gap-[8px] 2xl:px-[18px] 2xl:text-[10.5px]"
                      href="/courses/learn"
                    >
                      <AppIcon className="h-[12px] w-[12px]" name="play" />
                      Resume lesson
                    </Link>
                    <Link
                      className="inline-flex h-[30px] items-center gap-[7px] whitespace-nowrap rounded-[6px] border border-[#d8d3ce] px-[12px] text-[9.5px] font-[850] text-[#111111] no-underline 2xl:h-[31px] 2xl:gap-[8px] 2xl:px-[18px] 2xl:text-[10.5px]"
                      href="/my-learning/notes"
                    >
                      <AppIcon className="h-[12px] w-[12px]" name="list" />
                      View notes
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-4 content-start gap-0 pt-[5px] 2xl:pt-[7px]">
                  {(continueLearning?.stats ?? [
                    ["4", "Modules", "completed"],
                    ["12", "Lessons", "done"],
                    ["8", "Notes", "created"],
                    ["3", "Lessons", "remaining"],
                  ]).map(([value, label, suffix]) => (
                    <div className="flex h-[66px] flex-col items-center justify-start border-l border-[#eeeae5] px-[4px] text-center first:border-l-0 2xl:h-[70px] 2xl:px-[6px]" key={`${label}-${suffix}`}>
                      <p className="text-[16px] font-[850] leading-none 2xl:text-[18px]">{value}</p>
                      <p className="mt-[9px] text-[8.5px] font-[700] leading-[1.35] text-[#625a52] 2xl:mt-[10px] 2xl:text-[9px]">
                        {label}
                        <br />
                        {suffix}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-[8px] grid grid-cols-[104px_minmax(0,1fr)_40px_74px] items-center gap-x-[8px]">
                <span className="text-[10.5px] font-[850] leading-none text-[#625a52]">Course progress</span>
                <div className="h-[6px] flex-1 rounded-full bg-[#e8e5e1]">
                  <div className="h-full rounded-full bg-[#9c7443]" style={{ width: `${continueLearning?.progress ?? 68}%` }} />
                </div>
                <span className="text-right text-[11px] font-[850]">{continueLearning?.progress ?? 68}%</span>
                <span className="flex items-center justify-end gap-[6px] text-[11px] font-[850] text-[#5f7d4d]">
                  <span className="h-[7px] w-[7px] rounded-full bg-[#6f8b5b]" />
                  On pace
                </span>
              </div>
            </Card>

            <Card className="h-[200px] p-[14px]">
              <h2 className="text-[14px] font-[850]">Cerise Support</h2>
              <p className="mt-[13px] text-[11px] font-[500] leading-[1.45] text-[#625a52]">
                Get help with your research process, account, or using Cerise Scholar.
              </p>
              <div className="mt-[16px] grid gap-[9px]">
                <Link
                  className="inline-flex h-[33px] items-center justify-center rounded-[7px] bg-[#111111] text-[11px] font-[850] text-white no-underline"
                  href="/help/contact"
                >
                  Request support
                </Link>
                <Link
                  className="inline-flex h-[33px] items-center justify-center rounded-[7px] border border-[#d8d3ce] text-[11px] font-[850] text-[#111111] no-underline"
                  href="/help"
                >
                  Open Help Center
                </Link>
              </div>
            </Card>
          </section>
        </div>

        <aside className="hidden min-w-0 content-start gap-[14px] 2xl:grid">
          <TodayPlanCard onAddTask={onAddScheduleTask} />
          <TodayScheduleCard onCompleteTask={onCompleteTask} tasks={dashboardData?.scheduleTasks} />
        </aside>
      </div>

      <footer className="mt-[16px] flex flex-wrap items-center justify-between gap-3 text-[12px] font-[550] text-[#7a7168]">
        <p>© 2025 Cerise Scholar. All rights reserved.</p>
        <nav className="flex items-center gap-[36px]" aria-label="Dashboard footer">
          <Link className="text-[#4f4842] no-underline hover:text-[#111111]" href="/help/terms">
            Terms
          </Link>
          <Link className="text-[#4f4842] no-underline hover:text-[#111111]" href="/help/privacy">
            Privacy
          </Link>
          <Link className="text-[#4f4842] no-underline hover:text-[#111111]" href="/help">
            Help
          </Link>
        </nav>
      </footer>
    </div>
  );
}
