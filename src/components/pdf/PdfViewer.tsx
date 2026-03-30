"use client";

import { useEffect, useState, useCallback } from "react";
import { usePdf } from "@/hooks/usePdf";
import { useHighlights } from "@/hooks/useHighlights";
import { useAnnotations } from "@/hooks/useAnnotations";
import { useTts } from "@/hooks/useTts";
import { extractPageText } from "@/lib/pdf/extractText";
import PdfPage from "./PdfPage";
import PdfToolbar from "./PdfToolbar";
import TtsControls from "@/components/tts/TtsControls";
import AnnotationSidebar from "@/components/annotations/AnnotationSidebar";
import NoteModal from "@/components/annotations/NoteModal";
import Spinner from "@/components/ui/Spinner";

interface PdfViewerProps {
  url: string;
  pdfId: string;
  pdfDisplayName: string;
}

export default function PdfViewer({ url, pdfId, pdfDisplayName }: PdfViewerProps) {
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

  const { highlights, createHighlight, deleteHighlight } = useHighlights(pdfId);
  const { annotations, createAnnotation } = useAnnotations(pdfId);
  const tts = useTts();

  const [highlightMode, setHighlightMode] = useState(false);
  const [noteModal, setNoteModal] = useState<{
    highlightId: string;
    pageNumber: number;
  } | null>(null);

  useEffect(() => {
    load(url);
  }, [url, load]);

  const handleCreateHighlight = useCallback(
    async (
      text: string,
      rects: { x: number; y: number; width: number; height: number }[]
    ) => {
      await createHighlight({
        pdfId,
        pageNumber: currentPage,
        highlightedText: text,
        rects,
        pdfDisplayName,
      });
    },
    [pdfId, currentPage, pdfDisplayName, createHighlight]
  );

  const handleAddNote = useCallback(
    (highlightId: string, pageNumber: number) => {
      setNoteModal({ highlightId, pageNumber });
    },
    []
  );

  const handleSaveNote = useCallback(
    async (content: string) => {
      if (!noteModal) return;
      await createAnnotation({
        pdfId,
        pageNumber: noteModal.pageNumber,
        content,
        positionX: 0,
        positionY: 0,
        highlightId: noteModal.highlightId,
      });
      setNoteModal(null);
    },
    [pdfId, noteModal, createAnnotation]
  );

  // TTS: Read the entire current page
  const handleReadPage = useCallback(async () => {
    if (!document) return;
    const text = await extractPageText(document, currentPage);
    if (text) {
      tts.speak(text);
    }
  }, [document, currentPage, tts]);

  // TTS: Read currently selected text
  const handleReadSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text) {
      tts.speak(text);
    }
  }, [tts]);

  // TTS: Read a specific highlight's text
  const handleReadHighlight = useCallback(
    (text: string) => {
      tts.speak(text);
    },
    [tts]
  );

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
    <div className="flex h-full">
      {/* Main viewer area */}
      <div className="flex-1 flex flex-col min-w-0">
        <PdfToolbar
          currentPage={currentPage}
          totalPages={totalPages}
          zoom={zoom}
          highlightMode={highlightMode}
          isSpeaking={tts.isSpeaking}
          onPrevPage={prevPage}
          onNextPage={nextPage}
          onGoToPage={goToPage}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onToggleHighlightMode={() => setHighlightMode((m) => !m)}
          onReadPage={handleReadPage}
          onReadSelection={handleReadSelection}
        />

        <div
          className={`flex-1 overflow-auto bg-gray-100 flex justify-center py-6 px-4 ${
            highlightMode ? "cursor-text" : ""
          }`}
        >
          <PdfPage
            document={document}
            pageNumber={currentPage}
            zoom={zoom}
            highlights={highlights}
            highlightMode={highlightMode}
            onCreateHighlight={handleCreateHighlight}
          />
        </div>

        {/* TTS controls — shown at the bottom when speaking */}
        <TtsControls
          isSpeaking={tts.isSpeaking}
          isPaused={tts.isPaused}
          voices={tts.voices}
          selectedVoice={tts.selectedVoice}
          rate={tts.rate}
          onPause={tts.pause}
          onResume={tts.resume}
          onStop={tts.stop}
          onVoiceChange={tts.setSelectedVoice}
          onRateChange={tts.setRate}
        />
      </div>

      {/* Annotation sidebar */}
      <AnnotationSidebar
        highlights={highlights}
        annotations={annotations}
        currentPage={currentPage}
        onGoToPage={goToPage}
        onDeleteHighlight={deleteHighlight}
        onAddNote={handleAddNote}
        onReadHighlight={handleReadHighlight}
      />

      {/* Note modal */}
      {noteModal && (
        <NoteModal
          onSave={handleSaveNote}
          onClose={() => setNoteModal(null)}
        />
      )}
    </div>
  );
}
