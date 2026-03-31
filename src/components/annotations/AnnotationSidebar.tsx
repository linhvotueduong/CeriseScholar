"use client";

import { useState, useRef, useEffect } from "react";
import type { Highlight, Annotation } from "@/types/annotation";
import HighlightDetailModal from "./HighlightDetailModal";

interface AnnotationSidebarProps {
  highlights: Highlight[];
  annotations: Annotation[];
  currentPage: number;
  onGoToPage: (page: number) => void;
  onDeleteHighlight: (id: string) => void;
  onAddNote: (highlightId: string, pageNumber: number) => void;
  onUpdateNote?: (annotationId: string, content: string) => void;
  onReadHighlight?: (text: string) => void;
  onReHighlight?: (highlightId: string) => void;
}

function EditableNote({
  content,
  onSave,
}: {
  content: string;
  onSave: (content: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(content);
  }, [content]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.selectionStart = ref.current.value.length;
    }
  }, [editing]);

  function save() {
    setEditing(false);
    if (draft !== content) onSave(draft);
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setDraft(content); setEditing(false); }
        }}
        rows={3}
        className="w-full text-xs text-gray-600 mt-2 bg-yellow-50 p-2 rounded border border-[#DE3163] focus:outline-none resize-y"
      />
    );
  }

  return (
    <p
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className="text-xs text-gray-500 mt-2 bg-yellow-50 p-2 rounded cursor-pointer hover:bg-yellow-100 transition-colors"
      title="Click to edit note"
    >
      {content}
    </p>
  );
}

export default function AnnotationSidebar({
  highlights,
  annotations,
  currentPage,
  onGoToPage,
  onDeleteHighlight,
  onAddNote,
  onUpdateNote,
  onReadHighlight,
  onReHighlight,
}: AnnotationSidebarProps) {
  const [filter, setFilter] = useState<"all" | "page">("all");
  const [detailHighlight, setDetailHighlight] = useState<Highlight | null>(null);

  const filtered =
    filter === "page"
      ? highlights.filter((h) => h.page_number === currentPage)
      : highlights;

  const detailNote = detailHighlight
    ? annotations.find((a) => a.highlight_id === detailHighlight.id)
    : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
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
                  className="p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setDetailHighlight(highlight)}
                  title="Click to view full highlight"
                >
                  {/* Page badge + read aloud + delete */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onGoToPage(highlight.page_number); }}
                        className="text-xs text-[#DE3163] font-medium hover:underline"
                      >
                        Page {highlight.page_number}
                      </button>
                      {onReadHighlight && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onReadHighlight(highlight.highlighted_text); }}
                          className="text-xs text-gray-400 hover:text-[#DE3163]"
                          title="Read this highlight aloud"
                        >
                          &#9654;
                        </button>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteHighlight(highlight.id); }}
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

                  {/* Note — editable inline */}
                  {note ? (
                    <EditableNote
                      content={note.content}
                      onSave={(newContent) =>
                        onUpdateNote?.(note.id, newContent)
                      }
                    />
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddNote(highlight.id, highlight.page_number);
                      }}
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

      {/* Detail modal */}
      {detailHighlight && (
        <HighlightDetailModal
          highlightedText={detailHighlight.highlighted_text}
          noteContent={detailNote?.content || ""}
          pageNumber={detailHighlight.page_number}
          color={detailHighlight.color || "#FFD700"}
          createdAt={detailHighlight.created_at}
          onClose={() => setDetailHighlight(null)}
          onUpdateNote={(content) => {
            if (detailNote) {
              onUpdateNote?.(detailNote.id, content);
            } else {
              onAddNote(detailHighlight.id, detailHighlight.page_number);
            }
          }}
          onReHighlight={() => {
            onReHighlight?.(detailHighlight.id);
            setDetailHighlight(null);
          }}
        />
      )}
    </div>
  );
}
