"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppIcon, type AppIconName } from "@/components/app-shell/AppIcons";
import { useUser } from "@/hooks/useUser";
import { useScheduleTasks } from "@/hooks/useScheduleTasks";
import { createClient } from "@/lib/supabase/client";
import { getLocalDay } from "@/lib/dashboard/localDay";
import type { DashboardTask } from "@/lib/dashboard/deriveDashboardState";
import type { Project } from "@/types/project";
import styles from "./page.module.css";

type Tone = "rose" | "blue" | "purple" | "green" | "amber" | "neutral";

// Section -> visual tone/icon. Purely cosmetic grouping of the real
// dashboard_tasks.section_id column (recommendation-engine tasks carry a
// section id; manual checkpoints don't, so they fall back to "neutral"/"edit").
const SECTION_TONE: Record<string, Tone> = {
  "meta-analysis": "purple",
  "literature-review": "blue",
  workspace: "green",
  draft: "rose",
  citations: "amber",
};

const SECTION_ICON: Record<string, AppIconName> = {
  "meta-analysis": "workflow",
  "literature-review": "search",
  workspace: "dashboard",
  draft: "edit",
  citations: "file",
};

function toneForTask(task: DashboardTask): Tone {
  return SECTION_TONE[task.section_id] ?? (task.origin === "manual" ? "neutral" : "blue");
}

function iconForTask(task: DashboardTask): AppIconName {
  return SECTION_ICON[task.section_id] ?? (task.origin === "manual" ? "edit" : "check-square");
}

function originLabel(origin: string | null | undefined) {
  if (origin === "manual") return "Manual";
  if (origin === "recommended") return "Recommended";
  return "Default";
}

function addDays(date: Date, amount: number) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + amount);
  return next;
}

function formatShort(date: Date) {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function DashboardSchedulePage() {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setProjects([]);
      setProjectsLoaded(true);
      return;
    }
    async function loadProjects() {
      const supabase = createClient();
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false })
        .then(
          (result) => result,
          () => ({ data: null })
        );
      if (cancelled) return;
      setProjects((data as Project[] | null) ?? []);
      setProjectsLoaded(true);
    }
    void loadProjects();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const projectIds = useMemo(() => {
    if (projectFilter !== "all") return [projectFilter];
    return projects.map((project) => project.id);
  }, [projectFilter, projects]);

  // When adding a task with "All projects" selected, attach it to the most
  // recently updated project (projects are already sorted that way).
  const defaultProjectId = projectFilter !== "all" ? projectFilter : projects[0]?.id ?? null;

  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [view, setView] = useState<"Day" | "Week">("Week");
  const [query, setQuery] = useState("");
  const [hideCompleted, setHideCompleted] = useState(false);
  const todayKey = useMemo(() => getLocalDay(new Date()), []);
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);

  const { days, tasks, loading: tasksLoading, completeTask, addTask } = useScheduleTasks({
    userId,
    projectIds,
    defaultProjectId,
    anchorDate,
  });
  // Tasks can't be fetched meaningfully until we know which project(s) the
  // user has, so treat "still loading projects" as part of the loading state.
  const loading = tasksLoading || !projectsLoaded;

  // If a week navigation moves the selected day out of range, snap back to
  // the first visible day so "Day" view never shows a stale/impossible date.
  useEffect(() => {
    if (!days.some((day) => day.dateKey === selectedDayKey)) {
      setSelectedDayKey(days.some((day) => day.isToday) ? todayKey : days[0]?.dateKey ?? todayKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const [showWeekAddForm, setShowWeekAddForm] = useState(false);
  const [weekAddTitle, setWeekAddTitle] = useState("");
  const [weekAddDay, setWeekAddDay] = useState(todayKey);

  const [showTodayAddForm, setShowTodayAddForm] = useState(false);
  const [todayAddTitle, setTodayAddTitle] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const tasksByDay = useMemo(() => {
    const map = new Map<string, DashboardTask[]>();
    for (const day of days) map.set(day.dateKey, []);
    for (const task of tasks) {
      if (map.has(task.task_date)) map.get(task.task_date)!.push(task);
    }
    return map;
  }, [days, tasks]);

  const visibleDays = view === "Day" ? days.filter((day) => day.dateKey === selectedDayKey) : days;

  const todayTasks = tasksByDay.get(todayKey) ?? [];
  const totalToday = todayTasks.length;
  const doneToday = todayTasks.filter((task) => task.status === "completed").length;

  const totalWeek = tasks.length;
  const doneWeek = tasks.filter((task) => task.status === "completed").length;
  const weekPercent = totalWeek ? Math.round((doneWeek / totalWeek) * 100) : 0;
  const todayPercent = totalToday ? Math.round((doneToday / totalToday) * 100) : 0;
  const manualWeekTasks = tasks.filter((task) => task.origin === "manual");
  const manualDoneCount = manualWeekTasks.filter((task) => task.status === "completed").length;

  const stats: Array<{ detail: string; icon: AppIconName; label: string; side: string; subside: string; value: string }> = [
    { icon: "calendar", label: "Scheduled this week", value: String(totalWeek), detail: "Tasks planned this week", side: `${weekPercent}%`, subside: "completed" },
    { icon: "check-square", label: "Completed this week", value: String(doneWeek), detail: "Marked done", side: String(totalWeek - doneWeek), subside: "left to do" },
    { icon: "clock", label: "Completed today", value: `${doneToday} / ${totalToday}`, detail: "Today's tasks completed", side: `${todayPercent}%`, subside: "of today's plan" },
    { icon: "list", label: "Checkpoints added", value: String(manualWeekTasks.length), detail: "Added by you this week", side: String(manualDoneCount), subside: "completed" },
  ];

  function taskMatchesSearch(task: DashboardTask) {
    if (!normalizedQuery) return true;
    return `${task.title} ${task.subtitle ?? ""}`.toLowerCase().includes(normalizedQuery);
  }

  function visibleTasksFor(dateKey: string) {
    const dayTasks = tasksByDay.get(dateKey) ?? [];
    return hideCompleted ? dayTasks.filter((task) => task.status !== "completed") : dayTasks;
  }

  function openWeekAddForm() {
    setWeekAddDay(days.some((day) => day.dateKey === todayKey) ? todayKey : days[0]?.dateKey ?? todayKey);
    setWeekAddTitle("");
    setShowWeekAddForm(true);
  }

  async function submitWeekAddForm() {
    if (!weekAddTitle.trim()) return;
    await addTask(weekAddTitle, weekAddDay);
    setWeekAddTitle("");
    setShowWeekAddForm(false);
  }

  async function submitTodayAddForm() {
    if (!todayAddTitle.trim()) return;
    await addTask(todayAddTitle, todayKey);
    setTodayAddTitle("");
    setShowTodayAddForm(false);
  }

  const canAddTasks = Boolean(userId) && projects.length > 0;
  const weekRangeLabel =
    days.length === 7 ? `${formatShort(days[0].date)} - ${formatShort(days[6].date)} ${days[6].date.getFullYear()}` : "";
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className={styles.schedulePage}>
      <header className={styles.hero}>
        <div>
          <p className={styles.breadcrumb}>
            <Link href="/dashboard">Dashboard</Link>
            <span>/</span>
            <span>Full Schedule</span>
          </p>
          <h1>Research Schedule</h1>
          <p className={styles.subtitle}>Plan your research work, protect focus time, and stay on track with your goals.</p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.toolbarTop}>
            <div className={styles.segmented} aria-label="Calendar view">
              {(["Day", "Week"] as const).map((item) => (
                <button
                  className={item === view ? styles.segmentActive : ""}
                  key={item}
                  onClick={() => setView(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className={styles.datePicker}>
              <AppIcon name="calendar" />
              <strong>{view === "Day" ? days.find((d) => d.dateKey === selectedDayKey)?.date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) ?? weekRangeLabel : weekRangeLabel}</strong>
              <button aria-label="Previous week" onClick={() => setAnchorDate((current) => addDays(current, -7))} type="button">
                <AppIcon name="arrow-left" />
              </button>
              <button aria-label="Next week" onClick={() => setAnchorDate((current) => addDays(current, 7))} type="button">
                <AppIcon name="arrow-right" />
              </button>
            </div>
            <label className={styles.searchBox}>
              <AppIcon name="search" />
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tasks..."
                type="search"
                value={query}
              />
            </label>
          </div>
          <div className={styles.toolbarBottom}>
            {projects.length > 1 ? (
              <select
                aria-label="Project scope"
                className={styles.projectSelect}
                onChange={(event) => setProjectFilter(event.target.value)}
                value={projectFilter}
              >
                <option value="all">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              className={styles.filterButton}
              onClick={() => setHideCompleted((current) => !current)}
              type="button"
            >
              <AppIcon name="sliders" />
              {hideCompleted ? "Show completed" : "Hide completed"}
            </button>
            <button
              className={styles.primaryButton}
              disabled={!canAddTasks}
              onClick={openWeekAddForm}
              title={canAddTasks ? undefined : userId ? "Create a project first" : "Sign in to add tasks"}
              type="button"
            >
              <AppIcon name="plus" />
              Add task / checkpoint
            </button>
          </div>
          {showWeekAddForm ? (
            <form
              className={styles.addForm}
              onSubmit={(event) => {
                event.preventDefault();
                void submitWeekAddForm();
              }}
            >
              <input
                autoFocus
                onChange={(event) => setWeekAddTitle(event.target.value)}
                placeholder="Task title"
                type="text"
                value={weekAddTitle}
              />
              <select onChange={(event) => setWeekAddDay(event.target.value)} value={weekAddDay}>
                {days.map((day) => (
                  <option key={day.dateKey} value={day.dateKey}>
                    {day.label} {day.dayNumber}
                  </option>
                ))}
              </select>
              <button className={styles.primaryButton} type="submit">
                Save
              </button>
              <button type="button" onClick={() => setShowWeekAddForm(false)}>
                Cancel
              </button>
            </form>
          ) : null}
        </div>
      </header>

      <section className={styles.statsRow} aria-label="Schedule summary">
        {stats.map((stat) => (
          <article className={styles.statCard} key={stat.label}>
            <span className={styles.statIcon}>
              <AppIcon name={stat.icon} />
            </span>
            <div>
              <h2>{stat.label}</h2>
              <strong>{stat.value}</strong>
              <p>{stat.detail}</p>
            </div>
            <span className={styles.statSide}>
              <strong>{stat.side}</strong>
              {stat.subside ? <span>{stat.subside}</span> : null}
            </span>
          </article>
        ))}
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.weekCalendar} aria-label={`${view} schedule`}>
          <div className={styles.dayHeaderGrid} style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}>
            {visibleDays.map((day) => (
              <button
                className={styles.dayHeader}
                key={day.dateKey}
                onClick={() => {
                  setSelectedDayKey(day.dateKey);
                  setView("Day");
                }}
                type="button"
              >
                <span>{day.label}</span>
                <strong className={day.isToday ? styles.activeDate : ""}>{day.dayNumber}</strong>
              </button>
            ))}
          </div>

          <div className={styles.calendarBody}>
            <div
              className={styles.daysGrid}
              style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}
            >
              {visibleDays.map((day) => {
                const dayTasks = visibleTasksFor(day.dateKey);
                return (
                  <div className={styles.dayColumn} key={day.dateKey}>
                    {loading ? (
                      <p className={styles.emptyDay}>Loading...</p>
                    ) : dayTasks.length === 0 ? (
                      <p className={styles.emptyDay}>No tasks this week yet</p>
                    ) : (
                      dayTasks.map((task) => {
                        const isHidden = !taskMatchesSearch(task);
                        const tone = toneForTask(task);
                        const completed = task.status === "completed";
                        return (
                          <article
                            className={`${styles.eventCard} ${styles[tone]} ${isHidden ? styles.eventHidden : ""} ${
                              completed ? styles.eventDone : ""
                            }`}
                            key={task.id}
                          >
                            <button
                              aria-label={completed ? "Mark incomplete" : "Mark complete"}
                              className={styles.eventIcon}
                              onClick={() => void completeTask(task.id)}
                              type="button"
                            >
                              <AppIcon name={completed ? "check-square" : iconForTask(task)} />
                            </button>
                            <div>
                              <span className={styles.eventTime}>
                                {task.scheduled_time || originLabel(task.origin)}
                              </span>
                              <h3>{task.title}</h3>
                              {task.subtitle ? <p>{task.subtitle}</p> : null}
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className={styles.rightRail} aria-label="Schedule details">
          <article className={`${styles.railCard} ${styles.notesCard}`}>
            <header className={styles.railHeader}>
              <h2>
                Today <span>· {todayLabel}</span>
              </h2>
              <button
                onClick={() => {
                  setSelectedDayKey(todayKey);
                  setView("Day");
                }}
                type="button"
              >
                View day
              </button>
            </header>

            <div className={styles.todayList}>
              {loading ? (
                <p className={styles.emptyDay}>Loading...</p>
              ) : (hideCompleted ? todayTasks.filter((task) => task.status !== "completed") : todayTasks).length === 0 ? (
                <p className={styles.emptyDay}>No tasks this week yet</p>
              ) : (
                (hideCompleted ? todayTasks.filter((task) => task.status !== "completed") : todayTasks).map((task) => {
                  const tone = toneForTask(task);
                  const completed = task.status === "completed";
                  return (
                    <div className={styles.todayItem} key={task.id}>
                      <button
                        aria-label={completed ? "Mark incomplete" : "Mark complete"}
                        className={`${styles.todayDot} ${styles[tone]} ${completed ? styles.todayDotDone : ""}`}
                        onClick={() => void completeTask(task.id)}
                        type="button"
                      />
                      <span className={styles.todayTime}>{task.scheduled_time || "--:--"}</span>
                      <span className={styles.todayIcon}>
                        <AppIcon name={iconForTask(task)} />
                      </span>
                      <div>
                        <h3>{task.title}</h3>
                        <p>{task.subtitle || originLabel(task.origin)}</p>
                      </div>
                      <span className={`${styles.todayTag} ${styles[tone]}`}>{completed ? "Done" : originLabel(task.origin)}</span>
                    </div>
                  );
                })
              )}
            </div>

            {showTodayAddForm ? (
              <form
                className={styles.railAddForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitTodayAddForm();
                }}
              >
                <input
                  autoFocus
                  onChange={(event) => setTodayAddTitle(event.target.value)}
                  placeholder="Task title"
                  type="text"
                  value={todayAddTitle}
                />
                <div>
                  <button className={styles.primaryButton} type="submit">
                    Save
                  </button>
                  <button type="button" onClick={() => setShowTodayAddForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                className={styles.addTaskButton}
                disabled={!canAddTasks}
                onClick={() => setShowTodayAddForm(true)}
                title={canAddTasks ? undefined : userId ? "Create a project first" : "Sign in to add tasks"}
                type="button"
              >
                <AppIcon name="plus" />
                Add task
              </button>
            )}
          </article>

          <article className={styles.railCard}>
            <header className={styles.railHeader}>
              <h2>This week</h2>
            </header>
            <div className={styles.deadlineList}>
              <div className={styles.deadlineItem}>
                <span>
                  <AppIcon name="calendar" />
                </span>
                <div>
                  <h3>Planned</h3>
                  <p>Tasks scheduled this week</p>
                </div>
                <strong>{totalWeek}</strong>
              </div>
              <div className={styles.deadlineItem}>
                <span>
                  <AppIcon name="check-square" />
                </span>
                <div>
                  <h3>Completed</h3>
                  <p>Marked done this week</p>
                </div>
                <strong>{doneWeek}</strong>
              </div>
              <div className={styles.deadlineItem}>
                <span>
                  <AppIcon name="list" />
                </span>
                <div>
                  <h3>Remaining</h3>
                  <p>Still pending this week</p>
                </div>
                <strong>{totalWeek - doneWeek}</strong>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </div>
  );
}
