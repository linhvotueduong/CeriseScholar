"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import CoursesTabs from "@/components/courses/CoursesTabs";
import GoldStars from "@/components/doodles/GoldStars";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import type {
  CourseModule,
  CourseVideo,
  ModuleWithVideos,
} from "@/types/course";

type NoteStatus = "idle" | "dirty" | "saving" | "saved";
const NOTE_SAVE_DEBOUNCE_MS = 1500;

const p = {
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  inkFaint: "#9a8a7a",
  cerise: "#c0392b",
  coral: "#c97a6b",
  gold: "#c8a84b",
  rule: "#e0d8d0",
  border: "#d4cdc5",
  surface: "#fdfcfa",
  warm: "#faf7f0",
  bg: "#fefefe",
};

const stars = [
  { top: "8%", left: "4%", size: 8, op: 0.3, rot: -10 },
  { top: "20%", right: "5%", size: 10, op: 0.4, rot: 15 },
  { top: "48%", left: "3%", size: 7, op: 0.35, rot: -5 },
  { top: "70%", right: "4%", size: 9, op: 0.3, rot: 12 },
  { top: "88%", left: "6%", size: 7, op: 0.35, rot: 8 },
];

function formatDuration(min: number | null | undefined): string {
  if (!min || min <= 0) return "";
  return `${min} min`;
}

export default function CoursesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useUser();

  const [modules, setModules] = useState<ModuleWithVideos[]>([]);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  // Note panel — per-user, per-video. Debounced auto-save.
  const [noteContent, setNoteContent] = useState("");
  const [noteStatus, setNoteStatus] = useState<NoteStatus>("idle");
  const savedContentRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Courses are for logged-in users. Middleware doesn't cover /courses,
  // so guard it here and redirect to /login when anonymous.
  useEffect(() => {
    if (!userLoading && !user) router.replace("/login");
  }, [user, userLoading, router]);

  const loadCourses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setFetchError(null);

    const supabase = createClient();

    // RLS already filters to published modules for non-admin users, but we
    // still fetch everything and let the client handle locked-module display.
    const modulesRes = await supabase
      .from("course_modules")
      .select("*")
      .order("module_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (modulesRes.error) {
      setFetchError(modulesRes.error.message);
      setModules([]);
      setLoading(false);
      return;
    }

    const videosRes = await supabase
      .from("course_videos")
      .select("*")
      .order("video_order", { ascending: true })
      .order("created_at", { ascending: true });

    const progressRes = await supabase
      .from("course_progress")
      .select("video_id")
      .eq("user_id", user.id);

    const videosByModule = new Map<string, CourseVideo[]>();
    for (const v of (videosRes.data ?? []) as CourseVideo[]) {
      const list = videosByModule.get(v.module_id) ?? [];
      list.push(v);
      videosByModule.set(v.module_id, list);
    }

    const joined: ModuleWithVideos[] = (
      (modulesRes.data ?? []) as CourseModule[]
    ).map((m) => ({
      ...m,
      videos: videosByModule.get(m.id) ?? [],
    }));

    const watchedSet = new Set<string>(
      (progressRes.data ?? []).map((r: { video_id: string }) => r.video_id)
    );

    setModules(joined);
    setWatched(watchedSet);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadCourses();
  }, [user, loadCourses]);

  // Pick a default lesson:
  //   1. ?video=<id> param if it points at a real, published video
  //   2. first unwatched published video
  //   3. first published video
  // The ?video param takes priority even after an initial selection so deep
  // links from /my-learning always land on the right lesson.
  const videoParam = searchParams?.get("video") ?? null;
  useEffect(() => {
    const published = modules.filter((m) => m.is_published);
    const allVideos = published.flatMap((m) => m.videos);
    if (allVideos.length === 0) return;

    if (videoParam) {
      const target = allVideos.find((v) => v.id === videoParam);
      if (target && target.id !== selectedId) {
        setSelectedId(target.id);
        return;
      }
    }

    if (selectedId) return;
    const nextUnwatched = allVideos.find((v) => !watched.has(v.id));
    setSelectedId((nextUnwatched ?? allVideos[0]).id);
  }, [modules, watched, selectedId, videoParam]);

  const selected = useMemo(() => {
    for (const m of modules) {
      const v = m.videos.find((x) => x.id === selectedId);
      if (v) return { video: v, module: m };
    }
    return null;
  }, [modules, selectedId]);

  const nextUnwatched = useMemo(() => {
    const published = modules.filter((m) => m.is_published);
    const all = published.flatMap((m) => m.videos);
    return all.find((v) => !watched.has(v.id) && v.id !== selectedId);
  }, [modules, watched, selectedId]);

  // Load this user's note for the selected video when the video changes.
  // Any pending save for the previous video still fires (its videoId is
  // captured in the timer's closure), so switching videos never loses work.
  const selectedVideoId = selected?.video.id ?? null;
  useEffect(() => {
    if (!user || !selectedVideoId) {
      setNoteContent("");
      savedContentRef.current = "";
      setNoteStatus("idle");
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("course_notes")
        .select("content")
        .eq("user_id", user.id)
        .eq("video_id", selectedVideoId)
        .maybeSingle();
      if (cancelled) return;
      const content = data?.content ?? "";
      setNoteContent(content);
      savedContentRef.current = content;
      setNoteStatus("idle");
    })();
    return () => {
      cancelled = true;
    };
  }, [user, selectedVideoId]);

  // Clear the pending-save timer on unmount so we don't leak a timeout.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  function handleNoteChange(next: string) {
    setNoteContent(next);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (next === savedContentRef.current) {
      setNoteStatus("idle");
      return;
    }
    setNoteStatus("dirty");
    if (!user || !selectedVideoId) return;
    const videoId = selectedVideoId;
    const userId = user.id;
    saveTimerRef.current = setTimeout(async () => {
      setNoteStatus("saving");
      const supabase = createClient();
      const { error } = await supabase.from("course_notes").upsert(
        {
          user_id: userId,
          video_id: videoId,
          content: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,video_id" }
      );
      if (error) {
        // Leave as "dirty" so the next keystroke schedules another attempt.
        setNoteStatus("dirty");
        return;
      }
      // Only mark saved if the user is still on the same video and hasn't
      // typed further since we started the save. Otherwise leave whatever
      // newer status the later change produced.
      if (videoId === selectedVideoIdRef.current && next === latestContentRef.current) {
        savedContentRef.current = next;
        setNoteStatus("saved");
      } else {
        savedContentRef.current = next;
      }
    }, NOTE_SAVE_DEBOUNCE_MS);
  }

  // Refs that always hold the latest values — used by the async save callback
  // to decide whether to flip the status to "saved" (only if nothing newer
  // has happened since the save started).
  const selectedVideoIdRef = useRef<string | null>(null);
  const latestContentRef = useRef("");
  useEffect(() => {
    selectedVideoIdRef.current = selectedVideoId;
  }, [selectedVideoId]);
  useEffect(() => {
    latestContentRef.current = noteContent;
  }, [noteContent]);

  async function markWatched() {
    if (!user || !selected || marking) return;
    const videoId = selected.video.id;
    if (watched.has(videoId)) return;

    setMarking(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("course_progress")
      .upsert(
        { user_id: user.id, video_id: videoId },
        { onConflict: "user_id,video_id" }
      );

    if (!error) {
      setWatched((prev) => {
        const next = new Set(prev);
        next.add(videoId);
        return next;
      });
    }
    setMarking(false);
  }

  function goToNext() {
    if (nextUnwatched) setSelectedId(nextUnwatched.id);
  }

  const publishedModules = modules.filter((m) => m.is_published);
  const totalPublishedVideos = publishedModules.reduce(
    (sum, m) => sum + m.videos.length,
    0
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
              fontSize: "11px",
              color: p.cerise,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            Courses
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
            Learn how to research well
          </h1>
          <p style={{ fontSize: "14px", color: p.inkMuted, margin: 0 }}>
            {totalPublishedVideos > 0
              ? `${watched.size} of ${totalPublishedVideos} lesson${totalPublishedVideos === 1 ? "" : "s"} watched`
              : "Lessons will appear here as they are published."}
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
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: p.ink }}>Courses are almost ready.</strong>{" "}
            The course tables aren&apos;t set up yet — ask the admin to run the{" "}
            <code style={{ fontFamily: "var(--font-mono), monospace" }}>009_courses.sql</code>{" "}
            migration, then refresh this page.
          </div>
        )}

        {modules.length === 0 && !fetchError ? (
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
            {/* Left column: player + note panel stacked */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>

            {/* Player + lesson info */}
            <section
              style={{
                background: "#fff",
                border: `1.5px solid ${p.border}`,
                borderRadius: "18px",
                overflow: "hidden",
                boxShadow: "0 2px 14px rgba(0,0,0,0.04)",
              }}
            >
              {selected ? (
                <>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      paddingBottom: "56.25%",
                      background: "#000",
                    }}
                  >
                    <iframe
                      key={selected.video.id}
                      src={`https://www.youtube.com/embed/${selected.video.youtube_id}?rel=0&modestbranding=1`}
                      title={selected.video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        border: "none",
                      }}
                    />
                  </div>

                  <div style={{ padding: "24px 28px 28px" }}>
                    <div
                      style={{
                        fontSize: "10px",
                        color: p.coral,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        marginBottom: "6px",
                      }}
                    >
                      {selected.module.title}
                    </div>
                    <h2
                      style={{
                        fontFamily: "var(--font-display), 'DM Serif Display', serif",
                        fontSize: "26px",
                        fontWeight: 400,
                        color: p.ink,
                        margin: "0 0 10px",
                        lineHeight: 1.25,
                      }}
                    >
                      {selected.video.title}
                    </h2>
                    {selected.video.duration_minutes > 0 && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: p.inkFaint,
                          margin: "0 0 14px",
                        }}
                      >
                        {formatDuration(selected.video.duration_minutes)}
                      </p>
                    )}
                    {selected.module.description && (
                      <p
                        style={{
                          fontSize: "14px",
                          color: p.inkMuted,
                          lineHeight: 1.7,
                          margin: "0 0 20px",
                        }}
                      >
                        {selected.module.description}
                      </p>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                      <button
                        onClick={markWatched}
                        disabled={marking || watched.has(selected.video.id)}
                        style={{
                          padding: "10px 22px",
                          borderRadius: "100px",
                          background: watched.has(selected.video.id) ? p.warm : p.cerise,
                          color: watched.has(selected.video.id) ? p.inkMuted : "#fff",
                          border: watched.has(selected.video.id)
                            ? `1.5px solid ${p.border}`
                            : "none",
                          fontFamily: "var(--font-body), 'DM Sans', sans-serif",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: watched.has(selected.video.id) ? "default" : "pointer",
                          opacity: marking ? 0.6 : 1,
                        }}
                      >
                        {watched.has(selected.video.id)
                          ? "✓ Watched"
                          : marking
                            ? "Saving…"
                            : "Mark as watched"}
                      </button>
                      {nextUnwatched && (
                        <button
                          onClick={goToNext}
                          style={{
                            padding: "10px 22px",
                            borderRadius: "100px",
                            background: "transparent",
                            color: p.ink,
                            border: `1.5px solid ${p.border}`,
                            fontFamily: "var(--font-body), 'DM Sans', sans-serif",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Continue to next lesson →
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: "60px 40px", textAlign: "center" }}>
                  <p style={{ fontSize: "14px", color: p.inkMuted }}>
                    Pick a lesson from the list to start watching.
                  </p>
                </div>
              )}
            </section>

            {/* Admin notes card — "From Cerise" — only when admin has set one */}
            {selected && selected.video.admin_notes?.trim() && (
              <section
                style={{
                  background: p.warm,
                  border: `1.5px solid ${p.border}`,
                  borderRadius: "18px",
                  padding: "20px 24px",
                  boxShadow: "0 2px 14px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  <span style={{ color: p.gold, fontSize: "14px" }}>★</span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: p.cerise,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    From Cerise
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: p.ink,
                    lineHeight: 1.7,
                    margin: 0,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {selected.video.admin_notes}
                </p>
              </section>
            )}

            {/* Note panel — visible only when a lesson is selected */}
            {selected && (
              <section
                style={{
                  background: "#fff",
                  border: `1.5px solid ${p.border}`,
                  borderRadius: "18px",
                  padding: "20px 24px 22px",
                  boxShadow: "0 2px 14px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        color: p.cerise,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      Your notes
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color:
                          noteStatus === "saved"
                            ? p.cerise
                            : noteStatus === "dirty" || noteStatus === "saving"
                              ? p.inkMuted
                              : p.inkFaint,
                        fontWeight: 500,
                      }}
                    >
                      {noteStatus === "saving"
                        ? "Saving…"
                        : noteStatus === "saved"
                          ? "✓ Saved"
                          : noteStatus === "dirty"
                            ? "Unsaved changes…"
                            : ""}
                    </span>
                  </div>
                  <Link
                    href="/my-learning/notes"
                    className="hover:opacity-70"
                    style={{
                      fontSize: "12px",
                      color: p.inkMuted,
                      textDecoration: "none",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    View all notes →
                  </Link>
                </div>
                <textarea
                  value={noteContent}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  placeholder="Write your notes here while watching — key points, questions, things to follow up on..."
                  style={{
                    width: "100%",
                    minHeight: "180px",
                    padding: "14px 16px",
                    border: `1.5px solid ${p.border}`,
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontFamily: "var(--font-body), 'DM Sans', sans-serif",
                    color: p.ink,
                    background: p.surface,
                    outline: "none",
                    resize: "vertical",
                    lineHeight: 1.6,
                  }}
                />
                <p
                  style={{
                    fontSize: "11px",
                    color: p.inkFaint,
                    margin: "8px 2px 0",
                  }}
                >
                  Notes auto-save as you type. One note per lesson.
                </p>
              </section>
            )}

            </div>
            {/* /Left column */}

            {/* Module list */}
            <aside
              style={{
                background: "#fff",
                border: `1.5px solid ${p.border}`,
                borderRadius: "18px",
                padding: "20px",
                position: "sticky",
                top: "24px",
                maxHeight: "calc(100vh - 48px)",
                overflowY: "auto",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-display), serif",
                  fontSize: "18px",
                  fontWeight: 400,
                  color: p.ink,
                  margin: "0 0 14px",
                }}
              >
                Course outline
              </h3>
              {modules.map((m) => (
                <ModuleRow
                  key={m.id}
                  module={m}
                  watched={watched}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              ))}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function ModuleRow({
  module,
  watched,
  selectedId,
  onSelect,
}: {
  module: ModuleWithVideos;
  watched: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const locked = !module.is_published;
  const totalInModule = module.videos.length;
  const watchedInModule = module.videos.filter((v) => watched.has(v.id)).length;

  return (
    <div style={{ marginBottom: "16px", opacity: locked ? 0.5 : 1 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 2px 8px",
          borderBottom: `1px solid ${p.rule}`,
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display), serif",
            fontSize: "14px",
            color: p.ink,
          }}
        >
          {module.title}
        </span>
        <span
          style={{
            fontSize: "10px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: locked ? p.inkFaint : p.coral,
            fontWeight: 600,
          }}
        >
          {locked ? "Locked" : `${watchedInModule} / ${totalInModule}`}
        </span>
      </div>

      {locked ? (
        <p style={{ fontSize: "12px", color: p.inkFaint, padding: "4px 6px", margin: 0 }}>
          Coming soon.
        </p>
      ) : module.videos.length === 0 ? (
        <p style={{ fontSize: "12px", color: p.inkFaint, padding: "4px 6px", margin: 0 }}>
          No lessons yet.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {module.videos.map((v) => {
            const isActive = v.id === selectedId;
            const isWatched = watched.has(v.id);
            return (
              <li key={v.id}>
                <button
                  onClick={() => onSelect(v.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    textAlign: "left",
                    padding: "10px",
                    borderRadius: "10px",
                    border: "none",
                    background: isActive ? p.warm : "transparent",
                    cursor: "pointer",
                    color: p.ink,
                    fontFamily: "var(--font-body), sans-serif",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: isWatched ? p.cerise : isActive ? p.coral : p.warm,
                      color: isWatched || isActive ? "#fff" : p.inkMuted,
                      fontSize: "10px",
                      flexShrink: 0,
                    }}
                  >
                    {isWatched ? "✓" : "▶"}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: isActive ? 600 : 500,
                        color: p.ink,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {v.title}
                    </span>
                    {v.duration_minutes > 0 && (
                      <span style={{ display: "block", fontSize: "11px", color: p.inkFaint }}>
                        {formatDuration(v.duration_minutes)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
        No courses yet
      </p>
      <p style={{ fontSize: "13px", color: p.inkMuted, margin: 0 }}>
        Published lessons will show up here as soon as they&apos;re ready.
      </p>
    </div>
  );
}
