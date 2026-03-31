"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import type { Pdf } from "@/types/pdf";

interface DocumentPanelProps {
  currentPdfId: string;
}

export default function DocumentPanel({ currentPdfId }: DocumentPanelProps) {
  const [pdfs, setPdfs] = useState<Pdf[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    async function fetchPdfs() {
      const supabase = createClient();
      const { data } = await supabase
        .from("pdfs")
        .select("*")
        .order("created_at", { ascending: false });
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

    if (uploadError) {
      setUploading(false);
      return;
    }

    const { data: newPdf } = await supabase
      .from("pdfs")
      .insert({
        id: fileId,
        user_id: user.id,
        filename: file.name,
        display_name: file.name.replace(/\.pdf$/i, ""),
        storage_path: storagePath,
        file_size: file.size,
        ocr_status: "pending",
      })
      .select()
      .single();

    if (newPdf) {
      setPdfs((prev) => [newPdf as Pdf, ...prev]);
    }
    setUploading(false);
  }

  const handleDelete = useCallback(
    async (e: React.MouseEvent, pdfId: string) => {
      e.stopPropagation();
      if (!confirm("Delete this PDF and all its highlights?")) return;

      const supabase = createClient();
      const pdf = pdfs.find((p) => p.id === pdfId);

      // Delete related data
      await supabase.from("literature_review_entries").delete().eq("pdf_id", pdfId);
      await supabase.from("annotations").delete().eq("pdf_id", pdfId);
      await supabase.from("highlights").delete().eq("pdf_id", pdfId);
      await supabase.from("pdfs").delete().eq("id", pdfId);

      // Delete file from storage
      if (pdf?.storage_path) {
        await supabase.storage.from("pdfs").remove([pdf.storage_path]);
      }

      setPdfs((prev) => prev.filter((p) => p.id !== pdfId));

      // If we deleted the current PDF, navigate to dashboard
      if (pdfId === currentPdfId) {
        router.push("/dashboard");
      }
    },
    [pdfs, currentPdfId, router]
  );

  // Drag and drop to reorder
  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(index: number) {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newPdfs = [...pdfs];
    const [dragged] = newPdfs.splice(draggedIndex, 1);
    newPdfs.splice(index, 0, dragged);
    setPdfs(newPdfs);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  if (collapsed) {
    return (
      <div className="w-10 border-r border-gray-200 bg-white flex flex-col items-center pt-3">
        <button
          onClick={() => setCollapsed(false)}
          className="text-gray-400 hover:text-[#DE3163] text-lg"
          title="Show documents"
        >
          &rsaquo;
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Documents
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-[#DE3163] hover:underline font-medium"
            title="Upload PDF"
          >
            +
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="text-gray-400 hover:text-gray-600 text-sm ml-1"
            title="Collapse"
          >
            &lsaquo;
          </button>
        </div>
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
        <div className="px-3 py-2 text-xs text-blue-600 bg-blue-50 border-b border-gray-100">
          Uploading...
        </div>
      )}

      {/* PDF list — draggable */}
      <div className="flex-1 overflow-y-auto">
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
              className={`group relative transition-all ${
                isDragging ? "opacity-40" : ""
              } ${isDragOver ? "border-t-2 border-t-[#DE3163]" : ""}`}
            >
              <button
                onClick={() => router.push(`/dashboard/viewer/${pdf.id}`)}
                className={`w-full text-left px-3 py-2.5 border-b border-gray-50 transition-colors ${
                  isActive
                    ? "bg-pink-50 border-l-2 border-l-[#DE3163]"
                    : "hover:bg-gray-50 border-l-2 border-l-transparent"
                }`}
              >
                {/* Drag handle */}
                <span className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab select-none">
                  ⠿
                </span>

                <p
                  className={`text-sm truncate pr-4 ${
                    isActive ? "font-medium text-[#DE3163]" : "text-gray-700"
                  }`}
                >
                  {pdf.display_name}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {pdf.file_size
                    ? `${(pdf.file_size / 1024 / 1024).toFixed(1)} MB`
                    : ""}
                  {" · "}
                  {new Date(pdf.created_at).toLocaleDateString()}
                </p>
              </button>

              {/* Delete button — appears on hover */}
              <button
                onClick={(e) => handleDelete(e, pdf.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                title="Delete PDF"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>

      {/* Count */}
      <div className="px-3 py-2 border-t border-gray-200 text-[10px] text-gray-400">
        {pdfs.length} document{pdfs.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
