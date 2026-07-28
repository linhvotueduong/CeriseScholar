"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { runOcr } from "@/lib/ocr/runOcr";
import { extractPdfMetadata } from "@/lib/pdf/extractMetadata";
import Spinner from "@/components/ui/Spinner";

function UploadPageInner() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fallbackProjectId, setFallbackProjectId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useUser();
  // Project context: the dashboard's Start-next-move routing passes ?project=. Entered
  // any other way (e.g. the sidebar link), fall back to the user's most recent project —
  // the same default the dashboard itself uses — so the PDF is still attached and the
  // flow still continues into a Workspace instead of dead-ending.
  const paramProjectId = useSearchParams().get("project");
  const projectId = paramProjectId || fallbackProjectId;

  useEffect(() => {
    if (paramProjectId || !user) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("projects")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1);
      if (!cancelled && data && data.length > 0) setFallbackProjectId(String(data[0].id));
    })();
    return () => {
      cancelled = true;
    };
  }, [paramProjectId, user]);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

  function handleFileSelect(selectedFile: File | null) {
    if (!selectedFile) return;
    if (selectedFile.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("File is too large. Maximum size is 50 MB.");
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

    // 2. Extract PDF metadata (title, author, page count)
    let pdfMeta = { title: "", author: "", subject: "", pageCount: 0 };
    try {
      pdfMeta = await extractPdfMetadata(file);
    } catch {
      // Metadata extraction failed — not critical, continue
    }

    // 3. Insert metadata into the pdfs table
    const { error: dbError } = await supabase.from("pdfs").insert({
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
    });

    if (dbError) {
      setError(`Database error: ${dbError.message}`);
      setUploading(false);
      return;
    }

    // 4. Trigger OCR in the background (fire-and-forget)
    runOcr(fileId);

    // 5. Continue the journey: into the project's Workspace to read & highlight the
    // new source; without a project context, back to the dashboard as before.
    router.push(projectId ? `/dashboard/project/${projectId}` : "/projects");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Add sources</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        Upload a PDF you already have — or find promising sources first.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Path 1: upload a PDF you already have */}
        <div className="flex flex-col">
          <div
            className={`flex-1 border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-[#8f6132] bg-[#fbf6ef]"
                : file
                ? "border-green-400 bg-green-50"
                : "border-gray-300 hover:border-[#111111]"
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

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="mt-4 w-full py-3 px-4 bg-[#111111] text-white font-medium rounded-lg hover:bg-[#000000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Spinner size="sm" />
                Uploading...
              </>
            ) : projectId ? (
              "Upload & open Workspace"
            ) : (
              "Upload PDF"
            )}
          </button>
        </div>

        {/* Path 2: find sources first with ScholarAsk */}
        <div className="flex flex-col rounded-xl border border-[#e8d8c6] bg-[#fbf6ef] p-8">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#8f6132]">
            Don&apos;t have your sources yet?
          </p>
          <h2 className="mt-2 text-lg font-bold text-[#17120d]">
            Find sources first with ScholarAsk
          </h2>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-[#4a4238]">
            Ask your research question and ScholarAsk searches real academic
            papers, answering with numbered citations you can follow to each
            paper. Pick the promising ones, download their PDFs, then come back
            here and upload them.
          </p>
          {projectId ? (
            <Link
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-[#e0cdb8] bg-white px-4 py-3 font-medium text-[#17120d] transition-colors hover:bg-[#f6efe4]"
              href={`/dashboard/project/${projectId}/scholar-ask`}
            >
              Ask ScholarAsk →
            </Link>
          ) : (
            <Link
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-[#e0cdb8] bg-white px-4 py-3 font-medium text-[#17120d] transition-colors hover:bg-[#f6efe4]"
              href="/projects"
            >
              Open your dashboard to ask →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      }
    >
      <UploadPageInner />
    </Suspense>
  );
}
