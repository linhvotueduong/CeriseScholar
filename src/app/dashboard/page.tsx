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

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("#111111");
  const [creating, setCreating] = useState(false);
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
      // Navigate straight to the project workspace
      router.push(`/dashboard/project/${data.id}`);
      return;
    }

    setNewName("");
    setNewDesc("");
    setNewColor("#111111");
    setShowCreate(false);
    setCreating(false);
  }

  async function handleDelete(e: React.MouseEvent, projectId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this project and ALL its PDFs, highlights, and notes?")) return;

    const supabase = createClient();

    // Step 1: Collect storage paths before deletion (CASCADE will remove DB rows)
    const { data: pdfs } = await supabase
      .from("pdfs")
      .select("storage_path")
      .eq("project_id", projectId);

    const storagePaths = pdfs?.map((p) => p.storage_path).filter(Boolean) || [];

    // Step 2: Delete the project — CASCADE handles all related DB rows atomically
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) {
      alert("Failed to delete project. Please try again.");
      return;
    }

    // Step 3: Clean up storage files (best-effort — DB is already consistent)
    if (storagePaths.length > 0) {
      await supabase.storage.from("pdfs").remove(storagePaths);
    }

    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#1a1208]">My Projects</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-[#1a1208] text-white text-sm font-medium rounded-lg hover:bg-[#0d0a04] transition-colors"
        >
          + New Project
        </button>
      </div>

      {/* Create project form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-[#e0d8d0] p-6 mb-6"
        >
          <h3 className="font-semibold text-[#1a1208] mb-4">Create New Project</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name (e.g., 'Geopolitical Influence & Peace')"
              className="w-full px-3 py-2 border border-[#d4cdc5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1208] text-sm"
              autoFocus
              required
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-3 py-2 border border-[#d4cdc5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1208] text-sm resize-none"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#7a6a5a]">Color:</span>
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    newColor === c ? "border-gray-800 scale-110" : "border-[#e0d8d0]"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-[#7a6a5a]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || creating}
              className="px-4 py-2 text-sm bg-[#1a1208] text-white rounded-lg hover:bg-[#0d0a04] disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      )}

      {/* Projects grid */}
      {projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-[#e0d8d0]">
          <p className="text-[#7a6a5a] text-lg">No projects yet</p>
          <p className="text-[#9a8a7a] mt-1">
            Create your first research project to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/project/${project.id}`}
              className="group block bg-white rounded-xl border border-[#e0d8d0] p-5 hover:shadow-md transition-all relative"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-4 h-4 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: project.color }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#1a1208] truncate">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-[#7a6a5a] mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <p className="text-xs text-[#9a8a7a] mt-2">
                    {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => handleDelete(e, project.id)}
                className="absolute top-3 right-3 text-[#d4cdc5] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete project"
              >
                &times;
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
