"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
    highlightText?: string;
  } | null>(null);

  // For the "highlight then immediately add note" flow
  const [pendingNoteHighlightId, setPendingNoteHighlightId] = useState<string | null>(null);

  useEffect(() => {
    load(url);
  }, [url, load]);

  // When a new highlight is created, immediately show the note popup
  const handleCreateHighlight = useCallback(
    async (
      pageNumber: number,
      text: string,
      rects: { x: number; y: number; width: number; height: number }[]
    ) => {
      const highlight = await createHighlight({
        pdfId,
        pageNumber,
        highlightedText: text,
        rects,
        pdfDisplayName,
      });

      if (highlight) {
        // Immediately show the note modal for this highlight
        setPendingNoteHighlightId(highlight.id);
        setNoteModal({ highlightId: highlight.id, pageNumber, highlightText: text });
      }
    },
    [pdfId, pdfDisplayName, createHighlight]
  );

  const handleAddNote = useCallback(
    (highlightId: string, pageNumber: number) => {
      const hl = highlights.find((h) => h.id === highlightId);
      setNoteModal({
        highlightId,
        pageNumber,
        highlightText: hl?.highlighted_text,
      });
    },
    [highlights]
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
      setPendingNoteHighlightId(null);
    },
    [pdfId, noteModal, createAnnotation]
  );

  const handleCloseNote = useCallback(() => {
    setNoteModal(null);
    setPendingNoteHighlightId(null);
  }, []);

  // TTS handlers
  const handleReadPage = useCallback(async () => {
    if (!document) return;
    const text = await extractPageText(document, currentPage);
    if (text) tts.speak(text);
  }, [document, currentPage, tts]);

  const handleReadSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text) tts.speak(text);
  }, [tts]);

  const handleReadHighlight = useCallback(
    (text: string) => tts.speak(text),
    [tts]
  );

  // Generate array of page numbers to render
  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [totalPages]);

  // Scroll to a specific page
  const scrollToPage = useCallback((page: number) => {
    const el = window.document.querySelector(`[data-page-number="${page}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Override goToPage to scroll instead of re-render
  const handleGoToPage = useCallback(
    (page: number) => {
      goToPage(page);
      scrollToPage(page);
    },
    [goToPage, scrollToPage]
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
          onPrevPage={() => { prevPage(); scrollToPage(currentPage - 1); }}
          onNextPage={() => { nextPage(); scrollToPage(currentPage + 1); }}
          onGoToPage={handleGoToPage}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onToggleHighlightMode={() => setHighlightMode((m) => !m)}
          onReadPage={handleReadPage}
          onReadSelection={handleReadSelection}
        />

        {/* Scrollable container with ALL pages */}
        <div
          className={`flex-1 overflow-auto bg-gray-100 flex flex-col items-center py-6 px-4 ${
            highlightMode ? "cursor-text" : ""
          }`}
        >
          {pageNumbers.map((num) => (
            <PdfPage
              key={num}
              document={document}
              pageNumber={num}
              zoom={zoom}
              highlights={highlights}
              highlightMode={highlightMode}
              onCreateHighlight={handleCreateHighlight}
            />
          ))}
        </div>

        {/* TTS controls */}
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
        onGoToPage={handleGoToPage}
        onDeleteHighlight={deleteHighlight}
        onAddNote={handleAddNote}
        onReadHighlight={handleReadHighlight}
      />

      {/* Note modal — pops up immediately after highlighting */}
      {noteModal && (
        <NoteModal
          onSave={handleSaveNote}
          onClose={handleCloseNote}
          highlightText={noteModal.highlightText}
        />
      )}
    </div>
  );
}
