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
    <div className="flex items-center bg-white border-b border-gray-200 px-2 py-1.5 sticky top-0 z-10 overflow-x-auto whitespace-nowrap gap-1.5 min-h-[40px] shrink-0">
      {/* Page navigation */}
      <button
        onClick={onPrevPage}
        disabled={currentPage <= 1}
        className="px-1.5 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-40 shrink-0"
      >
        Prev
      </button>

      <span className="text-xs text-gray-600 shrink-0">
        {currentPage}/{totalPages}
      </span>

      <button
        onClick={onNextPage}
        disabled={currentPage >= totalPages}
        className="px-1.5 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-40 shrink-0"
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
          className="w-14 px-1.5 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#DE3163]"
        />
        <button
          type="submit"
          className="px-1.5 py-1 text-xs bg-[#DE3163] text-white rounded hover:bg-[#c4294f] shrink-0"
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
            ? "bg-[#DE3163] text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        {highlightMode ? "Highlighting ON" : "Highlight"}
      </button>

      <div className="w-px h-4 bg-gray-200 shrink-0" />

      {/* TTS */}
      <button
        onClick={onReadPage}
        disabled={isSpeaking}
        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-40 shrink-0"
      >
        Read Page
      </button>
      <button
        onClick={onReadSelection}
        disabled={isSpeaking}
        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-40 shrink-0"
      >
        Read Selection
      </button>

      <div className="w-px h-4 bg-gray-200 shrink-0" />

      {/* Zoom */}
      <button
        onClick={onZoomOut}
        className="px-1.5 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 shrink-0"
      >
        -
      </button>
      <span className="text-xs text-gray-600 w-10 text-center shrink-0">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        className="px-1.5 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 shrink-0"
      >
        +
      </button>
    </div>
  );
}
