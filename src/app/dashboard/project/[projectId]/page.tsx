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

      const { data: proj } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (proj) setProject(proj as Project);

      // Get the first PDF in the project (if any)
      const { data: pdfs } = await supabase
        .from("pdfs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })
        .limit(1);

      if (pdfs && pdfs.length > 0) {
        const pdf = pdfs[0];
        setFirstPdfId(pdf.id);
        setFirstPdfName(pdf.display_name);

        const { data: signedUrlData } = await supabase.storage
          .from("pdfs")
          .createSignedUrl(pdf.storage_path, 3600);

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
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-[#DE3163]" />
      </div>
    );
  }

  return (
    <div className="-mx-8 -my-8">
      <div className="flex flex-col h-[calc(100vh-57px)]">
        {/* Project header bar */}
        <div className="flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-2">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-[#DE3163] transition-colors"
          >
            &larr; Projects
          </Link>
          {project && (
            <>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <h2 className="text-sm font-medium text-gray-800 truncate">
                {project.name}
              </h2>
            </>
          )}
          <div className="ml-auto flex items-center gap-4">
            <Link
              href={`/dashboard/project/${projectId}/meta-analysis`}
              className="text-xs text-[#DE3163] hover:underline font-medium"
            >
              Meta-Analysis
            </Link>
            <Link
              href={`/dashboard/project/${projectId}/literature-review`}
              className="text-xs text-[#DE3163] hover:underline font-medium"
            >
              Literature Review Table &rarr;
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
