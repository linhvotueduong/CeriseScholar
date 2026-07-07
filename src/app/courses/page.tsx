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
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import {
  computeContinueLearning,
  type LearningStatus,
} from "@/lib/dashboard/deriveDashboardState";
import type {
  CourseModule,
  CourseNote,
  CourseVideo,
  ModuleWithVideos,
} from "@/types/course";
import styles from "./page.module.css";

const tabs = ["All Courses", "In Progress", "Completed"];

type CourseProgressRow = { video_id: string; watched_at: string };

type CardStatus = "coming-soon" | "not-started" | "in-progress" | "complete";

type CourseCardData = {
  id: string;
  title: string;
  description: string;
  status: CardStatus;
  badgeLabel: string;
  progress: number;
  lessonsTotal: number;
  lessonsWatched: number;
  notesCount: number;
  remaining: number;
  ctaHref: string;
  ctaDisabled: boolean;
};

type ContinueLearningViewModel = {
  status: LearningStatus;
  headline: string;
  body: string;
  progress: number;
  modulesCompleted: number;
  lessonsDone: number;
  notesCreated: number;
  resumeHref: string;
};

type RecentNoteItem = {
  id: string;
  videoId: string;
  title: string;
  moduleTitle: string;
  snippet: string;
  date: string;
};

function formatLearningTime(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours}h ${mins}m`;
}

// Same friendly relative-time formatting used on /my-learning, kept local since
// that page is out of scope to import from.
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export default function CoursesLandingPage() {
  const { user, loading: userLoading } = useUser();
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [videos, setVideos] = useState<CourseVideo[]>([]);
  const [progressRows, setProgressRows] = useState<CourseProgressRow[]>([]);
  const [notes, setNotes] = useState<CourseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("All Courses");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCourseLibrary() {
      setLoading(true);
      setFetchError(null);
      const supabase = createClient();

      // RLS already limits course_modules/course_videos to published rows for
      // non-admin users, but we still fetch everything (like /courses/learn
      // does) so admin previews can show "Coming soon" for drafts.
      const modsRes = await supabase
        .from("course_modules")
        .select("*")
        .order("module_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (modsRes.error) {
        setFetchError(modsRes.error.message);
        setModules([]);
        setVideos([]);
        setProgressRows([]);
        setNotes([]);
        setLoading(false);
        return;
      }

      const [vidsRes, progressRes, notesRes] = await Promise.all([
        supabase
          .from("course_videos")
          .select("*")
          .order("video_order", { ascending: true })
          .order("created_at", { ascending: true }),
        user
          ? supabase
              .from("course_progress")
              .select("video_id, watched_at")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] as CourseProgressRow[] }),
        user
          ? supabase
              .from("course_notes")
              .select("*")
              .eq("user_id", user.id)
              .order("updated_at", { ascending: false })
          : Promise.resolve({ data: [] as CourseNote[] }),
      ]);

      if (cancelled) return;
      setModules((modsRes.data ?? []) as CourseModule[]);
      setVideos((vidsRes.data ?? []) as CourseVideo[]);
      setProgressRows((progressRes.data ?? []) as CourseProgressRow[]);
      setNotes((notesRes.data ?? []) as CourseNote[]);
      setLoading(false);
    }

    if (!userLoading) void loadCourseLibrary();
    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  const videosByModule = useMemo(() => {
    const map = new Map<string, CourseVideo[]>();
    for (const video of videos) {
      const list = map.get(video.module_id) ?? [];
      list.push(video);
      map.set(video.module_id, list);
    }
    return map;
  }, [videos]);

  const joinedModules: ModuleWithVideos[] = useMemo(
    () => modules.map((module) => ({ ...module, videos: videosByModule.get(module.id) ?? [] })),
    [modules, videosByModule]
  );

  const moduleByVideoId = useMemo(() => {
    const map = new Map<string, CourseModule>();
    for (const mod of modules) {
      for (const video of videosByModule.get(mod.id) ?? []) map.set(video.id, mod);
    }
    return map;
  }, [modules, videosByModule]);

  const videoById = useMemo(() => {
    const map = new Map<string, CourseVideo>();
    for (const video of videos) map.set(video.id, video);
    return map;
  }, [videos]);

  const watchedIds = useMemo(() => new Set(progressRows.map((row) => row.video_id)), [progressRows]);

  const publishedModules = useMemo(() => joinedModules.filter((module) => module.is_published), [joinedModules]);
  const allPublishedVideosOrdered = useMemo(
    () => publishedModules.flatMap((module) => module.videos),
    [publishedModules]
  );
  const totalPublishedVideos = allPublishedVideosOrdered.length;
  const lessonsWatched = useMemo(
    () => allPublishedVideosOrdered.filter((video) => watchedIds.has(video.id)).length,
    [allPublishedVideosOrdered, watchedIds]
  );
  const learningMinutes = useMemo(
    () =>
      allPublishedVideosOrdered
        .filter((video) => watchedIds.has(video.id))
        .reduce((sum, video) => sum + (video.duration_minutes ?? 0), 0),
    [allPublishedVideosOrdered, watchedIds]
  );
  const nextUnwatchedVideo = useMemo(
    () => allPublishedVideosOrdered.find((video) => !watchedIds.has(video.id)),
    [allPublishedVideosOrdered, watchedIds]
  );

  // Same derivation the /dashboard "Continue Learning" card uses, so this
  // widget can never show a different lesson/percentage than the dashboard.
  const continueLearningData: ContinueLearningViewModel = useMemo(() => {
    const result = computeContinueLearning({
      modules: modules as unknown as Record<string, unknown>[],
      videos: videos as unknown as Record<string, unknown>[],
      progress: progressRows as unknown as Record<string, unknown>[],
      notes: notes as unknown as Record<string, unknown>[],
    });
    const headline = result.lessonNumber
      ? `${result.lessonNumber} ${result.lessonTitle}`
      : result.lessonTitle || result.lesson;
    const resumeHref = nextUnwatchedVideo ? `/courses/learn?video=${nextUnwatchedVideo.id}` : "/courses/learn";
    return {
      status: result.status,
      headline,
      body: result.body,
      progress: result.progress,
      modulesCompleted: Number(result.stats[0][0]) || 0,
      lessonsDone: Number(result.stats[1][0]) || 0,
      notesCreated: Number(result.stats[2][0]) || 0,
      resumeHref,
    };
  }, [modules, videos, progressRows, notes, nextUnwatchedVideo]);

  const cardsData: CourseCardData[] = useMemo(
    () =>
      joinedModules.map((module) => {
        const lessonsTotal = module.videos.length;
        const watched = module.videos.filter((video) => watchedIds.has(video.id)).length;
        const progress = lessonsTotal === 0 ? 0 : Math.round((watched / lessonsTotal) * 100);
        const notesCount = notes.filter((note) => moduleByVideoId.get(note.video_id)?.id === module.id).length;
        const remaining = Math.max(0, lessonsTotal - watched);

        let status: CardStatus;
        let badgeLabel: string;
        if (!module.is_published) {
          status = "coming-soon";
          badgeLabel = "Coming soon";
        } else if (lessonsTotal === 0 || watched === 0) {
          status = "not-started";
          badgeLabel = "Not started";
        } else if (watched >= lessonsTotal) {
          status = "complete";
          badgeLabel = "Complete";
        } else {
          status = "in-progress";
          badgeLabel = "In progress";
        }

        const firstTarget = module.videos.find((video) => !watchedIds.has(video.id)) ?? module.videos[0];
        const ctaHref = firstTarget ? `/courses/learn?video=${firstTarget.id}` : "/courses/learn";

        return {
          id: module.id,
          title: module.title,
          description: module.description?.trim() || "No description yet.",
          status,
          badgeLabel,
          progress,
          lessonsTotal,
          lessonsWatched: watched,
          notesCount,
          remaining,
          ctaHref,
          ctaDisabled: status === "coming-soon",
        };
      }),
    [joinedModules, watchedIds, notes, moduleByVideoId]
  );

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = cardsData.filter(
      (card) => !q || `${card.title} ${card.description}`.toLowerCase().includes(q)
    );
    if (activeTab === "Completed") return filtered.filter((card) => card.status === "complete");
    if (activeTab === "In Progress") return filtered.filter((card) => card.status === "in-progress");
    return filtered;
  }, [activeTab, cardsData, query]);

  const modulesCompletedCount = continueLearningData.modulesCompleted;

  const courseStats: Array<{
    detail: string;
    icon: AppIconName;
    label: string;
    success?: boolean;
    value: string | number;
  }> = [
    {
      icon: "book-open",
      label: "Course modules",
      value: publishedModules.length,
      detail: publishedModules.length === 1 ? "Module available" : "Modules available",
    },
    {
      icon: "check-square",
      label: "Lessons completed",
      value: lessonsWatched,
      detail: `${totalPublishedVideos} available`,
    },
    { icon: "file", label: "Notes created", value: notes.length, detail: "Course notes" },
    { icon: "clock", label: "Learning time", value: formatLearningTime(learningMinutes), detail: "Across courses" },
    {
      icon: "trophy",
      label: "Modules completed",
      value: modulesCompletedCount,
      detail: modulesCompletedCount > 0 ? "Finished" : "Not yet",
      success: modulesCompletedCount > 0,
    },
  ];

  const recentNotes: RecentNoteItem[] = useMemo(
    () =>
      notes
        .filter((note) => note.content && note.content.trim().length > 0)
        .slice(0, 5)
        .map((note) => ({
          id: note.id,
          videoId: note.video_id,
          title: videoById.get(note.video_id)?.title ?? "Untitled lesson",
          moduleTitle: moduleByVideoId.get(note.video_id)?.title ?? "Course content",
          snippet: note.content.trim(),
          date: timeAgo(note.updated_at),
        })),
    [notes, videoById, moduleByVideoId]
  );

  const firstName = useMemo(() => {
    const raw = user?.user_metadata?.full_name;
    const full = typeof raw === "string" ? raw.trim() : "";
    return full ? full.split(" ")[0] : "";
  }, [user]);

  const catalogEmpty = !loading && !fetchError && modules.length === 0;

  if (userLoading || loading) {
    return (
      <AppShell contentClassName={styles.courseMain}>
        <AppPageFrame className={`${styles.courseFrame} max-w-[1380px] px-1`}>
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e5e1dc] border-t-[#111111]" />
          </div>
        </AppPageFrame>
      </AppShell>
    );
  }

  return (
    <AppShell contentClassName={styles.courseMain}>
      <AppPageFrame className={`${styles.courseFrame} max-w-[1380px] px-1`}>
        <CourseLibraryLayoutGrid className={`${styles.courseLayout} xl:grid-cols-[minmax(0,1fr)_320px]`}>
          <div className={styles.courseContent}>
            <header className={`${styles.courseHeader} mb-4 min-h-[76px]`}>
              <div className="min-w-0">
                <p className="mb-1.5 text-[11px] font-[850] leading-none text-[#a87f4f]">Course</p>
                <h1 className="m-0 text-[30px] font-[850] leading-none tracking-normal text-[#111111]">
                  Course Library
                </h1>
                <p className="mt-2 max-w-[520px] text-[13px] font-semibold leading-[1.45] text-[#625a52]">
                  Access your lessons, course materials, readings, notes, and research skill paths in one place.
                </p>
              </div>
            </header>

            {fetchError && (
              <div className="mb-3 rounded-[10px] border border-[#e5e1dc] bg-[#fffaf2] px-3.5 py-3 text-[12px] font-semibold leading-[1.5] text-[#625a52]">
                Courses are almost ready. The course tables aren&apos;t set up yet — ask the admin to run the
                course migrations, then refresh this page.
              </div>
            )}

            {catalogEmpty ? (
              <section className="mt-2 rounded-[12px] border border-[#e5e1dc] bg-white px-6 py-16 text-center">
                <h2 className="text-[18px] font-[850] text-[#111111]">Courses are coming soon</h2>
                <p className="mx-auto mt-2 max-w-[420px] text-[13px] font-semibold leading-[1.5] text-[#625a52]">
                  We&apos;re building out the Course Library. Published lessons will appear here as soon as
                  they&apos;re ready — check back soon.
                </p>
              </section>
            ) : (
              <>
                <div className={`${styles.courseControls} grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center`}>
                  <div className="relative min-w-0">
                    <AppIcon className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6f6760]" name="search" />
                    <input
                      className="h-8 w-full rounded-[8px] border border-[#d8d3ce] bg-white px-9 text-[11px] font-semibold text-[#17120d] outline-none placeholder:text-[#8b8178]"
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search courses or topics..."
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
                  <ContinueLearningCard data={continueLearningData} />
                </div>

                <section className={`${styles.courseCardsSection} mt-3 rounded-[10px] border border-[#e5e1dc] bg-white px-2.5 py-3`}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-[14px] font-[850] leading-none text-[#111111]">Your Course</h2>
                    <Link className="inline-flex items-center gap-1 text-[11px] font-[850] text-[#8a5b10] no-underline" href="/courses/learn">
                      <span>View all lessons</span>
                    </Link>
                  </div>
                  {cards.length === 0 ? (
                    <p className="mt-3 text-[12px] font-semibold text-[#625a52]">
                      No courses match this filter yet.
                    </p>
                  ) : (
                    <div className={`${styles.courseCardsGrid} mt-3 grid gap-2 lg:grid-cols-3`}>
                      {cards.map((course) => (
                        <CourseCard
                          action={
                            course.ctaDisabled ? (
                              <span className="block rounded-[7px] border border-[#d8d3ce] px-3 py-1.5 text-center text-[10px] font-[850] text-[#9a8f83]">
                                Coming soon
                              </span>
                            ) : (
                              <Link
                                className="block rounded-[7px] border border-[#d8d3ce] px-3 py-1.5 text-center text-[10px] font-[850] text-[#8a5b10] no-underline"
                                href={course.ctaHref}
                              >
                                {course.status === "complete"
                                  ? "Review lessons"
                                  : course.progress > 0
                                    ? "Continue learning"
                                    : "Start Learning"}
                              </Link>
                            )
                          }
                          badge={course.badgeLabel}
                          key={course.id}
                          lessons={course.lessonsTotal}
                          modules={1}
                          notes={course.notesCount}
                          progress={course.progress}
                          remaining={course.remaining}
                          title={course.title}
                        >
                          {course.description}
                        </CourseCard>
                      ))}
                    </div>
                  )}
                </section>

                <section className={`${styles.materialsSection} mt-3 rounded-[10px] border border-[#e5e1dc] bg-white p-3`}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-[14px] font-[850] text-[#111111]">Recent Materials</h2>
                    <Link className="inline-flex items-center gap-1 text-[11px] font-[850] text-[#8a5b10] no-underline" href="/my-learning/notes">
                      <span>View all materials</span>
                    </Link>
                  </div>
                  {recentNotes.length === 0 ? (
                    <p className="mt-2.5 text-[12px] font-semibold leading-[1.5] text-[#625a52]">
                      You haven&apos;t written any notes yet. Notes you take while watching lessons will show up
                      here.
                    </p>
                  ) : (
                    <div className={`${styles.materialsTable} mt-2.5 overflow-hidden rounded-[8px] border border-[#eeeae5]`}>
                      {recentNotes.map((item) => (
                        <Link
                          className="flex items-center justify-between gap-3 border-t border-[#eeeae5] px-3 py-2 text-[10px] no-underline first:border-t-0 hover:bg-[#faf7f0]"
                          href={`/courses/learn?video=${item.videoId}`}
                          key={item.id}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-full bg-[#f7f5f2] px-2 py-0.5 text-[9px] font-bold text-[#4f4842]">
                                {item.moduleTitle}
                              </span>
                              <span className="truncate font-bold text-[#111111]">{item.title}</span>
                            </div>
                            <p className="mt-1 truncate text-[10px] font-medium text-[#625a52]">{item.snippet}</p>
                          </div>
                          <span className="shrink-0 whitespace-nowrap text-[#625a52]">{item.date}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>

                <section className={`${styles.progressStrip} mt-3 grid items-center gap-3 rounded-[10px] border border-[#eadfce] bg-[#fffaf2] px-3 py-2 lg:grid-cols-[34px_minmax(190px,1fr)_112px_112px_90px_150px_auto]`}>
                  <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#fff0c8] text-[#9a7b55]">
                    <AppIcon className="h-3.5 w-3.5" name="trophy" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-[850] text-[#111111]">
                      {firstName ? `Keep going, ${firstName}!` : "Keep going!"}
                    </h2>
                    <p className="mt-0.5 text-[11px] text-[#625a52]">
                      {lessonsWatched > 0
                        ? "You're building strong research skills every day."
                        : "Start your first lesson to begin building your research skills."}
                    </p>
                  </div>
                  <Metric label="Total learning time" value={formatLearningTime(learningMinutes)} />
                  <Metric label="Modules completed" value={String(modulesCompletedCount)} />
                  <Metric label="Modules progress" value={`${modulesCompletedCount}/${publishedModules.length}`} />
                  <Metric
                    label="Next lesson"
                    value={nextUnwatchedVideo?.title ?? (totalPublishedVideos > 0 ? "All caught up" : "Coming soon")}
                  />
                  <Link className="rounded-[8px] border border-[#a87f4f] px-3 py-1.5 text-[10px] font-bold text-[#8a5b10] no-underline" href="/my-learning">
                    View my progress
                  </Link>
                </section>
              </>
            )}
          </div>

          <aside className={`${styles.courseRail} grid min-w-0 content-start gap-2.5 xl:pt-[53px]`}>
            <ContinueLearningCard data={continueLearningData} />
          </aside>
        </CourseLibraryLayoutGrid>
      </AppPageFrame>
    </AppShell>
  );
}

function ContinueLearningCard({ data }: { data: ContinueLearningViewModel }) {
  const isEmptyCatalog = data.status === "no_catalog";
  const isComingSoon = data.status === "coming_soon";
  const isNotStarted = data.status === "not_started";
  const hasActiveLesson = data.status === "in_progress" || data.status === "complete";

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
          {isEmptyCatalog ? (
            <>
              <h3 className="mt-1.5 text-[14px] font-[850] text-[#111111]">No courses published yet</h3>
              <p className="mt-1.5 text-[10.5px] leading-[1.55] text-[#625a52]">
                Published lessons will show up here as soon as they&apos;re ready.
              </p>
            </>
          ) : isComingSoon ? (
            <>
              <h3 className="mt-1.5 text-[14px] font-[850] text-[#111111]">New lessons coming soon</h3>
              <p className="mt-1.5 text-[10.5px] leading-[1.55] text-[#625a52]">{data.body}</p>
            </>
          ) : isNotStarted ? (
            <>
              <p className="mt-1.5 text-[13px] font-[850] leading-[1.4] text-[#111111]">
                No lessons started yet — browse the catalog.
              </p>
              <div className="mt-2.5">
                <Link
                  className="block rounded-[7px] bg-[#111111] px-3 py-1.5 text-center text-[10px] font-bold leading-[1.45] text-white no-underline"
                  href="/courses/learn"
                >
                  Browse catalog
                </Link>
              </div>
            </>
          ) : (
            <>
              <h3 className="mt-1.5 text-[14px] font-[850] text-[#111111]">{data.headline}</h3>
              <p className="mt-1.5 text-[10.5px] leading-[1.55] text-[#625a52]">{data.body}</p>
              <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-xs">
                <Metric label="Modules done" value={String(data.modulesCompleted)} />
                <Metric label="Lessons done" value={String(data.lessonsDone)} />
                <Metric label="Notes" value={String(data.notesCreated)} />
              </div>
              {hasActiveLesson && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link
                    className="rounded-[7px] bg-[#111111] px-3 py-1.5 text-center text-[10px] font-bold leading-[1.45] text-white no-underline"
                    href={data.resumeHref}
                  >
                    {data.status === "complete" ? "Review lessons" : "Resume lesson"}
                  </Link>
                  <Link
                    className="rounded-[7px] border border-[#d8d3ce] px-3 py-1.5 text-center text-[10px] font-bold leading-[1.45] text-[#111111] no-underline"
                    href="/my-learning/notes"
                  >
                    View notes
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="whitespace-nowrap text-[10px] leading-tight text-[#625a52]">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-[850] leading-none text-[#111111]" title={value}>
        {value}
      </p>
    </div>
  );
}
