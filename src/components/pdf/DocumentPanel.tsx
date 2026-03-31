"use client";

import { useState, useEffect, useRef } from "react";
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
            className="text-xs text-[#DE3163] hover:underline"
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

      {/* Upload indicator */}
      {uploading && (
        <div className="px-3 py-2 text-xs text-blue-600 bg-blue-50 border-b border-gray-100">
          Uploading...
        </div>
      )}

      {/* PDF list */}
      <div className="flex-1 overflow-y-auto">
        {pdfs.map((pdf) => {
          const isActive = pdf.id === currentPdfId;
          return (
            <button
              key={pdf.id}
              onClick={() => router.push(`/dashboard/viewer/${pdf.id}`)}
              className={`w-full text-left px-3 py-2.5 border-b border-gray-50 transition-colors ${
                isActive
                  ? "bg-pink-50 border-l-2 border-l-[#DE3163]"
                  : "hover:bg-gray-50 border-l-2 border-l-transparent"
              }`}
            >
              <p
                className={`text-sm truncate ${
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
