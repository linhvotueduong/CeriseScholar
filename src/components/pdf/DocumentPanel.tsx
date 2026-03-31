"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import type { Pdf } from "@/types/pdf";

interface DocumentPanelProps {
  currentPdfId: string;
  projectId?: string;
}

export default function DocumentPanel({ currentPdfId, projectId }: DocumentPanelProps) {
  const [pdfs, setPdfs] = useState<Pdf[]>([]);
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    async function fetchPdfs() {
      const supabase = createClient();
      let query = supabase.from("pdfs").select("*");
      if (projectId) query = query.eq("project_id", projectId);
      const { data } = await query.order("created_at", { ascending: false });
      if (data) setPdfs(data as Pdf[]);
    }
    fetchPdfs();
  }, []);

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
        project_id: projectId || null,
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

  const handleDelete = useCallback(
    async (e: React.MouseEvent, pdfId: string) => {
      e.stopPropagation();
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

      if (pdfId === currentPdfId) router.push("/dashboard");
    },
    [pdfs, currentPdfId, router]
  );

  function handleDragStart(index: number) { setDraggedIndex(index); }
  function handleDragOver(e: React.DragEvent, index: number) { e.preventDefault(); setDragOverIndex(index); }
  function handleDrop(index: number) {
    if (draggedIndex === null || draggedIndex === index) { setDraggedIndex(null); setDragOverIndex(null); return; }
    const newPdfs = [...pdfs];
    const [dragged] = newPdfs.splice(draggedIndex, 1);
    newPdfs.splice(index, 0, dragged);
    setPdfs(newPdfs);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }
  function handleDragEnd() { setDraggedIndex(null); setDragOverIndex(null); }

  return (
    <div className="flex flex-col">
      {/* Upload button */}
      <div className="px-2 py-1.5 border-b border-gray-100">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full text-xs text-[#DE3163] hover:bg-pink-50 py-1 rounded transition-colors"
        >
          + Upload PDF
        </button>
      </div>

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
        <div className="px-3 py-1.5 text-xs text-blue-600 bg-blue-50">Uploading...</div>
      )}

      {/* PDF list */}
      <div className="overflow-y-auto">
        {pdfs.map((pdf, index) => {
          const isActive = pdf.id === currentPdfId;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index && draggedIndex !== index;

          return (
            <div
              key={pdf.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`group relative ${isDragging ? "opacity-40" : ""} ${isDragOver ? "border-t-2 border-t-[#DE3163]" : ""}`}
            >
              <button
                onClick={() => router.push(projectId ? `/dashboard/project/${projectId}/viewer/${pdf.id}` : `/dashboard/viewer/${pdf.id}`)}
                className={`w-full text-left px-3 py-2 border-b border-gray-50 transition-colors ${
                  isActive ? "bg-pink-50 border-l-2 border-l-[#DE3163]" : "hover:bg-gray-50 border-l-2 border-l-transparent"
                }`}
              >
                <p className={`text-xs truncate pr-4 ${isActive ? "font-medium text-[#DE3163]" : "text-gray-700"}`}>
                  {pdf.display_name}
                </p>
                <p className="text-[9px] text-gray-400 mt-0.5">
                  {pdf.file_size ? `${(pdf.file_size / 1024 / 1024).toFixed(1)} MB` : ""} · {new Date(pdf.created_at).toLocaleDateString()}
                </p>
              </button>

              <button
                onClick={(e) => handleDelete(e, pdf.id)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs"
                title="Delete"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-1.5 text-[9px] text-gray-400 border-t border-gray-100">
        {pdfs.length} document{pdfs.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
