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
        {/* Project header bar */}
        <div className="flex items-center gap-3 bg-white border-b border-[#e0d8d0] px-4 py-2">
          <Link
            href="/dashboard"
            className="text-sm text-[#7a6a5a] hover:text-[#1a1208] transition-colors"
          >
            &larr; Projects
          </Link>
          {project && (
            <>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <h2 className="text-sm font-medium text-[#1a1208] truncate">
                {project.name}
              </h2>
            </>
          )}
          <div className="ml-auto flex items-center gap-4">
            <Link
              href={`/dashboard/project/${projectId}/scholar-ask`}
              className="text-xs text-[#1a1208] hover:underline font-medium"
            >
              ScholarAsk
            </Link>
            <Link
              href={`/dashboard/project/${projectId}/meta-analysis`}
              className="text-xs text-[#1a1208] hover:underline font-medium"
            >
              Meta-Analysis
            </Link>
            <Link
              href={`/dashboard/project/${projectId}/literature-review`}
              className="text-xs text-[#1a1208] hover:underline font-medium"
            >
              Lit Review
            </Link>
            <Link
              href={`/dashboard/project/${projectId}/paper-writer`}
              className="text-xs text-[#1a1208] hover:underline font-medium"
            >
              Paper Writer &rarr;
            </Link>
          </div>
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
