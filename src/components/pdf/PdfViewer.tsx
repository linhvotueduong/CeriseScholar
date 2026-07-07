"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePdf } from "@/hooks/usePdf";
import { useHighlights } from "@/hooks/useHighlights";
import { useAnnotations } from "@/hooks/useAnnotations";
import { useCodes } from "@/hooks/useCodes";
import { useTts } from "@/hooks/useTts";
import { extractPageText } from "@/lib/pdf/extractText";
import { createClient } from "@/lib/supabase/client";
import { toggleSourceFinished } from "@/lib/dashboard/finishSource";
import PdfPage from "./PdfPage";
import PdfToolbar from "./PdfToolbar";
import TtsWidget from "@/components/tts/TtsWidget";
import Markdown from "react-markdown";
import AnnotationSidebar from "@/components/annotations/AnnotationSidebar";
import CodeSystemPanel from "@/components/codes/CodeSystemPanel";
import DocumentPanel from "@/components/pdf/DocumentPanel";
import NoteModal from "@/components/annotations/NoteModal";
import Spinner from "@/components/ui/Spinner";

interface PdfViewerProps {
  url: string;
  pdfId: string;
  pdfDisplayName: string;
  pdfAuthor?: string;
  pdfTitle?: string;
  projectId?: string;
}

type SpeechRecognitionEventLike = {
  results: {
    0: {
      0: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

// Left panels — Documents and Code System, independently open/closeable
function LeftPanels({
  pdfId,
  projectId,
  totalPages,
  codes,
  onCreateCode,
  onUpdateCode,
  onDeleteCode,
}: {
  pdfId: string;
  projectId?: string;
  totalPages: number;
  codes: import("@/types/code").Code[];
  onCreateCode: (name: string, color: string) => void;
  onUpdateCode: (id: string, fields: Partial<Pick<import("@/types/code").Code, "name" | "color">>) => void;
  onDeleteCode: (id: string) => void;
}) {
  const [docsOpen, setDocsOpen] = useState(true);
  const [codesOpen, setCodesOpen] = useState(true);

  // If both closed, show thin collapsed bar
  if (!docsOpen && !codesOpen) {
    return (
      <div className="w-8 bg-white border-r border-[#e0d8d0] flex flex-col items-center pt-2 gap-4 shrink-0">
        <span
          onClick={() => setDocsOpen(true)}
          className="text-[#9a8a7a] text-[10px] cursor-pointer hover:text-[#1a1208]"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Documents
        </span>
        <span
          onClick={() => setCodesOpen(true)}
          className="text-[#9a8a7a] text-[10px] cursor-pointer hover:text-[#1a1208]"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Codes
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-r border-[#e0d8d0] bg-white shrink-0" style={{ width: 220 }}>
      {/* Documents panel */}
      {docsOpen ? (
        <div className={`flex flex-col min-h-0 ${codesOpen ? "flex-1" : "flex-1"} border-b border-[#e0d8d0]`}>
          <div
            onClick={() => setDocsOpen(false)}
            className="flex items-center justify-between px-3 py-2 hover:bg-[#fdfcfa] cursor-pointer select-none shrink-0"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#9a8a7a]">▼</span>
              <span className="text-xs font-semibold text-[#7a6a5a] uppercase tracking-wider">Documents</span>
            </div>
            <span className="text-[10px] text-[#9a8a7a]">{totalPages}p</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <DocumentPanel currentPdfId={pdfId} projectId={projectId} />
          </div>
        </div>
      ) : (
        <div
          onClick={() => setDocsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 hover:bg-[#fdfcfa] cursor-pointer select-none border-b border-[#e0d8d0] shrink-0"
        >
          <span className="text-[10px] text-[#9a8a7a]">▶</span>
          <span className="text-xs font-semibold text-[#7a6a5a] uppercase tracking-wider">Documents</span>
        </div>
      )}

      {/* Code System panel */}
      {codesOpen ? (
        <div className="flex flex-col min-h-0 flex-1">
          <div
            onClick={() => setCodesOpen(false)}
            className="flex items-center justify-between px-3 py-2 hover:bg-[#fdfcfa] cursor-pointer select-none shrink-0"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#9a8a7a]">▼</span>
              <span className="text-xs font-semibold text-[#7a6a5a] uppercase tracking-wider">Code System</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <CodeSystemPanel
              codes={codes}
              onCreateCode={onCreateCode}
              onUpdateCode={onUpdateCode}
              onDeleteCode={onDeleteCode}
            />
          </div>
        </div>
      ) : (
        <div
          onClick={() => setCodesOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 hover:bg-[#fdfcfa] cursor-pointer select-none shrink-0"
        >
          <span className="text-[10px] text-[#9a8a7a]">▶</span>
          <span className="text-xs font-semibold text-[#7a6a5a] uppercase tracking-wider">Code System</span>
        </div>
      )}
    </div>
  );
}

// Right panel — Highlights, independently open/closeable
function RightPanel(props: {
  highlights: import("@/types/annotation").Highlight[];
  annotations: import("@/types/annotation").Annotation[];
  currentPage: number;
  onGoToPage: (page: number) => void;
  onDeleteHighlight: (id: string) => void;
  onAddNote: (highlightId: string, pageNumber: number) => void;
  onReadHighlight?: (text: string) => void;
  onUpdateNote?: (annotationId: string, content: string) => void;
  onReHighlight?: (highlightId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <div
        className="w-8 bg-white border-l border-[#e0d8d0] flex flex-col items-center pt-2 shrink-0 cursor-pointer hover:bg-[#fdfcfa]"
        onClick={() => setOpen(true)}
      >
        <span
          className="text-[#9a8a7a] text-[10px]"
          style={{ writingMode: "vertical-rl" }}
        >
          Highlights ({props.highlights.length})
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-l border-[#e0d8d0] bg-white shrink-0" style={{ width: 280 }}>
      <div
        onClick={() => setOpen(false)}
        className="flex items-center gap-1.5 px-3 py-2 hover:bg-[#fdfcfa] cursor-pointer select-none border-b border-[#e0d8d0] shrink-0"
      >
        <span className="text-[10px] text-[#9a8a7a]">▼</span>
        <span className="text-xs font-semibold text-[#7a6a5a] uppercase tracking-wider">
          Highlights ({props.highlights.length})
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <AnnotationSidebar {...props} />
      </div>
    </div>
  );
}

// Pending highlight data before color/note is chosen
interface PendingHighlight {
  pageNumber: number;
  text: string;
  rects: { x: number; y: number; width: number; height: number }[];
}

export default function PdfViewer({ url, pdfId, pdfDisplayName, pdfAuthor, pdfTitle, projectId }: PdfViewerProps) {
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
  const { annotations, createAnnotation, updateAnnotation } = useAnnotations(pdfId);
  const { codes, createCode, updateCode, deleteCode } = useCodes(projectId);
  const tts = useTts();
  const router = useRouter();

  // Per-source Finish button (docs/research-readiness-checklist-model.md §7.1):
  // this header mirrors the same finished_at column the document panel toggles.
  const [finishedAt, setFinishedAt] = useState<string | null>(null);
  useEffect(() => {
    if (!pdfId) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("pdfs").select("finished_at").eq("id", pdfId).single();
      if (!cancelled) setFinishedAt((data?.finished_at as string | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfId]);

  const handleToggleFinished = useCallback(async () => {
    const supabase = createClient();
    const { ok, finishedAt: nextFinishedAt } = await toggleSourceFinished({
      supabase,
      pdfId,
      projectId,
      displayName: pdfDisplayName || "This source",
      currentlyFinished: !!finishedAt,
      navigate: (href) => router.push(href),
    });
    if (ok) setFinishedAt(nextFinishedAt);
  }, [pdfId, projectId, pdfDisplayName, finishedAt, router]);

  const [highlightMode, setHighlightMode] = useState(false);
  const [reHighlightId, setReHighlightId] = useState<string | null>(null);

  // For new highlights: store selection data, show modal to pick color & add note
  const [pendingHighlight, setPendingHighlight] = useState<PendingHighlight | null>(null);

  // For adding notes to existing highlights from the sidebar
  const [existingNoteModal, setExistingNoteModal] = useState<{
    highlightId: string;
    pageNumber: number;
    highlightText?: string;
  } | null>(null);

  // AI Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatSize, setChatSize] = useState({ w: 380, h: 480 });
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (url) load(url);
  }, [url, load]);

  // When user selects text on a page
  const handleTextSelected = useCallback(
    async (
      pageNumber: number,
      text: string,
      rects: { x: number; y: number; width: number; height: number }[]
    ) => {
      if (reHighlightId) {
        // Re-highlight mode: update the existing highlight's text and rects
        const supabase = (await import("@/lib/supabase/client")).createClient();
        await supabase
          .from("highlights")
          .update({ highlighted_text: text, rects, page_number: pageNumber })
          .eq("id", reHighlightId);

        // Also update the lit review entry text
        await supabase
          .from("literature_review_entries")
          .update({ highlighted_text: text, page_number: pageNumber })
          .eq("highlight_id", reHighlightId);

        setReHighlightId(null);
        setHighlightMode(false);

        // Refresh highlights to show updated text
        deleteHighlight; // trigger re-render
        window.location.reload();
        return;
      }

      // Normal new highlight
      setPendingHighlight({ pageNumber, text, rects });
    },
    [reHighlightId]
  );

  // Extract first 2 pages for APA citation generation
  const firstPagesTextRef = useRef<string>("");
  const firstPagesPdfIdRef = useRef<string>("");

  const getFirstPagesText = useCallback(async () => {
    if (firstPagesTextRef.current && firstPagesPdfIdRef.current === pdfId) return firstPagesTextRef.current;
    if (!document) return "";
    const texts: string[] = [];
    for (let i = 1; i <= Math.min(totalPages, 2); i++) {
      try { const t = await extractPageText(document, i); if (t) texts.push(t); } catch {}
    }
    const result = texts.join("\n\n").slice(0, 3000);
    firstPagesTextRef.current = result;
    firstPagesPdfIdRef.current = pdfId;
    return result;
  }, [document, totalPages, pdfId]);

  // When user saves from the new-highlight modal (with color, code, + optional note)
  const savingRef = useRef(false);
  const handleSaveNewHighlight = useCallback(
    async (noteContent: string, color?: string, codeId?: string, codeName?: string) => {
      if (!pendingHighlight || savingRef.current) return;
      savingRef.current = true;

      // Capture and clear immediately to prevent double-save
      const pending = pendingHighlight;
      setPendingHighlight(null);

      // Get first pages text for APA citation (cached, fast)
      const pdfFirstPagesText = await getFirstPagesText();

      const highlight = await createHighlight({
        pdfId,
        pageNumber: pending.pageNumber,
        highlightedText: pending.text,
        rects: pending.rects,
        color: color || "#FFD700",
        pdfDisplayName,
        pdfAuthor,
        pdfTitle,
        codeId,
        codeName,
        noteContent,
        projectId,
        pdfFirstPagesText,
      });

      if (highlight && noteContent) {
        await createAnnotation({
          pdfId,
          pageNumber: pending.pageNumber,
          content: noteContent,
          positionX: 0,
          positionY: 0,
          highlightId: highlight.id,
        });
      }

      savingRef.current = false;
    },
    [pdfId, pdfDisplayName, pendingHighlight, createHighlight, createAnnotation, getFirstPagesText]
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

  // Extract text from multiple pages for full document context
  const docTextCacheRef = useRef<string>("");
  const docTextPdfIdRef = useRef<string>("");

  const getDocumentContext = useCallback(async () => {
    // Cache per PDF so we don't re-extract every message
    if (docTextCacheRef.current && docTextPdfIdRef.current === pdfId) {
      return docTextCacheRef.current;
    }
    if (!document) return "";

    const texts: string[] = [];
    const pagesToRead = Math.min(totalPages, 30); // Read up to 30 pages
    for (let i = 1; i <= pagesToRead; i++) {
      try {
        const t = await extractPageText(document, i);
        if (t && t.trim().length > 20) texts.push(`[Page ${i}]\n${t}`);
      } catch { /* skip failed pages */ }
    }

    const fullText = texts.join("\n\n").slice(0, 8000); // Cap at 8000 chars
    docTextCacheRef.current = fullText;
    docTextPdfIdRef.current = pdfId;
    return fullText;
  }, [document, totalPages, pdfId]);

  // AI Chat — send message about the PDF (reads full document)
  const handleChatSend = useCallback(async (overrideText?: string) => {
    const text = overrideText || chatInput.trim();
    if (!text || chatLoading || !document) return;

    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatLoading(true);

    try {
      const excerpt = await getDocumentContext();

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "pdf_chat",
          question: text,
          excerpt,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        result?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Cerise could not answer this PDF question yet.");
      const reply = data.result || "";
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        },
      ]);
    }
    setChatLoading(false);
  }, [chatInput, chatLoading, document, getDocumentContext]);

  // Voice input — speech-to-text using browser API
  const toggleVoiceInput = useCallback(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const speechWindow = window as SpeechWindow;
    const SR = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        handleChatSend(transcript.trim());
      }
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  }, [isListening, handleChatSend]);

  // Auto scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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
        <p className="text-[#7a6a5a] mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* LEFT PANELS: Documents and Code System — independent open/close */}
      <LeftPanels
        pdfId={pdfId}
        projectId={projectId}
        totalPages={totalPages}
        codes={codes}
        onCreateCode={createCode}
        onUpdateCode={updateCode}
        onDeleteCode={deleteCode}
      />

      {/* CENTER: PDF Viewer */}
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
          onToggleHighlightMode={() => {
            window.getSelection()?.removeAllRanges();
            setPendingHighlight(null);
            setHighlightMode((m) => !m);
          }}
          onReadPage={handleReadPage}
          onReadSelection={handleReadSelection}
          onToggleChat={() => setChatOpen((o) => !o)}
          chatOpen={chatOpen}
          finished={!!finishedAt}
          onToggleFinished={pdfId ? handleToggleFinished : undefined}
        />

        {reHighlightId && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center justify-between">
            <span>Select new text to replace the highlight. Your note will be kept.</span>
            <button
              onClick={() => { setReHighlightId(null); setHighlightMode(false); }}
              className="text-xs text-amber-600 hover:underline ml-4"
            >
              Cancel
            </button>
          </div>
        )}

        <div
          className={`flex-1 overflow-auto bg-[#faf7f0] flex flex-col items-center py-6 px-4 ${
            highlightMode ? "cursor-text" : ""
          }`}
        >
          {document ? (
            pageNumbers.map((num) => (
              <PdfPage
                key={num}
                document={document}
                pageNumber={num}
                zoom={zoom}
                highlights={highlights}
                highlightMode={highlightMode}
                onCreateHighlight={handleTextSelected}
                onSpeakFromHere={(text) => tts.speak(text)}
                isSpeaking={tts.isSpeaking}
                onStopSpeaking={tts.stop}
              />
            ))
          ) : !loading && (
            <div className="text-center py-20">
              <p className="text-[#7a6a5a] text-lg">No PDF open</p>
              <p className="text-[#9a8a7a] text-sm mt-1">
                Upload a PDF using the Documents panel on the left, then click it to open
              </p>
            </div>
          )}
        </div>

        <TtsWidget
          isSpeaking={tts.isSpeaking}
          isPaused={tts.isPaused}
          loading={tts.loading}
          voices={tts.voices}
          selectedVoice={tts.selectedVoice}
          rate={tts.rate}
          useAiVoice={tts.useAiVoice}
          onPause={tts.pause}
          onResume={tts.resume}
          onStop={tts.stop}
          onVoiceChange={tts.setSelectedVoice}
          onRateChange={tts.setRate}
          onToggleAiVoice={tts.setUseAiVoice}
        />
      </div>

      {/* RIGHT PANEL: Highlights — open/close */}
      <RightPanel
        highlights={highlights}
        annotations={annotations}
        currentPage={currentPage}
        onGoToPage={handleGoToPage}
        onDeleteHighlight={deleteHighlight}
        onAddNote={handleAddNote}
        onReadHighlight={handleReadHighlight}
        onUpdateNote={updateAnnotation}
        onReHighlight={(highlightId: string) => {
          setReHighlightId(highlightId);
          setHighlightMode(true);
        }}
      />

      {/* AI Chat — Dark floating panel, resizable from top-left corner */}
      {chatOpen && (
        <div
          className="fixed bottom-4 right-4 z-50 bg-[#1A1A2E] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ width: chatSize.w, height: chatSize.h, minWidth: 300, minHeight: 280, maxWidth: "90vw", maxHeight: "90vh" }}
        >
          {/* Resize handle — top-left corner */}
          <div
            className="absolute top-0 left-0 w-5 h-5 cursor-nw-resize z-10 flex items-center justify-center"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const startX = e.clientX;
              const startY = e.clientY;
              const startW = chatSize.w;
              const startH = chatSize.h;
              const onMove = (ev: MouseEvent) => {
                const dw = startX - ev.clientX;
                const dh = startY - ev.clientY;
                setChatSize({
                  w: Math.max(300, Math.min(startW + dw, window.innerWidth * 0.9)),
                  h: Math.max(280, Math.min(startH + dh, window.innerHeight * 0.9)),
                });
              };
              const onUp = () => { window.document.removeEventListener("mousemove", onMove); window.document.removeEventListener("mouseup", onUp); };
              window.document.addEventListener("mousemove", onMove);
              window.document.addEventListener("mouseup", onUp);
            }}
          >
            <svg className="w-3 h-3 text-[#7a6a5a]" fill="currentColor" viewBox="0 0 10 10">
              <circle cx="2" cy="2" r="1.2" /><circle cx="5" cy="2" r="1.2" /><circle cx="2" cy="5" r="1.2" />
            </svg>
          </div>
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#1a1208] rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <span className="text-white text-sm font-semibold">{pdfDisplayName || "PDF"}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setChatMessages([])} className="text-[#7a6a5a] hover:text-[#d4cdc5] p-1" title="Clear chat">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button onClick={() => setChatOpen(false)} className="text-[#7a6a5a] hover:text-[#d4cdc5] p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-[200px]">
            {chatMessages.length === 0 && (
              <div className="py-6">
                <p className="text-[#7a6a5a] text-xs text-center mb-4">Hey, can you tell me what this article is about?</p>
                <div className="space-y-2">
                  {[
                    "What is this paper about?",
                    "Summarize the key findings",
                    "What methodology was used?",
                    "What are the limitations?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleChatSend(q)}
                      className="block w-full text-left text-xs px-3 py-2 bg-[#2A2A3E] text-[#d4cdc5] rounded-xl hover:bg-[#3A3A4E] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#3A3A5E] text-gray-200"
                      : "text-gray-200"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">AI</span>
                      <button
                        onClick={() => tts.speak(msg.content)}
                        className="text-[#7a6a5a] hover:text-[#d4cdc5]"
                        title="Read aloud"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {msg.role === "assistant" ? (
                    <div className="chat-md">
                      <Markdown
                        components={{
                          h1: ({ children }) => <p className="font-bold text-[14px] text-gray-100 mt-2 mb-1">{children}</p>,
                          h2: ({ children }) => <p className="font-bold text-[14px] text-gray-100 mt-2 mb-1">{children}</p>,
                          h3: ({ children }) => <p className="font-semibold text-[13px] text-gray-200 mt-2 mb-1">{children}</p>,
                          p: ({ children }) => <p className="mb-2">{children}</p>,
                          strong: ({ children }) => <span className="font-bold text-white">{children}</span>,
                          em: ({ children }) => <span className="italic text-[#d4cdc5]">{children}</span>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          a: ({ href, children }) => <a href={href} target="_blank" className="text-blue-400 hover:underline">{children}</a>,
                          code: ({ children }) => <code className="bg-[#2A2A3E] px-1 py-0.5 rounded text-blue-300 text-[11px]">{children}</code>,
                        }}
                      >
                        {msg.content}
                      </Markdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-center gap-2 text-xs text-[#7a6a5a] py-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[#fdfcfa]0 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-[#fdfcfa]0 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-[#fdfcfa]0 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 shrink-0">
            <div className="flex items-center gap-2 bg-[#2A2A3E] rounded-xl px-3 py-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                placeholder="Ask anything"
                disabled={chatLoading}
                className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none disabled:opacity-50"
              />
              {/* Voice input button */}
              <button
                onClick={toggleVoiceInput}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  isListening ? "bg-red-500 text-white animate-pulse" : "text-[#7a6a5a] hover:text-[#d4cdc5]"
                }`}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
              {/* Close button */}
              <button
                onClick={() => setChatOpen(false)}
                className="text-[#7a6a5a] hover:text-[#d4cdc5]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for NEW highlight — shows color picker, code selector + note field */}
      {pendingHighlight && (
        <NoteModal
          onSave={handleSaveNewHighlight}
          onClose={() => {
            window.getSelection()?.removeAllRanges();
            setPendingHighlight(null);
          }}
          highlightText={pendingHighlight.text}
          showColorPicker
          showCodeSelector
          codes={codes}
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
