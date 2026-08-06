"use client";

import { useState } from "react";

interface PdfToolbarProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  highlightMode: boolean;
  isSpeaking: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleHighlightMode: () => void;
  onReadPage: () => void;
  onReadSelection: () => void;
  onToggleChat?: () => void;
  chatOpen?: boolean;
  /** Per-source Finish button (docs/research-readiness-checklist-model.md §7.1). */
  finished?: boolean;
  onToggleFinished?: () => void;
}

export default function PdfToolbar({
  currentPage,
  totalPages,
  zoom,
  highlightMode,
  isSpeaking,
  onPrevPage,
  onNextPage,
  onGoToPage,
  onZoomIn,
  onZoomOut,
  onToggleHighlightMode,
  onReadPage,
  onReadSelection,
  onToggleChat,
  chatOpen,
  finished,
  onToggleFinished,
}: PdfToolbarProps) {
  const [pageInput, setPageInput] = useState("");

  function handlePageSubmit(e: React.FormEvent) {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (!isNaN(page)) {
      onGoToPage(page);
      setPageInput("");
    }
  }

  return (
    <div className="flex items-center bg-white border-b border-[#e0d8d0] px-2 py-1.5 sticky top-0 z-10 overflow-x-auto whitespace-nowrap gap-1.5 min-h-[40px] shrink-0">
      {/* Page navigation */}
      <button
        onClick={onPrevPage}
        disabled={currentPage <= 1}
        className="px-1.5 py-1 text-xs bg-[#faf7f0] rounded hover:bg-gray-200 disabled:opacity-40 shrink-0"
      >
        Prev
      </button>

      <span className="text-xs text-[#7a6a5a] shrink-0">
        {currentPage}/{totalPages}
      </span>

      <button
        onClick={onNextPage}
        disabled={currentPage >= totalPages}
        className="px-1.5 py-1 text-xs bg-[#faf7f0] rounded hover:bg-gray-200 disabled:opacity-40 shrink-0"
      >
        Next
      </button>

      <form onSubmit={handlePageSubmit} className="flex items-center gap-1 shrink-0">
        <input
          type="number"
          min={1}
          max={totalPages}
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          placeholder="Go to..."
          className="w-14 px-1.5 py-1 text-xs border border-[#d4cdc5] rounded focus:outline-none focus:ring-1 focus:ring-[#1a1208]"
        />
        <button
          type="submit"
          className="px-1.5 py-1 text-xs bg-[#1a1208] text-white rounded hover:bg-[#000000] shrink-0"
        >
          Go
        </button>
      </form>

      <div className="w-px h-4 bg-gray-200 shrink-0" />

      {/* Highlight */}
      <button
        onClick={onToggleHighlightMode}
        className={`px-2 py-1 text-xs rounded font-medium transition-colors shrink-0 ${
          highlightMode
            ? "bg-[#1a1208] text-white"
            : "bg-[#faf7f0] text-[#7a6a5a] hover:bg-gray-200"
        }`}
      >
        {highlightMode ? "Highlighting ON" : "Highlight"}
      </button>

      <div className="w-px h-4 bg-gray-200 shrink-0" />

      {/* TTS */}
      <button
        onClick={onReadPage}
        disabled={isSpeaking}
        className="px-2 py-1 text-xs bg-[#faf7f0] text-[#7a6a5a] rounded hover:bg-gray-200 disabled:opacity-40 shrink-0"
      >
        Read Page
      </button>
      <button
        onClick={onReadSelection}
        disabled={isSpeaking}
        className="px-2 py-1 text-xs bg-[#faf7f0] text-[#7a6a5a] rounded hover:bg-gray-200 disabled:opacity-40 shrink-0"
      >
        Read Selection
      </button>

      <div className="w-px h-4 bg-gray-200 shrink-0" />

      {/* AI Chat */}
      {onToggleChat && (
        <button
          onClick={onToggleChat}
          className={`px-2 py-1 text-xs rounded font-medium transition-colors shrink-0 ${
            chatOpen
              ? "bg-[#1a1208] text-white"
              : "bg-purple-100 text-purple-700 hover:bg-purple-200"
          }`}
        >
          AI Chat
        </button>
      )}

      <div className="w-px h-4 bg-gray-200 shrink-0" />

      {/* Zoom */}
      <button
        onClick={onZoomOut}
        className="px-1.5 py-1 text-xs bg-[#faf7f0] rounded hover:bg-gray-200 shrink-0"
      >
        -
      </button>
      <span className="text-xs text-[#7a6a5a] w-10 text-center shrink-0">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        className="px-1.5 py-1 text-xs bg-[#faf7f0] rounded hover:bg-gray-200 shrink-0"
      >
        +
      </button>

      {onToggleFinished && (
        <>
          <div className="w-px h-4 bg-gray-200 shrink-0" />
          <button
            onClick={onToggleFinished}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors shrink-0 whitespace-nowrap ${
              finished
                ? "bg-[#edf8f0] text-[#2f8f5b] border border-[#d7eadf]"
                : "bg-[#f6efe4] text-[#8f6132] hover:bg-[#efe3d0]"
            }`}
            title={finished ? "Mark this source unfinished" : "Mark source finished"}
            type="button"
          >
            {finished ? "✓ Finished" : "Mark source finished"}
          </button>
        </>
      )}
    </div>
  );
}
