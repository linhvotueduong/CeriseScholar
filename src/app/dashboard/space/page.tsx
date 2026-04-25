/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";
import GoldStars from "@/components/doodles/GoldStars";
import HEDGEHOG from "@/lib/hedgehog";
import type { SpacePost, SortMode } from "@/types/space";
import { SPACE_TOPICS } from "@/types/space";

const p = {
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  inkFaint: "#9a8a7a",
  cerise: "#c0392b",
  gold: "#c8a84b",
  rule: "#e0d8d0",
  border: "#d4cdc5",
  surface: "#fdfcfa",
  warm: "#faf7f0",
};

const stars = [
  { top: "6%", left: "4%", size: 8, op: 0.3, rot: -10 },
  { top: "14%", right: "5%", size: 10, op: 0.4, rot: 15 },
  { top: "40%", left: "3%", size: 7, op: 0.35, rot: -5 },
  { top: "60%", right: "4%", size: 9, op: 0.3, rot: 12 },
  { top: "80%", left: "5%", size: 6, op: 0.35, rot: -8 },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function topicColor(topic: string): string {
  const colors: Record<string, string> = {
    general: "#7a6a5a",
    research_questions: "#c0392b",
    writing_tips: "#c8a84b",
    feedback: "#34d399",
    study_groups: "#60a5fa",
    methodology: "#a78bfa",
    tools: "#f59e0b",
  };
  return colors[topic] || p.inkMuted;
}

function topicLabel(topic: string): string {
  return SPACE_TOPICS.find((t) => t.key === topic)?.label || topic;
}

export default function ScholarSpacePage() {
  const { user } = useUser();
  const [posts, setPosts] = useState<SpacePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("hot");
  const [topicFilter, setTopicFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // New post form
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newTopic, setNewTopic] = useState("general");
  const [posting, setPosting] = useState(false);

  // Track which posts the current user has upvoted
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());

  const fetchPosts = useCallback(async () => {
    const supabase = createClient();
    let query = supabase.from("space_posts").select("*");

    if (sort === "new") query = query.order("created_at", { ascending: false });
    else if (sort === "top") query = query.order("upvote_count", { ascending: false });
    else query = query.order("upvote_count", { ascending: false }).order("created_at", { ascending: false });

    if (topicFilter) query = query.eq("topic", topicFilter);

    const { data } = await query.limit(50);
    if (data) setPosts(data as SpacePost[]);
    setLoading(false);
  }, [sort, topicFilter]);

  const fetchUserUpvotes = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("space_upvotes")
      .select("post_id")
      .eq("user_id", user.id);
    if (data) setUserUpvotes(new Set(data.map((d) => d.post_id)));
  }, [user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    fetchUserUpvotes();
  }, [fetchUserUpvotes]);

  async function handleNewPost(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !user) return;
    setPosting(true);
    const supabase = createClient();
    await supabase.from("space_posts").insert({
      user_id: user.id,
      title: newTitle.trim(),
      body: newBody.trim(),
      topic: newTopic,
    });
    setNewTitle("");
    setNewBody("");
    setNewTopic("general");
    setShowNewPost(false);
    setPosting(false);
    fetchPosts();
  }

  async function handleUpvote(postId: string) {
    if (!user) return;
    const supabase = createClient();
    if (userUpvotes.has(postId)) {
      await supabase.from("space_upvotes").delete().eq("post_id", postId).eq("user_id", user.id);
      setUserUpvotes((prev) => { const next = new Set(prev); next.delete(postId); return next; });
      setPosts((prev) => prev.map((pp) => pp.id === postId ? { ...pp, upvote_count: Math.max(0, pp.upvote_count - 1) } : pp));
    } else {
      await supabase.from("space_upvotes").insert({ post_id: postId, user_id: user.id });
      setUserUpvotes((prev) => new Set(prev).add(postId));
      setPosts((prev) => prev.map((pp) => pp.id === postId ? { ...pp, upvote_count: pp.upvote_count + 1 } : pp));
    }
  }

  const filtered = searchQuery.trim()
    ? posts.filter(
        (pp) =>
          pp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pp.body.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  // Community stats
  const totalPosts = posts.length;
  const totalUpvotes = posts.reduce((sum, pp) => sum + pp.upvote_count, 0);

  const totalComments = posts.reduce((sum, pp) => sum + pp.comment_count, 0);

  return (
    <div style={{ position: "relative" }}>
      <GoldStars stars={stars} />

      {/* Header bar */}
      <div style={{ borderBottom: `1px solid ${p.rule}`, background: "#fff" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display), 'DM Serif Display', serif", fontSize: "38px", fontWeight: 400, color: p.ink, margin: "0 0 4px" }}>
              Cerise Space
            </h1>
            <p style={{ fontSize: "12px", color: p.inkMuted, margin: 0 }}>
              Ask questions, share writing tips, and connect with researchers worldwide.
            </p>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "12px", color: p.inkFaint }}>
              <span><strong style={{ color: p.ink }}>{totalPosts.toLocaleString()}</strong> posts</span>
              <span><strong style={{ color: p.ink }}>{totalUpvotes}</strong> upvotes</span>
              <span><strong style={{ color: p.ink }}>{totalComments}</strong> comments</span>
            </div>
          </div>
          <button
            onClick={() => setShowNewPost(!showNewPost)}
            style={{
              padding: "10px 20px", borderRadius: "100px",
              background: p.cerise, color: "#fff", border: "none",
              fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}
          >
            + New post
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ borderBottom: `1px solid ${p.rule}`, background: p.surface }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "12px 32px" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts, topics, or questions..."
            style={{
              width: "100%", padding: "10px 16px",
              border: `1.5px solid ${p.border}`, borderRadius: "10px",
              fontSize: "13px", color: p.ink, outline: "none", background: "#fff",
            }}
          />
        </div>
      </div>

      {/* Sort tabs */}
      <div style={{ borderBottom: `1px solid ${p.rule}`, background: "#fff" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 32px", display: "flex", gap: "0", overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none" }}>
          {(["hot", "new", "top"] as SortMode[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              style={{
                padding: "12px 16px", border: "none",
                borderBottom: sort === s ? `2px solid ${p.cerise}` : "2px solid transparent",
                fontSize: "12px", fontWeight: sort === s ? 700 : 500, cursor: "pointer",
                background: "transparent",
                color: sort === s ? p.cerise : p.inkMuted,
                flexShrink: 0,
              }}
            >
              {s === "hot" ? "Hot" : s === "new" ? "New" : "Top"}
            </button>
          ))}
          <div style={{ width: "1px", background: p.rule, margin: "8px 4px", flexShrink: 0 }} />
          {SPACE_TOPICS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTopicFilter(topicFilter === t.key ? "" : t.key)}
              style={{
                padding: "12px 12px", border: "none",
                borderBottom: topicFilter === t.key ? `2px solid ${topicColor(t.key)}` : "2px solid transparent",
                fontSize: "11px", fontWeight: topicFilter === t.key ? 700 : 400, cursor: "pointer",
                background: "transparent",
                color: topicFilter === t.key ? topicColor(t.key) : p.inkFaint,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 32px 80px", display: "flex", gap: "24px", alignItems: "flex-start" }}>

        {/* ── Left: Post feed ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* New post form */}
          {showNewPost && (
            <form
              onSubmit={handleNewPost}
              style={{
                background: "#fff", border: `1.5px solid ${p.border}`,
                borderRadius: "14px", padding: "24px 28px", marginBottom: "16px",
              }}
            >
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 400, color: p.ink, margin: "0 0 16px" }}>
                Create a post
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <input
                  type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Post title"
                  style={{ width: "100%", padding: "12px 16px", border: `1.5px solid ${p.border}`, borderRadius: "10px", fontSize: "14px", color: p.ink, outline: "none", background: "#fff" }}
                  autoFocus required
                />
                <textarea
                  value={newBody} onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Write your post..."
                  rows={4}
                  style={{ width: "100%", padding: "12px 16px", border: `1.5px solid ${p.border}`, borderRadius: "10px", fontSize: "13px", color: p.ink, outline: "none", background: "#fff", resize: "vertical" }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "12px", color: p.inkMuted }}>Topic:</span>
                  <select value={newTopic} onChange={(e) => setNewTopic(e.target.value)}
                    style={{ padding: "6px 12px", border: `1.5px solid ${p.border}`, borderRadius: "8px", fontSize: "12px", color: p.ink, background: "#fff", outline: "none" }}>
                    {SPACE_TOPICS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
                <button type="button" onClick={() => setShowNewPost(false)}
                  style={{ padding: "8px 20px", fontSize: "13px", color: p.inkMuted, background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={!newTitle.trim() || posting}
                  style={{ padding: "10px 24px", borderRadius: "100px", background: p.ink, color: "#fff", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: !newTitle.trim() || posting ? 0.5 : 1 }}>
                  {posting ? "Posting..." : "Post"}
                </button>
              </div>
            </form>
          )}

          {/* Post list */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px" }}>
              <div className="animate-spin rounded-full h-8 w-8 border-2 mx-auto" style={{ borderColor: p.rule, borderTopColor: p.ink }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: "14px", border: `1.5px solid ${p.border}` }}>
              <img src={HEDGEHOG.hedgehog09Notepad} alt="" style={{ width: "80px", height: "auto", opacity: 0.5, marginBottom: "16px", display: "inline-block" }} />
              <p style={{ fontSize: "16px", color: p.inkMuted }}>{searchQuery ? "No posts match your search" : "No posts yet — be the first to share!"}</p>
              <p style={{ fontSize: "13px", color: p.inkFaint, marginTop: "8px" }}>{searchQuery ? "Try a different search" : "Click '+ New post' to start a conversation"}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {filtered.map((post) => {
                const voted = userUpvotes.has(post.id);
                return (
                  <div
                    key={post.id}
                    className="hover:bg-[#faf7f0] transition-colors"
                    style={{
                      background: "#fff", borderBottom: `1px solid ${p.rule}`,
                      padding: "16px 20px",
                      display: "flex", gap: "14px",
                    }}
                  >
                    {/* Upvote */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px", minWidth: "36px", paddingTop: "2px" }}>
                      <button onClick={() => handleUpvote(post.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: voted ? p.cerise : p.inkFaint, fontSize: "16px", lineHeight: 1, padding: "2px" }}
                        title={voted ? "Remove upvote" : "Upvote"}>▲</button>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: voted ? p.cerise : p.ink }}>{post.upvote_count}</span>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", fontSize: "11px", color: p.inkFaint }}>
                        <span style={{ padding: "1px 8px", borderRadius: "4px", background: `${topicColor(post.topic)}15`, color: topicColor(post.topic), fontWeight: 600 }}>
                          {topicLabel(post.topic)}
                        </span>
                        <span>{timeAgo(post.created_at)}</span>
                      </div>
                      <Link href={`/dashboard/space/${post.id}`} style={{ textDecoration: "none", color: p.ink }}>
                        <h3 style={{ fontSize: "15px", fontWeight: 600, color: p.ink, margin: "0 0 4px", lineHeight: 1.4 }}>{post.title}</h3>
                      </Link>
                      {post.body && (
                        <p style={{ fontSize: "12px", color: p.inkMuted, lineHeight: 1.5, margin: "0 0 8px", maxHeight: "40px", overflow: "hidden" }}>
                          {post.body.length > 180 ? post.body.slice(0, 180) + "..." : post.body}
                        </p>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px", color: p.inkFaint }}>
                        <span>{post.comment_count} comment{post.comment_count !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right: Sidebar ── */}
        <div style={{ width: "280px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Community stats card */}
          <div style={{ background: "#fff", border: `1.5px solid ${p.border}`, borderRadius: "14px", padding: "20px", overflow: "hidden" }}>
            <div style={{ background: p.cerise, margin: "-20px -20px 16px", padding: "16px 20px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#fff", margin: 0 }}>Community stats</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Posts", value: totalPosts },
                { label: "Total upvotes", value: totalUpvotes },
                { label: "Comments", value: totalComments },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: p.inkMuted }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: p.ink }}>{s.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Community rules card */}
          <div style={{ background: "#fff", border: `1.5px solid ${p.border}`, borderRadius: "14px", padding: "20px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: p.ink, margin: "0 0 12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: p.gold }}>★</span> Community rules
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px", color: p.inkMuted, lineHeight: 1.5 }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: p.cerise, fontWeight: 700, flexShrink: 0 }}>1.</span>
                <span>Be respectful and constructive in all discussions.</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: p.cerise, fontWeight: 700, flexShrink: 0 }}>2.</span>
                <span>Stay on topic — posts should relate to academic research.</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: p.cerise, fontWeight: 700, flexShrink: 0 }}>3.</span>
                <span>No plagiarism. Always cite your sources properly.</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: p.cerise, fontWeight: 700, flexShrink: 0 }}>4.</span>
                <span>Help others — we&apos;re all learning together.</span>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div style={{ background: "#fff", border: `1.5px solid ${p.border}`, borderRadius: "14px", padding: "16px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link href="/dashboard" className="hover:underline" style={{ fontSize: "12px", color: p.inkMuted, textDecoration: "none" }}>← Back to Projects</Link>
              <Link href="/research-guidance" className="hover:underline" style={{ fontSize: "12px", color: p.inkMuted, textDecoration: "none" }}>Research Guidance</Link>
              <Link href="/" className="hover:underline" style={{ fontSize: "12px", color: p.inkMuted, textDecoration: "none" }}>Home</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
