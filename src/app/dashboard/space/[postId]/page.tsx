/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";
import GoldStars from "@/components/doodles/GoldStars";
import HEDGEHOG from "@/lib/hedgehog";
import type { SpacePost, SpaceComment } from "@/types/space";
import { SPACE_TOPICS } from "@/types/space";

const p = {
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  inkFaint: "#9a8a7a",
  cerise: "#c0392b",
  gold: "#c8a84b",
  rule: "#e0d8d0",
  border: "#d4cdc5",
  warm: "#faf7f0",
};

const stars = [
  { top: "8%", left: "3%", size: 7, op: 0.3, rot: -8 },
  { top: "25%", right: "4%", size: 9, op: 0.35, rot: 12 },
  { top: "60%", left: "5%", size: 8, op: 0.3, rot: -10 },
  { top: "85%", right: "3%", size: 6, op: 0.35, rot: 15 },
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
    general: "#7a6a5a", research_questions: "#c0392b", writing_tips: "#c8a84b",
    feedback: "#34d399", study_groups: "#60a5fa", methodology: "#a78bfa", tools: "#f59e0b",
  };
  return colors[topic] || p.inkMuted;
}

function topicLabel(topic: string): string {
  return SPACE_TOPICS.find((t) => t.key === topic)?.label || topic;
}

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.postId as string;
  const { user } = useUser();

  const [post, setPost] = useState<SpacePost | null>(null);
  const [comments, setComments] = useState<SpaceComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  // New comment
  const [commentBody, setCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchPost = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("space_posts").select("*").eq("id", postId).single();
    if (data) setPost(data as SpacePost);
  }, [postId]);

  const fetchComments = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("space_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (data) setComments(data as SpaceComment[]);
  }, [postId]);

  const checkUpvote = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("space_upvotes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    setHasUpvoted(!!data);
  }, [postId, user]);

  useEffect(() => {
    Promise.all([fetchPost(), fetchComments(), checkUpvote()]).then(() => setLoading(false));
  }, [fetchPost, fetchComments, checkUpvote]);

  async function handleUpvote() {
    if (!user || !post) return;
    const supabase = createClient();
    if (hasUpvoted) {
      await supabase.from("space_upvotes").delete().eq("post_id", postId).eq("user_id", user.id);
      setHasUpvoted(false);
      setPost((prev) => prev ? { ...prev, upvote_count: Math.max(0, prev.upvote_count - 1) } : prev);
    } else {
      await supabase.from("space_upvotes").insert({ post_id: postId, user_id: user.id });
      setHasUpvoted(true);
      setPost((prev) => prev ? { ...prev, upvote_count: prev.upvote_count + 1 } : prev);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim() || !user) return;
    setSubmitting(true);
    const supabase = createClient();
    await supabase.from("space_comments").insert({
      post_id: postId,
      user_id: user.id,
      body: commentBody.trim(),
    });
    setCommentBody("");
    setSubmitting(false);
    fetchComments();
    // Update comment count locally
    setPost((prev) => prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev);
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    const supabase = createClient();
    await supabase.from("space_comments").delete().eq("id", commentId);
    fetchComments();
    setPost((prev) => prev ? { ...prev, comment_count: Math.max(0, prev.comment_count - 1) } : prev);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: p.rule, borderTopColor: p.ink }} />
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
        <p style={{ fontSize: "16px", color: p.inkMuted }}>Post not found</p>
        <Link href="/dashboard/space" style={{ fontSize: "13px", color: p.cerise, textDecoration: "none", marginTop: "12px", display: "inline-block" }}>
          ← Back to Cerise Space
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 32px 80px", position: "relative" }}>
      <GoldStars stars={stars} />

      {/* Back link */}
      <Link
        href="/dashboard/space"
        style={{ fontSize: "12px", color: p.inkMuted, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "24px" }}
        className="hover:underline"
      >
        ← Back to Cerise Space
      </Link>

      {/* Post card */}
      <div style={{ background: "#fff", border: `1.5px solid ${p.border}`, borderRadius: "16px", padding: "28px 32px", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "16px" }}>
          {/* Upvote column */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", minWidth: "44px" }}>
            <button
              onClick={handleUpvote}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: hasUpvoted ? p.cerise : p.inkFaint,
                fontSize: "20px", lineHeight: 1, padding: "4px",
              }}
              title={hasUpvoted ? "Remove upvote" : "Upvote"}
            >
              ▲
            </button>
            <span style={{ fontSize: "16px", fontWeight: 700, color: hasUpvoted ? p.cerise : p.ink }}>
              {post.upvote_count}
            </span>
          </div>

          {/* Post content */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span
                style={{
                  padding: "3px 12px", borderRadius: "100px",
                  background: `${topicColor(post.topic)}15`,
                  border: `1px solid ${topicColor(post.topic)}40`,
                  color: topicColor(post.topic),
                  fontSize: "11px", fontWeight: 600,
                }}
              >
                {topicLabel(post.topic)}
              </span>
              <span style={{ fontSize: "11px", color: p.inkFaint }}>{timeAgo(post.created_at)}</span>
            </div>

            <h1 style={{ fontFamily: "var(--font-display), 'DM Serif Display', serif", fontSize: "24px", fontWeight: 400, color: p.ink, margin: "0 0 12px", lineHeight: 1.3 }}>
              {post.title}
            </h1>

            {post.body && (
              <div style={{ fontSize: "14px", color: p.ink, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {post.body}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments section */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: p.ink, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: p.gold }}>★</span>
          {post.comment_count} Comment{post.comment_count !== 1 ? "s" : ""}
        </h2>

        {/* Add comment form */}
        {user ? (
          <form onSubmit={handleComment} style={{ marginBottom: "24px" }}>
            <textarea
              ref={commentInputRef}
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              style={{
                width: "100%", padding: "14px 16px",
                border: `1.5px solid ${p.border}`, borderRadius: "12px",
                fontSize: "13px", color: p.ink, outline: "none",
                background: "#fff", resize: "vertical",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="submit"
                disabled={!commentBody.trim() || submitting}
                style={{
                  padding: "8px 20px", borderRadius: "100px",
                  background: p.ink, color: "#fff", border: "none",
                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  opacity: !commentBody.trim() || submitting ? 0.5 : 1,
                }}
              >
                {submitting ? "Posting..." : "Comment"}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ padding: "16px", background: p.warm, borderRadius: "12px", fontSize: "13px", color: p.inkMuted, marginBottom: "24px" }}>
            <Link href="/login" style={{ color: p.cerise, textDecoration: "none", fontWeight: 600 }}>Log in</Link> to join the conversation.
          </div>
        )}

        {/* Comment list */}
        {comments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px", color: p.inkFaint, fontSize: "13px" }}>
            No comments yet — be the first to respond.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="group"
                style={{
                  background: "#fff", border: `1px solid ${p.rule}`,
                  borderRadius: "12px", padding: "14px 18px",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: p.warm, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={HEDGEHOG.hedgehog03Standing} alt="" style={{ width: "16px", height: "16px", objectFit: "contain" }} />
                  </div>
                  <span style={{ fontSize: "11px", color: p.inkFaint }}>{timeAgo(comment.created_at)}</span>
                </div>
                <p style={{ fontSize: "13px", color: p.ink, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
                  {comment.body}
                </p>

                {/* Delete button — only for own comments */}
                {user && comment.user_id === user.id && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      position: "absolute", top: "10px", right: "12px",
                      background: "none", border: "none", fontSize: "14px",
                      color: p.border, cursor: "pointer",
                    }}
                    title="Delete comment"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
