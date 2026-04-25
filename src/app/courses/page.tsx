"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import CourseSectionNav from "@/components/courses/CourseSectionNav";
import CourseFaq from "@/components/courses/CourseFaq";
import GoldStars from "@/components/doodles/GoldStars";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import type { CourseModule, CourseVideo } from "@/types/course";

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
  { top: "10%", left: "4%", size: 8, op: 0.3, rot: -10 },
  { top: "26%", right: "5%", size: 9, op: 0.35, rot: 12 },
  { top: "55%", left: "3%", size: 7, op: 0.3, rot: -5 },
  { top: "82%", right: "4%", size: 8, op: 0.35, rot: 8 },
];

/**
 * Tracks whether the viewport is below 768px wide. Used to swap responsive
 * styles (multi-col grids, sticky sidebar, hero font size) without resorting
 * to a `<style>` block. Initial value is `false` so SSR matches desktop;
 * the effect runs post-hydration to flip to mobile if needed.
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

function formatHours(mins: number): string {
  if (mins <= 0) return "—";
  const hrs = mins / 60;
  if (hrs < 1) return `~${mins} min`;
  // Round to nearest 0.5 hour for a friendly summary
  const rounded = Math.round(hrs * 2) / 2;
  return `~${rounded} hr${rounded === 1 ? "" : "s"}`;
}

export default function CoursesLandingPage() {
  const { user, loading: userLoading } = useUser();
  const isMobile = useIsMobile();

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [videos, setVideos] = useState<CourseVideo[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Public RLS already filters to published modules + their videos for
    // anonymous viewers. Admins see everything; we still only count published
    // ones in the public-facing summary, so filter on the client too.
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

    const mods = ((modsRes.data ?? []) as CourseModule[]).filter((m) => m.is_published);
    const modIds = new Set(mods.map((m) => m.id));
    const vids = ((vidsRes.data ?? []) as CourseVideo[]).filter((v) => modIds.has(v.module_id));

    setModules(mods);
    setVideos(vids);

    if (user) {
      const progRes = await supabase
        .from("course_progress")
        .select("video_id")
        .eq("user_id", user.id);
      const seen = new Set<string>(
        (progRes.data ?? []).map((r: { video_id: string }) => r.video_id)
      );
      setWatchedIds(seen);
    } else {
      setWatchedIds(new Set());
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!userLoading) fetchData();
  }, [userLoading, fetchData]);

  const totalModules = modules.length;
  const totalLessons = videos.length;
  const totalMinutes = videos.reduce((sum, v) => sum + (v.duration_minutes ?? 0), 0);

  // Find the next unwatched video for "Continue learning →" deep-link
  const nextUnwatched = useMemo(() => {
    if (!user || watchedIds.size === 0) return null;
    return videos.find((v) => !watchedIds.has(v.id)) ?? null;
  }, [videos, watchedIds, user]);

  const ctaHref = nextUnwatched ? `/courses/learn?video=${nextUnwatched.id}` : "/courses/learn";
  const ctaLabel =
    !user
      ? "Start learning →"
      : watchedIds.size === 0
        ? "Start learning →"
        : nextUnwatched
          ? "Continue learning →"
          : "Review the course →";

  return (
    <div style={{ background: p.bg, minHeight: "100vh", color: p.ink, position: "relative" }}>
      <Navbar />
      <GoldStars stars={stars} />

      <main
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: isMobile ? "32px 20px 64px" : "40px 32px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 340px",
            gap: isMobile ? "20px" : "32px",
            alignItems: "flex-start",
          }}
        >
          {/* ── Left: Hero ── */}
          <section>
            <div
              style={{
                fontSize: "11px",
                color: p.cerise,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "10px",
              }}
            >
              The course
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display), 'DM Serif Display', serif",
                fontSize: isMobile ? "36px" : "56px",
                fontWeight: 400,
                color: p.ink,
                margin: "0 0 14px",
                lineHeight: 1.05,
                letterSpacing: "-0.01em",
              }}
            >
              Learn how to <span style={{ fontStyle: "italic" }}>research well</span>
            </h1>
            <p
              style={{
                fontSize: "17px",
                color: p.inkMuted,
                lineHeight: 1.65,
                margin: "0 0 24px",
                maxWidth: "560px",
              }}
            >
              A guided course for new researchers and student writers. Watch short
              video lessons, take notes that stay yours, and turn what you learn
              into a paper you&apos;re proud of.
            </p>

            {/* Primary CTA + meta line */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
              <Link
                href={ctaHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 24px",
                  borderRadius: "100px",
                  background: p.cerise,
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 700,
                  boxShadow: "0 6px 20px rgba(192, 57, 43, 0.25)",
                }}
              >
                {ctaLabel}
              </Link>
              {!loading && totalLessons > 0 && (
                <span style={{ fontSize: "13px", color: p.inkFaint }}>
                  {totalModules} module{totalModules === 1 ? "" : "s"} · {totalLessons} lesson
                  {totalLessons === 1 ? "" : "s"} · {formatHours(totalMinutes)}
                </span>
              )}
            </div>
            {!user && !userLoading && (
              <p style={{ fontSize: "12px", color: p.inkFaint, margin: "8px 0 0" }}>
                You&apos;ll be asked to sign in or create a free account before the first lesson.
              </p>
            )}
          </section>

          {/* ── Right: Sticky enrollment card (static on mobile) ── */}
          <aside
            style={{
              position: isMobile ? "static" : "sticky",
              top: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div
              style={{
                background: "#fff",
                border: `1.5px solid ${p.border}`,
                borderRadius: "18px",
                overflow: "hidden",
                boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
              }}
            >
              {/* Cerise accent strip */}
              <div
                style={{
                  background: p.cerise,
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ color: p.gold, fontSize: "14px" }}>★</span>
                <span style={{ color: "#fff", fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em" }}>
                  ENROLL FOR FREE
                </span>
              </div>

              <div style={{ padding: "20px 22px 22px" }}>
                {loading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                    <div
                      className="animate-spin rounded-full h-6 w-6 border-2"
                      style={{ borderColor: p.rule, borderTopColor: p.ink }}
                    />
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                      <SummaryRow label="Modules" value={String(totalModules)} />
                      <SummaryRow label="Lessons" value={String(totalLessons)} />
                      <SummaryRow label="Total time" value={formatHours(totalMinutes)} />
                      {user && watchedIds.size > 0 && (
                        <SummaryRow
                          label="Your progress"
                          value={
                            totalLessons === 0
                              ? "—"
                              : `${watchedIds.size} / ${totalLessons} watched`
                          }
                          accent
                        />
                      )}
                    </div>

                    <Link
                      href={ctaHref}
                      style={{
                        display: "block",
                        textAlign: "center",
                        padding: "12px 18px",
                        borderRadius: "100px",
                        background: p.ink,
                        color: "#fff",
                        textDecoration: "none",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      {ctaLabel}
                    </Link>
                    <p
                      style={{
                        fontSize: "11px",
                        color: p.inkFaint,
                        margin: "10px 2px 0",
                        textAlign: "center",
                        lineHeight: 1.5,
                      }}
                    >
                      Free · video lessons · personal notes · AI study coach
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Helpful side-link card */}
            <div
              style={{
                background: p.warm,
                border: `1.5px solid ${p.border}`,
                borderRadius: "14px",
                padding: "14px 16px",
                fontSize: "12px",
                color: p.inkMuted,
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: p.ink }}>Already enrolled?</strong>
              <br />
              <Link
                href="/my-learning"
                className="hover:underline"
                style={{ color: p.cerise, fontWeight: 600, textDecoration: "none" }}
              >
                Open your learning dashboard →
              </Link>
            </div>
          </aside>
        </div>

        <CourseSectionNav />

        <AboutSection />
        <ModulesSection
          modules={modules}
          videos={videos}
          watchedIds={watchedIds}
          isLoggedIn={!!user}
          loading={loading}
        />

        <WhatYoullLearnSection />
        <FaqSection />
      </main>
    </div>
  );
}

function AboutSection() {
  const isMobile = useIsMobile();
  return (
    <section
      id="about"
      style={{
        scrollMarginTop: "80px",
        padding: "56px 0",
        borderBottom: `1px solid ${p.rule}`,
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display), 'DM Serif Display', serif",
          fontSize: "32px",
          fontWeight: 400,
          color: p.ink,
          margin: "0 0 14px",
        }}
      >
        About this course
      </h2>
      <p
        style={{
          fontSize: "16px",
          color: p.inkMuted,
          lineHeight: 1.7,
          margin: "0 0 36px",
          maxWidth: "720px",
        }}
      >
        A self-paced course for students and early-career researchers. Watch
        short video lessons, take notes that stay yours, and turn what you
        learn into a paper you&apos;re proud of — using the same workspace
        you&apos;re learning in.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: "16px",
          marginBottom: "36px",
        }}
      >
        <AboutCard
          label="Who it's for"
          body="Undergraduates writing their first thesis, master's students starting research, and anyone who's been asked to write a literature review without quite knowing where to start."
        />
        <AboutCard
          label="How it works"
          body="Watch a short lesson. Write a note. Move on. Your notes stay connected to the lessons they came from — and to Cerise, the AI coach who can help you organise them later."
        />
        <AboutCard
          label="What you'll get"
          body="By the end, you'll be able to read a research paper critically, structure your own writing using IMRaD, and tell a strong claim from a weak one."
        />
      </div>

      <div
        style={{
          background: p.warm,
          border: `1.5px solid ${p.border}`,
          borderRadius: "14px",
          padding: "20px 24px",
          maxWidth: "820px",
          display: "flex",
          gap: "14px",
          alignItems: "flex-start",
        }}
      >
        <span style={{ color: p.gold, fontSize: "22px", lineHeight: 1, flexShrink: 0 }}>★</span>
        <div>
          <div
            style={{
              fontSize: "11px",
              color: p.cerise,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            Why it exists
          </div>
          <p style={{ fontSize: "14px", color: p.ink, lineHeight: 1.7, margin: 0 }}>
            Most research-writing advice is either too abstract (&ldquo;think
            critically!&rdquo;) or too narrow (&ldquo;use this template&rdquo;).
            This course aims for the middle: enough method to get unstuck,
            enough room to think for yourself.
          </p>
        </div>
      </div>
    </section>
  );
}

function AboutCard({ label, body }: { label: string; body: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1.5px solid ${p.border}`,
        borderRadius: "14px",
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          color: p.cerise,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <p style={{ fontSize: "13px", color: p.ink, lineHeight: 1.65, margin: 0 }}>
        {body}
      </p>
    </div>
  );
}

function formatModuleMins(mins: number): string {
  if (mins <= 0) return "—";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${hrs}h` : `${hrs}h ${m}m`;
}

function ModulesSection({
  modules,
  videos,
  watchedIds,
  isLoggedIn,
  loading,
}: {
  modules: CourseModule[];
  videos: CourseVideo[];
  watchedIds: Set<string>;
  isLoggedIn: boolean;
  loading: boolean;
}) {
  return (
    <section
      id="modules"
      style={{
        scrollMarginTop: "80px",
        padding: "56px 0",
        borderBottom: `1px solid ${p.rule}`,
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display), 'DM Serif Display', serif",
          fontSize: "32px",
          fontWeight: 400,
          color: p.ink,
          margin: "0 0 14px",
        }}
      >
        Modules
      </h2>
      <p
        style={{
          fontSize: "15px",
          color: p.inkMuted,
          lineHeight: 1.7,
          margin: "0 0 28px",
          maxWidth: "640px",
        }}
      >
        What you&apos;ll cover, in order. Click any lesson to jump straight to
        it on the player.
      </p>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div
            className="animate-spin rounded-full h-7 w-7 border-2"
            style={{ borderColor: p.rule, borderTopColor: p.ink }}
          />
        </div>
      ) : modules.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: `1.5px solid ${p.border}`,
            borderRadius: "14px",
            padding: "32px 28px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "15px", color: p.ink, margin: "0 0 6px", fontFamily: "var(--font-display), serif" }}>
            Lessons are being put together
          </p>
          <p style={{ fontSize: "13px", color: p.inkMuted, margin: 0 }}>
            New modules will show up here as they&apos;re published.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {modules.map((m, i) => {
            const moduleVids = videos.filter((v) => v.module_id === m.id);
            const watched = moduleVids.filter((v) => watchedIds.has(v.id)).length;
            const totalMins = moduleVids.reduce(
              (s, v) => s + (v.duration_minutes ?? 0),
              0
            );
            const firstVid = moduleVids[0];
            return (
              <ModuleCard
                key={m.id}
                index={i + 1}
                module={m}
                videos={moduleVids}
                watched={watched}
                totalMins={totalMins}
                firstVidId={firstVid?.id}
                watchedIds={watchedIds}
                isLoggedIn={isLoggedIn}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function ModuleCard({
  index,
  module: mod,
  videos,
  watched,
  totalMins,
  firstVidId,
  watchedIds,
  isLoggedIn,
}: {
  index: number;
  module: CourseModule;
  videos: CourseVideo[];
  watched: number;
  totalMins: number;
  firstVidId: string | undefined;
  watchedIds: Set<string>;
  isLoggedIn: boolean;
}) {
  const totalVids = videos.length;
  const showProgress = isLoggedIn && totalVids > 0;
  const pct = totalVids === 0 ? 0 : Math.round((watched / totalVids) * 100);
  const isComplete = isLoggedIn && totalVids > 0 && watched === totalVids;

  return (
    <div
      style={{
        background: "#fff",
        border: `1.5px solid ${p.border}`,
        borderRadius: "16px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "20px 24px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "6px",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              color: p.cerise,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Module {index}
          </span>
          {showProgress && (
            <span
              style={{
                fontSize: "11px",
                color: isComplete ? "#3a9d5d" : p.inkMuted,
                fontWeight: 700,
              }}
            >
              {isComplete ? "✓ Complete" : `${watched} / ${totalVids} watched`}
            </span>
          )}
        </div>

        <h3
          style={{
            fontFamily: "var(--font-display), 'DM Serif Display', serif",
            fontSize: "22px",
            fontWeight: 400,
            color: p.ink,
            margin: "0 0 4px",
            lineHeight: 1.25,
          }}
        >
          {mod.title}
        </h3>
        {mod.description && (
          <p style={{ fontSize: "14px", color: p.inkMuted, lineHeight: 1.65, margin: "4px 0 10px" }}>
            {mod.description}
          </p>
        )}
        <div style={{ fontSize: "12px", color: p.inkFaint }}>
          {totalVids} lesson{totalVids === 1 ? "" : "s"} · {formatModuleMins(totalMins)}
        </div>

        {showProgress && (
          <div
            style={{
              marginTop: "12px",
              height: "6px",
              background: p.warm,
              borderRadius: "100px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: isComplete ? "#3a9d5d" : p.cerise,
                borderRadius: "100px",
                transition: "width 300ms ease",
              }}
            />
          </div>
        )}
      </div>

      {/* Lessons list */}
      {totalVids > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: `1px solid ${p.rule}` }}>
          {videos.map((v) => {
            const seen = watchedIds.has(v.id);
            return (
              <li key={v.id}>
                <Link
                  href={`/courses/learn?video=${v.id}`}
                  className="hover:bg-[#faf7f0]"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 24px",
                    textDecoration: "none",
                    color: p.ink,
                    borderTop: `1px solid ${p.rule}`,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: seen ? p.cerise : p.warm,
                      color: seen ? "#fff" : p.inkMuted,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      flexShrink: 0,
                    }}
                  >
                    {seen ? "✓" : "▶"}
                  </span>
                  <span style={{ flex: 1, fontSize: "13px", fontWeight: 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {v.title}
                  </span>
                  <span style={{ fontSize: "11px", color: p.inkFaint, flexShrink: 0 }}>
                    {v.duration_minutes > 0 ? `${v.duration_minutes} min` : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer CTA */}
      {firstVidId && (
        <div style={{ padding: "12px 24px", borderTop: `1px solid ${p.rule}`, background: p.surface }}>
          <Link
            href={`/courses/learn?video=${firstVidId}`}
            style={{
              fontSize: "12px",
              color: p.cerise,
              fontWeight: 700,
              textDecoration: "none",
            }}
            className="hover:underline"
          >
            {isLoggedIn && watched > 0 && watched < totalVids
              ? "Continue this module →"
              : "Start this module →"}
          </Link>
        </div>
      )}
    </div>
  );
}

const LEARNING_OUTCOMES: string[] = [
  "How to read a research paper without drowning in it",
  "The IMRaD structure — and what belongs in each section",
  "How to write a research question that's actually answerable",
  "How to do a literature review without copying ten others",
  "How to write methodology a stranger could replicate",
  "How to make a strong claim — and recognise a weak one",
];

function WhatYoullLearnSection() {
  const isMobile = useIsMobile();
  return (
    <section
      id="what-youll-learn"
      style={{
        scrollMarginTop: "80px",
        padding: "56px 0",
        borderBottom: `1px solid ${p.rule}`,
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display), 'DM Serif Display', serif",
          fontSize: "32px",
          fontWeight: 400,
          color: p.ink,
          margin: "0 0 14px",
        }}
      >
        What you&apos;ll learn
      </h2>
      <p
        style={{
          fontSize: "15px",
          color: p.inkMuted,
          lineHeight: 1.7,
          margin: "0 0 28px",
          maxWidth: "640px",
        }}
      >
        Concrete skills you should walk away with. Each one maps to lessons
        and exercises you&apos;ll do in the course.
      </p>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: "14px 24px",
        }}
      >
        {LEARNING_OUTCOMES.map((text, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
            }}
          >
            <span
              aria-hidden
              style={{
                flexShrink: 0,
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background: p.cerise,
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 700,
                marginTop: "2px",
              }}
            >
              ✓
            </span>
            <span style={{ fontSize: "14px", color: p.ink, lineHeight: 1.65 }}>
              {text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FaqSection() {
  return (
    <section
      id="faq"
      style={{
        scrollMarginTop: "80px",
        padding: "56px 0 72px",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display), 'DM Serif Display', serif",
          fontSize: "32px",
          fontWeight: 400,
          color: p.ink,
          margin: "0 0 14px",
        }}
      >
        Frequently asked questions
      </h2>
      <p
        style={{
          fontSize: "15px",
          color: p.inkMuted,
          lineHeight: 1.7,
          margin: "0 0 28px",
          maxWidth: "640px",
        }}
      >
        Quick answers to the things people ask most. Tap a question to see
        the answer.
      </p>
      <div style={{ maxWidth: "820px" }}>
        <CourseFaq />
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
      <span style={{ color: p.inkMuted }}>{label}</span>
      <span style={{ fontWeight: 700, color: accent ? p.cerise : p.ink }}>{value}</span>
    </div>
  );
}
