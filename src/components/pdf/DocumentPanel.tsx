"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logDashboardActivity } from "@/lib/dashboard/activity";
import { toggleSourceFinished } from "@/lib/dashboard/finishSource";
import { useUser } from "@/hooks/useUser";
import { runOcr } from "@/lib/ocr/runOcr";
import { extractPdfMetadata } from "@/lib/pdf/extractMetadata";
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
      let query = supabase
        .from("pdfs")
        .select("id, display_name, filename, file_size, created_at, ocr_status, storage_path, finished_at");
      if (projectId) query = query.eq("project_id", projectId);
      const { data } = await query.order("created_at", { ascending: false }).limit(100);
      if (data) setPdfs(data as Pdf[]);
    }
    fetchPdfs();
  }, [projectId]);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

  async function handleUpload(file: File) {
    if (!user || file.type !== "application/pdf") return;
    if (file.size > MAX_FILE_SIZE) {
      alert("File is too large. Maximum size is 50 MB.");
      return;
    }
    setUploading(true);

    const supabase = createClient();
    const fileId = crypto.randomUUID();
    const storagePath = `${user.id}/${fileId}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(storagePath, file);

    if (uploadError) { setUploading(false); return; }

    // Extract PDF metadata (title, author, page count) — mirrors
    // src/app/dashboard/upload/page.tsx so highlights on PDFs uploaded from
    // the Workspace drag-drop path also get real APA-stub metadata instead
    // of empty pdf_author/pdf_title columns. Failure-tolerant, same as upload page.
    let pdfMeta = { title: "", author: "", subject: "", pageCount: 0 };
    try {
      pdfMeta = await extractPdfMetadata(file);
    } catch {
      // Metadata extraction failed — not critical, continue
    }

    const { data: newPdf } = await supabase
      .from("pdfs")
      .insert({
        id: fileId,
        user_id: user.id,
        project_id: projectId || null,
        filename: file.name,
        display_name: pdfMeta.title || file.name.replace(/\.pdf$/i, ""),
        storage_path: storagePath,
        file_size: file.size,
        page_count: pdfMeta.pageCount || null,
        pdf_author: pdfMeta.author,
        pdf_title: pdfMeta.title,
        pdf_subject: pdfMeta.subject,
        ocr_status: "pending",
      })
      .select()
      .single();

    if (newPdf) {
      setPdfs((prev) => [newPdf as Pdf, ...prev]);
      await logDashboardActivity({
        projectId,
        eventType: "source_uploaded",
        sectionId: "workspace",
        label: "Uploaded source content",
      });
      void runOcr(fileId);
    }
    setUploading(false);
  }

  const handleDelete = useCallback(
    async (e: React.MouseEvent, pdfId: string) => {
      e.stopPropagation();
      if (!confirm("Delete this PDF and all its highlights?")) return;

      const supabase = createClient();
      const pdf = pdfs.find((p) => p.id === pdfId);

      // Delete the PDF row — CASCADE handles highlights, annotations, and lit review entries
      const { error } = await supabase.from("pdfs").delete().eq("id", pdfId);
      if (error) {
        alert("Failed to delete PDF. Please try again.");
        return;
      }

      // Clean up storage file (best-effort — DB is already consistent)
      if (pdf?.storage_path) {
        await supabase.storage.from("pdfs").remove([pdf.storage_path]);
      }

      setPdfs((prev) => prev.filter((p) => p.id !== pdfId));

      if (pdfId === currentPdfId) router.push("/dashboard");
    },
    [pdfs, currentPdfId, router]
  );

  const handleToggleFinish = useCallback(
    async (e: React.MouseEvent, pdf: Pdf) => {
      e.stopPropagation();
      const supabase = createClient();
      const { ok, finishedAt } = await toggleSourceFinished({
        supabase,
        pdfId: pdf.id,
        projectId,
        displayName: pdf.display_name,
        currentlyFinished: !!pdf.finished_at,
        navigate: (href) => router.push(href),
      });
      if (ok) {
        setPdfs((prev) => prev.map((p) => (p.id === pdf.id ? { ...p, finished_at: finishedAt } : p)));
      }
    },
    [projectId, router]
  );

  async function handleRetryOcr(e: React.MouseEvent, pdfId: string) {
    e.stopPropagation();
    setPdfs((prev) => prev.map((p) => (p.id === pdfId ? { ...p, ocr_status: "processing" } : p)));
    await runOcr(pdfId);
    // The OCR route waits for the queued job, so the final status is ready to read now.
    const supabase = createClient();
    const { data } = await supabase.from("pdfs").select("ocr_status").eq("id", pdfId).single();
    if (data?.ocr_status) {
      setPdfs((prev) => prev.map((p) => (p.id === pdfId ? { ...p, ocr_status: data.ocr_status } : p)));
    }
  }

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
          className="w-full text-xs text-[#1a1208] hover:bg-pink-50 py-1 rounded transition-colors"
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
              className={`group relative ${isDragging ? "opacity-40" : ""} ${isDragOver ? "border-t-2 border-t-[#1a1208]" : ""}`}
            >
              <button
                onClick={() => router.push(projectId ? `/dashboard/project/${projectId}/viewer/${pdf.id}` : `/dashboard/viewer/${pdf.id}`)}
                className={`w-full text-left px-3 py-2 border-b border-gray-50 transition-colors ${
                  isActive ? "bg-pink-50 border-l-2 border-l-[#1a1208]" : "hover:bg-[#fdfcfa] border-l-2 border-l-transparent"
                }`}
              >
                <p className={`text-xs truncate pr-4 ${isActive ? "font-medium text-[#1a1208]" : "text-[#5a4a3a]"}`}>
                  {pdf.display_name}
                  {pdf.finished_at && (
                    <span className="ml-1.5 text-[9px] font-semibold text-[#2f8f5b]" title="Marked finished">✓ finished</span>
                  )}
                </p>
                <p className="text-[9px] text-[#9a8a7a] mt-0.5 flex items-center gap-1">
                  {pdf.file_size ? `${(pdf.file_size / 1024 / 1024).toFixed(1)} MB` : ""} · {new Date(pdf.created_at).toLocaleDateString()}
                  {pdf.ocr_status === "processing" && (
                    <span className="text-blue-500" title="OCR in progress">processing...</span>
                  )}
                  {pdf.ocr_status === "failed" && (
                    <span className="text-red-500" title="OCR failed — text extraction unavailable">OCR failed</span>
                  )}
                </p>
              </button>

              {/* Trailing row actions — a single flex row (not stacked absolutes) so
                  Finish/Unfinish, the OCR retry link, and Delete never overlap. */}
              <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap ${
                    pdf.finished_at
                      ? "border-[#d7eadf] bg-[#edf8f0] text-[#2f8f5b]"
                      : "border-[#e0cdb8] bg-white text-[#8f6132] hover:bg-[#f6efe4]"
                  }`}
                  onClick={(e) => handleToggleFinish(e, pdf)}
                  title={pdf.finished_at ? "Mark this source unfinished" : "Mark source finished"}
                  type="button"
                >
                  {pdf.finished_at ? "Unfinish" : "Finish"}
                </button>

                {pdf.ocr_status === "failed" && (
                  <button
                    className="rounded border border-[#e0cdb8] bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[#8f6132] hover:bg-[#f6efe4]"
                    onClick={(e) => handleRetryOcr(e, pdf.id)}
                    title="Retry text extraction"
                    type="button"
                  >
                    retry
                  </button>
                )}

                <button
                  onClick={(e) => handleDelete(e, pdf.id)}
                  className="text-[#d4cdc5] hover:text-red-500 text-xs px-0.5"
                  title="Delete"
                >
                  &times;
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-1.5 text-[9px] text-[#9a8a7a] border-t border-gray-100">
        {pdfs.length} document{pdfs.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
