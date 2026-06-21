import {
  DEFAULT_PROJECT_SCOPE,
  DEFAULT_PROJECT_TYPE,
  type ProjectScope,
  type ProjectType,
} from "@/lib/dashboard/todayTargetModel";

export type DashboardPaceMode = "low" | "moderate" | "high";

export type DashboardTargetSettings = {
  deadlineDate: string;
  paceMode: DashboardPaceMode;
  workDaysPerWeek: number;
  dailyWorkGoalMinutes: number;
  manualOverride: boolean;
  manualTargetPercent: string;
  projectType: ProjectType;
  scope: ProjectScope;
};

export type DashboardTargetPaceSummary = {
  deadlineLabel: string;
  daysLeft: number;
  expectedFinishLabel: string;
  expectedFinishDate: string;
  paceDescription: string;
  paceLabel: string;
  paceMultiplier: number;
  statusLabel: string;
};

export const DASHBOARD_PACE_OPTIONS: Array<{
  description: string;
  label: string;
  mode: DashboardPaceMode;
  multiplier: number;
}> = [
  { description: "Finish by deadline", label: "Low", mode: "low", multiplier: 1 },
  { description: "Finish about 10% earlier", label: "Moderate", mode: "moderate", multiplier: 0.9 },
  { description: "Finish about 20% earlier", label: "High", mode: "high", multiplier: 0.8 },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function getDefaultDashboardTargetSettings(today = new Date()): DashboardTargetSettings {
  const deadline = addDays(startOfLocalDay(today), 180);

  return {
    deadlineDate: toDateInputValue(deadline),
    paceMode: "high",
    workDaysPerWeek: 5,
    dailyWorkGoalMinutes: 90,
    manualOverride: false,
    manualTargetPercent: "",
    projectType: DEFAULT_PROJECT_TYPE,
    scope: { ...DEFAULT_PROJECT_SCOPE },
  };
}

export function getDashboardTargetPaceSummary(
  settings: DashboardTargetSettings,
  startDate = new Date(),
  today = new Date()
): DashboardTargetPaceSummary {
  const deadline = parseDateInput(settings.deadlineDate) ?? addDays(startOfLocalDay(today), 180);
  const start = startOfLocalDay(startDate);
  const todayStart = startOfLocalDay(today);
  const pace = DASHBOARD_PACE_OPTIONS.find((option) => option.mode === settings.paceMode) ?? DASHBOARD_PACE_OPTIONS[0];
  const totalDays = Math.max(1, Math.ceil((startOfLocalDay(deadline).getTime() - start.getTime()) / MS_PER_DAY));
  const paceDays = Math.max(1, Math.ceil(totalDays * pace.multiplier));
  const expectedFinish = addDays(start, paceDays);
  const daysLeft = Math.max(0, Math.ceil((startOfLocalDay(expectedFinish).getTime() - todayStart.getTime()) / MS_PER_DAY));

  return {
    deadlineLabel: formatDateLabel(deadline),
    daysLeft,
    expectedFinishDate: toDateInputValue(expectedFinish),
    expectedFinishLabel: formatDateLabel(expectedFinish),
    paceDescription: pace.description,
    paceLabel: pace.label,
    paceMultiplier: pace.multiplier,
    statusLabel: daysLeft > 0 ? "On track" : "Needs update",
  };
}
