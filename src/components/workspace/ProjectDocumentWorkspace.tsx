"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PdfViewer from "@/components/pdf/PdfViewer";
import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";
import type { Pdf } from "@/types/pdf";

interface ProjectDocumentWorkspaceProps {
  projectId: string;
}

const SIGNED_URL_LIFETIME_SECONDS = 8 * 60 * 60;

export default function ProjectDocumentWorkspace({ projectId }: ProjectDocumentWorkspaceProps) {
  const [activePdf, setActivePdf] = useState<Pdf | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  const openPdf = useCallback(async (pdf: Pdf | null) => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setActivePdf(pdf);
    setPdfUrl("");
    setError("");

    if (!pdf) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: signedUrlError } = await supabase.storage
      .from("pdfs")
      .createSignedUrl(pdf.storage_path, SIGNED_URL_LIFETIME_SECONDS);

    if (requestId !== requestSequence.current) return;

    if (signedUrlError || !data?.signedUrl) {
      setError("This document could not be opened. Please select it again or try another source.");
      setLoading(false);
      return;
    }

    setPdfUrl(data.signedUrl);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFirstPdf() {
      setLoading(true);
      setError("");
      const supabase = createClient();
      const { data, error: pdfError } = await supabase
        .from("pdfs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })
        .limit(1);

      if (cancelled) return;

      if (pdfError) {
        setError("The project documents could not be loaded. Please try again.");
        setLoading(false);
        return;
      }

      await openPdf((data?.[0] as Pdf | undefined) ?? null);
    }

    void loadFirstPdf();
    return () => {
      cancelled = true;
      requestSequence.current += 1;
    };
  }, [openPdf, projectId]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center bg-white" role="status">
        <Spinner size="lg" />
        <span className="sr-only">Loading Workspace</span>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-white">
      {error ? (
        <div className="absolute inset-x-0 top-0 z-10 border-b border-[#efc9c3] bg-[#fff5f3] px-4 py-2 text-center text-xs font-semibold text-[#a33227]" role="alert">
          {error}
        </div>
      ) : null}
      <PdfViewer
        key={activePdf?.id ?? "empty-workspace"}
        onSelectPdf={openPdf}
        pdfAuthor={activePdf?.pdf_author ?? ""}
        pdfDisplayName={activePdf?.display_name ?? ""}
        pdfId={activePdf?.id ?? ""}
        pdfTitle={activePdf?.pdf_title ?? ""}
        projectId={projectId}
        url={pdfUrl}
      />
    </div>
  );
}
