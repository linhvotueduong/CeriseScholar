"use client";

import { useState } from "react";

interface PdfToolbarProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  highlightMode: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleHighlightMode: () => void;
}

export default function PdfToolbar({
  currentPage,
  totalPages,
  zoom,
  highlightMode,
  onPrevPage,
  onNextPage,
  onGoToPage,
  onZoomIn,
  onZoomOut,
  onToggleHighlightMode,
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
    <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2 sticky top-0 z-10">
      {/* Page navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevPage}
          disabled={currentPage <= 1}
          className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>

        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
          className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>

        <form onSubmit={handlePageSubmit} className="flex items-center gap-1 ml-2">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            placeholder="Go to..."
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#DE3163]"
          />
          <button
            type="submit"
            className="px-2 py-1 text-sm bg-[#DE3163] text-white rounded hover:bg-[#c4294f]"
          >
            Go
          </button>
        </form>
      </div>

      {/* Highlight toggle + Zoom controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleHighlightMode}
          className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
            highlightMode
              ? "bg-[#DE3163] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {highlightMode ? "Highlighting ON" : "Highlight"}
        </button>

        <div className="w-px h-5 bg-gray-300" />
        <button
          onClick={onZoomOut}
          className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
        >
          -
        </button>
        <span className="text-sm text-gray-600 w-14 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
        >
          +
        </button>
      </div>
    </div>
  );
}
