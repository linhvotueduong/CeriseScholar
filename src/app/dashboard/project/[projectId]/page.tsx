"use client";

import { useParams } from "next/navigation";
import PdfViewer from "@/components/pdf/PdfViewer";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types/project";

export default function ProjectWorkspacePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [firstPdfUrl, setFirstPdfUrl] = useState<string | null>(null);
  const [firstPdfId, setFirstPdfId] = useState<string | null>(null);
  const [firstPdfName, setFirstPdfName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [savingIdentity, setSavingIdentity] = useState(false);

  function openIdentityEditor() {
    if (!project) return;
    setNameDraft(project.name ?? "");
    setDescDraft(project.description ?? "");
    setEditOpen(true);
  }

  async function saveIdentity() {
    if (!project || !nameDraft.trim()) return;
    setSavingIdentity(true);
    const supabase = createClient();
    const updates = { name: nameDraft.trim(), description: descDraft.trim() };
    const { error } = await supabase.from("projects").update(updates).eq("id", project.id);
    if (!error) {
      setProject({ ...project, ...updates });
      setEditOpen(false);
    }
    setSavingIdentity(false);
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Fetch project and first PDF in parallel (independent queries)
      const [projectResult, pdfsResult] = await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).single(),
        supabase.from("pdfs").select("*").eq("project_id", projectId).order("created_at", { ascending: true }).limit(1),
      ]);

      if (projectResult.data) setProject(projectResult.data as Project);

      // Signed URL depends on the PDF result, so it runs after
      if (pdfsResult.data && pdfsResult.data.length > 0) {
        const pdf = pdfsResult.data[0];
        setFirstPdfId(pdf.id);
        setFirstPdfName(pdf.display_name);

        // 8-hour expiry to cover long research sessions
        const { data: signedUrlData } = await supabase.storage
          .from("pdfs")
          .createSignedUrl(pdf.storage_path, 28800);

        if (signedUrlData?.signedUrl) {
          setFirstPdfUrl(signedUrlData.signedUrl);
        }
      }

      setLoading(false);
    }
    load();
  }, [projectId]);

  if (loading) {
    return (
      <div className="-mx-8 -my-8 flex items-center justify-center h-[calc(100vh-57px)]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#e0d8d0] border-t-[#1a1208]" />
      </div>
    );
  }

  return (
    <div className="-mx-8 -my-8">
      <div className="flex flex-col h-[calc(100vh-57px)]">
        {/* Project sub-nav bar */}
        <div style={{ height: "40px", flexShrink: 0, display: "flex", alignItems: "center", padding: "0 24px", gap: "24px", borderBottom: "1px solid #e0d8d0", background: "#fff", fontFamily: "var(--font-noto), 'Noto Sans', sans-serif", fontSize: "11px" }}>
          <Link href="/dashboard" style={{ color: "#7a6a5a", textDecoration: "none", fontSize: "11px" }}>← Projects</Link>
          {project && (
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: project.color }} />
              <button
                aria-label="Edit project name and topic description"
                className="hover:underline"
                onClick={openIdentityEditor}
                style={{ fontWeight: 600, color: "#1a1208", fontSize: "12px", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "5px" }}
                title="Edit project name & topic"
                type="button"
              >
                {project.name}
                <span aria-hidden style={{ color: "#8f6132", fontSize: "10px" }}>✎</span>
              </button>
              {editOpen && (
                <div
                  className="absolute left-0 top-[30px] z-50 w-80 rounded-xl border border-[#e8d8c6] bg-[#fbf6ef] p-4 shadow-lg"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditOpen(false);
                  }}
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8f6132]">Project identity</p>
                  <label className="mt-2 block text-[11px] font-semibold text-[#4a4238]" htmlFor="project-name-input">
                    Project name
                  </label>
                  <input
                    autoFocus
                    className="mt-1 w-full rounded-md border border-[#e0cdb8] bg-white px-2 py-1.5 text-[12px] text-[#17120d] focus:outline-none focus:ring-2 focus:ring-[#b6844e]"
                    id="project-name-input"
                    onChange={(e) => setNameDraft(e.target.value)}
                    value={nameDraft}
                  />
                  <label className="mt-3 block text-[11px] font-semibold text-[#4a4238]" htmlFor="project-topic-input">
                    Topic description
                  </label>
                  <textarea
                    className="mt-1 w-full rounded-md border border-[#e0cdb8] bg-white px-2 py-1.5 text-[12px] leading-relaxed text-[#17120d] focus:outline-none focus:ring-2 focus:ring-[#b6844e]"
                    id="project-topic-input"
                    onChange={(e) => setDescDraft(e.target.value)}
                    placeholder="What is this research about? A sentence or two gives your work direction."
                    rows={3}
                    value={descDraft}
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      className="rounded-md border border-[#e0cdb8] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#4a4238] hover:bg-[#f6efe4]"
                      onClick={() => setEditOpen(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="rounded-md bg-[#111111] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={savingIdentity || !nameDraft.trim()}
                      onClick={saveIdentity}
                      type="button"
                    >
                      {savingIdentity ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div style={{ flex: 1 }} />
          {[
            { n: "Workspace", h: `/dashboard/project/${projectId}`, active: true },
            { n: "ScholarAsk", h: `/dashboard/project/${projectId}/scholar-ask` },
            { n: "Meta Analysis", h: `/dashboard/project/${projectId}/meta-analysis` },
            { n: "Lit Review", h: `/dashboard/project/${projectId}/literature-review` },
            { n: "Paper Writer", h: `/dashboard/project/${projectId}/paper-writer` },
          ].map((tab) => (
            <Link
              key={tab.n}
              href={tab.h}
              style={{
                color: tab.active ? "#c0392b" : "#7a6a5a",
                fontWeight: tab.active ? 700 : 400,
                borderBottom: tab.active ? "2px solid #c0392b" : "2px solid transparent",
                paddingBottom: "8px",
                marginBottom: "-1px",
                fontSize: "11px",
                textDecoration: "none",
              }}
            >
              {tab.n}
            </Link>
          ))}
        </div>

        {/* Workspace */}
        <div className="flex-1 overflow-hidden">
          <PdfViewer
            url={firstPdfUrl || ""}
            pdfId={firstPdfId || ""}
            pdfDisplayName={firstPdfName || ""}
            projectId={projectId}
          />
        </div>
      </div>
    </div>
  );
}
