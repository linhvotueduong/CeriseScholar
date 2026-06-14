"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell/AppShell";
import { AppIcon } from "@/components/app-shell/AppIcons";
import type { AppIconName } from "@/components/app-shell/AppIcons";
import CourseCard from "@/components/app-ui/CourseCard";
import {
  AppPageFrame,
  CourseLibraryLayoutGrid,
} from "@/components/app-ui/LayoutGrids";
import {
  courseCalendar,
  courseLibraryCards,
  recentMaterials,
  recommendedCourses,
} from "@/lib/app-data/courseLibrary";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import type { CourseModule, CourseVideo } from "@/types/course";
import styles from "./page.module.css";

const tabs = ["All Courses", "In Progress", "Completed", "Saved"];

function formatLearningTime(minutes: number) {
  if (!minutes) return "24h 36m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export default function CoursesLandingPage() {
  const { user, loading: userLoading } = useUser();
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [videos, setVideos] = useState<CourseVideo[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("All Courses");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCourseLibrary() {
      const supabase = createClient();
      const [modsRes, vidsRes] = await Promise.all([
        supabase
          .from("course_modules")
          .select("*")
          .order("module_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("course_videos")
          .select("*")
          .order("video_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      const publishedModules = ((modsRes.data ?? []) as CourseModule[]).filter((module) => module.is_published);
      const moduleIds = new Set(publishedModules.map((module) => module.id));
      const publishedVideos = ((vidsRes.data ?? []) as CourseVideo[]).filter((video) => moduleIds.has(video.module_id));
      const nextWatchedIds = new Set<string>();

      if (user) {
        const progressRes = await supabase
          .from("course_progress")
          .select("video_id")
          .eq("user_id", user.id);
        (progressRes.data ?? []).forEach((row: { video_id: string }) => nextWatchedIds.add(row.video_id));
      }

      if (cancelled) return;
      setModules(publishedModules);
      setVideos(publishedVideos);
      setWatchedIds(nextWatchedIds);
    }

    if (!userLoading) void loadCourseLibrary();
    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  const totalLessons = videos.length || 21;
  const lessonsCompleted = watchedIds.size || 21;
  const learningMinutes = videos
    .filter((video) => watchedIds.has(video.id))
    .reduce((sum, video) => sum + (video.duration_minutes ?? 0), 0);

  const cards = useMemo(() => {
    const filtered = courseLibraryCards.filter((course) =>
      `${course.title} ${course.body}`.toLowerCase().includes(query.toLowerCase())
    );
    if (activeTab === "Completed") return filtered.filter((course) => course.progress >= 100);
    if (activeTab === "In Progress") return filtered.filter((course) => course.progress > 0 && course.progress < 100);
    if (activeTab === "Saved") return filtered.slice(1, 3);
    return filtered;
  }, [activeTab, query]);

  const courseStats: Array<{
    detail: string;
    icon: AppIconName;
    label: string;
    success?: boolean;
    value: string | number;
  }> = [
    { icon: "book-open", label: "Active courses", value: modules.length || 2, detail: "Courses in progress" },
    { icon: "check-square", label: "Lessons completed", value: lessonsCompleted, detail: `${totalLessons} available` },
    { icon: "file", label: "Notes created", value: "12", detail: "Course notes" },
    { icon: "clock", label: "Learning time", value: formatLearningTime(learningMinutes), detail: "Across courses" },
    { icon: "trophy", label: "Course completed", value: "1", detail: "Finished", success: true },
  ];

  return (
    <AppShell contentClassName={styles.courseMain}>
      <AppPageFrame className={`${styles.courseFrame} max-w-[1380px] px-1`}>
        <CourseLibraryLayoutGrid className={`${styles.courseLayout} xl:grid-cols-[minmax(0,1fr)_320px]`}>
          <div className={styles.courseContent}>
            <header className={`${styles.courseHeader} mb-4 grid min-h-[76px] gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end`}>
              <div className="min-w-0">
                <p className="mb-1.5 text-[11px] font-[850] leading-none text-[#a87f4f]">Course</p>
                <h1 className="m-0 text-[30px] font-[850] leading-none tracking-normal text-[#111111]">
                  Course Library
                </h1>
                <p className="mt-2 max-w-[520px] text-[13px] font-semibold leading-[1.45] text-[#625a52]">
                  Access your lessons, course materials, readings, notes, and research skill paths in one place.
                </p>
              </div>
              <div className={`${styles.courseActions} mb-1 flex shrink-0 items-center gap-2`}>
                <button className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#d8d3ce] bg-white px-3.5 text-[12px] font-[850] text-[#111111]" type="button">
                  <AppIcon className="h-4 w-4" name="upload" />
                  Export report
                </button>
                <button className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#111111] bg-[#111111] px-3.5 text-[12px] font-[850] text-white" type="button">
                  <AppIcon className="h-4 w-4" name="settings" />
                  Report settings
                </button>
              </div>
            </header>

            <div className={`${styles.courseControls} grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center`}>
              <div className="relative min-w-0">
                <AppIcon className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6f6760]" name="search" />
                <input
                  className="h-8 w-full rounded-[8px] border border-[#d8d3ce] bg-white px-9 text-[11px] font-semibold text-[#17120d] outline-none placeholder:text-[#8b8178]"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search courses, materials, or topics..."
                  type="search"
                  value={query}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    className={`h-8 rounded-full px-4 text-[11px] font-bold ${
                      activeTab === tab ? "bg-[#e9e2d8] text-[#111111]" : "bg-[#f3f1ee] text-[#4f4842]"
                    }`}
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    type="button"
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className={`${styles.statsRow} mt-2.5 grid gap-2 md:grid-cols-2 xl:grid-cols-5`}>
              {courseStats.map((stat) => (
                <article
                  className={`${styles.statCard} min-h-[58px] rounded-[9px] border border-[#e5e1dc] bg-white px-3 py-1.5 shadow-[0_1px_0_rgba(17,17,17,0.02)]`}
                  key={stat.label}
                >
                  <div className="flex h-full items-center gap-2">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                        stat.success
                          ? "border-[#cde9cc] bg-[#eef8ed] text-[#17952a]"
                          : "border-[#ece8e3] bg-white text-[#17120d]"
                      }`}
                    >
                      <AppIcon className="h-3.5 w-3.5" name={stat.icon} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-[850] leading-none text-[#17120d]">{stat.label}</p>
                      <p
                        className={`mt-0.5 text-[18px] font-[850] leading-none ${
                          stat.success ? "text-[#14912a]" : "text-[#111111]"
                        }`}
                      >
                        {stat.value}
                      </p>
                      <p className="mt-0.5 text-[9.5px] font-semibold leading-none text-[#625a52]">{stat.detail}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className={`${styles.courseRailInline} mt-3 grid gap-2.5`}>
              <ContinueLearningCard />
              <RecommendedForYouCard />
            </div>

            <section className={`${styles.courseCardsSection} mt-3 rounded-[10px] border border-[#e5e1dc] bg-white px-2.5 py-3`}>
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-[850] leading-none text-[#111111]">Your Course</h2>
                <Link className="inline-flex items-center gap-1 text-[11px] font-[850] text-[#8a5b10] no-underline" href="/courses/learn">
                  <span>View all lessons</span>
                </Link>
              </div>
              <div className={`${styles.courseCardsGrid} mt-3 grid gap-2 lg:grid-cols-3`}>
                {cards.map((course) => (
                  <CourseCard
                    action={
                      <Link
                        className="block rounded-[7px] border border-[#d8d3ce] px-3 py-1.5 text-center text-[10px] font-[850] text-[#8a5b10] no-underline"
                        href="/courses/learn"
                      >
                        {course.progress ? "Continue learning" : "Start Learning"}
                      </Link>
                    }
                    badge={course.badge}
                    key={course.title}
                    lessons={course.lessons}
                    modules={course.modules}
                    notes={course.notes}
                    progress={course.progress}
                    remaining={course.remaining}
                    title={course.title}
                  >
                    {course.body}
                  </CourseCard>
                ))}
              </div>
            </section>

            <section className={`${styles.materialsSection} mt-3 rounded-[10px] border border-[#e5e1dc] bg-white p-3`}>
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-[850] text-[#111111]">Recent Materials</h2>
                <button className="inline-flex items-center gap-1 text-[11px] font-[850] text-[#8a5b10]" type="button">
                  <span>View all materials</span>
                </button>
              </div>
              <div className={`${styles.materialsTable} mt-2.5 overflow-hidden rounded-[8px] border border-[#eeeae5]`}>
                {recentMaterials.map(([title, course, kind, date]) => (
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_72px_58px] gap-3 border-t border-[#eeeae5] px-3 py-1.5 text-[10px] first:border-t-0" key={title}>
                    <span className="truncate font-bold text-[#111111]">{title}</span>
                    <span className="text-[#625a52]">{course}</span>
                    <span className="rounded-full bg-[#f7f5f2] px-2 py-0.5 text-center text-[10px] font-bold text-[#4f4842]">
                      {kind}
                    </span>
                    <span className="text-right text-[#625a52]">{date}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={`${styles.progressStrip} mt-3 grid items-center gap-3 rounded-[10px] border border-[#eadfce] bg-[#fffaf2] px-3 py-2 lg:grid-cols-[34px_minmax(190px,1fr)_112px_112px_90px_150px_auto]`}>
              <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#fff0c8] text-[#9a7b55]">
                <AppIcon className="h-3.5 w-3.5" name="trophy" />
              </div>
              <div>
                <h2 className="text-[15px] font-[850] text-[#111111]">Keep going, Win!</h2>
                <p className="mt-0.5 text-[11px] text-[#625a52]">You&apos;re building strong research skills every day.</p>
              </div>
              <Metric label="Total learning time" value={formatLearningTime(learningMinutes)} />
              <Metric label="Courses completed" value="1" />
              <Metric label="Weekly goal" value="68%" />
              <Metric label="Next milestone" value="Finish Module 5" />
              <Link className="rounded-[8px] border border-[#a87f4f] px-3 py-1.5 text-[10px] font-bold text-[#8a5b10] no-underline" href="/my-learning">
                View my progress
              </Link>
            </section>
          </div>

          <aside className={`${styles.courseRail} grid min-w-0 content-start gap-2.5 xl:pt-[53px]`}>
            <ContinueLearningCard />
            <RecommendedForYouCard />
            <CourseCalendarCard />
          </aside>
        </CourseLibraryLayoutGrid>
      </AppPageFrame>
    </AppShell>
  );
}

function ContinueLearningCard() {
  return (
    <article className={`${styles.railCard} rounded-[10px] border border-[#e5e1dc] bg-white px-2.5 py-3`}>
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-[850] text-[#111111]">Continue Learning</h2>
        <Link className="text-[10px] font-bold text-[#8a5b10] no-underline" href="/courses/learn">
          View all
        </Link>
      </div>
      <div className="mt-2.5 grid gap-2 sm:grid-cols-[92px_1fr] xl:grid-cols-1">
        <div className="relative min-h-[98px] overflow-hidden rounded-[9px] bg-gradient-to-br from-[#f2eadb] via-[#fbf7f0] to-[#e8dfd0]">
          <Image
            alt=""
            className="absolute inset-0 h-full w-full object-contain p-3"
            fill
            sizes="160px"
            src="/assets/hedgehogs/hedgehog11LitBook.png"
          />
        </div>
        <div>
          <p className="text-[10.5px] text-[#625a52]">Current lesson</p>
          <h3 className="mt-1.5 text-[14px] font-[850] text-[#111111]">Evidence synthesis</h3>
          <p className="mt-1.5 text-[10.5px] leading-[1.55] text-[#625a52]">
            Finish the comparison notes, review the example matrix, then continue to citation mapping.
          </p>
          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-xs">
            <Metric label="Module progress" value="75%" />
            <Metric label="Notes" value="8" />
            <Metric label="Time left" value="35m" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link className="rounded-[7px] bg-[#111111] px-3 py-1.5 text-center text-[10px] font-bold leading-[1.45] text-white no-underline" href="/courses/learn">
              Resume lesson
            </Link>
            <Link className="rounded-[7px] border border-[#d8d3ce] px-3 py-1.5 text-center text-[10px] font-bold leading-[1.45] text-[#111111] no-underline" href="/my-learning/notes">
              View notes
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function RecommendedForYouCard() {
  return (
    <article className={`${styles.railCard} rounded-[10px] border border-[#e5e1dc] bg-white p-2.5`}>
      <h2 className="text-[14px] font-[850] text-[#111111]">Recommended for you</h2>
      <div className="mt-2.5 grid gap-2">
        {recommendedCourses.map(([title, body, lessons]) => (
          <div className="grid grid-cols-[42px_minmax(0,1fr)_14px] gap-2" key={title}>
            <div className="flex min-h-[42px] items-center justify-center rounded-[8px] bg-[#f3f0ed] text-[#625a52]">
              <AppIcon aria-hidden="true" className="h-[20px] w-[20px]" name="file" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[11px] font-bold leading-tight text-[#111111]">{title}</p>
              <p className="mt-0.5 text-[10px] leading-4 text-[#625a52]">{body}</p>
              <p className="mt-0.5 text-[10px] font-bold text-[#8a5b10]">{lessons}</p>
            </div>
            <svg
              aria-hidden="true"
              className="h-4 w-4 text-[#625a52]"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v15l-6.5-4-6.5 4V6A1.5 1.5 0 0 1 7 4.5Z" />
            </svg>
          </div>
        ))}
      </div>
    </article>
  );
}

function CourseCalendarCard() {
  return (
    <article className={`${styles.railCard} rounded-[10px] border border-[#e5e1dc] bg-white p-2.5`}>
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-[850] text-[#111111]">Course Calendar</h2>
        <button className="inline-flex items-center gap-1 text-[10px] font-bold text-[#8a5b10]" type="button">
          <span>View full calendar</span>
        </button>
      </div>
      <div className="mt-2.5 grid gap-1.5">
        {courseCalendar.map(([date, title, course, time]) => (
          <div className="grid grid-cols-[34px_1fr] gap-2" key={`${date}-${title}`}>
            <span className="rounded-[7px] bg-[#f7f5f2] p-1 text-center text-[10px] font-bold">{date}</span>
            <div>
              <p className="text-[11px] font-bold leading-tight text-[#111111]">{title}</p>
              <p className="text-[10px] leading-4 text-[#625a52]">{course}</p>
              <p className="text-[10px] font-bold text-[#111111]">{time}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="whitespace-nowrap text-[10px] leading-tight text-[#625a52]">{label}</p>
      <p className="mt-0.5 text-[13px] font-[850] leading-none text-[#111111]">{value}</p>
    </div>
  );
}
