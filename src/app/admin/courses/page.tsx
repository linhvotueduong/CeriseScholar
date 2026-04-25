"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import Navbar from "@/components/layout/Navbar";
import GoldStars from "@/components/doodles/GoldStars";
import type { CourseModule, CourseVideo } from "@/types/course";
import { ADMIN_EMAIL } from "@/types/course";

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
  { top: "22%", right: "5%", size: 10, op: 0.4, rot: 15 },
  { top: "50%", left: "3%", size: 7, op: 0.35, rot: -5 },
  { top: "72%", right: "4%", size: 9, op: 0.3, rot: 12 },
];

export default function AdminCoursesPage() {
  const { user, loading: userLoading } = useUser();
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [videosByModule, setVideosByModule] = useState<Record<string, CourseVideo[]>>({});
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [avgCompletion, setAvgCompletion] = useState(0);
  const [loading, setLoading] = useState(true);

  // Add-module form
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDesc, setNewModuleDesc] = useState("");

  // Which module currently has the "add video" form open
  const [addVideoForModuleId, setAddVideoForModuleId] = useState<string | null>(null);
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoYtId, setNewVideoYtId] = useState("");
  const [newVideoDuration, setNewVideoDuration] = useState<number>(0);

  // Admin notes editor — drafts keyed by video id. Drafts persist across
  // fetchAll() so in-progress edits aren't clobbered when the videos refetch.
  const [adminNoteDrafts, setAdminNoteDrafts] = useState<Record<string, string>>({});
  const [adminNoteSaving, setAdminNoteSaving] = useState<Record<string, boolean>>({});
  const [adminNoteSaveError, setAdminNoteSaveError] = useState<Record<string, string>>({});

  const fetchAll = useCallback(async () => {
    const supabase = createClient();

    // Modules (admin RLS gives us ALL modules, published or not)
    const { data: modData } = await supabase
      .from("course_modules")
      .select("*")
      .order("module_order", { ascending: true })
      .order("created_at", { ascending: true });
    const mods = (modData ?? []) as CourseModule[];
    setModules(mods);

    // Videos — fetch all in one query, group by module_id
    const { data: vidData } = await supabase
      .from("course_videos")
      .select("*")
      .order("video_order", { ascending: true })
      .order("created_at", { ascending: true });
    const vids = (vidData ?? []) as CourseVideo[];
    const grouped: Record<string, CourseVideo[]> = {};
    for (const v of vids) {
      if (!grouped[v.module_id]) grouped[v.module_id] = [];
      grouped[v.module_id].push(v);
    }
    setVideosByModule(grouped);

    // Enrolled students = distinct user_ids in course_progress
    const { data: progData } = await supabase
      .from("course_progress")
      .select("user_id, video_id");
    if (progData && vids.length > 0) {
      const uniqueUsers = new Set(progData.map((r) => r.user_id as string));
      setEnrolledCount(uniqueUsers.size);
      // Avg completion = (watch rows per user / total videos) averaged across users
      const perUser = new Map<string, number>();
      for (const r of progData) {
        const uid = r.user_id as string;
        perUser.set(uid, (perUser.get(uid) ?? 0) + 1);
      }
      if (perUser.size > 0) {
        let sum = 0;
        for (const count of perUser.values()) sum += count / vids.length;
        setAvgCompletion(Math.round((sum / perUser.size) * 100));
      } else {
        setAvgCompletion(0);
      }
    } else {
      setEnrolledCount(0);
      setAvgCompletion(0);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleAddModule(e: React.FormEvent) {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;
    const supabase = createClient();
    const nextOrder = modules.length;
    await supabase.from("course_modules").insert({
      title: newModuleTitle.trim(),
      description: newModuleDesc.trim(),
      module_order: nextOrder,
      is_published: false,
    });
    setNewModuleTitle("");
    setNewModuleDesc("");
    setShowAddModule(false);
    fetchAll();
  }

  async function handleTogglePublish(mod: CourseModule) {
    const supabase = createClient();
    await supabase
      .from("course_modules")
      .update({ is_published: !mod.is_published, updated_at: new Date().toISOString() })
      .eq("id", mod.id);
    fetchAll();
  }

  async function handleDeleteModule(mod: CourseModule) {
    const videoCount = (videosByModule[mod.id] ?? []).length;
    const msg = videoCount > 0
      ? `Delete "${mod.title}" and all ${videoCount} video${videoCount === 1 ? "" : "s"} inside it? This cannot be undone.`
      : `Delete "${mod.title}"?`;
    if (!confirm(msg)) return;
    const supabase = createClient();
    await supabase.from("course_modules").delete().eq("id", mod.id);
    fetchAll();
  }

  function openAddVideo(moduleId: string) {
    setAddVideoForModuleId(moduleId);
    setNewVideoTitle("");
    setNewVideoYtId("");
    setNewVideoDuration(0);
  }

  async function handleAddVideo(moduleId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!newVideoTitle.trim() || !newVideoYtId.trim()) return;
    const supabase = createClient();
    const existing = videosByModule[moduleId] ?? [];
    await supabase.from("course_videos").insert({
      module_id: moduleId,
      title: newVideoTitle.trim(),
      youtube_id: newVideoYtId.trim(),
      duration_minutes: newVideoDuration,
      video_order: existing.length,
    });
    setAddVideoForModuleId(null);
    fetchAll();
  }

  async function handleDeleteVideo(vid: CourseVideo) {
    if (!confirm(`Delete "${vid.title}"?`)) return;
    const supabase = createClient();
    await supabase.from("course_videos").delete().eq("id", vid.id);
    fetchAll();
  }

  function adminNoteValueFor(v: CourseVideo): string {
    // If the user is mid-edit, show their draft; otherwise show the saved value.
    return adminNoteDrafts[v.id] ?? v.admin_notes ?? "";
  }

  function adminNoteDirtyFor(v: CourseVideo): boolean {
    const draft = adminNoteDrafts[v.id];
    if (draft === undefined) return false;
    return draft !== (v.admin_notes ?? "");
  }

  async function handleSaveAdminNote(v: CourseVideo) {
    const draft = adminNoteDrafts[v.id] ?? "";
    setAdminNoteSaving((prev) => ({ ...prev, [v.id]: true }));
    setAdminNoteSaveError((prev) => ({ ...prev, [v.id]: "" }));
    const supabase = createClient();
    const { error } = await supabase
      .from("course_videos")
      .update({ admin_notes: draft })
      .eq("id", v.id);
    setAdminNoteSaving((prev) => ({ ...prev, [v.id]: false }));
    if (error) {
      setAdminNoteSaveError((prev) => ({ ...prev, [v.id]: error.message }));
      return;
    }
    // Sync local state so the Save button disables without waiting for fetchAll
    setVideosByModule((prev) => {
      const next: Record<string, CourseVideo[]> = {};
      for (const [mid, list] of Object.entries(prev)) {
        next[mid] = list.map((vv) =>
          vv.id === v.id ? { ...vv, admin_notes: draft } : vv
        );
      }
      return next;
    });
  }

  // Stats
  const totalModules = modules.length;
  const totalVideos = Object.values(videosByModule).reduce((sum, arr) => sum + arr.length, 0);
  const publishedModules = modules.filter((m) => m.is_published).length;

  // Auth guard — middleware already blocks this route, but render a friendly message
  // while useUser is still hydrating or for unexpected edge cases.
  if (!userLoading && user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    return (
      <div style={{ minHeight: "100vh", background: p.bg }}>
        <Navbar />
        <div style={{ maxWidth: "600px", margin: "80px auto", padding: "40px", background: "#fff", border: `1.5px solid ${p.border}`, borderRadius: "14px", textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-display), 'DM Serif Display', serif", fontSize: "28px", color: p.ink, margin: "0 0 12px" }}>Admin only</h1>
          <p style={{ fontSize: "14px", color: p.inkMuted }}>This page is restricted to the site administrator.</p>
          <Link href="/dashboard" style={{ display: "inline-block", marginTop: "20px", padding: "10px 22px", borderRadius: "100px", background: p.ink, color: "#fff", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: p.bg, position: "relative" }}>
      <Navbar />
      <GoldStars stars={stars} />

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${p.rule}`, background: "#fff", marginTop: "24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 32px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px" }}>
          <div>
            <div style={{ fontSize: "11px", color: p.cerise, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
              Admin
            </div>
            <h1 style={{ fontFamily: "var(--font-display), 'DM Serif Display', serif", fontSize: "40px", fontWeight: 400, color: p.ink, margin: "0 0 6px" }}>
              Courses
            </h1>
            <p style={{ fontSize: "13px", color: p.inkMuted, margin: 0 }}>
              Add modules and YouTube videos. Toggle a module to <strong style={{ color: p.ink }}>Published</strong> when it&apos;s ready for students.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
            <Link href="/courses/learn" style={{ padding: "8px 16px", borderRadius: "100px", background: p.warm, color: p.ink, textDecoration: "none", fontSize: "12px", fontWeight: 600, border: `1px solid ${p.border}` }}>
              View as student →
            </Link>
            <button
              onClick={() => setShowAddModule(!showAddModule)}
              style={{ padding: "10px 20px", borderRadius: "100px", background: p.cerise, color: "#fff", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            >
              + Add module
            </button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 32px 80px", display: "flex", gap: "24px", alignItems: "flex-start" }}>

        {/* ── Left: Module manager ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Add-module form */}
          {showAddModule && (
            <form onSubmit={handleAddModule} style={{ background: "#fff", border: `1.5px solid ${p.border}`, borderRadius: "14px", padding: "24px 28px", marginBottom: "16px" }}>
              <h3 style={{ fontFamily: "var(--font-display), 'DM Serif Display', serif", fontSize: "18px", fontWeight: 400, color: p.ink, margin: "0 0 16px" }}>
                New module
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <input
                  type="text" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="Module title (e.g. Writing the Introduction)"
                  style={{ width: "100%", padding: "12px 16px", border: `1.5px solid ${p.border}`, borderRadius: "10px", fontSize: "14px", color: p.ink, outline: "none", background: "#fff" }}
                  autoFocus required
                />
                <textarea
                  value={newModuleDesc} onChange={(e) => setNewModuleDesc(e.target.value)}
                  placeholder="Short description (optional)"
                  rows={2}
                  style={{ width: "100%", padding: "12px 16px", border: `1.5px solid ${p.border}`, borderRadius: "10px", fontSize: "13px", color: p.ink, outline: "none", background: "#fff", resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
                <button type="button" onClick={() => { setShowAddModule(false); setNewModuleTitle(""); setNewModuleDesc(""); }}
                  style={{ padding: "8px 20px", fontSize: "13px", color: p.inkMuted, background: "none", border: "none", cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={!newModuleTitle.trim()}
                  style={{ padding: "10px 24px", borderRadius: "100px", background: p.ink, color: "#fff", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: !newModuleTitle.trim() ? 0.5 : 1 }}>
                  Save module
                </button>
              </div>
            </form>
          )}

          {/* Modules list */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px" }}>
              <div className="animate-spin rounded-full h-8 w-8 border-2 mx-auto" style={{ borderColor: p.rule, borderTopColor: p.ink }} />
            </div>
          ) : modules.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: "14px", border: `1.5px solid ${p.border}` }}>
              <p style={{ fontSize: "16px", color: p.inkMuted, margin: 0 }}>No modules yet.</p>
              <p style={{ fontSize: "13px", color: p.inkFaint, margin: "8px 0 0" }}>Click &ldquo;+ Add module&rdquo; to create the first one.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {modules.map((mod) => {
                const vids = videosByModule[mod.id] ?? [];
                return (
                  <div key={mod.id} style={{ background: "#fff", border: `1.5px solid ${p.border}`, borderRadius: "14px", overflow: "hidden" }}>

                    {/* Module header */}
                    <div style={{ padding: "18px 22px", borderBottom: vids.length > 0 || addVideoForModuleId === mod.id ? `1px solid ${p.rule}` : "none" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontFamily: "var(--font-display), 'DM Serif Display', serif", fontSize: "20px", fontWeight: 400, color: p.ink, margin: "0 0 4px" }}>
                            {mod.title}
                          </h3>
                          {mod.description && (
                            <p style={{ fontSize: "12px", color: p.inkMuted, margin: "0 0 8px", lineHeight: 1.5 }}>{mod.description}</p>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", color: p.inkFaint }}>
                            <span>{vids.length} video{vids.length === 1 ? "" : "s"}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                          <button
                            onClick={() => handleTogglePublish(mod)}
                            style={{
                              padding: "5px 12px", borderRadius: "100px",
                              background: mod.is_published ? p.cerise : p.warm,
                              color: mod.is_published ? "#fff" : p.inkMuted,
                              border: mod.is_published ? "none" : `1px solid ${p.border}`,
                              fontSize: "11px", fontWeight: 700, cursor: "pointer",
                              letterSpacing: "0.04em", textTransform: "uppercase",
                            }}
                            title={mod.is_published ? "Click to unpublish" : "Click to publish"}
                          >
                            {mod.is_published ? "Published" : "Draft"}
                          </button>
                          <button
                            onClick={() => handleDeleteModule(mod)}
                            style={{ padding: "5px 10px", borderRadius: "8px", background: "none", color: p.inkFaint, border: "none", fontSize: "12px", cursor: "pointer" }}
                            title="Delete module"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Videos */}
                    {vids.length > 0 && (
                      <div>
                        {vids.map((v) => {
                          const saving = !!adminNoteSaving[v.id];
                          const err = adminNoteSaveError[v.id];
                          const dirty = adminNoteDirtyFor(v);
                          const hasAdminNote = (v.admin_notes ?? "").trim().length > 0;
                          return (
                            <div key={v.id} style={{ borderBottom: `1px solid ${p.rule}` }}>
                              {/* Title row */}
                              <div style={{ padding: "12px 22px", display: "flex", alignItems: "center", gap: "12px" }}>
                                <span style={{ color: p.cerise, fontSize: "14px" }}>▶</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: "13px", fontWeight: 600, color: p.ink, marginBottom: "2px" }}>{v.title}</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", color: p.inkFaint }}>
                                    <span>{v.duration_minutes} min</span>
                                    <span style={{ padding: "1px 6px", background: p.warm, border: `1px solid ${p.border}`, borderRadius: "4px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: p.inkMuted }}>
                                      YT: {v.youtube_id}
                                    </span>
                                    {hasAdminNote && (
                                      <span style={{ padding: "1px 6px", background: "#e8f5e8", border: `1px solid #c8e0c8`, borderRadius: "4px", color: "#3a7a3a", fontWeight: 600 }}>
                                        Has admin note
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteVideo(v)}
                                  style={{ padding: "4px 8px", background: "none", color: p.inkFaint, border: "none", fontSize: "12px", cursor: "pointer" }}
                                  title="Delete video"
                                >
                                  ✕
                                </button>
                              </div>

                              {/* Admin notes editor */}
                              <div style={{ padding: "0 22px 14px 22px" }}>
                                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "6px" }}>
                                  <label style={{ fontSize: "10px", color: p.inkMuted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                    Admin notes
                                  </label>
                                  <span style={{ fontSize: "10px", color: p.inkFaint }}>
                                    Shown below the video for students. Leave blank to hide.
                                  </span>
                                </div>
                                <textarea
                                  value={adminNoteValueFor(v)}
                                  onChange={(e) =>
                                    setAdminNoteDrafts((prev) => ({ ...prev, [v.id]: e.target.value }))
                                  }
                                  placeholder="Further reading, key terms, links, questions to think about..."
                                  rows={3}
                                  style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    border: `1.5px solid ${p.border}`,
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontFamily: "var(--font-body), 'DM Sans', sans-serif",
                                    color: p.ink,
                                    background: p.surface,
                                    outline: "none",
                                    resize: "vertical",
                                    lineHeight: 1.5,
                                  }}
                                />
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                                  {err && (
                                    <span style={{ fontSize: "11px", color: p.cerise, marginRight: "auto" }}>
                                      Save failed: {err}
                                    </span>
                                  )}
                                  {!err && dirty && (
                                    <span style={{ fontSize: "11px", color: p.inkMuted, marginRight: "auto" }}>
                                      Unsaved changes
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleSaveAdminNote(v)}
                                    disabled={saving || !dirty}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: "100px",
                                      background: dirty ? p.ink : p.warm,
                                      color: dirty ? "#fff" : p.inkFaint,
                                      border: dirty ? "none" : `1px solid ${p.border}`,
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      cursor: saving || !dirty ? "default" : "pointer",
                                      opacity: saving ? 0.6 : 1,
                                    }}
                                  >
                                    {saving ? "Saving…" : dirty ? "Save" : "Saved"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add-video form / button */}
                    {addVideoForModuleId === mod.id ? (
                      <form onSubmit={(e) => handleAddVideo(mod.id, e)} style={{ padding: "16px 22px", background: p.surface }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <input type="text" value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)} placeholder="Video title" autoFocus required
                            style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${p.border}`, borderRadius: "8px", fontSize: "13px", color: p.ink, outline: "none", background: "#fff" }} />
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input type="text" value={newVideoYtId} onChange={(e) => setNewVideoYtId(e.target.value)} placeholder="YouTube ID (e.g. dQw4w9WgXcQ)" required
                              style={{ flex: 2, padding: "10px 14px", border: `1.5px solid ${p.border}`, borderRadius: "8px", fontSize: "13px", color: p.ink, outline: "none", background: "#fff", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} />
                            <input type="number" value={newVideoDuration || ""} onChange={(e) => setNewVideoDuration(Number(e.target.value))} placeholder="Minutes" min={0}
                              style={{ flex: 1, padding: "10px 14px", border: `1.5px solid ${p.border}`, borderRadius: "8px", fontSize: "13px", color: p.ink, outline: "none", background: "#fff" }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
                          <button type="button" onClick={() => setAddVideoForModuleId(null)}
                            style={{ padding: "6px 16px", fontSize: "12px", color: p.inkMuted, background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                          <button type="submit" disabled={!newVideoTitle.trim() || !newVideoYtId.trim()}
                            style={{ padding: "8px 18px", borderRadius: "100px", background: p.ink, color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", opacity: (!newVideoTitle.trim() || !newVideoYtId.trim()) ? 0.5 : 1 }}>
                            Save video
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => openAddVideo(mod.id)}
                        className="hover:bg-[#faf7f0]"
                        style={{ display: "block", width: "100%", padding: "12px 22px", border: "none", background: "transparent", color: p.cerise, fontSize: "12px", fontWeight: 600, textAlign: "left", cursor: "pointer", borderTop: vids.length > 0 ? `1px solid ${p.rule}` : "none" }}
                      >
                        + Add video to this module
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right: Stats sidebar ── */}
        <div style={{ width: "280px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px" }}>

          <div style={{ background: "#fff", border: `1.5px solid ${p.border}`, borderRadius: "14px", padding: "20px", overflow: "hidden" }}>
            <div style={{ background: p.cerise, margin: "-20px -20px 16px", padding: "16px 20px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#fff", margin: 0 }}>Course overview</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Total modules", value: totalModules },
                { label: "Total videos", value: totalVideos },
                { label: "Published modules", value: publishedModules },
                { label: "Enrolled students", value: enrolledCount },
                { label: "Avg completion", value: `${avgCompletion}%` },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: p.inkMuted }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: p.ink }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#fff", border: `1.5px solid ${p.border}`, borderRadius: "14px", padding: "20px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: p.ink, margin: "0 0 12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: p.gold }}>★</span> Workflow
            </h3>
            <ol style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: p.inkMuted, lineHeight: 1.5 }}>
              <li>Upload video to YouTube as <strong style={{ color: p.ink }}>Unlisted</strong></li>
              <li>Copy the video ID (after <code style={{ fontFamily: "ui-monospace, Menlo, monospace", color: p.ink }}>?v=</code>)</li>
              <li>Paste ID + title + duration into a module</li>
              <li>Flip the module to <strong style={{ color: p.ink }}>Published</strong> when ready</li>
            </ol>
          </div>

          <div style={{ background: "#fff", border: `1.5px solid ${p.border}`, borderRadius: "14px", padding: "16px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link href="/courses/learn" className="hover:underline" style={{ fontSize: "12px", color: p.inkMuted, textDecoration: "none" }}>Student view →</Link>
              <Link href="/dashboard" className="hover:underline" style={{ fontSize: "12px", color: p.inkMuted, textDecoration: "none" }}>← Back to Projects</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
