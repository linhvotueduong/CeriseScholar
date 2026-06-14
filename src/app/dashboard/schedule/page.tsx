"use client";

import { useState } from "react";
import Link from "next/link";
import { AppIcon, type AppIconName } from "@/components/app-shell/AppIcons";
import styles from "./page.module.css";

type Tone = "rose" | "blue" | "purple" | "green" | "amber" | "neutral";

type ScheduleEvent = {
  day: number;
  end: number;
  icon: AppIconName;
  start: number;
  subtitle: string;
  title: string;
  tone: Tone;
};

const hourHeight = 52;

const days = [
  { name: "Mon", date: "13" },
  { name: "Tue", date: "14" },
  { name: "Wed", date: "15", active: true },
  { name: "Thu", date: "16" },
  { name: "Fri", date: "17" },
  { name: "Sat", date: "18" },
  { name: "Sun", date: "19" },
];

const stats: Array<{
  detail: string;
  icon: AppIconName;
  label: string;
  side: string;
  subside: string;
  value: string;
}> = [
  { icon: "clock", label: "Focus time", value: "18h 30m", detail: "Scheduled this week", side: "+12%", subside: "vs last week" },
  { icon: "calendar", label: "Scheduled sessions", value: "18", detail: "Across all projects", side: "+3", subside: "vs last week" },
  { icon: "check-square", label: "Completed today", value: "2 / 4", detail: "Tasks completed", side: "50%", subside: "of today's plan" },
  { icon: "list", label: "Open checkpoints", value: "5", detail: "Require your review", side: "2 due soon", subside: "" },
];

const weekEvents: ScheduleEvent[] = [
  { day: 0, start: 9, end: 11, icon: "edit", title: "Literature review sprint", subtitle: "Rows 1-12", tone: "rose" },
  { day: 0, start: 11.25, end: 12.25, icon: "laptop", title: "Methods review", subtitle: "Study design", tone: "purple" },
  { day: 0, start: 14, end: 15.5, icon: "workflow", title: "Meta-analysis deep work", subtitle: "Model specification", tone: "blue" },
  { day: 0, start: 16, end: 17, icon: "refresh", title: "Citation cleanup", subtitle: "Zotero sync", tone: "amber" },
  { day: 1, start: 8.5, end: 10.5, icon: "search", title: "Evidence search", subtitle: "New database", tone: "blue" },
  { day: 1, start: 11, end: 12, icon: "edit", title: "Writing block", subtitle: "Methods draft", tone: "rose" },
  { day: 1, start: 13.5, end: 15, icon: "dashboard", title: "Data extraction", subtitle: "Pilot coding", tone: "green" },
  { day: 1, start: 16, end: 17.5, icon: "users", title: "Team sync", subtitle: "Project updates", tone: "purple" },
  { day: 2, start: 9, end: 10.5, icon: "edit", title: "Literature review sprint", subtitle: "Rows 13-26", tone: "rose" },
  { day: 2, start: 10.5, end: 12, icon: "workflow", title: "Evidence connection", subtitle: "Synthesis table", tone: "purple" },
  { day: 2, start: 13, end: 14, icon: "file", title: "Source note cleanup", subtitle: "Add notes & tags", tone: "blue" },
  { day: 2, start: 15, end: 16, icon: "edit", title: "Project check-in", subtitle: "Review next steps", tone: "amber" },
  { day: 2, start: 16.25, end: 17.25, icon: "refresh", title: "Citation cleanup", subtitle: "Reference dedup", tone: "green" },
  { day: 3, start: 8.5, end: 10.5, icon: "edit", title: "Meta-analysis deep work", subtitle: "Results modeling", tone: "purple" },
  { day: 3, start: 11, end: 12, icon: "edit", title: "Writing block", subtitle: "Results section", tone: "rose" },
  { day: 3, start: 14, end: 15, icon: "laptop", title: "Methods review", subtitle: "Quality assessment", tone: "blue" },
  { day: 3, start: 16, end: 17, icon: "users", title: "Team sync", subtitle: "Feedback loop", tone: "purple" },
  { day: 4, start: 8, end: 10.5, icon: "file", title: "Database update", subtitle: "Import new papers", tone: "blue" },
  { day: 4, start: 11, end: 12, icon: "edit", title: "Writing block", subtitle: "Discussion outline", tone: "rose" },
  { day: 4, start: 13.5, end: 15, icon: "refresh", title: "Data analysis", subtitle: "Sensitivity checks", tone: "green" },
  { day: 4, start: 16, end: 17, icon: "calendar", title: "Checkpoint review", subtitle: "Open items", tone: "amber" },
  { day: 5, start: 10, end: 12, icon: "target", title: "Focus block", subtitle: "Deep reading", tone: "neutral" },
  { day: 5, start: 13, end: 15, icon: "clock", title: "Optional focus", subtitle: "Flex time", tone: "neutral" },
  { day: 6, start: 9, end: 11, icon: "calendar", title: "Plan & prep", subtitle: "Next week", tone: "neutral" },
  { day: 6, start: 15, end: 16, icon: "workflow", title: "Weekly review", subtitle: "Reflect & adjust", tone: "neutral" },
];

const todayItems = [
  { time: "09:00", icon: "edit" as AppIconName, title: "Literature review sprint", subtitle: "Rows 13-26", tag: "Focus", tone: "rose" as Tone },
  { time: "10:30", icon: "workflow" as AppIconName, title: "Evidence connection", subtitle: "Synthesis table", tag: "Analysis", tone: "purple" as Tone },
  { time: "13:00", icon: "file" as AppIconName, title: "Source note cleanup", subtitle: "Add notes & tags", tag: "Admin", tone: "blue" as Tone },
  { time: "15:00", icon: "edit" as AppIconName, title: "Project check-in", subtitle: "Review next steps", tag: "Meeting", tone: "amber" as Tone },
];

const deadlines = [
  { date: "17 May", icon: "clock" as AppIconName, title: "Scoping review protocol", subtitle: "Draft due" },
  { date: "20 May", icon: "calendar" as AppIconName, title: "PRISMA flow diagram", subtitle: "Figures update" },
  { date: "24 May", icon: "workflow" as AppIconName, title: "Results section draft", subtitle: "Manuscript" },
];

const notes = [
  { dot: "rose" as Tone, text: "Check APA 7th edition updates before manuscript writing.", time: "08:45" },
  { dot: "blue" as Tone, text: "Ask team about inter-rater reliability plan.", time: "08:46" },
];

function formatTime(value: number) {
  const hour = Math.floor(value);
  const minute = Math.round((value - hour) * 60);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default function DashboardSchedulePage() {
  const [view, setView] = useState("Week");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

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
              {["Day", "Week", "Month"].map((item) => (
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
              <strong>13 - 19 May 2024</strong>
              <button aria-label="Previous week" type="button">
                <AppIcon name="arrow-left" />
              </button>
              <button aria-label="Next week" type="button">
                <AppIcon name="arrow-right" />
              </button>
            </div>
            <label className={styles.searchBox}>
              <AppIcon name="search" />
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search events..."
                type="search"
                value={query}
              />
            </label>
          </div>
          <div className={styles.toolbarBottom}>
            <button className={styles.filterButton} type="button">
              <AppIcon name="sliders" />
              Filter
            </button>
            <button className={styles.primaryButton} type="button">
              <AppIcon name="plus" />
              Add task / checkpoint
            </button>
          </div>
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
          <div className={styles.dayHeaderGrid}>
            <span aria-hidden="true" />
            {days.map((day) => (
              <div className={styles.dayHeader} key={day.date}>
                <span>{day.name}</span>
                <strong className={day.active ? styles.activeDate : ""}>{day.date}</strong>
              </div>
            ))}
          </div>

          <div className={styles.calendarBody}>
            <div className={styles.timeAxis}>
              {Array.from({ length: 12 }, (_, index) => (
                <span key={index}>{String(index + 7).padStart(2, "0")}:00</span>
              ))}
            </div>
            <div className={styles.daysGrid}>
              {days.map((day, dayIndex) => (
                <div className={styles.dayColumn} key={day.date}>
                  {dayIndex === 2 ? <span className={styles.nowLine} /> : null}
                  {weekEvents
                    .filter((event) => event.day === dayIndex)
                    .map((event) => {
                      const isHidden =
                        normalizedQuery.length > 0 &&
                        !`${event.title} ${event.subtitle}`.toLowerCase().includes(normalizedQuery);

                      return (
                        <article
                          className={`${styles.eventCard} ${styles[event.tone]} ${isHidden ? styles.eventHidden : ""}`}
                          key={`${event.day}-${event.start}-${event.title}`}
                          style={{
                            height: `${Math.max(62, (event.end - event.start) * hourHeight - 10)}px`,
                            top: `${(event.start - 7) * hourHeight + 8}px`,
                          }}
                        >
                          <span className={styles.eventIcon}>
                            <AppIcon name={event.icon} />
                          </span>
                          <div>
                            <span className={styles.eventTime}>
                              {formatTime(event.start)} - {formatTime(event.end)}
                            </span>
                            <h3>{event.title}</h3>
                            <p>{event.subtitle}</p>
                          </div>
                        </article>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className={styles.rightRail} aria-label="Schedule details">
          <article className={`${styles.railCard} ${styles.notesCard}`}>
            <header className={styles.railHeader}>
              <h2>
                Today <span>· Wed, 15 May</span>
              </h2>
              <button type="button">View day</button>
            </header>

            <div className={styles.todayList}>
              {todayItems.map((item) => (
                <div className={styles.todayItem} key={item.time}>
                  <span className={`${styles.todayDot} ${styles[item.tone]}`} />
                  <span className={styles.todayTime}>{item.time}</span>
                  <span className={styles.todayIcon}>
                    <AppIcon name={item.icon} />
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.subtitle}</p>
                  </div>
                  <span className={`${styles.todayTag} ${styles[item.tone]}`}>{item.tag}</span>
                </div>
              ))}
            </div>

            <button className={styles.addTaskButton} type="button">
              <AppIcon name="plus" />
              Add task
            </button>
          </article>

          <article className={styles.railCard}>
            <header className={styles.railHeader}>
              <h2>Upcoming deadlines</h2>
              <button type="button">View all</button>
            </header>
            <div className={styles.deadlineList}>
              {deadlines.map((deadline) => (
                <div className={styles.deadlineItem} key={deadline.title}>
                  <span>
                    <AppIcon name={deadline.icon} />
                  </span>
                  <div>
                    <h3>{deadline.title}</h3>
                    <p>{deadline.subtitle}</p>
                  </div>
                  <strong>{deadline.date}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.railCard}>
            <header className={styles.railHeader}>
              <h2>Notes for today</h2>
              <button type="button">
                <AppIcon name="plus" />
                New note
              </button>
            </header>
            <div className={styles.notesList}>
              {notes.map((note) => (
                <div className={styles.noteItem} key={note.text}>
                  <p>{note.text}</p>
                  <span>
                    {note.time}
                    <i className={styles[note.dot]} />
                  </span>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>

    </div>
  );
}
