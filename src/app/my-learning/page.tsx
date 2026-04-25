"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import CoursesTabs from "@/components/courses/CoursesTabs";
import GoldStars from "@/components/doodles/GoldStars";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import type {
  CourseModule,
  CourseNote,
  CourseVideo,
  ModuleWithVideos,
} from "@/types/course";

const p = {
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  inkFaint: "#9a8a7a",
  cerise: "#c0392b",
  coral: "#c97a6b",
  gold: "#c8a84b",
  green: "#3a9d5d",
  greenSoft: "#d8ecdf",
  rule: "#e0d8d0",
  border: "#d4cdc5",
  surface: "#fdfcfa",
  warm: "#faf7f0",
  bg: "#fefefe",
};

const stars = [
  { top: "8%", left: "4%", size: 8, op: 0.3, rot: -10 },
  { top: "22%", right: "5%", size: 10, op: 0.4, rot: 15 },
  { top: "48%", left: "3%", size: 7, op: 0.35, rot: -5 },
  { top: "70%", right: "4%", size: 9, op: 0.3, rot: 12 },
  { top: "88%", left: "6%", size: 7, op: 0.35, rot: 8 },
];

interface NoteWithContext extends CourseNote {
  video_title: string;
  module_title: string;
  module_id: string;
}

type ModuleProgressStatus = "complete" | "in-progress" | "not-started";

function statusColor(s: ModuleProgressStatus) {
  return s === "complete" ? p.green : s === "in-progress" ? p.coral : p.inkFaint;
}

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

function formatTimeSpent(mins: number): string {
  if (mins <= 0) return "0 min";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${hrs}h` : `${hrs}h ${m}m`;
}

// Consecutive days of activity ending at the most recent watch, counted in UTC.
function computeStreak(isoDates: string[]): number {
  if (isoDates.length === 0) return 0;
  const days = new Set<string>();
  for (const d of isoDates) days.add(d.slice(0, 10));
  const sorted = Array.from(days).sort((a, b) => (a < b ? 1 : -1));
  let streak = 1;
  const msPerDay = 24 * 60 * 60 * 1000;
  let prev = new Date(sorted[0] + "T00:00:00Z").getTime();
  for (let i = 1; i < sorted.length; i++) {
    const cur = new Date(sorted[i] + "T00:00:00Z").getTime();
    if (prev - cur === msPerDay) {
      streak++;
      prev = cur;
    } else break;
  }
  return streak;
}

export default function MyLearningPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [modules, setModules] = useState<ModuleWithVideos[]>([]);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [watchedAt, setWatchedAt] = useState<Map<string, string>>(new Map());
  const [notes, setNotes] = useState<NoteWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && !user) router.replace("/login");
  }, [user, userLoading, router]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setFetchError(null);

    const supabase = createClient();

    const modsRes = await supabase
      .from("course_modules")
      .select("*")
      .order("module_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (modsRes.error) {
      setFetchError(modsRes.error.message);
      setLoading(false);
      return;
    }

    const [vidsRes, progRes, notesRes] = await Promise.all([
      supabase
        .from("course_videos")
        .select("*")
        .order("video_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("course_progress")
        .select("video_id, watched_at")
        .eq("user_id", user.id),
      supabase
        .from("course_notes")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
    ]);

    const vidsByModule = new Map<string, CourseVideo[]>();
    for (const v of (vidsRes.data ?? []) as CourseVideo[]) {
      const list = vidsByModule.get(v.module_id) ?? [];
      list.push(v);
      vidsByModule.set(v.module_id, list);
    }
    const joined: ModuleWithVideos[] = (
      (modsRes.data ?? []) as CourseModule[]
    ).map((m) => ({ ...m, videos: vidsByModule.get(m.id) ?? [] }));

    const watchedSet = new Set<string>();
    const watchedAtMap = new Map<string, string>();
    for (const r of (progRes.data ?? []) as { video_id: string; watched_at: string }[]) {
      watchedSet.add(r.video_id);
      watchedAtMap.set(r.video_id, r.watched_at);
    }

    // Lookup tables to attach module/video context to each note
    const videoById = new Map<string, CourseVideo>();
    const moduleByVideoId = new Map<string, CourseModule>();
    for (const m of (modsRes.data ?? []) as CourseModule[]) {
      for (const v of vidsByModule.get(m.id) ?? []) {
        videoById.set(v.id, v);
        moduleByVideoId.set(v.id, m);
      }
    }
    const notesList: NoteWithContext[] = [];
    for (const n of (notesRes.data ?? []) as CourseNote[]) {
      if (!n.content || n.content.trim().length === 0) continue;
      const v = videoById.get(n.video_id);
      const m = moduleByVideoId.get(n.video_id);
      if (!v || !m) continue;
      notesList.push({
        ...n,
        video_title: v.title,
        module_title: m.title,
        module_id: m.id,
      });
    }

    setModules(joined);
    setWatched(watchedSet);
    setWatchedAt(watchedAtMap);
    setNotes(notesList);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  // Derived stats
  const publishedModules = useMemo(
    () => modules.filter((m) => m.is_published),
    [modules]
  );
  const allPublishedVideos = useMemo(
    () => publishedModules.flatMap((m) => m.videos),
    [publishedModules]
  );
  const totalVideos = allPublishedVideos.length;
  const videosWatched = allPublishedVideos.filter((v) => watched.has(v.id)).length;
  const completionPct =
    totalVideos === 0 ? 0 : Math.round((videosWatched / totalVideos) * 100);
  const timeSpent = allPublishedVideos
    .filter((v) => watched.has(v.id))
    .reduce((sum, v) => sum + (v.duration_minutes ?? 0), 0);
  const notesCount = notes.length;

  const nextUnwatched = useMemo(
    () => allPublishedVideos.find((v) => !watched.has(v.id)),
    [allPublishedVideos, watched]
  );
  const nextModule = nextUnwatched
    ? publishedModules.find((m) => m.id === nextUnwatched.module_id)
    : undefined;

  const currentModule = useMemo(() => {
    if (nextModule) return nextModule;
    // No next unwatched → pick most recently watched module, else first published
    let latestDate = "";
    let latest: ModuleWithVideos | undefined;
    for (const m of publishedModules) {
      for (const v of m.videos) {
        const w = watchedAt.get(v.id);
        if (w && w > latestDate) {
          latestDate = w;
          latest = m;
        }
      }
    }
    return latest ?? publishedModules[0];
  }, [nextModule, publishedModules, watchedAt]);

  const moduleStats = useMemo(
    () =>
      publishedModules.map((m) => {
        const total = m.videos.length;
        const mwatched = m.videos.filter((v) => watched.has(v.id)).length;
        const status: ModuleProgressStatus =
          total === 0 || mwatched === 0
            ? "not-started"
            : mwatched >= total
              ? "complete"
              : "in-progress";
        return { module: m, total, watched: mwatched, status };
      }),
    [publishedModules, watched]
  );

  const streak = useMemo(
    () => computeStreak(Array.from(watchedAt.values())),
    [watchedAt]
  );

  if (userLoading || loading) {
    return (
      <div style={{ background: p.bg, minHeight: "100vh", position: "relative" }}>
        <Navbar />
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 20px" }}>
          <div
            className="animate-spin rounded-full h-8 w-8 border-2"
            style={{ borderColor: p.rule, borderTopColor: p.ink }}
          />
        </div>
      </div>
    );
  }

  const hasAnyCourseContent = publishedModules.length > 0 && totalVideos > 0;

  return (
    <div style={{ background: p.bg, minHeight: "100vh", color: p.ink, position: "relative" }}>
      <Navbar />
      <GoldStars stars={stars} />

      <main
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "40px 32px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <CoursesTabs />

        {/* Header */}
        <header style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "100px",
              background: p.warm,
              border: `1px solid ${p.border}`,
              fontSize: "11px",
              color: p.cerise,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            <span style={{ width: "6px", height: "6px", background: p.cerise, borderRadius: "50%" }} />
            My learning
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display), 'DM Serif Display', serif",
              fontSize: "44px",
              fontWeight: 400,
              color: p.ink,
              margin: "0 0 8px",
              lineHeight: 1.1,
            }}
          >
            Your learning dashboard
          </h1>
          <p style={{ fontSize: "14px", color: p.inkMuted, margin: 0 }}>
            {hasAnyCourseContent
              ? "Track your progress, revisit notes, and pick up where you left off."
              : "Courses will show up here as soon as published lessons are ready."}
          </p>
        </header>

        {fetchError && (
          <div
            style={{
              background: p.warm,
              border: `1.5px solid ${p.border}`,
              borderRadius: "14px",
              padding: "20px 24px",
              marginBottom: "24px",
              fontSize: "13px",
              color: p.inkMuted,
            }}
          >
            <strong style={{ color: p.ink }}>Something went wrong loading your dashboard.</strong>{" "}
            {fetchError}
          </div>
        )}

        {!hasAnyCourseContent && !fetchError ? (
          <EmptyState />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 320px",
              gap: "24px",
              alignItems: "flex-start",
            }}
          >
            {/* ── Left column ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>
              {/* Stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
                <StatCard label="videos watched" value={String(videosWatched)} accent={p.ink} />
                <StatCard label="completed" value={`${completionPct}%`} accent={p.cerise} />
                <StatCard label="notes saved" value={String(notesCount)} accent={p.coral} />
              </div>

              {/* Overall progress card */}
              <section
                style={{
                  background: "#fff",
                  border: `1.5px solid ${p.border}`,
                  borderRadius: "18px",
                  padding: "22px 24px",
                  boxShadow: "0 2px 14px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "var(--font-display), serif",
                      fontSize: "16px",
                      fontWeight: 400,
                      color: p.ink,
                      margin: 0,
                    }}
                  >
                    Overall progress
                  </h3>
                  <span style={{ fontSize: "12px", color: p.cerise, fontWeight: 700 }}>
                    {videosWatched} / {totalVideos} lessons
                  </span>
                </div>
                <div
                  style={{
                    height: "8px",
                    background: p.warm,
                    borderRadius: "100px",
                    overflow: "hidden",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${completionPct}%`,
                      background: p.cerise,
                      borderRadius: "100px",
                      transition: "width 300ms ease",
                    }}
                  />
                </div>
                {nextUnwatched ? (
                  <Link
                    href={`/courses/learn?video=${nextUnwatched.id}`}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "12px 20px",
                      borderRadius: "100px",
                      background: p.ink,
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    ▶ Continue watching → {nextUnwatched.title}
                  </Link>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "12px 20px",
                      borderRadius: "100px",
                      background: p.warm,
                      color: p.inkMuted,
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    ✓ You&apos;ve watched every published lesson
                  </div>
                )}
              </section>

              {/* Module progress card */}
              <section
                style={{
                  background: "#fff",
                  border: `1.5px solid ${p.border}`,
                  borderRadius: "18px",
                  padding: "22px 24px",
                  boxShadow: "0 2px 14px rgba(0,0,0,0.04)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-display), serif",
                    fontSize: "16px",
                    fontWeight: 400,
                    color: p.ink,
                    margin: "0 0 16px",
                  }}
                >
                  Module progress
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {moduleStats.map((ms) => (
                    <div
                      key={ms.module.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "14px 1fr 110px 50px",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: statusColor(ms.status),
                          display: "inline-block",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "13px",
                          color: p.ink,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ms.module.title}
                      </span>
                      <div
                        style={{
                          height: "6px",
                          background: p.warm,
                          borderRadius: "100px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: ms.total === 0 ? "0%" : `${(ms.watched / ms.total) * 100}%`,
                            background: statusColor(ms.status),
                            borderRadius: "100px",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          color: p.inkFaint,
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ms.watched}/{ms.total}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* All your notes preview */}
              <section
                style={{
                  background: "#fff",
                  border: `1.5px solid ${p.border}`,
                  borderRadius: "18px",
                  padding: "22px 24px",
                  boxShadow: "0 2px 14px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "var(--font-display), serif",
                      fontSize: "16px",
                      fontWeight: 400,
                      color: p.ink,
                      margin: 0,
                    }}
                  >
                    All your notes
                  </h3>
                  <Link
                    href="/my-learning/notes"
                    className="hover:opacity-70"
                    style={{
                      fontSize: "12px",
                      color: p.inkMuted,
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    View all notes →
                  </Link>
                </div>
                {notes.length === 0 ? (
                  <p style={{ fontSize: "13px", color: p.inkFaint, margin: 0 }}>
                    You haven&apos;t written any notes yet. Start a lesson on{" "}
                    <Link href="/courses" style={{ color: p.cerise, textDecoration: "none", fontWeight: 600 }}>
                      Courses
                    </Link>{" "}
                    and your notes will show up here.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {notes.slice(0, 3).map((n) => (
                      <Link
                        key={n.id}
                        href={`/courses/learn?video=${n.video_id}`}
                        className="hover:bg-[#faf7f0]"
                        style={{
                          display: "block",
                          padding: "12px 14px",
                          border: `1.5px solid ${p.border}`,
                          borderRadius: "12px",
                          textDecoration: "none",
                          color: p.ink,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span
                            style={{
                              padding: "1px 8px",
                              borderRadius: "4px",
                              background: p.warm,
                              border: `1px solid ${p.border}`,
                              fontSize: "10px",
                              fontWeight: 600,
                              color: p.inkMuted,
                              letterSpacing: "0.04em",
                            }}
                          >
                            {n.module_title}
                          </span>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: p.ink }}>
                            {n.video_title}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: "12px",
                            color: p.inkMuted,
                            lineHeight: 1.5,
                            margin: "4px 0 4px",
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {n.content}
                        </p>
                        <span style={{ fontSize: "11px", color: p.inkFaint }}>
                          Saved {timeAgo(n.updated_at)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* ── Right column: sidebar ── */}
            <aside style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Learning stats */}
              <div
                style={{
                  background: "#fff",
                  border: `1.5px solid ${p.border}`,
                  borderRadius: "14px",
                  padding: "20px",
                  overflow: "hidden",
                }}
              >
                <div style={{ background: p.cerise, margin: "-20px -20px 14px", padding: "14px 20px" }}>
                  <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "0.04em" }}>
                    Learning stats
                  </h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <StatRow label="Videos watched" value={`${videosWatched} / ${totalVideos}`} />
                  <StatRow label="Time spent" value={`~${formatTimeSpent(timeSpent)}`} />
                  <StatRow label="Notes written" value={String(notesCount)} />
                  <StatRow label="Current module" value={currentModule?.title ?? "—"} />
                  <StatRow label="Next lesson" value={nextUnwatched?.title ?? "—"} muted={!nextUnwatched} />
                </div>
                {streak > 0 && (
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: p.warm,
                      border: `1px solid ${p.border}`,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ color: p.gold, fontSize: "16px" }}>★</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: p.ink }}>
                      {streak}-day learning streak!
                    </span>
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div
                style={{
                  background: "#fff",
                  border: `1.5px solid ${p.border}`,
                  borderRadius: "14px",
                  padding: "16px 18px",
                }}
              >
                <h3
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: p.ink,
                    margin: "0 0 10px",
                    letterSpacing: "0.04em",
                  }}
                >
                  Quick actions
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <QuickAction
                    href={nextUnwatched ? `/courses/learn?video=${nextUnwatched.id}` : "/courses"}
                    label={nextUnwatched ? "▶ Continue watching" : "▶ Open courses"}
                  />
                  <QuickAction href="/my-learning/notes" label="📝 Manage all notes" />
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1.5px solid ${p.border}`,
        borderRadius: "14px",
        padding: "18px 20px",
        textAlign: "left",
        boxShadow: "0 2px 14px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display), serif",
          fontSize: "30px",
          fontWeight: 400,
          color: accent,
          lineHeight: 1,
          marginBottom: "6px",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: p.inkMuted,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function StatRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "12px" }}>
      <span style={{ color: p.inkMuted }}>{label}</span>
      <span
        style={{
          fontWeight: 600,
          color: muted ? p.inkFaint : p.ink,
          textAlign: "right",
          maxWidth: "60%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="hover:bg-[#faf7f0]"
      style={{
        display: "block",
        padding: "10px 12px",
        border: `1px solid ${p.border}`,
        borderRadius: "10px",
        fontSize: "12px",
        color: p.ink,
        fontWeight: 600,
        textDecoration: "none",
        background: "transparent",
      }}
    >
      {label}
    </Link>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        background: "#fff",
        border: `1.5px solid ${p.border}`,
        borderRadius: "18px",
        padding: "72px 32px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-display), serif",
          fontSize: "22px",
          color: p.ink,
          margin: "0 0 8px",
        }}
      >
        Nothing to track yet
      </p>
      <p style={{ fontSize: "13px", color: p.inkMuted, margin: "0 0 16px" }}>
        Published lessons and your notes will appear here as soon as courses are ready.
      </p>
      <Link
        href="/courses"
        style={{
          display: "inline-block",
          padding: "10px 22px",
          borderRadius: "100px",
          background: p.ink,
          color: "#fff",
          textDecoration: "none",
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        Browse courses →
      </Link>
    </div>
  );
}
