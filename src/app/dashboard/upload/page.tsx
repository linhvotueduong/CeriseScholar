"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import Spinner from "@/components/ui/Spinner";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useUser();

  function handleFileSelect(selectedFile: File | null) {
    if (!selectedFile) return;
    if (selectedFile.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    setError(null);
    setFile(selectedFile);
  }

  async function handleUpload() {
    if (!file || !user) return;
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const fileId = crypto.randomUUID();
    const storagePath = `${user.id}/${fileId}.pdf`;

    // 1. Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(storagePath, file);

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    // 2. Insert metadata into the pdfs table
    const { error: dbError } = await supabase.from("pdfs").insert({
      id: fileId,
      user_id: user.id,
      filename: file.name,
      display_name: file.name.replace(/\.pdf$/i, ""),
      storage_path: storagePath,
      file_size: file.size,
      ocr_status: "pending",
    });

    if (dbError) {
      setError(`Database error: ${dbError.message}`);
      setUploading(false);
      return;
    }

    // 3. Redirect to dashboard
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload PDF</h1>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-[#DE3163] bg-pink-50"
            : file
            ? "border-green-400 bg-green-50"
            : "border-gray-300 hover:border-[#DE3163]"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const droppedFile = e.dataTransfer.files[0];
          handleFileSelect(droppedFile);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
        />

        {file ? (
          <div>
            <p className="text-green-700 font-medium text-lg">{file.name}</p>
            <p className="text-gray-500 mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Click to choose a different file
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-500 text-lg">
              Drop a PDF here or click to browse
            </p>
            <p className="text-gray-400 text-sm mt-2">Only .pdf files accepted</p>
          </div>
        )}
      </div>

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="mt-6 w-full py-3 px-4 bg-[#DE3163] text-white font-medium rounded-lg hover:bg-[#c4294f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <Spinner size="sm" />
            Uploading...
          </>
        ) : (
          "Upload PDF"
        )}
      </button>
    </div>
  );
}
