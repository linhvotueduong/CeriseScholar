"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";
import type { Pdf } from "@/types/pdf";
import type { Project } from "@/types/project";
import Spinner from "@/components/ui/Spinner";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [pdfs, setPdfs] = useState<Pdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useUser();

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    const { data: proj } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (proj) setProject(proj as Project);

    const { data: pdfList } = await supabase
      .from("pdfs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (pdfList) setPdfs(pdfList as Pdf[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleUpload(file: File) {
    if (!user || file.type !== "application/pdf") return;
    setUploading(true);

    const supabase = createClient();
    const fileId = crypto.randomUUID();
    const storagePath = `${user.id}/${fileId}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(storagePath, file);

    if (uploadError) { setUploading(false); return; }

    const { data: newPdf } = await supabase
      .from("pdfs")
      .insert({
        id: fileId,
        user_id: user.id,
        project_id: projectId,
        filename: file.name,
        display_name: file.name.replace(/\.pdf$/i, ""),
        storage_path: storagePath,
        file_size: file.size,
        ocr_status: "pending",
      })
      .select()
      .single();

    if (newPdf) setPdfs((prev) => [newPdf as Pdf, ...prev]);
    setUploading(false);
  }

  async function handleDeletePdf(pdfId: string) {
    if (!confirm("Delete this PDF and all its highlights?")) return;

    const supabase = createClient();
    const pdf = pdfs.find((p) => p.id === pdfId);

    await supabase.from("literature_review_entries").delete().eq("pdf_id", pdfId);
    await supabase.from("annotations").delete().eq("pdf_id", pdfId);
    await supabase.from("highlights").delete().eq("pdf_id", pdfId);
    await supabase.from("pdfs").delete().eq("id", pdfId);

    if (pdf?.storage_path) {
      await supabase.storage.from("pdfs").remove([pdf.storage_path]);
    }

    setPdfs((prev) => prev.filter((p) => p.id !== pdfId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Project not found</p>
        <Link href="/dashboard" className="text-[#DE3163] hover:underline mt-2 inline-block">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-[#DE3163]">
          &larr; All Projects
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/project/${projectId}/literature-review`}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Literature Review
            </Link>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-[#DE3163] text-white text-sm font-medium rounded-lg hover:bg-[#c4294f] transition-colors"
            >
              + Upload PDF
            </button>
          </div>
        </div>
        {project.description && (
          <p className="text-sm text-gray-500 mt-2">{project.description}</p>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />

      {uploading && (
        <div className="bg-blue-50 text-blue-600 text-sm px-4 py-2 rounded-lg mb-4">
          Uploading...
        </div>
      )}

      {/* PDFs grid */}
      {pdfs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 text-lg">No PDFs in this project yet</p>
          <p className="text-gray-400 mt-1">Upload your first PDF to get started</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-6 py-2 bg-[#DE3163] text-white text-sm font-medium rounded-lg hover:bg-[#c4294f] transition-colors"
          >
            Upload PDF
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pdfs.map((pdf) => (
            <div key={pdf.id} className="group relative">
              <Link
                href={`/dashboard/project/${projectId}/viewer/${pdf.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-[#DE3163] hover:shadow-sm transition-all"
              >
                <h3 className="font-semibold text-gray-900 truncate">
                  {pdf.display_name}
                </h3>
                <p className="text-sm text-gray-500 mt-1 truncate">{pdf.filename}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">
                    {pdf.file_size ? `${(pdf.file_size / 1024 / 1024).toFixed(1)} MB` : ""}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(pdf.created_at).toLocaleDateString()}
                </p>
              </Link>
              <button
                onClick={() => handleDeletePdf(pdf.id)}
                className="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete PDF"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
