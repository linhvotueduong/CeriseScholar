"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import type { AppIconName } from "@/components/app-shell/AppIcons";
import DashboardResearchSectionsExact from "@/components/dashboard/DashboardResearchSectionsExact";
import {
  computeTodayTargetFromUiSettings,
  todayTargetModelToPaceSummary,
  type DashboardDerivedState,
  type DashboardSectionId,
  type DashboardTask,
} from "@/lib/dashboard/deriveDashboardState";
import {
  DASHBOARD_PACE_OPTIONS,
  getDashboardTargetPaceSummary,
  getDefaultDashboardTargetSettings,
  type DashboardTargetPaceSummary,
  type DashboardTargetSettings,
} from "@/lib/dashboard/targetPace";
import {
  EMPTY_RESEARCH_COUNTS,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPE_MODELS,
  PROJECT_TYPE_ORDER,
  type ProjectComplexity,
  type ProjectQuality,
  type ResearchCounts,
} from "@/lib/dashboard/todayTargetModel";
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
  onSectionFeedback?: (
    sectionId: DashboardSectionId,
    verdict: "too_high" | "about_right" | "too_low",
    details?: { suggestedPercent?: number | null; explanation?: string | null }
  ) => void;
  dashboardData?: DashboardDerivedState;
  dashboardError?: string | null;
  dashboardLoading?: boolean;
  /** True when any visible card is showing sample/demo content (shows the "Sample data" badge). */
  usingDemo?: boolean;
  /** Per-card sample flags so demo-filled cards (Schedule, Activity Log) show a tag. */
  demoCards?: { schedule?: boolean; activity?: boolean; research?: boolean; learning?: boolean };
  /** Signed-in display name (first name) for the greeting; empty falls back to a neutral greeting. */
  userName?: string;
  /** Persisted Today's Target settings (from useDashboardState). Falls back to a local default when omitted. */
  targetSettings?: DashboardTargetSettings;
  /** Persist Today's Target settings. When omitted, saves stay in local component state. */
  onSaveTargetSettings?: (settings: DashboardTargetSettings) => void;
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

// SVG ring arc circumference (r=36), used to bind the arc fill to ring progress.
const TARGET_RING_CIRCUMFERENCE = 2 * Math.PI * 36;

function TodayTargetCard({
  data,
  onOpenSettings,
  paceSummary,
}: {
  data?: DashboardDerivedState["todayTarget"];
  onOpenSettings: () => void;
  paceSummary: DashboardTargetPaceSummary;
}) {
  const target = data?.target ?? 6;
  const done = data?.done ?? 3;
  const remaining = data?.remaining ?? 3;
  // ringProgress = doneToday / dailyTarget. Use the model's precise value (the rounded
  // done/target can mislead at tiny 1% targets); fall back to the ratio only if absent.
  const ringProgress = data?.ringProgress ?? (target > 0 ? Math.max(0, Math.min(1, done / target)) : 1);

  return (
    <Card className="h-[186px] p-[14px]">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[13px] font-[850] text-[#111111]">Today&apos;s Target</p>
        <button
          aria-label="Adjust deadline or pace"
          className="inline-flex h-[22px] w-[18px] shrink-0 flex-col items-center justify-center gap-[2px] rounded-full text-[#4d4944] transition hover:bg-[#f4f2ef]"
          onClick={onOpenSettings}
          type="button"
        >
          <span className="h-[2.5px] w-[2.5px] rounded-full bg-current" />
          <span className="h-[2.5px] w-[2.5px] rounded-full bg-current" />
          <span className="h-[2.5px] w-[2.5px] rounded-full bg-current" />
        </button>
      </div>

      <div className="mt-[8px] grid grid-cols-[108px_minmax(0,1fr)] gap-[15px]">
        <div className="flex min-w-0 flex-col items-center">
          <div className="flex w-full justify-center">
            <span
              className="cerise-target-ring-large relative mx-auto flex h-[82px] w-[82px] -translate-x-[5px] items-center justify-center rounded-full"
            >
              <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                <circle className="cerise-target-ring-track" cx="50" cy="50" r="36" />
                <circle
                  className="cerise-target-ring-arc"
                  cx="50"
                  cy="50"
                  r="36"
                  style={{
                    strokeDasharray: TARGET_RING_CIRCUMFERENCE,
                    strokeDashoffset: TARGET_RING_CIRCUMFERENCE * (1 - ringProgress),
                  }}
                />
              </svg>
              <span className="cerise-target-ring-large-center relative z-10 flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full">
                <span className="text-[17px] font-[850] leading-none text-[#b6844e]">{target}%</span>
                <span className="mt-[3px] text-[7px] font-[800] leading-none text-[#111111]">to keep pace</span>
              </span>
            </span>
          </div>
          <div className="mt-[10px] grid gap-[5px] text-[11px] leading-none text-[#111111]">
            <p>
              <strong className="font-[850]">{done}%</strong> <span className="ml-[7px] font-[700] text-[#625a52]">done</span>
            </p>
            <p>
              <strong className="font-[850]">{remaining}%</strong> <span className="ml-[7px] font-[700] text-[#625a52]">remaining</span>
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="rounded-[8px] border border-[#ededeb] bg-[#f5f5f4] px-[9px] py-[7px] text-center text-[10px] font-[700] leading-none text-[#111111]">
            <span>Pace: </span>
            <strong className="font-[750] text-[#5f5a55]">{paceSummary.paceLabel}</strong>
            <span className="px-[6px]">&middot;</span>
            <span>Finish: </span>
            <strong className="font-[750] text-[#5f5a55]">{paceSummary.expectedFinishLabel}</strong>
          </div>

          <div className="mt-[10px] grid gap-0 text-[10px]">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-[12px] pb-[8px]">
              <span className="font-[700] text-[#625a52]">Deadline</span>
              <strong className="text-right font-[850] text-[#111111]">{paceSummary.deadlineLabel}</strong>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-[12px] border-t border-[#eee7de] py-[8px]">
              <span className="font-[700] text-[#625a52]">Days left</span>
              <strong className="text-right font-[850] text-[#111111]">{paceSummary.daysLeft} days</strong>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-[12px] border-t border-[#eee7de] pt-[8px]">
              <span className="font-[700] text-[#625a52]">Status</span>
              <strong className="text-right font-[850] text-[#167026]">{paceSummary.statusLabel}</strong>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function TodayTargetModalPreviewCard({
  data,
  paceSummary,
}: {
  data?: DashboardDerivedState["todayTarget"];
  paceSummary: DashboardTargetPaceSummary;
}) {
  const target = data?.target ?? 9;
  const done = data?.done ?? 6;
  const remaining = data?.remaining ?? 3;
  const ringProgress = data?.ringProgress ?? (target > 0 ? Math.max(0, Math.min(1, done / target)) : 1);

  return (
    <div className="mt-[10px] rounded-[14px] border border-[#e8e2da] bg-white px-[16px] py-[18px] md:px-[20px]">
      <div className="grid gap-[18px] md:grid-cols-[178px_minmax(0,1fr)]">
        <div className="min-w-0">
          <h3 className="text-center text-[20px] font-[850] leading-none text-[#111111]">Today&apos;s Target</h3>
          <div className="mt-[15px] flex justify-center">
            <span className="cerise-target-ring-large relative flex h-[82px] w-[82px] items-center justify-center rounded-full">
              <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                <circle className="cerise-target-ring-track" cx="50" cy="50" r="36" />
                <circle
                  className="cerise-target-ring-arc"
                  cx="50"
                  cy="50"
                  r="36"
                  style={{
                    strokeDasharray: TARGET_RING_CIRCUMFERENCE,
                    strokeDashoffset: TARGET_RING_CIRCUMFERENCE * (1 - ringProgress),
                  }}
                />
              </svg>
              <span className="cerise-target-ring-large-center relative z-10 flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full">
                <span className="text-[18px] font-[850] leading-none text-[#b6844e]">{target}%</span>
                <span className="mt-[3px] text-[6.5px] font-[800] leading-none text-[#111111]">to keep pace</span>
              </span>
            </span>
          </div>
          <div className="mx-auto mt-[15px] grid w-[112px] gap-[5px] text-[14px] leading-none text-[#111111]">
            <p>
              <strong>{done}%</strong> <span className="ml-[10px] font-[750] text-[#625a52]">done</span>
            </p>
            <p>
              <strong>{remaining}%</strong> <span className="ml-[10px] font-[750] text-[#625a52]">remaining</span>
            </p>
          </div>
        </div>

        <div className="min-w-0 pt-[2px]">
          <div className="flex justify-end">
            <span className="inline-flex h-[22px] w-[18px] flex-col items-center justify-center gap-[2px] text-[#4d4944]">
              <span className="h-[2.5px] w-[2.5px] rounded-full bg-current" />
              <span className="h-[2.5px] w-[2.5px] rounded-full bg-current" />
              <span className="h-[2.5px] w-[2.5px] rounded-full bg-current" />
            </span>
          </div>
          <div className="mt-[12px] rounded-[9px] border border-[#ededeb] bg-[#f5f5f4] px-[9px] py-[9px] text-center text-[11px] font-[800] leading-none text-[#111111]">
            <span>Pace: </span>
            <strong className="font-[850] text-[#5f5a55]">{paceSummary.paceLabel}</strong>
            <span className="px-[7px]">&middot;</span>
            <span>Finish: </span>
            <strong className="font-[850] text-[#5f5a55]">{paceSummary.expectedFinishLabel}</strong>
          </div>

          <div className="mt-[13px] grid gap-0 text-[12px]">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-[12px] pb-[10px]">
              <span className="font-[750] text-[#625a52]">Deadline</span>
              <strong className="text-right font-[850] text-[#111111]">{paceSummary.deadlineLabel}</strong>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-[12px] border-t border-[#eee7de] py-[10px]">
              <span className="font-[750] text-[#625a52]">Days left</span>
              <strong className="text-right font-[850] text-[#111111]">{paceSummary.daysLeft} days</strong>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-[12px] border-t border-[#eee7de] pt-[10px]">
              <span className="font-[750] text-[#625a52]">Status</span>
              <strong className="text-right font-[850] text-[#167026]">{paceSummary.statusLabel}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TodayTargetSettingsModal({
  activeProject,
  onClose,
  onSave,
  settings,
  researchCounts,
  completedTaskWeightToday,
}: {
  activeProject: Project;
  onClose: () => void;
  onSave: (settings: DashboardTargetSettings) => void;
  settings: DashboardTargetSettings;
  researchCounts?: ResearchCounts;
  completedTaskWeightToday?: number;
}) {
  const [draft, setDraft] = useState<DashboardTargetSettings>(settings);
  const [optionalSettingsOpen, setOptionalSettingsOpen] = useState(true);
  const [projectModelOpen, setProjectModelOpen] = useState(false);

  // Preview reads the SAME unified model as the main card, computed from the draft.
  const draftModel = computeTodayTargetFromUiSettings(
    draft,
    researchCounts ?? EMPTY_RESEARCH_COUNTS,
    new Date(activeProject.created_at),
    new Date(),
    completedTaskWeightToday ?? 0
  );
  const draftSummary = todayTargetModelToPaceSummary(draftModel, draft.paceMode);
  const previewDone = Math.round(draftModel.doneTodayPercent);
  const previewData: DashboardDerivedState["todayTarget"] = {
    target: draftModel.dailyTargetPercent,
    done: previewDone,
    remaining: Math.max(0, draftModel.dailyTargetPercent - previewDone),
    ringProgress: draftModel.ringProgress,
  };
  const metaRelevant = PROJECT_TYPE_MODELS[draft.projectType].weights.metaAnalysis > 0 || draft.projectType === "meta-analysis";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-4 py-5">
      <section className="w-full max-w-[610px] rounded-[15px] border border-[#aaa39c] bg-[#fffefa] px-[22px] py-[22px] shadow-[0_24px_70px_rgba(28,20,13,0.18)] md:px-[28px]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-[28px] font-[850] leading-none text-[#111111]">Target Settings</h2>
            <p className="mt-[8px] text-[12px] font-[700] text-[#625a52]">
              These settings calculate your daily target to keep pace.
            </p>
            <p className="mt-[5px] text-[11px] font-[800] italic text-[#a87f4f]">
              Where 1000% dedication meets measurable breakthroughs.
            </p>
          </div>
          <button
            aria-label="Close target settings"
            className="-mr-[8px] -mt-[8px] flex h-[36px] w-[36px] items-center justify-center rounded-full text-[30px] font-[650] leading-none text-[#625a52] hover:bg-[#f4f0eb]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-[22px]">
          <label className="block text-[12px] font-[850] text-[#625a52]">Project</label>
          <div className="mt-[8px] flex h-[42px] items-center justify-between rounded-[9px] border border-[#ded8d0] bg-white px-[12px] text-[13px] font-[850] text-[#111111]">
            <span className="truncate">{activeProject.name}</span>
            <AppIcon className="h-[14px] w-[14px] shrink-0 text-[#625a52]" name="folder" />
          </div>
        </div>

        <div className="mt-[18px] grid gap-[16px] md:grid-cols-[210px_minmax(0,1fr)]">
          <div>
            <label className="block text-[12px] font-[850] text-[#625a52]" htmlFor="dashboard-target-deadline">
              Deadline
            </label>
            <input
              className="mt-[8px] h-[44px] w-full rounded-[9px] border border-[#ded8d0] bg-white px-[12px] text-[13px] font-[850] text-[#111111]"
              id="dashboard-target-deadline"
              onChange={(event) => setDraft((current) => ({ ...current, deadlineDate: event.target.value }))}
              type="date"
              value={draft.deadlineDate}
            />
          </div>

          <div>
            <p className="text-[12px] font-[850] text-[#625a52]">Pace</p>
            <div className="mt-[8px] grid gap-[8px] sm:grid-cols-3">
              {DASHBOARD_PACE_OPTIONS.map((option) => {
                const selected = draft.paceMode === option.mode;

                return (
                  <button
                    className={`min-h-[74px] rounded-[9px] border px-[7px] py-[9px] text-center ${
                      selected
                        ? "border-[#b6844e] bg-[#fffaf2] text-[#8f6132]"
                        : "border-[#e5ded5] bg-white text-[#111111]"
                    }`}
                    key={option.mode}
                    onClick={() => setDraft((current) => ({ ...current, paceMode: option.mode }))}
                    type="button"
                  >
                    <span className="block text-[13px] font-[850] leading-none">{option.label}</span>
                    <span className="mt-[7px] block text-[10px] font-[750] leading-[1.2] text-[#625a52]">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-[16px] rounded-[10px] border border-[#eadfce] bg-[#fffaf2] px-[14px] py-[11px] text-[12px] font-[750] text-[#3b342e]">
          <strong className="font-[850] text-[#8f6132]">{draftSummary.paceLabel} pace</strong> aims to {draftSummary.paceDescription.toLowerCase()}.
          <span className="ml-[6px] font-[850] text-[#8f6132]">Expected finish: {draftSummary.expectedFinishLabel}</span>
        </div>

        <details
          className="mt-[16px] rounded-[10px] border border-[#e8e3dc] bg-white px-[14px] py-[13px]"
          onToggle={(event) => setOptionalSettingsOpen(event.currentTarget.open)}
          open={optionalSettingsOpen}
        >
          <summary className="flex cursor-pointer list-none items-center gap-[4px] text-[13px] font-[850] text-[#3b342e] marker:hidden">
            <AppIcon className={`h-[12px] w-[12px] transition-transform ${optionalSettingsOpen ? "" : "-rotate-90"}`} name="chevron-down" />
            Optional settings
          </summary>
          <div className="mt-[14px] grid gap-[12px] md:grid-cols-2">
            <label className="block text-[11px] font-[750] text-[#625a52]">
              Work days per week
              <select
                className="mt-[7px] h-[40px] w-full rounded-[8px] border border-[#ded8d0] bg-white px-[11px] text-[12px] font-[850] text-[#111111]"
                onChange={(event) => setDraft((current) => ({ ...current, workDaysPerWeek: Number(event.target.value) }))}
                value={draft.workDaysPerWeek}
              >
                {[4, 5, 6, 7].map((days) => (
                  <option key={days} value={days}>
                    {days} days
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] font-[750] text-[#625a52]">
              Daily work goal
              <select
                className="mt-[7px] h-[40px] w-full rounded-[8px] border border-[#ded8d0] bg-white px-[11px] text-[12px] font-[850] text-[#111111]"
                onChange={(event) => setDraft((current) => ({ ...current, dailyWorkGoalMinutes: Number(event.target.value) }))}
                value={draft.dailyWorkGoalMinutes}
              >
                {[45, 60, 90, 120].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} min
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-[13px] flex items-center gap-[10px] text-[12px] font-[800] text-[#625a52]">
            <input
              checked={draft.manualOverride}
              className="h-[16px] w-[16px] rounded-[4px] accent-[#b6844e]"
              onChange={(event) => setDraft((current) => ({ ...current, manualOverride: event.target.checked }))}
              type="checkbox"
            />
            Override daily target manually
          </label>
          <input
            className="mt-[10px] h-[40px] w-full rounded-[8px] border border-[#ded8d0] bg-white px-[11px] text-[12px] font-[750] text-[#111111] disabled:bg-[#f6f2eb] disabled:text-[#9d958c]"
            disabled={!draft.manualOverride}
            onChange={(event) => setDraft((current) => ({ ...current, manualTargetPercent: event.target.value }))}
            placeholder="Enter % per day"
            type="number"
            value={draft.manualTargetPercent}
          />
        </details>

        <details
          className="mt-[12px] rounded-[10px] border border-[#e8e3dc] bg-white px-[14px] py-[13px]"
          onToggle={(event) => setProjectModelOpen(event.currentTarget.open)}
          open={projectModelOpen}
        >
          <summary className="flex cursor-pointer list-none items-center gap-[4px] text-[13px] font-[850] text-[#3b342e] marker:hidden">
            <AppIcon className={`h-[12px] w-[12px] transition-transform ${projectModelOpen ? "" : "-rotate-90"}`} name="chevron-down" />
            Project model
          </summary>
          <label className="mt-[14px] block text-[11px] font-[750] text-[#625a52]">
            Project type
            <select
              className="mt-[7px] h-[40px] w-full rounded-[8px] border border-[#ded8d0] bg-white px-[11px] text-[12px] font-[850] text-[#111111]"
              onChange={(event) => setDraft((current) => ({ ...current, projectType: event.target.value as DashboardTargetSettings["projectType"] }))}
              value={draft.projectType}
            >
              {PROJECT_TYPE_ORDER.map((type) => (
                <option key={type} value={type}>
                  {PROJECT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-[12px] grid gap-[12px] md:grid-cols-2">
            <label className="block text-[11px] font-[750] text-[#625a52]">
              Quality level
              <select
                className="mt-[7px] h-[40px] w-full rounded-[8px] border border-[#ded8d0] bg-white px-[11px] text-[12px] font-[850] text-[#111111]"
                onChange={(event) => setDraft((current) => ({ ...current, scope: { ...current.scope, quality: event.target.value as ProjectQuality } }))}
                value={draft.scope.quality}
              >
                <option value="school">School</option>
                <option value="professional">Professional</option>
                <option value="publication">Publication-grade</option>
              </select>
            </label>
            <label className="block text-[11px] font-[750] text-[#625a52]">
              Complexity
              <select
                className="mt-[7px] h-[40px] w-full rounded-[8px] border border-[#ded8d0] bg-white px-[11px] text-[12px] font-[850] text-[#111111]"
                onChange={(event) => setDraft((current) => ({ ...current, scope: { ...current.scope, complexity: event.target.value as ProjectComplexity } }))}
                value={draft.scope.complexity}
              >
                <option value="simple">Simple</option>
                <option value="standard">Standard</option>
                <option value="complex">Complex</option>
              </select>
            </label>
            <label className="block text-[11px] font-[750] text-[#625a52]">
              Expected sources / studies
              <input
                className="mt-[7px] h-[40px] w-full rounded-[8px] border border-[#ded8d0] bg-white px-[11px] text-[12px] font-[750] text-[#111111]"
                min={0}
                onChange={(event) => setDraft((current) => ({ ...current, scope: { ...current.scope, expectedSources: event.target.value ? Number(event.target.value) : null } }))}
                placeholder="Auto"
                type="number"
                value={draft.scope.expectedSources ?? ""}
              />
            </label>
            <label className="block text-[11px] font-[750] text-[#625a52]">
              Expected pages or sections
              <input
                className="mt-[7px] h-[40px] w-full rounded-[8px] border border-[#ded8d0] bg-white px-[11px] text-[12px] font-[750] text-[#111111]"
                min={0}
                onChange={(event) => setDraft((current) => ({ ...current, scope: { ...current.scope, expectedPagesOrSections: event.target.value ? Number(event.target.value) : null } }))}
                placeholder="Auto"
                type="number"
                value={draft.scope.expectedPagesOrSections ?? ""}
              />
            </label>
          </div>
          {metaRelevant ? (
            <label className="mt-[13px] flex items-center gap-[10px] text-[12px] font-[800] text-[#625a52]">
              <input
                checked={draft.scope.metaAnalysisRequired}
                className="h-[16px] w-[16px] rounded-[4px] accent-[#b6844e]"
                onChange={(event) => setDraft((current) => ({ ...current, scope: { ...current.scope, metaAnalysisRequired: event.target.checked } }))}
                type="checkbox"
              />
              Meta-analysis required
            </label>
          ) : null}
          <p className="mt-[12px] text-[10px] font-[600] leading-[1.4] text-[#9d958c]">
            Cerise measures your project on a 1000-point internal scale for precision, then displays progress as a normal 0-100%.
          </p>
        </details>

        <div className="mt-[22px]">
          <p className="text-[12px] font-[850] text-[#625a52]">Preview</p>
          <TodayTargetModalPreviewCard data={previewData} paceSummary={draftSummary} />
        </div>

        <div className="mt-[22px] flex justify-end gap-[10px]">
          <button
            className="h-[38px] rounded-[8px] border border-[#ded8d0] bg-white px-[22px] text-[12px] font-[850] text-[#111111]"
            onClick={() => {
              setDraft(settings);
              setOptionalSettingsOpen(true);
            }}
            type="button"
          >
            Reset
          </button>
          <button
            className="h-[38px] rounded-[8px] bg-[#b6844e] px-[24px] text-[12px] font-[850] text-white"
            onClick={() => onSave(draft)}
            type="button"
          >
            Save &amp; Calculate Target
          </button>
        </div>
      </section>
    </div>
  );
}

const localSetupLabels: Record<string, string> = {
  Agent: "Agent ready",
  Ollama: "Ollama ready",
  Folder: "Folder connected",
  Safety: "Safety checked",
};

/** Tiny "Sample" chip for a card whose data is currently demo/fallback. */
function SampleTag() {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full bg-[#f6efe4] px-[6px] py-[1px] text-[8px] font-[850] uppercase tracking-[0.04em] text-[#8f6132]"
      title="This card is showing example data until you add your own research."
    >
      Sample
    </span>
  );
}

function RecentChangesCard({ changes, sample }: { changes?: DashboardDerivedState["recentChanges"]; sample?: boolean }) {
  const items = (changes ?? []).slice(0, 4);

  return (
    <Card className="h-[186px] overflow-hidden p-[14px]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-[6px]">
          <h2 className="text-[13px] font-[850] text-[#111111]">Activity Log</h2>
          {sample ? <SampleTag /> : null}
        </div>
        <span className="text-[8.5px] font-[750] leading-none text-[#8a837c]">Latest work</span>
      </div>
      <div className="relative mt-[13px]">
        {items.length === 0 ? (
          <p className="mt-[10px] text-[10.5px] font-[650] leading-[1.5] text-[#77716b]">
            No recent activity yet — your saved sources, notes, and synthesis will show up here as you work.
          </p>
        ) : (
          <div className="grid gap-[6px]">
            {items.map((item, index) => (
              <div className="grid grid-cols-[minmax(0,1fr)_44px] gap-[8px]" key={`${item.title}-${item.time}-${index}`}>
                <div className="min-w-0 pb-[2px] last:pb-0">
                  <p className="truncate text-[10.5px] font-[850] leading-tight text-[#2a2826]">{item.title}</p>
                  <p className="mt-[2px] truncate text-[8.5px] font-[650] leading-none text-[#77716b]">{item.subtitle}</p>
                </div>
                <span className="text-right text-[8.5px] font-[750] leading-tight text-[#77716b]">{item.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
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
  // Honest neutral rows only while data is still loading; real data always replaces these.
  const healthRows = (data?.health ?? [
    { label: "Evidence balance", value: "—", tone: "purple" as const },
    { label: "Citation coverage", value: "—", tone: "purple" as const },
    { label: "Theme clarity", value: "—", tone: "purple" as const },
    { label: "Draft readiness", value: "—", tone: "purple" as const },
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
          {data?.recommended ?? "Add your first sources to see your next move."}
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
            <p className="mt-[2px] text-[8.5px] font-[550] leading-tight text-[#17120d]">{data?.watchPoint ?? "Nothing urgent yet."}</p>
          </div>
        </div>
        <div className={`${compact ? "h-[36px] gap-[6px] px-[7px]" : "h-[39px] gap-[7px] px-[8px]"} flex items-center rounded-[9px] bg-[#f6f2eb]`}>
          <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#eee6da]">
            <AppIcon className="h-[13px] w-[13px] text-[#8f6132]" name="clock" />
          </span>
          <div className="min-w-0">
            <p className={`${compact ? "text-[10px]" : "text-[11px]"} truncate font-[850] leading-tight`}>{data?.estimatedTime ?? "—"}</p>
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
  sample,
}: {
  compact?: boolean;
  tasks?: DashboardTask[];
  onCompleteTask?: (taskId: string) => void;
  sample?: boolean;
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
        <div className="flex items-center gap-[6px]">
          <h2 className={`${compact ? "text-[13px]" : "text-[14px]"} font-[850]`}>Today&apos;s Schedule</h2>
          {sample ? <SampleTag /> : null}
        </div>
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
    onSectionFeedback,
    onProjectChange,
    onToggleCreate,
    dashboardData,
    dashboardError,
    dashboardLoading,
    usingDemo,
    demoCards,
    userName,
    targetSettings: targetSettingsProp,
    onSaveTargetSettings,
    projectOptions,
    safetyReady,
    showCreate,
  } = props;
  const currentProject = dashboardData?.currentProject;
  const localSetup = dashboardData?.localSetup;
  const continueLearning = dashboardData?.continueLearning;
  const continueLearningLessonLine = continueLearning?.lessonNumber
    ? `${continueLearning.lessonNumber} ${continueLearning.lessonTitle}`
    : continueLearning?.lessonTitle ?? continueLearning?.lesson ?? "—";
  const continueLearningMomentum =
    continueLearning?.status === "complete"
      ? {
          title: "All published lessons complete",
          body: "You are caught up with the available course work.",
          lastLesson: "Completed",
        }
      : continueLearning?.status === "in_progress"
        ? {
            title: "Keep going with your next lesson",
            body: "Resume the current lesson when you are ready.",
            lastLesson: "In progress",
          }
        : continueLearning?.status === "coming_soon"
          ? {
              title: "New lessons are coming soon",
              body: "Published lessons will appear here when they are ready.",
              lastLesson: "—",
            }
          : continueLearning?.status === "no_catalog"
            ? {
                title: "No lessons available yet",
                body: "Your course overview will fill in once lessons are published.",
                lastLesson: "—",
              }
            : {
                title: "No lessons completed yet",
                body: "Start your first lesson to build momentum.",
                lastLesson: "—",
              };
  const [targetSettingsOpen, setTargetSettingsOpen] = useState(false);
  const [feedbackSectionId, setFeedbackSectionId] = useState<DashboardSectionId | null>(null);
  const [feedbackSavedFor, setFeedbackSavedFor] = useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState<{
    sectionId: DashboardSectionId;
    verdict: "too_high" | "about_right" | "too_low";
  } | null>(null);
  const [feedbackPercent, setFeedbackPercent] = useState("");
  const [feedbackExplanation, setFeedbackExplanation] = useState("");
  // Persisted settings come in via props; keep a local fallback so the modal still
  // works (in-memory only) if a host doesn't wire persistence.
  const [localTargetSettings, setLocalTargetSettings] = useState<DashboardTargetSettings>(() =>
    getDefaultDashboardTargetSettings()
  );
  const targetSettings = targetSettingsProp ?? localTargetSettings;
  const targetPaceSummary = getDashboardTargetPaceSummary(targetSettings);

  // Deterministic greeting (no AI): time-of-day + name from the session, with honest
  // fallbacks for error/demo/empty states.
  const greeting = dashboardData?.greeting;
  const greetingName = userName?.trim();
  const greetingHeadline = greeting
    ? `Good ${greeting.timeOfDay}${greetingName ? `, ${greetingName}` : ""}!`
    : "Welcome back!";
  const greetingSubline = dashboardError
    ? "Showing safe fallback values while we reconnect your project data."
    : usingDemo
      ? "This is sample data — add your sources, notes, and synthesis to see your real progress."
      : greeting?.focusLine ?? "Pick up where you left off on your research.";
  const selectedFeedbackSection = feedbackSectionId
    ? dashboardData?.researchSections.find((section) => section.id === feedbackSectionId)
    : null;
  const handleResearchSectionSelect = useCallback((id: DashboardSectionId) => {
    setFeedbackSectionId(id);
    setFeedbackSavedFor(null);
    setFeedbackDraft(null);
    setFeedbackPercent("");
    setFeedbackExplanation("");
  }, []);
  const openFeedbackDraft = (sectionId: DashboardSectionId, verdict: "too_high" | "about_right" | "too_low") => {
    setFeedbackDraft({ sectionId, verdict });
    setFeedbackSavedFor(null);
    setFeedbackPercent("");
    setFeedbackExplanation("");
  };
  const saveFeedbackDraft = (includeDetails: boolean) => {
    if (!feedbackDraft || !onSectionFeedback) return;
    const parsedPercent = Number(feedbackPercent);
    const suggestedPercent =
      includeDetails && feedbackPercent.trim() && Number.isFinite(parsedPercent)
        ? Math.max(0, Math.min(100, parsedPercent))
        : null;
    const explanation = includeDetails ? feedbackExplanation.trim() || null : null;
    onSectionFeedback(feedbackDraft.sectionId, feedbackDraft.verdict, {
      suggestedPercent,
      explanation,
    });
    setFeedbackSavedFor(feedbackDraft.verdict);
    setFeedbackDraft(null);
    setFeedbackPercent("");
    setFeedbackExplanation("");
  };
  const sectionFeedbackSlot =
    onSectionFeedback && feedbackSectionId && feedbackSectionId !== "notes" ? (
      <div className="flex w-full flex-wrap items-center gap-[10px]">
        <span className="mr-[2px] shrink-0 text-[24px] font-[760] leading-none text-[#625a52]">
          Does this section&apos;s progress feel accurate?
        </span>
        {(["too_high", "about_right", "too_low"] as const).map((verdict) => (
          <button
            className="rounded-full border border-[#ded8d0] bg-white px-[16px] py-[7px] text-[21px] font-[850] leading-none text-[#3b342e] hover:bg-[#f4f0eb]"
            key={verdict}
            onClick={() => {
              openFeedbackDraft(feedbackSectionId, verdict);
            }}
            type="button"
          >
            {verdict === "too_high" ? "Too high" : verdict === "about_right" ? "About right" : "Too low"}
          </button>
        ))}
        {feedbackSavedFor ? <span className="text-[21px] font-[850] leading-none text-[#5f7d4d]">Thanks — saved</span> : null}
      </div>
    ) : null;

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
          <div className="mb-[8px] flex items-center gap-[10px]">
            <p className="text-[12px] font-[850] text-[#a87f4f]">Dashboard</p>
            {usingDemo ? (
              <span
                className="inline-flex items-center gap-[5px] rounded-full bg-[#f6efe4] px-[8px] py-[2px] text-[10px] font-[850] text-[#8f6132]"
                title="Some cards show example data until you add your own research."
              >
                <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-[#c89a5a]" />
                Sample data
              </span>
            ) : null}
          </div>
          <h1 className="text-[31px] font-[850] leading-none tracking-[-0.03em]">{greetingHeadline}</h1>
          <p className="mt-[11px] max-w-[555px] text-[13px] font-[500] leading-[1.42] text-[#3b342e]">
            {greetingSubline}
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

      {feedbackDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/18 px-4">
          <div className="w-full max-w-[420px] rounded-[12px] border border-[#d8c8b7] bg-white p-[18px] shadow-[0_18px_50px_rgba(32,24,18,0.18)]">
            <p className="text-[12px] font-[850] uppercase tracking-[0.08em] text-[#a87f4f]">Thank you for the feedback</p>
            <h2 className="mt-[8px] text-[20px] font-[850] leading-tight text-[#111111]">Help Cerise calibrate this progress</h2>
            <p className="mt-[8px] text-[13px] font-[600] leading-[1.45] text-[#625a52]">
              Current estimate: {selectedFeedbackSection?.percent ?? "--"}% for {selectedFeedbackSection?.label ?? "this section"}.
              What percent feels more accurate right now?
            </p>
            <label className="mt-[14px] block text-[12px] font-[850] text-[#3b342e]" htmlFor="feedback-percent">
              Better percent (optional)
            </label>
            <div className="mt-[6px] flex items-center gap-2">
              <input
                className="h-[38px] w-[96px] rounded-[8px] border border-[#ded8d0] px-3 text-[14px] font-[800] text-[#111111] outline-none focus:border-[#b6844e]"
                id="feedback-percent"
                inputMode="numeric"
                max="100"
                min="0"
                onChange={(event) => setFeedbackPercent(event.target.value)}
                placeholder={`${selectedFeedbackSection?.percent ?? 0}`}
                type="number"
                value={feedbackPercent}
              />
              <span className="text-[13px] font-[750] text-[#625a52]">%</span>
            </div>
            <label className="mt-[12px] block text-[12px] font-[850] text-[#3b342e]" htmlFor="feedback-explanation">
              Explanation (optional)
            </label>
            <textarea
              className="mt-[6px] h-[82px] w-full resize-none rounded-[8px] border border-[#ded8d0] px-3 py-2 text-[13px] font-[600] leading-[1.4] text-[#111111] outline-none focus:border-[#b6844e]"
              id="feedback-explanation"
              onChange={(event) => setFeedbackExplanation(event.target.value)}
              placeholder="Example: I already finished more evidence rows, so this should be closer to 40%."
              value={feedbackExplanation}
            />
            <div className="mt-[16px] flex flex-wrap justify-end gap-[8px]">
              <button
                className="h-[36px] rounded-[8px] border border-[#ded8d0] bg-white px-3 text-[12px] font-[850] text-[#3b342e]"
                onClick={() => saveFeedbackDraft(false)}
                type="button"
              >
                Skip details
              </button>
              <button
                className="h-[36px] rounded-[8px] bg-[#111111] px-4 text-[12px] font-[850] text-white"
                onClick={() => saveFeedbackDraft(true)}
                type="button"
              >
                Save feedback
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dashboardError ? (
        <div className="mb-3 rounded-[10px] border border-[#e8d8c6] bg-[#fbf6ef] px-3 py-2 text-[12px] font-[700] text-[#8f6132]">
          Dashboard data is using safe fallback values. {dashboardError}
        </div>
      ) : null}

      <div className="dashboard-exact-grid grid grid-cols-1 gap-[22px] 2xl:grid-cols-[minmax(0,1124px)_282px]">
        <div className="min-w-0">
          <section className="dashboard-exact-top grid max-w-[1124px] grid-cols-[210px_350px_210px_324px] gap-[10px]">
            <Card className="h-[186px] p-[14px]">
              <p className="text-[13px] font-[850]">Current project</p>
              <div className="relative mt-[10px] flex h-[36px] items-center rounded-[8px] border border-[#e5e1dc] bg-white px-2.5 text-[10.5px] font-[850]">
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
              <p className="mt-[9px] inline-flex rounded-full bg-[#f6efe4] px-2 py-1 text-[9.5px] font-[850] text-[#8f6132]">
                {currentProject?.tag ?? "Project setup"}
              </p>
              <p className="mt-[11px] text-[10.5px] font-[700] text-[#625a52]">Current section</p>
              <p className="text-[12.5px] font-[850] leading-tight">{currentProject?.currentSection ?? "No active section yet"}</p>
              <p className="mt-[6px] text-[10.5px] font-[600] text-[#625a52]">{currentProject?.lastOpened ?? "Not opened yet"}</p>
            </Card>

            <TodayTargetCard
              data={dashboardData?.todayTarget}
              onOpenSettings={() => setTargetSettingsOpen(true)}
              paceSummary={dashboardData?.todayTargetSummary ?? targetPaceSummary}
            />

            <Card className="h-[186px] p-[14px]">
              <p className="text-[13px] font-[850] text-[#111111]">Local Setup</p>
              <div className="mt-[15px] flex items-end justify-between gap-3">
                <p className="text-[15px] font-[850] leading-none text-[#111111]">
                  {localSetup?.readyCount ?? 4}/{localSetup?.totalCount ?? 4}{" "}
                  <span className="text-[10.5px] font-[750] text-[#625a52]">checks ready</span>
                </p>
                <span className="pb-[2px] text-[10.5px] font-[850] leading-none text-[#8e6837]">{localSetup?.percent ?? 100}% ready</span>
              </div>
              <div className="mt-[10px] h-[6px] overflow-hidden rounded-full bg-[#eee7de]">
                <div className="h-full rounded-full bg-[#d6ad6f]" style={{ width: `${localSetup?.percent ?? 100}%` }} />
              </div>
              <div className="mt-[13px] grid gap-[8px] text-[10.5px] leading-none">
                {(localSetup?.checks ?? [["Agent", agentReady], ["Ollama", ollamaReady], ["Folder", agentReady], ["Safety", safetyReady]]).map(([label, ready], index) => (
                  <div className="flex items-center justify-between gap-4" key={label}>
                    <span className="flex min-w-0 items-center gap-[8px] font-[750] text-[#625a52]">
                      <span
                        className="h-[6px] w-[6px] shrink-0 rounded-full bg-[#d6ad6f]"
                        style={{ opacity: 1 - index * 0.12 }}
                      />
                      <span className="truncate">{localSetupLabels[label] ?? label}</span>
                    </span>
                    <span className={`font-[850] ${ready ? "text-[#5f7d4d]" : "text-[#a87f4f]"}`}>{ready ? "Yes" : "Soon"}</span>
                  </div>
                ))}
              </div>
            </Card>

            <RecentChangesCard changes={dashboardData?.recentChanges} sample={demoCards?.activity} />
          </section>

          <section className="mt-[16px] grid grid-cols-1 gap-[14px] 2xl:grid-cols-[820px_290px]">
            <DashboardResearchSectionsExact
              feedbackSlot={sectionFeedbackSlot}
              onOpenSection={onOpenResearchSection}
              onSelectSection={handleResearchSectionSelect}
              sections={dashboardData?.researchSections}
            />
            <div className="hidden 2xl:block">
              <ResearchFocusCard data={dashboardData?.researchFocus} onStartNextMove={() => onOpenResearchSection?.(dashboardData?.researchFocus.bottleneckSection ?? "literature-review")} />
            </div>
          </section>

          <section className="mt-[14px] grid grid-cols-3 gap-[10px] 2xl:hidden">
            <ResearchFocusCard compact data={dashboardData?.researchFocus} onStartNextMove={() => onOpenResearchSection?.(dashboardData?.researchFocus.bottleneckSection ?? "literature-review")} />
            <TodayPlanCard compact onAddTask={onAddScheduleTask} />
            <TodayScheduleCard compact onCompleteTask={onCompleteTask} sample={demoCards?.schedule} tasks={dashboardData?.scheduleTasks} />
          </section>

          <section className="mt-[14px] grid grid-cols-[minmax(0,1fr)_220px] gap-[10px] 2xl:grid-cols-[820px_290px] 2xl:gap-[14px]">
            <Card className="h-[200px] overflow-hidden p-[14px]">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-[8px]">
                  <h2 className="shrink-0 text-[14px] font-[850] leading-none">Continue Learning</h2>
                  {demoCards?.learning ? <SampleTag /> : null}
                </div>
                <p className="mt-[6px] min-w-0 truncate text-[10px] font-[600] leading-none text-[#625a52]">
                  Pick up where you left off and keep your momentum going.
                </p>
              </div>

              <div className="mt-[11px] grid grid-cols-[88px_minmax(140px,0.82fr)_minmax(170px,1fr)] gap-[8px] 2xl:grid-cols-[100px_minmax(188px,0.66fr)_minmax(282px,1.14fr)] 2xl:gap-[11px]">
                <div className="relative h-[84px] w-[88px] overflow-hidden rounded-[12px] bg-[#f2eadb] 2xl:h-[92px] 2xl:w-[100px]">
                  <Image
                    alt=""
                    className="object-contain p-[12px] 2xl:p-[14px]"
                    fill
                    sizes="100px"
                    src="/assets/hedgehogs/hedgehog11LitBook.png"
                  />
                </div>

                <div className="min-w-0 pt-[5px] 2xl:pt-[6px]">
                  <p className="truncate text-[11px] font-[850] leading-[1.15] 2xl:text-[13px]">
                    {continueLearningLessonLine}
                  </p>
                  <p className="mt-[4px] text-[8px] font-[650] leading-[1.38] text-[#4f4943] 2xl:mt-[5px] 2xl:text-[9.5px]">
                    <span className="block truncate">{continueLearning?.moduleLabel ?? "Module — Course content"}</span>
                    <span className="block truncate">{continueLearning?.outputLabel ?? "Output — Course artifact"}</span>
                  </p>
                  <div className="mt-[7px] flex min-w-0 flex-nowrap gap-[5px] 2xl:mt-[7px] 2xl:gap-[6px]">
                    <Link
                      className="inline-flex h-[24px] min-w-[78px] items-center justify-center gap-[4px] whitespace-nowrap rounded-[6px] bg-[#111111] px-[6px] text-[7.4px] font-[850] text-white no-underline 2xl:h-[24px] 2xl:min-w-[98px] 2xl:gap-[4px] 2xl:px-[7px] 2xl:text-[8.5px]"
                      href="/courses/learn"
                    >
                      <AppIcon className="h-[8px] w-[8px] shrink-0 2xl:h-[9px] 2xl:w-[9px]" name="play" />
                      <span className="truncate">Resume lesson</span>
                    </Link>
                    <Link
                      className="inline-flex h-[24px] min-w-[73px] items-center justify-center gap-[4px] whitespace-nowrap rounded-[6px] border border-[#d8d3ce] bg-white px-[6px] text-[7.4px] font-[850] text-[#111111] no-underline 2xl:h-[24px] 2xl:min-w-[88px] 2xl:gap-[4px] 2xl:px-[7px] 2xl:text-[8.5px]"
                      href="/my-learning/notes"
                    >
                      <AppIcon className="h-[8px] w-[8px] shrink-0 2xl:h-[9px] 2xl:w-[9px]" name="list" />
                      <span className="truncate">View notes</span>
                    </Link>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="min-w-0">
                    <p className="text-[8.4px] font-[850] leading-none text-[#625a52] 2xl:text-[9.5px]">Course progress</p>
                    <div className="mt-[6px] grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-[5px] 2xl:mt-[6px] 2xl:gap-[7px]">
                      <div className="h-[6px] min-w-0 rounded-full bg-[#e8e5e1]">
                        <div className="h-full rounded-full bg-[#9c7443]" style={{ width: `${continueLearning?.progress ?? 0}%` }} />
                      </div>
                      <span className="text-[9.5px] font-[850] leading-none 2xl:text-[11px]">{continueLearning?.progress ?? 0}%</span>
                      <span
                        className={`inline-flex h-[19px] items-center gap-[4px] whitespace-nowrap rounded-full px-[6px] text-[7.6px] font-[850] 2xl:h-[21px] 2xl:gap-[5px] 2xl:px-[7px] 2xl:text-[9px] ${
                          continueLearning?.statusTone === "green"
                            ? "bg-[#eaf3e4] text-[#5f7d4d]"
                            : continueLearning?.statusTone === "amber"
                              ? "bg-[#f6efe4] text-[#8f6132]"
                              : "bg-[#f0eeeb] text-[#77716b]"
                        }`}
                      >
                        <span
                          className={`h-[6px] w-[6px] rounded-full ${
                            continueLearning?.statusTone === "green"
                              ? "bg-[#6f8b5b]"
                              : continueLearning?.statusTone === "amber"
                                ? "bg-[#b6844e]"
                                : "bg-[#a9a29b]"
                          }`}
                        />
                        {continueLearning?.statusLabel ?? "—"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-[6px] border-t border-[#eeeae5] pt-[5px] 2xl:mt-[5px] 2xl:pt-[5px]">
                    <p className="text-[8.4px] font-[850] leading-none text-[#625a52] 2xl:text-[9.5px]">Learning momentum</p>
                    <div className="mt-[4px] grid grid-cols-[20px_minmax(0,1fr)_80px] items-center gap-[6px] 2xl:mt-[4px] 2xl:grid-cols-[22px_minmax(0,1fr)_104px] 2xl:gap-[7px]">
                      <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#f6efe4] text-[#8f6132] 2xl:h-[22px] 2xl:w-[22px]">
                        <AppIcon className="h-[10px] w-[10px] 2xl:h-[11px] 2xl:w-[11px]" name="target" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[8.2px] font-[850] leading-tight text-[#17120d] 2xl:text-[9.5px]">
                          {continueLearningMomentum.title}
                        </p>
                        <p className="mt-[2px] truncate text-[7.2px] font-[600] leading-none text-[#625a52] 2xl:mt-[2px] 2xl:text-[8.2px]">
                          {continueLearningMomentum.body}
                        </p>
                      </div>
                      <div className="flex min-w-0 items-center justify-end gap-[5px] 2xl:gap-[6px]">
                        <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-[#f6efe4] text-[#8f6132] 2xl:h-[22px] 2xl:w-[22px]">
                          <AppIcon className="h-[10px] w-[10px] 2xl:h-[11px] 2xl:w-[11px]" name="calendar" />
                        </span>
                        <div className="min-w-0 text-right">
                          <p className="truncate text-[6.8px] font-[650] leading-none text-[#8a837c] 2xl:text-[8px]">Last lesson:</p>
                          <p className="mt-[3px] truncate text-[7.2px] font-[750] leading-none text-[#625a52] 2xl:mt-[4px] 2xl:text-[8.4px]">{continueLearningMomentum.lastLesson}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-[7px] grid h-[34px] grid-cols-4 overflow-hidden rounded-[8px] border border-[#eeeae5] bg-white">
                {(continueLearning?.stats ?? [
                  ["0", "Modules", "completed"],
                  ["0", "Lessons", "done"],
                  ["0", "Notes", "created"],
                  ["0", "Earned badges", "earned"],
                ]).map(([value, label, suffix], index) => {
                  const statIcons = ["book-open", "play", "file", "trophy"] as const;
                  const statText =
                    suffix === "remaining" || suffix === "coming soon"
                      ? `${value} ${suffix}`
                      : `${value} ${label.toLowerCase()}`;

                  return (
                    <div className="flex min-w-0 items-center justify-center gap-[6px] border-r border-[#eeeae5] px-[7px] last:border-r-0" key={`${label}-${suffix}`}>
                      <span className="flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full bg-[#f5f1eb] text-[#756d65]">
                        <AppIcon className="h-[10px] w-[10px]" name={statIcons[index]} />
                      </span>
                      <span className="truncate text-[9.5px] font-[850] leading-none text-[#17120d] 2xl:text-[10px]">{statText}</span>
                    </div>
                  );
                })}
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
          <TodayScheduleCard onCompleteTask={onCompleteTask} sample={demoCards?.schedule} tasks={dashboardData?.scheduleTasks} />
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

      {targetSettingsOpen ? (
        <TodayTargetSettingsModal
          activeProject={activeProject}
          onClose={() => setTargetSettingsOpen(false)}
          onSave={(nextSettings) => {
            if (onSaveTargetSettings) onSaveTargetSettings(nextSettings);
            else setLocalTargetSettings(nextSettings);
            setTargetSettingsOpen(false);
          }}
          settings={targetSettings}
          researchCounts={dashboardData?.researchCounts}
          completedTaskWeightToday={dashboardData?.todayTaskCompletion}
        />
      ) : null}
    </div>
  );
}
