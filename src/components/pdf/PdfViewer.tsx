"use client";

import { useEffect } from "react";
import { usePdf } from "@/hooks/usePdf";
import PdfPage from "./PdfPage";
import PdfToolbar from "./PdfToolbar";
import Spinner from "@/components/ui/Spinner";

interface PdfViewerProps {
  url: string;
}

export default function PdfViewer({ url }: PdfViewerProps) {
  const {
    document,
    currentPage,
    totalPages,
    zoom,
    loading,
    error,
    load,
    goToPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
  } = usePdf();

  useEffect(() => {
    load(url);
  }, [url, load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 text-lg">Failed to load PDF</p>
        <p className="text-gray-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!document) return null;

  return (
    <div className="flex flex-col h-full">
      <PdfToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        onGoToPage={goToPage}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />

      <div className="flex-1 overflow-auto bg-gray-100 flex justify-center py-6 px-4">
        <PdfPage
          document={document}
          pageNumber={currentPage}
          zoom={zoom}
        />
      </div>
    </div>
  );
}
