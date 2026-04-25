"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import CoursesTabs from "@/components/courses/CoursesTabs";
import CeriseCoach from "@/components/courses/CeriseCoach";
import GoldStars from "@/components/doodles/GoldStars";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import type { CourseModule, CourseNote, CourseVideo } from "@/types/course";

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
  highlight: "#fff5b8",
};

const stars = [
  { top: "10%", left: "4%", size: 8, op: 0.3, rot: -10 },
  { top: "30%", right: "5%", size: 9, op: 0.35, rot: 12 },
  { top: "60%", left: "3%", size: 7, op: 0.3, rot: -5 },
  { top: "85%", right: "4%", size: 8, op: 0.3, rot: 8 },
];

// Cycle through these to color-code modules. Stays consistent per module index.
const moduleColors = [
  { bar: "#c0392b", soft: "#f5e0db" },
  { bar: "#c97a6b", soft: "#f3dcd6" },
  { bar: "#c8a84b", soft: "#f5ecc8" },
  { bar: "#3a9d5d", soft: "#d8ecdf" },
  { bar: "#7c5da3", soft: "#e7dff0" },
  { bar: "#3d7faa", soft: "#dae6f0" },
];
function colorForModule(idx: number) {
  return moduleColors[idx % moduleColors.length];
}

type SortMode = "module" | "newest" | "oldest";

interface NoteWithContext extends CourseNote {
  video_title: string;
  video_order: number;
  module_title: string;
  module_id: string;
  module_order: number;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const re = new RegExp(`(${escapeRegex(query)})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        style={{ background: p.highlight, color: p.ink, padding: "0 1px", borderRadius: "2px" }}
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
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

function buildExportText(grouped: { module: { title: string; module_order: number }; notes: NoteWithContext[] }[]): string {
  const lines: string[] = [];
  lines.push("My Learning Notes");
  lines.push("=================");
  lines.push("");
  lines.push(`Exported ${new Date().toLocaleString()}`);
  lines.push("");
  for (const g of grouped) {
    lines.push(`## ${g.module.title}`);
    lines.push("");
    for (const n of g.notes) {
      lines.push(`### ${n.video_title}`);
      lines.push("");
      lines.push(n.content);
      lines.push("");
      lines.push(`(saved ${new Date(n.updated_at).toLocaleString()})`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

export default function NotesManagerPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [notes, setNotes] = useState<NoteWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [sort, setSort] = useState<SortMode>("module");
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copyAllStatus, setCopyAllStatus] = useState<"idle" | "copied">("idle");
  const [copyOneId, setCopyOneId] = useState<string | null>(null);

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

    const [vidsRes, notesRes] = await Promise.all([
      supabase
        .from("course_videos")
        .select("*")
        .order("video_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("course_notes")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
    ]);

    const mods = (modsRes.data ?? []) as CourseModule[];
    const vids = (vidsRes.data ?? []) as CourseVideo[];
    const rawNotes = (notesRes.data ?? []) as CourseNote[];

    const moduleById = new Map<string, CourseModule>();
    for (const m of mods) moduleById.set(m.id, m);
    const videoById = new Map<string, CourseVideo>();
    for (const v of vids) videoById.set(v.id, v);

    const enriched: NoteWithContext[] = [];
    for (const n of rawNotes) {
      if (!n.content || n.content.trim().length === 0) continue;
      const v = videoById.get(n.video_id);
      if (!v) continue;
      const m = moduleById.get(v.module_id);
      if (!m) continue;
      enriched.push({
        ...n,
        video_title: v.title,
        video_order: v.video_order,
        module_title: m.title,
        module_id: m.id,
        module_order: m.module_order,
      });
    }

    setModules(mods);
    setNotes(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  // Apply search + module filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (moduleFilter && n.module_id !== moduleFilter) return false;
      if (!q) return true;
      return (
        n.content.toLowerCase().includes(q) ||
        n.video_title.toLowerCase().includes(q) ||
        n.module_title.toLowerCase().includes(q)
      );
    });
  }, [notes, query, moduleFilter]);

  // Group filtered notes by module, then sort within each group
  const grouped = useMemo(() => {
    const map = new Map<string, NoteWithContext[]>();
    for (const n of filtered) {
      const list = map.get(n.module_id) ?? [];
      list.push(n);
      map.set(n.module_id, list);
    }

    const groups = Array.from(map.entries()).map(([module_id, list]) => {
      const head = list[0];
      const sortedNotes = [...list].sort((a, b) => {
        if (sort === "newest") return a.updated_at < b.updated_at ? 1 : -1;
        if (sort === "oldest") return a.updated_at < b.updated_at ? -1 : 1;
        // module: by video_order then created_at
        if (a.video_order !== b.video_order) return a.video_order - b.video_order;
        return a.updated_at < b.updated_at ? 1 : -1;
      });
      return {
        module_id,
        module: { title: head.module_title, module_order: head.module_order },
        notes: sortedNotes,
      };
    });

    if (sort === "newest" || sort === "oldest") {
      // Sort module groups by their newest note (or oldest for "oldest")
      groups.sort((a, b) => {
        const av = a.notes[0]?.updated_at ?? "";
        const bv = b.notes[0]?.updated_at ?? "";
        if (sort === "oldest") return av < bv ? -1 : 1;
        return av < bv ? 1 : -1;
      });
    } else {
      groups.sort((a, b) => a.module.module_order - b.module.module_order);
    }

    return groups;
  }, [filtered, sort]);

  // Map module_id → index in the published order, for stable colors
  const moduleIndexById = useMemo(() => {
    const map = new Map<string, number>();
    modules.forEach((m, i) => map.set(m.id, i));
    return map;
  }, [modules]);

  function toggleNoteExpanded(id: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleModuleCollapsed(id: string) {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCopyOne(n: NoteWithContext) {
    const text = `${n.module_title} — ${n.video_title}\n\n${n.content}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyOneId(n.id);
      setTimeout(() => setCopyOneId(null), 1500);
    } catch {
      // Clipboard may be blocked in some contexts — silently no-op.
    }
  }

  async function handleDelete(n: NoteWithContext) {
    if (!confirm(`Delete your note for "${n.video_title}"? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("course_notes").delete().eq("id", n.id);
    if (error) {
      alert(`Could not delete: ${error.message}`);
      return;
    }
    setNotes((prev) => prev.filter((x) => x.id !== n.id));
  }

  async function handleExportTxt() {
    const text = buildExportText(grouped);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `cerise-scholar-notes-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }

  async function handleCopyAll() {
    const text = buildExportText(grouped);
    try {
      await navigator.clipboard.writeText(text);
      setCopyAllStatus("copied");
      setTimeout(() => setCopyAllStatus("idle"), 1500);
    } catch {
      // ignore
    }
    setShowExportMenu(false);
  }

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

  const totalNotes = notes.length;
  const filteredCount = filtered.length;
  const isFiltering = query.trim().length > 0 || moduleFilter !== "";

  return (
    <div style={{ background: p.bg, minHeight: "100vh", color: p.ink, position: "relative" }}>
      <Navbar />
      <GoldStars stars={stars} />

      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "40px 32px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <CoursesTabs />

        {/* Header */}
        <header style={{ marginBottom: "24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
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
                fontSize: "40px",
                fontWeight: 400,
                color: p.ink,
                margin: "0 0 6px",
                lineHeight: 1.1,
              }}
            >
              All notes
            </h1>
            <p style={{ fontSize: "13px", color: p.inkMuted, margin: 0 }}>
              Notes from your course lessons — grouped by module.
            </p>
          </div>

          {/* Export dropdown */}
          {totalNotes > 0 && (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={() => setShowExportMenu((v) => !v)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "100px",
                  background: copyAllStatus === "copied" ? p.warm : p.ink,
                  color: copyAllStatus === "copied" ? p.cerise : "#fff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {copyAllStatus === "copied" ? "✓ Copied to clipboard" : "↓ Export all"}
              </button>
              {showExportMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    background: "#fff",
                    border: `1.5px solid ${p.border}`,
                    borderRadius: "12px",
                    padding: "6px",
                    minWidth: "220px",
                    boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
                    zIndex: 50,
                  }}
                >
                  <ExportItem onClick={handleExportTxt} label="Export as .txt" />
                  <ExportItem onClick={handleCopyAll} label="Copy all to clipboard" />
                  <ExportItem disabled label="Export as PDF (coming soon)" />
                </div>
              )}
            </div>
          )}
        </header>

        {fetchError && (
          <div
            style={{
              background: p.warm,
              border: `1.5px solid ${p.border}`,
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "20px",
              fontSize: "13px",
              color: p.inkMuted,
            }}
          >
            <strong style={{ color: p.ink }}>Couldn&apos;t load notes.</strong> {fetchError}
          </div>
        )}

        {totalNotes === 0 && !fetchError ? (
          <EmptyNotes />
        ) : (
          <>
            {/* Controls */}
            <section
              style={{
                background: "#fff",
                border: `1.5px solid ${p.border}`,
                borderRadius: "14px",
                padding: "14px 16px",
                marginBottom: "20px",
                display: "flex",
                gap: "10px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: p.inkFaint,
                    fontSize: "13px",
                  }}
                >
                  ⌕
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your notes..."
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 34px",
                    border: `1.5px solid ${p.border}`,
                    borderRadius: "10px",
                    fontSize: "13px",
                    color: p.ink,
                    outline: "none",
                    background: p.surface,
                  }}
                />
              </div>

              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                style={{
                  padding: "10px 14px",
                  border: `1.5px solid ${p.border}`,
                  borderRadius: "10px",
                  fontSize: "12px",
                  color: p.ink,
                  background: "#fff",
                  outline: "none",
                  cursor: "pointer",
                  minWidth: "150px",
                }}
              >
                <option value="">All modules</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                style={{
                  padding: "10px 14px",
                  border: `1.5px solid ${p.border}`,
                  borderRadius: "10px",
                  fontSize: "12px",
                  color: p.ink,
                  background: "#fff",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="module">Module order</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>

              <span style={{ fontSize: "12px", color: p.inkFaint, marginLeft: "auto" }}>
                {isFiltering
                  ? `${filteredCount} of ${totalNotes} note${totalNotes === 1 ? "" : "s"}`
                  : `${totalNotes} note${totalNotes === 1 ? "" : "s"}`}
              </span>
            </section>

            {/* Groups */}
            {grouped.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  border: `1.5px solid ${p.border}`,
                  borderRadius: "14px",
                  padding: "40px 24px",
                  textAlign: "center",
                  color: p.inkMuted,
                  fontSize: "14px",
                }}
              >
                No notes match your filters. Try a different search or clear them.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {grouped.map((g) => {
                  const idx = moduleIndexById.get(g.module_id) ?? 0;
                  const color = colorForModule(idx);
                  const isCollapsed = collapsedModules.has(g.module_id);
                  return (
                    <section
                      key={g.module_id}
                      style={{
                        background: "#fff",
                        border: `1.5px solid ${p.border}`,
                        borderRadius: "14px",
                        overflow: "hidden",
                        borderLeft: `4px solid ${color.bar}`,
                      }}
                    >
                      <button
                        onClick={() => toggleModuleCollapsed(g.module_id)}
                        style={{
                          width: "100%",
                          padding: "14px 18px",
                          background: "transparent",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          textAlign: "left",
                          color: p.ink,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              fontFamily: "var(--font-display), serif",
                              fontSize: "16px",
                              color: p.ink,
                            }}
                          >
                            {highlight(g.module.title, query)}
                          </span>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "100px",
                              background: color.soft,
                              color: color.bar,
                              fontSize: "10px",
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                            }}
                          >
                            {g.notes.length} note{g.notes.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <span style={{ fontSize: "11px", color: p.inkFaint }}>
                          {isCollapsed ? "▾" : "▴"}
                        </span>
                      </button>

                      {!isCollapsed && (
                        <div style={{ padding: "0 18px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          {g.notes.map((n) => {
                            const isExpanded = expandedNotes.has(n.id);
                            const showReadMore = n.content.length > 220 || n.content.split("\n").length > 3;
                            const justCopied = copyOneId === n.id;
                            return (
                              <div
                                key={n.id}
                                style={{
                                  border: `1.5px solid ${p.border}`,
                                  borderRadius: "12px",
                                  padding: "14px 16px",
                                  background: p.surface,
                                  position: "relative",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                  <span
                                    style={{
                                      padding: "1px 8px",
                                      borderRadius: "4px",
                                      background: color.soft,
                                      color: color.bar,
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    {g.module.title}
                                  </span>
                                  <Link
                                    href={`/courses/learn?video=${n.video_id}`}
                                    className="hover:underline"
                                    style={{
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      color: p.ink,
                                      textDecoration: "none",
                                    }}
                                    title="Open this lesson on /courses"
                                  >
                                    {highlight(n.video_title, query)}
                                  </Link>
                                </div>
                                <p
                                  style={{
                                    fontSize: "13px",
                                    color: p.ink,
                                    lineHeight: 1.6,
                                    margin: "4px 0 8px",
                                    whiteSpace: isExpanded ? "pre-wrap" : "normal",
                                    overflow: isExpanded ? "visible" : "hidden",
                                    display: isExpanded ? "block" : "-webkit-box",
                                    WebkitLineClamp: isExpanded ? "unset" : 3,
                                    WebkitBoxOrient: "vertical",
                                  }}
                                >
                                  {highlight(n.content, query)}
                                </p>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    {showReadMore && (
                                      <button
                                        onClick={() => toggleNoteExpanded(n.id)}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: p.cerise,
                                          fontSize: "11px",
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          padding: 0,
                                        }}
                                      >
                                        {isExpanded ? "Show less" : "Read more"}
                                      </button>
                                    )}
                                    <span style={{ fontSize: "11px", color: p.inkFaint }}>
                                      Saved {timeAgo(n.updated_at)}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <button
                                      onClick={() => handleCopyOne(n)}
                                      style={{
                                        background: "none",
                                        border: `1px solid ${p.border}`,
                                        borderRadius: "8px",
                                        padding: "4px 10px",
                                        fontSize: "11px",
                                        color: justCopied ? p.cerise : p.inkMuted,
                                        cursor: "pointer",
                                        fontWeight: 600,
                                      }}
                                      title="Copy this note"
                                    >
                                      {justCopied ? "✓ Copied" : "Copy"}
                                    </button>
                                    <button
                                      onClick={() => handleDelete(n)}
                                      style={{
                                        background: "none",
                                        border: `1px solid ${p.border}`,
                                        borderRadius: "8px",
                                        padding: "4px 10px",
                                        fontSize: "11px",
                                        color: p.inkMuted,
                                        cursor: "pointer",
                                        fontWeight: 600,
                                      }}
                                      title="Delete this note"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating AI coach — only renders for logged-in users (page already
          guards against unauthenticated access above). Lives at the page
          root so its fixed-position styles work without a containing block. */}
      <CeriseCoach
        notes={notes.map((n) => ({
          module_title: n.module_title,
          video_title: n.video_title,
          content: n.content,
        }))}
      />
    </div>
  );
}

function ExportItem({ onClick, label, disabled }: { onClick?: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="hover:bg-[#faf7f0] disabled:hover:bg-transparent"
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        background: "transparent",
        border: "none",
        borderRadius: "8px",
        fontSize: "12px",
        color: disabled ? p.inkFaint : p.ink,
        cursor: disabled ? "default" : "pointer",
        fontWeight: 500,
      }}
    >
      {label}
    </button>
  );
}

function EmptyNotes() {
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
        No notes yet
      </p>
      <p style={{ fontSize: "13px", color: p.inkMuted, margin: "0 0 16px" }}>
        Notes you write while watching lessons will show up here.
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
        Go to Courses →
      </Link>
    </div>
  );
}
