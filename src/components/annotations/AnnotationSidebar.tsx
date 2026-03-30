"use client";

import { useState } from "react";
import type { Highlight, Annotation } from "@/types/annotation";

interface AnnotationSidebarProps {
  highlights: Highlight[];
  annotations: Annotation[];
  currentPage: number;
  onGoToPage: (page: number) => void;
  onDeleteHighlight: (id: string) => void;
  onAddNote: (highlightId: string, pageNumber: number) => void;
}

export default function AnnotationSidebar({
  highlights,
  annotations,
  currentPage,
  onGoToPage,
  onDeleteHighlight,
  onAddNote,
}: AnnotationSidebarProps) {
  const [filter, setFilter] = useState<"all" | "page">("all");

  const filtered =
    filter === "page"
      ? highlights.filter((h) => h.page_number === currentPage)
      : highlights;

  return (
    <div className="w-72 border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">
          Highlights ({highlights.length})
        </h3>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setFilter("all")}
            className={`text-xs px-2 py-1 rounded ${
              filter === "all"
                ? "bg-[#DE3163] text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            All Pages
          </button>
          <button
            onClick={() => setFilter("page")}
            className={`text-xs px-2 py-1 rounded ${
              filter === "page"
                ? "bg-[#DE3163] text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            This Page
          </button>
        </div>
      </div>

      {/* Highlight list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 p-4 text-center">
            {filter === "page"
              ? "No highlights on this page"
              : "No highlights yet. Enable highlight mode and select text."}
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((highlight) => {
              const note = annotations.find(
                (a) => a.highlight_id === highlight.id
              );
              return (
                <div
                  key={highlight.id}
                  className="p-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Page badge + delete */}
                  <div className="flex items-center justify-between mb-1">
                    <button
                      onClick={() => onGoToPage(highlight.page_number)}
                      className="text-xs text-[#DE3163] font-medium hover:underline"
                    >
                      Page {highlight.page_number}
                    </button>
                    <button
                      onClick={() => onDeleteHighlight(highlight.id)}
                      className="text-xs text-gray-400 hover:text-red-500"
                      title="Delete highlight"
                    >
                      &times;
                    </button>
                  </div>

                  {/* Highlighted text preview */}
                  <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                    &ldquo;{highlight.highlighted_text}&rdquo;
                  </p>

                  {/* Note attached to this highlight */}
                  {note ? (
                    <p className="text-xs text-gray-500 mt-2 bg-yellow-50 p-2 rounded">
                      {note.content}
                    </p>
                  ) : (
                    <button
                      onClick={() =>
                        onAddNote(highlight.id, highlight.page_number)
                      }
                      className="text-xs text-gray-400 hover:text-[#DE3163] mt-2"
                    >
                      + Add note
                    </button>
                  )}

                  <p className="text-[10px] text-gray-300 mt-1">
                    {new Date(highlight.created_at).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
