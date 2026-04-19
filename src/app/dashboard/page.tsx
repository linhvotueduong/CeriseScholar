"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";
import type { Project } from "@/types/project";
import Spinner from "@/components/ui/Spinner";

const PROJECT_COLORS = [
  "#1a1208", "#c0392b", "#d4a843", "#7a8a6a",
  "#8b9dc3", "#c8a84b", "#5a4a3a", "#e89a6f",
];

const p = {
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  inkFaint: "#9a8a7a",
  cerise: "#c0392b",
  rule: "#e0d8d0",
  border: "#d4cdc5",
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("#c0392b");
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { user } = useUser();

  const fetchProjects = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setProjects(data as Project[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !user) return;
    setCreating(true);

    const supabase = createClient();
    const { data } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: newName.trim(),
        description: newDesc.trim(),
        color: newColor,
      })
      .select()
      .single();

    if (data) {
      router.push(`/dashboard/project/${data.id}`);
      return;
    }

    setNewName("");
    setNewDesc("");
    setNewColor("#c0392b");
    setShowCreate(false);
    setCreating(false);
  }

  async function handleDelete(e: React.MouseEvent, projectId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this project and ALL its PDFs, highlights, and notes?")) return;

    const supabase = createClient();

    const { data: pdfs } = await supabase
      .from("pdfs")
      .select("storage_path")
      .eq("project_id", projectId);

    const storagePaths = pdfs?.map((pp) => pp.storage_path).filter(Boolean) || [];

    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) {
      alert("Failed to delete project. Please try again.");
      return;
    }

    if (storagePaths.length > 0) {
      await supabase.storage.from("pdfs").remove(storagePaths);
    }

    setProjects((prev) => prev.filter((proj) => proj.id !== projectId));
  }

  const filtered = projects.filter((proj) =>
    proj.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 32px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display), 'DM Serif Display', serif", fontSize: "36px", fontWeight: 400, color: p.ink, margin: "0 0 8px" }}>
            Your Projects
          </h1>
          <p style={{ fontSize: "14px", color: p.inkMuted, margin: 0 }}>
            {projects.length} research project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: "12px 24px", borderRadius: "50px",
            background: p.cerise, color: "#fff", border: "none",
            fontFamily: "var(--font-body), 'DM Sans', sans-serif", fontSize: "13px", fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + New Project
        </button>
      </div>

      {/* Create project form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          style={{
            background: "#fff", border: `1.5px solid ${p.border}`,
            borderRadius: "16px", padding: "28px 32px", marginBottom: "24px",
          }}
        >
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 400, color: p.ink, margin: "0 0 16px" }}>
            Create New Project
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name (e.g., 'Geopolitical Influence & Peace')"
              style={{
                width: "100%", padding: "12px 16px", border: `1.5px solid ${p.border}`,
                borderRadius: "10px", fontSize: "13px", fontFamily: "var(--font-body)",
                color: p.ink, outline: "none", background: "#fff",
              }}
              autoFocus
              required
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              style={{
                width: "100%", padding: "12px 16px", border: `1.5px solid ${p.border}`,
                borderRadius: "10px", fontSize: "13px", fontFamily: "var(--font-body)",
                color: p.ink, outline: "none", background: "#fff", resize: "none",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: p.inkMuted }}>Color:</span>
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  style={{
                    width: "24px", height: "24px", borderRadius: "50%",
                    backgroundColor: c, border: newColor === c ? "2px solid #1a1208" : `2px solid ${p.rule}`,
                    cursor: "pointer", transform: newColor === c ? "scale(1.15)" : "scale(1)",
                    transition: "all 0.15s",
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              style={{ padding: "8px 20px", fontSize: "13px", color: p.inkMuted, background: "none", border: "none", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || creating}
              style={{
                padding: "10px 24px", borderRadius: "50px",
                background: p.ink, color: "#fff", border: "none",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
                opacity: !newName.trim() || creating ? 0.5 : 1,
              }}
            >
              {creating ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      )}

      {/* Search + filter */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
        <div style={{ flex: 1 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            style={{
              width: "100%", padding: "12px 16px", border: `1.5px solid ${p.border}`,
              borderRadius: "10px", fontSize: "13px", fontFamily: "var(--font-body)",
              color: p.ink, outline: "none", background: "#fff",
            }}
          />
        </div>
        <select style={{
          padding: "10px 16px", border: `1.5px solid ${p.border}`,
          borderRadius: "10px", fontSize: "12px", fontFamily: "var(--font-body)",
          color: p.ink, background: "#fff", outline: "none",
        }}>
          <option>All Projects</option>
          <option>Recent</option>
          <option>Most Papers</option>
        </select>
      </div>

      {/* Project cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: "16px", border: `1.5px solid ${p.border}` }}>
          <p style={{ fontSize: "16px", color: p.inkMuted }}>
            {searchQuery ? `No projects match "${searchQuery}"` : "No projects yet"}
          </p>
          <p style={{ fontSize: "13px", color: p.inkFaint, marginTop: "8px" }}>
            {searchQuery ? "Try a different search" : "Create your first research project to get started"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/project/${project.id}`}
              className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group"
              style={{
                background: "#fff", border: `1.5px solid ${p.border}`,
                borderRadius: "16px", padding: "28px 32px",
                textDecoration: "none", color: p.ink,
                position: "relative", overflow: "hidden", display: "block",
              }}
            >
              {/* Color accent bar */}
              <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: project.color, borderRadius: "4px 0 0 4px" }} />

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "24px" }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 400, color: p.ink, margin: "0 0 8px", lineHeight: 1.3 }}>
                    {project.name}
                  </h2>
                  {project.description && (
                    <p style={{ fontSize: "13px", color: p.inkMuted, lineHeight: 1.6, margin: "0 0 16px", maxWidth: "600px" }}>
                      {project.description}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: "20px", fontSize: "12px", color: p.inkFaint }}>
                    <span>Edited {new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Right: open button */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px", flexShrink: 0 }}>
                  <div
                    style={{
                      width: "12px", height: "12px", borderRadius: "50%",
                      background: project.color, flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      padding: "6px 16px", borderRadius: "100px",
                      border: `1.5px solid ${p.border}`, background: "transparent",
                      fontSize: "11px", fontWeight: 600, color: p.ink,
                    }}
                  >
                    Open →
                  </span>
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => handleDelete(e, project.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  position: "absolute", top: "12px", right: "12px",
                  background: "none", border: "none", fontSize: "18px",
                  color: p.border, cursor: "pointer",
                }}
                title="Delete project"
              >
                &times;
              </button>
            </Link>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div style={{ marginTop: "48px", display: "flex", gap: "16px", justifyContent: "center" }}>
        <Link href="/research-guidance" className="hover:underline" style={{ fontSize: "13px", color: p.inkMuted, textDecoration: "none" }}>Research Guidance</Link>
        <span style={{ color: p.rule }}>·</span>
        <Link href="/about" className="hover:underline" style={{ fontSize: "13px", color: p.inkMuted, textDecoration: "none" }}>About Cerise Scholar</Link>
      </div>
    </div>
  );
}
