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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: project.color }} />
              <span style={{ fontWeight: 600, color: "#1a1208", fontSize: "12px" }}>{project.name}</span>
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
