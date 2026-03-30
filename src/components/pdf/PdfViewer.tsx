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

// Pending highlight data before color/note is chosen
interface PendingHighlight {
  pageNumber: number;
  text: string;
  rects: { x: number; y: number; width: number; height: number }[];
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

  // For new highlights: store selection data, show modal to pick color & add note
  const [pendingHighlight, setPendingHighlight] = useState<PendingHighlight | null>(null);

  // For adding notes to existing highlights from the sidebar
  const [existingNoteModal, setExistingNoteModal] = useState<{
    highlightId: string;
    pageNumber: number;
    highlightText?: string;
  } | null>(null);

  useEffect(() => {
    load(url);
  }, [url, load]);

  // When user selects text on a page — DON'T create highlight yet, show modal first
  const handleTextSelected = useCallback(
    (
      pageNumber: number,
      text: string,
      rects: { x: number; y: number; width: number; height: number }[]
    ) => {
      setPendingHighlight({ pageNumber, text, rects });
    },
    []
  );

  // When user saves from the new-highlight modal (with color + optional note)
  const handleSaveNewHighlight = useCallback(
    async (noteContent: string, color?: string) => {
      if (!pendingHighlight) return;

      const highlight = await createHighlight({
        pdfId,
        pageNumber: pendingHighlight.pageNumber,
        highlightedText: pendingHighlight.text,
        rects: pendingHighlight.rects,
        color: color || "#FFD700",
        pdfDisplayName,
      });

      // If a note was written, save it too
      if (highlight && noteContent) {
        await createAnnotation({
          pdfId,
          pageNumber: pendingHighlight.pageNumber,
          content: noteContent,
          positionX: 0,
          positionY: 0,
          highlightId: highlight.id,
        });
      }

      setPendingHighlight(null);
    },
    [pdfId, pdfDisplayName, pendingHighlight, createHighlight, createAnnotation]
  );

  // Add note to an existing highlight from sidebar
  const handleAddNote = useCallback(
    (highlightId: string, pageNumber: number) => {
      const hl = highlights.find((h) => h.id === highlightId);
      setExistingNoteModal({
        highlightId,
        pageNumber,
        highlightText: hl?.highlighted_text,
      });
    },
    [highlights]
  );

  const handleSaveExistingNote = useCallback(
    async (content: string) => {
      if (!existingNoteModal || !content) return;
      await createAnnotation({
        pdfId,
        pageNumber: existingNoteModal.pageNumber,
        content,
        positionX: 0,
        positionY: 0,
        highlightId: existingNoteModal.highlightId,
      });
      setExistingNoteModal(null);
    },
    [pdfId, existingNoteModal, createAnnotation]
  );

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

  // All page numbers
  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [totalPages]);

  const scrollToPage = useCallback((page: number) => {
    const el = window.document.querySelector(`[data-page-number="${page}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
              onCreateHighlight={handleTextSelected}
            />
          ))}
        </div>

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

      {/* Modal for NEW highlight — shows color picker + note field */}
      {pendingHighlight && (
        <NoteModal
          onSave={handleSaveNewHighlight}
          onClose={() => setPendingHighlight(null)}
          highlightText={pendingHighlight.text}
          showColorPicker
        />
      )}

      {/* Modal for adding note to EXISTING highlight from sidebar */}
      {existingNoteModal && (
        <NoteModal
          onSave={(content) => handleSaveExistingNote(content)}
          onClose={() => setExistingNoteModal(null)}
          highlightText={existingNoteModal.highlightText}
        />
      )}
    </div>
  );
}
